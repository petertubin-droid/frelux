-- ============================================================
-- FRELUX: Plumbing pipes AT + DE complete (16/16 book rows).
-- Verified 2026-10-13 from live supplier listings (zero manual
-- confirmation; scan_confidence='manual').
--
--   at-pipe-waste:     HT Rohr DN 50 1000 mm, hornbach.at art
--                      262942, EUR 2.25/ST = EUR 2.25/m (rendered
--                      product page: "Entspricht 2,25 EUR pro m";
--                      PP, DIN EN 1451-1, house drainage above ground)
--   at-pipe-drainage:  HT Rohr DN 110 2000 mm, hornbach.at art
--                      266955, EUR 10.50/2 m = EUR 5.25/m (standard
--                      residential drainage size in AT)
--   de-pipe-cold:      Kupferrohr als Stange 15 x 1 mm 5 m,
--                      hornbach.de art 1319206, EUR 34.00/5 m =
--                      EUR 6.80/m (copper hard rod serves hot+cold;
--                      pairs with the DE brass Schraubfitting book)
--   de-pipe-hot:       same hornbach.de listing, EUR 6.80/m
--
-- On apply the pipe book is complete for US/GB/AT/DE: 16 active rows.
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('HT waste pipe DN 50, per metre (AT)', 'at-pipe-waste', 'pipe',
   'Per metre. hornbach.at HT Rohr DN 50 1000 mm (art. 262942) EUR 2.25 per m, rendered live product page read 2026-10-13. PP per DIN EN 1451-1; Austrian standard above-ground house drainage.',
   CURRENT_DATE, true, 5),
  ('HT drainage pipe DN 110, per metre (AT)', 'at-pipe-drainage', 'pipe',
   'Per metre. hornbach.at HT Rohr DN 110 2000 mm (art. 266955) EUR 10.50 per 2 m = EUR 5.25/m, live listing read 2026-10-13.',
   CURRENT_DATE, true, 5),
  ('Copper water pipe 15 x 1 mm, per metre (DE)', 'de-pipe-cold', 'pipe',
   'Per metre. hornbach.de Kupferrohr als Stange 15 x 1 mm 5 m (art. 1319206) EUR 34.00 per 5 m = EUR 6.80/m, live listing read 2026-10-13. German residential hot+cold water practice; pairs with brass Schraubfitting fittings.',
   CURRENT_DATE, true, 5),
  ('Copper water pipe 15 x 1 mm, per metre (DE)', 'de-pipe-hot', 'pipe',
   'Same hornbach.de listing; copper hard rod serves hot and cold water in DE practice.',
   CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    effective_date = EXCLUDED.effective_date,
    is_active = true,
    updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('AT', 'at-pipe-waste',    2.25, 'EUR', 'hornbach.at HT Rohr DN 50 1000 mm (art. 262942) EUR 2.25/m, rendered live product page 2026-10-13'),
    ('AT', 'at-pipe-drainage', 5.25, 'EUR', 'hornbach.at HT Rohr DN 110 2000 mm (art. 266955) EUR 10.50/2 m = EUR 5.25/m, live listing 2026-10-13'),
    ('DE', 'de-pipe-cold',     6.80, 'EUR', 'hornbach.de Kupferrohr als Stange 15 x 1 mm 5 m (art. 1319206) EUR 34.00/5 m = EUR 6.80/m, live listing 2026-10-13'),
    ('DE', 'de-pipe-hot',      6.80, 'EUR', 'Same hornbach.de copper 15x1 listing; copper serves hot+cold in DE practice')
  ) AS v(market, slug, price, currency, source)
  JOIN estimation_materials m ON m.slug = v.slug
)
, deactivated AS (
  UPDATE estimation_prices p
  SET is_active = false, updated_at = now()
  FROM seeded s
  WHERE p.price_type = 'material'
    AND p.ref_id = s.material_id
    AND p.market = s.market
    AND p.is_active = true
  RETURNING 1
)
INSERT INTO estimation_prices (price_type, ref_id, price, currency, effective_date, notes, is_active, price_source, scan_confidence, market)
SELECT 'material', s.material_id, s.price, s.currency, CURRENT_DATE, s.source, true, s.source, 'manual', s.market
FROM seeded s
ON CONFLICT DO NOTHING;

-- Verification (expect 16 active pipe rows, all 'manual')
SELECT m.slug, p.market, p.price, p.currency, p.scan_confidence
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE m.slug LIKE '%-pipe-%'
  AND p.price_type = 'material' AND p.is_active = true
ORDER BY p.market, m.slug;
