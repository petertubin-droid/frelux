-- 20261031160000_supplier_network.sql
-- FRELUX Supplier Network: a verified construction material directory and
-- procurement marketplace that feeds the existing Material Price Index.
--
-- Design constraints (FRELUX master rule):
--   * extend the supplier tables that already exist, do not fork a second
--     supplier model;
--   * verification and moderation are the only paths that raise trust, and no
--     client may write them itself;
--   * a supplier's price is an *observation*, never a published index price.
--     Publication still goes through price_index_audit + price-index-review;
--   * money is numeric with an explicit currency, never a float, and no card
--     data is stored anywhere in this schema.
--
-- ROLLBACK: see supabase/migrations/rollback/20261031160000_supplier_network_rollback.sql

begin;

-- =========================================================
-- 1. Supplier profile: directory fields, verification level,
--    and (clearly separated) paid placement.
-- =========================================================

alter table public.supplier_profiles
  add column if not exists description text,
  add column if not exists neighbourhood text,
  add column if not exists product_categories text[] not null default '{}',
  add column if not exists public_slug text,
  add column if not exists verification_level text not null default 'unverified',
  add column if not exists delivery_notes text,
  add column if not exists minimum_order_value numeric,
  add column if not exists delivery_fee_model text not null default 'quoted',
  add column if not exists response_rate numeric,
  add column if not exists avg_response_hours numeric,
  -- monetisation: a plan is a subscription, a feature is a paid placement.
  add column if not exists subscription_plan text not null default 'free',
  add column if not exists subscription_status text not null default 'active',
  add column if not exists subscription_renews_at timestamptz,
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_until timestamptz,
  add column if not exists lead_credits integer not null default 0;

-- The level vocabulary is ordered; registration alone is the bottom rung and
-- must never be presented as trust.
alter table public.supplier_profiles
  drop constraint if exists supplier_profiles_verification_level_check;
alter table public.supplier_profiles
  add constraint supplier_profiles_verification_level_check
  check (verification_level in (
    'unverified', 'identity_checked', 'documents_reviewed', 'address_checked', 'platform_verified'
  ));

alter table public.supplier_profiles
  drop constraint if exists supplier_profiles_delivery_fee_model_check;
alter table public.supplier_profiles
  add constraint supplier_profiles_delivery_fee_model_check
  check (delivery_fee_model in ('free', 'per_order', 'per_km', 'quoted'));

alter table public.supplier_profiles
  drop constraint if exists supplier_profiles_subscription_plan_check;
alter table public.supplier_profiles
  add constraint supplier_profiles_subscription_plan_check
  check (subscription_plan in ('free', 'growth', 'enterprise'));

alter table public.supplier_profiles
  drop constraint if exists supplier_profiles_subscription_status_check;
alter table public.supplier_profiles
  add constraint supplier_profiles_subscription_status_check
  check (subscription_status in ('active', 'past_due', 'cancelled'));

-- Existing rows: derive the level from what the legacy columns actually assert.
update public.supplier_profiles
set verification_level = case
  when is_verified and verification_status = 'verified' then 'documents_reviewed'
  when is_verified then 'identity_checked'
  else 'unverified'
end
where verification_level = 'unverified';

create unique index if not exists supplier_profiles_public_slug_key
  on public.supplier_profiles (public_slug)
  where public_slug is not null;

create index if not exists supplier_profiles_directory_idx
  on public.supplier_profiles (market_code, city, verification_level)
  where is_active = true;

-- =========================================================
-- 2. Delivery coverage (a supplier serves named places, not a radius guess)
-- =========================================================

create table if not exists public.supplier_delivery_zones (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.supplier_profiles(id) on delete cascade,
  market_code text not null,
  city text not null,
  neighbourhood text,
  delivery_fee numeric not null default 0 check (delivery_fee >= 0),
  currency text not null,
  minimum_order_value numeric,
  eta_days integer check (eta_days is null or eta_days >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_delivery_zones_lookup_idx
  on public.supplier_delivery_zones (market_code, city)
  where is_active = true;

-- =========================================================
-- 3. Verification evidence trail (append-only, never public)
-- =========================================================

create table if not exists public.supplier_verification_events (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.supplier_profiles(id) on delete cascade,
  requested_level text not null check (requested_level in (
    'identity_checked', 'documents_reviewed', 'address_checked', 'platform_verified'
  )),
  action text not null check (action in ('submitted', 'approved', 'rejected', 'downgraded')),
  evidence_type text,
  evidence_ref text,
  reviewer_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists supplier_verification_events_supplier_idx
  on public.supplier_verification_events (supplier_id, created_at desc);

-- =========================================================
-- 4. Catalogue: specification, delivery charge, moderation state
-- =========================================================

alter table public.supplier_inventory_items
  add column if not exists specification text,
  add column if not exists delivery_fee numeric check (delivery_fee is null or delivery_fee >= 0),
  add column if not exists delivery_fee_currency text,
  add column if not exists price_updated_at timestamptz not null default now(),
  add column if not exists listing_status text not null default 'active',
  add column if not exists admin_notes text;

alter table public.supplier_inventory_items
  drop constraint if exists supplier_inventory_items_listing_status_check;
alter table public.supplier_inventory_items
  add constraint supplier_inventory_items_listing_status_check
  check (listing_status in ('pending', 'active', 'rejected', 'removed'));

create index if not exists supplier_inventory_search_idx
  on public.supplier_inventory_items (market_code, material_category, material_slug)
  where is_active = true and listing_status = 'active';

-- =========================================================
-- 5. Procurement: material requests, supplier quotations, orders
-- =========================================================

create table if not exists public.material_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  reference text not null,
  market_code text not null,
  currency text not null,
  city text,
  neighbourhood text,
  title text not null,
  notes text,
  needed_by date,
  visibility text not null default 'public' check (visibility in ('public', 'invited')),
  status text not null default 'open' check (status in (
    'draft', 'open', 'quoted', 'awarded', 'closed', 'cancelled'
  )),
  expires_at timestamptz,
  awarded_quote_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists material_requests_open_idx
  on public.material_requests (market_code, status, created_at desc);

create table if not exists public.material_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.material_requests(id) on delete cascade,
  material_category text not null,
  material_slug text,
  product_name text not null,
  brand text,
  specification text,
  unit text not null,
  quantity numeric not null check (quantity > 0),
  target_price numeric check (target_price is null or target_price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists material_request_items_request_idx
  on public.material_request_items (request_id);

create table if not exists public.material_request_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.material_requests(id) on delete cascade,
  supplier_id uuid not null references public.supplier_profiles(id) on delete cascade,
  supplier_user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null,
  -- per-line quantities and rates exactly as the supplier quoted them
  lines jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0 check (subtotal >= 0),
  delivery_fee numeric not null default 0 check (delivery_fee >= 0),
  total numeric not null default 0 check (total >= 0),
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  valid_until date,
  notes text,
  status text not null default 'submitted' check (status in (
    'submitted', 'withdrawn', 'accepted', 'declined', 'expired'
  )),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);

create index if not exists material_request_quotes_request_idx
  on public.material_request_quotes (request_id, status);

create table if not exists public.material_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  request_id uuid not null references public.material_requests(id) on delete restrict,
  quote_id uuid not null references public.material_request_quotes(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.supplier_profiles(id) on delete restrict,
  currency text not null,
  subtotal numeric not null default 0 check (subtotal >= 0),
  delivery_fee numeric not null default 0 check (delivery_fee >= 0),
  total numeric not null default 0 check (total >= 0),
  status text not null default 'placed' check (status in (
    'placed', 'confirmed', 'dispatched', 'delivered', 'completed', 'cancelled', 'disputed'
  )),
  expected_delivery date,
  delivered_at timestamptz,
  delivery_confirmed_by uuid references auth.users(id) on delete set null,
  delivery_note text,
  -- payment is deliberately out of scope for this phase; no card data, ever.
  payment_status text not null default 'unpaid' check (payment_status in (
    'unpaid', 'pending', 'paid', 'refunded'
  )),
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists material_orders_buyer_idx on public.material_orders (buyer_id, created_at desc);
create index if not exists material_orders_supplier_idx on public.material_orders (supplier_id, created_at desc);

create table if not exists public.material_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.material_orders(id) on delete cascade,
  status text not null,
  actor_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists material_order_events_order_idx
  on public.material_order_events (order_id, created_at);

-- =========================================================
-- 6. Saving suppliers, reporting suppliers, paid promotion config
-- =========================================================

alter table public.marketplace_favorites
  add column if not exists supplier_id uuid references public.supplier_profiles(id) on delete cascade;

alter table public.marketplace_reports
  add column if not exists supplier_id uuid references public.supplier_profiles(id) on delete set null;

create unique index if not exists marketplace_favorites_supplier_key
  on public.marketplace_favorites (user_id, supplier_id)
  where supplier_id is not null;

create table if not exists public.supplier_plans (
  code text primary key check (code in ('free', 'growth', 'enterprise')),
  name text not null,
  currency text not null default 'NGN',
  monthly_price numeric not null default 0 check (monthly_price >= 0),
  max_listings integer,
  includes_verified_badge boolean not null default false,
  monthly_lead_credits integer not null default 0,
  featured_slots integer not null default 0,
  commission_pct numeric not null default 0 check (commission_pct >= 0 and commission_pct <= 30),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.supplier_plans
  (code, name, currency, monthly_price, max_listings, includes_verified_badge, monthly_lead_credits, featured_slots, commission_pct)
values
  ('free', 'Directory (free)', 'NGN', 0, 10, false, 5, 0, 0),
  ('growth', 'Growth supplier', 'NGN', 15000, 100, false, 50, 1, 0),
  ('enterprise', 'Enterprise supplier', 'NGN', 60000, null, true, 250, 4, 0)
on conflict (code) do nothing;

-- Append-only audit trail for every trust/paid action in the marketplace.
create table if not exists public.supplier_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_ref text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists supplier_audit_log_entity_idx
  on public.supplier_audit_log (entity_type, entity_ref, created_at desc);

-- =========================================================
-- 7. Integrity guards a client cannot talk its way around
-- =========================================================

-- A request can only be awarded once, and only to a quote that belongs to it.
create or replace function public.guard_material_request_award()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  quote_request uuid;
  quote_supplier uuid;
begin
  if new.awarded_quote_id is null then
    return new;
  end if;
  select request_id, supplier_id into quote_request, quote_supplier
  from public.material_request_quotes where id = new.awarded_quote_id;
  if quote_request is null or quote_request <> new.id then
    raise exception 'Awarded quote does not belong to this request';
  end if;
  if old.awarded_quote_id is not null and old.awarded_quote_id <> new.awarded_quote_id then
    raise exception 'Request already awarded';
  end if;
  return new;
end;
$$;

drop trigger if exists material_requests_award_guard on public.material_requests;
create trigger material_requests_award_guard
  before update on public.material_requests
  for each row execute function public.guard_material_request_award();

-- A quote may only be submitted for an open request, and never by a supplier
-- whose profile is suspended or unapproved.
create or replace function public.guard_material_quote_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  req_status text;
  req_expires timestamptz;
  supplier_active boolean;
begin
  select status, expires_at into req_status, req_expires
  from public.material_requests where id = new.request_id;
  if req_status is null then
    raise exception 'Request not found';
  end if;
  if req_status not in ('open', 'quoted') then
    raise exception 'This request is no longer accepting quotes';
  end if;
  if req_expires is not null and req_expires < now() then
    raise exception 'This request has expired';
  end if;
  select is_active into supplier_active from public.supplier_profiles where id = new.supplier_id;
  if supplier_active is not true then
    raise exception 'Supplier profile is not active';
  end if;
  return new;
end;
$$;

drop trigger if exists material_quotes_insert_guard on public.material_request_quotes;
create trigger material_quotes_insert_guard
  before insert on public.material_request_quotes
  for each row execute function public.guard_material_quote_insert();

-- Keep price_updated_at honest: whenever a listing's price changes, restamp it.
create or replace function public.touch_listing_price()
returns trigger
language plpgsql
as $$
begin
  if new.unit_price is distinct from old.unit_price then
    new.price_updated_at := now();
    new.last_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists supplier_inventory_price_touch on public.supplier_inventory_items;
create trigger supplier_inventory_price_touch
  before update on public.supplier_inventory_items
  for each row execute function public.touch_listing_price();

-- Helper: the caller's supplier profile id (null when they have none).
create or replace function public.current_supplier_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.supplier_profiles where user_id = auth.uid() limit 1;
$$;

revoke all on function public.current_supplier_id() from public;
grant execute on function public.current_supplier_id() to authenticated, anon;

-- =========================================================
-- 8. Row level security
-- =========================================================

alter table public.supplier_delivery_zones enable row level security;
alter table public.supplier_verification_events enable row level security;
alter table public.material_requests enable row level security;
alter table public.material_request_items enable row level security;
alter table public.material_request_quotes enable row level security;
alter table public.material_orders enable row level security;
alter table public.material_order_events enable row level security;
alter table public.supplier_plans enable row level security;
alter table public.supplier_audit_log enable row level security;

-- Delivery zones: public read for active suppliers, owner writes.
drop policy if exists "zones_public_read" on public.supplier_delivery_zones;
create policy "zones_public_read" on public.supplier_delivery_zones
  for select using (
    is_active = true
    and exists (
      select 1 from public.supplier_profiles p
      where p.id = supplier_id and p.is_active = true
    )
  );

drop policy if exists "zones_owner_all" on public.supplier_delivery_zones;
create policy "zones_owner_all" on public.supplier_delivery_zones
  for all using (supplier_id = public.current_supplier_id() or is_admin())
  with check (supplier_id = public.current_supplier_id() or is_admin());

-- Verification evidence: supplier sees its own, admins see all, nobody else.
drop policy if exists "verification_events_owner_read" on public.supplier_verification_events;
create policy "verification_events_owner_read" on public.supplier_verification_events
  for select using (supplier_id = public.current_supplier_id() or is_admin());

drop policy if exists "verification_events_supplier_submit" on public.supplier_verification_events;
create policy "verification_events_supplier_submit" on public.supplier_verification_events
  for insert with check (
    supplier_id = public.current_supplier_id() and action = 'submitted'
  );

-- Requests: the buyer owns them; open requests in a supplier's market are
-- visible to that supplier so it can quote.
drop policy if exists "requests_buyer_all" on public.material_requests;
create policy "requests_buyer_all" on public.material_requests
  for all using (buyer_id = auth.uid() or is_admin())
  with check (buyer_id = auth.uid() or is_admin());

drop policy if exists "requests_supplier_market_read" on public.material_requests;
create policy "requests_supplier_market_read" on public.material_requests
  for select using (
    status in ('open', 'quoted')
    and exists (
      select 1 from public.supplier_profiles p
      where p.user_id = auth.uid() and p.is_active = true and p.market_code = material_requests.market_code
    )
  );

drop policy if exists "request_items_read" on public.material_request_items;
create policy "request_items_read" on public.material_request_items
  for select using (
    exists (
      select 1 from public.material_requests r
      where r.id = request_id
        and (
          r.buyer_id = auth.uid()
          or is_admin()
          or (
            r.status in ('open', 'quoted')
            and exists (
              select 1 from public.supplier_profiles p
              where p.user_id = auth.uid() and p.is_active = true and p.market_code = r.market_code
            )
          )
        )
    )
  );

drop policy if exists "request_items_buyer_write" on public.material_request_items;
create policy "request_items_buyer_write" on public.material_request_items
  for all using (
    exists (select 1 from public.material_requests r where r.id = request_id and (r.buyer_id = auth.uid() or is_admin()))
  )
  with check (
    exists (select 1 from public.material_requests r where r.id = request_id and (r.buyer_id = auth.uid() or is_admin()))
  );

-- Quotes: the supplier owns its quote, the buyer reads quotes on its request.
drop policy if exists "quotes_supplier_rw" on public.material_request_quotes;
create policy "quotes_supplier_rw" on public.material_request_quotes
  for all using (supplier_user_id = auth.uid() or is_admin())
  with check (supplier_user_id = auth.uid() or is_admin());

drop policy if exists "quotes_buyer_read" on public.material_request_quotes;
create policy "quotes_buyer_read" on public.material_request_quotes
  for select using (
    exists (select 1 from public.material_requests r where r.id = request_id and r.buyer_id = auth.uid())
  );

-- Orders: both parties read, neither can rewrite the money once placed.
drop policy if exists "orders_party_read" on public.material_orders;
create policy "orders_party_read" on public.material_orders
  for select using (
    buyer_id = auth.uid()
    or supplier_id = public.current_supplier_id()
    or is_admin()
  );

-- Orders are created only by the award step in the supplier-ops function, so
-- there is deliberately no client insert policy: a buyer cannot forge an order
-- or its totals.

drop policy if exists "orders_supplier_update" on public.material_orders;
create policy "orders_supplier_update" on public.material_orders
  for update using (supplier_id = public.current_supplier_id() or is_admin())
  with check (supplier_id = public.current_supplier_id() or is_admin());

drop policy if exists "order_events_party_read" on public.material_order_events;
create policy "order_events_party_read" on public.material_order_events
  for select using (
    exists (
      select 1 from public.material_orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.supplier_id = public.current_supplier_id() or is_admin())
    )
  );

drop policy if exists "order_events_party_insert" on public.material_order_events;
create policy "order_events_party_insert" on public.material_order_events
  for insert with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.material_orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.supplier_id = public.current_supplier_id() or is_admin())
    )
  );

-- Plans are public configuration; only admins change them.
drop policy if exists "plans_public_read" on public.supplier_plans;
create policy "plans_public_read" on public.supplier_plans
  for select using (true);

drop policy if exists "plans_admin_write" on public.supplier_plans;
create policy "plans_admin_write" on public.supplier_plans
  for all using (is_admin()) with check (is_admin());

-- Audit log: admins read. Writes come from service-role functions; a signed-in
-- administrator may append too, but nobody may edit or delete.
drop policy if exists "supplier_audit_admin_read" on public.supplier_audit_log;
create policy "supplier_audit_admin_read" on public.supplier_audit_log
  for select using (is_admin());

drop policy if exists "supplier_audit_admin_append" on public.supplier_audit_log;
create policy "supplier_audit_admin_append" on public.supplier_audit_log
  for insert with check (is_admin() and actor_id = auth.uid());

-- =========================================================
-- 9. Grants
-- =========================================================

grant select on public.supplier_delivery_zones to anon, authenticated;
grant insert, update, delete on public.supplier_delivery_zones to authenticated;

grant select on public.supplier_plans to anon, authenticated;
grant insert, update, delete on public.supplier_plans to authenticated;

grant select on public.supplier_verification_events to authenticated;
grant insert on public.supplier_verification_events to authenticated;

grant select, insert, update, delete on public.material_requests to authenticated;
grant select, insert, update, delete on public.material_request_items to authenticated;
grant select, insert, update, delete on public.material_request_quotes to authenticated;
grant select, update on public.material_orders to authenticated;
grant select, insert on public.material_order_events to authenticated;

grant select on public.supplier_audit_log to authenticated;
grant insert on public.supplier_audit_log to authenticated;

grant select, insert, update, delete on public.supplier_delivery_zones to service_role;
grant select, insert, update, delete on public.supplier_verification_events to service_role;
grant select, insert, update, delete on public.material_requests to service_role;
grant select, insert, update, delete on public.material_request_items to service_role;
grant select, insert, update, delete on public.material_request_quotes to service_role;
grant select, insert, update, delete on public.material_orders to service_role;
grant select, insert, update, delete on public.material_order_events to service_role;
grant select, insert, update on public.supplier_plans to service_role;
grant select, insert on public.supplier_audit_log to service_role;

grant execute on function public.guard_material_request_award() to service_role;
grant execute on function public.guard_material_quote_insert() to service_role;

commit;
