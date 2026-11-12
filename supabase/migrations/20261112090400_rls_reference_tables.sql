-- =========================================================
-- Row level security on the six public tables that never had it.
--
-- The audit found six tables with RLS disabled, five of them carrying INSERT,
-- UPDATE and DELETE grants for anon and authenticated, so the only thing
-- stopping a signed in user from rewriting the price catalogue was that nobody
-- had tried. Anonymous writes are refused today by PostgREST, which makes this
-- a defence in depth fix rather than an open door, but the grants were real.
--
-- What each table is for decided its policy:
--   catalogue_products     read and edited by the admin review panel, so an
--                          admin policy, not a public one. Rows carry supplier
--                          costs and should not be world readable.
--   material_categories    reference data written by the scan scripts with the
--   material_aliases       service role, never by the browser.
--   site_health_probes     internal monitoring rows.
--   catalogue_sync_requests internal queue.
--   price_index_repair_snapshot internal repair baseline.
--
-- The five non catalogue tables get RLS with no policy, which is the correct
-- shape for service role only data: it denies by default and says so.
-- =========================================================

ALTER TABLE public.catalogue_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogue_products_admin ON public.catalogue_products;
CREATE POLICY catalogue_products_admin ON public.catalogue_products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_health_probes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_sync_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_index_repair_snapshot ENABLE ROW LEVEL SECURITY;

-- Remove the write grants that made the missing RLS matter in the first place.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON public.catalogue_products,
     public.material_categories,
     public.material_aliases,
     public.site_health_probes,
     public.catalogue_sync_requests,
     public.price_index_repair_snapshot
  FROM anon, authenticated;

GRANT SELECT ON public.material_categories, public.material_aliases TO anon, authenticated;

COMMENT ON TABLE public.catalogue_products IS
  'Scraped retailer catalogue rows. Admin read and write through the review panel; the scan scripts use the service role. RLS added 12 Nov 2026.';
COMMENT ON TABLE public.material_categories IS
  'Material classification reference data, service role only. Writes by the price scan scripts.';
COMMENT ON TABLE public.material_aliases IS
  'Alternate product names used by the price matcher, service role only.';
COMMENT ON TABLE public.site_health_probes IS
  'Internal availability probes. Service role only, RLS denies browser roles by default.';
COMMENT ON TABLE public.catalogue_sync_requests IS
  'Queue of requested catalogue syncs. Service role only.';
COMMENT ON TABLE public.price_index_repair_snapshot IS
  'Baseline captured before a price index repair. Service role only.';
