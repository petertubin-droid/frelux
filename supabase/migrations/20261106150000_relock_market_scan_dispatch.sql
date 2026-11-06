-- Re-lock the scanner dispatcher after the corrective function replacements.
-- CREATE OR REPLACE FUNCTION does not preserve a deliberate service-role-only
-- boundary when a function was initially created with PostgreSQL's default
-- PUBLIC EXECUTE grant. This must follow every replacement in the migration
-- chain so anon/authenticated clients cannot invoke the scheduler directly.
REVOKE ALL ON FUNCTION public.dispatch_market_scans(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_market_scans(integer)
  TO service_role;

DO $$
DECLARE
  v_sig regprocedure;
BEGIN
  SELECT p.oid::regprocedure INTO v_sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'dispatch_market_scans'
     AND pg_get_function_identity_arguments(p.oid) = 'p_max_markets integer';

  IF v_sig IS NULL THEN
    RAISE EXCEPTION 'dispatch_market_scans(integer) missing after grant lock';
  END IF;
END $$;
