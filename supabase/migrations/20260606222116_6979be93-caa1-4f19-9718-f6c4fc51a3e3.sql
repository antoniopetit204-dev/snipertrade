
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS win_tier text NOT NULL DEFAULT 'normal';
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS risk_tier text NOT NULL DEFAULT 'normal';

CREATE TABLE IF NOT EXISTS public.house_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool numeric NOT NULL DEFAULT 0,
  total_user_stakes numeric NOT NULL DEFAULT 0,
  total_user_payouts numeric NOT NULL DEFAULT 0,
  min_floor numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.house_ledger TO authenticated, anon;
GRANT ALL ON public.house_ledger TO service_role;

ALTER TABLE public.house_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "house read" ON public.house_ledger FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "house insert" ON public.house_ledger FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "house update" ON public.house_ledger FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.house_ledger (pool, min_floor)
SELECT 0, 0
WHERE NOT EXISTS (SELECT 1 FROM public.house_ledger);
