-- =========================================================
-- Foundation Engine (Tier 2, Engine 6)
-- =========================================================
-- Deterministic foundation MATERIAL estimation:
--  - The user provides measured volumes and areas: foundation
--    concrete volume (m³), blockwork-to-DPC wall area (m²),
--    hardcore fill volume (m³) and formwork area (m²).
--  - The concrete mix ratio is a visible admin rule (default
--    1:2:4); cement bags, sand and granite follow the standard
--    dry-volume mix math with every constant shown.
--  - REUSES the shared materials the Price Tracker manages:
--    cement-per-bag, sand-per-m3, granite-per-m3,
--    hardcore-per-m3, block-per-piece, formwork-per-m2.
--    No new material rows, no prices seeded.
--  - This does NOT design foundations. Sizes, depth and
--    reinforcement are structural engineering decisions — use
--    the Reinforcement engine for the bar schedule.
-- =========================================================

INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active) VALUES
  ('concrete_mix_ratio', 'foundation',
   '{"cement": 1, "sand": 2, "granite": 4}'::jsonb, 'configurable_default',
   'Concrete mix ratio (cement : sand : granite parts by volume). Default 1:2:4 for grade ~20. Changing it changes the material split — shown in the breakdown.', true),
  ('concrete_waste_pct', 'foundation',
   '{"value": 5}'::jsonb, 'configurable_default',
   'Waste allowance added to the concrete volume before the mix math. Shown separately.', true),
  ('blocks_per_m2', 'foundation',
   '{"value": 10}'::jsonb, 'configurable_default',
   'Blocks per m² of wall for the block size the admin prices (default suits 9-inch, 450×225 face). Must match the priced block.', true);
