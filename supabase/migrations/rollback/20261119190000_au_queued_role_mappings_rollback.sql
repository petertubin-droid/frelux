-- Reverses 20261119190000_au_queued_role_mappings.sql
DELETE FROM public.market_material_roles
WHERE market = 'AU' AND role IN ('eifs-adhesive', 'eifs-finish', 'eifs-primer');
