-- =========================================================
-- Migration: 20261026110000_price_candidates_and_authorizations_multi_actor.sql
--
-- 1. Price Scan Candidates: Remove owner-only bottlenecks,
--    enabling collaborative and automated review & application.
--
-- (SPLIT 2026-10-19): the ARCHIE global authorizations section
-- that shipped in this migration was misplaced — ARCHIE's
-- authorization schema belongs to the ARCHIE project/repo and
-- was reverted out of the FRELUX chain; the multi-actor design
-- is implemented deliberately in the ARCHIE repo with
-- admin-gated writes.
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
