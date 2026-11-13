-- Rollback note: the removed trigger was itself a duplicate of
-- tax_jurisdiction_rules_component_gate(). Restoring it would restore the
-- duplicate guard, so this rollback deliberately does nothing.
SELECT 1;
