-- =========================================================
-- FRELUX AI Access Control: 4 Daily Ads Limit & Guest Ad Unlock
-- Migration: 20261014030000_unpaid_daily_ad_limit_and_guest_ad_unlock.sql
-- =========================================================

-- 1. Authoritatively set daily ad limit for unpaid users to 4 times daily (4 ads * 5 credits = 20 credits max/day)
UPDATE public.rewarded_ad_credit_config
SET credits_per_ad = 5,
    daily_earn_limit = 4,
    min_interval_seconds = 15,
    cooldown_seconds = 30
WHERE id = 1;

-- 2. Update award_ad_credits RPC to enforce daily_earn_limit = 4 strictly
CREATE OR REPLACE FUNCTION public.award_ad_credits(
  p_user_id UUID,
  p_ad_provider TEXT,
  p_ad_event_id TEXT,
  p_amount INTEGER,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, already_awarded BOOLEAN, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_config RECORD;
  v_daily_count INTEGER;
  v_today DATE := CURRENT_DATE;
  v_recent_event TIMESTAMPTZ;
  v_min_interval INTEGER;
BEGIN
  -- Serialize wallet mutations for this user
  PERFORM pg_advisory_xact_lock(hashtext('frelux_credit_wallet:' || p_user_id::text));

  -- Idempotency check: check if this exact ad event already awarded credits
  SELECT id INTO v_existing FROM public.rewarded_ad_credit_events
  WHERE user_id = p_user_id AND ad_provider = p_ad_provider AND ad_event_id = p_ad_event_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = p_user_id;
    IF v_new_balance IS NULL THEN v_new_balance := 0; END IF;
    RETURN QUERY SELECT false, v_new_balance, true, 'already_awarded'::TEXT;
    RETURN;
  END IF;

  -- Load configuration
  SELECT * INTO v_config FROM public.rewarded_ad_credit_config WHERE id = 1;
  IF v_config IS NULL THEN
    RETURN QUERY SELECT false, 0, false, 'config_not_found'::TEXT;
    RETURN;
  END IF;

  IF NOT v_config.is_enabled THEN
    RETURN QUERY SELECT false, 0, false, 'rewarded_ads_disabled'::TEXT;
    RETURN;
  END IF;

  -- Verify amount matches configured credits_per_ad (5 credits)
  IF p_amount != v_config.credits_per_ad THEN
    RETURN QUERY SELECT false, 0, false, 'amount_mismatch'::TEXT;
    RETURN;
  END IF;

  -- Enforce daily ad limit (max 4 ads daily for unpaid users)
  SELECT COUNT(*) INTO v_daily_count
  FROM public.rewarded_ad_credit_events
  WHERE user_id = p_user_id AND status = 'completed'
    AND created_at >= v_today::TIMESTAMPTZ;

  IF v_daily_count >= v_config.daily_earn_limit THEN
    SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = p_user_id;
    IF v_new_balance IS NULL THEN v_new_balance := 0; END IF;
    RETURN QUERY SELECT false, v_new_balance, false, 'daily_earn_limit'::TEXT;
    RETURN;
  END IF;

  -- Check cooldown / minimum interval
  v_min_interval := v_config.min_interval_seconds;
  IF v_min_interval > 0 THEN
    SELECT created_at INTO v_recent_event
    FROM public.rewarded_ad_credit_events
    WHERE user_id = p_user_id AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_recent_event IS NOT NULL THEN
      IF EXTRACT(EPOCH FROM (now() - v_recent_event)) < v_min_interval THEN
        SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = p_user_id;
        IF v_new_balance IS NULL THEN v_new_balance := 0; END IF;
        RETURN QUERY SELECT false, v_new_balance, false, 'min_interval_not_met'::TEXT;
        RETURN;
      END IF;
    END IF;
  END IF;

  -- Get or initialize wallet
  SELECT balance INTO v_current_balance FROM public.credit_wallets WHERE user_id = p_user_id;
  IF v_current_balance IS NULL THEN
    INSERT INTO public.credit_wallets (user_id, balance, total_earned, total_spent)
    VALUES (p_user_id, 0, 0, 0);
    v_current_balance := 0;
  END IF;

  -- Credit wallet atomically
  UPDATE public.credit_wallets
  SET balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- Record ad credit event
  INSERT INTO public.rewarded_ad_credit_events (
    user_id, ad_provider, ad_event_id, credits_awarded, status, metadata
  )
  VALUES (
    p_user_id, p_ad_provider, p_ad_event_id, p_amount, 'completed', p_metadata
  );

  -- Record transaction ledger entry
  INSERT INTO public.credit_transactions (
    user_id, amount, type, reason, reference_id, balance_after, metadata
  )
  VALUES (
    p_user_id,
    p_amount,
    'bonus',
    'Watched rewarded ad (' || p_ad_provider || ')',
    'ad_' || p_ad_event_id,
    v_new_balance,
    jsonb_build_object('ad_provider', p_ad_provider, 'ad_event_id', p_ad_event_id) || p_metadata
  );

  RETURN QUERY SELECT true, v_new_balance, false, NULL::TEXT;
END;
$$;

-- 3. RPC: unlock_guest_daily_ai_allowance
-- Unlocks 1 guest AI operation for today AFTER watching a verified ad
CREATE OR REPLACE FUNCTION public.unlock_guest_daily_ai_allowance(
  p_client_hash TEXT,
  p_ad_provider TEXT,
  p_ad_event_id TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(success BOOLEAN, has_ad_credit BOOLEAN, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_existing RECORD;
BEGIN
  IF p_client_hash IS NULL OR length(trim(p_client_hash)) = 0 THEN
    RETURN QUERY SELECT false, false, 'client_hash_required'::TEXT;
    RETURN;
  END IF;

  -- Check if guest already has an entry today
  SELECT * INTO v_existing
  FROM public.ai_gateway_daily_allowance
  WHERE client_hash = p_client_hash AND usage_date = v_today AND user_id IS NULL;

  -- If guest already consumed their 1 operation, block ad unlock (must register)
  IF v_existing IS NOT NULL AND v_existing.operations_used >= 1 THEN
    RETURN QUERY SELECT false, false, 'guest_limit_already_consumed'::TEXT;
    RETURN;
  END IF;

  -- Upsert allowance row with has_ad_credit = true
  INSERT INTO public.ai_gateway_daily_allowance (
    client_hash, usage_date, has_ad_credit, ad_credit_granted_at, ad_provider, ad_event_id, operations_used, operations_reserved
  )
  VALUES (
    p_client_hash, v_today, true, now(), p_ad_provider, p_ad_event_id, 0, 0
  )
  ON CONFLICT (client_hash, usage_date) WHERE user_id IS NULL
  DO UPDATE SET
    has_ad_credit = true,
    ad_credit_granted_at = now(),
    ad_provider = p_ad_provider,
    ad_event_id = p_ad_event_id,
    updated_at = now();

  RETURN QUERY SELECT true, true, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_guest_daily_ai_allowance TO anon, authenticated, service_role;
