import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getUser } from '@/lib/store';
import { useDerivConnection } from '@/hooks/useDerivWS';
import { fetchWithdrawals, initiateWithdrawal, fetchWithdrawalEnabled, queryWithdrawalStatus } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpFromLine, Smartphone, AlertTriangle, CheckCircle, Clock, XCircle, Info, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardWithdraw = () => {
  const user = getUser();
  const { balance, currency, authorized } = useDerivConnection();
  const { toast } = useToast();

  const [withdrawEnabled, setWithdrawEnabled] = useState<boolean | null>(null);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const account = user?.activeAccount?.acct || '';

  useEffect(() => {
    fetchWithdrawalEnabled().then(setWithdrawEnabled);
    if (account) fetchWithdrawals(account).then(setWithdrawals);
  }, [account]);

  // Poll for pending withdrawal
  useEffect(() => {
    if (!pendingId) return;
    pollRef.current = setInterval(async () => {
      try {
        const updated = await fetchWithdrawals(account);
        setWithdrawals(updated);
        const record = updated.find((w: any) => w.id === pendingId);
        if (record?.status === 'completed') {
          toast({ title: 'Withdrawal Successful!', description: `Sent to your M-Pesa` });
          setPendingId(null);
        } else if (record?.status === 'failed' || record?.status === 'cancelled') {
          toast({ title: 'Withdrawal Failed', variant: 'destructive' });
          setPendingId(null);
        }
      } catch {}
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pendingId, account]);

  const handleWithdraw = async () => {
    if (!phone || !amount || !account) return;
    const amt = Number(amount);
    if (amt < 10) { toast({ title: 'Minimum withdrawal is KES 10', variant: 'destructive' }); return; }
    if (balance !== null && amt > balance * 130) {
      toast({ title: 'Insufficient balance', description: `Max withdrawal based on your balance`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const result = await initiateWithdrawal(phone, amt, account);
      if (result.success) {
        toast({ title: 'Withdrawal Initiated', description: 'Processing your M-Pesa payout...' });
        setPendingId(result.withdrawal_id);
        setPhone(''); setAmount('');
        fetchWithdrawals(account).then(setWithdrawals);
      } else {
        toast({ title: 'Failed', description: result.error || 'Could not process withdrawal', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (withdrawEnabled === false) {
    return (
      <DashboardLayout title="Withdraw" icon={<ArrowUpFromLine className="h-5 w-5 text-primary" />}>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-primary/50" />
          <h2 className="text-lg font-semibold text-foreground">Withdrawals Disabled</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            The administrator has not enabled withdrawals. Please contact support.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Withdraw Funds" icon={<ArrowUpFromLine className="h-5 w-5 text-primary" />}>
      <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
        {/* Disclaimer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Third-Party Withdrawal Service</p>
            <p>Withdrawals are processed via M-Pesa B2C (Business to Customer). Funds are deducted from your trading account and sent to your M-Pesa number. Processing may take 1-5 minutes.</p>
            <p className="text-[10px] text-muted-foreground">Standard M-Pesa transaction charges may apply.</p>
          </div>
        </motion.div>

        {/* Balance Card */}
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center">
          <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
            {balance !== null ? balance.toFixed(2) : '—'} <span className="text-sm text-primary">{currency}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Account: {account}</p>
        </div>

        {/* Withdrawal Form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4">
          <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" /> M-Pesa Withdrawal
          </h2>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">M-Pesa Phone Number</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0712345678 or 254712345678"
                className="bg-secondary border-border text-foreground font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Amount (KES)</Label>
              <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="10" placeholder="Enter amount"
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

          <div className="bg-secondary/50 border border-border rounded-md p-3 flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              For security, withdrawals are verified and processed by the admin. Large withdrawals may require additional verification.
            </p>
          </div>

          <Button onClick={handleWithdraw} disabled={loading || !phone || !amount || !authorized}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm">
            {loading ? 'Processing...' : pendingId ? 'Withdrawal in progress...' : 'Withdraw to M-Pesa'}
          </Button>

          {!authorized && (
            <p className="text-xs text-loss text-center">Please connect your Deriv account first</p>
          )}
        </motion.div>

        {/* Pending indicator */}
        {pendingId && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center gap-3 animate-pulse">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Withdrawal Processing</p>
              <p className="text-xs text-muted-foreground">Your withdrawal is being processed. You'll receive M-Pesa confirmation shortly.</p>
            </div>
          </div>
        )}

        {/* Withdrawal History */}
        {withdrawals.length > 0 && (
          <div className="bg-card border border-border rounded-lg">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
              <h2 className="text-xs sm:text-sm font-semibold text-foreground">Withdrawal History</h2>
            </div>
            <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="px-3 sm:px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <div className="min-w-0">
                    <p className="text-foreground font-medium">KES {w.amount}</p>
                    <p className="text-[10px] text-muted-foreground">{w.phone_number} • {new Date(w.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {w.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-profit text-xs"><CheckCircle className="h-3 w-3" /> Completed</span>
                    ) : w.status === 'failed' || w.status === 'cancelled' ? (
                      <span className="flex items-center gap-1 text-loss text-xs"><XCircle className="h-3 w-3" /> {w.status}</span>
                    ) : w.status === 'approved' ? (
                      <span className="flex items-center gap-1 text-primary text-xs"><Clock className="h-3 w-3" /> Approved</span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground text-xs"><Clock className="h-3 w-3" /> Pending</span>
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

export default DashboardWithdraw;
