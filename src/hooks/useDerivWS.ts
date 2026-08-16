import { useEffect, useState, useCallback, useRef } from 'react';
import { derivWS } from '@/lib/deriv-ws';
import { getUser, getSettings, setCachedSettings } from '@/lib/store';
import { fetchSettings } from '@/lib/db';
import { getSymbols, refreshSymbols, readCachedSymbols, FALLBACK_SYMBOLS } from '@/lib/symbols';


export const useDerivConnection = () => {
  const [connected, setConnected] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const initialized = useRef(false);

  const connect = useCallback(async () => {
    try {
      setConnecting(true);
      setError(null);
      
      // Try to load settings from DB first
      let appId = getSettings().appId;
      if (!appId || appId.trim() === '') {
        try {
          const dbSettings = await fetchSettings();
          if (dbSettings?.appId) {
            setCachedSettings(dbSettings);
            appId = dbSettings.appId;
          }
        } catch {}
      }
      
      if (!appId || appId.trim() === '') {
        setError('No App ID configured. Admin must set it in /adminking.');
        setConnecting(false);
        return;
      }
      
      await derivWS.connect(appId);
      setConnected(true);

      const user = getUser();
      if (user?.activeAccount?.token) {
        try {
          const authResp = await derivWS.authorize(user.activeAccount.token);
          setAuthorized(true);
          if (authResp.authorize) {
            setBalance(authResp.authorize.balance);
            setCurrency(authResp.authorize.currency || 'USD');
          }
          
          try {
            const balResp = await derivWS.getBalance();
            if (balResp.balance) {
              setBalance(balResp.balance.balance);
              setCurrency(balResp.balance.currency || 'USD');
            }
          } catch {}
        } catch (err: any) {
          setError(err.message || 'Authorization failed - token may be expired');
          setAuthorized(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      connect();
    }
    
    const unsub = derivWS.subscribe('balance', (data) => {
      if (data.balance) {
        setBalance(data.balance.balance);
        setCurrency(data.balance.currency || 'USD');
      }
    });

    return () => { unsub(); };
  }, [connect]);

  return { connected, authorized, balance, currency, error, connecting, reconnect: connect };
};

export const useActiveSymbols = () => {
  const [symbols, setSymbols] = useState<any[]>(() => {
    const cached = readCachedSymbols();
    return cached.length ? cached : FALLBACK_SYMBOLS;
  });
  const [loading, setLoading] = useState(() => readCachedSymbols().length === 0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await getSymbols();
        if (!cancelled && list.length) setSymbols(list);
      } catch (err) {
        console.error('Failed to load symbols:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { symbols, loading, refresh: refreshSymbols };
};

