-- 20261031123000_diaspora_participant_read.sql
-- Participants could create rows but only the owner could read them back, so a
-- contractor's own submission was invisible to them the moment it was saved.
-- ROLLBACK:
--   drop policy if exists project_expenses_participant_read on public.project_expenses;
--   drop policy if exists site_logs_participant_read on public.project_site_logs;
--   drop policy if exists stages_participant_read on public.project_progress_stages;
--   drop policy if exists attachments_participant_read on public.project_attachments;
create policy project_expenses_participant_read on public.project_expenses
  for select to authenticated using (public.is_project_member(project_id));
create policy site_logs_participant_read on public.project_site_logs
  for select to authenticated using (public.is_project_member(project_id));
create policy stages_participant_read on public.project_progress_stages
  for select to authenticated using (public.is_project_member(project_id));
create policy attachments_participant_read on public.project_attachments
  for select to authenticated using (public.is_project_member(project_id));
