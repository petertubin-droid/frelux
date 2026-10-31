-- 20261031113000_diaspora_role_and_tracker_type.sql
-- project_role() resolved ownership only through user_projects, so the creator
-- of a project on the canonical contractor_projects table had no role, and
-- every member-scoped policy denied them. Also the canonical table accepts
-- trade keys only; tracker projects need a type of their own with the building
-- type stored separately.
--
-- ROLLBACK: restore the previous project_role() body (user_projects check only)
-- and remove 'site_tracker' from contractor_projects_project_type_check.

create or replace function public.project_role(p_project uuid)
returns text
language sql
stable security definer
set search_path = public
as $$
  select case
    -- Creator owns the project on either project table.
    when exists (select 1 from public.user_projects up where up.id = p_project and up.user_id = auth.uid())
      then 'owner'
    when exists (select 1 from public.contractor_projects cp where cp.id = p_project and cp.user_id = auth.uid())
      then 'owner'
    else (
      select pm.role from public.project_members pm
      where pm.project_id = p_project and pm.user_id = auth.uid() and pm.status = 'active'
      limit 1
    )
  end;
$$;

alter table public.contractor_projects drop constraint contractor_projects_project_type_check;
alter table public.contractor_projects add constraint contractor_projects_project_type_check
  check (project_type = any (array[
    'painting','screeding','pop_ceiling','tiling','multi_trade','site_tracker'
  ]));
