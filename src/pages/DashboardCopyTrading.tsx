import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDerivConnection } from '@/hooks/useDerivWS';
import { derivWS } from '@/lib/deriv-ws';
import { getUser } from '@/lib/store';
import { Copy, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// Copy trading uses Deriv's copy trading API when available
const topTraders = [
  { name: 'TraderAlpha', winRate: 78.5, profit: 12450, trades: 892, followers: 234, rank: 1, asset: 'Volatility' },
  { name: 'CryptoKing', winRate: 72.1, profit: 8920, trades: 1245, followers: 189, rank: 2, asset: 'Crypto' },
  { name: 'ForexPro', winRate: 68.3, profit: 6780, trades: 567, followers: 156, rank: 3, asset: 'Forex' },
  { name: 'ScalperBot', winRate: 65.7, profit: 4560, trades: 2341, followers: 122, rank: 4, asset: 'Volatility' },
  { name: 'GoldDigger', winRate: 71.2, profit: 3890, trades: 234, followers: 98, rank: 5, asset: 'Commodities' },
];

const DashboardCopyTrading = () => {
  const user = getUser();
  const { connected, authorized } = useDerivConnection();
  const [copied, setCopied] = useState<string[]>([]);
  const [copyTraders, setCopyTraders] = useState<any[]>([]);

  // Try to fetch real copy trading list
  useEffect(() => {
    if (!connected || !authorized) return;
    const fetchCopyTraders = async () => {
      try {
        const resp = await derivWS.send({ copytrading_list: 1 });
        if (resp.copytrading_list?.copiers) {
          setCopyTraders(resp.copytrading_list.copiers);
        }
      } catch {}
    };
    fetchCopyTraders();
  }, [connected, authorized]);

  const toggleCopy = async (name: string) => {
    setCopied(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  if (!user) return null;

  const traders = copyTraders.length > 0 ? copyTraders : topTraders;

  return (
    <DashboardLayout title="Copy Trading" icon={<Copy className="h-5 w-5 text-primary" />} subtitle="Follow and copy successful traders">
      <div className="space-y-3 sm:space-y-4">
        {traders.map((trader: any, i: number) => (
          <motion.div key={trader.name || trader.loginid || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs sm:text-sm shrink-0">
                  #{trader.rank || i + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 truncate">
                    {trader.name || trader.loginid}
                    {(trader.rank || i + 1) <= 3 && <Star className="h-3 w-3 text-primary fill-primary shrink-0" />}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{trader.asset || 'Trader'} specialist</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-6 justify-between sm:justify-end">
                <div className="text-center">
                  <p className="text-[9px] sm:text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-xs sm:text-sm font-mono font-bold text-profit">{trader.winRate || '—'}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] sm:text-xs text-muted-foreground">Profit</p>
                  <p className="text-xs sm:text-sm font-mono font-bold text-profit">+${trader.profit || 0}</p>
                </div>
                <div className="text-center hidden sm:block">
                  <p className="text-xs text-muted-foreground">Trades</p>
                  <p className="text-sm font-mono text-foreground">{trader.trades || 0}</p>
                </div>
                <div className="text-center hidden sm:block">
                  <p className="text-xs text-muted-foreground flex items-center gap-0.5"><Users className="h-3 w-3" /></p>
                  <p className="text-sm font-mono text-foreground">{trader.followers || 0}</p>
                </div>
                <Button size="sm" onClick={() => toggleCopy(trader.name || trader.loginid)}
                  className={`text-xs h-7 sm:h-8 ${copied.includes(trader.name || trader.loginid) ? 'bg-loss/20 text-loss hover:bg-loss/30 border-loss/30' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                  variant={copied.includes(trader.name || trader.loginid) ? 'outline' : 'default'}>
                  {copied.includes(trader.name || trader.loginid) ? 'Unfollow' : 'Copy'}
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default DashboardCopyTrading;
