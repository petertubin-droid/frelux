-- ============================================================
-- FRELUX: Plumbing price book MEXICO (MX) — 9/9 rows, verified
-- 2026-10-14 from live MX listings, scan_confidence='manual'.
-- System per MX profile: CPVC (FlowGuard/Foset) 3/4" supply,
-- PVC sanitario 2"/4" (NOM-001-CONAGUA).
--   mx-elbow:  Codo 90° CPVC 3/4 FOSET, prisaleon.com.mx $4.05
--   mx-tee:    Tee sencilla CPVC 3/4 FOSET, prisaleon $5.43
--   mx-reducer: Tee CPVC 3/4x3/4x1/2 B&K, homedepot.com.mx $5.65
--   mx-union:  Tuerca unión CPVC 3/4 FOSET, yaqui.com.mx $19.00
--               (surtiaceros $18.00 corroborates)
--   mx-valve:  Válvula esférica CPVC 3/4, homedepot.com.mx $78.85
--   mx-pipe-cold/hot: Amanco Wavin CPVC 3/4" x 3m, homedepot.com.mx
--               $62.10 = $20.70/m
--   mx-pipe-waste: Tubo sanitario Amanco 50mm x 6m, surtidor.com
--               $109.66 = $18.28/m
--   mx-pipe-drainage: Tubo sanitario Amanco 100mm x 6m, surtidor.com
--               $199.18 = $33.20/m
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('CPVC elbow (codo), 3/4" 90° (MX)', 'mx-elbow', 'pipe', 'Per piece. prisaleon.com.mx codo 90° de CPVC de 3/4" FOSET (CPVC-562), $4.05 — live listing read 2026-10-14 (corroborated: elferretero.com.mx $3.90 ex-IVA). Mexican practice uses CPVC solvent-weld supply per NOM-001-CONAGUA.', CURRENT_DATE, true, 5),
  ('CPVC tee, 3/4" (MX)', 'mx-tee', 'pipe', 'Per piece. prisaleon.com.mx tee sencilla de CPVC de 3/4" FOSET (CPVC-762), $5.43 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('CPVC reduced tee, 3/4 x 3/4 x 1/2" (MX)', 'mx-reducer', 'pipe', 'Per piece. homedepot.com.mx tee CPVC 3/4" x 3/4" x 1/2" B&K (301-101), $5.65 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('CPVC union nut (tuerca unión), 3/4" (MX)', 'mx-union', 'pipe', 'Per piece. yaqui.com.mx tuerca unión CPVC 3/4" FOSET (616706/45056), $19.00/unidad — live listing read 2026-10-14 (corroborated: surtiaceros.com $18.00).', CURRENT_DATE, true, 5),
  ('CPVC ball valve (válvula esférica), 3/4" (MX)', 'mx-valve', 'pipe', 'Per piece. homedepot.com.mx válvula esférica de 3/4" CPVC (3749SHD), $78.85 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('CPVC pipe, 3/4" x 3m, per metre (MX)', 'mx-pipe-cold', 'pipe', 'Per metre. homedepot.com.mx tubería hidráulica Amanco Wavin CPVC 3/4" x 3 m, $62.10 = $20.70/m — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('CPVC pipe, 3/4" x 3m, per metre (MX)', 'mx-pipe-hot', 'pipe', 'Per metre. Same homedepot.com.mx Amanco Wavin CPVC 3/4" x 3 m listing, $62.10 = $20.70/m. CPVC resists up to 82°C and serves hot + cold supply.', CURRENT_DATE, true, 5),
  ('PVC sanitario pipe, 50mm x 6m, per metre (MX)', 'mx-pipe-waste', 'pipe', 'Per metre. surtidor.com tubo sanitario Amanco 50mm x 6m, $109.66 por tubo = $18.28/m — live listing read 2026-10-14. 2" sanitary waste line per NOM-001-CONAGUA.', CURRENT_DATE, true, 5),
  ('PVC sanitario pipe, 100mm x 6m, per metre (MX)', 'mx-pipe-drainage', 'pipe', 'Per metre. surtidor.com tubo sanitario Amanco 100mm x 6m, $199.18 = $33.20/m — live listing read 2026-10-14. 4" WC drop/soil line.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('MX', 'mx-elbow',            4.05, 'MXN', 'prisaleon.com.mx codo 90° CPVC 3/4 FOSET $4.05, live listing read 2026-10-14'),
    ('MX', 'mx-tee',              5.43, 'MXN', 'prisaleon.com.mx tee sencilla CPVC 3/4 FOSET $5.43, live listing read 2026-10-14'),
    ('MX', 'mx-reducer',          5.65, 'MXN', 'homedepot.com.mx tee CPVC 3/4x3/4x1/2 B&K $5.65, live listing read 2026-10-14'),
    ('MX', 'mx-union',           19.00, 'MXN', 'yaqui.com.mx tuerca unión CPVC 3/4 FOSET $19.00/unidad, live listing read 2026-10-14'),
    ('MX', 'mx-valve',           78.85, 'MXN', 'homedepot.com.mx válvula esférica CPVC 3/4 $78.85, live listing read 2026-10-14'),
    ('MX', 'mx-pipe-cold',       20.70, 'MXN', 'homedepot.com.mx Amanco Wavin CPVC 3/4" x 3m $62.10 = $20.70/m, live listing read 2026-10-14'),
    ('MX', 'mx-pipe-hot',        20.70, 'MXN', 'Same homedepot.com.mx Amanco CPVC 3/4" x 3m listing; CPVC serves hot+cold to 82°C, read 2026-10-14'),
    ('MX', 'mx-pipe-waste',       18.28, 'MXN', 'surtidor.com tubo sanitario Amanco 50mm x 6m $109.66 = $18.28/m, live listing read 2026-10-14'),
    ('MX', 'mx-pipe-drainage',    33.20, 'MXN', 'surtidor.com tubo sanitario Amanco 100mm x 6m $199.18 = $33.20/m, live listing read 2026-10-14')
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
WHERE (m.slug LIKE 'mx-pipe-%' OR m.slug IN ('mx-elbow','mx-tee','mx-reducer','mx-union','mx-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
