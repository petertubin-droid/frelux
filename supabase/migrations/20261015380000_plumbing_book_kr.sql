-- ============================================================
-- FRELUX: Plumbing price book SOUTH KOREA (KR) — 9/9 rows,
-- verified 2026-10-14 from live Coupang/Gmarket/plumbing-shop
-- listings (에이콘/Acon PB system, 20A trunk),
-- scan_confidence='manual'. System per KR profile: PB
-- (polybutylene) heat-fusion supply KS M 2378, PVC 40mm waste /
-- 100mm soil (KS M 2400, 4m 본).
--   kr-elbow:  PB elbow 20mm, ₩1,600 (Coupang 9503266635, 20mm
--               option)
--   kr-tee:    에이콘 PB 삼방티 (3-way tee) 20A, ₩2,200
--               (Gmarket 4147109660)
--   kr-reducer: PB 이경소켓 (reducing socket) 20A x 15A, ₩1,170
--               (no1piping.co.kr)
--   kr-union:  에이콘 PB 커플링, ₩1,445/개 (Coupang 8670420930,
--               20-pack ₩28,900)
--   kr-valve:  에이콘 PB CM 볼밸브 20A, ₩12,300 (jojomall.co.kr)
--   kr-pipe-cold/hot: ISO PB 롤관 KS 20A x 100m, ₩114,000 =
--               ₩1,140/m (Coupang; chunji97 ₩132,000 corroborates)
--   kr-pipe-waste: 40A PVC 국산파이프 (군청색) 4m, ₩13,800 =
--               ₩3,450/m (Gmarket 3644669892)
--   kr-pipe-drainage: PVC VG1 pipe 100mm x 4M, ₩18,000 =
--               ₩4,500/m (promh31989.cafe24.com)
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('PB elbow, 20mm (KR)', 'kr-elbow', 'pipe', 'Per piece. Coupang PB 엘보 20mm, ₩1,600 — live listing read 2026-10-14 (product 9503266635, 20mm option). Korean practice uses PB (polybutylene) heat-fusion fittings per KS M 2378.', CURRENT_DATE, true, 5),
  ('PB tee, 20A (KR)', 'kr-tee', 'pipe', 'Per piece. Gmarket 피비 삼방티 에이콘 PB 삼방 3T 20A, ₩2,200 — live listing read 2026-10-14 (product 4147109660).', CURRENT_DATE, true, 5),
  ('PB reducing socket, 20A x 15A (KR)', 'kr-reducer', 'pipe', 'Per piece. no1piping.co.kr PB 이경소켓 20A*15A (에이콘 reducing socket), ₩1,170 — live listing read 2026-10-14. Reduces the 20A trunk to 15A fixture branches per KS M 2378.', CURRENT_DATE, true, 5),
  ('PB coupling, 20mm (KR)', 'kr-union', 'pipe', 'Per piece. Coupang 에이콘 PB 커플링, ₩1,445 per piece (20-pack ₩28,900) — live listing read 2026-10-14 (product 8670420930). Straight coupling serves the union role.', CURRENT_DATE, true, 5),
  ('PB ball valve, 20A (KR)', 'kr-valve', 'pipe', 'Per piece. jojomall.co.kr 에이콘 PB CM 볼밸브 20A, ₩12,300 — live listing read 2026-10-14 (chunji97 에이콘 볼밸브 22A ₩14,850 corroborates the band).', CURRENT_DATE, true, 5),
  ('PB pipe, 20A x 100m coil, per metre (KR)', 'kr-pipe-cold', 'pipe', 'Per metre. Coupang ISO PB 롤관 KS (아파트규격) 20A x 100m, ₩114,000 = ₩1,140/m — live listing read 2026-10-14 (chunji97 ₩132,000 and jojomall ₩128,000 corroborate the band). 20A trunk per KS M 2378.', CURRENT_DATE, true, 5),
  ('PB pipe, 20A x 100m coil, per metre (KR)', 'kr-pipe-hot', 'pipe', 'Per metre. Same Coupang ISO PB 롤관 KS 20A x 100m coil, ₩114,000 = ₩1,140/m. PB serves hot + cold (apartment-spec KS grade).', CURRENT_DATE, true, 5),
  ('PVC waste pipe, 40mm x 4m, per metre (KR)', 'kr-pipe-waste', 'pipe', 'Per metre. Gmarket 40A PVC 국산파이프 (군청색, 내경 40mm), ₩13,800 per 4 m 본 = ₩3,450/m — live listing read 2026-10-14 (product 3644669892). 40mm waste per KS M 2400.', CURRENT_DATE, true, 5),
  ('PVC soil pipe, 100mm x 4m, per metre (KR)', 'kr-pipe-drainage', 'pipe', 'Per metre. promh31989.cafe24.com PVC VG1 배관 파이프 100mm 4M, ₩18,000 per 4 m 본 = ₩4,500/m — live listing read 2026-10-14. 100mm VG1 soil/drainage stack.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('KR', 'kr-elbow',          1600.00, 'KRW', 'Coupang PB elbow 20mm ₩1,600, live listing read 2026-10-14'),
    ('KR', 'kr-tee',            2200.00, 'KRW', 'Gmarket 에이콘 PB 삼방티 20A ₩2,200, live listing read 2026-10-14'),
    ('KR', 'kr-reducer',        1170.00, 'KRW', 'no1piping.co.kr PB 이경소켓 20A*15A ₩1,170, live listing read 2026-10-14'),
    ('KR', 'kr-union',          1445.00, 'KRW', 'Coupang 에이콘 PB 커플링 ₩1,445/pc (20-pack ₩28,900), live listing read 2026-10-14'),
    ('KR', 'kr-valve',         12300.00, 'KRW', 'jojomall.co.kr 에이콘 PB CM 볼밸브 20A ₩12,300, live listing read 2026-10-14'),
    ('KR', 'kr-pipe-cold',      1140.00, 'KRW', 'Coupang ISO PB 롤관 KS 20A x 100m ₩114,000 = ₩1,140/m, live listing read 2026-10-14'),
    ('KR', 'kr-pipe-hot',       1140.00, 'KRW', 'Same Coupang ISO PB 롤관 KS 20A x 100m coil; PB serves hot+cold, read 2026-10-14'),
    ('KR', 'kr-pipe-waste',     3450.00, 'KRW', 'Gmarket 40A PVC pipe 4m ₩13,800 = ₩3,450/m, live listing read 2026-10-14'),
    ('KR', 'kr-pipe-drainage',  4500.00, 'KRW', 'promh31989.cafe24.com PVC VG1 100mm 4M ₩18,000 = ₩4,500/m, live listing read 2026-10-14')
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
WHERE (m.slug LIKE 'kr-pipe-%' OR m.slug IN ('kr-elbow','kr-tee','kr-reducer','kr-union','kr-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
