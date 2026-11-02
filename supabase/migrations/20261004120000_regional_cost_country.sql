-- =========================================================
-- INTERNATIONAL PHASE A: country dimension on regional cost indices
-- =========================================================
-- regional_cost_indices was state-scoped (Nigerian states). The
-- international plan adds an optional country dimension so the same
-- deterministic engine can serve other markets once their indices
-- are admin-configured. Default 'NG' preserves every existing row
-- and keeps all current behaviour identical.
--
-- The engine fallback order becomes:
--   country+state+category -> country+state general -> national baseline
-- (for the requested country), never guessing a factor.

ALTER TABLE public.regional_cost_indices
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'NG';

COMMENT ON COLUMN public.regional_cost_indices.country IS
  'ISO 3166-1 alpha-2 market this index belongs to (NG default). Engine filters indices by country first.';

-- Re-scope the deterministic unique-active index to (country, state, category).
DROP INDEX IF EXISTS public.regional_cost_indices_state_cat_active_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS regional_cost_indices_country_state_cat_active_uniq
  ON public.regional_cost_indices (country, state, category)
  WHERE is_active = true;

-- Index for the country-first engine filter.
CREATE INDEX IF NOT EXISTS idx_regional_cost_indices_country
  ON public.regional_cost_indices (country, is_active);
