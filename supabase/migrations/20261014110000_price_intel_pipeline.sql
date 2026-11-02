-- =========================================================
-- 20261014110000_price_intel_pipeline.sql
--
-- Phase 5: recurring price intelligence pipeline.
--
-- The scan building blocks already exist (price_scan_sources
-- registry, price-scan edge function, price_scan_candidates
-- pending-review queue, admin approval into estimation_prices).
-- What was missing is the RECURRING layer: a scheduled,
-- server-side batch that walks the whole source registry,
-- validates what it finds, and files candidates for review —
-- without ever auto-applying a price.
--
-- This migration adds:
--   price_scan_runs       — one row per batch execution (audit,
--                           failure visibility, statistics)
--   price_scan_candidates.run_id + unique index
--                         — idempotency within a run: a source
--                           can never file two candidates in the
--                           same run, and re-invocations of the
--                           same run id are no-ops
--   price_scan_sources.last_scan_status / last_scan_error
--                         — per-source outcome visibility
--   price_intel_tokens    — server-side token gate for the cron
--                           (same pattern as price_digest_tokens)
--   pg_cron schedule      — 'price-intel-weekly', Mondays
--                           06:40 UTC, calling the price-intel-scan
--                           edge function
--
-- Policies (never fake automation):
--   - the batch only ever writes price_scan_candidates with
--     status 'pending' or 'failed' and NEVER estimation_prices;
--     promotion to the live book stays a human admin action, so
--     manual admin overrides survive automation by construction.
--   - price integrity: candidates carry validation metadata
--     (currency match, deviation vs current book price) in
--     review_note so reviewers see outliers immediately.
-- =========================================================

-- 1. Batch runs audit table -----------------------------------
CREATE TABLE IF NOT EXISTS price_scan_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger           text NOT NULL DEFAULT 'cron'
                    CHECK (trigger IN ('cron', 'admin')),
  markets           text[] NOT NULL DEFAULT '{}',
  requested_by      text,
  status            text NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running', 'completed', 'failed')),
  sources_total     integer NOT NULL DEFAULT 0,
  sources_scanned   integer NOT NULL DEFAULT 0,
  candidates_created integer NOT NULL DEFAULT 0,
  candidates_failed integer NOT NULL DEFAULT 0,
  notes             text,
  error             text,
  started_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz
);

CREATE INDEX IF NOT EXISTS price_scan_runs_started_idx
  ON price_scan_runs (started_at DESC);

ALTER TABLE price_scan_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_scan_runs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "psr_admin_read" ON price_scan_runs;
CREATE POLICY "psr_admin_read" ON price_scan_runs FOR SELECT
  TO authenticated USING (public.is_admin());

-- Phase 33 lesson: default privileges miss new tables; the edge
-- functions run as service role.
GRANT SELECT, INSERT, UPDATE ON price_scan_runs TO service_role;

COMMENT ON TABLE price_scan_runs IS
  'Recurring price-intelligence batch executions: sources walked, candidates filed, failures recorded. The batch NEVER writes estimation_prices — approval stays manual.';

-- 2. Per-source outcome columns --------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'price_scan_sources' AND column_name = 'last_scan_status'
  ) THEN
    ALTER TABLE price_scan_sources
      ADD COLUMN last_scan_status text
        CHECK (last_scan_status IN ('scanned', 'pending_review', 'failed', 'skipped')),
      ADD COLUMN last_scan_error text;
  END IF;
END $$;

GRANT UPDATE ON price_scan_sources TO service_role;

-- 3. Candidate idempotency -------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'price_scan_candidates' AND column_name = 'run_id'
  ) THEN
    ALTER TABLE price_scan_candidates
      ADD COLUMN run_id uuid REFERENCES price_scan_runs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- One candidate per source per run: re-invocations can't file
-- duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS price_scan_candidates_run_source_uniq
  ON price_scan_candidates (source_id, run_id)
  WHERE run_id IS NOT NULL AND source_id IS NOT NULL;

GRANT UPDATE ON price_scan_candidates TO service_role;

-- 4. Token gate for the cron -----------------------------------
CREATE TABLE IF NOT EXISTS price_intel_tokens (
  token      text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE price_intel_tokens ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON price_intel_tokens TO service_role;

-- One token per installation (idempotent insert).
INSERT INTO price_intel_tokens (token)
SELECT gen_random_uuid()::text
WHERE NOT EXISTS (SELECT 1 FROM price_intel_tokens);

-- 5. Weekly schedule -------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any previous version first (idempotent).
SELECT cron.unschedule('price-intel-weekly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'price-intel-weekly');

SELECT cron.schedule(
  'price-intel-weekly',
  '40 6 * * 1',
  $$
  select net.http_post(
    url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/price-intel-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-intel-token', (select token from public.price_intel_tokens limit 1)
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);
