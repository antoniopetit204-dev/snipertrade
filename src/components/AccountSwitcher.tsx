import { useState, useRef, useEffect } from 'react';
import { getUser, setUser, type DerivAccount } from '@/lib/store';
import { derivWS } from '@/lib/deriv-ws';
import { ChevronDown, Check, RefreshCw, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountSwitcherProps {
  onSwitch?: () => void;
}

export const AccountSwitcher = ({ onSwitch }: AccountSwitcherProps) => {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [balances, setBalances] = useState<Record<string, { balance: number; currency: string }>>({});
  const ref = useRef<HTMLDivElement>(null);
  const user = getUser();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch balance for active account on mount and from balance subscription
  useEffect(() => {
    const unsub = derivWS.subscribe('balance', (data) => {
      if (data.balance && user?.activeAccount) {
        setBalances(prev => ({
          ...prev,
          [user.activeAccount!.acct]: {
            balance: data.balance.balance,
            currency: data.balance.currency || user.activeAccount!.cur,
          }
        }));
      }
    });
    return () => { unsub(); };
  }, [user?.activeAccount?.acct]);

  // Fetch balances for all accounts when dropdown opens
  const fetchAccountBalances = async () => {
    if (!user?.derivAccounts) return;
    // Current account balance is already tracked via subscription
    // For other accounts we'd need to authorize each - just show what we have
  };

  const getAccountType = (acct: string): 'Demo' | 'Real' => {
    // Deriv demo accounts typically start with VRTC or have 'demo' pattern
    if (acct.startsWith('VRTC') || acct.startsWith('VR')) return 'Demo';
    return 'Real';
  };

  const getAccountTypeColor = (acct: string) => {
    return getAccountType(acct) === 'Demo' 
      ? 'bg-chart-4/20 text-chart-4' 
      : 'bg-profit/20 text-profit';
  };

  if (!user?.activeAccount) return null;

  const activeBalance = balances[user.activeAccount.acct];
  const activeType = getAccountType(user.activeAccount.acct);

  const switchAccount = async (account: DerivAccount) => {
    if (account.acct === user.activeAccount?.acct) { setOpen(false); return; }
    
    setSwitching(true);
    try {
      const updatedUser = { ...user, activeAccount: account };
      setUser(updatedUser);
      
      if (derivWS.isConnected) {
        const authResp = await derivWS.authorize(account.token);
        if (authResp.authorize) {
          setBalances(prev => ({
            ...prev,
            [account.acct]: {
              balance: authResp.authorize.balance,
              currency: authResp.authorize.currency || account.cur,
            }
          }));
        }
      }
      
      onSwitch?.();
      setOpen(false);
    } catch (err) {
      console.error('Failed to switch account:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) fetchAccountBalances(); }}
        className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-secondary hover:bg-accent rounded-md transition-colors"
      >
        {switching ? (
          <RefreshCw className="h-3 w-3 text-primary animate-spin" />
        ) : (
          <>
            <Wallet className="h-3 w-3 text-primary hidden sm:block" />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${getAccountTypeColor(user.activeAccount.acct)}`}>
                  {activeType}
                </span>
                <span className="text-xs font-mono text-foreground">{user.activeAccount.cur}</span>
              </div>
              {activeBalance && (
                <p className="text-[10px] font-mono font-bold text-primary">
                  {activeBalance.balance.toFixed(2)}
                </p>
              )}
            </div>
            {(user.derivAccounts?.length || 0) > 1 && (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </>
        )}
      </button>

      {open && user.derivAccounts && user.derivAccounts.length > 1 && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Switch Account</p>
          </div>
          <div className="py-1">
            {user.derivAccounts.map((acc) => {
              const accType = getAccountType(acc.acct);
              const accBalance = balances[acc.acct];
              const isActive = acc.acct === user.activeAccount?.acct;
              
              return (
                <button
                  key={acc.acct}
                  onClick={() => switchAccount(acc)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent transition-colors",
                    isActive ? "bg-primary/5" : ""
                  )}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${getAccountTypeColor(acc.acct)}`}>
                        {accType}
                      </span>
                      <span className="font-mono text-foreground text-xs">{acc.acct}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{acc.cur}</span>
                      {accBalance && (
                        <span className="text-xs font-mono font-bold text-primary">
                          {accBalance.balance.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
