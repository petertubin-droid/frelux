-- =========================================================
-- FRELUX Phase 2: credential expiry automation
-- Migration 20261025110000
--
-- Honest freshness: a credential whose expiry date has passed
-- stops presenting as verified, everywhere, automatically.
--
-- - public.expire_stale_credentials(): flips any non-terminal,
--   non-rejected credential past its expires_at to 'expired'.
--   Runs as the system actor (no JWT): the status-change logger
--   records an 'expiry' event and the INSERT guard exempts it,
--   so no human can be blamed for an automatic expiry.
-- - Daily pg_cron schedule (03:15 UTC) keeps it current.
-- - Terminal states (revoked, suspended, rejected,
--   unable_to_verify, expired) are left alone: their standing is
--   already final and stronger than freshness.
-- =========================================================

CREATE OR REPLACE FUNCTION public.expire_stale_credentials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flipped integer := 0;
BEGIN
  UPDATE pro_credentials
     SET verification_status = 'expired',
         updated_at = now()
   WHERE expires_at IS NOT NULL
     AND expires_at < current_date
     AND verification_status IN (
       'submitted', 'pending', 'pending_review', 'unverified',
       'verified', 'verified_by_reviewer', 'verified_by_source'
     );
  GET DIAGNOSTICS flipped = ROW_COUNT;
  RETURN flipped;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_credentials()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_credentials()
  TO service_role;

-- Daily freshness pass at 03:15 UTC. Idempotent: re-scheduling
-- with the same jobname replaces the schedule.
SELECT cron.unschedule('fre-credential-expiry')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fre-credential-expiry');

SELECT cron.schedule(
  'fre-credential-expiry',
  '15 3 * * *',
  $cron$ SELECT public.expire_stale_credentials(); $cron$
);
