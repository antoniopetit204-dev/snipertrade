import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getUser } from '@/lib/store';
import { Shield, AlertTriangle, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const DashboardRisk = () => {
  const navigate = useNavigate();
  const user = getUser();
  const { toast } = useToast();
  
  const [config, setConfig] = useState({
    maxDailyLoss: '50',
    maxDailyTrades: '100',
    maxStakePerTrade: '10',
    maxConcurrentTrades: '3',
    stopOnLossStreak: '5',
    autoStopEnabled: true,
    martingaleLimit: '4',
    riskPerTrade: '2',
  });

  useEffect(() => {
    if (!user) navigate('/');
    const saved = localStorage.getItem('hft_risk_config');
    if (saved) setConfig(JSON.parse(saved));
  }, [user, navigate]);

  const saveConfig = () => {
    localStorage.setItem('hft_risk_config', JSON.stringify(config));
    toast({ title: 'Risk settings saved', description: 'Your risk management configuration has been updated' });
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border px-6 py-3">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Risk Management
          </h1>
          <p className="text-xs text-muted-foreground">Configure risk controls to protect your capital</p>
        </header>

        <div className="p-6 space-y-6 max-w-3xl">
          {/* Warning Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Trading involves risk</p>
              <p className="text-xs text-muted-foreground mt-1">
                Always trade responsibly. Set appropriate risk limits before running any bots. Never risk more than you can afford to lose.
              </p>
            </div>
          </motion.div>

          {/* Loss Limits */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-loss" /> Loss Limits
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Max Daily Loss (USD)</Label>
                <Input
                  value={config.maxDailyLoss}
                  onChange={e => setConfig({ ...config, maxDailyLoss: e.target.value })}
                  type="number"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Stop on Loss Streak</Label>
                <Input
                  value={config.stopOnLossStreak}
                  onChange={e => setConfig({ ...config, stopOnLossStreak: e.target.value })}
                  type="number"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Trade Limits */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Trade Limits
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Max Stake Per Trade (USD)</Label>
                <Input
                  value={config.maxStakePerTrade}
                  onChange={e => setConfig({ ...config, maxStakePerTrade: e.target.value })}
                  type="number"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Max Daily Trades</Label>
                <Input
                  value={config.maxDailyTrades}
                  onChange={e => setConfig({ ...config, maxDailyTrades: e.target.value })}
                  type="number"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Max Concurrent Trades</Label>
                <Input
                  value={config.maxConcurrentTrades}
                  onChange={e => setConfig({ ...config, maxConcurrentTrades: e.target.value })}
                  type="number"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Martingale Step Limit</Label>
                <Input
                  value={config.martingaleLimit}
                  onChange={e => setConfig({ ...config, martingaleLimit: e.target.value })}
                  type="number"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Risk Per Trade */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" /> Risk Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Risk Per Trade (%)</Label>
                <Input
                  value={config.riskPerTrade}
                  onChange={e => setConfig({ ...config, riskPerTrade: e.target.value })}
                  type="number"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={config.autoStopEnabled}
                  onCheckedChange={v => setConfig({ ...config, autoStopEnabled: v })}
                />
                <Label className="text-sm text-foreground">Auto-stop when limits reached</Label>
              </div>
            </div>
          </div>

          <Button onClick={saveConfig} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            Save Risk Configuration
          </Button>
        </div>
      </main>
    </div>
  );
};

export default DashboardRisk;
