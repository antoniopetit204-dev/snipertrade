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
    appId: data.app_id,
    apiKey: data.api_key,
    siteName: data.site_name,
    siteTitle: data.site_title,
    metaDescription: data.meta_description,
    metaKeywords: data.meta_keywords,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    telegramLink: data.telegram_link,
    supportUrl: data.support_url,
    logoUrl: data.logo_url,
    favicon: data.favicon,
    primaryColor: data.primary_color,
    footerText: data.footer_text,
    announcementBar: data.announcement_bar,
    maintenanceMode: data.maintenance_mode,
    allowSignups: data.allow_signups,
    maxBotPerUser: data.max_bot_per_user,
    defaultCurrency: data.default_currency,
    termsUrl: data.terms_url,
    privacyUrl: data.privacy_url,
  };
};

export const updateSettings = async (settings: AdminSettings) => {
  const { error } = await supabase
    .from('admin_settings')
    .update({
      app_id: settings.appId,
      api_key: settings.apiKey,
      site_name: settings.siteName,
      site_title: settings.siteTitle,
      meta_description: settings.metaDescription,
      meta_keywords: settings.metaKeywords,
      contact_email: settings.contactEmail,
      contact_phone: settings.contactPhone,
      telegram_link: settings.telegramLink,
      support_url: settings.supportUrl,
      logo_url: settings.logoUrl,
      favicon: settings.favicon,
      primary_color: settings.primaryColor,
      footer_text: settings.footerText,
      announcement_bar: settings.announcementBar,
      maintenance_mode: settings.maintenanceMode,
      allow_signups: settings.allowSignups,
      max_bot_per_user: settings.maxBotPerUser,
      default_currency: settings.defaultCurrency,
      terms_url: settings.termsUrl,
      privacy_url: settings.privacyUrl,
    })
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
    id: b.id,
    name: b.name,
    description: b.description,
    strategy: b.strategy,
    enabled: b.enabled,
    createdAt: b.created_at,
    profitLoss: Number(b.profit_loss),
    trades: b.trades,
    winRate: Number(b.win_rate),
    category: b.category,
    price: Number(b.price || 0),
  }));
};

export const createBot = async (bot: Omit<Bot, 'id' | 'createdAt' | 'profitLoss' | 'trades' | 'winRate'>) => {
  const { data, error } = await supabase
    .from('bots')
    .insert({
      name: bot.name,
      description: bot.description,
      strategy: bot.strategy,
      enabled: bot.enabled,
      category: bot.category,
      price: bot.price || 0,
    })
    .select()
    .single();
  return { data, error };
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
      deriv_account: account.acct,
      deriv_token: account.token,
      deriv_currency: account.cur,
      is_active: true,
      last_login: new Date().toISOString(),
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
    id: data.id,
    consumerKey: data.consumer_key,
    consumerSecret: data.consumer_secret,
    shortcode: data.shortcode,
    passkey: data.passkey,
    environment: data.environment,
  };
};

export const updateMpesaConfig = async (config: Omit<MpesaConfig, 'id'>) => {
  const { error } = await supabase
    .from('mpesa_config')
    .update({
      consumer_key: config.consumerKey,
      consumer_secret: config.consumerSecret,
      shortcode: config.shortcode,
      passkey: config.passkey,
      environment: config.environment,
    })
    .not('id', 'is', null);
  return !error;
};

// ---- Purchases ----

export const fetchPurchases = async () => {
  const { data } = await supabase
    .from('purchases')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
};

// ---- Access Requests ----

export const createAccessRequest = async (derivAccount: string, botId: string, message: string) => {
  return supabase.from('access_requests').insert({
    deriv_account: derivAccount,
    bot_id: botId,
    message,
  });
};

export const fetchAccessRequests = async () => {
  const { data } = await supabase
    .from('access_requests')
    .select('*')
    .order('created_at', { ascending: false });
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
