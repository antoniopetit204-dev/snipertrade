import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDerivConnection, useActiveSymbols } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { getUser } from '@/lib/store';
import { BarChart3, Target, Activity, Brain, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardAnalysis = () => {
  const user = getUser();
  const { connected } = useDerivConnection();
  const { symbols } = useActiveSymbols();
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate AI signals from real tick data
  useEffect(() => {
    if (!connected || symbols.length === 0) { setLoading(false); return; }
    
    const generateSignals = async () => {
      const tradableSymbols = symbols.filter(s => s.symbol.startsWith('R_') || s.symbol.startsWith('frx') || s.symbol.includes('USD')).slice(0, 8);
      const sigs: any[] = [];
      
      for (const sym of tradableSymbols) {
        try {
          const resp = await derivWS.getTicksHistory(sym.symbol, 30);
          if (resp.history?.prices) {
            const prices = resp.history.prices.map(Number);
            const last = prices[prices.length - 1];
            const first = prices[0];
            const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
            const trend = last > avg ? 'BUY' : 'SELL';
            const strength = Math.min(95, Math.max(40, Math.round(Math.abs((last - avg) / avg) * 5000 + 50)));
            const change = ((last - first) / first) * 100;
            
            // Simple RSI calculation
            let gains = 0, losses = 0;
            for (let i = 1; i < prices.length; i++) {
              const diff = prices[i] - prices[i - 1];
              if (diff > 0) gains += diff; else losses -= diff;
            }
            const rsi = 100 - (100 / (1 + gains / (losses || 0.001)));
            
            sigs.push({
              symbol: sym.symbol,
              displayName: sym.display_name,
              market: sym.market_display_name,
              signal: trend,
              strength,
              price: last,
              change: change.toFixed(3),
              rsi: rsi.toFixed(1),
              indicator: rsi > 70 ? 'Overbought — RSI reversal' : rsi < 30 ? 'Oversold — RSI bounce' : trend === 'BUY' ? 'Bullish momentum' : 'Bearish pressure',
            });
          }
        } catch {}
      }
      setSignals(sigs);
      setLoading(false);
    };
    
    generateSignals();
    const interval = setInterval(generateSignals, 30000);
    return () => clearInterval(interval);
  }, [connected, symbols]);

  if (!user) return null;

  return (
    <DashboardLayout title="Analysis Tools" icon={<BarChart3 className="h-5 w-5 text-primary" />} subtitle="AI-powered trading signals from live data">
      <div className="space-y-4 sm:space-y-6">
        {/* AI Trading Signals Header */}
        <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-lg p-4 sm:p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary" /> AI Trading Intelligence
            </h2>
            <p className="text-xs text-muted-foreground">Real-time analysis of Deriv market data with RSI & momentum indicators</p>
          </div>
        </div>

        {/* Live Signals */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">Live Trading Signals</h2>
            {loading && <span className="text-xs text-primary animate-pulse ml-auto">Analyzing...</span>}
          </div>
          <div className="divide-y divide-border">
            {signals.map((s, i) => (
              <motion.div key={s.symbol} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded shrink-0 ${s.signal === 'BUY' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'}`}>
                    {s.signal}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{s.displayName}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{s.indicator}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-6 pl-9 sm:pl-0">
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Strength</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 sm:w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${s.strength}%` }} />
                      </div>
                      <span className="text-[10px] sm:text-xs font-mono text-primary">{s.strength}%</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[10px] sm:text-xs">
                    <p className="text-foreground">{s.price.toFixed(4)}</p>
                    <p className={`${parseFloat(s.change) >= 0 ? 'text-profit' : 'text-loss'}`}>RSI: {s.rsi}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {signals.length === 0 && !loading && (
              <div className="py-8 text-center text-muted-foreground text-xs sm:text-sm">
                {connected ? 'Generating signals...' : 'Connect to Deriv to see live signals'}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardAnalysis;
