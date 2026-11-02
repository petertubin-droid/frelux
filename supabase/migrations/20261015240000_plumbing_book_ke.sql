-- ============================================================
-- FRELUX: Plumbing price book KENYA (KE) — 9/9 rows complete.
-- Verified 2026-10-14 from live Nairobi-area supplier listings
-- (zero manual confirmation; scan_confidence='manual').
--
-- Fittings (per piece; PPR-C fusion system matches the KE
-- plumbing profile: PPR-C DIN 8077/8078 supply, uPVC KS waste):
--   ke-elbow:   PPR Elbow 25 mm, hanzach.com (Hanzach Ventures,
--                Nairobi) KSh 20/pc
--   ke-tee:     PPR Tee 25 mm, hanzach.com KSh 30/pc
--   ke-reducer: PPR Reduced Tee 25*20, hanzach.com KSh 35/pc
--   ke-union:   PPR Union 25 mm, kkempiretradesslimited.com
--                (KK Empire Tradess, Nairobi) KES 33/pc
--   ke-valve:   25 mm PPR gate valve, nikkohardware.co.ke
--                (Nikko Hardware, Nairobi) KSh 135/pc
--
-- Pipes (per metre):
--   ke-pipe-cold: PPR pipe 3/4" (25 mm) x 4 m, randtech.co.ke
--                KSh 380 = KSh 95/m (corroborated: wecogroup.co.ke
--                AQUA-PPR PN20 4 m sizes, hanzach Danco 25 mm
--                KSh 300/pc, jiji.co.ke KSh 410)
--   ke-pipe-hot: same listing; PPR PN20 serves hot + cold
--   ke-pipe-waste: Standard 2-inch (50 mm) uPVC waste pipe x 6 m,
--                trustedbuilder.co.ke KSh 550 = KSh 91.67/m
--   ke-pipe-drainage: PVC-U waste/soil pipe 4" x 3 mm x 6 m,
--                jiji.co.ke Industrial Area (Nairobi) KSh 1,900 =
--                KSh 316.67/m (110 mm soil stack per KE profile;
--                corroborated by 4"x6m listings at KSh 2,050)
--
-- Resolver: resolveMarketPlumbing (structural-market.ts) already
-- walks ke-pipe-* and ke-* fitting slugs; no app change needed.
-- On apply the KE plumbing book is complete: 9 active rows.
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('PPR elbow, 25mm (KE)', 'ke-elbow', 'pipe',
   'Per piece. hanzach.com (Hanzach Ventures Ltd, Nairobi) PPR ELBOW 25MM, KSh 20 per pc — live listing read 2026-10-14. Kenyan practice substitutes PPR-C fusion fittings for the NG PVC fittings.',
   CURRENT_DATE, true, 5),
  ('PPR equal tee, 25mm (KE)', 'ke-tee', 'pipe',
   'Per piece. hanzach.com PPR TEE 25MM, KSh 30 per pc — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('PPR reduced tee, 25 x 20mm (KE)', 'ke-reducer', 'pipe',
   'Per piece. hanzach.com PPR REDUCED TEE 25*20, KSh 35 per pc — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('PPR union, 25mm (KE)', 'ke-union', 'pipe',
   'Per piece. kkempiretradesslimited.com (KK Empire Tradess Ltd, Nairobi) UNION 25MM PPR, KES 33 per pc — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('PPR gate valve, 25mm (KE)', 'ke-valve', 'pipe',
   'Per piece. nikkohardware.co.ke (Nikko Hardware, Nairobi) 25mm PPR gate valve, KSh 135 per pc — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('PPR-C water pipe, 25mm (3/4") PN20, per metre (KE)', 'ke-pipe-cold', 'pipe',
   'Per metre. randtech.co.ke (Nairobi) PPR pipe 3/4"/25mm — 4 Metres, KSh 380 per stick = KSh 95/m — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('PPR-C water pipe, 25mm (3/4") PN20, per metre (KE)', 'ke-pipe-hot', 'pipe',
   'Per metre. Same randtech.co.ke 25mm x 4m stick, KSh 380 = KSh 95/m. PPR PN20 serves hot + cold supply in Kenyan practice.',
   CURRENT_DATE, true, 5),
  ('uPVC waste pipe, 2-inch (50mm) x 6m, per metre (KE)', 'ke-pipe-waste', 'pipe',
   'Per metre. trustedbuilder.co.ke Standard 2-Inch Waste Pipe, 50mm uPVC, 6m length, KSh 550 = KSh 91.67/m — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('PVC-U soil/waste pipe, 4-inch x 3mm x 6m, per metre (KE)', 'ke-pipe-drainage', 'pipe',
   'Per metre. jiji.co.ke Industrial Area (Nairobi) PVC Waste Pipe 4"x3mm"x6m, KSh 1,900 = KSh 316.67/m — live listing read 2026-10-14. Serves the 110 mm soil stack per the KE plumbing profile.',
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
    ('KE', 'ke-elbow',           20.00, 'KES', 'hanzach.com PPR Elbow 25mm KSh 20/pc, live listing read 2026-10-14'),
    ('KE', 'ke-tee',             30.00, 'KES', 'hanzach.com PPR Tee 25mm KSh 30/pc, live listing read 2026-10-14'),
    ('KE', 'ke-reducer',         35.00, 'KES', 'hanzach.com PPR Reduced Tee 25*20 KSh 35/pc, live listing read 2026-10-14'),
    ('KE', 'ke-union',           33.00, 'KES', 'kkempiretradesslimited.com PPR Union 25mm KES 33/pc, live listing read 2026-10-14'),
    ('KE', 'ke-valve',          135.00, 'KES', 'nikkohardware.co.ke 25mm PPR gate valve KSh 135/pc, live listing read 2026-10-14'),
    ('KE', 'ke-pipe-cold',       95.00, 'KES', 'randtech.co.ke PPR pipe 3/4"/25mm 4 metres KSh 380 = KSh 95/m, live listing read 2026-10-14'),
    ('KE', 'ke-pipe-hot',        95.00, 'KES', 'Same randtech.co.ke 25mm x 4m listing; PPR PN20 serves hot+cold, read 2026-10-14'),
    ('KE', 'ke-pipe-waste',      91.67, 'KES', 'trustedbuilder.co.ke 2-inch 50mm uPVC waste pipe 6m KSh 550 = KSh 91.67/m, live listing read 2026-10-14'),
    ('KE', 'ke-pipe-drainage',  316.67, 'KES', 'jiji.co.ke Nairobi Industrial Area PVC waste pipe 4"x3mm"x6m KSh 1,900 = KSh 316.67/m, live listing read 2026-10-14')
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

-- Verification: expect 9 active KE plumbing rows, all 'manual'
SELECT m.slug, p.market, p.price, p.currency, p.scan_confidence
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE (m.slug LIKE 'ke-pipe-%' OR m.slug IN ('ke-elbow','ke-tee','ke-reducer','ke-union','ke-valve'))
  AND p.price_type = 'material' AND p.is_active = true
ORDER BY m.slug;
