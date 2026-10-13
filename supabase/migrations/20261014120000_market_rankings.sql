-- =========================================================
-- 20261014120000_market_rankings.sql
--
-- Phase 6: global market rankings.
--
-- One row per (market, metric) with FULL provenance: a metric
-- without a verifiable source is simply ABSENT (no row) —
-- values are never invented, converted across currencies or
-- interpolated. The UI renders absence explicitly
-- ("not yet sourced") instead of a placeholder number.
--
-- Two families of metrics:
--   1. EXTERNAL (construction_output, cost_per_m2, ...) —
--      only seeded where a citable source exists today; the
--      rest stay absent until an admin adds a sourced row
--      (AdminMarkets, Phase 7).
--   2. FRELUX_* — coverage confidence computed from the
--      platform's own data (production price-book export of
--      2026-10-13 + repo migrations), so every value is
--      traceable, not an opinion.
--
-- frelux_coverage_level: 0 = pending (no price book at all),
-- 1 = low, 2 = medium, 3 = high (book rows + role mappings
-- both substantial). The per-metric row counts alongside it
-- let anyone re-derive the level.
-- =========================================================

CREATE TABLE IF NOT EXISTS market_rankings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code  text NOT NULL REFERENCES market_profiles(country_code) ON DELETE CASCADE,
  metric       text NOT NULL,
  value        numeric NOT NULL,
  unit         text NOT NULL,
  source_name  text NOT NULL,
  source_url   text,
  as_of        date NOT NULL,
  confidence   text NOT NULL DEFAULT 'medium'
               CHECK (confidence IN ('high', 'medium', 'low')),
  notes        text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market_code, metric)
);

CREATE INDEX IF NOT EXISTS market_rankings_market_idx
  ON market_rankings (market_code) WHERE is_active;

ALTER TABLE market_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_rankings FORCE ROW LEVEL SECURITY;

-- Public read of ACTIVE rows: the Global Markets page is public.
DROP POLICY IF EXISTS "mr_public_read" ON market_rankings;
CREATE POLICY "mr_public_read" ON market_rankings FOR SELECT
  TO anon, authenticated USING (is_active);

-- Admin writes (add/update sourced metrics, retire stale rows).
DROP POLICY IF EXISTS "mr_admin_insert" ON market_rankings;
CREATE POLICY "mr_admin_insert" ON market_rankings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "mr_admin_update" ON market_rankings;
CREATE POLICY "mr_admin_update" ON market_rankings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "mr_admin_delete" ON market_rankings;
CREATE POLICY "mr_admin_delete" ON market_rankings FOR DELETE
  TO authenticated USING (public.is_admin());

-- Phase 33 lesson: explicit grants for edge functions.
GRANT SELECT, INSERT, UPDATE ON market_rankings TO service_role;

COMMENT ON TABLE market_rankings IS
  'Sourced market ranking metrics per market (construction output, cost per m2, FRELUX coverage). A metric without a verified source has NO row — absence is rendered, never faked.';

-- ---------------------------------------------------------
-- Seed: EXTERNAL metrics — only what has a citable source
-- today (research 2026-10-13). Everything else stays absent.
-- ---------------------------------------------------------
INSERT INTO market_rankings (market_code, metric, value, unit, source_name, source_url, as_of, confidence, notes)
VALUES
  ('US', 'construction_output', 2190, 'billion USD (SAAR, Dec 2024)',
   'U.S. Census Bureau construction spending release', 'https://www.census.gov/constructionspending/',
   '2024-12-01', 'medium',
   'Seasonally adjusted annual rate of total construction spending, December 2024.'),
  ('GB', 'construction_output', 142.2, 'billion GBP (2024)',
   'ONS construction output in Great Britain', 'https://www.ons.gov.uk/businessindustryandtrade/constructionindustry',
   '2024-12-31', 'medium',
   'Total construction output 2024 at current prices, ONS series (flat vs 2023).'),
  ('FR', 'construction_output', 373.03, 'billion EUR (2023)',
   'Eurostat construction output (via Reportlinker European Construction Output dataset)',
   'https://www.reportlinker.com/dataset/d1706be7f5c7143012685de4b330a0c501aad292',
   '2023-12-31', 'low',
   'Aggregated dataset value; verify against the primary Eurostat series before reuse.'),
  ('IT', 'construction_output', 283.34, 'billion EUR (2023)',
   'Eurostat construction output (via Reportlinker European Construction Output dataset)',
   'https://www.reportlinker.com/dataset/d1706be7f5c7143012685de4b330a0c501aad292',
   '2023-12-31', 'low',
   'Aggregated dataset value; verify against the primary Eurostat series before reuse.'),
  ('KE', 'construction_gdp_share', 5.4, 'percent of GDP (FY2024)',
   'KNBS Economic Survey via Cytonn FY''2024 GDP note', 'https://www.cytonn.com/uploads/downloads/kenya-fy2024-gdp-note-v6-1.pdf',
   '2024-06-30', 'medium',
   'Construction sector contribution to GDP, down from 5.7% in FY2023.')
ON CONFLICT (market_code, metric) DO NOTHING;

-- ---------------------------------------------------------
-- Seed: FRELUX coverage confidence — computed from the
-- platform's own data (production price-book export of
-- 2026-10-13 + repo migrations incl. 20261013150000).
-- Level: 3 high, 2 medium, 1 low, 0 pending.
-- ---------------------------------------------------------
INSERT INTO market_rankings (market_code, metric, value, unit, source_name, source_url, as_of, confidence, notes)
VALUES
  ('US', 'frelux_coverage_level', 3, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=28 roles=19 scans=12'),
  ('US', 'frelux_price_book_rows', 28, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('US', 'frelux_role_mappings', 19, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('US', 'frelux_scan_sources', 12, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('GB', 'frelux_coverage_level', 3, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=16 roles=13 scans=10'),
  ('GB', 'frelux_price_book_rows', 16, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('GB', 'frelux_role_mappings', 13, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('GB', 'frelux_scan_sources', 10, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('NG', 'frelux_coverage_level', 3, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=34 roles=16 scans=4'),
  ('NG', 'frelux_price_book_rows', 34, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('NG', 'frelux_role_mappings', 16, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('NG', 'frelux_scan_sources', 4, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('DE', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=14 roles=8 scans=7'),
  ('DE', 'frelux_price_book_rows', 14, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('DE', 'frelux_role_mappings', 8, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('DE', 'frelux_scan_sources', 7, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('IN', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=12 roles=9 scans=7'),
  ('IN', 'frelux_price_book_rows', 12, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('IN', 'frelux_role_mappings', 9, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('IN', 'frelux_scan_sources', 7, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('CA', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=2 roles=8 scans=5'),
  ('CA', 'frelux_price_book_rows', 2, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('CA', 'frelux_role_mappings', 8, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('CA', 'frelux_scan_sources', 5, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('AU', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=7 roles=5 scans=4'),
  ('AU', 'frelux_price_book_rows', 7, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('AU', 'frelux_role_mappings', 5, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('AU', 'frelux_scan_sources', 4, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('FR', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=9 scans=0'),
  ('FR', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('FR', 'frelux_role_mappings', 9, 'mapped roles', 'FRELUX internal: production role export + repo migrations (20261013150000)', NULL, '2026-10-13', 'high', 'Includes the post-sync role re-assertions.'),
  ('FR', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('JP', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=8 scans=0'),
  ('JP', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('JP', 'frelux_role_mappings', 8, 'mapped roles', 'FRELUX internal: repo migration 20261013150000', NULL, '2026-10-13', 'high', 'Mapped after the pack-alignment commit 6d18118d.'),
  ('JP', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('BR', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=9 scans=0'),
  ('BR', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('BR', 'frelux_role_mappings', 9, 'mapped roles', 'FRELUX internal: repo migrations 20261013100000 + 20261013150000', NULL, '2026-10-13', 'high', NULL),
  ('BR', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('SA', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=7 scans=0'),
  ('SA', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('SA', 'frelux_role_mappings', 7, 'mapped roles', 'FRELUX internal: repo migration 20261013150000', NULL, '2026-10-13', 'high', 'MP75 skim deliberately unmapped until a verified price exists.'),
  ('SA', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('AE', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=7 scans=0'),
  ('AE', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('AE', 'frelux_role_mappings', 7, 'mapped roles', 'FRELUX internal: repo migration 20261013150000', NULL, '2026-10-13', 'high', 'MP75 skim deliberately unmapped until a verified price exists.'),
  ('AE', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('GH', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=8 scans=0'),
  ('GH', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('GH', 'frelux_role_mappings', 8, 'mapped roles', 'FRELUX internal: repo migration 20261013150000', NULL, '2026-10-13', 'high', NULL),
  ('GH', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('KE', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=8 scans=0'),
  ('KE', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('KE', 'frelux_role_mappings', 8, 'mapped roles', 'FRELUX internal: repo migrations 20261013100000 + 20261013150000', NULL, '2026-10-13', 'high', NULL),
  ('KE', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('ZA', 'frelux_coverage_level', 2, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=10 scans=0'),
  ('ZA', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('ZA', 'frelux_role_mappings', 10, 'mapped roles', 'FRELUX internal: repo migrations 20261013100000 + 20261013140000 + 20261013150000', NULL, '2026-10-13', 'high', NULL),
  ('ZA', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('IT', 'frelux_coverage_level', 1, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=0 scans=0 — role mappings pending'),
  ('IT', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('IT', 'frelux_role_mappings', 0, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', 'Inherits DE profile; calculators stay honest until role mappings exist.'),
  ('IT', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('MX', 'frelux_coverage_level', 1, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=0 scans=0 — role mappings pending'),
  ('MX', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('MX', 'frelux_role_mappings', 0, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('MX', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('KR', 'frelux_coverage_level', 1, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=0 scans=0 — role mappings pending'),
  ('KR', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('KR', 'frelux_role_mappings', 0, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('KR', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('ID', 'frelux_coverage_level', 1, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=8 roles=0 scans=0 — role mappings pending'),
  ('ID', 'frelux_price_book_rows', 8, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('ID', 'frelux_role_mappings', 0, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('ID', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL),

  ('CN', 'frelux_coverage_level', 0, 'level (0=pending,1=low,2=medium,3=high)', 'FRELUX internal: production price-book export + repo migrations', NULL, '2026-10-13', 'high', 'book=0 roles=0 scans=0 — profile registered, data pending verification'),
  ('CN', 'frelux_price_book_rows', 0, 'active price rows', 'FRELUX internal: production price-book export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('CN', 'frelux_role_mappings', 0, 'mapped roles', 'FRELUX internal: production role export 2026-10-13', NULL, '2026-10-13', 'high', NULL),
  ('CN', 'frelux_scan_sources', 0, 'active retailer sources', 'FRELUX internal: production scan-source export 2026-10-13', NULL, '2026-10-13', 'high', NULL)
ON CONFLICT (market_code, metric) DO NOTHING;
