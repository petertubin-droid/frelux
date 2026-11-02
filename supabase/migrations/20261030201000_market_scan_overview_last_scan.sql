-- The overview reported "last scan" only once a material price had been
-- promoted, so a market whose sources had just been walked still showed
-- "never". Source scan time and the market's own run time now feed the field.

CREATE OR REPLACE FUNCTION public.market_scan_overview()
 RETURNS TABLE(market text, market_name text, currency_code text, is_enabled boolean, cadence_hours integer, last_run_at timestamp with time zone, last_success_at timestamp with time zone, next_run_at timestamp with time zone, active_sources integer, failing_sources integer, materials_priced integer, verified_prices integer, unverified_prices integer, stale_prices integer, prices_awaiting_verification integer, increases integer, decreases integer, last_scan_at timestamp with time zone, open_alerts integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         coalesce(greatest(mm.last_scan_at, src.last_scan_at), s.last_run_at),
         coalesce(al.open_alerts, 0)
  from public.market_scan_settings s
  join public.market_profiles mp on mp.country_code = s.market
  left join (
    select market,
           count(*) filter (where is_active) active_sources,
           count(*) filter (where is_active and consecutive_failures >= 3) failing_sources,
           max(last_scanned_at) last_scan_at
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
$function$

