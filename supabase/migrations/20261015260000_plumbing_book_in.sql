-- ============================================================
-- FRELUX: Plumbing price book INDIA (IN) — 9/9 rows complete.
-- Verified 2026-10-14 from live Indian supplier listings (zero
-- manual confirmation; scan_confidence='manual').
--
-- Fittings (per piece; CPVC solvent-weld system matches the IN
-- plumbing profile: CPVC ASTM D2846 25mm supply, SWR PVC
-- IS 13592 Type A waste / Type B soil):
--   in-elbow:   Ashirvad FlowGuard Plus 1 in (25mm) Elbow 90,
--               ibo.com ₹35 incl GST
--   in-tee:     Supreme 1 in (25mm) CPVC Tee, ibo.com ₹35
--   in-reducer: TRUFLO 1¼ x 1 in (32x25mm) CPVC Reducer Tee,
--               ibo.com ₹122
--   in-union:   Supreme 1 in (25mm) CPVC Union, ibo.com ₹78
--   in-valve:   Finolex CPVC Ball Valve 25mm 1 inch, mykit.in
--               ₹280 incl taxes
--
-- Pipes (per metre):
--   in-pipe-cold: Astral CPVC Pro 25mm Class 2 SDR-13.5 x 3 m,
--               moglix.com ₹330 incl taxes = ₹110/m
--   in-pipe-hot: same listing; CPVC SDR 11 serves hot + cold
--   in-pipe-waste: SWR PVC 50mm Type A x 3 m, tradeindia.com
--               ₹95/piece = ₹31.67/m
--   in-pipe-drainage: Astral SWR Type B 110mm x 3 m,
--               kansalbuildmartllp.com ₹975.20 = ₹325.07/m
--               (corroborated: Astral 2024 list 110mm SWR 10ft
--               ₹1,032; IndiaMART Astral 110mm Type A 3m ₹1,032)
--
-- Resolver: resolveMarketPlumbing (structural-market.ts) already
-- walks in-pipe-* and in-* fitting slugs; no app change needed.
-- On apply the IN plumbing book is complete: 9 active rows.
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('CPVC elbow, 25mm (1") 90° (IN)', 'in-elbow', 'pipe',
   'Per piece. ibo.com Ashirvad FlowGuard Plus 1 in. (25 mm) CPVC Elbow 90, ₹35 incl GST — live listing read 2026-10-14. Indian practice uses CPVC solvent-weld fittings (ASTM D2846) for the 25mm supply system.',
   CURRENT_DATE, true, 5),
  ('CPVC equal tee, 25mm (1") (IN)', 'in-tee', 'pipe',
   'Per piece. ibo.com Supreme 1 in. (25 mm) CPVC Tee, ₹35 incl GST — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('CPVC reducing tee, 32 x 25mm (1¼ x 1") (IN)', 'in-reducer', 'pipe',
   'Per piece. ibo.com TRUFLO 1¼ x 1 in. (32 x 25 mm) CPVC Reducer Tee, ₹122 incl GST — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('CPVC union, 25mm (1") (IN)', 'in-union', 'pipe',
   'Per piece. ibo.com Supreme 1 in. (25 mm) CPVC Union, ₹78 incl GST — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('CPVC ball valve, 25mm (1") (IN)', 'in-valve', 'pipe',
   'Per piece. mykit.in Finolex CPVC Ball Valve 25mm 1 inch, ₹280 incl taxes — live listing read 2026-10-14 (corroborated: Ashirvad 1" CPVC ball valve ₹297 on IndiaMART).',
   CURRENT_DATE, true, 5),
  ('CPVC pipe, 25mm (1") SDR-11, per metre (IN)', 'in-pipe-cold', 'pipe',
   'Per metre. moglix.com Astral CPVC Pro 25mm Class 2 SDR-13.5 pipe, length 3 m, ₹330 incl all taxes = ₹110/m — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('CPVC pipe, 25mm (1") SDR-11, per metre (IN)', 'in-pipe-hot', 'pipe',
   'Per metre. Same moglix.com Astral CPVC Pro 25mm x 3 m stick, ₹330 = ₹110/m. CPVC SDR 11 serves hot + cold supply in Indian practice (IS 15778 / ASTM D2846).',
   CURRENT_DATE, true, 5),
  ('SWR PVC waste pipe, 50mm Type A x 3m, per metre (IN)', 'in-pipe-waste', 'pipe',
   'Per metre. tradeindia.com 50mm SWR Pipe, PVC hard tube, 3 m length, ₹95/piece = ₹31.67/m — live listing read 2026-10-14. Solvent-weld 50mm Type A waste line per the IN plumbing profile (IS 13592).',
   CURRENT_DATE, true, 5),
  ('SWR PVC soil pipe, 110mm Type B x 3m, per metre (IN)', 'in-pipe-drainage', 'pipe',
   'Per metre. kansalbuildmartllp.com Astral SWR Pipe Type B 110mm x 3 m (single socket), ₹975.20 = ₹325.07/m — live listing read 2026-10-14. 110mm Type B soil stack per IS 13592 (corroborated by Astral 2024 list price ₹1,032 for 110mm SWR 10ft).',
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
    ('IN', 'in-elbow',           35.00, 'INR', 'ibo.com Ashirvad FlowGuard Plus 1" (25mm) CPVC Elbow 90 ₹35 incl GST, live listing read 2026-10-14'),
    ('IN', 'in-tee',             35.00, 'INR', 'ibo.com Supreme 1" (25mm) CPVC Tee ₹35 incl GST, live listing read 2026-10-14'),
    ('IN', 'in-reducer',        122.00, 'INR', 'ibo.com TRUFLO 1¼ x 1" (32x25mm) CPVC Reducer Tee ₹122 incl GST, live listing read 2026-10-14'),
    ('IN', 'in-union',           78.00, 'INR', 'ibo.com Supreme 1" (25mm) CPVC Union ₹78 incl GST, live listing read 2026-10-14'),
    ('IN', 'in-valve',          280.00, 'INR', 'mykit.in Finolex CPVC Ball Valve 25mm 1inch ₹280 incl taxes, live listing read 2026-10-14'),
    ('IN', 'in-pipe-cold',      110.00, 'INR', 'moglix.com Astral CPVC Pro 25mm SDR-13.5 x 3m ₹330 incl taxes = ₹110/m, live listing read 2026-10-14'),
    ('IN', 'in-pipe-hot',       110.00, 'INR', 'Same moglix.com Astral CPVC 25mm x 3m listing; CPVC serves hot+cold, read 2026-10-14'),
    ('IN', 'in-pipe-waste',      31.67, 'INR', 'tradeindia.com 50mm SWR PVC pipe 3m ₹95/piece = ₹31.67/m, live listing read 2026-10-14'),
    ('IN', 'in-pipe-drainage',  325.07, 'INR', 'kansalbuildmartllp.com Astral SWR Type B 110mm x 3m ₹975.20 = ₹325.07/m, live listing read 2026-10-14')
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

-- Verification: expect 9 active IN plumbing rows, all 'manual'
SELECT m.slug, p.market, p.price, p.currency, p.scan_confidence
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE (m.slug LIKE 'in-pipe-%' OR m.slug IN ('in-elbow','in-tee','in-reducer','in-union','in-valve'))
  AND p.price_type = 'material' AND p.is_active = true
ORDER BY m.slug;
