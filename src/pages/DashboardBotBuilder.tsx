import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getUser, getBots, type Bot } from '@/lib/store';
import { useDerivConnection, useActiveSymbols } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { Wrench, Play, Square, Settings, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const contractTypes = [
  { value: 'CALL', label: 'Rise' },
  { value: 'PUT', label: 'Fall' },
  { value: 'DIGITOVER', label: 'Over' },
  { value: 'DIGITUNDER', label: 'Under' },
  { value: 'DIGITEVEN', label: 'Even' },
  { value: 'DIGITODD', label: 'Odd' },
];

const DashboardBotBuilder = () => {
  const navigate = useNavigate();
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
  const [results, setResults] = useState<{ round: number; profit: number; status: string }[]>([]);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const runningRef = useState(false);

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    if (symbols.length > 0 && !selectedSymbol) {
      const volatility = symbols.find(s => s.symbol.startsWith('R_'));
      setSelectedSymbol(volatility?.symbol || symbols[0].symbol);
    }
  }, [symbols, selectedSymbol]);

  const runBot = async () => {
    if (!authorized) {
      toast({ title: 'Not authorized', description: 'Please login with Deriv first', variant: 'destructive' });
      return;
    }
    
    setRunning(true);
    setResults([]);
    const totalRounds = parseInt(rounds) || 10;
    let totalProfit = 0;

    for (let i = 1; i <= totalRounds; i++) {
      if (!running && i > 1) break;
      setCurrentRound(i);

      try {
        // Get proposal
        const proposal = await derivWS.getProposal({
          amount: parseFloat(stake),
          basis: 'stake',
          contract_type: contractType,
          currency: 'USD',
          duration: parseInt(duration),
          duration_unit: durationUnit,
          symbol: selectedSymbol,
        });

        if (proposal.proposal?.id) {
          // Buy the contract
          const buy = await derivWS.buyContract(proposal.proposal.id, parseFloat(stake));
          
          if (buy.buy) {
            const profit = buy.buy.profit || 0;
            totalProfit += profit;
            setResults(prev => [...prev, { round: i, profit, status: profit >= 0 ? 'WIN' : 'LOSS' }]);
          }
        }
      } catch (err: any) {
        setResults(prev => [...prev, { round: i, profit: 0, status: 'ERROR: ' + (err.message || 'Unknown') }]);
      }

      // Check stop loss / take profit
      if (stopLoss && totalProfit <= -parseFloat(stopLoss)) break;
      if (takeProfit && totalProfit >= parseFloat(takeProfit)) break;

      // Wait between rounds
      await new Promise(r => setTimeout(r, 2000));
    }

    setRunning(false);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border px-6 py-3">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" /> Bot Builder
          </h1>
          <p className="text-xs text-muted-foreground">Build and run custom trading bots on Deriv</p>
        </header>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Bot Configuration
              </h2>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Symbol</Label>
                <select
                  value={selectedSymbol}
                  onChange={e => setSelectedSymbol(e.target.value)}
                  className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-sm"
                >
                  {symbols.map(s => (
                    <option key={s.symbol} value={s.symbol}>{s.display_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Contract Type</Label>
                <select
                  value={contractType}
                  onChange={e => setContractType(e.target.value)}
                  className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-sm"
                >
                  {contractTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Duration</Label>
                  <Input value={duration} onChange={e => setDuration(e.target.value)} type="number" className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Unit</Label>
                  <select
                    value={durationUnit}
                    onChange={e => setDurationUnit(e.target.value)}
                    className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-sm"
                  >
                    <option value="t">Ticks</option>
                    <option value="s">Seconds</option>
                    <option value="m">Minutes</option>
                    <option value="h">Hours</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Stake (USD)</Label>
                <Input value={stake} onChange={e => setStake(e.target.value)} type="number" className="bg-secondary border-border text-foreground" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Rounds</Label>
                <Input value={rounds} onChange={e => setRounds(e.target.value)} type="number" className="bg-secondary border-border text-foreground" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Stop Loss</Label>
                  <Input value={stopLoss} onChange={e => setStopLoss(e.target.value)} type="number" placeholder="Optional" className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Take Profit</Label>
                  <Input value={takeProfit} onChange={e => setTakeProfit(e.target.value)} type="number" placeholder="Optional" className="bg-secondary border-border text-foreground" />
                </div>
              </div>

              <Button
                onClick={running ? () => setRunning(false) : runBot}
                className={`w-full font-semibold ${running ? 'bg-loss/20 text-loss hover:bg-loss/30' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                disabled={!connected}
              >
                {running ? <><Square className="h-4 w-4 mr-2" /> Stop Bot</> : <><Play className="h-4 w-4 mr-2" /> Run Bot</>}
              </Button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Bot Results</h2>
                {running && (
                  <span className="text-xs text-primary animate-pulse">
                    Round {currentRound}/{rounds}
                  </span>
                )}
              </div>
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {results.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">Round {r.round}</span>
                    <span className={`text-sm font-mono font-medium ${r.status === 'WIN' ? 'text-profit' : r.status === 'LOSS' ? 'text-loss' : 'text-muted-foreground'}`}>
                      {r.status === 'WIN' || r.status === 'LOSS' ? `${r.profit >= 0 ? '+' : ''}${r.profit.toFixed(2)}` : r.status}
                    </span>
                  </motion.div>
                ))}
                {results.length === 0 && (
                  <div className="px-4 py-12 text-center text-muted-foreground text-sm">
                    Configure and run your bot to see results here
                  </div>
                )}
              </div>
              {results.length > 0 && (
                <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-secondary/30">
                  <span className="text-sm font-medium text-foreground">Total P&L</span>
                  <span className={`text-base font-mono font-bold ${results.reduce((s, r) => s + r.profit, 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {results.reduce((s, r) => s + r.profit, 0) >= 0 ? '+' : ''}{results.reduce((s, r) => s + r.profit, 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardBotBuilder;
