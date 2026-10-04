-- =========================================================
-- GDPR/CCPA data subject request intake
--
-- Public insert (identity verified by email before any data
-- is touched), admin-only read/resolve. Keeps an auditable
-- record of every privacy request and its outcome.
-- =========================================================

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  request_type  text NOT NULL CHECK (request_type <> ''),
  details       text,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'in_progress', 'done', 'rejected')),
  resolution_note text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subject_requests FORCE ROW LEVEL SECURITY;

-- Anyone may file a request; only admins can read or act on them.
DROP POLICY IF EXISTS "dsr_anon_insert" ON data_subject_requests;
CREATE POLICY "dsr_anon_insert" ON data_subject_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (position('@' in email) > 1 AND request_type <> '');

DROP POLICY IF EXISTS "dsr_admin_read" ON data_subject_requests;
CREATE POLICY "dsr_admin_read" ON data_subject_requests
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "dsr_admin_update" ON data_subject_requests;
CREATE POLICY "dsr_admin_update" ON data_subject_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER "dsr_set_updated_at"
  BEFORE UPDATE ON data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
