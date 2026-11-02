-- 20261031110000_diaspora_align_contractor_projects.sql
-- Live verification showed the tracker was attached to user_projects, while the
-- established project subsystem (site logs, expenses, milestones, attachments)
-- is keyed on contractor_projects. One project table, not two.
--
-- ROLLBACK:
--   delete from public.project_members ... etc. (tracker rows are new)
--   alter table public.project_members drop constraint ... ; re-add referencing user_projects
--   alter table public.contractor_projects drop column if exists budget,
--     drop column if exists start_date, drop column if exists end_date,
--     drop column if exists diaspora_tracker;

begin;

-- 1. Tracker fields on the canonical project table (additive only)
alter table public.contractor_projects
  add column if not exists budget numeric,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists diaspora_tracker boolean not null default false;

-- 2. Re-point the tracker tables at the canonical project table.
--    These tables were created in this same change set and hold no production
--    rows, so clearing them is safe and preserves no history.
delete from public.project_notifications;
delete from public.project_material_deliveries;
delete from public.project_invitations;
delete from public.project_members;
delete from public.project_activity;

alter table public.project_members
  drop constraint if exists project_members_project_id_fkey;
alter table public.project_members
  add constraint project_members_project_id_fkey
  foreign key (project_id) references public.contractor_projects(id) on delete cascade;

alter table public.project_invitations
  drop constraint if exists project_invitations_project_id_fkey;
alter table public.project_invitations
  add constraint project_invitations_project_id_fkey
  foreign key (project_id) references public.contractor_projects(id) on delete cascade;

alter table public.project_notifications
  drop constraint if exists project_notifications_project_id_fkey;
alter table public.project_notifications
  add constraint project_notifications_project_id_fkey
  foreign key (project_id) references public.contractor_projects(id) on delete cascade;

alter table public.project_material_deliveries
  drop constraint if exists project_material_deliveries_project_id_fkey;
alter table public.project_material_deliveries
  add constraint project_material_deliveries_project_id_fkey
  foreign key (project_id) references public.contractor_projects(id) on delete cascade;

alter table public.project_activity
  drop constraint if exists project_activity_project_id_fkey;
alter table public.project_activity
  add constraint project_activity_project_id_fkey
  foreign key (project_id) references public.contractor_projects(id) on delete cascade;

-- 3. Plan limit now counts tracker projects on the canonical table
create or replace function public.diaspora_enforce_project_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
  v_max integer;
  v_count integer;
begin
  if new.diaspora_tracker is not true then
    return new;
  end if;

  select coalesce(w.settings->>'plan', 'free') into v_plan
  from public.workspaces w
  where w.owner_id = new.user_id
  order by w.created_at
  limit 1;

  select max_projects into v_max
  from public.diaspora_plan_limits
  where plan_key = coalesce(v_plan, 'free') and is_active;

  if v_max is null then
    return new;
  end if;

  select count(*) into v_count
  from public.contractor_projects
  where user_id = new.user_id and diaspora_tracker is true;

  if v_count >= v_max then
    raise exception 'Project limit reached for the % plan (% projects). Archive a project or change plan.',
      coalesce(v_plan, 'free'), v_max
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_diaspora_limit on public.contractor_projects;
create trigger trg_diaspora_limit before insert on public.contractor_projects
  for each row execute function public.diaspora_enforce_project_limit();

drop trigger if exists trg_diaspora_limit on public.user_projects;

-- 4. Project owners on the canonical table can manage their tracker projects
drop policy if exists contractor_projects_tracker_owner on public.contractor_projects;
create policy contractor_projects_tracker_owner on public.contractor_projects
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from public.project_members m
      where m.project_id = contractor_projects.id
        and m.user_id = auth.uid()
        and coalesce(m.status,'active') = 'active'
    )
    or public.is_admin()
  )
  with check (user_id = auth.uid() or public.is_admin());

commit;
