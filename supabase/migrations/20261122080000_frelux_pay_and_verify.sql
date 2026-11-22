-- =========================================================
-- FRELUX PAY (BTCPay Server) & FRELUX VERIFY (OpenTimestamps)
-- Migration: 20261122080000_frelux_pay_and_verify.sql
--
-- Enables:
--  1. Bitcoin payment invoices & transactions via BTCPay Server
--  2. OpenTimestamps blockchain document proofs for BOQs & Estimates
--  3. Verification audit logs & tamper detection
--  4. Idempotent subscription ledger integration for 'btcpay'
-- =========================================================

-- 1. Extend subscription_purchases provider check constraint
DO $$
BEGIN
  ALTER TABLE public.subscription_purchases
    DROP CONSTRAINT IF EXISTS subscription_purchases_provider_check;
  
  ALTER TABLE public.subscription_purchases
    ADD CONSTRAINT subscription_purchases_provider_check
    CHECK (provider IN ('paystack', 'flutterwave', 'btcpay'));
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- 2. Bitcoin Payment Invoices Table
CREATE TABLE IF NOT EXISTS public.crypto_payment_invoices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id           TEXT UNIQUE NOT NULL,
  store_id             TEXT NOT NULL,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose              TEXT NOT NULL DEFAULT 'subscription'
                         CHECK (purpose IN ('subscription', 'token_purchase', 'tool_service', 'escrow')),
  plan_id              TEXT,
  billing_cycle        TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount_fiat          NUMERIC(14, 2) NOT NULL CHECK (amount_fiat >= 0),
  currency_fiat        TEXT NOT NULL DEFAULT 'USD',
  amount_btc           NUMERIC(18, 8) CHECK (amount_btc >= 0),
  amount_sats          BIGINT CHECK (amount_sats >= 0),
  btc_address          TEXT,
  payment_method       TEXT NOT NULL DEFAULT 'BTC',
  status               TEXT NOT NULL DEFAULT 'Pending'
                         CHECK (status IN ('Pending', 'Processing', 'Confirmed', 'Expired', 'Failed', 'Refunded')),
  additional_status    TEXT NOT NULL DEFAULT 'None',
  rate_fiat            NUMERIC(18, 4),
  rate_usd             NUMERIC(18, 4),
  checkout_url         TEXT,
  redirect_url         TEXT,
  qr_code_data         TEXT,
  expires_at           TIMESTAMPTZ NOT NULL,
  confirmed_at         TIMESTAMPTZ,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crypto_invoices_user ON public.crypto_payment_invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_invoices_status ON public.crypto_payment_invoices(status);
CREATE INDEX IF NOT EXISTS idx_crypto_invoices_invoice_id ON public.crypto_payment_invoices(invoice_id);

-- 3. Bitcoin Payment Transactions Ledger
CREATE TABLE IF NOT EXISTS public.crypto_payment_transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id           TEXT NOT NULL REFERENCES public.crypto_payment_invoices(invoice_id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method       TEXT NOT NULL DEFAULT 'BTC',
  payment_id           TEXT NOT NULL,
  amount_btc           NUMERIC(18, 8) NOT NULL CHECK (amount_btc >= 0),
  amount_sats          BIGINT CHECK (amount_sats >= 0),
  status               TEXT NOT NULL DEFAULT 'Settled',
  confirmations        INTEGER NOT NULL DEFAULT 0,
  tx_hash              TEXT,
  received_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payment_method, payment_id)
);

CREATE INDEX IF NOT EXISTS idx_crypto_tx_invoice ON public.crypto_payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_user ON public.crypto_payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_hash ON public.crypto_payment_transactions(tx_hash);

-- 4. Blockchain Document Verification Records (FRELUX VERIFY)
CREATE TABLE IF NOT EXISTS public.blockchain_document_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id      TEXT UNIQUE NOT NULL,
  document_type        TEXT NOT NULL DEFAULT 'boq'
                         CHECK (document_type IN ('boq', 'quotation', 'material_schedule', 'bank_estimate', 'cost_plan')),
  document_title       TEXT NOT NULL,
  document_reference   TEXT,
  document_hash        TEXT NOT NULL, -- SHA-256 in lowercase hex (64 chars)
  byte_size            BIGINT CHECK (byte_size >= 0),
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'Awaiting Timestamp'
                         CHECK (status IN ('Awaiting Timestamp', 'Timestamp Submitted', 'Bitcoin Confirmation Pending', 'Blockchain Verified', 'Verification Failed')),
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_records_hash ON public.blockchain_document_records(document_hash);
CREATE INDEX IF NOT EXISTS idx_doc_records_ver_id ON public.blockchain_document_records(verification_id);
CREATE INDEX IF NOT EXISTS idx_doc_records_user ON public.blockchain_document_records(user_id, created_at DESC);

-- 5. OpenTimestamps Proofs Store
CREATE TABLE IF NOT EXISTS public.blockchain_timestamp_proofs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id          UUID NOT NULL REFERENCES public.blockchain_document_records(id) ON DELETE CASCADE,
  document_hash        TEXT NOT NULL,
  ots_proof_base64     TEXT NOT NULL,
  ots_calendar_urls    TEXT[] NOT NULL DEFAULT '{}',
  bitcoin_block_height INTEGER,
  bitcoin_block_hash   TEXT,
  bitcoin_tx_hash      TEXT,
  bitcoin_block_time   TIMESTAMPTZ,
  verification_status  TEXT NOT NULL DEFAULT 'Submitted'
                         CHECK (verification_status IN ('Submitted', 'Pending Bitcoin', 'Confirmed', 'Failed')),
  last_checked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ots_proofs_doc_id ON public.blockchain_timestamp_proofs(document_id);
CREATE INDEX IF NOT EXISTS idx_ots_proofs_hash ON public.blockchain_timestamp_proofs(document_hash);

-- 6. Document Verification Audit Logs
CREATE TABLE IF NOT EXISTS public.blockchain_verification_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_hash        TEXT NOT NULL,
  verification_id      TEXT,
  verified_by_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  result               TEXT NOT NULL
                         CHECK (result IN ('verified_confirmed', 'verified_pending_block', 'hash_match_proof_pending', 'tampered_mismatch', 'not_found')),
  ip_hash              TEXT,
  user_agent           TEXT,
  checked_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_hash ON public.blockchain_verification_logs(document_hash);
CREATE INDEX IF NOT EXISTS idx_verification_logs_checked ON public.blockchain_verification_logs(checked_at DESC);

-- 7. Row Level Security & Access Grants
ALTER TABLE public.crypto_payment_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_document_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_timestamp_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_verification_logs ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.crypto_payment_invoices TO authenticated, service_role;
GRANT SELECT, INSERT ON public.crypto_payment_transactions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.blockchain_document_records TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.blockchain_timestamp_proofs TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.blockchain_verification_logs TO anon, authenticated, service_role;

-- Invoices: users view own rows, admins view all
DROP POLICY IF EXISTS "Users can view their own crypto invoices" ON public.crypto_payment_invoices;
CREATE POLICY "Users can view their own crypto invoices"
  ON public.crypto_payment_invoices
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Transactions: users view own rows, admins view all
DROP POLICY IF EXISTS "Users can view their own crypto transactions" ON public.crypto_payment_transactions;
CREATE POLICY "Users can view their own crypto transactions"
  ON public.crypto_payment_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Document Records:
-- 1. Anyone (including anonymous verifiers) can look up a verification record by hash or verification_id
DROP POLICY IF EXISTS "Public can view verification document records" ON public.blockchain_document_records;
CREATE POLICY "Public can view verification document records"
  ON public.blockchain_document_records
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Authenticated users can insert their own generated documents
DROP POLICY IF EXISTS "Users can record their own documents for verification" ON public.blockchain_document_records;
CREATE POLICY "Users can record their own documents for verification"
  ON public.blockchain_document_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL OR public.is_admin());

-- 3. Proofs: public read for verification, service role write
DROP POLICY IF EXISTS "Public can read timestamp proofs" ON public.blockchain_timestamp_proofs;
CREATE POLICY "Public can read timestamp proofs"
  ON public.blockchain_timestamp_proofs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Verification logs: insert allowed, select for admins only
DROP POLICY IF EXISTS "Anyone can log a verification lookup" ON public.blockchain_verification_logs;
CREATE POLICY "Anyone can log a verification lookup"
  ON public.blockchain_verification_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view verification logs" ON public.blockchain_verification_logs;
CREATE POLICY "Admins can view verification logs"
  ON public.blockchain_verification_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 8. Helper RPC for Atomic Document Registration & Hash Lookup
CREATE OR REPLACE FUNCTION public.register_blockchain_document(
  p_verification_id    TEXT,
  p_document_type      TEXT,
  p_document_title     TEXT,
  p_document_reference TEXT,
  p_document_hash      TEXT,
  p_byte_size          BIGINT,
  p_metadata           JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_record_id UUID;
  v_existing RECORD;
BEGIN
  -- Look for existing identical hash
  SELECT id, verification_id, status, created_at INTO v_existing
  FROM public.blockchain_document_records
  WHERE document_hash = lower(trim(p_document_hash))
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'registered', false,
      'is_duplicate', true,
      'id', v_existing.id,
      'verification_id', v_existing.verification_id,
      'status', v_existing.status,
      'created_at', v_existing.created_at
    );
  END IF;

  INSERT INTO public.blockchain_document_records (
    verification_id,
    document_type,
    document_title,
    document_reference,
    document_hash,
    byte_size,
    user_id,
    status,
    metadata
  ) VALUES (
    p_verification_id,
    p_document_type,
    p_document_title,
    p_document_reference,
    lower(trim(p_document_hash)),
    p_byte_size,
    v_user_id,
    'Awaiting Timestamp',
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_record_id;

  RETURN jsonb_build_object(
    'registered', true,
    'is_duplicate', false,
    'id', v_record_id,
    'verification_id', p_verification_id,
    'status', 'Awaiting Timestamp'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_blockchain_document TO authenticated, anon;
