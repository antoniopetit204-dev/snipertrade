import { DashboardLayout } from '@/components/DashboardLayout';
import { getUser, getBots } from '@/lib/store';
import { Gift, Play, TrendingUp, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const DashboardFreeBots = () => {
  const user = getUser();
  const navigate = useNavigate();
  const freeBots = getBots().filter(b => b.category === 'free');
  const premiumBots = getBots().filter(b => b.category === 'premium');

  if (!user) return null;

  return (
    <DashboardLayout title="Free Bots" icon={<Gift className="h-5 w-5 text-primary" />} subtitle="Pre-built trading bots">
      <div className="space-y-6">
        {/* Free Bots */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Gift className="h-4 w-4 text-profit" /> Free Bots
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {freeBots.map((bot, i) => (
              <motion.div key={bot.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-lg p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{bot.name}</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">{bot.description}</p>
                  </div>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-profit/20 text-profit shrink-0 ml-2">Free</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
                  <div className="bg-secondary/50 rounded-md p-1.5">
                    <p className="text-[9px] text-muted-foreground">P&L</p>
                    <p className={`text-xs font-mono font-bold ${bot.profitLoss >= 0 ? 'text-profit' : 'text-loss'}`}>${bot.profitLoss.toFixed(0)}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-md p-1.5">
                    <p className="text-[9px] text-muted-foreground">Trades</p>
                    <p className="text-xs font-mono font-bold text-foreground">{bot.trades}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-md p-1.5">
                    <p className="text-[9px] text-muted-foreground">Win</p>
                    <p className="text-xs font-mono font-bold text-foreground">{bot.winRate}%</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="bg-profit/20 text-profit hover:bg-profit/30 border-profit/30 text-xs h-7 w-full"
                  onClick={() => navigate('/dashboard/bot-builder')}>
                  <Play className="h-3 w-3 mr-1" /> Deploy
                </Button>
              </motion.div>
            ))}
            {freeBots.length === 0 && <p className="col-span-full text-center text-muted-foreground text-sm py-8">No free bots available</p>}
          </div>
        </div>

        {/* Premium Bots */}
        {premiumBots.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" /> Premium Bots
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {premiumBots.map((bot, i) => (
                <motion.div key={bot.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-card border border-primary/20 rounded-lg p-4 sm:p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">PREMIUM</div>
                  <div className="min-w-0 mb-3">
                    <h3 className="font-semibold text-foreground text-sm truncate">{bot.name}</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">{bot.description}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
                    <div className="bg-secondary/50 rounded-md p-1.5">
                      <p className="text-[9px] text-muted-foreground">P&L</p>
                      <p className={`text-xs font-mono font-bold ${bot.profitLoss >= 0 ? 'text-profit' : 'text-loss'}`}>${bot.profitLoss.toFixed(0)}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-md p-1.5">
                      <p className="text-[9px] text-muted-foreground">Trades</p>
                      <p className="text-xs font-mono font-bold text-foreground">{bot.trades}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-md p-1.5">
                      <p className="text-[9px] text-muted-foreground">Win</p>
                      <p className="text-xs font-mono font-bold text-foreground">{bot.winRate}%</p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-7 w-full"
                    onClick={() => navigate('/dashboard/bot-builder')}>
                    <Play className="h-3 w-3 mr-1" /> Deploy Premium
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardFreeBots;
