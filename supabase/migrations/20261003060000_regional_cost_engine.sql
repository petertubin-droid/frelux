-- =========================================================
-- Regional Cost Index Engine (Future Engine 3)
-- =========================================================
-- Location-adjusted costing: admin-configured cost indices
-- per Nigerian state and category (labour, materials, ...).
--
-- Philosophy (unchanged): the engine never invents a factor.
-- Indices are admin-entered with a mandatory source reference.
-- When no index exists for a state/category the engine falls
-- back in documented order and warns — it never guesses a
-- regional multiplier.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. regional_cost_indices
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regional_cost_indices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state           text NOT NULL,                      -- Nigerian state, e.g. 'Lagos'
  category        text NOT NULL DEFAULT 'general',    -- 'labour' | 'materials' | 'general' | admin-defined
  cost_factor     numeric NOT NULL CHECK (cost_factor > 0), -- multiplier vs national baseline (1.00)
  description     text,
  source_reference text NOT NULL,                     -- every factor is verifiable
  effective_date  date NOT NULL DEFAULT CURRENT_DATE,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Only one active index per (state, category) — the engine reads deterministically.
CREATE UNIQUE INDEX IF NOT EXISTS regional_cost_indices_state_cat_active_uniq
  ON regional_cost_indices (state, category)
  WHERE is_active = true;

ALTER TABLE regional_cost_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_cost_indices FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regional_cost_indices_public_read" ON regional_cost_indices;
CREATE POLICY "regional_cost_indices_public_read" ON regional_cost_indices FOR SELECT
  TO public USING (true);

DROP POLICY IF EXISTS "regional_cost_indices_admin_write" ON regional_cost_indices;
CREATE POLICY "regional_cost_indices_admin_write" ON regional_cost_indices FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "regional_cost_indices_set_updated_at" ON regional_cost_indices;
CREATE TRIGGER "regional_cost_indices_set_updated_at"
  BEFORE UPDATE ON regional_cost_indices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE regional_cost_indices IS 'Admin-configured regional cost factors (state × category) with mandatory source references. 1.00 = national baseline. The engine falls back: exact state+category → state general → national 1.0, warning when it falls back.';

-- ─────────────────────────────────────────────
-- 2. Engine calc rules (defaults, admin-editable via
--    Admin → Estimation Config & Rules)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('national_baseline_factor', 'regional_cost',
   '{"factor": 1.0}'::jsonb, 'verified_frelux',
   'National baseline multiplier used when a state has no configured index. 1.0 = national average cost level.', true),
  ('fallback_behavior', 'regional_cost',
   '{"order": ["state_category", "state_general", "national_baseline"]}'::jsonb, 'verified_frelux',
   'Documented fallback order when applying a regional index. The engine warns on every fallback so users know the applied factor.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed indices. Rates are admin-entered from verifiable sources
-- (market surveys, supplier price lists) — the DB never guesses them.
