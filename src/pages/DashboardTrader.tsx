import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TradingPanel } from '@/components/TradingPanel';
import { TradingViewChart } from '@/components/TradingViewChart';
import { OpenPositions } from '@/components/OpenPositions';
import { getUser } from '@/lib/store';
import { useDerivConnection, useActiveSymbols } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { Crosshair, Search, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardTrader = () => {
  const user = getUser();
  const { connected, authorized } = useDerivConnection();
  const { symbols } = useActiveSymbols();
  const [search, setSearch] = useState('');
  const [ticks, setTicks] = useState<Record<string, { quote: number; prev: number }>>({});
  const [selectedTrade, setSelectedTrade] = useState<{ symbol: string; displayName: string; price: number } | null>(null);
  const [chartSymbol, setChartSymbol] = useState('');
  const [chartSymbolName, setChartSymbolName] = useState('');
  const [activeMarket, setActiveMarket] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    const unsub = derivWS.subscribe('tick', (data) => {
      if (data.tick) {
        setTicks(prev => ({
          ...prev,
          [data.tick.symbol]: {
            quote: data.tick.quote,
            prev: prev[data.tick.symbol]?.quote || data.tick.quote,
          },
        }));
      }
    });
    symbols.slice(0, 30).forEach((s: any) => {
      derivWS.subscribeTicks(s.symbol).catch(() => {});
    });
    return () => { unsub(); };
  }, [connected, symbols]);

  // Set first symbol for chart
  useEffect(() => {
    if (symbols.length > 0 && !chartSymbol) {
      const vol = symbols.find((s: any) => s.symbol.startsWith('R_'));
      const sym = vol || symbols[0];
      setChartSymbol(sym.symbol);
      setChartSymbolName(sym.display_name);
    }
  }, [symbols, chartSymbol]);

  if (!user) return null;

  const filtered = symbols.filter((s: any) =>
    s.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.symbol?.toLowerCase().includes(search.toLowerCase()) ||
    s.market_display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, any[]> = {};
  filtered.forEach((s: any) => {
    const market = s.market_display_name || 'Other';
    if (!grouped[market]) grouped[market] = [];
    grouped[market].push(s);
  });

  const markets = Object.keys(grouped);
  const visibleMarkets = activeMarket ? { [activeMarket]: grouped[activeMarket] || [] } : grouped;

  return (
    <DashboardLayout title="Manual Trader" icon={<Crosshair className="h-5 w-5 text-primary" />}>
      <div className="space-y-3 sm:space-y-4">
        {/* Chart */}
        {chartSymbol && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-3 sm:px-4 py-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold text-foreground">{chartSymbolName}</span>
              </div>
              {ticks[chartSymbol] && (
                <motion.span key={ticks[chartSymbol].quote} initial={{ scale: 1.1 }} animate={{ scale: 1 }}
                  className="text-xs sm:text-sm font-mono font-bold text-primary">
                  {ticks[chartSymbol].quote.toFixed(4)}
                </motion.span>
              )}
            </div>
            <TradingViewChart symbol={chartSymbol} height={300} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="lg:col-span-2 space-y-3">
            {/* Search & Market filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search markets..."
                  className="pl-9 bg-card border-border text-foreground text-xs sm:text-sm h-9" />
              </div>
              <div className="flex gap-1 overflow-x-auto scrollbar-none">
                <button onClick={() => setActiveMarket(null)}
                  className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                    !activeMarket ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}>All</button>
                {markets.map(m => (
                  <button key={m} onClick={() => setActiveMarket(activeMarket === m ? null : m)}
                    className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                      activeMarket === m ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}>{m}</button>
                ))}
              </div>
            </div>

            {/* Markets */}
            {Object.entries(visibleMarkets).map(([market, syms]) => (
              <div key={market} className="bg-card border border-border rounded-lg">
                <div className="px-3 py-1.5 border-b border-border">
                  <h3 className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">{market}</h3>
                </div>
                <div className="divide-y divide-border max-h-[250px] sm:max-h-[300px] overflow-y-auto">
                  {(syms as any[]).map((sym: any) => {
                    const tick = ticks[sym.symbol];
                    const change = tick ? ((tick.quote - tick.prev) / tick.prev) * 100 : 0;
                    return (
                      <div key={sym.symbol} className="flex items-center">
                        <button
                          onClick={() => { setChartSymbol(sym.symbol); setChartSymbolName(sym.display_name); }}
                          className="flex-1 px-3 py-2 flex items-center justify-between hover:bg-accent/30 transition-colors text-left min-w-0"
                        >
                          <span className="text-xs sm:text-sm font-medium text-foreground truncate">{sym.display_name}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-mono text-foreground">{tick ? tick.quote.toFixed(4) : '—'}</span>
                            {tick && change !== 0 && (
                              <span className={`text-[10px] font-mono ${change >= 0 ? 'text-profit' : 'text-loss'}`}>
                                {change >= 0 ? '+' : ''}{change.toFixed(3)}%
                              </span>
                            )}
                          </div>
                        </button>
                        {authorized && tick && (
                          <button
                            onClick={() => setSelectedTrade({ symbol: sym.symbol, displayName: sym.display_name, price: tick.quote })}
                            className="px-2 py-1 mr-2 bg-primary/10 text-primary hover:bg-primary/20 rounded text-[10px] font-medium transition-colors shrink-0"
                          >
                            Trade
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center text-muted-foreground text-xs sm:text-sm py-8">
                {connected ? 'No matching symbols' : 'Connect to Deriv to see markets'}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <OpenPositions />
          </div>
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

export default DashboardTrader;
