import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getUser } from '@/lib/store';
import { Lightbulb, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const strategies = [
  { name: 'Martingale', description: 'Double stake after each loss, reset after win.', risk: 'High', winRate: '48%', type: 'Rise/Fall',
    steps: ['Set initial stake', 'If loss: double stake', 'If win: reset to initial', 'Set max rounds and stop loss'] },
  { name: "D'Alembert", description: 'Increase by 1 unit after loss, decrease by 1 after win.', risk: 'Medium', winRate: '52%', type: 'Rise/Fall',
    steps: ['Set base unit', 'If loss: add 1 unit', 'If win: subtract 1 unit', 'Never go below base'] },
  { name: 'Digit Over/Under', description: 'Trade Over 4 or Under 5 for ~50% probability.', risk: 'Medium', winRate: '50%', type: 'Digits',
    steps: ['Select Volatility Index', 'Choose Over 4 or Under 5', 'Set fixed stake', 'Run for set number of ticks'] },
  { name: 'Even/Odd Scalper', description: 'Trade Even/Odd with alternating pattern detection.', risk: 'Low', winRate: '50%', type: 'Digits',
    steps: ['Monitor last 10 digits', 'Detect streaks', 'Trade against streak', 'Fixed stake, high volume'] },
  { name: 'Trend Following', description: 'Follow dominant trend using tick direction analysis.', risk: 'Medium', winRate: '55%', type: 'Rise/Fall',
    steps: ['Analyze last 20 ticks', 'Determine trend direction', 'Trade in trend direction', 'Exit on reversal signal'] },
  { name: 'Grid Trading', description: 'Place orders at regular price intervals.', risk: 'Medium', winRate: '60%', type: 'Touch/No Touch',
    steps: ['Define price grid levels', 'Place contracts at each level', 'Take profit at next level', 'Manage exposure'] },
];

const DashboardStrategy = () => {
  const user = getUser();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!user) return null;

  return (
    <DashboardLayout title="Trading Strategies" icon={<Lightbulb className="h-5 w-5 text-primary" />} subtitle="Learn and deploy proven strategies">
      <div className="space-y-3 sm:space-y-4">
        {strategies.map((s, i) => (
          <motion.div key={s.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg overflow-hidden">
            <button onClick={() => setExpanded(expanded === s.name ? null : s.name)}
              className="w-full px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between hover:bg-accent/30 transition-colors gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  s.risk === 'High' ? 'bg-loss/20' : s.risk === 'Medium' ? 'bg-primary/20' : 'bg-profit/20'
                }`}>
                  <BarChart3 className={`h-4 w-4 sm:h-5 sm:w-5 ${s.risk === 'High' ? 'text-loss' : s.risk === 'Medium' ? 'text-primary' : 'text-profit'}`} />
                </div>
                <div className="text-left min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground">{s.name}</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{s.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                  s.risk === 'High' ? 'bg-loss/20 text-loss' : s.risk === 'Medium' ? 'bg-primary/20 text-primary' : 'bg-profit/20 text-profit'
                }`}>{s.risk}</span>
                <span className="text-[10px] sm:text-xs font-mono text-muted-foreground hidden sm:inline">{s.winRate}</span>
              </div>
            </button>
            {expanded === s.name && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                className="px-3 sm:px-5 pb-3 sm:pb-4 border-t border-border pt-3 sm:pt-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">Type: <span className="text-foreground">{s.type}</span> • Win Rate: {s.winRate}</p>
                <ol className="space-y-1.5">
                  {s.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs sm:text-sm text-foreground">
                      <span className="text-primary font-mono text-[10px] sm:text-xs mt-0.5">{j + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default DashboardStrategy;
