-- ============================================================
-- FRELUX: Doors & Windows price book for Japan (JP)
--
-- Verified 2026-10-14 from live Japanese retailer listings
-- (kakaku.com, Rakuten Ichiba, Kohnan e-shop). Prices incl tax.
-- All rows scan_confidence='manual'.
--
-- JP (JPY, live listings 2026-10-14):
--   door-flush:   JPY 19,800 (室内ドア 開き戸 DIY single-leaf interior door, kakaku.com live listing)
--   door-panel:   JPY 36,200 (LIXIL 室内ドア door exchange DIY, Rakuten Ichiba live listing)
--   door-hinge:   JPY  1,064 (BEST ノイズレス旗蝶番 HL 195A 102, Kohnan e-shop 4901099047968, incl tax)
--   door-lockset: JPY  2,200 (室内ドア錠 ラッチ錠, Rakuten Ichiba live listing)
--
-- Unpriced per zero-fabrication rule:
--   door-frame — Japanese interior doors are sold as ドアセット
--   (door + frame sets, e.g. LIXIL/Daiken; Rakuten "室内ドア 枠 セット"
--   listings) rather than standalone frame units; no fixed standalone
--   frame retail listing exists. door-security, windows: custom/premium.
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('JP', 'door-flush',  19800.00, 'JPY', 'Single-leaf interior hinged door JPY 19,800 incl tax, kakaku.com live listing 2026-10-14'),
    ('JP', 'door-panel',  36200.00, 'JPY', 'LIXIL interior door exchange DIY JPY 36,200, Rakuten Ichiba live listing 2026-10-14'),
    ('JP', 'door-hinge',   1064.00, 'JPY', 'BEST noiseless flag hinge HL 195A 102 JPY 1,064 incl tax, Kohnan e-shop product 4901099047968, live 2026-10-14'),
    ('JP', 'door-lockset', 2200.00, 'JPY', 'Interior door latch lock JPY 2,200, Rakuten Ichiba live listing 2026-10-14')
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
