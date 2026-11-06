-- Price table integrity: remove true duplicates, neutralise the legacy price
-- column, and deactivate superseded active rows.
--
-- What the audit actually found (production, 2026-11-06):
--   * estimation_prices held 22 groups / 24 extra rows that were identical in
--     ref_id, market, price and effective_date. Two of them were the same
--     weekly scan written twice, once per run.
--   * 6 groups had two active unverified rows for the same
--     (ref_id, market, price_type), so an estimate could pick either.
--   * market_material_prices held 1 true duplicate caused by the storefront
--     appending " - Default Title" to Shopify default variants.
--   * The same table appeared to hold more duplicates, but inspection showed
--     distinct products filed under one slug (Bonding Coat, MultiFinish and
--     BoardFinish plaster all under gb-thistle-multifinish-25kg). Those are
--     NOT deleted here: deleting them would hide a mapping defect behind a
--     data loss. They are reported instead.
--   * frelux_price disagreed with median_price in 53 rows and no code reads
--     it. It is aligned to median_price so a future reader is not misled.
--
-- Idempotent: every statement is guarded, and running twice changes nothing.

-- 1. Exact duplicate estimation_prices rows, newest kept.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY ref_id, coalesce(market, ''), price, effective_date
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.estimation_prices
)
DELETE FROM public.estimation_prices e
USING ranked r
WHERE e.id = r.id AND r.rn > 1;

-- 2. Superseded active unverified rows: keep only the newest per
--    (ref_id, market, price_type). A verified row is never touched, because
--    verification is evidence and deactivating it would discard that.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY ref_id, coalesce(market, ''), price_type
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.estimation_prices
  WHERE is_active IS TRUE AND verified_at IS NULL
)
UPDATE public.estimation_prices e
SET is_active = false, updated_at = now()
FROM ranked r
WHERE e.id = r.id AND r.rn > 1;

-- 3. Shopify default-variant suffix duplicate in market_material_prices.
--    Same market, slug, supplier and price, where one specification is the
--    other plus " - Default Title": keep the shorter, delete the suffixed one.
DELETE FROM public.market_material_prices p
USING public.market_material_prices k
WHERE p.market = k.market
  AND p.material_slug = k.material_slug
  AND coalesce(p.supplier_name, '') = coalesce(k.supplier_name, '')
  AND p.current_price IS NOT DISTINCT FROM k.current_price
  AND p.specification = k.specification || ' - Default Title'
  AND coalesce(p.is_test, false) = false
  AND coalesce(k.is_test, false) = false;

-- 4. Legacy column alignment. frelux_price is written by nothing and read by
--    nothing since the market price writer moved to median_price; 53 rows kept
--    a stale figure (for example 28.75 beside a live 146). Aligning it makes
--    any dormant reader harmless instead of wrong.
UPDATE public.market_material_prices
SET frelux_price = median_price, updated_at = now()
WHERE median_price IS NOT NULL
  AND median_price > 0
  AND coalesce(is_test, false) = false
  AND (frelux_price IS NULL OR abs(frelux_price - median_price) > 0.01);

-- 5. A supporting index for the duplicate checks above, so the audit query
--    that found these groups stays cheap as the table grows.
CREATE INDEX IF NOT EXISTS idx_mmp_market_slug_supplier
  ON public.market_material_prices (market, material_slug, coalesce(supplier_name, ''));

COMMENT ON COLUMN public.market_material_prices.frelux_price IS
  'Legacy column, aligned to median_price on 2026-11-06. Nothing reads it; median_price is the applied price. Do not write it.';
