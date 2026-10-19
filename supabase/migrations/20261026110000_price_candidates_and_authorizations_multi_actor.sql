-- =========================================================
-- Migration: 20261026110000_price_candidates_and_authorizations_multi_actor.sql
--
-- 1. Price Scan Candidates: Remove owner-only bottlenecks,
--    enabling collaborative and automated review & application.
-- 2. ARCHIE Authorizations: Relax strict single-owner
--    authorization constraints to support multi-actor and system
--    grants (OWNER, ADMIN, SYSTEM, AUTO).
-- =========================================================

-- ---------------------------------------------------------
-- 1. Price scan candidates & sources permissions & RLS
-- ---------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_scan_candidates TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_scan_sources TO authenticated, service_role;

DROP POLICY IF EXISTS "psc_authenticated_read" ON public.price_scan_candidates;
CREATE POLICY "psc_authenticated_read" ON public.price_scan_candidates FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "psc_authenticated_insert" ON public.price_scan_candidates;
CREATE POLICY "psc_authenticated_insert" ON public.price_scan_candidates FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "psc_authenticated_update" ON public.price_scan_candidates;
CREATE POLICY "psc_authenticated_update" ON public.price_scan_candidates FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pss_authenticated_read" ON public.price_scan_sources;
CREATE POLICY "pss_authenticated_read" ON public.price_scan_sources FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "pss_authenticated_insert" ON public.price_scan_sources;
CREATE POLICY "pss_authenticated_insert" ON public.price_scan_sources FOR INSERT
  TO authenticated WITH CHECK (true);

-- ---------------------------------------------------------
-- 2. ARCHIE global authorizations multi-actor support
-- ---------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.archie_global_authorizations
    DROP CONSTRAINT IF EXISTS archie_global_authorizations_granted_by_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE public.archie_global_authorizations
  ADD CONSTRAINT archie_global_authorizations_granted_by_check
  CHECK (granted_by IN ('OWNER', 'ADMIN', 'SYSTEM', 'AUTO'));

DROP POLICY IF EXISTS "auth_read_authorizations" ON public.archie_global_authorizations;
CREATE POLICY "auth_read_authorizations" ON public.archie_global_authorizations
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "auth_write_authorizations" ON public.archie_global_authorizations;
CREATE POLICY "auth_write_authorizations" ON public.archie_global_authorizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_authorizations" ON public.archie_global_authorizations;
CREATE POLICY "auth_update_authorizations" ON public.archie_global_authorizations
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
