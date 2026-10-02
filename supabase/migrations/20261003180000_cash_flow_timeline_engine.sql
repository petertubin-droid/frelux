-- =========================================================
-- Project Cash-Flow Timeline Engine (Future Engine 6)
-- =========================================================
-- Deterministic phased payment schedules from an estimate
-- total: admin-configured milestone templates (label, percent,
-- offset months) applied to any project value.
--
-- Philosophy (unchanged): the engine refuses a template whose
-- percentages do not sum to exactly 100% — it never silently
-- normalises or guesses the missing share. Dates come from the
-- project start + milestone offsets, nothing is invented.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. cash_flow_templates
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_flow_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  description      text,
  -- [{ label, percent, offset_months }] — must sum to exactly 100
  milestones       jsonb NOT NULL,
  is_default       boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cash_flow_milestones_is_array CHECK (jsonb_typeof(milestones) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS cash_flow_templates_name_uniq ON cash_flow_templates (name);

ALTER TABLE cash_flow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_templates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_flow_templates_public_read" ON cash_flow_templates;
CREATE POLICY "cash_flow_templates_public_read" ON cash_flow_templates FOR SELECT
  TO public USING (true);

DROP POLICY IF EXISTS "cash_flow_templates_admin_write" ON cash_flow_templates;
CREATE POLICY "cash_flow_templates_admin_write" ON cash_flow_templates FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "cash_flow_templates_set_updated_at" ON cash_flow_templates;
CREATE TRIGGER "cash_flow_templates_set_updated_at"
  BEFORE UPDATE ON cash_flow_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE cash_flow_templates IS 'Admin-configured payment milestone templates (label, percent, offset months) applied deterministically to any estimate total. The engine refuses templates whose percentages do not sum to exactly 100 — never silently normalised.';

-- ─────────────────────────────────────────────
-- 2. Engine calc rules (defaults, admin-editable via
--    Admin → Estimation Config & Rules)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('rounding_decimals', 'cash_flow',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Decimal places for reported payment amounts.', true),
  ('require_percent_sum', 'cash_flow',
   '{"value": 100}'::jsonb, 'verified_frelux',
   'Milestone percentages must sum to exactly this value (100). Templates that do not sum correctly are refused, never silently normalised.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed templates. Payment structures are admin-entered —
-- the DB never ships guessed milestones.
