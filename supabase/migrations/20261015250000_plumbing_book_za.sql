-- ============================================================
-- FRELUX: Plumbing price book SOUTH AFRICA (ZA) — 9/9 rows complete.
-- Verified 2026-10-14 from live SA supplier listings (zero manual
-- confirmation; scan_confidence='manual').
--
-- Fittings (per piece; SABS copper capillary (Copcal/Copperman)
-- system matches the ZA plumbing profile: copper 22mm supply,
-- uPVC SANS 966-2 DWV waste):
--   za-elbow:   Copcal Elbow 22x90 CxC, plumblink.co.za R15.30
--   za-tee:     Copperman Copcal Equal Tee 22mm CxC,
--               plumblinkb2b.co.za R27.80
--   za-reducer: Copper Cu Tee Reducer 22x22x15mm, diyshop.co.za
--               R25.00
--   za-union:   Plumbing Coupler STR 22mm CxC, move.store R10.00
--   za-valve:   Brass Gate Valve 3/4" FxF, alshardware.co.za
--               R132.22 (pairs with 22mm copper via tap conn.)
--
-- Pipes (per metre):
--   za-pipe-cold: Saffer 22mm SABS Copper Tubing 460/0 x 5.5 m,
--               builders.co.za R775.00 = R140.91/m (corroborated:
--               vereenigingbuilders.co.za 22mm 1m SABS R141.00)
--   za-pipe-hot: same listing; SABS Type A copper serves hot+cold
--   za-pipe-waste: PVC waste pipe 50mm x 6m, pricecheck.co.za offer
--               from Mercury Build It R119.99 = R20.00/m
--   za-pipe-drainage: 110mm PVC underground 200kPa x 6m,
--               leroymerlin.co.za R379.00 = R63.17/m (corroborated:
--               plumblink 400kPa SABS R529.46, cashbuild 110x6m
--               non-SABS R239.95)
--
-- Resolver: resolveMarketPlumbing (structural-market.ts) already
-- walks za-pipe-* and za-* fitting slugs; no app change needed.
-- On apply the ZA plumbing book is complete: 9 active rows.
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('Copper elbow, 22mm 90° CxC (ZA)', 'za-elbow', 'pipe',
   'Per piece. plumblink.co.za COPCAL ELBOW 22x90 CxC, R15.30 incl VAT — live listing read 2026-10-14. South African practice uses SABS copper capillary fittings (Copcal/Copperman) for the 22mm supply system.',
   CURRENT_DATE, true, 5),
  ('Copper equal tee, 22mm CxC (ZA)', 'za-tee', 'pipe',
   'Per piece. plumblinkb2b.co.za COPPERMAN COPCAL EQUAL TEE 22mm CxC (item 001668), R27.80 incl VAT — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('Copper reducing tee, 22 x 22 x 15mm (ZA)', 'za-reducer', 'pipe',
   'Per piece. diyshop.co.za Copper Cu Tee Reducer 22x22x15mm (OZZWA Plumbing), R25.00 incl VAT — live listing read 2026-10-14.',
   CURRENT_DATE, true, 5),
  ('Copper straight coupler (union), 22mm CxC (ZA)', 'za-union', 'pipe',
   'Per piece. move.store Plumbing Coupler STR 22mm CxC Copper, R10.00 — live SA listing read 2026-10-14. Capillary coupler serves the union/splice role in the copper system.',
   CURRENT_DATE, true, 5),
  ('Brass gate valve, 3/4" FxF (ZA)', 'za-valve', 'pipe',
   'Per piece. alshardware.co.za Female x Female Rough Brass Gate Valve 3/4" (SKU 324-0517), R132.22 incl VAT — live listing read 2026-10-14. 3/4" BSP valve pairs with the 22mm copper main via tap connector.',
   CURRENT_DATE, true, 5),
  ('Copper tube, 22mm SABS 460/0, per metre (ZA)', 'za-pipe-cold', 'pipe',
   'Per metre. builders.co.za Saffer 22 mm SABS Copper Tubing 460/0, 5.5 m stick, R775.00 = R140.91/m — live listing read 2026-10-14 (corroborated: vereenigingbuilders.co.za Copper Pipe 22mm 1m SABS at R141.00/m).',
   CURRENT_DATE, true, 5),
  ('Copper tube, 22mm SABS 460/0, per metre (ZA)', 'za-pipe-hot', 'pipe',
   'Per metre. Same builders.co.za Saffer 22mm SABS 5.5 m stick, R775.00 = R140.91/m. SABS Type A copper tube serves hot + cold supply in South African practice.',
   CURRENT_DATE, true, 5),
  ('PVC waste pipe, 50mm x 6m, per metre (ZA)', 'za-pipe-waste', 'pipe',
   'Per metre. pricecheck.co.za live offer from Mercury Build It: PVC Waste Pipe 50mm x 6m length, R119.99 = R20.00/m — read 2026-10-14. Solvent-weld uPVC 50mm waste line per the ZA plumbing profile.',
   CURRENT_DATE, true, 5),
  ('PVC underground pipe, 110mm 200kPa x 6m, per metre (ZA)', 'za-pipe-drainage', 'pipe',
   'Per metre. leroymerlin.co.za 110mm PVC pipes 200kPa 6m, R379.00 = R63.17/m — live listing read 2026-10-14. 110mm underground soil/drainage line per the ZA plumbing profile.',
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
    ('ZA', 'za-elbow',           15.30, 'ZAR', 'plumblink.co.za Copcal Elbow 22x90 CxC R15.30 incl VAT, live listing read 2026-10-14'),
    ('ZA', 'za-tee',             27.80, 'ZAR', 'plumblinkb2b.co.za Copperman Copcal Equal Tee 22mm CxC R27.80 incl VAT, live listing read 2026-10-14'),
    ('ZA', 'za-reducer',         25.00, 'ZAR', 'diyshop.co.za Copper Cu Tee Reducer 22x22x15mm R25.00 incl VAT, live listing read 2026-10-14'),
    ('ZA', 'za-union',           10.00, 'ZAR', 'move.store Plumbing Coupler STR 22mm CxC Copper R10.00, live listing read 2026-10-14'),
    ('ZA', 'za-valve',          132.22, 'ZAR', 'alshardware.co.za Brass Gate Valve 3/4" FxF R132.22 incl VAT, live listing read 2026-10-14'),
    ('ZA', 'za-pipe-cold',      140.91, 'ZAR', 'builders.co.za Saffer 22mm SABS copper tubing 5.5m R775 = R140.91/m, live listing read 2026-10-14'),
    ('ZA', 'za-pipe-hot',       140.91, 'ZAR', 'Same builders.co.za Saffer 22mm SABS 5.5m stick; SABS copper serves hot+cold, read 2026-10-14'),
    ('ZA', 'za-pipe-waste',      20.00, 'ZAR', 'pricecheck.co.za offer from Mercury Build It: PVC waste pipe 50mm x 6m R119.99 = R20.00/m, read 2026-10-14'),
    ('ZA', 'za-pipe-drainage',   63.17, 'ZAR', 'leroymerlin.co.za 110mm PVC underground 200kPa 6m R379 = R63.17/m, live listing read 2026-10-14')
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

-- Verification: expect 9 active ZA plumbing rows, all 'manual'
SELECT m.slug, p.market, p.price, p.currency, p.scan_confidence
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE (m.slug LIKE 'za-pipe-%' OR m.slug IN ('za-elbow','za-tee','za-reducer','za-union','za-valve'))
  AND p.price_type = 'material' AND p.is_active = true
ORDER BY m.slug;
