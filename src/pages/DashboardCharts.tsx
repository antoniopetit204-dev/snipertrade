import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TradingViewChart } from '@/components/TradingViewChart';
import { TradingPanel } from '@/components/TradingPanel';
import { getUser } from '@/lib/store';
import { useDerivConnection, useActiveSymbols } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { LineChart as LineChartIcon, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';

const granularityOptions = [
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
  { label: '1h', value: 3600 },
  { label: '4h', value: 14400 },
  { label: '1D', value: 86400 },
];

const DashboardCharts = () => {
  const user = getUser();
  const { connected, authorized } = useDerivConnection();
  const { symbols } = useActiveSymbols();
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [granularity, setGranularity] = useState(60);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState(0);
  const [selectedTrade, setSelectedTrade] = useState<{ symbol: string; displayName: string; price: number } | null>(null);

  useEffect(() => {
    if (symbols.length > 0 && !selectedSymbol) {
      const vol = symbols.find((s: any) => s.symbol.startsWith('R_')) || symbols[0];
      setSelectedSymbol(vol.symbol);
    }
  }, [symbols, selectedSymbol]);

  useEffect(() => {
    if (!connected || !selectedSymbol) return;
    derivWS.subscribeTicks(selectedSymbol).catch(() => {});
    const unsub = derivWS.subscribe('tick', (data) => {
      if (data.tick?.symbol === selectedSymbol) {
        const price = data.tick.quote;
        setLivePrice(prev => {
          if (prev) setPriceChange(((price - prev) / prev) * 100);
          return price;
        });
      }
    });
    return () => { unsub(); };
  }, [connected, selectedSymbol]);

  if (!user) return null;

  const filteredSymbols = symbols.filter((s: any) =>
    s.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.symbol?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayName = symbols.find((s: any) => s.symbol === selectedSymbol)?.display_name || selectedSymbol;

  return (
    <DashboardLayout title="Live Charts" icon={<LineChartIcon className="h-5 w-5 text-primary" />}
      headerExtra={
        <div className="flex items-center gap-1 sm:gap-2">
          {livePrice !== null && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm sm:text-lg font-mono font-bold text-foreground">{livePrice.toFixed(4)}</span>
              <span className={`text-xs font-mono flex items-center gap-0.5 ${priceChange >= 0 ? 'text-profit' : 'text-loss'}`}>
                {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
              </span>
            </div>
          )}
          {authorized && livePrice && (
            <Button size="sm" onClick={() => setSelectedTrade({ symbol: selectedSymbol, displayName, price: livePrice })}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] sm:text-xs font-semibold h-7 sm:h-8 px-2 sm:px-3">
              Trade
            </Button>
          )}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowSymbolPicker(!showSymbolPicker)}
              className="border-border text-foreground text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">
              <span className="truncate max-w-[60px] sm:max-w-none">{displayName}</span> <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            {showSymbolPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSymbolPicker(false)} />
                <div className="absolute right-0 top-full mt-1 w-64 sm:w-72 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search symbols..."
                      className="w-full bg-secondary border-border text-foreground text-sm px-3 py-2 rounded-md outline-none focus:ring-1 focus:ring-primary" autoFocus />
                  </div>
                  <div className="overflow-y-auto max-h-60">
                    {filteredSymbols.map((s: any) => (
                      <button key={s.symbol} onClick={() => { setSelectedSymbol(s.symbol); setShowSymbolPicker(false); setSearchTerm(''); setLivePrice(null); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${s.symbol === selectedSymbol ? 'bg-primary/10 text-primary' : 'text-foreground'}`}>
                        <span className="font-medium">{s.display_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{s.market_display_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      }>
      <div className="space-y-4">
        {livePrice !== null && (
          <div className="sm:hidden flex items-center justify-between bg-card border border-border rounded-lg p-3">
            <span className="text-lg font-mono font-bold text-foreground">{livePrice.toFixed(4)}</span>
            <span className={`text-xs font-mono flex items-center gap-0.5 ${priceChange >= 0 ? 'text-profit' : 'text-loss'}`}>
              {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {granularityOptions.map(g => (
            <button key={g.value} onClick={() => setGranularity(g.value)}
              className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs rounded-md font-medium transition-colors shrink-0 ${
                granularity === g.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}>
              {g.label}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg p-2 sm:p-4">
          <h2 className="text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-4">{displayName} — OHLC Candlestick</h2>
          {connected && selectedSymbol ? (
            <TradingViewChart symbol={selectedSymbol} granularity={granularity} height={window.innerWidth < 640 ? 350 : 500} />
          ) : (
            <div className="h-[350px] sm:h-[500px] flex items-center justify-center text-muted-foreground text-sm">
              {connected ? 'Select a symbol...' : 'Connect to Deriv to see charts'}
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

export default DashboardCharts;
