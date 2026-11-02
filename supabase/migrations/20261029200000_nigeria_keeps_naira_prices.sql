-- =========================================================
-- Nigeria keeps its naira prices
--
-- FRELUX is Nigerian-owned and the domestic price list is a business
-- decision, not an FX conversion: Pro 5,000, Premium 15,000, Enterprise
-- 50,000 naira a month. The worldwide seed overwrote market NG with a
-- converted figure; market NG now copies the naira catalog exactly, the
-- way market US copies the dollar catalog.
-- =========================================================

-- Enterprise had no naira row, so its local price had no anchor to copy.
INSERT INTO public.subscription_plan_prices
  (plan, billing_cycle, currency, price_minor, price_kobo, active)
VALUES
  ('enterprise', 'monthly', 'NGN', 5000000, 5000000, true),
  ('enterprise', 'yearly',  'NGN', 50000000, 50000000, true)
ON CONFLICT (plan, billing_cycle, currency) DO UPDATE
  SET price_minor = EXCLUDED.price_minor,
      price_kobo  = EXCLUDED.price_kobo,
      active      = true;

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
           COALESCE((p_rates ->> r.currency)::numeric, lr.rate, r.rate) AS rate,
           CASE WHEN p_rates ? r.currency THEN 'request'
                WHEN lr.rate IS NOT NULL THEN 'fx_rates'
                ELSE 'baseline' END AS source
      FROM rules r
      LEFT JOIN live_rates lr ON lr.currency = r.currency
  ),
  converted AS (
    SELECT res.market_code,
           p.plan,
           p.billing_cycle,
           res.currency,
           res.rate,
           res.source,
           CASE
             -- The dollar price IS the catalog price: copy it untouched.
             WHEN res.currency = 'USD' THEN p.price_minor::numeric
             -- Everything else rounds up to its tidy step, so a market
             -- never undercuts the dollar price.
             ELSE CEIL(((p.price_minor / 100.0) * res.rate) / res.step)
                  * res.step * (10 ^ res.expo)
           END AS price_minor
      FROM resolved res
      CROSS JOIN public.subscription_plan_prices p
     WHERE p.currency = 'USD'
       AND p.active = true
  ),
  -- Nigeria sells at its own naira list, never a converted figure.
  domestic AS (
    SELECT 'NG'::text AS market_code,
           plan,
           billing_cycle,
           'NGN'::text AS currency,
           1::numeric AS rate,
           'ngn_catalog'::text AS source,
           price_minor::numeric AS price_minor
      FROM public.subscription_plan_prices
     WHERE currency = 'NGN'
       AND active = true
  ),
  all_rows AS (
    SELECT * FROM converted
    UNION ALL
    SELECT * FROM domestic
  )
  INSERT INTO public.subscription_local_prices
    (market_code, plan, billing_cycle, currency, price_minor,
     fx_rate, fx_source, active, updated_at)
  SELECT DISTINCT ON (market_code, plan, billing_cycle)
         market_code, plan, billing_cycle, currency,
         ROUND(price_minor)::bigint, rate, source, true, now()
    FROM all_rows
   ORDER BY market_code, plan, billing_cycle,
            (source = 'ngn_catalog') DESC
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

SELECT public.refresh_subscription_local_prices();
