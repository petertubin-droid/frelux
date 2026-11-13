-- =========================================================
-- One guard, not two
--
-- While adding the audit trail I also added a validation trigger for active
-- tax rules, not having spotted that tax_jurisdiction_rules_component_gate()
-- already enforces the same contract (named reviewer, review date, citation,
-- effective date, components that only compound on earlier components). Two
-- guards produce two different error messages for one mistake, so the
-- duplicate is removed and the original stays the single authority.
--
-- Rollback: 20261112291000_tax_rule_dedupe_guard_rollback.sql
-- =========================================================

DROP TRIGGER IF EXISTS trg_tax_jurisdiction_rules_guard ON public.tax_jurisdiction_rules;
DROP FUNCTION IF EXISTS public.tax_jurisdiction_rules_guard();
