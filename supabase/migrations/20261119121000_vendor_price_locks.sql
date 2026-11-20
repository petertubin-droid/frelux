-- Vendor price locks.
--
-- FRELUX prices are indicative: they come from published listings and price
-- submissions and can lag the market. A commercial tender cannot be priced on
-- an indicative figure once a supplier has quoted a firm rate with an expiry,
-- so a supplier's held price is stored separately, with the window it is held
-- for and the reference it can be checked against.
--
-- The lock is data, not code: a buyer, QS or admin records the quote, and the
-- resolver refuses to use it outside its window, its market or its currency.
-- Nothing here converts a locked price into another currency. A dollar quote
-- applied to a naira book is a wrong number, not a conversion.

create table if not exists public.vendor_price_locks (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  material_slug text not null,
  supplier_name text not null,
  -- Quote number, contract line or feed id: what the price can be checked against.
  supplier_ref text,
  locked_price numeric not null check (locked_price > 0),
  currency text not null check (char_length(currency) between 3 and 3),
  unit text not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz not null,
  source text not null default 'quote'
    check (source in ('quote', 'contract', 'feed')),
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_price_locks_window check (valid_to > valid_from)
);

create index if not exists vendor_price_locks_lookup
  on public.vendor_price_locks (market, material_slug, currency, valid_to desc);

alter table public.vendor_price_locks enable row level security;

-- Anyone pricing work may read a held price; only an admin may record one.
drop policy if exists "vendor_price_locks_read" on public.vendor_price_locks;
create policy "vendor_price_locks_read"
  on public.vendor_price_locks for select
  to anon, authenticated
  using (is_active);

drop policy if exists "vendor_price_locks_admin_write" on public.vendor_price_locks;
create policy "vendor_price_locks_admin_write"
  on public.vendor_price_locks for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "vendor_price_locks_admin_update" on public.vendor_price_locks;
create policy "vendor_price_locks_admin_update"
  on public.vendor_price_locks for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "vendor_price_locks_admin_delete" on public.vendor_price_locks;
create policy "vendor_price_locks_admin_delete"
  on public.vendor_price_locks for delete
  to authenticated
  using (public.is_admin());

drop trigger if exists vendor_price_locks_updated_at on public.vendor_price_locks;
create trigger vendor_price_locks_updated_at
  before update on public.vendor_price_locks
  for each row execute function public.set_updated_at();

-- What a quote may use right now. The resolver applies the same rule in code;
-- this view exists so the admin screen and the weekly alert can read the same
-- truth without duplicating the window test.
create or replace view public.active_vendor_price_locks as
select *
from public.vendor_price_locks
where is_active
  and now() >= valid_from
  and now() < valid_to;

comment on view public.active_vendor_price_locks is
  'Vendor price locks inside their validity window, in their own market and currency. Never converted across currencies.';
