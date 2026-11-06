-- The run audit row could not be closed.
--
-- price-intel-scan writes sources_total, sources_scanned, candidates_created,
-- candidates_failed, observations_filed, markets_scanned, prices_updated,
-- auto_applied, status and finished_at on price_scan_runs. Six of those columns
-- existed; observations_filed, markets_scanned and prices_updated did not, so
-- PostgREST rejected the whole UPDATE. Measured on 6 November 2026: the three
-- runs started that morning were still status 'running' with no finished_at,
-- while every run from 3 November or earlier was 'completed'. The scanner was
-- therefore not recording what it did, and close_stale_scan_runs had to clean up
-- after it.

alter table public.price_scan_runs
  add column if not exists observations_filed integer not null default 0,
  add column if not exists observations_failed integer not null default 0,
  add column if not exists markets_scanned integer not null default 0,
  add column if not exists prices_updated integer not null default 0;

comment on column public.price_scan_runs.observations_filed is
  'Observations newly written to market_price_observations by this run.';
comment on column public.price_scan_runs.observations_failed is
  'Observations the run tried to write and could not, with the reason in notes.';

do $$
declare
  v_missing text;
begin
  select string_agg(c, ', ') into v_missing
    from unnest(array['observations_filed','observations_failed','markets_scanned','prices_updated']) c
   where not exists (
     select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'price_scan_runs' and column_name = c
   );
  if v_missing is not null then
    raise exception 'price_scan_runs still missing counters: %', v_missing;
  end if;
end $$;
