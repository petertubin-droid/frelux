-- =========================================================
-- Subscription prices in every market's currency
--
-- USD stays canonical (subscription_plan_prices, currency = 'USD').
-- This table carries the price each of the 32 markets is charged and
-- shown, derived from the USD price with that currency's rate and
-- rounding. Checkout reads the same row the pricing page displayed, so a
-- visitor is never quoted one price and charged another.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.subscription_local_prices (
  market_code   text NOT NULL,
  plan          text NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  currency      text NOT NULL,
  price_minor   bigint NOT NULL CHECK (price_minor > 0),
  fx_rate       numeric(18, 6),
  fx_source     text,
  active        boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (market_code, plan, billing_cycle)
);

CREATE INDEX IF NOT EXISTS subscription_local_prices_currency_idx
  ON public.subscription_local_prices (currency, plan, billing_cycle);

-- Public read: the pricing page must show the exact chargeable amount.
-- Writes stay server-side (service role bypasses RLS).
ALTER TABLE public.subscription_local_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_local_prices_public_read"
  ON public.subscription_local_prices;
CREATE POLICY "subscription_local_prices_public_read"
  ON public.subscription_local_prices FOR SELECT
  TO anon, authenticated
  USING (active = true);
REVOKE INSERT, UPDATE, DELETE ON public.subscription_local_prices
  FROM anon, authenticated;

COMMENT ON TABLE public.subscription_local_prices IS
  'Per-market subscription price derived from the USD catalog. The pricing page displays this row and checkout charges it.';

-- ── Currency rules: market, rate per USD, minor-unit exponent, rounding step ──
-- Baseline rates as of 2026-10-29. refresh_subscription_local_prices()
-- recomputes from fx_rates when fresher rates exist, so these are a seed.
CREATE OR REPLACE FUNCTION public.refresh_subscription_local_prices(
  p_rates jsonb DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer := 0;
BEGIN
  WITH rules(market_code, currency, rate, expo, step) AS (
    VALUES
      ('NG', 'NGN', 1550.00, 2, 100),
      ('US', 'USD',    1.00, 2, 1),
      ('GB', 'GBP',    0.79, 2, 1),
      ('CA', 'CAD',    1.38, 2, 1),
      ('AU', 'AUD',    1.52, 2, 1),
      ('DE', 'EUR',    0.92, 2, 1),
      ('FR', 'EUR',    0.92, 2, 1),
      ('IT', 'EUR',    0.92, 2, 1),
      ('ES', 'EUR',    0.92, 2, 1),
      ('NL', 'EUR',    0.92, 2, 1),
      ('IN', 'INR',   84.00, 2, 10),
      ('GH', 'GHS',   15.20, 2, 1),
      ('KE', 'KES',  129.00, 2, 50),
      ('ZA', 'ZAR',   18.20, 2, 1),
      ('JP', 'JPY',  152.00, 0, 100),
      ('BR', 'BRL',    5.42, 2, 1),
      ('SA', 'SAR',    3.75, 2, 1),
      ('AE', 'AED',    3.6725, 2, 1),
      ('CN', 'CNY',    7.12, 2, 1),
      ('ID', 'IDR', 15850.00, 0, 5000),
      ('MX', 'MXN',   18.20, 2, 1),
      ('KR', 'KRW', 1340.00, 0, 1000),
      ('ET', 'ETB',   57.50, 2, 10),
      ('EG', 'EGP',   48.50, 2, 10),
      ('TZ', 'TZS', 2700.00, 2, 1000),
      ('CI', 'XOF',  604.00, 0, 500),
      ('PL', 'PLN',    4.00, 2, 1),
      ('SE', 'SEK',   10.50, 2, 1),
      ('CH', 'CHF',    0.88, 2, 1),
      ('SG', 'SGD',    1.34, 2, 1),
      ('TR', 'TRY',   34.20, 2, 10),
      ('NZ', 'NZD',    1.66, 2, 1)
  ),
  live_rates AS (
    SELECT DISTINCT ON (quote_currency)
           quote_currency AS currency,
           rate
      FROM public.fx_rates
     WHERE base_currency = 'USD'
     ORDER BY quote_currency, fetched_at DESC
  ),
  resolved AS (
    SELECT r.market_code,
           r.currency,
           r.expo,
           r.step,
           COALESCE(
             (p_rates ->> r.currency)::numeric,
             lr.rate,
             r.rate
           ) AS rate,
           CASE WHEN p_rates ? r.currency THEN 'request'
                WHEN lr.rate IS NOT NULL THEN 'fx_rates'
                ELSE 'baseline' END AS source
      FROM rules r
      LEFT JOIN live_rates lr ON lr.currency = r.currency
  ),
  computed AS (
    SELECT res.market_code,
           p.plan,
           p.billing_cycle,
           res.currency,
           res.rate,
           res.source,
           -- Round the local major amount to the currency's tidy step.
           GREATEST(
             res.step,
             ROUND(((p.price_minor / 100.0) * res.rate) / res.step) * res.step
           ) * (10 ^ res.expo) AS price_minor
      FROM resolved res
      CROSS JOIN public.subscription_plan_prices p
     WHERE p.currency = 'USD'
       AND p.active = true
  )
  INSERT INTO public.subscription_local_prices
    (market_code, plan, billing_cycle, currency, price_minor,
     fx_rate, fx_source, active, updated_at)
  SELECT market_code, plan, billing_cycle, currency,
         ROUND(price_minor)::bigint, rate, source, true, now()
    FROM computed
  ON CONFLICT (market_code, plan, billing_cycle) DO UPDATE
    SET currency    = EXCLUDED.currency,
        price_minor = EXCLUDED.price_minor,
        fx_rate     = EXCLUDED.fx_rate,
        fx_source   = EXCLUDED.fx_source,
        active      = true,
        updated_at  = now();

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_subscription_local_prices(jsonb) FROM anon, authenticated;

-- Seed all 32 markets from the baseline rates.
SELECT public.refresh_subscription_local_prices();
