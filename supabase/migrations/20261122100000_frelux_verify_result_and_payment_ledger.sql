-- Verification lookups by ID are distinct from file-fingerprint matches.
-- Allow that non-authenticating outcome in the audit log.
ALTER TABLE public.blockchain_verification_logs
  DROP CONSTRAINT IF EXISTS blockchain_verification_logs_result_check;
ALTER TABLE public.blockchain_verification_logs
  ADD CONSTRAINT blockchain_verification_logs_result_check
  CHECK (result IN (
    'verified_confirmed',
    'verified_pending_block',
    'hash_match_proof_pending',
    'record_found',
    'tampered_mismatch',
    'not_found'
  ));
