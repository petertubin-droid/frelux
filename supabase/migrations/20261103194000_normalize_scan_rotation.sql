-- =========================================================
-- SPREAD THE NEW SOURCES ACROSS THE SCAN ROTATION
--
-- price-intel-scan rotates HTML search sources across six week groups so a
-- run stays inside the invocation budget: a source is scanned only in the
-- week whose rotation matches its rotation_group. The sources added on
-- 2026-11-03 were all filed in group 0, so the eleven markets that had no
-- scanner coverage before would only ever be visited in the one week out of
-- six where group 0 comes round. They looked scheduled and were not.
--
-- Existing sources are distributed across all six groups. This applies the
-- same spread to everything added today, from a stable hash of the row id so
-- a source keeps its group between runs.
-- =========================================================

UPDATE public.price_scan_sources
   SET rotation_group = abs(hashtext(id::text)) % 6
 WHERE is_active
   AND created_at >= '2026-11-03'
   AND rotation_group = 0;
