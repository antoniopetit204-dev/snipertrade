import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getUser } from '@/lib/store';
import { Lightbulb, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const strategies = [
  {
    name: 'Martingale',
    description: 'Double stake after each loss, reset after win. High risk, high reward.',
    risk: 'High',
    winRate: '48%',
    type: 'Rise/Fall',
    steps: ['Set initial stake', 'If loss: double stake', 'If win: reset to initial', 'Set max rounds and stop loss'],
  },
  {
    name: 'D\'Alembert',
    description: 'Increase stake by 1 unit after loss, decrease by 1 after win. Lower risk than Martingale.',
    risk: 'Medium',
    winRate: '52%',
    type: 'Rise/Fall',
    steps: ['Set base unit', 'If loss: add 1 unit', 'If win: subtract 1 unit', 'Never go below base'],
  },
  {
    name: 'Digit Over/Under',
    description: 'Trade Digit Over 4 or Digit Under 5 for ~50% probability trades.',
    risk: 'Medium',
    winRate: '50%',
    type: 'Digits',
    steps: ['Select Volatility Index', 'Choose Over 4 or Under 5', 'Set fixed stake', 'Run for set number of ticks'],
  },
  {
    name: 'Even/Odd Scalper',
    description: 'Trade Even/Odd digits with alternating pattern detection.',
    risk: 'Low',
    winRate: '50%',
    type: 'Digits',
    steps: ['Monitor last 10 digits', 'Detect streaks', 'Trade against streak', 'Fixed stake, high volume'],
  },
  {
    name: 'Trend Following',
    description: 'Follow the dominant trend using tick direction analysis.',
    risk: 'Medium',
    winRate: '55%',
    type: 'Rise/Fall',
    steps: ['Analyze last 20 ticks', 'Determine trend direction', 'Trade in trend direction', 'Exit on reversal signal'],
  },
  {
    name: 'Grid Trading',
    description: 'Place buy and sell orders at regular price intervals.',
    risk: 'Medium',
    winRate: '60%',
    type: 'Touch/No Touch',
    steps: ['Define price grid levels', 'Place contracts at each level', 'Take profit at next level', 'Manage exposure'],
  },
];

const DashboardStrategy = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [expanded, setExpanded] = useState<string | null>(null);

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
            <Lightbulb className="h-5 w-5 text-primary" /> Trading Strategies
          </h1>
          <p className="text-xs text-muted-foreground">Learn and deploy proven trading strategies</p>
        </header>

        <div className="p-6 space-y-4">
          {strategies.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === s.name ? null : s.name)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    s.risk === 'High' ? 'bg-loss/20' : s.risk === 'Medium' ? 'bg-primary/20' : 'bg-profit/20'
                  }`}>
                    <BarChart3 className={`h-5 w-5 ${
                      s.risk === 'High' ? 'text-loss' : s.risk === 'Medium' ? 'text-primary' : 'text-profit'
                    }`} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    s.risk === 'High' ? 'bg-loss/20 text-loss' : s.risk === 'Medium' ? 'bg-primary/20 text-primary' : 'bg-profit/20 text-profit'
                  }`}>{s.risk} Risk</span>
                  <span className="text-xs font-mono text-muted-foreground">{s.winRate} WR</span>
                </div>
              </button>
              {expanded === s.name && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-5 pb-4 border-t border-border pt-4"
                >
                  <p className="text-xs text-muted-foreground mb-3">Contract Type: <span className="text-foreground">{s.type}</span></p>
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Steps:</h4>
                  <ol className="space-y-2">
                    {s.steps.map((step, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-primary font-mono text-xs mt-0.5">{j + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardStrategy;
