-- =========================================================
-- FRELUX PAY: NOWPayments Multi-Crypto Gateway
-- Migration: 20261123100000_nowpayments_crypto_gateway.sql
--
-- Enables:
--  1. Extension of subscription_purchases provider check constraint for 'nowpayments'
--  2. Addition of provider column and nullable store_id in crypto_payment_invoices
-- =========================================================

-- 1. Extend subscription_purchases provider check constraint to allow 'nowpayments'
DO $$
BEGIN
  ALTER TABLE public.subscription_purchases
    DROP CONSTRAINT IF EXISTS subscription_purchases_provider_check;

  ALTER TABLE public.subscription_purchases
    ADD CONSTRAINT subscription_purchases_provider_check
    CHECK (provider IN ('paystack', 'flutterwave', 'btcpay', 'nowpayments'));
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- 2. Add provider column to crypto_payment_invoices if missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'crypto_payment_invoices'
  ) THEN
    -- Add provider column with default 'btcpay' to maintain backwards compatibility
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'crypto_payment_invoices' 
        AND column_name = 'provider'
    ) THEN
      ALTER TABLE public.crypto_payment_invoices
        ADD COLUMN provider TEXT NOT NULL DEFAULT 'btcpay';
    END IF;

    -- Make store_id nullable for non-BTCPay providers (e.g. NOWPayments uses API keys)
    ALTER TABLE public.crypto_payment_invoices
      ALTER COLUMN store_id DROP NOT NULL;
  END IF;
END $$;
