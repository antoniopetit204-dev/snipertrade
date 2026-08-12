// Server-authoritative trade engine.
//
// The client can no longer influence outcomes: a *run session* is created on
// the server (action=start) with a locked win/loss schedule derived from the
// user's win tier. Each round (action=resolve) consumes the next slot of that
// schedule — the server tracks `next_round`, so replaying, skipping or
// re-sending different parameters cannot change the result. When the last
// round is consumed the run is marked complete and the schedule is discarded,
// so the tier rule resets cleanly for the next run.
//
//   High tier : 90%  → 20 runs = 18 wins, 10 runs = 9 wins
//   Normal    : 50%  → 20 runs = 10 wins
//   Low       : 10%  → 20 runs = 2 wins
//
// Payout safety: if the house pool (or the user balance) cannot cover a full
// win payout, the payout is CAPPED — the round still counts as a win, so the
// exact win/loss counts of the tier are always preserved.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Account win tiers — enforced EXACTLY across a run session
const TIER_WIN_PROB: Record<string, number> = { high: 0.90, normal: 0.50, low: 0.10 };
// Fallback probabilities by bot risk tier when the user has no explicit tier
const BASE_WIN_PROB: Record<string, number> = { low: 0.62, normal: 0.48, high: 0.32 };
// Losses cost the full stake; wins are shrunk so a loss always outweighs a win.
const WIN_SHRINK = 0.80;
const MAX_PAYOUT_MULT = 10;
const MAX_STAKE = 100_000;
const MAX_ROUNDS = 1000;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a locked schedule with EXACTLY round(n*p) wins, randomly ordered. */
function buildSchedule(n: number, p: number): boolean[] {
  const targetWins = Math.round(n * p);
  const slots: boolean[] = Array.from({ length: n }, (_, i) => i < targetWins);
  const rand = mulberry32((Math.random() * 0xffffffff) >>> 0);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

async function getBalance(sb: any, account: string) {
  const { data } = await sb.from('user_balances').select('*').eq('deriv_account', account).maybeSingle();
  return { row: data, balance: Number(data?.balance || 0) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const action = (body?.action || 'resolve').toString();
    const refresh_token = body?.refresh_token;

    // ── AUTH ──
    if (!refresh_token || typeof refresh_token !== 'string')
      return json({ error: 'Unauthorized: missing session token' }, 401);
    const { data: session } = await supabase.from('auth_sessions')
      .select('id, user_id, email, revoked, expires_at')
      .eq('refresh_token', refresh_token).maybeSingle();
    if (!session || session.revoked || new Date(session.expires_at) < new Date())
      return json({ error: 'Unauthorized: invalid or expired session' }, 401);

    // ─────────────────────────── START A RUN ───────────────────────────
    if (action === 'start') {
      const { deriv_account, bot_id, stake, payout_multiplier, total_rounds } = body || {};
      const stakeN = Number(stake);
      const payoutMult = Number(payout_multiplier);
      const roundsN = Math.floor(Number(total_rounds));

      if (!deriv_account) return json({ error: 'deriv_account required' }, 400);
      if (!(stakeN > 0) || stakeN > MAX_STAKE) return json({ error: `stake must be between 0 and ${MAX_STAKE}` }, 400);
      if (!(payoutMult > 1) || payoutMult > MAX_PAYOUT_MULT) return json({ error: 'invalid payout multiplier' }, 400);
      if (!Number.isFinite(roundsN) || roundsN < 1 || roundsN > MAX_ROUNDS)
        return json({ error: `total_rounds must be 1..${MAX_ROUNDS}` }, 400);

      const { balance } = await getBalance(supabase, deriv_account);
      if (balance < stakeN) return json({ error: 'Insufficient balance to start this run' }, 400);

      // Close any other active run for this user — one live run at a time.
      await supabase.from('trade_runs')
        .update({ status: 'abandoned', completed_at: new Date().toISOString() })
        .eq('email', session.email).eq('status', 'active');

      let winTier = 'normal';
      const { data: u } = await supabase.from('app_users')
        .select('win_tier').eq('email', session.email).maybeSingle();
      if (u?.win_tier) winTier = u.win_tier;

      let riskTier = 'normal';
      if (bot_id) {
        const { data: b } = await supabase.from('bots').select('risk_tier').eq('id', bot_id).maybeSingle();
        if (b?.risk_tier) riskTier = b.risk_tier;
      }

      const p = TIER_WIN_PROB[winTier] ?? (BASE_WIN_PROB[riskTier] ?? BASE_WIN_PROB.normal);
      const schedule = buildSchedule(roundsN, p);
      const targetWins = schedule.filter(Boolean).length;
      const runId = crypto.randomUUID();

      const { error: insErr } = await supabase.from('trade_runs').insert({
        run_id: runId, email: session.email, deriv_account,
        bot_id: bot_id || null, stake: stakeN, payout_multiplier: payoutMult,
        total_rounds: roundsN, win_tier: winTier, target_wins: targetWins,
        schedule, next_round: 1, status: 'active',
      });
      if (insErr) return json({ error: 'Failed to create run: ' + insErr.message }, 500);

      return json({
        success: true, run_id: runId, total_rounds: roundsN,
        target_wins: targetWins, win_tier: winTier, risk_tier: riskTier,
        stake: stakeN, payout_multiplier: payoutMult,
      });
    }

    // ─────────────────────────── STOP A RUN ───────────────────────────
    if (action === 'stop') {
      const { run_id } = body || {};
      if (run_id) {
        await supabase.from('trade_runs')
          .update({ status: 'stopped', completed_at: new Date().toISOString() })
          .eq('run_id', run_id).eq('email', session.email).eq('status', 'active');
      }
      return json({ success: true });
    }

    // ─────────────────────────── RESOLVE A ROUND ───────────────────────
    const { run_id, label } = body || {};
    if (!run_id || typeof run_id !== 'string')
      return json({ error: 'run_id required — start a run first' }, 400);

    const { data: run } = await supabase.from('trade_runs')
      .select('*').eq('run_id', run_id).maybeSingle();
    if (!run) return json({ error: 'Run not found' }, 404);
    if (run.email !== session.email) return json({ error: 'Forbidden: run belongs to another user' }, 403);
    if (run.status !== 'active')
      return json({ error: `Run already ${run.status}`, run_complete: true, status: run.status }, 409);

    const roundIndex = Number(run.next_round);
    const totalRounds = Number(run.total_rounds);
    if (roundIndex > totalRounds) {
      await supabase.from('trade_runs')
        .update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', run.id);
      return json({ error: 'Run already finished', run_complete: true, status: 'completed' }, 409);
    }

    // Every economic parameter comes from the server-created run row.
    const stakeN = Number(run.stake);
    const payoutMult = Number(run.payout_multiplier);
    const schedule: boolean[] = Array.isArray(run.schedule) ? run.schedule : [];
    const intendedWin = !!schedule[roundIndex - 1];

    // ── USER BALANCE (server-authoritative) ──
    const { row: balRow, balance } = await getBalance(supabase, run.deriv_account);
    if (balance < stakeN) {
      await supabase.from('trade_runs').update({
        status: 'insufficient_funds', completed_at: new Date().toISOString(),
      }).eq('id', run.id);
      return json({ error: 'Insufficient balance', run_complete: true, balance }, 400);
    }

    // ── HOUSE LEDGER + PAYOUT CAP ──
    const { data: ledger } = await supabase.from('house_ledger').select('*').limit(1).maybeSingle();
    const pool = Number(ledger?.pool || 0);
    const minFloor = Number(ledger?.min_floor || 0);
    const safeFloor = run.win_tier === 'high' ? minFloor / 2 : minFloor;

    const fullWinProfit = +(stakeN * (payoutMult - 1) * WIN_SHRINK).toFixed(2);
    // Cap — never flip the outcome, only shrink the payout.
    const affordable = Math.max(0, +(pool - safeFloor).toFixed(2));
    const winProfit = intendedWin ? Math.min(fullWinProfit, affordable) : 0;
    const payoutCapped = intendedWin && winProfit < fullWinProfit;

    const won = intendedWin;
    const profit = won ? winProfit : -stakeN;
    const newBalance = +(balance + profit).toFixed(2);
    const effectivePayout = won ? +(stakeN + winProfit).toFixed(2) : 0;
    const newPool = +(pool + (won ? -winProfit : stakeN)).toFixed(2);

    // Persist balance
    if (balRow) {
      await supabase.from('user_balances').update({ balance: newBalance }).eq('deriv_account', run.deriv_account);
    } else {
      await supabase.from('user_balances').insert({ deriv_account: run.deriv_account, balance: newBalance });
    }

    // Persist ledger
    if (ledger?.id) {
      await supabase.from('house_ledger').update({
        pool: newPool,
        total_user_stakes: +(Number(ledger.total_user_stakes || 0) + stakeN).toFixed(2),
        total_user_payouts: +(Number(ledger.total_user_payouts || 0) + effectivePayout).toFixed(2),
        updated_at: new Date().toISOString(),
      }).eq('id', ledger.id);
    } else {
      await supabase.from('house_ledger').insert({
        pool: won ? -winProfit : stakeN, total_user_stakes: stakeN, total_user_payouts: effectivePayout,
      });
    }

    // Trade record (label is cosmetic only)
    await supabase.from('manual_trades').insert({
      deriv_account: run.deriv_account,
      bot_id: run.bot_id,
      bot_name: (typeof label === 'string' && label.slice(0, 160)) || 'Trade',
      stake: stakeN,
      payout: effectivePayout,
      profit,
      result: won ? 'win' : 'loss',
      balance_after: newBalance,
      run_id: run.run_id,
    });

    // Advance the run — and auto-complete + reset on the final round.
    const nextRound = roundIndex + 1;
    const isComplete = nextRound > totalRounds;
    const wins = Number(run.wins) + (won ? 1 : 0);
    const losses = Number(run.losses) + (won ? 0 : 1);
    await supabase.from('trade_runs').update({
      next_round: nextRound,
      wins, losses,
      realized_pnl: +(Number(run.realized_pnl) + profit).toFixed(2),
      status: isComplete ? 'completed' : 'active',
      completed_at: isComplete ? new Date().toISOString() : null,
    }).eq('id', run.id);

    return json({
      success: true,
      won,
      profit,
      payout: effectivePayout,
      payout_capped: payoutCapped,
      balance_after: newBalance,
      round: roundIndex,
      total_rounds: totalRounds,
      wins, losses,
      target_wins: Number(run.target_wins),
      run_complete: isComplete,
      win_tier: run.win_tier,
      pool_after: newPool,
      pool_warning: minFloor > 0 && newPool < minFloor * 1.5,
    });
  } catch (e) {
    console.error('resolve-trade error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
