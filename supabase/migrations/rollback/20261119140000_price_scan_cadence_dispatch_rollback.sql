-- Rollback: price scan cadence dispatch
select cron.unschedule('price-intel-due-hourly')
  where exists (select 1 from cron.job where jobname = 'price-intel-due-hourly');

drop function if exists public.dispatch_due_price_scans();
drop function if exists public.price_intel_due_markets();
