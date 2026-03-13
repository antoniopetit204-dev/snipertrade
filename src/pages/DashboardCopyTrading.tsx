import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getUser } from '@/lib/store';
import { Copy, TrendingUp, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const topTraders = [
  { name: 'TraderAlpha', winRate: 78.5, profit: 12450, trades: 892, followers: 234, rank: 1, asset: 'Volatility' },
  { name: 'CryptoKing', winRate: 72.1, profit: 8920, trades: 1245, followers: 189, rank: 2, asset: 'Crypto' },
  { name: 'ForexPro', winRate: 68.3, profit: 6780, trades: 567, followers: 156, rank: 3, asset: 'Forex' },
  { name: 'ScalperBot', winRate: 65.7, profit: 4560, trades: 2341, followers: 122, rank: 4, asset: 'Volatility' },
  { name: 'GoldDigger', winRate: 71.2, profit: 3890, trades: 234, followers: 98, rank: 5, asset: 'Commodities' },
  { name: 'TrendMaster', winRate: 63.8, profit: 2340, trades: 789, followers: 76, rank: 6, asset: 'Forex' },
];

const DashboardCopyTrading = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [copied, setCopied] = useState<string[]>([]);

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  const toggleCopy = (name: string) => {
    setCopied(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border px-6 py-3">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" /> Copy Trading
          </h1>
          <p className="text-xs text-muted-foreground">Follow and copy successful traders</p>
        </header>

        <div className="p-6 space-y-4">
          {topTraders.map((trader, i) => (
            <motion.div
              key={trader.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-lg p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  #{trader.rank}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {trader.name}
                    {trader.rank <= 3 && <Star className="h-3 w-3 text-primary fill-primary" />}
                  </h3>
                  <p className="text-xs text-muted-foreground">{trader.asset} specialist</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-sm font-mono font-bold text-profit">{trader.winRate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Profit</p>
                  <p className="text-sm font-mono font-bold text-profit">+${trader.profit}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Trades</p>
                  <p className="text-sm font-mono text-foreground">{trader.trades}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /></p>
                  <p className="text-sm font-mono text-foreground">{trader.followers}</p>
                </div>

                <Button
                  size="sm"
                  onClick={() => toggleCopy(trader.name)}
                  className={copied.includes(trader.name)
                    ? 'bg-loss/20 text-loss hover:bg-loss/30 border-loss/30'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }
                  variant={copied.includes(trader.name) ? 'outline' : 'default'}
                >
                  {copied.includes(trader.name) ? 'Unfollow' : 'Copy'}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardCopyTrading;
