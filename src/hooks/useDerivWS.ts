import { useEffect, useState, useCallback, useRef } from 'react';
import { derivWS } from '@/lib/deriv-ws';
import { getUser, getSettings } from '@/lib/store';

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
      const settings = getSettings();
      if (!settings.appId || settings.appId.trim() === '') {
        setError('No App ID configured. Admin must set it in /adminking.');
        setConnecting(false);
        return;
      }
      
      await derivWS.connect(settings.appId);
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
          
          // Subscribe to balance updates
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
    
    // Listen for balance updates
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
  const [symbols, setSymbols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        if (!derivWS.isConnected) {
          setLoading(false);
          return;
        }
        const resp = await derivWS.getActiveSymbols();
        if (resp.active_symbols) {
          setSymbols(resp.active_symbols);
        }
      } catch (err) {
        console.error('Failed to fetch symbols:', err);
      } finally {
        setLoading(false);
      }
    };
    
    // Wait a bit for connection to establish
    const timer = setTimeout(fetch, 500);
    return () => clearTimeout(timer);
  }, []);

  return { symbols, loading };
};
