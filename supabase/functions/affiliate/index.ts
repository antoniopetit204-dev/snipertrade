// Affiliate API: click tracking, code validation, dashboard stats, admin view.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ensureAffiliate, recordClick, normalizeCode } from '../_shared/affiliate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function sessionEmail(refresh_token: unknown): Promise<string | null> {
  if (!refresh_token || typeof refresh_token !== 'string') return null;
  const { data } = await sb.from('auth_sessions')
    .select('email, revoked, expires_at').eq('refresh_token', refresh_token).maybeSingle();
  if (!data || data.revoked || new Date(data.expires_at) < new Date()) return null;
  return data.email;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const action = url.searchParams.get('action') || body?.action || 'stats';

    // ── Track a referral link click (public) ──
    if (action === 'click') {
      const isNew = await recordClick(sb, body?.code, body?.visitor_id, {
        ip: req.headers.get('x-forwarded-for') || '',
        user_agent: req.headers.get('user-agent') || '',
        referer: body?.referer || req.headers.get('referer') || '',
        landing_origin: body?.origin || '',
      });
      return json({ success: true, new_click: isNew });
    }

    // ── Validate a code before signup (public) ──
    if (action === 'validate') {
      const code = normalizeCode(body?.code);
      if (!code) return json({ valid: false });
      const { data: aff } = await sb.from('affiliates').select('email, code').eq('code', code).maybeSingle();
      if (!aff) return json({ valid: false });
      const { data: u } = await sb.from('app_users').select('name').eq('email', aff.email).maybeSingle();
      return json({ valid: true, code: aff.code, referrer_name: u?.name || 'A trader' });
    }

    // ── Personal affiliate dashboard (auth) ──
    if (action === 'stats' || action === 'my-link') {
      const email = await sessionEmail(body?.refresh_token);
      if (!email) return json({ error: 'Unauthorized' }, 401);

      const aff = await ensureAffiliate(sb, email);
      if (!aff) return json({ error: 'Could not create affiliate profile' }, 500);

      const { data: settings } = await sb.from('admin_settings').select('*').limit(1).maybeSingle();
      const rates = {
        enabled: !!settings?.affiliate_enabled,
        l1: Number(settings?.affiliate_l1_percent ?? 10),
        l2: Number(settings?.affiliate_l2_percent ?? 3),
        l3: Number(settings?.affiliate_l3_percent ?? 1),
        min_payout: Number(settings?.affiliate_min_payout ?? 100),
      };

      if (action === 'my-link') return json({ success: true, code: aff.code, rates });

      const [{ data: referrals }, { data: commissions }] = await Promise.all([
        sb.from('referrals').select('*').eq('referrer_email', email).order('created_at', { ascending: false }).limit(200),
        sb.from('affiliate_commissions').select('*').eq('affiliate_email', email).order('created_at', { ascending: false }).limit(200),
      ]);

      const mask = (m: string) => {
        const [u, d] = String(m).split('@');
        return d ? `${u.slice(0, 2)}***@${d}` : `${String(m).slice(0, 3)}***`;
      };

      return json({
        success: true,
        code: aff.code,
        rates,
        summary: {
          clicks: Number(aff.clicks || 0),
          signups: Number(aff.signups || 0),
          conversions: Number(aff.conversions || 0),
          total_earned: Number(aff.total_earned || 0),
          pending: (referrals || []).filter((r: any) => r.status === 'pending' && r.level === 1).length,
        },
        referrals: (referrals || []).map((r: any) => ({
          id: r.id, level: r.level, status: r.status,
          referred: mask(r.referred_email),
          first_deposit_amount: Number(r.first_deposit_amount || 0),
          commission_paid: Number(r.commission_paid || 0),
          created_at: r.created_at, converted_at: r.converted_at,
        })),
        commissions: (commissions || []).map((c: any) => ({
          id: c.id, level: c.level, amount: Number(c.amount),
          percent: Number(c.percent), deposit_amount: Number(c.deposit_amount),
          referred: mask(c.referred_email), created_at: c.created_at,
        })),
      });
    }

    // ── Admin overview (auth + admin role) ──
    if (action === 'admin-list') {
      const email = await sessionEmail(body?.refresh_token);
      if (!email) return json({ error: 'Unauthorized' }, 401);
      const { data: me } = await sb.from('app_users').select('role').eq('email', email).maybeSingle();
      if (me?.role !== 'admin') return json({ error: 'Forbidden' }, 403);

      const [{ data: affiliates }, { data: commissions }, { data: referrals }] = await Promise.all([
        sb.from('affiliates').select('*').order('total_earned', { ascending: false }).limit(500),
        sb.from('affiliate_commissions').select('*').order('created_at', { ascending: false }).limit(500),
        sb.from('referrals').select('*').order('created_at', { ascending: false }).limit(500),
      ]);
      return json({ success: true, affiliates: affiliates || [], commissions: commissions || [], referrals: referrals || [] });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (e) {
    console.error('affiliate error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
