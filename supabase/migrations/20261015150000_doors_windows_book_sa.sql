-- ============================================================
-- FRELUX: Doors & Windows price book for Saudi Arabia (SA)
--
-- Verified 2026-10-14 from live Saudi listings (OpenSooq Riyadh
-- verified listings, Amazon.sa). All rows scan_confidence='manual'.
--
-- SA (SAR, live listings 2026-10-14):
--   door-flush:   SAR 750.00 (interior WPC doors, OpenSooq Al Riyadh live listing "ابواب wpc داخليه", New, 750 SAR, posted 2026-10-07; corroborated by WPC doors rep listing 850 SAR, As Sulay Riyadh)
--   door-hinge:   SAR  29.38 (UAP 4-inch door hinges, 4-hinge set SAR 117.50, Amazon.sa product B09QXQM7ML)
--   door-lockset: SAR 114.17 (ROBUSTLINE Door Handle Lockset with 3 keys, Amazon.sa live listing)
--
-- Unpriced per zero-fabrication rule (Saudi door market is quote-based):
--   door-panel, door-frame — Saudi wooden panel doors and frames are sold
--   through building suppliers/carpentry workshops on project quotes
--   (hpdksa.com, Youmats quote-based, no fixed retail unit listing);
--   door-security (premium), window-aluminium, window-louver (custom)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('SA', 'door-flush',   750.00, 'SAR', 'Interior WPC doors SAR 750, OpenSooq Al Riyadh live listing (New, posted 2026-10-07), live 2026-10-14'),
    ('SA', 'door-hinge',    29.38, 'SAR', 'UAP 4-inch door hinges 4-hinge set SAR 117.50 = SAR 29.38 each, Amazon.sa product B09QXQM7ML, live 2026-10-14'),
    ('SA', 'door-lockset', 114.17, 'SAR', 'ROBUSTLINE Door Handle Lockset with 3 keys SAR 114.17, Amazon.sa live listing 2026-10-14')
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
