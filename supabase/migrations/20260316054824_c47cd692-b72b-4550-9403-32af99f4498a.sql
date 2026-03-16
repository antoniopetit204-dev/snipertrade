
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Admin settings table (single row)
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  site_name TEXT NOT NULL DEFAULT 'HFT Pro',
  site_title TEXT NOT NULL DEFAULT 'High Frequency Trading Platform',
  meta_description TEXT NOT NULL DEFAULT 'Professional high frequency trading platform with automated bots and analysis tools.',
  meta_keywords TEXT NOT NULL DEFAULT 'trading, bots, analysis, forex, crypto',
  contact_email TEXT NOT NULL DEFAULT 'support@hftpro.com',
  contact_phone TEXT NOT NULL DEFAULT '',
  telegram_link TEXT NOT NULL DEFAULT '',
  support_url TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  favicon TEXT NOT NULL DEFAULT '',
  primary_color TEXT NOT NULL DEFAULT '#E5B84B',
  footer_text TEXT NOT NULL DEFAULT '© 2026 HFT Pro. All rights reserved.',
  announcement_bar TEXT NOT NULL DEFAULT '',
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  allow_signups BOOLEAN NOT NULL DEFAULT true,
  max_bot_per_user INTEGER NOT NULL DEFAULT 10,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  terms_url TEXT NOT NULL DEFAULT '',
  privacy_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed for app_id on landing page)
CREATE POLICY "Anyone can read settings" ON public.admin_settings FOR SELECT USING (true);
-- Anyone can update/insert for now (admin check done client-side since Deriv auth, not Supabase auth)
CREATE POLICY "Anyone can update settings" ON public.admin_settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert settings" ON public.admin_settings FOR INSERT WITH CHECK (true);

CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row with user's app_id
INSERT INTO public.admin_settings (app_id) VALUES ('120788');

-- Bots table
CREATE TABLE public.bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  strategy TEXT NOT NULL DEFAULT 'Custom',
  enabled BOOLEAN NOT NULL DEFAULT false,
  profit_loss NUMERIC NOT NULL DEFAULT 0,
  trades INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'free' CHECK (category IN ('free', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bots" ON public.bots FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bots" ON public.bots FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bots" ON public.bots FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete bots" ON public.bots FOR DELETE USING (true);

CREATE TRIGGER update_bots_updated_at
BEFORE UPDATE ON public.bots FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default bots
INSERT INTO public.bots (name, description, strategy, enabled, profit_loss, trades, win_rate, category) VALUES
  ('Scalper V3', 'High-frequency scalping bot for volatile pairs', 'Scalping', true, 2340.50, 1247, 68.3, 'premium'),
  ('Trend Rider', 'Follows medium-term trends using EMA crossovers', 'Trend Following', true, 890.20, 89, 72.1, 'free'),
  ('Mean Reversion', 'Capitalizes on price reversion to mean', 'Mean Reversion', false, -120.00, 203, 45.8, 'free'),
  ('Volatility Catcher', 'Trades Volatility Indices on Deriv', 'Volatility', false, 560.00, 312, 61.5, 'premium'),
  ('Rise/Fall Bot', 'Simple rise/fall contract trader', 'Rise/Fall', false, 150.00, 88, 55.2, 'free');

-- User sessions table (for Deriv OAuth tokens persistence)
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deriv_account TEXT NOT NULL UNIQUE,
  deriv_token TEXT NOT NULL,
  deriv_currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sessions" ON public.user_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sessions" ON public.user_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.user_sessions FOR UPDATE USING (true);

CREATE TRIGGER update_user_sessions_updated_at
BEFORE UPDATE ON public.user_sessions FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
