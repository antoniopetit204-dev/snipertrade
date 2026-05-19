import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { requestPasswordReset } from '@/lib/auth-email';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-profit mx-auto" />
              <h1 className="text-xl font-bold">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, we've sent password reset instructions. The link expires in 1 hour.
              </p>
              <Link to="/auth" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-1">Forgot password?</h1>
              <p className="text-sm text-muted-foreground mb-5">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="pl-9" placeholder="you@example.com" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
              <Link to="/auth" className="text-xs text-muted-foreground hover:text-primary mt-4 inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
