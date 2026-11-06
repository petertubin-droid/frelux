-- The admin panel and the supplier index claimed observations that do not exist.
--
-- market_material_prices holds 1381 rows and every one of them carries
-- observations_count > 0, with a maximum of 7. market_price_observations covers 6
-- market-material pairs in total. The counts were copied from the estimation book
-- by 20261103190500_backfill_market_prices_from_book.sql, not derived from
-- observations, and describePriceProvenance turns them into the label
-- "%s observations recorded, none reviewed yet" in AdminMarketPrices and in
-- suppliers/index-bridge. Only 24 of the 1381 rows carry a source_url or a
-- supplier_name.
--
-- This migration derives the counts from the observation store, keeps them in
-- step from now on, and makes dispatch spend its budget where a scan can
-- actually produce data.

-- ── 1. Derive the counts from evidence, once
with agg as (
  select o.market,
         o.material_slug,
         count(*)::int obs,
         count(distinct o.supplier_name)::int sup,
         max(o.observed_at) last_at
    from public.market_price_observations o
   where o.observed_at > now() - interval '90 days'
   group by 1, 2
)
update public.market_material_prices p
   set observations_count = coalesce(agg.obs, 0),
       suppliers_count = coalesce(agg.sup, 0),
       last_scanned_at = coalesce(agg.last_at, p.last_scanned_at),
       updated_at = now()
  from agg
 where p.market = agg.market
   and p.material_slug = agg.material_slug;

update public.market_material_prices p
   set observations_count = 0,
       suppliers_count = 0,
       updated_at = now()
 where p.observations_count > 0
   and not exists (
     select 1
       from public.market_price_observations o
      where o.market = p.market
        and o.material_slug = p.material_slug
        and o.observed_at > now() - interval '90 days'
   );

-- ── 2. Keep them in step, for this writer and any future one
create or replace function public.sync_price_evidence_counts()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  with touched as (
    select distinct market, material_slug from changed
  ), agg as (
    select t.market,
           t.material_slug,
           count(o.id)::int obs,
           count(distinct o.supplier_name)::int sup,
           max(o.observed_at) last_at
      from touched t
      left join public.market_price_observations o
        on o.market = t.market
       and o.material_slug = t.material_slug
       and o.observed_at > now() - interval '90 days'
     group by 1, 2
  )
  update public.market_material_prices p
     set observations_count = agg.obs,
         suppliers_count = agg.sup,
         last_scanned_at = coalesce(agg.last_at, p.last_scanned_at),
         updated_at = now()
    from agg
   where p.market = agg.market
     and p.material_slug = agg.material_slug;

  return null;
end;
$function$;

-- Transition tables are not allowed across more than one event, so each event
-- gets its own trigger pointing at the same function.
drop trigger if exists market_price_observations_sync_ins on public.market_price_observations;
create trigger market_price_observations_sync_ins
  after insert on public.market_price_observations
  referencing new table as changed
  for each statement execute function public.sync_price_evidence_counts();

drop trigger if exists market_price_observations_sync_upd on public.market_price_observations;
create trigger market_price_observations_sync_upd
  after update on public.market_price_observations
  referencing new table as changed
  for each statement execute function public.sync_price_evidence_counts();

drop trigger if exists market_price_observations_sync_del on public.market_price_observations;
create trigger market_price_observations_sync_del
  after delete on public.market_price_observations
  referencing old table as changed
  for each statement execute function public.sync_price_evidence_counts();

-- ── 3. Per-market readiness for operators
-- 12 of the 28 markets Frelux must cover have no scannable source at all, so a
-- source count alone says nothing about whether a market can be priced.
create or replace function public.price_market_readiness()
returns table(
  market text,
  enabled boolean,
  active_sources integer,
  scannable_sources integer,
  observations_90d integer,
  book_rows integer,
  last_success timestamptz,
  verdict text
)
language sql
security definer
set search_path to 'public'
stable
as $function$
  select s.market,
         s.is_enabled,
         coalesce(c.active_sources, 0),
         coalesce(c.scannable_sources, 0),
         coalesce(o.obs, 0),
         coalesce(b.book, 0),
         c.last_success,
         case
           when coalesce(c.scannable_sources, 0) = 0 and coalesce(o.obs, 0) = 0
             then 'unconfigured'
           when coalesce(o.obs, 0) = 0
             then 'configured, no data yet'
           when c.last_success is null or c.last_success < now() - interval '14 days'
             then 'live, evidence ageing'
           else 'live'
         end
    from public.market_scan_settings s
    left join public.price_scan_coverage() c on c.market = s.market
    left join (
      select market, count(*)::int obs
        from public.market_price_observations
       where observed_at > now() - interval '90 days'
       group by 1
    ) o on o.market = s.market
    left join (
      select market, count(*)::int book
        from public.market_material_prices
       group by 1
    ) b on b.market = s.market
   order by s.market;
$function$;

revoke all on function public.price_market_readiness() from public;
grant execute on function public.price_market_readiness() to authenticated, service_role;

-- ── 4. Dispatch: skip markets that cannot produce data, prefer those that can
create or replace function public.dispatch_market_scans(p_max_markets integer default 6)
returns table(market text, dispatched boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_token text;
  v_row record;
begin
  select t.token
    into v_token
    from public.price_intel_tokens t
   where coalesce(t.is_active, true)
     and (t.expires_at is null or t.expires_at > now())
   order by t.created_at desc nulls last
   limit 1;

  if v_token is null or length(btrim(v_token)) = 0 then
    raise exception 'dispatch_market_scans: no active price_intel_tokens row; configure a scan token before enabling the scanner';
  end if;

  -- A market whose sources are all search pages or bot-blocked cannot yield a
  -- product price. Scanning it burns an invocation and reports failure, so it is
  -- parked for a week and left out of this tick.
  update public.market_scan_settings s
     set next_run_at = now() + interval '7 days',
         updated_at = now()
   where s.is_enabled
     and s.next_run_at <= now()
     and not exists (
       select 1
         from public.price_scan_sources p
        where p.market = s.market
          and p.is_active
          and coalesce(p.access_status, '') not in ('search_page_only', 'bot_blocked')
     );

  for v_row in
    select s.market,
           s.cadence_hours,
           (
             select count(*)
               from public.price_scan_sources p
              where p.market = s.market
                and p.is_active
                and coalesce(p.access_status, '') not in ('search_page_only', 'bot_blocked')
           ) as scannable
      from public.market_scan_settings s
      join public.market_profiles mp on mp.country_code = s.market
     where s.is_enabled
       and s.next_run_at <= now()
     order by scannable desc, s.next_run_at asc
     limit greatest(1, coalesce(p_max_markets, 6))
  loop
    perform net.http_post(
      url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/price-intel-scan',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-intel-token', v_token
      ),
      body := jsonb_build_object('trigger', 'cron', 'market', v_row.market, 'mode', 'market')
    );

    update public.market_scan_settings s
       set next_run_at = now() + make_interval(hours => greatest(1, coalesce(v_row.cadence_hours, 24))),
           last_run_at = now(),
           updated_at = now()
     where s.market = v_row.market;

    market := v_row.market;
    dispatched := true;
    return next;
  end loop;
end;
$function$;

do $$
declare
  v_claims integer;
  v_pairs integer;
begin
  select count(*) into v_claims
    from public.market_material_prices
   where observations_count > 0;

  select count(distinct (market, material_slug)) into v_pairs
    from public.market_price_observations;

  if v_claims > 0 and v_pairs = 0 then
    raise exception 'market_material_prices still claims % observation-backed prices with an empty observation store', v_claims;
  end if;

  if exists (
    select 1 from public.market_material_prices p
     where p.observations_count > 0
       and not exists (
         select 1 from public.market_price_observations o
          where o.market = p.market and o.material_slug = p.material_slug
            and o.observed_at > now() - interval '90 days'
       )
  ) then
    raise exception 'market_material_prices still reports observations for pairs that have none';
  end if;
end $$;
