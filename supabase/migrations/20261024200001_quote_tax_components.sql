-- =========================================================
-- QUOTE TAX COMPONENT BREAKDOWN (Phase 1, 2026-10-24)
--
-- Verified jurisdiction rules compute per component (authored
-- bases, compounding, rounding). Compound rules cannot flatten
-- to one percentage, so the quote stores tax_percentage NULL
-- plus this exact component breakdown in tax_components.
-- =========================================================

ALTER TABLE project_quotations
  ADD COLUMN IF NOT EXISTS tax_components jsonb;

COMMENT ON COLUMN project_quotations.tax_components IS
  'Array of {name, rate_pct, base, amount, compounded_on} lines from the verified jurisdiction computation; null for manual assumptions and not-determined quotes.';
