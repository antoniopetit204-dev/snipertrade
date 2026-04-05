import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchBots, fetchBotAccess, initiateStkPush, queryStkStatus, createAccessRequest } from '@/lib/db';
import { getUser, type Bot } from '@/lib/store';
import { Bot as BotIcon, Play, Square, TrendingUp, Crown, ShoppingCart, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { toggleBotEnabled } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const DashboardBots = () => {
  const user = getUser();
  const [bots, setBots] = useState<Bot[]>([]);
  const { toast } = useToast();
  const [buyingBot, setBuyingBot] = useState<Bot | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [pollId, setPollId] = useState<string | null>(null);
  const [requestBot, setRequestBot] = useState<Bot | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [accessibleBotIds, setAccessibleBotIds] = useState<string[]>([]);
  const [pendingBotIds, setPendingBotIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const [loadedBots, access] = await Promise.all([
        fetchBots(),
        fetchBotAccess(user?.activeAccount?.acct),
      ]);
      setBots(loadedBots);
      setAccessibleBotIds(access.accessibleBotIds);
      setPendingBotIds(access.pendingBotIds);
    };

    loadData();
  }, [user?.activeAccount?.acct]);

  const buildBotDeploymentSearch = (bot: Bot) => {
    const text = `${bot.name} ${bot.description} ${bot.strategy}`.toLowerCase();
    const params = new URLSearchParams();
    params.set('botId', bot.id);
    params.set('botName', bot.name);
    params.set('symbol', text.includes('volatility 10') ? 'R_10' : text.includes('volatility 25') ? 'R_25' : 'R_100');
    params.set('contractType', text.includes('under') ? 'DIGITUNDER' : text.includes('over') ? 'DIGITOVER' : text.includes('fall') || text.includes('sell') || text.includes('bear') ? 'PUT' : 'CALL');
    params.set('stake', '1');
    params.set('duration', text.includes('swing') ? '10' : '5');
    params.set('durationUnit', 't');
    params.set('rounds', '10');
    params.set('barrier', '5');
    return params.toString();
  };

  const deployBot = (bot: Bot) => {
    navigate(`/dashboard/bot-builder?${buildBotDeploymentSearch(bot)}`);
  };

  // Poll for STK status
  useEffect(() => {
    if (!pollId) return;
    const interval = setInterval(async () => {
      try {
        const result = await queryStkStatus(pollId);
        if (result.db_status === 'completed') {
          clearInterval(interval);
          setPollId(null);
          if (buyingBot?.id) setAccessibleBotIds(prev => prev.includes(buyingBot.id) ? prev : [...prev, buyingBot.id]);
          setBuyingBot(null);
          setPurchasing(false);
          toast({ title: '✅ Payment Successful!', description: `Receipt: ${result.receipt || 'Processing'}` });
        } else if (result.db_status === 'cancelled' || result.result_code === '1032') {
          clearInterval(interval);
          setPollId(null);
          setPurchasing(false);
          toast({ title: 'Payment Cancelled', description: 'The transaction was cancelled.', variant: 'destructive' });
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [pollId, toast]);

  const toggleBot = async (id: string) => {
    const bot = bots.find(b => b.id === id);
    if (!bot) return;
    const hasAccess = bot.category === 'free' || accessibleBotIds.includes(bot.id);
    if (bot.category === 'premium' && !hasAccess) {
      setBuyingBot(bot);
      return;
    }
    await toggleBotEnabled(id, !bot.enabled);
    setBots(bots.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b));
    toast({ title: `${bot.name} ${!bot.enabled ? 'started' : 'stopped'}` });
  };

  const handlePurchase = async () => {
    if (!buyingBot || !phoneNumber || !user?.activeAccount) return;
    setPurchasing(true);
    try {
      const result = await initiateStkPush(phoneNumber, buyingBot.price, buyingBot.id, user.activeAccount.acct);
      if (result.success) {
        toast({ title: '📱 Check your phone', description: 'Enter your M-Pesa PIN to complete payment.' });
        setPollId(result.checkout_request_id);
      } else {
        toast({ title: 'Payment failed', description: result.error, variant: 'destructive' });
        setPurchasing(false);
      }
    } catch (err: any) {
      toast({ title: 'Payment failed', description: err.message, variant: 'destructive' });
      setPurchasing(false);
    }
  };

  const handleAccessRequest = async () => {
    if (!requestBot || !user?.activeAccount) return;
    try {
      await createAccessRequest(user.activeAccount.acct, requestBot.id, requestMessage || 'Requesting access to this bot');
      setPendingBotIds(prev => prev.includes(requestBot.id) ? prev : [...prev, requestBot.id]);
      toast({ title: 'Request sent!', description: 'Admin will review your request.' });
      setRequestBot(null);
      setRequestMessage('');
    } catch {
      toast({ title: 'Failed to send request', variant: 'destructive' });
    }
  };

  if (!user) return null;

  const freeBots = bots.filter(b => b.category === 'free');
  const premiumBots = bots.filter(b => b.category === 'premium');

  return (
    <DashboardLayout title="DBots" icon={<BotIcon className="h-5 w-5 text-primary" />} subtitle="Manage and run your automated trading bots">
      {/* Free Bots */}
      {freeBots.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Free Bots</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {freeBots.map((bot, i) => (
              <BotCard key={bot.id} bot={bot} index={i} onToggle={toggleBot} onDeploy={deployBot} />
            ))}
          </div>
        </div>
      )}

      {/* Premium Bots */}
      {premiumBots.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" /> Premium Bots
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {premiumBots.map((bot, i) => (
              <motion.div key={bot.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border border-primary/20 rounded-lg p-4 sm:p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                  KES {bot.price}
                </div>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{bot.name}</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">{bot.description}</p>
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
                  {accessibleBotIds.includes(bot.id) ? (
                    <>
                      <Button size="sm" onClick={() => deployBot(bot)} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-7 sm:h-8 flex-1">
                        <Play className="h-3 w-3 mr-1" /> Deploy
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleBot(bot.id)} className="text-xs h-7 sm:h-8 border-border">
                        {bot.enabled ? <Square className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                        {bot.enabled ? 'Stop' : 'Arm'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => setBuyingBot(bot)} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-7 sm:h-8 flex-1">
                        <ShoppingCart className="h-3 w-3 mr-1" /> Buy Now
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRequestBot(bot)} disabled={pendingBotIds.includes(bot.id)} className="text-xs h-7 sm:h-8 border-border">
                        <Send className="h-3 w-3 mr-1" /> {pendingBotIds.includes(bot.id) ? 'Requested' : 'Request'}
                      </Button>
                    </>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3" /> {bot.strategy}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {bots.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">No bots available. Admin can create bots in /adminking.</p>
      )}

      {/* M-Pesa Purchase Modal */}
      <AnimatePresence>
        {buyingBot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget && !purchasing) { setBuyingBot(null); setPurchasing(false); } }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-5 sm:p-6">
              <h3 className="text-base font-semibold text-foreground mb-1">Purchase {buyingBot.name}</h3>
              <p className="text-xs text-muted-foreground mb-4">{buyingBot.description}</p>
              <div className="bg-secondary/50 rounded-lg p-3 mb-4 text-center">
                <p className="text-[10px] text-muted-foreground">Price</p>
                <p className="text-xl font-bold text-primary font-mono">KES {buyingBot.price}</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">M-Pesa Phone Number</label>
                  <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="e.g. 0712345678"
                    className="bg-secondary border-border text-foreground font-mono text-sm" disabled={purchasing} />
                </div>
                <Button onClick={handlePurchase} disabled={!phoneNumber || purchasing}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                  {purchasing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {pollId ? 'Waiting for payment...' : 'Sending STK push...'}</>
                  ) : (
                    <><ShoppingCart className="h-4 w-4 mr-2" /> Pay with M-Pesa</>
                  )}
                </Button>
                {purchasing && pollId && (
                  <p className="text-[10px] text-center text-muted-foreground animate-pulse">
                    Check your phone and enter your M-Pesa PIN
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Access Request Modal */}
      <AnimatePresence>
        {requestBot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setRequestBot(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-5 sm:p-6">
              <h3 className="text-base font-semibold text-foreground mb-1">Request Access</h3>
              <p className="text-xs text-muted-foreground mb-4">Request access to <strong>{requestBot.name}</strong></p>
              <div className="space-y-3">
                <Input value={requestMessage} onChange={e => setRequestMessage(e.target.value)} placeholder="Why do you need access? (optional)"
                  className="bg-secondary border-border text-foreground text-sm" />
                <Button onClick={handleAccessRequest} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                  <Send className="h-4 w-4 mr-2" /> Submit Request
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

const BotCard = ({ bot, index, onToggle, onDeploy }: { bot: Bot; index: number; onToggle: (id: string) => void; onDeploy: (bot: Bot) => void }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
    className="bg-card border border-border rounded-lg p-4 sm:p-5">
    <div className="flex items-start justify-between mb-3">
      <div className="min-w-0">
        <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{bot.name}</h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">{bot.description}</p>
      </div>
      <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${bot.enabled ? 'bg-profit/20 text-profit' : 'bg-muted text-muted-foreground'}`}>
        {bot.enabled ? 'Active' : 'Off'}
      </span>
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
      <Button size="sm" onClick={() => onDeploy(bot)} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-7 sm:h-8">
        <Play className="h-3 w-3 mr-1" /> Deploy
      </Button>
      <Button size="sm" onClick={() => onToggle(bot.id)} variant="outline"
        className={`text-xs h-7 sm:h-8 ${bot.enabled ? 'bg-loss/20 text-loss hover:bg-loss/30 border-loss/30' : 'bg-profit/20 text-profit hover:bg-profit/30 border-profit/30'}`}>
        {bot.enabled ? <Square className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
        {bot.enabled ? 'Stop' : 'Arm'}
      </Button>
      <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
        <TrendingUp className="h-3 w-3" /> {bot.strategy}
      </span>
    </div>
  </motion.div>
);

export default DashboardBots;
