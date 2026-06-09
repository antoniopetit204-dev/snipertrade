import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Wallet, TrendingUp, TrendingDown, Activity, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, CartesianGrid } from 'recharts';

interface Ledger {
  id?: string; pool: number; total_user_stakes: number;
  total_user_payouts: number; min_floor: number; updated_at?: string;
}
interface Trade {
  id: string; deriv_account: string; bot_name: string; stake: number;
  profit: number; result: string; balance_after: number; created_at: string;
}
interface UserStat {
  account: string; email?: string; win_tier?: string;
  trades: number; wins: number; stake: number; profit: number;
}

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const HouseLedgerTab = () => {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [users, setUsers] = useState<Record<string, { email?: string; win_tier?: string }>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: l }, { data: t }, { data: u }] = await Promise.all([
      (supabase as any).from('house_ledger').select('*').limit(1).maybeSingle(),
      (supabase as any).from('manual_trades').select('*').order('created_at', { ascending: false }).limit(200),
      (supabase as any).from('app_users').select('email, win_tier'),
    ]);
    setLedger(l || { pool: 0, total_user_stakes: 0, total_user_payouts: 0, min_floor: 0 });
    setTrades((t || []) as Trade[]);
    const map: Record<string, { email?: string; win_tier?: string }> = {};
    (u || []).forEach((row: any) => { map[row.email] = { email: row.email, win_tier: row.win_tier }; });
    setUsers(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const pool = Number(ledger?.pool || 0);
  const floor = Number(ledger?.min_floor || 0);
  const ratio = floor > 0 ? pool / floor : Infinity;
  const alertLevel: 'ok' | 'warn' | 'crit' = ratio < 1 ? 'crit' : ratio < 1.5 ? 'warn' : 'ok';

  // Per-user aggregates
  const userStats = useMemo<UserStat[]>(() => {
    const m = new Map<string, UserStat>();
    for (const t of trades) {
      const k = t.deriv_account;
      const u = users[k];
      const s = m.get(k) || { account: k, email: u?.email, win_tier: u?.win_tier, trades: 0, wins: 0, stake: 0, profit: 0 };
      s.trades += 1;
      if (t.result === 'win') s.wins += 1;
      s.stake += Number(t.stake);
      s.profit += Number(t.profit);
      m.set(k, s);
    }
    return Array.from(m.values()).sort((a, b) => b.trades - a.trades);
  }, [trades, users]);

  // Tier rollups
  const tierStats = useMemo(() => {
    const tiers: Record<string, { trades: number; wins: number; stake: number; profit: number }> = {
      normal: { trades: 0, wins: 0, stake: 0, profit: 0 },
      high: { trades: 0, wins: 0, stake: 0, profit: 0 },
    };
    for (const s of userStats) {
      const t = s.win_tier === 'high' ? 'high' : 'normal';
      tiers[t].trades += s.trades; tiers[t].wins += s.wins;
      tiers[t].stake += s.stake; tiers[t].profit += s.profit;
    }
    return tiers;
  }, [userStats]);

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      {alertLevel !== 'ok' && (
        <div className={`rounded-lg border p-3 flex items-start gap-2 ${alertLevel === 'crit' ? 'bg-loss/10 border-loss/40' : 'bg-yellow-500/10 border-yellow-500/40'}`}>
          {alertLevel === 'crit' ? <ShieldAlert className="h-4 w-4 text-loss shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />}
          <div className="text-xs">
            <p className={`font-semibold ${alertLevel === 'crit' ? 'text-loss' : 'text-yellow-500'}`}>
              {alertLevel === 'crit' ? 'House pool is BELOW the safety floor — resolver is auto-forcing losses to protect solvency.' : 'House pool approaching safety floor — consider pausing high-risk bots or raising the floor.'}
            </p>
            <p className="text-muted-foreground mt-0.5">Pool: KES {fmt(pool)} • Floor: KES {fmt(floor)} • Ratio: {ratio === Infinity ? '∞' : ratio.toFixed(2) + '×'}</p>
          </div>
        </div>
      )}

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-card border border-primary/30 rounded-lg p-3">
          <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Pool</p>
          <p className={`text-lg font-bold font-mono ${pool >= 0 ? 'text-profit' : 'text-loss'}`}>KES {fmt(pool)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Stakes In</p>
          <p className="text-lg font-bold font-mono text-foreground">KES {fmt(ledger?.total_user_stakes || 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Payouts Out</p>
          <p className="text-lg font-bold font-mono text-loss">KES {fmt(ledger?.total_user_payouts || 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Net House Edge</p>
          <p className="text-lg font-bold font-mono text-profit">KES {fmt(Number(ledger?.total_user_stakes || 0) - Number(ledger?.total_user_payouts || 0))}</p>
        </div>
      </div>

      {/* Win-tier breakdown */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Outcomes by Win Tier</h3>
        <div className="grid grid-cols-2 gap-3">
          {(['normal','high'] as const).map(tier => {
            const t = tierStats[tier];
            const wr = t.trades ? (t.wins / t.trades) * 100 : 0;
            const roi = t.stake ? (t.profit / t.stake) * 100 : 0;
            return (
              <div key={tier} className="bg-secondary/30 rounded p-3 space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground">{tier === 'high' ? '🟢 High Win (target 90%)' : 'Normal'}</p>
                <p className="text-xs">Trades <span className="font-mono text-foreground">{t.trades}</span></p>
                <p className="text-xs">Win rate <span className={`font-mono ${wr >= 50 ? 'text-profit' : 'text-loss'}`}>{wr.toFixed(1)}%</span></p>
                <p className="text-xs">User ROI <span className={`font-mono ${roi >= 0 ? 'text-profit' : 'text-loss'}`}>{roi.toFixed(1)}%</span></p>
                <p className="text-[10px] text-muted-foreground">Stake KES {fmt(t.stake)} • Net KES {fmt(t.profit)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-user table */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> User Performance ({userStats.length})</h3>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={load}>Refresh</Button>
        </div>
        {loading ? <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
          : userStats.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No trades yet.</p>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border">
                <tr className="text-left">
                  <th className="py-2 pr-2">Account</th>
                  <th className="py-2 px-2">Tier</th>
                  <th className="py-2 px-2 text-right">Trades</th>
                  <th className="py-2 px-2 text-right">Win Rate</th>
                  <th className="py-2 px-2 text-right">ROI</th>
                  <th className="py-2 px-2 text-right">Net P/L</th>
                </tr>
              </thead>
              <tbody>
                {userStats.slice(0, 30).map(s => {
                  const wr = (s.wins / s.trades) * 100;
                  const roi = s.stake ? (s.profit / s.stake) * 100 : 0;
                  return (
                    <tr key={s.account} className="border-b border-border/40">
                      <td className="py-2 pr-2 truncate max-w-[140px]">{s.email || s.account}</td>
                      <td className="py-2 px-2">
                        {s.win_tier === 'high'
                          ? <span className="text-[9px] uppercase bg-profit/20 text-profit px-1.5 py-0.5 rounded">High</span>
                          : <span className="text-[9px] uppercase bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">Normal</span>}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">{s.trades}</td>
                      <td className={`py-2 px-2 text-right font-mono ${wr >= 50 ? 'text-profit' : 'text-loss'}`}>{wr.toFixed(0)}%</td>
                      <td className={`py-2 px-2 text-right font-mono ${roi >= 0 ? 'text-profit' : 'text-loss'}`}>{roi.toFixed(1)}%</td>
                      <td className={`py-2 px-2 text-right font-mono ${s.profit >= 0 ? 'text-profit' : 'text-loss'}`}>{fmt(s.profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent resolved trades (audit log) */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-primary" /> Recent Resolved Trades</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b border-border">
              <tr className="text-left">
                <th className="py-2 pr-2">Time</th>
                <th className="py-2 px-2">Account</th>
                <th className="py-2 px-2">Bot</th>
                <th className="py-2 px-2 text-right">Stake</th>
                <th className="py-2 px-2 text-right">P/L</th>
                <th className="py-2 px-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 50).map(t => (
                <tr key={t.id} className="border-b border-border/40">
                  <td className="py-1.5 pr-2 text-muted-foreground">{new Date(t.created_at).toLocaleTimeString()}</td>
                  <td className="py-1.5 px-2 truncate max-w-[120px]">{t.deriv_account}</td>
                  <td className="py-1.5 px-2 truncate max-w-[120px]">{t.bot_name}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{fmt(t.stake)}</td>
                  <td className={`py-1.5 px-2 text-right font-mono ${t.profit >= 0 ? 'text-profit' : 'text-loss'}`}>{fmt(t.profit)}</td>
                  <td className="py-1.5 px-2">
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${t.result === 'win' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'}`}>{t.result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HouseLedgerTab;
