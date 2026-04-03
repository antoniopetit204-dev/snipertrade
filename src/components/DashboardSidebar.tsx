import { Activity, BarChart3, Bot, LineChart, LogOut, TrendingUp, Wallet, ChevronLeft, ChevronRight, BookOpen, Copy, Shield, Lightbulb, Gift, Wrench, X, Crosshair } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setUser, getSettings, getUser } from '@/lib/store';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { derivWS } from '@/lib/deriv-ws';

const navItems = [
  { label: 'Dashboard', icon: TrendingUp, path: '/dashboard' },
  { label: 'Manual Trader', icon: Crosshair, path: '/dashboard/trader' },
  { label: 'Bot Builder', icon: Wrench, path: '/dashboard/bot-builder' },
  { label: 'Free Bots', icon: Gift, path: '/dashboard/free-bots' },
  { label: 'DBots', icon: Bot, path: '/dashboard/bots' },
  { label: 'Analysis', icon: BarChart3, path: '/dashboard/analysis' },
  { label: 'Strategy', icon: Lightbulb, path: '/dashboard/strategy' },
  { label: 'Charts', icon: LineChart, path: '/dashboard/charts' },
  { label: 'Portfolio', icon: Wallet, path: '/dashboard/portfolio' },
  { label: 'Copy Trading', icon: Copy, path: '/dashboard/copy-trading' },
  { label: 'Risk Mgmt', icon: Shield, path: '/dashboard/risk' },
  { label: 'Tutorial', icon: BookOpen, path: '/dashboard/tutorial' },
];

interface SidebarProps {
  onClose?: () => void;
}

export const DashboardSidebar = ({ onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const settings = getSettings();
  const user = getUser();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    derivWS.disconnect();
    setUser(null);
    navigate('/');
  };

  const handleNav = (path: string) => {
    navigate(path);
    onClose?.();
  };

  return (
    <div className={cn(
      "h-screen bg-card border-r border-border flex flex-col transition-all duration-200",
      collapsed ? "w-16" : "w-56"
    )}>
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && (
          <span className="font-bold text-foreground text-sm truncate flex-1">
            {settings.siteName || 'HFT Pro'}
          </span>
        )}
        {!collapsed && onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {!collapsed && user?.activeAccount && (
        <div className="px-4 py-2 border-b border-border">
          <p className="text-xs text-muted-foreground truncate">{user.activeAccount.acct}</p>
          <p className="text-xs text-primary font-mono">{user.activeAccount.cur?.toUpperCase()}</p>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors hidden lg:flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-loss hover:bg-accent transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};
