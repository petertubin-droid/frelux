-- =========================================================
-- Identity automation: let the automatic review pass the guard
-- =========================================================
-- The previous migration added the automatic review, but its approval was
-- refused at runtime by trg_guard_verification_request_submission
-- ("Only administrators may change verification status"). A probe against
-- production proved the function failed, so the cron job would have
-- silently done nothing every two minutes.
--
-- The guard is widened for exactly one transition and nothing else. This
-- does NOT use a caller-settable setting: the earlier security work
-- rejected that pattern for verification data, and it stays rejected.
-- The rule is structural and is only reachable by a writer that can
-- UPDATE the row. End users cannot: pro_verification_requests is
-- REVOKE ALL for anon and authenticated, with column-scoped INSERT and
-- SELECT only. So the only callers that can reach this branch are the
-- owner-side definer functions and the service role.
--
-- Conditions, all of which must hold:
--   UPDATE, pending -> approved
--   auto_verified flips false -> true
--   reviewed_by, rejection_reason and more_info_request stay empty
--   the submitted document (type and number) is unchanged
-- Anything else still raises, exactly as before.

CREATE OR REPLACE FUNCTION public.guard_verification_request_submission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    -- Automatic review fallback (see auto_verify_stale_identity_requests).
    IF TG_OP = 'UPDATE'
       AND OLD.status = 'pending'
       AND NEW.status = 'approved'
       AND OLD.auto_verified = false
       AND NEW.auto_verified = true
       AND NEW.reviewed_by IS NULL
       AND NEW.rejection_reason IS NULL
       AND NEW.more_info_request IS NULL
       AND NEW.identity_document_type IS NOT DISTINCT FROM OLD.identity_document_type
       AND NEW.identity_document_number IS NOT DISTINCT FROM OLD.identity_document_number
    THEN
      RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending';
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
      NEW.admin_notes := NULL;
      NEW.rejection_reason := NULL;
      NEW.more_info_request := NULL;
      NEW.auto_verified := false;
      NEW.auto_verified_at := NULL;
    ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'withdrawn' THEN
      RAISE EXCEPTION 'Only administrators may change verification status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_verification_request_submission() IS
  'Blocks non-admin status changes on verification requests, with one exception: the automatic review fallback approving a stale pending identity request (seen by the auto_verified false to true transition).';
