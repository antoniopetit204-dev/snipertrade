// Claim signup bonus — server authoritative
// Requires refresh_token from an active session. Verifies:
//  - admin has enabled bonuses
//  - user hasn't claimed before
//  - user's total completed deposits >= configured minimum
// Credits the bonus to user_balances and marks app_users.bonus_claimed_at.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const body = await req.json().catch(() => ({}));
    const { refresh_token, deriv_account } = body || {};

    if (!refresh_token || typeof refresh_token !== 'string')
      return json({ error: 'Unauthorized' }, 401);
    if (!deriv_account || typeof deriv_account !== 'string')
      return json({ error: 'deriv_account required' }, 400);

    const { data: session } = await supabase.from('auth_sessions')
      .select('id, user_id, email, revoked, expires_at')
      .eq('refresh_token', refresh_token).maybeSingle();
    if (!session || session.revoked || new Date(session.expires_at) < new Date())
      return json({ error: 'Session invalid' }, 401);

    // Ensure the account belongs to the authenticated user
    if (deriv_account !== session.email && deriv_account !== 'admin')
      return json({ error: 'Account mismatch' }, 403);

    // Load admin config
    const { data: settings } = await supabase.from('admin_settings')
      .select('bonus_enabled, bonus_amount, bonus_min_deposit').limit(1).maybeSingle();
    const enabled = !!(settings as any)?.bonus_enabled;
    const bonusAmt = Number((settings as any)?.bonus_amount ?? 0);
    const minDep = Number((settings as any)?.bonus_min_deposit ?? 1500);
    if (!enabled) return json({ error: 'Bonus program is currently disabled' }, 400);
    if (!(bonusAmt > 0)) return json({ error: 'Bonus amount not configured' }, 400);

    // Check user hasn't claimed
    const { data: user } = await supabase.from('app_users')
      .select('id, email, bonus_claimed_at').eq('email', session.email).maybeSingle();
    if (!user) return json({ error: 'User not found' }, 404);
    if (user.bonus_claimed_at) return json({ error: 'Bonus already claimed' }, 409);

    // Sum completed/credited deposits for this account
    const { data: deps } = await supabase.from('deposits')
      .select('amount, status, credited')
      .eq('deriv_account', deriv_account);
    const totalDeposited = (deps || [])
      .filter((d: any) => d.credited === true || d.status === 'completed')
      .reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
    if (totalDeposited < minDep)
      return json({ error: `Minimum deposit of KES ${minDep} required to claim`, total_deposited: totalDeposited, min_required: minDep }, 400);

    // Credit balance
    const { data: bal } = await supabase.from('user_balances')
      .select('id, balance').eq('deriv_account', deriv_account).maybeSingle();
    const newBal = Number(bal?.balance || 0) + bonusAmt;
    if (bal?.id) {
      await supabase.from('user_balances').update({ balance: newBal }).eq('id', bal.id);
    } else {
      await supabase.from('user_balances').insert({ deriv_account, balance: newBal });
    }

    // Mark as claimed atomically-ish (guarded by bonus_claimed_at IS NULL)
    const { data: upd, error: updErr } = await supabase.from('app_users')
      .update({ bonus_claimed_at: new Date().toISOString(), bonus_claimed_amount: bonusAmt })
      .eq('id', user.id).is('bonus_claimed_at', null).select('id');
    if (updErr || !upd?.length) {
      // Race — revert credit
      if (bal?.id) await supabase.from('user_balances').update({ balance: Number(bal?.balance || 0) }).eq('id', bal.id);
      return json({ error: 'Bonus already claimed' }, 409);
    }

    return json({ success: true, bonus: bonusAmt, new_balance: newBal });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
