-- =========================================================
-- Fix NG plumbing search-source slugs
--
-- The plumbing coverage migration seeded per-market source slugs
-- for every market including NG, but NG resolves its plumbing
-- prices from the BASE slugs (plumb-pipe-*, plumb-*), not from
-- ng-prefixed ones (the market shells exist only for the 19
-- non-NG markets). The first live run (2026-10-24, run 6cc922db)
-- proved it: NG candidates filed fine but auto-apply skipped with
-- "no material record for slug".
--
-- This repoints the NG search sources at the base slugs so the
-- weekly scan refreshes the NG book itself (its rows are already
-- origin='scan' after the all-materials origin backfill).
--
-- Idempotent: safe to re-run.
-- =========================================================

UPDATE price_scan_sources
   SET material_slug = 'plumb-' || regexp_replace(material_slug, '^ng-', '')
 WHERE market = 'NG'
   AND source_type = 'search'
   AND material_slug LIKE 'ng-%';

-- Verification: no NG search source should reference an ng- slug.
SELECT count(*) AS remaining_ng_slugs
  FROM price_scan_sources
 WHERE market = 'NG' AND source_type = 'search' AND material_slug LIKE 'ng-%';
