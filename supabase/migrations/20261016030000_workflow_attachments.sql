-- =========================================================
-- FRELUX 20261016030000: WORKFLOW ATTACHMENTS
--
-- File attachments for workflow documents (RFIs, submittals,
-- change orders), continuing the cross-role handoff model:
--
--   * workflow_attachments — one row per uploaded file,
--     pointing at a private storage object under
--     workflow-attachments/<document_id>/<safe-name>.
--   * The 'workflow-attachments' bucket is PRIVATE: files
--     are only reachable through signed URLs minted by a
--     session that passes the storage RLS policies.
--   * Storage + table policies mirror the handoff scopes:
--     the project OWNER and invited REVIEWERS can upload,
--     OWNER and REVIEWER can remove, participants (viewer
--     included) can read. Anonymous access is impossible.
--   * is_workflow_document_owner() joins through to
--     contractor_projects so ownership is always the
--     project owner, never the uploader by accident.
-- =========================================================

-- ---------------------------------------------------------
-- Owner helper (SECURITY DEFINER: policy per-row safety)
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_workflow_document_owner(
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
    FROM public.workflow_documents wd
    JOIN public.contractor_projects cp ON cp.id = wd.project_id
    WHERE wd.id = p_document_id
      AND cp.user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_workflow_document_owner(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_workflow_document_owner(uuid) TO authenticated;

-- ---------------------------------------------------------
-- Attachment rows
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workflow_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.workflow_documents(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  -- storage.objects path: <document_id>/<safe-name>
  storage_path text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  content_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS idx_workflow_attachments_doc
  ON public.workflow_attachments(document_id);

COMMENT ON TABLE public.workflow_attachments IS
  'File attachments for workflow documents. Private bucket; access mirrors the cross-role handoff scopes (owner/reviewer write, participant read).';

ALTER TABLE public.workflow_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_attachments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage workflow attachments" ON public.workflow_attachments;
CREATE POLICY "Owners manage workflow attachments"
  ON public.workflow_attachments FOR ALL
  TO authenticated
  USING (public.is_workflow_document_owner(document_id))
  WITH CHECK (public.is_workflow_document_owner(document_id));

DROP POLICY IF EXISTS "Participants read workflow attachments" ON public.workflow_attachments;
CREATE POLICY "Participants read workflow attachments"
  ON public.workflow_attachments FOR SELECT
  TO authenticated
  USING (public.is_workflow_participant(document_id));

DROP POLICY IF EXISTS "Reviewers add workflow attachments" ON public.workflow_attachments;
CREATE POLICY "Reviewers add workflow attachments"
  ON public.workflow_attachments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workflow_reviewer(document_id));

DROP POLICY IF EXISTS "Reviewers remove workflow attachments" ON public.workflow_attachments;
CREATE POLICY "Reviewers remove workflow attachments"
  ON public.workflow_attachments FOR DELETE
  TO authenticated
  USING (public.is_workflow_reviewer(document_id));

-- ---------------------------------------------------------
-- Private storage bucket
-- ---------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('workflow-attachments', 'workflow-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: <document_id>/<safe-name>
-- (storage.foldername(name)[1] is the document id.)

DROP POLICY IF EXISTS "Workflow owners and reviewers upload attachments" ON storage.objects;
CREATE POLICY "Workflow owners and reviewers upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'workflow-attachments'
    AND (
      public.is_workflow_document_owner((storage.foldername(name))[1]::uuid)
      OR public.is_workflow_reviewer((storage.foldername(name))[1]::uuid)
    )
  );

DROP POLICY IF EXISTS "Workflow participants read attachments" ON storage.objects;
CREATE POLICY "Workflow participants read attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'workflow-attachments'
    AND (
      public.is_workflow_document_owner((storage.foldername(name))[1]::uuid)
      OR public.is_workflow_participant((storage.foldername(name))[1]::uuid)
    )
  );

DROP POLICY IF EXISTS "Workflow owners and reviewers remove attachments" ON storage.objects;
CREATE POLICY "Workflow owners and reviewers remove attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'workflow-attachments'
    AND (
      public.is_workflow_document_owner((storage.foldername(name))[1]::uuid)
      OR public.is_workflow_reviewer((storage.foldername(name))[1]::uuid)
    )
  );
