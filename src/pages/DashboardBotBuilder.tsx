import { useEffect, useState, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getUser } from '@/lib/store';
import { useDerivConnection, useActiveSymbols } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { tradeNotifications } from '@/lib/trade-notifications';
import { Wrench, Play, Square, Settings, TrendingUp, TrendingDown, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const contractTypes = [
  { value: 'CALL', label: 'Rise', icon: TrendingUp },
  { value: 'PUT', label: 'Fall', icon: TrendingDown },
  { value: 'DIGITOVER', label: 'Over', icon: BarChart3, needsBarrier: true },
  { value: 'DIGITUNDER', label: 'Under', icon: BarChart3, needsBarrier: true },
  { value: 'DIGITEVEN', label: 'Even', icon: Zap },
  { value: 'DIGITODD', label: 'Odd', icon: Zap },
];

const DashboardBotBuilder = () => {
  const user = getUser();
  const { connected, authorized } = useDerivConnection();
  const { symbols } = useActiveSymbols();
  const { toast } = useToast();
  
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [contractType, setContractType] = useState('CALL');
  const [duration, setDuration] = useState('5');
  const [durationUnit, setDurationUnit] = useState('t');
  const [stake, setStake] = useState('1');
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState('10');
  const [currentRound, setCurrentRound] = useState(0);
  const [results, setResults] = useState<{ round: number; profit: number; status: string; contractId?: number }[]>([]);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [barrier, setBarrier] = useState('5');
  const runningRef = useRef(false);

  useEffect(() => {
    if (symbols.length > 0 && !selectedSymbol) {
      const volatility = symbols.find((s: any) => s.symbol.startsWith('R_'));
      setSelectedSymbol(volatility?.symbol || symbols[0].symbol);
    }
  }, [symbols, selectedSymbol]);

  const selectedContract = contractTypes.find(c => c.value === contractType);

  const stopBot = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
  }, []);

  const runBot = async () => {
    if (!authorized) {
      toast({ title: 'Not authorized', description: 'Please login with Deriv first', variant: 'destructive' });
      return;
    }
    
    setRunning(true);
    runningRef.current = true;
    setResults([]);
    setCurrentRound(0);
    const totalRounds = parseInt(rounds) || 10;
    let totalProfit = 0;

    for (let i = 1; i <= totalRounds; i++) {
      if (!runningRef.current) break;
      setCurrentRound(i);

      try {
        // Build proposal params
        const proposalParams: Record<string, any> = {
          amount: parseFloat(stake),
          basis: 'stake',
          contract_type: contractType,
          currency: 'USD',
          duration: parseInt(duration),
          duration_unit: durationUnit,
          symbol: selectedSymbol,
        };

        // Add barrier for digit contracts
        if (selectedContract?.needsBarrier || contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') {
          proposalParams.barrier = barrier;
        }

        // Get proposal
        const proposal = await derivWS.send({ proposal: 1, ...proposalParams });

        if (proposal.error) {
          setResults(prev => [...prev, { round: i, profit: 0, status: `ERROR: ${proposal.error.message}` }]);
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        if (proposal.proposal?.id) {
          // Buy the contract
          const buy = await derivWS.buyContract(proposal.proposal.id, parseFloat(stake));
          
          if (buy.error) {
            setResults(prev => [...prev, { round: i, profit: 0, status: `ERROR: ${buy.error.message}` }]);
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }

          if (buy.buy) {
            const contractId = buy.buy.contract_id;
            
            // Wait for contract to settle by subscribing to open contract
            const profit = await new Promise<number>((resolve) => {
              let settled = false;
              const timeout = setTimeout(() => {
                if (!settled) { settled = true; resolve(0); }
              }, 60000); // 60s max wait

              const unsub = derivWS.subscribe('proposal_open_contract', (data) => {
                if (data.proposal_open_contract?.contract_id === contractId && data.proposal_open_contract?.is_sold) {
                  if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    unsub();
                    resolve(data.proposal_open_contract.profit || 0);
                  }
                }
              });

              // Subscribe to contract updates
              derivWS.send({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 }).catch(() => {
                if (!settled) { settled = true; clearTimeout(timeout); resolve(0); }
              });
            });

            totalProfit += profit;
            const status = profit >= 0 ? 'WIN' : 'LOSS';
            setResults(prev => [...prev, { round: i, profit, status, contractId }]);
            
            tradeNotifications.notify({
              type: profit >= 0 ? 'win' : 'loss',
              title: `Round ${i}: ${status}`,
              message: `${selectedSymbol} ${contractType} — ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`,
              profit,
            });
          }
        }
      } catch (err: any) {
        const msg = err.message || err.code || 'Unknown error';
        setResults(prev => [...prev, { round: i, profit: 0, status: `ERROR: ${msg}` }]);
      }

      // Check stop loss / take profit
      if (stopLoss && totalProfit <= -parseFloat(stopLoss)) {
        tradeNotifications.notify({ type: 'stop_loss', title: 'Stop Loss Hit!', message: `Total loss: $${totalProfit.toFixed(2)}`, profit: totalProfit });
        break;
      }
      if (takeProfit && totalProfit >= parseFloat(takeProfit)) {
        tradeNotifications.notify({ type: 'take_profit', title: 'Take Profit!', message: `Total profit: $${totalProfit.toFixed(2)}`, profit: totalProfit });
        break;
      }

      if (!runningRef.current) break;
      // Small delay between rounds
      await new Promise(r => setTimeout(r, 1000));
    }

    runningRef.current = false;
    setRunning(false);
  };

  if (!user) return null;

  const totalPnL = results.reduce((s, r) => s + r.profit, 0);
  const wins = results.filter(r => r.status === 'WIN').length;
  const losses = results.filter(r => r.status === 'LOSS').length;
  const winRate = results.length > 0 ? ((wins / results.length) * 100).toFixed(0) : '—';

  return (
    <DashboardLayout title="Bot Builder" icon={<Wrench className="h-5 w-5 text-primary" />} subtitle="Build and run automated trading bots">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Config */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-card border border-border rounded-lg p-3 sm:p-5 space-y-3">
            <h2 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" /> Bot Configuration
            </h2>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Symbol</Label>
              <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)} 
                className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-xs sm:text-sm">
                {symbols.map((s: any) => <option key={s.symbol} value={s.symbol}>{s.display_name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Contract Type</Label>
              <div className="grid grid-cols-3 gap-1">
                {contractTypes.map(t => (
                  <button key={t.value} onClick={() => setContractType(t.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                      contractType === t.value 
                        ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm' 
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent'
                    }`}>
                    <t.icon className="h-3 w-3" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Barrier for digit contracts */}
            {(contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') && (
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Prediction Digit</Label>
                <div className="flex gap-1">
                  {[0,1,2,3,4,5,6,7,8,9].map(d => (
                    <motion.button key={d} onClick={() => setBarrier(String(d))}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      className={`flex-1 h-8 rounded-full text-xs font-bold transition-all ${
                        barrier === String(d)
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}>
                      {d}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Duration</Label>
                <Input value={duration} onChange={e => setDuration(e.target.value)} type="number" className="bg-secondary border-border text-foreground text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Unit</Label>
                <select value={durationUnit} onChange={e => setDurationUnit(e.target.value)}
                  className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-xs sm:text-sm">
                  <option value="t">Ticks</option>
                  <option value="s">Seconds</option>
                  <option value="m">Minutes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Stake ($)</Label>
                <Input value={stake} onChange={e => setStake(e.target.value)} type="number" className="bg-secondary border-border text-foreground text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Rounds</Label>
                <Input value={rounds} onChange={e => setRounds(e.target.value)} type="number" className="bg-secondary border-border text-foreground text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Stop Loss ($)</Label>
                <Input value={stopLoss} onChange={e => setStopLoss(e.target.value)} type="number" placeholder="—" className="bg-secondary border-border text-foreground text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Take Profit ($)</Label>
                <Input value={takeProfit} onChange={e => setTakeProfit(e.target.value)} type="number" placeholder="—" className="bg-secondary border-border text-foreground text-xs" />
              </div>
            </div>

            <Button onClick={running ? stopBot : runBot} disabled={!connected || !authorized}
              className={`w-full font-semibold text-xs sm:text-sm h-11 ${running 
                ? 'bg-loss/20 text-loss hover:bg-loss/30 border border-loss/30' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
              {running ? <><Square className="h-4 w-4 mr-2" /> Stop Bot</> : <><Play className="h-4 w-4 mr-2" /> Run Bot</>}
            </Button>

            {!authorized && connected && (
              <p className="text-[10px] text-loss text-center">Not authorized — login with Deriv to trade</p>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-3">
          {/* Stats bar */}
          {results.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Trades', value: results.length, color: 'text-foreground' },
                { label: 'Win Rate', value: `${winRate}%`, color: 'text-primary' },
                { label: 'Wins', value: wins, color: 'text-profit' },
                { label: 'Losses', value: losses, color: 'text-loss' },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                  <p className={`text-sm sm:text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

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
            <div className="divide-y divide-border max-h-[350px] sm:max-h-[450px] overflow-y-auto">
              <AnimatePresence>
                {results.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                    className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={r.status === 'WIN' ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 0.4 }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          r.status === 'WIN' ? 'bg-profit/20 text-profit' : r.status === 'LOSS' ? 'bg-loss/20 text-loss' : 'bg-secondary text-muted-foreground'
                        }`}>
                        {r.round}
                      </motion.div>
                      <span className="text-xs text-muted-foreground">
                        {r.status.startsWith('ERROR') ? r.status : `${contractType} • Round ${r.round}`}
                      </span>
                    </div>
                    <span className={`text-xs sm:text-sm font-mono font-medium ${
                      r.status === 'WIN' ? 'text-profit' : r.status === 'LOSS' ? 'text-loss' : 'text-muted-foreground'
                    }`}>
                      {r.status === 'WIN' || r.status === 'LOSS' ? `${r.profit >= 0 ? '+' : ''}$${r.profit.toFixed(2)}` : '—'}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {results.length === 0 && (
                <div className="px-4 py-8 sm:py-12 text-center text-muted-foreground text-xs sm:text-sm">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Configure and run your bot to see results
                </div>
              )}
            </div>
            {results.length > 0 && (
              <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-border flex items-center justify-between bg-secondary/30">
                <span className="text-xs sm:text-sm font-medium text-foreground">Total P&L</span>
                <motion.span
                  key={totalPnL}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className={`text-sm sm:text-base font-mono font-bold ${totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </motion.span>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardBotBuilder;
