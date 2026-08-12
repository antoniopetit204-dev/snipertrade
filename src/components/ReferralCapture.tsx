import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { captureReferral } from '@/lib/affiliate';

/**
 * Captures ?ref=CODE (or /r/CODE) on any route, records the click and keeps the
 * code for 90 days so the affiliate never loses credit — then cleans the URL.
 */
export const ReferralCapture = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const hasRef = url.searchParams.has('ref') || url.searchParams.has('r')
      || url.searchParams.has('code') || /^\/r\/[A-Za-z0-9]+/.test(url.pathname);
    if (!hasRef) return;

    captureReferral().finally(() => {
      ['ref', 'r', 'code'].forEach((k) => url.searchParams.delete(k));
      const path = /^\/r\/[A-Za-z0-9]+/.test(url.pathname) ? '/' : url.pathname;
      navigate(`${path}${url.searchParams.toString() ? `?${url.searchParams}` : ''}`, { replace: true });
    });
  }, [location.pathname]);

  return null;
};
