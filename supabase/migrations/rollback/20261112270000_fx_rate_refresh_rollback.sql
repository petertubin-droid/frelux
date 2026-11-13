-- Rollback for 20261112270000_fx_rate_refresh.sql
-- Unschedule the two jobs and drop the request bookkeeping. Recorded rates are
-- left in place: they are historical facts, and deleting them would erase the
-- provenance the reconciliation report reads.

SELECT cron.unschedule('frelux-fx-refresh-request');
SELECT cron.unschedule('frelux-fx-refresh-apply');

DROP FUNCTION IF EXISTS public.fx_apply_refresh();
DROP FUNCTION IF EXISTS public.fx_request_refresh();
DROP TABLE IF EXISTS public.fx_refresh_requests;
