
ALTER TABLE public.mpesa_config
  ADD COLUMN IF NOT EXISTS b2c_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS initiator_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS security_credential text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS b2c_shortcode text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS result_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS queue_timeout_url text NOT NULL DEFAULT '';
