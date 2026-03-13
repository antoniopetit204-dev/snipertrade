import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { parseDerivCallback, setUser, type DerivAccount } from '@/lib/store';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const DerivCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('Authenticating with Deriv...');

  useEffect(() => {
    const accounts = parseDerivCallback(location.search);
    
    if (accounts.length > 0) {
      setStatus('Accounts found, setting up session...');
      
      // Store user with Deriv accounts
      const user = {
        email: accounts[0].acct,
        role: 'user' as const,
        derivAccounts: accounts,
        activeAccount: accounts[0],
      };
      setUser(user);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } else {
      setStatus('No accounts found. Redirecting...');
      setTimeout(() => navigate('/'), 2000);
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="mx-auto mb-6"
        >
          <Activity className="h-12 w-12 text-primary" />
        </motion.div>
        <h2 className="text-lg font-semibold text-foreground mb-2">{status}</h2>
        <p className="text-sm text-muted-foreground">Please wait...</p>
      </motion.div>
    </div>
  );
};

export default DerivCallback;
