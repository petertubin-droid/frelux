-- 20261031131000_milestone_participant_insert.sql
-- Field roles could not submit milestone progress at all: no insert policy
-- covered them. Decisions remain governed by guard_project_decisions.
-- ROLLBACK: drop policy if exists stages_participant_insert on public.project_progress_stages;
create policy stages_participant_insert on public.project_progress_stages
  for insert to authenticated
  with check (public.is_project_member(
    project_id, array['owner','site_manager','contractor','inspector']
  ));
