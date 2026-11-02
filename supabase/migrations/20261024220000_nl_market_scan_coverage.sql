-- =========================================================
-- Netherlands (NL): full weekly price-scan coverage
--
-- Completes the 12-market operational set (US UK CN AU IN NG MX
-- SA CA DE JP NL) for NL, the one target market the 2026-10-24
-- scan expansion did not cover:
--   1. Per-market auto-apply gate rule for NL
--   2. The 9 plumbing engine keys as nl-prefixed materials
--   3. FX reference prices (EUR, live NG book x indicative FX,
--      disclosed per row) for the plumbing keys AND the full
--      43-slug shared book
--   4. Dutch retailer search sources (bol.com, gamma.nl) with
--      md5-deterministic rotation groups
--
-- The weekly price-intel scan (pg_cron Mondays 06:40 UTC) then
-- keeps NL prices current automatically, exactly like the other
-- markets. Idempotent: safe to re-run.
-- =========================================================

-- ── 1. Gate rule ──────────────────────────────────────────
INSERT INTO price_auto_apply_rules (market)
VALUES ('NL')
ON CONFLICT (market) DO NOTHING;

-- ── 2. NL plumbing material shells (9 engine keys) ────────
WITH keys(kind, suffix, display, unit_word) AS (VALUES
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
  k.display || ' (NL)',
  'nl' || CASE WHEN k.kind = 'pipe' THEN '-pipe-' ELSE '-' END || k.suffix,
  'pipe',
  'Per ' || k.unit_word || '. FX reference price until the first weekly live scan replaces it; the weekly price-intel scan auto-updates this market row under reviewable gates.',
  CURRENT_DATE, true, 10
FROM keys AS k
ON CONFLICT (slug) DO NOTHING;

-- ── 3. FX reference prices from the live NG book ──────────
-- Base slugs (43, shared book) + the 9 NL plumbing slugs.
WITH ng AS (
  SELECT DISTINCT ON (m.slug) m.slug AS ng_slug, p.ref_id, p.price
  FROM estimation_materials m
  JOIN estimation_prices p
    ON p.ref_id = m.id
   AND p.price_type = 'material'
   AND p.market = 'NG'
   AND p.is_active
  WHERE m.slug IN (
    'plumb-pipe-cold','plumb-pipe-hot','plumb-pipe-waste',
    'plumb-pipe-drainage','plumb-elbow','plumb-tee',
    'plumb-reducer','plumb-union','plumb-valve',
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
), slug_map AS (
  -- plumbing keys map to nl-prefixed slugs; the 43 base slugs
  -- stay shared (NL rows attach to the same materials).
  SELECT
    CASE
      WHEN ng_slug LIKE 'plumb-%' THEN
        'nl' || CASE
          WHEN ng_slug LIKE 'plumb-pipe-%' THEN '-pipe-' || replace(ng_slug, 'plumb-pipe-', '')
          ELSE '-' || replace(ng_slug, 'plumb-', '')
        END
      ELSE ng_slug
    END AS target_slug,
    ng_slug, ref_id, price
  FROM ng
)
INSERT INTO estimation_prices
  (price_type, ref_id, price, currency, effective_date, notes, is_active,
   price_source, scan_confidence, market, origin)
SELECT
  'material',
  CASE
    WHEN sm.target_slug LIKE 'nl-%' THEN m.id
    ELSE sm.ref_id
  END,
  round(sm.price * 0.00060, 2), 'EUR', CURRENT_DATE,
  'FX reference price derived from the active NG book price (NGN ' ||
    round(sm.price::numeric, 2) || ') at an indicative 2026-10-24 rate of 0.00060 EUR/NGN. Marked reference until the weekly price-intel scan replaces it with a live local price.',
  true,
  'FX reference from the live NG book (weekly scan will replace)',
  'low', 'NL', 'reference'
FROM slug_map sm
LEFT JOIN estimation_materials m ON m.slug = sm.target_slug
WHERE ((sm.target_slug LIKE 'nl-%' AND m.id IS NOT NULL)
    OR (sm.target_slug NOT LIKE 'nl-%'))
  AND NOT EXISTS (
    SELECT 1 FROM estimation_prices p
    WHERE p.ref_id = CASE
            WHEN sm.target_slug LIKE 'nl-%' THEN m.id
            ELSE sm.ref_id
          END
      AND p.market = 'NL'
      AND p.is_active
  );

-- ── 4. Dutch retailer search sources ──────────────────────
WITH src(retailer, url_pattern) AS (VALUES
  ('bol.com','https://www.bol.com/nl/nl/s/?searchtext=%s'),
  ('gamma.nl','https://www.gamma.nl/zoeken?q=%s')
), q(slug, query, unit) AS (VALUES
  ('nl-pipe-cold','20mm PVC water pipe','m'),
  ('nl-pipe-hot','20mm PPR hot water pipe','m'),
  ('nl-pipe-waste','40mm waste pipe','m'),
  ('nl-pipe-drainage','110mm drainage pipe','m'),
  ('nl-elbow','20mm pipe elbow','unit'),
  ('nl-tee','20mm pipe tee','unit'),
  ('nl-reducer','20mm pipe reducer','unit'),
  ('nl-union','20mm pipe union','unit'),
  ('nl-valve','20mm pipe valve','unit'),
  ('gen-sandpaper-sheet','schuurpapier','unit'),
  ('hardcore-per-m3','puingrind','m3'),
  ('granite-per-trip','grind aggregate','trip'),
  ('dpm-per-m2','dampschermende folie','m2'),
  ('ridge-cap-per-meter','nokpan','m'),
  ('granite-per-m3','grind chippings','m3'),
  ('binding-wire-per-kg','binddraad','kg'),
  ('rebar-12mm-per-length','12mm wapeningsstaal','length'),
  ('timber-per-m','vuren lat 2x4','m'),
  ('acrylic-bond','acrylaat hechtprimer','unit'),
  ('rebar-25mm-per-length','25mm wapeningsstaal','length'),
  ('bituminous-membrane-roll','dakbedekking rol bitumen','roll'),
  ('sand-per-trip','zand grind zak','trip'),
  ('waterproofing-tape','waterdicht tape','roll'),
  ('rebar-16mm-per-length','16mm wapeningsstaal','length'),
  ('dpc-per-meter','dampremmende folie','m'),
  ('rebar-20mm-per-length','20mm wapeningsstaal','length'),
  ('reinforcement-per-tonne','wapeningsstaal ton','tonne'),
  ('cement-per-bag','cement 25kg zak','bag'),
  ('waterproofing-cementitious-coating','cementachtige waterdichting','bag'),
  ('block-per-piece','betonsteen','unit'),
  ('anti-fungal','anti schimmel additief','unit'),
  ('roofing-sheet-per-piece','dakpan','unit'),
  ('sand-per-m3','zand','m3'),
  ('formwork-per-m2','betonplex plaat','m2'),
  ('fascia-per-meter','gootboard','m'),
  ('elec-cable-lighting','1.5mm draden electra kabel','m'),
  ('elec-cable-socket','2.5mm electra kabel','m'),
  ('elec-cable-dedicated','6mm electra kabel','m'),
  ('elec-cable-earth','aarddraad geel groen','m'),
  ('elec-cable-feeder','hoofdvoedingskabel','m'),
  ('elec-conduit','PVC buis 20mm electra','m'),
  ('elec-junction-box','inbouwdoos','unit'),
  ('elec-breaker','installatieautomaten','unit'),
  ('elec-switch-plate','wipschakelaar','unit'),
  ('elec-socket-outlet','wandcontactdoos','unit'),
  ('elec-distribution-board','groepenkast','unit'),
  ('door-flush','binnenpaneeldeur','unit'),
  ('door-panel','paneeldeur','unit'),
  ('door-hinge','deurscharnier','unit'),
  ('door-lockset','deurslot','unit')
)
INSERT INTO price_scan_sources
  (market, material_slug, retailer, label, product_url, expected_unit,
   currency, is_active, source_type, rotation_group)
SELECT
  'NL', q.slug, s.retailer,
  s.retailer || ' search: ' || q.query,
  replace(s.url_pattern, '%s', replace(q.query, ' ', '+')),
  q.unit, 'EUR', true, 'search',
  ('x' || md5('NL' || q.slug))::bit(24)::int % 6
FROM src s CROSS JOIN q
WHERE NOT EXISTS (
  SELECT 1 FROM price_scan_sources p
  WHERE p.market = 'NL'
    AND p.material_slug = q.slug
    AND p.product_url = replace(s.url_pattern, '%s', replace(q.query, ' ', '+'))
);

-- ── Verification ───────────────────────────────────────────
SELECT 'nl_rule' AS check, count(*) FROM price_auto_apply_rules WHERE market = 'NL'
UNION ALL
SELECT 'nl_materials', count(*) FROM estimation_materials WHERE slug LIKE 'nl-%'
UNION ALL
SELECT 'nl_reference_prices', count(*) FROM estimation_prices WHERE market = 'NL' AND origin = 'reference'
UNION ALL
SELECT 'nl_search_sources', count(*) FROM price_scan_sources WHERE market = 'NL' AND source_type = 'search';
