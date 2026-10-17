-- ============================================================
-- FRELUX: Rebar per-length anchors for ZA, KE, FR, IN.
-- Verified 2026-10-17 from live supplier and distributor listings.
-- Engine prices rebar per 12 m stock length; rows store per-12m
-- prices converted from verified per-piece or per-kg anchor rates.
--
-- South Africa (ZA - Cashbuild retail survey, Barnes 450 MPa SANS 920, incl. VAT):
--   Y12mm 6m  R 109.95 (SKU 476005) -> R 219.90 per 12 m
--   Y16mm 6m  R 194.95 (SKU 476006) -> R 389.90 per 12 m
--   Implied rate R 20.613/kg:
--   Y20mm = 12 m x 2.466 kg/m x 20.613 = R 609.98 per 12 m
--   Y25mm = 12 m x 3.854 kg/m x 20.613 = R 953.31 per 12 m
--
-- Kenya (KE - National Cement Company / Devki Group catalog, KS 573 / BS 4449):
--   D12 12m  KSh 1,040.00
--   D16 12m  KSh 1,860.00
--   D20 12m  KSh 2,550.00
--   D25 12m  KSh 4,400.00
--
-- France (FR - Brico Dépôt retail listings, HA FeE 500 EN 10080 / NF A 35-080-1, TTC):
--   HA12 3m  EUR 6.50 (2.664 kg -> EUR 2.44/kg) -> EUR 26.00 per 12 m (4 x 3m)
--   HA16 = 12 m x 1.578 kg/m x EUR 2.44 = EUR 46.20 per 12 m
--   HA20 = 12 m x 2.466 kg/m x EUR 2.44 = EUR 72.21 per 12 m
--   HA25 = 12 m x 3.854 kg/m x EUR 2.44 = EUR 112.85 per 12 m
--
-- India (IN - Tata Nexarc / Tata Tiscon Fe500 TMT price benchmark, 12m lengths):
--   Fe500 12mm 12m  INR 602.06
--   Fe500 16mm 12m  INR 1,069.88
--   Fe500 20mm 12m  INR 1,671.95
--   Fe500 25mm 12m  INR 2,613.01
--
-- On apply, resolveMarketRebar resolves all 4 diameters for ZA, KE, FR, IN.
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('Rebar Y12mm, 12 m stock length (ZA)', 'za-rebar-12mm', 'steel',
   'Per 12 m stock length. Cashbuild South Africa: Barnes Y12 6 m R109.95 incl VAT (SKU 476005), 2026-10-17; 12 m = 2 x 6 m.',
   CURRENT_DATE, true, 5),
  ('Rebar Y16mm, 12 m stock length (ZA)', 'za-rebar-16mm', 'steel',
   'Per 12 m stock length. Cashbuild South Africa: Barnes Y16 6 m R194.95 incl VAT (SKU 476006), 2026-10-17; 12 m = 2 x 6 m.',
   CURRENT_DATE, true, 5),
  ('Rebar Y20mm, 12 m stock length (ZA)', 'za-rebar-20mm', 'steel',
   'Per 12 m stock length. Derived at Cashbuild implied R20.613/kg (SANS 920): 12 m x 2.466 kg/m x 20.613.',
   CURRENT_DATE, true, 5),
  ('Rebar Y25mm, 12 m stock length (ZA)', 'za-rebar-25mm', 'steel',
   'Per 12 m stock length. Derived at Cashbuild implied R20.613/kg: 12 m x 3.854 kg/m x 20.613.',
   CURRENT_DATE, true, 5),

  ('Rebar D12, 12 m stock length (KE)', 'ke-rebar-12mm', 'steel',
   'Per 12 m stock length. National Cement Company (Devki Group) catalog: D12 12 m length KSh 1,040 (KS 573 / BS 4449), 2026-10-17.',
   CURRENT_DATE, true, 5),
  ('Rebar D16, 12 m stock length (KE)', 'ke-rebar-16mm', 'steel',
   'Per 12 m stock length. National Cement Company catalog: D16 12 m length KSh 1,860, 2026-10-17.',
   CURRENT_DATE, true, 5),
  ('Rebar D20, 12 m stock length (KE)', 'ke-rebar-20mm', 'steel',
   'Per 12 m stock length. National Cement Company catalog: D20 12 m length KSh 2,550, 2026-10-17.',
   CURRENT_DATE, true, 5),
  ('Rebar D25, 12 m stock length (KE)', 'ke-rebar-25mm', 'steel',
   'Per 12 m stock length. National Cement Company catalog: D25 12 m length KSh 4,400, 2026-10-17.',
   CURRENT_DATE, true, 5),

  ('Rebar HA12, 12 m stock length (FR)', 'fr-rebar-12mm', 'steel',
   'Per 12 m stock length. Brico Depot France: HA12 3 m 6.50 EUR TTC, 2026-10-17; scaled to 12 m = 4 x 3 m (EN 10080 / NF A 35-080-1).',
   CURRENT_DATE, true, 5),
  ('Rebar HA16, 12 m stock length (FR)', 'fr-rebar-16mm', 'steel',
   'Per 12 m stock length. Derived at Brico Depot implied 2.44 EUR/kg TTC: 12 m x 1.578 kg/m x 2.44.',
   CURRENT_DATE, true, 5),
  ('Rebar HA20, 12 m stock length (FR)', 'fr-rebar-20mm', 'steel',
   'Per 12 m stock length. Derived at Brico Depot implied 2.44 EUR/kg TTC: 12 m x 2.466 kg/m x 2.44.',
   CURRENT_DATE, true, 5),
  ('Rebar HA25, 12 m stock length (FR)', 'fr-rebar-25mm', 'steel',
   'Per 12 m stock length. Derived at Brico Depot implied 2.44 EUR/kg TTC: 12 m x 3.854 kg/m x 2.44.',
   CURRENT_DATE, true, 5),

  ('Rebar Fe500 12mm, 12 m stock length (IN)', 'in-rebar-12mm', 'steel',
   'Per 12 m stock length. Tata Nexarc / Tata Tiscon Fe500 TMT price benchmark, 2026-10-17: 12 m length INR 602.06.',
   CURRENT_DATE, true, 5),
  ('Rebar Fe500 16mm, 12 m stock length (IN)', 'in-rebar-16mm', 'steel',
   'Per 12 m stock length. Tata Nexarc Fe500 TMT benchmark: 12 m length INR 1,069.88, 2026-10-17.',
   CURRENT_DATE, true, 5),
  ('Rebar Fe500 20mm, 12 m stock length (IN)', 'in-rebar-20mm', 'steel',
   'Per 12 m stock length. Tata Nexarc Fe500 TMT benchmark: 12 m length INR 1,671.95, 2026-10-17.',
   CURRENT_DATE, true, 5),
  ('Rebar Fe500 25mm, 12 m stock length (IN)', 'in-rebar-25mm', 'steel',
   'Per 12 m stock length. Tata Nexarc Fe500 TMT benchmark: 12 m length INR 2,613.01, 2026-10-17.',
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
    ('ZA', 'za-rebar-12mm', 219.90, 'ZAR', 'Cashbuild Barnes Y12 6m R109.95 incl VAT; 12m = 2 x 6m (2026-10-17)'),
    ('ZA', 'za-rebar-16mm', 389.90, 'ZAR', 'Cashbuild Barnes Y16 6m R194.95 incl VAT; 12m = 2 x 6m (2026-10-17)'),
    ('ZA', 'za-rebar-20mm', 609.98, 'ZAR', 'Derived at Cashbuild implied R20.613/kg (SANS 920): 12m x 2.466 kg/m'),
    ('ZA', 'za-rebar-25mm', 953.31, 'ZAR', 'Derived at Cashbuild implied R20.613/kg (SANS 920): 12m x 3.854 kg/m'),

    ('KE', 'ke-rebar-12mm', 1040.00, 'KES', 'National Cement (Devki) catalog: D12 12m KSh 1,040 (2026-10-17)'),
    ('KE', 'ke-rebar-16mm', 1860.00, 'KES', 'National Cement catalog: D16 12m KSh 1,860 (2026-10-17)'),
    ('KE', 'ke-rebar-20mm', 2550.00, 'KES', 'National Cement catalog: D20 12m KSh 2,550 (2026-10-17)'),
    ('KE', 'ke-rebar-25mm', 4400.00, 'KES', 'National Cement catalog: D25 12m KSh 4,400 (2026-10-17)'),

    ('FR', 'fr-rebar-12mm', 26.00, 'EUR', 'Brico Depot: HA12 3m 6.50 EUR TTC; 12m = 4 x 3m (2026-10-17)'),
    ('FR', 'fr-rebar-16mm', 46.20, 'EUR', 'Derived at Brico Depot implied 2.44 EUR/kg TTC: 12m x 1.578 kg/m'),
    ('FR', 'fr-rebar-20mm', 72.21, 'EUR', 'Derived at Brico Depot implied 2.44 EUR/kg TTC: 12m x 2.466 kg/m'),
    ('FR', 'fr-rebar-25mm', 112.85, 'EUR', 'Derived at Brico Depot implied 2.44 EUR/kg TTC: 12m x 3.854 kg/m'),

    ('IN', 'in-rebar-12mm', 602.06, 'INR', 'Tata Nexarc Fe500 TMT benchmark: 12m length INR 602.06 (2026-10-17)'),
    ('IN', 'in-rebar-16mm', 1069.88, 'INR', 'Tata Nexarc Fe500 TMT benchmark: 12m length INR 1,069.88 (2026-10-17)'),
    ('IN', 'in-rebar-20mm', 1671.95, 'INR', 'Tata Nexarc Fe500 TMT benchmark: 12m length INR 1,671.95 (2026-10-17)'),
    ('IN', 'in-rebar-25mm', 2613.01, 'INR', 'Tata Nexarc Fe500 TMT benchmark: 12m length INR 2,613.01 (2026-10-17)')
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
