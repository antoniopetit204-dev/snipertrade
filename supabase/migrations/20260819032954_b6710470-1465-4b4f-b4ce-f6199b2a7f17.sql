ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS bonus_require_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS withdrawal_min_runs integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS sensitive_lock_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS bonus_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS bonus_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS bonus_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_runs integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.admin_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL,
  email text NOT NULL,
  code text NOT NULL,
  ip text NOT NULL DEFAULT '',
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_otps TO service_role;
ALTER TABLE public.admin_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_otps service only" ON public.admin_otps FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  identifier text NOT NULL DEFAULT '',
  ip text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_events TO anon, authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_events readable" ON public.security_events FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_otps_purpose ON public.admin_otps (purpose, created_at DESC);