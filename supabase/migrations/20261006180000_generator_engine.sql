-- =========================================================
-- Generator / Backup Power Engine (Tier 2, Engine 8)
-- =========================================================
-- Deterministic backup power MATERIAL estimation:
--  - The user chooses the generator size bracket (10/20/30/50
--    kVA) based on THEIR OWN load assessment; the engine never
--    calculates a size — it warns that sizing must come from a
--    proper load list.
--  - The user measures the cable run from generator to changeover
--    panel; cable quantity follows with a visible waste rule.
--  - ATS and battery are labelled user decisions; battery is one
--    per generator (labelled assumption).
--  - NO prices seeded. All pricing via estimation_prices.
--  - This is not a load calculation or an installation design.
-- =========================================================

INSERT INTO estimation_materials (name, slug, category, description, is_active, sort_order) VALUES
  ('Generator 10 kVA (unit)', 'gen-unit-10kva', 'power',
   '10 kVA generator units. Priced per unit; model/phase must match what the admin prices.', true, 1),
  ('Generator 20 kVA (unit)', 'gen-unit-20kva', 'power',
   '20 kVA generator units. Priced per unit; model/phase must match what the admin prices.', true, 2),
  ('Generator 30 kVA (unit)', 'gen-unit-30kva', 'power',
   '30 kVA generator units. Priced per unit; model/phase must match what the admin prices.', true, 3),
  ('Generator 50 kVA (unit)', 'gen-unit-50kva', 'power',
   '50 kVA generator units. Priced per unit; model/phase must match what the admin prices.', true, 4),
  ('Automatic transfer switch (ATS)', 'gen-ats', 'power',
   'Automatic transfer switch for changeover. Priced per unit.', true, 5),
  ('Generator battery', 'gen-battery', 'power',
   'Starting battery for generator sets. Priced per unit.', true, 6),
  ('Generator-to-panel cable (per m)', 'gen-cable-per-m', 'power',
   'Power cable from the generator to the changeover panel. Priced per metre; size/cross-section must match what the admin prices.', true, 7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active) VALUES
  ('gen_cable_waste_pct', 'generator',
   '{"value": 5}'::jsonb, 'configurable_default',
   'Waste/route allowance added to the measured generator-to-panel cable run. Shown separately in the breakdown.', true);
