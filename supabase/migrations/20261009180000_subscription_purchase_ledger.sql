-- =========================================================
-- Subscription Purchase Ledger (idempotent activation)
-- Date: 2026-10-09
--
-- DEFECT (full-site audit, Phase 7): both paystack-verify and
-- paystack-webhook (and their Flutterwave twins) activated
-- subscriptions with a bare user_paid_status upsert, computing
-- paid_until = now() + plan days on EVERY call. Replaying the SAME
-- successful payment reference re-extended paid_until each time,
-- so one genuine payment could be replayed forever for a free
-- lifetime subscription. Token purchases already had a
-- reference-unique ledger (token_purchases) making them
-- idempotent; subscriptions had none.
--
-- NEW TABLE: subscription_purchases — immutable, reference-unique
--   ledger of subscription payments (service-role writes only).
--
-- NEW FUNCTION: apply_subscription_purchase — atomic, idempotent
--   activation RPC. Inserts the ledger row ON CONFLICT DO NOTHING;
--   only a NEW reference can move paid_until forward. Called by
--   the four activation sites (paystack-verify, paystack-webhook,
--   flutterwave-verify, flutterwave-webhook) AFTER they have done
--   their own provider verification, signature validation and
--   server-side price validation.
--
-- Reversibility: this migration is additive. To revert:
--   DROP FUNCTION IF EXISTS public.apply_subscription_purchase;
--   DROP TABLE IF EXISTS public.subscription_purchases;
-- =========================================================

CREATE TABLE IF NOT EXISTS public.subscription_purchases (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider             TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave')),
  reference            TEXT NOT NULL,
  plan                 TEXT NOT NULL,
  billing_cycle        TEXT NOT NULL,
  amount_kobo          INTEGER NOT NULL CHECK (amount_kobo > 0),
  currency             TEXT NOT NULL DEFAULT 'NGN',
  days_granted         INTEGER NOT NULL CHECK (days_granted > 0),
  paid_until_granted   TIMESTAMPTZ NOT NULL,
  provider_customer_id TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, reference)
);

CREATE INDEX IF NOT EXISTS idx_subscription_purchases_user
  ON public.subscription_purchases(user_id, created_at DESC);

ALTER TABLE public.subscription_purchases ENABLE ROW LEVEL SECURITY;

-- No client policies on purpose: only edge functions acting with the
-- service role write/read this ledger.

-- =========================================================
-- FUNCTION: apply_subscription_purchase
-- Idempotent subscription activation:
--   1. INSERT the (provider, reference) ledger row ON CONFLICT DO NOTHING.
--   2. Only if the row was newly inserted (a genuinely NEW payment
--      reference), upsert user_paid_status
--      with paid_until = now() + days (same grant semantics the
--      previous inline code used, but now granted exactly once per
--      payment reference).
-- Returns { applied: boolean, already_applied: boolean, paid_until: timestamptz | null }
-- =========================================================

CREATE OR REPLACE FUNCTION public.apply_subscription_purchase(
  p_user_id              UUID,
  p_provider             TEXT,
  p_reference            TEXT,
  p_plan                 TEXT,
  p_billing_cycle        TEXT,
  p_amount_kobo          INTEGER,
  p_days                 INTEGER,
  p_currency             TEXT DEFAULT 'NGN',
  p_provider_customer_id TEXT DEFAULT NULL
)
RETURNS TABLE (applied BOOLEAN, already_applied BOOLEAN, paid_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid_until TIMESTAMPTZ;
  v_inserted   BOOLEAN := FALSE;
BEGIN
  IF p_user_id IS NULL OR p_provider IS NULL OR p_reference IS NULL
     OR p_plan IS NULL OR p_billing_cycle IS NULL OR p_days IS NULL
     OR p_days <= 0 OR p_amount_kobo IS NULL OR p_amount_kobo <= 0 THEN
    RAISE EXCEPTION 'invalid subscription purchase arguments';
  END IF;

  INSERT INTO public.subscription_purchases (
    user_id, provider, reference, plan, billing_cycle,
    amount_kobo, currency, days_granted, paid_until_granted,
    provider_customer_id
  ) VALUES (
    p_user_id, p_provider, p_reference, p_plan, p_billing_cycle,
    p_amount_kobo, COALESCE(p_currency, 'NGN'), p_days,
    now() + make_interval(days => p_days), p_provider_customer_id
  )
  ON CONFLICT (provider, reference) DO NOTHING;

  v_inserted := FOUND;

  IF NOT v_inserted THEN
    -- The (provider, reference) pair was already processed.
    RETURN QUERY SELECT FALSE, TRUE, NULL::timestamptz;
    RETURN;
  END IF;

  v_paid_until := now() + make_interval(days => p_days);

  INSERT INTO public.user_paid_status (
    user_id, is_paid, plan, paid_until,
    payment_provider, provider_customer_id, updated_at
  ) VALUES (
    p_user_id, TRUE, p_plan, v_paid_until,
    p_provider, p_provider_customer_id, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_paid              = TRUE,
    plan                 = EXCLUDED.plan,
    paid_until           = EXCLUDED.paid_until,
    payment_provider     = EXCLUDED.payment_provider,
    provider_customer_id = COALESCE(EXCLUDED.provider_customer_id, user_paid_status.provider_customer_id),
    updated_at           = now();

  RETURN QUERY SELECT TRUE, FALSE, v_paid_until;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_subscription_purchase TO service_role;
