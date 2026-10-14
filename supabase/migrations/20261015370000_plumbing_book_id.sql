-- ============================================================
-- FRELUX: Plumbing price book INDONESIA (ID) — 9/9 rows,
-- verified 2026-10-14 from live Tokopedia/Shopee/juraganmaterial
-- listings (Rucika anchor brand), scan_confidence='manual'.
-- System per ID profile: PVC AW (SNI/JIS) 3/4" supply, PVC D
-- 3"/4" waste-soil (SNI 2043?), 4m batang, solvent joints.
--   id-elbow:  Knee/elbow PVC RUCIKA 3/4" AW, Rp5,400 (Shopee
--               i.175367150.8473014147)
--   id-tee:    Rucika tee 3/4" AW, Rp4,850 (Shopee
--               i.970289967.25136361063; juraganmaterial
--               Rp4,261 incl PPN corroborates)
--   id-reducer: Rucika reducing socket 3/4 x 1/2 AW, Rp3,550
--               (Shopee i.972224033.28862348289)
--   id-union:  Socket PVC Rucika AW 3/4", Rp4,750 (Tokopedia)
--   id-valve:  Stop kran ball valve PVC Rucika 3/4" socket,
--               Rp36,100 (Tokopedia, 100+ sold)
--   id-pipe-cold/hot: Rucika AW 3/4" x 4m, Rp42,500/batang =
--               Rp10,625/m (Tokopedia, 28 sold)
--   id-pipe-waste: Rucika D 3" x 4m MOF, Rp150,995 =
--               Rp37,749/m (Shopee)
--   id-pipe-drainage: Rucika D 4" x 4m, Rp182,012 incl PPN =
--               Rp45,503/m (juraganmaterial.id)
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('PVC AW elbow (knee), 3/4" (ID)', 'id-elbow', 'pipe', 'Per piece. Shopee Knee/Elbow PVC RUCIKA 3/4" AW, Rp5,400 — live listing read 2026-10-14. Indonesian practice uses PVC AW solvent-cement fittings (Rucika/Wavin) per SNI/JIS.', CURRENT_DATE, true, 5),
  ('PVC AW tee, 3/4" (ID)', 'id-tee', 'pipe', 'Per piece. Shopee Rucika Tee 3/4" AW, Rp4,850 — live listing read 2026-10-14 (juraganmaterial.id Rp4,261 incl PPN corroborates).', CURRENT_DATE, true, 5),
  ('PVC AW reducing socket, 3/4 x 1/2" (ID)', 'id-reducer', 'pipe', 'Per piece. Shopee Rucika Reducing Socket 3/4 x 1/2 AW, Rp3,550 — live listing read 2026-10-14. Reduces the 3/4" trunk to 1/2" fixture branches.', CURRENT_DATE, true, 5),
  ('PVC AW socket (union), 3/4" (ID)', 'id-union', 'pipe', 'Per piece. Tokopedia Socket PVC AW (RUCIKA) d. 3/4", Rp4,750 — live listing read 2026-10-14. Straight coupling serves the union role.', CURRENT_DATE, true, 5),
  ('PVC ball valve (stop kran), 3/4" (ID)', 'id-valve', 'pipe', 'Per piece. Tokopedia Stop Kran Ball Valve PVC Rucika 3/4" socket ends, Rp36,100 — live listing read 2026-10-14 (100+ sold).', CURRENT_DATE, true, 5),
  ('PVC AW pipe, 3/4" x 4m, per metre (ID)', 'id-pipe-cold', 'pipe', 'Per metre. Tokopedia Pipa Rucika AW 3/4 inch PVC per batang 4 meter, Rp42,500 = Rp10,625/m — live listing read 2026-10-14 (28 sold). 3/4" AW supply trunk per SNI.', CURRENT_DATE, true, 5),
  ('PVC AW pipe, 3/4" x 4m, per metre (ID)', 'id-pipe-hot', 'pipe', 'Per metre. Same Tokopedia Rucika AW 3/4" x 4m batang, Rp42,500 = Rp10,625/m. AW grade is the standard for in-house hot+cold distribution in Indonesian practice.', CURRENT_DATE, true, 5),
  ('PVC D waste pipe, 3" x 4m, per metre (ID)', 'id-pipe-waste', 'pipe', 'Per metre. Shopee Rucika Pipa D 3 Inch PVC MOF Putih 4 Meter, Rp150,995 = Rp37,749/m — live listing read 2026-10-14. 3" D-type waste line per SNI.', CURRENT_DATE, true, 5),
  ('PVC D soil pipe, 4" x 4m, per metre (ID)', 'id-pipe-drainage', 'pipe', 'Per metre. juraganmaterial.id Pipa PVC Rucika 4" Tipe D panjang 4 meter, Rp182,012 incl PPN = Rp45,503/m — live listing read 2026-10-14. 4" soil stack.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('ID', 'id-elbow',          5400.00, 'IDR', 'Shopee knee/elbow PVC Rucika 3/4" AW Rp5,400, live listing read 2026-10-14'),
    ('ID', 'id-tee',            4850.00, 'IDR', 'Shopee Rucika tee 3/4" AW Rp4,850, live listing read 2026-10-14'),
    ('ID', 'id-reducer',        3550.00, 'IDR', 'Shopee Rucika reducing socket 3/4x1/2 AW Rp3,550, live listing read 2026-10-14'),
    ('ID', 'id-union',          4750.00, 'IDR', 'Tokopedia socket PVC Rucika AW 3/4" Rp4,750, live listing read 2026-10-14'),
    ('ID', 'id-valve',         36100.00, 'IDR', 'Tokopedia stop kran ball valve PVC Rucika 3/4" Rp36,100, live listing read 2026-10-14'),
    ('ID', 'id-pipe-cold',     10625.00, 'IDR', 'Tokopedia Rucika AW 3/4" x 4m Rp42,500 = Rp10,625/m, live listing read 2026-10-14'),
    ('ID', 'id-pipe-hot',      10625.00, 'IDR', 'Same Tokopedia Rucika AW 3/4" x 4m batang; AW grade serves hot+cold, read 2026-10-14'),
    ('ID', 'id-pipe-waste',    37749.00, 'IDR', 'Shopee Rucika D 3" x 4m MOF Rp150,995 = Rp37,749/m, live listing read 2026-10-14'),
    ('ID', 'id-pipe-drainage', 45503.00, 'IDR', 'juraganmaterial.id Rucika D 4" x 4m Rp182,012 incl PPN = Rp45,503/m, live listing read 2026-10-14')
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
WHERE (m.slug LIKE 'id-pipe-%' OR m.slug IN ('id-elbow','id-tee','id-reducer','id-union','id-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
