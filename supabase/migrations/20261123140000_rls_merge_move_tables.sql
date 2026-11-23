-- =========================================================
-- FRELUX: row level security on the category merge/move tables
-- Migration: 20261123140000_rls_merge_move_tables.sql
--
-- Why: the admin access audit (docs/ADMIN_ACCESS_AUDIT.md) found four public
-- tables with RLS disabled. They carry no grants to anon or authenticated
-- today, so nothing is reachable, but a disabled policy layer is one future
-- GRANT away from being open.
--
-- What this does: enables RLS and adds no policies, which denies every role
-- except service_role. That matches today's behaviour exactly (the tables are
-- written by server-side code that runs as service_role), so no application
-- path changes. If an admin UI ever needs to read these tables directly, add a
-- policy using is_admin() at that point rather than before.
--
-- Guarded: each table is checked for existence, so this is safe to re-run and
-- safe on an environment that never had the table.
-- =========================================================

DO $$
BEGIN
  ALTER TABLE IF EXISTS public.product_category_merges ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.product_category_moves ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.pro_category_merges ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.pro_profile_category_moves ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'One of the merge/move tables does not exist in this environment; skipped.';
END $$;

COMMENT ON TABLE public.product_category_merges IS
  'RLS enabled 2026-11-23: no policies, so only service_role may read or write.';
COMMENT ON TABLE public.product_category_moves IS
  'RLS enabled 2026-11-23: no policies, so only service_role may read or write.';
COMMENT ON TABLE public.pro_category_merges IS
  'RLS enabled 2026-11-23: no policies, so only service_role may read or write.';
COMMENT ON TABLE public.pro_profile_category_moves IS
  'RLS enabled 2026-11-23: no policies, so only service_role may read or write.';
