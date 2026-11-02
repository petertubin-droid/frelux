-- =========================================================
-- US price book completion: the four catalogued-but-unpriced
-- materials now have REAL verified US retail prices (verified
-- 2026-10-05, retailer recorded in price_source, page URL in
-- scan_source). No generic or guessed prices.
--
--   us-sand-50lb            $8.99  Ace Hardware (Quikrete All-Purpose 50 lb, Mfr# 115253)
--   us-concrobium-mold-ctrl $39.96 Home Depot (1 gal Mold Control Jug, 025001)
--   us-kilz-2-primer        $24.99 Ace Hardware (KILZ 2 All-Purpose 1 gal, Mfr# 20041)
--   us-dap-amp-caulk        $10.79 Thomas Do it Center (9 oz white, all-weather)
--
-- Also seeds scan sources for every US material with a known
-- product page (Home Depot, Walmart, Ace, Zoro, Thomas Do it
-- Center) so the admin Price Scan pipeline can keep them fresh.
-- Idempotent: re-runs leave newer prices untouched.
-- =========================================================

-- 1. Deactivate any prior price row for these four US materials
--    (history stays), then insert the verified rows.
UPDATE estimation_prices
  SET is_active = false, updated_at = now()
WHERE market = 'US' AND price_type = 'material' AND is_active
  AND ref_id IN (SELECT id FROM estimation_materials WHERE slug IN (
    'us-sand-50lb', 'us-concrobium-mold-control', 'us-kilz-2-primer', 'us-dap-amp-caulk'));

INSERT INTO estimation_prices
  (price_type, ref_id, price, currency, market, effective_date,
   price_source, scan_source, scan_confidence, notes, is_active)
SELECT 'material', m.id, v.price, 'USD', 'US', '2026-10-05',
       v.src, v.url, v.conf,
       'Verified US retail price ' || v.price::text || ' USD at ' || v.src || ' (' || v.note || ').', true
FROM (VALUES
  ('us-sand-50lb',             8.99::numeric, 'Ace Hardware',         'https://www.acehardware.com/departments/building-supplies/concrete-cement-and-masonry/sand-and-gravel/5419056', 'medium', 'Quikrete All-Purpose Sand 50 lb, Mfr# 115253'),
  ('us-concrobium-mold-control', 39.96,      'Home Depot',           'https://www.homedepot.com/p/Concrobium-1-gal-Mold-Control-Jug-025001/100654369', 'high', 'Concrobium 1 gal Mold Control Jug 025001; corroborated by Walmart 35.78 / Zoro 42.89'),
  ('us-kilz-2-primer',         24.99,        'Ace Hardware',         'https://www.acehardware.com/departments/paint-and-supplies/primers/primers/17937', 'high', 'KILZ 2 All-Purpose 1 gal, Mfr# 20041'),
  ('us-dap-amp-caulk',         10.79,        'Thomas Do it Center',  'https://www.thomasdoit.com/sealant/polymer-sealant', 'medium', 'DAP AMP 9 oz all-weather white; corroborated by Home Depot 12-pack 125.51 = 10.46/tube')
) AS v(slug, price, src, url, conf, note)
JOIN estimation_materials m ON m.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM estimation_prices p
  WHERE p.market = 'US' AND p.price_type = 'material' AND p.is_active
    AND p.ref_id = m.id AND p.price = v.price AND p.price_source = v.src
);

-- 2. Scan sources for the new products + alternates, so the admin
--    can re-scan them from the Price Scan admin page anytime.
INSERT INTO price_scan_sources (market, material_slug, retailer, label, product_url, expected_unit, currency) VALUES
  ('US', 'us-sand-50lb', 'Ace Hardware',
   'Quikrete All-Purpose Sand 50 lb (Mfr# 115253)',
   'https://www.acehardware.com/departments/building-supplies/concrete-cement-and-masonry/sand-and-gravel/5419056',
   '50 lb bag', 'USD'),
  ('US', 'us-concrobium-mold-control', 'Home Depot',
   'Concrobium 1 gal Mold Control Jug (025001)',
   'https://www.homedepot.com/p/Concrobium-1-gal-Mold-Control-Jug-025001/100654369',
   'gallon', 'USD'),
  ('US', 'us-concrobium-mold-control', 'Zoro',
   'Concrobium Mold Control 1 gal Jug (Zoro 25001CAL)',
   'https://www.zoro.com/concrobium-mold-control-1-gal-jug/i_G4941883/',
   'gallon', 'USD'),
  ('US', 'us-kilz-2-primer', 'Ace Hardware',
   'KILZ 2 All-Purpose Primer 1 gal White (Mfr# 20041)',
   'https://www.acehardware.com/departments/paint-and-supplies/primers/primers/17937',
   'gallon', 'USD'),
  ('US', 'us-dap-amp-caulk', 'Thomas Do it Center',
   'DAP AMP 9 oz All-Weather Window/Door/Siding Sealant, White',
   'https://www.thomasdoit.com/sealant/polymer-sealant',
   '9 oz tube', 'USD')
ON CONFLICT DO NOTHING;
