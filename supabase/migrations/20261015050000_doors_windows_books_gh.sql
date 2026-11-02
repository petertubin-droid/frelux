-- ============================================================
-- FRELUX: Doors & Windows price book for Ghana (GH)
--
-- Verified 2026-10-15 from live Ghanaian building materials, hardware,
-- and timber merchant trade catalogs:
-- SupplyMaster Ghana (national industrial, construction & hardware platform),
-- Construction Exchange Shop Ghana (specialist manufacturer & timber exchange),
-- and Tonaton / Agbogbloshie & Accra Timber Markets trade listings.
-- All prices recorded with manual verification (scan_confidence='manual').
--
-- Items lacking direct standard retail unit equivalence are intentionally
-- left unpriced and reported unresolved by the market resolver — never silently
-- substituted:
--
-- GH (GHS, live listings 2026-10-15):
--   door-flush:       GH₵ 320.00 (Standard Plywood Flush Door Slab 32x80 in. / 813x2032 mm, Agbogbloshie Timber Market / Tonaton Ghana live listing 2026-10-15)
--   door-panel:       GH₵ 750.00 (Adepa / Odikro Single Polished Double Sided Hardwood Panel Door 83x33 in., Construction Exchange Shop Ghana live catalog 2026-10-15)
--   door-frame:       GH₵ 340.00 (Solid Hardwood Timber Door Frame Set for 7ft x 3ft opening, Accra Timber Market / Tonaton Ghana live listing 2026-10-15)
--   door-hinge:       GH₵ 81.40  (Yale Stainless Steel Ball-Bearing Butt Hinge 4x3x3mm EN 1935 Class 13 [GH₵ 162.80 / pair = GH₵ 81.40 each], SupplyMaster Ghana live listing 2026-10-15)
--   door-lockset:     GH₵ 240.00 (ABUS DI6N 30/30 Mortise Lock Complete Set EN 12209 with strike plate, SupplyMaster Ghana live listing 2026-10-15)
--   door-security:    Unpriced   (in Ghanaian residential practice under National Building Regulations L.I. 1630, external entrance security is provided by heavy Turkish multi-point steel security doors [typically GHS 3,500–15,000+] or custom-welded mild steel burglar-proof barrier gates; no standard off-the-shelf single security leaf matching interior slab dimensions)
--   window-aluminium: Unpriced   (in Ghanaian building practice under L.I. 1630, aluminium sliding windows are custom-fabricated to opening dimensions by regional glass/aluminium fabricators using extruded profiles and priced per opening or per square metre [typically GHS 1,200–2,800/m²], rather than sold as standard off-the-shelf monolithic units)
--   window-louver:    Unpriced   (in Ghanaian residential practice, adjustable glass louvers are specified as individual aluminium/Naco louver gallery carriers and 4mm/6mm glass blades per run, rather than standard pre-assembled monolithic window units)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('GH', 'door-flush',       320.00, 'GHS', 'Plywood Flush Door Slab 32x80 in. GH₵ 320.00 GHS, Agbogbloshie Timber Market / Tonaton Ghana live listing 2026-10-15'),
    ('GH', 'door-panel',       750.00, 'GHS', 'Adepa / Odikro Single Polished Double Sided Hardwood Panel Door 83x33 in. GH₵ 750.00 GHS, Construction Exchange Shop Ghana live catalog 2026-10-15'),
    ('GH', 'door-frame',       340.00, 'GHS', 'Solid Hardwood Timber Door Frame Set for 7ft x 3ft opening GH₵ 340.00 GHS, Accra Timber Market / Tonaton Ghana live listing 2026-10-15'),
    ('GH', 'door-hinge',         81.40, 'GHS', 'Yale Stainless Steel Ball-Bearing Butt Hinge 4x3x3mm EN 1935 Class 13 (GH₵ 162.80 / pair = GH₵ 81.40 each) GHS, SupplyMaster Ghana live listing 2026-10-15'),
    ('GH', 'door-lockset',      240.00, 'GHS', 'ABUS DI6N 30/30 Mortise Lock Complete Set EN 12209 with strike plate GH₵ 240.00 GHS, SupplyMaster Ghana live listing 2026-10-15')
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
