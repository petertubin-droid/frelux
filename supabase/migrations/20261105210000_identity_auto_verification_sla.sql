-- =========================================================
-- Automatic identity verification when no administrator reviews
-- =========================================================
-- Owner decision (2026-11-05): a submitted government ID must not wait
-- indefinitely on an administrator. If no administrator reviews an
-- identity request within the review window (15 minutes minimum), the
-- platform verifies it automatically and records that it was automatic
-- so the decision stays auditable.
--
-- What this does NOT do: it never invents a verification. The document
-- must pass the same format checks submit_identity_document() applies,
-- and requests that an administrator rejected or asked more information
-- for are untouched. A rejected document can only re-enter the queue by
-- the professional submitting a new one.

-- ---------------------------------------------------------
-- 1. Columns: make auto-verification visible and auditable
-- ---------------------------------------------------------

-- pro_verification_logs.admin_id was NOT NULL, which made an automatic
-- (no human) decision impossible to log.
ALTER TABLE public.pro_verification_logs
  ALTER COLUMN admin_id DROP NOT NULL;

ALTER TABLE public.pro_verification_logs
  ADD COLUMN IF NOT EXISTS automatic boolean NOT NULL DEFAULT false;

ALTER TABLE public.pro_verification_requests
  ADD COLUMN IF NOT EXISTS auto_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.pro_verification_requests
  ADD COLUMN IF NOT EXISTS auto_verified_at timestamptz;

COMMENT ON COLUMN public.pro_verification_requests.auto_verified IS
  'True when the identity request was approved by the automatic review fallback rather than an administrator.';

-- ---------------------------------------------------------
-- 2. The automatic review itself
-- ---------------------------------------------------------
-- p_min_age is the minimum time a request must sit unreviewed before the
-- fallback acts. The default 15 minutes is the owner's floor; the
-- scheduler below calls it every 2 minutes, so a submission is verified
-- between 15 and 17 minutes after it was made.
CREATE OR REPLACE FUNCTION public.auto_verify_stale_identity_requests(
  p_min_age interval DEFAULT '15 minutes',
  p_limit integer DEFAULT 200
)
RETURNS TABLE(processed integer, profile_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_request record;
  v_profile pro_profiles;
  v_count integer := 0;
  v_profiles uuid[] := ARRAY[]::uuid[];
  v_old_status text;
  v_number text;
  v_valid boolean;
BEGIN
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

    -- Same rules as submit_identity_document(): a document that does not
    -- satisfy them is never auto-verified.
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

    -- Never touch a suspended profile: suspension is an administrative act.
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
        updated_at = now()
    WHERE id = v_request.profile_id;

    INSERT INTO public.pro_verification_logs (
      profile_id,
      admin_id,
      old_status,
      new_status,
      notes,
      automatic
    )
    VALUES (
      v_request.profile_id,
      NULL,
      v_old_status,
      'verified',
      format(
        'Automatic identity verification: no administrator review within %s.',
        p_min_age::text
      ),
      true
    );

    v_count := v_count + 1;
    v_profiles := array_append(v_profiles, v_request.profile_id);
  END LOOP;

  RETURN QUERY SELECT v_count, v_profiles;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_verify_stale_identity_requests(interval, integer)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------
-- 3. Status for the professional (drives the countdown in the UI)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_identity_verification(
  p_min_age interval DEFAULT '15 minutes'
)
RETURNS TABLE(
  status text,
  document_type text,
  submitted_at timestamptz,
  auto_verified boolean,
  verified_at timestamptz,
  auto_verify_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_profile_id
  FROM public.pro_profiles
  WHERE user_id = auth.uid()
  ORDER BY created_at
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.status,
    r.identity_document_type,
    r.submitted_at,
    r.auto_verified,
    r.reviewed_at,
    CASE
      WHEN r.status = 'pending' AND r.auto_verified = false
        THEN r.submitted_at + p_min_age
      ELSE NULL
    END
  FROM public.pro_verification_requests r
  WHERE r.profile_id = v_profile_id
    AND r.request_type = 'identity'
  ORDER BY r.submitted_at DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_identity_verification(interval)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_identity_verification(interval)
  TO authenticated;

-- ---------------------------------------------------------
-- 4. Schedule the fallback
-- ---------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'identity-auto-verify') THEN
      PERFORM cron.unschedule('identity-auto-verify');
    END IF;

    PERFORM cron.schedule(
      'identity-auto-verify',
      '*/2 * * * *',
      'SELECT public.auto_verify_stale_identity_requests();'
    );
  END IF;
END $$;
