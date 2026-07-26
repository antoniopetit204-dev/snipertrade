
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS bonus_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_amount numeric NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS bonus_min_deposit numeric NOT NULL DEFAULT 1500;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS bonus_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS bonus_claimed_amount numeric NOT NULL DEFAULT 0;
