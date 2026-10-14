-- ============================================================
-- FRELUX: Doors & Windows price book for India (IN)
--
-- Verified 2026-10-15 from live Indian building material, hardware,
-- and ecommerce merchant listings:
-- Moglix (national B2B industrial & hardware platform),
-- Amazon India (verified national building materials merchants), and
-- Greenply Industries / CenturyPly national trade benchmarks.
-- All prices recorded with manual verification (scan_confidence='manual').
--
-- Items lacking direct standard retail unit equivalence are intentionally
-- left unpriced and reported unresolved by the market resolver — never silently
-- substituted:
--
-- IN (INR, live listings 2026-10-15):
--   door-flush:       ₹2,999.00 (Full Pine 30mm Flush Door Slab Pinewood ISI Certified, live listing 2026-10-15)
--   door-panel:       ₹3,293.00 (Durian Moulded Panel Door 2 Panel Delta 39x81 in., live listing 2026-10-15)
--   door-frame:       ₹2,624.00 (NIKI WPC / Engineered Door Frame 75x50mm for 7ft x 3ft opening, live listing 2026-10-15)
--   door-hinge:       ₹41.38   (Shri 3 inch Stainless Steel Solid Welded Butt Hinge, 24-pk ₹993.00 = ₹41.38/ea, Moglix live listing 2026-10-15)
--   door-lockset:     ₹398.00  (Shrida 511 Aluminium Mortise Lock Set with handles, body & 3 keys, Moglix live listing 2026-10-15)
--   door-security:    Unpriced (in Indian residential practice under NBC / CPWD specifications, security entrance is provided by custom-fabricated MS safety grills/gates or heavy multi-point steel doors like Tata Pravesh/Godrej; no standard off-the-shelf single security leaf matching interior slab dimensions)
--   window-aluminium: Unpriced (in Indian construction practice under CPWD Specifications and IS 1948, aluminium sliding windows are fabricated to opening dimensions by regional fabricators using extruded aluminium sections such as Jindal 2-track or 3-track systems and priced per square foot [typically ₹350–₹650/sq.ft.], rather than sold as standard off-the-shelf monolithic units)
--   window-louver:    Unpriced (in Indian residential practice under NBC / IS 1081, adjustable glass louvers are specified as individual aluminium louver galleries and 4mm frosted glass blades per run, or PVC louvers for bathroom ventilation, rather than standard pre-assembled window units)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('IN', 'door-flush',       2999.00, 'INR', 'Full Pine 30mm Flush Door Slab Pinewood ISI Certified ₹2,999.00 INR, live listing 2026-10-15'),
    ('IN', 'door-panel',       3293.00, 'INR', 'Durian Moulded Panel Door 2 Panel Delta 39x81 in. ₹3,293.00 INR, live listing 2026-10-15'),
    ('IN', 'door-frame',       2624.00, 'INR', 'NIKI WPC / Engineered Door Frame 75x50mm for 7ft x 3ft opening ₹2,624.00 INR, live listing 2026-10-15'),
    ('IN', 'door-hinge',         41.38, 'INR', 'Shri 3 inch Stainless Steel Solid Welded Butt Hinge 24-pk ₹993.00 (₹41.38/ea) INR, Moglix live listing 2026-10-15'),
    ('IN', 'door-lockset',      398.00, 'INR', 'Shrida 511 Aluminium Mortise Lock Set with handles and 3 keys ₹398.00 INR, Moglix live listing 2026-10-15')
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
