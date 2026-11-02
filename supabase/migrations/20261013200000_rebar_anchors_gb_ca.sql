-- ============================================================
-- FRELUX: Rebar per-tonne anchors for GB and CA.
-- Verified 2026-10-13 from live supplier listings (zero manual
-- confirmation; scan_confidence='manual'). Engine prices rebar
-- per 12 m stock length; book rows store per-12m prices converted
-- from the supplier per-kg rate (12 m x kg/m x price/kg).
--
-- GB (Tippers builders merchant, live rendered product pages,
-- incl. VAT, 6 m bars, BS 4449 B500B):
--   12mm 6m  GBP 8.84  (art. BIRFBT12) -> GBP 17.68 per 12 m
--   16mm 6m  GBP 15.74 (art. BIRFBT16) -> GBP 31.48 per 12 m
--   Both listings imply the same GBP 1.66/kg rate, so:
--   20mm = 12 m x 2.466 kg/m x 1.66 = GBP 49.13 per 12 m
--   25mm = 12 m x 3.854 kg/m x 1.66 = GBP 76.78 per 12 m
--
-- CA (MY Construction Supply Grade 400W 20 ft bars, live Home
-- Depot Canada marketplace listings; CSA G30.18):
--   10M x 20ft CAD 8.98  -> CAD 17.68 per 12 m (engine 12mm slot)
--   15M x 20ft CAD 17.98 -> CAD 35.39 per 12 m (engine 16mm slot)
--   Both imply CAD 1.877/kg, so:
--   20M = 12 m x 2.359 kg/m x 1.877 = CAD 53.12 (engine 20mm slot)
--   25M = 12 m x 3.927 kg/m x 1.877 = CAD 88.44 (engine 25mm slot)
--   (bar masses from Groupe Picard's published lbs/ft values)
--
-- On apply, resolveMarketRebar resolves all 4 diameters for GB/CA.
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('Rebar 12mm, 12 m stock length (GB)', 'gb-rebar-12mm', 'steel',
   'Per 12 m stock length. Tippers 12mm reinforcement bar 6 m GBP 8.84 incl VAT (BIRFBT12), live rendered product page 2026-10-13; 12 m = 2 x 6 m.',
   CURRENT_DATE, true, 5),
  ('Rebar 16mm, 12 m stock length (GB)', 'gb-rebar-16mm', 'steel',
   'Per 12 m stock length. Tippers 16mm reinforcement bar 6 m GBP 15.74 incl VAT (BIRFBT16), live rendered product page 2026-10-13; 12 m = 2 x 6 m.',
   CURRENT_DATE, true, 5),
  ('Rebar 20mm, 12 m stock length (GB)', 'gb-rebar-20mm', 'steel',
   'Per 12 m stock length. Derived at Tippers GBP 1.66/kg (the rate implied by their verified 12mm GBP 8.84 and 16mm GBP 15.74 6 m listings): 12 m x 2.466 kg/m x 1.66.',
   CURRENT_DATE, true, 5),
  ('Rebar 25mm, 12 m stock length (GB)', 'gb-rebar-25mm', 'steel',
   'Per 12 m stock length. Derived at Tippers GBP 1.66/kg: 12 m x 3.854 kg/m x 1.66.',
   CURRENT_DATE, true, 5),
  ('Rebar 10M (12mm slot), 12 m stock length (CA)', 'ca-rebar-12mm', 'steel',
   'Per 12 m stock length. MY Construction Supply 10M x 20ft Grade 400W (CSA G30.18) CAD 8.98, live Home Depot Canada listing read 2026-10-13; scaled 20 ft -> 12 m (x 12/6.096).',
   CURRENT_DATE, true, 5),
  ('Rebar 15M (16mm slot), 12 m stock length (CA)', 'ca-rebar-16mm', 'steel',
   'Per 12 m stock length. MY Construction Supply 15M x 20ft Grade 400W CAD 17.98, live Home Depot Canada listing read 2026-10-13; scaled 20 ft -> 12 m.',
   CURRENT_DATE, true, 5),
  ('Rebar 20M (20mm slot), 12 m stock length (CA)', 'ca-rebar-20mm', 'steel',
   'Per 12 m stock length. Derived at MY Construction Supply CAD 1.877/kg (implied by their verified 10M and 15M 20 ft listings): 12 m x 2.359 kg/m x 1.877. Bar mass per Groupe Picard published lbs/ft.',
   CURRENT_DATE, true, 5),
  ('Rebar 25M (25mm slot), 12 m stock length (CA)', 'ca-rebar-25mm', 'steel',
   'Per 12 m stock length. Derived at CAD 1.877/kg: 12 m x 3.927 kg/m x 1.877.',
   CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    effective_date = EXCLUDED.effective_date,
    is_active = true,
    updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('GB', 'gb-rebar-12mm', 17.68, 'GBP', 'Tippers 12mm rebar 6m GBP 8.84 incl VAT (BIRFBT12), live rendered page 2026-10-13; per 12 m = 2 x 6 m'),
    ('GB', 'gb-rebar-16mm', 31.48, 'GBP', 'Tippers 16mm rebar 6m GBP 15.74 incl VAT (BIRFBT16), live rendered page 2026-10-13; per 12 m = 2 x 6 m'),
    ('GB', 'gb-rebar-20mm', 49.13, 'GBP', 'Derived at Tippers GBP 1.66/kg (rate implied by verified 12mm/16mm 6 m listings): 12 m x 2.466 kg/m x 1.66'),
    ('GB', 'gb-rebar-25mm', 76.78, 'GBP', 'Derived at Tippers GBP 1.66/kg: 12 m x 3.854 kg/m x 1.66'),
    ('CA', 'ca-rebar-12mm', 17.68, 'CAD', 'MY Construction Supply 10M x 20ft Grade 400W CAD 8.98, live Home Depot Canada listing 2026-10-13, scaled to 12 m'),
    ('CA', 'ca-rebar-16mm', 35.39, 'CAD', 'MY Construction Supply 15M x 20ft Grade 400W CAD 17.98, live Home Depot Canada listing 2026-10-13, scaled to 12 m'),
    ('CA', 'ca-rebar-20mm', 53.12, 'CAD', 'Derived at CAD 1.877/kg (rate implied by verified MY Construction 10M/15M 20 ft listings): 12 m x 2.359 kg/m'),
    ('CA', 'ca-rebar-25mm', 88.44, 'CAD', 'Derived at CAD 1.877/kg: 12 m x 3.927 kg/m')
  ) AS v(market, slug, price, currency, source)
  JOIN estimation_materials m ON m.slug = v.slug
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

-- Verification: expect 40 active rebar rows (NG 4 + US 4 + AU 4 + DE 4
-- + EG 4 + IN 4 + GB 4 + CA 4 + engine rows), GB/CA all 'manual'
SELECT p.market, count(*) AS rows, bool_and(p.scan_confidence = 'manual') AS all_manual
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE (m.slug LIKE '%rebar%' OR m.slug = ANY (ARRAY['gb-rebar-12mm','gb-rebar-16mm','gb-rebar-20mm','gb-rebar-25mm','ca-rebar-12mm','ca-rebar-16mm','ca-rebar-20mm','ca-rebar-25mm']))
  AND p.price_type = 'material' AND p.is_active = true
GROUP BY p.market ORDER BY p.market;
