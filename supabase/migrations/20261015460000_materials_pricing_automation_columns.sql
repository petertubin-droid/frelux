-- ==========================================================================
-- Migration: 20261015460000_materials_pricing_automation_columns.sql
-- Automatic Pricing Updates Across 20+ Countries:
--   1. base_price: The manual fallback price.
--   2. last_updated_via: Source identifier ('api', 'crowdsourced', or 'manual').
--   3. regional_multiplier: Country/city-specific modifier scaling base cost
--      based on real-time proximity or local inflation metrics.
-- ==========================================================================

-- 1. Update public.material_prices (core Materials table)
ALTER TABLE public.material_prices
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS last_updated_via TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS regional_multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1.0000;

-- Backfill base_price from price where null
UPDATE public.material_prices
SET base_price = price
WHERE base_price IS NULL;

-- Ensure constraint for last_updated_via
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_material_prices_last_updated_via'
  ) THEN
    ALTER TABLE public.material_prices
      ADD CONSTRAINT chk_material_prices_last_updated_via
      CHECK (last_updated_via IN ('api', 'crowdsourced', 'manual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_material_prices_regional_multiplier_pos'
  ) THEN
    ALTER TABLE public.material_prices
      ADD CONSTRAINT chk_material_prices_regional_multiplier_pos
      CHECK (regional_multiplier > 0);
  END IF;
END $$;

-- 2. Update public.market_pricing (international 20+ countries pricing table)
ALTER TABLE public.market_pricing
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS last_updated_via TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS regional_multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1.0000;

UPDATE public.market_pricing
SET base_price = price
WHERE base_price IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_market_pricing_last_updated_via'
  ) THEN
    ALTER TABLE public.market_pricing
      ADD CONSTRAINT chk_market_pricing_last_updated_via
      CHECK (last_updated_via IN ('api', 'crowdsourced', 'manual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_market_pricing_regional_multiplier_pos'
  ) THEN
    ALTER TABLE public.market_pricing
      ADD CONSTRAINT chk_market_pricing_regional_multiplier_pos
      CHECK (regional_multiplier > 0);
  END IF;
END $$;

-- 3. Update public.material_catalog
ALTER TABLE public.material_catalog
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_updated_via TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS regional_multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1.0000;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_material_catalog_last_updated_via'
  ) THEN
    ALTER TABLE public.material_catalog
      ADD CONSTRAINT chk_material_catalog_last_updated_via
      CHECK (last_updated_via IN ('api', 'crowdsourced', 'manual'));
  END IF;
END $$;

-- 4. Update public.estimation_materials
ALTER TABLE public.estimation_materials
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_updated_via TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS regional_multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1.0000;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_estimation_materials_last_updated_via'
  ) THEN
    ALTER TABLE public.estimation_materials
      ADD CONSTRAINT chk_estimation_materials_last_updated_via
      CHECK (last_updated_via IN ('api', 'crowdsourced', 'manual'));
  END IF;
END $$;

-- 5. Core table public.materials alias/standalone
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  unit TEXT NOT NULL DEFAULT 'unit',
  price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  base_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  market_code TEXT DEFAULT 'GLOBAL',
  last_updated_via TEXT NOT NULL DEFAULT 'manual' CHECK (last_updated_via IN ('api', 'crowdsourced', 'manual')),
  regional_multiplier NUMERIC(8, 4) NOT NULL DEFAULT 1.0000 CHECK (regional_multiplier > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_mkt ON public.materials(market_code, is_active);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category, is_active);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "materials_public_read" ON public.materials;
CREATE POLICY "materials_public_read" ON public.materials FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "materials_admin_all" ON public.materials;
CREATE POLICY "materials_admin_all" ON public.materials FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Helper function: compute scaled material cost
CREATE OR REPLACE FUNCTION public.fn_compute_scaled_material_price(
  p_base_price NUMERIC,
  p_multiplier NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  RETURN round(coalesce(p_base_price, 0) * coalesce(p_multiplier, 1.0000), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
