-- =========================================================
-- Worker safety rules for Pro Connect and marketplace escrow.
--
-- Five rules, enforced where the money and the contact details actually live
-- rather than promised in copy:
--
--   1. A professional's phone is only released once a client has funded
--      escrow for them. A trafficker will not pay to earn a phone number.
--   2. "No escrow, no movement" is a standing instruction surfaced on every
--      worker screen (frontend) and backed by the funded-only contact gate.
--   3. A client must hold a reviewed government ID before a contract can be
--      created for them. Criminals will not hand over a traceable identity.
--   4. Jobs outside the professional's own city or state are refused unless
--      an admin has approved that specific pairing. Trafficking lures depend
--      on moving a worker far from home.
--   5. Once the worker has uploaded proof photos, a 48 hour clock starts and
--      escrow pays out automatically if the client neither objects nor
--      responds.
--
-- The thresholds are configuration, not constants: worker_safety_settings is
-- admin-writable and every check reads it, so the rules can be tightened
-- without a deploy.
-- =========================================================

-- ---------- 1. Configuration ----------
CREATE TABLE IF NOT EXISTS public.worker_safety_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hide_phone_until_escrow boolean NOT NULL DEFAULT true,
  require_client_identity boolean NOT NULL DEFAULT true,
  allow_cross_state_jobs boolean NOT NULL DEFAULT false,
  auto_release_hours integer NOT NULL DEFAULT 48 CHECK (auto_release_hours BETWEEN 1 AND 336),
  min_work_proof_photos integer NOT NULL DEFAULT 3 CHECK (min_work_proof_photos BETWEEN 1 AND 12),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.worker_safety_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.worker_safety_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.worker_safety_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.worker_safety_settings TO service_role;

DROP POLICY IF EXISTS worker_safety_settings_read ON public.worker_safety_settings;
CREATE POLICY worker_safety_settings_read ON public.worker_safety_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS worker_safety_settings_admin_write ON public.worker_safety_settings;
CREATE POLICY worker_safety_settings_admin_write ON public.worker_safety_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.worker_safety_settings IS
  'Single row of worker safety thresholds. Every rule check reads this row, so admins can tighten the rules live.';

-- ---------- 2. Client identity (rule 3) ----------
CREATE TABLE IF NOT EXISTS public.client_verifications (
  user_id uuid PRIMARY KEY,
  legal_name text NOT NULL CHECK (char_length(trim(legal_name)) BETWEEN 2 AND 120),
  id_type text NOT NULL CHECK (id_type IN ('nin', 'voters_card', 'drivers_license', 'intl_passport')),
  id_last4 text NOT NULL CHECK (id_last4 ~ '^[0-9A-Za-z]{4}$'),
  document_path text,
  funding_account_name text,
  name_match boolean,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_verifications_status_idx
  ON public.client_verifications (status);

ALTER TABLE public.client_verifications ENABLE ROW LEVEL SECURITY;

-- Column level write grants: a client may describe their own identity, but
-- status, name_match and review fields are never theirs to set.
GRANT SELECT ON public.client_verifications TO authenticated;
GRANT INSERT (user_id, legal_name, id_type, id_last4, document_path, funding_account_name)
  ON public.client_verifications TO authenticated;
GRANT UPDATE (legal_name, id_type, id_last4, document_path, funding_account_name, updated_at)
  ON public.client_verifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_verifications TO service_role;

DROP POLICY IF EXISTS client_verifications_own_read ON public.client_verifications;
CREATE POLICY client_verifications_own_read ON public.client_verifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS client_verifications_own_insert ON public.client_verifications;
CREATE POLICY client_verifications_own_insert ON public.client_verifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS client_verifications_own_update ON public.client_verifications;
CREATE POLICY client_verifications_own_update ON public.client_verifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- A non-admin write can never move a row out of pending or set name_match.
CREATE OR REPLACE FUNCTION public.guard_client_verification_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      NEW.status := 'pending';
      NEW.name_match := NULL;
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
      NEW.rejection_reason := NULL;
    END IF;
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.status := OLD.status;
    NEW.name_match := OLD.name_match;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS client_verifications_guard ON public.client_verifications;
CREATE TRIGGER client_verifications_guard
  BEFORE INSERT OR UPDATE ON public.client_verifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_verification_write();

COMMENT ON TABLE public.client_verifications IS
  'One identity record per hiring client. Only last four characters of the ID are stored; the document itself lives in the private client-ids bucket.';

-- Document storage: private, owner-scoped folders.
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-ids', 'client-ids', false)
ON CONFLICT (id) DO NOTHING;

-- ---------- 3. Contract and milestone columns (rules 1, 4, 5) ----------
ALTER TABLE public.escrow_contracts
  ADD COLUMN IF NOT EXISTS buyer_user_id uuid,
  ADD COLUMN IF NOT EXISTS seller_user_id uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS job_city text,
  ADD COLUMN IF NOT EXISTS job_state text,
  ADD COLUMN IF NOT EXISTS job_country text DEFAULT 'NG';

ALTER TABLE public.escrow_milestones
  ADD COLUMN IF NOT EXISTS work_proof_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_release_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_objected_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_objection_reason text;

ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS job_city text,
  ADD COLUMN IF NOT EXISTS job_state text,
  ADD COLUMN IF NOT EXISTS job_country text DEFAULT 'NG';

CREATE INDEX IF NOT EXISTS escrow_contracts_buyer_idx ON public.escrow_contracts (buyer_user_id);
CREATE INDEX IF NOT EXISTS escrow_contracts_seller_idx ON public.escrow_contracts (seller_user_id);
CREATE INDEX IF NOT EXISTS escrow_milestones_due_idx
  ON public.escrow_milestones (auto_release_due_at)
  WHERE auto_release_due_at IS NOT NULL;

-- ---------- 4. Cross state approval (rule 4) ----------
CREATE TABLE IF NOT EXISTS public.cross_state_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id uuid NOT NULL,
  buyer_user_id uuid,
  job_state text NOT NULL,
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  note text
);

ALTER TABLE public.cross_state_approvals ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.cross_state_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cross_state_approvals TO service_role;

DROP POLICY IF EXISTS cross_state_approvals_read ON public.cross_state_approvals;
CREATE POLICY cross_state_approvals_read ON public.cross_state_approvals
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS cross_state_approvals_admin_write ON public.cross_state_approvals;
CREATE POLICY cross_state_approvals_admin_write ON public.cross_state_approvals
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- 5. The contract guard (rules 3 and 4) ----------
CREATE OR REPLACE FUNCTION public.enforce_worker_safety_on_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.worker_safety_settings;
  v_verified boolean;
  v_in_area boolean;
  v_approved boolean;
BEGIN
  -- Direct escrow between two people who already know each other is out of
  -- scope; these rules protect workers sourced through the platform.
  IF NEW.source NOT IN ('marketplace', 'pro_connect') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_settings FROM public.worker_safety_settings WHERE id = 1;
  IF v_settings IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_settings.require_client_identity THEN
    SELECT EXISTS (
      SELECT 1 FROM public.client_verifications cv
      WHERE cv.user_id = NEW.buyer_user_id AND cv.status = 'verified'
    ) INTO v_verified;
    IF NOT COALESCE(v_verified, false) THEN
      RAISE EXCEPTION 'CLIENT_ID_REQUIRED: the client must have a verified government ID before a worker can be booked'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NOT v_settings.allow_cross_state_jobs AND NEW.seller_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.pro_profiles p
      LEFT JOIN public.pro_profile_locations ppl ON ppl.profile_id = p.id
      LEFT JOIN public.pro_locations l ON l.id = ppl.location_id
      WHERE p.user_id = NEW.seller_user_id
        AND (
          (NEW.job_city IS NOT NULL AND p.service_area_text ILIKE '%' || NEW.job_city || '%')
          OR (NEW.job_state IS NOT NULL AND l.state ILIKE NEW.job_state)
        )
    ) INTO v_in_area;

    IF NOT COALESCE(v_in_area, false) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.cross_state_approvals a
        WHERE a.seller_user_id = NEW.seller_user_id
          AND (a.buyer_user_id IS NULL OR a.buyer_user_id = NEW.buyer_user_id)
          AND a.job_state ILIKE COALESCE(NEW.job_state, a.job_state)
          AND (a.expires_at IS NULL OR a.expires_at > now())
      ) INTO v_approved;
      IF NOT COALESCE(v_approved, false) THEN
        RAISE EXCEPTION 'CROSS_STATE_JOB_BLOCKED: this job is outside the worker''s own city and state and no admin approval exists'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS escrow_contracts_safety_guard ON public.escrow_contracts;
CREATE TRIGGER escrow_contracts_safety_guard
  BEFORE INSERT ON public.escrow_contracts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_worker_safety_on_contract();

-- ---------- 6. Work proof and the auto release clock (rule 5) ----------
CREATE TABLE IF NOT EXISTS public.order_work_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  milestone_id uuid,
  uploaded_by uuid NOT NULL,
  photo_count integer NOT NULL CHECK (photo_count BETWEEN 1 AND 12),
  photo_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_work_proofs_order_idx ON public.order_work_proofs (order_id);

ALTER TABLE public.order_work_proofs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.order_work_proofs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_work_proofs TO service_role;

DROP POLICY IF EXISTS order_work_proofs_participants_read ON public.order_work_proofs;
CREATE POLICY order_work_proofs_participants_read ON public.order_work_proofs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_orders o
      WHERE o.id = order_id
        AND (o.client_id = auth.uid() OR public.is_admin()
             OR EXISTS (SELECT 1 FROM public.pro_profiles p
                        WHERE p.id = o.pro_profile_id AND p.user_id = auth.uid()))
    )
  );

CREATE OR REPLACE FUNCTION public.start_escrow_auto_release()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.worker_safety_settings;
BEGIN
  SELECT * INTO v_settings FROM public.worker_safety_settings WHERE id = 1;
  IF v_settings IS NULL OR NEW.milestone_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.photo_count < v_settings.min_work_proof_photos THEN
    RETURN NEW;
  END IF;

  UPDATE public.escrow_milestones
     SET work_proof_count = work_proof_count + NEW.photo_count,
         auto_release_due_at = COALESCE(
           auto_release_due_at,
           now() + make_interval(hours => v_settings.auto_release_hours)
         )
   WHERE id = NEW.milestone_id
     AND state NOT IN ('released', 'refunded')
     AND client_objected_at IS NULL;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS order_work_proofs_timer ON public.order_work_proofs;
CREATE TRIGGER order_work_proofs_timer
  AFTER INSERT ON public.order_work_proofs
  FOR EACH ROW EXECUTE FUNCTION public.start_escrow_auto_release();

-- The worker uploads proof. Only the professional on that order may do it,
-- so a client cannot start the clock on their own behalf.
CREATE OR REPLACE FUNCTION public.record_work_proof(
  p_order_id uuid,
  p_milestone_id uuid,
  p_photo_paths jsonb,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer;
  v_due timestamptz;
  v_settings public.worker_safety_settings;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.marketplace_orders o
    JOIN public.pro_profiles p ON p.id = o.pro_profile_id
    WHERE o.id = p_order_id AND p.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'NOT_YOUR_ORDER: only the professional on this order can submit proof'
      USING ERRCODE = 'check_violation';
  END IF;

  v_count := COALESCE(jsonb_array_length(p_photo_paths), 0);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'PROOF_REQUIRED: attach at least one photo' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.order_work_proofs (order_id, milestone_id, uploaded_by, photo_count, photo_paths, note)
  VALUES (p_order_id, p_milestone_id, v_uid, v_count, p_photo_paths, p_note);

  SELECT * INTO v_settings FROM public.worker_safety_settings WHERE id = 1;
  IF p_milestone_id IS NOT NULL THEN
    SELECT auto_release_due_at INTO v_due FROM public.escrow_milestones WHERE id = p_milestone_id;
  END IF;

  RETURN jsonb_build_object(
    'photo_count', v_count,
    'auto_release_due_at', v_due,
    'auto_release_hours', COALESCE(v_settings.auto_release_hours, 48)
  );
END $$;

-- The client raises a problem, which stops the clock until it is settled.
CREATE OR REPLACE FUNCTION public.object_to_milestone(p_milestone_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.escrow_milestones m
    JOIN public.escrow_contracts c ON c.id = m.contract_id
    WHERE m.id = p_milestone_id AND c.buyer_user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'NOT_YOUR_MILESTONE' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.escrow_milestones
     SET client_objected_at = now(),
         client_objection_reason = NULLIF(trim(p_reason), '')
   WHERE id = p_milestone_id AND state NOT IN ('released', 'refunded');

  RETURN true;
END $$;

-- Admin approval for a job outside the worker's area.
CREATE OR REPLACE FUNCTION public.approve_cross_state_job(
  p_order_id uuid,
  p_note text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.marketplace_orders;
  v_seller uuid;
  v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_order FROM public.marketplace_orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'check_violation';
  END IF;

  SELECT p.user_id INTO v_seller FROM public.pro_profiles p WHERE p.id = v_order.pro_profile_id;

  INSERT INTO public.cross_state_approvals
    (seller_user_id, buyer_user_id, job_state, approved_by, expires_at, note)
  VALUES (
    v_seller,
    v_order.client_id,
    COALESCE(v_order.job_state, 'UNKNOWN'),
    v_uid,
    COALESCE(p_expires_at, now() + interval '14 days'),
    p_note
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- The release worker asks this which milestones are due.
CREATE OR REPLACE FUNCTION public.escrow_auto_release_due(p_limit integer DEFAULT 25)
RETURNS TABLE (milestone_id uuid, contract_id uuid, amount_minor bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.contract_id, m.amount_minor
  FROM public.escrow_milestones m
  JOIN public.escrow_contracts c ON c.id = m.contract_id
  WHERE m.auto_release_due_at IS NOT NULL
    AND m.auto_release_due_at <= now()
    AND m.client_objected_at IS NULL
    AND m.auto_released_at IS NULL
    AND m.state NOT IN ('released', 'refunded')
    AND c.held_minor > c.released_minor
  ORDER BY m.auto_release_due_at
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$$;

-- ---------- 7. The contact gate (rules 1 and 2) ----------
CREATE OR REPLACE FUNCTION public.get_pro_public_phone(p_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_phone text;
  v_owner uuid;
  v_hide boolean;
  v_funded boolean;
BEGIN
  SELECT COALESCE((SELECT hide_phone_until_escrow FROM public.worker_safety_settings WHERE id = 1), true)
    INTO v_hide;

  SELECT p.contact_phone, p.user_id INTO v_phone, v_owner
  FROM public.pro_profiles p
  WHERE p.slug = p_slug
    AND p.is_listed = true
    AND p.contact_phone_public = true
    AND p.contact_phone IS NOT NULL
    AND length(regexp_replace(p.contact_phone, '[^0-9]', '', 'g')) >= 7;

  IF v_phone IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT v_hide THEN
    RETURN v_phone;
  END IF;

  IF v_uid IS NOT NULL AND (v_uid = v_owner OR public.is_admin()) THEN
    RETURN v_phone;
  END IF;

  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.escrow_contracts c
    WHERE c.buyer_user_id = v_uid
      AND c.seller_user_id = v_owner
      AND (c.held_minor > 0 OR c.status IN ('funded', 'held', 'part_released'))
  ) OR EXISTS (
    SELECT 1
    FROM public.marketplace_orders o
    JOIN public.pro_profiles p ON p.id = o.pro_profile_id
    WHERE o.client_id = v_uid
      AND p.user_id = v_owner
      AND o.escrow_contract_id IS NOT NULL
  ) INTO v_funded;

  IF COALESCE(v_funded, false) THEN
    RETURN v_phone;
  END IF;

  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.pro_contact_access(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_phone text := public.get_pro_public_phone(p_slug);
  v_published boolean;
BEGIN
  SELECT (p.contact_phone IS NOT NULL AND p.contact_phone_public)
    INTO v_published
  FROM public.pro_profiles p
  WHERE p.slug = p_slug;

  RETURN jsonb_build_object(
    'phone', v_phone,
    'phone_published_by_pro', COALESCE(v_published, false),
    'requires_funded_escrow', NOT (v_phone IS NOT NULL),
    'reason',
      CASE
        WHEN v_phone IS NOT NULL THEN 'unlocked'
        WHEN NOT COALESCE(v_published, false) THEN 'professional_has_not_published_a_number'
        WHEN v_uid IS NULL THEN 'sign_in_and_fund_escrow_to_reveal'
        ELSE 'fund_escrow_for_this_professional_to_reveal'
      END
  );
END $$;

-- ---------- 8. Grants and cron ----------
GRANT EXECUTE ON FUNCTION public.get_pro_public_phone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pro_contact_access(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_work_proof(uuid, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.object_to_milestone(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_cross_state_job(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escrow_auto_release_due(integer) TO service_role;

-- A cron secret so the release worker can be woken without a user session.
INSERT INTO public.frelux_internal_config (name, value)
VALUES ('escrow_autorelease_cron_secret', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (name) DO NOTHING;

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('escrow-auto-release');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    PERFORM cron.schedule(
      'escrow-auto-release',
      '*/15 * * * *',
      $job$
        select net.http_post(
          url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/escrow-release',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-frelux-cron-secret',
            coalesce((select value from public.frelux_internal_config
                      where name = 'escrow_autorelease_cron_secret'), '')
          ),
          body := jsonb_build_object('action', 'auto_release'),
          timeout_milliseconds := 20000
        );
      $job$
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'escrow-auto-release schedule skipped: %', SQLERRM;
  END;
END $$;
