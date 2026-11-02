-- ============================================================
-- FRELUX: Doors & Windows price book for China (CN)
--
-- Verified 2026-10-14 from live Taobao/SMZDM/TATA official listings (CNY).
-- All rows scan_confidence='manual'.
--
-- CN (CNY, live listings 2026-10-14):
--   door-flush:   CNY 1,099.00 (TATA Z001 免漆套装门 single-door set incl. door leaf + 门套 frame, SMZDM price record + TATA official product 3575)
--   door-panel:   CNY 3,500.00 (Mexin 美心 法式烤漆卧室门 实木复合 panel door, Taobao Mexin flagship store live listing, was 4,169)
--   door-hinge:   CNY    22.80 (stainless 子母合页 4/5寸 interior door hinge, Taobao live listing, 100+ sold, 94 reviews)
--   door-lockset: CNY    76.00 (固特 GUTE interior bedroom door lockset with handle, Taobao 固特百裕瑞专卖店 live listing, 600+ paid)
--
-- Unpriced per zero-fabrication rule:
--   door-frame — Chinese doors are sold as 套装门 (door sets incl. 门套
--   frame); the flush/panel rows above are set prices already including
--   the frame. No fixed standalone frame retail listing verified.
--   door-security, window-aluminium, window-louver (custom/premium)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('CN', 'door-flush',  1099.00, 'CNY', 'TATA Z001 paint-free single-door set incl. leaf + frame CNY 1,099, SMZDM price record + TATA official product 3575, live 2026-10-14'),
    ('CN', 'door-panel',  3500.00, 'CNY', 'Mexin French baked-paint panel bedroom door solid-wood composite CNY 3,500 (was 4,169), Taobao Mexin flagship live listing 2026-10-14'),
    ('CN', 'door-hinge',    22.80, 'CNY', 'Stainless sub-hinge 4/5-inch interior door hinge CNY 22.80, Taobao live listing (100+ sold, 94 reviews), 2026-10-14'),
    ('CN', 'door-lockset',  76.00, 'CNY', 'GUTE interior bedroom door lockset with handle CNY 76.00, Taobao GUTE Baiyurui store live listing (600+ paid), 2026-10-14')
  ) AS v(market, slug, price, currency, source)
  JOIN estimation_materials m ON m.slug = v.slug AND m.is_active = true
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
