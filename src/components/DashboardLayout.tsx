import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { AccountSwitcher } from './AccountSwitcher';
import { NotificationPanel } from './NotificationPanel';
import { MobileBottomNav } from './MobileBottomNav';
import { InstallShortcutPrompt } from './InstallShortcutPrompt';
import { getUser } from '@/lib/store';
import { useDerivConnection } from '@/hooks/useDerivWS';
import { Menu, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  headerExtra?: React.ReactNode;
}

export const DashboardLayout = ({ children, title, icon, subtitle, headerExtra }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const user = getUser();
  const { connected, authorized, error, connecting, reconnect } = useDerivConnection();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <DashboardSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 overflow-auto min-w-0">
        <header className="border-b border-border px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sticky top-0 bg-background/95 backdrop-blur-sm z-30">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" className="lg:hidden shrink-0 p-1.5" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-2 truncate">
                {icon} {title}
              </h1>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {headerExtra}
            {error && <span className="text-xs text-loss max-w-[120px] sm:max-w-[200px] truncate hidden sm:block">{error}</span>}
            <AccountSwitcher onSwitch={() => window.location.reload()} />
            <NotificationPanel />
            <div className="hidden sm:flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-profit animate-pulse' : 'bg-loss'}`} />
              <span className={`text-xs font-medium ${connected ? 'text-profit' : 'text-loss'}`}>
                {connecting ? '...' : connected ? (authorized ? 'Live' : 'No Auth') : 'Off'}
              </span>
              {!connected && !connecting && (
                <Button variant="ghost" size="sm" onClick={reconnect} className="h-6 px-2">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </header>
        <div className="p-3 pb-24 sm:p-6 lg:pb-6">
          <div className="mb-3 lg:hidden">
            <InstallShortcutPrompt variant="dashboard" />
          </div>
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
};
