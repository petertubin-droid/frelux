-- =========================================================
-- CREDENTIAL SELF-VERIFICATION GUARD (Phase 2, 2026-10-25)
--
-- Closes the INSERT gap in the slice-1 guard: on INSERT a
-- worker could set verification_status / verified_by and
-- appear publicly verified. Owners (non-admin actors on
-- their own profile's credentials) are now constrained on
-- both INSERT and UPDATE:
--   - INSERT: status must be 'submitted' or the legacy
--     'unverified'; all verification-outcome fields are
--     forced NULL.
--   - UPDATE: verification-outcome fields are restored to
--     their prior values; status may only move to
--     'submitted' (resubmission after rejection).
-- Admins and system (service-role) actors pass untouched.
-- =========================================================

CREATE OR REPLACE FUNCTION guard_credential_verification_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor uuid := auth.uid();
  is_admin_actor boolean;
  own_profile boolean;
BEGIN
  SELECT public.is_admin() INTO is_admin_actor;
  IF COALESCE(is_admin_actor, false) OR actor IS NULL THEN
    RETURN NEW; -- admin / system actors are untouched
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pro_profiles
    WHERE id = (CASE WHEN TG_OP = 'INSERT' THEN NEW.profile_id ELSE OLD.profile_id END)
      AND user_id = actor
  ) INTO own_profile;
  IF NOT own_profile THEN
    RETURN NEW; -- not the owner; RLS policies govern the rest
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.verification_status NOT IN ('submitted', 'unverified') THEN
      RAISE EXCEPTION 'Workers cannot submit a credential with status %', NEW.verification_status;
    END IF;
    NEW.verified_by := NULL;
    NEW.verified_at := NULL;
    NEW.verification_method := NULL;
    NEW.verification_result := NULL;
    NEW.verification_checked_at := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE by the owner: verification outcomes are never theirs to set.
  NEW.verified_by := OLD.verified_by;
  NEW.verified_at := OLD.verified_at;
  NEW.verification_method := OLD.verification_method;
  NEW.verification_result := OLD.verification_result;
  NEW.verification_checked_at := OLD.verification_checked_at;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF OLD.verification_status IN ('rejected', 'submitted', 'unverified')
       AND NEW.verification_status = 'submitted' THEN
      RETURN NEW; -- honest resubmission for review
    END IF;
    RAISE EXCEPTION 'Workers cannot change verification outcomes on their own credentials (tried % -> %)',
      OLD.verification_status, NEW.verification_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_credential_verification ON pro_credentials;
CREATE TRIGGER trg_guard_credential_verification
  BEFORE INSERT OR UPDATE ON pro_credentials
  FOR EACH ROW EXECUTE FUNCTION guard_credential_verification_fields();
