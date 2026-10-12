-- =========================================================
-- 20261013000000_international_expansion_markets.sql
--
-- Register five new markets through the existing phase40
-- international architecture (additive only, no destructive
-- changes): JP, FR, BR, SA, AE.
--
-- Client builtins already ship these profiles
-- (src/lib/international/market-context.tsx); this seeds the
-- market_profiles mirror so admin/server code sees them too.
-- ON CONFLICT DO NOTHING keeps reruns safe.
-- =========================================================

INSERT INTO market_profiles (
  country_code, country_name, region,
  currency_code, currency_symbol, currency_name,
  default_measurement_system,
  supported_length_units, supported_area_units,
  default_length_unit, default_area_unit,
  default_language,
  local_terminology,
  status, inherits_from, profile_version, sort_order, is_visible, admin_notes
) VALUES
  (
    'JP', 'Japan', 'East Asia',
    'JPY', '¥', 'Japanese Yen',
    'metric',
    '{meters,feet,inches}', '{sqm,sqft}',
    'meters', 'sqm',
    'en',
    '{
      "paint_bucket": "18L can",
      "cement_bag": "25kg bag",
      "white_cement_bag": "20kg bag",
      "screeding_mix": "Plaster (sand + cement)",
      "tile_carton": "box",
      "pop_bag": "plasterboard sheet"
    }'::jsonb,
    'active', NULL, '1.0.0', 110, true,
    'Registered 2026-10-13 international expansion; metric, JPY, 1 tsubo = 3.306 m2 (display only).'
  ),
  (
    'FR', 'France', 'Europe',
    'EUR', '€', 'Euro',
    'metric',
    '{meters,feet,inches}', '{sqm,sqft}',
    'meters', 'sqm',
    'fr',
    '{
      "paint_bucket": "pot 12L",
      "cement_bag": "sac 25kg",
      "white_cement_bag": "sac 25kg",
      "screeding_mix": "Enduit de plâtre",
      "tile_carton": "colis",
      "pop_bag": "plaque de plâtre BA13"
    }'::jsonb,
    'active', 'DE', '1.0.0', 120, true,
    'Registered 2026-10-13 international expansion; inherits EU plasterboard conventions from DE where unspecified.'
  ),
  (
    'BR', 'Brazil', 'South America',
    'BRL', 'R$', 'Brazilian Real',
    'metric',
    '{meters,feet,inches}', '{sqm,sqft}',
    'meters', 'sqm',
    'pt',
    '{
      "paint_bucket": "lata 18L",
      "cement_bag": "saco 50kg",
      "white_cement_bag": "saco 40kg",
      "screeding_mix": "Massa corrida / gesso",
      "tile_carton": "caixa",
      "pop_bag": "placa de gesso"
    }'::jsonb,
    'active', NULL, '1.0.0', 130, true,
    'Registered 2026-10-13 international expansion; metric, BRL, Portuguese terminology with English equivalents in UI.'
  ),
  (
    'SA', 'Saudi Arabia', 'Middle East',
    'SAR', '﷼', 'Saudi Riyal',
    'metric',
    '{meters,feet,inches}', '{sqm,sqft}',
    'meters', 'sqm',
    'ar',
    '{
      "paint_bucket": "bucket 18L",
      "cement_bag": "50kg bag",
      "white_cement_bag": "40kg bag",
      "screeding_mix": "Gypsum plaster / cement render",
      "tile_carton": "carton",
      "pop_bag": "gypsum board sheet"
    }'::jsonb,
    'active', NULL, '1.0.0', 140, true,
    'Registered 2026-10-13 international expansion; metric, SAR, heat/exposure-aware exterior systems.'
  ),
  (
    'AE', 'United Arab Emirates', 'Middle East',
    'AED', 'د.إ', 'UAE Dirham',
    'metric',
    '{meters,feet,inches}', '{sqm,sqft}',
    'meters', 'sqm',
    'en',
    '{
      "paint_bucket": "bucket 20L",
      "cement_bag": "50kg bag",
      "white_cement_bag": "40kg bag",
      "screeding_mix": "Gypsum plaster / skim coat",
      "tile_carton": "carton",
      "pop_bag": "gypsum board sheet"
    }'::jsonb,
    'active', 'SA', '1.0.0', 150, true,
    'Registered 2026-10-13 international expansion; metric, AED; inherits GCC conventions from SA where unspecified.'
  )
ON CONFLICT (country_code) DO NOTHING;

-- Calculator availability: the four core finishing calculators are
-- geometry engines and run everywhere (prices resolve
-- market-first; unpriced items surface as unverified, never NG
-- silent substitution). Other estimator types stay unavailable
-- until their market config + prices land (per-phase honesty).
INSERT INTO market_calculator_config (
  market_code, calculator_type, is_available, config, labels, config_version
)
SELECT v.market_code, v.calculator_type, true, '{}'::jsonb, '{}'::jsonb, '1.0.0'
FROM (VALUES
  ('JP', 'painting'), ('JP', 'screeding'), ('JP', 'pop_ceiling'), ('JP', 'tile'),
  ('FR', 'painting'), ('FR', 'screeding'), ('FR', 'pop_ceiling'), ('FR', 'tile'),
  ('BR', 'painting'), ('BR', 'screeding'), ('BR', 'pop_ceiling'), ('BR', 'tile'),
  ('SA', 'painting'), ('SA', 'screeding'), ('SA', 'pop_ceiling'), ('SA', 'tile'),
  ('AE', 'painting'), ('AE', 'screeding'), ('AE', 'pop_ceiling'), ('AE', 'tile')
) AS v(market_code, calculator_type)
ON CONFLICT (market_code, calculator_type) DO NOTHING;
