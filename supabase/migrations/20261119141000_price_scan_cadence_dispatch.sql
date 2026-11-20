-- Honour each market's scan cadence.
--
-- market_scan_settings.cadence_hours has existed since the 32-market scanner
-- shipped (default 24), and price-intel-scan already writes last_run_at and
-- next_run_at from it. Nothing ever read next_run_at: the only schedule was
-- 'price-intel-weekly', so a market configured for a daily check was scanned
-- once a week, and a price lock recorded against that market went unverified
-- for six days at a time.
--
-- This adds an hourly dispatcher that asks which markets are due and calls the
-- scanner for exactly those. Hours with nothing due cost one SQL statement and
-- no HTTP call. The weekly job stays as the safety net that scans everything.
--
-- Rollback: rollback/20261119140000_price_scan_cadence_dispatch_rollback.sql

-- Markets whose cadence has come round, never more than the settings allow.
create or replace function public.price_intel_due_markets()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(s.market order by s.next_run_at), array[]::text[])
  from public.market_scan_settings s
  where s.is_enabled
    and (s.next_run_at is null or s.next_run_at <= now());
$$;

comment on function public.price_intel_due_markets() is
  'Enabled markets whose cadence_hours have elapsed since the last scan. Empty when nothing is due.';

/**
 * Posts the due markets to the scanner.
 *
 * Returns what it did, so a manual call from the SQL editor is debuggable and
 * an empty hour is provably empty rather than a silent failure.
 */
create or replace function public.dispatch_due_price_scans()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_due text[];
  v_token text;
begin
  v_due := public.price_intel_due_markets();

  if coalesce(array_length(v_due, 1), 0) = 0 then
    return jsonb_build_object('dispatched', 0, 'markets', '[]'::jsonb);
  end if;

  select token into v_token from public.price_intel_tokens limit 1;
  if v_token is null then
    -- Without the token the call would be refused; say so instead of posting.
    return jsonb_build_object(
      'dispatched', 0,
      'markets', to_jsonb(v_due),
      'skipped_reason', 'no price_intel_tokens row'
    );
  end if;

  perform net.http_post(
    url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/price-intel-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-intel-token', v_token
    ),
    body := jsonb_build_object(
      'trigger', 'cron-due',
      'markets', to_jsonb(v_due)
    )
  );

  return jsonb_build_object('dispatched', array_length(v_due, 1), 'markets', to_jsonb(v_due));
end;
$$;

comment on function public.dispatch_due_price_scans() is
  'Calls price-intel-scan for markets whose cadence_hours have elapsed. Idempotent when nothing is due.';

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('price-intel-due-hourly')
  where exists (select 1 from cron.job where jobname = 'price-intel-due-hourly');

-- Seven minutes past the hour: clear of the weekly job at 06:40 and of the
-- digest at 07:15, so a market scan and the alert email never race.
select cron.schedule(
  'price-intel-due-hourly',
  '7 * * * *',
  $$ select public.dispatch_due_price_scans(); $$
);
