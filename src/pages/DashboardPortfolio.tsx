import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getUser } from '@/lib/store';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

const holdings = [
  { asset: 'USD Balance', amount: 12450.00, change: 0, allocation: 35 },
  { asset: 'BTC', amount: 0.45, value: 30344.25, change: 2.34, allocation: 25 },
  { asset: 'ETH', amount: 8.2, value: 28878.76, change: 1.87, allocation: 20 },
  { asset: 'Gold (XAU)', amount: 5, value: 11708.00, change: 0.42, allocation: 12 },
  { asset: 'EUR', amount: 3200, value: 3479.36, change: 0.15, allocation: 8 },
];

const DashboardPortfolio = () => {
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  if (!user) return null;

  const totalValue = holdings.reduce((s, h) => s + (h.value || h.amount), 0);

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border px-6 py-3">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Portfolio
          </h1>
        </header>

        <div className="p-6 space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Portfolio Value</p>
            <p className="text-3xl font-bold font-mono text-foreground">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Holdings</h2>
            </div>
            <div className="divide-y divide-border">
              {holdings.map((h, i) => (
                <motion.div
                  key={h.asset}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {h.asset.slice(0, 3)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{h.asset}</p>
                      <p className="text-xs text-muted-foreground">{h.allocation}% allocation</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-foreground">${(h.value || h.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    {h.change !== 0 && (
                      <p className={`text-xs font-mono flex items-center justify-end gap-0.5 ${h.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {h.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {h.change >= 0 ? '+' : ''}{h.change}%
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPortfolio;
