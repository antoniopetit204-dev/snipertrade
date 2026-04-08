// Database helper functions for Lovable Cloud
import { supabase } from './supabase';
import type { AdminSettings, Bot, DerivAccount } from './store';

// ---- Admin Settings ----

export const fetchSettings = async (): Promise<AdminSettings | null> => {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .limit(1)
    .single();
  if (error || !data) return null;
  return {
    appId: data.app_id, apiKey: data.api_key, siteName: data.site_name, siteTitle: data.site_title,
    metaDescription: data.meta_description, metaKeywords: data.meta_keywords, contactEmail: data.contact_email,
    contactPhone: data.contact_phone, telegramLink: data.telegram_link, supportUrl: data.support_url,
    logoUrl: data.logo_url, favicon: data.favicon, primaryColor: data.primary_color, footerText: data.footer_text,
    announcementBar: data.announcement_bar, maintenanceMode: data.maintenance_mode, allowSignups: data.allow_signups,
    maxBotPerUser: data.max_bot_per_user, defaultCurrency: data.default_currency, termsUrl: data.terms_url,
    privacyUrl: data.privacy_url, depositEnabled: (data as any).deposit_enabled ?? false, appIconUrl: (data as any).app_icon_url ?? '',
  };
};

export const updateSettings = async (settings: AdminSettings) => {
  const { error } = await supabase
    .from('admin_settings')
    .update({
      app_id: settings.appId, api_key: settings.apiKey, site_name: settings.siteName, site_title: settings.siteTitle,
      meta_description: settings.metaDescription, meta_keywords: settings.metaKeywords, contact_email: settings.contactEmail,
      contact_phone: settings.contactPhone, telegram_link: settings.telegramLink, support_url: settings.supportUrl,
      logo_url: settings.logoUrl, favicon: settings.favicon, primary_color: settings.primaryColor, footer_text: settings.footerText,
      announcement_bar: settings.announcementBar, maintenance_mode: settings.maintenanceMode, allow_signups: settings.allowSignups,
      max_bot_per_user: settings.maxBotPerUser, default_currency: settings.defaultCurrency, terms_url: settings.termsUrl,
      privacy_url: settings.privacyUrl, deposit_enabled: settings.depositEnabled, app_icon_url: settings.appIconUrl,
    } as any)
    .not('id', 'is', null);
  return !error;
};

// ---- Bots ----

export const fetchBots = async (): Promise<Bot[]> => {
  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((b: any) => ({
    id: b.id, name: b.name, description: b.description, strategy: b.strategy,
    enabled: b.enabled, createdAt: b.created_at, profitLoss: Number(b.profit_loss),
    trades: b.trades, winRate: Number(b.win_rate), category: b.category, price: Number(b.price || 0),
  }));
};

export const createBot = async (bot: Omit<Bot, 'id' | 'createdAt' | 'profitLoss' | 'trades' | 'winRate'>) => {
  const { data, error } = await supabase
    .from('bots')
    .insert({
      name: bot.name, description: bot.description, strategy: bot.strategy,
      enabled: bot.enabled, category: bot.category, price: bot.price || 0,
    })
    .select()
    .single();
  return { data, error };
};

export const updateBot = async (id: string, updates: Partial<Bot>) => {
  const dbUpdates: {
    name?: string; description?: string; strategy?: string; category?: string;
    price?: number; enabled?: boolean; profit_loss?: number; trades?: number;
    win_rate?: number; featured?: boolean;
  } = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.strategy !== undefined) dbUpdates.strategy = updates.strategy;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
  if (updates.profitLoss !== undefined) dbUpdates.profit_loss = updates.profitLoss;
  if (updates.trades !== undefined) dbUpdates.trades = updates.trades;
  if (updates.winRate !== undefined) dbUpdates.win_rate = updates.winRate;
  
  return supabase.from('bots').update(dbUpdates).eq('id', id);
};

export const deleteBot = async (id: string) => {
  return supabase.from('bots').delete().eq('id', id);
};

export const toggleBotEnabled = async (id: string, enabled: boolean) => {
  return supabase.from('bots').update({ enabled }).eq('id', id);
};

// ---- User Sessions ----

export const upsertSession = async (account: DerivAccount) => {
  return supabase
    .from('user_sessions')
    .upsert({
      deriv_account: account.acct, deriv_token: account.token,
      deriv_currency: account.cur, is_active: true, last_login: new Date().toISOString(),
    }, { onConflict: 'deriv_account' });
};

export const fetchActiveSessions = async () => {
  const { data } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('is_active', true)
    .order('last_login', { ascending: false });
  return data || [];
};

// ---- M-Pesa Config ----

export interface MpesaConfig {
  id: string;
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  environment: 'sandbox' | 'production';
}

export const fetchMpesaConfig = async (): Promise<MpesaConfig | null> => {
  const { data, error } = await supabase
    .from('mpesa_config')
    .select('*')
    .limit(1)
    .single();
  if (error || !data) return null;
  return {
    id: data.id, consumerKey: data.consumer_key, consumerSecret: data.consumer_secret,
    shortcode: data.shortcode, passkey: data.passkey, environment: data.environment as 'sandbox' | 'production',
  };
};

export const updateMpesaConfig = async (config: Omit<MpesaConfig, 'id'>) => {
  const { error } = await supabase
    .from('mpesa_config')
    .update({
      consumer_key: config.consumerKey, consumer_secret: config.consumerSecret,
      shortcode: config.shortcode, passkey: config.passkey, environment: config.environment,
    })
    .not('id', 'is', null);
  return !error;
};

// ---- Purchases ----

export const fetchPurchases = async (derivAccount?: string) => {
  let query = supabase.from('purchases').select('*');
  if (derivAccount) query = query.eq('deriv_account', derivAccount);
  const { data } = await query.order('created_at', { ascending: false });
  return data || [];
};

export const fetchBotAccess = async (derivAccount?: string) => {
  if (!derivAccount) {
    return { accessibleBotIds: [] as string[], pendingBotIds: [] as string[] };
  }

  const [purchaseResp, approvedResp, pendingResp] = await Promise.all([
    supabase.from('purchases').select('bot_id').eq('deriv_account', derivAccount).eq('status', 'completed').not('bot_id', 'is', null),
    supabase.from('access_requests').select('bot_id').eq('deriv_account', derivAccount).eq('status', 'approved').not('bot_id', 'is', null),
    supabase.from('access_requests').select('bot_id').eq('deriv_account', derivAccount).eq('status', 'pending').not('bot_id', 'is', null),
  ]);

  const accessibleBotIds = Array.from(new Set([
    ...(purchaseResp.data || []).map((row: any) => row.bot_id),
    ...(approvedResp.data || []).map((row: any) => row.bot_id),
  ].filter(Boolean)));

  const pendingBotIds = Array.from(new Set(
    (pendingResp.data || [])
      .map((row: any) => row.bot_id)
      .filter((botId: string | null) => Boolean(botId) && !accessibleBotIds.includes(botId as string))
  )) as string[];

  return { accessibleBotIds, pendingBotIds };
};

// ---- Access Requests ----

export const createAccessRequest = async (derivAccount: string, botId: string, message: string) => {
  return supabase.from('access_requests').insert({
    deriv_account: derivAccount, bot_id: botId, message,
  });
};

export const fetchAccessRequests = async (derivAccount?: string) => {
  let query = supabase.from('access_requests').select('*');
  if (derivAccount) query = query.eq('deriv_account', derivAccount);
  const { data } = await query.order('created_at', { ascending: false });
  return data || [];
};

export const updateAccessRequestStatus = async (id: string, status: string) => {
  return supabase.from('access_requests').update({ status }).eq('id', id);
};

// ---- M-Pesa STK Push (calls edge function) ----

export const initiateStkPush = async (phoneNumber: string, amount: number, botId: string, derivAccount: string) => {
  const { data, error } = await supabase.functions.invoke('mpesa-stk', {
    body: { phone_number: phoneNumber, amount, bot_id: botId, deriv_account: derivAccount },
  });
  if (error) throw error;
  return data;
};

export const queryStkStatus = async (checkoutRequestId: string) => {
  const { data, error } = await supabase.functions.invoke('mpesa-stk?action=query', {
    body: { checkout_request_id: checkoutRequestId },
  });
  if (error) throw error;
  return data;
};

// ---- Deposits ----

export const initiateDeposit = async (phoneNumber: string, amount: number, derivAccount: string) => {
  const { data, error } = await supabase.functions.invoke('mpesa-stk', {
    body: { phone_number: phoneNumber, amount, deriv_account: derivAccount, action_type: 'deposit' },
  });
  if (error) throw error;
  return data;
};

export const fetchDeposits = async (derivAccount?: string) => {
  let query = supabase.from('deposits').select('*');
  if (derivAccount) query = query.eq('deriv_account', derivAccount);
  const { data } = await query.order('created_at', { ascending: false });
  return data || [];
};

export const fetchDepositEnabled = async (): Promise<boolean> => {
  const { data } = await supabase
    .from('admin_settings')
    .select('deposit_enabled')
    .limit(1)
    .single();
  return data?.deposit_enabled ?? false;
};

// ---- Withdrawals ----

export const initiateWithdrawal = async (phoneNumber: string, amount: number, derivAccount: string) => {
  const { data, error } = await supabase.functions.invoke('mpesa-stk?action=withdraw', {
    body: { phone_number: phoneNumber, amount, deriv_account: derivAccount },
  });
  if (error) throw error;
  return data;
};

export const fetchWithdrawals = async (derivAccount?: string) => {
  let query = supabase.from('withdrawals' as any).select('*');
  if (derivAccount) query = query.eq('deriv_account', derivAccount);
  const { data } = await query.order('created_at', { ascending: false });
  return data || [];
};

export const fetchWithdrawalEnabled = async (): Promise<boolean> => {
  const { data } = await supabase
    .from('admin_settings')
    .select('withdrawal_enabled' as any)
    .limit(1)
    .single();
  return (data as any)?.withdrawal_enabled ?? false;
};

export const queryWithdrawalStatus = async (withdrawalId: string) => {
  const { data } = await supabase
    .from('withdrawals' as any)
    .select('status')
    .eq('id', withdrawalId)
    .single();
  return data;
};

export const processWithdrawal = async (withdrawalId: string, approve: boolean) => {
  const { data, error } = await supabase.functions.invoke('mpesa-stk?action=process_withdrawal', {
    body: { withdrawal_id: withdrawalId, approve },
  });
  if (error) throw error;
  return data;
};

export const fetchAllWithdrawals = async () => {
  const { data } = await (supabase.from('withdrawals' as any) as any).select('*').order('created_at', { ascending: false });
  return data || [];
};
