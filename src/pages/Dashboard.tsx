import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { QuickTradePanel } from '@/components/QuickTradePanel';
import { getUser } from '@/lib/store';
import { useDerivConnection } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { tradeNotifications } from '@/lib/trade-notifications';
import { TrendingUp, TrendingDown, Zap, Wallet, BarChart3, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const user = getUser();
  const { connected, authorized, balance, currency, connecting } = useDerivConnection();
  const [symbols, setSymbols] = useState<any[]>([]);
  const [ticks, setTicks] = useState<Record<string, { quote: number; change: number }>>({});
  const [openContracts, setOpenContracts] = useState<any[]>([]);
  const [profitTable, setProfitTable] = useState<any[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<{ symbol: string; displayName: string; price: number } | null>(null);

  useEffect(() => {
    if (!connected) return;
    const fetchData = async () => {
      try {
        const resp = await derivWS.getActiveSymbols();
        if (resp.active_symbols) {
          const top = resp.active_symbols.slice(0, 12);
          setSymbols(top);
          for (const sym of top) {
            derivWS.subscribeTicks(sym.symbol).catch(() => {});
          }
        }
      } catch {}

      if (authorized) {
        try {
          const portfolio = await derivWS.getOpenContracts();
          if (portfolio.portfolio?.contracts) setOpenContracts(portfolio.portfolio.contracts);
        } catch {}
        try {
          const profits = await derivWS.getProfitTable(10);
          if (profits.profit_table?.transactions) setProfitTable(profits.profit_table.transactions);
        } catch {}
      }
    };
    fetchData();

    const unsub = derivWS.subscribe('tick', (data) => {
      if (data.tick) {
        setTicks(prev => ({
          ...prev,
          [data.tick.symbol]: {
            quote: data.tick.quote,
            change: prev[data.tick.symbol] ? ((data.tick.quote - prev[data.tick.symbol].quote) / prev[data.tick.symbol].quote) * 100 : 0,
          },
        }));
      }
    });

    const unsubContract = derivWS.subscribe('proposal_open_contract', (data) => {
      if (data.proposal_open_contract?.is_sold) {
        const c = data.proposal_open_contract;
        const profit = c.profit;
        tradeNotifications.notify({
          type: profit >= 0 ? 'win' : 'loss',
          title: profit >= 0 ? 'Trade Won!' : 'Trade Lost',
          message: `${c.display_name || c.underlying} — ${c.contract_type}`,
          profit,
        });
      }
    });

    return () => { unsub(); unsubContract(); };
  }, [connected, authorized]);

  if (!user) return null;

  return (
    <DashboardLayout title="Trading Dashboard" icon={<TrendingUp className="h-5 w-5 text-primary" />}
      subtitle={user.activeAccount ? `Account: ${user.activeAccount.acct}` : user.email}>
      <div className="space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: 'Balance', value: balance !== null ? `${balance.toFixed(2)} ${currency}` : '—', icon: Wallet, positive: true },
            { label: 'Open Positions', value: openContracts.length.toString(), icon: Zap, positive: true },
            { label: 'Active Symbols', value: symbols.length.toString(), icon: BarChart3, positive: true },
            { label: 'Connection', value: connecting ? 'Connecting' : connected ? 'Live' : 'Offline', icon: Activity, positive: connected },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                <stat.icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </div>
              <p className={`text-base sm:text-xl font-bold font-mono ${stat.positive ? 'text-profit' : 'text-loss'}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Market Watch */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-semibold text-foreground">Market Watch (Live)</h2>
              <span className="text-[10px] sm:text-xs text-muted-foreground">Tap to trade</span>
            </div>
            <div className="divide-y divide-border max-h-[400px] sm:max-h-none overflow-y-auto">
              {symbols.map((sym) => {
                const tick = ticks[sym.symbol];
                return (
                  <button key={sym.symbol}
                    onClick={() => { if (tick && authorized) setSelectedTrade({ symbol: sym.symbol, displayName: sym.display_name, price: tick.quote }); }}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between hover:bg-accent/50 transition-colors text-left">
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-foreground block truncate">{sym.display_name}</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">{sym.market_display_name}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                      <span className="text-xs sm:text-sm font-mono text-foreground">
                        {tick ? tick.quote.toFixed(sym.pip ? String(sym.pip).length - 2 : 2) : '—'}
                      </span>
                      {tick && (
                        <span className={`text-[10px] sm:text-xs font-mono flex items-center gap-0.5 ${tick.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {tick.change >= 0 ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                          {tick.change >= 0 ? '+' : ''}{tick.change.toFixed(3)}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {symbols.length === 0 && (
                <div className="px-4 py-8 text-center text-muted-foreground text-xs sm:text-sm">
                  {connecting ? 'Connecting to Deriv...' : connected ? 'Loading symbols...' : 'Connect to Deriv to see live data'}
                </div>
              )}
            </div>
          </div>

          {/* Open Contracts */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
              <h2 className="text-xs sm:text-sm font-semibold text-foreground">Open Positions</h2>
            </div>
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 max-h-[300px] overflow-y-auto">
              {openContracts.length > 0 ? openContracts.map((c: any, i: number) => (
                <div key={i} className="p-2 sm:p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-medium text-foreground">{c.symbol}</span>
                    <span className={`text-xs font-mono ${c.payout > c.buy_price ? 'text-profit' : 'text-loss'}`}>
                      {c.payout > c.buy_price ? '+' : ''}{(c.payout - c.buy_price).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{c.contract_type} • Buy: {c.buy_price}</p>
                </div>
              )) : (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No open positions</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        {profitTable.length > 0 && (
          <div className="bg-card border border-border rounded-lg">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
              <h2 className="text-xs sm:text-sm font-semibold text-foreground">Recent Trades</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-3 sm:px-4 py-2 sm:py-3">Time</th>
                    <th className="text-left px-3 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">Contract</th>
                    <th className="text-right px-3 sm:px-4 py-2 sm:py-3">Buy</th>
                    <th className="text-right px-3 sm:px-4 py-2 sm:py-3">Sell</th>
                    <th className="text-right px-3 sm:px-4 py-2 sm:py-3">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profitTable.map((t: any, i: number) => (
                    <tr key={i} className="hover:bg-accent/30 transition-colors">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-mono text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">
                        {new Date(t.purchase_time * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-foreground hidden sm:table-cell truncate max-w-[150px]">{t.shortcode || t.contract_id}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-mono text-right text-foreground">{t.buy_price}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 font-mono text-right text-foreground">{t.sell_price}</td>
                      <td className={`px-3 sm:px-4 py-2 sm:py-3 font-mono text-right font-medium ${parseFloat(t.profit) >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {parseFloat(t.profit) >= 0 ? '+' : ''}{t.profit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTrade && (
          <QuickTradePanel symbol={selectedTrade.symbol} displayName={selectedTrade.displayName} currentPrice={selectedTrade.price} onClose={() => setSelectedTrade(null)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Dashboard;
