-- =========================================================
-- Embodied Carbon Engine (Future Engine 5)
-- =========================================================
-- kgCO2e per estimate from admin-configured carbon factors
-- per material/finish category. Deterministic: quantity ×
-- factor, summed. No factor configured = the line is excluded
-- with a warning — the engine never guesses an emission.
--
-- Philosophy (unchanged): factors are admin-entered with a
-- mandatory source reference (EPD, ICE database, literature).
-- The DB never ships guessed emission values.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. carbon_factors
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carbon_factors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category         text NOT NULL,               -- e.g. 'emulsion_paint', 'cement_bag', 'tile'
  category_label   text,                       -- human-readable, e.g. 'Emulsion paint (per litre)'
  unit             text NOT NULL,               -- e.g. 'litre', 'sqm', 'bag', 'kg'
  kg_co2e_per_unit numeric NOT NULL CHECK (kg_co2e_per_unit >= 0),
  description      text,
  source_reference text NOT NULL,               -- EPD, ICE database entry, or literature
  effective_date   date NOT NULL DEFAULT CURRENT_DATE,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Only one active factor per category — the engine reads deterministically.
CREATE UNIQUE INDEX IF NOT EXISTS carbon_factors_category_active_uniq
  ON carbon_factors (category)
  WHERE is_active = true;

ALTER TABLE carbon_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_factors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carbon_factors_public_read" ON carbon_factors;
CREATE POLICY "carbon_factors_public_read" ON carbon_factors FOR SELECT
  TO public USING (true);

DROP POLICY IF EXISTS "carbon_factors_admin_write" ON carbon_factors;
CREATE POLICY "carbon_factors_admin_write" ON carbon_factors FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "carbon_factors_set_updated_at" ON carbon_factors;
CREATE TRIGGER "carbon_factors_set_updated_at"
  BEFORE UPDATE ON carbon_factors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE carbon_factors IS 'Admin-configured embodied carbon factors per material/finish category (kgCO2e per unit), each with a mandatory source reference. The engine excludes lines without a configured factor with a warning — it never guesses emissions.';

-- ─────────────────────────────────────────────
-- 2. Engine calc rules (defaults, admin-editable via
--    Admin → Estimation Config & Rules)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('rounding_decimals', 'embodied_carbon',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Decimal places for reported kgCO2e totals and per-line emissions.', true),
  ('uncovered_category_behavior', 'embodied_carbon',
   '{"behavior": "exclude_with_warning"}'::jsonb, 'verified_frelux',
   'How lines without a configured carbon factor are handled: excluded from the total with a warning, never guessed.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed factors. Emission data is admin-entered from
-- verifiable sources (EPDs, ICE database) — never guessed.
