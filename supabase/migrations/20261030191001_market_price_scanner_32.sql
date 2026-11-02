-- =========================================================
-- 32-market price scanner: schema, aggregation, gates, scheduler
--
-- The existing scanner is EXTENDED, not replaced: same source registry
-- (price_scan_sources), same candidate filing (price_scan_candidates), same
-- batch audit (price_scan_runs), same book (estimation_prices). Added here is
-- the market dimension the 32-market spec requires:
--
--   market_scan_settings        one row per market the app serves (32), with
--                               cadence, freshness window, alert threshold and
--                               cost assumptions per market;
--   source registry fields      supplier identity, feed format, typed extraction
--                               mapping and per-source cadence;
--   market_price_observations   supplier-level facts, one per source, material,
--                               variant and day (duplicate-proof);
--   market_material_prices      the market-level record: median, range, mean,
--                               supplier identity, previous price, change,
--                               confidence, verification state, and the
--                               separate supplier / transport / delivery /
--                               Frelux numbers;
--   market_scan_runs            per-market run ledger;
--   market_price_alerts         increases, decreases, stale books, dead sources.
--
-- Encoded rules:
--   * a market is priced only from its own observations;
--   * brand, specification and measurement unit are never pooled;
--   * observations in another currency than the market's are ignored;
--   * a group reaches the price book only through the market's own
--     price_auto_apply_rules gate, and never over an admin-manual price;
--   * no observations means no row and no price, never a guess.
-- =========================================================

-- ── 1. The 32 markets the application serves ──────────────────────────────
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
  -- Zero until a market's real freight is measured: an unmeasured cost must
  -- not silently inflate an estimate.
  transport_percent numeric not null default 0 check (transport_percent >= 0),
  delivery_percent numeric not null default 0 check (delivery_percent >= 0),
  last_run_at timestamptz,
  last_success_at timestamptz,
  next_run_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.market_scan_settings is
  'One row per Frelux market (the 32 the app serves): cadence, freshness window, alert threshold, cost assumptions.';

insert into public.market_scan_settings (market)
select mp.country_code
from public.market_profiles mp
where mp.country_code in (
  'NG','US','GB','CA','AU','DE','IN','GH','KE','ZA','JP','FR','BR','SA',
  'AE','CN','ID','MX','KR','IT','ET','EG','TZ','CI','ES','NL','PL','SE',
  'CH','SG','TR','NZ'
)
on conflict (market) do nothing;

-- ── 2. Source registry: feed format, supplier identity, cadence ────────────
alter table public.price_scan_sources
  add column if not exists source_format text not null default 'product',
  add column if not exists brand text not null default '',
  add column if not exists specification text not null default '',
  add column if not exists measurement_unit text not null default '',
  add column if not exists supplier_name text,
  add column if not exists supplier_location text,
  add column if not exists supplier_contact text,
  add column if not exists cadence_hours integer not null default 24,
  add column if not exists next_scan_at timestamptz not null default now(),
  add column if not exists last_success_at timestamptz,
  add column if not exists consecutive_failures integer not null default 0,
  add column if not exists http_etag text,
  add column if not exists http_last_modified text,
  add column if not exists robots_allowed boolean,
  add column if not exists robots_checked_at timestamptz,
  add column if not exists feed_mapping jsonb,
  add column if not exists notes text;

comment on column public.price_scan_sources.source_format is
  'product | search (HTML page), json | api (structured feed), csv (price list), rss (feed), quote (admin-submitted quotation, no fetch).';
comment on column public.price_scan_sources.feed_mapping is
  'Structured extraction mapping: items path plus key/column names for price, name, currency, unit, brand, spec, supplier, location.';
comment on column public.price_scan_sources.cadence_hours is
  'How often this individual source is re-scanned.';

update public.price_scan_sources
   set source_format = case
         when source_type = 'search' then 'search'
         when source_format is null or source_format = '' then 'product'
         else source_format
       end;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'price_scan_sources_format_check'
  ) then
    alter table public.price_scan_sources
      add constraint price_scan_sources_format_check
      check (source_format in ('product','search','json','api','csv','rss','quote'));
  end if;
end $$;

create index if not exists price_scan_sources_due_idx
  on public.price_scan_sources (market, next_scan_at)
  where is_active;

-- ── 3. Supplier-level observations ────────────────────────────────────────
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

comment on table public.market_price_observations is
  'One supplier price observation. Inputs only: the market median is derived from these, never stored as an observation.';

-- One fact per source, material, variant and day: re-running a scan cannot
-- pile up duplicate observations.
-- A supplier without a registry row (an admin quotation) is still a distinct
-- observation, so the key carries the supplier name as well as the source.
drop index if exists public.market_price_observations_daily_uidx;
create unique index if not exists market_price_observations_daily_uidx
  on public.market_price_observations (
    coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(supplier_name, ''),
    market, material_slug, brand, specification, unit, observed_on
  );

create index if not exists market_price_observations_group_idx
  on public.market_price_observations (market, material_slug, observed_at desc);

-- ── 4. Market-level material record ───────────────────────────────────────
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
  -- The six numbers the spec insists stay separate.
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

create index if not exists market_material_prices_market_idx
  on public.market_material_prices (market, verification_status);

-- ── 5. Per-market run ledger + alerts ─────────────────────────────────────
create table if not exists public.market_scan_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid,
  market text not null,
  trigger text not null default 'cron',
  status text not null default 'running',
  sources_total integer not null default 0,
  sources_scanned integer not null default 0,
  observations integer not null default 0,
  updated_prices integer not null default 0,
  failed_sources integer not null default 0,
  skipped_not_due integer not null default 0,
  duration_ms integer,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists market_scan_runs_market_idx
  on public.market_scan_runs (market, started_at desc);

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

create index if not exists market_price_alerts_open_idx
  on public.market_price_alerts (market, created_at desc)
  where acknowledged_at is null;

-- ── 6. Recompute one market/material group from its observations ──────────
-- The only place a market number is derived. It is never handed a price; it
-- reads observations, so it cannot invent one. Runs as definer so the scanner
-- (service role) and the quotation path both land here.
create or replace function public.refresh_market_material_price(
  p_market text,
  p_material_slug text,
  p_brand text default '',
  p_specification text default '',
  p_unit text default ''
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_conf text;
  v_max_dev numeric;
  v_min_obs integer;
  v_settings record;
  v_material record;
  v_stats record;
  v_agree record;
  v_prev_price numeric;
  v_status text;
  v_confidence numeric;
  v_transport numeric;
  v_delivery numeric;
  v_local numeric;
  v_book numeric;
  v_all_test boolean;
begin
  select m.id, m.name, m.category
    into v_material
  from public.estimation_materials m
  where m.slug = p_material_slug
  limit 1;

  if v_material.id is null then
    return 0;
  end if;

  select * into v_settings
  from public.market_scan_settings
  where market = p_market;

  if v_settings.market is null then
    return 0;
  end if;

  select coalesce(r.min_confidence, 'high'),
         coalesce(r.max_deviation_percent, 30),
         coalesce(r.min_agreeing_observations, 2)
    into v_conf, v_max_dev, v_min_obs
  from public.price_auto_apply_rules r
  where r.market = p_market and r.is_active
  limit 1;

  v_conf := coalesce(v_conf, 'high');
  v_max_dev := coalesce(v_max_dev, 30);
  v_min_obs := coalesce(v_min_obs, 2);

  select count(*) obs,
         count(distinct o.supplier_name) suppliers,
         (percentile_cont(0.5) within group (order by o.price))::numeric median_price,
         avg(o.price) avg_price,
         min(o.price) min_price,
         max(o.price) max_price,
         max(o.observed_at) last_seen,
         (array_agg(o.supplier_name order by o.price asc))[1] cheapest_supplier,
         (array_agg(o.supplier_location order by o.price asc))[1] cheapest_location,
         (array_agg(o.source_url order by o.observed_at desc))[1] last_url,
         count(*) filter (
           where (case o.confidence when 'high' then 2 when 'medium' then 1 else 0 end)
                 >= (case v_conf when 'high' then 2 when 'medium' then 1 else 0 end)
         ) qualified_obs,
         count(distinct o.supplier_name) filter (
           where (case o.confidence when 'high' then 2 when 'medium' then 1 else 0 end)
                 >= (case v_conf when 'high' then 2 when 'medium' then 1 else 0 end)
         ) qualified_suppliers,
         bool_and(o.is_test) all_test
    into v_stats
  from public.market_price_observations o
  join public.market_profiles mp on mp.country_code = o.market
  where o.market = p_market
    and o.material_slug = p_material_slug
    and o.brand = p_brand
    and o.specification = p_specification
    and o.unit = p_unit
    and o.currency = mp.currency_code
    and o.observed_at > now() - interval '90 days';

  if coalesce(v_stats.obs, 0) = 0 then
    -- Nothing known: keep history, but stop claiming it is live.
    update public.market_material_prices
       set verification_status = 'no_data',
           updated_at = now()
     where market = p_market
       and material_slug = p_material_slug
       and brand = p_brand
       and specification = p_specification
       and unit = p_unit
       and verification_status <> 'no_data';
    return 0;
  end if;

  -- Agreement is measured on observations that clear the confidence floor: a
  -- spread wider than the market tolerance means the market is not settled.
  select count(*) qualified,
         bool_and(
           abs(o.price - v_stats.median_price)
             <= v_stats.median_price * v_max_dev / 100.0
         ) within_band
    into v_agree
  from public.market_price_observations o
  join public.market_profiles mp on mp.country_code = o.market
  where o.market = p_market
    and o.material_slug = p_material_slug
    and o.brand = p_brand
    and o.specification = p_specification
    and o.unit = p_unit
    and o.currency = mp.currency_code
    and o.observed_at > now() - interval '90 days'
    and (case o.confidence when 'high' then 2 when 'medium' then 1 else 0 end)
        >= (case v_conf when 'high' then 2 when 'medium' then 1 else 0 end);

  v_status := case
    when coalesce(v_agree.qualified, 0) >= v_min_obs
     and coalesce(v_stats.qualified_suppliers, 0) >= v_min_obs
     and coalesce(v_agree.within_band, false)
    then 'verified'
    else 'unverified'
  end;

  -- Confidence: extraction quality, supplier breadth, agreement. Capped at
  -- 0.95 because a market median is not a certainty.
  v_confidence := round(
    least(
      0.95,
      0.35
      + 0.25 * least(1.0, coalesce(v_stats.qualified_suppliers, 0)::numeric / 3)
      + 0.20 * least(1.0, coalesce(v_stats.qualified_obs, 0)::numeric / 4)
      + case when coalesce(v_agree.within_band, false) then 0.15 else 0 end
    ), 2);

  v_transport := round(coalesce(v_stats.median_price, 0) * v_settings.transport_percent / 100.0, 2);
  v_delivery := round(coalesce(v_stats.median_price, 0) * v_settings.delivery_percent / 100.0, 2);
  v_local := round(coalesce(v_stats.median_price, 0) + v_transport + v_delivery, 2);

  select p.price into v_book
  from public.estimation_prices p
  where p.price_type = 'material'
    and p.ref_id = v_material.id
    and p.market = p_market
    and p.is_active
  order by p.effective_date desc nulls last
  limit 1;

  select current_price into v_prev_price
  from public.market_material_prices
  where market = p_market
    and material_slug = p_material_slug
    and brand = p_brand
    and specification = p_specification
    and unit = p_unit
  limit 1;

  insert into public.market_material_prices (
    market, market_name, material_id, material_slug, product_name, category,
    brand, specification, unit, currency,
    supplier_price, median_price, local_estimate, transport_cost, delivery_cost,
    frelux_price, current_price, min_observed, max_observed, avg_price,
    supplier_name, supplier_location, source_url,
    last_scanned_at, last_verified_at, previous_price, price_change_percent,
    confidence_score, verification_status, observations_count, suppliers_count,
    is_test
  )
  values (
    p_market,
    (select country_name from public.market_profiles where country_code = p_market),
    v_material.id, p_material_slug, v_material.name, v_material.category,
    p_brand, p_specification, p_unit,
    (select currency_code from public.market_profiles where country_code = p_market),
    v_stats.min_price, v_stats.median_price, v_local, v_transport, v_delivery,
    v_book, v_stats.median_price, v_stats.min_price, v_stats.max_price,
    round(v_stats.avg_price, 2),
    v_stats.cheapest_supplier, v_stats.cheapest_location, v_stats.last_url,
    v_stats.last_seen,
    case when v_status = 'verified' then now() else null end,
    coalesce(v_prev_price, v_stats.median_price),
    0,
    v_confidence, v_status, v_stats.obs, v_stats.suppliers,
    coalesce(v_stats.all_test, false)
  )
  on conflict (market, material_slug, brand, specification, unit)
  do update set
    market_name = excluded.market_name,
    material_id = excluded.material_id,
    product_name = excluded.product_name,
    category = excluded.category,
    currency = excluded.currency,
    supplier_price = excluded.supplier_price,
    median_price = excluded.median_price,
    local_estimate = excluded.local_estimate,
    transport_cost = excluded.transport_cost,
    delivery_cost = excluded.delivery_cost,
    frelux_price = coalesce(excluded.frelux_price, market_material_prices.frelux_price),
    current_price = excluded.current_price,
    min_observed = excluded.min_observed,
    max_observed = excluded.max_observed,
    avg_price = excluded.avg_price,
    supplier_name = excluded.supplier_name,
    supplier_location = excluded.supplier_location,
    source_url = excluded.source_url,
    last_scanned_at = excluded.last_scanned_at,
    last_verified_at = coalesce(excluded.last_verified_at, market_material_prices.last_verified_at),
    -- A statement with several observations fires this refresh once per row,
    -- so an unchanged median must keep the recorded move instead of resetting
    -- it to zero.
    previous_price = case
      when market_material_prices.current_price is distinct from excluded.current_price
        then market_material_prices.current_price
      else market_material_prices.previous_price
    end,
    price_change_percent = case
      when market_material_prices.current_price is distinct from excluded.current_price
       and coalesce(market_material_prices.current_price, 0) > 0
      then round(
        (excluded.current_price - market_material_prices.current_price)
        / market_material_prices.current_price * 100, 2)
      else market_material_prices.price_change_percent
    end,
    confidence_score = excluded.confidence_score,
    verification_status = excluded.verification_status,
    observations_count = excluded.observations_count,
    suppliers_count = excluded.suppliers_count,
    is_test = excluded.is_test,
    updated_at = now();

  return 1;
end;
$$;

-- ── 7. Promote verified market groups into the price book ─────────────────
-- The gate is the market's own price_auto_apply_rules row. An admin-manual
-- price is never overwritten; the group stays for review.
create or replace function public.apply_market_material_prices(
  p_market text default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  grp record;
  rule record;
  current_row record;
  applied integer := 0;
  v_currency text;
  v_market_name text;
  alert_pct numeric;
  change_pct numeric;
begin
  for grp in
    select a.*
    from public.market_material_prices a
    join public.market_scan_settings s on s.market = a.market
    where a.verification_status = 'verified'
      and not a.is_test
      and a.median_price is not null
      and (p_market is null or a.market = p_market)
  loop
    select * into rule
    from public.price_auto_apply_rules r
    where r.market = grp.market and r.is_active
    limit 1;

    if rule.id is null then
      continue;
    end if;

    -- verification_status 'verified' already means this market's
    -- price_auto_apply_rules gate passed; re-gating on the derived score would
    -- make a two-supplier market impossible to ever promote.

    select p.id, p.price, p.origin
      into current_row
    from public.estimation_prices p
    where p.price_type = 'material'
      and p.ref_id = grp.material_id
      and p.market = grp.market
      and p.is_active
    order by p.effective_date desc nulls last
    limit 1;

    if current_row.id is not null and current_row.origin = 'manual' then
      continue;
    end if;

    if current_row.id is not null and coalesce(current_row.price, 0) > 0 then
      change_pct := (grp.median_price - current_row.price) / current_row.price * 100;
      if abs(change_pct) > coalesce(rule.max_deviation_percent, 30) then
        continue;
      end if;
    end if;

    select mp.currency_code, mp.country_name
      into v_currency, v_market_name
    from public.market_profiles mp
    where mp.country_code = grp.market;

    if current_row.id is not null then
      update public.estimation_prices
         set is_active = false, updated_at = now()
       where id = current_row.id;
    end if;

    insert into public.estimation_prices (
      price_type, ref_id, price, currency, market, effective_date,
      notes, is_active, price_source, last_scanned_at, scan_confidence, origin
    )
    values (
      'material', grp.material_id, grp.median_price, v_currency, grp.market,
      current_date,
      format(
        'Market scan: median of %s observations from %s supplier(s) in %s; range %s-%s; confidence %s.',
        grp.observations_count, grp.suppliers_count, v_market_name,
        round(grp.min_observed, 2), round(grp.max_observed, 2), grp.confidence_score
      ),
      true,
      format('market scan: %s supplier(s)', grp.suppliers_count),
      grp.last_scanned_at,
      case when grp.confidence_score >= 0.85 then 'high'
           when grp.confidence_score >= 0.7 then 'medium'
           else 'low' end,
      'scan'
    );

    insert into public.estimation_price_history (
      price_type, ref_id, old_price, new_price, currency, changed_by, change_reason
    )
    values (
      'material', grp.material_id, current_row.price, grp.median_price, v_currency,
      null,
      format(
        'market_scan %s: %s observations / %s suppliers, confidence %s',
        grp.market, grp.observations_count, grp.suppliers_count, grp.confidence_score
      )
    );

    update public.market_material_prices
       set frelux_price = grp.median_price,
           verification_status = 'verified',
           last_verified_at = now(),
           updated_at = now()
     where id = grp.id;

    select alert_threshold_percent into alert_pct
    from public.market_scan_settings
    where market = grp.market;

    if current_row.id is not null
       and coalesce(current_row.price, 0) > 0
       and abs(change_pct) >= coalesce(alert_pct, 5) then
      insert into public.market_price_alerts (
        market, material_slug, kind, severity, message, value, previous_value
      )
      values (
        grp.market, grp.material_slug,
        case when change_pct > 0 then 'increase' else 'decrease' end,
        case when abs(change_pct) >= 15 then 'critical' else 'warning' end,
        format(
          '%s %s from %s to %s (%s%%)',
          grp.product_name,
          case when change_pct > 0 then 'rose' else 'fell' end,
          round(current_row.price, 2), round(grp.median_price, 2),
          round(change_pct, 1)
        ),
        grp.median_price, current_row.price
      );
    end if;

    applied := applied + 1;
  end loop;

  return applied;
end;
$$;

-- ── 8. Freshness: mark books that outlived their market window ────────────
create or replace function public.mark_stale_market_prices()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  marked integer := 0;
begin
  with fresh as (
    update public.market_material_prices a
       set verification_status = 'stale', updated_at = now()
      from public.market_scan_settings s
     where a.market = s.market
       and a.verification_status in ('verified','unverified')
       and a.last_scanned_at is not null
       and a.last_scanned_at < now() - make_interval(days => s.staleness_days)
    returning a.market, a.material_slug, a.product_name, a.last_scanned_at
  )
  insert into public.market_price_alerts (market, material_slug, kind, severity, message, value)
  select f.market, f.material_slug, 'stale', 'warning',
         format('%s has not been re-observed since %s', f.product_name, f.last_scanned_at::date),
         null
  from fresh f
  where not exists (
    select 1 from public.market_price_alerts x
    where x.market = f.market
      and x.material_slug = f.material_slug
      and x.kind = 'stale'
      and x.acknowledged_at is null
      and x.created_at > now() - interval '7 days'
  );

  select count(*) into marked
  from public.market_material_prices
  where verification_status = 'stale';

  return marked;
end;
$$;

-- ── 9. Observation insert → refresh its group ─────────────────────────────
create or replace function public.market_observation_after_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.refresh_market_material_price(
    new.market, new.material_slug, new.brand, new.specification, new.unit
  );
  return new;
end;
$$;

drop trigger if exists market_observation_refresh on public.market_price_observations;
create trigger market_observation_refresh
  after insert on public.market_price_observations
  for each row
  execute function public.market_observation_after_insert();

-- Removing or correcting an observation must also correct the median: a
-- deleted outlier that leaves the record untouched would keep a price the
-- market no longer supports.
create or replace function public.market_observation_after_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_market_material_price(
      old.market, old.material_slug, old.brand, old.specification, old.unit
    );
    return old;
  end if;
  perform public.refresh_market_material_price(
    new.market, new.material_slug, new.brand, new.specification, new.unit
  );
  if tg_op = 'UPDATE' then
    perform public.refresh_market_material_price(
      old.market, old.material_slug, old.brand, old.specification, old.unit
    );
  end if;
  return new;
end;
$$;

drop trigger if exists market_observation_change on public.market_price_observations;
create trigger market_observation_change
  after delete or update of price, confidence, currency, observed_on
  on public.market_price_observations
  for each row
  execute function public.market_observation_after_change();

-- ── 10. Admin dashboard: one call returns all 32 markets ──────────────────
create or replace function public.market_scan_overview()
returns table (
  market text,
  market_name text,
  currency_code text,
  is_enabled boolean,
  cadence_hours integer,
  last_run_at timestamptz,
  last_success_at timestamptz,
  next_run_at timestamptz,
  active_sources integer,
  failing_sources integer,
  materials_priced integer,
  verified_prices integer,
  unverified_prices integer,
  stale_prices integer,
  prices_awaiting_verification integer,
  increases integer,
  decreases integer,
  last_scan_at timestamptz,
  open_alerts integer
)
language sql
security definer
set search_path to 'public'
stable
as $$
  select s.market,
         mp.country_name,
         mp.currency_code,
         s.is_enabled,
         s.cadence_hours,
         s.last_run_at,
         s.last_success_at,
         s.next_run_at,
         coalesce(src.active_sources, 0),
         coalesce(src.failing_sources, 0),
         coalesce(mm.materials_priced, 0),
         coalesce(mm.verified_prices, 0),
         coalesce(mm.unverified_prices, 0),
         coalesce(mm.stale_prices, 0),
         coalesce(mm.unverified_prices, 0),
         coalesce(mm.increases, 0),
         coalesce(mm.decreases, 0),
         mm.last_scan_at,
         coalesce(al.open_alerts, 0)
  from public.market_scan_settings s
  join public.market_profiles mp on mp.country_code = s.market
  left join (
    select market,
           count(*) filter (where is_active) active_sources,
           count(*) filter (where is_active and consecutive_failures >= 3) failing_sources
    from public.price_scan_sources
    group by market
  ) src on src.market = s.market
  left join (
    select market,
           count(*) materials_priced,
           count(*) filter (where verification_status = 'verified') verified_prices,
           count(*) filter (where verification_status = 'unverified') unverified_prices,
           count(*) filter (where verification_status = 'stale') stale_prices,
           count(*) filter (where price_change_percent > 0) increases,
           count(*) filter (where price_change_percent < 0) decreases,
           max(last_scanned_at) last_scan_at
    from public.market_material_prices
    group by market
  ) mm on mm.market = s.market
  left join (
    select market, count(*) open_alerts
    from public.market_price_alerts
    where acknowledged_at is null
    group by market
  ) al on al.market = s.market
  order by mp.country_name;
$$;

-- ── 11. Scheduler: dispatch the markets that are due ──────────────────────
-- One HTTP call per market, so a slow or failing market never delays another.
-- next_run_at is moved before the call, so a crashed invocation cannot spin.
create or replace function public.dispatch_market_scans(p_max_markets integer default 6)
returns table (market text, dispatched boolean)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m record;
  token text;
begin
  select token into token from public.price_intel_tokens limit 1;

  for m in
    select s.market, s.cadence_hours, mp.currency_code
    from public.market_scan_settings s
    join public.market_profiles mp on mp.country_code = s.market
    where s.is_enabled
      and s.next_run_at <= now()
    order by s.next_run_at asc
    limit p_max_markets
  loop
    perform net.http_post(
      url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/price-intel-scan',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-intel-token', coalesce(token, '')
      ),
      body := jsonb_build_object('trigger', 'cron', 'market', m.market, 'mode', 'market')
    );

    update public.market_scan_settings
       set next_run_at = now() + make_interval(hours => m.cadence_hours),
           last_run_at = now(),
           updated_at = now()
     where market = m.market;

    market := m.market;
    dispatched := true;
    return next;
  end loop;
end;
$$;

-- Today the batch scanner is weekly (job 14). The 32-market scheduler runs
-- every 20 minutes and only dispatches markets whose cadence has elapsed.
select cron.unschedule('market-scan-dispatch')
where exists (select 1 from cron.job where jobname = 'market-scan-dispatch');

select cron.schedule(
  'market-scan-dispatch',
  '*/20 * * * *',
  $$select public.dispatch_market_scans(6);$$
);

-- ── 12. Access control ────────────────────────────────────────────────────
alter table public.market_scan_settings enable row level security;
alter table public.market_material_prices enable row level security;
alter table public.market_price_observations enable row level security;
alter table public.market_scan_runs enable row level security;
alter table public.market_price_alerts enable row level security;

do $$
begin
  -- Market prices power the estimator's "last known price" display, so any
  -- visitor may read them. Observations, settings, runs and alerts are
  -- operator data.
  if not exists (select 1 from pg_policies where tablename='market_material_prices' and policyname='market_material_prices_read') then
    create policy market_material_prices_read on public.market_material_prices
      for select to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename='market_scan_settings' and policyname='market_scan_settings_admin') then
    create policy market_scan_settings_admin on public.market_scan_settings
      for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));
  end if;

  if not exists (select 1 from pg_policies where tablename='market_price_observations' and policyname='market_price_observations_admin') then
    create policy market_price_observations_admin on public.market_price_observations
      for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));
  end if;

  if not exists (select 1 from pg_policies where tablename='market_scan_runs' and policyname='market_scan_runs_admin') then
    create policy market_scan_runs_admin on public.market_scan_runs
      for select to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));
  end if;

  if not exists (select 1 from pg_policies where tablename='market_price_alerts' and policyname='market_price_alerts_admin') then
    create policy market_price_alerts_admin on public.market_price_alerts
      for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));
  end if;
end $$;

grant select on public.market_material_prices to anon, authenticated;
grant select, insert, update on public.market_scan_settings to authenticated;
grant select, insert, update on public.market_price_observations to authenticated;
grant select on public.market_scan_runs to authenticated;
grant select, insert, update on public.market_price_alerts to authenticated;
grant execute on function public.market_scan_overview() to authenticated, service_role;
grant execute on function public.refresh_market_material_price(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.apply_market_material_prices(text) to authenticated, service_role;
grant execute on function public.mark_stale_market_prices() to service_role, authenticated;
grant execute on function public.dispatch_market_scans(integer) to service_role;
