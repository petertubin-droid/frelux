-- =========================================================
-- Two access defects found while verifying the fixes above.
--
-- 1. pro_profiles carried a public RLS policy for anon
--    (read_listed_pro_profiles) but no table GRANT, so every
--    logged-out visitor to the directory got 42501 instead of
--    listed professionals. RLS still decides which rows anon
--    may see; this only lets the request through.
--
-- 2. The seeding tables allowed anyone to insert a row claiming
--    any created_by. Tighten the insert policies so a row can
--    only be attributed to the submitter or to nobody.
-- =========================================================

GRANT SELECT ON public.pro_profiles TO anon;
GRANT SELECT ON public.pro_profile_services TO anon;
GRANT SELECT ON public.pro_profile_locations TO anon;
GRANT SELECT ON public.pro_locations TO anon;
GRANT SELECT ON public.pro_categories TO anon;

DROP POLICY IF EXISTS concierge_requests_insert ON public.marketplace_concierge_requests;
CREATE POLICY concierge_requests_insert ON public.marketplace_concierge_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (created_by IS NULL OR created_by = auth.uid());

DROP POLICY IF EXISTS artisan_nominations_insert ON public.marketplace_artisan_nominations;
CREATE POLICY artisan_nominations_insert ON public.marketplace_artisan_nominations
  FOR INSERT TO anon, authenticated
  WITH CHECK (created_by IS NULL OR created_by = auth.uid());
