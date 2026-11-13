-- Weekly error-retention sweep.
--
-- `cleanup-old-errors` deletes resolved, non-critical errors older than 90 days
-- and is deployed with verify_jwt off so a scheduler can reach it. It therefore
-- authenticates the caller itself: the service role key, an admin session, or
-- the `x-cron-secret` header. The secret is held in Supabase Vault under the
-- name `cleanup_cron_secret`, never in this file, so the schedule reads it at
-- run time instead of embedding a credential in the repository.
--
-- The job is only created when that vault secret exists, so a fresh environment
-- applies this migration cleanly and simply has no sweep until someone adds the
-- secret:
--
--   select vault.create_secret('<random 32-byte hex>', 'cleanup_cron_secret',
--     'Header secret for cleanup-old-errors');
--
-- and redeploys `cleanup-old-errors` with CLEANUP_CRON_SECRET set to the same
-- value.

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'cleanup_cron_secret'
  ) then
    raise notice
      'cleanup_cron_secret missing from Vault; weekly error cleanup not scheduled';
    return;
  end if;

  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'frelux-error-cleanup';

  perform cron.schedule(
    'frelux-error-cleanup',
    '0 3 * * 0',
    $job$
    select net.http_post(
      url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/cleanup-old-errors',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'cleanup_cron_secret'
        )
      ),
      body := '{}'::jsonb
    );
    $job$
  );
end $$;
