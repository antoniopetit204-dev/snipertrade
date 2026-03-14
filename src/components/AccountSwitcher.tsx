import { useState, useRef, useEffect } from 'react';
import { getUser, setUser, type DerivAccount } from '@/lib/store';
import { derivWS } from '@/lib/deriv-ws';
import { ChevronDown, Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountSwitcherProps {
  onSwitch?: () => void;
}

export const AccountSwitcher = ({ onSwitch }: AccountSwitcherProps) => {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = getUser();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user?.derivAccounts || user.derivAccounts.length <= 1) {
    return user?.activeAccount ? (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md">
        <span className="text-xs font-mono text-foreground">{user.activeAccount.acct}</span>
        <span className="text-xs font-semibold text-primary">{user.activeAccount.cur}</span>
      </div>
    ) : null;
  }

  const switchAccount = async (account: DerivAccount) => {
    if (account.acct === user.activeAccount?.acct) { setOpen(false); return; }
    
    setSwitching(true);
    try {
      const updatedUser = { ...user, activeAccount: account };
      setUser(updatedUser);
      
      // Re-authorize with new token
      if (derivWS.isConnected) {
        await derivWS.authorize(account.token);
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
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-accent rounded-md transition-colors"
      >
        {switching ? (
          <RefreshCw className="h-3 w-3 text-primary animate-spin" />
        ) : (
          <>
            <span className="text-xs font-mono text-foreground">{user.activeAccount?.acct}</span>
            <span className="text-xs font-semibold text-primary">{user.activeAccount?.cur}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Switch Account</p>
          </div>
          <div className="py-1">
            {user.derivAccounts.map((acc) => (
              <button
                key={acc.acct}
                onClick={() => switchAccount(acc)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent transition-colors",
                  acc.acct === user.activeAccount?.acct ? "bg-primary/5" : ""
                )}
              >
                <div className="flex flex-col items-start">
                  <span className="font-mono text-foreground text-xs">{acc.acct}</span>
                  <span className="text-xs text-muted-foreground">{acc.cur}</span>
                </div>
                {acc.acct === user.activeAccount?.acct && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
