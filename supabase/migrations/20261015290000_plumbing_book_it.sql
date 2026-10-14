-- ============================================================
-- FRELUX: Plumbing price book ITALY (IT) — 9/9 rows, verified
-- 2026-10-14 from live leroymerlin.it listings, scan_confidence
-- ='manual'. System per IT profile: multistrato PE-RT/AL/PE-RT
-- 16mm press-fit supply (UNI 9182), PP push-fit Ø50 waste /
-- Ø110 soil (UNI EN 12056).
--   it-elbow:  Gomito a pressare ø16 F 1/2 NT, €4.49 (68515132)
--   it-tee:    Raccordo a pressare a T uguale ø16 NT, €4.99 (68515216)
--   it-reducer: Raccordo a T ridotto INS 20x16x20, €28.81 (94000759)
--   it-union:  Raccordo diritto M maschio 16 x 1/2", €8.60 (82888024)
--   it-valve:  Rubinetto a sfera acqua 3/4", €11.17 (94282842)
--   it-pipe-cold/hot: SOMATHERM multistrato Ø16 x 25 m €29.90 = €1.20/m
--   it-pipe-waste: Tubo scarico PP ø50 x 200 cm €4.70 = €2.35/m (31047681)
--   it-pipe-drainage: Tubo scarico PP ø110 x 200 cm €14.49 = €7.245/m (85693623)
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('Multistrato press elbow, 16mm x 1/2" (IT)', 'it-elbow', 'pipe', 'Per piece. leroymerlin.it raccordo multistrato a gomito a pressare ø16 femmina 1/2 NT, €4.49 IVA incl — live listing read 2026-10-14. Italian practice uses multistrato PE-RT/AL/PE-RT with press-fit fittings per UNI 9182.', CURRENT_DATE, true, 5),
  ('Multistrato press tee, 16mm (IT)', 'it-tee', 'pipe', 'Per piece. leroymerlin.it raccordo multistrato a pressare a T uguale ø16 NT, €4.99 IVA incl — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('Multistrato reduced tee, 20x16x20mm (IT)', 'it-reducer', 'pipe', 'Per piece. leroymerlin.it raccordo a T ridotto serie INS per multistrato 20 x 16 x 20, €28.81 IVA incl — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('Multistrato straight connector (union), 16 x 1/2" (IT)', 'it-union', 'pipe', 'Per piece. leroymerlin.it raccordo diritto M maschio a stringere per tubo multistrato 16 x 1/2", €8.60 IVA incl — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('Ball stop valve, 3/4" (IT)', 'it-valve', 'pipe', 'Per piece. leroymerlin.it rubinetto a sfera per acqua multiuso 3/4", €11.17 IVA incl — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('Multistrato tube, 16mm, per metre (IT)', 'it-pipe-cold', 'pipe', 'Per metre. leroymerlin.it SOMATHERM FOR YOU tubo multistrato Ø16, 25 m coil, €29.90 IVA incl = €1.20/m — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('Multistrato tube, 16mm, per metre (IT)', 'it-pipe-hot', 'pipe', 'Per metre. Same leroymerlin.it SOMATHERM Ø16 x 25 m coil, €29.90 = €1.20/m. Multistrato PE-RT/AL/PE-RT serves hot + cold from the complanare collector.', CURRENT_DATE, true, 5),
  ('PP waste pipe, Ø50mm x 2m, per metre (IT)', 'it-pipe-waste', 'pipe', 'Per metre. leroymerlin.it tubo per scarico ø 50 mm x L 200 cm in polipropilene grigio, €4.70 IVA incl = €2.35/m — live listing read 2026-10-14. PP push-fit Ø50 waste per UNI EN 12056.', CURRENT_DATE, true, 5),
  ('PP soil pipe, Ø110mm x 2m, per metre (IT)', 'it-pipe-drainage', 'pipe', 'Per metre. leroymerlin.it tubo per scarico ø 110 mm x L 200 cm in polipropilene grigio, €14.49 IVA incl = €7.25/m — live listing read 2026-10-14. Ø110 soil stack / WC scarico.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('IT', 'it-elbow',            4.49, 'EUR', 'leroymerlin.it gomito a pressare ø16 F 1/2 NT €4.49 IVA incl, live listing read 2026-10-14'),
    ('IT', 'it-tee',              4.99, 'EUR', 'leroymerlin.it raccordo a T uguale ø16 NT €4.99 IVA incl, live listing read 2026-10-14'),
    ('IT', 'it-reducer',         28.81, 'EUR', 'leroymerlin.it T ridotto INS multistrato 20x16x20 €28.81 IVA incl, live listing read 2026-10-14'),
    ('IT', 'it-union',            8.60, 'EUR', 'leroymerlin.it raccordo diritto maschio 16 x 1/2" €8.60 IVA incl, live listing read 2026-10-14'),
    ('IT', 'it-valve',           11.17, 'EUR', 'leroymerlin.it rubinetto a sfera acqua 3/4" €11.17 IVA incl, live listing read 2026-10-14'),
    ('IT', 'it-pipe-cold',        1.20, 'EUR', 'leroymerlin.it SOMATHERM multistrato Ø16 x 25m €29.90 = €1.20/m, live listing read 2026-10-14'),
    ('IT', 'it-pipe-hot',         1.20, 'EUR', 'Same leroymerlin.it SOMATHERM Ø16 x 25m coil; multistrato serves hot+cold, read 2026-10-14'),
    ('IT', 'it-pipe-waste',       2.35, 'EUR', 'leroymerlin.it tubo scarico PP ø50 x 200cm €4.70 = €2.35/m, live listing read 2026-10-14'),
    ('IT', 'it-pipe-drainage',    7.25, 'EUR', 'leroymerlin.it tubo scarico PP ø110 x 200cm €14.49 = €7.25/m, live listing read 2026-10-14')
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
WHERE (m.slug LIKE 'it-pipe-%' OR m.slug IN ('it-elbow','it-tee','it-reducer','it-union','it-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
