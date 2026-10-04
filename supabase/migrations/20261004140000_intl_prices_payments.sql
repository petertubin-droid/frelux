-- =========================================================
-- INTERNATIONAL PHASE B: multi-currency price books + payment gateway
-- =========================================================

-- 1) Market dimension on estimation prices.
--    All existing rows default to NG, so every current engine read is
--    unchanged. Non-NG price books (Ghana, Kenya, SA...) can be added by
--    admin without polluting the Nigerian engine inputs.
ALTER TABLE public.estimation_prices
  ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT 'NG';

COMMENT ON COLUMN public.estimation_prices.market IS
  'ISO 3166-1 alpha-2 market this price book belongs to (NG default).';

CREATE INDEX IF NOT EXISTS idx_est_prices_market_active
  ON public.estimation_prices (market, price_type, ref_id)
  WHERE is_active;

-- 2) Admin-selectable payment gateway (Paystack default; Stripe and
--    Flutterwave optional). Checkout falls back to Paystack server-side
--    whenever the selected gateway is not configured.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payment_gateway text NOT NULL DEFAULT 'paystack'
    CHECK (payment_gateway IN ('paystack', 'stripe', 'flutterwave'));

COMMENT ON COLUMN public.site_settings.payment_gateway IS
  'Preferred subscription checkout gateway. Stripe/Flutterwave require their edge function + keys to be deployed; checkout falls back to Paystack otherwise.';
