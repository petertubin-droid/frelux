-- =========================================================
-- IT CAPABILITY SEED FIX (Engine 1, IT closeout — priority 4)
--
-- Follow-up to migration 20261015163000: that seed listed three
-- engine ids that do NOT use FINISHING_VERIFIED_MARKETS
-- (tyrolene, boq_generator and conversational_estimator are
-- NG-only engines), while omitting the three engines that DO
-- (margin_calculator, ai_color_assistant, count_vision — see
-- capability-registry.ts lines 473/518/541).
--
-- This migration corrects the IT pairs so the DB registry and
-- the code registry stay in exact sync (guarded by
-- capability-registry.test.ts). The DELETE only touches the
-- three miscoded IT rows added by 20261015163000 minutes ago;
-- no other rows are affected.
-- =========================================================

-- Remove the 3 miscoded IT pairs (wrong engine ids)
DELETE FROM engine_capability_verified
WHERE market_code = 'IT'
  AND engine_id IN ('tyrolene', 'boq_generator', 'conversational_estimator');

-- Seed the 3 correct IT pairs
INSERT INTO engine_capability_verified (engine_id, market_code) VALUES
  ('margin_calculator', 'IT'),
  ('ai_color_assistant', 'IT'),
  ('count_vision', 'IT')
ON CONFLICT (engine_id, market_code) DO NOTHING;
