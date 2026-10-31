-- =========================================================
-- Privileged write functions: restrict to service_role
-- Migration: 20261031160000_harden_privileged_writers.sql
--
-- Five SECURITY DEFINER functions write to platform tables and are
-- reachable by clients. Postgres grants EXECUTE to PUBLIC by default,
-- so "no explicit GRANT" does not mean "not callable": anon inherits
-- PUBLIC. Judging reachability from GRANT statements alone missed this.
--
-- seed_reward_catalogue is the worst of them. It is explicitly granted
-- to anon and does ON CONFLICT DO UPDATE on reward_catalogue, so any
-- visitor could reset reward prices and descriptions to the hardcoded
-- values, overriding admin pricing decisions from the public internet.
--
-- None of the five has a client caller (verified in src/), so they are
-- locked to service_role with no loss of function. Resolved by name
-- rather than by signature so this cannot drift from the live schema.
--
-- Not done here: pinning search_path on the 34 SECURITY DEFINER
-- functions that lack it. A blanket SET search_path = public, pg_temp
-- would silently break any function that resolves an extension symbol
-- installed in the extensions schema (pgcrypto, pg_cron). That needs
-- per-function verification, and it is tracked in docs/RPC-SECURITY-REVIEW.md.
-- =========================================================

DO $$
DECLARE
  r RECORD;
  write_fns TEXT[] := ARRAY[
    'seed_reward_catalogue',
    'store_social_token',
    'log_estimation_price_change',
    'frelux_release_engine_lock',
    'frelux_archie_snapshot_knowledge'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (write_fns)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);

    -- An unpinned search_path on a SECURITY DEFINER writer lets the
    -- caller's path decide which table an INSERT lands in.
    IF r.proname = 'seed_reward_catalogue' THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
    END IF;
  END LOOP;
END $$;
