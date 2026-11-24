-- =========================================================
-- Verified professional credential suffix
-- Migration: 20261124170000_profile_credential_suffix.sql
--
-- A BOQ can carry a reviewer credit: "Engr. U. Okereke, FNSE". The suffix is a
-- professional claim (a COREN registration, a fellowship), and until now it was
-- free text typed into the document. Free text is not a credential: anyone can
-- type one, and a reader has no way to tell a verified registration from an
-- invented one.
--
-- This adds the claim to the profile and a separate verification stamp that
-- only an administrator can set:
--
--   • credential_suffix        the claim itself, e.g. "FNSE, COREN R.12345"
--   • credential_verified_at   when an admin checked it; NULL means unverified
--   • credential_verified_by   which admin checked it
--
-- Documents print the suffix only while credential_verified_at is set, so an
-- unverified claim never reaches a client-facing page. The guard trigger refuses
-- any change to the stamp from a session that is not an admin, which is what
-- stops a user verifying themselves.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_guard_credential_verification ON public.profiles;
--   DROP FUNCTION IF EXISTS public.guard_credential_verification();
--   ALTER TABLE public.profiles
--     DROP COLUMN IF EXISTS credential_suffix,
--     DROP COLUMN IF EXISTS credential_verified_at,
--     DROP COLUMN IF EXISTS credential_verified_by;
-- =========================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credential_suffix text,
  ADD COLUMN IF NOT EXISTS credential_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS credential_verified_by uuid;

COMMENT ON COLUMN public.profiles.credential_suffix IS
  'Professional credential claim as the member states it, e.g. "FNSE, COREN R.12345". Printed only when credential_verified_at is set.';
COMMENT ON COLUMN public.profiles.credential_verified_at IS
  'Admin stamp: when the claim above was checked. NULL means unverified and the suffix is not printed on documents.';
COMMENT ON COLUMN public.profiles.credential_verified_by IS
  'The administrator who verified the claim.';

-- ---------------------------------------------------------
-- Guard: a member cannot verify their own credential
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_credential_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and the service role may set or clear the stamp. Everyone else may
  -- state a suffix but may not make it verified, and may not rewrite the record
  -- of who verified it.
  IF public.is_admin() OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.credential_verified_at := NULL;
    NEW.credential_verified_by := NULL;
    RETURN NEW;
  END IF;

  IF NEW.credential_verified_at IS DISTINCT FROM OLD.credential_verified_at
     OR NEW.credential_verified_by IS DISTINCT FROM OLD.credential_verified_by THEN
    RAISE EXCEPTION
      'credential verification is an administrator action'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_credential_verification ON public.profiles;
CREATE TRIGGER trg_guard_credential_verification
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_credential_verification();
