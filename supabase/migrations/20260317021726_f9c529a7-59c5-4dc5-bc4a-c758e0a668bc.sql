-- M-Pesa configuration table
CREATE TABLE public.mpesa_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_key text NOT NULL DEFAULT '',
  consumer_secret text NOT NULL DEFAULT '',
  shortcode text NOT NULL DEFAULT '',
  passkey text NOT NULL DEFAULT '',
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mpesa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read mpesa_config" ON public.mpesa_config FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update mpesa_config" ON public.mpesa_config FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can insert mpesa_config" ON public.mpesa_config FOR INSERT TO public WITH CHECK (true);

-- Purchases / payments table
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deriv_account text NOT NULL,
  bot_id uuid REFERENCES public.bots(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  mpesa_checkout_request_id text,
  mpesa_receipt text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read purchases" ON public.purchases FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert purchases" ON public.purchases FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update purchases" ON public.purchases FOR UPDATE TO public USING (true);

-- Access requests table
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deriv_account text NOT NULL,
  bot_id uuid REFERENCES public.bots(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read access_requests" ON public.access_requests FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert access_requests" ON public.access_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update access_requests" ON public.access_requests FOR UPDATE TO public USING (true);

-- Add price column to bots
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0;

-- Insert default mpesa config row
INSERT INTO public.mpesa_config (consumer_key, consumer_secret, shortcode, passkey, environment)
VALUES ('', '', '', '', 'sandbox');

-- Triggers for updated_at
CREATE TRIGGER update_mpesa_config_updated_at BEFORE UPDATE ON public.mpesa_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_access_requests_updated_at BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();