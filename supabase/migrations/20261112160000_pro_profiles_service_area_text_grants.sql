-- =========================================================
-- service_area_text must be readable by the browser roles.
--
-- 20261111100000 adds the column, and 20261112150000 grants pro_profiles
-- column by column because the table-level SELECT had been revoked. The
-- column list in that grant was written before this column existed, so the
-- directory search, which selects service_area_text to match and filter on
-- free-text coverage, fails with a column permission error and returns no
-- professionals at all.
--
-- Grant the new column explicitly rather than re-granting every column, so
-- the surface stays the reviewed list plus this one field.
-- =========================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pro_profiles'
      AND column_name = 'service_area_text'
  ) THEN
    EXECUTE 'grant select (service_area_text) on public.pro_profiles to anon, authenticated';
  END IF;
END $$;

COMMENT ON COLUMN public.pro_profiles.service_area_text IS
  'User-entered, non-geocoded service coverage text (max 160 chars). Display and free-text filter only; never used for distance maths.';
