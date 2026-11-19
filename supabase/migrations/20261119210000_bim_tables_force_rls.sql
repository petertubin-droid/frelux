-- FORCE RLS on the two BIM persistence tables.
--
-- 20261119200000 created the tables with RLS enabled and owner-scoped policies,
-- and granted authenticated the four DML privileges (so the policies are
-- reachable). What it left out is FORCE ROW LEVEL SECURITY, which this project
-- applies to every new table: without it the table owner bypasses the policies,
-- and any future definer-rights function or admin-side script reading these
-- tables as the owner would see every user's models.
--
-- Policies are unchanged: owner may do anything with their own rows,
-- is_admin() may read all rows.
--
-- Rollback: rollback/20261119210000_bim_tables_force_rls_rollback.sql

ALTER TABLE public.bim_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bim_model_revisions FORCE ROW LEVEL SECURITY;
