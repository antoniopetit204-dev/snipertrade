import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Mail, Bell } from 'lucide-react';
import { getUser } from '@/lib/store';
import { fetchEmailPrefs, upsertEmailPrefs } from '@/lib/auth-email';
import { useToast } from '@/hooks/use-toast';

const DEFAULT = { enabled: true, notify_login: true, notify_trades: false, notify_deposits: true, notify_withdrawals: true, marketing: false };

export default function DashboardSettings() {
  const { toast } = useToast();
  const user = getUser();
  const identifier = user?.email || '';
  const [prefs, setPrefs] = useState<any>(DEFAULT);
  const [email, setEmail] = useState(user?.email?.includes('@') ? user.email : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!identifier) return;
    fetchEmailPrefs(identifier).then(p => { if (p) { setPrefs(p); setEmail(p.email || email); } });
  }, [identifier]);

  const save = async () => {
    setSaving(true);
    await upsertEmailPrefs(identifier, { ...prefs, email });
    toast({ title: 'Preferences saved' });
    setSaving(false);
  };

  return (
    <DashboardLayout title="Settings" icon={<SettingsIcon className="h-4 w-4 text-primary" />} subtitle="Manage your account preferences">
      <div className="max-w-2xl space-y-4">
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email Address</h2>
          <div className="space-y-1.5">
            <Label className="text-xs">Notification email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            <p className="text-[10px] text-muted-foreground">Used for all notifications below.</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Email Notifications</h2>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium">Enable all email notifications</p>
              <p className="text-xs text-muted-foreground">Master switch for outgoing emails to your address.</p>
            </div>
            <Switch checked={prefs.enabled} onCheckedChange={v => setPrefs({ ...prefs, enabled: v })} />
          </div>
          {[
            { k: 'notify_login', label: 'Login alerts', desc: 'New sign-in to your account' },
            { k: 'notify_trades', label: 'Trade results', desc: 'Win/loss notifications' },
            { k: 'notify_deposits', label: 'Deposit confirmations', desc: 'When M-Pesa credits your balance' },
            { k: 'notify_withdrawals', label: 'Withdrawal updates', desc: 'Approvals & processing' },
            { k: 'marketing', label: 'Product news & tips', desc: 'Occasional product updates' },
          ].map(item => (
            <div key={item.k} className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch disabled={!prefs.enabled} checked={prefs[item.k]} onCheckedChange={v => setPrefs({ ...prefs, [item.k]: v })} />
            </div>
          ))}
          <Button onClick={save} disabled={saving} className="mt-2">{saving ? 'Saving...' : 'Save Preferences'}</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
