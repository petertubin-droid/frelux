-- =========================================================
-- FRELUX 20261015450000: WORKFLOW WEB PUSH NOTIFICATIONS
--
-- Closes the workflow engine's "no push notifications" gap
-- (RFC 8030/8291/8292 Web Push, VAPID; no third-party
-- provider needed — the platform itself is the push server).
--
-- 1) workflow_push_subscriptions — browser push subscriptions
--    (endpoint + encryption keys) registered by each user from
--    their own browser. RLS: users manage ONLY their own rows;
--    the service role (workflow-push edge function) reads all
--    rows to deliver and deletes endpoints that return 404/410.
--    endpoint is UNIQUE: re-subscribing the same browser
--    upserts instead of duplicating.
--
-- 2) workflow_push_log — at-most-once delivery ledger,
--    unique(event_id, subscription_id): the edge function
--    claims the slot before sending and releases it on
--    failure, so retries work but a delivered push can never
--    repeat. Owner can read the ledger for their documents.
--
-- VAPID keys live in integration_secrets (providers
-- 'web-push-public' [client-visible] and 'web-push-private'
-- [server-only]) — same admin-pasteable model as Resend.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.workflow_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- the browser's push endpoint URL (unique per subscription)
  endpoint text NOT NULL UNIQUE,
  -- client ECDH P-256 public key (base64url, RFC 8291)
  p256dh text NOT NULL,
  -- client auth secret (base64url, RFC 8291)
  auth text NOT NULL,
  -- the user who registered this browser
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_push_subs_user
  ON public.workflow_push_subscriptions(user_id);

ALTER TABLE public.workflow_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_push_subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.workflow_push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.workflow_push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- Service role (edge functions) bypasses RLS to deliver and to
-- remove dead endpoints (404/410) — table grants below.

COMMENT ON TABLE public.workflow_push_subscriptions IS
  'Browser Web Push subscriptions. Users manage their own rows; the service role delivers and prunes dead endpoints.';

CREATE TABLE IF NOT EXISTS public.workflow_push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.workflow_documents(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.workflow_events(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.workflow_push_subscriptions(id) ON DELETE CASCADE,
  -- 'sent' | 'failed'
  status text NOT NULL CHECK (status IN ('sent','failed')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- At-most-once push per (event, browser).
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_push_once
  ON public.workflow_push_log(event_id, subscription_id);
CREATE INDEX IF NOT EXISTS idx_workflow_push_log_doc
  ON public.workflow_push_log(document_id, created_at);

ALTER TABLE public.workflow_push_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_push_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own push notification status" ON public.workflow_push_log;
CREATE POLICY "Users read own push notification status"
  ON public.workflow_push_log FOR SELECT
  USING (
    document_id IN (
      SELECT d.id FROM public.workflow_documents d
      JOIN public.contractor_projects p ON p.id = d.project_id
      WHERE p.user_id = auth.uid()
    )
  );
-- No INSERT/UPDATE/DELETE policy: only the service role
-- (workflow-push edge function) writes the ledger.

COMMENT ON TABLE public.workflow_push_log IS
  'At-most-once Web Push ledger per (event, subscription). Owner can read; only the service role writes.';
