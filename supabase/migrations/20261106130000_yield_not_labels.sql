-- Correction to 20261106120000: it parked markets on an access_status label, and
-- that label is not a capability.
--
-- The parking rule treated any market whose active sources were all
-- 'search_page_only' as unable to produce a price. Evidence against that: the
-- 05:40 runs scanned SA and PL, both of which have zero sources outside that
-- label, and filed 8 and 2 observations with source_format 'search' and
-- extraction 'json_ld'. The scanner extracts structured data from search pages,
-- so the label describes the page type, not the yield.
--
-- Parking SA for seven days would have stopped a market that was working. The
-- rule is removed, markets parked by it are released, and priority now comes
-- from demonstrated yield: observations in the last 90 days first, then sources
-- with a recorded success, then the most overdue.

-- ── 1. Scannable means not refused, not "already labelled"
create or replace function public.price_scan_coverage()
returns table(
  market text,
  active_sources integer,
  scannable_sources integer,
  blocked_sources integer,
  never_scanned integer,
  last_success timestamptz
)
language sql
stable security definer
set search_path to 'public'
as $function$
  select s.market,
         count(*)::int,
         count(*) filter (where coalesce(s.access_status, '') <> 'bot_blocked')::int,
         count(*) filter (where s.access_status = 'bot_blocked')::int,
         count(*) filter (where s.last_scanned_at is null)::int,
         max(s.last_success_at)
    from public.price_scan_sources s
   where s.is_active
   group by s.market
   order by s.market;
$function$;

revoke all on function public.price_scan_coverage() from public;
grant execute on function public.price_scan_coverage() to authenticated, service_role;

-- The return type gains yielding_sources, so the function must be dropped first.
drop function if exists public.price_market_readiness();

create or replace function public.price_market_readiness()
returns table(
  market text,
  enabled boolean,
  active_sources integer,
  scannable_sources integer,
  yielding_sources integer,
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
         coalesce(y.yields, 0),
         coalesce(o.obs, 0),
         coalesce(b.book, 0),
         c.last_success,
         case
           when coalesce(c.active_sources, 0) = 0 and coalesce(o.obs, 0) = 0
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
      select p.market, count(*)::int yields
        from public.price_scan_sources p
       where p.is_active and p.last_success_at is not null
       group by 1
    ) y on y.market = s.market
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

-- ── 2. Release markets parked by the label rule
update public.market_scan_settings s
   set next_run_at = now(),
       updated_at = now()
 where s.is_enabled
   and s.next_run_at between now() + interval '6 days' and now() + interval '8 days'
   and exists (
     select 1 from public.price_scan_sources p
      where p.market = s.market
        and p.is_active
        and coalesce(p.access_status, '') <> 'bot_blocked'
   );

-- ── 3. Dispatch by demonstrated yield, never by label
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

  -- Only a market with no active source at all is structurally unable to scan.
  -- An access_status label is not evidence of that.
  update public.market_scan_settings s
     set next_run_at = now() + interval '7 days',
         updated_at = now()
   where s.is_enabled
     and s.next_run_at <= now()
     and not exists (
       select 1 from public.price_scan_sources p
        where p.market = s.market and p.is_active
     );

  for v_row in
    select s.market,
           s.cadence_hours,
           coalesce(o.obs, 0) as obs,
           (
             select count(*)
               from public.price_scan_sources p
              where p.market = s.market
                and p.is_active
                and coalesce(p.access_status, '') <> 'bot_blocked'
           ) as scannable
      from public.market_scan_settings s
      join public.market_profiles mp on mp.country_code = s.market
      left join (
        select market, count(*)::int obs
          from public.market_price_observations
         where observed_at > now() - interval '90 days'
         group by 1
      ) o on o.market = s.market
     where s.is_enabled
       and s.next_run_at <= now()
     order by coalesce(o.obs, 0) desc, scannable desc, s.next_run_at asc
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
