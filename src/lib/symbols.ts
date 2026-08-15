// Persistent active-symbols cache.
// Symbols are stored in localStorage forever and only re-fetched from Deriv
// when the cache is missing, stale (>24h) or the payload actually changed.
import { derivWS } from './deriv-ws';
import { getSettings } from './store';
import { fetchSettings } from './db';

export interface SymbolInfo {
  symbol: string;
  display_name: string;
  market?: string;
  market_display_name?: string;
  submarket?: string;
  submarket_display_name?: string;
  exchange_is_open?: number;
  is_trading_suspended?: number;
}

const CACHE_KEY = 'hft_active_symbols_v1';
const TS_KEY = 'hft_active_symbols_ts_v1';
const TTL_MS = 24 * 60 * 60 * 1000;

/** Offline fallback so every symbol dropdown always has usable options. */
export const FALLBACK_SYMBOLS: SymbolInfo[] = [
  { symbol: 'R_10', display_name: 'Volatility 10 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'R_25', display_name: 'Volatility 25 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'R_50', display_name: 'Volatility 50 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'R_75', display_name: 'Volatility 75 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'R_100', display_name: 'Volatility 100 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: '1HZ10V', display_name: 'Volatility 10 (1s) Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: '1HZ25V', display_name: 'Volatility 25 (1s) Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: '1HZ50V', display_name: 'Volatility 50 (1s) Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: '1HZ75V', display_name: 'Volatility 75 (1s) Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: '1HZ100V', display_name: 'Volatility 100 (1s) Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'BOOM500', display_name: 'Boom 500 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'BOOM1000', display_name: 'Boom 1000 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'CRASH500', display_name: 'Crash 500 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'CRASH1000', display_name: 'Crash 1000 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'JD10', display_name: 'Jump 10 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'JD25', display_name: 'Jump 25 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'JD50', display_name: 'Jump 50 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'JD75', display_name: 'Jump 75 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'JD100', display_name: 'Jump 100 Index', market: 'synthetic_index', market_display_name: 'Derived' },
  { symbol: 'frxEURUSD', display_name: 'EUR/USD', market: 'forex', market_display_name: 'Forex' },
  { symbol: 'frxGBPUSD', display_name: 'GBP/USD', market: 'forex', market_display_name: 'Forex' },
  { symbol: 'frxUSDJPY', display_name: 'USD/JPY', market: 'forex', market_display_name: 'Forex' },
  { symbol: 'frxAUDUSD', display_name: 'AUD/USD', market: 'forex', market_display_name: 'Forex' },
  { symbol: 'frxXAUUSD', display_name: 'Gold/USD', market: 'commodities', market_display_name: 'Commodities' },
];

export const readCachedSymbols = (): SymbolInfo[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [];
  } catch {
    return [];
  }
};

const writeCache = (list: SymbolInfo[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
    localStorage.setItem(TS_KEY, String(Date.now()));
  } catch {}
};

const isStale = () => {
  const ts = Number(localStorage.getItem(TS_KEY) || 0);
  return !ts || Date.now() - ts > TTL_MS;
};

/** Make sure the Deriv socket is up (symbols are a public, unauthorised call). */
const ensureConnection = async () => {
  if (derivWS.isConnected) return true;
  let appId = getSettings().appId;
  if (!appId) {
    try {
      const s = await fetchSettings();
      appId = s?.appId || '';
    } catch {}
  }
  if (!appId) return false;
  try {
    await derivWS.connect(appId);
    return true;
  } catch {
    return false;
  }
};

let inFlight: Promise<SymbolInfo[]> | null = null;

/**
 * Fetch symbols from Deriv and persist them only if they changed.
 * Returns [] when the network/socket is unavailable (cache stays intact).
 */
export const refreshSymbols = async (): Promise<SymbolInfo[]> => {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const ok = await ensureConnection();
      if (ok) {
        try {
          const resp = await derivWS.getActiveSymbols();
          const list: SymbolInfo[] = resp?.active_symbols || [];
          if (list.length) {
            const prev = readCachedSymbols();
            const changed =
              prev.length !== list.length ||
              JSON.stringify(prev.map((s) => s.symbol).sort()) !==
                JSON.stringify(list.map((s) => s.symbol).sort());
            if (changed || isStale()) writeCache(list);
            return list;
          }
        } catch (e) {
          console.warn('active_symbols fetch failed', e);
        }
      }
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
    return [];
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
};

/** Cache-first read: instant symbols, background revalidation when stale. */
export const getSymbols = async (): Promise<SymbolInfo[]> => {
  const cached = readCachedSymbols();
  if (cached.length) {
    if (isStale()) refreshSymbols().catch(() => {});
    return cached;
  }
  const fresh = await refreshSymbols();
  return fresh.length ? fresh : FALLBACK_SYMBOLS;
};
