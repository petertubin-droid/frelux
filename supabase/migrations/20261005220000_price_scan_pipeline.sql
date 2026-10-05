-- =========================================================
-- Price scan pipeline: browse retail sites → review → apply
--
-- The admin scans retailer product pages (price-scan edge
-- function, JSON-LD/meta extraction, never invented), each
-- scan lands here as a PENDING candidate, and ONLY an explicit
-- admin approval promotes it into estimation_prices — the one
-- book every engine prices from. Rejected scans are kept for
-- the audit trail.
--
-- price_scan_sources: the admin's configured retailer product
--   URLs per material+market (Home Depot, Walmart, Lowe's,
--   B&Q, IndiaMART...).
-- price_scan_candidates: one row per scan result with the
--   scraped price, extraction method and confidence.
--
-- Idempotent: safe to re-run.
-- =========================================================

CREATE TABLE IF NOT EXISTS price_scan_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market          text NOT NULL DEFAULT 'US',
  material_slug   text NOT NULL,
  retailer        text NOT NULL,
  label           text NOT NULL DEFAULT '',
  product_url     text NOT NULL,
  expected_unit   text NOT NULL DEFAULT 'unit',
  currency        text NOT NULL DEFAULT 'USD',
  is_active       boolean NOT NULL DEFAULT true,
  last_scanned_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_scan_sources_market_idx
  ON price_scan_sources (market) WHERE is_active;

CREATE TABLE IF NOT EXISTS price_scan_candidates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        uuid REFERENCES price_scan_sources(id) ON DELETE SET NULL,
  market           text NOT NULL,
  material_slug    text NOT NULL,
  retailer         text NOT NULL,
  product_url      text NOT NULL,
  product_name     text,
  scraped_price    numeric,
  currency         text NOT NULL DEFAULT 'USD',
  unit             text,
  extraction       text CHECK (extraction IN ('json_ld', 'meta', 'regex')),
  confidence       text NOT NULL DEFAULT 'low'
                   CHECK (confidence IN ('low', 'medium', 'high')),
  scrape_error     text,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'failed')),
  reviewed_at      timestamptz,
  review_note      text,
  applied_price_id uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_scan_candidates_status_idx
  ON price_scan_candidates (status, created_at DESC);
CREATE INDEX IF NOT EXISTS price_scan_candidates_market_idx
  ON price_scan_candidates (market, material_slug);

COMMENT ON TABLE price_scan_candidates IS
  'Retail price scan results awaiting admin review. Approval writes into estimation_prices (per market) with the retailer recorded in price_source; nothing auto-applies.';

ALTER TABLE price_scan_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_scan_sources FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pss_admin_read" ON price_scan_sources;
CREATE POLICY "pss_admin_read" ON price_scan_sources FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "pss_admin_insert" ON price_scan_sources;
CREATE POLICY "pss_admin_insert" ON price_scan_sources FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "pss_admin_update" ON price_scan_sources;
CREATE POLICY "pss_admin_update" ON price_scan_sources FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "pss_admin_delete" ON price_scan_sources;
CREATE POLICY "pss_admin_delete" ON price_scan_sources FOR DELETE
  TO authenticated USING (public.is_admin());

ALTER TABLE price_scan_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_scan_candidates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "psc_admin_read" ON price_scan_candidates;
CREATE POLICY "psc_admin_read" ON price_scan_candidates FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "psc_admin_insert" ON price_scan_candidates;
CREATE POLICY "psc_admin_insert" ON price_scan_candidates FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "psc_admin_update" ON price_scan_candidates;
CREATE POLICY "psc_admin_update" ON price_scan_candidates FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "psc_admin_delete" ON price_scan_candidates;
CREATE POLICY "psc_admin_delete" ON price_scan_candidates FOR DELETE
  TO authenticated USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_scan_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_scan_sources TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_scan_candidates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_scan_candidates TO service_role;

-- ---------------------------------------------------------
-- Starter scan sources (US retail pages verified 2026-10-05).
-- The admin can edit or extend these from the admin UI.
-- ---------------------------------------------------------
INSERT INTO price_scan_sources (market, material_slug, retailer, label, product_url, expected_unit, currency) VALUES
  ('US', 'us-quikrete-concrete-80lb', 'Home Depot',
   'Quikrete 80 lb Concrete Mix',
   'https://www.homedepot.com/p/Quikrete-80-lb-Concrete-Mix-110180/100450509',
   'bag', 'USD'),
  ('US', 'us-thompsons-waterseal', 'Walmart',
   'Thompson''s WaterSeal Multi-Surface Waterproofer, Clear, 1 Gallon',
   'https://www.walmart.com/ip/Thompson-s-WaterSeal-Multi-Surface-Waterproofer-Clear-1-Gallon/17171429',
   'gallon', 'USD'),
  ('US', 'us-behr-premium-plus-interior', 'Home Depot',
   'Behr Premium Plus Interior Satin Enamel',
   'https://www.homedepot.com/p/BEHR-PREMIUM-PLUS-5-gal-500E-3-Rain-Washed-Satin-Enamel-Low-Odor-Interior-Paint-Primer-705005/204882761',
   'gallon', 'USD')
ON CONFLICT DO NOTHING;
