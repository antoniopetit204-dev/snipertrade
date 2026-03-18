import { useState, useEffect } from 'react';
import { derivWS } from '@/lib/deriv-ws';
import { tradeNotifications } from '@/lib/trade-notifications';
import { X, Loader2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export const OpenPositions = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [selling, setSelling] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPositions = async () => {
    if (!derivWS.isConnected || !derivWS.isAuthorized) { setLoading(false); return; }
    try {
      const resp = await derivWS.getOpenContracts();
      if (resp.portfolio?.contracts) {
        setContracts(resp.portfolio.contracts);
        // Subscribe to each open contract for live updates
        for (const c of resp.portfolio.contracts) {
          derivWS.send({ proposal_open_contract: 1, contract_id: c.contract_id, subscribe: 1 }).catch(() => {});
        }
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 10000);

    const unsub = derivWS.subscribe('proposal_open_contract', (data) => {
      if (data.proposal_open_contract) {
        const poc = data.proposal_open_contract;
        if (poc.is_sold) {
          setContracts(prev => prev.filter(c => c.contract_id !== poc.contract_id));
          tradeNotifications.notify({
            type: poc.profit >= 0 ? 'win' : 'loss',
            title: poc.profit >= 0 ? 'Trade Won!' : 'Trade Lost',
            message: `${poc.display_name || poc.underlying} — P&L: $${poc.profit}`,
            profit: poc.profit,
          });
        } else {
          setContracts(prev => prev.map(c => c.contract_id === poc.contract_id ? { ...c, ...poc } : c));
        }
      }
    });

    return () => { clearInterval(interval); unsub(); };
  }, []);

  const sellContract = async (contractId: number) => {
    setSelling(contractId);
    try {
      const result = await derivWS.sellContract(contractId, 0);
      if (result.sell) {
        tradeNotifications.notify({
          type: 'info',
          title: 'Contract Sold',
          message: `Sold for $${result.sell.sold_for}`,
        });
        setContracts(prev => prev.filter(c => c.contract_id !== contractId));
      }
    } catch (err: any) {
      tradeNotifications.notify({
        type: 'warning',
        title: 'Sell Failed',
        message: err.message || 'Could not sell contract',
      });
    } finally {
      setSelling(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading positions...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-xs sm:text-sm font-semibold text-foreground">Open Positions ({contracts.length})</h2>
        <Button variant="ghost" size="sm" onClick={fetchPositions} className="text-xs h-6 px-2 text-muted-foreground">
          Refresh
        </Button>
      </div>
      <div className="p-2 sm:p-3 space-y-2 max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {contracts.length > 0 ? contracts.map((c: any) => {
            const profit = c.profit !== undefined ? c.profit : (c.bid_price || c.payout || 0) - (c.buy_price || 0);
            const isProfit = profit >= 0;
            
            return (
              <motion.div
                key={c.contract_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-3 bg-secondary/50 rounded-lg border border-border hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-medium text-foreground block truncate">
                      {c.display_name || c.symbol || c.underlying}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {c.contract_type} • Buy: ${c.buy_price}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <motion.p
                      key={profit}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className={`text-sm font-mono font-bold ${isProfit ? 'text-profit' : 'text-loss'}`}
                    >
                      {isProfit ? '+' : ''}{typeof profit === 'number' ? profit.toFixed(2) : profit}
                    </motion.p>
                    {c.bid_price && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Bid: ${parseFloat(c.bid_price).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {c.is_valid_to_sell ? (
                    <Button
                      size="sm"
                      onClick={() => sellContract(c.contract_id)}
                      disabled={selling === c.contract_id}
                      className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 text-xs h-7 px-3"
                    >
                      {selling === c.contract_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <><DollarSign className="h-3 w-3 mr-1" /> Sell</>
                      )}
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Cannot sell yet</span>
                  )}
                  {c.date_expiry && (
                    <span className="text-[10px] text-muted-foreground">
                      Exp: {new Date(c.date_expiry * 1000).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          }) : (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No open positions</p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
