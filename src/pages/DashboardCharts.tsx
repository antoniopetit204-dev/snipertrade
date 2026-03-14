import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { AccountSwitcher } from '@/components/AccountSwitcher';
import { NotificationPanel } from '@/components/NotificationPanel';
import { QuickTradePanel } from '@/components/QuickTradePanel';
import { getUser } from '@/lib/store';
import { useDerivConnection, useActiveSymbols } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { LineChart as LineChartIcon, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
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
  const navigate = useNavigate();
  const user = getUser();
  const { connected, authorized } = useDerivConnection();
  const { symbols } = useActiveSymbols();
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [granularity, setGranularity] = useState(60);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState(0);
  const [selectedTrade, setSelectedTrade] = useState<{ symbol: string; displayName: string; price: number } | null>(null);

  useEffect(() => { if (!user) navigate('/'); }, [user, navigate]);

  useEffect(() => {
    if (symbols.length > 0 && !selectedSymbol) {
      // Default to a volatility index or first symbol
      const vol = symbols.find(s => s.symbol.startsWith('R_')) || symbols[0];
      setSelectedSymbol(vol.symbol);
    }
  }, [symbols, selectedSymbol]);

  // Fetch candle data
  const fetchCandles = useCallback(async () => {
    if (!connected || !selectedSymbol) return;
    try {
      await derivWS.forgetAll('candles');
      const resp = await derivWS.getCandlesHistory(selectedSymbol, 100, granularity);
      if (resp.candles) {
        const data = resp.candles.map((c: any) => ({
          time: granularity >= 86400
            ? new Date(c.epoch * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })
            : new Date(c.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
          volume: Math.abs(parseFloat(c.high) - parseFloat(c.low)) * 10000,
        }));
        setChartData(data);
        if (data.length >= 2) {
          setLivePrice(data[data.length - 1].close);
          setPriceChange(((data[data.length - 1].close - data[0].close) / data[0].close) * 100);
        }
      }
    } catch (err) {
      console.error('Failed to get candles:', err);
    }
  }, [connected, selectedSymbol, granularity]);

  useEffect(() => { fetchCandles(); }, [fetchCandles]);

  // Live tick subscription
  useEffect(() => {
    if (!connected || !selectedSymbol) return;
    
    derivWS.subscribeTicks(selectedSymbol).catch(() => {});
    
    const unsub = derivWS.subscribe('tick', (data) => {
      if (data.tick?.symbol === selectedSymbol) {
        const price = data.tick.quote;
        setLivePrice(price);
        setChartData(prev => {
          if (prev.length === 0) return prev;
          const last = { ...prev[prev.length - 1], close: price, high: Math.max(prev[prev.length - 1].high, price), low: Math.min(prev[prev.length - 1].low, price) };
          return [...prev.slice(0, -1), last];
        });
      }
    });

    return () => { unsub(); };
  }, [connected, selectedSymbol]);

  if (!user) return null;

  const filteredSymbols = symbols.filter(s =>
    s.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.symbol?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayName = symbols.find(s => s.symbol === selectedSymbol)?.display_name || selectedSymbol;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-primary" /> Live Charts
            </h1>
            {livePrice !== null && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-bold text-foreground">{livePrice.toFixed(4)}</span>
                <span className={`text-xs font-mono flex items-center gap-0.5 ${priceChange >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {authorized && livePrice && (
              <Button
                size="sm"
                onClick={() => setSelectedTrade({ symbol: selectedSymbol, displayName, price: livePrice })}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
              >
                Trade {displayName}
              </Button>
            )}
            <AccountSwitcher />
            <NotificationPanel />
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSymbolPicker(!showSymbolPicker)}
                className="border-border text-foreground"
              >
                {displayName} <ChevronDown className="h-3 w-3 ml-2" />
              </Button>
              {showSymbolPicker && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search symbols..."
                      className="w-full bg-secondary border-border text-foreground text-sm px-3 py-2 rounded-md outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-60">
                    {filteredSymbols.map(s => (
                      <button
                        key={s.symbol}
                        onClick={() => { setSelectedSymbol(s.symbol); setShowSymbolPicker(false); setSearchTerm(''); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${s.symbol === selectedSymbol ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                      >
                        <span className="font-medium">{s.display_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{s.market_display_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-6 space-y-4">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1">
            {granularityOptions.map(g => (
              <button
                key={g.value}
                onClick={() => setGranularity(g.value)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  granularity === g.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Price Chart */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">{displayName} — Price Chart</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(47, 97%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(47, 97%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 20%)" />
                  <XAxis dataKey="time" tick={{ fill: 'hsl(218, 12%, 55%)', fontSize: 11 }} axisLine={{ stroke: 'hsl(220, 10%, 20%)' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: 'hsl(218, 12%, 55%)', fontSize: 11 }} axisLine={{ stroke: 'hsl(220, 10%, 20%)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 14%, 11%)', border: '1px solid hsl(220, 10%, 20%)', borderRadius: '8px', color: 'hsl(220, 20%, 93%)' }} />
                  <Area type="monotone" dataKey="close" stroke="hsl(47, 97%, 60%)" fill="url(#priceGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
                {connected ? 'Loading chart data...' : 'Connect to Deriv to see charts'}
              </div>
            )}
          </div>

          {/* Volume Chart */}
          {chartData.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-sm font-semibold text-foreground mb-4">Price Range (H-L Spread)</h2>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 20%)" />
                  <XAxis dataKey="time" tick={{ fill: 'hsl(218, 12%, 55%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(220, 10%, 20%)' }} />
                  <YAxis tick={{ fill: 'hsl(218, 12%, 55%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(220, 10%, 20%)' }} />
                  <Bar dataKey="volume" fill="hsl(200, 80%, 55%)" opacity={0.6} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* OHLC Stats */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Open', value: chartData[0]?.open },
                { label: 'High', value: Math.max(...chartData.map(d => d.high || d.close)) },
                { label: 'Low', value: Math.min(...chartData.map(d => d.low || d.close)) },
                { label: 'Close', value: chartData[chartData.length - 1]?.close },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-lg font-mono font-bold text-foreground">{typeof s.value === 'number' ? s.value.toFixed(4) : '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

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

export default DashboardCharts;
