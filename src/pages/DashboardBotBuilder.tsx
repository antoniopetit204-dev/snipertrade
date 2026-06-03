import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getUser, getAccountId } from '@/lib/store';
import { useActiveSymbols } from '@/hooks/useDerivWS';
import { fetchUserBalance, updateUserBalance, insertManualTrade, fetchManualTrades, type ManualTrade } from '@/lib/balance';
import { tradeNotifications } from '@/lib/trade-notifications';
import { Wrench, Play, Square, Settings, TrendingUp, TrendingDown, BarChart3, Zap, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';

// Bot builder now trades against the INTERNAL platform balance
// using the same 50% win-rate engine + payout multipliers as Manual Trader.
const contractTypes = [
  { value: 'CALL',       label: 'Rise',  icon: TrendingUp,   payout: 1.92, sides: ['Rise', 'Fall'] as [string, string] },
  { value: 'PUT',        label: 'Fall',  icon: TrendingDown, payout: 1.92, sides: ['Fall', 'Rise'] as [string, string] },
  { value: 'DIGITOVER',  label: 'Over',  icon: BarChart3,    payout: 1.85, sides: ['Over', 'Under'] as [string, string], needsBarrier: true },
  { value: 'DIGITUNDER', label: 'Under', icon: BarChart3,    payout: 1.85, sides: ['Under', 'Over'] as [string, string], needsBarrier: true },
  { value: 'DIGITEVEN',  label: 'Even',  icon: Zap,          payout: 1.95, sides: ['Even', 'Odd'] as [string, string] },
  { value: 'DIGITODD',   label: 'Odd',   icon: Zap,          payout: 1.95, sides: ['Odd', 'Even'] as [string, string] },
];

const DashboardBotBuilder = () => {
  const user = getUser();
  const { symbols } = useActiveSymbols();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const account = getAccountId(user);

  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [contractType, setContractType] = useState('CALL');
  const [stake, setStake] = useState('1');
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState('10');
  const [currentRound, setCurrentRound] = useState(0);
  const [results, setResults] = useState<{ round: number; profit: number; status: string; side?: string }[]>([]);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [barrier, setBarrier] = useState('5');
  const [deployedBotName, setDeployedBotName] = useState('');
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<ManualTrade[]>([]);
  const runningRef = useRef(false);

  useEffect(() => {
    if (symbols.length > 0 && !selectedSymbol) {
      const volatility = symbols.find((s: any) => s.symbol.startsWith('R_'));
      setSelectedSymbol(volatility?.symbol || symbols[0].symbol);
    }
  }, [symbols, selectedSymbol]);

  useEffect(() => {
    if (!account) return;
    fetchUserBalance(account).then(b => setBalance(b.balance));
    fetchManualTrades(account, 30).then(setHistory);
  }, [account]);

  useEffect(() => {
    const botName = searchParams.get('botName');
    const symbol = searchParams.get('symbol');
    const nextContractType = searchParams.get('contractType');
    const nextStake = searchParams.get('stake');
    const nextRounds = searchParams.get('rounds');
    const nextBarrier = searchParams.get('barrier');
    if (botName) setDeployedBotName(botName);
    if (symbol) setSelectedSymbol(symbol);
    if (nextContractType) setContractType(nextContractType);
    if (nextStake) setStake(nextStake);
    if (nextRounds) setRounds(nextRounds);
    if (nextBarrier) setBarrier(nextBarrier);
  }, [searchParams]);

  const selectedContract = contractTypes.find(c => c.value === contractType)!;

  const stopBot = () => { runningRef.current = false; setRunning(false); };

  const runBot = async () => {
    if (!account) { toast({ title: 'Account required', variant: 'destructive' }); return; }
    const stakeN = parseFloat(stake);
    if (!(stakeN > 0)) { toast({ title: 'Stake must be > 0', variant: 'destructive' }); return; }
    if (balance < stakeN) { toast({ title: 'Insufficient balance', description: 'Deposit funds to start.', variant: 'destructive' }); return; }

    setRunning(true);
    runningRef.current = true;
    setResults([]);
    setCurrentRound(0);
    const totalRounds = parseInt(rounds) || 10;
    let totalProfit = 0;
    let bal = balance;
    const runId = crypto.randomUUID();
    const symLabel = symbols.find((s: any) => s.symbol === selectedSymbol)?.display_name || selectedSymbol || 'Synthetic';

    for (let i = 1; i <= totalRounds; i++) {
      if (!runningRef.current) break;
      if (bal < stakeN) { toast({ title: 'Balance depleted', variant: 'destructive' }); break; }
      setCurrentRound(i);

      // Simulate tick latency
      setResults(prev => [...prev, { round: i, profit: 0, status: 'PLACED', side: selectedContract.sides[0] }]);
      await new Promise(r => setTimeout(r, 700 + Math.random() * 500));

      const won = Math.random() < 0.5;
      const side = selectedContract.sides[won ? 0 : 1];
      const profit = won ? +(stakeN * (selectedContract.payout - 1)).toFixed(2) : -stakeN;
      totalProfit += profit;
      bal = +(bal + profit).toFixed(2);
      setBalance(bal);

      const status = won ? 'WIN' : 'LOSS';
      setResults(prev => prev.map(r => r.round === i ? { ...r, profit, status, side } : r));

      await updateUserBalance(account, bal);
      await insertManualTrade({
        deriv_account: account,
        bot_id: null,
        bot_name: `${deployedBotName || 'Bot Builder'} · ${symLabel} · ${selectedContract.label} (${side})`,
        stake: stakeN,
        payout: won ? +(stakeN * selectedContract.payout).toFixed(2) : 0,
        profit, result: won ? 'win' : 'loss',
        balance_after: bal, run_id: runId,
      });

      tradeNotifications.notify({
        type: won ? 'win' : 'loss',
        title: `Round ${i}: ${status}`,
        message: `${symLabel} ${selectedContract.label} — ${profit >= 0 ? '+' : ''}KES ${profit.toFixed(2)}`,
        profit,
      });

      if (stopLoss && totalProfit <= -parseFloat(stopLoss)) {
        tradeNotifications.notify({ type: 'stop_loss', title: 'Stop Loss Hit!', message: `Total: KES ${totalProfit.toFixed(2)}`, profit: totalProfit });
        break;
      }
      if (takeProfit && totalProfit >= parseFloat(takeProfit)) {
        tradeNotifications.notify({ type: 'take_profit', title: 'Take Profit!', message: `Total: KES ${totalProfit.toFixed(2)}`, profit: totalProfit });
        break;
      }
      await new Promise(r => setTimeout(r, 400));
    }

    runningRef.current = false;
    setRunning(false);
    fetchManualTrades(account, 30).then(setHistory);
  };

  if (!user) return null;

  const totalPnL = results.reduce((s, r) => s + r.profit, 0);
  const settled = results.filter(r => r.status === 'WIN' || r.status === 'LOSS');
  const wins = settled.filter(r => r.status === 'WIN').length;
  const losses = settled.filter(r => r.status === 'LOSS').length;
  const winRate = settled.length > 0 ? ((wins / settled.length) * 100).toFixed(0) : '—';

  return (
    <DashboardLayout title="Bot Builder" icon={<Wrench className="h-5 w-5 text-primary" />} subtitle="Build & run bots on your internal balance — same engine as Manual Trader">
      <div className="space-y-3 sm:space-y-4">
        {/* Balance + P/L */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-1"><Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</span></div>
            <p className="text-lg sm:text-xl font-bold font-mono text-foreground">KES {balance.toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3"><p className="text-[10px] uppercase text-muted-foreground">Session P/L</p>
            <p className={`text-base font-bold font-mono ${totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>{totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}</p></div>
          <div className="bg-card border border-border rounded-lg p-3"><p className="text-[10px] uppercase text-muted-foreground">Win Rate</p>
            <p className="text-base font-bold font-mono text-primary">{winRate}%</p></div>
          <div className="bg-card border border-border rounded-lg p-3"><p className="text-[10px] uppercase text-muted-foreground">W / L</p>
            <p className="text-base font-bold font-mono"><span className="text-profit">{wins}</span> / <span className="text-loss">{losses}</span></p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-card border border-border rounded-lg p-3 sm:p-5 space-y-3">
              <h2 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Bot Configuration
              </h2>

              {deployedBotName && (
                <div className="bg-secondary/50 border border-border rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Deployed Bot</p>
                  <p className="text-xs sm:text-sm font-semibold text-foreground mt-1">{deployedBotName}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Symbol</Label>
                <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)} disabled={running}
                  className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-xs disabled:opacity-50">
                  {symbols.length === 0 && <option value="">Loading…</option>}
                  {symbols.map((s: any) => <option key={s.symbol} value={s.symbol}>{s.display_name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Contract Type</Label>
                <div className="grid grid-cols-3 gap-1">
                  {contractTypes.map(t => (
                    <button key={t.value} disabled={running} onClick={() => setContractType(t.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-all ${
                        contractType === t.value
                          ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                          : 'bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent'
                      } disabled:opacity-50`}>
                      <t.icon className="h-3 w-3" />{t.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-right font-mono">×{selectedContract.payout.toFixed(2)} payout</p>
              </div>

              {(contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase">Prediction Digit</Label>
                  <div className="flex gap-1">
                    {[0,1,2,3,4,5,6,7,8,9].map(d => (
                      <button key={d} disabled={running} onClick={() => setBarrier(String(d))}
                        className={`flex-1 h-8 rounded-full text-xs font-bold transition-all ${
                          barrier === String(d) ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-secondary text-muted-foreground hover:text-foreground'
                        } disabled:opacity-50`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase">Stake (KES)</Label>
                  <Input value={stake} onChange={e => setStake(e.target.value)} type="number" disabled={running} className="bg-secondary border-border text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase">Rounds</Label>
                  <Input value={rounds} onChange={e => setRounds(e.target.value)} type="number" disabled={running} className="bg-secondary border-border text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase">Stop Loss (KES)</Label>
                  <Input value={stopLoss} onChange={e => setStopLoss(e.target.value)} type="number" placeholder="—" disabled={running} className="bg-secondary border-border text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase">Take Profit (KES)</Label>
                  <Input value={takeProfit} onChange={e => setTakeProfit(e.target.value)} type="number" placeholder="—" disabled={running} className="bg-secondary border-border text-xs" />
                </div>
              </div>

              <Button onClick={running ? stopBot : runBot} disabled={!account || (!running && balance < parseFloat(stake || '0'))}
                className={`w-full font-semibold text-xs sm:text-sm h-11 ${running
                  ? 'bg-loss/20 text-loss hover:bg-loss/30 border border-loss/30'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                {running ? <><Square className="h-4 w-4 mr-2" /> Stop Bot</> : <><Play className="h-4 w-4 mr-2" /> Run Bot</>}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-semibold text-foreground">Bot Results</h2>
                {running && (
                  <span className="flex items-center gap-1.5 text-xs text-primary">
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-2 h-2 rounded-full bg-primary" />
                    Round {currentRound}/{rounds}
                  </span>
                )}
              </div>
              <div className="divide-y divide-border max-h-[450px] overflow-y-auto">
                <AnimatePresence>
                  {results.map((r, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          r.status === 'WIN' ? 'bg-profit/20 text-profit' : r.status === 'LOSS' ? 'bg-loss/20 text-loss' : 'bg-secondary text-muted-foreground'
                        }`}>{r.round}</div>
                        <span className="text-xs text-muted-foreground">{selectedContract.label} {r.side ? `· ${r.side}` : ''}</span>
                      </div>
                      <span className={`text-xs sm:text-sm font-mono font-medium ${
                        r.status === 'WIN' ? 'text-profit' : r.status === 'LOSS' ? 'text-loss' : 'text-primary'
                      }`}>
                        {r.status === 'PLACED' ? 'Live' : `${r.profit >= 0 ? '+' : ''}KES ${r.profit.toFixed(2)}`}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {results.length === 0 && (
                  <div className="px-4 py-12 text-center text-muted-foreground text-xs">
                    <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />Configure and run your bot to see results
                  </div>
                )}
              </div>
              {results.length > 0 && (
                <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-border flex items-center justify-between bg-secondary/30">
                  <span className="text-xs font-medium text-foreground">Total P&L</span>
                  <span className={`text-base font-mono font-bold ${totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {totalPnL >= 0 ? '+' : ''}KES {totalPnL.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardBotBuilder;
