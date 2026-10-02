-- =========================================================
-- Defect Diagnosis Engine (Future Engine 9)
-- =========================================================
-- Deterministic symptom-to-root-cause mapping with fix
-- quantities, from an admin-configured knowledge base.
--
-- Philosophy (unchanged): diagnoses are admin-entered with
-- ranked causes (sort_order = likelihood, admin's call).
-- A cause only carries a fix quantity when the admin has
-- configured a consumption rate for it — the engine reports
-- "no quantity configured" rather than guessing one.
-- Unknown symptoms are refused, never matched approximately.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. defects (symptoms)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS defects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_key  text NOT NULL,                -- e.g. 'efflorescence', 'paint_flaking'
  symptom_label text NOT NULL,               -- human-readable, e.g. 'White salty deposits on walls'
  description  text,                        -- what the symptom looks like
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS defects_symptom_key_uniq ON defects (symptom_key);

ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "defects_public_read" ON defects;
CREATE POLICY "defects_public_read" ON defects FOR SELECT
  TO public USING (true);

DROP POLICY IF EXISTS "defects_admin_write" ON defects;
CREATE POLICY "defects_admin_write" ON defects FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "defects_set_updated_at" ON defects;
CREATE TRIGGER "defects_set_updated_at"
  BEFORE UPDATE ON defects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────
-- 2. defect_causes (root causes per symptom)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS defect_causes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id    uuid NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
  cause_key    text NOT NULL,                -- e.g. 'salt_migration'
  cause_label  text NOT NULL,                -- e.g. 'Salt migration through masonry'
  root_cause   text NOT NULL,                -- the diagnosis text
  severity     text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  fix_summary  text NOT NULL,                -- what to do about it
  -- Fix quantity: only configured causes get one; the engine
  -- never invents a consumption rate.
  fix_material             text,            -- e.g. 'Stabilising primer'
  fix_consumption_per_sqm   numeric CHECK (fix_consumption_per_sqm IS NULL OR fix_consumption_per_sqm > 0),
  fix_unit                 text,            -- e.g. 'litre', 'kg'
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,  -- ranked likelihood, admin's call
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS defect_causes_defect_key_uniq
  ON defect_causes (defect_id, cause_key);

ALTER TABLE defect_causes ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_causes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "defect_causes_public_read" ON defect_causes;
CREATE POLICY "defect_causes_public_read" ON defect_causes FOR SELECT
  TO public USING (true);

DROP POLICY IF EXISTS "defect_causes_admin_write" ON defect_causes;
CREATE POLICY "defect_causes_admin_write" ON defect_causes FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "defect_causes_set_updated_at" ON defect_causes;
CREATE TRIGGER "defect_causes_set_updated_at"
  BEFORE UPDATE ON defect_causes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE defects IS 'Admin-configured defect symptoms (e.g. efflorescence) for the deterministic diagnosis engine. Unknown symptoms are refused, never matched approximately.';
COMMENT ON TABLE defect_causes IS 'Admin-configured root causes per defect symptom, ranked by sort_order (likelihood). A cause carries a fix quantity only when the admin configures fix_consumption_per_sqm — the engine never invents one.';

-- ─────────────────────────────────────────────
-- 3. Engine calc rule
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('rounding_decimals', 'defects',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Decimal places for reported fix quantities.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed content. The knowledge base is admin-entered —
-- the DB never ships guessed diagnoses.
