-- ============================================================
-- FRELUX: Doors & Windows price book for Indonesia (ID)
--
-- Verified 2026-10-14 from live Tokopedia listings (IDR).
-- All rows scan_confidence='manual'.
--
-- ID (IDR, live listings 2026-10-14, Tokopedia):
--   door-flush:   Rp 350,000 (mahoni wood interior door leaf 80x200/82x200cm, SP Jati Mebel Bekasi wholesale listing at Rp 350k/pc, min 10 pcs)
--   door-panel:   Rp 1,200,000 (pintu kayu model klasik Belanda, Tokopedia Dewsksn listing)
--   door-frame:   Rp 500,000 (Kusen Pintu Kayu Jati Asli, Tokopedia Agung Mebel Wijaya listing)
--   door-hinge:   Rp 35,000 (Engsel Pintu 4x3 Stainless Steel 4in, Tokopedia idlaris Jakarta Barat listing)
--   door-lockset: Rp 125,000 (Paket Gagang Pintu 1 Set Kunci 45cm stainless, Tokopedia listing)
--
-- Unpriced per zero-fabrication rule: door-security, window-aluminium,
-- window-louver (custom-fabricated per opening by local workshops)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('ID', 'door-flush',   350000.00, 'IDR', 'Mahoni wood interior door leaf 80x200/82x200cm IDR 350,000/pc, Tokopedia SP Jati Mebel Bekasi wholesale listing (min 10 pcs), live 2026-10-14'),
    ('ID', 'door-panel',  1200000.00, 'IDR', 'Pintu kayu model klasik Belanda IDR 1,200,000, Tokopedia Dewsksn listing, live 2026-10-14'),
    ('ID', 'door-frame',   500000.00, 'IDR', 'Kusen Pintu Kayu Jati Asli IDR 500,000, Tokopedia Agung Mebel Wijaya listing, live 2026-10-14'),
    ('ID', 'door-hinge',    35000.00, 'IDR', 'Engsel Pintu 4x3 Stainless Steel 4in IDR 35,000, Tokopedia idlaris Jakarta Barat listing, live 2026-10-14'),
    ('ID', 'door-lockset', 125000.00, 'IDR', 'Paket Gagang Pintu 1 Set Kunci 45cm stainless IDR 125,000, Tokopedia listing, live 2026-10-14')
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
