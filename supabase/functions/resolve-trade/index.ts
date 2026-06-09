// Server-side trade resolution. Guarantees the house never goes into loss
// while honoring per-user win tiers and per-bot risk tiers.
// Requires a valid session: caller must pass `refresh_token` (issued by the
// auth-email login flow) in the body. This blocks any client-side bypass.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Base win probabilities by bot risk tier (house edge built in)
const BASE_WIN_PROB: Record<string, number> = {
  low: 0.62,
  normal: 0.48,
  high: 0.32,
};
const HIGH_TIER_WIN_PROB = 0.90;
// Losses always cost full stake; wins are shrunk by this factor so the
// magnitude of a loss exceeds the magnitude of a win even when users win often.
const WIN_SHRINK = 0.80;
// Hard cap on payout multiplier the client can request (defence in depth).
const MAX_PAYOUT_MULT = 10;
const MAX_STAKE = 100_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const { deriv_account, email, bot_id, stake, payout_multiplier, refresh_token } = body || {};

    // ── AUTH ── validate session token against auth_sessions
    if (!refresh_token || typeof refresh_token !== 'string') {
      return json({ error: 'Unauthorized: missing session token' }, 401);
    }
    const { data: session } = await supabase.from('auth_sessions')
      .select('id, user_id, email, revoked, expires_at')
      .eq('refresh_token', refresh_token).maybeSingle();
    if (!session || session.revoked || new Date(session.expires_at) < new Date()) {
      return json({ error: 'Unauthorized: invalid or expired session' }, 401);
    }
    // The trade must belong to the authenticated user.
    const callerEmail = (email || deriv_account || '').toString();
    if (callerEmail && callerEmail !== session.email) {
      return json({ error: 'Forbidden: cannot resolve trade for another user' }, 403);
    }

    // ── INPUT VALIDATION ──
    const stakeN = Number(stake);
    const payoutMult = Number(payout_multiplier);
    if (!deriv_account || !(stakeN > 0) || !(payoutMult > 1))
      return json({ error: 'deriv_account, stake>0, payout_multiplier>1 required' }, 400);
    if (stakeN > MAX_STAKE) return json({ error: `stake exceeds max ${MAX_STAKE}` }, 400);
    if (payoutMult > MAX_PAYOUT_MULT) return json({ error: `payout_multiplier exceeds max ${MAX_PAYOUT_MULT}` }, 400);

    // ── USER TIER ──
    let winTier = 'normal';
    const { data: u } = await supabase.from('app_users')
      .select('win_tier').eq('email', session.email).maybeSingle();
    if (u?.win_tier) winTier = u.win_tier;

    // ── BOT TIER ──
    let riskTier = 'normal';
    if (bot_id) {
      const { data: b } = await supabase.from('bots')
        .select('risk_tier').eq('id', bot_id).maybeSingle();
      if (b?.risk_tier) riskTier = b.risk_tier;
    }

    // ── PROBABILITY ──
    let p = BASE_WIN_PROB[riskTier] ?? BASE_WIN_PROB.normal;
    if (winTier === 'high') p = HIGH_TIER_WIN_PROB;

    // ── LEDGER ──
    const { data: ledger } = await supabase.from('house_ledger')
      .select('*').limit(1).maybeSingle();
    const pool = Number(ledger?.pool || 0);
    const minFloor = Number(ledger?.min_floor || 0);
    const winProfit = +(stakeN * (payoutMult - 1) * WIN_SHRINK).toFixed(2);

    // HOUSE SAFETY: paying out this win must not push pool below safe floor.
    // (For high-tier users we relax the floor to floor/2 so they keep their
    //  90% feel — but never below that.)
    const safeFloor = winTier === 'high' ? minFloor / 2 : minFloor;
    const canAfford = (pool - winProfit) >= safeFloor;
    const won = canAfford ? Math.random() < p : false;

    const profit = won ? winProfit : -stakeN;
    const housePoolDelta = won ? -winProfit : stakeN;
    const effectivePayout = won ? +(stakeN + winProfit).toFixed(2) : 0;
    const newPool = +(pool + housePoolDelta).toFixed(2);

    // Defensive: a losing trade must never reduce the pool. If somehow
    // newPool < safeFloor after applying a loss-credit, refuse the trade.
    if (newPool < safeFloor && !won) {
      // This branch should be unreachable (loss always adds stake), but if
      // ledger is corrupted we bail rather than persist an unsafe state.
      return json({ error: 'House safety violation — please contact admin' }, 503);
    }

    if (ledger?.id) {
      await supabase.from('house_ledger').update({
        pool: newPool,
        total_user_stakes: +(Number(ledger.total_user_stakes || 0) + stakeN).toFixed(2),
        total_user_payouts: +(Number(ledger.total_user_payouts || 0) + effectivePayout).toFixed(2),
        updated_at: new Date().toISOString(),
      }).eq('id', ledger.id);
    } else {
      await supabase.from('house_ledger').insert({
        pool: housePoolDelta,
        total_user_stakes: stakeN,
        total_user_payouts: effectivePayout,
      });
    }

    const poolWarning = minFloor > 0 && newPool < minFloor * 1.5;

    return json({
      success: true,
      won,
      profit,
      payout: effectivePayout,
      win_tier: winTier,
      risk_tier: riskTier,
      house_safe: canAfford,
      pool_warning: poolWarning,
      pool_after: newPool,
    });
  } catch (e) {
    console.error('resolve-trade error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
