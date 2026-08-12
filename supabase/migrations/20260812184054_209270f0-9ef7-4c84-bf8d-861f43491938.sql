-- ── Server-authoritative trade run sessions ──
CREATE TABLE IF NOT EXISTS public.trade_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  deriv_account text NOT NULL,
  bot_id uuid,
  stake numeric NOT NULL,
  payout_multiplier numeric NOT NULL,
  total_rounds integer NOT NULL,
  win_tier text NOT NULL DEFAULT 'normal',
  target_wins integer NOT NULL DEFAULT 0,
  schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_round integer NOT NULL DEFAULT 1,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  realized_pnl numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT ON public.trade_runs TO anon, authenticated;
GRANT ALL ON public.trade_runs TO service_role;
ALTER TABLE public.trade_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trade_runs readable" ON public.trade_runs FOR SELECT USING (true);

CREATE TRIGGER update_trade_runs_updated_at BEFORE UPDATE ON public.trade_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_trade_runs_email ON public.trade_runs(email);

-- ── Affiliates ──
CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  clicks integer NOT NULL DEFAULT 0,
  signups integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliates TO anon, authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliates readable" ON public.affiliates FOR SELECT USING (true);

CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Affiliate clicks ──
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  visitor_id text NOT NULL,
  ip text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  referer text NOT NULL DEFAULT '',
  landing_origin text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, visitor_id)
);
GRANT SELECT ON public.affiliate_clicks TO anon, authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate_clicks readable" ON public.affiliate_clicks FOR SELECT USING (true);

-- ── Referrals ──
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_email text NOT NULL,
  referrer_code text NOT NULL,
  referred_email text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  first_deposit_amount numeric NOT NULL DEFAULT 0,
  commission_paid numeric NOT NULL DEFAULT 0,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_email, level)
);
GRANT SELECT ON public.referrals TO anon, authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals readable" ON public.referrals FOR SELECT USING (true);

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_email);

-- ── Affiliate commissions ──
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_email text NOT NULL,
  referred_email text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  deposit_amount numeric NOT NULL DEFAULT 0,
  percent numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  deposit_id uuid,
  status text NOT NULL DEFAULT 'credited',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_email, affiliate_email, level)
);
GRANT SELECT ON public.affiliate_commissions TO anon, authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate_commissions readable" ON public.affiliate_commissions FOR SELECT USING (true);

-- ── Settings + user referral columns ──
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS affiliate_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS affiliate_l1_percent numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS affiliate_l2_percent numeric NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS affiliate_l3_percent numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS affiliate_min_payout numeric NOT NULL DEFAULT 100;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS referred_by_code text,
  ADD COLUMN IF NOT EXISTS referral_code text;