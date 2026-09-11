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

/**
 * Resolves the caller's email. Primary path is the refresh token; if the token
 * was rotated/expired we fall back to "does this email still have any live
 * session?" so the affiliate page never dies on a stale token.
 */
async function sessionEmail(refresh_token: unknown, emailHint?: unknown): Promise<string | null> {
  if (typeof refresh_token === 'string' && refresh_token) {
    const { data } = await sb.from('auth_sessions')
      .select('email, revoked, expires_at').eq('refresh_token', refresh_token).maybeSingle();
    if (data && !data.revoked && new Date(data.expires_at) >= new Date()) return data.email;
  }
  const hint = String(emailHint || '').toLowerCase().trim();
  if (!hint) return null;
  const { data: live } = await sb.from('auth_sessions')
    .select('email').eq('email', hint).eq('revoked', false)
    .gt('expires_at', new Date().toISOString()).limit(1).maybeSingle();
  return live?.email || null;
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

    // ── Partnership request (auth) ──
    if (action === 'partner-request') {
      const email = await sessionEmail(body?.refresh_token, body?.email);
      if (!email) return json({ error: 'Your session has expired. Please sign in again.' });

      const { data: settings } = await sb.from('admin_settings').select('*').limit(1).maybeSingle();
      const minDeposit = Number(settings?.partner_min_deposit ?? 0);
      const needsApproval = settings?.partner_require_approval !== false;

      const { data: u } = await sb.from('app_users').select('partner_status').eq('email', email).maybeSingle();
      if (u?.partner_status === 'approved') return json({ success: true, status: 'approved' });
      if (u?.partner_status === 'pending') return json({ success: true, status: 'pending' });

      const { data: bal } = await sb.from('user_balances').select('total_deposited').eq('deriv_account', email).maybeSingle();
      const deposited = Number(bal?.total_deposited || 0);
      if (deposited < minDeposit) {
        return json({ error: `You need total deposits of at least KES ${minDeposit} to apply. You have deposited KES ${deposited.toFixed(2)} so far.` });
      }

      const now = new Date().toISOString();
      const status = needsApproval ? 'pending' : 'approved';
      await sb.from('app_users').update({
        partner_status: status,
        partner_requested_at: now,
        ...(status === 'approved' ? { partner_approved_at: now } : {}),
      }).eq('email', email);
      if (status === 'approved') await ensureAffiliate(sb, email);
      return json({ success: true, status });
    }

    // ── Admin: approve / reject a partnership request ──
    if (action === 'partner-approve' || action === 'partner-reject') {
      const email = await sessionEmail(body?.refresh_token, body?.email);
      if (!email) return json({ error: 'Your session has expired. Please sign in again.' });
      const { data: me } = await sb.from('app_users').select('role').eq('email', email).maybeSingle();
      if (me?.role !== 'admin') return json({ error: 'Only an administrator can do that.' });

      const target = String(body?.target_email || '').toLowerCase().trim();
      if (!target) return json({ error: 'Missing the account to update.' });
      const approved = action === 'partner-approve';
      await sb.from('app_users').update({
        partner_status: approved ? 'approved' : 'rejected',
        partner_approved_at: approved ? new Date().toISOString() : null,
        partner_note: String(body?.note || '').slice(0, 300),
      }).eq('email', target);
      if (approved) await ensureAffiliate(sb, target);
      return json({ success: true });
    }

    // ── Personal partnership dashboard (auth) ──
    if (action === 'stats' || action === 'my-link') {
      const email = await sessionEmail(body?.refresh_token, body?.email);
      if (!email) return json({ error: 'Your session has expired. Please sign in again.' });

      const aff = await ensureAffiliate(sb, email);
      if (!aff) return json({ error: 'Could not create your partnership profile. Please try again.' });

      const { data: settings } = await sb.from('admin_settings').select('*').limit(1).maybeSingle();
      const rates = {
        enabled: !!settings?.affiliate_enabled,
        l1: Number(settings?.affiliate_l1_percent ?? 10),
        l2: Number(settings?.affiliate_l2_percent ?? 3),
        l3: Number(settings?.affiliate_l3_percent ?? 1),
        min_payout: Number(settings?.affiliate_min_payout ?? 100),
      };

      const { data: meUser } = await sb.from('app_users')
        .select('partner_status, partner_note, account_number').eq('email', email).maybeSingle();
      const { data: myBal } = await sb.from('user_balances')
        .select('total_deposited').eq('deriv_account', email).maybeSingle();
      const partner = {
        status: meUser?.partner_status || 'none',
        note: meUser?.partner_note || '',
        account_number: meUser?.account_number || '',
        min_deposit: Number(settings?.partner_min_deposit ?? 0),
        require_approval: settings?.partner_require_approval !== false,
        total_deposited: Number(myBal?.total_deposited || 0),
      };

      if (action === 'my-link') return json({ success: true, code: aff.code, rates, partner });

      if (partner.status !== 'approved') {
        return json({
          success: true, code: aff.code, rates, partner, locked: true,
          summary: { clicks: 0, signups: 0, conversions: 0, total_earned: 0, pending: 0 },
          referrals: [], commissions: [],
        });
      }

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
        partner,
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
      const email = await sessionEmail(body?.refresh_token, body?.email);
      if (!email) return json({ error: 'Unauthorized' }, 401);
      const { data: me } = await sb.from('app_users').select('role').eq('email', email).maybeSingle();
      if (me?.role !== 'admin') return json({ error: 'Forbidden' }, 403);

      const [{ data: affiliates }, { data: commissions }, { data: referrals }, { data: requests }] = await Promise.all([
        sb.from('affiliates').select('*').order('total_earned', { ascending: false }).limit(500),
        sb.from('affiliate_commissions').select('*').order('created_at', { ascending: false }).limit(500),
        sb.from('referrals').select('*').order('created_at', { ascending: false }).limit(500),
        sb.from('app_users')
          .select('email, name, account_number, partner_status, partner_requested_at, partner_approved_at, partner_note')
          .neq('partner_status', 'none').order('partner_requested_at', { ascending: false }).limit(500),
      ]);
      // Attach lifetime deposits so admins can verify the qualifying deposit.
      const emails = (requests || []).map((r: any) => r.email);
      const { data: bals } = emails.length
        ? await sb.from('user_balances').select('deriv_account, total_deposited').in('deriv_account', emails)
        : { data: [] as any[] };
      const depMap = new Map((bals || []).map((b: any) => [b.deriv_account, Number(b.total_deposited || 0)]));
      return json({
        success: true,
        affiliates: affiliates || [],
        commissions: commissions || [],
        referrals: referrals || [],
        requests: (requests || []).map((r: any) => ({ ...r, total_deposited: depMap.get(r.email) || 0 })),
      });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (e) {
    console.error('affiliate error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
