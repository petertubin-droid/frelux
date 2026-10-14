-- ============================================================
-- FRELUX: Plumbing price book FRANCE (FR) — 9/9 rows, verified
-- 2026-10-14 from live leroymerlin.fr listings, scan_confidence
-- ='manual'. System per FR profile: multicouche PE-RT/AL/PE-RT
-- 16mm press-fit supply (DTU 60.1), PVC Ø40 waste, Ø100 soil.
--   fr-elbow:  Coude multicouche à sertir D.16, €4.90 (84851051)
--   fr-tee:    Té multicouche à sertir D.16, €6.59
--   fr-reducer: Té PER à sertir réduit Ø16-12-12, €9.99 (89960747)
--   fr-union:  Manchon multicouche à visser/sertir M 1/2" x 16, €3.19
--   fr-valve:  Vanne d'arrêt 1/4 tour M/M 20x27 EQUATION, €5.99
--   fr-pipe-cold/hot: Tube multicouche nu Ø16 couronne 25m
--               EQUATION €29.90 = €1.20/m
--   fr-pipe-waste: Tube PVC évacuation Ø40 x 4m GIRPI €8.99 = €2.25/m
--   fr-pipe-drainage: Tube PVC évacuation Ø100 x 2m €6.99 = €3.50/m
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('Multicouche press-fit elbow, 16mm (FR)', 'fr-elbow', 'pipe', 'Per piece. leroymerlin.fr coude pour tuyau multicouche à sertir D.16 mm, €4.90 — live listing read 2026-10-14. French practice uses PE-RT/AL/PE-RT multicouche with press-fit brass fittings per DTU 60.1.', CURRENT_DATE, true, 5),
  ('Multicouche press-fit tee, 16mm (FR)', 'fr-tee', 'pipe', 'Per piece. leroymerlin.fr té pour tuyau multicouche à sertir D.16 mm, €6.59 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('Multicouche reduced tee, 16-12-12mm (FR)', 'fr-reducer', 'pipe', 'Per piece. leroymerlin.fr té PER à sertir réduit Ø16-12-12, €9.99 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('Multicouche connector (union), 1/2" x 16mm (FR)', 'fr-union', 'pipe', 'Per piece. leroymerlin.fr manchon pour tuyau multicouche à visser/à sertir M D.1/2" (15x21) x 16 mm, €3.19 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('Stop valve, 20x27mm 1/4-turn (FR)', 'fr-valve', 'pipe', 'Per piece. leroymerlin.fr vanne d''arrêt à visser 1/4 de tour mâle/mâle 20 x 27 mm EQUATION, €5.99 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('Multicouche tube, 16mm, per metre (FR)', 'fr-pipe-cold', 'pipe', 'Per metre. leroymerlin.fr tube multicouche nu Ø16, couronne de 25 m, EQUATION, €29.90 = €1.20/m — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('Multicouche tube, 16mm, per metre (FR)', 'fr-pipe-hot', 'pipe', 'Per metre. Same leroymerlin.fr EQUATION Ø16 x 25 m coil, €29.90 = €1.20/m. Multicouche PE-RT/AL/PE-RT serves hot + cold supply from the nourrisse collector.', CURRENT_DATE, true, 5),
  ('PVC évacuation pipe, Ø40mm x 4m, per metre (FR)', 'fr-pipe-waste', 'pipe', 'Per metre. leroymerlin.fr tube PVC d''évacuation Diam. 40 mm, 4 m, GIRPI, €8.99 = €2.25/m — live listing read 2026-10-14. Ø40 waste line per DTU 60.11.', CURRENT_DATE, true, 5),
  ('PVC évacuation pipe, Ø100mm x 2m, per metre (FR)', 'fr-pipe-drainage', 'pipe', 'Per metre. leroymerlin.fr tube PVC d''évacuation Diam. 100 mm, 2 m, €6.99 = €3.50/m — live listing read 2026-10-14. Ø100 soil stack / WC évacuation.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('FR', 'fr-elbow',            4.90, 'EUR', 'leroymerlin.fr coude multicouche à sertir D.16 €4.90, live listing read 2026-10-14'),
    ('FR', 'fr-tee',              6.59, 'EUR', 'leroymerlin.fr té multicouche à sertir D.16 €6.59, live listing read 2026-10-14'),
    ('FR', 'fr-reducer',          9.99, 'EUR', 'leroymerlin.fr té PER à sertir réduit Ø16-12-12 €9.99, live listing read 2026-10-14'),
    ('FR', 'fr-union',            3.19, 'EUR', 'leroymerlin.fr manchon multicouche 1/2" x 16 €3.19, live listing read 2026-10-14'),
    ('FR', 'fr-valve',            5.99, 'EUR', 'leroymerlin.fr vanne d''arrêt 1/4 tour 20x27 €5.99, live listing read 2026-10-14'),
    ('FR', 'fr-pipe-cold',        1.20, 'EUR', 'leroymerlin.fr tube multicouche Ø16 couronne 25m €29.90 = €1.20/m, live listing read 2026-10-14'),
    ('FR', 'fr-pipe-hot',         1.20, 'EUR', 'Same leroymerlin.fr Ø16 x 25m coil; multicouche serves hot+cold, read 2026-10-14'),
    ('FR', 'fr-pipe-waste',       2.25, 'EUR', 'leroymerlin.fr tube PVC évacuation Ø40 x 4m GIRPI €8.99 = €2.25/m, live listing read 2026-10-14'),
    ('FR', 'fr-pipe-drainage',    3.50, 'EUR', 'leroymerlin.fr tube PVC évacuation Ø100 x 2m €6.99 = €3.50/m, live listing read 2026-10-14')
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
WHERE (m.slug LIKE 'fr-pipe-%' OR m.slug IN ('fr-elbow','fr-tee','fr-reducer','fr-union','fr-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
