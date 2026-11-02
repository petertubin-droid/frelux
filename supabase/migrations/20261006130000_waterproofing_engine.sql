-- =========================================================
-- Waterproofing Engine (Tier 2, Engine 3)
-- =========================================================
-- Deterministic waterproofing MATERIAL estimation from
-- user-measured areas and visible admin rules:
--  - Areas and runs are NEVER assumed: DPC run, DPM area,
--    wet-area floor/wall areas, wet-area perimeter and
--    terrace/roof area all come from the user. A missing one
--    leaves its line unsized and the estimate incomplete.
--  - Coats and coverage rates are admin rules, shown in the
--    breakdown. Waste % is separate and visible.
--  - REUSES shared materials: dpc-per-meter and dpm-per-m2 are
--    the same material records the Price Tracker manages.
--  - NO prices seeded. All pricing via estimation_prices.
--  - This does not replace professional waterproofing design.
-- =========================================================

INSERT INTO estimation_materials (name, slug, category, description, is_active, sort_order) VALUES
  ('Cementitious waterproofing coating (bag)', 'waterproofing-cementitious-coating', 'waterproofing',
   'Cement-based brush-applied waterproofing coating. Admin: set the product type and coverage per bag in the rules; price per bag.', true, 1),
  ('Bituminous membrane roll (roof/terrace)', 'bituminous-membrane-roll', 'waterproofing',
   'Torched/self-adhesive bituminous waterproofing membrane roll for roofs and terraces. Admin: set roll size and coverage in the rules; price per roll.', true, 2),
  ('Waterproofing corner tape (roll)', 'waterproofing-tape', 'waterproofing',
   'Flexible waterproofing tape for corners, joints and perimeter details. Priced per roll.', true, 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active) VALUES
  ('coating_waste_pct', 'waterproofing',
   '{"value": 10}'::jsonb, 'configurable_default',
   'Waste/overlap allowance added to coating area. Shown separately in the breakdown.', true),
  ('coats_wet_floor', 'waterproofing',
   '{"value": 2}'::jsonb, 'configurable_default',
   'Number of coating coats on wet-area floors.', true),
  ('coats_wet_wall', 'waterproofing',
   '{"value": 2}'::jsonb, 'configurable_default',
   'Number of coating coats on wet-area walls (shower/bath splash zones).', true),
  ('coats_terrace', 'waterproofing',
   '{"value": 2}'::jsonb, 'configurable_default',
   'Number of coats/membrane layers on the terrace or roof treatment area.', true),
  ('cementitious_coverage_m2_per_bag', 'waterproofing',
   '{"value": 8}'::jsonb, 'configurable_default',
   'Coverage rate of one bag of cementitious coating, in m² per coat. Must match the product datasheet your admin prices.', true),
  ('membrane_roll_coverage_m2', 'waterproofing',
   '{"value": 10}'::jsonb, 'configurable_default',
   'Coverage of one bituminous membrane roll in m². Must match the roll size the admin prices.', true),
  ('tape_overlap_pct', 'waterproofing',
   '{"value": 10}'::jsonb, 'configurable_default',
   'Overlap allowance added to the waterproofing tape run.', true),
  ('dpc_overlap_pct', 'waterproofing',
   '{"value": 5}'::jsonb, 'configurable_default',
   'Overlap/lap allowance added to the DPC run length.', true);
