import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TradingPanel } from '@/components/TradingPanel';
import { OpenPositions } from '@/components/OpenPositions';
import { getUser } from '@/lib/store';
import { useDerivConnection, useActiveSymbols } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { Activity, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardTrader = () => {
  const user = getUser();
  const { connected, authorized } = useDerivConnection();
  const { symbols } = useActiveSymbols();
  const [search, setSearch] = useState('');
  const [ticks, setTicks] = useState<Record<string, number>>({});
  const [selectedTrade, setSelectedTrade] = useState<{ symbol: string; displayName: string; price: number } | null>(null);

  useEffect(() => {
    if (!connected) return;
    const unsub = derivWS.subscribe('tick', (data) => {
      if (data.tick) {
        setTicks(prev => ({ ...prev, [data.tick.symbol]: data.tick.quote }));
      }
    });
    // Subscribe to popular symbols
    symbols.slice(0, 20).forEach((s: any) => {
      derivWS.subscribeTicks(s.symbol).catch(() => {});
    });
    return () => { unsub(); };
  }, [connected, symbols]);

  if (!user) return null;

  const filtered = symbols.filter((s: any) =>
    s.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.symbol?.toLowerCase().includes(search.toLowerCase()) ||
    s.market_display_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by market
  const grouped: Record<string, any[]> = {};
  filtered.forEach((s: any) => {
    const market = s.market_display_name || 'Other';
    if (!grouped[market]) grouped[market] = [];
    grouped[market].push(s);
  });

  return (
    <DashboardLayout title="Trader" icon={<Activity className="h-5 w-5 text-primary" />}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search markets..."
              className="pl-9 bg-card border-border text-foreground"
            />
          </div>

          {/* Markets by group */}
          {Object.entries(grouped).map(([market, syms]) => (
            <div key={market} className="bg-card border border-border rounded-lg">
              <div className="px-3 sm:px-4 py-2 border-b border-border">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">{market}</h3>
              </div>
              <div className="divide-y divide-border">
                {syms.map((sym: any) => {
                  const price = ticks[sym.symbol];
                  return (
                    <button
                      key={sym.symbol}
                      onClick={() => {
                        if (price && authorized) {
                          setSelectedTrade({ symbol: sym.symbol, displayName: sym.display_name, price });
                        }
                      }}
                      className="w-full px-3 sm:px-4 py-2.5 flex items-center justify-between hover:bg-accent/50 transition-colors text-left"
                    >
                      <div>
                        <span className="text-xs sm:text-sm font-medium text-foreground">{sym.display_name}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-mono text-foreground">
                        {price ? price.toFixed(4) : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              {connected ? 'No matching symbols' : 'Connect to Deriv to see markets'}
            </div>
          )}
        </div>

        {/* Open Positions sidebar */}
        <div className="space-y-4">
          <OpenPositions />
        </div>
      </div>

      <AnimatePresence>
        {selectedTrade && (
          <TradingPanel
            symbol={selectedTrade.symbol}
            displayName={selectedTrade.displayName}
            currentPrice={selectedTrade.price}
            onClose={() => setSelectedTrade(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default DashboardTrader;
