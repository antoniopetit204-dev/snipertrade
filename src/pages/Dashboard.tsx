import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { AccountSwitcher } from '@/components/AccountSwitcher';
import { NotificationPanel } from '@/components/NotificationPanel';
import { QuickTradePanel } from '@/components/QuickTradePanel';
import { getUser, getSettings } from '@/lib/store';
import { useDerivConnection } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { tradeNotifications } from '@/lib/trade-notifications';
import { TrendingUp, TrendingDown, Activity, Zap, Wallet, BarChart3, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = getUser();
  const { connected, authorized, balance, currency, error, connecting, reconnect } = useDerivConnection();
  const [symbols, setSymbols] = useState<any[]>([]);
  const [ticks, setTicks] = useState<Record<string, { quote: number; change: number }>>({});
  const [openContracts, setOpenContracts] = useState<any[]>([]);
  const [profitTable, setProfitTable] = useState<any[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<{ symbol: string; displayName: string; price: number } | null>(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
  }, [user, navigate]);

  // Fetch active symbols once connected
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
      } catch (err) {
        console.error('Failed to get symbols:', err);
      }

      if (authorized) {
        try {
          const portfolio = await derivWS.getOpenContracts();
          if (portfolio.portfolio?.contracts) {
            setOpenContracts(portfolio.portfolio.contracts);
          }
        } catch {}
        
        try {
          const profits = await derivWS.getProfitTable(10);
          if (profits.profit_table?.transactions) {
            setProfitTable(profits.profit_table.transactions);
          }
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
            change: prev[data.tick.symbol]
              ? ((data.tick.quote - prev[data.tick.symbol].quote) / prev[data.tick.symbol].quote) * 100
              : 0,
          },
        }));
      }
    });

    // Listen for contract completion
    const unsubProposal = derivWS.subscribe('proposal_open_contract', (data) => {
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

    return () => { unsub(); unsubProposal(); };
  }, [connected, authorized]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Trading Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              {user.activeAccount ? `Account: ${user.activeAccount.acct}` : user.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-loss max-w-[200px] truncate">{error}</span>}
            <AccountSwitcher onSwitch={() => window.location.reload()} />
            <NotificationPanel />
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-profit animate-pulse' : 'bg-loss'}`} />
              <span className={`text-xs font-medium ${connected ? 'text-profit' : 'text-loss'}`}>
                {connecting ? 'Connecting...' : connected ? (authorized ? 'Connected' : 'Not Authorized') : 'Disconnected'}
              </span>
              {!connected && !connecting && (
                <Button variant="ghost" size="sm" onClick={reconnect} className="h-6 px-2">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Balance', value: balance !== null ? `${balance.toFixed(2)} ${currency}` : '—', icon: Wallet, positive: true },
              { label: 'Open Positions', value: openContracts.length.toString(), icon: Zap, positive: true },
              { label: 'Active Symbols', value: symbols.length.toString(), icon: BarChart3, positive: true },
              { label: 'Connection', value: connecting ? 'Connecting' : connected ? 'Live' : 'Offline', icon: Activity, positive: connected },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className={`text-xl font-bold font-mono ${stat.positive ? 'text-profit' : 'text-loss'}`}>
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Market Watch - Live from Deriv */}
            <div className="lg:col-span-2 bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Market Watch (Live)</h2>
                <span className="text-xs text-muted-foreground">Click to trade</span>
              </div>
              <div className="divide-y divide-border">
                {symbols.map((sym) => {
                  const tick = ticks[sym.symbol];
                  return (
                    <button
                      key={sym.symbol}
                      onClick={() => {
                        if (tick && authorized) {
                          setSelectedTrade({ symbol: sym.symbol, displayName: sym.display_name, price: tick.quote });
                        }
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors text-left"
                    >
                      <div>
                        <span className="text-sm font-medium text-foreground">{sym.display_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{sym.market_display_name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-foreground">
                          {tick ? tick.quote.toFixed(sym.pip ? String(sym.pip).length - 2 : 2) : '—'}
                        </span>
                        {tick && (
                          <span className={`text-xs font-mono flex items-center gap-1 ${tick.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {tick.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {tick.change >= 0 ? '+' : ''}{tick.change.toFixed(3)}%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {symbols.length === 0 && (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    {connecting ? 'Connecting to Deriv...' : connected ? 'Loading symbols...' : 'Connect to Deriv to see live data'}
                  </div>
                )}
              </div>
            </div>

            {/* Open Contracts */}
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Open Positions</h2>
              </div>
              <div className="p-4 space-y-3">
                {openContracts.length > 0 ? openContracts.map((c: any, i: number) => (
                  <div key={i} className="p-3 bg-secondary/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{c.symbol}</span>
                      <span className={`text-xs font-mono ${c.payout > c.buy_price ? 'text-profit' : 'text-loss'}`}>
                        {c.payout > c.buy_price ? '+' : ''}{(c.payout - c.buy_price).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.contract_type} • Buy: {c.buy_price}</p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No open positions</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Profit/Loss */}
          {profitTable.length > 0 && (
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Recent Trades</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Time</th>
                      <th className="text-left px-4 py-3">Contract</th>
                      <th className="text-right px-4 py-3">Buy Price</th>
                      <th className="text-right px-4 py-3">Sell Price</th>
                      <th className="text-right px-4 py-3">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {profitTable.map((t: any, i: number) => (
                      <tr key={i} className="hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                          {new Date(t.purchase_time * 1000).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{t.shortcode || t.contract_id}</td>
                        <td className="px-4 py-3 font-mono text-right text-foreground">{t.buy_price}</td>
                        <td className="px-4 py-3 font-mono text-right text-foreground">{t.sell_price}</td>
                        <td className={`px-4 py-3 font-mono text-right font-medium ${parseFloat(t.profit) >= 0 ? 'text-profit' : 'text-loss'}`}>
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
      </main>

      {/* Quick Trade Modal */}
      <AnimatePresence>
        {selectedTrade && (
          <QuickTradePanel
            symbol={selectedTrade.symbol}
            displayName={selectedTrade.displayName}
            currentPrice={selectedTrade.price}
            onClose={() => setSelectedTrade(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
