-- Actuals evidence for estimator calibration.
--
-- Until now the adaptive calibration engine kept its evidence in localStorage,
-- which meant one browser held the only copy, an admin could never review it,
-- and nothing could feed the server-side price pipeline. This table is the
-- system of record.
--
-- Two protections live here rather than in the client, because a client can be
-- bypassed:
--   * Only an administrator may mark a record admin_verified. An owner review is
--     self_attested and never satisfies the verified quota.
--   * A reviewed record cannot be rewritten under its review stamp: editing the
--     quantities, unit, measure, market or material of an accepted row sends it
--     back to pending_review with the review cleared.
--
-- Identity columns (project, market, material, measure, recorded_at) are
-- immutable so an approval always refers to the same evidence.

create table if not exists public.estimation_actuals (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id text not null,
  market_code text not null,
  material_key text not null,
  measure text not null,
  unit text not null,
  estimated_quantity numeric not null,
  actual_quantity numeric not null,
  context text not null default 'takeoff',
  evidence text not null default 'self_attested',
  evidence_reference text,
  status text not null default 'pending_review',
  reviewer_id uuid,
  reviewer_role text,
  reviewed_at timestamptz,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimation_actuals_client_id_unique unique (owner_id, client_id),
  constraint estimation_actuals_market_shape check (market_code ~ '^[A-Z]{2}$'),
  constraint estimation_actuals_measure check (measure in ('material', 'labour')),
  constraint estimation_actuals_context check (context = 'takeoff'),
  constraint estimation_actuals_status check (status in ('pending_review', 'accepted', 'rejected')),
  constraint estimation_actuals_evidence check (evidence in ('admin_verified', 'self_attested')),
  constraint estimation_actuals_reviewer_role check (reviewer_role is null or reviewer_role in ('owner', 'admin')),
  constraint estimation_actuals_quantities check (estimated_quantity > 0 and actual_quantity > 0),
  constraint estimation_actuals_unit_present check (length(btrim(unit)) > 0),
  constraint estimation_actuals_verified_needs_review check (
    evidence <> 'admin_verified'
    or (reviewer_id is not null and reviewed_at is not null and reviewer_role = 'admin')
  ),
  constraint estimation_actuals_review_needs_stamp check (
    status = 'pending_review'
    or (reviewer_id is not null and reviewed_at is not null and reviewer_role is not null)
  )
);

comment on table public.estimation_actuals is
  'Completed-project actuals used as calibration evidence. One series is market_code + material_key + measure + unit.';

create index if not exists estimation_actuals_series_idx
  on public.estimation_actuals (market_code, material_key, measure, unit);

create index if not exists estimation_actuals_owner_idx
  on public.estimation_actuals (owner_id, recorded_at desc);

create index if not exists estimation_actuals_project_idx
  on public.estimation_actuals (project_id);

create or replace function public.estimation_actuals_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_user boolean := public.is_admin();
begin
  if tg_op = 'INSERT' then
    new.owner_id := coalesce(new.owner_id, auth.uid());
    if new.client_id is null or btrim(new.client_id) = '' then
      new.client_id := gen_random_uuid()::text;
    end if;
    if not admin_user then
      -- An owner can only file their own unverified observation.
      new.status := 'pending_review';
      new.evidence := 'self_attested';
      new.reviewer_id := null;
      new.reviewer_role := null;
      new.reviewed_at := null;
    end if;
    return new;
  end if;

  if new.project_id <> old.project_id
     or new.market_code <> old.market_code
     or new.material_key <> old.material_key
     or new.measure <> old.measure
     or new.recorded_at <> old.recorded_at
     or new.owner_id <> old.owner_id then
    raise exception 'estimation_actuals identity columns are immutable'
      using errcode = 'check_violation';
  end if;

  if old.status = 'accepted' and (
     new.estimated_quantity <> old.estimated_quantity
     or new.actual_quantity <> old.actual_quantity
     or new.unit <> old.unit
  ) then
    new.status := 'pending_review';
    new.evidence := 'self_attested';
    new.reviewer_id := null;
    new.reviewer_role := null;
    new.reviewed_at := null;
  end if;

  if not admin_user then
    if new.evidence = 'admin_verified' then
      new.evidence := 'self_attested';
    end if;
    if new.reviewer_role = 'admin' then
      new.reviewer_role := 'owner';
    end if;
    if new.reviewer_id is not null and new.reviewer_id <> auth.uid() then
      new.reviewer_id := auth.uid();
    end if;
    if new.status <> old.status and new.status <> 'pending_review' then
      new.reviewer_id := auth.uid();
      new.reviewer_role := 'owner';
      new.reviewed_at := coalesce(new.reviewed_at, now());
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists estimation_actuals_guard on public.estimation_actuals;
create trigger estimation_actuals_guard
  before insert or update on public.estimation_actuals
  for each row execute function public.estimation_actuals_guard();

alter table public.estimation_actuals enable row level security;

drop policy if exists estimation_actuals_select on public.estimation_actuals;
create policy estimation_actuals_select on public.estimation_actuals
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists estimation_actuals_insert on public.estimation_actuals;
create policy estimation_actuals_insert on public.estimation_actuals
  for insert with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists estimation_actuals_update on public.estimation_actuals;
create policy estimation_actuals_update on public.estimation_actuals
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists estimation_actuals_delete on public.estimation_actuals;
create policy estimation_actuals_delete on public.estimation_actuals
  for delete using (owner_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.estimation_actuals to authenticated;

-- Approval of a candidate snapshot. Activation compares the fingerprint and
-- the policy version, so a threshold change invalidates earlier approvals.
create table if not exists public.calibration_approvals (
  id uuid primary key default gen_random_uuid(),
  candidate_key text not null,
  decision text not null check (decision in ('approved', 'rejected')),
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  reviewer_role text not null check (reviewer_role = 'admin'),
  reviewed_at timestamptz not null default now(),
  reason text not null,
  candidate_fingerprint text not null,
  policy_version text not null
);

comment on table public.calibration_approvals is
  'Administrator decisions on a calibration candidate. An owner approval is not valid here.';

create index if not exists calibration_approvals_key_idx
  on public.calibration_approvals (candidate_key, reviewed_at desc);

alter table public.calibration_approvals enable row level security;

drop policy if exists calibration_approvals_select on public.calibration_approvals;
create policy calibration_approvals_select on public.calibration_approvals
  for select using (public.is_admin());

drop policy if exists calibration_approvals_insert on public.calibration_approvals;
create policy calibration_approvals_insert on public.calibration_approvals
  for insert with check (public.is_admin() and reviewer_id = auth.uid());

grant select, insert on public.calibration_approvals to authenticated;

-- Append-only trail for proposals, reviews and deletions.
create table if not exists public.calibration_audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('calibration_candidate', 'cost_code_mapping')),
  entity_key text not null,
  action text not null check (action in ('proposed', 'approved', 'rejected', 'activated', 'mapping_changed', 'record_deleted')),
  actor_id uuid not null default auth.uid(),
  occurred_at timestamptz not null default now(),
  reason text not null,
  before jsonb,
  after jsonb
);

create index if not exists calibration_audit_events_key_idx
  on public.calibration_audit_events (entity_key, occurred_at desc);

alter table public.calibration_audit_events enable row level security;

drop policy if exists calibration_audit_events_select on public.calibration_audit_events;
create policy calibration_audit_events_select on public.calibration_audit_events
  for select using (public.is_admin() or actor_id = auth.uid());

drop policy if exists calibration_audit_events_insert on public.calibration_audit_events;
create policy calibration_audit_events_insert on public.calibration_audit_events
  for insert with check (actor_id = auth.uid() or public.is_admin());

grant select, insert on public.calibration_audit_events to authenticated;
