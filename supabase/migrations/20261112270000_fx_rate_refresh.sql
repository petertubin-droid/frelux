-- =========================================================
-- Keeping FX rates fresh
--
-- The rates behind every local price were a one-off seed: fetched on
-- 2026-10-30 and never again, and only 17 of the 43 market currencies had one.
-- A price derived from a stale rate is wrong by however much the currency
-- moved, and a currency with no rate cannot be priced or checked at all.
--
-- pg_cron and pg_net are both installed, so the refresh lives in the database:
-- a daily request to the public rate feed, then a second job that reads the
-- response and records the rates. No API key, no edge function, no secret.
--
-- Rollback: 20261112270000_fx_rate_refresh_rollback.sql
-- =========================================================

CREATE TABLE IF NOT EXISTS public.fx_refresh_requests (
  id bigserial PRIMARY KEY,
  request_id bigint NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

CREATE INDEX IF NOT EXISTS fx_refresh_requests_pending
  ON public.fx_refresh_requests (request_id)
  WHERE applied_at IS NULL;

ALTER TABLE public.fx_refresh_requests ENABLE ROW LEVEL SECURITY;
-- Admin-visible only; nothing reads it from the browser in normal use.
DROP POLICY IF EXISTS "fx_refresh_requests_admin_read" ON public.fx_refresh_requests;
CREATE POLICY "fx_refresh_requests_admin_read"
  ON public.fx_refresh_requests FOR SELECT
  USING (public.is_admin());

/** Queues one request to the public USD rate feed. */
CREATE OR REPLACE FUNCTION public.fx_request_refresh()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_request bigint;
BEGIN
  SELECT net.http_get(
    url := 'https://open.er-api.com/v6/latest/USD',
    timeout_milliseconds := 20000
  ) INTO v_request;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Could not queue the FX request';
  END IF;

  INSERT INTO public.fx_refresh_requests (request_id) VALUES (v_request);
  RETURN v_request;
END;
$$;

COMMENT ON FUNCTION public.fx_request_refresh() IS
  'Queues a USD rate fetch through pg_net. Run daily by pg_cron.';

/**
 * Reads any completed responses and records the rates.
 *
 * Every currency the feed returns is stored, not just the ones priced
 * today: a market added tomorrow then has a rate waiting for it.
 */
CREATE OR REPLACE FUNCTION public.fx_apply_refresh()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  r record;
  v_rates jsonb;
  v_recorded integer := 0;
  v_pairs integer := 0;
BEGIN
  FOR r IN
    SELECT req.id, req.request_id, res.status_code, res.content
      FROM public.fx_refresh_requests req
      JOIN net._http_response res ON res.id = req.request_id
     WHERE req.applied_at IS NULL
       AND res.status_code = 200
  LOOP
    BEGIN
      v_rates := (r.content::jsonb) -> 'rates';
    EXCEPTION WHEN others THEN
      v_rates := NULL;
    END;

    IF v_rates IS NULL OR jsonb_typeof(v_rates) <> 'object' THEN
      UPDATE public.fx_refresh_requests
         SET applied_at = now()
       WHERE id = r.id;
      CONTINUE;
    END IF;

    INSERT INTO public.fx_rates (
      base_currency, quote_currency, rate, provider, source_url, fetched_at
    )
    SELECT 'USD',
           upper(key),
           (value)::numeric,
           'open.er-api.com',
           'https://open.er-api.com/v6/latest/USD',
           now()
      FROM jsonb_each_text(v_rates)
     WHERE upper(key) ~ '^[A-Z]{3}$'
       AND upper(key) <> 'USD'
       AND (value)::numeric > 0;

    GET DIAGNOSTICS v_pairs = ROW_COUNT;
    v_recorded := v_recorded + v_pairs;

    UPDATE public.fx_refresh_requests
       SET applied_at = now()
     WHERE id = r.id;
  END LOOP;

  RETURN v_recorded;
END;
$$;

COMMENT ON FUNCTION public.fx_apply_refresh() IS
  'Records rates from completed FX responses. Returns the number of currency rows written.';

-- Only the scheduler and admins need these; the browser never calls them.
REVOKE ALL ON FUNCTION public.fx_request_refresh() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fx_apply_refresh() FROM PUBLIC;

-- Daily: ask at 03:15, record at 03:35, both UTC.
DO $$
BEGIN
  PERFORM cron.unschedule('frelux-fx-refresh-request');
EXCEPTION WHEN others THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('frelux-fx-refresh-apply');
EXCEPTION WHEN others THEN
  NULL;
END $$;

SELECT cron.schedule(
  'frelux-fx-refresh-request',
  '15 3 * * *',
  $$SELECT public.fx_request_refresh();$$
);

SELECT cron.schedule(
  'frelux-fx-refresh-apply',
  '35 3 * * *',
  $$SELECT public.fx_apply_refresh();$$
);
