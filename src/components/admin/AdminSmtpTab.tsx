import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mail, Send } from 'lucide-react';
import { fetchSmtp, updateSmtp, sendTestEmail } from '@/lib/auth-email';
import { useToast } from '@/hooks/use-toast';

const DEFAULT = { host: '', port: 587, secure: false, username: '', password: '', from_email: '', from_name: '', enabled: false };

export default function AdminSmtpTab() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<any>(DEFAULT);
  const [testTo, setTestTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { fetchSmtp().then(d => { if (d) setCfg(d); }); }, []);

  const save = async () => {
    setSaving(true);
    await updateSmtp(cfg);
    toast({ title: 'SMTP config saved' });
    setSaving(false);
  };

  const test = async () => {
    if (!testTo) return toast({ title: 'Enter recipient', variant: 'destructive' });
    setTesting(true);
    try {
      const r = await sendTestEmail(testTo);
      toast({ title: r.ok ? 'Test sent ✓' : 'Test failed', description: r.error || '', variant: r.ok ? 'default' : 'destructive' });
    } catch (e: any) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
    setTesting(false);
  };

  const inputClass = "bg-secondary border-border text-xs sm:text-sm";

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4">
      <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" /> SMTP Configuration
      </h2>
      <p className="text-[10px] sm:text-xs text-muted-foreground">
        Configure SMTP server (Gmail, SendGrid, Mailgun, Amazon SES, custom). TLS/SSL handled automatically via Nodemailer.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-xs">SMTP Host</Label>
          <Input value={cfg.host} onChange={e => setCfg({ ...cfg, host: e.target.value })} placeholder="smtp.gmail.com" className={inputClass} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Port</Label>
          <Input type="number" value={cfg.port} onChange={e => setCfg({ ...cfg, port: Number(e.target.value) })} className={inputClass} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Username</Label>
          <Input value={cfg.username} onChange={e => setCfg({ ...cfg, username: e.target.value })} placeholder="user@gmail.com" className={inputClass} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Password / App Password</Label>
          <Input type="password" value={cfg.password} onChange={e => setCfg({ ...cfg, password: e.target.value })} className={inputClass} /></div>
        <div className="space-y-1.5"><Label className="text-xs">From Email</Label>
          <Input type="email" value={cfg.from_email} onChange={e => setCfg({ ...cfg, from_email: e.target.value })} placeholder="noreply@yourdomain.com" className={inputClass} /></div>
        <div className="space-y-1.5"><Label className="text-xs">From Name</Label>
          <Input value={cfg.from_name} onChange={e => setCfg({ ...cfg, from_name: e.target.value })} placeholder="HFT Pro" className={inputClass} /></div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={cfg.secure} onCheckedChange={v => setCfg({ ...cfg, secure: v })} />
          <Label className="text-xs">Use SSL (port 465). Off for STARTTLS (587).</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={cfg.enabled} onCheckedChange={v => setCfg({ ...cfg, enabled: v })} />
          <Label className="text-xs font-semibold">Enable email sending</Label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save SMTP'}</Button>
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <Label className="text-xs">Send test email</Label>
        <div className="flex gap-2">
          <Input type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="test@example.com" className={inputClass} />
          <Button variant="outline" onClick={test} disabled={testing}>
            <Send className="h-3 w-3 mr-1" /> {testing ? 'Sending...' : 'Test'}
          </Button>
        </div>
      </div>
    </div>
  );
}
