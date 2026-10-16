-- =========================================================
-- PHASE 1 (roadmap.md): remove the silent 7.5% tax default
--
-- The roadmap's non-negotiable rules forbid applying a default
-- tax rate when no explicitly configured and applicable rule
-- exists. Until the versioned tax-jurisdiction rules engine is
-- built, quotation tax must be an explicit, user-configured
-- manual assumption — or honestly "not determined".
--
-- Semantics after this migration:
--   * quotation_settings.default_tax_percentage is NULLABLE and
--     has NO schema default. NULL = tax not determined; a value
--     is an editable manual assumption (never verified law).
--   * Existing rows holding exactly 7.5 were seeded by the old
--     schema default (NOT NULL DEFAULT 7.5) and carry no record
--     of deliberate user entry, so they are reset to NULL.
--     Contractors who genuinely want a rate re-enter it once.
--   * project_quotations.tax_percentage is NULLABLE:
--     NULL = tax not determined (pre-tax estimate), which is
--     distinct from an explicit 0% tax rate.
--
-- Idempotent: safe to replay (guards on catalog state).
-- =========================================================

-- 1. quotation_settings.default_tax_percentage: drop the silent default
ALTER TABLE public.quotation_settings
  ALTER COLUMN default_tax_percentage DROP DEFAULT;

ALTER TABLE public.quotation_settings
  ALTER COLUMN default_tax_percentage DROP NOT NULL;

-- 2. Reset values that the old schema default silently seeded.
--    Only exact-default rows are touched; any other configured
--    rate (user-chosen) is preserved.
UPDATE public.quotation_settings
   SET default_tax_percentage = NULL
 WHERE default_tax_percentage = 7.5;

-- 3. project_quotations.tax_percentage: allow NULL = not determined
ALTER TABLE public.project_quotations
  ALTER COLUMN tax_percentage DROP NOT NULL;

-- Historical quotations created under the silent default keep their
-- recorded numbers: they are immutable issued documents and are not
-- rewritten. Only new quotes can record NULL ("not determined").
