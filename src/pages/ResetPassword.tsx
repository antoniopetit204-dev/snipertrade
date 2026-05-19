import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { verifyResetToken, resetPassword } from '@/lib/auth-email';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setValid(false); return; }
    verifyResetToken(token).then(r => setValid(r.valid)).catch(() => setValid(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return; }
    if (password.length < 6) { toast({ title: 'Password too short', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/auth'), 2000);
    } catch (err: any) {
      toast({ title: 'Reset failed', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
          {valid === null && <p className="text-center text-muted-foreground">Verifying...</p>}
          {valid === false && (
            <div className="text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-loss mx-auto" />
              <h1 className="text-xl font-bold">Invalid or expired link</h1>
              <p className="text-sm text-muted-foreground">Request a new password reset to continue.</p>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">Request new link</Link>
            </div>
          )}
          {valid && done && (
            <div className="text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-profit mx-auto" />
              <h1 className="text-xl font-bold">Password updated!</h1>
              <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>
            </div>
          )}
          {valid && !done && (
            <>
              <h1 className="text-xl font-bold mb-1">Set a new password</h1>
              <p className="text-sm text-muted-foreground mb-5">Choose something secure.</p>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
