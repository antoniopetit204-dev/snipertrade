import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { fetchSettings, updateSettings } from '@/lib/db';
import { fetchPartnershipAdmin, decidePartnership } from '@/lib/affiliate';
import type { AdminSettings } from '@/lib/store';

const inputClass = 'bg-background border-border text-foreground text-xs h-9';
const labelClass = 'text-[10px] uppercase tracking-wider text-muted-foreground';

const statusClass = (s: string) =>
  s === 'approved' ? 'text-profit' : s === 'pending' ? 'text-primary' : 'text-loss';

export const AdminAffiliateTab = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [data, setData] = useState<{ affiliates: any[]; commissions: any[]; referrals: any[]; requests?: any[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadData = () => fetchPartnershipAdmin().then(setData).catch(() => {});

  useEffect(() => {
    fetchSettings().then(setSettings);
    loadData();
  }, []);

  const save = async () => {
    setSaving(true);
    const ok = await updateSettings(settings as AdminSettings);
    setSaving(false);
    toast({ title: ok ? 'Partnership settings saved ✓' : 'Save failed', variant: ok ? undefined : 'destructive' });
  };

  const decide = async (email: string, approve: boolean) => {
    setBusy(email);
    try {
      await decidePartnership(email, approve, approve ? '' : 'Did not meet the requirements');
      toast({ title: approve ? 'Partner approved ✓' : 'Application declined' });
      await loadData();
    } catch (e) {
      toast({ title: 'Could not update', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  if (!settings) return <p className="text-xs text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Partnership Program</h3>
          <Switch checked={!!settings.affiliateEnabled}
            onCheckedChange={v => setSettings({ ...settings, affiliateEnabled: v })} />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Commissions are paid automatically on a referred user's <b>first successful deposit</b> and credited
          straight to the partner's trading balance. Each referral can only ever pay once.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['affiliateL1Percent', 'Level 1 %'],
            ['affiliateL2Percent', 'Level 2 %'],
            ['affiliateL3Percent', 'Level 3 %'],
            ['affiliateMinPayout', 'Min payout (KES)'],
            ['partnerMinDeposit', 'Partner min deposit (KES)'],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label className={labelClass}>{label}</Label>
              <Input type="number" step="0.1" className={inputClass}
                value={settings[key] ?? 0}
                onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })} />
            </div>
          ))}
          <div className="space-y-2">
            <Label className={labelClass}>Require admin approval</Label>
            <div className="h-9 flex items-center">
              <Switch checked={settings.partnerRequireApproval !== false}
                onCheckedChange={v => setSettings({ ...settings, partnerRequireApproval: v })} />
            </div>
          </div>
        </div>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save partnership settings'}</Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Account-to-account transfers</h3>
          <Switch checked={settings.transferEnabled !== false}
            onCheckedChange={v => setSettings({ ...settings, transferEnabled: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([['transferMin', 'Minimum transfer (KES)'], ['transferFeePercent', 'Transfer fee %']] as const).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label className={labelClass}>{label}</Label>
              <Input type="number" step="0.1" className={inputClass}
                value={settings[key] ?? 0}
                onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save transfer settings'}</Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">Partnership applications</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Account</th>
                <th className="text-right px-3 py-2">Deposited</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Requested</th>
                <th className="text-right px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data?.requests || []).map((r: any) => (
                <tr key={r.email} className="border-t border-border">
                  <td className="px-3 py-2">{r.name || r.email}<div className="text-muted-foreground">{r.email}</div></td>
                  <td className="px-3 py-2 font-mono">{r.account_number || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">{Number(r.total_deposited || 0).toFixed(2)}</td>
                  <td className={`px-3 py-2 capitalize ${statusClass(r.partner_status)}`}>{r.partner_status}</td>
                  <td className="px-3 py-2">{r.partner_requested_at ? new Date(r.partner_requested_at).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2 text-right space-x-1">
                    {r.partner_status !== 'approved' && (
                      <Button size="sm" className="h-7 text-[11px]" disabled={busy === r.email}
                        onClick={() => decide(r.email, true)}>Approve</Button>
                    )}
                    {r.partner_status !== 'rejected' && (
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy === r.email}
                        onClick={() => decide(r.email, false)}>Decline</Button>
                    )}
                  </td>
                </tr>
              ))}
              {(data?.requests || []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-muted-foreground">No applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">Top partners</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Partner</th>
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
                <tr><td colSpan={6} className="px-3 py-4 text-muted-foreground">No partners yet.</td></tr>
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
                <th className="text-left px-3 py-2">Partner</th>
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
