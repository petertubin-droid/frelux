-- =========================================================
-- US market: reference price book + market profile
--
-- Proves the international data model travels: a non-Nigeria
-- market with its own currency (USD) and price rows. Prices
-- are seeded national-average references (Oct 2026), clearly
-- marked and admin-editable; the crawler layer can replace
-- them with live US price data over time.
-- =========================================================

-- 1. US market profile (supported: it has prices).
INSERT INTO market_profiles (
  country_code, country_name, region,
  currency_code, currency_symbol, currency_name,
  default_measurement_system,
  supported_length_units, supported_area_units,
  default_length_unit, default_area_unit,
  default_language,
  local_terminology,
  status, profile_version, sort_order, is_visible
) VALUES (
  'US', 'United States', 'North America',
  'USD', '$', 'US Dollar',
  'imperial',
  '{feet,inches,meters}',
  '{sqft,sqm}',
  'feet', 'sqft',
  'en',
  '{}'::jsonb,
  'supported', '0.1.0', 30, true
)
ON CONFLICT (country_code) DO NOTHING;

-- 2. Seeded USD reference prices for every product quality tier.
--    Guarded by NOT EXISTS so re-running never duplicates rows.
INSERT INTO estimation_prices (price_type, ref_id, price, currency, market, notes)
SELECT
  'quality',
  q.id,
  seed.price,
  'USD',
  'US',
  'Seeded US reference price (national average, Oct 2026) — admin-editable'
FROM estimation_product_quality q
JOIN (VALUES
  ('economy', 18),
  ('standard', 28),
  ('premium', 45),
  ('high_quality', 65)
) AS seed(slug, price) ON seed.slug = q.slug
WHERE q.is_active
  AND NOT EXISTS (
    SELECT 1 FROM estimation_prices p
    WHERE p.ref_id = q.id AND p.market = 'US' AND p.is_active
  );
