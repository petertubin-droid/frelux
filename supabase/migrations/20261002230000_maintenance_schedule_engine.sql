-- =========================================================
-- Maintenance Schedule Engine (Future Engine 1 of 10)
-- =========================================================
-- Turns one-time calculator results into long-term maintenance
-- schedules: when a finish will need re-coating/redecoration and
-- what it will cost at year 3, 5 and 10.
--
-- Philosophy (unchanged): the engine never guesses. Every service
-- life, maintenance interval and cost factor is database-verified
-- configuration entered by an admin with a source reference. No
-- seed profiles are inserted — unconfigured categories stay
-- incomplete by design and the engine refuses to schedule them.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. maintenance_profiles — verified per-category maintenance data
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_profiles (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finish_category             text NOT NULL,             -- paint, pop, screeding, tile, mineral_stone, stucco, tyrolene ...
  surface_type                text NOT NULL DEFAULT 'any', -- interior, exterior, wet_area, ceiling, any
  -- Full redecoration / replacement of the finish
  service_life_min_years      numeric NOT NULL CHECK (service_life_min_years > 0),
  service_life_max_years      numeric NOT NULL CHECK (service_life_max_years > 0),
  -- Intermediate maintenance cycle (e.g. re-coat). NULL = no intermediate
  -- cycle configured for this finish (a single service-life event is still
  -- produced).
  maintenance_interval_min_years numeric CHECK (maintenance_interval_min_years IS NULL OR maintenance_interval_min_years > 0),
  maintenance_interval_max_years numeric CHECK (maintenance_interval_max_years IS NULL OR maintenance_interval_max_years > 0),
  -- Routine inspection cadence. NULL = not configured (no inspection events).
  inspection_interval_years   numeric CHECK (inspection_interval_years IS NULL OR inspection_interval_years > 0),
  -- Cost of one maintenance cycle as a fraction of the original installed cost
  maintenance_cost_factor     numeric NOT NULL CHECK (maintenance_cost_factor > 0),
  -- Cost of the full redecoration at service-life end (fraction of original)
  replacement_cost_factor     numeric NOT NULL DEFAULT 1.0 CHECK (replacement_cost_factor > 0),
  description                 text,
  source_reference            text NOT NULL,               -- verified provenance: standard, manufacturer datasheet, trade source
  is_active                   boolean NOT NULL DEFAULT true,
  sort_order                  int NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  -- Ranges must be ordered: min must not exceed max
  CONSTRAINT maint_service_life_range_check
    CHECK (service_life_min_years <= service_life_max_years),
  CONSTRAINT maint_interval_range_check
    CHECK (maintenance_interval_min_years IS NULL
        OR maintenance_interval_max_years IS NULL
        OR maintenance_interval_min_years <= maintenance_interval_max_years),
  -- An intermediate cycle must fit inside the service life
  CONSTRAINT maint_interval_within_life_check
    CHECK (maintenance_interval_max_years IS NULL
        OR maintenance_interval_max_years <= service_life_min_years)
);

ALTER TABLE maintenance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_profiles_public_read" ON maintenance_profiles;
CREATE POLICY "maintenance_profiles_public_read" ON maintenance_profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "maintenance_profiles_admin_write" ON maintenance_profiles;
CREATE POLICY "maintenance_profiles_admin_write" ON maintenance_profiles FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "maintenance_profiles_set_updated_at" ON maintenance_profiles;
CREATE TRIGGER "maintenance_profiles_set_updated_at"
  BEFORE UPDATE ON maintenance_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE maintenance_profiles IS 'Verified maintenance data per finish category and surface type. All values must carry a source_reference; the maintenance engine refuses to schedule unconfigured categories.';

-- ─────────────────────────────────────────────
-- 2. Engine calc rules (defaults only, admin-editable)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('require_verified_configuration', 'maintenance',
   '{"required": true}'::jsonb, 'verified_frelux',
   'The maintenance engine must refuse to schedule when no active profile matches the category and surface type. No guessed service lives or intervals.', true),
  ('cost_projection_years', 'maintenance',
   '{"years": [3, 5, 10]}'::jsonb, 'verified_frelux',
   'Cumulative maintenance cost milestones reported by the Maintenance Planner (admin-editable).', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- ─────────────────────────────────────────────
-- 3. Saved plans
--    maintenance_plans stores a produced schedule with its exact
--    configuration snapshot so a plan can be replayed and audited.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  estimate_ref    text NOT NULL,                    -- e.g. MNT-XXXXXX
  finish_category text NOT NULL,
  surface_type    text NOT NULL,
  initial_cost    numeric,                         -- nullable: plans can be timing-only
  currency        text,
  install_date    date NOT NULL,
  horizon_years   numeric NOT NULL,
  profile_id      uuid REFERENCES maintenance_profiles(id) ON DELETE SET NULL,
  profile_snapshot jsonb NOT NULL,                 -- exact profile values used
  schedule        jsonb NOT NULL,                   -- events + milestones snapshot
  warnings        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_plans FORCE ROW LEVEL SECURITY;

-- Public plans are shareable read-only via estimate_ref (no PII in them);
-- users manage their own plans.
DROP POLICY IF EXISTS "maintenance_plans_public_read" ON maintenance_plans;
CREATE POLICY "maintenance_plans_public_read" ON maintenance_plans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "maintenance_plans_user_write" ON maintenance_plans;
CREATE POLICY "maintenance_plans_user_write" ON maintenance_plans FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "maintenance_plans_admin_write" ON maintenance_plans;
CREATE POLICY "maintenance_plans_admin_write" ON maintenance_plans FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "maintenance_plans_set_updated_at" ON maintenance_plans;
CREATE TRIGGER "maintenance_plans_set_updated_at"
  BEFORE UPDATE ON maintenance_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS maintenance_plans_estimate_ref_idx
  ON maintenance_plans (estimate_ref);

-- No seed profiles. Verified maintenance data must be configured through
-- the Admin Maintenance Profiles pane.
