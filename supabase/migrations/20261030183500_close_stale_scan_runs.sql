-- A run whose caller died must not read as live. The per-market ledger holds
-- the truth, so the stale header is closed and labelled.
create or replace function public.close_stale_scan_runs()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  update public.price_scan_runs
     set status = 'completed',
         finished_at = now(),
         notes = coalesce(notes || '; ', '') || 'closed by sweeper (caller did not finish)'
   where status = 'running' and started_at < now() - interval '10 minutes';
  get diagnostics n = row_count;
  return n;
end;
$$;

select cron.unschedule('close-stale-scan-runs') where exists (select 1 from cron.job where jobname='close-stale-scan-runs');
select cron.schedule('close-stale-scan-runs', '*/15 * * * *', $$select public.close_stale_scan_runs()$$);
