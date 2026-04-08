import { Bot, ChartCandlestick, Home, LogOut, Shield, Swords, ArrowDownToLine, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { derivWS } from '@/lib/deriv-ws';
import { setUser } from '@/lib/store';
import { cn } from '@/lib/utils';

const items = [
  { label: 'Home', path: '/dashboard', icon: Home },
  { label: 'Trade', path: '/dashboard/trader', icon: Swords },
  { label: 'Bots', path: '/dashboard/bots', icon: Bot },
  { label: 'Deposit', path: '/dashboard/deposit', icon: ArrowDownToLine },
  { label: 'Portfolio', path: '/dashboard/portfolio', icon: Wallet },
];

export const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    derivWS.disconnect();
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg lg:hidden">
      <div className="grid grid-cols-6 gap-1 rounded-2xl border border-border bg-background/70 p-1.5 shadow-2xl">
        {items.map((item) => {
          const active = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={logout}
          className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-loss transition-colors hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          <span className="truncate">Logout</span>
        </button>
      </div>
    </nav>
  );
};