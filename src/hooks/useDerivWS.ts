import { useEffect, useState, useCallback, useRef } from 'react';
import { derivWS } from '@/lib/deriv-ws';
import { getUser, getSettings } from '@/lib/store';

export const useDerivConnection = () => {
  const [connected, setConnected] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const connect = useCallback(async () => {
    try {
      const settings = getSettings();
      if (!settings.appId) {
        setError('No App ID configured. Contact admin.');
        return;
      }
      await derivWS.connect(settings.appId);
      setConnected(true);
      setError(null);

      const user = getUser();
      if (user?.activeAccount?.token) {
        try {
          const authResp = await derivWS.authorize(user.activeAccount.token);
          setAuthorized(true);
          if (authResp.authorize) {
            setBalance(authResp.authorize.balance);
            setCurrency(authResp.authorize.currency);
          }
        } catch (err: any) {
          setError(err.message || 'Authorization failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      connect();
    }
    return () => {
      // Don't disconnect on unmount - keep connection alive across pages
    };
  }, [connect]);

  return { connected, authorized, balance, currency, error, reconnect: connect };
};

export const useActiveSymbols = () => {
  const [symbols, setSymbols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        if (!derivWS.isConnected) return;
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
    fetch();
  }, []);

  return { symbols, loading };
};
