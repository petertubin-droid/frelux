-- FRELUX VERIFY: proof and audit records contain document metadata. Public
-- verification remains available through the Edge Function, which returns only
-- the fields needed for a lookup. Direct table writes and anonymous reads are
-- not required and must not bypass that boundary.

REVOKE ALL ON TABLE public.blockchain_document_records FROM anon;
REVOKE ALL ON TABLE public.blockchain_timestamp_proofs FROM anon;
REVOKE ALL ON TABLE public.blockchain_verification_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.blockchain_document_records FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.blockchain_timestamp_proofs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.blockchain_verification_logs FROM authenticated;
GRANT SELECT ON TABLE public.blockchain_document_records TO authenticated, service_role;
GRANT SELECT ON TABLE public.blockchain_timestamp_proofs TO authenticated, service_role;
GRANT SELECT ON TABLE public.blockchain_verification_logs TO authenticated, service_role;
GRANT ALL ON TABLE public.blockchain_document_records TO service_role;
GRANT ALL ON TABLE public.blockchain_timestamp_proofs TO service_role;
GRANT ALL ON TABLE public.blockchain_verification_logs TO service_role;

DROP POLICY IF EXISTS "Public can view verification document records" ON public.blockchain_document_records;
DROP POLICY IF EXISTS "Users can record their own documents for verification" ON public.blockchain_document_records;
DROP POLICY IF EXISTS "Public can read timestamp proofs" ON public.blockchain_timestamp_proofs;
DROP POLICY IF EXISTS "Anyone can log a verification lookup" ON public.blockchain_verification_logs;

CREATE POLICY "Owners and admins can read verification records"
  ON public.blockchain_document_records
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Owners and admins can read timestamp proofs"
  ON public.blockchain_timestamp_proofs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.blockchain_document_records d
      WHERE d.id = document_id
        AND (d.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admins can view verification logs" ON public.blockchain_verification_logs;
CREATE POLICY "Admins can view verification logs"
  ON public.blockchain_verification_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- No client should invoke the old SECURITY DEFINER registration RPC. Edge
-- functions perform authenticated registration with server-side validation.
REVOKE ALL ON FUNCTION public.register_blockchain_document(
  TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_blockchain_document(
  TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, JSONB
) TO service_role;

-- BTCPay's InvoiceSettled webhook does not always contain a transaction-level
-- confirmation count. Keep unknown as NULL rather than recording a fabricated 0.
ALTER TABLE public.crypto_payment_transactions
  ALTER COLUMN confirmations DROP NOT NULL;
