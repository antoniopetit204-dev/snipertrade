
-- Internal balance per Deriv account
CREATE TABLE public.user_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deriv_account TEXT NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_deposited NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user_balances" ON public.user_balances FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_balances" ON public.user_balances FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update user_balances" ON public.user_balances FOR UPDATE USING (true);

CREATE TRIGGER trg_user_balances_updated
  BEFORE UPDATE ON public.user_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Manual (simulated) trades log
CREATE TABLE public.manual_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deriv_account TEXT NOT NULL,
  bot_id UUID,
  bot_name TEXT NOT NULL DEFAULT '',
  stake NUMERIC NOT NULL DEFAULT 0,
  payout NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  result TEXT NOT NULL DEFAULT 'pending',
  balance_after NUMERIC NOT NULL DEFAULT 0,
  run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_manual_trades_account ON public.manual_trades(deriv_account, created_at DESC);
CREATE INDEX idx_manual_trades_run ON public.manual_trades(run_id);

ALTER TABLE public.manual_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read manual_trades" ON public.manual_trades FOR SELECT USING (true);
CREATE POLICY "Anyone can insert manual_trades" ON public.manual_trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update manual_trades" ON public.manual_trades FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete manual_trades" ON public.manual_trades FOR DELETE USING (true);

-- Min deposit / withdrawal columns
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS min_deposit NUMERIC NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS min_withdrawal NUMERIC NOT NULL DEFAULT 50;
