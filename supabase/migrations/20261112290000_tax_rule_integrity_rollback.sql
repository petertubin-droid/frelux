-- Rollback for 20261112290000_tax_rule_integrity.sql

DROP TRIGGER IF EXISTS trg_tax_jurisdiction_rules_audit ON public.tax_jurisdiction_rules;
DROP TRIGGER IF EXISTS trg_tax_jurisdiction_rules_guard ON public.tax_jurisdiction_rules;
DROP FUNCTION IF EXISTS public.tax_jurisdiction_rules_audit();
DROP FUNCTION IF EXISTS public.tax_jurisdiction_rules_guard();
DROP TABLE IF EXISTS public.tax_rule_audit;
