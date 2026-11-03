-- Fill the per-market price view from the canonical price book.
-- The market prices screen reads market_material_prices, which only ever held
-- 11 scanned rows, so 38 markets showed no prices at all. This copies the live
-- price book into that view once, without inventing anything: the price, date,
-- currency, supplier and verification status all come from estimation_prices.
-- Existing scan rows are left untouched (DO NOTHING), so scanner observations
-- are never overwritten.

INSERT INTO public.market_material_prices (
  market, market_name, material_id, material_slug, product_name, category,
  brand, specification, unit, currency, current_price, median_price, avg_price,
  min_observed, max_observed, supplier_name, source_url, last_verified_at,
  verification_status, observations_count, suppliers_count, is_test,
  updated_at
)
SELECT DISTINCT ON (l.market, l.ref_id)
       l.market,
       mp.country_name,
       m.id,
       m.slug,
       m.name,
       m.category,
       '',
       '',
       COALESCE(NULLIF(l.sale_unit, ''), m.pack_size::text, 'unit'),
       l.currency,
       l.price,
       l.price,
       l.price,
       l.price,
       l.price,
       l.supplier_name,
       l.source_url,
       l.verified_at,
       CASE WHEN l.verification_status = 'verified' THEN 'verified' ELSE 'unverified' END,
       1,
       1,
       false,
       now()
FROM (
  SELECT DISTINCT ON (p.market, p.ref_id) p.*
  FROM public.estimation_prices p
  WHERE p.price_type = 'material'
    AND p.is_active
    AND p.market IS NOT NULL
    AND p.price > 0
  ORDER BY p.market, p.ref_id, p.effective_date DESC NULLS LAST, p.updated_at DESC
) l
JOIN public.estimation_materials m ON m.id = l.ref_id
LEFT JOIN public.market_profiles mp ON mp.country_code = l.market
ORDER BY l.market, l.ref_id
ON CONFLICT (market, material_slug, brand, specification, unit) DO NOTHING;
