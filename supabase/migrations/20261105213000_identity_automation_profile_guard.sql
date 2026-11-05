-- =========================================================
-- Identity automation: record how verification happened
-- =========================================================
-- The second live probe proved another silent blocker. The request was
-- approved and logged, but the profile stayed 'unverified' because
-- gate_pro_profile_listing() reverts verification_status,
-- identity_verified_at and nin_verified for every writer whose
-- is_admin() is false, which is the case for the scheduled automation
-- (it runs with no end user and therefore no admin claim).
--
-- A one-off "flag" cannot be caller-settable, and the earlier security
-- work rejected that pattern. Instead the platform now records HOW a
-- profile was verified in a dedicated column. End users cannot write
-- that column: authenticated holds UPDATE on an explicit column list
-- for pro_profiles that does not include it, so the branch below is
-- only reachable by the owner-side definer functions.
--
-- verified_via:  NULL      = legacy row, verified before this column
--                'admin'   = a person reviewed it
--                'automatic' = the fallback approved it after the wait

ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS verified_via text;

ALTER TABLE public.pro_profiles
  DROP CONSTRAINT IF EXISTS pro_profiles_verified_via_check;

ALTER TABLE public.pro_profiles
  ADD CONSTRAINT pro_profiles_verified_via_check
  CHECK (verified_via IS NULL OR verified_via IN ('admin', 'automatic'));

COMMENT ON COLUMN public.pro_profiles.verified_via IS
  'How the identity was verified: admin review or the automatic fallback. NULL for legacy rows.';

-- ---------------------------------------------------------
-- Listing gate: allow the automatic decision, nothing else
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gate_pro_profile_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin boolean := public.is_admin();
BEGIN
  -- A worker cannot promote themselves. Verification fields are set by the
  -- review functions (approve_verification runs with the admin's own context),
  -- never by the account holder's own update.
  --
  -- The automatic fallback is the one writer without an admin claim. It
  -- proves itself by writing verified_via = 'automatic' in the same
  -- statement, a column the authenticated role cannot update at all.
  IF TG_OP = 'UPDATE' AND NOT v_admin THEN
    IF NEW.verified_via = 'automatic'
       AND OLD.verified_via IS DISTINCT FROM 'automatic'
       AND NEW.verification_status = 'verified'
    THEN
      NULL; -- automatic approval after the review window: allowed
    ELSE
      IF NEW.verification_status = 'verified'
         AND OLD.verification_status IS DISTINCT FROM 'verified' THEN
        NEW.verification_status := OLD.verification_status;
      END IF;
      IF NEW.identity_verified_at IS DISTINCT FROM OLD.identity_verified_at THEN
        NEW.identity_verified_at := OLD.identity_verified_at;
      END IF;
      IF NEW.nin_verified IS DISTINCT FROM OLD.nin_verified THEN
        NEW.nin_verified := COALESCE(OLD.nin_verified, false);
      END IF;
      IF NEW.verified_via IS DISTINCT FROM OLD.verified_via THEN
        NEW.verified_via := OLD.verified_via;
      END IF;
    END IF;
  END IF;

  -- Nothing is public without a verified identity, whatever the form posted.
  IF NOT v_admin AND NEW.is_listed AND NEW.verification_status <> 'verified' THEN
    NEW.is_listed := false;
  END IF;

  -- Approval publishes a complete profile without a second admin action.
  IF NEW.verification_status = 'verified'
     AND COALESCE(NEW.is_profile_complete, false) THEN
    NEW.is_listed := true;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------
-- Automatic review: stamp the column and re-run
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_verify_stale_identity_requests(
  p_min_age interval DEFAULT '15 minutes'::interval,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(processed integer, profile_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_request record;
  v_profile public.pro_profiles;
  v_number text;
  v_valid boolean;
  v_old_status text;
  v_count integer := 0;
  v_ids uuid[] := '{}';
BEGIN
  -- Guard: the wait can never be shorter than ten minutes, so a burst of
  -- submissions cannot be auto-approved instantly.
  IF p_min_age < interval '10 minutes' THEN
    p_min_age := interval '10 minutes';
  END IF;

  FOR v_request IN
    SELECT r.id, r.profile_id, r.identity_document_type, r.identity_document_number
    FROM public.pro_verification_requests r
    WHERE r.request_type = 'identity'
      AND r.status = 'pending'
      AND r.submitted_at <= now() - p_min_age
      AND r.auto_verified = false
    ORDER BY r.submitted_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_number := btrim(coalesce(v_request.identity_document_number, ''));

    v_valid :=
      v_request.identity_document_type IN (
        'national_id',
        'international_passport',
        'drivers_license',
        'voters_card'
      )
      AND v_number ~ '^[A-Za-z0-9-]{5,24}$'
      AND (
        v_request.identity_document_type <> 'national_id'
        OR v_number ~ '^[0-9]{11}$'
      );

    IF NOT v_valid THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_profile
    FROM public.pro_profiles
    WHERE id = v_request.profile_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF v_profile.verification_status = 'suspended' THEN
      CONTINUE;
    END IF;

    v_old_status := v_profile.verification_status;

    UPDATE public.pro_verification_requests
    SET status = 'approved',
        reviewed_by = NULL,
        reviewed_at = now(),
        auto_verified = true,
        auto_verified_at = now(),
        admin_notes = format(
          'Automatically verified after %s without administrator review.',
          p_min_age::text
        ),
        updated_at = now()
    WHERE id = v_request.id;

    UPDATE public.pro_profiles
    SET verification_status = 'verified',
        identity_verified_at = now(),
        nin_verified = CASE
          WHEN v_request.identity_document_type = 'national_id' THEN true
          ELSE nin_verified
        END,
        nin_verified_at = CASE
          WHEN v_request.identity_document_type = 'national_id' THEN now()
          ELSE nin_verified_at
        END,
        verified_via = 'automatic',
        updated_at = now()
    WHERE id = v_request.profile_id;

    INSERT INTO public.pro_verification_logs (
      profile_id, admin_id, automatic, old_status, new_status, notes
    )
    VALUES (
      v_request.profile_id,
      NULL,
      true,
      v_old_status,
      'verified',
      format(
        'Automatic review: no administrator decision within %s.',
        p_min_age::text
      )
    );

    v_count := v_count + 1;
    v_ids := v_ids || v_request.profile_id;
  END LOOP;

  RETURN QUERY SELECT v_count, v_ids;
END;
$function$;

REVOKE ALL ON FUNCTION public.auto_verify_stale_identity_requests(interval, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_verify_stale_identity_requests(interval, integer) TO service_role;
