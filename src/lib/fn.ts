// Shared edge-function caller that always surfaces a human-readable message.
import { supabase } from '@/integrations/supabase/client';

const FRIENDLY_FALLBACK = 'Something went wrong. Please check your connection and try again.';

/** Pull the server's readable message out of a failed invoke, never a raw code. */
const extractMessage = async (error: any): Promise<string> => {
  try {
    const res = (error as any)?.context;
    if (res && typeof res.json === 'function') {
      const body = await res.clone().json();
      if (body?.error) return String(body.error);
    }
    if (res && typeof res.text === 'function') {
      const txt = await res.clone().text();
      const parsed = JSON.parse(txt);
      if (parsed?.error) return String(parsed.error);
    }
  } catch { /* body was not JSON */ }
  const raw = String(error?.message || '');
  if (/non-2xx|failed to fetch|networkerror/i.test(raw)) return FRIENDLY_FALLBACK;
  return raw || FRIENDLY_FALLBACK;
};

export const invokeFn = async <T = any>(name: string, body: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(await extractMessage(error));
  if ((data as any)?.error) throw new Error(String((data as any).error));
  return data as T;
};
