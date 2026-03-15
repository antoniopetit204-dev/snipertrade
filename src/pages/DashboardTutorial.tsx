import { DashboardLayout } from '@/components/DashboardLayout';
import { getUser } from '@/lib/store';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

const tutorials = [
  { title: 'Getting Started with HFT Pro', description: 'Set up your account and connect with Deriv.', duration: '5 min', level: 'Beginner',
    steps: ['Create a Deriv account at deriv.com', 'Login via Deriv OAuth from the landing page', 'Navigate the Dashboard to see your balance', 'Explore all tools in the sidebar'] },
  { title: 'Building Your First Bot', description: 'Create and run a trading bot using the Bot Builder.', duration: '10 min', level: 'Beginner',
    steps: ['Go to Bot Builder', 'Select a Volatility Index (e.g., R_50)', 'Choose Rise/Fall contract', 'Set 5 ticks duration', 'Set stake amount (start small!)', 'Configure stop loss & take profit', 'Click "Run Bot"'] },
  { title: 'Understanding Deriv Markets', description: 'Learn about Forex, Synthetics, Crypto markets.', duration: '8 min', level: 'Intermediate',
    steps: ['Volatility Indices: Synthetic 24/7 markets', 'Forex: EUR/USD, GBP/USD, etc.', 'Crypto: Bitcoin, Ethereum pairs', 'Commodities: Gold, Silver, Oil'] },
  { title: 'Risk Management Basics', description: 'Protect your capital effectively.', duration: '7 min', level: 'Intermediate',
    steps: ['Never risk more than 2% per trade', 'Always set stop loss limits', 'Diversify across symbols', 'Use take profit to lock gains', 'Track performance in Portfolio'] },
  { title: 'Advanced Strategy Development', description: 'Create sophisticated trading strategies.', duration: '15 min', level: 'Advanced',
    steps: ['Study the Strategy page', 'Combine contract types', 'Use Charts for analysis', 'Confirm with Analysis signals', 'Test with demo account first'] },
  { title: 'Copy Trading Guide', description: 'Follow successful traders.', duration: '6 min', level: 'Beginner',
    steps: ['Go to Copy Trading', 'Browse top performers', 'Review history & win rate', 'Set copy amount & risk limits', 'Monitor in Portfolio'] },
];

const DashboardTutorial = () => {
  const user = getUser();
  if (!user) return null;

  return (
    <DashboardLayout title="Tutorials" icon={<BookOpen className="h-5 w-5 text-primary" />} subtitle="Learn to trade effectively">
      <div className="space-y-3 sm:space-y-4">
        {tutorials.map((t, i) => (
          <motion.div key={t.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-3 sm:p-5">
            <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">{t.title}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                  t.level === 'Beginner' ? 'bg-profit/20 text-profit' : t.level === 'Intermediate' ? 'bg-primary/20 text-primary' : 'bg-loss/20 text-loss'
                }`}>{t.level}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">{t.duration}</span>
              </div>
            </div>
            <ol className="space-y-1">
              {t.steps.map((step, j) => (
                <li key={j} className="flex items-start gap-2 text-[10px] sm:text-sm text-muted-foreground">
                  <span className="text-primary font-mono text-[10px] mt-0.5 shrink-0">{j + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default DashboardTutorial;
