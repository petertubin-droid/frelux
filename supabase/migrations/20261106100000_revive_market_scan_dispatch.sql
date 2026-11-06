-- Revive the market price scanner.
--
-- Measured in production on 6 November 2026: cron job market-scan-dispatch ran
-- 72 times in 24 hours and failed 72 times with
--
--   ERROR: column reference "token" is ambiguous
--   QUERY: select token into token from public.price_intel_tokens limit 1
--
-- The PL/pgSQL variable named `token` shadowed the table column of the same
-- name, so the function raised before dispatching anything. All 43 rows in
-- market_scan_settings were left overdue (oldest next_run_at 2026-10-30) and
-- market_price_observations stopped growing: 54 rows across three markets.
--
-- Also fixed here: the weekly price digest cron passed a single literal
-- argument to jsonb_build_object, so it failed every Monday with "argument list
-- must have even number of elements".

-- ── 1. Dispatch, with the shadowing variable renamed and the column qualified
create or replace function public.dispatch_market_scans(p_max_markets integer default 6)
returns table(market text, dispatched boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_token text;
  m record;
begin
  -- Deterministic pick: newest active, non-expired token. The old code took an
  -- arbitrary row from a one-row table and dispatched with an empty header when
  -- the table was empty, which reads as an auth failure at the function instead
  -- of a configuration error here.
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

  for m in
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
      body := jsonb_build_object('trigger', 'cron', 'market', m.market, 'mode', 'market')
    );

    update public.market_scan_settings
       set next_run_at = now() + make_interval(hours => greatest(1, coalesce(m.cadence_hours, 24))),
           last_run_at = now(),
           updated_at = now()
     where market = m.market;

    market := m.market;
    dispatched := true;
    return next;
  end loop;
end;
$function$;

-- ── 2. Token table hygiene: active flag and optional expiry
alter table public.price_intel_tokens
  add column if not exists is_active boolean not null default true;
alter table public.price_intel_tokens
  add column if not exists expires_at timestamptz;

-- Two tokens rows are enough for the scanner; duplicate rows would only make
-- the pick non-deterministic again.
create index if not exists price_intel_tokens_active_idx
  on public.price_intel_tokens (is_active, created_at desc);

-- ── 3. Coverage truth for operators
-- 1464 active sources exist across 43 markets but 1324 of them point at a
-- retailer search page, which cannot yield a product price. This reports what
-- the scanner can actually reach per market so coverage is not inferred from a
-- source count.
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
security definer
set search_path to 'public'
stable
as $function$
  select s.market,
         count(*)::int,
         count(*) filter (
           where coalesce(s.access_status, '') not in ('search_page_only', 'bot_blocked')
         )::int,
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

-- ── 4. Weekly digest cron: valid JSONB body
select cron.unschedule(jobid) from cron.job where jobname = 'price-digest-weekly';

select cron.schedule(
  'price-digest-weekly',
  '15 7 * * 1',
  $job$
  select net.http_post(
    url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/price-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-token', (select token from public.price_digest_tokens limit 1)
    ),
    body := '{}'::jsonb
  );
  $job$
);

-- ── 5. Self-check: the shadowing defect must not come back
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
  if v_src ~* 'into\s+token\b' or v_src ~* 'declare[^$]*\btoken\s+text\s*;' then
    raise exception 'dispatch_market_scans still declares a token variable that shadows the column';
  end if;
  if v_src not like '%v_token%' then
    raise exception 'dispatch_market_scans does not use the renamed token variable';
  end if;
end $$;
