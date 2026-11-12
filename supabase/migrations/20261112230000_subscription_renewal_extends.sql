-- =========================================================
-- Subscription renewals extend instead of restarting
-- Migration: 20261112230000_subscription_renewal_extends.sql
--
-- Bug: apply_subscription_purchase wrote
--     paid_until = EXCLUDED.paid_until        -- now() + days
-- so every activation *reset* the paid window instead of extending it. A user
-- with 20 days left who renewed for a month dropped to 30 days from today, and
-- an annual subscriber who renewed monthly lost the rest of the year. That is
-- the customer's money discarded by a bookkeeping bug, and it also hides
-- renewal revenue in reporting because the granted window no longer matches what
-- was sold.
--
-- Fix: grant from the later of "now" and the existing expiry,
--     paid_until = GREATEST(coalesce(paid_until, now()), now()) + days
-- so early renewals stack, lapsed plans restart from today, and the ledger row
-- still records the window each payment bought.
--
-- Everything else about the function is unchanged: same idempotency on
-- (provider, reference), same argument validation, same single-row upsert.
--
-- Rollback:
--   Re-apply the body from 20261009180000_subscription_purchase_ledger.sql,
--   which restores `paid_until = EXCLUDED.paid_until`. No data migration is
--   needed either way: subscription_purchases rows are unchanged by this file.
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
  v_extends_from TIMESTAMPTZ;
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

  -- Early renewal stacks on what is left; a lapsed plan restarts from today.
  SELECT GREATEST(COALESCE(paid_until, now()), now())
    INTO v_extends_from
    FROM public.user_paid_status
   WHERE user_id = p_user_id;

  IF v_extends_from IS NULL THEN
    v_extends_from := now();
  END IF;

  v_paid_until := v_extends_from + make_interval(days => p_days);

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

-- Same privileges as before: activation is a service-role-only act.
REVOKE ALL ON FUNCTION public.apply_subscription_purchase(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_purchase(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT
) TO service_role;
