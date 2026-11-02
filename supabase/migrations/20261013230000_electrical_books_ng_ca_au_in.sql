-- ============================================================
-- FRELUX: Electrical price books for NG, CA, AU, and IN
-- (Markets 4, 5, 6, 7 of the 20-market electrical rollout, per
-- the whole-20-markets master directive).
-- Verified 2026-10-13 from live supplier/retail listings (zero
-- manual confirmation; scan_confidence='manual'). All 11 engine
-- slugs (elec-cable-lighting ... elec-distribution-board) priced
-- per market according to national code and installation practice.
--
-- NG (NGN, per metre unless noted; Konga/Bricmax live listings):
--   lighting  Coleman 1.5mm2 single-core Cu 100m coil NGN 45,000 -> NGN 450.00/m
--   socket    Coleman 2.5mm2 single-core Cu 100m coil NGN 65,000 -> NGN 650.00/m
--   dedicated Coleman 4.0mm2 single-core Cu 100m coil NGN 95,000 -> NGN 950.00/m
--   earth     Coleman 2.5mm2 single-core Cu ground 100m coil NGN 65,000 -> NGN 650.00/m
--   feeder    Coleman 16mm2 pure copper load cable 100m coil NGN 330,000 -> NGN 3,300.00/m
--   conduit   Dignity 20mm uPVC conduit 2.9m length NGN 693 (bundle of 25 NGN 17,325) -> NGN 239.00/m
--   junction  uPVC 1-gang recessed pattress box 10-pack NGN 3,500 -> NGN 350.00 each
--   breaker   C&S / Chint 20A 1-pole C-curve MCB 6kA NGN 3,100.00 each
--   switch    A&BT 1-gang 1-way light switch white 10-pack NGN 9,900 -> NGN 990.00 each
--   socket    13A 3-pin switched socket outlet NGN 2,500.00 each
--   DB        Havells 6-way SPN distribution board / consumer unit NGN 30,000.00 each
--
-- CA (CAD, per metre unless noted; Home Depot Canada live listings):
--   lighting  Southwire 14/2 NMD90 Romex SIMpull 150m CAD 185.00 -> CAD 1.23/m
--   socket    Southwire 12/2 NMD90 Romex SIMpull 150m CAD 369.00 -> CAD 2.46/m
--   dedicated Southwire 10/2 NMD90 Romex SIMpull 75m CAD 289.00  -> CAD 3.85/m
--   earth     Southwire 6 AWG / 8 AWG bare Cu ground wire (cut by metre) -> CAD 2.85/m
--   feeder    Nassau National Cable 2-2-2-4 aluminum SER CAD 2.65/ft -> CAD 8.69/m
--   conduit   Iberville 1/2 in. x 10 ft EMT steel tubing CAD 17.45 -> CAD 5.73/m
--   junction  Iberville 3x2x2-1/2 in. 12.5 cu in steel device box (1000106202) CAD 2.98 each
--   breaker   Schneider Homeline CHOM115CP 15A 1-pole plug-on breaker CAD 14.45 each
--   switch    Leviton 15A single-pole toggle light switch white CAD 1.58 each
--   socket    Leviton 15A duplex tamper-resistant receptacle white CAD 1.78 each
--   DB        Siemens SEQ32100SM 100A 32-circuit main breaker loadcentre CAD 186.94 each
--
-- AU (AUD, per metre unless noted; Bunnings / Sparky Direct live listings):
--   lighting  Nexans Olex 2-core & earth 1.5mm2 flat TPS 100m AUD 149.00 -> AUD 1.49/m
--   socket    Olex 2-core & earth 2.5mm2 flat TPS 100m AUD 239.00       -> AUD 2.39/m
--   dedicated DETA 6mm2 2-core & earth TPS 20m pack AUD 166.00         -> AUD 8.30/m
--   earth     Olex 6mm2 single-core green/yellow earth cable (cut by metre) -> AUD 3.30/m
--   feeder    Electra-Cables 16mm2 0.6/1kV PVC building wire 100m AUD 539.59 -> AUD 5.40/m
--   conduit   DETA 20mm x 4m medium-duty rigid PVC conduit AUD 4.34     -> AUD 1.09/m
--   junction  DETA junction box with 4x40A connectors AUD 4.45 each
--   breaker   DETA 20A 1P+N 6kA 30mA Type A RCBO (AS/NZS 3000 compliant) AUD 46.30 each
--   switch    DETA white 1-gang vertical wall switch AUD 8.07 each
--   socket    DETA double switched powerpoint 10A AUD 7.59 each
--   DB        Major Tech VBM1114SMA 12-pole surface mount metal distribution board AUD 48.40 each
--
-- IN (INR, per metre unless noted; Moglix / TradeIndia live listings):
--   lighting  Finolex 1.5 sq mm FR PVC single-core 90m coil INR 2,406 -> INR 26.73/m
--   socket    Finolex 2.5 sq mm FR PVC single-core 90m coil INR 3,597 -> INR 39.97/m
--   dedicated Finolex Gold 4.0 sq mm FR PVC 90m coil INR 5,208       -> INR 57.87/m
--   earth     Finolex Gold 1.5 sq mm green copper FR PVC 90m coil INR 2,088 -> INR 23.20/m
--   feeder    Finolex 16 sq mm 2-core XLPE armoured cable 100m INR 13,186 -> INR 131.86/m
--   conduit   Primco Plast 20mm MMS rigid PVC conduit pipe 3m INR 50.00 -> INR 16.67/m
--   junction  Tekson 2-module 16-gauge concealed GI metal box INR 69.00 each
--   breaker   Havells 16A SP B-curve MCB (IS/IEC 60898-1) INR 200.00 each
--   switch    Anchor Penta Modular 6A 1-module 1-way switch 20-pack INR 919 -> INR 45.95 each
--   socket    Anchor Roma 6/16A combined modular socket 10-pack INR 2,193 -> INR 219.30 each
--   DB        Anchor UNO 6-way SPN double door distribution board with busbar INR 2,434.00 each
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    -- NG (Nigeria)
    ('NG', 'elec-cable-lighting',      450.00, 'NGN', 'Konga Coleman 1.5mm single-core pure copper wire 100m coil NGN 45,000 = NGN 450.00/m (listing 5345518); NEMSA lighting circuits'),
    ('NG', 'elec-cable-socket',        650.00, 'NGN', 'Konga Coleman 2.5mm single-core pure copper wire 100m coil NGN 65,000 = NGN 650.00/m (listing 5350440); ring/radial power circuits'),
    ('NG', 'elec-cable-dedicated',     950.00, 'NGN', 'Konga Coleman 4.0mm single-core pure copper wire 100m coil NGN 95,000 = NGN 950.00/m (listing 5345523); dedicated AC/water heater circuits'),
    ('NG', 'elec-cable-earth',         650.00, 'NGN', 'Konga Coleman 2.5mm single-core pure copper grounding wire 100m coil NGN 65,000 = NGN 650.00/m; earthing conductor'),
    ('NG', 'elec-cable-feeder',       3300.00, 'NGN', 'Konga Coleman 16mm pure copper load cable 100m coil NGN 330,000 = NGN 3,300.00/m (listing 5341008); main sub-feeder'),
    ('NG', 'elec-conduit',             239.00, 'NGN', 'Bricmax Dignity 20mm uPVC electrical conduit pipe 2.9m length NGN 693 (bundle of 25 NGN 17,325) = NGN 239.00/m; Alaba survey'),
    ('NG', 'elec-junction-box',        350.00, 'NGN', 'Konga PVC pattress box 1-gang 10-pack NGN 3,500 = NGN 350.00 each (listing 5282593)'),
    ('NG', 'elec-breaker',            3100.00, 'NGN', 'Konga C&S / Chint 1-pole 20A C-curve MCB 6kA NGN 3,100.00 each (listing 6659002)'),
    ('NG', 'elec-switch-plate',        990.00, 'NGN', 'Konga A&BT 1-gang 1-way light switch white 10-pack NGN 9,900 = NGN 990.00 each (listing 5545010)'),
    ('NG', 'elec-socket-outlet',      2500.00, 'NGN', 'Konga 13A switched single/twin socket outlet NGN 2,500.00 each (listing 3364680)'),
    ('NG', 'elec-distribution-board',30000.00, 'NGN', 'Konga Havells 6-way SPN distribution board / consumer unit NGN 30,000.00 each (listing 3401280)'),

    -- CA (Canada)
    ('CA', 'elec-cable-lighting',        1.23, 'CAD', 'Home Depot Canada Southwire 14/2 NMD90 Romex SIMpull 150m CAD 185.00 = CAD 1.23/m (SKU 1000788662); CEC 14 AWG lighting'),
    ('CA', 'elec-cable-socket',          2.46, 'CAD', 'Home Depot Canada Southwire 12/2 NMD90 Romex SIMpull 150m CAD 369.00 = CAD 2.46/m; CEC 20A branch circuits'),
    ('CA', 'elec-cable-dedicated',       3.85, 'CAD', 'Home Depot Canada Southwire 10/2 NMD90 Romex SIMpull 75m CAD 289.00 = CAD 3.85/m; 30A baseboard/dryer/AC circuits'),
    ('CA', 'elec-cable-earth',           2.85, 'CAD', 'Home Depot Canada Southwire 6 AWG / 8 AWG bare Cu ground wire cut-by-metre CAD 2.85/m (SKU 1000142515)'),
    ('CA', 'elec-cable-feeder',          8.69, 'CAD', 'Nassau National Cable 2-2-2-4 aluminum SER cable CAD 2.65/ft = CAD 8.69/m; 100A service/sub-main'),
    ('CA', 'elec-conduit',               5.73, 'CAD', 'Home Depot Canada Iberville 1/2 in. x 10 ft EMT steel tubing CAD 17.45 = CAD 5.73/m (SKU 1000106377)'),
    ('CA', 'elec-junction-box',          2.98, 'CAD', 'Home Depot Canada Iberville 3x2x2-1/2 in. 12.5 cu in steel device box CAD 2.98 each (SKU 1000106202)'),
    ('CA', 'elec-breaker',              14.45, 'CAD', 'Kent / Home Depot Schneider Homeline CHOM115CP 15A 1-pole breaker CAD 14.45 each (SKU 1000722208)'),
    ('CA', 'elec-switch-plate',          1.58, 'CAD', 'Home Depot Canada Leviton 15A single-pole toggle light switch white CAD 1.58 each (live listing 2026-10-13)'),
    ('CA', 'elec-socket-outlet',         1.78, 'CAD', 'Home Depot Canada Leviton 15A duplex tamper-resistant receptacle white CAD 1.78 each (live listing 2026-10-13)'),
    ('CA', 'elec-distribution-board',  186.94, 'CAD', 'Electrozad / Home Depot Siemens SEQ32100SM 100A 32-circuit main breaker loadcentre CAD 186.94 each'),

    -- AU (Australia)
    ('AU', 'elec-cable-lighting',        1.49, 'AUD', 'Bunnings Australia Nexans Olex 2-core & earth 1.5mm2 TPS 100m AUD 149.00 = AUD 1.49/m (I/N 4434885); AS/NZS 3000 lighting'),
    ('AU', 'elec-cable-socket',          2.39, 'AUD', 'Bunnings Australia Olex 2-core & earth 2.5mm2 flat TPS 100m AUD 239.00 = AUD 2.39/m (I/N 4434835); AS/NZS 3000 power circuits'),
    ('AU', 'elec-cable-dedicated',       8.30, 'AUD', 'Bunnings Australia DETA 6mm2 2-core & earth TPS 20m pack AUD 166.00 = AUD 8.30/m (I/N 0760635); 40A range/cooktop circuits'),
    ('AU', 'elec-cable-earth',           3.30, 'AUD', 'Bunnings Australia Olex 6mm2 single core green/yellow earth cable AUD 3.30/m (I/N 0121766); main earthing conductor'),
    ('AU', 'elec-cable-feeder',          5.40, 'AUD', 'Sparky Direct Electra-Cables 16mm2 0.6/1kV PVC building wire 100m AUD 539.59 = AUD 5.40/m; AS/NZS 3000 consumer mains'),
    ('AU', 'elec-conduit',               1.09, 'AUD', 'Bunnings Australia DETA 20mm x 4m medium-duty rigid PVC conduit AUD 4.34 = AUD 1.09/m'),
    ('AU', 'elec-junction-box',          4.45, 'AUD', 'Bunnings Australia DETA junction box with 4x40A connectors AUD 4.45 each (live listing 2026-10-13)'),
    ('AU', 'elec-breaker',              46.30, 'AUD', 'Bunnings Australia DETA 20A 1P+N 6kA 30mA Type A RCBO AUD 46.30 each (I/N 0131971); AS/NZS 3000 mandated residual current protection'),
    ('AU', 'elec-switch-plate',          8.07, 'AUD', 'Bunnings Australia DETA white 1-gang vertical wall switch AUD 8.07 each (live listing 2026-10-13)'),
    ('AU', 'elec-socket-outlet',         7.59, 'AUD', 'Bunnings Australia DETA double switched powerpoint 10A AUD 7.59 each (live listing 2026-10-13)'),
    ('AU', 'elec-distribution-board',   48.40, 'AUD', 'Sparky Direct Major Tech VBM1114SMA 12-pole surface mount metal distribution board AUD 48.40 each'),

    -- IN (India)
    ('IN', 'elec-cable-lighting',       26.73, 'INR', 'Moglix Finolex 1.5 sq mm FR PVC single-core 90m coil INR 2,406 = INR 26.73/m; IS 694 lighting circuits'),
    ('IN', 'elec-cable-socket',         39.97, 'INR', 'Moglix Finolex 2.5 sq mm FR PVC single-core 90m coil INR 3,597 = INR 39.97/m; IS 694 power circuits'),
    ('IN', 'elec-cable-dedicated',      57.87, 'INR', 'Moglix Finolex Gold 4.0 sq mm FR PVC 90m coil INR 5,208 = INR 57.87/m; geyser/AC/heavy loads'),
    ('IN', 'elec-cable-earth',          23.20, 'INR', 'Moglix Finolex Gold 1.5 sq mm green copper FR PVC 90m coil INR 2,088 = INR 23.20/m; earthing wire'),
    ('IN', 'elec-cable-feeder',        131.86, 'INR', 'Moglix Finolex 16 sq mm 2-core XLPE armoured cable 100m INR 13,186 = INR 131.86/m; sub-main feeder'),
    ('IN', 'elec-conduit',              16.67, 'INR', 'TradeIndia / Primco Plast 20mm MMS rigid PVC conduit pipe 3m INR 50.00 = INR 16.67/m; IS 9537'),
    ('IN', 'elec-junction-box',         69.00, 'INR', 'Moglix Tekson 2-module 16-gauge concealed GI metal box INR 69.00 each (live listing 2026-10-13)'),
    ('IN', 'elec-breaker',             200.00, 'INR', 'Moglix Havells 16A SP B-curve MCB (IS/IEC 60898-1) INR 200.00 each'),
    ('IN', 'elec-switch-plate',         45.95, 'INR', 'Moglix Anchor Penta Modular 6A 1-module 1-way switch 20-pack INR 919 = INR 45.95 each'),
    ('IN', 'elec-socket-outlet',       219.30, 'INR', 'Moglix Anchor Roma 6/16A combined modular socket 10-pack INR 2,193 = INR 219.30 each'),
    ('IN', 'elec-distribution-board', 2434.00, 'INR', 'Moglix Anchor UNO 6-way SPN double door distribution board with busbar INR 2,434.00 each')
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

-- Verification: expect 44 rows (11 per market), all 'manual'
SELECT p.market, count(*) AS priced_slugs, bool_and(p.scan_confidence = 'manual') AS all_manual
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE m.slug IN ('elec-cable-lighting','elec-cable-socket','elec-cable-dedicated','elec-cable-earth','elec-cable-feeder','elec-conduit','elec-junction-box','elec-breaker','elec-switch-plate','elec-socket-outlet','elec-distribution-board')
  AND p.price_type = 'material' AND p.is_active = true
  AND p.market IN ('NG', 'CA', 'AU', 'IN')
GROUP BY p.market ORDER BY p.market;
