
-- Add deposit_enabled and app_icon_url to admin_settings
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS deposit_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS app_icon_url text NOT NULL DEFAULT '';

-- Add featured column to bots
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- Create deposits table
CREATE TABLE IF NOT EXISTS public.deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deriv_account text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  mpesa_checkout_request_id text,
  mpesa_receipt text,
  credited boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read deposits" ON public.deposits FOR SELECT USING (true);
CREATE POLICY "Anyone can insert deposits" ON public.deposits FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update deposits" ON public.deposits FOR UPDATE USING (true);
