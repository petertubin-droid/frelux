-- =========================================================
-- Privileged grant drift monitor
-- Migration: 20261101040000_privileged_grant_monitor.sql
--
-- Why this exists: on 2026-11-01 an audit found eleven SECURITY
-- DEFINER functions still executable by anon (see
-- docs/ECOSYSTEM-SYNC-PHASE1-4-AUDIT.md). One of them,
-- log_estimation_price_change, had been revoked by
-- 20261031160000_harden_privileged_writers.sql and was open again
-- afterwards. Postgres grants EXECUTE to PUBLIC on every CREATE
-- FUNCTION, so any migration that recreates a protected function
-- silently restores the anonymous path. Nothing noticed.
--
-- An event trigger would be the precise fix, but the postgres role is
-- not superuser and CREATE EVENT TRIGGER is refused, so this watches
-- instead of intercepting: an hourly job records functions that are
-- reachable by anon, or reachable by authenticated while writing
-- without any role or identity check in the body.
--
-- It records, it never mutates. Auto-revoking on a heuristic would
-- eventually break a function that is public on purpose.
--
-- Read it with:
--   SELECT * FROM public.security_grant_findings ORDER BY detected_at DESC;
--
-- Rows are deduplicated: a finding is written once, and written again
-- only if it changes, so a long-running regression does not flood the
-- table.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.security_grant_findings (
  id BIGSERIAL PRIMARY KEY,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  function_name TEXT NOT NULL,
  function_args TEXT NOT NULL,
  anon_exec BOOLEAN NOT NULL,
  auth_exec BOOLEAN NOT NULL,
  writes_tables BOOLEAN NOT NULL,
  has_role_check BOOLEAN NOT NULL,
  note TEXT
);

COMMENT ON TABLE public.security_grant_findings IS
  'Hourly snapshot of privileged functions reachable by anon or by any authenticated caller. Detection only.';

ALTER TABLE public.security_grant_findings ENABLE ROW LEVEL SECURITY;

-- Deliberately reachable by nobody but the service role and admins.
REVOKE ALL ON public.security_grant_findings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.security_grant_findings TO service_role;

-- Intentional public surface. Everything here is a read or an endpoint
-- that carries its own guard (signature, token, api key) outside SQL.
CREATE OR REPLACE FUNCTION public.privileged_grant_allowlist()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT ARRAY[
    'frelux_community_size',
    'find_nearby_listings',
    'find_nearby_products',
    'find_nearby_professionals',
    'search_marketplace_products',
    'fetch_shared_estimate',
    'respond_to_client_estimate',
    'contact_messages_rate_ok',
    'get_published_translations',
    'get_translation_alternates',
    'get_public_shared_project',
    'generate_marketplace_order_number',
    'increment_view_count',
    'increment_product_view_count',
    'price_group_progress',
    'check_pro_level_eligibility',
    'classify_catalogue_backlog',
    'get_user_verification_tier',
    'complete_credit_task',
    'archie_evidence_health'
  ]::TEXT[];
$$;

REVOKE ALL ON FUNCTION public.privileged_grant_allowlist() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.privileged_grant_allowlist() TO service_role;

CREATE OR REPLACE FUNCTION public.audit_privileged_execute_grants()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r RECORD;
  v_inserted INTEGER := 0;
  v_allowed TEXT[] := public.privileged_grant_allowlist();
BEGIN
  FOR r IN
    SELECT
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
      -- A SECURITY DEFINER body that writes is the case that matters:
      -- the caller's identity is not checked by the table, so the
      -- function's own guard is the only gate.
      COALESCE(pg_get_functiondef(p.oid), '') ~* '\m(insert\s+into|update\s+\w+\s+set|delete\s+from|truncate)\M' AS writes_tables,
      COALESCE(pg_get_functiondef(p.oid), '') ~* '(auth\.uid\(\)|is_admin|is_platform_admin|has_role|service_role)' AS has_role_check
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype <> 'trigger'::regtype
      AND NOT (p.proname = ANY (v_allowed))
  LOOP
    -- Anonymous reachability is always a finding.
    -- Authenticated reachability is a finding only when the function
    -- writes and does not check who is calling.
    CONTINUE WHEN NOT r.anon_exec
      AND NOT (r.auth_exec AND r.writes_tables AND NOT r.has_role_check);

    INSERT INTO public.security_grant_findings (
      function_name, function_args, anon_exec, auth_exec, writes_tables, has_role_check, note
    )
    SELECT
      r.proname,
      r.args,
      r.anon_exec,
      r.auth_exec,
      r.writes_tables,
      r.has_role_check,
      CASE
        WHEN r.anon_exec THEN 'anon can execute a SECURITY DEFINER function'
        ELSE 'any authenticated caller can write through this function; body has no role or identity check'
      END
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.security_grant_findings f
      WHERE f.function_name = r.proname
        AND f.function_args = r.args
        AND f.anon_exec = r.anon_exec
        AND f.auth_exec = r.auth_exec
        AND f.writes_tables = r.writes_tables
        AND f.has_role_check = r.has_role_check
        AND f.detected_at > now() - interval '7 days'
    );

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_privileged_execute_grants() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_privileged_execute_grants() TO service_role;

-- Hourly, off the top of the hour so it does not collide with the
-- market scan jobs at :00, :15, :20 and the price jobs.
DO $$
BEGIN
  -- pg_cron is present on hosted Supabase and absent from some replay
  -- targets, so scheduling is conditional rather than fatal.
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'privileged-grant-audit',
      '12 * * * *',
      'SELECT public.audit_privileged_execute_grants();'
    );
  END IF;
END $$;

COMMENT ON FUNCTION public.audit_privileged_execute_grants() IS
  'Records privileged functions reachable by anon, or by any authenticated caller when they write without a role check. Detection only, never mutates grants.';
