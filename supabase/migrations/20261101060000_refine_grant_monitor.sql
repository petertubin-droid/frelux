-- =========================================================
-- Refine the grant monitor: a guard in the body counts
-- Migration: 20261101060000_refine_grant_monitor.sql
--
-- The first version flagged every SECURITY DEFINER function anon could
-- execute, which included functions whose body already raises unless
-- the caller is an admin (approve_verification, admin_get_nin_history,
-- is_site_reviewer, ...). Those are correct: the grant is open, the
-- function refuses. Flagging them buried the real findings.
--
-- Revised rule:
--   anon  -> finding only when the body has no role check
--   auth  -> finding only when it writes and has no role check
--   allowlisted public surfaces are never findings
--
-- The false positives recorded by the first run are cleared, since they
-- describe a rule that was wrong rather than a condition that was found.
-- =========================================================

DELETE FROM public.security_grant_findings WHERE has_role_check;

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
      COALESCE(pg_get_functiondef(p.oid), '') ~* '\m(insert\s+into|update\s+\w+\s+set|delete\s+from|truncate)\M' AS writes_tables,
      COALESCE(pg_get_functiondef(p.oid), '') ~* '(auth\.uid\(\)|is_admin|is_platform_admin|has_role|service_role)' AS has_role_check
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype <> 'trigger'::regtype
      AND NOT (p.proname = ANY (v_allowed))
  LOOP
    CONTINUE WHEN r.has_role_check;
    CONTINUE WHEN NOT r.anon_exec AND NOT (r.auth_exec AND r.writes_tables);

    INSERT INTO public.security_grant_findings (
      function_name, function_args, anon_exec, auth_exec, writes_tables, has_role_check, note
    )
    SELECT
      r.proname, r.args, r.anon_exec, r.auth_exec, r.writes_tables, r.has_role_check,
      CASE
        WHEN r.anon_exec THEN 'anon can execute a SECURITY DEFINER function and the body checks no role'
        ELSE 'any authenticated caller can write through this function; body has no role or identity check'
      END
    WHERE NOT EXISTS (
      SELECT 1 FROM public.security_grant_findings f
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
