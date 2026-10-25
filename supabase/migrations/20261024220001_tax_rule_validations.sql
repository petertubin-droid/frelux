-- =========================================================
-- TAX RULE VALIDATION RECORDS (Phase 1, 2026-10-24)
--
-- Per-jurisdiction fixture validation by an accountable local
-- reviewer (roadmap Phase 1). Each record is a human verdict on
-- a market's tax fixture (src/lib/tax/fixtures/markets/<CC>.ts):
-- the reviewer checks rate, taxable base, exemptions, rounding,
-- citation and effective dates against local knowledge and
-- records the outcome here.
--
-- Nothing is machine-invented: the fixture tests prove the
-- engine reproduces the seeded data; only a human record in
-- this table turns that into local validation. A market with
-- no record stays PENDING.
-- =========================================================

CREATE TABLE IF NOT EXISTS tax_rule_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL,
  -- What was validated: a jurisdiction rule code or 'catalog'.
  rule_ref text NOT NULL DEFAULT 'catalog',
  -- validated | rejected | needs_changes
  verdict text NOT NULL
    CHECK (verdict IN ('validated', 'rejected', 'needs_changes')),
  -- Accountable local reviewer.
  reviewer_name text NOT NULL,
  reviewer_role text NOT NULL,
  reviewer_location text NOT NULL,
  review_date date NOT NULL,
  -- Reviewer checklist; every item must be true for 'validated'.
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market_code, rule_ref, review_date)
);

COMMENT ON TABLE tax_rule_validations IS
  'Human verdicts on per-jurisdiction tax fixtures by accountable local reviewers; markets without a record are pending validation.';

-- =========================================================
-- GATE: a 'validated' verdict requires an accountable reviewer
-- and a complete checklist.
-- =========================================================
CREATE OR REPLACE FUNCTION tax_rule_validation_gate()
RETURNS trigger AS $$
DECLARE
  required_items text[] := ARRAY[
    'rate', 'taxable_base', 'exemptions', 'rounding',
    'citation', 'effective_dates', 'component_structure'
  ];
  item text;
  chk jsonb;
BEGIN
  IF NEW.verdict = 'validated' THEN
    IF btrim(NEW.reviewer_name) = '' OR NEW.reviewer_name IS NULL THEN
      RAISE EXCEPTION 'A validated fixture requires a reviewer name';
    END IF;
    IF btrim(NEW.reviewer_role) = '' OR NEW.reviewer_role IS NULL THEN
      RAISE EXCEPTION 'A validated fixture requires the reviewer role';
    END IF;
    IF btrim(NEW.reviewer_location) = '' OR NEW.reviewer_location IS NULL THEN
      RAISE EXCEPTION 'A validated fixture requires the reviewer location';
    END IF;
    chk := COALESCE(NEW.checklist, '{}'::jsonb);
    FOREACH item IN ARRAY required_items LOOP
      IF (chk ->> item) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Validated fixtures require every checklist item true; missing: %', item;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tax_rule_validation_gate ON tax_rule_validations;
CREATE TRIGGER tax_rule_validation_gate
  BEFORE INSERT OR UPDATE ON tax_rule_validations
  FOR EACH ROW
  EXECUTE FUNCTION tax_rule_validation_gate();

-- =========================================================
-- QUOTE-LEVEL VALIDATION PROVENANCE (project_quotations)
-- =========================================================

ALTER TABLE project_quotations
  ADD COLUMN IF NOT EXISTS tax_validation_state text
    CHECK (tax_validation_state IN ('pending', 'validated', 'rejected', 'needs_changes') OR tax_validation_state IS NULL);

COMMENT ON COLUMN project_quotations.tax_validation_state IS
  'Local fixture-validation state of the tax rule used, at quote time; NULL when the quote used no verified rule.';

ALTER TABLE project_quotations
  ADD COLUMN IF NOT EXISTS tax_validated_by text;

ALTER TABLE project_quotations
  ADD COLUMN IF NOT EXISTS tax_validated_at date;
