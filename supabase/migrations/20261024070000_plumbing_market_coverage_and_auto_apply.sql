-- =========================================================
-- Plumbing market coverage + weekly auto-apply price layer
--
-- Completes the price pipeline for the plumbing calculator
-- across EVERY present FRELUX market and upgrades the weekly
-- pg_cron scan (price-intel-scan, Mondays 06:40 UTC) from
-- "file candidates for manual review" to "auto-apply under
-- strict gates":
--
--   1. estimation_prices gains an origin column
--      (manual | reference | scan). MANUAL prices are protected
--      from auto-overwrite by construction; only reference
--      and scan-origin prices refresh automatically.
--   2. price_scan_candidates gains 'auto_applied' status and an
--      observations column (agreeing listings per candidate).
--   3. price_scan_sources gains source_type (product | search).
--      Search sources are stable retailer search URLs, so the
--      weekly scan survives site redesigns for years.
--   4. price_auto_apply_rules: per-market gate configuration.
--   5. Per-market plumbing materials (9 engine keys) for all
--      20 calculator markets, seeded with FX reference prices
--      derived from the LIVE NG book at apply time (never
--      invented numbers), each awaiting its first live scan.
--   6. Search sources seeded for every market x 9 keys.
--
-- The weekly scan then keeps every market current automatically;
-- out-of-bounds or low-confidence results stay pending for admin.
--
-- Idempotent: safe to re-run.
-- =========================================================

-- ── 1. Price origin ──────────────────────────────────────
ALTER TABLE estimation_prices
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual'
  CHECK (origin IN ('manual', 'reference', 'scan'));

-- ── 1b. Runs: auto-apply counter ─────────────────────────────
ALTER TABLE price_scan_runs
  ADD COLUMN IF NOT EXISTS auto_applied integer NOT NULL DEFAULT 0;

COMMENT ON TABLE price_scan_runs IS
  'Recurring price-intelligence batch executions: sources walked, candidates filed, failures recorded, gated groups auto-applied into estimation_prices (origin=scan only; manual prices never overwritten).';

-- ── 2. Candidates: auto_applied status + observation count ──
ALTER TABLE price_scan_candidates
  ADD COLUMN IF NOT EXISTS observations integer;

ALTER TABLE price_scan_candidates
  DROP CONSTRAINT IF EXISTS price_scan_candidates_status_check;
ALTER TABLE price_scan_candidates
  ADD CONSTRAINT price_scan_candidates_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'failed', 'auto_applied'));

-- ── 3. Sources: product pages vs durable search URLs ──────
ALTER TABLE price_scan_sources
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'product'
  CHECK (source_type IN ('product', 'search'));

-- ── 4. Auto-apply gate configuration ───────────────────────
CREATE TABLE IF NOT EXISTS price_auto_apply_rules (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market                   text NOT NULL UNIQUE,
  min_confidence           text NOT NULL DEFAULT 'high'
                           CHECK (min_confidence IN ('medium', 'high')),
  max_deviation_percent    numeric NOT NULL DEFAULT 30
                           CHECK (max_deviation_percent BETWEEN 0 AND 100),
  min_agreeing_observations integer NOT NULL DEFAULT 2
                           CHECK (min_agreeing_observations >= 2),
  is_active                boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE price_auto_apply_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_auto_apply_rules FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_auto_apply_rules_public_read" ON price_auto_apply_rules;
CREATE POLICY "price_auto_apply_rules_public_read" ON price_auto_apply_rules
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "price_auto_apply_rules_admin_write" ON price_auto_apply_rules;
CREATE POLICY "price_auto_apply_rules_admin_write" ON price_auto_apply_rules
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO price_auto_apply_rules (market)
SELECT m FROM (VALUES
  ('NG'),('US'),('GB'),('CA'),('AU'),('DE'),('IN'),('GH'),('KE'),
  ('ZA'),('JP'),('FR'),('BR'),('SA'),('AE'),('CN'),('ID'),('MX'),('KR'),('IT')
) AS markets(m)
ON CONFLICT (market) DO NOTHING;

-- ── 5. Per-market plumbing materials (9 engine keys x 19 markets;
--       NG prices come from the live NG book and need no shells) ──
WITH mkt(market) AS (VALUES
  ('US'),('GB'),('CA'),('AU'),('DE'),('IN'),('GH'),('KE'),
  ('ZA'),('JP'),('FR'),('BR'),('SA'),('AE'),('CN'),('ID'),('MX'),('KR'),('IT')
), keys(kind, suffix, display, unit_word) AS (VALUES
  ('pipe','cold','Cold water pipe','metre'),
  ('pipe','hot','Hot water pipe','metre'),
  ('pipe','waste','Waste pipe','metre'),
  ('pipe','drainage','Drainage pipe','metre'),
  ('fitting','elbow','Pipe elbow','piece'),
  ('fitting','tee','Pipe tee','piece'),
  ('fitting','reducer','Pipe reducer','piece'),
  ('fitting','union','Pipe union','piece'),
  ('fitting','valve','Pipe valve','piece')
)
INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
SELECT
  k.display || ' (' || mkt.market || ')',
  lower(mkt.market) || CASE WHEN k.kind = 'pipe' THEN '-pipe-' ELSE '-' END || k.suffix,
  'pipe',
  'Per ' || k.unit_word || '. FX reference price until the first weekly live scan replaces it; the weekly price-intel scan auto-updates this market row under reviewable gates.',
  CURRENT_DATE, true, 10
FROM mkt CROSS JOIN keys
ON CONFLICT (slug) DO NOTHING;

-- ── 6. FX reference prices derived from the LIVE NG book ──
-- Rates are indicative 2026-10-24 close, disclosed per row; the
-- weekly scan replaces them with live local prices. Derived from
-- the active NG price per material, so nothing is invented.
WITH ng AS (
  SELECT DISTINCT ON (m.slug) m.slug AS ng_slug, p.ref_id, p.price
  FROM estimation_materials m
  JOIN estimation_prices p
    ON p.ref_id = m.id
   AND p.price_type = 'material'
   AND p.market = 'NG'
   AND p.is_active
  WHERE m.slug IN ('plumb-pipe-cold','plumb-pipe-hot','plumb-pipe-waste',
                   'plumb-pipe-drainage','plumb-elbow','plumb-tee',
                   'plumb-reducer','plumb-union','plumb-valve')
  ORDER BY m.slug, p.effective_date DESC, p.created_at DESC
), fx(market, rate, currency) AS (VALUES
  ('US', 0.00065, 'USD'), ('GB', 0.00048, 'GBP'), ('CA', 0.00089, 'CAD'),
  ('AU', 0.00098, 'AUD'), ('DE', 0.00060, 'EUR'), ('IN', 0.056,  'INR'),
  ('GH', 0.0064, 'GHS'),  ('KE', 0.0078, 'KES'),  ('ZA', 0.019,  'ZAR'),
  ('JP', 0.098,  'JPY'),  ('FR', 0.00060, 'EUR'), ('BR', 0.0037, 'BRL'),
  ('SA', 0.0024, 'SAR'),  ('AE', 0.0024, 'AED'),  ('CN', 0.0046, 'CNY'),
  ('ID', 10.4,   'IDR'),  ('MX', 0.0125, 'MXN'),   ('KR', 0.88,   'KRW'),
  ('IT', 0.00060, 'EUR')
), mapping AS (
  SELECT
    lower(f.market) || CASE WHEN k.kind = 'pipe' THEN '-pipe-' ELSE '-' END || k.suffix AS market_slug,
    CASE WHEN k.kind = 'pipe' THEN 'plumb-pipe-' || k.suffix ELSE 'plumb-' || k.suffix END AS ng_slug,
    f.market, f.currency, f.rate
  FROM fx
  CROSS JOIN (VALUES
    ('pipe','cold'),('pipe','hot'),('pipe','waste'),('pipe','drainage'),
    ('fitting','elbow'),('fitting','tee'),('fitting','reducer'),
    ('fitting','union'),('fitting','valve')
  ) AS k(kind, suffix)
)
INSERT INTO estimation_prices
  (price_type, ref_id, price, currency, effective_date, notes, is_active,
   price_source, scan_confidence, market, origin)
SELECT
  'material', m.id,
  round(ng.price * mp.rate, 2), mp.currency, CURRENT_DATE,
  'FX reference price derived from the active NG book price (NGN ' ||
    round(ng.price::numeric, 2) || ') at an indicative 2026-10-24 rate of ' ||
    mp.rate || ' ' || mp.currency || '/NGN. Marked reference until the weekly price-intel scan replaces it with a live local price.',
  true,
  'FX reference from the live NG book (weekly scan will replace)',
  'low', mp.market, 'reference'
FROM mapping mp
JOIN estimation_materials m ON m.slug = mp.market_slug
JOIN ng ON ng.ng_slug = mp.ng_slug
WHERE NOT EXISTS (
  SELECT 1 FROM estimation_prices p
  WHERE p.ref_id = m.id AND p.market = mp.market AND p.is_active
);

-- ── 7. Durable search sources for every market x 9 keys ───
-- Retailer search URLs are stable for years; the scan extracts
-- the median of all agreeing product listings on the page.
WITH src(market, currency, retailer, url_pattern) AS (VALUES
  ('NG','NGN','Jumia','https://www.jumia.com.ng/catalog/?q=%s'),
  ('NG','NGN','Konga','https://www.konga.com/search?q=%s'),
  ('GH','GHS','Jumia','https://www.jumia.com.gh/catalog/?q=%s'),
  ('KE','KES','Jumia','https://www.jumia.co.ke/catalog/?q=%s'),
  ('US','USD','Home Depot','https://www.homedepot.com/s/%s'),
  ('US','USD','Lowe''s','https://www.lowes.com/search?searchTerm=%s'),
  ('GB','GBP','Wickes','https://www.wickes.co.uk/search?text=%s'),
  ('GB','GBP','B&Q','https://www.diy.com/search?query=%s'),
  ('CA','CAD','Home Depot CA','https://www.homedepot.ca/en/search?q=%s'),
  ('AU','AUD','Bunnings','https://www.bunnings.com.au/search/products?query=%s'),
  ('DE','EUR','OBI','https://www.obi.de/search/text/%s'),
  ('DE','EUR','Amazon.de','https://www.amazon.de/s?k=%s'),
  ('FR','EUR','Leroy Merlin','https://www.leroymerlin.fr/recherche?text=%s'),
  ('IT','EUR','Amazon.it','https://www.amazon.it/s?k=%s'),
  ('IN','INR','Amazon.in','https://www.amazon.in/s?k=%s'),
  ('JP','JPY','Amazon.co.jp','https://www.amazon.co.jp/s?k=%s'),
  ('ZA','ZAR','Takealot','https://www.takealot.com/search?q=%s'),
  ('BR','BRL','Amazon.com.br','https://www.amazon.com.br/s?k=%s'),
  ('MX','MXN','Home Depot MX','https://www.homedepot.com.mx/search?q=%s'),
  ('SA','SAR','Amazon.sa','https://www.amazon.sa/s?k=%s'),
  ('AE','AED','Amazon.ae','https://www.amazon.ae/s?k=%s'),
  ('CN','CNY','JD.com','https://search.jd.com/Search?keyword=%s'),
  ('ID','IDR','Tokopedia','https://www.tokopedia.com/search?st=product&q=%s'),
  ('KR','KRW','Coupang','https://www.coupang.com/np/search?q=%s')
), q(kind, suffix, query) AS (VALUES
  ('pipe','cold','20mm PVC water pipe'),
  ('pipe','hot','20mm PPR hot water pipe'),
  ('pipe','waste','40mm waste pipe'),
  ('pipe','drainage','110mm drainage pipe'),
  ('fitting','elbow','20mm pipe elbow'),
  ('fitting','tee','20mm pipe tee'),
  ('fitting','reducer','20mm pipe reducer'),
  ('fitting','union','20mm pipe union'),
  ('fitting','valve','20mm pipe valve')
)
INSERT INTO price_scan_sources
  (market, material_slug, retailer, label, product_url, expected_unit, currency, is_active, source_type)
SELECT
  s.market,
  lower(s.market) || CASE WHEN q.kind = 'pipe' THEN '-pipe-' ELSE '-' END || q.suffix,
  s.retailer,
  s.retailer || ' search: ' || q.query,
  replace(s.url_pattern, '%s', replace(q.query, ' ', '+')),
  CASE WHEN q.kind = 'pipe' THEN 'm' ELSE 'unit' END,
  s.currency, true, 'search'
FROM src s CROSS JOIN q
WHERE NOT EXISTS (
  SELECT 1 FROM price_scan_sources p
  WHERE p.market = s.market
    AND p.material_slug = lower(s.market) || CASE WHEN q.kind = 'pipe' THEN '-pipe-' ELSE '-' END || q.suffix
    AND p.product_url = replace(s.url_pattern, '%s', replace(q.query, ' ', '+'))
);

-- ── Grants (Management API applies skip CLI defaults) ──────
DO $$
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON price_auto_apply_rules TO postgres, service_role;
  GRANT SELECT ON price_auto_apply_rules TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON estimation_prices TO service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON estimation_materials TO service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON estimation_price_history TO service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON price_scan_sources TO service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON price_scan_candidates TO service_role;
END $$;

-- ── Verification ───────────────────────────────────────────
-- Expect: 20 rules, ~171 market materials (19 x 9), one active
-- reference price per material with a live NG base, and 24 x 9
-- search sources.
SELECT 'rules' AS check, count(*) FROM price_auto_apply_rules
UNION ALL
SELECT 'market_plumbing_materials', count(*) FROM estimation_materials
  WHERE slug ~ '^[a-z]{2}(-pipe-(cold|hot|waste|drainage)|-(elbow|tee|reducer|union|valve))$'
UNION ALL
SELECT 'reference_prices', count(*) FROM estimation_prices p
  JOIN estimation_materials m ON m.id = p.ref_id
  WHERE p.origin = 'reference'
    AND m.slug ~ '^[a-z]{2}(-pipe-(cold|hot|waste|drainage)|-(elbow|tee|reducer|union|valve))$'
UNION ALL
SELECT 'search_sources', count(*) FROM price_scan_sources
  WHERE source_type = 'search';
