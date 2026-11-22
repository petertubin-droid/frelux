-- =========================================================
-- FRELUX VERIFY — hosted copy of the exported document
--
-- The QR printed on a sealed export opens a hosted copy of that document
-- for the client, so a scan shows the second original rather than a blank
-- verification form.
--
-- What is permanent and what expires:
--  - The SHA-256 fingerprint and its OpenTimestamps proof stay forever.
--    A document cannot be stored on Bitcoin — only a 32-byte hash can — so
--    the blockchain record is the permanent proof of authenticity.
--  - The hosted copy is a convenience: a file in private storage, deleted
--    automatically HOSTED_COPY_DAYS (3) after export. After deletion the
--    document is still verifiable by uploading it at /verify.
--
-- Access: the bucket is private and has no client policies. Edge functions
-- read/write it with the service role and hand out short-lived signed URLs
-- only to a caller who presents the copy token.
-- =========================================================

ALTER TABLE public.blockchain_document_records
  ADD COLUMN IF NOT EXISTS share_token            TEXT,
  ADD COLUMN IF NOT EXISTS hosted_copy_path       TEXT,
  ADD COLUMN IF NOT EXISTS hosted_copy_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hosted_copy_deleted_at TIMESTAMPTZ;

-- The token printed in the QR. One token per export, never reused.
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_records_share_token
  ON public.blockchain_document_records (share_token)
  WHERE share_token IS NOT NULL;

-- Cheap sweep for expired copies.
CREATE INDEX IF NOT EXISTS idx_doc_records_copy_expiry
  ON public.blockchain_document_records (hosted_copy_expires_at)
  WHERE hosted_copy_path IS NOT NULL;

COMMENT ON COLUMN public.blockchain_document_records.share_token IS
  'Token printed in the document QR; resolves to the hosted copy.';
COMMENT ON COLUMN public.blockchain_document_records.hosted_copy_path IS
  'Storage object path of the hosted copy (bucket verify-copies).';
COMMENT ON COLUMN public.blockchain_document_records.hosted_copy_expires_at IS
  'When the hosted copy is deleted. The fingerprint record itself never expires.';

-- Private bucket: no anonymous or client read. Service role only.
INSERT INTO storage.buckets (id, name, public)
VALUES ('verify-copies', 'verify-copies', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "verify_copies_no_client_read" ON storage.objects;
DROP POLICY IF EXISTS "verify_copies_no_client_write" ON storage.objects;

-- No policies on purpose: RLS is enabled on storage.objects, so the absence
-- of a policy denies every client. Edge functions use the service role.

-- Mark expired copies so the sweep can find them even if storage removal
-- fails on the first attempt (the object path is cleared by the function).
CREATE OR REPLACE FUNCTION public.expire_verify_copies()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH expired AS (
    UPDATE public.blockchain_document_records
       SET hosted_copy_deleted_at = now(),
           updated_at = now()
     WHERE hosted_copy_path IS NOT NULL
       AND hosted_copy_expires_at IS NOT NULL
       AND hosted_copy_expires_at <= now()
    RETURNING 1
  )
  SELECT count(*)::integer FROM expired;
$$;

REVOKE ALL ON FUNCTION public.expire_verify_copies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_verify_copies() TO service_role;
