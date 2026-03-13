import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getUser } from '@/lib/store';
import { BookOpen, Play, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const tutorials = [
  {
    title: 'Getting Started with HFT Pro',
    description: 'Learn how to set up your account, connect with Deriv, and navigate the dashboard.',
    duration: '5 min',
    level: 'Beginner',
    steps: [
      'Create a Deriv account at deriv.com',
      'Login to HFT Pro using Deriv OAuth',
      'Navigate to the Dashboard to see your account balance',
      'Explore the sidebar for all available tools',
    ],
  },
  {
    title: 'Building Your First Bot',
    description: 'Step-by-step guide to creating and running a trading bot using the Bot Builder.',
    duration: '10 min',
    level: 'Beginner',
    steps: [
      'Go to Bot Builder from the sidebar',
      'Select a Volatility Index symbol (e.g., R_50)',
      'Choose Rise/Fall contract type',
      'Set duration to 5 ticks',
      'Set stake amount (start small!)',
      'Configure stop loss and take profit',
      'Click "Run Bot" to start',
    ],
  },
  {
    title: 'Understanding Deriv Markets',
    description: 'Learn about different market types available on Deriv: Forex, Synthetics, Crypto.',
    duration: '8 min',
    level: 'Intermediate',
    steps: [
      'Volatility Indices: Synthetic markets available 24/7',
      'Forex: EUR/USD, GBP/USD, and more',
      'Crypto: Bitcoin, Ethereum pairs',
      'Commodities: Gold, Silver, Oil',
      'Each market has different contract types available',
    ],
  },
  {
    title: 'Risk Management Basics',
    description: 'How to protect your capital and manage risk effectively.',
    duration: '7 min',
    level: 'Intermediate',
    steps: [
      'Never risk more than 2% of your balance per trade',
      'Always set stop loss limits on your bots',
      'Diversify across multiple symbols',
      'Use take profit to lock in gains',
      'Track your performance in the Portfolio page',
    ],
  },
  {
    title: 'Advanced Strategy Development',
    description: 'Create sophisticated trading strategies using multiple indicators and conditions.',
    duration: '15 min',
    level: 'Advanced',
    steps: [
      'Study the Strategy page for proven approaches',
      'Combine multiple contract types',
      'Backtest strategies using Charts page',
      'Use Analysis tools for signal confirmation',
      'Start with demo account before going live',
    ],
  },
  {
    title: 'Copy Trading Guide',
    description: 'Learn how to follow and copy successful traders on the platform.',
    duration: '6 min',
    level: 'Beginner',
    steps: [
      'Navigate to Copy Trading section',
      'Browse top-performing traders',
      'Review their trading history and win rate',
      'Set your copy amount and risk limits',
      'Monitor copied trades in your Portfolio',
    ],
  },
];

const DashboardTutorial = () => {
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
            <BookOpen className="h-5 w-5 text-primary" /> Tutorials
          </h1>
          <p className="text-xs text-muted-foreground">Learn to trade effectively with HFT Pro</p>
        </header>

        <div className="p-6 space-y-4">
          {tutorials.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-lg p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    t.level === 'Beginner' ? 'bg-profit/20 text-profit' :
                    t.level === 'Intermediate' ? 'bg-primary/20 text-primary' :
                    'bg-loss/20 text-loss'
                  }`}>{t.level}</span>
                  <span className="text-xs text-muted-foreground">{t.duration}</span>
                </div>
              </div>
              <ol className="space-y-1.5 mt-3">
                {t.steps.map((step, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary font-mono text-xs mt-0.5 shrink-0">{j + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardTutorial;
