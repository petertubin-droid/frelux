-- =========================================================
-- pro_profiles coordinate columns
--
-- The client (src/lib/pro-connect.ts) selects latitude/longitude
-- from pro_profiles in its embedded professional queries, and
-- migration 20261021110000 grants SELECT on those columns — but no
-- migration ever created them, so the queries fail with
-- "column pro_profiles.latitude does not exist" on every project.
--
-- This adds the columns (additive, nullable) and backfills each
-- profile once from its earliest linked pro_locations row via
-- pro_profile_locations, so map/display queries work immediately.
-- The find_nearby_professionals RPC is untouched: it still resolves
-- coordinates through pro_profile_locations -> pro_locations.
-- =========================================================

ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- One-time backfill from each profile's earliest linked location.
-- Re-runnable: only fills still-NULL values.
UPDATE public.pro_profiles pp
SET latitude = src.latitude,
    longitude = src.longitude
FROM (
  SELECT DISTINCT ON (ppl.profile_id) ppl.profile_id, pl.latitude, pl.longitude
  FROM public.pro_profile_locations ppl
  JOIN public.pro_locations pl ON pl.id = ppl.location_id
  WHERE pl.latitude IS NOT NULL AND pl.longitude IS NOT NULL
  ORDER BY ppl.profile_id, ppl.created_at
) src
WHERE pp.id = src.profile_id
  AND pp.latitude IS NULL
  AND pp.longitude IS NULL;
