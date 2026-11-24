-- =========================================================
-- Fix: handle_new_user read a column that does not exist
-- =========================================================
-- Every email signup and every admin invitation failed with
--
--   ERROR: 42703: record "new" has no field "app_metadata"
--   CONTEXT: SQL expression "COALESCE(NEW."app_metadata" ->> 'provider', 'email') = 'email'"
--
-- auth.users has raw_app_meta_data, not app_metadata (the camelCase name exists
-- only in the GoTrue API response). The guard was therefore evaluated against a
-- missing field on every insert, so the trigger raised and GoTrue returned
-- "Database error saving new user" (500) to the client. Registration was dead in
-- production, not merely missing the new identity fields.
--
-- The mistake entered in 20261119220000_profile_country_and_phone.sql and was
-- carried forward by 20261124140000. Those files are left as they were: they are
-- already applied, and replaying the chain ends here, so this definition is the
-- one a fresh database and production both hold.
--
-- Everything else is unchanged from 20261124140000.

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
  requested_location text;
  requested_nin text;
  requested_govt_id_type text;
  requested_govt_id_number text;
BEGIN
  IF COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email') = 'email' THEN
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
  requested_location := COALESCE(NEW.raw_user_meta_data ->> 'location', '');
  requested_nin := COALESCE(NEW.raw_user_meta_data ->> 'nin_number', '');
  requested_govt_id_type := COALESCE(NEW.raw_user_meta_data ->> 'government_id_type', '');
  requested_govt_id_number := COALESCE(NEW.raw_user_meta_data ->> 'government_id_number', '');

  -- If Nigerian account and NIN is passed, validate or standardize
  IF requested_country_code = 'NG' AND requested_nin = '' AND requested_govt_id_number <> '' THEN
    requested_nin := requested_govt_id_number;
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
    country_code,
    full_name,
    location,
    nin_number,
    government_id_type,
    government_id_number
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'user',
    requested_account_type,
    new_marketplace_id,
    requested_phone,
    requested_country_code,
    requested_full_name,
    requested_location,
    requested_nin,
    requested_govt_id_type,
    requested_govt_id_number
  )
  ON CONFLICT (id) DO UPDATE
    SET phone = CASE WHEN public.profiles.phone = '' AND requested_phone <> '' THEN requested_phone ELSE public.profiles.phone END,
        country_code = CASE WHEN (public.profiles.country_code IS NULL OR public.profiles.country_code = '') AND requested_country_code <> '' THEN requested_country_code ELSE public.profiles.country_code END,
        full_name = CASE WHEN public.profiles.full_name = '' AND requested_full_name <> '' THEN requested_full_name ELSE public.profiles.full_name END,
        location = CASE WHEN (public.profiles.location IS NULL OR public.profiles.location = '') AND requested_location <> '' THEN requested_location ELSE public.profiles.location END,
        nin_number = CASE WHEN (public.profiles.nin_number IS NULL OR public.profiles.nin_number = '') AND requested_nin <> '' THEN requested_nin ELSE public.profiles.nin_number END,
        government_id_type = CASE WHEN (public.profiles.government_id_type IS NULL OR public.profiles.government_id_type = '') AND requested_govt_id_type <> '' THEN requested_govt_id_type ELSE public.profiles.government_id_type END,
        government_id_number = CASE WHEN (public.profiles.government_id_number IS NULL OR public.profiles.government_id_number = '') AND requested_govt_id_number <> '' THEN requested_govt_id_number ELSE public.profiles.government_id_number END;

  RETURN NEW;
END;
$$;
