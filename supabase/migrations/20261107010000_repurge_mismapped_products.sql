-- Remove the mismapped products the stale scanner wrote after the last repair.
--
-- 20261106235500 repaired these rows on 2026-11-06 23:55, but the deployed
-- price-intel-scan was still the 2026-11-05 build until 2026-11-07 00:56: it
-- carried neither the product-name refusal (commit 90f1b36e) nor the
-- observation fix (e0b38ed8). The stale build upserted the BuildBuddy plaster
-- category page into gb-thistle-multifinish-25kg, and two pipe search pages
-- into ca-pipe-cold and ca-pipe-drainage, so six rows came back on 2026-11-07:
-- BoardFinish priced as MultiFinish, Bonding Coat filed twice, an aluminium
-- pipe at CAD 67.99 as 20mm PVC, and one row carrying the price 7.93 in the
-- unit column.
--
-- The scanner now refuses a listing whose product name does not match the
-- material. This migration removes what it wrote while stale and raises if any
-- of it survives, so the next scan prices from a clean table.
--
-- Idempotent: every statement is a delete or a guarded update.

BEGIN;

-- 1. Bonding Coat already has its own row (moved by 20261106235500 and
--    rewritten by the stale scanner with the same price), so the stray copies
--    under MultiFinish are duplicates, not evidence to move again.
DELETE FROM public.market_material_prices
WHERE market = 'GB'
  AND material_slug = 'gb-thistle-multifinish-25kg'
  AND specification IN (
    'Bonding Coat Plaster (Thistle) – 25kg Bag',
    'BoardFinish Plaster (Thistle) – 25kg Bag');

DELETE FROM public.market_price_observations
WHERE market = 'GB'
  AND material_slug = 'gb-thistle-multifinish-25kg'
  AND specification IN (
    'Bonding Coat Plaster (Thistle) – 25kg Bag',
    'BoardFinish Plaster (Thistle) – 25kg Bag');

-- 2. A row whose unit column holds a number has no unit at all. This one came
--    from the same category page and would otherwise be priced as a bag.
DELETE FROM public.market_material_prices
WHERE market = 'GB'
  AND material_slug = 'gb-thistle-multifinish-25kg'
  AND unit ~ '^[0-9]+([.][0-9]+)?$';

-- 3. Neither pipe slug has a material of its own, so a price under either one
--    describes something else.
DELETE FROM public.market_material_prices
WHERE market = 'CA'
  AND material_slug IN ('ca-pipe-cold', 'ca-pipe-drainage');

DELETE FROM public.market_price_observations
WHERE market = 'CA'
  AND material_slug IN ('ca-pipe-cold', 'ca-pipe-drainage');

-- 4. Guard: nothing may remain under a slug that has no matching material, and
--    the MultiFinish slug may carry MultiFinish alone.
DO $$
DECLARE leftovers integer;
BEGIN
  SELECT count(*) INTO leftovers
  FROM public.market_material_prices
  WHERE material_slug IN ('ca-pipe-cold', 'ca-pipe-drainage')
     OR (market = 'GB' AND material_slug = 'gb-thistle-multifinish-25kg'
         AND coalesce(specification, '') NOT IN (
           '', 'MultiFinish Plaster (Thistle) – 25kg Bag'))
     OR (market = 'GB' AND unit ~ '^[0-9]+([.][0-9]+)?$');
  IF leftovers > 0 THEN
    RAISE EXCEPTION 'Mismapped product rows survived the purge: %', leftovers;
  END IF;
END $$;

COMMIT;
