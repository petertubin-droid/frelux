-- ============================================================
-- FRELUX: Plumbing fittings DE complete (5/5).
-- Verified 2026-10-13 from live toom.de listings (zero manual
-- confirmation; scan_confidence='manual'). DE methodology: brass
-- threaded (Schraubfitting) water fittings, 1/2 in, DVGW-rated —
-- consistent with the existing de-tee anchor.
--
--   de-elbow:   Winkel 90 deg Messing blank 1/2" IG/AG,
--               toom.de art. 5460285, EUR 8.29 (rendered product page)
--   de-reducer: Reduzierstueck Messing blank 3/4" IG x 1/2" AG,
--               toom.de live cross-listing on the product page, EUR 3.99
--   de-union:   Muffe Messing blank 1/2" IG,
--               toom.de live cross-listing on the product page, EUR 4.29
--   de-valve:   Kugelhahn Messing 1/2 Zoll,
--               toom.de search listing (kugelhahn messing), EUR 6.99
--
-- On apply: US 5/5, GB 5/5, AT 5/5, DE 5/5 — 20/20 fitting rows.
-- ============================================================

-- 1. Materials (idempotent by slug; category 'pipe')
INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('Brass elbow 90 deg, 1/2 in IG/AG (DE)', 'de-elbow', 'pipe',
   'Per piece. toom.de Winkel 90 Grad Messing blank 1/2" IG/AG (Cornat, art. 5460285) EUR 8.29 (read from rendered live product page 2026-10-13). DE practice uses brass threaded (Schraubfitting) fittings.',
   CURRENT_DATE, true, 5),
  ('Brass reducer, 3/4 in IG x 1/2 in AG (DE)', 'de-reducer', 'pipe',
   'Per piece. toom.de Reduzierstueck Messing blank 3/4" IG x 1/2" AG EUR 3.99 (read from live toom.de listing 2026-10-13).',
   CURRENT_DATE, true, 5),
  ('Brass coupling (union), 1/2 in IG (DE)', 'de-union', 'pipe',
   'Per piece. toom.de Muffe Messing blank 1/2" IG EUR 4.29 (read from live toom.de listing 2026-10-13).',
   CURRENT_DATE, true, 5),
  ('Brass ball valve, 1/2 in (DE)', 'de-valve', 'pipe',
   'Per piece. toom.de Kugelhahn Messing 1/2 Zoll EUR 6.99 (read from live toom.de listing 2026-10-13).',
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
    ('DE', 'de-elbow',   8.29, 'EUR', 'toom.de Winkel 90 Grad Messing blank 1/2" IG/AG (Cornat art. 5460285) EUR 8.29, rendered live product page read 2026-10-13'),
    ('DE', 'de-reducer', 3.99, 'EUR', 'toom.de Reduzierstueck Messing blank 3/4" IG x 1/2" AG EUR 3.99, live listing read 2026-10-13'),
    ('DE', 'de-union',   4.29, 'EUR', 'toom.de Muffe Messing blank 1/2" IG EUR 4.29, live listing read 2026-10-13'),
    ('DE', 'de-valve',   6.99, 'EUR', 'toom.de Kugelhahn Messing 1/2 Zoll EUR 6.99, live listing read 2026-10-13')
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

-- 3. Verification (expect 20 active fitting rows, all 'manual')
SELECT m.slug, p.market, p.price, p.currency, p.scan_confidence
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE m.slug LIKE '%-elbow' OR m.slug LIKE '%-tee' OR m.slug LIKE '%-reducer'
   OR m.slug LIKE '%-union' OR m.slug LIKE '%-valve'
  AND p.price_type = 'material' AND p.is_active = true
ORDER BY p.market, m.slug;
