
-- Rate limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT 'login',
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON public.login_attempts(identifier, action, created_at DESC);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any read la" ON public.login_attempts FOR SELECT USING (true);
CREATE POLICY "any insert la" ON public.login_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "any update la" ON public.login_attempts FOR UPDATE USING (true);

-- Sessions / refresh tokens
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  refresh_token TEXT NOT NULL UNIQUE,
  user_agent TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON public.auth_sessions(user_id);
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any read as" ON public.auth_sessions FOR SELECT USING (true);
CREATE POLICY "any insert as" ON public.auth_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "any update as" ON public.auth_sessions FOR UPDATE USING (true);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any read ev" ON public.email_verifications FOR SELECT USING (true);
CREATE POLICY "any insert ev" ON public.email_verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "any update ev" ON public.email_verifications FOR UPDATE USING (true);

-- Admin settings extensions
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS withdrawal_auto_approve BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS withdrawal_auto_max NUMERIC NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS require_email_verification BOOLEAN NOT NULL DEFAULT false;
