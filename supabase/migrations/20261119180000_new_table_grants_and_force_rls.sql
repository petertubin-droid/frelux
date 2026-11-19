-- Grants and FORCE RLS for the three tables added on 2026-11-19.
--
-- Postgres checks table-level GRANTs before it evaluates RLS policies, so a
-- policy without its grant is unreachable: the table reads as empty rather than
-- erroring, which is the failure mode this project already hit once. Two of
-- today's migrations created policies and stopped there.
--
--   saved_estimate_allowances  read policy for anon+authenticated, no grant
--   vendor_price_locks         read policy for anon+authenticated, admin write
--                              policies for authenticated, no grants at all,
--                              so the table was unreadable and unwritable
--   active_vendor_price_locks  view owned by postgres, so it would bypass the
--                              base table's RLS unless it runs as the invoker
--
-- supplier_bills already grants correctly and is untouched here.
--
-- Rollback: rollback/20261119180000_new_table_grants_and_force_rls_rollback.sql

-- ------------------------------------------------- saved_estimate_allowances
ALTER TABLE public.saved_estimate_allowances FORCE ROW LEVEL SECURITY;
GRANT SELECT ON public.saved_estimate_allowances TO anon, authenticated;

-- ------------------------------------------------------- vendor_price_locks
-- The read policy decides who may see a held price (is_active rows, in their own
-- market and currency); the grants below only make that policy reachable.
ALTER TABLE public.vendor_price_locks FORCE ROW LEVEL SECURITY;
GRANT SELECT ON public.vendor_price_locks TO anon, authenticated;
-- Writes stay admin-only: these grants expose the table, the policies gate it.
GRANT INSERT, UPDATE, DELETE ON public.vendor_price_locks TO authenticated;

-- ------------------------------------------------ active_vendor_price_locks
-- Run the view with the caller's rights so the base table's RLS still applies;
-- without this an anon caller would read every row the view selects regardless
-- of policy.
ALTER VIEW public.active_vendor_price_locks SET (security_invoker = true);
GRANT SELECT ON public.active_vendor_price_locks TO anon, authenticated;
