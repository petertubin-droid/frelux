-- =========================================================
-- FRELUX 20261015440000: WORKFLOW EMAIL NOTIFICATIONS
--
-- Closes the first honest gap of the Workflow & Automation
-- engine ("no email notifications"): transitions can now
-- notify the project owner by email through the deployed
-- workflow-notify edge function + the admin-pasted Resend key
-- (see integration_secrets, 20261015420000).
--
-- 1) workflow_notify_log — at-most-once notification ledger.
--    Unique(event_id) makes the edge function idempotent: a
--    retried call for the same workflow event is a no-op.
--    Owner-scoped RLS on SELECT; INSERT/UPDATE/DELETE only
--    via service role (no client policy at all).
--
-- 2) integration_keys_public (replace) — now ALSO exposes the
--    activation STATUS of server-side providers (e.g. Resend)
--    so the Workflows UI can honestly show whether email
--    notifications are configured. key_value stays null for
--    server-side providers: raw keys never leave the server.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.workflow_notify_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.workflow_documents(id) ON DELETE CASCADE,
  -- The workflow event this notification belongs to (unique:
  -- at-most-once email per event, retries are no-ops).
  event_id uuid NOT NULL REFERENCES public.workflow_events(id) ON DELETE CASCADE,
  -- 'sent' | 'failed' | 'skipped' (skipped = no Resend key
  -- active at the time; recorded so the UI can disclose it)
  status text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_notify_event
  ON public.workflow_notify_log(event_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notify_doc
  ON public.workflow_notify_log(document_id, created_at);

ALTER TABLE public.workflow_notify_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_notify_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own workflow notification status" ON public.workflow_notify_log;
CREATE POLICY "Users read own workflow notification status"
  ON public.workflow_notify_log FOR SELECT
  USING (
    document_id IN (
      SELECT d.id FROM public.workflow_documents d
      JOIN public.contractor_projects p ON p.id = d.project_id
      WHERE p.user_id = auth.uid()
    )
  );
-- No INSERT/UPDATE/DELETE policy: only the service role
-- (edge functions) writes the ledger.

COMMENT ON TABLE public.workflow_notify_log IS
  'At-most-once workflow email notification ledger. Owner can read; only the service role writes.';

-- Expose provider activation status to authenticated clients;
-- raw key values still only for client_visible providers.
create or replace view public.integration_keys_public as
  select
    provider_id,
    status,
    updated_at,
    case when client_visible then key_value else null end as key_value
  from public.integration_secrets
  where status = 'active';

COMMENT ON VIEW public.integration_keys_public IS
  'Active provider keys: key_value only for client_visible providers (server-side keys like Resend expose status only).';
