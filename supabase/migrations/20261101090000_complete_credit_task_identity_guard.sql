-- =========================================================
-- complete_credit_task: the caller can only credit themselves
-- Migration: 20261101090000_complete_credit_task_identity_guard.sql
--
-- The last anonymous-minting path, and the last known gap from the
-- 2026-11-01 sweep. The function takes p_user_id from the client,
-- inserts a completion row and awards credits. Revoking anon closed
-- drive-by abuse, but any signed-in user could still pass another
-- account's id and mint credits into it, once per task definition.
--
-- The guard compares p_user_id with auth.uid(). Only the service role
-- (edge functions, jobs) may credit another user. The single client
-- caller, completeCreditTask in src/lib/credits.ts, already passes the
-- session user's own id from ProfileCreditsWallet, so its behaviour is
-- unchanged.
--
-- search_path is pinned here as well: the audit flagged SECURITY
-- DEFINER functions that leave it to the caller, which lets the caller
-- decide which table an INSERT reaches.
--
-- The audit function also learns to mark a finding resolved instead of
-- leaving a stale row that reads as still open.
-- =========================================================

ALTER TABLE public.security_grant_findings
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.security_grant_findings.resolved_at IS
  'Set when a later audit no longer detects this condition. Null means still present.';

CREATE OR REPLACE FUNCTION public.complete_credit_task(
  p_user_id uuid,
  p_task_id text,
  p_verification_ref text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(success boolean, new_balance integer, credits_awarded integer, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_task RECORD;
  v_count INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Credits can only be credited to the caller, unless a trusted
  -- server-side caller (service_role) is doing the crediting.
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN QUERY SELECT false, 0, 0, 'not_authorized'::TEXT;
    RETURN;
  END IF;

  -- Lock user's wallet
  PERFORM pg_advisory_xact_lock(hashtext('frelux_credit_wallet:' || p_user_id::text));

  -- Get task definition
  SELECT * INTO v_task FROM public.credit_task_definitions
  WHERE id = p_task_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 'task_not_found'::TEXT;
    RETURN;
  END IF;

  -- Check previous completions
  SELECT COUNT(*) INTO v_count
  FROM public.credit_task_completions
  WHERE user_id = p_user_id AND task_id = p_task_id;

  IF v_count >= v_task.max_completions THEN
    SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = p_user_id;
    IF v_new_balance IS NULL THEN v_new_balance := 0; END IF;
    RETURN QUERY SELECT false, v_new_balance, 0, 'already_completed'::TEXT;
    RETURN;
  END IF;

  -- Award credits: Ensure wallet exists
  INSERT INTO public.credit_wallets (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, v_task.credit_reward, v_task.credit_reward, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = credit_wallets.balance + v_task.credit_reward,
      total_earned = credit_wallets.total_earned + v_task.credit_reward,
      updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- Insert task completion record
  INSERT INTO public.credit_task_completions (task_id, user_id, credits_awarded, verification_ref, metadata)
  VALUES (p_task_id, p_user_id, v_task.credit_reward, p_verification_ref, p_metadata);

  -- Record credit transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, reason, reference_id, balance_after, metadata)
  VALUES (
    p_user_id,
    v_task.credit_reward,
    'bonus',
    'Task completed: ' || v_task.title,
    'task_' || p_task_id || '_' || gen_random_uuid()::text,
    v_new_balance,
    jsonb_build_object('task_id', p_task_id, 'verification_ref', p_verification_ref)
  );

  RETURN QUERY SELECT true, v_new_balance, v_task.credit_reward, NULL::TEXT;
END;
$function$;

COMMENT ON FUNCTION public.complete_credit_task(uuid, text, text, jsonb) IS
  'Awards task credits to the caller only. Service role may credit any user. Returns not_authorized otherwise.';

REVOKE ALL ON FUNCTION public.complete_credit_task(uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_credit_task(uuid, text, text, jsonb) TO authenticated, service_role;

-- Recreate the audit so a condition that is gone stops reading as open.
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
      COALESCE(pg_get_functiondef(p.oid), '') ~* '(auth\.uid\(\)|auth\.role\(\)|is_admin|is_platform_admin|has_role|service_role)' AS has_role_check
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
        AND f.resolved_at IS NULL
        AND f.detected_at > now() - interval '7 days'
    );

    v_inserted := v_inserted + 1;
  END LOOP;

  -- Anything previously recorded that is no longer detected is resolved.
  UPDATE public.security_grant_findings f
  SET resolved_at = now()
  WHERE f.resolved_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = f.function_name
        AND pg_get_function_identity_arguments(p.oid) = f.function_args
        AND p.prosecdef
        AND NOT (p.proname = ANY (v_allowed))
        AND NOT (COALESCE(pg_get_functiondef(p.oid), '') ~* '(auth\.uid\(\)|auth\.role\(\)|is_admin|is_platform_admin|has_role|service_role)')
        AND (
          has_function_privilege('anon', p.oid, 'EXECUTE')
          OR (
            has_function_privilege('authenticated', p.oid, 'EXECUTE')
            AND COALESCE(pg_get_functiondef(p.oid), '') ~* '\m(insert\s+into|update\s+\w+\s+set|delete\s+from|truncate)\M'
          )
        )
    );

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_privileged_execute_grants() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_privileged_execute_grants() TO service_role;
