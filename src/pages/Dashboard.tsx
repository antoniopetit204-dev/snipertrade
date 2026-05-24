import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TradingPanel } from '@/components/TradingPanel';
import { OpenPositions } from '@/components/OpenPositions';
import { getUser, getAccountId } from '@/lib/store';
import { useDerivConnection } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { tradeNotifications } from '@/lib/trade-notifications';
import { fetchUserBalance } from '@/lib/balance';
import { fetchManualTrades, type ManualTrade } from '@/lib/balance';
import { InstallShortcutPrompt } from '@/components/InstallShortcutPrompt';
import { TrendingUp, TrendingDown, Zap, Wallet, BarChart3, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const user = getUser();
  const { connected, authorized, connecting } = useDerivConnection();
  const [symbols, setSymbols] = useState<any[]>([]);
  const [ticks, setTicks] = useState<Record<string, { quote: number; change: number }>>({});
  const [internalBalance, setInternalBalance] = useState(0);
  const [myTrades, setMyTrades] = useState<ManualTrade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<{ symbol: string; displayName: string; price: number } | null>(null);

  const accountId = getAccountId(user);
  const totalPnL = myTrades.reduce((sum, t) => sum + Number(t.profit || 0), 0);

  useEffect(() => {
    if (!accountId) return;
    fetchUserBalance(accountId).then(b => setInternalBalance(b.balance));
    fetchManualTrades(accountId, 20).then(setMyTrades);
  }, [accountId]);


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
        tradeNotifications.notify({
          type: c.profit >= 0 ? 'win' : 'loss',
          title: c.profit >= 0 ? 'Trade Won!' : 'Trade Lost',
          message: `${c.display_name || c.underlying} — ${c.contract_type}`,
          profit: c.profit,
        });
      }
    });

    return () => { unsub(); unsubContract(); };
  }, [connected, authorized]);

  if (!user) return null;

  return (
    <DashboardLayout title="Trading Dashboard" icon={<TrendingUp className="h-5 w-5 text-primary" />}>
      <div className="space-y-4 sm:space-y-6">
        <InstallShortcutPrompt variant="dashboard" />

        {/* Manual Trader hero CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => (window.location.href = '/dashboard/manual-trader')}
          className="w-full text-left bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/40 rounded-lg p-4 sm:p-5 flex items-center justify-between hover:from-primary/30 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2 flex-wrap">
                Manual Trader <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">NEW</span>
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Pick a bot, set runs, trade your balance — instant results.</p>
            </div>
          </div>
          <span className="text-xs text-primary font-semibold shrink-0 ml-2 group-hover:translate-x-1 transition-transform">Open →</span>
        </motion.button>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: 'Balance', value: `KES ${internalBalance.toFixed(2)}`, icon: Wallet, positive: true },
            { label: 'Active Symbols', value: symbols.length.toString(), icon: BarChart3, positive: true },
            { label: 'Connection', value: connecting ? 'Connecting' : connected ? (authorized ? 'Live & Auth' : 'Live') : 'Offline', icon: Activity, positive: connected },
            { label: 'Status', value: authorized ? 'Ready to Trade' : 'View Only', icon: Zap, positive: authorized },
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
                  {connecting ? 'Connecting...' : connected ? 'Loading symbols...' : 'Live market feed will appear shortly.'}
                </div>
              )}
            </div>
          </div>

          {/* Open Positions with sell capability */}
          <OpenPositions />
        </div>

        {/* My Trades (internal balance) */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">My Trades (Internal Balance)</h2>
            <span className={`text-xs font-mono ${totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
              Total P/L: {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} KES
            </span>
          </div>
          {myTrades.length === 0 ? (
            <p className="px-4 py-8 text-center text-muted-foreground text-xs">No trades yet — open Manual Trader to start.</p>
          ) : (
            <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
              {myTrades.map((t, i) => (
                <div key={t.id || i} className="px-3 sm:px-4 py-2 flex items-center justify-between text-xs">
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
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedTrade && (
          <TradingPanel symbol={selectedTrade.symbol} displayName={selectedTrade.displayName} currentPrice={selectedTrade.price} onClose={() => setSelectedTrade(null)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Dashboard;
