import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUser } from '@/lib/store';
import { refreshSession, getRefreshToken } from '@/lib/auth-email';

interface Props {
  children: React.ReactNode;
  requireVerified?: boolean;
}

/**
 * Guards a route: must be logged in (and verified by default).
 * Silently refreshes session on mount if a refresh token exists.
 */
export const AuthGuard = ({ children, requireVerified = true }: Props) => {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user && getRefreshToken()) {
        const u = await refreshSession();
        if (!cancelled) setUser(u);
      }
      if (!cancelled) setChecking(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (requireVerified && user.role !== 'admin' && user.verified === false) {
    return <Navigate to={`/auth?pending=${encodeURIComponent(user.email)}`} replace />;
  }

  return <>{children}</>;
};
