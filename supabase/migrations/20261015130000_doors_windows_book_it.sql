-- ============================================================
-- FRELUX: Doors & Windows price book for Italy (IT)
--
-- Verified 2026-10-14 from live Leroy Merlin Italia listings
-- (prices incl IVA). All rows scan_confidence='manual'.
--
-- IT (EUR, live listings 2026-10-14, Leroy Merlin Italia):
--   door-flush:    EUR 199.90 (Porta interna a battente Cadrel laccato bianco L 70xH 210 cm, product 90741797)
--   door-panel:    EUR 159.90 (Porta interna a battente Winter in pino Monterey avorio L 70xH 210 cm, product 82860760)
--   door-frame:    EUR  17.90 (Telaio per porta in legno L 12 x H 217 cm, product 86329072)
--   door-hinge:    EUR   7.40 (Cerniera porta in acciaio inox, 3-pezzi set EUR 22.19 = EUR 7.40 each, product 72868177)
--   door-lockset:  EUR  22.12 (Serratura a mortaio BRICARD con chiave asse 40 mm, live listing)
--   door-security: EUR 399.90 (Porta blindata MASTER Easy L 90xH 210 cm noce, product 92007081)
--
-- Unpriced per zero-fabrication rule (custom-fabricated to opening):
--   window-aluminium, window-louver — Italian aluminium windows are
--   made-to-measure (serramenti) per opening; no standard unit listing.
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('IT', 'door-flush',    199.90, 'EUR', 'Leroy Merlin Italia Porta interna a battente Cadrel laccato bianco L 70xH 210 cm EUR 199.90 incl IVA, live listing 2026-10-14 (product 90741797)'),
    ('IT', 'door-panel',    159.90, 'EUR', 'Leroy Merlin Italia Porta interna a battente Winter pino Monterey avorio L 70xH 210 cm EUR 159.90 incl IVA, live listing 2026-10-14 (product 82860760)'),
    ('IT', 'door-frame',     17.90, 'EUR', 'Leroy Merlin Italia Telaio per porta in legno L 12 x H 217 cm EUR 17.90 incl IVA, live listing 2026-10-14 (product 86329072)'),
    ('IT', 'door-hinge',      7.40, 'EUR', 'Leroy Merlin Italia Cerniera per porta in acciaio inox 3-pezzi set EUR 22.19 = EUR 7.40 each incl IVA, live listing 2026-10-14 (product 72868177)'),
    ('IT', 'door-lockset',   22.12, 'EUR', 'Leroy Merlin Italia Serratura a mortaio BRICARD con chiave asse 40 mm EUR 22.12 incl IVA, live listing 2026-10-14'),
    ('IT', 'door-security', 399.90, 'EUR', 'Leroy Merlin Italia Porta blindata MASTER Easy L 90xH 210 cm noce EUR 399.90 incl IVA, live listing 2026-10-14 (product 92007081)')
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

SELECT p.market, count(*) AS priced_slugs, bool_and(p.scan_confidence = 'manual') AS all_manual
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE m.slug IN ('door-flush','door-panel','door-frame','door-hinge','door-lockset','door-security','window-aluminium','window-louver')
  AND p.price_type = 'material' AND p.is_active = true AND p.market = 'IT'
GROUP BY p.market;
