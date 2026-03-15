import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ADMIN_ACCOUNT, setUser, getSettings } from '@/lib/store';
import { Activity, Lock } from 'lucide-react';
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
      if (email === ADMIN_ACCOUNT.email && password === ADMIN_ACCOUNT.password) {
        setUser({ email: ADMIN_ACCOUNT.email, role: 'admin' });
        toast({ title: 'Welcome back, Admin!' });
        navigate('/adminking');
      } else {
        toast({ title: 'Login failed', description: 'Invalid credentials', variant: 'destructive' });
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background geometric-bg p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg p-6 sm:p-8 glow-primary">
          <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
            <Activity className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{settings.siteName || 'HFT Pro'}</h1>
          </div>
          <p className="text-center text-muted-foreground text-xs sm:text-sm mb-5 sm:mb-6">Administration Access</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin email"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm" required />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Secured admin access</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
