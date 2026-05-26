import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUser, setUser as persistUser } from '@/lib/store';
import { refreshSession, getRefreshToken, verifyOtp, resendVerification } from '@/lib/auth-email';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, MailCheck, LogOut } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requireVerified?: boolean;
}

export const AuthGuard = ({ children, requireVerified = true }: Props) => {
  const location = useLocation();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [user, setUserState] = useState(getUser());

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user && getRefreshToken()) {
        const u = await refreshSession();
        if (!cancelled) setUserState(u);
      }
      if (!cancelled) setChecking(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  // ─── Inline OTP verification gate ───
  if (requireVerified && user.role !== 'admin' && user.verified === false) {
    const handleVerify = async () => {
      if (code.length < 4) return;
      setVerifying(true);
      try {
        const res = await verifyOtp(user.email, code.trim());
        if (res?.user) {
          const updated = { ...user, verified: true };
          persistUser(updated as any);
          setUserState(updated as any);
          toast({ title: 'Email verified ✓', description: 'Welcome aboard.' });
        }
      } catch (e: any) {
        toast({ title: 'Invalid code', description: e.message || 'Try again', variant: 'destructive' });
      } finally {
        setVerifying(false);
      }
    };

    const handleResend = async () => {
      if (cooldown > 0) return;
      setResending(true);
      try {
        await resendVerification(user.email);
        toast({ title: 'Code resent', description: `Sent to ${user.email}` });
        setCooldown(60);
      } catch (e: any) {
        toast({ title: 'Resend failed', description: e.message, variant: 'destructive' });
      } finally {
        setResending(false);
      }
    };

    const handleLogout = () => {
      localStorage.removeItem('hft_user');
      localStorage.removeItem('hft_refresh_token');
      window.location.href = '/auth';
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Verify your email</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              We sent a 6-digit code to <span className="font-mono text-foreground">{user.email}</span>.
              Enter it below to unlock your dashboard.
            </p>
          </div>

          <div className="space-y-3">
            <Input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
              className="text-center text-2xl font-mono tracking-[0.5em] h-14 bg-secondary border-border"
            />
            <Button onClick={handleVerify} disabled={verifying || code.length < 4}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
              {verifying ? 'Verifying…' : 'Verify & Continue'}
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="flex items-center gap-1.5 text-primary hover:underline disabled:opacity-50 disabled:no-underline">
              <MailCheck className="h-3.5 w-3.5" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend code'}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            Didn't get it? Check spam, or use Resend above. Code expires in 15 minutes.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
