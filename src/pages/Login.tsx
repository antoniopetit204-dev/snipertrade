import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DEMO_ACCOUNTS, setUser, getSettings } from '@/lib/store';
import { Activity, Shield, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const settings = getSettings();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const account = DEMO_ACCOUNTS.find(
        (a) => a.email === email && a.password === password
      );

      if (account) {
        setUser({ email: account.email, role: account.role });
        toast({ title: 'Welcome back!', description: `Logged in as ${account.role}` });
        navigate(account.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        toast({ title: 'Login failed', description: 'Invalid credentials', variant: 'destructive' });
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background geometric-bg p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-lg p-8 glow-primary">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {settings.siteName || 'HFT Pro'}
            </h1>
          </div>

          <p className="text-center text-muted-foreground text-sm mb-6">
            High Frequency Trading Platform
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-xs uppercase tracking-wider">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-xs uppercase tracking-wider">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Demo Accounts
            </p>
            <div className="space-y-1 text-xs font-mono">
              <p className="text-foreground">Admin: admin@hftpro.com / admin123</p>
              <p className="text-foreground">User: user@hftpro.com / user123</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Secured with end-to-end encryption</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
