-- =========================================================
-- IT MARKET CLOSEOUT (Engine 1, priority 4) — capability seed
--
-- IT finishing engines were verified 2026-10-15: 8 IT wall
-- assemblies, 8 role mappings wired to EUR-priced materials
-- (migration 20261015162000), live IT price book, and IT is in
-- the 5-market e2e matrix. The registry code
-- (capability-registry.ts) now lists IT in
-- FINISHING_VERIFIED_MARKETS; this migration seeds the matching
-- engine_capability_verified rows so the DB registry and the
-- code registry stay in exact sync (guarded by
-- capability-registry.test.ts).
--
-- Idempotent: ON CONFLICT (engine_id, market_code) DO NOTHING.
-- =========================================================

INSERT INTO engine_capability_verified (engine_id, market_code) VALUES
  ('painting', 'IT'),
  ('screeding', 'IT'),
  ('pop_ceiling', 'IT'),
  ('tile', 'IT'),
  ('wall_finishing', 'IT'),
  ('tyrolene', 'IT'),
  ('boq_generator', 'IT'),
  ('conversational_estimator', 'IT'),
  ('defect_diagnosis', 'IT'),
  ('surface_assessment', 'IT')
ON CONFLICT (engine_id, market_code) DO NOTHING;
