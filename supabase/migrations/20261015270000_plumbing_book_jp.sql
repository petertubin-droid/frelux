-- ============================================================
-- FRELUX: Plumbing price book JAPAN (JP) — 9/9 rows, verified
-- 2026-10-14 from live JP listings, scan_confidence='manual'.
-- System per JP profile: PEX 13A header (Sayakan) supply,
-- VP 40A waste, VU 100A soil (JIS K6741/K6742).
--   jp-elbow:  HI fitting 13A elbow, natyu.ne.jp ¥168 incl tax
--   jp-tee:    HI fitting 13A cheese(tee), natyu.ne.jp ¥188
--   jp-reducer: TS reducing socket 20x13, monotaro.com ¥68
--   jp-union:  HI fitting 13A socket, natyu.ne.jp ¥167
--   jp-valve:  KVK straight stop valve, monotaro.com ¥2,398
--   jp-pipe-cold/hot: PEX 13A x 25 m coil, kakaku.com DIY
--               FACTORY ¥12,980 = ¥519.20/m
--   jp-pipe-waste: VP40 pipe x 4 m, komeri.com ¥2,880 = ¥720/m
--   jp-pipe-drainage: VU100 pipe x 4 m, komeri.com ¥3,380 = ¥845/m
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('HI fitting elbow, 13A (JP)', 'jp-elbow', 'pipe', 'Per piece. natyu.ne.jp HI fitting 13A elbow, ¥168 incl tax — live listing read 2026-10-14. 13A water-supply PVC (HI) fitting per JIS K6743.', CURRENT_DATE, true, 5),
  ('HI fitting tee (cheese), 13A (JP)', 'jp-tee', 'pipe', 'Per piece. natyu.ne.jp HI fitting 13A cheese, ¥188 incl tax — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('TS reducing socket, 20 x 13 (JP)', 'jp-reducer', 'pipe', 'Per piece. monotaro.com TS fitting reducing socket 20x13 (Toei Kanki TS-S), ¥68 incl tax — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('HI fitting socket (union), 13A (JP)', 'jp-union', 'pipe', 'Per piece. natyu.ne.jp HI fitting 13A socket, ¥167 incl tax — live listing read 2026-10-14. Socket coupler serves the union role.', CURRENT_DATE, true, 5),
  ('Stop valve, 13A (JP)', 'jp-valve', 'pipe', 'Per piece. monotaro.com KVK straight stop valve (shusui-sen), ¥2,398 incl tax — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PEX pipe, 13A x 25m coil, per metre (JP)', 'jp-pipe-cold', 'pipe', 'Per metre. kakaku.com DIY FACTORY ONLINE SHOP cross-linked PE pipe 13A x 25 m, ¥12,980 = ¥519.20/m — live listing read 2026-10-14. 13A PEX branch from 20A header per JP profile.', CURRENT_DATE, true, 5),
  ('PEX pipe, 13A x 25m coil, per metre (JP)', 'jp-pipe-hot', 'pipe', 'Per metre. Same kakaku.com PEX 13A x 25 m coil, ¥12,980 = ¥519.20/m. PEX 13A serves hot + cold from the central header (JIS K 6769).', CURRENT_DATE, true, 5),
  ('VP pipe, 40A x 4m, per metre (JP)', 'jp-pipe-waste', 'pipe', 'Per metre. komeri.com PVC pipe 4M VP40, ¥2,880 incl tax = ¥720/m — live listing read 2026-10-14. 40A rigid VP drainage pipe.', CURRENT_DATE, true, 5),
  ('VU pipe, 100A x 4m, per metre (JP)', 'jp-pipe-drainage', 'pipe', 'Per metre. komeri.com PVC pipe 4M VU100 (3.1mm), ¥3,380 incl tax = ¥845/m — live listing read 2026-10-14. 100A rigid VU soil/drainage pipe.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('JP', 'jp-elbow',           168.00, 'JPY', 'natyu.ne.jp HI fitting 13A elbow ¥168 incl tax, live listing read 2026-10-14'),
    ('JP', 'jp-tee',             188.00, 'JPY', 'natyu.ne.jp HI fitting 13A cheese ¥188 incl tax, live listing read 2026-10-14'),
    ('JP', 'jp-reducer',          68.00, 'JPY', 'monotaro.com TS reducing socket 20x13 ¥68 incl tax, live listing read 2026-10-14'),
    ('JP', 'jp-union',           167.00, 'JPY', 'natyu.ne.jp HI fitting 13A socket ¥167 incl tax, live listing read 2026-10-14'),
    ('JP', 'jp-valve',         2398.00, 'JPY', 'monotaro.com KVK straight stop valve ¥2,398 incl tax, live listing read 2026-10-14'),
    ('JP', 'jp-pipe-cold',      519.20, 'JPY', 'kakaku.com DIY FACTORY PEX pipe 13A x 25m ¥12,980 = ¥519.20/m, live listing read 2026-10-14'),
    ('JP', 'jp-pipe-hot',       519.20, 'JPY', 'Same kakaku.com PEX 13A x 25m coil; PEX serves hot+cold from header, read 2026-10-14'),
    ('JP', 'jp-pipe-waste',     720.00, 'JPY', 'komeri.com VP40 PVC pipe x 4m ¥2,880 = ¥720/m, live listing read 2026-10-14'),
    ('JP', 'jp-pipe-drainage',  845.00, 'JPY', 'komeri.com VU100 PVC pipe x 4m ¥3,380 = ¥845/m, live listing read 2026-10-14')
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
WHERE (m.slug LIKE 'jp-pipe-%' OR m.slug IN ('jp-elbow','jp-tee','jp-reducer','jp-union','jp-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
