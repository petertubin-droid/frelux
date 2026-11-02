-- =========================================================
-- All-material-family weekly scan coverage
--
-- Extends the weekly auto price scan (pg_cron Mondays 06:40 UTC,
-- price-intel-scan) beyond plumbing to EVERY shared estimation
-- material family in FRELUX: prep, cement, aggregates, masonry,
-- steel/rebar, timber, formwork, waterproofing, roofing, doors
-- and windows, additives/binders/sealers, and electrical.
--
--   1. Existing material prices become auto-updatable: material
--      rows flip origin manual -> scan so the weekly gates can
--      refresh them within bounds. product/quality rows (paint
--      types and qualities, admin-tuned) STAY manual. An admin
--      can pin any single price again by setting origin='manual'.
--   2. Per-market reference prices for all 43 base book slugs x
--      19 non-NG markets, derived from the LIVE NG book at apply
--      time x indicative FX (disclosed per row, origin=
--      'reference'), guarded so existing verified rows survive.
--   3. Search sources: 20 markets x 43 slugs with curated retail
--      queries, each assigned a rotation_group (md5-determined,
--      deterministic) so the weekly run scans a bounded subset;
--      every material refreshes at least once per 6-week cycle.
--
-- Idempotent: safe to re-run.
-- =========================================================

-- ── 1. Existing material rows become scan-refreshable ─────
-- Admin override protection is restored per-row by setting
-- origin='manual'; history rows keep every prior value.
UPDATE estimation_prices
   SET origin = 'scan'
 WHERE price_type = 'material'
   AND origin = 'manual';

-- ── 2. Rotation groups on sources ─────────────────────────
ALTER TABLE price_scan_sources
  ADD COLUMN IF NOT EXISTS rotation_group integer NOT NULL DEFAULT 0;

-- Deterministic spread across 6 groups for ALL search sources,
-- including the plumbing set from 20261024070000.
UPDATE price_scan_sources
   SET rotation_group = ('x' || md5(market || material_slug))::bit(24)::int % 6
 WHERE source_type = 'search';

-- ── 3. Reference prices for the full shared book ──────────
-- Base slugs = the shared estimation materials every market's
-- book resolves through (no market prefix). NG is the reference
-- base itself, so only 19 markets are seeded.
WITH ng AS (
  SELECT DISTINCT ON (m.slug) m.slug AS ng_slug, p.ref_id, p.price
  FROM estimation_materials m
  JOIN estimation_prices p
    ON p.ref_id = m.id
   AND p.price_type = 'material'
   AND p.market = 'NG'
   AND p.is_active
  WHERE m.slug IN (
    'gen-sandpaper-sheet','hardcore-per-m3','granite-per-trip',
    'dpm-per-m2','ridge-cap-per-meter','granite-per-m3',
    'binding-wire-per-kg','rebar-12mm-per-length','timber-per-m',
    'acrylic-bond','rebar-25mm-per-length','bituminous-membrane-roll',
    'sand-per-trip','waterproofing-tape','rebar-16mm-per-length',
    'dpc-per-meter','rebar-20mm-per-length','reinforcement-per-tonne',
    'cement-per-bag','waterproofing-cementitious-coating',
    'block-per-piece','anti-fungal','roofing-sheet-per-piece',
    'sand-per-m3','formwork-per-m2','fascia-per-meter',
    'elec-cable-lighting','elec-cable-socket','elec-cable-dedicated',
    'elec-cable-earth','elec-cable-feeder','elec-conduit',
    'elec-junction-box','elec-breaker','elec-switch-plate',
    'elec-socket-outlet','elec-distribution-board','door-flush',
    'door-panel','door-hinge','door-lockset'
  )
  ORDER BY m.slug, p.effective_date DESC, p.created_at DESC
), fx(market, rate, currency) AS (VALUES
  ('US', 0.00065, 'USD'), ('GB', 0.00048, 'GBP'), ('CA', 0.00089, 'CAD'),
  ('AU', 0.00098, 'AUD'), ('DE', 0.00060, 'EUR'), ('IN', 0.056,  'INR'),
  ('GH', 0.0064, 'GHS'),  ('KE', 0.0078, 'KES'),  ('ZA', 0.019,  'ZAR'),
  ('JP', 0.098,  'JPY'),  ('FR', 0.00060, 'EUR'), ('BR', 0.0037, 'BRL'),
  ('SA', 0.0024, 'SAR'),  ('AE', 0.0024, 'AED'),  ('CN', 0.0046, 'CNY'),
  ('ID', 10.4,   'IDR'),  ('MX', 0.0125, 'MXN'),   ('KR', 0.88,   'KRW'),
  ('IT', 0.00060, 'EUR')
)
INSERT INTO estimation_prices
  (price_type, ref_id, price, currency, effective_date, notes, is_active,
   price_source, scan_confidence, market, origin)
SELECT
  'material', ng.ref_id,
  round(ng.price * fx.rate, 2), fx.currency, CURRENT_DATE,
  'FX reference price derived from the active NG book price (NGN ' ||
    round(ng.price::numeric, 2) || ') at an indicative 2026-10-24 rate of ' ||
    fx.rate || ' ' || fx.currency || '/NGN. Marked reference until the weekly price-intel scan replaces it with a live local price.',
  true,
  'FX reference from the live NG book (weekly scan will replace)',
  'low', fx.market, 'reference'
FROM ng
CROSS JOIN fx
WHERE NOT EXISTS (
  SELECT 1 FROM estimation_prices p
  WHERE p.ref_id = ng.ref_id AND p.market = fx.market AND p.is_active
);

-- ── 4. Search sources for every family x market ───────────
WITH src(market, currency, retailer, url_pattern) AS (VALUES
  ('NG','NGN','Jumia','https://www.jumia.com.ng/catalog/?q=%s'),
  ('GH','GHS','Jumia','https://www.jumia.com.gh/catalog/?q=%s'),
  ('KE','KES','Jumia','https://www.jumia.co.ke/catalog/?q=%s'),
  ('US','USD','Home Depot','https://www.homedepot.com/s/%s'),
  ('GB','GBP','Wickes','https://www.wickes.co.uk/search?text=%s'),
  ('CA','CAD','Home Depot CA','https://www.homedepot.ca/en/search?q=%s'),
  ('AU','AUD','Bunnings','https://www.bunnings.com.au/search/products?query=%s'),
  ('DE','EUR','OBI','https://www.obi.de/search/text/%s'),
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
), q(slug, query, unit) AS (VALUES
  ('gen-sandpaper-sheet','sandpaper sheets','unit'),
  ('hardcore-per-m3','hardcore aggregate','m3'),
  ('granite-per-trip','granite aggregate','trip'),
  ('dpm-per-m2','damp proof membrane','m2'),
  ('ridge-cap-per-meter','ridge cap','m'),
  ('granite-per-m3','granite chippings','m3'),
  ('binding-wire-per-kg','binding wire','kg'),
  ('rebar-12mm-per-length','12mm rebar','length'),
  ('timber-per-m','2x4 timber plank','m'),
  ('acrylic-bond','acrylic bonding agent','unit'),
  ('rebar-25mm-per-length','25mm rebar','length'),
  ('bituminous-membrane-roll','bituminous membrane roll','roll'),
  ('sand-per-trip','sharp sand','trip'),
  ('waterproofing-tape','waterproofing tape','roll'),
  ('rebar-16mm-per-length','16mm rebar','length'),
  ('dpc-per-meter','DPC roll','m'),
  ('rebar-20mm-per-length','20mm rebar','length'),
  ('reinforcement-per-tonne','reinforcement steel bar','tonne'),
  ('cement-per-bag','cement 50kg bag','bag'),
  ('waterproofing-cementitious-coating','cementitious waterproofing coating','bag'),
  ('block-per-piece','9 inch concrete block','unit'),
  ('anti-fungal','anti fungal additive','unit'),
  ('roofing-sheet-per-piece','roofing sheet','unit'),
  ('sand-per-m3','sharp sand','m3'),
  ('formwork-per-m2','plywood formwork sheet','m2'),
  ('fascia-per-meter','fascia board','m'),
  ('elec-cable-lighting','1.5mm twin and earth cable','m'),
  ('elec-cable-socket','2.5mm twin and earth cable','m'),
  ('elec-cable-dedicated','6mm twin and earth cable','m'),
  ('elec-cable-earth','earth cable green yellow','m'),
  ('elec-cable-feeder','sub main feeder cable','m'),
  ('elec-conduit','PVC conduit 20mm','m'),
  ('elec-junction-box','electrical junction box','unit'),
  ('elec-breaker','MCB circuit breaker','unit'),
  ('elec-switch-plate','light switch plate','unit'),
  ('elec-socket-outlet','socket outlet','unit'),
  ('elec-distribution-board','distribution board','unit'),
  ('door-flush','flush door','unit'),
  ('door-panel','panel door','unit'),
  ('door-hinge','door hinge','unit'),
  ('door-lockset','door lockset','unit')
)
INSERT INTO price_scan_sources
  (market, material_slug, retailer, label, product_url, expected_unit,
   currency, is_active, source_type, rotation_group)
SELECT
  s.market, q.slug, s.retailer,
  s.retailer || ' search: ' || q.query,
  replace(s.url_pattern, '%s', replace(q.query, ' ', '+')),
  q.unit, s.currency, true, 'search',
  ('x' || md5(s.market || q.slug))::bit(24)::int % 6
FROM src s CROSS JOIN q
WHERE NOT EXISTS (
  SELECT 1 FROM price_scan_sources p
  WHERE p.market = s.market
    AND p.material_slug = q.slug
    AND p.product_url = replace(s.url_pattern, '%s', replace(q.query, ' ', '+'))
);

-- ── Verification ───────────────────────────────────────────
-- Expect: 43 x 19 reference prices max (fewer where a market
-- already has a row); ~860 new search sources; all search
-- sources spread over rotation groups 0-5.
SELECT 'reference_rows' AS check, count(*) FROM estimation_prices
  WHERE origin = 'reference'
UNION ALL
SELECT 'search_sources', count(*) FROM price_scan_sources
  WHERE source_type = 'search'
UNION ALL
SELECT 'origin_scan_rows', count(*) FROM estimation_prices
  WHERE origin = 'scan' AND price_type = 'material';
