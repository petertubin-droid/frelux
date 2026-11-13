-- =========================================================
-- Readiness: how deep is each market's price book?
--
-- Eleven markets (AT, BE, DK, FI, IE, MY, NO, PH, PK, PT, TH) carry a skeleton
-- book of 8 to 24 priced lines, against 74 to 109 for the established
-- markets. "Active" was hiding that: a quote there would lean on almost no
-- local pricing, so calculators stay unverified for them and no market page is
-- published. Depth is now part of readiness, with the row count named.
--
-- Rollback: 20261112300000_market_readiness_depth_rollback.sql
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_market_readiness()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  WITH per_market AS (
    SELECT
      mp.country_code AS market_code,
      mp.country_name,
      mp.currency_code AS currency,
      mp.status,
      mp.ui_locale,
      mp.translation_pending,
      (SELECT count(*) FROM public.subscription_local_prices l
        WHERE l.market_code = mp.country_code AND l.active) AS priced_rows,
      (SELECT round(extract(epoch FROM now() - f.fetched_at) / 86400)
         FROM public.fx_rates f
        WHERE f.base_currency = 'USD' AND f.quote_currency = mp.currency_code
        ORDER BY f.fetched_at DESC LIMIT 1) AS rate_age_days,
      public.currency_is_chargeable(mp.currency_code) AS local_currency_chargeable,
      (SELECT count(*) FROM public.tax_jurisdiction_rules r
        WHERE r.market_code = mp.country_code AND r.is_active) AS tax_rules,
      (SELECT count(*) FROM public.market_material_prices m
        WHERE m.market = mp.country_code) AS material_rows,
      (SELECT count(*) FROM public.estimation_prices e
        WHERE e.market = mp.country_code AND e.is_active) AS estimation_rows
    FROM public.market_profiles mp
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'market_code', m.market_code,
    'country_name', m.country_name,
    'currency', m.currency,
    'status', m.status,
    'ui_locale', m.ui_locale,
    'translation_pending', m.translation_pending,
    'priced_rows', m.priced_rows,
    'rate_age_days', m.rate_age_days,
    'local_currency_chargeable', m.local_currency_chargeable,
    'tax_rules', m.tax_rules,
    'material_rows', m.material_rows,
    'estimation_rows', m.estimation_rows,
    'pricebook_depth', CASE
      WHEN m.estimation_rows >= 30 THEN 'local'
      WHEN m.estimation_rows > 0 THEN 'thin'
      ELSE 'none'
    END,
    'readiness', CASE
      WHEN m.priced_rows = 0 THEN 'blocked'
      WHEN m.currency <> 'USD' AND (m.rate_age_days IS NULL OR m.rate_age_days > 7) THEN 'limited'
      WHEN NOT m.local_currency_chargeable THEN 'limited'
      WHEN m.tax_rules = 0 THEN 'limited'
      WHEN m.material_rows = 0 OR m.estimation_rows = 0 THEN 'limited'
      WHEN m.estimation_rows < 30 THEN 'limited'
      ELSE 'ready'
    END,
    'reasons', (
      SELECT coalesce(jsonb_agg(reason ORDER BY reason), '[]'::jsonb) FROM (
        SELECT 'no local price' AS reason WHERE m.priced_rows = 0
        UNION ALL
        SELECT 'no fx rate' WHERE m.currency <> 'USD' AND m.rate_age_days IS NULL
        UNION ALL
        SELECT 'stale fx rate' WHERE m.rate_age_days IS NOT NULL AND m.rate_age_days > 7
        UNION ALL
        SELECT 'currency not collectable: charged in USD' WHERE NOT m.local_currency_chargeable
        UNION ALL
        SELECT 'no tax rules: quotes say tax not determined' WHERE m.tax_rules = 0
        UNION ALL
        SELECT 'no material prices' WHERE m.material_rows = 0
        UNION ALL
        SELECT 'no estimation prices' WHERE m.estimation_rows = 0
        UNION ALL
        SELECT 'price book thin: ' || m.estimation_rows
               || ' rows, local pricing needed'
         WHERE m.estimation_rows > 0 AND m.estimation_rows < 30
      ) r
    )
  ) ORDER BY m.market_code), '[]'::jsonb)
  INTO v
  FROM per_market m;

  RETURN v;
END;
$$;

COMMENT ON FUNCTION public.admin_market_readiness() IS
  'Per-market evidence behind the funnel: priced, rate freshness, currency collectability, tax rules, price books, and the interface locale actually rendered.';

REVOKE ALL ON FUNCTION public.admin_market_readiness() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_market_readiness() TO authenticated, service_role;
