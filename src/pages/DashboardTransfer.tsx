import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  fetchTransferConfig, fetchTransferHistory, lookupRecipient, sendTransfer,
  type TransferConfig, type TransferReceipt, type TransferRow,
} from '@/lib/transfers';
import { ArrowLeftRight, Copy, CheckCircle2, Send, Loader2 } from 'lucide-react';

const DashboardTransfer = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<TransferConfig | null>(null);
  const [history, setHistory] = useState<TransferRow[]>([]);
  const [recipient, setRecipient] = useState('');
  const [resolved, setResolved] = useState<{ name: string; account_number: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<TransferReceipt | null>(null);

  const load = () => {
    fetchTransferConfig().then(setConfig).catch(e =>
      toast({ title: 'Could not load transfers', description: e.message, variant: 'destructive' }));
    fetchTransferHistory().then(setHistory).catch(() => {});
  };
  useEffect(load, []);

  // Resolve the recipient as the user types (debounced).
  useEffect(() => {
    const v = recipient.trim();
    setResolved(null);
    if (v.length < 4) return;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const r = await lookupRecipient(v);
        if (r.self) toast({ title: 'That is your own account', variant: 'destructive' });
        else if (r.found) setResolved({ name: r.name!, account_number: r.account_number! });
      } catch { /* ignore while typing */ }
      finally { setChecking(false); }
    }, 450);
    return () => { clearTimeout(t); setChecking(false); };
  }, [recipient]);

  const fee = config ? (Number(amount || 0) * config.fee_percent) / 100 : 0;
  const total = Number(amount || 0) + fee;

  const submit = async () => {
    if (!resolved) return toast({ title: 'Enter a valid account number first', variant: 'destructive' });
    setSending(true);
    try {
      const res = await sendTransfer(recipient.trim(), Number(amount), note);
      setReceipt(res.receipt);
      setAmount(''); setNote(''); setRecipient(''); setResolved(null);
      load();
      toast({ title: 'Transfer sent ✓' });
    } catch (e) {
      toast({ title: 'Transfer failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setSending(false); }
  };

  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast({ title: 'Copied' }));

  return (
    <DashboardLayout title="Send Funds" icon={<ArrowLeftRight className="h-5 w-5 text-primary" />}
      subtitle="Transfer money instantly to another account">
      <div className="space-y-4 max-w-3xl mx-auto">
        {config && (
          <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your account number</p>
            <button onClick={() => copy(config.account_number)}
              className="mt-1 font-mono font-bold tracking-widest text-lg text-foreground flex items-center gap-2">
              {config.account_number || '—'} <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              Balance <span className="font-mono text-foreground">KES {config.balance.toFixed(2)}</span>
              {config.fee_percent > 0 && <> · Fee {config.fee_percent}%</>} · Min KES {config.min}
            </p>
          </div>
        )}

        {config && !config.enabled && (
          <div className="p-3 rounded-lg bg-loss/10 border border-loss/30 text-loss text-sm">
            Transfers are temporarily switched off.
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Recipient account number or email</Label>
            <Input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="HFT-XXXXXX" className="font-mono" />
            {checking && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking…</p>}
            {resolved && (
              <p className="text-xs text-profit flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {resolved.name} · {resolved.account_number}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount (KES)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Note (optional)</Label>
              <Input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="What is it for?" />
            </div>
          </div>

          {Number(amount) > 0 && (
            <p className="text-xs text-muted-foreground">
              They receive <span className="font-mono text-foreground">KES {Number(amount).toFixed(2)}</span> ·
              You pay <span className="font-mono text-foreground">KES {total.toFixed(2)}</span>
              {fee > 0 && <> (fee KES {fee.toFixed(2)})</>}
            </p>
          )}

          <Button className="w-full" disabled={sending || !resolved || !config?.enabled || !(Number(amount) > 0)} onClick={submit}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            {sending ? 'Sending…' : 'Send funds'}
          </Button>
        </div>

        {receipt && (
          <div className="bg-card border border-profit/40 rounded-lg p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-profit text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Transfer receipt
            </div>
            {[
              ['Reference', receipt.reference],
              ['To', `${receipt.to_name} · ${receipt.to_account_number}`],
              ['Amount', `KES ${receipt.amount.toFixed(2)}`],
              ['Fee', `KES ${receipt.fee.toFixed(2)}`],
              ['Total charged', `KES ${receipt.total.toFixed(2)}`],
              ['New balance', `KES ${receipt.new_balance.toFixed(2)}`],
              ['Date', new Date(receipt.created_at).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{k}</span><span className="font-mono text-foreground">{v}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-sm font-semibold">Transfer history</div>
          {history.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No transfers yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Counterparty</th>
                    <th className="text-left px-3 py-2">Note</th>
                    <th className="text-right px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(t => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-3 py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className={`px-3 py-2 ${t.direction === 'in' ? 'text-profit' : 'text-loss'}`}>
                        {t.direction === 'in' ? 'Received' : 'Sent'}
                      </td>
                      <td className="px-3 py-2 font-mono">{t.counterparty || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.note || '—'}</td>
                      <td className={`px-3 py-2 text-right font-mono ${t.direction === 'in' ? 'text-profit' : 'text-loss'}`}>
                        {t.direction === 'in' ? '+' : '-'}{t.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardTransfer;
