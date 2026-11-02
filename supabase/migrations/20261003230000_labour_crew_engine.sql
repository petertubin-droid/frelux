-- =========================================================
-- Labour Productivity & Crew Engine (Future Engine 7)
-- =========================================================
-- Deterministic worker-days and crew duration from
-- admin-configured productivity rates per finishing task
-- (e.g. screeding 25 sqm per worker-day), with a transparent
-- site-efficiency loss applied as a separate labelled line.
--
-- Distinct from the construction-phase timeline estimator
-- (hardcoded Nigerian benchmarks for building stages): this
-- engine covers finishing-trade quantities from DB-configured,
-- verifiable rates.
--
-- Philosophy (unchanged): rates are admin-entered with a
-- mandatory source reference. The efficiency loss is applied
-- as a clearly labelled separate line — never silently folded
-- into the base rate — and the engine never invents a rate.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. labour_rates
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labour_rates (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key                text NOT NULL,              -- e.g. 'screeding_wall', 'emulsion_painting'
  task_label              text,                      -- human-readable, e.g. 'Wall screeding (per sqm)'
  unit                    text NOT NULL,              -- e.g. 'sqm', 'm', 'item'
  output_per_worker_day   numeric NOT NULL CHECK (output_per_worker_day > 0),
  description             text,
  source_reference        text NOT NULL,              -- benchmark study, contractor data, literature
  is_active               boolean NOT NULL DEFAULT true,
  sort_order               integer NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Only one active rate per task — the engine reads deterministically.
CREATE UNIQUE INDEX IF NOT EXISTS labour_rates_task_active_uniq
  ON labour_rates (task_key)
  WHERE is_active = true;

ALTER TABLE labour_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_rates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "labour_rates_public_read" ON labour_rates;
CREATE POLICY "labour_rates_public_read" ON labour_rates FOR SELECT
  TO public USING (true);

DROP POLICY IF EXISTS "labour_rates_admin_write" ON labour_rates;
CREATE POLICY "labour_rates_admin_write" ON labour_rates FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "labour_rates_set_updated_at" ON labour_rates;
CREATE TRIGGER "labour_rates_set_updated_at"
  BEFORE UPDATE ON labour_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE labour_rates IS 'Admin-configured labour productivity rates per finishing task (unit output per worker-day), each with a verifiable source reference. The labour engine applies the site-efficiency loss as a separate transparent line — never folded into the base rate.';

-- ─────────────────────────────────────────────
-- 2. Engine calc rules (defaults, admin-editable via
--    Admin → Estimation Config & Rules)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('efficiency_loss_percent', 'labour',
   '{"value": 15}'::jsonb, 'verified_frelux',
   'Site-efficiency loss percent applied as a separate, clearly labelled reduction on top of the base productivity rate — never folded into the base rate.', true),
  ('rounding_decimals', 'labour',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Decimal places for reported worker-days and effective rates. Calendar days are always whole days (rounded up) — you cannot schedule a fraction of a working day.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed rates. Productivity figures are admin-entered from
-- verifiable sources (contractor data, benchmark studies) —
-- the DB never ships guessed rates.
