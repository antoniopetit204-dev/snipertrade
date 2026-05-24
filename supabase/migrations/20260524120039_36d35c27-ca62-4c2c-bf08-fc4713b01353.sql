ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS id_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS country text DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS app_users_phone_unique
  ON public.app_users (phone) WHERE phone <> '';

CREATE INDEX IF NOT EXISTS app_users_email_idx ON public.app_users (email);
