import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { fetchSettings, updateSettings } from '@/lib/db';
import { fetchAffiliateAdmin } from '@/lib/affiliate';
import type { AdminSettings } from '@/lib/store';

const inputClass = 'bg-background border-border text-foreground text-xs h-9';
const labelClass = 'text-[10px] uppercase tracking-wider text-muted-foreground';

export const AdminAffiliateTab = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [data, setData] = useState<{ affiliates: any[]; commissions: any[]; referrals: any[] } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings().then(setSettings);
    fetchAffiliateAdmin().then(setData).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    const ok = await updateSettings(settings as AdminSettings);
    setSaving(false);
    toast({ title: ok ? 'Affiliate settings saved ✓' : 'Save failed', variant: ok ? undefined : 'destructive' });
  };

  if (!settings) return <p className="text-xs text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Affiliate Program</h3>
          <Switch checked={!!settings.affiliateEnabled}
            onCheckedChange={v => setSettings({ ...settings, affiliateEnabled: v })} />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Commissions are paid automatically on a referred user's <b>first successful deposit</b> and credited
          straight to the affiliate's trading balance. Each referral can only ever pay once.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['affiliateL1Percent', 'Level 1 %'],
            ['affiliateL2Percent', 'Level 2 %'],
            ['affiliateL3Percent', 'Level 3 %'],
            ['affiliateMinPayout', 'Min payout (KES)'],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label className={labelClass}>{label}</Label>
              <Input type="number" step="0.1" className={inputClass}
                value={settings[key] ?? 0}
                onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save affiliate settings'}</Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">Top affiliates</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Affiliate</th>
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-right px-3 py-2">Clicks</th>
                <th className="text-right px-3 py-2">Signups</th>
                <th className="text-right px-3 py-2">Converted</th>
                <th className="text-right px-3 py-2">Earned</th>
              </tr>
            </thead>
            <tbody>
              {(data?.affiliates || []).map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-3 py-2">{a.email}</td>
                  <td className="px-3 py-2 font-mono">{a.code}</td>
                  <td className="px-3 py-2 text-right">{a.clicks}</td>
                  <td className="px-3 py-2 text-right">{a.signups}</td>
                  <td className="px-3 py-2 text-right">{a.conversions}</td>
                  <td className="px-3 py-2 text-right font-mono text-profit">{Number(a.total_earned).toFixed(2)}</td>
                </tr>
              ))}
              {(data?.affiliates || []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-muted-foreground">No affiliates yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">Recent commissions</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Affiliate</th>
                <th className="text-left px-3 py-2">Referred</th>
                <th className="text-left px-3 py-2">Level</th>
                <th className="text-right px-3 py-2">Deposit</th>
                <th className="text-right px-3 py-2">Paid</th>
              </tr>
            </thead>
            <tbody>
              {(data?.commissions || []).map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{c.affiliate_email}</td>
                  <td className="px-3 py-2">{c.referred_email}</td>
                  <td className="px-3 py-2">L{c.level} · {Number(c.percent)}%</td>
                  <td className="px-3 py-2 text-right font-mono">{Number(c.deposit_amount).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-profit">+{Number(c.amount).toFixed(2)}</td>
                </tr>
              ))}
              {(data?.commissions || []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-muted-foreground">No commissions paid yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
