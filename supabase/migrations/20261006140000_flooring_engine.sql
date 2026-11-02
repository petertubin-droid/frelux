-- =========================================================
-- Flooring Engine (Tier 2, Engine 4)
-- =========================================================
-- Deterministic plank/sheet flooring MATERIAL estimation
-- (laminate, vinyl, parquet — the tile and screeding engines
-- already exist separately).
--
--  - Room area and perimeter come from the user; coverage rates,
--    pack sizes and waste are visible admin rules.
--  - The flooring type is the user's choice and prices via its
--    own shared material record.
--  - NO prices seeded. All pricing via estimation_prices.
--  - This does not replace professional flooring specification.
-- =========================================================

INSERT INTO estimation_materials (name, slug, category, description, is_active, sort_order) VALUES
  ('Laminate flooring (pack)', 'flooring-laminate-pack', 'flooring',
   'Laminate flooring packs. Admin: set the pack coverage (m² per pack) in the rules to match the product priced.', true, 1),
  ('Vinyl / PVC flooring', 'flooring-vinyl-m2', 'flooring',
   'Vinyl/PVC sheet or plank flooring, priced per m².', true, 2),
  ('Parquet flooring', 'flooring-parquet-m2', 'flooring',
   'Engineered/parquet flooring, priced per m².', true, 3),
  ('Flooring underlay (roll)', 'flooring-underlay-roll', 'flooring',
   'Foam/underlay rolls. Admin: set roll coverage in the rules to match the product priced.', true, 4),
  ('Flooring adhesive (bag)', 'flooring-adhesive-bag', 'flooring',
   'Flooring adhesive. Admin: set coverage per bag in the rules to match the product priced.', true, 5),
  ('Skirting board', 'flooring-skirting-m', 'flooring',
   'Skirting boards, priced per linear metre.', true, 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active) VALUES
  ('floor_waste_pct', 'flooring',
   '{"value": 8}'::jsonb, 'configurable_default',
   'Cutting/waste allowance added to the floor area. Shown separately in the breakdown.', true),
  ('laminate_pack_coverage_m2', 'flooring',
   '{"value": 2.5}'::jsonb, 'configurable_default',
   'Coverage of one laminate pack in m². Must match the pack the admin prices.', true),
  ('underlay_roll_coverage_m2', 'flooring',
   '{"value": 10}'::jsonb, 'configurable_default',
   'Coverage of one underlay roll in m². Must match the roll the admin prices.', true),
  ('adhesive_coverage_m2_per_bag', 'flooring',
   '{"value": 5}'::jsonb, 'configurable_default',
   'Coverage of one adhesive bag in m². Must match the product datasheet the admin prices.', true),
  ('skirting_waste_pct', 'flooring',
   '{"value": 5}'::jsonb, 'configurable_default',
   'Cutting allowance added to the skirting run.', true);
