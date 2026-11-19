-- Free saved-estimate allowance.
--
-- Signed-out visitors can already save an estimate: advanced_estimates rows are
-- bound to the x-client-hash header, so work survives a reload without an
-- account. What was missing is a stated allowance. Without one, the free tier
-- is either unlimited (no reason to sign in) or silently lossy (the visitor
-- finds out at the wrong moment), and neither is a product decision.
--
-- The allowance lives in a table, not a hardcoded number, so an admin can change
-- it without a deploy. A missing or inactive row never blocks a save: losing a
-- visitor's work because configuration is absent would be worse than a generous
-- free tier.

create table if not exists public.saved_estimate_allowances (
  plan_key text primary key,
  max_saved integer not null check (max_saved > 0),
  label text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.saved_estimate_allowances enable row level security;

drop policy if exists "saved_estimate_allowances_read" on public.saved_estimate_allowances;
create policy "saved_estimate_allowances_read"
  on public.saved_estimate_allowances for select
  to anon, authenticated
  using (true);

insert into public.saved_estimate_allowances (plan_key, max_saved, label)
values ('free', 2, 'Two saved estimates on this device')
on conflict (plan_key) do nothing;

create or replace function public.enforce_saved_estimate_allowance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  -- Only a save counts; a draft insert is not an estimate the visitor keeps.
  if new.is_saved is not true then
    return new;
  end if;

  -- Signed-in owners are governed by their plan's project limit, not this one.
  if new.user_id is not null then
    return new;
  end if;

  select max_saved into v_max
  from public.saved_estimate_allowances
  where plan_key = 'free' and is_active;

  if v_max is null then
    return new; -- unconfigured: never block a visitor's save
  end if;

  select count(*) into v_count
  from public.advanced_estimates
  where client_hash = new.client_hash
    and user_id is null
    and is_saved is true;

  if v_count >= v_max then
    raise exception 'Saved estimate allowance reached (% saved estimates on this device). Delete one, or sign in to keep more.', v_max
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_saved_estimate_allowance on public.advanced_estimates;
create trigger trg_saved_estimate_allowance
  before insert on public.advanced_estimates
  for each row execute function public.enforce_saved_estimate_allowance();
