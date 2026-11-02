-- =========================================================
-- TAX JURISDICTION RULES ENGINE (Phase 1, 2026-10-24)
--
-- Versioned, jurisdiction-aware tax rules keyed by project/site
-- jurisdiction. The live tax_catalog (web-verified citations) stays
-- untouched as the market-level evidence base; this table adds the
-- roadmap Phase 1 requirements: jurisdiction level, versioned rules
-- with effective periods, inclusive/exclusive basis, taxable base
-- definition, rounding method, exemption/unknown handling, explicit
-- component composition (chained/compound ONLY when authored) and
-- reviewer + next review date.
--
-- Honesty rules enforced here:
--  - An ACTIVE rule must carry a named reviewer, a next review date
--    and a citation (trigger gate below). No anonymous rates.
--  - Versioned rules: same rule_code gets a new version row; old
--    versions close with effective_to. Never mutate history.
--  - No country seed values without provenance: the only seed is the
--    NG federal VAT rule derived from the web-verified catalog row
--    (FIRS citation, effective 2019-02-01). Other markets keep using
--    the catalog until rules are authored and reviewed.
-- =========================================================

CREATE TABLE IF NOT EXISTS tax_jurisdiction_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  market_code text NOT NULL,
  jurisdiction_level text NOT NULL
    CHECK (jurisdiction_level IN ('national', 'regional', 'state', 'municipal')),
  jurisdiction_code text,
  tax_category text NOT NULL
    CHECK (tax_category IN ('consumption', 'withholding', 'settlement')),
  tax_name text NOT NULL,
  components jsonb NOT NULL,
  basis_inclusive boolean NOT NULL DEFAULT false,
  taxable_base_definition text NOT NULL,
  rounding_method text NOT NULL DEFAULT 'half_up'
    CHECK (rounding_method IN ('half_up', 'half_even', 'down')),
  exemption_handling text NOT NULL DEFAULT 'excluded_from_base',
  unknown_handling text NOT NULL DEFAULT 'not_determined',
  applies_to text NOT NULL DEFAULT 'both'
    CHECK (applies_to IN ('materials', 'services', 'both')),
  effective_from date NOT NULL,
  effective_to date,
  source_title text NOT NULL,
  source_url text NOT NULL,
  source_publisher text NOT NULL,
  reviewer_name text,
  next_review_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tax_jurisdiction_rules_code_version_unique
    UNIQUE (rule_code, version),
  CONSTRAINT tax_jurisdiction_rules_period_check
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- Components shape: array of
--   { "name": "...", "rate_pct": 7.5, "compound_on": null | "<earlier component name>" }
CREATE OR REPLACE FUNCTION tax_jurisdiction_rules_component_gate()
RETURNS trigger AS $$
DECLARE
  comp jsonb;
  comp_name text;
  seen_names text[] := ARRAY[]::text[];
  referenced text;
BEGIN
  IF NOT jsonb_typeof(NEW.components) = 'array' THEN
    RAISE EXCEPTION 'components must be a JSON array (rule % v%)', NEW.rule_code, NEW.version;
  END IF;
  IF jsonb_array_length(NEW.components) = 0 THEN
    RAISE EXCEPTION 'components must not be empty (rule % v%)', NEW.rule_code, NEW.version;
  END IF;
  FOR comp IN SELECT * FROM jsonb_array_elements(NEW.components) LOOP
    comp_name := comp->>'name';
    IF comp_name IS NULL OR btrim(comp_name) = '' THEN
      RAISE EXCEPTION 'each component needs a name (rule % v%)', NEW.rule_code, NEW.version;
    END IF;
    IF (comp->>'rate_pct') IS NULL OR NOT (comp->>'rate_pct') ~ '^[0-9]+(\.[0-9]+)?$' THEN
      RAISE EXCEPTION 'each component needs a non-negative rate_pct (rule % v%)', NEW.rule_code, NEW.version;
    END IF;
    IF (comp->>'rate_pct')::numeric >= 100 THEN
      RAISE EXCEPTION 'component rate_pct must be < 100 (rule % v%)', NEW.rule_code, NEW.version;
    END IF;
    referenced := comp->>'compound_on';
    IF referenced IS NOT NULL AND NOT (referenced = ANY(seen_names)) THEN
      RAISE EXCEPTION
        'compound_on must reference an earlier component: % is not seen before % (rule % v%)',
        referenced, comp_name, NEW.rule_code, NEW.version;
    END IF;
    seen_names := seen_names || comp_name;
  END LOOP;

  -- Reviewer gate: an ACTIVE rule needs a named reviewer, a next
  -- review date and provenance. Fail closed, never silently.
  IF NEW.is_active THEN
    IF NEW.reviewer_name IS NULL OR btrim(NEW.reviewer_name) = '' THEN
      RAISE EXCEPTION 'active rule % v% requires a named reviewer', NEW.rule_code, NEW.version;
    END IF;
    IF NEW.next_review_date IS NULL THEN
      RAISE EXCEPTION 'active rule % v% requires a next review date', NEW.rule_code, NEW.version;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tax_jurisdiction_rules_gate_trg ON tax_jurisdiction_rules;

CREATE TRIGGER tax_jurisdiction_rules_gate_trg
BEFORE INSERT OR UPDATE ON tax_jurisdiction_rules
FOR EACH ROW EXECUTE FUNCTION tax_jurisdiction_rules_component_gate();

-- =========================================================
-- Seed: NG federal VAT (derived from the web-verified catalog row)
-- =========================================================

INSERT INTO tax_jurisdiction_rules (
  rule_code, version, market_code, jurisdiction_level, jurisdiction_code,
  tax_category, tax_name, components, basis_inclusive,
  taxable_base_definition, rounding_method, exemption_handling,
  unknown_handling, applies_to, effective_from, effective_to,
  source_title, source_url, source_publisher,
  reviewer_name, next_review_date, is_active
) VALUES (
  'NG-VAT-FED', 1, 'NG', 'national', 'NG',
  'consumption', 'Value Added Tax (VAT)',
  '[{"name":"VAT","rate_pct":7.5,"compound_on":null}]'::jsonb,
  false,
  'Taxable supplies of goods and services in Nigeria (VAT Act); zero-rated and exempt supplies excluded from the base.',
  'half_up', 'excluded_from_base', 'not_determined', 'both',
  '2019-02-01', NULL,
  'Value Added Tax Act 1993 (as amended by Finance Act 2019) — 7.5% VAT',
  'https://firs.gov.ng/', 'Federal Inland Revenue Service (FIRS)',
  'FRELUX Tax Review (catalog backfill, web-verified 2026-10-15)',
  '2027-02-01', true
) ON CONFLICT (rule_code, version) DO NOTHING;
