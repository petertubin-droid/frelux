-- =========================================================
-- Widen estimation_calc_rules.rule_status check constraint
-- =========================================================
-- The Tier 2 engine migrations (electrical, plumbing,
-- waterproofing, flooring, reinforcement, foundation,
-- doors/windows, generator) seed rules with rule_status
-- 'configurable_default' — a labelled planning default the
-- admin can tune or deactivate. The original constraint
-- only allowed status values used by the legacy engines,
-- which made those migrations fail on apply. Widen the
-- constraint so a fresh environment can apply all
-- migrations in order. Idempotent.
-- =========================================================

ALTER TABLE estimation_calc_rules
  DROP CONSTRAINT IF EXISTS estimation_calc_rules_rule_status_check;

ALTER TABLE estimation_calc_rules
  ADD CONSTRAINT estimation_calc_rules_rule_status_check
  CHECK (rule_status IN (
    'verified_frelux',
    'admin_configured',
    'calculated',
    'manual_adjustment',
    'negotiated',
    'configurable_default'
  ));
