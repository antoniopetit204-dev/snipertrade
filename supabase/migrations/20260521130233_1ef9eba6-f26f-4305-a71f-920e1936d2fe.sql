ALTER TABLE public.email_verifications ADD COLUMN IF NOT EXISTS otp_code TEXT;
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_otp ON public.email_verifications(otp_code);