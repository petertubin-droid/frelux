-- =========================================================
-- QUOTE TAX PROVENANCE (Phase 1, 2026-10-24)
--
-- Every stored quotation now records WHERE its tax came from:
-- a verified jurisdiction rule (rule code/version + citation),
-- a labeled manual assumption (author + timestamp), or
-- not_determined (pre-tax quote; tax_percentage NULL).
--
-- Additive only: legacy rows keep tax_percentage NULL semantics
-- and simply have no provenance recorded.
-- =========================================================

ALTER TABLE project_quotations
  ADD COLUMN IF NOT EXISTS tax_source text
    CHECK (tax_source IN ('manual_assumption', 'verified_rule', 'not_determined')),
  ADD COLUMN IF NOT EXISTS tax_rule_code text,
  ADD COLUMN IF NOT EXISTS tax_rule_version integer,
  ADD COLUMN IF NOT EXISTS tax_citation_title text,
  ADD COLUMN IF NOT EXISTS tax_citation_url text,
  ADD COLUMN IF NOT EXISTS tax_citation_publisher text,
  ADD COLUMN IF NOT EXISTS tax_effective_from date,
  ADD COLUMN IF NOT EXISTS tax_assumption_author text,
  ADD COLUMN IF NOT EXISTS tax_resolved_at timestamptz;

COMMENT ON COLUMN project_quotations.tax_source IS
  'manual_assumption = user-entered, not verified, never presented as tax due; verified_rule = resolved from tax_jurisdiction_rules / verified market catalog; not_determined = pre-tax quote.';
