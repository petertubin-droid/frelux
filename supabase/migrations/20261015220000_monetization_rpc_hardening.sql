-- =============================================================
-- Monetization RPC hardening (handoff item G, 2026-10-14)
--
-- Closes three audit findings:
--   1. award_credits was executable by any authenticated (or even
--      anon) user directly via PostgREST, bypassing the award-credits
--      edge function's server-side event catalog — a user could mint
--      catalog amounts with self-chosen referenceIds, bounded only by
--      rate limiting. Now service-role only (edge function path).
--   2. award_credits used SELECT-then-INSERT idempotency and a
--      read-then-set wallet update (lost-update window under
--      concurrency). Now: per-user advisory lock + INSERT ... ON
--      CONFLICT DO NOTHING claim + balance = balance + p_amount.
--   3. complete_credit_task accepted any p_user_id from any caller
--      (default PUBLIC execute grant). Browser callers may now only
--      credit themselves (p_user_id = auth.uid()); service-role
--      edge functions (auth.uid() IS NULL) are exempt. Execute
--      revoked from PUBLIC and anon.
-- Client flows are unchanged: credits.ts awards through the
-- /award-credits edge function, and the profile-tasks flow calls
-- complete_credit_task with the signed-in user's own id.
-- =============================================================

-- ── 1+2. award_credits: atomic, race-free, service-role only ──
CREATE OR REPLACE FUNCTION public.award_credits(
  p_user_id UUID,
  p_event_type TEXT,
  p_reference_id TEXT,
  p_amount INTEGER,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, already_awarded BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
  v_claimed BOOLEAN;
BEGIN
  -- Serialize awards per user (same lock family as complete_credit_task)
  PERFORM pg_advisory_xact_lock(hashtext('frelux_credit_wallet:' || p_user_id::text));

  -- Atomic idempotency claim: the UNIQUE(user_id, event_type, reference_id)
  -- constraint IS the dedupe. A replayed event inserts zero rows and is a
  -- no-op; concurrent duplicates cannot both win.
  INSERT INTO public.reward_events (user_id, event_type, reference_id, credits_awarded)
  VALUES (p_user_id, p_event_type, p_reference_id, p_amount)
  ON CONFLICT (user_id, event_type, reference_id) DO NOTHING
  RETURNING TRUE INTO v_claimed;

  IF v_claimed IS NOT TRUE THEN
    SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = p_user_id;
    IF v_new_balance IS NULL THEN v_new_balance := 0; END IF;
    RETURN QUERY SELECT false, v_new_balance, true;
    RETURN;
  END IF;

  -- Ensure wallet exists, then increment atomically (never read-then-set)
  INSERT INTO public.credit_wallets (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.credit_wallets
  SET balance = credit_wallets.balance + p_amount,
      total_earned = credit_wallets.total_earned + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.credit_transactions (user_id, amount, type, reason, reference_id, balance_after, metadata)
  VALUES (p_user_id, p_amount, 'earn', p_reason, p_reference_id, v_new_balance, p_metadata);

  RETURN QUERY SELECT true, v_new_balance, false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_credits(UUID, TEXT, TEXT, INTEGER, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_credits(UUID, TEXT, TEXT, INTEGER, TEXT, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_credits(UUID, TEXT, TEXT, INTEGER, TEXT, JSONB) FROM anon;

-- ── 3. complete_credit_task: enforce caller identity ──
CREATE OR REPLACE FUNCTION public.complete_credit_task(
  p_task_id TEXT,
  p_user_id UUID,
  p_verification_ref TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, credits_awarded INTEGER, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_count INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock user's wallet
  PERFORM pg_advisory_xact_lock(hashtext('frelux_credit_wallet:' || p_user_id::text));

  -- Caller identity: browser (JWT) callers may only credit THEMSELVES.
  -- Service-role edge functions carry no auth.uid() and are exempt.
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN QUERY SELECT false, 0, 0, 'not_authorized'::TEXT;
    RETURN;
  END IF;

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
$$;

REVOKE EXECUTE ON FUNCTION public.complete_credit_task(TEXT, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_credit_task(TEXT, UUID, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_credit_task(TEXT, UUID, TEXT, JSONB) TO authenticated;
