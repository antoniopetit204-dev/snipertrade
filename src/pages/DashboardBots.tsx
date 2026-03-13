import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getUser, getBots, saveBots, type Bot } from '@/lib/store';
import { Bot as BotIcon, Play, Square, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const DashboardBots = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [bots, setBots] = useState<Bot[]>(getBots());
  const { toast } = useToast();

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  const toggleBot = (id: string) => {
    const updated = bots.map((b) =>
      b.id === id ? { ...b, enabled: !b.enabled } : b
    );
    setBots(updated);
    saveBots(updated);
    const bot = updated.find((b) => b.id === id)!;
    toast({ title: `${bot.name} ${bot.enabled ? 'started' : 'stopped'}` });
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border px-6 py-3">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BotIcon className="h-5 w-5 text-primary" /> DBots
          </h1>
          <p className="text-xs text-muted-foreground">Manage and run your automated trading bots</p>
        </header>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bots.map((bot, i) => (
            <motion.div
              key={bot.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-lg p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{bot.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{bot.description}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${bot.enabled ? 'bg-profit/20 text-profit' : 'bg-muted text-muted-foreground'}`}>
                  {bot.enabled ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-secondary/50 rounded-md p-2">
                  <p className="text-xs text-muted-foreground">P&L</p>
                  <p className={`text-sm font-mono font-bold ${bot.profitLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {bot.profitLoss >= 0 ? '+' : ''}${bot.profitLoss.toFixed(0)}
                  </p>
                </div>
                <div className="bg-secondary/50 rounded-md p-2">
                  <p className="text-xs text-muted-foreground">Trades</p>
                  <p className="text-sm font-mono font-bold text-foreground">{bot.trades}</p>
                </div>
                <div className="bg-secondary/50 rounded-md p-2">
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-sm font-mono font-bold text-foreground">{bot.winRate}%</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => toggleBot(bot.id)}
                  className={bot.enabled
                    ? 'bg-loss/20 text-loss hover:bg-loss/30 border-loss/30'
                    : 'bg-profit/20 text-profit hover:bg-profit/30 border-profit/30'
                  }
                  variant="outline"
                >
                  {bot.enabled ? <Square className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                  {bot.enabled ? 'Stop' : 'Start'}
                </Button>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> {bot.strategy}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardBots;
