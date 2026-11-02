-- =========================================================
-- Heat Comfort Engine (Future Engine 6 — finish choice and
-- indoor heat comfort)
-- =========================================================
-- Compares how two finish choices affect indoor heat comfort
-- via admin-configured solar reflectance (albedo) factors per
-- finish category and surface type. Deterministic math:
--
--   absorbed fraction of incident solar energy = 1 − albedo
--   daily absorbed-energy delta (kWh/day)
--     = area × irradiance_rule × (albedo_old − albedo_new)
--
-- A brighter finish (higher albedo) absorbs less solar energy;
-- the engine reports the honest delta — never a comfort score
-- invented from nowhere.
--
-- Philosophy (unchanged): factors are admin-entered with a
-- mandatory source reference (manufacturer data sheet, SRI/CRRC
-- rating, literature). The DB never ships guessed albedo values.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. thermal_finish_factors
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS thermal_finish_factors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface_type     text NOT NULL CHECK (surface_type IN ('roof', 'wall')),
  category         text NOT NULL,               -- e.g. 'dark_membrane', 'cool_roof_coating', 'white_emulsion'
  category_label   text,                       -- human-readable
  solar_reflectance numeric NOT NULL CHECK (solar_reflectance >= 0 AND solar_reflectance <= 1),
  description      text,
  source_reference text NOT NULL,               -- manufacturer data sheet, SRI/CRRC rating, or literature
  effective_date   date NOT NULL DEFAULT CURRENT_DATE,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Only one active factor per (surface_type, category)
CREATE UNIQUE INDEX IF NOT EXISTS thermal_finish_factors_surface_cat_active_uniq
  ON thermal_finish_factors (surface_type, category)
  WHERE is_active = true;

ALTER TABLE thermal_finish_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE thermal_finish_factors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "thermal_finish_factors_public_read" ON thermal_finish_factors;
CREATE POLICY "thermal_finish_factors_public_read" ON thermal_finish_factors
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "thermal_finish_factors_admin_write" ON thermal_finish_factors;
CREATE POLICY "thermal_finish_factors_admin_write" ON thermal_finish_factors
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "thermal_finish_factors_set_updated_at" ON thermal_finish_factors;
CREATE TRIGGER "thermal_finish_factors_set_updated_at"
  BEFORE UPDATE ON thermal_finish_factors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE thermal_finish_factors IS 'Admin-configured solar reflectance (albedo) factors per finish category and surface type, each with a mandatory source reference. The engine never guesses a reflectance — a finish without a configured factor is flagged, not scored.';

-- ─────────────────────────────────────────────
-- 2. Engine calc rules (admin-editable via
--    Admin → Estimation Config → Calc Rules)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('solar_irradiance_kwh_per_sqm_day', 'heat_comfort',
   '{"value": 5.5}'::jsonb, 'verified_frelux',
   'Average daily solar irradiance (kWh/m²/day) used to convert a reflectance delta into absorbed-energy kWh per day. Admins should set this for their region — the engine reports what is configured, never an invented climate.', true),
  ('meaningful_reduction_threshold', 'heat_comfort',
   '{"value": 0.15}'::jsonb, 'verified_frelux',
   'Fraction of absorbed solar energy that counts as a meaningful cooling benefit (default 15%). Purely a reporting threshold, set by the admin.', true),
  ('rounding_decimals', 'heat_comfort',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Decimal places for reported energy deltas and percentages.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed factors. Reflectance data is admin-entered from
-- verifiable sources (manufacturer sheets, SRI/CRRC ratings) —
-- never guessed.
