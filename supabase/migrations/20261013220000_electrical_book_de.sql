-- ============================================================
-- FRELUX: Electrical price book for DE (market 3 of the 20-market
-- electrical rollout, per the whole-20-markets directive).
-- Verified 2026-10-13 from live German supplier listings (zero
-- manual confirmation; scan_confidence='manual'). All 11 engine
-- slugs priced; German methodology per the DE profile (DIN VDE
-- 0100 / DIN 18015: NYM-J under plaster or in Leerrohr).
--
-- Cables (per metre, incl 19% MwSt):
--   lighting  NYM-J 3x1.5mm2 50m EUR 35.99 (hornbach.de art 834195) -> EUR 0.72/m
--   socket    NYM-J 3x2.5mm2 50m EUR 78.50 (elektroland24)          -> EUR 1.57/m
--   dedicated NYM-J 5x2.5mm2 50m EUR 55.90 (Amazon.de Waskonig+Walter) -> EUR 1.12/m (Herdanschluss)
--   earth     H07V-U 2.5mm2 grun/gelb 100m ring EUR 49.31 (elektroland24) -> EUR 0.49/m
--   feeder    NYM-J 5x6mm2 RG50 50m EUR 365.31 (voelkner.de, ab-3-pack tier) -> EUR 7.31/m
--   conduit   Installationsrohr M25 starr lichtgrau 3m EUR 2.37 (hornbach.de art 5715557) -> EUR 0.79/m
-- Pieces:
--   junction  Kaiser 1555-06 Geratedose 60x66mm 20-pack EUR 17.43 (hornbach.de) -> EUR 0.87 each
--   breaker   ABB S201-B16 B16 6kA 1-pole EUR 2.99 (wittko.eu, incl USt)
--   switch    Busch-Jaeger 2020 US-201 Wipptaster-Einsatz EUR 10.65 (elektroshopwagner.de)
--   socket    Busch-Jaeger alpha nea Schuko-Steckdosen-Einsatz EUR 12.44 (Amazon.de)
--   DB        Hensel KV 1512 Automatengehause 12TE IP54 EUR 53.12 (watt24.com)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.price, v.currency, v.source
  FROM (VALUES
    ('elec-cable-lighting',      0.72, 'EUR', 'hornbach.de Mantelleitung NYM-J 3x1,5mm2 50m EUR 35.99 = 0.72 EUR/m incl MwSt, live listing 2026-10-13; DIN 18015 lighting circuits'),
    ('elec-cable-socket',        1.57, 'EUR', 'elektroland24 PVC-Mantelleitung NYM-J 3x2,5mm2 50m EUR 78.50 = 1.57 EUR/m incl MwSt, live listing 2026-10-13; 16A B-characteristic MCB circuits'),
    ('elec-cable-dedicated',     1.12, 'EUR', 'Amazon.de Waskonig+Walter NYM-J 5x2,5mm2 50m ring EUR 55.90 = 1.12 EUR/m incl MwSt, live listing 2026-10-13; Herdanschluss 5x2,5mm2'),
    ('elec-cable-earth',         0.49, 'EUR', 'elektroland24 H07V-U PVC-Aderleitung 2,5mm2 grun/gelb 100m ring EUR 49.31 = 0.49 EUR/m incl MwSt, live listing 2026-10-13'),
    ('elec-cable-feeder',        7.31, 'EUR', 'voelkner.de NYM-J 5x6 RG50 Mantelleitung 50m EUR 365.31 (ab 3-Pack tier) = 7.31 EUR/m incl MwSt, live listing 2026-10-13; sub-main feeder'),
    ('elec-conduit',             0.79, 'EUR', 'hornbach.de Installationsrohr M25 starr lichtgrau 3m EUR 2.37 = 0.79 EUR/m incl MwSt, live listing 2026-10-13 (art 5715557)'),
    ('elec-junction-box',        0.87, 'EUR', 'hornbach.de Kaiser 1555-06 Geratedose 60x66mm 20-pack EUR 17.43 = 0.87 EUR/box incl MwSt, live listing 2026-10-13'),
    ('elec-breaker',             2.99, 'EUR', 'wittko.eu ABB S201-B16 Leitungsschutzschalter B16 6kA 1-polig EUR 2.99 incl 19% USt, live listing 2026-10-13'),
    ('elec-switch-plate',       10.65, 'EUR', 'elektroshopwagner.de Busch-Jaeger 2020 US-201 Wipptaster-Einsatz 1-polig Schlieber EUR 10.65 incl MwSt, live listing 2026-10-13'),
    ('elec-socket-outlet',      12.44, 'EUR', 'Amazon.de Busch-Jaeger alpha nea Schuko-Steckdosen-Einsatz EUR 12.44 incl MwSt, live listing 2026-10-13'),
    ('elec-distribution-board', 53.12, 'EUR', 'watt24.com Hensel KV 1512 Automatengehause 12TE 12x18mm IP54 Kleinverteiler EUR 53.12 incl MwSt, live listing 2026-10-13')
  ) AS v(slug, price, currency, source)
  JOIN estimation_materials m ON m.slug = v.slug AND m.is_active = true
)
, deactivated AS (
  UPDATE estimation_prices p
  SET is_active = false, updated_at = now()
  FROM seeded s
  WHERE p.price_type = 'material'
    AND p.ref_id = s.material_id
    AND p.market = 'DE'
    AND p.is_active = true
  RETURNING 1
)
INSERT INTO estimation_prices (price_type, ref_id, price, currency, effective_date, notes, is_active, price_source, scan_confidence, market)
SELECT 'material', s.material_id, s.price, s.currency, CURRENT_DATE, s.source, true, s.source, 'manual', 'DE'
FROM seeded s
ON CONFLICT DO NOTHING;

-- Verification: expect DE to join US/GB with 11 manual rows each
SELECT p.market, count(*) AS priced_slugs, bool_and(p.scan_confidence = 'manual') AS all_manual
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE m.slug IN ('elec-cable-lighting','elec-cable-socket','elec-cable-dedicated','elec-cable-earth','elec-cable-feeder','elec-conduit','elec-junction-box','elec-breaker','elec-switch-plate','elec-socket-outlet','elec-distribution-board')
  AND p.price_type = 'material' AND p.is_active = true
GROUP BY p.market ORDER BY p.market;
