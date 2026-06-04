// Email auth helpers
import { supabase } from '@/integrations/supabase/client';
import { setUser, getUser, type User } from './store';

const REFRESH_KEY = 'hft_refresh_token';
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY) || '';
export const setRefreshToken = (t: string) => t ? localStorage.setItem(REFRESH_KEY, t) : localStorage.removeItem(REFRESH_KEY);

/** Guard: never let a silent refresh overwrite an active admin session. */
const isAdminActive = () => getUser()?.role === 'admin';

const invoke = async (action: string, body: Record<string, any> = {}) => {
  const { data, error } = await supabase.functions.invoke(`auth-email?action=${action}`, {
    body: { ...body, origin: window.location.origin },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

const persistSession = (data: any): User => {
  const u: User = {
    email: data.user.email,
    role: data.user.role === 'admin' ? 'admin' : 'user',
    verified: data.user.verified !== false,
    name: data.user.name,
  };
  setUser(u);
  if (data.refresh_token) setRefreshToken(data.refresh_token);
  return u;
};

export const signupEmail = async (
  email: string, password: string, name: string,
  extras: { phone?: string; id_number?: string; country?: string } = {}
) => {
  const data = await invoke('signup', { email, password, name, ...extras });
  return { user: null, requireVerification: true, email: data.email || email, emailSent: data.emailSent !== false, sendError: data.sendError };
};

export const loginEmail = async (email: string, password: string) => {
  const data = await invoke('login', { email, password });
  return persistSession(data);
};

export const verifyOtp = async (email: string, code: string) => {
  const data = await invoke('verify-otp', { email, code });
  if (data.user) persistSession(data);
  return data;
};

export const verifyEmail = async (token: string) => {
  const data = await invoke('verify-email', { token });
  if (data.user) persistSession(data);
  return data;
};

export const resendVerification = (email: string) => invoke('resend-verification', { email });

export const getProfile = (email: string) => invoke('get-profile', { email });
export const updateProfile = (
  email: string,
  patch: { name?: string; phone?: string; id_number?: string; country?: string; avatar_url?: string }
) => invoke('update-profile', { email, ...patch });

export const requestPasswordReset = (email: string) => invoke('forgot-password', { email });
export const verifyResetToken = (token: string) => invoke('verify-token', { token });
export const resetPassword = (token: string, password: string) => invoke('reset-password', { token, password });
export const sendTestEmail = (to: string) => invoke('send-test', { to });
export const sendTemplateEmail = (to: string, template: string, vars: Record<string, string> = {}) =>
  invoke('send-template', { to, template, vars });

export const refreshSession = async () => {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const data = await invoke('refresh-session', { refresh_token: refresh });
    return persistSession(data);
  } catch {
    setRefreshToken('');
    return null;
  }
};

export const logoutSession = async () => {
  const refresh = getRefreshToken();
  if (refresh) { try { await invoke('logout', { refresh_token: refresh }); } catch {} }
  setRefreshToken('');
};

export const listSessions = async (email: string) => {
  const d = await invoke('list-sessions', { email });
  return d.sessions || [];
};
export const revokeSession = (id: string) => invoke('revoke-session', { id });

// Email preferences
export const fetchEmailPrefs = async (identifier: string) => {
  const { data } = await supabase.from('user_email_preferences' as any).select('*').eq('identifier', identifier).maybeSingle();
  return data as any;
};

export const upsertEmailPrefs = async (identifier: string, prefs: any) => {
  return (supabase as any).from('user_email_preferences')
    .upsert({ identifier, ...prefs, updated_at: new Date().toISOString() }, { onConflict: 'identifier' });
};

// SMTP config
export const fetchSmtp = async () => {
  const { data } = await (supabase as any).from('smtp_config').select('*').limit(1).maybeSingle();
  return data;
};
export const updateSmtp = async (cfg: any) => {
  const { data: existing } = await (supabase as any).from('smtp_config').select('id').limit(1).maybeSingle();
  if (existing) return (supabase as any).from('smtp_config').update({ ...cfg, updated_at: new Date().toISOString() }).eq('id', existing.id);
  return (supabase as any).from('smtp_config').insert(cfg);
};

// Email templates
export const fetchEmailTemplates = async () => {
  const { data } = await (supabase as any).from('email_templates').select('*').order('template_key');
  return data || [];
};
export const updateEmailTemplate = async (id: string, patch: any) => {
  return (supabase as any).from('email_templates').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
};

// Email log
export const fetchEmailLog = async (limit = 50) => {
  const { data } = await (supabase as any).from('email_log').select('*').order('created_at', { ascending: false }).limit(limit);
  return data || [];
};
