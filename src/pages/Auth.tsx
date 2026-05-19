import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Mail, Lock, User as UserIcon, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import { getDerivOAuthUrl } from '@/lib/store';
import { signupEmail, loginEmail } from '@/lib/auth-email';

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [signup, setSignup] = useState({ name: '', email: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginEmail(login.email, login.password);
      toast({ title: 'Welcome back!' });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Login failed', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signupEmail(signup.email, signup.password, signup.name);
      toast({ title: 'Account created!', description: 'Welcome to ' + (settings.siteName || 'HFT Pro') });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Signup failed', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleDeriv = () => {
    const url = getDerivOAuthUrl(settings.appId);
    if (url) window.location.href = url;
    else toast({ title: 'Deriv not configured', variant: 'destructive' });
  };

  return (
    <div className="min-h-screen bg-background geometric-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <Activity className="h-10 w-10 text-primary mb-2" />
            <h1 className="text-xl sm:text-2xl font-bold">{settings.siteName || 'HFT Pro'}</h1>
            <p className="text-xs text-muted-foreground">Sign in to your trading account</p>
          </div>

          <Button onClick={handleDeriv} variant="outline" className="w-full mb-4 border-primary/50 hover:bg-primary/10">
            <Zap className="h-4 w-4 mr-2 text-primary" /> Continue with Deriv
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or with email</span></div>
          </div>

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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-[10px] text-muted-foreground mt-6">
            <Link to="/" className="hover:text-primary">← Back to home</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
