-- 20261031140000_service_role_grants.sql
-- Server-side code (edge functions, jobs) reads these tables with the service
-- role. Without a grant it silently sees nothing, which made the evidence gate
-- deny the project owner as well as outsiders.
-- ROLLBACK:
--   revoke all on public.project_members, public.project_invitations,
--     public.project_notifications, public.project_material_deliveries,
--     public.project_activity, public.diaspora_plan_limits from service_role;
grant select, insert, update, delete on public.project_members to service_role;
grant select, insert, update, delete on public.project_invitations to service_role;
grant select, insert, update, delete on public.project_notifications to service_role;
grant select, insert, update, delete on public.project_material_deliveries to service_role;
grant select, insert, update, delete on public.project_activity to service_role;
grant select on public.diaspora_plan_limits to service_role;
grant select, insert, update on public.project_attachments to service_role;
grant select, insert, update on public.project_expenses to service_role;
grant select, insert, update on public.project_site_logs to service_role;
grant select, insert, update on public.project_progress_stages to service_role;
