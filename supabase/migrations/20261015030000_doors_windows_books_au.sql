-- ============================================================
-- FRELUX: Doors & Windows price book for Australia (AU)
--
-- Verified 2026-10-15 from live Australian manufacturer and trade merchant listings:
-- Corinthian Doors Australia (major national door & systems manufacturer),
-- Keeler Hardware (national architectural hardware specialist), and
-- Window Warehouse Australia (AS 1288 certified residential window manufacturer).
-- All prices recorded with manual verification (scan_confidence='manual').
--
-- Items lacking direct standard retail unit equivalence are intentionally
-- left unpriced and reported unresolved by the market resolver — never silently
-- substituted:
--
-- AU (AUD, live manufacturer and trade merchant listings):
--   door-flush:       $108.90 (Corinthian Doors Australia, Flush Interior PMDF Honeycomb Core Primed 2040 x 820 x 35 mm, live trade catalog 2026-10-15)
--   door-panel:       $155.10 (Corinthian Doors Australia, Impressions ROC Moulded Primed MDF Skin 2040 x 820 x 35 mm, live trade catalog 2026-10-15)
--   door-frame:       $53.90  (Corinthian Doors Australia, Primed MDF Door Jamb Stop Set Single Open 2110 x 18 mm / 112mm, live trade catalog 2026-10-15)
--   door-hinge:       $6.90   (Keeler Hardware, Zanda Door Butt Hinge 100mm x 2.5mm Stainless Steel, SKU ZAN-100SS, live listing 2026-10-15)
--   door-lockset:     $31.96  (Keeler Hardware, Carbine Epsom PE3000 Cylindrical Entrance Knobset Satin Stainless Steel, live listing 2026-10-15)
--   window-aluminium: $395.00 (Window Warehouse Australia, Aluminium Sliding Window 1200mm H x 1210mm W Textura Black, 4mm clear float glass AS 1288, primed meranti reveals, lockable handle, live listing 2026-10-15)
--   door-security:    Unpriced (in Australian practice under AS 5039 / AS 5040, security screen doors are custom-measured welded diamond grille or woven stainless steel mesh barrier doors fabricated to opening dimensions; no off-the-shelf monolithic leaf)
--   window-louver:    Unpriced (in Australian residential building practice under NCC/BCA, adjustable glass louver galleries like Breezway Altair are specialized tropical or architectural assemblies specified per blade gallery, not standard monolithic window units)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('AU', 'door-flush',       108.90, 'AUD', 'Corinthian Doors Australia Flush Interior PMDF Honeycomb Core Primed 2040x820x35mm $108.90 AUD inc GST, live listing 2026-10-15'),
    ('AU', 'door-panel',       155.10, 'AUD', 'Corinthian Doors Australia Impressions ROC Moulded Primed MDF Skin 2040x820x35mm $155.10 AUD inc GST, live listing 2026-10-15'),
    ('AU', 'door-frame',        53.90, 'AUD', 'Corinthian Doors Australia Primed MDF Door Jamb Stop Set Single Open 2110x18mm $53.90 AUD inc GST, live listing 2026-10-15'),
    ('AU', 'door-hinge',         6.90, 'AUD', 'Keeler Hardware Zanda Door Butt Hinge 100mm x 2.5mm Stainless Steel $6.90 AUD, SKU ZAN-100SS, live listing 2026-10-15'),
    ('AU', 'door-lockset',      31.96, 'AUD', 'Keeler Hardware Carbine Epsom PE3000 Cylindrical Entrance Knobset Satin Stainless Steel $31.96 AUD, live listing 2026-10-15'),
    ('AU', 'window-aluminium', 395.00, 'AUD', 'Window Warehouse Australia Aluminium Sliding Window 1200x1210mm Textura Black AS 1288 $395.00 AUD, live listing 2026-10-15')
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
