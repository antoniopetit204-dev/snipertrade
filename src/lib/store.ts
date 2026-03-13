// Simple localStorage-based store for admin settings and auth

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

const DEFAULT_BOTS: Bot[] = [
  { id: '1', name: 'Scalper V3', description: 'High-frequency scalping bot for volatile pairs', strategy: 'Scalping', enabled: true, createdAt: '2026-01-15', profitLoss: 2340.50, trades: 1247, winRate: 68.3, category: 'premium' },
  { id: '2', name: 'Trend Rider', description: 'Follows medium-term trends using EMA crossovers', strategy: 'Trend Following', enabled: true, createdAt: '2026-02-01', profitLoss: 890.20, trades: 89, winRate: 72.1, category: 'free' },
  { id: '3', name: 'Mean Reversion', description: 'Capitalizes on price reversion to mean', strategy: 'Mean Reversion', enabled: false, createdAt: '2026-02-20', profitLoss: -120.00, trades: 203, winRate: 45.8, category: 'free' },
  { id: '4', name: 'Volatility Catcher', description: 'Trades Volatility Indices on Deriv', strategy: 'Volatility', enabled: false, createdAt: '2026-03-01', profitLoss: 560.00, trades: 312, winRate: 61.5, category: 'premium' },
  { id: '5', name: 'Rise/Fall Bot', description: 'Simple rise/fall contract trader', strategy: 'Rise/Fall', enabled: false, createdAt: '2026-03-10', profitLoss: 150.00, trades: 88, winRate: 55.2, category: 'free' },
];

export const getSettings = (): AdminSettings => {
  const saved = localStorage.getItem('hft_settings');
  return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AdminSettings) => {
  localStorage.setItem('hft_settings', JSON.stringify(settings));
};

export const getBots = (): Bot[] => {
  const saved = localStorage.getItem('hft_bots');
  return saved ? JSON.parse(saved) : DEFAULT_BOTS;
};

export const saveBots = (bots: Bot[]) => {
  localStorage.setItem('hft_bots', JSON.stringify(bots));
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
export const getDerivOAuthUrl = (): string => {
  const settings = getSettings();
  if (!settings.appId) return '';
  return `https://oauth.deriv.com/oauth2/authorize?app_id=${settings.appId}&l=EN&brand=deriv`;
};
