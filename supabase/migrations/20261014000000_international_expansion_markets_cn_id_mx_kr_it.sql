-- Add CN, ID, MX, KR and IT through the existing market_profiles schema.
-- Configuration intentionally describes units and terminology only; price and
-- manufacturer specifications remain unavailable until verified source data is loaded.
-- Calculator pricing stays unavailable unless a validated market price exists.

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
  ('CN', 'China', 'East Asia', 'CNY', '¥', 'Chinese Yuan', 'metric',
   '{meters,millimeters}', '{sqm}', 'meters', 'sqm', 'zh',
   '{"paint_bucket":"paint can (size requires source verification)","cement_bag":"bag (size requires source verification)","screeding_mix":"wall putty / plaster (product-specific data unavailable)","tile_carton":"box","pop_bag":"gypsum board sheet (dimensions require source verification)","waterproofing":"waterproof coating","tile_adhesive":"tile adhesive"}'::jsonb,
   'active', NULL, '1.0.0', 160, true,
   'Market profile only. No local product specifications or prices validated yet; calculators remain unavailable until verified market data is configured.'),
  ('ID', 'Indonesia', 'Southeast Asia', 'IDR', 'Rp', 'Indonesian Rupiah', 'metric',
   '{meters,millimeters}', '{sqm}', 'meters', 'sqm', 'id',
   '{"paint_bucket":"paint pail (size requires source verification)","cement_bag":"cement sack (size requires source verification)","screeding_mix":"skim coat / plaster (product-specific data unavailable)","tile_carton":"box","pop_bag":"gypsum board sheet (dimensions require source verification)","waterproofing":"waterproof coating","tile_adhesive":"tile adhesive"}'::jsonb,
   'active', NULL, '1.0.0', 170, true,
   'Market profile only. No local product specifications or prices validated yet; calculators remain unavailable until verified market data is configured.'),
  ('MX', 'Mexico', 'Americas', 'MXN', 'MX$', 'Mexican Peso', 'metric',
   '{meters,centimeters}', '{sqm}', 'meters', 'sqm', 'es',
   '{"paint_bucket":"paint pail (size requires source verification)","cement_bag":"cement sack (size requires source verification)","screeding_mix":"plaster / gypsum finishing product (product-specific data unavailable)","tile_carton":"box","pop_bag":"gypsum board sheet (dimensions require source verification)","waterproofing":"waterproofing product","tile_adhesive":"tile adhesive"}'::jsonb,
   'active', NULL, '1.0.0', 180, true,
   'Market profile only. No local product specifications or prices validated yet; calculators remain unavailable until verified market data is configured.'),
  ('KR', 'South Korea', 'East Asia', 'KRW', '₩', 'South Korean Won', 'metric',
   '{meters,millimeters}', '{sqm}', 'meters', 'sqm', 'ko',
   '{"paint_bucket":"paint container (size requires source verification)","cement_bag":"cement bag (size requires source verification)","screeding_mix":"putty / plaster (product-specific data unavailable)","tile_carton":"box","pop_bag":"gypsum board sheet (dimensions require source verification)","waterproofing":"waterproofing product","tile_adhesive":"tile adhesive"}'::jsonb,
   'active', NULL, '1.0.0', 190, true,
   'Market profile only. No local product specifications or prices validated yet; calculators remain unavailable until verified market data is configured.'),
  ('IT', 'Italy', 'Europe', 'EUR', '€', 'Euro', 'metric',
   '{meters,millimeters}', '{sqm}', 'meters', 'sqm', 'it',
   '{"paint_bucket":"paint can (size requires source verification)","cement_bag":"sack (size requires source verification)","screeding_mix":"plaster / finishing coat (product-specific data unavailable)","tile_carton":"box","pop_bag":"gypsum board sheet (dimensions require source verification)","waterproofing":"waterproofing product","tile_adhesive":"tile adhesive"}'::jsonb,
   'active', 'DE', '1.0.0', 200, true,
   'Market profile only. No Italy-specific prices or product specifications validated yet; German profile inheritance does not imply verified local data.')
ON CONFLICT (country_code) DO NOTHING;
