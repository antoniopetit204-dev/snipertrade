import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getUser, getBots, type Bot } from '@/lib/store';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const marketData = [
  { pair: 'EUR/USD', price: 1.0873, change: 0.15 },
  { pair: 'GBP/USD', price: 1.2654, change: -0.08 },
  { pair: 'BTC/USD', price: 67432.50, change: 2.34 },
  { pair: 'ETH/USD', price: 3521.80, change: 1.87 },
  { pair: 'XAU/USD', price: 2341.60, change: 0.42 },
  { pair: 'USD/JPY', price: 157.23, change: -0.12 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const user = getUser();
  const bots = getBots();
  const activeBots = bots.filter((b) => b.enabled);
  const [prices, setPrices] = useState(marketData);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
  }, [user, navigate]);

  // Simulate live price ticks
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices((prev) =>
        prev.map((p) => ({
          ...p,
          price: p.price * (1 + (Math.random() - 0.5) * 0.001),
          change: p.change + (Math.random() - 0.5) * 0.1,
        }))
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const totalPnL = bots.reduce((s, b) => s + b.profitLoss, 0);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Trading Dashboard</h1>
            <p className="text-xs text-muted-foreground">Welcome, {user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-profit animate-pulse-profit" />
            <span className="text-xs text-profit font-medium">Live</span>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total P&L', value: `$${totalPnL.toFixed(2)}`, icon: DollarSign, positive: totalPnL >= 0 },
              { label: 'Active Bots', value: activeBots.length.toString(), icon: Zap, positive: true },
              { label: 'Total Trades', value: bots.reduce((s, b) => s + b.trades, 0).toString(), icon: BarChart3, positive: true },
              { label: 'Avg Win Rate', value: `${(bots.reduce((s, b) => s + b.winRate, 0) / bots.length).toFixed(1)}%`, icon: Activity, positive: true },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className={`text-xl font-bold font-mono ${stat.positive ? 'text-profit' : 'text-loss'}`}>
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Market Watch */}
            <div className="lg:col-span-2 bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Market Watch</h2>
              </div>
              <div className="divide-y divide-border">
                {prices.map((item) => (
                  <div key={item.pair} className="px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors">
                    <span className="text-sm font-medium text-foreground">{item.pair}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-foreground">
                        {item.price < 100 ? item.price.toFixed(4) : item.price.toFixed(2)}
                      </span>
                      <span className={`text-xs font-mono flex items-center gap-1 ${item.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {item.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Bots */}
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Active Bots</h2>
              </div>
              <div className="p-4 space-y-3">
                {bots.map((bot) => (
                  <div key={bot.id} className="p-3 bg-secondary/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{bot.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${bot.enabled ? 'bg-profit/20 text-profit' : 'bg-muted text-muted-foreground'}`}>
                        {bot.enabled ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{bot.strategy}</p>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className={bot.profitLoss >= 0 ? 'text-profit' : 'text-loss'}>
                        {bot.profitLoss >= 0 ? '+' : ''}${bot.profitLoss.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">{bot.winRate}% WR</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trading Log */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Recent Trades</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Time</th>
                    <th className="text-left px-4 py-3">Pair</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-right px-4 py-3">Entry</th>
                    <th className="text-right px-4 py-3">Exit</th>
                    <th className="text-right px-4 py-3">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { time: '14:32:05', pair: 'EUR/USD', type: 'BUY', entry: 1.0865, exit: 1.0878, pnl: 13.40 },
                    { time: '14:28:12', pair: 'BTC/USD', type: 'SELL', entry: 67500, exit: 67320, pnl: 18.00 },
                    { time: '14:15:33', pair: 'GBP/USD', type: 'BUY', entry: 1.2640, exit: 1.2635, pnl: -5.20 },
                    { time: '14:02:47', pair: 'XAU/USD', type: 'BUY', entry: 2338.50, exit: 2342.10, pnl: 36.00 },
                    { time: '13:55:19', pair: 'ETH/USD', type: 'SELL', entry: 3530, exit: 3518, pnl: 12.00 },
                  ].map((trade, i) => (
                    <tr key={i} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-muted-foreground">{trade.time}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{trade.pair}</td>
                      <td className={`px-4 py-3 font-medium ${trade.type === 'BUY' ? 'text-profit' : 'text-loss'}`}>{trade.type}</td>
                      <td className="px-4 py-3 font-mono text-right text-foreground">{trade.entry}</td>
                      <td className="px-4 py-3 font-mono text-right text-foreground">{trade.exit}</td>
                      <td className={`px-4 py-3 font-mono text-right font-medium ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
