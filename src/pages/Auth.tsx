import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Mail, Lock, User as UserIcon, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import { signupEmail, loginEmail, verifyEmail, verifyOtp, resendVerification } from '@/lib/auth-email';

type Stage = 'form' | 'otp';

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [search] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>('form');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [login, setLogin] = useState({ email: '', password: '' });
  const [signup, setSignup] = useState({ name: '', email: '', password: '' });
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle');

  // Magic-link verification (if user clicked link in email)
  useEffect(() => {
    const token = search.get('verify');
    if (!token) return;
    setVerifyState('checking');
    verifyEmail(token)
      .then((d) => {
        setVerifyState('ok');
        if (d.user) {
          toast({ title: 'Email verified ✓', description: 'Signing you in...' });
          setTimeout(() => navigate('/dashboard'), 600);
        }
      })
      .catch((e) => {
        setVerifyState('fail');
        toast({ title: 'Verification failed', description: e.message, variant: 'destructive' });
      });
  }, [search]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginEmail(login.email, login.password);
      toast({ title: 'Welcome back!' });
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      if (/verif/i.test(msg)) {
        setPendingEmail(login.email);
        setStage('otp');
        toast({ title: 'Verify your email', description: 'We sent a 6-digit code to your inbox.' });
      } else {
        toast({ title: 'Login failed', description: msg, variant: 'destructive' });
      }
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signupEmail(signup.email, signup.password, signup.name);
      setPendingEmail(res.email);
      setStage('otp');
      if (res.sendError) {
        toast({ title: 'Account created', description: 'Email send issue: ' + res.sendError, variant: 'destructive' });
      } else {
        toast({ title: 'Check your email', description: 'Enter the 6-digit code we just sent.' });
      }
    } catch (err: any) {
      toast({ title: 'Signup failed', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await verifyOtp(pendingEmail, otp);
      if (res.user) {
        toast({ title: 'Verified ✓', description: 'Welcome aboard!' });
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
      setOtp('');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    try {
      await resendVerification(pendingEmail);
      toast({ title: 'Code resent', description: 'Check your inbox & spam folder.' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background geometric-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <Activity className="h-10 w-10 text-primary mb-2" />
            <h1 className="text-xl sm:text-2xl font-bold">{settings.siteName || 'HFT Pro'}</h1>
            <p className="text-xs text-muted-foreground">
              {stage === 'otp' ? 'Verify your email to continue' : 'Sign in to your trading account'}
            </p>
          </div>

          {verifyState === 'ok' && stage === 'form' && (
            <div className="mb-4 p-3 rounded-md bg-profit/10 border border-profit/30 text-profit text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Email verified — sign in below.
            </div>
          )}

          {stage === 'otp' ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Enter 6-digit code</p>
                <p className="text-xs text-muted-foreground text-center">
                  Sent to <b>{pendingEmail}</b>. Expires in 15 min.
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={(v) => {
                  setOtp(v);
                  if (v.length === 6) setTimeout(() => handleVerifyOtp(), 100);
                }}>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Button>

              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={() => { setStage('form'); setOtp(''); }} className="text-muted-foreground hover:text-foreground">
                  ← Back
                </button>
                <button type="button" onClick={handleResend} className="text-primary hover:underline">
                  Resend code
                </button>
              </div>
            </form>
          ) : (
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="email" required value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} className="pl-9" placeholder="you@example.com" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="password" required value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} className="pl-9" placeholder="••••••••" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : <>Sign In <ArrowRight className="h-4 w-4 ml-1" /></>}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Full name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input required value={signup.name} onChange={e => setSignup({ ...signup, name: e.target.value })} className="pl-9" placeholder="Jane Trader" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="email" required value={signup.email} onChange={e => setSignup({ ...signup, email: e.target.value })} className="pl-9" placeholder="you@example.com" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Password (min 6 chars)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="password" required minLength={6} value={signup.password} onChange={e => setSignup({ ...signup, password: e.target.value })} className="pl-9" placeholder="••••••••" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">A 6-digit verification code will be emailed to you.</p>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          <p className="text-center text-[10px] text-muted-foreground mt-6">
            <Link to="/" className="hover:text-primary">← Back to home</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
