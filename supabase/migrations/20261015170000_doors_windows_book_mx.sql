-- ============================================================
-- FRELUX: Doors & Windows price book for Mexico (MX)
--
-- Verified 2026-10-14 from live The Home Depot México (+ pro.homedepot.com.mx)
-- and MercadoLibre MX listings. All rows scan_confidence='manual'.
--
-- MX (MXN, live listings 2026-10-14):
--   door-flush:   MXN 997.00  (MUVA Puerta interior tambor 90x213 cm blanco nevada, Home Depot México pro sku 225540)
--   door-panel:   MXN 1,769.00 (Puerta interior semisólida 70x210 cm chocolate veteada, Home Depot México sku 161054)
--   door-frame:   MXN 595.00  (Marco para puerta Rosi 100x220x6 cm con acabado y 3 bisagras, SKU 400933)
--   door-hinge:   MXN 145.00  (Bisagra cabeza plana acero níquel 3x3" para puerta, Home Depot México 1402 300959)
--   door-lockset: MXN 278.00  (VANANCE cerradura chapa manija para puertas de recámara y baño, MercadoLibre MX live listing)
--
-- Unpriced per zero-fabrication rule: door-security (premium),
-- window-aluminium, window-louver (custom-fabricated per opening)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('MX', 'door-flush',    997.00, 'MXN', 'MUVA Puerta interior tambor 90x213 cm blanco nevada MXN 997.00, Home Depot Mexico pro sku 225540, live 2026-10-14'),
    ('MX', 'door-panel',   1769.00, 'MXN', 'Puerta interior semisolida 70x210 cm chocolate veteada MXN 1,769.00, Home Depot Mexico sku 161054, live 2026-10-14'),
    ('MX', 'door-frame',    595.00, 'MXN', 'Marco para puerta Rosi 100x220x6 cm con acabado y 3 bisagras MXN 595.00, Home Depot Mexico SKU 400933, live 2026-10-14'),
    ('MX', 'door-hinge',    145.00, 'MXN', 'Bisagra cabeza plana acero niquel 3x3in para puerta MXN 145.00, Home Depot Mexico 1402 300959, live 2026-10-14'),
    ('MX', 'door-lockset',  278.00, 'MXN', 'VANANCE cerradura chapa manija para puertas de recamara y bano MXN 278.00, MercadoLibre MX live listing 2026-10-14')
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
