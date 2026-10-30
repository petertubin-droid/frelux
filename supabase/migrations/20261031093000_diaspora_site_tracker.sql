-- FRELUX Diaspora Site Tracker
--
-- Extends the existing project tables (user_projects, project_site_logs,
-- project_expenses, project_progress_stages, project_attachments,
-- workspace_members) instead of introducing a parallel project system.
--
-- ROLLBACK PLAN (every change below is additive; nothing existing is dropped
-- or rewritten, so removing the additions restores the previous behaviour):
--   drop table if exists public.project_notifications;
--   drop table if exists public.project_activity;
--   drop table if exists public.project_material_deliveries;
--   drop table if exists public.project_invitations;
--   drop table if exists public.project_members;
--   drop table if exists public.diaspora_plan_limits;
--   drop function if exists public.accept_project_invitation(text);
--   drop function if exists public.create_project_invitation(uuid, text, text, integer);
--   drop function if exists public.project_role(uuid);
--   drop function if exists public.is_project_member(uuid, text[]);
--   drop function if exists public.is_project_owner(uuid);
--   alter table public.project_attachments
--     drop column if exists kind, drop column if exists captured_at,
--     drop column if exists gps_lat, drop column if exists gps_lon,
--     drop column if exists device_meta, drop column if exists sha256,
--     drop column if exists deleted_at, drop column if exists deleted_by;
--   alter table public.project_progress_stages
--     drop column if exists status, drop column if exists submitted_by,
--     drop column if exists submitted_at, drop column if exists decided_by,
--     drop column if exists decided_at, drop column if exists decision_note,
--     drop column if exists evidence_path;
--   alter table public.project_expenses
--     drop column if exists status, drop column if exists recipient,
--     drop column if exists payment_method, drop column if exists receipt_path,
--     drop column if exists submitted_by, drop column if exists approved_by,
--     drop column if exists approved_at, drop column if exists decision_note;
--   alter table public.project_site_logs
--     drop column if exists next_day_activities, drop column if exists workers_detail,
--     drop column if exists video_paths;
--   drop policy if exists project_evidence_read on storage.objects;
--   drop policy if exists project_evidence_write on storage.objects;
--   -- remove the private bucket only after its objects have been removed:
--   -- delete from storage.objects where bucket_id = 'project-evidence';
--   -- delete from storage.buckets where id = 'project-evidence';
--
-- Principles encoded here:
--   * Access is decided per project and per role, on the server.
--   * A receipt image is evidence, never verification: approval is its own state
--     written by an authorised role.
--   * Invitation tokens are stored as hashes; the raw token is returned once.
--   * Evidence lives in a private bucket and is read through signed URLs.

-- 1. Project roles -----------------------------------------------------------
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.user_projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'site_manager', 'contractor', 'inspector')),
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_members_user_idx on public.project_members (user_id, status);
create index if not exists project_members_project_idx on public.project_members (project_id);

create or replace function public.project_role(p_project uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- The recorded creator of a project is its owner even before a membership
    -- row exists, so existing projects keep working.
    when exists (select 1 from public.user_projects up where up.id = p_project and up.user_id = auth.uid())
      then 'owner'
    else (
      select pm.role from public.project_members pm
      where pm.project_id = p_project and pm.user_id = auth.uid() and pm.status = 'active'
      limit 1
    )
  end;
$$;

create or replace function public.is_project_member(p_project uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (public.project_role(p_project) is not null)
    and (p_roles is null or public.project_role(p_project) = any (p_roles)),
    false
  );
$$;

create or replace function public.is_project_owner(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_project_member(p_project, array['owner'])
     or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 2. Invitations (hashed tokens) --------------------------------------------
create table if not exists public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.user_projects (id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'site_manager', 'contractor', 'inspector')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_invitations_project_idx on public.project_invitations (project_id, status);

-- Only the owner may create an invitation, and the raw token is returned once,
-- to the caller, from this call. Nothing else ever sees it.
create or replace function public.create_project_invitation(
  p_project uuid,
  p_email text,
  p_role text,
  p_hours integer default 72
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_email text := lower(trim(p_email));
begin
  if not public.is_project_owner(p_project) then
    raise exception 'Only a project owner can invite participants.';
  end if;
  if p_role not in ('owner', 'site_manager', 'contractor', 'inspector') then
    raise exception 'Unknown project role.';
  end if;
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'A valid email address is required.';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.project_invitations
    (project_id, email, role, token_hash, expires_at)
  values
    (p_project, v_email, p_role, encode(digest(v_token, 'sha256'), 'hex'),
     now() + make_interval(hours => greatest(1, least(coalesce(p_hours, 72), 720))));

  insert into public.project_activity (project_id, actor, action, entity, entity_id, detail)
  values (p_project, auth.uid(), 'invitation_created', 'project_invitations', v_email,
          jsonb_build_object('role', p_role, 'email', v_email));

  return v_token;
end;
$$;

-- Acceptance matches the signed-in user's email, so a forwarded link cannot be
-- redeemed by somebody else.
create or replace function public.accept_project_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_inv public.project_invitations;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to accept an invitation.';
  end if;
  select email into v_email from public.profiles where id = auth.uid();

  select * into v_inv from public.project_invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
  limit 1;

  if v_inv.id is null then raise exception 'That invitation link is not valid.'; end if;
  if v_inv.status <> 'pending' then raise exception 'That invitation has already been used or revoked.'; end if;
  if v_inv.expires_at < now() then
    update public.project_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'That invitation has expired. Ask the project owner for a new one.';
  end if;
  if lower(coalesce(v_email, '')) <> v_inv.email then
    raise exception 'This invitation was issued to a different email address.';
  end if;

  insert into public.project_members (project_id, user_id, role, invited_by)
  values (v_inv.project_id, auth.uid(), v_inv.role, v_inv.invited_by)
  on conflict (project_id, user_id)
  do update set role = excluded.role, status = 'active', updated_at = now();

  update public.project_invitations
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = v_inv.id;

  insert into public.project_activity (project_id, actor, action, entity, entity_id, detail)
  values (v_inv.project_id, auth.uid(), 'invitation_accepted', 'project_members', v_inv.role,
          jsonb_build_object('role', v_inv.role));

  return v_inv.project_id;
end;
$$;

-- 3. Materials delivered -----------------------------------------------------
create table if not exists public.project_material_deliveries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.user_projects (id) on delete cascade,
  description text not null,
  unit text,
  quantity_ordered numeric not null default 0 check (quantity_ordered >= 0),
  quantity_delivered numeric not null default 0 check (quantity_delivered >= 0),
  quantity_accepted numeric not null default 0 check (quantity_accepted >= 0),
  supplier text,
  delivery_date date not null default current_date,
  unit_price numeric check (unit_price is null or unit_price >= 0),
  currency text not null default 'NGN',
  notes text,
  photo_path text,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Accepted can never exceed delivered, and delivered never exceeds nothing.
  constraint deliveries_accepted_within_delivered check (quantity_accepted <= quantity_delivered)
);

create index if not exists material_deliveries_project_idx
  on public.project_material_deliveries (project_id, delivery_date desc);

-- 4. Notifications -----------------------------------------------------------
create table if not exists public.project_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.user_projects (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_notifications_user_idx
  on public.project_notifications (user_id, created_at desc);

-- 5. Activity trail (append-only) -------------------------------------------
create table if not exists public.project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.user_projects (id) on delete cascade,
  actor uuid default auth.uid(),
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_activity_project_idx
  on public.project_activity (project_id, created_at desc);

-- 6. Plan limits (no prices, by design) -------------------------------------
create table if not exists public.diaspora_plan_limits (
  plan_key text primary key,
  display_name text not null,
  max_projects integer,
  max_members_per_project integer,
  max_storage_mb integer,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.diaspora_plan_limits
  (plan_key, display_name, max_projects, max_members_per_project, max_storage_mb, features)
values
  ('free', 'Free', 1, 3, 500, '{"daily_reports": true, "video": false, "inspector": false}'),
  ('owner', 'Owner', 3, 8, 5000, '{"daily_reports": true, "video": true, "inspector": true}'),
  ('portfolio', 'Portfolio', 10, 15, 25000, '{"daily_reports": true, "video": true, "inspector": true}'),
  ('enterprise', 'Enterprise', null, null, null, '{"daily_reports": true, "video": true, "inspector": true}')
on conflict (plan_key) do nothing;

-- 7. Extend the existing project tables --------------------------------------
alter table public.project_site_logs
  add column if not exists next_day_activities text,
  add column if not exists workers_detail jsonb not null default '{}'::jsonb,
  add column if not exists video_paths jsonb not null default '[]'::jsonb;

alter table public.project_expenses
  add column if not exists status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected')),
  add column if not exists recipient text,
  add column if not exists payment_method text,
  add column if not exists receipt_path text,
  add column if not exists submitted_by uuid default auth.uid() references public.profiles (id) on delete set null,
  add column if not exists approved_by uuid references public.profiles (id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists decision_note text;

alter table public.project_progress_stages
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'submitted', 'approved', 'disputed')),
  add column if not exists submitted_by uuid references public.profiles (id) on delete set null,
  add column if not exists submitted_at timestamptz,
  add column if not exists decided_by uuid references public.profiles (id) on delete set null,
  add column if not exists decided_at timestamptz,
  add column if not exists decision_note text,
  add column if not exists evidence_path text;

alter table public.project_attachments
  add column if not exists kind text not null default 'progress'
    check (kind in ('progress', 'material', 'inspection', 'receipt', 'video')),
  add column if not exists captured_at timestamptz,
  add column if not exists gps_lat double precision,
  add column if not exists gps_lon double precision,
  add column if not exists device_meta jsonb not null default '{}'::jsonb,
  add column if not exists sha256 text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id) on delete set null,
  -- Evidence stored in the private bucket is never given a public URL.
  add constraint project_attachments_private_no_public_url
    check (public_url is null or storage_path not like 'project-evidence/%');

-- 8. Row level security ------------------------------------------------------
alter table public.project_members enable row level security;
alter table public.project_invitations enable row level security;
alter table public.project_material_deliveries enable row level security;
alter table public.project_notifications enable row level security;
alter table public.project_activity enable row level security;
alter table public.diaspora_plan_limits enable row level security;

drop policy if exists project_members_read on public.project_members;
create policy project_members_read on public.project_members
  for select using (user_id = auth.uid() or public.is_project_member(project_id));

drop policy if exists project_members_owner_write on public.project_members;
create policy project_members_owner_write on public.project_members
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists project_invitations_owner on public.project_invitations;
create policy project_invitations_owner on public.project_invitations
  for select using (public.is_project_owner(project_id));
-- No insert policy: invitations are created only through the function above.
drop policy if exists project_invitations_owner_update on public.project_invitations;
create policy project_invitations_owner_update on public.project_invitations
  for update using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists material_deliveries_read on public.project_material_deliveries;
create policy material_deliveries_read on public.project_material_deliveries
  for select using (public.is_project_member(project_id));

drop policy if exists material_deliveries_write on public.project_material_deliveries;
create policy material_deliveries_write on public.project_material_deliveries
  for insert with check (
    public.is_project_member(project_id, array['owner', 'site_manager', 'contractor'])
    and created_by = auth.uid()
  );

drop policy if exists material_deliveries_update on public.project_material_deliveries;
create policy material_deliveries_update on public.project_material_deliveries
  for update using (public.is_project_member(project_id, array['owner', 'site_manager']))
  with check (public.is_project_member(project_id, array['owner', 'site_manager']));

drop policy if exists project_notifications_read on public.project_notifications;
create policy project_notifications_read on public.project_notifications
  for select using (user_id = auth.uid());

drop policy if exists project_notifications_update on public.project_notifications;
create policy project_notifications_update on public.project_notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists project_activity_read on public.project_activity;
create policy project_activity_read on public.project_activity
  for select using (public.is_project_member(project_id));

drop policy if exists project_activity_insert on public.project_activity;
create policy project_activity_insert on public.project_activity
  for insert with check (public.is_project_member(project_id) and actor = auth.uid());

drop policy if exists diaspora_plan_limits_read on public.diaspora_plan_limits;
create policy diaspora_plan_limits_read on public.diaspora_plan_limits
  for select using (is_active or public.is_admin());

drop policy if exists diaspora_plan_limits_admin on public.diaspora_plan_limits;
create policy diaspora_plan_limits_admin on public.diaspora_plan_limits
  for all using (public.is_admin()) with check (public.is_admin());

-- Expenses: participants may submit, only the owner decides.
drop policy if exists project_expenses_participant_insert on public.project_expenses;
create policy project_expenses_participant_insert on public.project_expenses
  for insert with check (
    public.is_project_member(project_id, array['owner', 'site_manager', 'contractor'])
    and status = 'submitted'
  );

drop policy if exists project_expenses_participant_update on public.project_expenses;
create policy project_expenses_participant_update on public.project_expenses
  for update using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- Milestones: managers submit, owners and inspectors decide.
drop policy if exists project_stages_participant_update on public.project_progress_stages;
create policy project_stages_participant_update on public.project_progress_stages
  for update using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- 9. Guard the decisions that must not be self-service ----------------------
create or replace function public.guard_project_decisions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'project_expenses' then
    if new.status is distinct from old.status
       and not public.is_project_owner(new.project_id) then
      raise exception 'Only the project owner can approve or reject an expense.';
    end if;
    if new.status = 'approved' and old.status <> 'approved' then
      new.approved_by := auth.uid();
      new.approved_at := now();
    end if;
  end if;

  if tg_table_name = 'project_progress_stages' then
    if new.status is distinct from old.status
       and not (public.is_project_owner(new.project_id)
                or public.is_project_member(new.project_id, array['inspector'])) then
      raise exception 'Only the owner or an inspector can approve or dispute a milestone.';
    end if;
    if new.status in ('approved', 'disputed') and old.status not in ('approved', 'disputed') then
      new.decided_by := auth.uid();
      new.decided_at := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists project_expenses_guard on public.project_expenses;
create trigger project_expenses_guard
  before update on public.project_expenses
  for each row execute function public.guard_project_decisions();

drop trigger if exists project_stages_guard on public.project_progress_stages;
create trigger project_stages_guard
  before update on public.project_progress_stages
  for each row execute function public.guard_project_decisions();

-- 10. Private evidence bucket ------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-evidence', 'project-evidence', false)
on conflict (id) do nothing;

drop policy if exists project_evidence_read on storage.objects;
create policy project_evidence_read on storage.objects
  for select using (
    bucket_id = 'project-evidence'
    and exists (
      select 1 from public.project_attachments a
      where a.storage_path = storage.objects.name
        and public.is_project_member(a.project_id)
    )
    or (
      bucket_id = 'project-evidence'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists project_evidence_write on storage.objects;
create policy project_evidence_write on storage.objects
  for insert with check (
    bucket_id = 'project-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
