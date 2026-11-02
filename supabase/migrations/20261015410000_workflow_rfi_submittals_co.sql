-- ============================================================
-- FRELUX Global Operations Engine #7 — Workflow & Automation:
-- auditable RFI / submittal / change-order control plane.
--
-- workflow_documents — the document record (one row per RFI,
--   submittal, or change order) scoped to a contractor project.
--   Deterministic state machine lives in
--   src/lib/workflow/workflow-engine.ts; the DB CHECK constraints
--   mirror it so invalid states can never be persisted.
-- workflow_revisions — append-only content snapshots (immutable
--   history of what each revision said, like BOQ revisions).
-- workflow_events — append-only audit trail: every creation,
--   transition, revision and comment is recorded with actor + note
--   and can never be updated or deleted by client roles.
--
-- Internationalization: amounts are stored per-row in the
-- project's own currency (NO NGN assumption); labels are plain
-- text so every market can localize display.
-- RLS: authenticated users can only touch workflow documents of
--   projects they own (same pattern as project_expenses).
--   workflow_events/workflow_revisions inherit the same
--   owner-scope via the document's project.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workflow_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,

  -- 'rfi' | 'submittal' | 'change_order'
  doc_type text NOT NULL CHECK (doc_type IN ('rfi','submittal','change_order')),

  -- deterministic state machine (mirrors workflow-engine.ts)
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft','open','in_review','answered','approved','rejected','closed')
  ),

  -- 'low' | 'normal' | 'high' | 'urgent'
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),

  -- human-readable code per project + type, e.g. RFI-0003
  reference_code text NOT NULL,

  title text NOT NULL,
  description text,

  -- who this item is routed to (free label: role or contact name)
  assignee text,

  -- deterministic due date (overdue computed at read time)
  due_date date,

  -- change orders only: amount in the project's currency
  amount numeric CHECK (amount IS NULL OR amount > 0),
  currency text,

  revision_no integer NOT NULL DEFAULT 1,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_documents_ref
  ON public.workflow_documents(project_id, doc_type, reference_code);
CREATE INDEX IF NOT EXISTS idx_workflow_documents_project_id ON public.workflow_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_documents_status ON public.workflow_documents(status);
CREATE INDEX IF NOT EXISTS idx_workflow_documents_doc_type ON public.workflow_documents(doc_type);

CREATE TABLE IF NOT EXISTS public.workflow_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.workflow_documents(id) ON DELETE CASCADE,
  revision_no integer NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, revision_no)
);

CREATE TABLE IF NOT EXISTS public.workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.workflow_documents(id) ON DELETE CASCADE,
  -- 'created' | 'transition' | 'revision' | 'comment'
  event_type text NOT NULL CHECK (event_type IN ('created','transition','revision','comment')),
  from_status text,
  to_status text,
  actor text NOT NULL DEFAULT 'owner',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_revisions_doc ON public.workflow_revisions(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_doc ON public.workflow_events(document_id, created_at);

ALTER TABLE public.workflow_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own project workflows" ON public.workflow_documents;
CREATE POLICY "Users can CRUD own project workflows"
  ON public.workflow_documents FOR ALL
  TO authenticated
  USING (
    project_id IN (SELECT id FROM public.contractor_projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.contractor_projects WHERE user_id = auth.uid())
  );

-- revisions: insert + read only (append-only history)
DROP POLICY IF EXISTS "Users read own workflow revisions" ON public.workflow_revisions;
CREATE POLICY "Users read own workflow revisions"
  ON public.workflow_revisions FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT d.id FROM public.workflow_documents d
      JOIN public.contractor_projects p ON p.id = d.project_id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users append own workflow revisions" ON public.workflow_revisions;
CREATE POLICY "Users append own workflow revisions"
  ON public.workflow_revisions FOR INSERT
  TO authenticated
  WITH CHECK (
    document_id IN (
      SELECT d.id FROM public.workflow_documents d
      JOIN public.contractor_projects p ON p.id = d.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- events: insert + read only (immutable audit trail)
DROP POLICY IF EXISTS "Users read own workflow events" ON public.workflow_events;
CREATE POLICY "Users read own workflow events"
  ON public.workflow_events FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT d.id FROM public.workflow_documents d
      JOIN public.contractor_projects p ON p.id = d.project_id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users append own workflow events" ON public.workflow_events;
CREATE POLICY "Users append own workflow events"
  ON public.workflow_events FOR INSERT
  TO authenticated
  WITH CHECK (
    document_id IN (
      SELECT d.id FROM public.workflow_documents d
      JOIN public.contractor_projects p ON p.id = d.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- keep updated_at fresh
CREATE OR REPLACE TRIGGER trg_workflow_documents_updated_at
  BEFORE UPDATE ON public.workflow_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
