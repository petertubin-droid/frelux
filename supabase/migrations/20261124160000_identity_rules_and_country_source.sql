-- =========================================================
-- Identity rules and one source for the supported countries
-- =========================================================
-- Two things, both closing a gap the b82d2f3b review found:
--
-- 1. The supported-market list was a literal inside handle_new_user. Adding a
--    country to src/lib/international/countries.ts and forgetting the SQL made
--    a form that offers a country the trigger rejects, which is a signup that
--    dies on submit with no useful message. The list is now a table, seeded
--    below, and the trigger asks it. auth-signup-trigger.test.ts compares this
--    seed with countries.ts, so the two cannot drift apart silently.
--
-- 2. NIN was validated in the browser only. An admin invitation, an admin edit
--    or a direct call to the auth API never touch the form. The trigger now
--    normalises the NIN to digits and refuses anything that is not exactly 11
--    for a Nigerian account, and refuses a government ID type the UI does not
--    offer. The admin edge function validates the same rules and returns a 400
--    with the field named, so an operator sees why rather than a 500.

CREATE TABLE IF NOT EXISTS public.registration_countries (
  code text PRIMARY KEY,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.registration_countries IS
  'Markets a person may register from. Mirrors src/lib/international/countries.ts; the parity test keeps them in step.';

ALTER TABLE public.registration_countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registration_countries readable" ON public.registration_countries;
CREATE POLICY "registration_countries readable"
  ON public.registration_countries FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.registration_countries (code) VALUES
  ('NG'),
  ('GH'),
  ('KE'),
  ('ZA'),
  ('ET'),
  ('EG'),
  ('TZ'),
  ('CI'),
  ('US'),
  ('CA'),
  ('BR'),
  ('MX'),
  ('GB'),
  ('DE'),
  ('FR'),
  ('IT'),
  ('ES'),
  ('NL'),
  ('PL'),
  ('SE'),
  ('CH'),
  ('CN'),
  ('JP'),
  ('ID'),
  ('IN'),
  ('KR'),
  ('SG'),
  ('AE'),
  ('SA'),
  ('TR'),
  ('AU'),
  ('NZ')
ON CONFLICT (code) DO NOTHING;

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
    -- The supported markets live in a table, not in this function: adding a
    -- country is one row, and src/lib/international/countries.ts is held in
    -- step with it by src/lib/__tests__/auth-signup-trigger.test.ts.
    IF NOT EXISTS (
      SELECT 1
      FROM public.registration_countries rc
      WHERE rc.code = COALESCE(UPPER(BTRIM(NEW.raw_user_meta_data ->> 'country_code')), '')
        AND rc.is_active
    ) THEN
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

  -- Identity rules. The form checks these too, and the admin edge function
  -- returns a clean 400, but the trigger is the one path every signup passes
  -- through, including a direct call to the auth API.
  IF requested_country_code = 'NG' THEN
    requested_nin := regexp_replace(requested_nin, '\D', '', 'g');
    IF requested_nin <> '' AND requested_nin !~ '^[0-9]{11}$' THEN
      RAISE EXCEPTION 'A Nigerian NIN must be exactly 11 digits.';
    END IF;
  ELSE
    -- A NIN belongs to a Nigerian account; keeping one on any other country
    -- would be a secret with no meaning attached.
    requested_nin := '';
  END IF;

  IF requested_govt_id_type <> '' AND requested_govt_id_type NOT IN
    ('national_id', 'passport', 'drivers_license', 'voters_card', 'tax_id') THEN
    RAISE EXCEPTION 'Unsupported government ID type.';
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
