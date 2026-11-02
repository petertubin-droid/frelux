-- ============================================================
-- FRELUX: Plumbing fittings batch 2 — AT complete (5/5), GB
-- complete (5/5), first DE anchor.
-- Verified 2026-10-13 from live supplier listings (zero manual
-- confirmation; scan_confidence='manual').
--
-- Completes:
--   AT: at-elbow (PPR-Winkel Multitherm 90° 25mm, HORNBACH.at
--       EUR 0.99), at-union (PPR-Muffe Multitherm 25mm, HORNBACH.at
--       EUR 0.89), at-valve (Kugelhahn Edelstahl 1/2" I/I,
--       HORNBACH.at EUR 9.95) — keeps the AT PPR fusion
--       methodology consistent with at-tee/at-reducer.
--   GB: gb-union (JG Speedfit push-fit coupler 15mm, Screwfix
--       GBP 4.04 inc VAT, product 89950) — completes the GB
--       push-fit book.
--   DE: de-tee (T-Stück Messing 1/2", toom.de EUR 3.49) — first
--       clean German per-piece anchor.
--
-- Still disclosed-unresolved (never NG fallback): de-elbow,
-- de-reducer, de-union, de-valve — obi.de/hornbach.de snippets
-- remain price-poor; re-scan via product-page reads.
-- ============================================================

-- 1. Materials (idempotent by slug; category 'pipe')
INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('PPR elbow 90 deg, 25 x 25mm (AT)', 'at-elbow', 'pipe',
   'Per piece. HORNBACH.at PPR-Winkel Multitherm 90 grad 25x25mm EUR 0.99 (read from live listing 2026-10-13, hornbach.at/p/4031000). AT practice uses PPR fusion fittings.',
   CURRENT_DATE, true, 5),
  ('PPR coupling (union), 25 x 25mm (AT)', 'at-union', 'pipe',
   'Per piece. HORNBACH.at PPR-Muffe Multitherm 25x25mm EUR 0.89 (read from live listing 2026-10-13, hornbach.at/p/4031022).',
   CURRENT_DATE, true, 5),
  ('Stainless-steel ball valve, 1/2 in (AT)', 'at-valve', 'pipe',
   'Per piece. HORNBACH.at Kugelhahn aus Edelstahl 1/2" I/I EUR 9.95 (read from live listing 2026-10-13, hornbach.at/p/6088338).',
   CURRENT_DATE, true, 5),
  ('Push-fit coupler (union), 15mm (GB)', 'gb-union', 'pipe',
   'Per piece. Screwfix JG Speedfit push-fit coupler 15mm GBP 4.04 inc VAT, product 89950 (read from live listing 2026-10-13, screwfix.com).',
   CURRENT_DATE, true, 5),
  ('Brass threaded tee, 1/2 in (DE)', 'de-tee', 'pipe',
   'Per piece. toom.de T-Stueck Messing 1/2 Zoll EUR 3.49 (read from live listing 2026-10-13, toom.de/p/5464965). First German per-piece anchor; remaining DE fittings still disclosed-unresolved.',
   CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    effective_date = EXCLUDED.effective_date,
    is_active = true,
    updated_at = now();

-- 2. Prices (deactivate prior active rows, insert verified ones)
WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('AT', 'at-elbow', 0.99, 'EUR', 'HORNBACH.at PPR-Winkel Multitherm 90deg 25x25mm EUR 0.99, live listing read 2026-10-13 (hornbach.at/p/4031000)'),
    ('AT', 'at-union', 0.89, 'EUR', 'HORNBACH.at PPR-Muffe Multitherm 25x25mm EUR 0.89, live listing read 2026-10-13 (hornbach.at/p/4031022)'),
    ('AT', 'at-valve', 9.95, 'EUR', 'HORNBACH.at Kugelhahn aus Edelstahl 1/2" I/I EUR 9.95, live listing read 2026-10-13 (hornbach.at/p/6088338)'),
    ('GB', 'gb-union', 4.04, 'GBP', 'Screwfix JG Speedfit push-fit coupler 15mm GBP 4.04 inc VAT (product 89950), live listing read 2026-10-13 (screwfix.com)'),
    ('DE', 'de-tee',   3.49, 'EUR', 'toom.de T-Stueck Messing 1/2 Zoll EUR 3.49, live listing read 2026-10-13 (toom.de/p/5464965)')
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

-- 3. Verification (expect 5 new rows, all scan_confidence='manual';
--    16 total fitting rows across US/GB/AT/DE)
SELECT m.slug, m.name, p.market, p.price, p.currency, p.scan_confidence
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE m.slug IN ('us-elbow','us-tee','us-reducer','us-union','us-valve',
                 'gb-elbow','gb-tee','gb-reducer','gb-union','gb-valve',
                 'at-elbow','at-tee','at-reducer','at-union','at-valve',
                 'de-tee')
  AND p.price_type = 'material' AND p.is_active = true
ORDER BY p.market, m.slug;
