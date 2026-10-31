-- =========================================================
-- Guest AI: tunable limits and a platform-wide cost ceiling
-- Migration: 20261031150000_guest_ai_cost_ceiling.sql
--
-- unlock_guest_daily_ai_allowance is anon-callable and grants a
-- credit from a caller-supplied p_client_hash with no ad
-- verification. Every existing guard keys on that hash, so a caller
-- that sends a fresh hash each time bypasses all of them.
--
-- This migration does not pretend to authenticate the guest. It
-- bounds the damage: a per-hash operations limit and a platform-wide
-- daily ceiling on guest unlocks, so total guest AI spend per day has
-- a hard maximum no matter how many hashes arrive. Both are config,
-- not constants, so the owner can tighten them without a code change.
-- =========================================================

ALTER TABLE public.rewarded_ad_credit_config
  ADD COLUMN IF NOT EXISTS guest_operations_per_day INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS guest_global_unlocks_per_day INTEGER NOT NULL DEFAULT 200;

COMMENT ON COLUMN public.rewarded_ad_credit_config.guest_operations_per_day IS
  'AI operations a guest may consume per day. Deliberately tighter than anything a signed-in user receives.';
COMMENT ON COLUMN public.rewarded_ad_credit_config.guest_global_unlocks_per_day IS
  'Platform-wide ceiling on guest ad unlocks per day across ALL client hashes. Bounds total guest AI spend even if hashes are forged.';

-- Supports the global daily count without scanning the whole table.
CREATE INDEX IF NOT EXISTS idx_ai_gateway_daily_allowance_guest_today
  ON public.ai_gateway_daily_allowance (usage_date)
  WHERE user_id IS NULL;

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
  v_config RECORD;
  v_global_today INTEGER;
BEGIN
  IF p_client_hash IS NULL OR length(trim(p_client_hash)) = 0 THEN
    RETURN QUERY SELECT false, false, 'client_hash_required'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_config FROM public.rewarded_ad_credit_config WHERE id = 1;
  IF v_config IS NULL THEN
    RETURN QUERY SELECT false, false, 'config_not_found'::TEXT;
    RETURN;
  END IF;

  -- Platform-wide ceiling first: this is the limit that survives a
  -- forged hash, so it is checked before any per-guest logic.
  SELECT COUNT(*) INTO v_global_today
  FROM public.ai_gateway_daily_allowance
  WHERE usage_date = v_today
    AND user_id IS NULL
    AND has_ad_credit;

  IF v_global_today >= v_config.guest_global_unlocks_per_day THEN
    RETURN QUERY SELECT false, false, 'guest_capacity_reached'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_existing
  FROM public.ai_gateway_daily_allowance
  WHERE client_hash = p_client_hash AND usage_date = v_today AND user_id IS NULL;

  -- One unlock per guest per day: an ad already granted today cannot
  -- be granted again by replaying the call.
  IF v_existing IS NOT NULL AND v_existing.has_ad_credit THEN
    RETURN QUERY SELECT false, true, 'guest_unlock_already_granted'::TEXT;
    RETURN;
  END IF;

  -- Consumed allowance cannot be topped up by another ad. The limit
  -- comes from config so the owner can tighten it to zero to close
  -- guest AI entirely without touching code.
  IF v_existing IS NOT NULL
     AND v_existing.operations_used >= v_config.guest_operations_per_day THEN
    RETURN QUERY SELECT false, false, 'guest_limit_already_consumed'::TEXT;
    RETURN;
  END IF;

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
