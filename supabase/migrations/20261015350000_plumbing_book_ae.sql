-- ============================================================
-- FRELUX: Plumbing price book UAE (AE) — 9/9 rows, verified
-- 2026-10-14 from live UAE listings (fepy.com, browser-verified
-- where noted; plazamiddleeast.com), scan_confidence='manual'.
-- System per AE profile: PPR-C Type 3 PN20 25mm heat-fusion
-- supply (Dubai Building Code / BS EN ISO 15874), uPVC 50mm
-- waste / 110mm soil (BS EN 12056).
--   ae-elbow:  25mm 90° PPR elbow, fepy.com AED 1.05 incl VAT
--               (browser-verified: AED 1.00 excl)
--   ae-tee:    25mm PPR tee, fepy.com AED 1.05 incl VAT
--   ae-reducer: 32x25mm PPR reducing tee, fepy.com AED 2.10
--               incl VAT (browser-verified)
--   ae-union:  PPR union 25mm RAKTHERM, plazamiddleeast AED 11.67
--   ae-valve:  25mm PPR ball valve, fepy.com AED 8.01
--   ae-pipe-cold/hot: 25mm x 4m PPR pipe, fepy.com AED 14.61 =
--               AED 3.65/m
--   ae-pipe-waste: 50mm x 6m Class 10 PVC pipe, fepy.com AED 20.00
--               = AED 3.33/m
--   ae-pipe-drainage: 110mm x 6m Class 10 PVC pipe, fepy.com
--               AED 63.75 = AED 10.63/m
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('PPR elbow, 25mm 90° (AE)', 'ae-elbow', 'pipe', 'Per piece. fepy.com 25mm x 90 Degree PPR Elbow, AED 1.05 incl 5% VAT (AED 1.00 excl) — browser-verified 2026-10-14. UAE practice uses PPR-C Type 3 PN20 heat-fusion fittings per Dubai Building Code.', CURRENT_DATE, true, 5),
  ('PPR tee, 25mm (AE)', 'ae-tee', 'pipe', 'Per piece. fepy.com 25mm PPR tee pipe fitting, AED 1.05 incl VAT — live listing read 2026-10-14 (Wefatherm 25mm tee also listed at AED 3.00).', CURRENT_DATE, true, 5),
  ('PPR reducing tee, 32 x 25mm (AE)', 'ae-reducer', 'pipe', 'Per piece. fepy.com 32 x 25mm PPR Reducing Tee, AED 2.10 incl VAT (AED 2.00 excl) — browser-verified 2026-10-14.', CURRENT_DATE, true, 5),
  ('PPR union, 25mm (AE)', 'ae-union', 'pipe', 'Per piece. plazamiddleeast.com PPR union 25mm RAKTHERM, AED 11.67 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PPR ball valve, 25mm (AE)', 'ae-valve', 'pipe', 'Per piece. fepy.com 25mm PPR ball valve, AED 8.01 — live listing read 2026-10-14 (RAKTHERM PPR ball valve 25mm AED 21.67 at plazamiddleeast corroborates the band).', CURRENT_DATE, true, 5),
  ('PPR pipe, 25mm PN20 x 4m, per metre (AE)', 'ae-pipe-cold', 'pipe', 'Per metre. fepy.com 25mm x 4m PPR Pipe, AED 14.61 per 4 m stick = AED 3.65/m — live listing read 2026-10-14. 25mm OD trunk per Dubai code.', CURRENT_DATE, true, 5),
  ('PPR pipe, 25mm PN20 x 4m, per metre (AE)', 'ae-pipe-hot', 'pipe', 'Per metre. Same fepy.com 25mm x 4m PPR stick, AED 14.61 = AED 3.65/m. PPR-C serves hot + cold (rated to 95°C).', CURRENT_DATE, true, 5),
  ('PVC waste pipe, 50mm x 6m, per metre (AE)', 'ae-pipe-waste', 'pipe', 'Per metre. fepy.com 50mm x 6m Class 10 PVC pipe, AED 20.00 = AED 3.33/m — live listing read 2026-10-14. 50mm OD uPVC waste line per BS EN 12056.', CURRENT_DATE, true, 5),
  ('PVC soil pipe, 110mm x 6m, per metre (AE)', 'ae-pipe-drainage', 'pipe', 'Per metre. fepy.com 110mm x 6m Class 10 PVC pipe, AED 63.75 = AED 10.63/m — live listing read 2026-10-14. 110mm soil stack / underground drainage.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('AE', 'ae-elbow',            1.05, 'AED', 'fepy.com 25mm 90° PPR elbow AED 1.05 incl VAT, browser-verified 2026-10-14'),
    ('AE', 'ae-tee',              1.05, 'AED', 'fepy.com 25mm PPR tee AED 1.05 incl VAT, live listing read 2026-10-14'),
    ('AE', 'ae-reducer',          2.10, 'AED', 'fepy.com 32x25mm PPR reducing tee AED 2.10 incl VAT, browser-verified 2026-10-14'),
    ('AE', 'ae-union',           11.67, 'AED', 'plazamiddleeast.com PPR union 25mm RAKTHERM AED 11.67, live listing read 2026-10-14'),
    ('AE', 'ae-valve',            8.01, 'AED', 'fepy.com 25mm PPR ball valve AED 8.01, live listing read 2026-10-14'),
    ('AE', 'ae-pipe-cold',        3.65, 'AED', 'fepy.com 25mm x 4m PPR pipe AED 14.61 = AED 3.65/m, live listing read 2026-10-14'),
    ('AE', 'ae-pipe-hot',         3.65, 'AED', 'Same fepy.com 25mm x 4m PPR stick; PPR serves hot+cold to 95°C, read 2026-10-14'),
    ('AE', 'ae-pipe-waste',       3.33, 'AED', 'fepy.com 50mm x 6m Class 10 PVC pipe AED 20.00 = AED 3.33/m, live listing read 2026-10-14'),
    ('AE', 'ae-pipe-drainage',   10.63, 'AED', 'fepy.com 110mm x 6m Class 10 PVC pipe AED 63.75 = AED 10.63/m, live listing read 2026-10-14')
  ) AS v(market, slug, price, currency, source)
  JOIN estimation_materials m ON m.slug = v.slug
)
, deactivated AS (
  UPDATE estimation_prices p SET is_active = false, updated_at = now()
  FROM seeded s
  WHERE p.price_type = 'material' AND p.ref_id = s.material_id AND p.market = s.market AND p.is_active = true
  RETURNING 1
)
INSERT INTO estimation_prices (price_type, ref_id, price, currency, effective_date, notes, is_active, price_source, scan_confidence, market)
SELECT 'material', s.material_id, s.price, s.currency, CURRENT_DATE, s.source, true, s.source, 'manual', s.market
FROM seeded s
ON CONFLICT DO NOTHING;

SELECT m.slug, p.market, p.price, p.currency, p.scan_confidence
FROM estimation_materials m JOIN estimation_prices p ON p.ref_id = m.id
WHERE (m.slug LIKE 'ae-pipe-%' OR m.slug IN ('ae-elbow','ae-tee','ae-reducer','ae-union','ae-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
