-- Reverses 20261119180000_new_table_grants_and_force_rls.sql
ALTER VIEW public.active_vendor_price_locks SET (security_invoker = false);
REVOKE SELECT ON public.active_vendor_price_locks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.vendor_price_locks FROM authenticated;
REVOKE SELECT ON public.vendor_price_locks FROM anon, authenticated;
ALTER TABLE public.vendor_price_locks NO FORCE ROW LEVEL SECURITY;
REVOKE SELECT ON public.saved_estimate_allowances FROM anon, authenticated;
ALTER TABLE public.saved_estimate_allowances NO FORCE ROW LEVEL SECURITY;
