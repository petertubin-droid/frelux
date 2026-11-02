-- ============================================================
-- FRELUX: Doors & Windows price book for South Korea (KR)
--
-- Verified 2026-10-14 from live Coupang listings (KRW).
-- All rows scan_confidence='manual'.
--
-- KR (KRW, live listings 2026-10-14, Coupang):
--   door-flush:   KRW 200,000 (ABS door leaf + frame replacement incl installation for interior door, Coupang product 6213132137, free shipping)
--   door-hinge:   KRW 15,900 (steel self-closing door hinge set for interior/metal doors, Coupang product 9745429159)
--   door-lockset: KRW 30,530 (interior gold lever door lock with push button, Coupang product 8231135416, free shipping)
--
-- Unpriced per zero-fabrication rule:
--   door-panel, door-frame — Korean interior doors are sold through
--   installation-service listings (the flush row's listing already
--   includes leaf + frame + installation); no standalone fixed-price
--   retail listing verified for panel leaves or frames alone.
--   door-security, windows: custom/premium.
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('KR', 'door-flush',  200000.00, 'KRW', 'ABS door leaf + frame replacement incl installation KRW 200,000, Coupang product 6213132137, free shipping, live 2026-10-14'),
    ('KR', 'door-hinge',   15900.00, 'KRW', 'Steel self-closing door hinge set for interior and metal doors KRW 15,900 (45% off), Coupang product 9745429159, live 2026-10-14'),
    ('KR', 'door-lockset', 30530.00, 'KRW', 'Interior gold lever door lock with push button KRW 30,530, Coupang product 8231135416, free shipping, live 2026-10-14')
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
