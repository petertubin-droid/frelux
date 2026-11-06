-- Two live cron jobs called jsonb_build_object with a single argument, which
-- raises "argument list must have even number of elements" at run time:
--
--   signup-digest-daily        jobid 12, 5 7 * * *     failed 2026-11-06 07:05
--   product-updates-digest     jobid 43, 0 8 */3 * *   same body defect
--
-- price-digest-weekly was repaired earlier; these two carry the same copy of the
-- statement. The body is now a jsonb literal, and the migration refuses to leave
-- a live job carrying the single-argument form.

select cron.unschedule('signup-digest-daily')
  where exists (select 1 from cron.job where jobname = 'signup-digest-daily');

select cron.schedule(
  'signup-digest-daily',
  '5 7 * * *',
  $job$
  select net.http_post(
    url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/signup-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-token', (select token from public.signup_digest_tokens limit 1)
    ),
    body := '{}'::jsonb
  );
  $job$
);

select cron.unschedule('product-updates-digest')
  where exists (select 1 from cron.job where jobname = 'product-updates-digest');

select cron.schedule(
  'product-updates-digest',
  '0 8 */3 * *',
  $job$
  select net.http_post(
    url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/product-updates-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-token', (select token from public.product_updates_digest_tokens limit 1)
    ),
    body := '{}'::jsonb
  );
  $job$
);

do $$
declare
  v_bad text;
begin
  select string_agg(jobname, ', ' order by jobname)
    into v_bad
    from cron.job
   where command like '%jsonb_build_object(''{}'')%';

  if v_bad is not null then
    raise exception 'cron jobs still build a json object from one argument: %', v_bad;
  end if;
end $$;
