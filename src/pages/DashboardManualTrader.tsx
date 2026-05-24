import { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getUser, getAccountId } from '@/lib/store';
import { fetchBots } from '@/lib/db';
import { fetchUserBalance, updateUserBalance, insertManualTrade, fetchManualTrades, type ManualTrade } from '@/lib/balance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bot as BotIcon, Play, Square, Zap, TrendingUp, TrendingDown, Wallet, Activity, ChevronRight, Trophy, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Bot } from '@/lib/store';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LAST_BOT_KEY = 'hft_last_manual_bot';

const WIN_RATE = 0.5;     // 50%
const PAYOUT_MULTIPLIER = 1.85; // typical binary payout on win

const DashboardManualTrader = () => {
  const user = getUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [balance, setBalance] = useState(0);
  const [stake, setStake] = useState(10);
  const [runs, setRuns] = useState(10);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [sessionPnL, setSessionPnL] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [history, setHistory] = useState<ManualTrade[]>([]);
  const [liveTrade, setLiveTrade] = useState<{ status: 'pending' | 'win' | 'loss'; profit: number } | null>(null);
  const stopRef = useRef(false);

  const account = getAccountId(user);

  const refresh = async () => {
    if (!account) return;
    const [b, h] = await Promise.all([fetchUserBalance(account), fetchManualTrades(account, 50)]);
    setBalance(b.balance);
    setHistory(h);
  };

  useEffect(() => {
    fetchBots().then(setBots);
    refresh();
  }, [account]);

  const accessibleBots = useMemo(() => bots.filter(b => b.enabled !== false), [bots]);

  const runOne = async (runId: string, currentBalance: number): Promise<number> => {
    setLiveTrade({ status: 'pending', profit: 0 });
    // simulate tick movement / fancy spinner pause
    await new Promise(r => setTimeout(r, 700 + Math.random() * 600));

    const won = Math.random() < WIN_RATE;
    const profit = won ? +(stake * (PAYOUT_MULTIPLIER - 1)).toFixed(2) : -stake;
    const newBalance = +(currentBalance + profit).toFixed(2);

    setLiveTrade({ status: won ? 'win' : 'loss', profit });
    setSessionPnL(p => +(p + profit).toFixed(2));
    if (won) setWins(w => w + 1); else setLosses(l => l + 1);
    setBalance(newBalance);

    await updateUserBalance(account, newBalance);
    await insertManualTrade({
      deriv_account: account,
      bot_id: selectedBot?.id || null,
      bot_name: selectedBot?.name || 'Manual',
      stake, payout: won ? +(stake * PAYOUT_MULTIPLIER).toFixed(2) : 0,
      profit, result: won ? 'win' : 'loss',
      balance_after: newBalance, run_id: runId,
    });

    await new Promise(r => setTimeout(r, 450));
    setLiveTrade(null);
    return newBalance;
  };

  const handleRun = async () => {
    if (!account) { toast({ title: 'Connect your account first', variant: 'destructive' }); return; }
    if (!selectedBot) { toast({ title: 'Select a bot to run', variant: 'destructive' }); return; }
    if (stake <= 0 || runs <= 0) { toast({ title: 'Stake & runs must be > 0', variant: 'destructive' }); return; }
    if (balance < stake) { toast({ title: 'Insufficient balance', description: 'Deposit funds to start trading.', variant: 'destructive' }); return; }

    setRunning(true); stopRef.current = false;
    setCompleted(0); setSessionPnL(0); setWins(0); setLosses(0);
    const runId = crypto.randomUUID();
    let bal = balance;
    for (let i = 0; i < runs; i++) {
      if (stopRef.current) break;
      if (bal < stake) {
        toast({ title: 'Balance depleted', description: 'Stopping bot run.', variant: 'destructive' });
        break;
      }
      bal = await runOne(runId, bal);
      setCompleted(i + 1);
    }
    setRunning(false);
    await fetchManualTrades(account, 50).then(setHistory);
    toast({ title: 'Run complete', description: `P/L: ${sessionPnL >= 0 ? '+' : ''}${sessionPnL.toFixed(2)} KES` });
  };

  const handleStop = () => { stopRef.current = true; };

  if (!user) return null;

  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(0) : '—';

  return (
    <DashboardLayout title="Manual Trader" icon={<Zap className="h-5 w-5 text-primary" />}
      subtitle="Run any bot on your internal balance — 50% win rate, fully simulated">
      <div className="space-y-4 max-w-6xl mx-auto">

        {/* Hero balance / session stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-foreground">KES {balance.toFixed(2)}</p>
            <button onClick={() => navigate('/dashboard/deposit')}
              className="mt-1 text-[10px] text-primary hover:underline">+ Deposit</button>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Session P/L</span>
            </div>
            <p className={`text-base sm:text-lg font-bold font-mono ${sessionPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
              {sessionPnL >= 0 ? '+' : ''}{sessionPnL.toFixed(2)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="h-3.5 w-3.5 text-profit" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Wins / Losses</span>
            </div>
            <p className="text-base sm:text-lg font-bold font-mono text-foreground">
              <span className="text-profit">{wins}</span> / <span className="text-loss">{losses}</span>
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Win Rate</span>
            </div>
            <p className="text-base sm:text-lg font-bold font-mono text-primary">{winRate}%</p>
            <p className="text-[10px] text-muted-foreground">{completed}/{runs} runs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bot picker */}
          <div className="bg-card border border-border rounded-lg lg:col-span-1">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <BotIcon className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">Select Bot</h3>
            </div>
            <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
              {accessibleBots.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">No bots available</p>
              )}
              {accessibleBots.map(bot => (
                <button key={bot.id}
                  onClick={() => setSelectedBot(bot)}
                  className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors ${
                    selectedBot?.id === bot.id ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-accent/40'
                  }`}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{bot.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{bot.strategy}</p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Control panel + live trade */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Bot</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedBot ? selectedBot.name : 'No bot selected'}
                  </p>
                </div>
                {selectedBot && (
                  <span className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary">{selectedBot.strategy}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Stake / trade (KES)</Label>
                  <Input type="number" min={1} value={stake} onChange={e => setStake(Math.max(1, Number(e.target.value) || 0))}
                    disabled={running} className="bg-secondary border-border font-mono text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Number of runs</Label>
                  <Input type="number" min={1} max={500} value={runs} onChange={e => setRuns(Math.min(500, Math.max(1, Number(e.target.value) || 0)))}
                    disabled={running} className="bg-secondary border-border font-mono text-sm" />
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {[5, 10, 25, 50, 100, 200].map(n => (
                  <button key={n} disabled={running} onClick={() => setRuns(n)}
                    className="px-2 py-0.5 rounded-full bg-secondary border border-border text-[10px] hover:bg-primary/10 disabled:opacity-50">
                    {n} runs
                  </button>
                ))}
              </div>

              {!running ? (
                <Button onClick={handleRun} disabled={!selectedBot || balance < stake}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                  <Play className="h-4 w-4 mr-1" /> Start Bot ({runs} runs × KES {stake})
                </Button>
              ) : (
                <Button onClick={handleStop} variant="destructive" className="w-full">
                  <Square className="h-4 w-4 mr-1" /> Stop ({completed}/{runs})
                </Button>
              )}

              {running && (
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary"
                    initial={{ width: 0 }} animate={{ width: `${(completed / runs) * 100}%` }} />
                </div>
              )}
            </div>

            {/* Live trade animation */}
            <div className="bg-card border border-border rounded-lg p-4 min-h-[120px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {liveTrade?.status === 'pending' && (
                  <motion.div key="pending" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-2">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary" />
                    <p className="text-xs text-muted-foreground">Executing trade…</p>
                  </motion.div>
                )}
                {liveTrade?.status === 'win' && (
                  <motion.div key="win" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-1">
                    <TrendingUp className="h-10 w-10 text-profit" />
                    <p className="text-xl font-bold text-profit font-mono">+{liveTrade.profit.toFixed(2)} KES</p>
                    <p className="text-[10px] text-muted-foreground uppercase">WIN</p>
                  </motion.div>
                )}
                {liveTrade?.status === 'loss' && (
                  <motion.div key="loss" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-1">
                    <TrendingDown className="h-10 w-10 text-loss" />
                    <p className="text-xl font-bold text-loss font-mono">{liveTrade.profit.toFixed(2)} KES</p>
                    <p className="text-[10px] text-muted-foreground uppercase">LOSS</p>
                  </motion.div>
                )}
                {!liveTrade && (
                  <p className="text-xs text-muted-foreground">Live trade results appear here</p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Trade history */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Trade History</h3>
            <span className="text-[10px] text-muted-foreground">{history.length} trades</span>
          </div>
          <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
            {history.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">No trades yet — run a bot to start.</p>
            )}
            {history.map((t, i) => (
              <div key={t.id || i} className="px-3 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {t.result === 'win'
                    ? <TrendingUp className="h-3.5 w-3.5 text-profit shrink-0" />
                    : <TrendingDown className="h-3.5 w-3.5 text-loss shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-foreground truncate">{t.bot_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Stake {t.stake} • Bal {Number(t.balance_after).toFixed(2)}
                    </p>
                  </div>
                </div>
                <span className={`font-mono font-medium ${Number(t.profit) >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {Number(t.profit) >= 0 ? '+' : ''}{Number(t.profit).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardManualTrader;
