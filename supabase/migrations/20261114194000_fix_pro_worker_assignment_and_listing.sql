-- Fix pro worker assignment and directory listing
-- 1. Ensure pro_profiles.is_listed default is true
-- 2. Update admin_update_pro_profile to upsert/create pro_profiles when an admin assigns a user as pro_worker
-- 3. Grant SELECT on all public directory columns to anon and authenticated

ALTER TABLE public.pro_profiles ALTER COLUMN is_listed SET DEFAULT true;

CREATE OR REPLACE FUNCTION public.admin_update_pro_profile(
  p_user_id uuid,
  p_patch jsonb,
  p_actor uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_actor uuid := COALESCE(p_actor, auth.uid());
  v_display_name text;
  v_slug text;
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id INTO v_profile_id FROM public.pro_profiles WHERE user_id = p_user_id;

  IF v_profile_id IS NULL THEN
    v_display_name := COALESCE(NULLIF(btrim(p_patch ->> 'display_name'), ''), 'Professional');
    v_slug := 'pro-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);

    INSERT INTO public.pro_profiles (
      user_id,
      display_name,
      slug,
      business_name,
      bio,
      years_experience,
      availability,
      is_listed,
      is_profile_complete,
      verification_status
    ) VALUES (
      p_user_id,
      v_display_name,
      v_slug,
      NULLIF(btrim(p_patch ->> 'business_name'), ''),
      NULLIF(btrim(p_patch ->> 'bio'), ''),
      CASE WHEN (p_patch ->> 'years_experience') ~ '^[0-9]{1,2}$' THEN (p_patch ->> 'years_experience')::int ELSE NULL END,
      COALESCE(NULLIF(p_patch ->> 'availability', ''), 'available'),
      COALESCE((p_patch ->> 'is_listed')::boolean, true),
      true,
      COALESCE(NULLIF(p_patch ->> 'verification_status', ''), 'verified')
    )
    RETURNING id INTO v_profile_id;
  ELSE
    -- Whitelisted columns only.
    UPDATE public.pro_profiles SET
      display_name = CASE
        WHEN p_patch ? 'display_name'
          THEN NULLIF(btrim(p_patch ->> 'display_name'), '')
        ELSE display_name END,
      business_name = CASE
        WHEN p_patch ? 'business_name'
          THEN NULLIF(btrim(p_patch ->> 'business_name'), '')
        ELSE business_name END,
      bio = CASE
        WHEN p_patch ? 'bio' THEN NULLIF(btrim(p_patch ->> 'bio'), '')
        ELSE bio END,
      years_experience = CASE
        WHEN p_patch ? 'years_experience' AND (p_patch ->> 'years_experience') ~ '^[0-9]{1,2}$'
          THEN (p_patch ->> 'years_experience')::int
        ELSE years_experience END,
      availability = CASE
        WHEN p_patch ->> 'availability' IN ('available', 'busy', 'unavailable')
          THEN p_patch ->> 'availability'
        ELSE availability END,
      is_listed = CASE
        WHEN p_patch ? 'is_listed' THEN (p_patch ->> 'is_listed')::boolean
        ELSE is_listed END,
      verification_status = CASE
        WHEN p_patch ->> 'verification_status'
          IN ('unverified', 'pending', 'verified', 'suspended')
          THEN p_patch ->> 'verification_status'
        ELSE verification_status END,
      updated_at = now()
    WHERE id = v_profile_id;
  END IF;

  INSERT INTO public.admin_account_events (
    user_id, actor_id, action, detail
  ) VALUES (p_user_id, v_actor, 'update_pro_profile', p_patch);

  RETURN jsonb_build_object('ok', true, 'profile_id', v_profile_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_pro_profile(uuid, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_pro_profile(uuid, jsonb, uuid) TO authenticated, service_role;

DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pro_profiles'
    AND column_name NOT IN ('contact_phone', 'phone_number');

  IF cols IS NOT NULL THEN
    EXECUTE format('GRANT SELECT (%s) ON public.pro_profiles TO anon, authenticated', cols);
  END IF;
END $$;
