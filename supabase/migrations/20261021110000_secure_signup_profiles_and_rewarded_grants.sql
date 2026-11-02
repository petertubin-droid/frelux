-- Prevent user metadata from selecting privileged profile roles, and provide a
-- narrowly scoped recovery path for users whose profile row is missing.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_marketplace_id text;
  requested_account_type text;
BEGIN
  requested_account_type := CASE
    WHEN NEW.raw_user_meta_data ->> 'account_type' IN ('client', 'pro_worker')
      THEN NEW.raw_user_meta_data ->> 'account_type'
    ELSE 'client'
  END;

  LOOP
    new_marketplace_id := 'FRLX-' ||
      upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4)) || '-' ||
      upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE marketplace_id = new_marketplace_id
    );
  END LOOP;

  INSERT INTO public.profiles (id, email, role, account_type, marketplace_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM public.profiles) THEN 'admin'
      ELSE 'user'
    END, -- preserve the existing one-time first-account bootstrap; never trust metadata
    requested_account_type,
    new_marketplace_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Do not rewrite existing profile roles; only repair missing rows, always as
-- ordinary users. This is a data-preserving backfill for prior trigger errors.
DO $$
DECLARE
  missing_user record;
  new_marketplace_id text;
BEGIN
  FOR missing_user IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
  LOOP
    LOOP
      new_marketplace_id := 'FRLX-' ||
        upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4)) || '-' ||
        upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE marketplace_id = new_marketplace_id
      );
    END LOOP;

    INSERT INTO public.profiles (id, email, role, account_type, marketplace_id)
    VALUES (
      missing_user.id,
      COALESCE(missing_user.email, ''),
      'user',
      CASE
        WHEN missing_user.raw_user_meta_data ->> 'account_type' IN ('client', 'pro_worker')
          THEN missing_user.raw_user_meta_data ->> 'account_type'
        ELSE 'client'
      END,
      new_marketplace_id
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$;

-- Trusted self-service recovery for the existing-profile update path. This
-- function cannot set a role, cannot target another user, and only accepts
-- the two account types already allowed by the profiles constraint.
CREATE OR REPLACE FUNCTION public.ensure_own_profile(requested_account_type text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  own_id uuid := auth.uid();
  own_email text := COALESCE(auth.jwt() ->> 'email', '');
  new_marketplace_id text;
  safe_account_type text := CASE
    WHEN requested_account_type IN ('client', 'pro_worker') THEN requested_account_type
    ELSE 'client'
  END;
BEGIN
  IF own_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  LOOP
    new_marketplace_id := 'FRLX-' ||
      upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4)) || '-' ||
      upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE marketplace_id = new_marketplace_id
    );
  END LOOP;

  INSERT INTO public.profiles (id, email, role, account_type, marketplace_id)
  VALUES (own_id, own_email, 'user', safe_account_type, new_marketplace_id)
  ON CONFLICT (id) DO UPDATE
    SET account_type = safe_account_type,
        email = CASE WHEN own_email <> '' THEN own_email ELSE public.profiles.email END;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_own_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_own_profile(text) TO authenticated;

-- Serialize first-user bootstrap so concurrent signups cannot both become admins.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_marketplace_id text;
  requested_account_type text;
BEGIN
  requested_account_type := CASE
    WHEN NEW.raw_user_meta_data ->> 'account_type' IN ('client', 'pro_worker')
      THEN NEW.raw_user_meta_data ->> 'account_type'
    ELSE 'client'
  END;
  LOOP
    new_marketplace_id := 'FRLX-' ||
      upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4)) || '-' ||
      upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE marketplace_id = new_marketplace_id);
  END LOOP;
  -- Signup is public: it must never grant an administrative role.
  INSERT INTO public.profiles (id, email, role, account_type, marketplace_id)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'user', requested_account_type, new_marketplace_id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER TABLE public.pro_mobile_otp_log
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;

-- OTPs and identity submissions are bound to the authenticated caller. The
-- OTP itself is never returned to browser code; delivery is handled by the
-- authenticated SMS edge function using the server-side pending OTP record.
CREATE OR REPLACE FUNCTION public.send_mobile_otp(p_phone_number text, p_user_id uuid)
RETURNS TABLE(success boolean, otp_code text, message text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_profile_id uuid;
  v_otp text;
  v_random bytea;
  v_existing_unused integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT false, NULL::text, 'Authentication required'::text;
    RETURN;
  END IF;
  IF p_phone_number !~ '^\+?[0-9][0-9 ()-]{6,20}$' THEN
    RETURN QUERY SELECT false, NULL::text, 'Invalid phone number'::text;
    RETURN;
  END IF;
  SELECT id INTO v_profile_id FROM public.pro_profiles WHERE user_id = p_user_id LIMIT 1;
  IF v_profile_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, 'No professional profile found'::text;
    RETURN;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_profile_id::text));
  SELECT count(*) INTO v_existing_unused
  FROM public.pro_mobile_otp_log
  WHERE profile_id = v_profile_id AND is_used = false AND created_at > now() - interval '10 minutes';
  IF v_existing_unused >= 3 THEN
    RETURN QUERY SELECT false, NULL::text, 'Too many OTP requests. Please wait 10 minutes.'::text;
    RETURN;
  END IF;
  v_random := extensions.gen_random_bytes(4);
  v_otp := lpad((((get_byte(v_random, 0)::bigint << 24) + (get_byte(v_random, 1)::bigint << 16) +
    (get_byte(v_random, 2)::bigint << 8) + get_byte(v_random, 3)::bigint) % 1000000)::text, 6, '0');
  UPDATE public.pro_mobile_otp_log SET is_used = true WHERE profile_id = v_profile_id AND is_used = false;
  INSERT INTO public.pro_mobile_otp_log (profile_id, phone_number, otp_code, purpose, expires_at)
  VALUES (v_profile_id, p_phone_number, v_otp, 'registration', now() + interval '10 minutes');
  UPDATE public.pro_profiles SET mobile_number = p_phone_number WHERE id = v_profile_id;
  RETURN QUERY SELECT true, NULL::text, 'OTP queued for secure delivery'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_mobile_otp(p_phone_number text, p_otp_code text, p_user_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_profile_id uuid;
  v_log_id uuid;
  v_saved_code text;
  v_attempt_count integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT false, 'Authentication required'::text;
    RETURN;
  END IF;
  IF p_otp_code !~ '^[0-9]{6}$' THEN
    RETURN QUERY SELECT false, 'Invalid or expired OTP'::text;
    RETURN;
  END IF;
  SELECT id INTO v_profile_id FROM public.pro_profiles WHERE user_id = p_user_id LIMIT 1;
  PERFORM pg_advisory_xact_lock(hashtext(v_profile_id::text));
  SELECT id, otp_code, attempt_count INTO v_log_id, v_saved_code, v_attempt_count
  FROM public.pro_mobile_otp_log
  WHERE profile_id = v_profile_id AND phone_number = p_phone_number
    AND is_used = false AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF v_log_id IS NULL OR v_attempt_count >= 5 THEN
    RETURN QUERY SELECT false, 'Invalid or expired OTP'::text;
    RETURN;
  END IF;
  UPDATE public.pro_mobile_otp_log
    SET attempt_count = attempt_count + 1,
        is_used = (attempt_count + 1 >= 5 AND otp_code <> p_otp_code)
  WHERE id = v_log_id;
  IF v_saved_code <> p_otp_code THEN
    RETURN QUERY SELECT false, 'Invalid or expired OTP'::text;
    RETURN;
  END IF;
  UPDATE public.pro_mobile_otp_log SET is_used = true WHERE id = v_log_id;
  UPDATE public.pro_profiles SET mobile_otp_verified = true, mobile_otp_verified_at = now(),
    phone_verified = true, phone_number = p_phone_number,
    contact_verified_at = COALESCE(contact_verified_at, now()) WHERE id = v_profile_id;
  RETURN QUERY SELECT true, 'Mobile number verified successfully'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.send_mobile_otp(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_mobile_otp(text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_nin_verification(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_mobile_otp(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_mobile_otp(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_nin_verification(text, uuid) TO authenticated;


-- OTP records contain authentication secrets. Never expose them to browser SQL
-- clients; the authenticated edge function reads the current code via service role.
DROP POLICY IF EXISTS "mobile_otp_self_read" ON public.pro_mobile_otp_log;
DROP POLICY IF EXISTS "mobile_otp_self_insert" ON public.pro_mobile_otp_log;
DROP POLICY IF EXISTS "mobile_otp_self_update" ON public.pro_mobile_otp_log;
REVOKE ALL ON TABLE public.pro_mobile_otp_log FROM PUBLIC, anon, authenticated;

-- Verification request records contain private identity numbers and approval state.
-- Owners may read their own request, but may only create a pending request using
-- submission fields and withdraw it through the owner-bound RPC below.
REVOKE ALL ON TABLE public.pro_verification_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.pro_verification_requests TO authenticated;
GRANT INSERT (
  profile_id, request_type, professional_name, business_name, category_id,
  service_locations, years_experience, identity_document_type, identity_document_number
) ON TABLE public.pro_verification_requests TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_verification_request_submission()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending';
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
      NEW.admin_notes := NULL;
      NEW.rejection_reason := NULL;
      NEW.more_info_request := NULL;
    ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'withdrawn' THEN
      RAISE EXCEPTION 'Only administrators may change verification status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_verification_request_submission ON public.pro_verification_requests;
CREATE TRIGGER trg_guard_verification_request_submission
BEFORE INSERT OR UPDATE ON public.pro_verification_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_verification_request_submission();

CREATE OR REPLACE FUNCTION public.withdraw_own_verification_request(p_request_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RETURN false; END IF;
  UPDATE public.pro_verification_requests r SET status = 'withdrawn'
  WHERE r.id = p_request_id AND r.status = 'pending'
    AND EXISTS (SELECT 1 FROM public.pro_profiles p WHERE p.id = r.profile_id AND p.user_id = auth.uid());
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.withdraw_own_verification_request(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_own_verification_request(uuid, uuid) TO authenticated;

-- Use SQL column privileges, not a caller-settable custom GUC, to protect verification data.
DROP TRIGGER IF EXISTS trg_guard_pro_profile_verification_fields ON public.pro_profiles;
REVOKE ALL ON TABLE public.pro_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, user_id, category_id, business_name, display_name, slug, country, bio,
  profile_image_url, cover_image_url, years_experience, availability,
  verification_status, is_profile_complete, is_listed, contact_email_public,
  contact_phone_public, website_url, rating_avg, rating_count, project_count,
  sort_order, created_at, updated_at, contact_verified_at, identity_verified_at,
  pro_level, pro_level_awarded_at, phone_verified, nin_verified,
  mobile_otp_verified, seo_title, seo_description, seo_indexable, latitude, longitude
) ON public.pro_profiles TO anon, authenticated;
GRANT INSERT (
  user_id, category_id, business_name, display_name, slug, country, bio,
  profile_image_url, cover_image_url, years_experience, availability,
  is_profile_complete, is_listed, contact_email_public, contact_phone_public,
  contact_phone, website_url
) ON public.pro_profiles TO authenticated;
GRANT UPDATE (
  category_id, business_name, display_name, slug, country, bio, profile_image_url,
  cover_image_url, years_experience, availability, is_profile_complete, is_listed,
  contact_email_public, contact_phone_public, contact_phone, website_url,
  seo_title, seo_description, seo_indexable
) ON public.pro_profiles TO authenticated;

-- Read the owner's private contact number without granting table-wide access.
CREATE OR REPLACE FUNCTION public.get_own_pro_contact_phone()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT p.contact_phone FROM public.pro_profiles p WHERE p.user_id = auth.uid() LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_own_pro_contact_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_pro_contact_phone() TO authenticated;

-- Admin-only full profile projection; general roles cannot select NIN or private phones.
CREATE OR REPLACE FUNCTION public.admin_list_pro_profiles()
RETURNS SETOF public.pro_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN QUERY SELECT * FROM public.pro_profiles ORDER BY created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_pro_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_pro_profiles() TO authenticated;

-- Admin verification changes are JWT-bound SECURITY DEFINER operations.
CREATE OR REPLACE FUNCTION public.admin_set_pro_profile_status(
  p_profile_id uuid, p_status text, p_admin_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  IF p_admin_id IS DISTINCT FROM auth.uid() OR NOT public.is_admin() THEN RETURN false; END IF;
  IF p_status NOT IN ('unverified', 'pending', 'verified', 'rejected', 'more_info', 'suspended') THEN
    RETURN false;
  END IF;
  UPDATE public.pro_profiles SET verification_status = p_status WHERE id = p_profile_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_pro_profile_status(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_pro_profile_status(uuid, text, uuid) TO authenticated;

-- Keep the NIN submission path caller-bound; SECURITY DEFINER permits only this
-- validated workflow to update the otherwise non-writable NIN column.
CREATE OR REPLACE FUNCTION public.submit_nin_verification(p_nin_number text, p_user_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_profile_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT false, 'Authentication required'::text; RETURN;
  END IF;
  IF p_nin_number !~ '^[0-9]{11}$' THEN
    RETURN QUERY SELECT false, 'NIN must be exactly 11 digits'::text; RETURN;
  END IF;
  SELECT id INTO v_profile_id FROM public.pro_profiles WHERE user_id = p_user_id LIMIT 1;
  IF v_profile_id IS NULL THEN
    RETURN QUERY SELECT false, 'No professional profile found'::text; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.pro_profiles WHERE nin_number = p_nin_number AND id <> v_profile_id) THEN
    RETURN QUERY SELECT false, 'This NIN is already registered to another account'::text; RETURN;
  END IF;
  UPDATE public.pro_profiles SET nin_number = p_nin_number WHERE id = v_profile_id;
  INSERT INTO public.pro_verification_requests
    (profile_id, request_type, status, identity_document_type, identity_document_number)
  VALUES (v_profile_id, 'identity', 'pending', 'national_id', p_nin_number)
  ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT true, 'NIN submitted for verification. An admin will review it shortly.'::text;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_nin_verification(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_nin_verification(text, uuid) TO authenticated;

-- Serialize OTP issue and verification attempts to prevent concurrent bypasses.
