-- =========================================================
-- FRELUX 20261016020000: WORKFLOW CROSS-ROLE HANDOFF
--
-- Lets a project OWNER hand a workflow document (RFI,
-- submittal, change order) to another registered user by
-- email, without loosening the owner-scoped RLS anywhere:
--
--   * workflow_participants — (document, email, role) rows.
--     'reviewer' can act on the document (transitions,
--     revisions, comments); 'viewer' is read-only.
--   * is_workflow_participant() / is_workflow_reviewer() —
--     SECURITY DEFINER membership helpers that match the
--     caller's own profiles.email against the invite rows.
--     SECURITY DEFINER is deliberate: the policy evaluates
--     per-row, and the helper must not depend on the caller's
--     ability to read workflow_participants or profiles.
--   * Additive SELECT/UPDATE/INSERT policies only. The
--     existing owner policies and the immutable events model
--     are untouched — participants can NEVER insert or delete
--     documents, and events/revisions stay append-only.
--   * workflow_documents_immutable_guard — BEFORE UPDATE
--     trigger: project_id, doc_type, reference_code and
--     created_by can never change post-creation, for any role
--     (this is what makes the reviewer UPDATE policy safe: a
--     reviewer can transition status but can never move a
--     document into a project the owner did not choose).
-- =========================================================

CREATE TABLE IF NOT EXISTS public.workflow_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.workflow_documents(id) ON DELETE CASCADE,
  -- invite target, always stored lowercased; must be a
  -- registered user's profiles.email to have any effect
  email text NOT NULL,
  -- 'reviewer' can act; 'viewer' can only read
  participant_role text NOT NULL CHECK (participant_role IN ('reviewer','viewer')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, email)
);

CREATE INDEX IF NOT EXISTS idx_workflow_participants_doc
  ON public.workflow_participants(document_id);

COMMENT ON TABLE public.workflow_participants IS
  'Cross-role handoff invites for workflow documents. Owners grant by email; membership helpers drive all participant RLS scopes.';

-- ---------------------------------------------------------
-- Membership helpers (SECURITY DEFINER, STABLE)
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_workflow_participant(
  p_document_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workflow_participants wp
    JOIN public.profiles pr ON pr.id = auth.uid()
    WHERE wp.document_id = p_document_id
      AND lower(wp.email) = lower(pr.email)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workflow_reviewer(
  p_document_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workflow_participants wp
    JOIN public.profiles pr ON pr.id = auth.uid()
    WHERE wp.document_id = p_document_id
      AND wp.participant_role = 'reviewer'
      AND lower(wp.email) = lower(pr.email)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_workflow_participant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workflow_reviewer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_workflow_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workflow_reviewer(uuid) TO authenticated;

-- ---------------------------------------------------------
-- RLS: workflow_participants
-- ---------------------------------------------------------

ALTER TABLE public.workflow_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_participants FORCE ROW LEVEL SECURITY;

-- Owners manage the invite list for their own documents.
DROP POLICY IF EXISTS "Owners manage workflow participants" ON public.workflow_participants;
CREATE POLICY "Owners manage workflow participants"
  ON public.workflow_participants FOR ALL
  TO authenticated
  USING (
    document_id IN (
      SELECT wd.id
      FROM public.workflow_documents wd
      JOIN public.contractor_projects cp ON cp.id = wd.project_id
      WHERE cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    document_id IN (
      SELECT wd.id
      FROM public.workflow_documents wd
      JOIN public.contractor_projects cp ON cp.id = wd.project_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Participants can see who else is on the document.
DROP POLICY IF EXISTS "Participants read workflow participants" ON public.workflow_participants;
CREATE POLICY "Participants read workflow participants"
  ON public.workflow_participants FOR SELECT
  TO authenticated
  USING (public.is_workflow_participant(document_id));

-- ---------------------------------------------------------
-- RLS: additive participant scopes on existing tables
-- (owner policies stay exactly as they were)
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Participants view shared workflow documents" ON public.workflow_documents;
CREATE POLICY "Participants view shared workflow documents"
  ON public.workflow_documents FOR SELECT
  TO authenticated
  USING (public.is_workflow_participant(id));

DROP POLICY IF EXISTS "Reviewers update shared workflow documents" ON public.workflow_documents;
CREATE POLICY "Reviewers update shared workflow documents"
  ON public.workflow_documents FOR UPDATE
  TO authenticated
  USING (public.is_workflow_reviewer(id))
  WITH CHECK (public.is_workflow_reviewer(id));

DROP POLICY IF EXISTS "Participants view shared workflow events" ON public.workflow_events;
CREATE POLICY "Participants view shared workflow events"
  ON public.workflow_events FOR SELECT
  TO authenticated
  USING (public.is_workflow_participant(document_id));

DROP POLICY IF EXISTS "Reviewers record shared workflow events" ON public.workflow_events;
CREATE POLICY "Reviewers record shared workflow events"
  ON public.workflow_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workflow_reviewer(document_id));

DROP POLICY IF EXISTS "Participants view shared workflow revisions" ON public.workflow_revisions;
CREATE POLICY "Participants view shared workflow revisions"
  ON public.workflow_revisions FOR SELECT
  TO authenticated
  USING (public.is_workflow_participant(document_id));

DROP POLICY IF EXISTS "Reviewers add shared workflow revisions" ON public.workflow_revisions;
CREATE POLICY "Reviewers add shared workflow revisions"
  ON public.workflow_revisions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workflow_reviewer(document_id));

-- ---------------------------------------------------------
-- Immutable-field guard on workflow_documents
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.workflow_documents_immutable_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id <> OLD.project_id
     OR NEW.doc_type <> OLD.doc_type
     OR NEW.reference_code <> OLD.reference_code
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'workflow_documents: project_id, doc_type, reference_code and created_by are immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workflow_documents_immutable_fields ON public.workflow_documents;
CREATE TRIGGER workflow_documents_immutable_fields
  BEFORE UPDATE ON public.workflow_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.workflow_documents_immutable_guard();
