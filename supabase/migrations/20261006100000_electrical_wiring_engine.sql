-- =========================================================
-- Electrical Wiring Engine (Tier 2, Engine 1)
-- =========================================================
-- Deterministic electrical MATERIAL estimation from explicit
-- point counts and user-provided average cable run lengths.
--
-- Honesty contract:
--  - Cable lengths are NEVER invented. Each cable category
--    (lighting, socket, dedicated, earth, feeder) needs the
--    user's average run length; without it the line is marked
--    missing and the estimate is marked incomplete.
--  - Circuit grouping and conduit/junction-box planning rules
--    are admin-configured, seeded here as editable defaults.
--  - NO prices are seeded. Every material is priced by the
--    admin through the shared estimation_prices table; an
--    unpriced material shows PRICE NOT CONFIGURED.
--  - This is ESTIMATION, not professional electrical design.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. Materials (shared estimation_materials table, no prices)
-- ─────────────────────────────────────────────
INSERT INTO estimation_materials (name, slug, category, description, is_active, sort_order) VALUES
  ('Lighting circuit cable (twin & earth)', 'elec-cable-lighting', 'electrical',
   'Twin & earth cable for lighting circuits. Admin: set the size your projects use (typically 1.5 mm²) in the material notes and price it per metre.', true, 1),
  ('Socket circuit cable (twin & earth)', 'elec-cable-socket', 'electrical',
   'Twin & earth cable for socket circuits. Admin: set the size your projects use (typically 2.5 mm²) in the material notes and price it per metre.', true, 2),
  ('Dedicated appliance circuit cable', 'elec-cable-dedicated', 'electrical',
   'Cable for dedicated appliance circuits (AC units, cookers, showers, pumps). Admin: set the size per the appliance and price it per metre.', true, 3),
  ('Earth cable (green/yellow)', 'elec-cable-earth', 'electrical',
   'Protective earth/bonding cable. Admin: set the size your projects use and price it per metre.', true, 4),
  ('Feeder / sub-main cable (DB supply)', 'elec-cable-feeder', 'electrical',
   'Supply cable from meter to distribution boards. Admin: set the size and price per metre — this is sized per installation, never assumed.', true, 5),
  ('PVC conduit (cable runs)', 'elec-conduit', 'electrical',
   'PVC conduit for cable runs. Priced per metre of conduit (typically supplied in 3 m lengths — the admin decides pack behaviour).', true, 6),
  ('Junction boxes', 'elec-junction-box', 'electrical',
   'PVC junction boxes for lighting point connections.', true, 7),
  ('Circuit breakers (MCB)', 'elec-breaker', 'electrical',
   'Miniature circuit breakers, one per circuit. Rating is a design decision — this engine counts circuits only.', true, 8),
  ('Switch plates', 'elec-switch-plate', 'electrical',
   'Wall switch plates (any gang — quantity taken from the user''s switch count).', true, 9),
  ('Socket outlets', 'elec-socket-outlet', 'electrical',
   'Wall socket outlets (quantity taken from the user''s socket point count).', true, 10),
  ('Distribution boards', 'elec-distribution-board', 'electrical',
   'Consumer unit / distribution board (quantity taken from the user''s count).', true, 11)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- 2. Planning rules (calculator_type 'electrical')
--    All are admin-configurable; none are engineering designs.
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active) VALUES
  ('lighting_points_per_circuit', 'electrical',
   '{"value": 10}'::jsonb, 'configurable_default',
   'Planning rule: lighting points grouped per circuit. Used ONLY to count circuits (and so breakers and board ways) — it is not a certified design.', true),
  ('socket_points_per_circuit', 'electrical',
   '{"value": 8}'::jsonb, 'configurable_default',
   'Planning rule: socket points grouped per circuit. Used ONLY to count circuits — not a certified design.', true),
  ('dedicated_points_per_circuit', 'electrical',
   '{"value": 1}'::jsonb, 'configurable_default',
   'Planning rule: dedicated appliance circuits per point (1 = each appliance on its own circuit).', true),
  ('cable_waste_pct', 'electrical',
   '{"value": 10}'::jsonb, 'configurable_default',
   'Waste/slack allowance added to every cable category length. Shown separately in every breakdown. Set 0 for none.', true),
  ('conduit_waste_pct', 'electrical',
   '{"value": 5}'::jsonb, 'configurable_default',
   'Waste/slack allowance added to conduit length. Shown separately in the breakdown.', true),
  ('conduit_m_per_lighting_point', 'electrical',
   '{"value": 3}'::jsonb, 'configurable_default',
   'PLANNING ALLOWANCE: metres of conduit per lighting point. A visible estimate, not a measurement — deactivate to require site measurement.', true),
  ('conduit_m_per_socket_point', 'electrical',
   '{"value": 3}'::jsonb, 'configurable_default',
   'PLANNING ALLOWANCE: metres of conduit per socket point. Deactivate to require site measurement.', true),
  ('junction_boxes_per_lighting_point', 'electrical',
   '{"value": 1}'::jsonb, 'configurable_default',
   'PLANNING RULE: junction boxes per lighting point.', true);
