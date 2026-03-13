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
}

export interface User {
  email: string;
  role: 'admin' | 'user';
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
};

const DEFAULT_BOTS: Bot[] = [
  { id: '1', name: 'Scalper V3', description: 'High-frequency scalping bot for volatile pairs', strategy: 'Scalping', enabled: true, createdAt: '2026-01-15', profitLoss: 2340.50, trades: 1247, winRate: 68.3 },
  { id: '2', name: 'Trend Rider', description: 'Follows medium-term trends using EMA crossovers', strategy: 'Trend Following', enabled: true, createdAt: '2026-02-01', profitLoss: 890.20, trades: 89, winRate: 72.1 },
  { id: '3', name: 'Mean Reversion', description: 'Capitalizes on price reversion to mean', strategy: 'Mean Reversion', enabled: false, createdAt: '2026-02-20', profitLoss: -120.00, trades: 203, winRate: 45.8 },
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

// Demo accounts
export const DEMO_ACCOUNTS = [
  { email: 'admin@hftpro.com', password: 'admin123', role: 'admin' as const },
  { email: 'user@hftpro.com', password: 'user123', role: 'user' as const },
];
