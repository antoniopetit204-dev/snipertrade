import { useState, useEffect } from 'react';
import { tradeNotifications, type TradeNotification } from '@/lib/trade-notifications';
import { Bell, BellOff, X, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationPanel = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<TradeNotification[]>(tradeNotifications.allNotifications);
  const [soundOn, setSoundOn] = useState(tradeNotifications.isSoundEnabled);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    const unsub = tradeNotifications.subscribe((n) => {
      setNotifications([...tradeNotifications.allNotifications]);
      setHasNew(true);
    });
    return () => { unsub(); };
  }, []);

  const typeStyles: Record<string, string> = {
    win: 'border-l-[3px] border-l-profit bg-profit/5',
    take_profit: 'border-l-[3px] border-l-profit bg-profit/5',
    loss: 'border-l-[3px] border-l-loss bg-loss/5',
    stop_loss: 'border-l-[3px] border-l-loss bg-loss/5',
    info: 'border-l-[3px] border-l-primary bg-primary/5',
    warning: 'border-l-[3px] border-l-[hsl(40,100%,50%)] bg-[hsl(40,100%,50%)]/5',
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); setHasNew(false); }}
        className="relative p-2 rounded-md hover:bg-accent transition-colors"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {hasNew && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Notifications</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSoundOn(tradeNotifications.toggleSound())}
                  className="p-1 rounded hover:bg-accent transition-colors"
                  title={soundOn ? 'Mute sounds' : 'Enable sounds'}
                >
                  {soundOn ? <Volume2 className="h-3.5 w-3.5 text-primary" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                <button
                  onClick={() => { tradeNotifications.clearAll(); setNotifications([]); }}
                  className="p-1 rounded hover:bg-accent transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent transition-colors">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">No notifications yet</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={cn("px-3 py-2.5 border-b border-border last:border-b-0", typeStyles[n.type] || '')}>
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-medium text-foreground">{n.title}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                    {n.profit !== undefined && (
                      <span className={cn("text-xs font-mono font-semibold mt-1 inline-block", n.profit >= 0 ? 'text-profit' : 'text-loss')}>
                        {n.profit >= 0 ? '+' : ''}{n.profit.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
