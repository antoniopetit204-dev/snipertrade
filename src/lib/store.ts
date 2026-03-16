// Simple localStorage-based store for auth + cached settings

export interface AdminSettings {
  appId: string;
  apiKey: string;
  siteName: string;
  siteTitle: string;
  metaDescription: string;
  metaKeywords: string;
  contactEmail: string;
  contactPhone: string;
  telegramLink: string;
  supportUrl: string;
  logoUrl: string;
  favicon: string;
  primaryColor: string;
  footerText: string;
  announcementBar: string;
  maintenanceMode: boolean;
  allowSignups: boolean;
  maxBotPerUser: number;
  defaultCurrency: string;
  termsUrl: string;
  privacyUrl: string;
}

export interface Bot {
  id: string;
  name: string;
  description: string;
  strategy: string;
  enabled: boolean;
  createdAt: string;
  profitLoss: number;
  trades: number;
  winRate: number;
  category: 'free' | 'premium';
}

export interface DerivAccount {
  acct: string;
  token: string;
  cur: string;
}

export interface User {
  email: string;
  role: 'admin' | 'user';
  derivAccounts?: DerivAccount[];
  activeAccount?: DerivAccount;
}

const DEFAULT_SETTINGS: AdminSettings = {
  appId: '',
  apiKey: '',
  siteName: 'HFT Pro',
  siteTitle: 'High Frequency Trading Platform',
  metaDescription: 'Professional high frequency trading platform with automated bots and analysis tools.',
  metaKeywords: 'trading, bots, analysis, forex, crypto',
  contactEmail: 'support@hftpro.com',
  contactPhone: '+1 (555) 000-0000',
  telegramLink: 'https://t.me/hftpro',
  supportUrl: '',
  logoUrl: '',
  favicon: '',
  primaryColor: '#E5B84B',
  footerText: '© 2026 HFT Pro. All rights reserved.',
  announcementBar: '',
  maintenanceMode: false,
  allowSignups: true,
  maxBotPerUser: 10,
  defaultCurrency: 'USD',
  termsUrl: '',
  privacyUrl: '',
};

// Local cache for settings (loaded from DB)
let cachedSettings: AdminSettings | null = null;

export const getSettings = (): AdminSettings => {
  if (cachedSettings) return cachedSettings;
  const saved = localStorage.getItem('hft_settings');
  return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
};

export const setCachedSettings = (settings: AdminSettings) => {
  cachedSettings = settings;
  localStorage.setItem('hft_settings', JSON.stringify(settings));
};

export const saveSettings = (settings: AdminSettings) => {
  setCachedSettings(settings);
};

export const getUser = (): User | null => {
  const saved = localStorage.getItem('hft_user');
  return saved ? JSON.parse(saved) : null;
};

export const setUser = (user: User | null) => {
  if (user) {
    localStorage.setItem('hft_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('hft_user');
  }
};

// Admin account - hardcoded credentials
export const ADMIN_ACCOUNT = {
  email: 'duncanprono47@gmail.com',
  password: '@Misafa4784',
  role: 'admin' as const,
};

// Parse Deriv OAuth callback URL parameters
export const parseDerivCallback = (search: string): DerivAccount[] => {
  const params = new URLSearchParams(search);
  const accounts: DerivAccount[] = [];
  let i = 1;
  while (params.has(`acct${i}`)) {
    accounts.push({
      acct: params.get(`acct${i}`)!,
      token: params.get(`token${i}`)!,
      cur: params.get(`cur${i}`)!,
    });
    i++;
  }
  return accounts;
};

// Build Deriv OAuth URL
export const getDerivOAuthUrl = (appId?: string): string => {
  const id = appId || getSettings().appId;
  if (!id) return '';
  return `https://oauth.deriv.com/oauth2/authorize?app_id=${id}&l=EN&brand=deriv`;
};

// Check if URL has Deriv callback params
export const hasDerivCallbackParams = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.has('acct1') && params.has('token1');
};
