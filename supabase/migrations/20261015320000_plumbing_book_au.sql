-- ============================================================
-- FRELUX: Plumbing price book AUSTRALIA (AU) — 9/9 rows, verified
-- 2026-10-14 from live bunnings.com.au listings, scan_confidence
-- ='manual'. System per AU profile: PEX (AS/NZS 2492) 20mm supply
-- with push-fit fittings, DWV PVC DN50 waste / DN100 sewer
-- (AS/NZS 3500).
--   au-elbow:  SmarteX-PEX 20mm Elbow, $9.72 (0548288)
--   au-tee:    SmarteX-PEX 20mm Tee, $13.21 (0548289)
--   au-reducer: SmarteX-PEX 20 x 16mm Reducing Coupling, $7.54
--               (0548307)
--   au-union:  SmarteX-PEX/Copper 20 x 20mm Conversion Coupling,
--               $8.84 (0548354)
--   au-valve:  SmarteX-COPPER 20mm Ball Valve, $19.90 (0548300)
--   au-pipe-cold/hot: SmarteX-PEX 20mm x 50m coil, $145.08 =
--               $2.90/m (4950097)
--   au-pipe-waste: Holman 50mm x 6m PVC DWV, $48.38 = $8.06/m
--               (4770352)
--   au-pipe-drainage: Holman 100mm x 6m PVC DWV, $52.45 = $8.74/m
--               (4770346)
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('PEX push-fit elbow, 20mm (AU)', 'au-elbow', 'pipe', 'Per piece. bunnings.com.au SmarteX-PEX 20mm Elbow, $9.72 — live listing read 2026-10-14. Australian practice uses PE-Xb pipe with push-fit fittings per AS/NZS 2492.', CURRENT_DATE, true, 5),
  ('PEX push-fit tee, 20mm (AU)', 'au-tee', 'pipe', 'Per piece. bunnings.com.au SmarteX-PEX 20mm Tee, $13.21 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PEX reducing coupling, 20 x 16mm (AU)', 'au-reducer', 'pipe', 'Per piece. bunnings.com.au SmarteX-PEX 20 x 16mm Reducing Coupling, $7.54 — live listing read 2026-10-14. DN20 trunk to DN16 fixture branch per AS/NZS 3500.', CURRENT_DATE, true, 5),
  ('PEX/Copper coupling (union), 20 x 20mm (AU)', 'au-union', 'pipe', 'Per piece. bunnings.com.au SmarteX-PEX Copper 20 x 20mm Conversion Coupling, $8.84 — live listing read 2026-10-14. Straight coupling serves the union role in the SmarteX push-fit system.', CURRENT_DATE, true, 5),
  ('Ball valve, 20mm (AU)', 'au-valve', 'pipe', 'Per piece. bunnings.com.au SmarteX-COPPER 20mm Ball Valve, $19.90 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PEX pipe, 20mm, per metre (AU)', 'au-pipe-cold', 'pipe', 'Per metre. bunnings.com.au SmarteX-PEX 20mm x 50m Black Pipe coil, $145.08 = $2.90/m — live listing read 2026-10-14. DN20 main feed per AS/NZS 3500.', CURRENT_DATE, true, 5),
  ('PEX pipe, 20mm, per metre (AU)', 'au-pipe-hot', 'pipe', 'Per metre. Same bunnings.com.au SmarteX-PEX 20mm x 50m coil, $145.08 = $2.90/m. PE-Xb serves hot + cold supply (rated for hot water systems).', CURRENT_DATE, true, 5),
  ('PVC DWV pipe, 50mm x 6m, per metre (AU)', 'au-pipe-waste', 'pipe', 'Per metre. bunnings.com.au Holman 50mm x 6m PVC DWV Pipe, $48.38 = $8.06/m — live listing read 2026-10-14. DN50 DWV waste per AS/NZS 3500.', CURRENT_DATE, true, 5),
  ('PVC DWV pipe, 100mm x 6m, per metre (AU)', 'au-pipe-drainage', 'pipe', 'Per metre. bunnings.com.au Holman 100mm x 6m PVC DWV Pipe, $52.45 = $8.74/m — live listing read 2026-10-14. DN100 DWV sewer stack.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('AU', 'au-elbow',            9.72, 'AUD', 'bunnings.com.au SmarteX-PEX 20mm Elbow $9.72, live listing read 2026-10-14'),
    ('AU', 'au-tee',             13.21, 'AUD', 'bunnings.com.au SmarteX-PEX 20mm Tee $13.21, live listing read 2026-10-14'),
    ('AU', 'au-reducer',          7.54, 'AUD', 'bunnings.com.au SmarteX-PEX 20x16mm Reducing Coupling $7.54, live listing read 2026-10-14'),
    ('AU', 'au-union',            8.84, 'AUD', 'bunnings.com.au SmarteX-PEX/Copper 20x20mm Conversion Coupling $8.84, live listing read 2026-10-14'),
    ('AU', 'au-valve',           19.90, 'AUD', 'bunnings.com.au SmarteX-COPPER 20mm Ball Valve $19.90, live listing read 2026-10-14'),
    ('AU', 'au-pipe-cold',        2.90, 'AUD', 'bunnings.com.au SmarteX-PEX 20mm x 50m coil $145.08 = $2.90/m, live listing read 2026-10-14'),
    ('AU', 'au-pipe-hot',         2.90, 'AUD', 'Same bunnings.com.au SmarteX-PEX 20mm x 50m coil; PE-Xb serves hot+cold, read 2026-10-14'),
    ('AU', 'au-pipe-waste',       8.06, 'AUD', 'bunnings.com.au Holman 50mm x 6m PVC DWV $48.38 = $8.06/m, live listing read 2026-10-14'),
    ('AU', 'au-pipe-drainage',    8.74, 'AUD', 'bunnings.com.au Holman 100mm x 6m PVC DWV $52.45 = $8.74/m, live listing read 2026-10-14')
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
WHERE (m.slug LIKE 'au-pipe-%' OR m.slug IN ('au-elbow','au-tee','au-reducer','au-union','au-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
