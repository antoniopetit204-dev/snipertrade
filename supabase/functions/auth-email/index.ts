// Email auth + transactional email edge function
// Actions: signup, login, forgot-password, reset-password, send-test, send-template
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import bcrypt from 'npm:bcryptjs@2.4.3';
import nodemailer from 'npm:nodemailer@6.9.13';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const tokenHex = (bytes = 32) => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
};

const render = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));

async function loadTemplate(key: string) {
  const { data } = await supabase.from('email_templates').select('*').eq('template_key', key).maybeSingle();
  return data;
}

async function loadSmtp() {
  const { data } = await supabase.from('smtp_config').select('*').limit(1).maybeSingle();
  return data;
}

async function loadSiteName() {
  const { data } = await supabase.from('admin_settings').select('site_name').limit(1).maybeSingle();
  return data?.site_name || 'HFT Pro';
}

async function sendMail(to: string, subject: string, html: string, text: string, templateKey = '') {
  const smtp = await loadSmtp();
  if (!smtp || !smtp.enabled || !smtp.host) {
    await supabase.from('email_log').insert({ to_email: to, template_key: templateKey, subject, status: 'skipped', error: 'SMTP not configured' });
    return { ok: false, error: 'SMTP not configured' };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.username ? { user: smtp.username, pass: smtp.password } : undefined,
      tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
    });
    const fromName = smtp.from_name || (await loadSiteName());
    const fromEmail = smtp.from_email || smtp.username;
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to, subject, html, text,
    });
    await supabase.from('email_log').insert({ to_email: to, template_key: templateKey, subject, status: 'sent' });
    return { ok: true };
  } catch (e: any) {
    await supabase.from('email_log').insert({ to_email: to, template_key: templateKey, subject, status: 'failed', error: String(e?.message || e) });
    return { ok: false, error: String(e?.message || e) };
  }
}

async function shouldNotify(email: string, key: 'notify_login' | 'notify_trades' | 'notify_deposits' | 'notify_withdrawals') {
  const { data } = await supabase.from('user_email_preferences').select('*').eq('identifier', email).maybeSingle();
  if (!data) return true;
  if (!data.enabled) return false;
  return Boolean(data[key]);
}

async function sendTemplated(to: string, key: string, vars: Record<string, string>) {
  const tpl = await loadTemplate(key);
  if (!tpl || !tpl.enabled) return { ok: false, error: 'template missing' };
  const siteName = await loadSiteName();
  const merged = { site_name: siteName, ...vars };
  const subject = render(tpl.subject, merged);
  const html = render(tpl.html, merged);
  const text = render(tpl.text, merged);
  return sendMail(to, subject, html, text, key);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || '';
  let body: any = {};
  try { body = await req.json(); } catch {}

  try {
    if (action === 'signup') {
      const email = String(body.email || '').toLowerCase().trim();
      const password = String(body.password || '');
      const name = String(body.name || '').trim();
      if (!email || !password || password.length < 6) return json({ error: 'Invalid input' }, 400);
      const { data: existing } = await supabase.from('app_users').select('id').eq('email', email).maybeSingle();
      if (existing) return json({ error: 'Account already exists' }, 409);
      const hash = await bcrypt.hash(password, 10);
      const { data: created, error } = await supabase.from('app_users')
        .insert({ email, password_hash: hash, name, verified: true })
        .select().single();
      if (error) return json({ error: error.message }, 500);
      await supabase.from('user_email_preferences').upsert({ identifier: email, email }, { onConflict: 'identifier' });
      const origin = body.origin || req.headers.get('origin') || '';
      sendTemplated(email, 'welcome', { name: name || email, site_url: origin }).catch(() => {});
      return json({ user: { id: created.id, email: created.email, name: created.name, role: created.role } });
    }

    if (action === 'login') {
      const email = String(body.email || '').toLowerCase().trim();
      const password = String(body.password || '');
      const { data: user } = await supabase.from('app_users').select('*').eq('email', email).maybeSingle();
      if (!user) return json({ error: 'Invalid credentials' }, 401);
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return json({ error: 'Invalid credentials' }, 401);
      if (await shouldNotify(email, 'notify_login')) {
        sendTemplated(email, 'login_alert', { name: user.name || email, time: new Date().toUTCString() }).catch(() => {});
      }
      return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }

    if (action === 'forgot-password') {
      const email = String(body.email || '').toLowerCase().trim();
      const origin = body.origin || req.headers.get('origin') || '';
      const { data: user } = await supabase.from('app_users').select('*').eq('email', email).maybeSingle();
      // Always return success (don't leak existence)
      if (user) {
        const token = tokenHex(32);
        const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await supabase.from('password_reset_tokens').insert({ user_id: user.id, token, expires_at: expires });
        const resetUrl = `${origin}/reset-password?token=${token}`;
        await sendTemplated(email, 'password_reset', { name: user.name || email, reset_url: resetUrl, site_url: origin });
      }
      return json({ ok: true });
    }

    if (action === 'reset-password') {
      const token = String(body.token || '');
      const password = String(body.password || '');
      if (!token || password.length < 6) return json({ error: 'Invalid input' }, 400);
      const { data: row } = await supabase.from('password_reset_tokens').select('*').eq('token', token).maybeSingle();
      if (!row || row.used || new Date(row.expires_at) < new Date()) return json({ error: 'Token invalid or expired' }, 400);
      const hash = await bcrypt.hash(password, 10);
      await supabase.from('app_users').update({ password_hash: hash, updated_at: new Date().toISOString() }).eq('id', row.user_id);
      await supabase.from('password_reset_tokens').update({ used: true }).eq('id', row.id);
      return json({ ok: true });
    }

    if (action === 'verify-token') {
      const token = String(body.token || '');
      const { data: row } = await supabase.from('password_reset_tokens').select('*').eq('token', token).maybeSingle();
      if (!row || row.used || new Date(row.expires_at) < new Date()) return json({ valid: false });
      return json({ valid: true });
    }

    if (action === 'send-test') {
      const to = String(body.to || '');
      if (!to) return json({ error: 'recipient required' }, 400);
      const r = await sendMail(to, 'SMTP Test from ' + (await loadSiteName()),
        '<p>If you received this, your SMTP is configured correctly. ✓</p>',
        'SMTP test successful.', 'test');
      return json(r, r.ok ? 200 : 500);
    }

    if (action === 'send-template') {
      const to = String(body.to || '');
      const key = String(body.template || '');
      const vars = body.vars || {};
      const r = await sendTemplated(to, key, vars);
      return json(r);
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
