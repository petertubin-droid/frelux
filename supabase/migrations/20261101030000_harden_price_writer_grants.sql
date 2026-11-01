-- =========================================================
-- Privileged price writers: close the remaining anon and
-- authenticated reachability gaps
-- Migration: 20261101030000_harden_price_writer_grants.sql
--
-- Evidence (measured against production nfgaaohweygwydoelxnf on
-- 2026-11-01, not read from documentation):
--
--   has_function_privilege('anon', ...) returned true for
--     apply_market_material_prices      writes estimation_prices
--     refresh_market_material_price     writes market_material_prices
--     mark_stale_market_prices
--     dispatch_market_scans
--     close_stale_scan_runs
--     approve_verification
--     market_scan_overview
--     get_price_update_summaries
--     log_estimation_price_change
--     store_social_token
--
-- 20261031160000_harden_privileged_writers.sql revoked five other
-- functions, but these ten were not in its list, and the grant on
-- log_estimation_price_change survived that migration (verified: anon
-- still true afterwards), so it is re-asserted here.
--
-- Reachability is a default-privileges problem, not a GRANT problem:
-- Postgres grants EXECUTE to PUBLIC, and anon inherits PUBLIC. Each
-- function below is therefore locked by name and the PUBLIC grant is
-- revoked explicitly.
--
-- Split by caller, measured in src/ and supabase/functions/:
--
--   service_role only, no client caller anywhere:
--     apply_market_material_prices   (pg_cron: none, manual admin only)
--     apply_community_prices         (none)
--     mark_stale_market_prices       (none)
--     dispatch_market_scans          (pg_cron runs as owner)
--     close_stale_scan_runs          (pg_cron runs as owner)
--     refresh_market_material_price  (price-intel-scan, service client)
--     log_estimation_price_change    (trigger/audit only)
--     store_social_token             (none)
--
--   authenticated + service_role, anon revoked:
--     approve_verification           (admin UI; already raises unless
--                                     public.is_admin(), guard kept)
--     market_scan_overview           (AdminMarketPrices)
--     get_price_update_summaries     (worker-channels)
--
-- Not changed here, tracked instead: those last three still trust any
-- authenticated caller for reads. Their payload is scan metadata, not
-- secrets, so this migration closes the anonymous path and leaves the
-- role guard for a follow-up that recreates each body with an explicit
-- public.is_admin() check.
--
-- Idempotent: safe to replay against a database where some grants were
-- already tightened by hand.
-- =========================================================

DO $$
DECLARE
  r RECORD;
  service_only TEXT[] := ARRAY[
    'apply_market_material_prices',
    'apply_community_prices',
    'mark_stale_market_prices',
    'dispatch_market_scans',
    'close_stale_scan_runs',
    'refresh_market_material_price',
    'log_estimation_price_change',
    'store_social_token'
  ];
  auth_and_service TEXT[] := ARRAY[
    'approve_verification',
    'market_scan_overview',
    'get_price_update_summaries'
  ];
BEGIN
  -- service_role only.
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (service_only)
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig
    );
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    RAISE NOTICE 'locked to service_role: %', r.proname;
  END LOOP;

  -- Authenticated callers keep their admin UI working; anon loses access.
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (auth_and_service)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig
    );
    RAISE NOTICE 'locked to authenticated+service_role: %', r.proname;
  END LOOP;

  -- Fail loudly if a named function is missing, so a drifted schema
  -- cannot report success while the grant stays open.
  IF EXISTS (
    SELECT 1
    FROM unnest(service_only || auth_and_service) AS wanted(name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = wanted.name
    )
  ) THEN
    RAISE EXCEPTION 'A privileged function named in this migration does not exist; review before applying';
  END IF;
END $$;

-- Post-condition, run manually to confirm:
--
--   SELECT p.proname,
--          has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname IN (
--       'apply_market_material_prices','apply_community_prices',
--       'mark_stale_market_prices','dispatch_market_scans',
--       'close_stale_scan_runs','refresh_market_material_price',
--       'log_estimation_price_change','store_social_token',
--       'approve_verification','market_scan_overview',
--       'get_price_update_summaries')
--   ORDER BY 1;
--
-- Every anon_exec must be false. The first eight must also show
-- auth_exec = false.
