-- ============================================================
-- FRELUX: Doors & Windows price book for Kenya (KE)
--
-- Verified 2026-10-15 from live Kenyan timber and hardware merchant listings:
-- Mastercraft Timber & Hardware (Kamakis, Ruiru / Nairobi, Kenya).
-- All prices recorded with manual verification (scan_confidence='manual').
--
-- Items lacking direct standard retail unit equivalence are intentionally
-- left unpriced and reported unresolved by the market resolver — never silently
-- substituted:
--
-- KE (KES, Mastercraft Timber & Hardware live listings):
--   door-flush:       KSh 3,500.00 (Mastercraft Timber Normal Toilet Bathroom Solid Veneer Flush Door 32x80 in. / 813x2032 mm)
--   door-panel:       KSh 4,500.00 (Mastercraft Timber 5-Panel Embossed Solid Flush Door 32x80 in.)
--   door-frame:       KSh 1,560.00 (Mastercraft Timber 4x2 Standard Cypress Door Frame 7ft Long / 2100 mm)
--   door-hinge:       KSh 115.00   (Mastercraft Timber Oxford Steel Door Hinges KSh 230.00 / pair = KSh 115.00 each)
--   door-lockset:     KSh 3,000.00 (Mastercraft Timber Union Door Lock Mortice Lockset)
--   door-security:    Unpriced (residential security doors in Kenyan practice are custom fabricated welded mild-steel security grilles/gates or heavy imported multi-point steel doors; no standard single-leaf off-the-shelf equivalent)
--   window-aluminium: Unpriced (in Kenyan practice, aluminium sliding windows are custom fabricated to opening dimensions per square metre by local glass/aluminium fabricators, typically KSh 9,000–15,000/m²; no monolithic off-the-shelf single unit)
--   window-louver:    Unpriced (adjustable louvre galleries and glass louvre blades are purchased separately per blade; no pre-assembled residential louver window unit)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    -- Kenya (KE)
    ('KE', 'door-flush',       3500.00, 'KES', 'Mastercraft Timber Normal Toilet Bathroom Solid Veneer Flush Door 32x80 in. KSh 3,500.00, live listing 2026-10-15'),
    ('KE', 'door-panel',       4500.00, 'KES', 'Mastercraft Timber 5-Panel Embossed Solid Flush Door 32x80 in. KSh 4,500.00, live listing 2026-10-15'),
    ('KE', 'door-frame',       1560.00, 'KES', 'Mastercraft Timber 4x2 Standard Cypress Door Frame 7ft Long KSh 1,560.00, live listing 2026-10-15'),
    ('KE', 'door-hinge',        115.00, 'KES', 'Mastercraft Timber Oxford Steel Door Hinges KSh 230.00 / pair (KSh 115.00/ea), live listing 2026-10-15'),
    ('KE', 'door-lockset',     3000.00, 'KES', 'Mastercraft Timber Union Door Lock Mortice Lockset KSh 3,000.00, live listing 2026-10-15')
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
