import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchBots } from '@/lib/db';
import { getUser, type Bot } from '@/lib/store';
import { Bot as BotIcon, Play, Square, TrendingUp, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { toggleBotEnabled } from '@/lib/db';
import { motion } from 'framer-motion';

const DashboardBots = () => {
  const user = getUser();
  const [bots, setBots] = useState<Bot[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchBots().then(setBots);
  }, []);

  const toggleBot = async (id: string) => {
    const bot = bots.find(b => b.id === id);
    if (!bot) return;
    await toggleBotEnabled(id, !bot.enabled);
    setBots(bots.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b));
    toast({ title: `${bot.name} ${!bot.enabled ? 'started' : 'stopped'}` });
  };

  if (!user) return null;

  return (
    <DashboardLayout title="DBots" icon={<BotIcon className="h-5 w-5 text-primary" />} subtitle="Manage and run your automated trading bots">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {bots.map((bot, i) => (
          <motion.div key={bot.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{bot.name}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">{bot.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {bot.category === 'premium' && <Crown className="h-3 w-3 text-primary" />}
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${bot.enabled ? 'bg-profit/20 text-profit' : 'bg-muted text-muted-foreground'}`}>
                  {bot.enabled ? 'Active' : 'Off'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-center">
              {[
                { label: 'P&L', value: `${bot.profitLoss >= 0 ? '+' : ''}$${bot.profitLoss.toFixed(0)}`, cls: bot.profitLoss >= 0 ? 'text-profit' : 'text-loss' },
                { label: 'Trades', value: bot.trades, cls: 'text-foreground' },
                { label: 'Win Rate', value: `${bot.winRate}%`, cls: 'text-foreground' },
              ].map(s => (
                <div key={s.label} className="bg-secondary/50 rounded-md p-1.5 sm:p-2">
                  <p className="text-[9px] sm:text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xs sm:text-sm font-mono font-bold ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => toggleBot(bot.id)} variant="outline"
                className={`text-xs h-7 sm:h-8 ${bot.enabled ? 'bg-loss/20 text-loss hover:bg-loss/30 border-loss/30' : 'bg-profit/20 text-profit hover:bg-profit/30 border-profit/30'}`}>
                {bot.enabled ? <Square className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                {bot.enabled ? 'Stop' : 'Start'}
              </Button>
              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {bot.strategy}
              </span>
            </div>
          </motion.div>
        ))}
        {bots.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground text-sm py-8">No bots available. Admin can create bots in /adminking.</p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardBots;
