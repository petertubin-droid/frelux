-- =========================================================
-- Mineral Stone Calculation Engine (Phase 3)
-- =========================================================
-- Adds product-level material calculation models to the existing
-- Phase 1 estimation infrastructure. Reuses estimation_products,
-- estimation_product_quality, estimation_pack_sizes, estimation_prices
-- and estimation_calc_rules. No new engine tables, no seed products
-- (verified product data must be entered by an admin — no placeholders).
--
-- Calculation models supported per application profile
-- (estimation_product_quality row):
--   coverage_based  : Model A — area per package
--                     packages = (area × coats) / coverage
--                     coverage_min/coverage_max give the m²-per-package range
--   mass_per_area   : Model B — mass per area
--                     kg = area × coats × consumption (kg/m²)
--                     packages = kg / package_kg
--   volume_per_area : Model C — volume per area (L/m²), same shape as
--                     mass_per_area with a volumetric consumption unit
--
-- Ranges: coverage_min/coverage_max and consumption_min/consumption_max are
-- nullable. NULL min or max falls back to the legacy single `coverage`
-- column when present (min = max = coverage, an exact quantity, not a range).
-- A profile with no model, or a model without its required values, is an
-- incomplete configuration: the engine refuses to calculate and reports a
-- data-requirement warning (never a guessed value).
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. estimation_products: brand + product notes
-- ─────────────────────────────────────────────
ALTER TABLE estimation_products
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS product_notes text,
  ADD COLUMN IF NOT EXISTS technical_spec text;

COMMENT ON COLUMN estimation_products.brand IS 'Manufacturer / brand name (nullable until configured)';
COMMENT ON COLUMN estimation_products.product_notes IS 'Product-specific application notes shown with results';
COMMENT ON COLUMN estimation_products.technical_spec IS 'Verified technical specification summary + source reference';

-- ─────────────────────────────────────────────
-- 2. estimation_product_quality: material model + ranges
-- ─────────────────────────────────────────────
ALTER TABLE estimation_product_quality
  ADD COLUMN IF NOT EXISTS calculation_model text
    CHECK (calculation_model IN ('coverage_based', 'mass_per_area', 'volume_per_area')),
  ADD COLUMN IF NOT EXISTS coverage_min numeric CHECK (coverage_min > 0),
  ADD COLUMN IF NOT EXISTS coverage_max numeric CHECK (coverage_max > 0),
  ADD COLUMN IF NOT EXISTS consumption_min numeric CHECK (consumption_min > 0),
  ADD COLUMN IF NOT EXISTS consumption_max numeric CHECK (consumption_max > 0),
  ADD COLUMN IF NOT EXISTS consumption_unit text,
  ADD COLUMN IF NOT EXISTS default_coats int CHECK (default_coats > 0),
  ADD COLUMN IF NOT EXISTS waste_percentage numeric CHECK (waste_percentage >= 0 AND waste_percentage < 100);

COMMENT ON COLUMN estimation_product_quality.calculation_model IS 'Material calculation model: coverage_based (area/package), mass_per_area (kg/m²) or volume_per_area (L/m²). NULL = incomplete configuration.';
COMMENT ON COLUMN estimation_product_quality.coverage_min IS 'Model A minimum coverage (m² per package) — thin/light application';
COMMENT ON COLUMN estimation_product_quality.coverage_max IS 'Model A maximum coverage (m² per package) — heavy application uses more material, i.e. lower coverage; min/max refer to the coverage RANGE';
COMMENT ON COLUMN estimation_product_quality.consumption_min IS 'Model B minimum consumption in consumption_unit per m² per coat';
COMMENT ON COLUMN estimation_product_quality.consumption_max IS 'Model B maximum consumption in consumption_unit per m² per coat';
COMMENT ON COLUMN estimation_product_quality.default_coats IS 'Configured number of coats/layers for this application profile. NULL = not configured (engine will not guess).';
COMMENT ON COLUMN estimation_product_quality.waste_percentage IS 'Configured waste allowance (%) for this application profile. NULL = not configured (raw quantities shown with a warning).';

-- Impossible-range guards (min must not exceed max)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'est_quality_coverage_range_check'
  ) THEN
    ALTER TABLE estimation_product_quality
      ADD CONSTRAINT est_quality_coverage_range_check
      CHECK (coverage_min IS NULL OR coverage_max IS NULL OR coverage_min <= coverage_max);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'est_quality_consumption_range_check'
  ) THEN
    ALTER TABLE estimation_product_quality
      ADD CONSTRAINT est_quality_consumption_range_check
      CHECK (consumption_min IS NULL OR consumption_max IS NULL OR consumption_min <= consumption_max);
  END IF;
END
$$;

-- ─────────────────────────────────────────────
-- 3. Engine calc rules (defaults only, admin-editable)
--    Rule values are DEFAULTS of the engine, not product data.
--    Product data lives on estimation_products / _quality rows.
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('purchase_rounding_rule', 'mineral_stone',
   '{"rule": "ceil"}'::jsonb, 'verified_frelux',
   'Mineral Stone purchase quantities are rounded UP to whole purchasable packages (buckets/bags).', true),
  ('require_verified_configuration', 'mineral_stone',
   '{"required": true}'::jsonb, 'verified_frelux',
   'The engine must refuse to calculate when the selected product profile lacks a configured model, coverage/consumption values, coat count or package size. No guessed values.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('purchase_rounding_rule', 'stucco',
   '{"rule": "ceil"}'::jsonb, 'verified_frelux',
   'Stucco purchase quantities are rounded UP to whole purchasable packages (buckets/bags).', true),
  ('require_verified_configuration', 'stucco',
   '{"required": true}'::jsonb, 'verified_frelux',
   'The Stucco engine must refuse to calculate when the selected product profile lacks required configuration. No guessed values.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- ─────────────────────────────────────────────
-- 4. Category values
--    estimation_products.category is free text: 'mineral_stone' and
--    'stucco' are used by the new engines. No CHECK change required.
-- ─────────────────────────────────────────────

-- No seed products. Verified Mineral Stone / Stucco products must be
-- configured through the Admin Estimation Products pane. Profiles
-- without a calculation model stay incomplete by design.
