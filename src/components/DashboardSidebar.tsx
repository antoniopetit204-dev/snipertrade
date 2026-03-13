import { Activity, BarChart3, Bot, LineChart, Settings, LogOut, TrendingUp, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setUser, getSettings } from '@/lib/store';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Trading', icon: TrendingUp, path: '/dashboard' },
  { label: 'DBots', icon: Bot, path: '/dashboard/bots' },
  { label: 'Analysis', icon: BarChart3, path: '/dashboard/analysis' },
  { label: 'Portfolio', icon: Wallet, path: '/dashboard/portfolio' },
  { label: 'Charts', icon: LineChart, path: '/dashboard/charts' },
];

export const DashboardSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const settings = getSettings();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  return (
    <div className={cn(
      "h-screen bg-card border-r border-border flex flex-col transition-all duration-200",
      collapsed ? "w-16" : "w-56"
    )}>
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && (
          <span className="font-bold text-foreground text-sm truncate">
            {settings.siteName || 'HFT Pro'}
          </span>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
