import { useState, useEffect } from 'react';
import { derivWS } from '@/lib/deriv-ws';
import { tradeNotifications } from '@/lib/trade-notifications';
import { TrendingUp, TrendingDown, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickTradePanelProps {
  symbol: string;
  displayName: string;
  currentPrice: number;
  onClose: () => void;
}

export const QuickTradePanel = ({ symbol, displayName, currentPrice, onClose }: QuickTradePanelProps) => {
  const [stake, setStake] = useState('1');
  const [duration, setDuration] = useState('5');
  const [durationUnit, setDurationUnit] = useState('t');
  const [riseProposal, setRiseProposal] = useState<any>(null);
  const [fallProposal, setFallProposal] = useState<any>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState(currentPrice);

  // Subscribe to live price
  useEffect(() => {
    const unsub = derivWS.subscribe('tick', (data) => {
      if (data.tick?.symbol === symbol) {
        setLivePrice(data.tick.quote);
      }
    });
    return () => { unsub(); };
  }, [symbol]);

  // Get proposals
  useEffect(() => {
    if (!derivWS.isConnected) return;
    
    const getProposals = async () => {
      try {
        const params = {
          amount: parseFloat(stake) || 1,
          basis: 'stake',
          currency: 'USD',
          duration: parseInt(duration) || 5,
          duration_unit: durationUnit,
          symbol,
        };

        const [rise, fall] = await Promise.allSettled([
          derivWS.send({ proposal: 1, contract_type: 'CALL', ...params }),
          derivWS.send({ proposal: 1, contract_type: 'PUT', ...params }),
        ]);

        if (rise.status === 'fulfilled' && rise.value.proposal) setRiseProposal(rise.value.proposal);
        if (fall.status === 'fulfilled' && fall.value.proposal) setFallProposal(fall.value.proposal);
      } catch (err) {
        console.error('Proposal error:', err);
      }
    };

    const timer = setTimeout(getProposals, 300);
    return () => clearTimeout(timer);
  }, [symbol, stake, duration, durationUnit]);

  const executeTrade = async (type: 'CALL' | 'PUT') => {
    const proposal = type === 'CALL' ? riseProposal : fallProposal;
    if (!proposal?.id) return;

    setBuying(type);
    try {
      const result = await derivWS.buyContract(proposal.id, parseFloat(stake));
      if (result.buy) {
        tradeNotifications.notify({
          type: 'info',
          title: `${type === 'CALL' ? 'Rise' : 'Fall'} Contract Purchased`,
          message: `${displayName} — Stake: $${stake}, Contract ID: ${result.buy.contract_id}`,
        });
        onClose();
      }
    } catch (err: any) {
      tradeNotifications.notify({
        type: 'warning',
        title: 'Trade Failed',
        message: err.message || 'Could not execute trade',
      });
    } finally {
      setBuying(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">{displayName}</h3>
            <p className="text-lg font-mono font-bold text-primary">{livePrice.toFixed(4)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Config */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Stake ($)</label>
              <Input 
                value={stake} 
                onChange={e => setStake(e.target.value)} 
                type="number" 
                min="0.35"
                step="0.1"
                className="bg-secondary border-border text-foreground font-mono" 
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Duration</label>
              <Input 
                value={duration} 
                onChange={e => setDuration(e.target.value)} 
                type="number" 
                className="bg-secondary border-border text-foreground font-mono" 
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Unit</label>
              <select
                value={durationUnit}
                onChange={e => setDurationUnit(e.target.value)}
                className="w-full h-9 bg-secondary border border-border text-foreground rounded-md px-2 text-sm"
              >
                <option value="t">Ticks</option>
                <option value="s">Secs</option>
                <option value="m">Mins</option>
              </select>
            </div>
          </div>

          {/* Payout info */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Rise Payout</p>
              <p className="text-sm font-mono font-semibold text-profit">
                {riseProposal?.payout ? `$${parseFloat(riseProposal.payout).toFixed(2)}` : '—'}
              </p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Fall Payout</p>
              <p className="text-sm font-mono font-semibold text-loss">
                {fallProposal?.payout ? `$${parseFloat(fallProposal.payout).toFixed(2)}` : '—'}
              </p>
            </div>
          </div>

          {/* Buy buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => executeTrade('CALL')}
              disabled={!riseProposal?.id || buying !== null}
              className="bg-profit/20 text-profit hover:bg-profit/30 border border-profit/30 font-semibold h-12"
            >
              {buying === 'CALL' ? <Loader2 className="h-4 w-4 animate-spin" /> : <><TrendingUp className="h-4 w-4 mr-2" /> Rise</>}
            </Button>
            <Button
              onClick={() => executeTrade('PUT')}
              disabled={!fallProposal?.id || buying !== null}
              className="bg-loss/20 text-loss hover:bg-loss/30 border border-loss/30 font-semibold h-12"
            >
              {buying === 'PUT' ? <Loader2 className="h-4 w-4 animate-spin" /> : <><TrendingDown className="h-4 w-4 mr-2" /> Fall</>}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
