// Email auth + transactional email edge function
// Actions: signup, login, forgot-password, reset-password, verify-token,
//          verify-email, resend-verification, refresh-session, logout,
//          list-sessions, revoke-session, send-test, send-template
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

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

const otp6 = () => {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, '0');
};


const render = (tpl: string, vars: Record<string, string>) =>
  (tpl || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));

// ───────── Rate limiting ─────────
// Returns { allowed, retryAfter } based on failure count in window
async function checkRateLimit(identifier: string, action: string, maxFails = 5, windowMin = 15) {
  const since = new Date(Date.now() - windowMin * 60_000).toISOString();
  const { data } = await supabase
    .from('login_attempts')
    .select('id, success, created_at')
    .eq('identifier', identifier)
    .eq('action', action)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);
  const fails = (data || []).filter((r: any) => !r.success).length;
  if (fails >= maxFails) {
    const oldest = (data || []).filter((r: any) => !r.success).pop();
    const lockUntil = oldest ? new Date(new Date(oldest.created_at).getTime() + windowMin * 60_000) : new Date(Date.now() + windowMin * 60_000);
    return { allowed: false, retryAfter: Math.max(60, Math.ceil((lockUntil.getTime() - Date.now()) / 1000)) };
  }
  return { allowed: true, retryAfter: 0 };
}
async function recordAttempt(identifier: string, action: string, success: boolean, ip = '') {
  await supabase.from('login_attempts').insert({ identifier, action, success, ip });
}

// ───────── SMTP ─────────
async function loadSmtp() {
  const { data } = await supabase.from('smtp_config').select('*').limit(1).maybeSingle();
  return data;
}
async function loadSiteName() {
  const { data } = await supabase.from('admin_settings').select('site_name').limit(1).maybeSingle();
  return data?.site_name || 'HFT Pro';
}
async function loadTemplate(key: string) {
  const { data } = await supabase.from('email_templates').select('*').eq('template_key', key).maybeSingle();
  return data;
}

async function sendMail(to: string, subject: string, html: string, text: string, templateKey = '') {
  const smtp = await loadSmtp();
  if (!smtp || !smtp.enabled || !smtp.host) {
    await supabase.from('email_log').insert({ to_email: to, template_key: templateKey, subject, status: 'skipped', error: 'SMTP not configured' });
    return { ok: false, error: 'SMTP not configured' };
  }
  // Auto-correct TLS mode based on port (most shared hosts misconfigure this)
  const port = Number(smtp.port) || 587;
  const tlsImplicit = port === 465 ? true : port === 587 || port === 25 || port === 2525 ? false : Boolean(smtp.secure);

  const fromName = smtp.from_name || (await loadSiteName());
  const fromEmail = smtp.from_email || smtp.username;

  const client = new SMTPClient({
    connection: {
      hostname: smtp.host,
      port,
      tls: tlsImplicit,
      auth: smtp.username ? { username: smtp.username, password: smtp.password } : undefined,
    },
    debug: { allowUnsecure: true, log: false, noStartTLS: !tlsImplicit && port !== 587 },
    client: { warning: 'log' },
  });

  try {
    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      content: text || ' ',
      html,
      // Headers to improve inbox placement on shared hosting
      headers: {
        'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
        'X-Mailer': fromName,
        'X-Priority': '3',
        'MIME-Version': '1.0',
      },
    });
    await supabase.from('email_log').insert({ to_email: to, template_key: templateKey, subject, status: 'sent' });
    return { ok: true };
  } catch (e: any) {
    const msg = String(e?.message || e);
    await supabase.from('email_log').insert({ to_email: to, template_key: templateKey, subject, status: 'failed', error: msg });
    return { ok: false, error: msg };
  } finally {
    try { await client.close(); } catch {}
  }
}

// Sensible HTML fallback for templates that aren't seeded
const FALLBACK_TPL: Record<string, { subject: string; html: string; text: string }> = {
  welcome: {
    subject: 'Welcome to {{site_name}}',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px"><h2>Welcome, {{name}} 👋</h2><p>Your {{site_name}} account is ready. Start exploring the dashboard.</p><p><a href="{{site_url}}/dashboard" style="background:#E5B84B;color:#000;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:bold">Open Dashboard</a></p></div>`,
    text: 'Welcome to {{site_name}}, {{name}}! Visit {{site_url}}/dashboard',
  },
  email_verification: {
    subject: 'Your {{site_name}} verification code: {{otp_code}}',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#fff;color:#111"><h2 style="margin:0 0 8px">Verify your email</h2><p>Hi {{name}}, use the 6-digit code below to activate your {{site_name}} account.</p><div style="margin:24px 0;padding:18px;background:#f4f4f4;border-radius:8px;text-align:center"><div style="font-size:36px;letter-spacing:8px;font-weight:bold;font-family:'Courier New',monospace;color:#111">{{otp_code}}</div><div style="font-size:11px;color:#666;margin-top:6px">Expires in 15 minutes</div></div><p style="font-size:13px;color:#555">Or click this link: <a href="{{verify_url}}">{{verify_url}}</a></p><p style="font-size:11px;color:#888">If you didn't sign up, ignore this email.</p></div>`,
    text: 'Your {{site_name}} verification code: {{otp_code}} (expires in 15 min). Or open: {{verify_url}}',
  },

  password_reset: {
    subject: 'Reset your {{site_name}} password',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px"><h2>Password reset</h2><p>Hi {{name}}, click below to reset your password (valid for 1 hour).</p><p><a href="{{reset_url}}" style="background:#E5B84B;color:#000;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:bold">Reset Password</a></p><p style="font-size:12px;color:#666">If you didn't request this, ignore this email.</p></div>`,
    text: 'Reset your password: {{reset_url}}',
  },
  login_alert: {
    subject: 'New sign-in to {{site_name}}',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px"><h2>New sign-in detected</h2><p>Hi {{name}}, your account was signed in on {{time}}.</p><p style="font-size:12px;color:#666">If this wasn't you, reset your password immediately.</p></div>`,
    text: 'New sign-in to {{site_name}} on {{time}}',
  },
  deposit_success: {
    subject: 'Deposit received - {{site_name}}',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px"><h2>Deposit credited ✓</h2><p>{{amount}} {{currency}} has been credited to your account.</p></div>`,
    text: 'Deposit of {{amount}} {{currency}} credited.',
  },
  withdrawal_update: {
    subject: 'Withdrawal {{status}} - {{site_name}}',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px"><h2>Withdrawal {{status}}</h2><p>Your withdrawal of {{amount}} {{currency}} is now {{status}}.</p></div>`,
    text: 'Withdrawal of {{amount}} {{currency}} is now {{status}}.',
  },
};

async function sendTemplated(to: string, key: string, vars: Record<string, string>) {
  const siteName = await loadSiteName();
  const merged = { site_name: siteName, ...vars };
  const dbTpl = await loadTemplate(key);
  const tpl = (dbTpl && dbTpl.enabled !== false && dbTpl.subject) ? dbTpl : FALLBACK_TPL[key];
  if (!tpl) return { ok: false, error: 'template missing: ' + key };
  return sendMail(to, render(tpl.subject, merged), render(tpl.html, merged), render(tpl.text || '', merged), key);
}

async function shouldNotify(email: string, key: 'notify_login' | 'notify_trades' | 'notify_deposits' | 'notify_withdrawals') {
  const { data } = await supabase.from('user_email_preferences').select('*').eq('identifier', email).maybeSingle();
  if (!data) return true;
  if (!data.enabled) return false;
  return Boolean(data[key]);
}

async function adminSettings() {
  const { data } = await supabase.from('admin_settings').select('require_email_verification, site_name').limit(1).maybeSingle();
  return data || { require_email_verification: false, site_name: 'HFT Pro' };
}

// ───────── Session helpers ─────────
async function createSession(userId: string, email: string, ua: string, ip: string) {
  const refresh = tokenHex(32);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  await supabase.from('auth_sessions').insert({
    user_id: userId, email, refresh_token: refresh, user_agent: ua, ip, expires_at: expires,
  });
  return { refresh_token: refresh, expires_at: expires };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || '';
  const ua = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  let body: any = {};
  try { body = await req.json(); } catch {}

  try {
    if (action === 'signup') {
      const email = String(body.email || '').toLowerCase().trim();
      const password = String(body.password || '');
      const name = String(body.name || '').trim();
      const origin = body.origin || req.headers.get('origin') || '';
      if (!email || !password || password.length < 6) return json({ error: 'Invalid input' }, 400);
      const { data: existing } = await supabase.from('app_users').select('id, verified').eq('email', email).maybeSingle();
      if (existing && existing.verified) return json({ error: 'Account already exists. Please sign in.' }, 409);

      const hash = await bcrypt.hash(password, 10);
      // OTP verification is always required on signup
      let userId = existing?.id;
      if (existing) {
        await supabase.from('app_users').update({ password_hash: hash, name, verified: false, updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        const { data: created, error } = await supabase.from('app_users')
          .insert({ email, password_hash: hash, name, verified: false })
          .select().single();
        if (error) return json({ error: error.message }, 500);
        userId = created.id;
      }
      await supabase.from('user_email_preferences').upsert({ identifier: email, email }, { onConflict: 'identifier' });

      const otp = otp6();
      const token = tokenHex(32);
      const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabase.from('email_verifications').insert({ user_id: userId, email, token, otp_code: otp, expires_at: expires });
      const verifyUrl = `${origin}/auth?verify=${token}`;
      const sendRes = await sendTemplated(email, 'email_verification', { name: name || email, verify_url: verifyUrl, otp_code: otp, site_url: origin });
      return json({ requireVerification: true, email, emailSent: sendRes.ok, sendError: sendRes.ok ? undefined : sendRes.error });
    }

    if (action === 'verify-otp') {
      const email = String(body.email || '').toLowerCase().trim();
      const code = String(body.code || '').trim();
      if (!email || !/^\d{6}$/.test(code)) return json({ error: 'Enter the 6-digit code' }, 400);
      const rl = await checkRateLimit(email, 'verify-otp', 10, 15);
      if (!rl.allowed) return json({ error: 'Too many attempts. Try again later.' }, 429);
      const { data: row } = await supabase.from('email_verifications')
        .select('*').eq('email', email).eq('otp_code', code).eq('used', false)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!row || new Date(row.expires_at) < new Date()) {
        await recordAttempt(email, 'verify-otp', false, ip);
        return json({ error: 'Invalid or expired code' }, 400);
      }
      await supabase.from('app_users').update({ verified: true, updated_at: new Date().toISOString() }).eq('id', row.user_id);
      await supabase.from('email_verifications').update({ used: true }).eq('id', row.id);
      await recordAttempt(email, 'verify-otp', true, ip);
      const { data: user } = await supabase.from('app_users').select('*').eq('id', row.user_id).maybeSingle();
      const session = user ? await createSession(user.id, user.email, ua, ip) : null;
      sendTemplated(email, 'welcome', { name: user?.name || email, site_url: body.origin || '' }).catch(() => {});
      return json({ ok: true, user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null, ...(session || {}) });
    }

    if (action === 'login') {
      const email = String(body.email || '').toLowerCase().trim();
      const password = String(body.password || '');
      const origin = body.origin || req.headers.get('origin') || '';
      const rl = await checkRateLimit(email, 'login', 5, 15);
      if (!rl.allowed) return json({ error: `Too many attempts. Try again in ${Math.ceil(rl.retryAfter / 60)} min.`, retryAfter: rl.retryAfter }, 429);

      const { data: user } = await supabase.from('app_users').select('*').eq('email', email).maybeSingle();
      if (!user) { await recordAttempt(email, 'login', false, ip); return json({ error: 'Invalid credentials' }, 401); }
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) { await recordAttempt(email, 'login', false, ip); return json({ error: 'Invalid credentials' }, 401); }
      if (!user.verified) {
        // Auto-send a fresh OTP so user can verify and continue
        const otp = otp6();
        const token = tokenHex(32);
        const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await supabase.from('email_verifications').insert({ user_id: user.id, email, token, otp_code: otp, expires_at: expires });
        sendTemplated(email, 'email_verification', { name: user.name || email, verify_url: `${origin}/auth?verify=${token}`, otp_code: otp, site_url: origin }).catch(() => {});
        await recordAttempt(email, 'login', false, ip);
        return json({ error: 'Email not verified. We sent you a new code.', requireVerification: true, email }, 403);
      }

      if (!user) { await recordAttempt(email, 'login', false, ip); return json({ error: 'Invalid credentials' }, 401); }
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) { await recordAttempt(email, 'login', false, ip); return json({ error: 'Invalid credentials' }, 401); }
      if (!user.verified) { await recordAttempt(email, 'login', false, ip); return json({ error: 'Email not verified. Check your inbox.', requireVerification: true }, 403); }

      await recordAttempt(email, 'login', true, ip);
      if (await shouldNotify(email, 'notify_login')) {
        sendTemplated(email, 'login_alert', { name: user.name || email, time: new Date().toUTCString() }).catch(() => {});
      }
      const session = await createSession(user.id, email, ua, ip);
      return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, ...session });
    }

    if (action === 'verify-email') {
      const token = String(body.token || '');
      const { data: row } = await supabase.from('email_verifications').select('*').eq('token', token).maybeSingle();
      if (!row || row.used || new Date(row.expires_at) < new Date()) return json({ error: 'Token invalid or expired' }, 400);
      await supabase.from('app_users').update({ verified: true, updated_at: new Date().toISOString() }).eq('id', row.user_id);
      await supabase.from('email_verifications').update({ used: true }).eq('id', row.id);
      const { data: user } = await supabase.from('app_users').select('*').eq('id', row.user_id).maybeSingle();
      const session = user ? await createSession(user.id, user.email, ua, ip) : null;
      return json({ ok: true, user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null, ...(session || {}) });
    }

    if (action === 'resend-verification') {
      const email = String(body.email || '').toLowerCase().trim();
      const origin = body.origin || req.headers.get('origin') || '';
      const rl = await checkRateLimit(email, 'resend-verification', 3, 10);
      if (!rl.allowed) return json({ error: 'Too many requests. Try again later.' }, 429);
      const { data: user } = await supabase.from('app_users').select('*').eq('email', email).maybeSingle();
      if (user && !user.verified) {
        const token = tokenHex(32);
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('email_verifications').insert({ user_id: user.id, email, token, expires_at: expires });
        const verifyUrl = `${origin}/auth?verify=${token}`;
        await sendTemplated(email, 'email_verification', { name: user.name || email, verify_url: verifyUrl, site_url: origin });
      }
      await recordAttempt(email, 'resend-verification', true, ip);
      return json({ ok: true });
    }

    if (action === 'forgot-password') {
      const email = String(body.email || '').toLowerCase().trim();
      const origin = body.origin || req.headers.get('origin') || '';
      const rl = await checkRateLimit(email, 'forgot-password', 5, 15);
      if (!rl.allowed) return json({ error: 'Too many requests. Try again later.' }, 429);
      const { data: user } = await supabase.from('app_users').select('*').eq('email', email).maybeSingle();
      if (user) {
        const token = tokenHex(32);
        const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await supabase.from('password_reset_tokens').insert({ user_id: user.id, token, expires_at: expires });
        const resetUrl = `${origin}/reset-password?token=${token}`;
        await sendTemplated(email, 'password_reset', { name: user.name || email, reset_url: resetUrl, site_url: origin });
      }
      await recordAttempt(email, 'forgot-password', true, ip);
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
      // Invalidate all existing sessions for this user
      await supabase.from('auth_sessions').update({ revoked: true }).eq('user_id', row.user_id);
      return json({ ok: true });
    }

    if (action === 'verify-token') {
      const token = String(body.token || '');
      const { data: row } = await supabase.from('password_reset_tokens').select('*').eq('token', token).maybeSingle();
      if (!row || row.used || new Date(row.expires_at) < new Date()) return json({ valid: false });
      return json({ valid: true });
    }

    if (action === 'refresh-session') {
      const refresh = String(body.refresh_token || '');
      if (!refresh) return json({ error: 'Missing token' }, 400);
      const { data: sess } = await supabase.from('auth_sessions').select('*').eq('refresh_token', refresh).maybeSingle();
      if (!sess || sess.revoked || new Date(sess.expires_at) < new Date()) return json({ error: 'Invalid session' }, 401);
      const { data: user } = await supabase.from('app_users').select('*').eq('id', sess.user_id).maybeSingle();
      if (!user) return json({ error: 'User not found' }, 401);
      // rotate refresh token
      const newRefresh = tokenHex(32);
      const newExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('auth_sessions').update({
        refresh_token: newRefresh, expires_at: newExpires, last_used_at: new Date().toISOString(), user_agent: ua, ip,
      }).eq('id', sess.id);
      return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, refresh_token: newRefresh, expires_at: newExpires });
    }

    if (action === 'logout') {
      const refresh = String(body.refresh_token || '');
      if (refresh) await supabase.from('auth_sessions').update({ revoked: true }).eq('refresh_token', refresh);
      return json({ ok: true });
    }

    if (action === 'list-sessions') {
      const email = String(body.email || '').toLowerCase().trim();
      const { data } = await supabase.from('auth_sessions').select('id, user_agent, ip, last_used_at, created_at, revoked, expires_at')
        .eq('email', email).order('last_used_at', { ascending: false });
      return json({ sessions: data || [] });
    }

    if (action === 'revoke-session') {
      const id = String(body.id || '');
      if (id) await supabase.from('auth_sessions').update({ revoked: true }).eq('id', id);
      return json({ ok: true });
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
