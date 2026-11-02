-- ============================================================
-- FRELUX: Electrical price books for US and GB (first two
-- markets of the electrical book rollout).
-- Verified 2026-10-13 from live supplier listings (zero manual
-- confirmation; scan_confidence='manual'). All 11 engine slugs
-- (elec-cable-lighting ... elec-distribution-board) priced per
-- market; the electrical page prices every line from the
-- market's own book.
--
-- US (USD, per metre unless noted; Home Depot live listings):
--   lighting  Southwire 250 ft 14/2 NM-B $124.00 (50c/ft) -> $1.64/m
--   socket    Southwire 250 ft 12/2 NM-B (72c/ft)         -> $2.36/m
--   dedicated Southwire 250 ft 10/2 NM-B (123c/ft)        -> $4.04/m
--   earth     Southwire 50 ft 8 AWG bare Cu ground $40.00 (80c/ft) -> $2.62/m
--   feeder    Nassau 2-2-4 aluminum SER $1.86/ft          -> $6.10/m
--   conduit   Allied 1/2in EMT 10 ft $6.98 (69.8c/ft)     -> $2.29/m
--   junction  Steel City 1-gang 12.5 cu in device box (806SW-20R) $3.06
--   breaker   Square D Homeline 20A SP HOM120CP $6.99 (Hammond Hardware)
--   switch    Leviton 1451-2W 15A SP toggle $0.85
--   socket    Leviton BR15-W 15A duplex receptacle $2.68
--   DB        Eaton BR1220B100 12/20 100A main breaker load center $109.99
--     (W.D. Bryant electrical distributor)
--
-- GB (GBP incl VAT, per metre unless noted; Screwfix live listings):
--   lighting  6242Y 1.5mm2 T&E 100m drum GBP 65.99 -> GBP 0.66/m
--   socket    6242Y 2.5mm2 T&E 100m drum GBP 94.99 -> GBP 0.95/m
--   dedicated 6242Y 6mm2 T&E 25m drum GBP 33.99    -> GBP 1.36/m
--   earth     6491X G/Y 2.5mm2 100m drum GBP 48.51 -> GBP 0.49/m
--   feeder    Prysmian 6242Y 10mm2 T&E 25m drum (99630) GBP 72.99 -> GBP 2.92/m
--   conduit   Deta TTE white 20mm x 3m (256VT) GBP 2.29 -> GBP 0.76/m
--   junction  Knightsbridge 5A 4-terminal JB (316YA) GBP 1.59
--   breaker   Wylex PSB06-B 6A Type B SP MCB GBP 8.95 (Willrose Electrical)
--   switch    LAP 10AX 1-gang 1-way white (71728) GBP 1.05
--   socket    LAP 2-gang 13A DP switched socket white GBP 6.37
--   DB        Wylex dual-RCD MCB consumer unit (100A mains, 2x Type A
--             RCD, 8 MCBs) GBP 109.99
--
-- The NG reference book still has no electrical prices by design
-- (admin-entered); DE/AT books are the next batch.
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('US', 'elec-cable-lighting',      1.64,  'USD', 'Home Depot Southwire 250 ft 14/2 NM-B (Romex) $124.00 = 50c/ft = $1.64/m, live listing 2026-10-13; NEC 14 AWG lighting circuits'),
    ('US', 'elec-cable-socket',        2.36,  'USD', 'Home Depot Southwire 250 ft 12/2 NM-B at 72c/ft = $2.36/m, live listing 2026-10-13; NEC 12 AWG 20A branch circuits'),
    ('US', 'elec-cable-dedicated',     4.04,  'USD', 'Home Depot Southwire 250 ft 10/2 NM-B at $1.23/ft = $4.04/m, live listing 2026-10-13; 30A dryer/HVAC circuits'),
    ('US', 'elec-cable-earth',         2.62,  'USD', 'Home Depot Southwire 50 ft 8 AWG solid bare copper grounding wire $40.00 (80c/ft) = $2.62/m, live listing 2026-10-13'),
    ('US', 'elec-cable-feeder',        6.10,  'USD', 'Nassau National Cable 2-2-4 aluminum SER $1.86/ft = $6.10/m, live listing 2026-10-13; 100A service/sub-main'),
    ('US', 'elec-conduit',             2.29,  'USD', 'Home Depot Allied Tube 1/2 in EMT 10 ft $6.98 (69.8c/ft) = $2.29/m, live listing 2026-10-13'),
    ('US', 'elec-junction-box',        3.06,  'USD', 'Home Depot Steel City 1-Gang 12.5 cu. in. device box (806SW-20R) $3.06 each, live listing 2026-10-13'),
    ('US', 'elec-breaker',             6.99,  'USD', 'Hammond Hardware Square D Homeline 20A single-pole breaker HOM120CP $6.99, live listing 2026-10-13'),
    ('US', 'elec-switch-plate',        0.85,  'USD', 'Home Depot Leviton 15A single-pole toggle light switch white (1451-2W) $0.85, live listing 2026-10-13'),
    ('US', 'elec-socket-outlet',       2.68,  'USD', 'Home Depot Leviton 15A commercial grade duplex receptacle white (BR15-W) $2.68, live listing 2026-10-13'),
    ('US', 'elec-distribution-board', 109.99, 'USD', 'W.D. Bryant Eaton BR1220B100 12-space 20-circuit 100A main breaker load center $109.99, live listing 2026-10-13'),
    ('GB', 'elec-cable-lighting',      0.66,  'GBP', 'Screwfix 6242Y grey 1.5mm2 twin & earth 100m drum GBP 65.99 = GBP 0.66/m incl VAT, live listing 2026-10-13; BS 7671 lighting radials'),
    ('GB', 'elec-cable-socket',        0.95,  'GBP', 'Screwfix 2.5mm2 twin & earth 100m drum GBP 94.99 = GBP 0.95/m incl VAT, live listing 2026-10-13; 32A ring finals'),
    ('GB', 'elec-cable-dedicated',     1.36,  'GBP', 'Screwfix Prysmian 6242Y 6mm2 twin & earth 25m drum GBP 33.99 = GBP 1.36/m incl VAT, live listing 2026-10-13; cooker/shower circuits'),
    ('GB', 'elec-cable-earth',         0.49,  'GBP', 'Screwfix Time 6491X green/yellow 1-core 2.5mm2 conduit cable 100m drum GBP 48.51 = GBP 0.49/m incl VAT, live listing 2026-10-13'),
    ('GB', 'elec-cable-feeder',        2.92,  'GBP', 'Screwfix Prysmian 6242Y grey 10mm2 twin & earth 25m drum (99630) GBP 72.99 = GBP 2.92/m incl VAT, live listing 2026-10-13'),
    ('GB', 'elec-conduit',             0.76,  'GBP', 'Screwfix Deta TTE round uPVC white conduit 20mm x 3m (256VT) GBP 2.29 = GBP 0.76/m incl VAT, live listing 2026-10-13'),
    ('GB', 'elec-junction-box',        1.59,  'GBP', 'Screwfix Knightsbridge 5A 4-terminal junction box black (316YA) GBP 1.59 incl VAT, live listing 2026-10-13'),
    ('GB', 'elec-breaker',             8.95,  'GBP', 'Willrose Electrical Wylex PSB06-B 6A Type B single-pole MCB GBP 8.95, live listing 2026-10-13'),
    ('GB', 'elec-switch-plate',        1.05,  'GBP', 'Screwfix LAP 10AX 1-Gang 1-Way light switch white (71728) GBP 1.05 incl VAT, live listing 2026-10-13'),
    ('GB', 'elec-socket-outlet',       6.37,  'GBP', 'Screwfix LAP 2-Gang 13A DP switched plug socket white GBP 6.37 incl VAT, live listing 2026-10-13'),
    ('GB', 'elec-distribution-board', 109.99,'GBP', 'Screwfix Wylex dual-RCD MCB consumer unit (100A mains switch, 2x Type A 80A 30mA RCDs, 8 Type B MCBs) GBP 109.99 incl VAT, live listing 2026-10-13')
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

-- Verification: expect 22 rows (11 per market), all 'manual'
SELECT p.market, count(*) AS priced_slugs, bool_and(p.scan_confidence = 'manual') AS all_manual
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE m.slug IN ('elec-cable-lighting','elec-cable-socket','elec-cable-dedicated','elec-cable-earth','elec-cable-feeder','elec-conduit','elec-junction-box','elec-breaker','elec-switch-plate','elec-socket-outlet','elec-distribution-board')
  AND p.price_type = 'material' AND p.is_active = true
GROUP BY p.market ORDER BY p.market;
