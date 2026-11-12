-- =========================================================
-- Storage for the two pieces of evidence the safety rules depend on.
--
-- client-ids holds the identity document behind a verification. It is private
-- and scoped to the person who uploaded it, because that folder is the only
-- thing standing between a NIN slip and the open internet.
--
-- work-proofs holds the photos that start the 48 hour payout clock. Those are
-- job site photos: private bucket, uploaded only into your own folder, readable
-- by signed in users so a client can look at the work before the clock runs out.
-- =========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('client-ids', 'client-ids', false),
  ('work-proofs', 'work-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ---------- client-ids ----------
DROP POLICY IF EXISTS client_ids_owner_read ON storage.objects;
CREATE POLICY client_ids_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-ids'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS client_ids_owner_write ON storage.objects;
CREATE POLICY client_ids_owner_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-ids'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS client_ids_owner_delete ON storage.objects;
CREATE POLICY client_ids_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-ids'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- work-proofs ----------
DROP POLICY IF EXISTS work_proofs_upload_own_folder ON storage.objects;
CREATE POLICY work_proofs_upload_own_folder ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'work-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Signed in readers only: the client has to see the work being claimed.
DROP POLICY IF EXISTS work_proofs_read_authenticated ON storage.objects;
CREATE POLICY work_proofs_read_authenticated ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'work-proofs');

DROP POLICY IF EXISTS work_proofs_delete_own ON storage.objects;
CREATE POLICY work_proofs_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'work-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- Blocking bug found while testing the buckets above ----------
-- The project_evidence_read policy on storage.objects calls
-- public.is_project_member(), but authenticated had no EXECUTE on it. Postgres
-- raises "permission denied for function is_project_member" instead of simply
-- failing the policy, and because a storage insert runs with a returning
-- clause it evaluates SELECT policies too. The result was that every signed-in
-- upload to every bucket failed with 400, not just the new ones.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_project_member'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', fn.signature);
  END LOOP;
END $$;
