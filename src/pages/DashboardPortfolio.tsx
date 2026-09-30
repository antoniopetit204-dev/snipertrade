import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getUser, getAccountId } from '@/lib/store';
import { fetchUserBalance, fetchManualTrades, type ManualTrade, type UserBalance } from '@/lib/balance';
import { Wallet, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DashboardPortfolio = () => {
  const user = getUser();
  const account = getAccountId(user);
  const [bal, setBal] = useState<UserBalance | null>(null);
  const [trades, setTrades] = useState<ManualTrade[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!account) { setLoading(false); return; }
    setLoading(true);
    try {
      const [b, t] = await Promise.all([fetchUserBalance(account), fetchManualTrades(account, 100)]);
      setBal(b);
      setTrades(t);
    } catch {} finally { setLoading(false); }
  }, [account]);

  useEffect(() => {
    load();
    const i = setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(i); window.removeEventListener('focus', onFocus); };
  }, [load]);

  if (!user) return null;

  // Open positions = runs whose latest trade shows activity in the last 2 minutes (in-progress sessions)
  const now = Date.now();
  const activeRuns = new Set(
    trades.filter(t => t.created_at && now - new Date(t.created_at).getTime() < 120000).map(t => t.run_id)
  );
  const totalPnL = trades.reduce((s, t) => s + Number(t.profit || 0), 0);
  const wins = trades.filter(t => t.result === 'win').length;

  return (
    <DashboardLayout title="Wallet" icon={<Wallet className="h-5 w-5 text-primary" />}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-mono tracking-wider">Account No: {user.accountNumber || '—'}</p>
          <Button variant="ghost" size="sm" onClick={load} className="h-7 px-2 text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Account Balance</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
              {bal ? bal.balance.toFixed(2) : '—'} <span className="text-sm text-primary">KES</span>
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Open Positions</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground">{activeRuns.size}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total P&L (Recent)</p>
            <p className={`text-2xl sm:text-3xl font-bold font-mono ${totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Deposited</p>
            <p className="text-sm font-mono text-foreground">{(bal?.total_deposited || 0).toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Withdrawn</p>
            <p className="text-sm font-mono text-foreground">{(bal?.total_withdrawn || 0).toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Trades / Wins</p>
            <p className="text-sm font-mono text-foreground">{trades.length} / {wins}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg">
          <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">Trade History</h2>
          </div>
          {trades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-3 sm:px-4 py-2">Time</th>
                    <th className="text-left px-3 sm:px-4 py-2 hidden sm:table-cell">Bot</th>
                    <th className="text-right px-3 sm:px-4 py-2">Stake</th>
                    <th className="text-right px-3 sm:px-4 py-2">P&L</th>
                    <th className="text-right px-3 sm:px-4 py-2">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trades.map((t, i) => (
                    <tr key={t.id || i} className="hover:bg-accent/30">
                      <td className="px-3 sm:px-4 py-2 font-mono text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">
                        {t.created_at ? new Date(t.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </td>
                      <td className="px-3 sm:px-4 py-2 text-foreground hidden sm:table-cell truncate max-w-[150px]">{t.bot_name}</td>
                      <td className="px-3 sm:px-4 py-2 font-mono text-right text-foreground">{Number(t.stake).toFixed(2)}</td>
                      <td className={`px-3 sm:px-4 py-2 font-mono text-right font-medium ${Number(t.profit) >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {Number(t.profit) >= 0 ? '+' : ''}{Number(t.profit).toFixed(2)}
                      </td>
                      <td className="px-3 sm:px-4 py-2 font-mono text-right text-muted-foreground">{Number(t.balance_after).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-xs sm:text-sm">
              {loading ? 'Loading…' : 'No trades yet — run a bot from the Manual Trader.'}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPortfolio;
