-- =========================================================
-- Force RLS on the enterprise workspace tables (2026-10-15).
--
-- The 20261017000000 enterprise RBAC migration enabled RLS with
-- policies on workspaces / workspace_members /
-- workspace_invitations / project_site_logs /
-- workspace_activity_logs but did not FORCE it. Repo convention
-- (see 20260826000000_force_rls_remaining_tables and every
-- engine-3/BOQ/expenses table) is RLS forced so even table
-- owners must pass policies. Idempotent.
-- =========================================================

ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_site_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_activity_logs FORCE ROW LEVEL SECURITY;
