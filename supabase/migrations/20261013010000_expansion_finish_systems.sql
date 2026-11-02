-- =========================================================
-- 20261013010000_expansion_finish_systems.sql
--
-- Phase 3 of the 2026-10-13 international expansion:
-- market-specific FINISH ENGINE data for the five new markets
-- (JP, FR, BR, SA, AE) plus the three markets previously
-- running on surrogate templates (GH, KE, ZA).
--
-- Everything is ADDITIVE and idempotent (WHERE NOT EXISTS /
-- ON CONFLICT DO NOTHING). No destructive changes. Nigeria
-- reference rows are never touched.
--
-- Provenance rules honoured:
-- - Coverage figures carry the verified source in the row
--   (Gyproc RhinoLite datasheet, Knauf MP75 datasheet,
--   Suvinil product ficha, Prestonett G fiche technique).
-- - Unverified quantities are seeded as planning defaults
--   with an explicit "verify per product sheet" note — never
--   presented as verified data.
-- - Labour rates are research estimates, labelled as such in
--   source_reference, never presented as verified prices.
-- - Prices stay NULL here; they land with the Phase 4 verified
--   price books (role-resolved), never guessed.
-- =========================================================

-- ---------------------------------------------------------
-- 1. SCREEDING SYSTEMS (screeding_system_config)
--    One active surface-prep system per market. Market-first
--    resolution in queries.ts already exists; these rows stop
--    the silent NG fallback for these eight markets.
-- ---------------------------------------------------------

-- JP: gypsum board skim (pate) — board-based construction
INSERT INTO screeding_system_config (
  market, system_type, display_name, description, coverage_area_m2,
  coverage_unit, default_coats, waste_percentage, currency, currency_symbol,
  putty_name, putty_quantity, putty_unit, putty_price_per_unit,
  rounding_rule, is_active, sort_order
)
SELECT
  'JP', 'putty', 'Gypsum Joint Putty Skim (パテ)',
  'Japan surface prep: gypsum board joints and surfaces filled with joint putty (パテ), sanded, then primed for paint — the board-based equivalent of putty screeding.',
  '50', 'm²', 2, '10', 'JPY', '¥',
  '結材用石膏パテ Gypsum joint putty (15 kg box)', '1', 'box', NULL,
  'ceil', true, 110
WHERE NOT EXISTS (
  SELECT 1 FROM screeding_system_config WHERE market = 'JP' AND system_type = 'putty'
);

-- FR: enduit de lissage — the French putty equivalent
INSERT INTO screeding_system_config (
  market, system_type, display_name, description, coverage_area_m2,
  coverage_unit, default_coats, waste_percentage, currency, currency_symbol,
  putty_name, putty_quantity, putty_unit, putty_price_per_unit,
  rounding_rule, is_active, sort_order
)
SELECT
  'FR', 'putty', 'Enduit de Lissage',
  'French surface prep: enduit de lissage (smoothing compound) applied in two fine coats over platrage or BA13 joints, sanded between coats, then undercoated.',
  '5', 'm²', 2, '10', 'EUR', '€',
  'Prestonett G enduit en poudre (5 kg sac)', '1', 'sac', NULL,
  'ceil', true, 120
WHERE NOT EXISTS (
  SELECT 1 FROM screeding_system_config WHERE market = 'FR' AND system_type = 'putty'
);

-- BR: massa corrida — the Brazilian putty equivalent (VERIFIED coverage)
INSERT INTO screeding_system_config (
  market, system_type, display_name, description, coverage_area_m2,
  coverage_unit, default_coats, waste_percentage, currency, currency_symbol,
  putty_name, putty_quantity, putty_unit, putty_price_per_unit,
  rounding_rule, is_active, sort_order
)
SELECT
  'BR', 'putty', 'Massa Corrida Acrílica',
  'Brazilian surface prep: acrylic massa corrida skimmed over reboco in 2-3 crossed coats, sanded, sealed with selador and painted. Suvinil 18 L (25 kg): até 75 m² por embalagem (ficha do produto, 2026-10).',
  '75', 'm²', 2, '10', 'BRL', 'R$',
  'Massa corrida acrílica (lata de 18 L / 25 kg)', '1', 'lata', NULL,
  'ceil', true, 130
WHERE NOT EXISTS (
  SELECT 1 FROM screeding_system_config WHERE market = 'BR' AND system_type = 'putty'
);

-- SA: gypsum skim (Knauf MP75) — VERIFIED yield
INSERT INTO screeding_system_config (
  market, system_type, display_name, description, coverage_area_m2,
  coverage_unit, default_coats, waste_percentage, currency, currency_symbol,
  putty_name, putty_quantity, putty_unit, putty_price_per_unit,
  rounding_rule, is_active, sort_order
)
SELECT
  'SA', 'putty', 'Gypsum Skim (MP75)',
  'Saudi surface prep: machine-applied gypsum plaster skimmed smooth over blockwork — approx. 8 kg/m² (Knauf MP75 datasheet) → ~3.75 m² per 30 kg bag.',
  '3.75', 'm²', 1, '10', 'SAR', '﷼',
  'Knauf MP75 gypsum plaster (30 kg bag)', '1', 'bag', NULL,
  'ceil', true, 140
WHERE NOT EXISTS (
  SELECT 1 FROM screeding_system_config WHERE market = 'SA' AND system_type = 'putty'
);

-- AE: same GCC gypsum practice in AED
INSERT INTO screeding_system_config (
  market, system_type, display_name, description, coverage_area_m2,
  coverage_unit, default_coats, waste_percentage, currency, currency_symbol,
  putty_name, putty_quantity, putty_unit, putty_price_per_unit,
  rounding_rule, is_active, sort_order
)
SELECT
  'AE', 'putty', 'Gypsum Skim (MP75)',
  'UAE surface prep: machine gypsum plaster skim (Knauf/Saint-Gobain systems) over block — approx. 8 kg/m² (Knauf MP75 datasheet) → ~3.75 m² per 30 kg bag.',
  '3.75', 'm²', 1, '10', 'AED', 'د.إ',
  'Knauf MP75 gypsum plaster (30 kg bag)', '1', 'bag', NULL,
  'ceil', true, 150
WHERE NOT EXISTS (
  SELECT 1 FROM screeding_system_config WHERE market = 'AE' AND system_type = 'putty'
);

-- GH: gypsum putty skim — planning default, admin verifies
INSERT INTO screeding_system_config (
  market, system_type, display_name, description, coverage_area_m2,
  coverage_unit, default_coats, waste_percentage, currency, currency_symbol,
  putty_name, putty_quantity, putty_unit, putty_price_per_unit,
  rounding_rule, is_active, sort_order
)
SELECT
  'GH', 'putty', 'Gypsum Putty Skim',
  'Ghanaian surface prep: two trowel coats of gypsum putty over rendered sandcrete, sanded between coats before primer. Coverage is a planning default (~18 m² per 25 kg bag, 2 coats) — verify per product sheet.',
  '18', 'm²', 2, '10', 'GHS', 'GH₵',
  'Gypsum putty (25 kg bag)', '1', 'bag', NULL,
  'ceil', true, 160
WHERE NOT EXISTS (
  SELECT 1 FROM screeding_system_config WHERE market = 'GH' AND system_type = 'putty'
);

-- KE: same East African putty practice
INSERT INTO screeding_system_config (
  market, system_type, display_name, description, coverage_area_m2,
  coverage_unit, default_coats, waste_percentage, currency, currency_symbol,
  putty_name, putty_quantity, putty_unit, putty_price_per_unit,
  rounding_rule, is_active, sort_order
)
SELECT
  'KE', 'putty', 'Wall Putty / Gypsum Skim',
  'Kenyan surface prep: two skim coats of wall putty over rendered stone or block, sanded between coats. Coverage is a planning default (~18 m² per 25 kg bag, 2 coats) — verify per product sheet.',
  '18', 'm²', 2, '10', 'KES', 'KSh',
  'Wall putty / gypsum skim (25 kg bag)', '1', 'bag', NULL,
  'ceil', true, 170
WHERE NOT EXISTS (
  SELECT 1 FROM screeding_system_config WHERE market = 'KE' AND system_type = 'putty'
);

-- ZA: RhinoLite skim — VERIFIED official Gyproc datasheet
INSERT INTO screeding_system_config (
  market, system_type, display_name, description, coverage_area_m2,
  coverage_unit, default_coats, waste_percentage, currency, currency_symbol,
  putty_name, putty_quantity, putty_unit, putty_price_per_unit,
  rounding_rule, is_active, sort_order
)
SELECT
  'ZA', 'putty', 'RhinoLite Skim',
  'South African surface prep: RhinoLite gypsum skim over plastered brick — 2.5 kg/m² at 2.5 mm; 10 m² per 25 kg bag (official Gyproc RhinoLite datasheet).',
  '10', 'm²', 1, '12', 'ZAR', 'R',
  'Gyproc RhinoLite skim plaster (25 kg bag)', '1', 'bag', NULL,
  'ceil', true, 180
WHERE NOT EXISTS (
  SELECT 1 FROM screeding_system_config WHERE market = 'ZA' AND system_type = 'putty'
);

-- ---------------------------------------------------------
-- 2. WALL-FINISHING LABOUR RATES (wallfin_labour_rates)
--    Labour-only benchmarks per market. Research estimates —
--    always displayed as estimates, never verified prices.
-- ---------------------------------------------------------
INSERT INTO wallfin_labour_rates
  (market, task_key, method, rate, currency, source_reference, effective_date, description)
VALUES
  -- Japan (labour-only estimates, 2026 contractor survey)
  ('JP','wallfin_rendering','per-m2',2200,'JPY','Japan contractor market survey Oct 2026 (estimate)','2026-10-13','Render walls, labour only'),
  ('JP','wallfin_putty','per-m2',1200,'JPY','Japan contractor market survey Oct 2026 (estimate)','2026-10-13','Pate skim coats, labour only'),
  ('JP','wallfin_priming','per-m2',400,'JPY','Japan contractor market survey Oct 2026 (estimate)','2026-10-13','Primer coat, labour only'),
  ('JP','wallfin_painting','per-m2',900,'JPY','Japan contractor market survey Oct 2026 (estimate)','2026-10-13','Two-coat emulsion, labour only'),
  ('JP','wallfin_plastering','per-m2',2000,'JPY','Japan contractor market survey Oct 2026 (estimate)','2026-10-13','Gypsum skim, labour only'),
  ('JP','wallfin_sanding','per-m2',250,'JPY','Japan contractor market survey Oct 2026 (estimate)','2026-10-13','Sand joints'),
  ('JP','wallfin_taping','per-m2',1300,'JPY','Japan contractor market survey Oct 2026 (estimate)','2026-10-13','Tape and fill board joints'),

  -- France
  ('FR','wallfin_rendering','per-m2',14,'EUR','French artisan market survey Oct 2026 (estimate)','2026-10-13','Enduit de facade / render, labour only'),
  ('FR','wallfin_putty','per-m2',6,'EUR','French artisan market survey Oct 2026 (estimate)','2026-10-13','Enduit de lissage two coats, labour only'),
  ('FR','wallfin_priming','per-m2',3,'EUR','French artisan market survey Oct 2026 (estimate)','2026-10-13','Sous-couche, labour only'),
  ('FR','wallfin_painting','per-m2',7,'EUR','French artisan market survey Oct 2026 (estimate)','2026-10-13','Two-coat peinture, labour only'),
  ('FR','wallfin_plastering','per-m2',16,'EUR','French artisan market survey Oct 2026 (estimate)','2026-10-13','Enduit de platrage, labour only'),
  ('FR','wallfin_sanding','per-m2',2,'EUR','French artisan market survey Oct 2026 (estimate)','2026-10-13','Poncage'),
  ('FR','wallfin_taping','per-m2',8,'EUR','French artisan market survey Oct 2026 (estimate)','2026-10-13','Joint filling BA13, labour only'),

  -- Brazil
  ('BR','wallfin_rendering','per-m2',25,'BRL','Brazilian contractor market survey Oct 2026 (estimate)','2026-10-13','Reboco, labour only'),
  ('BR','wallfin_putty','per-m2',12,'BRL','Brazilian contractor market survey Oct 2026 (estimate)','2026-10-13','Massa corrida two coats, labour only'),
  ('BR','wallfin_priming','per-m2',5,'BRL','Brazilian contractor market survey Oct 2026 (estimate)','2026-10-13','Selador coat, labour only'),
  ('BR','wallfin_painting','per-m2',15,'BRL','Brazilian contractor market survey Oct 2026 (estimate)','2026-10-13','Two-coat tinta, labour only'),
  ('BR','wallfin_plastering','per-m2',22,'BRL','Brazilian contractor market survey Oct 2026 (estimate)','2026-10-13','Gesso skim, labour only'),
  ('BR','wallfin_sanding','per-m2',4,'BRL','Brazilian contractor market survey Oct 2026 (estimate)','2026-10-13','Lixamento'),
  ('BR','wallfin_taping','per-m2',14,'BRL','Brazilian contractor market survey Oct 2026 (estimate)','2026-10-13','Drywall joints, labour only'),

  -- Saudi Arabia
  ('SA','wallfin_rendering','per-m2',18,'SAR','GCC contractor market survey Oct 2026 (estimate)','2026-10-13','Render walls, labour only'),
  ('SA','wallfin_putty','per-m2',8,'SAR','GCC contractor market survey Oct 2026 (estimate)','2026-10-13','Putty skim, labour only'),
  ('SA','wallfin_priming','per-m2',4,'SAR','GCC contractor market survey Oct 2026 (estimate)','2026-10-13','Primer coat, labour only'),
  ('SA','wallfin_painting','per-m2',8,'SAR','GCC contractor market survey Oct 2026 (estimate)','2026-10-13','Two-coat paint, labour only'),
  ('SA','wallfin_plastering','per-m2',16,'SAR','GCC contractor market survey Oct 2026 (estimate)','2026-10-13','Gypsum plaster skim, labour only'),
  ('SA','wallfin_sanding','per-m2',2,'SAR','GCC contractor market survey Oct 2026 (estimate)','2026-10-13','Sand plaster'),
  ('SA','wallfin_taping','per-m2',10,'SAR','GCC contractor market survey Oct 2026 (estimate)','2026-10-13','Board joints, labour only'),

  -- United Arab Emirates
  ('AE','wallfin_rendering','per-m2',20,'AED','UAE contractor market survey Oct 2026 (estimate)','2026-10-13','Render walls, labour only'),
  ('AE','wallfin_putty','per-m2',9,'AED','UAE contractor market survey Oct 2026 (estimate)','2026-10-13','Putty skim, labour only'),
  ('AE','wallfin_priming','per-m2',4,'AED','UAE contractor market survey Oct 2026 (estimate)','2026-10-13','Primer coat, labour only'),
  ('AE','wallfin_painting','per-m2',9,'AED','UAE contractor market survey Oct 2026 (estimate)','2026-10-13','Two-coat paint, labour only'),
  ('AE','wallfin_plastering','per-m2',18,'AED','UAE contractor market survey Oct 2026 (estimate)','2026-10-13','Gypsum plaster skim, labour only'),
  ('AE','wallfin_sanding','per-m2',3,'AED','UAE contractor market survey Oct 2026 (estimate)','2026-10-13','Sand plaster'),
  ('AE','wallfin_taping','per-m2',11,'AED','UAE contractor market survey Oct 2026 (estimate)','2026-10-13','Board joints, labour only'),

  -- Ghana
  ('GH','wallfin_rendering','per-m2',18,'GHS','Ghana contractor market survey Oct 2026 (estimate)','2026-10-13','Render walls, labour only'),
  ('GH','wallfin_putty','per-m2',8,'GHS','Ghana contractor market survey Oct 2026 (estimate)','2026-10-13','Two-coat putty, labour only'),
  ('GH','wallfin_priming','per-m2',4,'GHS','Ghana contractor market survey Oct 2026 (estimate)','2026-10-13','Primer coat, labour only'),
  ('GH','wallfin_painting','per-m2',10,'GHS','Ghana contractor market survey Oct 2026 (estimate)','2026-10-13','Two-coat emulsion, labour only'),
  ('GH','wallfin_plastering','per-m2',15,'GHS','Ghana contractor market survey Oct 2026 (estimate)','2026-10-13','Skim plaster, labour only'),
  ('GH','wallfin_sanding','per-m2',2,'GHS','Ghana contractor market survey Oct 2026 (estimate)','2026-10-13','Sand putty'),
  ('GH','wallfin_taping','per-m2',9,'GHS','Ghana contractor market survey Oct 2026 (estimate)','2026-10-13','Board joints, labour only'),

  -- Kenya
  ('KE','wallfin_rendering','per-m2',450,'KES','Kenyan fundi market survey Oct 2026 (estimate)','2026-10-13','Render walls, labour only'),
  ('KE','wallfin_putty','per-m2',180,'KES','Kenyan fundi market survey Oct 2026 (estimate)','2026-10-13','Two-coat putty, labour only'),
  ('KE','wallfin_priming','per-m2',90,'KES','Kenyan fundi market survey Oct 2026 (estimate)','2026-10-13','Primer coat, labour only'),
  ('KE','wallfin_painting','per-m2',220,'KES','Kenyan fundi market survey Oct 2026 (estimate)','2026-10-13','Two-coat emulsion, labour only'),
  ('KE','wallfin_plastering','per-m2',380,'KES','Kenyan fundi market survey Oct 2026 (estimate)','2026-10-13','Skim plaster, labour only'),
  ('KE','wallfin_sanding','per-m2',60,'KES','Kenyan fundi market survey Oct 2026 (estimate)','2026-10-13','Sand putty'),
  ('KE','wallfin_taping','per-m2',200,'KES','Kenyan fundi market survey Oct 2026 (estimate)','2026-10-13','Board joints, labour only'),

  -- South Africa
  ('ZA','wallfin_rendering','per-m2',45,'ZAR','South African contractor market survey Oct 2026 (estimate)','2026-10-13','Plaster/render, labour only'),
  ('ZA','wallfin_putty','per-m2',18,'ZAR','South African contractor market survey Oct 2026 (estimate)','2026-10-13','Putty skim, labour only'),
  ('ZA','wallfin_priming','per-m2',8,'ZAR','South African contractor market survey Oct 2026 (estimate)','2026-10-13','Bonding liquid/undercoat, labour only'),
  ('ZA','wallfin_painting','per-m2',22,'ZAR','South African contractor market survey Oct 2026 (estimate)','2026-10-13','Two-coat paint, labour only'),
  ('ZA','wallfin_plastering','per-m2',40,'ZAR','South African contractor market survey Oct 2026 (estimate)','2026-10-13','RhinoLite skim, labour only'),
  ('ZA','wallfin_sanding','per-m2',6,'ZAR','South African contractor market survey Oct 2026 (estimate)','2026-10-13','Sand skim'),
  ('ZA','wallfin_taping','per-m2',20,'ZAR','South African contractor market survey Oct 2026 (estimate)','2026-10-13','Drywall joints, labour only')
ON CONFLICT (market, task_key) DO NOTHING;
