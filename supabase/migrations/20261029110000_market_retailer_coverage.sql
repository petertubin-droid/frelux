-- Retailer coverage for the high-volume construction markets, verified 2026-10-29
-- by fetching every registered retailer's real search page from the build host.
--
-- Added, because each of these returns usable product prices today:
--   US Amazon.com, CA Amazon.ca, AU Reece, GB Homebase, CN DHgate, AE Amazon.ae
--
-- Deactivated, because the site refuses automated requests outright (Akamai /
-- Cloudflare walls, confirmed from both a server fetch and a real headless
-- browser): Home Depot US/CA/MX, Leroy Merlin FR, Bunnings AU, Coupang KR,
-- Takealot ZA, JD.com CN, Tokopedia ID, and the Amazon stores that reject this
-- host (DE, IN, IT, JP - all 503 across " + "three spaced retries while amazon.com,
-- .ca, .sa, .ae and .com.br serve normally). Re-enable a row once the retailer
-- serves a static page again or a scraping proxy is in place.

WITH src(market, currency, retailer, url_pattern) AS (VALUES
  ('US','USD','Amazon.com','https://www.amazon.com/s?k=%s'),
  ('CA','CAD','Amazon.ca','https://www.amazon.ca/s?k=%s'),
  ('AU','AUD','Reece','https://www.reece.com.au/search?q=%s'),
  ('GB','GBP','Homebase','https://www.homebase.co.uk/search?q=%s'),
  ('CN','CNY','DHgate','https://www.dhgate.com/wholesale/search.do?act=search&searchkey=%s'),
  ('AE','AED','Amazon.ae','https://www.amazon.ae/s?k=%s')
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

-- Wall confirmed: stop scanning sources that cannot ever return a price.
UPDATE price_scan_sources
   SET is_active = false
 WHERE source_type = 'search'
   AND (
     (market = 'US' AND retailer = 'Home Depot')
     OR (market = 'CA' AND retailer = 'Home Depot CA')
     OR (market = 'MX' AND retailer = 'Home Depot MX')
     OR (market = 'FR' AND retailer = 'Leroy Merlin')
     OR (market = 'AU' AND retailer = 'Bunnings')
     OR (market = 'KR' AND retailer = 'Coupang')
     OR (market = 'ZA' AND retailer = 'Takealot')
     OR (market = 'CN' AND retailer = 'JD.com')
     OR (market = 'ID' AND retailer = 'Tokopedia')
     OR (market = 'DE' AND retailer = 'Amazon.de')
     OR (market = 'IN' AND retailer = 'Amazon.in')
     OR (market = 'IT' AND retailer = 'Amazon.it')
     OR (market = 'JP' AND retailer = 'Amazon.co.jp')
   );

-- Verification
SELECT 'new_sources' AS check, count(*) FROM price_scan_sources
  WHERE retailer IN ('Amazon.com','Amazon.ca','Reece','Homebase','DHgate','Amazon.ae')
UNION ALL
SELECT 'active_sources', count(*) FROM price_scan_sources WHERE is_active
UNION ALL
SELECT 'inactive_sources', count(*) FROM price_scan_sources WHERE NOT is_active;
