-- =========================================================
-- International token purchases — charge credits in non-naira
-- currencies via Flutterwave (worldwide-first payments).
--
-- Adds:
-- 1. token_purchase_prices — admin-managed per-currency token pack
--    prices (minor units, e.g. 99 = $0.99). One active price per
--    currency. NGN stays on token_purchase_config.price_kobo and the
--    Paystack flow; every other configured currency is charged via
--    flutterwave-checkout with the price read server-side from here.
-- 2. token_purchases.currency — the ledger records what currency the
--    amount was actually charged in (amount_kobo holds that
--    currency's minor units for non-NGN rows).
-- 3. credit_token_purchase is recreated with p_currency/p_gateway so
--    the ledger and the credit transaction metadata stay honest.
--    Idempotency is unchanged: keyed on the gateway reference.
--
-- Fully re-runnable: guards on every object.
-- =========================================================

-- 1. Per-currency token pack prices
CREATE TABLE IF NOT EXISTS public.token_purchase_prices (
  currency_code TEXT PRIMARY KEY,
  price_minor   INTEGER NOT NULL CHECK (price_minor > 0),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Ledger currency
ALTER TABLE public.token_purchases
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';

-- =========================================================
-- RLS: prices are public (the Buy Tokens card shows the exact
-- charge); only admins write them. Ledger access is unchanged.
-- =========================================================
ALTER TABLE public.token_purchase_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_purchase_prices_read_all" ON public.token_purchase_prices;
CREATE POLICY "token_purchase_prices_read_all" ON public.token_purchase_prices
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "token_purchase_prices_admin_write" ON public.token_purchase_prices;
CREATE POLICY "token_purchase_prices_admin_write" ON public.token_purchase_prices
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =========================================================
-- 3. Crediting RPC — currency + gateway aware
-- =========================================================
CREATE OR REPLACE FUNCTION public.credit_token_purchase(
  p_user_id UUID,
  p_reference TEXT,
  p_tokens INTEGER,
  p_amount_kobo INTEGER,
  p_metadata JSONB DEFAULT '{}',
  p_currency TEXT DEFAULT 'NGN',
  p_gateway TEXT DEFAULT 'paystack'
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER, already_credited BOOLEAN, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing RECORD;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Idempotency: if this gateway reference was already credited, do nothing
  SELECT id, tokens_credited INTO v_existing
  FROM public.token_purchases
  WHERE reference = p_reference
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = p_user_id;
    IF v_new_balance IS NULL THEN v_new_balance := 0; END IF;
    RETURN QUERY SELECT true, v_new_balance, true, NULL::TEXT;
    RETURN;
  END IF;

  -- Validate inputs (defence in depth; edge functions pass server-side values)
  IF p_tokens IS NULL OR p_tokens <= 0 THEN
    RETURN QUERY SELECT false, 0, false, 'invalid_token_amount'::TEXT;
    RETURN;
  END IF;
  IF p_amount_kobo IS NULL OR p_amount_kobo <= 0 THEN
    RETURN QUERY SELECT false, 0, false, 'invalid_price'::TEXT;
    RETURN;
  END IF;

  -- Credit the wallet atomically (create wallet if this is the user's first credit)
  SELECT balance INTO v_balance FROM public.credit_wallets WHERE user_id = p_user_id;
  IF v_balance IS NULL THEN
    INSERT INTO public.credit_wallets (user_id, balance, total_earned)
    VALUES (p_user_id, p_tokens, p_tokens)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.credit_wallets.balance + EXCLUDED.balance,
          total_earned = public.credit_wallets.total_earned + EXCLUDED.total_earned,
          updated_at = now();
    SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = p_user_id;
  ELSE
    v_new_balance := v_balance + p_tokens;
    UPDATE public.credit_wallets
    SET balance = v_new_balance,
        total_earned = total_earned + p_tokens,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Record in the immutable ledger (amount_kobo holds the charged
  -- currency's minor units; currency says which one)
  INSERT INTO public.credit_transactions (user_id, amount, type, reason, reference_id, balance_after, metadata)
  VALUES (
    p_user_id,
    p_tokens,
    'earn',
    'Token Purchase',
    p_reference,
    v_new_balance,
    jsonb_build_object(
      'source', p_gateway,
      'amount_minor', p_amount_kobo,
      'currency', coalesce(p_currency, 'NGN'),
      'tokens', p_tokens
    ) || p_metadata
  );

  -- Record the purchase for revenue reporting
  INSERT INTO public.token_purchases
    (user_id, reference, amount_kobo, tokens_credited, status, paystack_data, currency)
  VALUES
    (p_user_id, p_reference, p_amount_kobo, p_tokens, 'completed', p_metadata, coalesce(p_currency, 'NGN'));

  RETURN QUERY SELECT true, v_new_balance, false, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_token_purchase TO service_role;

-- =========================================================
-- PRIVILEGES (anon/authenticated/service_role need table grants
-- when the migration runs outside the default Supabase privilege
-- path, e.g. via the Management API)
-- =========================================================
GRANT SELECT ON public.token_purchase_prices TO anon, authenticated, service_role;
