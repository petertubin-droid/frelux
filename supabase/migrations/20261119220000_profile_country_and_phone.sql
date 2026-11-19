-- =========================================================
-- Profile Country Code and Mandatory Phone Documentation
-- =========================================================
-- Adds country_code to public.profiles so administrators can track
-- registration jurisdiction with country flag and dial code.
-- Updates handle_new_user and ensure_own_profile to persist phone
-- and country_code from user metadata upon registration.

-- 1. Add country_code column to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT '';

COMMENT ON COLUMN public.profiles.country_code IS
  'ISO 3166-1 alpha-2 country code self-reported at account registration; not independently verified.';

CREATE INDEX IF NOT EXISTS idx_profiles_country_code
  ON public.profiles (country_code);

-- Existing professional location data is not a reliable registration-country signal,
-- so prior profiles are intentionally left unset.

-- 3. Update handle_new_user trigger to save phone, country_code, and full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_marketplace_id text;
  requested_account_type text;
  requested_phone text;
  requested_country_code text;
  requested_full_name text;
BEGIN
  -- Email signups and admin invitations must provide both values. OAuth signups
  -- cannot attach custom metadata to the provider redirect, so the app collects
  -- them immediately after OAuth before account setup completes.
  IF COALESCE(NEW.app_metadata ->> 'provider', 'email') = 'email' THEN
    IF COALESCE(BTRIM(NEW.raw_user_meta_data ->> 'phone'), '') !~ '[0-9]{7,}' THEN
      RAISE EXCEPTION 'A valid mobile number is required to create an account.';
    END IF;
    IF COALESCE(UPPER(BTRIM(NEW.raw_user_meta_data ->> 'country_code')), '') NOT IN ('NG','GH','KE','ZA','ET','EG','TZ','CI','US','CA','BR','MX','GB','DE','FR','IT','ES','NL','PL','SE','CH','CN','JP','ID','IN','KR','SG','AE','SA','TR','AU','NZ') THEN
      RAISE EXCEPTION 'A valid ISO country code is required to create an account.';
    END IF;
  END IF;
  requested_account_type := CASE
    WHEN NEW.raw_user_meta_data ->> 'account_type' IN ('client', 'pro_worker')
      THEN NEW.raw_user_meta_data ->> 'account_type'
    ELSE 'client'
  END;

  requested_phone := COALESCE(NEW.raw_user_meta_data ->> 'phone', '');
  requested_country_code := UPPER(COALESCE(NEW.raw_user_meta_data ->> 'country_code', ''));
  requested_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');

  LOOP
    new_marketplace_id := 'FRLX-' ||
      upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4)) || '-' ||
      upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE marketplace_id = new_marketplace_id
    );
  END LOOP;

  INSERT INTO public.profiles (
    id,
    email,
    role,
    account_type,
    marketplace_id,
    phone,
    country_code,
    full_name
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'user', -- public signup must never grant an administrative role
    requested_account_type,
    new_marketplace_id,
    requested_phone,
    requested_country_code,
    requested_full_name
  )
  ON CONFLICT (id) DO UPDATE
    SET phone = CASE WHEN public.profiles.phone = '' AND requested_phone <> '' THEN requested_phone ELSE public.profiles.phone END,
        country_code = CASE WHEN (public.profiles.country_code IS NULL OR public.profiles.country_code = '') AND requested_country_code <> '' THEN requested_country_code ELSE public.profiles.country_code END,
        full_name = CASE WHEN public.profiles.full_name = '' AND requested_full_name <> '' THEN requested_full_name ELSE public.profiles.full_name END;

  RETURN NEW;
END;
$$;

-- 4. Update ensure_own_profile RPC to support phone and country_code
CREATE OR REPLACE FUNCTION public.ensure_own_profile(
  requested_account_type text,
  requested_phone text,
  requested_country_code text
)
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
  safe_phone text := COALESCE(requested_phone, '');
  safe_country_code text := UPPER(COALESCE(requested_country_code, ''));
BEGIN
  IF own_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF safe_phone <> '' AND safe_phone !~ '[0-9]{7,}' THEN
    RAISE EXCEPTION 'A valid mobile number is required.';
  END IF;
  IF safe_country_code <> '' AND safe_country_code NOT IN ('NG','GH','KE','ZA','ET','EG','TZ','CI','US','CA','BR','MX','GB','DE','FR','IT','ES','NL','PL','SE','CH','CN','JP','ID','IN','KR','SG','AE','SA','TR','AU','NZ') THEN
    RAISE EXCEPTION 'A valid ISO country code is required.';
  END IF;

  LOOP
    new_marketplace_id := 'FRLX-' ||
      upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4)) || '-' ||
      upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE marketplace_id = new_marketplace_id
    );
  END LOOP;

  INSERT INTO public.profiles (
    id,
    email,
    role,
    account_type,
    marketplace_id,
    phone,
    country_code
  )
  VALUES (
    own_id,
    own_email,
    'user',
    safe_account_type,
    new_marketplace_id,
    safe_phone,
    safe_country_code
  )
  ON CONFLICT (id) DO UPDATE
    SET account_type = safe_account_type,
        email = CASE WHEN own_email <> '' THEN own_email ELSE public.profiles.email END,
        phone = CASE WHEN public.profiles.phone = '' AND safe_phone <> '' THEN safe_phone ELSE public.profiles.phone END,
        country_code = CASE WHEN (public.profiles.country_code IS NULL OR public.profiles.country_code = '') AND safe_country_code <> '' THEN safe_country_code ELSE public.profiles.country_code END;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_own_profile(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_own_profile(text, text, text) TO authenticated;

-- Retire the old one-argument recovery RPC so it cannot bypass collection of
-- phone and country metadata. Application callers now use the three-argument RPC.
REVOKE ALL ON FUNCTION public.ensure_own_profile(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_own_profile(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_own_profile(text, text, text) TO authenticated;
