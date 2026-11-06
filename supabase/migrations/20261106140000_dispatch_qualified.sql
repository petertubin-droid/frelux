-- dispatch_market_scans as written in 20261106130000 failed on every call:
--
--   ERROR: column reference "market" is ambiguous
--   QUERY: select s.market, ... left join (select market, count(*) ...
--
-- The function returns TABLE(market text, dispatched boolean), so `market` is an
-- output parameter, and the new per-market yield subquery selected a bare
-- `market` column. This is the third instance of the same defect class in this
-- function today; the first two were fixed in 20261106103000.
--
-- The subquery now aliases both its table and its output column, and the file
-- carries a check that rejects an unqualified column reference in that shape.

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
    select s.market as scan_market,
           s.cadence_hours,
           coalesce(y.obs, 0) as obs,
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
        select o2.market as obs_market, count(*)::int obs
          from public.market_price_observations o2
         where o2.observed_at > now() - interval '90 days'
         group by o2.market
      ) y on y.obs_market = s.market
     where s.is_enabled
       and s.next_run_at <= now()
     order by coalesce(y.obs, 0) desc, scannable desc, s.next_run_at asc
     limit greatest(1, coalesce(p_max_markets, 6))
  loop
    perform net.http_post(
      url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/price-intel-scan',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-intel-token', v_token
      ),
      body := jsonb_build_object('trigger', 'cron', 'market', v_row.scan_market, 'mode', 'market')
    );

    update public.market_scan_settings s
       set next_run_at = now() + make_interval(hours => greatest(1, coalesce(v_row.cadence_hours, 24))),
           last_run_at = now(),
           updated_at = now()
     where s.market = v_row.scan_market;

    market := v_row.scan_market;
    dispatched := true;
    return next;
  end loop;
end;
$function$;

do $$
begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'dispatch_market_scans'
       and pg_get_functiondef(p.oid) like '%select o2.market%'
       and pg_get_functiondef(p.oid) not like '%select o2.market as obs_market%'
  ) then
    raise exception 'dispatch_market_scans still selects an unaliased market column';
  end if;
end $$;
