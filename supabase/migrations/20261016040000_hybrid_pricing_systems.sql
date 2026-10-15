-- ==========================================================================
-- Migration: 20261016040000_hybrid_pricing_systems.sql
-- Hybrid Pricing Systems:
--   A. The Fluctuation Filter (Macro Tracker)
--   B. The Closed-Loop Crowdsourcing Engine
--   C. Localized Supplier Onboarding & Live Inventory
-- ==========================================================================

-- 1. System A: Macro Economic Indicators & Elasticity Rules
CREATE TABLE IF NOT EXISTS public.macro_economic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code TEXT NOT NULL, -- e.g. KE, NG, GH, ZA
  country_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  indicator_type TEXT NOT NULL, -- steel, cement, fuel_transport, timber, sand_gravel, roofing_sheet, general_inflation
  headline_name TEXT NOT NULL,
  current_index_value NUMERIC(12, 4) NOT NULL,
  baseline_index_value NUMERIC(12, 4) NOT NULL,
  pct_change_30d NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  pct_change_90d NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  pct_change_yoy NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  source_name TEXT NOT NULL,
  source_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_macro_market_indicator UNIQUE (market_code, indicator_type)
);

CREATE TABLE IF NOT EXISTS public.macro_elasticity_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code TEXT NOT NULL,
  material_category TEXT NOT NULL,
  commodity_trigger TEXT NOT NULL,
  elasticity_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.00, -- e.g. 1.0 for 1:1, 0.6 for 60% passthrough
  activation_threshold_pct NUMERIC(4, 2) NOT NULL DEFAULT 3.00, -- e.g. 3% spike before applying
  ceiling_adjustment_pct NUMERIC(4, 2) NOT NULL DEFAULT 25.00, -- e.g. 25% max auto adjustment
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_elasticity_rule UNIQUE (market_code, material_category, commodity_trigger)
);

-- 2. System B: Closed-Loop Crowdsourcing
CREATE TABLE IF NOT EXISTS public.crowdsourced_material_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id TEXT, -- anonymized user hash
  project_id UUID,
  market_code TEXT NOT NULL,
  city TEXT,
  material_category TEXT NOT NULL,
  material_name TEXT NOT NULL,
  material_slug TEXT NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unit',
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  is_outlier BOOLEAN NOT NULL DEFAULT false,
  opt_in_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crowdsourced_market_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code TEXT NOT NULL,
  city TEXT,
  material_slug TEXT NOT NULL,
  material_name TEXT NOT NULL,
  sample_size INTEGER NOT NULL DEFAULT 0,
  median_price NUMERIC(14, 2) NOT NULL,
  trimmed_mean_price NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL,
  unit TEXT NOT NULL,
  quorum_threshold INTEGER NOT NULL DEFAULT 10,
  quorum_status TEXT NOT NULL DEFAULT 'insufficient_data', -- insufficient_data, quorum_reached, promoted
  is_promoted BOOLEAN NOT NULL DEFAULT false,
  window_days INTEGER NOT NULL DEFAULT 30,
  last_promoted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_benchmark_market_slug_city UNIQUE (market_code, material_slug, city)
);

-- 3. System C: Localized Supplier Inventory & Profiles
CREATE TABLE IF NOT EXISTS public.supplier_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  country_name TEXT,
  market_code TEXT NOT NULL,
  city TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  business_reg_no TEXT,
  tax_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified', -- unverified, pending, verified, rejected
  verification_tier TEXT DEFAULT 'tier1_basic',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  delivery_radius_km NUMERIC(6, 1) DEFAULT 25.0,
  rating NUMERIC(3, 2) DEFAULT 5.00,
  total_quotes_served INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  market_code TEXT NOT NULL,
  material_category TEXT NOT NULL,
  category TEXT,
  material_slug TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand_name TEXT,
  brand TEXT,
  sku TEXT,
  description TEXT,
  unit TEXT NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL,
  minimum_order_qty INTEGER DEFAULT 1,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  stock_status TEXT NOT NULL DEFAULT 'in_stock', -- in_stock, low_stock, out_of_stock
  lead_time_days INTEGER DEFAULT 1,
  delivery_available BOOLEAN DEFAULT true,
  bulk_discount_threshold INTEGER,
  bulk_discount_pct NUMERIC(5, 2),
  notes TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_macro_indicators_mkt ON public.macro_economic_indicators(market_code);
CREATE INDEX IF NOT EXISTS idx_macro_rules_mkt ON public.macro_elasticity_rules(market_code, material_category);
CREATE INDEX IF NOT EXISTS idx_crowd_expenses_lookup ON public.crowdsourced_material_expenses(market_code, material_slug, created_at);
CREATE INDEX IF NOT EXISTS idx_crowd_benchmarks_lookup ON public.crowdsourced_market_benchmarks(market_code, material_slug);
CREATE INDEX IF NOT EXISTS idx_supplier_inventory_mkt_slug ON public.supplier_inventory_items(market_code, material_slug, is_active);
CREATE INDEX IF NOT EXISTS idx_supplier_profiles_mkt ON public.supplier_profiles(market_code, is_active);

-- Enable RLS
ALTER TABLE public.macro_economic_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_elasticity_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crowdsourced_material_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crowdsourced_market_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_inventory_items ENABLE ROW LEVEL SECURITY;

-- Macro Indicators & Rules RLS
DROP POLICY IF EXISTS "Public read macro indicators" ON public.macro_economic_indicators;
CREATE POLICY "Public read macro indicators" ON public.macro_economic_indicators FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read macro elasticity rules" ON public.macro_elasticity_rules;
CREATE POLICY "Public read macro elasticity rules" ON public.macro_elasticity_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage macro indicators" ON public.macro_economic_indicators;
CREATE POLICY "Admins manage macro indicators" ON public.macro_economic_indicators FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage macro elasticity rules" ON public.macro_elasticity_rules;
CREATE POLICY "Admins manage macro elasticity rules" ON public.macro_elasticity_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Crowdsourced Benchmarks & Expenses RLS
DROP POLICY IF EXISTS "Public read crowdsourced benchmarks" ON public.crowdsourced_market_benchmarks;
CREATE POLICY "Public read crowdsourced benchmarks" ON public.crowdsourced_market_benchmarks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage crowdsourced benchmarks" ON public.crowdsourced_market_benchmarks;
CREATE POLICY "Admins manage crowdsourced benchmarks" ON public.crowdsourced_market_benchmarks FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Contractors submit sanitized expenses
DROP POLICY IF EXISTS "Contractors can submit sanitized expenses" ON public.crowdsourced_material_expenses;
CREATE POLICY "Contractors can submit sanitized expenses" ON public.crowdsourced_material_expenses
  FOR INSERT WITH CHECK (opt_in_verified = true);
DROP POLICY IF EXISTS "Admins read crowdsourced expenses" ON public.crowdsourced_material_expenses;
CREATE POLICY "Admins read crowdsourced expenses" ON public.crowdsourced_material_expenses
  FOR SELECT TO authenticated USING (public.is_admin());

-- Supplier Profiles RLS
DROP POLICY IF EXISTS "Public read verified supplier profiles" ON public.supplier_profiles;
CREATE POLICY "Public read verified supplier profiles" ON public.supplier_profiles
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Suppliers can manage own profile" ON public.supplier_profiles;
CREATE POLICY "Suppliers can manage own profile" ON public.supplier_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Supplier Inventory Items RLS
DROP POLICY IF EXISTS "Public read active supplier inventory" ON public.supplier_inventory_items;
CREATE POLICY "Public read active supplier inventory" ON public.supplier_inventory_items
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Suppliers can manage own inventory" ON public.supplier_inventory_items;
CREATE POLICY "Suppliers can manage own inventory" ON public.supplier_inventory_items
  FOR ALL TO authenticated
  USING (
    supplier_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid()) OR public.is_admin()
  )
  WITH CHECK (
    supplier_id IN (SELECT id FROM public.supplier_profiles WHERE user_id = auth.uid()) OR public.is_admin()
  );

-- Self-healing Crowdsourced Aggregation Trigger
CREATE OR REPLACE FUNCTION public.fn_refresh_crowdsourced_benchmark()
RETURNS TRIGGER AS $$
DECLARE
  v_sample_size INTEGER;
  v_median NUMERIC(14, 2);
  v_mean NUMERIC(14, 2);
  v_quorum INTEGER := 10;
BEGIN
  -- Aggregate recent sanitized submissions (last 30 days)
  SELECT
    count(*),
    coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY unit_price), 0),
    coalesce(avg(unit_price), 0)
  INTO
    v_sample_size,
    v_median,
    v_mean
  FROM public.crowdsourced_material_expenses
  WHERE market_code = NEW.market_code
    AND material_slug = NEW.material_slug
    AND opt_in_verified = true
    AND is_outlier = false
    AND created_at >= (now() - interval '30 days');

  -- Upsert into public.crowdsourced_market_benchmarks
  INSERT INTO public.crowdsourced_market_benchmarks (
    market_code,
    city,
    material_slug,
    material_name,
    sample_size,
    median_price,
    trimmed_mean_price,
    currency,
    unit,
    quorum_threshold,
    quorum_status,
    is_promoted,
    last_promoted_at,
    updated_at
  ) VALUES (
    NEW.market_code,
    NEW.city,
    NEW.material_slug,
    NEW.material_name,
    v_sample_size,
    v_median,
    v_mean,
    NEW.currency,
    NEW.unit,
    v_quorum,
    CASE WHEN v_sample_size >= v_quorum THEN 'promoted' ELSE 'insufficient_data' END,
    (v_sample_size >= v_quorum),
    CASE WHEN v_sample_size >= v_quorum THEN now() ELSE null END,
    now()
  )
  ON CONFLICT (market_code, material_slug, city)
  DO UPDATE SET
    sample_size = EXCLUDED.sample_size,
    median_price = EXCLUDED.median_price,
    trimmed_mean_price = EXCLUDED.trimmed_mean_price,
    quorum_status = EXCLUDED.quorum_status,
    is_promoted = EXCLUDED.is_promoted,
    last_promoted_at = CASE WHEN EXCLUDED.is_promoted THEN now() ELSE crowdsourced_market_benchmarks.last_promoted_at END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_crowdsource_expense_refresh ON public.crowdsourced_material_expenses;
CREATE TRIGGER trg_crowdsource_expense_refresh
  AFTER INSERT OR UPDATE ON public.crowdsourced_material_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_refresh_crowdsourced_benchmark();
