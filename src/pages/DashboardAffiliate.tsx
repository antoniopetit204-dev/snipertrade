import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { fetchAffiliateStats, buildAffiliateLink } from '@/lib/affiliate';
import { Users, Copy, MousePointerClick, UserPlus, CheckCircle2, Coins, Share2, Link2 } from 'lucide-react';

interface Stats {
  code: string;
  rates: { enabled: boolean; l1: number; l2: number; l3: number; min_payout: number };
  summary: { clicks: number; signups: number; conversions: number; total_earned: number; pending: number };
  referrals: any[];
  commissions: any[];
}

const DashboardAffiliate = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAffiliateStats()
      .then(setStats)
      .catch((e) => toast({ title: 'Could not load affiliate data', description: e.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const link = stats ? buildAffiliateLink(stats.code) : '';

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: 'Copy failed', description: text, variant: 'destructive' });
    }
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Join me and start trading', url: link }); } catch { /* dismissed */ }
    } else copy(link, 'Link');
  };

  return (
    <DashboardLayout title="Affiliate Program" icon={<Users className="h-5 w-5 text-primary" />}
      subtitle="Earn commission on every trader you bring in">
      <div className="space-y-4 max-w-5xl mx-auto">
        {loading && <p className="text-sm text-muted-foreground">Loading your affiliate dashboard…</p>}

        {stats && (
          <>
            {!stats.rates.enabled && (
              <div className="p-3 rounded-lg bg-loss/10 border border-loss/30 text-loss text-sm">
                The affiliate program is currently paused by the admin. Your link stays valid.
              </div>
            )}

            {/* Link + code */}
            <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" /> Your referral link
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                <div className="flex gap-2">
                  <Button onClick={() => copy(link, 'Link')} className="flex-1 sm:flex-none">
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </Button>
                  <Button variant="secondary" onClick={share} className="flex-1 sm:flex-none">
                    <Share2 className="h-4 w-4 mr-1" /> Share
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Backup code (works if the link breaks):</span>
                <button onClick={() => copy(stats.code, 'Code')}
                  className="font-mono font-bold tracking-widest px-2 py-1 rounded bg-background border border-border hover:border-primary">
                  {stats.code}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Commission is paid on your referral's <b>first successful deposit</b>:
                Level 1 {stats.rates.l1}% · Level 2 {stats.rates.l2}% · Level 3 {stats.rates.l3}%.
                Earnings land straight in your trading balance.
              </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {[
                { icon: MousePointerClick, label: 'Link clicks', value: stats.summary.clicks },
                { icon: UserPlus, label: 'Signups', value: stats.summary.signups },
                { icon: CheckCircle2, label: 'Converted', value: stats.summary.conversions },
                { icon: Coins, label: 'Earned (KES)', value: stats.summary.total_earned.toFixed(2) },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold font-mono text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Referrals */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border text-sm font-semibold">Your referrals</div>
              {stats.referrals.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No referrals yet. Share your link — you get credited the moment they sign up, and paid on their first deposit.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2">User</th>
                        <th className="text-left px-3 py-2">Level</th>
                        <th className="text-left px-3 py-2">Status</th>
                        <th className="text-right px-3 py-2">1st deposit</th>
                        <th className="text-right px-3 py-2">Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.referrals.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="px-3 py-2 font-mono">{r.referred}</td>
                          <td className="px-3 py-2">L{r.level}</td>
                          <td className="px-3 py-2">
                            <span className={r.status === 'converted' ? 'text-profit' : 'text-muted-foreground'}>
                              {r.status === 'converted' ? 'Converted' : 'Awaiting deposit'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{r.first_deposit_amount.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-mono text-profit">{r.commission_paid.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Commissions */}
            {stats.commissions.length > 0 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border text-sm font-semibold">Commission history</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2">Date</th>
                        <th className="text-left px-3 py-2">From</th>
                        <th className="text-left px-3 py-2">Level</th>
                        <th className="text-right px-3 py-2">Deposit</th>
                        <th className="text-right px-3 py-2">Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.commissions.map((c) => (
                        <tr key={c.id} className="border-t border-border">
                          <td className="px-3 py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="px-3 py-2 font-mono">{c.referred}</td>
                          <td className="px-3 py-2">L{c.level} · {c.percent}%</td>
                          <td className="px-3 py-2 text-right font-mono">{c.deposit_amount.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-mono text-profit">+{c.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardAffiliate;
