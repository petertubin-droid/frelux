-- Repair products that were filed under a material they are not.
--
-- Evidence (production, 2026-11-06): three slugs carried one source each and
-- several different products, because the source was not a product page.
--   gb-thistle-multifinish-25kg and gb-thistle-bonding-25kg both point at
--     https://www.buildbuddy.co.uk/building-materials/plaster, declared
--     source_type 'product'. That is the plaster category page. Each scan took
--     the first product on it, so MultiFinish, Bonding Coat and BoardFinish
--     prices were all filed as MultiFinish and the market median mixed three
--     different plasters.
--   ca-pipe-drainage (search URL for 110mm drainage pipe) filed an 18 inch
--     cast iron pipe wrench.
--   ca-pipe-cold (search URL for 20mm PVC water pipe) filed a 4 inch aluminium
--     pipe and a 100ft poly pipe.
--
-- Two of these products have their own material, so their prices move there
-- instead of being thrown away: Thistle Bonding Coat has
-- gb-thistle-bonding-25kg in the catalogue and was being priced from the
-- MultiFinish row. BoardFinish has no material, and the pipes have no
-- matching material either, so those rows are deleted rather than left to
-- feed a median they do not describe.
--
-- The scanner now refuses a page whose product name does not match the
-- material, and both category pages are reclassified as search pages so their
-- listings are filtered by product name before a median is taken.
--
-- Idempotent: moves are guarded on the old slug, deletes find nothing on a
-- second run.

BEGIN;

-- 1. Bonding Coat has its own material. Move the price and its observations.
UPDATE public.market_material_prices
SET material_slug = 'gb-thistle-bonding-25kg',
    material_id = (
      SELECT id FROM public.estimation_materials
      WHERE slug = 'gb-thistle-bonding-25kg'
    ),
    updated_at = now()
WHERE market = 'GB'
  AND material_slug = 'gb-thistle-multifinish-25kg'
  AND specification = 'Bonding Coat Plaster (Thistle) – 25kg Bag';

UPDATE public.market_price_observations
SET material_slug = 'gb-thistle-bonding-25kg'
WHERE market = 'GB'
  AND material_slug = 'gb-thistle-multifinish-25kg'
  AND specification = 'Bonding Coat Plaster (Thistle) – 25kg Bag';

-- 2. Products with no material of their own: removed, because another
--    product's price is not evidence for this one at any confidence.
DELETE FROM public.market_material_prices
WHERE (market = 'GB' AND material_slug = 'gb-thistle-multifinish-25kg'
       AND specification = 'BoardFinish Plaster (Thistle) – 25kg Bag')
   OR (market = 'CA' AND material_slug = 'ca-pipe-cold'
       AND specification IN (
         '1" X 100'' Utility Poly Pipe - Default Title',
         '4" X 30" Aluminum Pipe - Default Title'))
   OR (market = 'CA' AND material_slug = 'ca-pipe-drainage'
       AND specification IN (
         'Irwin 18" Pipe Wrench Cast Iron - Default Title',
         '1" X 100'' Poly Pipe Utility - Default Title'));

DELETE FROM public.market_price_observations
WHERE (market = 'GB' AND material_slug = 'gb-thistle-multifinish-25kg'
       AND specification = 'BoardFinish Plaster (Thistle) – 25kg Bag')
   OR (market = 'CA' AND material_slug = 'ca-pipe-cold'
       AND specification IN (
         '1" X 100'' Utility Poly Pipe - Default Title',
         '4" X 30" Aluminum Pipe - Default Title'))
   OR (market = 'CA' AND material_slug = 'ca-pipe-drainage'
       AND specification IN (
         'Irwin 18" Pipe Wrench Cast Iron - Default Title',
         '1" X 100'' Poly Pipe Utility - Default Title'));

-- 3. Both thistle sources are category URLs. Read them as search pages, so a
--    listing contributes only when its product name matches the material.
UPDATE public.price_scan_sources
SET source_type = 'search',
    source_format = 'search',
    last_scan_error = 'Reclassified as a search page on 2026-11-06: the URL is the plaster category, not a product page. Listings are now filtered by product name before a median is taken.'
WHERE product_url = 'https://www.buildbuddy.co.uk/building-materials/plaster'
  AND coalesce(source_type, '') <> 'search';

COMMIT;
