-- ============================================================
-- FRELUX: Plumbing price book GHANA (GH) — 9/9 rows complete.
-- Verified 2026-10-14 from live Accra supplier listings (zero
-- manual confirmation; scan_confidence='manual').
--
-- Fittings (per piece, Builders Hub GH, East Legon Accra,
-- buildershubgh.com — PPR-C fusion system matches the GH
-- plumbing profile: PPR-C Type 3 supply, uPVC solvent-weld DWV):
--   gh-elbow:    PPR 90° Elbow 25 mm, product 381, GHS 2.00
--   gh-tee:      PPR equal Tee 25 mm, product 391, GHS 2.50
--   gh-reducer:  PPR Reducing Tee 32 x 25 x 32 mm, product 410,
--                GHS 4.00
--   gh-union:    PPR socket Coupling 25 mm, product 376, GHS 1.50
--   gh-valve:    PPR Gate Valve 25 mm, product 430 (variation
--                list: 20mm 55.00 / 25mm 68.00 / 32mm 76.00 /
--                40mm 115.00 / 50mm 127.00), GHS 68.00
--
-- Pipes (per metre):
--   gh-pipe-cold: PPR pipe 25 mm (3/4"), arkandstar.com Accra
--                 "PPR PIPE 3/4" (product 548, code 10006)
--                 GHS 42.00 per stick; 4 m stock length confirmed
--                 by the Wadfow 4m PPR 25mm listing at
--                 supplymaster.store (Accra) and accra.cool
--                 ("PPR pipe 4-metre length") = GHS 10.50/m
--   gh-pipe-hot:  same listing; PPR-C is rated to 95 °C and
--                 serves hot + cold in GH practice = GHS 10.50/m
--   gh-pipe-waste: uPVC waste pipe 2-inch (50 mm) Class C x 6 m,
--                 buildershubgh.com product 206 (Interplast),
--                 GHS 150.50 = GHS 25.08/m
--   gh-pipe-drainage: uPVC soil pipe 4-inch (110 mm) Class B x 6 m,
--                 buildershubgh.com product 212 (Interplast),
--                 GHS 391.50 = GHS 65.25/m
--
-- Resolver: resolveMarketPlumbing (structural-market.ts) already
-- walks gh-pipe-* and gh-* fitting slugs; no app change needed.
-- On apply the GH plumbing book is complete: 9 active rows.
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('PPR 90° elbow, 25mm (GH)', 'gh-elbow', 'pipe',
   'Per piece. buildershubgh.com (Builders Hub GH, East Legon Accra) PPR 90° Elbow, Size 25mm, GHS 2.00 each — live product page read 2026-10-14. Ghana practice substitutes PPR-C fusion fittings for the NG PVC fittings.',
   CURRENT_DATE, true, 5),
  ('PPR equal tee, 25mm (GH)', 'gh-tee', 'pipe',
   'Per piece. buildershubgh.com PPR equal Tee, Size 25mm, GHS 2.50 each — live product page read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('PPR reducing tee, 32 x 25 x 32mm (GH)', 'gh-reducer', 'pipe',
   'Per piece. buildershubgh.com PPR Reducing Tee 32mm*25mm*32mm, GHS 4.00 each — live product page read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('PPR socket coupling (union), 25mm (GH)', 'gh-union', 'pipe',
   'Per piece. buildershubgh.com PPR Coupling, Size 25mm, GHS 1.50 each — live product page read 2026-10-14. Socket coupling serves the union/splice role in the PPR fusion system.',
   CURRENT_DATE, true, 5),
  ('PPR gate valve, 25mm (GH)', 'gh-valve', 'pipe',
   'Per piece. buildershubgh.com PPR Gate Valve, Size 25mm, GHS 68.00 each — live product page read 2026-10-14 (store variation list: 20mm GHS 55.00, 25mm GHS 68.00, 32mm GHS 76.00, 40mm GHS 115.00, 50mm GHS 127.00).',
   CURRENT_DATE, true, 5),
  ('PPR-C water pipe, 25mm (3/4") PN20, per metre (GH)', 'gh-pipe-cold', 'pipe',
   'Per metre. arkandstar.com (ARK AND STAR ENTERPRISE, Accra) PPR PIPE 3/4 (25mm), product 548, code 10006, GHS 42.00 per stick — live listing read 2026-10-14. 4-metre stock length confirmed by the Wadfow 4m PPR 25mm pipe listing at supplymaster.store (Accra) = GHS 10.50 per metre.',
   CURRENT_DATE, true, 5),
  ('PPR-C water pipe, 25mm (3/4") PN20, per metre (GH)', 'gh-pipe-hot', 'pipe',
   'Per metre. Same arkandstar.com PPR 3/4 stick, GHS 42.00/4m = GHS 10.50/m. PPR-C is rated to 95°C and serves hot + cold supply in Ghanaian practice (profile: PPR-C Type 3).',
   CURRENT_DATE, true, 5),
  ('uPVC waste pipe, 2-inch (50mm) Class C x 6m, per metre (GH)', 'gh-pipe-waste', 'pipe',
   'Per metre. buildershubgh.com Interplast uPVC Pipe Class C, Size 2" x 6m, GHS 150.50 = GHS 25.08/m — live product page read 2026-10-14. Solvent-weld 50mm OD waste line per the GH plumbing profile.',
   CURRENT_DATE, true, 5),
  ('uPVC soil pipe, 4-inch (110mm) Class B x 6m, per metre (GH)', 'gh-pipe-drainage', 'pipe',
   'Per metre. buildershubgh.com Interplast uPVC Pipe Class B, Size 4" x 6m, GHS 391.50 = GHS 65.25/m — live product page read 2026-10-14. 110mm OD underground soil/drainage line per the GH plumbing profile.',
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
    ('GH', 'gh-elbow',           2.00, 'GHS', 'buildershubgh.com PPR 90° Elbow 25mm (product 381) GHS 2.00 each, live listing read 2026-10-14'),
    ('GH', 'gh-tee',             2.50, 'GHS', 'buildershubgh.com PPR Tee 25mm (product 391) GHS 2.50 each, live listing read 2026-10-14'),
    ('GH', 'gh-reducer',         4.00, 'GHS', 'buildershubgh.com PPR Reducing Tee 32x25x32mm (product 410) GHS 4.00 each, live listing read 2026-10-14'),
    ('GH', 'gh-union',           1.50, 'GHS', 'buildershubgh.com PPR Coupling 25mm (product 376) GHS 1.50 each, live listing read 2026-10-14'),
    ('GH', 'gh-valve',          68.00, 'GHS', 'buildershubgh.com PPR Gate Valve 25mm (product 430) GHS 68.00 each, live listing read 2026-10-14'),
    ('GH', 'gh-pipe-cold',      10.50, 'GHS', 'arkandstar.com PPR PIPE 3/4 25mm GHS 42.00 per stick (product 548); 4m stock length per Wadfow 25mm PPR listing (supplymaster.store Accra) = GHS 10.50/m, read 2026-10-14'),
    ('GH', 'gh-pipe-hot',       10.50, 'GHS', 'Same arkandstar.com PPR 3/4 listing; PPR-C serves hot+cold to 95°C in GH practice, read 2026-10-14'),
    ('GH', 'gh-pipe-waste',     25.08, 'GHS', 'buildershubgh.com Interplast uPVC Class C 2" x 6m (product 206) GHS 150.50 = GHS 25.08/m, live listing read 2026-10-14'),
    ('GH', 'gh-pipe-drainage',  65.25, 'GHS', 'buildershubgh.com Interplast uPVC Class B 4" x 6m (product 212) GHS 391.50 = GHS 65.25/m, live listing read 2026-10-14')
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

-- Verification: expect 9 active GH plumbing rows, all 'manual'
SELECT m.slug, p.market, p.price, p.currency, p.scan_confidence
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE (m.slug LIKE 'gh-pipe-%' OR m.slug IN ('gh-elbow','gh-tee','gh-reducer','gh-union','gh-valve'))
  AND p.price_type = 'material' AND p.is_active = true
ORDER BY m.slug;
