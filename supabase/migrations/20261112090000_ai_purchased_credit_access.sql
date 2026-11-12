-- =========================================================
-- AI access: paid subscribers, or purchased AI credits.
--
-- Owner rule (12 Nov 2026): AI is for paid subscribers. A user
-- without a subscription may still use it by BUYING AI credits,
-- not by farming rewarded ads or task bonuses. That distinction
-- did not exist in the data: bought tokens and earned credits both
-- landed in credit_wallets.balance, so nothing could tell them
-- apart at spend time.
--
-- This migration adds the second bucket and the two RPCs the edge
-- paywall needs, and keeps the existing credit economy untouched
-- for everything that is not AI.
-- =========================================================

-- 1. Second bucket: credits the user actually paid for.
ALTER TABLE public.credit_wallets
  ADD COLUMN IF NOT EXISTS purchased_balance integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.credit_wallets.purchased_balance IS
  'Credits bought through the token shop (token_purchases). Only this bucket may pay for AI when the user has no paid subscription.';

-- 2. Every credited token purchase tops up the purchased bucket too.
--    The trigger runs after the row exists, so the RPC keeps its
--    reference-based idempotency: a replayed reference inserts nothing
--    and therefore credits nothing twice.
CREATE OR REPLACE FUNCTION public.credit_wallets_on_token_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.credit_wallets (user_id, purchased_balance)
  VALUES (NEW.user_id, NEW.tokens_credited)
  ON CONFLICT (user_id) DO UPDATE
    SET purchased_balance = public.credit_wallets.purchased_balance + NEW.tokens_credited,
        updated_at = now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_credit_wallets_on_token_purchase ON public.token_purchases;
CREATE TRIGGER trg_credit_wallets_on_token_purchase
  AFTER INSERT ON public.token_purchases
  FOR EACH ROW
  WHEN (NEW.tokens_credited > 0)
  EXECUTE FUNCTION public.credit_wallets_on_token_purchase();

-- Backfill from existing purchases (there are none today, but the
-- statement keeps this correct on any other environment).
UPDATE public.credit_wallets w
SET purchased_balance = COALESCE(p.total, 0)
FROM (
  SELECT user_id, SUM(tokens_credited)::integer AS total
  FROM public.token_purchases
  GROUP BY user_id
) p
WHERE p.user_id = w.user_id;

-- 3. Spend one AI operation from the purchased bucket only.
--    Atomic under the same per-user advisory lock the rest of the
--    credit economy uses, idempotent on the caller's key, and it
--    never touches earned credits.
CREATE OR REPLACE FUNCTION public.spend_purchased_ai_credits(
  p_user_id uuid,
  p_amount integer,
  p_feature_key text,
  p_idempotency_key text
)
RETURNS TABLE(success boolean, purchased_balance integer, wallet_balance integer, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_purchased INTEGER;
  v_balance INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0, 0, 'invalid_request'::TEXT;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('frelux_credit_wallet:' || p_user_id::text));

  IF EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = p_user_id AND reference_id = p_idempotency_key
  ) THEN
    SELECT w.purchased_balance, w.balance INTO v_purchased, v_balance
    FROM public.credit_wallets w WHERE w.user_id = p_user_id;
    RETURN QUERY SELECT true, COALESCE(v_purchased, 0), COALESCE(v_balance, 0), 'already_spent'::TEXT;
    RETURN;
  END IF;

  SELECT w.purchased_balance, w.balance INTO v_purchased, v_balance
  FROM public.credit_wallets w WHERE w.user_id = p_user_id;

  IF COALESCE(v_purchased, 0) < p_amount THEN
    RETURN QUERY SELECT false, COALESCE(v_purchased, 0), COALESCE(v_balance, 0), 'insufficient_purchased_credits'::TEXT;
    RETURN;
  END IF;

  UPDATE public.credit_wallets w
  SET purchased_balance = w.purchased_balance - p_amount,
      balance = GREATEST(w.balance - p_amount, 0),
      total_spent = w.total_spent + p_amount,
      updated_at = now()
  WHERE w.user_id = p_user_id
  RETURNING w.purchased_balance, w.balance INTO v_purchased, v_balance;

  INSERT INTO public.credit_transactions (
    user_id, amount, type, reason, reference_id, balance_after, metadata
  ) VALUES (
    p_user_id, -p_amount, 'spend', 'AI operation (purchased credit)',
    p_idempotency_key, v_balance,
    jsonb_build_object('feature_key', p_feature_key, 'bucket', 'purchased')
  );

  RETURN QUERY SELECT true, v_purchased, v_balance, NULL::TEXT;
END;
$function$;

-- 4. Refund a purchased credit when the AI call itself fails, so a
--    provider error never costs the buyer an operation.
CREATE OR REPLACE FUNCTION public.refund_purchased_ai_credits(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text
)
RETURNS TABLE(success boolean, purchased_balance integer, wallet_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_purchased INTEGER;
  v_balance INTEGER;
  v_refund_key TEXT := p_idempotency_key || ':refund';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('frelux_credit_wallet:' || p_user_id::text));

  IF EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = p_user_id AND reference_id = v_refund_key
  ) THEN
    SELECT w.purchased_balance, w.balance INTO v_purchased, v_balance
    FROM public.credit_wallets w WHERE w.user_id = p_user_id;
    RETURN QUERY SELECT true, COALESCE(v_purchased, 0), COALESCE(v_balance, 0);
    RETURN;
  END IF;

  UPDATE public.credit_wallets w
  SET purchased_balance = w.purchased_balance + p_amount,
      balance = w.balance + p_amount,
      total_spent = GREATEST(w.total_spent - p_amount, 0),
      updated_at = now()
  WHERE w.user_id = p_user_id
  RETURNING w.purchased_balance, w.balance INTO v_purchased, v_balance;

  INSERT INTO public.credit_transactions (
    user_id, amount, type, reason, reference_id, balance_after, metadata
  ) VALUES (
    p_user_id, p_amount, 'earn', 'AI operation refunded (provider failure)',
    v_refund_key, v_balance, jsonb_build_object('bucket', 'purchased')
  );

  RETURN QUERY SELECT true, COALESCE(v_purchased, 0), COALESCE(v_balance, 0);
END;
$function$;

-- 5. Edge functions only. A client must never be able to burn or mint
--    its own purchased credits.
REVOKE ALL ON FUNCTION public.spend_purchased_ai_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_purchased_ai_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_purchased_ai_credits(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_purchased_ai_credits(uuid, integer, text) TO service_role;
