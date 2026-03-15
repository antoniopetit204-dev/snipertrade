import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getUser } from '@/lib/store';
import { Shield, AlertTriangle, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const DashboardRisk = () => {
  const user = getUser();
  const { toast } = useToast();
  const [config, setConfig] = useState({
    maxDailyLoss: '50', maxDailyTrades: '100', maxStakePerTrade: '10',
    maxConcurrentTrades: '3', stopOnLossStreak: '5', autoStopEnabled: true,
    martingaleLimit: '4', riskPerTrade: '2',
  });

  useEffect(() => {
    const saved = localStorage.getItem('hft_risk_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const saveConfig = () => {
    localStorage.setItem('hft_risk_config', JSON.stringify(config));
    toast({ title: 'Risk settings saved' });
  };

  if (!user) return null;

  const inputClass = "bg-secondary border-border text-foreground text-xs sm:text-sm";

  return (
    <DashboardLayout title="Risk Management" icon={<Shield className="h-5 w-5 text-primary" />} subtitle="Configure risk controls">
      <div className="space-y-4 sm:space-y-6 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs sm:text-sm font-medium text-foreground">Trading involves risk</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Set appropriate risk limits before running any bots. Never risk more than you can afford to lose.</p>
          </div>
        </motion.div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-3 sm:space-y-4">
          <h2 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-loss" /> Loss Limits
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Max Daily Loss (USD)</Label>
              <Input value={config.maxDailyLoss} onChange={e => setConfig({ ...config, maxDailyLoss: e.target.value })} type="number" className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Stop on Loss Streak</Label>
              <Input value={config.stopOnLossStreak} onChange={e => setConfig({ ...config, stopOnLossStreak: e.target.value })} type="number" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-3 sm:space-y-4">
          <h2 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Trade Limits
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Max Stake Per Trade (USD)</Label>
              <Input value={config.maxStakePerTrade} onChange={e => setConfig({ ...config, maxStakePerTrade: e.target.value })} type="number" className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Max Daily Trades</Label>
              <Input value={config.maxDailyTrades} onChange={e => setConfig({ ...config, maxDailyTrades: e.target.value })} type="number" className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Max Concurrent Trades</Label>
              <Input value={config.maxConcurrentTrades} onChange={e => setConfig({ ...config, maxConcurrentTrades: e.target.value })} type="number" className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Martingale Step Limit</Label>
              <Input value={config.martingaleLimit} onChange={e => setConfig({ ...config, martingaleLimit: e.target.value })} type="number" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-3 sm:space-y-4">
          <h2 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" /> Risk Settings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Risk Per Trade (%)</Label>
              <Input value={config.riskPerTrade} onChange={e => setConfig({ ...config, riskPerTrade: e.target.value })} type="number" className={inputClass} />
            </div>
            <div className="flex items-center gap-3 pt-4 sm:pt-6">
              <Switch checked={config.autoStopEnabled} onCheckedChange={v => setConfig({ ...config, autoStopEnabled: v })} />
              <Label className="text-xs sm:text-sm text-foreground">Auto-stop when limits reached</Label>
            </div>
          </div>
        </div>

        <Button onClick={saveConfig} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm">
          Save Risk Configuration
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default DashboardRisk;
