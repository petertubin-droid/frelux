-- ============================================================
-- FRELUX: Plumbing price book CHINA (CN) — 9/9 rows, verified
-- 2026-10-14 from live CN listings (LESSO/联塑 anchor brand),
-- scan_confidence='manual'. System per CN profile: PP-R dn25
-- S3.2/PN2.0MPa supply (GB/T 18742), PVC-U de50 waste / de110
-- soil (GB/T 5836), 4m lengths, solvent/heat-fusion joints.
--   cn-elbow:  LESSO PPR elbow 25mm, ¥2.49 incl 13% VAT
--               (szlcsc.com/mro/23790667)
--   cn-tee:    LESSO PPR Φ25 equal tee, ¥1.42 incl VAT
--               (szlcsc.com/mro/52150032)
--   cn-reducer: LESSO PPR Φ25*20 reducer bushing, ¥0.69 incl VAT
--               (szlcsc.com/mro/46696643)
--   cn-union:  LESSO PPR equal coupling (直通) dn25, ¥0.78
--               (smzdm.com wiki listing)
--   cn-valve:  LESSO brass PPR double-union ball valve 25, ¥19.92
--               (Taobao top-100 listing, 20/25/32 options)
--   cn-pipe-cold/hot: LESSO PPR S3.2 25*3.5mm*4m 2.0MPa,
--               ¥25.90/根 incl tax = ¥6.48/m (ck.xfs.com
--               /productsku/10433140; 未税 ¥22.92)
--   cn-pipe-waste: LESSO PVC-U drainage Ⅰ型 50*2.0mm*4m,
--               ¥21.90/根 = ¥5.48/m (ck.xfs.com/productsku/20967745)
--   cn-pipe-drainage: LESSO PVC-U belled drainage 110*3.2mm*4m,
--               ¥60.18 excl VAT = ¥68.00 incl 13% = ¥17.00/m
--               (ck.xfs.com/productsku/11300997)
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('PPR elbow, 25mm 90° (CN)', 'cn-elbow', 'pipe', 'Per piece. szlcsc.com LESSO/联塑 PPR elbow 25mm, ¥2.49 incl 13% VAT — live listing read 2026-10-14. Chinese practice uses PP-R heat-fusion fittings per GB/T 18742, LESSO is the dominant brand.', CURRENT_DATE, true, 5),
  ('PPR tee, 25mm (CN)', 'cn-tee', 'pipe', 'Per piece. szlcsc.com LESSO PPR Φ25 等径三通 (equal tee), ¥1.42 incl VAT — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PPR reducer bushing, 25 x 20mm (CN)', 'cn-reducer', 'pipe', 'Per piece. szlcsc.com LESSO PPR Φ25*20 大小头 (reducing bushing), ¥0.69 incl VAT — live listing read 2026-10-14. Reduces the dn25 trunk (6分) to dn20 (4分) fixture branches per GB/T 18742.', CURRENT_DATE, true, 5),
  ('PPR coupling (直通), 25mm (CN)', 'cn-union', 'pipe', 'Per piece. LESSO PPR 等径直通 (equal direct coupling) dn25, ¥0.78 — listing read 2026-10-14 (smzdm price wiki for the LESSO dn25 coupling).', CURRENT_DATE, true, 5),
  ('PPR ball valve, 25mm double-union brass (CN)', 'cn-valve', 'pipe', 'Per piece. LESSO 全铜 PPR 双活接球阀 (brass double-union ball valve), 25mm option ¥19.92 — Taobao top-100 listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PPR pipe, dn25 S3.2 2.0MPa x 4m, per metre (CN)', 'cn-pipe-cold', 'pipe', 'Per metre. ck.xfs.com LESSO PPR 热水管 S3.2 25*3.5mm*4m 2.0MPa, ¥25.90 per 4 m stick incl tax = ¥6.48/m — live listing read 2026-10-14. dn25 (6分) trunk per GB/T 18742.', CURRENT_DATE, true, 5),
  ('PPR pipe, dn25 S3.2 2.0MPa x 4m, per metre (CN)', 'cn-pipe-hot', 'pipe', 'Per metre. Same ck.xfs.com LESSO PPR S3.2 25*3.5mm*4m stick, ¥25.90 = ¥6.48/m. 2.0MPa S3.2 grade serves hot + cold (70°C continuous).', CURRENT_DATE, true, 5),
  ('PVC-U waste pipe, de50 x 4m, per metre (CN)', 'cn-pipe-waste', 'pipe', 'Per metre. ck.xfs.com LESSO PVC-U 排水管 Ⅰ型 50*2.0mm*4m, ¥21.90 per 4 m stick = ¥5.48/m — live listing read 2026-10-14. de50 waste line per GB/T 5836.', CURRENT_DATE, true, 5),
  ('PVC-U soil pipe, de110 x 4m, per metre (CN)', 'cn-pipe-drainage', 'pipe', 'Per metre. ck.xfs.com LESSO PVC-U belled-end (扩直口) drainage pipe 110*3.2mm*4m, ¥60.18 excl VAT = ¥68.00 incl 13% per 4 m stick = ¥17.00/m — live listing read 2026-10-14. de110 soil stack per GB/T 5836.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('CN', 'cn-elbow',            2.49, 'CNY', 'szlcsc.com LESSO PPR elbow 25mm ¥2.49 incl 13% VAT, live listing read 2026-10-14'),
    ('CN', 'cn-tee',              1.42, 'CNY', 'szlcsc.com LESSO PPR Φ25 equal tee ¥1.42 incl VAT, live listing read 2026-10-14'),
    ('CN', 'cn-reducer',          0.69, 'CNY', 'szlcsc.com LESSO PPR Φ25*20 reducer bushing ¥0.69 incl VAT, live listing read 2026-10-14'),
    ('CN', 'cn-union',            0.78, 'CNY', 'LESSO PPR equal coupling 直通 dn25 ¥0.78, listing read 2026-10-14 (smzdm price wiki)'),
    ('CN', 'cn-valve',           19.92, 'CNY', 'Taobao LESSO brass PPR double-union ball valve 25mm ¥19.92, listing read 2026-10-14'),
    ('CN', 'cn-pipe-cold',        6.48, 'CNY', 'ck.xfs.com LESSO PPR S3.2 25*3.5mm*4m ¥25.90/根 incl tax = ¥6.48/m, live listing read 2026-10-14'),
    ('CN', 'cn-pipe-hot',         6.48, 'CNY', 'Same ck.xfs.com LESSO PPR S3.2 25*3.5*4m stick; 2.0MPa grade serves hot+cold, read 2026-10-14'),
    ('CN', 'cn-pipe-waste',       5.48, 'CNY', 'ck.xfs.com LESSO PVC-U drainage Ⅰ型 50*2.0*4m ¥21.90/根 = ¥5.48/m, live listing read 2026-10-14'),
    ('CN', 'cn-pipe-drainage',   17.00, 'CNY', 'ck.xfs.com LESSO PVC-U belled drainage 110*3.2*4m ¥60.18 excl VAT = ¥68.00 incl = ¥17.00/m, live listing read 2026-10-14')
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
WHERE (m.slug LIKE 'cn-pipe-%' OR m.slug IN ('cn-elbow','cn-tee','cn-reducer','cn-union','cn-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
