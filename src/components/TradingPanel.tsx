import { useState, useEffect, useCallback } from 'react';
import { derivWS } from '@/lib/deriv-ws';
import { tradeNotifications } from '@/lib/trade-notifications';
import { TrendingUp, TrendingDown, X, Loader2, Zap, BarChart3, Gauge, Layers, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface TradingPanelProps {
  symbol: string;
  displayName: string;
  currentPrice: number;
  onClose: () => void;
}

type ContractCategory = 'rise_fall' | 'over_under' | 'accumulators' | 'multipliers' | 'vanillas' | 'turbos';

const CONTRACT_TABS: { id: ContractCategory; label: string; icon: any }[] = [
  { id: 'rise_fall', label: 'Rise/Fall', icon: TrendingUp },
  { id: 'over_under', label: 'Over/Under', icon: BarChart3 },
  { id: 'accumulators', label: 'Accum.', icon: Zap },
  { id: 'multipliers', label: 'Multi.', icon: Gauge },
  { id: 'vanillas', label: 'Vanillas', icon: Layers },
  { id: 'turbos', label: 'Turbos', icon: Zap },
];

const DigitBall = ({ digit, selected, onClick, color, isLastDigit }: { digit: number; selected: boolean; onClick: () => void; color: 'over' | 'under' | 'neutral'; isLastDigit?: boolean }) => {
  const colorMap = {
    over: selected ? 'bg-profit text-background shadow-lg shadow-profit/40' : 'bg-profit/10 text-profit hover:bg-profit/20 border-profit/30',
    under: selected ? 'bg-loss text-background shadow-lg shadow-loss/40' : 'bg-loss/10 text-loss hover:bg-loss/20 border-loss/30',
    neutral: selected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/40' : 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/30',
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.15, y: -3 }}
      whileTap={{ scale: 0.9 }}
      animate={isLastDigit ? { scale: [1, 1.4, 1], boxShadow: ['0 0 0px rgba(229,184,75,0)', '0 0 20px rgba(229,184,75,0.6)', '0 0 0px rgba(229,184,75,0)'] } : selected ? { y: [0, -5, 0] } : {}}
      transition={isLastDigit ? { duration: 0.5 } : selected ? { duration: 1.5, repeat: Infinity, repeatType: 'reverse' } : { type: 'spring', stiffness: 400 }}
      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border transition-all ${colorMap[color]} ${isLastDigit ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
    >
      {digit}
    </motion.button>
  );
};

export const TradingPanel = ({ symbol, displayName, currentPrice, onClose }: TradingPanelProps) => {
  const [category, setCategory] = useState<ContractCategory>('rise_fall');
  const [stake, setStake] = useState('1');
  const [duration, setDuration] = useState('5');
  const [durationUnit, setDurationUnit] = useState('t');
  const [selectedDigit, setSelectedDigit] = useState(5);
  const [multiplier, setMultiplier] = useState('10');
  const [growthRate, setGrowthRate] = useState('0.01');
  const [proposals, setProposals] = useState<Record<string, any>>({});
  const [buying, setBuying] = useState<string | null>(null);
  const [tradePlaced, setTradePlaced] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState(currentPrice);
  const [lastDigit, setLastDigit] = useState<number | null>(null);
  const [digitHistory, setDigitHistory] = useState<number[]>([]);
  const [availableContracts, setAvailableContracts] = useState<string[]>([]);

  useEffect(() => {
    if (!derivWS.isConnected) return;
    derivWS.getContractsFor(symbol).then(resp => {
      if (resp.contracts_for?.available) {
        const types = [...new Set(resp.contracts_for.available.map((c: any) => c.contract_type))];
        setAvailableContracts(types as string[]);
      }
    }).catch(() => {});
  }, [symbol]);

  useEffect(() => {
    const unsub = derivWS.subscribe('tick', (data) => {
      if (data.tick?.symbol === symbol) {
        setLivePrice(data.tick.quote);
        const priceStr = String(data.tick.quote);
        const digit = parseInt(priceStr[priceStr.length - 1]);
        setLastDigit(digit);
        setDigitHistory(prev => [digit, ...prev.slice(0, 29)]);
      }
    });
    return () => { unsub(); };
  }, [symbol]);

  useEffect(() => {
    if (!derivWS.isConnected) return;

    const getProposals = async () => {
      const baseParams = {
        amount: parseFloat(stake) || 1,
        basis: 'stake',
        currency: 'USD',
        symbol,
      };
      const durationParams = {
        duration: parseInt(duration) || 5,
        duration_unit: durationUnit,
      };

      try {
        let requests: { key: string; params: any }[] = [];

        switch (category) {
          case 'rise_fall':
            requests = [
              { key: 'CALL', params: { ...baseParams, ...durationParams, contract_type: 'CALL' } },
              { key: 'PUT', params: { ...baseParams, ...durationParams, contract_type: 'PUT' } },
            ];
            break;
          case 'over_under':
            requests = [
              { key: 'DIGITOVER', params: { ...baseParams, ...durationParams, contract_type: 'DIGITOVER', barrier: String(selectedDigit) } },
              { key: 'DIGITUNDER', params: { ...baseParams, ...durationParams, contract_type: 'DIGITUNDER', barrier: String(selectedDigit) } },
            ];
            break;
          case 'accumulators':
            requests = [
              { key: 'ACCU', params: { ...baseParams, contract_type: 'ACCU', growth_rate: parseFloat(growthRate) || 0.01 } },
            ];
            break;
          case 'multipliers':
            requests = [
              { key: 'MULTUP', params: { ...baseParams, contract_type: 'MULTUP', multiplier: parseInt(multiplier) || 10 } },
              { key: 'MULTDOWN', params: { ...baseParams, contract_type: 'MULTDOWN', multiplier: parseInt(multiplier) || 10 } },
            ];
            break;
          case 'vanillas':
            requests = [
              { key: 'VANILLALONGCALL', params: { ...baseParams, ...durationParams, contract_type: 'VANILLALONGCALL' } },
              { key: 'VANILLALONGPUT', params: { ...baseParams, ...durationParams, contract_type: 'VANILLALONGPUT' } },
            ];
            break;
          case 'turbos':
            requests = [
              { key: 'TURBOSLONG', params: { ...baseParams, ...durationParams, contract_type: 'TURBOSLONG' } },
              { key: 'TURBOSSHORT', params: { ...baseParams, ...durationParams, contract_type: 'TURBOSSHORT' } },
            ];
            break;
        }

        const results = await Promise.allSettled(
          requests.map(r => derivWS.send({ proposal: 1, ...r.params }))
        );

        const newProposals: Record<string, any> = {};
        results.forEach((result, i) => {
          if (result.status === 'fulfilled' && result.value.proposal) {
            newProposals[requests[i].key] = result.value.proposal;
          }
        });
        setProposals(newProposals);
      } catch (err) {
        console.error('Proposal error:', err);
      }
    };

    const timer = setTimeout(getProposals, 500);
    return () => clearTimeout(timer);
  }, [symbol, stake, duration, durationUnit, category, selectedDigit, multiplier, growthRate]);

  const executeTrade = async (contractType: string) => {
    const proposal = proposals[contractType];
    if (!proposal?.id) return;

    setBuying(contractType);
    setTradePlaced(null);
    try {
      const result = await derivWS.buyContract(proposal.id, parseFloat(stake));
      if (result.buy) {
        setTradePlaced(contractType);
        tradeNotifications.notify({
          type: 'info',
          title: `Trade Placed: ${contractType}`,
          message: `${displayName} — Stake: $${stake}, Contract ID: ${result.buy.contract_id}`,
        });
        
        // Subscribe to contract for live updates
        derivWS.send({ proposal_open_contract: 1, contract_id: result.buy.contract_id, subscribe: 1 }).catch(() => {});
        
        // Auto-clear success indicator after 3s
        setTimeout(() => setTradePlaced(null), 3000);
      }
    } catch (err: any) {
      tradeNotifications.notify({
        type: 'warning',
        title: 'Trade Failed',
        message: err.message || err.code || 'Could not execute trade',
      });
    } finally {
      setBuying(null);
    }
  };

  const renderProposalInfo = (key: string, label: string) => {
    const p = proposals[key];
    return (
      <div className="bg-secondary/50 rounded-lg p-2 text-center">
        <p className="text-[10px] text-muted-foreground">{label} Payout</p>
        <p className="text-sm font-mono font-semibold text-foreground">
          {p?.payout ? `$${parseFloat(p.payout).toFixed(2)}` : '—'}
        </p>
      </div>
    );
  };

  const renderBuyButton = (key: string, label: string, variant: 'profit' | 'loss' | 'primary') => {
    const colorMap = {
      profit: 'bg-profit/20 text-profit hover:bg-profit/30 border-profit/30',
      loss: 'bg-loss/20 text-loss hover:bg-loss/30 border-loss/30',
      primary: 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/30',
    };
    const IconMap = { profit: TrendingUp, loss: TrendingDown, primary: Zap };
    const Icon = IconMap[variant];
    const isPlaced = tradePlaced === key;
    
    return (
      <Button
        onClick={() => executeTrade(key)}
        disabled={!proposals[key]?.id || buying !== null}
        className={`${isPlaced ? 'bg-profit/30 text-profit border-profit/50' : colorMap[variant]} border font-semibold h-12 transition-all`}
      >
        {buying === key ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaced ? (
          <><CheckCircle className="h-4 w-4 mr-2" /> Placed!</>
        ) : (
          <><Icon className="h-4 w-4 mr-2" /> {label}</>
        )}
      </Button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-2 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground">{displayName}</h3>
            <motion.p key={livePrice} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="text-base sm:text-lg font-mono font-bold text-primary">
              {livePrice.toFixed(4)}
            </motion.p>
          </div>
          <div className="flex items-center gap-2">
            {lastDigit !== null && (
              <motion.div
                key={lastDigit}
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
              >
                <span className="text-sm font-bold text-primary">{lastDigit}</span>
              </motion.div>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Contract type tabs */}
        <div className="px-2 py-1.5 border-b border-border overflow-x-auto flex gap-1 scrollbar-none">
          {CONTRACT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setCategory(tab.id); setProposals({}); setTradePlaced(null); }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                category === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {/* Common: Stake */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider block mb-1">Stake ($)</label>
              <Input value={stake} onChange={e => setStake(e.target.value)} type="number" min="0.35" step="0.1"
                className="bg-secondary border-border text-foreground font-mono text-xs" />
            </div>

            {['rise_fall', 'over_under', 'vanillas', 'turbos'].includes(category) && (
              <>
                <div>
                  <label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider block mb-1">Duration</label>
                  <Input value={duration} onChange={e => setDuration(e.target.value)} type="number"
                    className="bg-secondary border-border text-foreground font-mono text-xs" />
                </div>
                <div>
                  <label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider block mb-1">Unit</label>
                  <select value={durationUnit} onChange={e => setDurationUnit(e.target.value)}
                    className="w-full h-9 bg-secondary border border-border text-foreground rounded-md px-2 text-xs">
                    <option value="t">Ticks</option>
                    <option value="s">Secs</option>
                    <option value="m">Mins</option>
                    <option value="h">Hours</option>
                    <option value="d">Days</option>
                  </select>
                </div>
              </>
            )}

            {category === 'multipliers' && (
              <div className="col-span-2">
                <label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider block mb-1">Multiplier</label>
                <div className="flex gap-1">
                  {[10, 20, 50, 100, 200].map(m => (
                    <button key={m} onClick={() => setMultiplier(String(m))}
                      className={`flex-1 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
                        multiplier === String(m) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}>
                      x{m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {category === 'accumulators' && (
              <div className="col-span-2">
                <label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider block mb-1">Growth Rate</label>
                <div className="flex gap-1">
                  {['0.01', '0.02', '0.03', '0.04', '0.05'].map(r => (
                    <button key={r} onClick={() => setGrowthRate(r)}
                      className={`flex-1 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
                        growthRate === r ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}>
                      {(parseFloat(r) * 100).toFixed(0)}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Over/Under: Digit selector */}
          {category === 'over_under' && (
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider block">Predict Last Digit</label>
              <div className="flex justify-center gap-1 sm:gap-1.5 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                  <DigitBall
                    key={d}
                    digit={d}
                    selected={d === selectedDigit}
                    isLastDigit={d === lastDigit}
                    onClick={() => setSelectedDigit(d)}
                    color={d === selectedDigit ? (d >= 5 ? 'over' : 'under') : 'neutral'}
                  />
                ))}
              </div>
              {digitHistory.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">Recent digits:</p>
                  <div className="flex gap-0.5 overflow-hidden">
                    {digitHistory.slice(0, 20).map((d, i) => (
                      <motion.div
                        key={`${i}-${d}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 - i * 0.04 }}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 ${
                          d > selectedDigit ? 'bg-profit/20 text-profit' : d < selectedDigit ? 'bg-loss/20 text-loss' : 'bg-primary/20 text-primary'
                        }`}
                      >
                        {d}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payout info */}
          <div className="grid grid-cols-2 gap-2">
            {category === 'rise_fall' && (
              <>{renderProposalInfo('CALL', 'Rise')}{renderProposalInfo('PUT', 'Fall')}</>
            )}
            {category === 'over_under' && (
              <>{renderProposalInfo('DIGITOVER', 'Over')}{renderProposalInfo('DIGITUNDER', 'Under')}</>
            )}
            {category === 'accumulators' && <div className="col-span-2">{renderProposalInfo('ACCU', 'Accumulator')}</div>}
            {category === 'multipliers' && (
              <>{renderProposalInfo('MULTUP', 'Up')}{renderProposalInfo('MULTDOWN', 'Down')}</>
            )}
            {category === 'vanillas' && (
              <>{renderProposalInfo('VANILLALONGCALL', 'Call')}{renderProposalInfo('VANILLALONGPUT', 'Put')}</>
            )}
            {category === 'turbos' && (
              <>{renderProposalInfo('TURBOSLONG', 'Long')}{renderProposalInfo('TURBOSSHORT', 'Short')}</>
            )}
          </div>

          {/* Buy buttons */}
          <div className="grid grid-cols-2 gap-2">
            {category === 'rise_fall' && (
              <>{renderBuyButton('CALL', 'Rise', 'profit')}{renderBuyButton('PUT', 'Fall', 'loss')}</>
            )}
            {category === 'over_under' && (
              <>{renderBuyButton('DIGITOVER', `Over ${selectedDigit}`, 'profit')}{renderBuyButton('DIGITUNDER', `Under ${selectedDigit}`, 'loss')}</>
            )}
            {category === 'accumulators' && (
              <div className="col-span-2">{renderBuyButton('ACCU', 'Start Accumulating', 'primary')}</div>
            )}
            {category === 'multipliers' && (
              <>{renderBuyButton('MULTUP', `Up x${multiplier}`, 'profit')}{renderBuyButton('MULTDOWN', `Down x${multiplier}`, 'loss')}</>
            )}
            {category === 'vanillas' && (
              <>{renderBuyButton('VANILLALONGCALL', 'Call', 'profit')}{renderBuyButton('VANILLALONGPUT', 'Put', 'loss')}</>
            )}
            {category === 'turbos' && (
              <>{renderBuyButton('TURBOSLONG', 'Long', 'profit')}{renderBuyButton('TURBOSSHORT', 'Short', 'loss')}</>
            )}
          </div>

          {/* Placed trade indicator */}
          <AnimatePresence>
            {tradePlaced && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-profit/10 border border-profit/30 rounded-lg p-3 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4 text-profit shrink-0" />
                <p className="text-xs text-profit">Trade placed successfully! Check Open Positions to monitor.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
