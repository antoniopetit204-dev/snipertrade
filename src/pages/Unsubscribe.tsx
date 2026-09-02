import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const OPTIONS = [
  { k: 'notify_login', label: 'Login alerts' },
  { k: 'notify_trades', label: 'Trade results' },
  { k: 'notify_deposits', label: 'Deposit confirmations' },
  { k: 'notify_withdrawals', label: 'Withdrawal updates' },
  { k: 'marketing', label: 'Product news & tips' },
] as const;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const email = params.get('e') || '';
  const token = params.get('t') || '';

  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'done'>('loading');
  const [prefs, setPrefs] = useState<any>({});
  const [busy, setBusy] = useState(false);

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke(`auth-email?action=${action}`, {
      body: { email, token, origin: window.location.origin, ...extra },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  useEffect(() => {
    if (!email || !token) { setState('invalid'); return; }
    call('unsub-status')
      .then(d => { setPrefs(d.prefs || {}); setState('ready'); })
      .catch(() => setState('invalid'));
  }, [email, token]);

  const unsubscribeAll = async () => {
    setBusy(true);
    try { await call('unsubscribe'); setState('done'); } catch { setState('invalid'); }
    setBusy(false);
  };

  const savePrefs = async () => {
    setBusy(true);
    try { await call('unsub-prefs', { prefs }); setState('done'); } catch { setState('invalid'); }
    setBusy(false);
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 space-y-5">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" /> Email preferences
        </h1>

        {state === 'loading' && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your link...
          </p>
        )}

        {state === 'invalid' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" /> This unsubscribe link is invalid or has expired.
            </p>
            <Link to="/dashboard/settings"><Button variant="outline" className="w-full">Manage in your account</Button></Link>
          </div>
        )}

        {state === 'done' && (
          <div className="space-y-3">
            <p className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" /> Your preferences were updated for {email}.
            </p>
            <p className="text-xs text-muted-foreground">
              Security emails (verification codes and password resets) are still delivered so you can keep accessing your account.
            </p>
            <Link to="/"><Button variant="outline" className="w-full">Back to site</Button></Link>
          </div>
        )}

        {state === 'ready' && (
          <>
            <p className="text-xs text-muted-foreground">Choose what {email} should receive.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <Label className="text-sm">All email notifications</Label>
                <Switch checked={prefs.enabled !== false} onCheckedChange={v => setPrefs({ ...prefs, enabled: v })} />
              </div>
              {OPTIONS.map(o => (
                <div key={o.k} className="flex items-center justify-between">
                  <Label className="text-sm font-normal">{o.label}</Label>
                  <Switch
                    disabled={prefs.enabled === false}
                    checked={!!prefs[o.k]}
                    onCheckedChange={v => setPrefs({ ...prefs, [o.k]: v })}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={savePrefs} disabled={busy} className="flex-1">Save preferences</Button>
              <Button onClick={unsubscribeAll} disabled={busy} variant="outline">Unsubscribe from all</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
