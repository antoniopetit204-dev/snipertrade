import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSettings, getUser, getDerivOAuthUrl, parseDerivCallback, setUser, hasDerivCallbackParams } from '@/lib/store';
import { upsertSession } from '@/lib/db';
import { useSettings } from '@/hooks/useSettings';
import { Activity, TrendingUp, Bot, BarChart3, Shield, Zap, ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HFTLoader = () => (
  <div className="relative w-20 h-20 sm:w-24 sm:h-24">
    <motion.div className="absolute inset-0 rounded-full border-2 border-primary/30" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
    <motion.div className="absolute inset-2 rounded-full border border-primary/50" animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
    <motion.div className="absolute inset-4 rounded-full border-2 border-dashed border-primary/60" animate={{ rotate: -360 }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }} />
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div className="flex items-end gap-[3px]" animate={{ y: [0, -2, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
        {[28, 20, 32, 16, 26, 22, 30].map((h, i) => (
          <motion.div key={i} className="w-[3px] rounded-full bg-primary" initial={{ height: 4 }} animate={{ height: h }} transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity, repeatType: 'reverse' }} />
        ))}
      </motion.div>
    </div>
  </div>
);

const features = [
  { icon: Zap, title: 'High Frequency Trading', desc: 'Execute thousands of trades per second with our advanced algorithms' },
  { icon: Bot, title: 'Automated Bots', desc: 'Deploy pre-built or custom trading bots on Deriv markets' },
  { icon: BarChart3, title: 'Advanced Analysis', desc: 'Real-time technical indicators and AI-powered signals' },
  { icon: Shield, title: 'Risk Management', desc: 'Protect your capital with advanced risk controls' },
  { icon: TrendingUp, title: 'Copy Trading', desc: 'Follow and copy successful traders automatically' },
  { icon: Activity, title: 'Live Charts', desc: 'TradingView-style candlestick charts with drawing tools' },
];

const Landing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, loading: settingsLoading } = useSettings();
  const user = getUser();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Handle Deriv OAuth callback params on root URL
  useEffect(() => {
    if (hasDerivCallbackParams(location.search)) {
      setProcessing(true);
      const accounts = parseDerivCallback(location.search);
      if (accounts.length > 0) {
        const newUser = {
          email: accounts[0].acct,
          role: 'user' as const,
          derivAccounts: accounts,
          activeAccount: accounts[0],
        };
        setUser(newUser);
        
        // Save sessions to DB
        Promise.all(accounts.map(acc => upsertSession(acc))).catch(console.error);
        
        // Clean URL and redirect to dashboard
        window.history.replaceState({}, '', '/');
        navigate('/dashboard');
        return;
      }
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && !processing && user?.derivAccounts?.length) {
      navigate('/dashboard');
    }
  }, [loading, processing, user, navigate]);

  const handleLogin = () => {
    const url = getDerivOAuthUrl(settings.appId);
    if (url) {
      window.location.href = url;
    } else {
      alert('Trading is not yet configured. Please contact the administrator.');
    }
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <HFTLoader />
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground mt-6">
            Authenticating with Deriv...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {loading && (
          <motion.div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6" exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <HFTLoader />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-center px-4">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{settings.siteName || 'HFT Pro'}</h1>
              <motion.p className="text-sm text-muted-foreground mt-2" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                Initializing trading systems...
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {settings.announcementBar && (
            <div className="bg-primary/10 border-b border-primary/20 text-center py-2 px-4">
              <p className="text-xs text-primary font-medium">{settings.announcementBar}</p>
            </div>
          )}

          {/* Header */}
          <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <Activity className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                <span className="font-bold text-base sm:text-lg text-foreground">{settings.siteName || 'HFT Pro'}</span>
              </div>
              <Button size="sm" onClick={handleLogin} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm">
                Start Trading <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
              </Button>
            </div>
          </header>

          {/* Hero */}
          <section className="relative overflow-hidden">
            <div className="geometric-bg absolute inset-0 opacity-50" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-24 relative z-10">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 sm:px-4 py-1.5 mb-4 sm:mb-6">
                  <span className="h-2 w-2 rounded-full bg-profit animate-pulse" />
                  <span className="text-xs text-primary font-medium">Live Trading Active</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
                  Trade Smarter with <br />
                  <span className="text-primary">High Frequency</span> Algorithms
                </h1>
                <p className="text-sm sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
                  {settings.metaDescription || 'Deploy automated trading bots on Deriv markets. Advanced analysis tools, real-time charts, and professional risk management.'}
                </p>
                <Button size="lg" onClick={handleLogin} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm sm:text-base px-6 sm:px-8">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> Login with Deriv
                </Button>
              </motion.div>
            </div>
            <div className="flex justify-center pb-6 sm:pb-8">
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
              </motion.div>
            </div>
          </section>

          {/* Features */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
            <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xl sm:text-2xl font-bold text-foreground text-center mb-8 sm:mb-12">
              Everything You Need to Trade
            </motion.h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {features.map((f, i) => (
                <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-lg p-4 sm:p-6 hover:border-primary/30 transition-colors group">
                  <f.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1 sm:mb-2">{f.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="border-t border-border bg-card/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">Ready to Start Trading?</h2>
              <p className="text-sm text-muted-foreground mb-6 sm:mb-8">Connect your Deriv account and start deploying bots in minutes.</p>
              <Button size="lg" onClick={handleLogin} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                Get Started Now <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
              </Button>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-border py-6 sm:py-8 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <p className="text-xs text-muted-foreground text-center">{settings.footerText || '© 2026 HFT Pro. All rights reserved.'}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {settings.contactEmail && <span>{settings.contactEmail}</span>}
                {settings.telegramLink && <a href={settings.telegramLink} className="hover:text-primary transition-colors">Telegram</a>}
              </div>
            </div>
          </footer>
        </motion.div>
      )}
    </div>
  );
};

export default Landing;
