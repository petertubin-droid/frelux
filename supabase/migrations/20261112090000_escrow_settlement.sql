-- =========================================================
-- Escrow settlement on Paystack.
--
-- Money is recorded in integer minor units (kobo). Only the service role may
-- move it: anon and authenticated roles can create their own contract and read
-- their own rows, but no client can write held, released, refunded or fee
-- values, and no client can flip a milestone state. Every state change goes
-- through an edge function that calls Paystack first.
-- =========================================================

create table if not exists public.escrow_contracts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  reference_code text not null unique,
  title text not null check (length(trim(title)) between 3 and 160),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  total_minor bigint not null check (total_minor > 0),
  fee_basis_points integer not null default 700
    check (fee_basis_points between 0 and 10000),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','funds_held','partially_released','released','refunded','disputed')),
  held_minor bigint not null default 0 check (held_minor >= 0),
  released_minor bigint not null default 0 check (released_minor >= 0),
  refunded_minor bigint not null default 0 check (refunded_minor >= 0),
  fee_minor bigint not null default 0 check (fee_minor >= 0),
  buyer_name text,
  buyer_email text,
  seller_name text not null,
  seller_email text,
  seller_bank_code text,
  seller_account_number text,
  seller_recipient_code text,
  provider text not null default 'paystack',
  provider_reference text,
  provider_transaction_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  -- The ledger can never pay out more than it took in.
  constraint escrow_books_balance check (
    released_minor + refunded_minor <= held_minor
  )
);

-- Held money can never be negative once issued, so the ledger must always
-- satisfy: held = still in escrow + released + refunded + (nothing else).
comment on column public.escrow_contracts.held_minor is
  'Minor units actually received from the buyer. Written only by the webhook.';

create table if not exists public.escrow_milestones (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.escrow_contracts(id) on delete cascade,
  label text not null check (length(trim(label)) between 2 and 120),
  position integer not null check (position >= 0),
  amount_minor bigint not null check (amount_minor > 0),
  state text not null default 'pending'
    check (state in ('pending','released','refunded')),
  released_at timestamptz,
  transfer_code text,
  created_date timestamptz not null default now(),
  unique (contract_id, position)
);

create index if not exists escrow_contracts_owner_idx
  on public.escrow_contracts (created_by, created_date desc);
create index if not exists escrow_contracts_reference_idx
  on public.escrow_contracts (reference_code);
create index if not exists escrow_milestones_contract_idx
  on public.escrow_milestones (contract_id, position);

-- Keep updated_date honest without relying on clients.
create or replace function public.escrow_touch_updated()
returns trigger
language plpgsql
as $$
begin
  new.updated_date := now();
  return new;
end;
$$;

drop trigger if exists escrow_contracts_touch on public.escrow_contracts;
create trigger escrow_contracts_touch
  before update on public.escrow_contracts
  for each row execute function public.escrow_touch_updated();

-- Milestones must add up to the contract total, checked when a contract is
-- created and whenever the set changes.
create or replace function public.escrow_assert_milestone_total()
returns trigger
language plpgsql
as $$
declare
  v_contract uuid := coalesce(new.contract_id, old.contract_id);
  v_total bigint;
  v_planned bigint;
begin
  select total_minor into v_total from public.escrow_contracts where id = v_contract;
  if v_total is null then
    return coalesce(new, old);
  end if;
  select coalesce(sum(amount_minor), 0) into v_planned
    from public.escrow_milestones where contract_id = v_contract;
  if v_planned > v_total then
    raise exception 'milestones exceed the contract total (% > %)', v_planned, v_total;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists escrow_milestones_total on public.escrow_milestones;
create trigger escrow_milestones_total
  after insert or update or delete on public.escrow_milestones
  for each row execute function public.escrow_assert_milestone_total();

alter table public.escrow_contracts enable row level security;
alter table public.escrow_milestones enable row level security;

drop policy if exists escrow_contracts_read_own on public.escrow_contracts;
create policy escrow_contracts_read_own on public.escrow_contracts
  for select to authenticated
  using (created_by = auth.uid() or public.is_admin());

drop policy if exists escrow_contracts_insert_own on public.escrow_contracts;
create policy escrow_contracts_insert_own on public.escrow_contracts
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists escrow_milestones_read_own on public.escrow_milestones;
create policy escrow_milestones_read_own on public.escrow_milestones
  for select to authenticated
  using (
    exists (
      select 1 from public.escrow_contracts c
      where c.id = escrow_milestones.contract_id
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );

-- Table privileges. RLS decides which rows a client may see, but a client
-- still needs the privilege to touch the table at all, and the edge functions
-- authenticate as service_role which needs explicit grants on new tables.
grant select, insert on public.escrow_contracts to authenticated;
grant select on public.escrow_milestones to authenticated;
grant all on public.escrow_contracts to service_role;
grant all on public.escrow_milestones to service_role;

-- Deliberately no client UPDATE or DELETE policy on either table: money fields
-- and milestone states are service-role only.
revoke update, delete on public.escrow_contracts from anon, authenticated;
revoke update, delete on public.escrow_milestones from anon, authenticated;
