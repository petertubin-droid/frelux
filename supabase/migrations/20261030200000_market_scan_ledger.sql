-- =========================================================
-- Market scan ledger
--
-- The scanner used to write its per-market bookkeeping from the edge function
-- after the source loop. Any early exit there left the market's cadence and
-- last-run columns untouched while the run looked successful. Bookkeeping now
-- happens on the data itself: every time a source records a scan, the market's
-- cadence row advances. It cannot be skipped, and it works for cron, admin and
-- any future caller.
-- =========================================================

create or replace function public.market_scan_note_source()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  cadence interval;
begin
  select make_interval(hours => greatest(1, s.cadence_hours))
    into cadence
  from public.market_scan_settings s
  where s.market = new.market;

  cadence := coalesce(cadence, interval '24 hours');

  update public.market_scan_settings s
     set last_run_at = now(),
         last_success_at = case
           when new.last_scan_status in ('ok', 'scanned', 'pending_review', 'unchanged')
             then now()
           else s.last_success_at
         end,
         next_run_at = now() + cadence,
         updated_at = now()
   where s.market = new.market;

  return new;
end;
$$;

drop trigger if exists market_scan_note_source_trg on public.price_scan_sources;
create trigger market_scan_note_source_trg
  after update of last_scanned_at on public.price_scan_sources
  for each row
  when (new.last_scanned_at is distinct from old.last_scanned_at)
  execute function public.market_scan_note_source();

-- Per-market run history, derived from the candidates a run filed. This is
-- telemetry the dashboard reads, and it is written by the database so a run
-- that ends early still leaves a truthful record of what it touched.
create or replace function public.market_scan_note_candidate()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.market_scan_runs
    (run_id, market, trigger, status, sources_total, sources_scanned,
     observations, updated_prices, failed_sources, finished_at)
  values
    (new.run_id, new.market, 'cron',
     case when new.status = 'failed' then 'failed' else 'completed' end,
     1, 1,
     coalesce(new.observations, 0), 0,
     case when new.status = 'failed' then 1 else 0 end,
     now())
  on conflict (run_id, market) do update
    set sources_total = public.market_scan_runs.sources_total + 1,
        sources_scanned = public.market_scan_runs.sources_scanned + 1,
        observations = public.market_scan_runs.observations + excluded.observations,
        failed_sources = public.market_scan_runs.failed_sources + excluded.failed_sources,
        status = case
          when excluded.status = 'failed'
           and public.market_scan_runs.status in ('completed')
            then 'completed'
          else public.market_scan_runs.status
        end,
        finished_at = now();

  return new;
end;
$$;

create unique index if not exists market_scan_runs_run_market_uidx
  on public.market_scan_runs (run_id, market);

drop trigger if exists market_scan_note_candidate_trg on public.price_scan_candidates;
create trigger market_scan_note_candidate_trg
  after insert on public.price_scan_candidates
  for each row
  when (new.run_id is not null)
  execute function public.market_scan_note_candidate();

-- A promoted price is counted on the market's ledger row for that run.
create or replace function public.market_scan_note_price()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.origin = 'scan' and new.market is not null then
    update public.market_scan_runs r
       set updated_prices = r.updated_prices + 1
     where r.market = new.market
       and r.started_at > now() - interval '2 hours';
  end if;
  return new;
end;
$$;

drop trigger if exists market_scan_note_price_trg on public.estimation_prices;
create trigger market_scan_note_price_trg
  after insert on public.estimation_prices
  for each row
  execute function public.market_scan_note_price();
