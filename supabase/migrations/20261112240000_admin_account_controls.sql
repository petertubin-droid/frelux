-- =========================================================
-- Admin controls over professional and client accounts
-- Migration: 20261112240000_admin_account_controls.sql
--
-- The admin could invite, edit and hard-delete a user, but could not suspend or
-- revoke one, and there was no record of who did what. A suspended professional
-- also stayed in the public directory, because nothing linked account state to
-- the listing.
--
-- This adds:
--   • account_state on profiles (active | suspended | revoked) with reason and
--     who changed it, mirrored onto the professional listing so a suspended pro
--     disappears from the directory instead of remaining bookable.
--   • admin_account_events, an append-only audit of every admin action.
--   • admin_list_accounts — paginated register of pros and clients.
--   • admin_set_account_state — suspend, revoke, restore, with a reason.
--   • admin_update_pro_profile — whitelisted professional fields.
--   • admin_account_has_history — decides whether an account can be deleted at
--     all, so financial and dispute history is not destroyed by a button.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.admin_account_has_history(uuid);
--   DROP FUNCTION IF EXISTS public.admin_update_pro_profile(uuid, jsonb, uuid);
--   DROP FUNCTION IF EXISTS public.admin_set_account_state(uuid, text, text, uuid);
--   DROP FUNCTION IF EXISTS public.admin_list_accounts(text, text, text, integer, integer);
--   DROP TRIGGER IF EXISTS trg_sync_pro_listing_on_account_state ON public.profiles;
--   DROP FUNCTION IF EXISTS public.sync_pro_listing_on_account_state();
--   DROP TABLE IF EXISTS public.admin_account_events;
--   ALTER TABLE public.profiles
--     DROP CONSTRAINT IF EXISTS profiles_account_state_check,
--     DROP COLUMN IF EXISTS account_state,
--     DROP COLUMN IF EXISTS account_state_reason,
--     DROP COLUMN IF EXISTS account_state_changed_at,
--     DROP COLUMN IF EXISTS account_state_changed_by;
-- =========================================================

-- ---------------------------------------------------------
-- 1. Account state
-- ---------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_state text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS account_state_reason text,
  ADD COLUMN IF NOT EXISTS account_state_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_state_changed_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_state_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_state_check
      CHECK (account_state IN ('active', 'suspended', 'revoked'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_account_state
  ON public.profiles (account_state);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type_created
  ON public.profiles (account_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at
  ON public.profiles (created_at DESC);

-- ---------------------------------------------------------
-- 2. Audit trail
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_account_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL CHECK (
    action IN ('suspend', 'revoke', 'restore', 'update', 'delete', 'create')
  ),
  from_state text,
  to_state text,
  reason text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_account_events_user
  ON public.admin_account_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_account_events_created
  ON public.admin_account_events (created_at DESC);

ALTER TABLE public.admin_account_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_account_events" ON public.admin_account_events;
CREATE POLICY "admin_read_account_events"
  ON public.admin_account_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- No insert/update/delete policy on purpose: only the SECURITY DEFINER
-- functions below write here, so the trail cannot be edited from a client.

-- ---------------------------------------------------------
-- 3. State changes reach the public directory
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_pro_listing_on_account_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_state IS DISTINCT FROM OLD.account_state THEN
    NEW.account_state_changed_at := now();

    -- A suspended or revoked professional must not stay bookable. The listing
    -- is hidden rather than deleted: history, reviews and escrow stay intact.
    IF NEW.account_state <> 'active' THEN
      UPDATE public.pro_profiles
         SET is_listed = false,
             verification_status = 'suspended',
             updated_at = now()
       WHERE user_id = NEW.id
         AND (is_listed = true OR verification_status <> 'suspended');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pro_listing_on_account_state ON public.profiles;
CREATE TRIGGER trg_sync_pro_listing_on_account_state
  BEFORE UPDATE OF account_state ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_pro_listing_on_account_state();

-- ---------------------------------------------------------
-- 4. Paginated register of pros and clients
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_accounts(
  p_kind text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_search text := NULLIF(btrim(COALESCE(p_search, '')), '');
  v_kind text := NULLIF(btrim(LOWER(COALESCE(p_kind, ''))), '');
  v_state text := NULLIF(btrim(LOWER(COALESCE(p_state, ''))), '');
  v_rows jsonb;
  v_total bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_kind IS NOT NULL AND v_kind NOT IN ('pro', 'client') THEN
    RAISE EXCEPTION 'Kind must be pro or client';
  END IF;

  IF v_state IS NOT NULL AND v_state NOT IN ('active', 'suspended', 'revoked') THEN
    RAISE EXCEPTION 'State must be active, suspended or revoked';
  END IF;

  WITH joined AS (
    SELECT pr.id,
           pr.email,
           pr.full_name,
           pr.phone,
           pr.account_type,
           pr.account_state,
           pr.account_state_reason,
           pr.account_state_changed_at,
           pr.role,
           pr.created_at,
           pp.id            AS pro_profile_id,
           pp.display_name,
           pp.business_name,
           pp.slug,
           pp.verification_status,
           pp.is_listed,
           pp.years_experience,
           pp.availability,
           pp.category_id
      FROM public.profiles pr
      LEFT JOIN public.pro_profiles pp ON pp.user_id = pr.id
     WHERE pr.role <> 'admin'
       AND (
         v_kind IS NULL
         OR (v_kind = 'pro' AND pp.id IS NOT NULL)
         OR (v_kind = 'client' AND pp.id IS NULL)
       )
       AND (v_state IS NULL OR pr.account_state = v_state)
       AND (
         v_search IS NULL
         OR pr.email ILIKE '%' || v_search || '%'
         OR COALESCE(pr.full_name, '') ILIKE '%' || v_search || '%'
         OR COALESCE(pr.phone, '') ILIKE '%' || v_search || '%'
         OR COALESCE(pp.display_name, '') ILIKE '%' || v_search || '%'
         OR COALESCE(pp.business_name, '') ILIKE '%' || v_search || '%'
       )
  )
  SELECT count(*) INTO v_total FROM joined;

  WITH joined AS (
    SELECT pr.id,
           pr.email,
           pr.full_name,
           pr.phone,
           pr.account_type,
           pr.account_state,
           pr.account_state_reason,
           pr.account_state_changed_at,
           pr.role,
           pr.created_at,
           pp.id            AS pro_profile_id,
           pp.display_name,
           pp.business_name,
           pp.slug,
           pp.verification_status,
           pp.is_listed,
           pp.years_experience,
           pp.availability,
           pp.category_id
      FROM public.profiles pr
      LEFT JOIN public.pro_profiles pp ON pp.user_id = pr.id
     WHERE pr.role <> 'admin'
       AND (
         v_kind IS NULL
         OR (v_kind = 'pro' AND pp.id IS NOT NULL)
         OR (v_kind = 'client' AND pp.id IS NULL)
       )
       AND (v_state IS NULL OR pr.account_state = v_state)
       AND (
         v_search IS NULL
         OR pr.email ILIKE '%' || v_search || '%'
         OR COALESCE(pr.full_name, '') ILIKE '%' || v_search || '%'
         OR COALESCE(pr.phone, '') ILIKE '%' || v_search || '%'
         OR COALESCE(pp.display_name, '') ILIKE '%' || v_search || '%'
         OR COALESCE(pp.business_name, '') ILIKE '%' || v_search || '%'
       )
     ORDER BY pr.created_at DESC, pr.id
     LIMIT v_limit OFFSET v_offset
  )
  SELECT COALESCE(jsonb_agg(row_to_json(joined)), '[]'::jsonb) INTO v_rows FROM joined;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset
  );
END;
$$;

-- ---------------------------------------------------------
-- 5. Suspend, revoke, restore
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_account_state(
  p_user_id uuid,
  p_state text,
  p_reason text DEFAULT NULL,
  p_actor uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text := LOWER(btrim(COALESCE(p_state, '')));
  v_reason text := NULLIF(btrim(COALESCE(p_reason, '')), '');
  v_role text;
  v_from text;
  -- Called from the browser as the admin, or from admin-user-management with the
  -- service role after it has already proved the caller is an admin.
  v_actor uuid := COALESCE(p_actor, auth.uid());
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_state NOT IN ('active', 'suspended', 'revoked') THEN
    RAISE EXCEPTION 'State must be active, suspended or revoked';
  END IF;

  IF v_state <> 'active' AND (v_reason IS NULL OR length(v_reason) < 3) THEN
    RAISE EXCEPTION 'Give a reason of at least 3 characters';
  END IF;

  SELECT role, account_state INTO v_role, v_from
    FROM public.profiles WHERE id = p_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  IF v_role = 'admin' THEN
    RAISE EXCEPTION 'Admin accounts cannot be suspended or revoked here';
  END IF;

  IF v_from = v_state THEN
    RETURN jsonb_build_object('ok', true, 'state', v_state, 'unchanged', true);
  END IF;

  UPDATE public.profiles
     SET account_state = v_state,
         account_state_reason = CASE WHEN v_state = 'active' THEN NULL ELSE v_reason END,
         account_state_changed_by = v_actor
   WHERE id = p_user_id;

  INSERT INTO public.admin_account_events (
    user_id, actor_id, action, from_state, to_state, reason
  ) VALUES (
    p_user_id,
    v_actor,
    CASE v_state
      WHEN 'suspended' THEN 'suspend'
      WHEN 'revoked' THEN 'revoke'
      ELSE 'restore'
    END,
    v_from,
    v_state,
    v_reason
  );

  RETURN jsonb_build_object('ok', true, 'state', v_state, 'previous', v_from);
END;
$$;

-- ---------------------------------------------------------
-- 6. Professional fields an admin may edit
-- ---------------------------------------------------------
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
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id INTO v_profile_id FROM public.pro_profiles WHERE user_id = p_user_id;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'This account has no professional profile';
  END IF;

  -- Whitelisted columns only. Anything else in the patch is ignored rather than
  -- trusted, so a stray key cannot reach a column an admin should not set.
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

  INSERT INTO public.admin_account_events (
    user_id, actor_id, action, detail
  ) VALUES (p_user_id, v_actor, 'update', p_patch);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------
-- 7. Can this account be deleted without destroying history?
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_account_has_history(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_found boolean;
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Checked by reflection so a renamed column cannot silently turn this into
  -- "no history" and let a delete through.
  FOR r IN
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.column_name IN ('buyer_id', 'seller_id', 'created_by', 'user_id')
       AND c.table_name IN (
         'escrow_contracts',
         'marketplace_orders',
         'marketplace_inquiries',
         'subscription_purchases',
         'pro_verification_requests',
         'quotation_requests'
       )
  LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM public.%I WHERE %I = $1)',
      r.table_name, r.column_name
    ) INTO v_found USING p_user_id;

    IF v_found THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

-- ---------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_list_accounts(text, text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_account_state(uuid, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_pro_profile(uuid, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_account_has_history(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_accounts(text, text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_account_state(uuid, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_pro_profile(uuid, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_account_has_history(uuid) TO authenticated, service_role;
