-- ============================================================
-- FRELUX: Plumbing price book SAUDI ARABIA (SA) — 9/9 rows,
-- verified 2026-10-14 from live KSA listings (Al-Manar Plastic
-- Factory shop + benna.com.sa), scan_confidence='manual'.
-- System per SA profile: PPR-C PN20 25mm heat-fusion supply
-- (DIN 8077/8078), uPVC 50mm waste / 110mm soil.
--   sa-elbow:  90° elbow 25mm PPR, almanar-plastic.com SAR 0.67
--   sa-tee:    Tee 25mm PPR (code 110), almanar SAR 0.98
--   sa-reducer: Reducer tee 32x25mm PPR, almanar SAR 1.59
--   sa-union:  Union 25mm PPR (code 155), almanar SAR 1.90
--   sa-valve:  Ball valve 25mm PPR (code 173), almanar SAR 9.00
--   sa-pipe-cold/hot: PPR pipe 25mm PN20, almanar SAR 14.84 per
--               5.8 m stick = SAR 2.56/m
--   sa-pipe-waste: UPVC 50mm x 2.4mm PN-10, almanar SAR 18.37
--               per 6 m = SAR 3.06/m (browser-verified)
--   sa-pipe-drainage: UPVC 110mm (4") class-3 white 6m socket,
--               benna.com.sa SAR 63.64 = SAR 10.61/m
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('PPR elbow, 25mm 90° (SA)', 'sa-elbow', 'pipe', 'Per piece. almanar-plastic.com 90° elbow 25mm PPR, SAR 0.67 — live listing read 2026-10-14. Saudi practice uses PPR-C PN20 heat-fusion fittings per DIN 8077/8078 (SBC 701).', CURRENT_DATE, true, 5),
  ('PPR tee, 25mm (SA)', 'sa-tee', 'pipe', 'Per piece. almanar-plastic.com TEE 25mm PPR (code 110), SAR 0.98 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PPR reducer tee, 32 x 25mm (SA)', 'sa-reducer', 'pipe', 'Per piece. almanar-plastic.com reducer tee 32x25mm PPR (code 128, UV variant SAR 1.59 listed), SAR 1.59 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PPR union, 25mm (SA)', 'sa-union', 'pipe', 'Per piece. almanar-plastic.com UNION 25mm PPR (code 155), SAR 1.90 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PPR ball valve, 25mm (SA)', 'sa-valve', 'pipe', 'Per piece. almanar-plastic.com ball valve 25mm PPR (code 173), SAR 9.00 — live listing read 2026-10-14 (corroborated: JBT-KSA Jumbo PPR ball valve 3/4" 25mm SAR 22.95).', CURRENT_DATE, true, 5),
  ('PPR pipe, 25mm PN20, per metre (SA)', 'sa-pipe-cold', 'pipe', 'Per metre. almanar-plastic.com PPR pipe 25mm PN20, SAR 14.84 per 5.8 m stick = SAR 2.56/m — live listing read 2026-10-14. 25mm OD trunk per SBC 701.', CURRENT_DATE, true, 5),
  ('PPR pipe, 25mm PN20, per metre (SA)', 'sa-pipe-hot', 'pipe', 'Per metre. Same almanar-plastic.com PPR 25mm PN20 stick, SAR 14.84 = SAR 2.56/m. PPR-C serves hot + cold (rated to 95°C).', CURRENT_DATE, true, 5),
  ('uPVC waste pipe, 50mm PN-10 x 6m, per metre (SA)', 'sa-pipe-waste', 'pipe', 'Per metre. almanar-plastic.com UPVC pipe 50mm x 2.4mm PN-10, SAR 18.37 per 6 m (browser-verified page: standard 5.8m/6m lengths) = SAR 3.06/m — read 2026-10-14. 2" uPVC waste line.', CURRENT_DATE, true, 5),
  ('uPVC soil pipe, 110mm x 6m, per metre (SA)', 'sa-pipe-drainage', 'pipe', 'Per metre. benna.com.sa UPVC pipe 110mm (4") 3.2mm class-3 white 6m with solvent-joint socket, SAR 63.64 = SAR 10.61/m — live listing read 2026-10-14. 4" soil/underground drainage.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('SA', 'sa-elbow',            0.67, 'SAR', 'almanar-plastic.com 90° elbow 25mm PPR SAR 0.67, live listing read 2026-10-14'),
    ('SA', 'sa-tee',              0.98, 'SAR', 'almanar-plastic.com tee 25mm PPR SAR 0.98, live listing read 2026-10-14'),
    ('SA', 'sa-reducer',          1.59, 'SAR', 'almanar-plastic.com reducer tee 32x25mm PPR SAR 1.59, live listing read 2026-10-14'),
    ('SA', 'sa-union',            1.90, 'SAR', 'almanar-plastic.com union 25mm PPR SAR 1.90, live listing read 2026-10-14'),
    ('SA', 'sa-valve',            9.00, 'SAR', 'almanar-plastic.com ball valve 25mm PPR SAR 9.00, live listing read 2026-10-14'),
    ('SA', 'sa-pipe-cold',        2.56, 'SAR', 'almanar-plastic.com PPR pipe 25mm PN20 SAR 14.84/5.8m = SAR 2.56/m, live listing read 2026-10-14'),
    ('SA', 'sa-pipe-hot',         2.56, 'SAR', 'Same almanar-plastic.com PPR 25mm PN20 stick; PPR serves hot+cold to 95°C, read 2026-10-14'),
    ('SA', 'sa-pipe-waste',       3.06, 'SAR', 'almanar-plastic.com uPVC 50mm x 2.4mm PN-10 SAR 18.37/6m = SAR 3.06/m, browser-verified 2026-10-14'),
    ('SA', 'sa-pipe-drainage',   10.61, 'SAR', 'benna.com.sa uPVC 110mm class-3 white 6m SAR 63.64 = SAR 10.61/m, live listing read 2026-10-14')
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
WHERE (m.slug LIKE 'sa-pipe-%' OR m.slug IN ('sa-elbow','sa-tee','sa-reducer','sa-union','sa-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
