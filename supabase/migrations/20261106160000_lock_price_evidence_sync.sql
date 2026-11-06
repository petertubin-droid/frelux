-- Production still carried the default PUBLIC EXECUTE grant on the trigger
-- function created by 20261106120000:
--
--   sync_price_evidence_counts   acl = NULL (default PUBLIC execute)
--
-- It is SECURITY DEFINER and writes market_material_prices, so it must not be
-- callable through PostgREST by anon or authenticated. The gate script did not
-- cover it either, which is why CI went green while the grant stayed open.
--
-- 20261106150000 relocked dispatch_market_scans after the corrective
-- replacement and was never applied to production; this file is applied with it.

revoke all on function public.sync_price_evidence_counts() from public;
revoke all on function public.sync_price_evidence_counts() from anon, authenticated;
grant execute on function public.sync_price_evidence_counts() to service_role;

revoke all on function public.market_price_observation_guard() from public;
revoke all on function public.market_price_observation_guard() from anon, authenticated;
grant execute on function public.market_price_observation_guard() to service_role;

-- Read-only reporting functions stay available to signed-in operators, never to
-- anonymous callers.
revoke all on function public.price_scan_coverage() from public;
revoke all on function public.price_scan_coverage() from anon;
grant execute on function public.price_scan_coverage() to authenticated, service_role;

revoke all on function public.price_market_readiness() from public;
revoke all on function public.price_market_readiness() from anon;
grant execute on function public.price_market_readiness() to authenticated, service_role;

do $$
declare
  v_open text;
begin
  select string_agg(p.proname || '()', ', ' order by p.proname)
    into v_open
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in (
       'sync_price_evidence_counts',
       'market_price_observation_guard'
     )
     and (
       p.proacl is null
       or exists (
         select 1 from unnest(p.proacl) acl where acl::text like '=X%'
       )
     );

  if v_open is not null then
    raise exception 'privileged functions still executable by PUBLIC: %', v_open;
  end if;

  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral unnest(p.proacl) acl
     where n.nspname = 'public'
       and p.proname in ('price_scan_coverage', 'price_market_readiness')
       and acl::text like 'anon=X%'
  ) then
    raise exception 'reporting functions still executable by anon';
  end if;
end $$;
