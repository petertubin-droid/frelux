-- =====================================================================
-- Engine #12 (RBAC & clearance): RPC privilege-escalation hardening
--
-- Findings from the live least-privilege audit (2026-10-21), each
-- verified against the live definitions before writing this fix:
--
--  [CRITICAL] promote_to_admin(user_email) — SECURITY DEFINER, no
--  authorization check, executable by ANY authenticated user (the
--  Postgres default EXECUTE-to-PUBLIC grant). Any signed-in user
--  could become a platform admin. Never called by app code; it was
--  a manual helper. Fix: revoke EXECUTE from PUBLIC/anon/
--  authenticated — the function stays owner-callable in the SQL
--  editor as a deliberate, logged manual action.
--
--  [CRITICAL] admin_adjust_credits / admin_adjust_credits_v2 —
--  SECURITY DEFINER but the admin check trusted the CALLER-SUPPLIED
--  p_admin_id (confused deputy: pass any real admin's uuid).
--
--  [HIGH] admin_approve_nin / admin_reject_nin — same param-trusting
--  pattern; any authenticated user could pass an admin's uuid and
--  verify/reject worker identities.
--
-- Fix for all four: the guard now requires the caller's JWT identity
-- (auth.uid()) to BE the admin, not merely to know one. Bodies were
-- regenerated FROM the live definitions and only the guard was
-- injected, so no behavior beyond the check changes.
--
--  [LOW] seed_reward_catalogue() — idempotent seed upsert exposed to
--  anon/authenticated. Harmless payload, but seeding is not a
--  client concern; the seed-rewards edge function uses the service
--  role and is unaffected. Fix: revoke client EXECUTE.
--
-- Verification at the bottom: no EXECUTE grant to client roles may
-- remain on promote_to_admin or seed_reward_catalogue.
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_reward_catalogue() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_adjust_credits(p_admin_id uuid, p_target_user_id uuid, p_amount integer, p_reason text)
 RETURNS TABLE(success boolean, new_balance integer, error text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin_role TEXT;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- ENGINE #12 HARDENING: caller must BE the admin (JWT), not just pass an admin id
  IF p_admin_id IS DISTINCT FROM auth.uid()
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN QUERY SELECT false, 0, 'not_admin'::TEXT;
    RETURN;
  END IF;
  -- Verify admin
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
  IF v_admin_role != 'admin' THEN
    RETURN QUERY SELECT false, 0, 'not_admin';
    RETURN;
  END IF;

  SELECT balance INTO v_balance FROM public.credit_wallets WHERE user_id = p_target_user_id;
  IF v_balance IS NULL THEN
    INSERT INTO public.credit_wallets (user_id, balance, total_earned, total_spent)
    VALUES (p_target_user_id, 0, 0, 0);
    v_balance := 0;
  END IF;

  v_new_balance := GREATEST(0, v_balance + p_amount);

  UPDATE public.credit_wallets
  SET balance = v_new_balance,
      total_earned = CASE WHEN p_amount > 0 THEN total_earned + p_amount ELSE total_earned END,
      total_spent = CASE WHEN p_amount < 0 THEN total_spent + ABS(p_amount) ELSE total_spent END,
      updated_at = now()
  WHERE user_id = p_target_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, reason, reference_id, balance_after, metadata)
  VALUES (
    p_target_user_id,
    p_amount,
    'admin_adjust',
    p_reason,
    'admin_adjust_' || gen_random_uuid()::TEXT,
    v_new_balance,
    jsonb_build_object('admin_id', p_admin_id)
  );

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_adjust_credits_v2(p_admin_id uuid, p_target_user_id uuid, p_amount integer, p_reason text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(success boolean, new_balance integer, error text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin_role TEXT;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- ENGINE #12 HARDENING: caller must BE the admin (JWT), not just pass an admin id
  IF p_admin_id IS DISTINCT FROM auth.uid()
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN QUERY SELECT false, 0, 'not_admin'::TEXT;
    RETURN;
  END IF;
  -- Serialize wallet mutations for the target user (audit H-1).
  PERFORM pg_advisory_xact_lock(hashtext('frelux_credit_wallet:' || p_target_user_id::text));

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
  IF v_admin_role != 'admin' THEN
    RETURN QUERY SELECT false, 0, 'not_admin'::TEXT;
    RETURN;
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN QUERY SELECT false, 0, 'reason_required'::TEXT;
    RETURN;
  END IF;

  SELECT balance INTO v_balance FROM public.credit_wallets WHERE user_id = p_target_user_id;
  IF v_balance IS NULL THEN
    INSERT INTO public.credit_wallets (user_id, balance, total_earned, total_spent)
    VALUES (p_target_user_id, 0, 0, 0);
    v_balance := 0;
  END IF;

  -- RELATIVE guarded update (audit H-1): clamping semantics
  -- preserved via GREATEST(0, balance + amount); the recorded
  -- balance_after now comes from the row itself (RETURNING),
  -- never from a stale pre-read.
  UPDATE public.credit_wallets
  SET balance = GREATEST(0, balance + p_amount),
      total_earned = CASE WHEN p_amount > 0 THEN total_earned + p_amount ELSE total_earned END,
      total_spent = CASE WHEN p_amount < 0 THEN total_spent + ABS(p_amount) ELSE total_spent END,
      updated_at = now()
  WHERE user_id = p_target_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.credit_transactions (user_id, amount, type, reason, reference_id, balance_after, metadata)
  VALUES (
    p_target_user_id,
    p_amount,
    'admin_adjust',
    p_reason,
    'admin_adjust_' || gen_random_uuid()::TEXT,
    v_new_balance,
    jsonb_build_object('admin_id', p_admin_id, 'admin_reason', p_reason) || p_metadata
  );

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_approve_nin(p_profile_id uuid, p_admin_id uuid)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_nin TEXT;
  v_display_name TEXT;
  v_business_name TEXT;
  v_phone TEXT;
  v_mobile TEXT;
BEGIN
  -- ENGINE #12 HARDENING: caller must BE the admin (JWT), not just pass an admin id
  IF p_admin_id IS DISTINCT FROM auth.uid()
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN QUERY SELECT false, 'not_admin'::TEXT;
    RETURN;
  END IF;
  -- Verify admin
  PERFORM 1 FROM profiles WHERE id = p_admin_id AND role = 'admin';
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Only admins can approve NIN'::TEXT;
    RETURN;
  END IF;

  -- Get current profile data for snapshot
  SELECT nin_number, display_name, business_name, phone_number, mobile_number
  INTO v_nin, v_display_name, v_business_name, v_phone, v_mobile
  FROM pro_profiles WHERE id = p_profile_id;

  IF v_nin IS NULL THEN
    RETURN QUERY SELECT false, 'No NIN on file for this profile'::TEXT;
    RETURN;
  END IF;

  -- Update profile to verified
  UPDATE pro_profiles
  SET nin_verified = true,
      nin_verified_at = now(),
      identity_verified_at = now(),
      verification_status = 'verified'
  WHERE id = p_profile_id;

  -- Approve pending verification requests
  UPDATE pro_verification_requests
  SET status = 'approved',
      reviewed_by = p_admin_id,
      reviewed_at = now()
  WHERE profile_id = p_profile_id
    AND request_type = 'identity'
    AND status = 'pending';

  -- Log to NIN verification audit log (for future reference / reports)
  INSERT INTO pro_nin_verification_log (
    profile_id, nin_number, verified_by, status,
    display_name_snapshot, business_name_snapshot,
    phone_number_snapshot, mobile_number_snapshot
  ) VALUES (
    p_profile_id, v_nin, p_admin_id, 'approved',
    v_display_name, v_business_name, v_phone, v_mobile
  );

  RETURN QUERY SELECT true, 'NIN verified and logged successfully'::TEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_nin(p_profile_id uuid, p_admin_id uuid, p_reason text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_nin TEXT;
BEGIN
  -- ENGINE #12 HARDENING: caller must BE the admin (JWT), not just pass an admin id
  IF p_admin_id IS DISTINCT FROM auth.uid()
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN QUERY SELECT false, 'not_admin'::TEXT;
    RETURN;
  END IF;
  PERFORM 1 FROM profiles WHERE id = p_admin_id AND role = 'admin';
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Only admins can reject NIN'::TEXT;
    RETURN;
  END IF;

  SELECT nin_number INTO v_nin FROM pro_profiles WHERE id = p_profile_id;
  IF v_nin IS NULL THEN
    RETURN QUERY SELECT false, 'No NIN on file'::TEXT;
    RETURN;
  END IF;

  -- Update profile
  UPDATE pro_profiles
  SET nin_verified = false,
      verification_status = 'rejected'
  WHERE id = p_profile_id;

  -- Update verification requests
  UPDATE pro_verification_requests
  SET status = 'rejected',
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      admin_notes = p_reason
  WHERE profile_id = p_profile_id
    AND request_type = 'identity'
    AND status = 'pending';

  -- Log rejection
  INSERT INTO pro_nin_verification_log (profile_id, nin_number, verified_by, status, notes)
  VALUES (p_profile_id, v_nin, p_admin_id, 'rejected', p_reason);

  RETURN QUERY SELECT true, 'NIN rejected'::TEXT;
END;
$function$;

-- Verification: client roles must no longer execute the locked helpers.
DO $$
DECLARE
  leaked text;
BEGIN
  SELECT routine_name || ' -> ' || grantee INTO leaked
  FROM information_schema.routine_privileges
  WHERE routine_schema = 'public'
    AND routine_name IN ('promote_to_admin', 'seed_reward_catalogue')
    AND grantee IN ('public', 'anon', 'authenticated')
  LIMIT 1;
  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'client role can still execute %', leaked;
  END IF;
END;
$$;
