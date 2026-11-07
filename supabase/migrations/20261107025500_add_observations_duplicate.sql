-- Record how many observations a run found already filed for the day.
--
-- The unique index on (source, supplier, market, material, brand, specification,
-- unit, observed_on) makes a repeat run a no-op, which is correct, but the count
-- then reads as zero. Run 64b1083f on 7 November 2026 filed five GB candidates
-- with real prices and reported observations_filed 0 because the five evidence
-- rows were stamped by the earlier run 45b03789 that first saw them. Without a
-- duplicate count, a reader cannot tell "no evidence written" from "evidence
-- already held", which is the same confusion that hid the 42P10 write failures
-- before commit e0b38ed8.
--
-- Idempotent: guarded by IF NOT EXISTS, and existing rows default to 0.

BEGIN;

ALTER TABLE public.price_scan_runs
  ADD COLUMN IF NOT EXISTS observations_duplicate integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.price_scan_runs.observations_duplicate IS
  'Observations skipped because the same source, supplier, material and day was already recorded.';

COMMIT;
