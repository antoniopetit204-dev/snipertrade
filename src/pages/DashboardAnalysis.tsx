import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getUser } from '@/lib/store';
import { BarChart3, TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { motion } from 'framer-motion';

const signals = [
  { pair: 'EUR/USD', signal: 'BUY', strength: 82, indicator: 'RSI + MACD Convergence', entry: 1.0870, tp: 1.0920, sl: 1.0840 },
  { pair: 'GBP/USD', signal: 'SELL', strength: 74, indicator: 'Bearish Divergence', entry: 1.2660, tp: 1.2600, sl: 1.2700 },
  { pair: 'BTC/USD', signal: 'BUY', strength: 91, indicator: 'Golden Cross + Volume', entry: 67400, tp: 69000, sl: 66500 },
  { pair: 'XAU/USD', signal: 'BUY', strength: 68, indicator: 'Support Bounce', entry: 2340, tp: 2370, sl: 2320 },
];

const indicators = [
  { name: 'RSI (14)', value: '62.4', status: 'Neutral' },
  { name: 'MACD', value: '+0.0023', status: 'Bullish' },
  { name: 'Bollinger Bands', value: 'Mid-band', status: 'Neutral' },
  { name: 'Stochastic', value: '78.2', status: 'Overbought' },
  { name: 'ADX', value: '34.1', status: 'Trending' },
  { name: 'ATR', value: '0.0045', status: 'Normal' },
];

const DashboardAnalysis = () => {
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border px-6 py-3">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Analysis Tools
          </h1>
          <p className="text-xs text-muted-foreground">AI-powered trading signals and technical analysis</p>
        </header>

        <div className="p-6 space-y-6">
          {/* Trading Signals */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Trading Signals</h2>
            </div>
            <div className="divide-y divide-border">
              {signals.map((s, i) => (
                <motion.div
                  key={s.pair}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${s.signal === 'BUY' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'}`}>
                      {s.signal}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.pair}</p>
                      <p className="text-xs text-muted-foreground">{s.indicator}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Strength</p>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${s.strength}%` }} />
                        </div>
                        <span className="text-xs font-mono text-primary">{s.strength}%</span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <p className="text-muted-foreground">Entry: <span className="text-foreground">{s.entry}</span></p>
                      <p className="text-profit">TP: {s.tp}</p>
                      <p className="text-loss">SL: {s.sl}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Technical Indicators</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border">
              {indicators.map((ind) => (
                <div key={ind.name} className="bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">{ind.name}</p>
                  <p className="text-lg font-mono font-bold text-foreground">{ind.value}</p>
                  <p className={`text-xs mt-1 ${
                    ind.status === 'Bullish' || ind.status === 'Trending' ? 'text-profit' :
                    ind.status === 'Overbought' ? 'text-loss' : 'text-muted-foreground'
                  }`}>
                    {ind.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardAnalysis;
