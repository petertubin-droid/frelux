-- ============================================================
-- FRELUX: Doors & Windows price book for United Arab Emirates (AE)
--
-- Verified 2026-10-14 from live UAE listings (Amazon.ae, Desertcart UAE).
-- All rows scan_confidence='manual'.
--
-- AE (AED, live listings 2026-10-14):
--   door-flush:   AED 1,193.00 (PF P_38 Interior Door ash wood, Desertcart UAE, duties & taxes included)
--   door-panel:   AED 1,948.00 (Standard Design Solid MDF Panelled Slab Internal Door 198.1x76.2cm, Desertcart UAE, duties included)
--   door-hinge:     AED 24.00 (Amazon Basics Self-Closing Door Hinge 3.5", Amazon.ae product B07GF54KV8)
--   door-lockset:   AED 35.99 (KYLAQ Zen Aluminum Door Handle 4 Hole Set HD-100, Amazon.ae live listing)
--
-- Unpriced per zero-fabrication rule:
--   door-frame (UAE frames supplied by door manufacturers on project quotes;
--   no fixed retail unit listing found), door-security, window-aluminium,
--   window-louver (custom-fabricated per opening)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('AE', 'door-flush',  1193.00, 'AED', 'PF P_38 Interior Door ash wood AED 1,193 duties & taxes included, Desertcart UAE live listing 2026-10-14'),
    ('AE', 'door-panel',  1948.00, 'AED', 'Standard Design Solid MDF Panelled Slab Internal Door 198.1x76.2cm AED 1,948 duties included, Desertcart UAE live listing 2026-10-14'),
    ('AE', 'door-hinge',    24.00, 'AED', 'Amazon Basics Self-Closing Door Hinge 3.5 inch AED 24.00, Amazon.ae product B07GF54KV8, live 2026-10-14'),
    ('AE', 'door-lockset',  35.99, 'AED', 'KYLAQ Zen Aluminum Door Handle 4 Hole Set HD-100 AED 35.99, Amazon.ae live listing 2026-10-14')
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
