// Affiliate client helpers — link capture, click tracking, stats.
import { supabase } from '@/integrations/supabase/client';
import { getRefreshToken } from './auth-email';

const REF_KEY = 'hft_ref_code';
const REF_TS_KEY = 'hft_ref_ts';
const VISITOR_KEY = 'hft_visitor_id';
const REF_TTL_DAYS = 90;

export const normalizeCode = (raw: string) =>
  String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);

/** Stable per-browser visitor id used to de-duplicate link clicks. */
export const getVisitorId = () => {
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v) {
    v = (crypto.randomUUID?.() || String(Date.now() + Math.random())).replace(/-/g, '').slice(0, 32);
    localStorage.setItem(VISITOR_KEY, v);
  }
  return v;
};

/** Stored referral code, expired after 90 days. */
export const getStoredRef = (): string => {
  const code = localStorage.getItem(REF_KEY) || '';
  const ts = Number(localStorage.getItem(REF_TS_KEY) || 0);
  if (!code) return '';
  if (ts && Date.now() - ts > REF_TTL_DAYS * 864e5) {
    localStorage.removeItem(REF_KEY);
    localStorage.removeItem(REF_TS_KEY);
    return '';
  }
  return code;
};

export const storeRef = (code: string) => {
  const c = normalizeCode(code);
  if (!c) return;
  // First-touch attribution wins — never overwrite an existing credit.
  if (getStoredRef()) return;
  localStorage.setItem(REF_KEY, c);
  localStorage.setItem(REF_TS_KEY, String(Date.now()));
};

const invoke = async (action: string, body: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke(`affiliate?action=${action}`, { body });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
};

/**
 * Reads ?ref= / ?r= / ?code= (or /r/CODE) from the current URL, stores it and
 * registers one unique click. Safe to call on every route change.
 */
export const captureReferral = async () => {
  try {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('ref') || url.searchParams.get('r') || url.searchParams.get('code');
    const fromPath = /^\/r\/([A-Za-z0-9]+)/.exec(url.pathname)?.[1];
    const code = normalizeCode(fromQuery || fromPath || '');
    if (!code) return getStoredRef();

    const fresh = !getStoredRef();
    storeRef(code);
    await invoke('click', {
      code,
      visitor_id: getVisitorId(),
      origin: window.location.origin,
      referer: document.referrer,
    }).catch(() => {});
    return fresh ? code : getStoredRef();
  } catch {
    return getStoredRef();
  }
};

export const validateRefCode = (code: string) => invoke('validate', { code: normalizeCode(code) });

export const fetchAffiliateStats = () => invoke('stats', { refresh_token: getRefreshToken() });

export const fetchAffiliateAdmin = () => invoke('admin-list', { refresh_token: getRefreshToken() });

/** Builds the share link on the CURRENT domain the affiliate is using. */
export const buildAffiliateLink = (code: string) =>
  `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
