-- =========================================================
-- Keep the ARCHIE maintenance cron pointed at the ARCHIE project
-- 2026-10-28
--
-- CORRECTION. An earlier attempt at this timestamp assumed the
-- hqhvlkunkdrxyuvziorm host in the hourly job was a leftover from the
-- FRELUX move (2026-10-16, commits cfb16a36 / 62376bd5) and repointed it
-- at nfgaaohweygwydoelxnf. That was wrong:
--
--   nfgaaohweygwydoelxnf  = FRELUX production ("freluxproject")
--   hqhvlkunkdrxyuvziorm  = ARCHIE ("Freluxtools") — a SEPARATE project,
--                           no longer part of the FRELUX account
--
-- The job lives in the FRELUX database but deliberately POSTs to the
-- ARCHIE project's archie-maintenance function. ARCHIE is not deployed
-- here, so any rewrite of that host silently disables the maintenance
-- run. Only the host is restored below; name and schedule are preserved.
--
-- Idempotent: a re-run finds the command already correct.
-- =========================================================

DO $$
DECLARE
  v_archie_origin constant text := 'https://hqhvlkunkdrxyuvziorm.supabase.co';
  v_command constant text := $cmd$
  SELECT net.http_post(
    url := 'https://hqhvlkunkdrxyuvziorm.supabase.co/functions/v1/archie-maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-maintenance-token', (SELECT token FROM public.archie_scheduler_tokens LIMIT 1)
    ),
    body := jsonb_build_object('mode', 'all')
  );
  $cmd$;
  j record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
    RAISE NOTICE 'pg_cron not installed on this project; nothing to restore';
    RETURN;
  END IF;

  FOR j IN
    SELECT jobid, jobname, schedule, command
      FROM cron.job
     WHERE jobname = 'archie-maintenance-hourly'
       AND command NOT LIKE '%' || v_archie_origin || '%'
  LOOP
    PERFORM cron.unschedule(j.jobid);
    PERFORM cron.schedule(j.jobname, j.schedule, v_command);
    RAISE NOTICE 'archie-maintenance-hourly restored to % (was jobid %)', v_archie_origin, j.jobid;
  END LOOP;
END $$;
