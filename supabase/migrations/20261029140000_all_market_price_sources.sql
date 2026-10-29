-- Price sources for every FRELUX market, verified 2026-10-29 by fetching a real
-- search page from the build host and requiring actual product prices in the
-- response. 16 retailers added here; the ones that already worked were
-- seeded by earlier migrations.
--
-- Amazon stores answer 503 to most requests from a datacenter and serve the page
-- on a retry (amazon.com.mx/.fr/.it/.es/.nl/.se/.co.jp all did), so the scan
-- function now retries throttling statuses with backoff. Stores that answered 503
-- on every one of six spaced attempts (DE, IN, com.au, eg, co.uk) are deactivated
-- rather than left to fail weekly.
--
-- Markets still with no reachable source, reported rather than hidden:
-- EG, TZ, CI, ET, TR, NZ.

WITH src(market, currency, retailer, url_pattern) AS (VALUES
  ('CH','CHF','OBI CH','https://www.obi.ch/search/%s/'),
  ('ES','EUR','Amazon.es','https://www.amazon.es/s?k=%s'),
  ('FR','EUR','Amazon.fr','https://www.amazon.fr/s?k=%s'),
  ('ID','IDR','Lazada ID','https://www.lazada.co.id/catalog/?ajax=true&q=%s'),
  ('IN','INR','Flipkart','https://www.flipkart.com/search?q=%s'),
  ('IN','INR','IndiaMART','https://dir.indiamart.com/search.mp?ss=%s'),
  ('IT','EUR','Amazon.it','https://www.amazon.it/s?k=%s'),
  ('JP','JPY','Amazon.co.jp','https://www.amazon.co.jp/s?k=%s'),
  ('JP','JPY','MonotaRO','https://www.monotaro.com/s/?q=%s'),
  ('KR','KRW','Danawa','https://search.danawa.com/dsearch.php?query=%s'),
  ('MX','MXN','Amazon.com.mx','https://www.amazon.com.mx/s?k=%s'),
  ('NL','EUR','Amazon.nl','https://www.amazon.nl/s?k=%s'),
  ('PL','PLN','OBI PL','https://www.obi.pl/search/%s/'),
  ('SE','SEK','Amazon.se','https://www.amazon.se/s?k=%s'),
  ('SG','SGD','Lazada SG','https://www.lazada.sg/catalog/?ajax=true&q=%s'),
  ('ZA','ZAR','Amazon.co.za','https://www.amazon.co.za/s?k=%s')
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
  ('x' || md5(s.market || q.slug || s.retailer))::bit(24)::int % 6
FROM src s CROSS JOIN q
WHERE NOT EXISTS (
  SELECT 1 FROM price_scan_sources p
  WHERE p.market = s.market
    AND p.material_slug = q.slug
    AND p.product_url = replace(s.url_pattern, '%s', replace(q.query, ' ', '+'))
);

UPDATE price_scan_sources
   SET is_active = false
 WHERE is_active
   AND retailer IN ('Home Depot', 'Home Depot CA', 'Home Depot MX', 'Leroy Merlin', 'Bunnings', 'Coupang', 'Takealot', 'JD.com', 'Tokopedia', 'Amazon.de', 'Amazon.in', 'Amazon.com.au', 'Amazon.eg', 'Amazon.co.uk', 'Gmarket', '11st', 'Allegro', 'Trendyol', 'Hepsiburada', 'Mitre 10 NZ', 'The Warehouse', 'Karwei', 'Gamma', 'Praxis');

SELECT 'active_sources' AS check, count(*) FROM price_scan_sources WHERE is_active
UNION ALL
SELECT 'markets_with_active_sources', count(DISTINCT market) FROM price_scan_sources WHERE is_active;
