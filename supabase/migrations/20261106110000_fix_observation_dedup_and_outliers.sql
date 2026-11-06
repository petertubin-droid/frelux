-- Price observations were being discarded silently, and nothing deduplicated them.
--
-- Measured on 6 November 2026, after the scanner was revived:
--
--   {"market":"CI","scanned":2,"candidates_created":1,"observations_filed":0,
--    "auto_applied":1}
--
-- A candidate became a published price while its source observation was never
-- persisted. The write uses PostgREST upsert with the conflict target
--
--   source_id,supplier_name,market,material_slug,brand,specification,unit,observed_on
--
-- but the only unique index on the table was built on COALESCE(...) expressions,
-- which Postgres cannot use to infer an ON CONFLICT target, so every statement
-- failed with 42P10 and the function swallowed the error. market_price_observations
-- held 54 rows covering 6 market-material pairs, with AUpair repeated 7 times and
-- GB repeated 7 times, because those rows predate the index.
--
-- This migration makes the constraint match the writer, keeps duplicates out for
-- any future writer, and makes is_outlier mean something.

-- ── 1. Collapse the existing exact duplicates, keeping the newest row
with ranked as (
  select id,
         row_number() over (
           partition by source_id, supplier_name, market, material_slug,
                        brand, specification, unit, observed_on
           order by observed_at desc nulls last, id
         ) as rn
    from public.market_price_observations
)
delete from public.market_price_observations o
 using ranked r
 where o.id = r.id and r.rn > 1;

-- ── 2. The unique index the writer actually targets
drop index if exists public.market_price_observations_daily_uidx;

-- NULL columns are distinct in a unique index, so a single NULL brand would let
-- duplicates through again. The columns hold no NULLs today; make that a rule.
update public.market_price_observations
   set brand = coalesce(brand, ''),
       specification = coalesce(specification, ''),
       unit = coalesce(unit, ''),
       supplier_name = coalesce(supplier_name, '')
 where brand is null or specification is null or unit is null or supplier_name is null;

alter table public.market_price_observations
  alter column brand set default '',
  alter column specification set default '',
  alter column unit set default '',
  alter column supplier_name set default '';

create unique index market_price_observations_daily_uidx
  on public.market_price_observations (
    source_id, supplier_name, market, material_slug,
    brand, specification, unit, observed_on
  );

-- ── 3. Guard: skip an exact duplicate, and flag a price that is far from peers
create or replace function public.market_price_observation_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_peers integer;
  v_median numeric;
begin
  if new.observed_on is null then
    new.observed_on := coalesce(new.observed_at, now())::date;
  end if;
  new.brand := coalesce(new.brand, '');
  new.specification := coalesce(new.specification, '');
  new.unit := coalesce(new.unit, '');
  new.supplier_name := coalesce(new.supplier_name, '');

  -- The same supplier, day and variant is one fact. A second scan of the same
  -- page must not read as a second observation, because agreement gates count
  -- observations.
  if exists (
    select 1
      from public.market_price_observations o
     where o.source_id = new.source_id
       and o.supplier_name = new.supplier_name
       and o.market = new.market
       and o.material_slug = new.material_slug
       and o.brand = new.brand
       and o.specification = new.specification
       and o.unit = new.unit
       and o.observed_on = new.observed_on
  ) then
    return null;
  end if;

  -- Outlier flag: only judged against real peers, never from a single row.
  select count(*), percentile_cont(0.5) within group (order by o.price)
    into v_peers, v_median
    from public.market_price_observations o
   where o.market = new.market
     and o.material_slug = new.material_slug
     and o.currency = new.currency
     and coalesce(o.is_outlier, false) = false
     and o.observed_at > now() - interval '90 days';

  if coalesce(v_peers, 0) >= 5 and coalesce(v_median, 0) > 0 then
    if abs(new.price / v_median - 1) > 0.40 then
      new.is_outlier := true;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists market_price_observation_guard_trg on public.market_price_observations;
create trigger market_price_observation_guard_trg
  before insert on public.market_price_observations
  for each row execute function public.market_price_observation_guard();

-- ── 4. Operator truth on what the observation store actually holds
create or replace function public.price_observation_summary()
returns table(
  market text,
  pairs integer,
  observations integer,
  suppliers integer,
  outliers integer,
  newest_day date
)
language sql
security definer
set search_path to 'public'
stable
as $function$
  select o.market,
         count(distinct o.material_slug)::int,
         count(*)::int,
         count(distinct o.supplier_name)::int,
         count(*) filter (where coalesce(o.is_outlier, false))::int,
         max(o.observed_on)
    from public.market_price_observations o
   group by o.market
   order by o.market;
$function$;

revoke all on function public.price_observation_summary() from public;
grant execute on function public.price_observation_summary() to authenticated, service_role;

do $$
declare
  v_def text;
begin
  select indexdef into v_def
    from pg_indexes
   where schemaname = 'public'
     and indexname = 'market_price_observations_daily_uidx';
  if v_def is null then
    raise exception 'observation unique index missing after migration';
  end if;
  if v_def ilike '%coalesce%' then
    raise exception 'observation unique index still uses expressions the writer cannot target';
  end if;
end $$;
