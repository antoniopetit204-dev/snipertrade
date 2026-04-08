import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getUser } from '@/lib/store';
import { useDerivConnection } from '@/hooks/useDerivWS';
import { initiateDeposit, fetchDeposits, fetchDepositEnabled, queryStkStatus } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Smartphone, AlertTriangle, CheckCircle, Clock, XCircle, ArrowDownToLine, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardDeposit = () => {
  const user = getUser();
  const { balance, currency, authorized } = useDerivConnection();
  const { toast } = useToast();

  const [depositEnabled, setDepositEnabled] = useState<boolean | null>(null);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [pendingCheckout, setPendingCheckout] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const account = user?.activeAccount?.acct || '';

  useEffect(() => {
    fetchDepositEnabled().then(setDepositEnabled);
    if (account) fetchDeposits(account).then(setDeposits);
  }, [account]);

  // Poll for pending STK
  useEffect(() => {
    if (!pendingCheckout) return;
    pollRef.current = setInterval(async () => {
      try {
        const status = await queryStkStatus(pendingCheckout);
        if (status.db_status === 'completed' || status.db_status === 'credited') {
          toast({ title: 'Deposit Successful!', description: `Receipt: ${status.receipt || 'Confirmed'}` });
          setPendingCheckout(null);
          if (account) fetchDeposits(account).then(setDeposits);
        } else if (status.db_status === 'cancelled' || status.result_code === '1032') {
          toast({ title: 'Deposit Cancelled', variant: 'destructive' });
          setPendingCheckout(null);
        }
      } catch {}
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pendingCheckout, account]);

  const handleDeposit = async () => {
    if (!phone || !amount || !account) return;
    const amt = Number(amount);
    if (amt < 1) { toast({ title: 'Minimum deposit is KES 1', variant: 'destructive' }); return; }

    setLoading(true);
    try {
      const result = await initiateDeposit(phone, amt, account);
      if (result.success) {
        toast({ title: 'STK Push Sent', description: 'Check your phone to complete payment' });
        setPendingCheckout(result.checkout_request_id);
        setPhone(''); setAmount('');
      } else {
        toast({ title: 'Failed', description: result.error || 'Could not initiate deposit', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (depositEnabled === false) {
    return (
      <DashboardLayout title="Deposit" icon={<ArrowDownToLine className="h-5 w-5 text-primary" />}>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-primary/50" />
          <h2 className="text-lg font-semibold text-foreground">Deposits Disabled</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            The administrator has not enabled the deposit feature. Please contact support for assistance.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Deposit Funds" icon={<ArrowDownToLine className="h-5 w-5 text-primary" />}>
      <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
        {/* Disclaimer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Third-Party Deposit Service</p>
            <p>This platform acts as an authorized third-party deposit agent. Funds are deposited via M-Pesa (Lipa Na M-Pesa Paybill) and credited to your trading account. By proceeding, you authorize this transaction.</p>
            <p className="text-[10px] text-muted-foreground">Standard M-Pesa transaction charges may apply.</p>
          </div>
        </motion.div>

        {/* Balance Card */}
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center">
          <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
            {balance !== null ? balance.toFixed(2) : '—'} <span className="text-sm text-primary">{currency}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Account: {account}</p>
        </div>

        {/* Deposit Form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4">
          <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" /> M-Pesa Deposit
          </h2>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Phone Number</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0712345678 or 254712345678"
                className="bg-secondary border-border text-foreground font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Amount (KES)</Label>
              <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" placeholder="Enter amount"
                className="bg-secondary border-border text-foreground font-mono text-sm" />
            </div>

            {/* Quick amounts */}
            <div className="flex flex-wrap gap-2">
              {[100, 500, 1000, 2500, 5000].map(a => (
                <button key={a} onClick={() => setAmount(String(a))}
                  className="px-3 py-1 rounded-full bg-secondary border border-border text-xs text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors">
                  KES {a.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleDeposit} disabled={loading || !phone || !amount || !authorized}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm">
            {loading ? 'Sending STK Push...' : pendingCheckout ? 'Waiting for payment...' : 'Deposit via M-Pesa'}
          </Button>

          {!authorized && (
            <p className="text-xs text-loss text-center">Please connect your Deriv account first</p>
          )}
        </motion.div>

        {/* Pending indicator */}
        {pendingCheckout && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center gap-3 animate-pulse">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Payment Pending</p>
              <p className="text-xs text-muted-foreground">Complete the M-Pesa prompt on your phone. We're checking status automatically...</p>
            </div>
          </div>
        )}

        {/* Deposit History */}
        {deposits.length > 0 && (
          <div className="bg-card border border-border rounded-lg">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
              <h2 className="text-xs sm:text-sm font-semibold text-foreground">Deposit History</h2>
            </div>
            <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
              {deposits.map((d: any) => (
                <div key={d.id} className="px-3 sm:px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <div className="min-w-0">
                    <p className="text-foreground font-medium">KES {d.amount}</p>
                    <p className="text-[10px] text-muted-foreground">{d.phone_number} • {new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {d.status === 'completed' || d.status === 'credited' ? (
                      <span className="flex items-center gap-1 text-profit text-xs"><CheckCircle className="h-3 w-3" /> {d.status}</span>
                    ) : d.status === 'cancelled' ? (
                      <span className="flex items-center gap-1 text-loss text-xs"><XCircle className="h-3 w-3" /> Cancelled</span>
                    ) : (
                      <span className="flex items-center gap-1 text-primary text-xs"><Clock className="h-3 w-3" /> Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardDeposit;
