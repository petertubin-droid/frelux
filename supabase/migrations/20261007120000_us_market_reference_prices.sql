-- =========================================================
-- US market: reference price book + market profile
--
-- Proves the international data model travels: a non-Nigeria
-- market with its own currency (USD) and price rows. Prices
-- are seeded national-average references (Oct 2026), clearly
-- marked and admin-editable; the crawler layer can replace
-- them with live US price data over time.
-- =========================================================

-- 1. US market profile (active: it has prices).
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
  'active', '0.1.0', 30, true
)
ON CONFLICT (country_code) DO UPDATE SET
  region = EXCLUDED.region,
  currency_code = EXCLUDED.currency_code,
  currency_symbol = EXCLUDED.currency_symbol,
  currency_name = EXCLUDED.currency_name,
  default_measurement_system = EXCLUDED.default_measurement_system,
  supported_length_units = EXCLUDED.supported_length_units,
  supported_area_units = EXCLUDED.supported_area_units,
  default_length_unit = EXCLUDED.default_length_unit,
  default_area_unit = EXCLUDED.default_area_unit,
  default_language = EXCLUDED.default_language,
  local_terminology = EXCLUDED.local_terminology,
  status = EXCLUDED.status,
  inherits_from = NULL,
  profile_version = EXCLUDED.profile_version,
  sort_order = EXCLUDED.sort_order,
  is_visible = EXCLUDED.is_visible,
  admin_notes = 'Active: seeded USD reference price book (national averages, Oct 2026). Admin-editable; crawler layer can replace with live US price data.',
  updated_at = now();

-- 2. Seeded USD reference prices for the materials that carry the NG
--    price book (the live price model). Guarded by NOT EXISTS so
--    re-running never duplicates rows; admin-editable from day one.
INSERT INTO estimation_prices (price_type, ref_id, price, currency, market, notes)
SELECT
  'material',
  m.id,
  seed.price,
  'USD',
  'US',
  'Seeded US reference price (national average, Oct 2026) — admin-editable'
FROM estimation_materials m
JOIN (VALUES
  ('cement', 8.50),        -- 50kg bag
  ('sand', 15.00),         -- per tonne delivered
  ('acrylic-bond', 28.00), -- bonding agent, per gallon
  ('water-seal', 32.00),   -- waterproofing compound, per gallon
  ('anti-fungal', 22.00)   -- fungicidal treatment, per gallon
) AS seed(slug, price) ON seed.slug = m.slug
WHERE m.is_active
  AND NOT EXISTS (
    SELECT 1 FROM estimation_prices p
    WHERE p.ref_id = m.id AND p.market = 'US' AND p.is_active
  );
