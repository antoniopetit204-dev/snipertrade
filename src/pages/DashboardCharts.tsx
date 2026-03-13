import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getUser } from '@/lib/store';
import { useDerivConnection, useActiveSymbols } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { LineChart as LineChartIcon, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Button } from '@/components/ui/button';

const DashboardCharts = () => {
  const navigate = useNavigate();
  const user = getUser();
  const { connected } = useDerivConnection();
  const { symbols } = useActiveSymbols();
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  // Set default symbol
  useEffect(() => {
    if (symbols.length > 0 && !selectedSymbol) {
      setSelectedSymbol(symbols[0].symbol);
    }
  }, [symbols, selectedSymbol]);

  // Fetch candle data when symbol changes
  useEffect(() => {
    if (!connected || !selectedSymbol) return;
    
    const fetchCandles = async () => {
      try {
        await derivWS.forgetAll('candles');
        const resp = await derivWS.getCandlesHistory(selectedSymbol, 80, 60);
        if (resp.candles) {
          setChartData(resp.candles.map((c: any) => ({
            time: new Date(c.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })));
        }
      } catch (err) {
        console.error('Failed to get candles:', err);
      }
    };
    fetchCandles();
  }, [connected, selectedSymbol]);

  // Subscribe to live ticks
  useEffect(() => {
    if (!connected || !selectedSymbol) return;
    
    const unsub = derivWS.subscribe('tick', (data) => {
      if (data.tick?.symbol === selectedSymbol) {
        setChartData(prev => {
          const newPoint = {
            time: new Date(data.tick.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            close: data.tick.quote,
            open: data.tick.quote,
            high: data.tick.quote,
            low: data.tick.quote,
          };
          return [...prev.slice(-79), newPoint];
        });
      }
    });

    derivWS.subscribeTicks(selectedSymbol).catch(() => {});

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
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-primary" /> Live Charts
          </h1>
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
        </header>

        <div className="p-6 space-y-6">
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
    </div>
  );
};

export default DashboardCharts;
