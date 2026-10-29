-- =========================================================
-- Reward redemptions must actually grant the promised benefit
-- 2026-10-29
--
-- Bug reported by the owner: "Redeeming FRELUX AI credits deducts instead
-- of adding." Reproduced against production data — 4 x "Redeemed: AI
-- Estimate Token" at 100 credits each, every reward_redemptions row still
-- consumed_at IS NULL, and 400 credits gone.
--
-- Phase 41 wired calc_unlock only. pdf_export and premium_week were sold
-- from the rewards catalogue with no grant at all, and ai_token was only
-- honoured by ai-color-consult, never by the AI gateway that the estimators
-- actually use. So the user paid and received nothing.
--
-- This migration teaches redeem_reward to grant every reward type it sells:
--   calc_unlock  -> rewarded_unlock_log (unchanged)
--   pdf_export   -> pdf_export_unlocks, 24h, consumable by brand-studio
--   premium_week -> user_paid_status extended by 7 days
--   ai_token     -> stays unconsumed for consume_reward_grant; the AI
--                   gateway consumes it before charging credits (deployed
--                   together with this migration)
--
-- Idempotent: CREATE OR REPLACE only.
-- =========================================================

CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_user_id UUID,
  p_reward_key TEXT,
  p_idempotency_key TEXT,
  p_client_hash TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward RECORD;
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_existing_key TEXT;
  v_redemption_id UUID;
BEGIN
  -- Idempotency: a replayed redemption never charges twice
  SELECT reference_id INTO v_existing_key
  FROM public.credit_transactions
  WHERE user_id = p_user_id AND reference_id = p_idempotency_key
  LIMIT 1;

  IF v_existing_key IS NOT NULL THEN
    SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = p_user_id;
    IF v_new_balance IS NULL THEN v_new_balance := 0; END IF;
    RETURN QUERY SELECT true, v_new_balance, 'already_redeemed';
    RETURN;
  END IF;

  SELECT * INTO v_reward FROM public.reward_catalogue
  WHERE reward_key = p_reward_key AND is_enabled = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'reward_not_found';
    RETURN;
  END IF;

  -- Serialize per user so two concurrent redeems cannot both pass the
  -- balance check (same lock family as award_credits / spend_credits).
  PERFORM pg_advisory_xact_lock(hashtext('frelux_credit_wallet:' || p_user_id::text));

  SELECT balance INTO v_balance FROM public.credit_wallets WHERE user_id = p_user_id;
  IF v_balance IS NULL THEN v_balance := 0; END IF;

  IF v_balance < v_reward.credit_cost THEN
    RETURN QUERY SELECT false, v_balance, 'insufficient_credits';
    RETURN;
  END IF;

  v_new_balance := v_balance - v_reward.credit_cost;

  UPDATE public.credit_wallets
  SET balance = v_new_balance,
      total_spent = total_spent + v_reward.credit_cost,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, reason, reference_id, balance_after, metadata)
  VALUES (
    p_user_id,
    -v_reward.credit_cost,
    'spend',
    'Redeemed: ' || v_reward.name,
    p_idempotency_key,
    v_new_balance,
    jsonb_build_object('reward_key', p_reward_key, 'reward_id', v_reward.id, 'reward_type', v_reward.reward_type)
  );

  INSERT INTO public.reward_redemptions (user_id, reward_id, reward_key, reward_type, credits_spent, status, metadata)
  VALUES (
    p_user_id, v_reward.id, p_reward_key, v_reward.reward_type,
    v_reward.credit_cost, 'completed',
    jsonb_build_object('idempotency_key', p_idempotency_key)
  )
  RETURNING id INTO v_redemption_id;

  -- ── calc_unlock: 24h access via the table RewardedFeatureGate reads ──
  IF v_reward.reward_type = 'calc_unlock' AND p_client_hash IS NOT NULL THEN
    INSERT INTO public.rewarded_unlock_log (tool_key, user_id, client_hash, expires_at, ad_provider)
    VALUES ('advanced_calculator', p_user_id, p_client_hash, now() + interval '24 hours', 'frelux_credits');

    UPDATE public.reward_redemptions
    SET consumed_at = now(), consumed_context = jsonb_build_object('granted_via', 'rewarded_unlock_log')
    WHERE id = v_redemption_id;

  -- ── pdf_export: 24h export unlock via the table brand-studio reads ──
  ELSIF v_reward.reward_type = 'pdf_export' THEN
    INSERT INTO public.pdf_export_unlocks
      (user_id, client_hash, tool_key, unlock_type, unlocked_at, expires_at, is_consumed, ad_provider)
    VALUES
      (p_user_id, p_client_hash, 'brand_studio_pdf', 'credits', now(), now() + interval '24 hours', false, 'frelux_credits');

    UPDATE public.reward_redemptions
    SET consumed_at = now(), consumed_context = jsonb_build_object('granted_via', 'pdf_export_unlocks')
    WHERE id = v_redemption_id;

  -- ── premium_week: extend paid access by 7 days ──
  ELSIF v_reward.reward_type = 'premium_week' THEN
    INSERT INTO public.user_paid_status (user_id, is_paid, plan, paid_until, payment_provider, updated_at)
    VALUES (p_user_id, true, 'premium', now() + interval '7 days', 'frelux_credits', now())
    ON CONFLICT (user_id) DO UPDATE
    SET is_paid = true,
        plan = CASE WHEN public.user_paid_status.plan IN ('premium', 'pro') THEN public.user_paid_status.plan ELSE 'premium' END,
        paid_until = GREATEST(
          COALESCE(public.user_paid_status.paid_until, now()),
          now()
        ) + interval '7 days',
        payment_provider = COALESCE(public.user_paid_status.payment_provider, 'frelux_credits'),
        updated_at = now();

    UPDATE public.reward_redemptions
    SET consumed_at = now(), consumed_context = jsonb_build_object('granted_via', 'user_paid_status')
    WHERE id = v_redemption_id;

  -- ── ai_token: left unconsumed for consume_reward_grant (AI gateway) ──
  END IF;

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.redeem_reward(UUID, TEXT, TEXT, TEXT) IS
  'Charges credits for a catalogue reward and grants the benefit: calc_unlock -> rewarded_unlock_log, pdf_export -> pdf_export_unlocks, premium_week -> user_paid_status +7d, ai_token -> redeemed row consumed later by consume_reward_grant.';
