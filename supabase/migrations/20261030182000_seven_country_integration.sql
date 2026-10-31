
-- =========================================================
-- Seven country integration: classification, licences, indices, FX
-- =========================================================

-- The pricing table already carries USD based rates from open.er-api.com;
-- it gains an explicit as-of date so a conversion can be dated and audited.
alter table public.fx_rates add column if not exists rate_date date;
update public.fx_rates set rate_date = (fetched_at at time zone 'UTC')::date where rate_date is null;

create unique index if not exists fx_rates_base_quote_date_uidx
  on public.fx_rates (base_currency, quote_currency, rate_date);

insert into public.fx_rates (base_currency, quote_currency, rate, rate_date, provider, source_url)
values
('USD','AED',3.6725,'2026-10-30','open.er-api.com','https://open.er-api.com/v6/latest/USD'),
('USD','AUD',1.422859,'2026-10-30','open.er-api.com','https://open.er-api.com/v6/latest/USD'),
('USD','CAD',1.398868,'2026-10-30','open.er-api.com','https://open.er-api.com/v6/latest/USD'),
('USD','CNY',6.676858,'2026-10-30','open.er-api.com','https://open.er-api.com/v6/latest/USD'),
('USD','EUR',0.895934,'2026-10-30','open.er-api.com','https://open.er-api.com/v6/latest/USD'),
('USD','GBP',0.749154,'2026-10-30','open.er-api.com','https://open.er-api.com/v6/latest/USD'),
('USD','MXN',18.833591,'2026-10-30','open.er-api.com','https://open.er-api.com/v6/latest/USD'),
('USD','NGN',1346.223823,'2026-10-30','open.er-api.com','https://open.er-api.com/v6/latest/USD')
on conflict (base_currency, quote_currency, rate_date) do update set rate = excluded.rate, fetched_at = now();

-- Conversion uses the newest rate on or before the requested date and
-- triangulates through USD. No rate means no conversion, never a guess.
create or replace function public.convert_amount(
  p_amount numeric, p_from text, p_to text, p_on date
) returns numeric
language plpgsql stable
as $$
declare r_from numeric; r_to numeric;
begin
  if p_amount is null or p_from is null or p_to is null then return null; end if;
  if upper(p_from) = upper(p_to) then return p_amount; end if;

  if upper(p_from) <> 'USD' then
    select rate into r_from from public.fx_rates
     where base_currency = 'USD' and quote_currency = upper(p_from)
       and coalesce(rate_date, (fetched_at at time zone 'UTC')::date) <= p_on
     order by coalesce(rate_date, (fetched_at at time zone 'UTC')::date) desc limit 1;
    if r_from is null then return null; end if;
  else
    r_from := 1;
  end if;

  if upper(p_to) <> 'USD' then
    select rate into r_to from public.fx_rates
     where base_currency = 'USD' and quote_currency = upper(p_to)
       and coalesce(rate_date, (fetched_at at time zone 'UTC')::date) <= p_on
     order by coalesce(rate_date, (fetched_at at time zone 'UTC')::date) desc limit 1;
    if r_to is null then return null; end if;
  else
    r_to := 1;
  end if;

  return round(p_amount / r_from * r_to, 4);
end;
$$;

-- ── Source classification ─────────────────────────────────
alter table public.price_scan_sources
  add column if not exists source_class text,
  add column if not exists publisher text,
  add column if not exists can_price_products boolean,
  add column if not exists licence_name text,
  add column if not exists licence_url text,
  add column if not exists attribution_text text,
  add column if not exists access_status text,
  add column if not exists access_notes text,
  add column if not exists reliability_score numeric;

-- Every source in this table publishes retail catalogues, so the class is the
-- same no matter what source_format says. Reading the column here would make
-- this migration depend on 20261030191001 creating it first, which is a later
-- version: a clean replay fails with SQLSTATE 42703 even though production ran
-- fine because the column already existed there.
update public.price_scan_sources set source_class = 'retail_catalogue'
 where source_class is null;

alter table public.price_scan_sources drop constraint if exists pss_source_class_check;
alter table public.price_scan_sources add constraint pss_source_class_check check (
  source_class is null or source_class in (
    'official_government_statistics','official_price_index','actual_supplier_price',
    'wholesale_catalogue','retail_catalogue','distributor_price_list','commodity_benchmark'));

-- Only a source class that publishes prices for individual products may ever
-- carry a product price. Indices and general statistics cannot.
create or replace function public.source_class_prices_products(p_class text)
returns boolean language sql immutable as $$
  select p_class in ('actual_supplier_price','wholesale_catalogue','retail_catalogue','distributor_price_list');
$$;

update public.price_scan_sources
   set can_price_products = public.source_class_prices_products(source_class)
 where can_price_products is null;

-- ── Index series: where official statistics live, never in the price book ──
create table if not exists public.market_index_series (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  country_name text,
  index_code text not null,
  index_name text,
  category text,
  period_start date not null,
  period_label text,
  index_value numeric not null,
  base_period text,
  publisher text,
  source_id uuid references public.price_scan_sources(id) on delete set null,
  source_url text,
  source_class text default 'official_price_index',
  licence_name text,
  licence_url text,
  attribution_text text,
  currency text,
  collected_at timestamptz not null default now(),
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  unique (market, index_code, period_start)
);
alter table public.market_index_series enable row level security;
drop policy if exists market_index_series_read on public.market_index_series;
create policy market_index_series_read on public.market_index_series for select to authenticated using (true);
drop policy if exists market_index_series_write on public.market_index_series;
create policy market_index_series_write on public.market_index_series for all to authenticated using (true) with check (true);
create index if not exists market_index_series_market_period on public.market_index_series (market, period_start desc);

-- ── Tables this migration extends ─────────────────────────
-- The observation and market price tables are owned by
-- 20261030191001_market_price_scanner_32, which sorts after this file. Creating
-- them here with the same definition (IF NOT EXISTS, so that migration's own
-- CREATE is a no-op) is what makes the statements below valid on a clean
-- replay: without it the branch dies at "relation does not exist", while
-- production never noticed because both tables already existed there.
create table if not exists public.market_price_observations (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  material_slug text not null,
  material_id uuid references public.estimation_materials (id) on delete set null,
  brand text not null default '',
  specification text not null default '',
  unit text not null default '',
  price numeric not null check (price > 0),
  currency text not null,
  supplier_name text,
  supplier_location text,
  source_id uuid references public.price_scan_sources (id) on delete set null,
  source_url text,
  source_format text,
  extraction text,
  confidence text not null default 'medium'
    check (confidence in ('high','medium','low')),
  observed_on date not null default current_date,
  observed_at timestamptz not null default now(),
  run_id uuid,
  is_test boolean not null default false,
  raw jsonb
);

create table if not exists public.market_material_prices (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  market_name text,
  material_id uuid references public.estimation_materials (id) on delete cascade,
  material_slug text not null,
  product_name text,
  category text,
  brand text not null default '',
  specification text not null default '',
  unit text not null default '',
  currency text,
  supplier_price numeric,
  median_price numeric,
  local_estimate numeric,
  transport_cost numeric,
  delivery_cost numeric,
  frelux_price numeric,
  current_price numeric,
  min_observed numeric,
  max_observed numeric,
  avg_price numeric,
  supplier_name text,
  supplier_location text,
  source_url text,
  last_scanned_at timestamptz,
  last_verified_at timestamptz,
  previous_price numeric,
  price_change_percent numeric,
  confidence_score numeric,
  verification_status text not null default 'no_data'
    check (verification_status in ('verified','unverified','stale','no_data')),
  observations_count integer not null default 0,
  suppliers_count integer not null default 0,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market, material_slug, brand, specification, unit)
);

create table if not exists public.market_scan_settings (
  market text primary key
    references public.market_profiles (country_code)
    on update cascade on delete cascade,
  is_enabled boolean not null default true,
  cadence_hours integer not null default 24 check (cadence_hours between 1 and 720),
  staleness_days integer not null default 30 check (staleness_days between 1 and 365),
  max_sources_per_run integer not null default 60
    check (max_sources_per_run between 1 and 500),
  alert_threshold_percent numeric not null default 5,
  transport_percent numeric not null default 0 check (transport_percent >= 0),
  delivery_percent numeric not null default 0 check (delivery_percent >= 0),
  last_run_at timestamptz,
  last_success_at timestamptz,
  next_run_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_price_alerts (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  material_slug text,
  kind text not null
    check (kind in ('increase','decrease','stale','source_failed','no_sources','no_price')),
  severity text not null default 'info'
    check (severity in ('info','warning','critical')),
  message text not null,
  value numeric,
  previous_value numeric,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz not null default now()
);

-- ── International price records ───────────────────────────
alter table public.market_price_observations
  add column if not exists country_name text,
  add column if not exists price_type text,
  add column if not exists source_class text,
  add column if not exists licence_name text,
  add column if not exists licence_url text,
  add column if not exists attribution_text text,
  add column if not exists verified_at timestamptz,
  add column if not exists original_currency text,
  add column if not exists original_price numeric,
  add column if not exists reporting_currency text,
  add column if not exists price_reporting numeric,
  add column if not exists fx_rate numeric,
  add column if not exists fx_date date,
  add column if not exists standard_unit text,
  add column if not exists standard_quantity numeric,
  add column if not exists price_per_standard_unit numeric,
  add column if not exists reliability_score numeric,
  add column if not exists is_outlier boolean default false,
  add column if not exists duplicate_of uuid;

update public.market_price_observations o
   set original_currency = coalesce(o.original_currency, o.currency),
       original_price = coalesce(o.original_price, o.price),
       price_type = coalesce(o.price_type, 'retail')
 where o.price is not null;

alter table public.market_price_observations drop constraint if exists mpo_price_type_check;
alter table public.market_price_observations add constraint mpo_price_type_check check (
  price_type is null or price_type in ('retail','wholesale','distributor','index','benchmark'));

alter table public.market_price_observations drop constraint if exists mpo_no_index_as_price;
alter table public.market_price_observations add constraint mpo_no_index_as_price check (
  price is null
  or price_type in ('index','benchmark')
  or source_class is null
  or public.source_class_prices_products(source_class));

-- ── Manual approval for suspicious changes ────────────────
alter table public.market_material_prices drop constraint if exists market_material_prices_verification_status_check;
alter table public.market_material_prices add constraint market_material_prices_verification_status_check check (
  verification_status in ('verified','unverified','stale','no_data','pending_approval'));

-- ── Outliers and reliability ─────────────────────────────
create or replace function public.mark_observation_outliers(p_market text)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare flagged integer;
begin
  with base as (
    select id, price,
           percentile_cont(0.5) within group (order by price) over (
             partition by material_slug, coalesce(brand,''), coalesce(specification,''), coalesce(unit,'')) median,
           count(*) over (
             partition by material_slug, coalesce(brand,''), coalesce(specification,''), coalesce(unit,'')) n
    from public.market_price_observations
    where market = p_market and price is not null and coalesce(is_outlier,false) = false
  ), flagged_ids as (
    update public.market_price_observations o
       set is_outlier = true
      from base b
     where o.id = b.id and b.n >= 3 and b.median > 0
       and abs(b.price - b.median) / b.median > 0.5
    returning o.id
  )
  select count(*) into flagged from flagged_ids;
  return flagged;
end;
$$;

create or replace function public.recompute_source_reliability()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare touched integer;
begin
  with stats as (
    select s.id,
           coalesce(count(o.id), 0) observations,
           count(o.id) filter (where coalesce(o.is_outlier,false)) outliers,
           coalesce(s.consecutive_failures, 0) failures,
           s.last_success_at
    from public.price_scan_sources s
    left join public.market_price_observations o on o.source_id = s.id
    group by s.id, s.consecutive_failures, s.last_success_at
  ), scored as (
    update public.price_scan_sources s
       set reliability_score = round(
             greatest(0, least(1,
               0.6
               + case when stats.observations > 0 then 0.2 else 0 end
               + case when stats.last_success_at > now() - interval '7 days' then 0.2 else 0 end
               - least(0.4, stats.failures * 0.1)
               - case when stats.observations > 0
                      then least(0.2, stats.outliers::numeric / greatest(stats.observations,1) * 0.4)
                      else 0 end))
           , 3)
      from stats where stats.id = s.id
    returning s.id
  )
  select count(*) into touched from scored;
  return touched;
end;
$$;

-- ── Category coverage per market ─────────────────────────
create table if not exists public.material_categories (
  code text primary key,
  label text not null,
  sort_order int not null default 0
);
insert into public.material_categories (code, label, sort_order) values
  ('construction_materials','Construction materials',1),
  ('cement_concrete','Cement and concrete',2),
  ('steel_reinforcement','Steel and reinforcement',3),
  ('plumbing','Plumbing',4),
  ('electrical','Electrical materials',5),
  ('solar','Solar equipment',6),
  ('roofing','Roofing',7),
  ('timber','Timber',8),
  ('aggregates','Aggregates',9),
  ('tiles_flooring','Tiles and flooring',10),
  ('paints','Paints',11),
  ('sanitary','Sanitary equipment',12),
  ('doors_windows','Doors and windows',13),
  ('tools_hardware','Tools and hardware',14),
  ('pumps_generators','Pumps and generators',15),
  ('construction_machinery','Construction machinery',16)
on conflict (code) do update set label = excluded.label, sort_order = excluded.sort_order;

-- Materials carry one of the sixteen categories; anything unmapped counts as
-- missing rather than silently belonging to a category it does not.
create or replace function public.canonical_category(p_category text)
returns text language sql immutable as $$
  select case
    when p_category is null then null
    when p_category in (select code from public.material_categories) then p_category
    when p_category ilike '%cement%' or p_category ilike '%concrete%' then 'cement_concrete'
    when p_category ilike '%steel%' or p_category ilike '%rebar%' or p_category ilike '%reinforce%' then 'steel_reinforcement'
    when p_category ilike '%plumb%' or p_category ilike '%pipe%' then 'plumbing'
    when p_category ilike '%electric%' or p_category ilike '%cable%' or p_category ilike '%wire%' then 'electrical'
    when p_category ilike '%solar%' or p_category ilike '%inverter%' or p_category ilike '%panel%' then 'solar'
    when p_category ilike '%roof%' or p_category ilike '%sheet%' then 'roofing'
    when p_category ilike '%timber%' or p_category ilike '%wood%' or p_category ilike '%lumber%' then 'timber'
    when p_category ilike '%aggregate%' or p_category ilike '%sand%' or p_category ilike '%gravel%' then 'aggregates'
    when p_category ilike '%tile%' or p_category ilike '%floor%' then 'tiles_flooring'
    when p_category ilike '%paint%' then 'paints'
    when p_category ilike '%sanitary%' or p_category ilike '%toilet%' or p_category ilike '%basin%' then 'sanitary'
    when p_category ilike '%door%' or p_category ilike '%window%' then 'doors_windows'
    when p_category ilike '%tool%' or p_category ilike '%hardware%' then 'tools_hardware'
    when p_category ilike '%pump%' or p_category ilike '%generator%' then 'pumps_generators'
    when p_category ilike '%machine%' or p_category ilike '%equipment%' then 'construction_machinery'
    else null end;
$$;

create or replace view public.market_category_coverage as
select s.market,
       mc.code as category,
       mc.label,
       count(m.id) filter (where m.is_active) as materials_total,
       count(mp.material_id) as materials_with_product_price,
       greatest(count(m.id) filter (where m.is_active) - count(mp.material_id), 0) as materials_missing
from public.market_scan_settings s
cross join public.material_categories mc
left join public.estimation_materials m
       on m.is_active and public.canonical_category(m.category) = mc.code
left join (
  select distinct market, material_id
  from public.market_material_prices
  where material_id is not null and supplier_price is not null
) mp on mp.market = s.market and mp.material_id = m.id
group by s.market, mc.code, mc.label;

-- ── Seven country coverage, honest about what is actually priced ──
-- Drop first: an existing deployment can carry a different column set, and
-- CREATE OR REPLACE cannot remove columns (the next migration redefines this
-- view again with the grant attached).
drop view if exists public.country_coverage_seven;
create or replace view public.country_coverage_seven as
with codes(code) as (values ('GB'),('US'),('CN'),('CA'),('AU'),('MX'),('AE'))
select mp.country_code as market,
       mp.country_name,
       mp.currency_code as currency,
       (select count(*) from public.price_scan_sources s
         where s.market = mp.country_code and s.is_active) as active_sources,
       (select count(*) from public.price_scan_sources s
         where s.market = mp.country_code and s.is_active
           and s.source_class in ('official_government_statistics','official_price_index')) as official_index_sources,
       (select count(*) from public.price_scan_sources s
         where s.market = mp.country_code and s.is_active and s.can_price_products) as product_sources,
       (select count(*) from public.market_index_series i
         where i.market = mp.country_code and not i.is_test) as index_points,
       (select max(i.collected_at) from public.market_index_series i
         where i.market = mp.country_code) as last_index_at,
       (select count(*) from public.market_price_observations o
         where o.market = mp.country_code and o.price is not null
           and not coalesce(o.is_test,false)) as product_observations,
       (select count(distinct o.supplier_name) from public.market_price_observations o
         where o.market = mp.country_code and o.price is not null) as suppliers,
       (select max(o.observed_at) from public.market_price_observations o
         where o.market = mp.country_code and o.price is not null) as last_product_at,
       (select count(*) from public.market_material_prices p
         where p.market = mp.country_code and p.verification_status = 'pending_approval') as awaiting_approval,
       (select count(*) from public.market_price_alerts a
         where a.market = mp.country_code and a.acknowledged_at is null) as open_alerts,
       (select count(distinct public.canonical_category(m.category))
          from public.market_material_prices p
          join public.estimation_materials m on m.id = p.material_id
         where p.market = mp.country_code and p.supplier_price is not null) as categories_priced
from public.market_profiles mp
where mp.country_code in (select code from codes);
