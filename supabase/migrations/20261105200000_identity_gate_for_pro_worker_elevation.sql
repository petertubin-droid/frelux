-- =========================================================
-- Registration: government ID gate for pro worker elevation
-- =========================================================
-- Two defects this fixes:
--
-- 1. upgrade_account_type() flipped a brand new registration to
--    'pro_worker' with no identity evidence at all. Elevation is now
--    refused unless the account has submitted an identity verification
--    request (a government-issued ID: National ID/NIN, international
--    passport, driver's licence or voter's card). Admins still elevate
--    freely. The profile itself stays verification_status = 'unverified'
--    after submission: only an admin review sets it to 'verified'.
--
-- 2. There was no country-neutral way to submit a government ID. The
--    existing submit_nin_verification() only accepts an 11-digit
--    Nigerian NIN, so every other market could not present an ID at
--    all. submit_identity_document() accepts the four document types
--    the verification schema already documents.

CREATE OR REPLACE FUNCTION public.submit_identity_document(
  p_user_id uuid,
  p_document_type text,
  p_document_number text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_profile_id uuid;
  v_existing uuid;
  v_type text := lower(btrim(coalesce(p_document_type, '')));
  v_number text := btrim(coalesce(p_document_number, ''));
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT false, 'Authentication required'::text;
    RETURN;
  END IF;

  IF v_type NOT IN (
    'national_id',
    'international_passport',
    'drivers_license',
    'voters_card'
  ) THEN
    RETURN QUERY SELECT false, 'Unsupported identity document type'::text;
    RETURN;
  END IF;

  IF v_number !~ '^[A-Za-z0-9-]{5,24}$' THEN
    RETURN QUERY SELECT false, 'Enter a valid document number (5 to 24 letters or digits)'::text;
    RETURN;
  END IF;

  -- A National ID in FRELUX's home market is the 11-digit NIN.
  IF v_type = 'national_id' AND v_number !~ '^[0-9]{11}$' THEN
    RETURN QUERY SELECT false, 'A National ID (NIN) must be exactly 11 digits'::text;
    RETURN;
  END IF;

  SELECT id INTO v_profile_id
  FROM public.pro_profiles
  WHERE user_id = p_user_id
  ORDER BY created_at
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN QUERY SELECT false, 'Create your professional profile before submitting an identity document'::text;
    RETURN;
  END IF;

  -- One identity request per profile. A pending request is updated in
  -- place; an approved request is never rewritten by the user.
  SELECT id INTO v_existing
  FROM public.pro_verification_requests
  WHERE profile_id = v_profile_id
    AND request_type = 'identity'
    AND status IN ('pending', 'approved')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.pro_verification_requests
    SET identity_document_type = v_type,
        identity_document_number = v_number,
        updated_at = now()
    WHERE id = v_existing
      AND status = 'pending';

    RETURN QUERY SELECT true,
      'Identity document saved. The account stays unverified until an administrator reviews it.'::text;
    RETURN;
  END IF;

  INSERT INTO public.pro_verification_requests (
    profile_id,
    request_type,
    status,
    identity_document_type,
    identity_document_number
  )
  VALUES (v_profile_id, 'identity', 'pending', v_type, v_number);

  IF v_type = 'national_id' THEN
    UPDATE public.pro_profiles SET nin_number = v_number WHERE id = v_profile_id;
  END IF;

  RETURN QUERY SELECT true,
    'Identity document submitted. The account stays unverified until an administrator approves it.'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_identity_document(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_identity_document(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------
-- Elevation gate
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upgrade_account_type(target_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_has_identity boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() <> target_user AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'You can only upgrade your own account';
  END IF;

  IF NOT public.is_admin() THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.pro_verification_requests r
      JOIN public.pro_profiles p ON p.id = r.profile_id
      WHERE p.user_id = target_user
        AND r.request_type = 'identity'
        AND r.status IN ('pending', 'approved')
        AND r.identity_document_type IS NOT NULL
        AND length(btrim(coalesce(r.identity_document_number, ''))) > 0
    ) INTO v_has_identity;

    IF NOT v_has_identity THEN
      RAISE EXCEPTION
        'A government-issued ID must be submitted before a pro worker account can be activated';
    END IF;
  END IF;

  UPDATE public.profiles
  SET account_type = 'pro_worker',
      updated_at = now()
  WHERE id = target_user;
END;
$$;

REVOKE ALL ON FUNCTION public.upgrade_account_type(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upgrade_account_type(uuid) TO authenticated;
