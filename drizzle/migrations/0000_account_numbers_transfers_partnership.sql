-- Unique account numbers for every user
CREATE SEQUENCE IF NOT EXISTS public.account_number_seq START WITH 100000 INCREMENT BY 1;

ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS account_number text;
UPDATE public.app_users SET account_number = 'HFT-' || nextval('public.account_number_seq')::text WHERE account_number IS NULL;
ALTER TABLE public.app_users ALTER COLUMN account_number SET DEFAULT ('HFT-' || nextval('public.account_number_seq')::text);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_account_number_key ON public.app_users (account_number);

-- Partnership (formerly affiliate) eligibility
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS partner_status text NOT NULL DEFAULT 'none';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS partner_requested_at timestamptz;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS partner_approved_at timestamptz;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS partner_note text NOT NULL DEFAULT '';

ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS partner_min_deposit numeric NOT NULL DEFAULT 5000;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS partner_require_approval boolean NOT NULL DEFAULT true;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS transfer_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS transfer_min numeric NOT NULL DEFAULT 50;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS transfer_fee_percent numeric NOT NULL DEFAULT 0;

-- Peer to peer internal transfers
CREATE TABLE IF NOT EXISTS public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email text NOT NULL,
  to_email text NOT NULL,
  from_account_number text NOT NULL DEFAULT '',
  to_account_number text NOT NULL DEFAULT '',
  amount numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.transfers TO service_role;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role manages transfers" ON public.transfers FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS transfers_from_email_idx ON public.transfers (from_email, created_at DESC);
CREATE INDEX IF NOT EXISTS transfers_to_email_idx ON public.transfers (to_email, created_at DESC);