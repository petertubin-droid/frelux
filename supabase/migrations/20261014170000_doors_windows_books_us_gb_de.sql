-- ============================================================
-- FRELUX: Doors & Windows price books for US, GB, and DE
--
-- Verified 2026-10-14 from live supplier listings with manual
-- verification (scan_confidence='manual').
-- Only items with verified retail/trade supplier listings are
-- seeded. Any item lacking direct local equivalence (e.g. tropical
-- jalousie louvres or non-standard opening types in temperate
-- markets) is intentionally left unpriced and reported unresolved
-- in the market resolver — never silently substituted.
--
-- US (USD, The Home Depot live listings):
--   door-flush:       $68.00  (JELD-WEN 32x80 in. Flush Hollow-Core Slab, SKU #202036894)
--   door-panel:       $67.00  (Masonite 30x80 in. 6-Panel Hollow-Core Slab, SKU #100028723)
--   door-frame:       $61.98  (EverMark 4-9/16 in. x 36 in. x 84 in. Split Jamb Kit, SKU #204758509)
--   door-hinge:       $2.32   (Everbilt 3-1/2 in. Mortise Hinge, 12-pack $27.78, SKU #314144415)
--   door-lockset:     $10.13  (Defiant Hartford Satin Nickel Keyed Entry Knob, SKU #304968846)
--   window-aluminium: $169.00 (JELD-WEN 36x36 in. V-2500 Series Sliding Window, SKU #205937171)
--   door-security:    Unpriced (standard steel security screens not directly equivalent to solid security leaf)
--   window-louver:    Unpriced (tropical jalousie louvres not standard residential code in US)
--
-- GB (GBP incl VAT, Wickes live listings):
--   door-flush:       £39.00  (Wickes Flush Primed Paint Grade Internal Door 1981x762mm, SKU #239052)
--   door-panel:       £32.00  (Wickes Lincoln White Grained 6-Panel Internal Door 1981x762mm, SKU #200604)
--   door-frame:       £32.00  (Wickes Softwood Internal Door Lining Set 27.5x108mm x 2.01m, SKU #200351)
--   door-hinge:       £1.50   (Wickes Steel Butt Hinges 76mm 2-pack £3.00, SKU #159714)
--   door-security:    Unpriced (specialist PAS 24 composite multi-point doors require local specification)
--   door-lockset:     Unpriced (modular mortice latch/handle furniture packs require spec)
--   window-aluminium: Unpriced (UK standard residential fenestration is uPVC/timber casement)
--   window-louver:    Unpriced (tropical louvres not standard in UK building regulations)
--
-- DE (EUR incl MwSt, Hornbach live listings):
--   door-flush:       €109.00 (Pertura Zimmertür CPL Weiß 86.0x198.5cm, Art. 8863309)
--   door-frame:       €79.00  (Komplettzarge Pertura Dekor Weiß 198.5x98.5x12.0cm, Art. 7501268)
--   door-hinge:       €1.35   (Türband Rahmenteil verzinkt, Art. S27504)
--   door-lockset:     €23.95  (Rosettengarnitur BB Arni Edelstahl satiniert, Art. 10104995)
--   door-panel:       Unpriced (requires specific model and finish selection)
--   door-security:    Unpriced (German RC2/RC3 security doors require specialized spec)
--   window-aluminium: Unpriced (German fenestration standard is Drehkipp tilt-and-turn)
--   window-louver:    Unpriced (tropical louvres not standard in German EnEV/GEG)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('US', 'door-flush',        68.00, 'USD', 'The Home Depot JELD-WEN 32x80 in. Raw Flush Hollow-Core Interior Door Slab $68.00, live listing 2026-10-14'),
    ('US', 'door-panel',        67.00, 'USD', 'The Home Depot Masonite 30x80 in. 6-Panel Textured Hollow-Core Slab $67.00, live listing 2026-10-14'),
    ('US', 'door-frame',        61.98, 'USD', 'The Home Depot EverMark 4-9/16 in. x 36 in. x 84 in. Split Jamb Kit $61.98, live listing 2026-10-14'),
    ('US', 'door-hinge',         2.32, 'USD', 'The Home Depot Everbilt 3-1/2 in. Mortise Hinge 12-pk $27.78 ($2.32/ea), live listing 2026-10-14'),
    ('US', 'door-lockset',      10.13, 'USD', 'The Home Depot Defiant Hartford Satin Nickel Keyed Entry Knob $10.13, live listing 2026-10-14'),
    ('US', 'window-aluminium', 169.00, 'USD', 'The Home Depot JELD-WEN 36x36 in. V-2500 Series Sliding Window $169.00, live listing 2026-10-14'),

    ('GB', 'door-flush',        39.00, 'GBP', 'Wickes Flush Primed Paint Grade Internal Door 1981x762mm £39.00 incl VAT, live listing 2026-10-14'),
    ('GB', 'door-panel',        32.00, 'GBP', 'Wickes Lincoln White Grained 6-Panel Internal Door 1981x762mm £32.00 incl VAT, live listing 2026-10-14'),
    ('GB', 'door-frame',        32.00, 'GBP', 'Wickes Softwood Internal Door Lining Set 27.5x108mm x 2.01m £32.00 incl VAT, live listing 2026-10-14'),
    ('GB', 'door-hinge',         1.50, 'GBP', 'Wickes Steel Butt Hinges 76mm 2-pack £3.00 (£1.50/ea) incl VAT, live listing 2026-10-14'),

    ('DE', 'door-flush',       109.00, 'EUR', 'Hornbach Pertura Zimmertür CPL Weiß 86.0x198.5cm €109.00 incl MwSt, live listing 2026-10-14'),
    ('DE', 'door-frame',        79.00, 'EUR', 'Hornbach Komplettzarge Pertura Dekor Weiß 198.5x98.5x12.0cm €79.00 incl MwSt, live listing 2026-10-14'),
    ('DE', 'door-hinge',         1.35, 'EUR', 'Hornbach Türband Rahmenteil verzinkt €1.35 incl MwSt, live listing 2026-10-14'),
    ('DE', 'door-lockset',      23.95, 'EUR', 'Hornbach Rosettengarnitur BB Arni Edelstahl satiniert €23.95 incl MwSt, live listing 2026-10-14')
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
