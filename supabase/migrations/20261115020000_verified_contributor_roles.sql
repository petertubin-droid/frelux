-- Contributor role tracking and trust boundary guardrails for estimation actuals.
--
-- Restricts elevated professional roles (quantity_surveyor, civil_engineer, admin)
-- so they cannot be self-attested by unverified callers to skew calibration weights.

alter table public.estimation_actuals
  add column if not exists contributor_role text not null default 'homeowner';

alter table public.estimation_actuals
  drop constraint if exists estimation_actuals_contributor_role;

alter table public.estimation_actuals
  add constraint estimation_actuals_contributor_role
  check (contributor_role in (
    'homeowner',
    'contractor',
    'verified_pro',
    'civil_engineer',
    'quantity_surveyor',
    'admin',
    'anonymous'
  ));

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

      -- Non-admin cannot claim admin or professional surveyor/engineer roles without verified review
      if new.contributor_role in ('admin', 'quantity_surveyor', 'civil_engineer') then
        new.contributor_role := 'homeowner';
      end if;
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
    if new.contributor_role in ('admin', 'quantity_surveyor', 'civil_engineer') then
      new.contributor_role := old.contributor_role;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
