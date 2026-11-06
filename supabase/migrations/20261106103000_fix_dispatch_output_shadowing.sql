-- Second layer of the same defect, found only by running the function.
--
-- 20261106100000 renamed the shadowing `token` variable, and the live call then
-- failed one statement later with
--
--   ERROR: column reference "market" is ambiguous
--   QUERY: update public.market_scan_settings ... where market = m.market
--
-- A function declared RETURNS TABLE(market text, ...) has an output parameter
-- named `market`, so an unqualified column reference in the UPDATE resolves
-- against that parameter. Every column reference in the body is qualified here,
-- and the cursor variable is renamed so the two cannot be confused again.

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

  for v_row in
    select s.market, s.cadence_hours
      from public.market_scan_settings s
      join public.market_profiles mp on mp.country_code = s.market
     where s.is_enabled
       and s.next_run_at <= now()
     order by s.next_run_at asc
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
  v_src text;
begin
  select pg_get_functiondef(p.oid) into v_src
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'dispatch_market_scans';

  if v_src is null then
    raise exception 'dispatch_market_scans missing after migration';
  end if;
  -- The UPDATE must name its table alias, otherwise the RETURNS TABLE output
  -- parameter `market` shadows the column again.
  if v_src !~* 'update public\.market_scan_settings s' then
    raise exception 'dispatch_market_scans UPDATE is not aliased';
  end if;
  if v_src !~* 'where s\.market = v_row\.market' then
    raise exception 'dispatch_market_scans UPDATE predicate is not qualified';
  end if;
end $$;
