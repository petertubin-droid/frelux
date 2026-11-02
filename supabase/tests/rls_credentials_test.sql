-- =========================================================
-- FRELUX Phase 2: RLS + storage integration tests
-- supabase/tests/rls_credentials_test.sql
--
-- Live integration checks for the credential security model.
-- Safe to re-run: everything happens inside a rolled-back
-- transaction; seed rows never persist.
-- =========================================================

BEGIN;

CREATE TEMP TABLE rls_results (
  check_name text,
  result text,
  detail text
);

-- Seed (rolled back at the end): a worker user, profile,
-- one credential and one event.
INSERT INTO auth.users (id, email, raw_app_meta_data)
VALUES ('11111111-1111-1111-1111-111111111111', 'rls-test-worker@example.invalid',
        '{"provider":"email","providers":["email"]}'::jsonb);
-- handle_new_user creates the profile automatically; we only
-- need to point its marketplace membership at an existing one.
UPDATE public.profiles
   SET account_type = 'pro_worker'
 WHERE id = '11111111-1111-1111-1111-111111111111';
INSERT INTO public.pro_profiles (id, user_id, display_name, slug)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
        'RLS Test Pro', 'rls-test-pro');
INSERT INTO public.pro_credentials (profile_id, professional_body, registration_number,
  credential_type, verification_status, expires_at)
VALUES ('22222222-2222-2222-2222-222222222222', 'Test Body', 'TEST-1', 'license',
  'pending_review', current_date + 30);
INSERT INTO public.pro_credential_events (credential_id, event_type, actor_role)
SELECT id, 'submission', 'worker' FROM public.pro_credentials
WHERE profile_id = '22222222-2222-2222-2222-222222222222';

CREATE OR REPLACE FUNCTION public._rls_expect_denied(
  p_name text,
  p_role text,
  p_claims jsonb,
  p_query text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_failed text := NULL;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims', p_claims::text, true);
    EXECUTE format('SET LOCAL role %I', p_role);
    EXECUTE p_query;
    v_failed := 'query was allowed when it must not be';
    EXCEPTION WHEN OTHERS THEN
      v_failed := NULL;
      IF position('rls_results' in sqlerrm) > 0 THEN
        RAISE;
      END IF;
      v_failed := 'PASS::' || left(sqlerrm, 160);
    END;
    PERFORM set_config('request.jwt.claims', '', true);
    SET LOCAL role postgres;
    IF v_failed IS NULL THEN
      INSERT INTO rls_results VALUES (p_name, 'PASS', 'denied as required');
    ELSIF v_failed LIKE 'PASS::%' THEN
      INSERT INTO rls_results VALUES (p_name, 'PASS', substr(v_failed, 7));
    ELSE
      INSERT INTO rls_results VALUES (p_name, 'FAIL', v_failed);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._rls_expect_zero_rows(
  p_name text,
  p_role text,
  p_claims jsonb,
  p_query text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
  v_err text := NULL;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims', p_claims::text, true);
    EXECUTE format('SET LOCAL role %I', p_role);
    EXECUTE p_query;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_err := left(sqlerrm, 160);
    v_count := 0;
  END;
  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL role postgres;
  IF v_err IS NOT NULL THEN
    INSERT INTO rls_results VALUES (p_name, 'PASS', v_err);
  ELSIF v_count = 0 THEN
    INSERT INTO rls_results VALUES (p_name, 'PASS', 'zero rows visible/affected as required');
  ELSE
    INSERT INTO rls_results VALUES (p_name, 'FAIL', format('%s rows were visible/affected', v_count));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._rls_expect_allowed(
  p_name text,
  p_role text,
  p_claims jsonb,
  p_query text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_err text := NULL;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims', p_claims::text, true);
    EXECUTE format('SET LOCAL role %I', p_role);
    EXECUTE p_query;
  EXCEPTION WHEN OTHERS THEN
    v_err := left(sqlerrm, 160);
  END;
  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL role postgres;
  IF v_err IS NULL THEN
    INSERT INTO rls_results VALUES (p_name, 'PASS', 'expected access confirmed');
  ELSE
    INSERT INTO rls_results VALUES (p_name, 'FAIL', v_err);
  END IF;
END;
$$;

-- Worker JWT: owns the seeded profile/credential.
-- 'ob' carries nothing role-related; policies only read sub/is_admin claims.
DO $block$
DECLARE
  worker_claims jsonb := jsonb_build_object(
    'sub', '11111111-1111-1111-1111-111111111111',
    'role', 'authenticated',
    'email', 'rls-test-worker@example.invalid',
    'is_admin', false);
  stranger_claims jsonb := jsonb_build_object(
    'sub', '33333333-3333-3333-3333-333333333333',
    'role', 'authenticated',
    'email', 'rls-test-stranger@example.invalid',
    'is_admin', false);
  admin_claims jsonb := jsonb_build_object(
    'sub', '44444444-4444-4444-4444-444444444444',
    'role', 'authenticated',
    'email', 'rls-test-admin@example.invalid',
    'is_admin', true);
BEGIN
  -- 1. anon sees nothing in pro_credentials
  PERFORM public._rls_expect_zero_rows(
    'anon_cannot_read_credentials', 'anon', NULL,
    'SELECT 1 FROM public.pro_credentials');
  -- 2. a stranger sees nothing (not the owner, not admin)
  PERFORM public._rls_expect_zero_rows(
    'stranger_cannot_read_credentials', 'authenticated', stranger_claims,
    'SELECT 1 FROM public.pro_credentials');
  -- 3. the owner can read their own credential
  PERFORM public._rls_expect_allowed(
    'owner_reads_own_credential', 'authenticated', worker_claims,
    'SELECT 1 FROM public.pro_credentials WHERE profile_id = ''22222222-2222-2222-2222-222222222222''');
  -- 4. the owner cannot flip verification_status on their own credential
  PERFORM public._rls_expect_denied(
    'owner_cannot_self_verify_update', 'authenticated', worker_claims,
    'UPDATE public.pro_credentials SET verification_status = ''verified_by_source''');
  -- 5. the owner cannot INSERT a self-verified credential
  PERFORM public._rls_expect_denied(
    'owner_cannot_insert_verified_status', 'authenticated', worker_claims,
    'INSERT INTO public.pro_credentials (profile_id, professional_body, registration_number, credential_type, verification_status)
       VALUES (''22222222-2222-2222-2222-222222222222'', ''X'', ''X1'', ''license'', ''verified_by_source'')');
  -- an honest insert (no status) lands as unverified/submitted
  PERFORM public._rls_expect_allowed(
    'owner_plain_insert_allowed', 'authenticated', worker_claims,
    'INSERT INTO public.pro_credentials (profile_id, professional_body, registration_number, credential_type)
       VALUES (''22222222-2222-2222-2222-222222222222'', ''X'', ''X1'', ''license'')');
  IF EXISTS (SELECT 1 FROM public.pro_credentials
             WHERE professional_body = 'X'
               AND verification_status NOT IN ('submitted', 'unverified')) THEN
    INSERT INTO rls_results VALUES ('owner_plain_insert_status_honest', 'FAIL', 'plain insert landed with a verification status');
  ELSE
    INSERT INTO rls_results VALUES ('owner_plain_insert_status_honest', 'PASS', 'plain insert stays submitted/unverified');
  END IF;
  -- 6. the owner cannot tamper with the append-only event trail
  PERFORM public._rls_expect_zero_rows(
    'owner_cannot_update_events', 'authenticated', worker_claims,
    'UPDATE public.pro_credential_events SET reason = ''forged''');
  PERFORM public._rls_expect_zero_rows(
    'owner_cannot_delete_events', 'authenticated', worker_claims,
    'DELETE FROM public.pro_credential_events');
  -- 7. the owner can read their own event trail
  PERFORM public._rls_expect_allowed(
    'owner_reads_own_events', 'authenticated', worker_claims,
    'SELECT 1 FROM public.pro_credential_events');
  -- 8. an admin can update a verification outcome (reviewer path)
  PERFORM public._rls_expect_allowed(
    'admin_verifies_credential', 'authenticated', admin_claims,
    'UPDATE public.pro_credentials SET verification_status = ''verified_by_reviewer'', verified_at = now()');
  -- 9. workers cannot write verification sources
  PERFORM public._rls_expect_denied(
    'worker_cannot_write_sources', 'authenticated', worker_claims,
    'INSERT INTO public.credential_verification_sources (country_code, credential_class, lookup_type, is_active)
       VALUES (''NG'', ''trade_registration'', ''manual_review'', false)');
  -- 10. an expired credential never shows as verified in the public view
  INSERT INTO public.pro_credentials (profile_id, professional_body, registration_number,
    credential_type, verification_status, expires_at)
  VALUES ('22222222-2222-2222-2222-222222222222', 'Expired Body', 'TEST-2', 'license',
    'verified_by_reviewer', current_date - 1);
  IF EXISTS (SELECT 1 FROM public.pro_credentials_public
             WHERE professional_body = 'Expired Body') THEN
    INSERT INTO rls_results VALUES ('public_view_excludes_expired', 'FAIL', 'expired credential is publicly visible');
  ELSE
    INSERT INTO rls_results VALUES ('public_view_excludes_expired', 'PASS', 'expired credential not publicly visible');
  END IF;
END
$block$;

-- 11. The public view leaks no sensitive columns at all.
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'pro_credentials_public'
               AND column_name IN ('registration_number', 'document_path',
                                    'verified_by', 'insurance_policy_number',
                                    'insurance_provider', 'notes')) THEN
    INSERT INTO rls_results VALUES ('public_view_has_no_sensitive_columns', 'FAIL', 'sensitive column exposed in public view');
  ELSE
    INSERT INTO rls_results VALUES ('public_view_has_no_sensitive_columns', 'PASS', 'no sensitive columns in public view');
  END IF;
END
$block$;

-- 12. Storage: the pro-verification bucket is private and every
-- policy on it is restricted to authenticated users (no public).
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets
             WHERE id = 'pro-verification' AND public = true) THEN
    INSERT INTO rls_results VALUES ('verification_bucket_is_private', 'FAIL', 'bucket is public');
  ELSE
    INSERT INTO rls_results VALUES ('verification_bucket_is_private', 'PASS', 'bucket is private');
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE schemaname = 'storage'
               AND (policyname ILIKE '%pro-verification%'
                    OR (policyname ILIKE '%verification%' AND cmd = 'SELECT'))
               AND roles = '{public}') THEN
    INSERT INTO rls_results VALUES ('verification_bucket_policies_authenticated_only', 'FAIL', 'public policy on verification storage');
  ELSE
    INSERT INTO rls_results VALUES ('verification_bucket_policies_authenticated_only', 'PASS', 'no public storage policy');
  END IF;
END
$block$;

SELECT * FROM rls_results ORDER BY check_name;

ROLLBACK;
