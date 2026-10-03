-- =========================================================
-- Circular/Reuse Engine (Future Engine 9 — material recovery
-- and reuse from demolitions)
-- =========================================================
-- Computes recovered, reused, recycled and landfilled
-- quantities for a demolition or strip-out, from
-- admin-configured recovery factors per material category.
-- Deterministic math:
--
--   recovered_qty = quantity × recovery_rate
--   reused_qty    = recovered_qty × reuse_fraction
--   recycled_qty  = recovered_qty × recycle_fraction
--   landfill_qty  = quantity − reused_qty − recycled_qty
--   diversion_%   = (reused + recycled) / quantity × 100
--   reuse_value_₦ = reused_qty × unit_value_naira
--
-- Philosophy (unchanged): factors are admin-entered with a
-- mandatory source reference (demolition audits, WRAP/BE
-- protocols, salvage dealer rates). The DB never ships guessed
-- recovery rates or reclaimed-material prices.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. material_reuse_factors
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS material_reuse_factors (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category          text NOT NULL,               -- e.g. 'aluminium_roof_sheets', 'ceramic_tiles', 'steel_doors'
  category_label    text,                       -- human-readable
  unit              text NOT NULL,               -- e.g. 'm2', 'unit', 'kg'
  recovery_rate     numeric NOT NULL CHECK (recovery_rate >= 0 AND recovery_rate <= 1),
  reuse_fraction    numeric NOT NULL CHECK (reuse_fraction >= 0 AND reuse_fraction <= 1),
  recycle_fraction  numeric NOT NULL CHECK (recycle_fraction >= 0 AND recycle_fraction <= 1),
  unit_value_naira  numeric,                    -- reclaimed-material market value per unit (nullable)
  description       text,
  source_reference  text NOT NULL,              -- demolition audit, WRAP protocol, salvage dealer rate
  effective_date    date NOT NULL DEFAULT CURRENT_DATE,
  is_active         boolean NOT NULL DEFAULT true,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_reuse_fractions_sum CHECK (reuse_fraction + recycle_fraction <= 1)
);

-- Only one active factor per category
CREATE UNIQUE INDEX IF NOT EXISTS material_reuse_factors_cat_active_uniq
  ON material_reuse_factors (category)
  WHERE is_active = true;

ALTER TABLE material_reuse_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_reuse_factors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_reuse_factors_public_read" ON material_reuse_factors;
CREATE POLICY "material_reuse_factors_public_read" ON material_reuse_factors
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "material_reuse_factors_admin_write" ON material_reuse_factors;
CREATE POLICY "material_reuse_factors_admin_write" ON material_reuse_factors
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "material_reuse_factors_set_updated_at" ON material_reuse_factors;
CREATE TRIGGER "material_reuse_factors_set_updated_at"
  BEFORE UPDATE ON material_reuse_factors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE material_reuse_factors IS 'Admin-configured material recovery factors per category (recovery rate, reuse/recycle fractions, reclaimed value), each with a mandatory source reference. The engine never guesses a recovery rate — a material without a configured factor is refused, not estimated.';

-- ─────────────────────────────────────────────
-- 2. Engine calc rules (admin-editable via
--    Admin → Estimation Config → Calc Rules)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('diversion_target_fraction', 'circular_reuse',
   '{"value": 0.75}'::jsonb, 'verified_frelux',
   'Landfill-diversion target fraction (default 75%) that a demolition plan is measured against — the circular-economy mandate threshold. Purely a reporting target, set by the admin.', true),
  ('rounding_decimals', 'circular_reuse',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Decimal places for reported quantities, percentages and values.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed factors. Recovery rates are admin-entered from
-- verifiable sources (demolition audits, WRAP protocols,
-- salvage dealer rates) — never guessed.
