-- =========================================================
-- Plumbing Engine (Tier 2, Engine 2)
-- =========================================================
-- Deterministic plumbing MATERIAL estimation. Fixture counts and
-- pipe run lengths come from the user; fitting counts come from
-- visible admin planning rules. Nothing hidden, nothing invented:
--  - Pipe run lengths are NEVER assumed. Each pipe category
--    (cold, hot, waste, drainage) needs the user's measured or
--    estimated total run; without it the line stays unsized and
--    the estimate is marked incomplete.
--  - Fittings follow labelled planning allowances (per fixture
--    connection), admin-configurable.
--  - NO prices are seeded. All materials price via the shared
--    estimation_prices table (manageable from the Price Tracker
--    or Materials admin).
--  - This does not replace professional plumbing design.
-- =========================================================

INSERT INTO estimation_materials (name, slug, category, description, is_active, sort_order) VALUES
  ('Cold water pipe', 'plumb-pipe-cold', 'plumbing',
   'Cold water supply pipe. Admin: set the diameter and material your projects use (e.g. 20 mm PPR / ½ inch PVC) in the material notes and price per metre.', true, 1),
  ('Hot water pipe', 'plumb-pipe-hot', 'plumbing',
   'Hot water supply pipe where applicable. Admin: set diameter/material and price per metre.', true, 2),
  ('Waste pipe', 'plumb-pipe-waste', 'plumbing',
   'Waste water pipe from fixtures. Admin: set diameter/material and price per metre.', true, 3),
  ('Drainage pipe', 'plumb-pipe-drainage', 'plumbing',
   'Soil/drainage pipe. Admin: set diameter/material and price per metre.', true, 4),
  ('Pipe elbows', 'plumb-elbow', 'plumbing', 'Pipe elbows/bends.', true, 5),
  ('Pipe tees', 'plumb-tee', 'plumbing', 'Pipe tee joints.', true, 6),
  ('Pipe reducers', 'plumb-reducer', 'plumbing', 'Pipe reducers/adaptors.', true, 7),
  ('Pipe unions', 'plumb-union', 'plumbing', 'Pipe unions/couplings.', true, 8),
  ('Valves', 'plumb-valve', 'plumbing', 'Stop valves/gate valves.', true, 9),
  ('Taps', 'plumb-tap', 'plumbing', 'Water taps/mixers.', true, 10),
  ('WC connection kit', 'plumb-wc-connection', 'plumbing', 'WC pan connector and inlet fittings.', true, 11),
  ('Shower connection kit', 'plumb-shower-connection', 'plumbing', 'Shower arm and connection fittings.', true, 12),
  ('Sink connection kit', 'plumb-sink-connection', 'plumbing', 'Sink/basin inlet and trap fittings.', true, 13),
  ('Floor drains', 'plumb-floor-drain', 'plumbing', 'Floor drain gullies.', true, 14),
  ('Water storage connection kit', 'plumb-storage-connection', 'plumbing', 'Tank inlet/outlet connection fittings.', true, 15),
  ('Pump connection kit', 'plumb-pump-connection', 'plumbing', 'Pump inlet/outlet connection fittings.', true, 16)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active) VALUES
  ('pipe_waste_pct', 'plumbing',
   '{"value": 10}'::jsonb, 'configurable_default',
   'Waste/cutting allowance added to every pipe category length. Shown separately in the breakdown. Set 0 for none.', true),
  ('elbow_per_fixture', 'plumbing',
   '{"value": 3}'::jsonb, 'configurable_default',
   'PLANNING ALLOWANCE: elbows per fixture connection. A visible estimate, not a measurement — deactivate to require site count.', true),
  ('tee_per_fixture', 'plumbing',
   '{"value": 1}'::jsonb, 'configurable_default',
   'PLANNING ALLOWANCE: tees per fixture connection.', true),
  ('reducer_per_fixture', 'plumbing',
   '{"value": 1}'::jsonb, 'configurable_default',
   'PLANNING ALLOWANCE: reducers per fixture connection.', true),
  ('union_per_fixture', 'plumbing',
   '{"value": 1}'::jsonb, 'configurable_default',
   'PLANNING ALLOWANCE: unions per fixture connection.', true),
  ('valve_per_tap', 'plumbing',
   '{"value": 1}'::jsonb, 'configurable_default',
   'PLANNING RULE: stop valve per tap position.', true);
