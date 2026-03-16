import { useState, useEffect } from 'react';
import { fetchSettings } from '@/lib/db';
import { getSettings, setCachedSettings, type AdminSettings } from '@/lib/store';

// Hook to load settings from DB and cache locally
export const useSettings = () => {
  const [settings, setSettings] = useState<AdminSettings>(getSettings());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const dbSettings = await fetchSettings();
        if (dbSettings) {
          setCachedSettings(dbSettings);
          setSettings(dbSettings);
        }
      } catch (err) {
        console.error('Failed to load settings from DB:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { settings, loading };
};
