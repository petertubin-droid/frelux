-- Stop treating catalogue pages as single products, and drop the banner
-- prices they filed.
--
-- The 2026-11-07 GB scan (run 45b03789, 31s, 45 observations) exposed the last
-- shape of the first-amount problem. Six sources point at catalogue URLs but
-- were typed source_type = 'product', so the scanner skipped the median path
-- and fell through to the first-currency-amount regex. On Screwfix that amount
-- is the free-delivery threshold, so a 1L primer, a 150m tape and a 5L sealer
-- all filed exactly GBP 99 with no unit relationship to the product. The three
-- DE Hornbach rows are the same shape and had not yet fired because that market
-- has not rotated in this cycle.
--
-- The scanner now refuses that fallback on listing pages and beside threshold
-- wording (supabase/functions/_shared/price-guards.ts). This migration corrects
-- the source types so the name-matched median path applies, and removes the
-- three observations the flawed fallback filed. It does not delete the sources:
-- they still describe a real retailer page and need their product URLs fixed,
-- which is a content task, not a data repair.
--
-- Idempotent: every statement is a guarded update or a delete.

BEGIN;

-- 1. Catalogue URLs are searches, not products.
UPDATE public.price_scan_sources
SET source_type = 'search',
    updated_at = now()
WHERE source_type = 'product'
  AND (product_url LIKE '%/c/%' OR product_url ~ '/cat[0-9]');

-- 2. Remove the three banner-priced observations from the 2026-11-07 GB run.
--    They are low confidence, were held out of the price book by the auto-apply
--    gate, and carry no unit that matches their material.
DELETE FROM public.market_price_observations
WHERE run_id = '45b03789-7c82-4391-830b-b6c306cd038c'
  AND price = 99
  AND extraction = 'regex'
  AND material_slug IN (
    'gb-everbuild-402-5l',
    'gb-gyproc-tape-150m',
    'gb-zinsser-123-1l'
  );

-- 3. Remove the matching candidates so the review queue does not carry them.
DELETE FROM public.price_scan_candidates
WHERE run_id = '45b03789-7c82-4391-830b-b6c306cd038c'
  AND scraped_price = 99
  AND material_slug IN (
    'gb-everbuild-402-5l',
    'gb-gyproc-tape-150m',
    'gb-zinsser-123-1l'
  );

COMMIT;
