
-- Users (email/password auth)
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',
  verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read app_users" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "insert app_users" ON public.app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "update app_users" ON public.app_users FOR UPDATE USING (true);

-- Password reset tokens
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read prt" ON public.password_reset_tokens FOR SELECT USING (true);
CREATE POLICY "insert prt" ON public.password_reset_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "update prt" ON public.password_reset_tokens FOR UPDATE USING (true);

-- SMTP config
CREATE TABLE public.smtp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 587,
  secure BOOLEAN NOT NULL DEFAULT false,
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read smtp" ON public.smtp_config FOR SELECT USING (true);
CREATE POLICY "insert smtp" ON public.smtp_config FOR INSERT WITH CHECK (true);
CREATE POLICY "update smtp" ON public.smtp_config FOR UPDATE USING (true);
INSERT INTO public.smtp_config (host) VALUES ('');

-- Email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  html TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read et" ON public.email_templates FOR SELECT USING (true);
CREATE POLICY "insert et" ON public.email_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "update et" ON public.email_templates FOR UPDATE USING (true);

-- Seed default templates
INSERT INTO public.email_templates (template_key, name, subject, html, text) VALUES
('welcome', 'Welcome Email',
 'Welcome to {{site_name}}, {{name}}!',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f1419;color:#fff;padding:32px;border-radius:12px"><div style="text-align:center;margin-bottom:24px"><h1 style="color:#E5B84B;margin:0">{{site_name}}</h1></div><h2 style="color:#fff">Welcome, {{name}}!</h2><p style="color:#cbd5e1;line-height:1.6">Thanks for joining {{site_name}}. Your account is ready and you can start trading right away.</p><p style="margin:24px 0"><a href="{{site_url}}/dashboard" style="background:#E5B84B;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Go to Dashboard</a></p><p style="color:#94a3b8;font-size:12px;margin-top:32px">— The {{site_name}} Team</p></div>',
 'Welcome to {{site_name}}, {{name}}! Visit {{site_url}}/dashboard'),
('password_reset', 'Password Reset',
 'Reset your {{site_name}} password',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f1419;color:#fff;padding:32px;border-radius:12px"><h1 style="color:#E5B84B">Reset Your Password</h1><p style="color:#cbd5e1;line-height:1.6">We received a request to reset your password. Click the button below to set a new one. This link expires in 1 hour.</p><p style="margin:24px 0"><a href="{{reset_url}}" style="background:#E5B84B;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Reset Password</a></p><p style="color:#94a3b8;font-size:12px">If you did not request this, you can safely ignore this email.</p><p style="color:#94a3b8;font-size:11px;word-break:break-all">Or copy this link: {{reset_url}}</p></div>',
 'Reset your password: {{reset_url}} (expires in 1 hour)'),
('login_alert', 'Login Notification',
 'New sign-in to your {{site_name}} account',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f1419;color:#fff;padding:32px;border-radius:12px"><h2 style="color:#E5B84B">New Sign-in Detected</h2><p style="color:#cbd5e1">Hi {{name}}, your account was just accessed at {{time}}.</p><p style="color:#94a3b8;font-size:12px">If this was not you, please reset your password immediately.</p></div>',
 'New sign-in detected at {{time}}.'),
('deposit_success', 'Deposit Confirmed',
 'Deposit of KES {{amount}} confirmed',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f1419;color:#fff;padding:32px;border-radius:12px"><h2 style="color:#10b981">Deposit Confirmed ✓</h2><p style="color:#cbd5e1">Your deposit of <strong style="color:#E5B84B">KES {{amount}}</strong> has been credited to your account.</p><p style="color:#cbd5e1">Receipt: {{receipt}}</p></div>',
 'Deposit of KES {{amount}} confirmed. Receipt: {{receipt}}'),
('withdrawal_approved', 'Withdrawal Approved',
 'Withdrawal of KES {{amount}} approved',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f1419;color:#fff;padding:32px;border-radius:12px"><h2 style="color:#10b981">Withdrawal Approved ✓</h2><p style="color:#cbd5e1">Your withdrawal of <strong style="color:#E5B84B">KES {{amount}}</strong> has been approved and is being processed.</p></div>',
 'Withdrawal of KES {{amount}} approved.'),
('trade_alert', 'Trade Notification',
 'Trade {{result}}: {{symbol}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f1419;color:#fff;padding:32px;border-radius:12px"><h2 style="color:#E5B84B">Trade {{result}}</h2><p style="color:#cbd5e1">Symbol: {{symbol}}<br>P/L: <strong>{{pnl}}</strong></p></div>',
 'Trade {{result}} on {{symbol}}. P/L: {{pnl}}');

-- User email preferences
CREATE TABLE public.user_email_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT '',
  notify_login BOOLEAN NOT NULL DEFAULT true,
  notify_trades BOOLEAN NOT NULL DEFAULT false,
  notify_deposits BOOLEAN NOT NULL DEFAULT true,
  notify_withdrawals BOOLEAN NOT NULL DEFAULT true,
  marketing BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read uep" ON public.user_email_preferences FOR SELECT USING (true);
CREATE POLICY "insert uep" ON public.user_email_preferences FOR INSERT WITH CHECK (true);
CREATE POLICY "update uep" ON public.user_email_preferences FOR UPDATE USING (true);

-- Email send log
CREATE TABLE public.email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  template_key TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read el" ON public.email_log FOR SELECT USING (true);
CREATE POLICY "insert el" ON public.email_log FOR INSERT WITH CHECK (true);

CREATE INDEX idx_password_reset_token ON public.password_reset_tokens(token);
CREATE INDEX idx_app_users_email ON public.app_users(email);
