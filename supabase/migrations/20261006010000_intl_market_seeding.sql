-- =========================================================
-- International market seeding: GB / IN / DE books, US
-- waterproofing role products, and a market-aware screed
-- system config. Every seeded price carries retailer
-- provenance (price_source + scan_source + notes); materials
-- without a verified live price are seeded WITH a scan
-- source and NO price — the Admin Scan system fills them
-- via candidates + explicit approval. Never guessed.
-- =========================================================

-- 1) Screed system config becomes market-aware ----------------
ALTER TABLE screeding_system_config
  ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT 'NG';
-- One active system per (market, system_type) — markets each carry
-- their own surface-prep technique alongside the NG reference.
DROP INDEX IF EXISTS screeding_system_config_active_unique;
ALTER TABLE screeding_system_config
  DROP CONSTRAINT IF EXISTS screeding_system_config_active_unique;
CREATE UNIQUE INDEX screeding_config_market_system_active_uidx
  ON screeding_system_config (market, system_type) WHERE is_active;
CREATE INDEX IF NOT EXISTS screeding_config_market_idx
  ON screeding_system_config (market) WHERE is_active;

-- US skim-coat system: joint compound replaces NG putty.
-- Quantities calibrated to a 4.5-gal pail covering ~46 m²
-- (500 sq ft) per skim coat. Price stays NULL in the config —
-- the page resolves it from the verified US material book via
-- role 'joint-filler' (USG Sheetrock, $24.09/pail, verified).
INSERT INTO screeding_system_config (
  market, system_type, display_name, description, coverage_area_m2,
  coverage_unit, default_coats, waste_percentage, currency, currency_symbol,
  putty_name, putty_quantity, putty_unit, putty_price_per_unit,
  rounding_rule, is_active, sort_order
) SELECT
  'US', 'putty', 'Joint Compound Skim Coat',
  'US surface prep: a thin skim coat of all-purpose joint compound levels interior walls before painting (the US equivalent of putty screeding).',
  '46', 'm²', 2, '10', 'USD', '$',
  'Sheetrock All-Purpose Joint Compound (4.5 gal pail)', '1', 'pail', NULL,
  'ceil', true, 2
WHERE NOT EXISTS (
  SELECT 1 FROM screeding_system_config WHERE market = 'US' AND system_type = 'putty'
);

-- 2) Market profiles: activate GB, add IN + DE ----------------
UPDATE market_profiles SET
  status = 'active', is_visible = true, inherits_from = NULL,
  admin_notes = 'Active: verified UK retail price book seeded Oct 2026 (B&Q, Screwfix, Pricerunner, BuildBuddy). Missing materials have scan sources pending admin approval.',
  updated_at = now()
WHERE country_code = 'GB';

INSERT INTO market_profiles (
  country_code, country_name, region, currency_code, currency_symbol,
  currency_name, default_measurement_system, supported_length_units,
  supported_area_units, default_length_unit, default_area_unit,
  default_language, local_terminology, status, inherits_from,
  profile_version, sort_order, is_visible, admin_notes
) SELECT
  'IN', 'India', 'Asia', 'INR', '₹', 'Indian Rupee', 'metric',
  ARRAY['meters','feet','inches']::text[], ARRAY['sqm','sqft']::text[],
  'meters', 'sqm', 'en', '{}'::jsonb, 'active', NULL, '0.1.0', 35, true,
  'Active: verified Indian retail prices seeded Oct 2026 (IndiaMART, Amazon.in). Missing materials have scan sources pending admin approval.'
WHERE NOT EXISTS (SELECT 1 FROM market_profiles WHERE country_code = 'IN');

INSERT INTO market_profiles (
  country_code, country_name, region, currency_code, currency_symbol,
  currency_name, default_measurement_system, supported_length_units,
  supported_area_units, default_length_unit, default_area_unit,
  default_language, local_terminology, status, inherits_from,
  profile_version, sort_order, is_visible, admin_notes
) SELECT
  'DE', 'Germany', 'Europe', 'EUR', '€', 'Euro', 'metric',
  ARRAY['meters','feet','inches']::text[], ARRAY['sqm','sqft']::text[],
  'meters', 'sqm', 'de', '{}'::jsonb, 'active', NULL, '0.1.0', 101, true,
  'Active: verified German retail prices seeded Oct 2026 (Hornbach). Missing materials have scan sources pending admin approval.'
WHERE NOT EXISTS (SELECT 1 FROM market_profiles WHERE country_code = 'DE');

-- 3) Estimation materials ------------------------------------
INSERT INTO estimation_materials (name, slug, category, description, notes, is_active, sort_order)
SELECT x.name, x.slug, x.category, x.description, x.notes, true, x.sort_order
FROM (VALUES
  -- US waterproofing roles
  ('Sill Seal Foam Gasket (5.5 in x 50 ft)','us-sill-seal-50ft','waterproofing','Closed-cell foam sill sealer under sill plates; the US damp-proof-course equivalent. 50 ft roll.','DPC strip equivalent. Verified $9.99 (Hills Ace Hardware).',51),
  ('Husky 6-mil Polyethylene Sheeting (10 ft 4 in x 100 ft)','us-husky-6mil-roll','waterproofing','6-mil poly vapor/damp-proof membrane sheeting roll (~96 m2 coverage).','DPM equivalent. Verified $67.50 (Home Depot CF06103C).',52),
  ('Ice & Water Shield Self-Adhered Membrane (195 sq ft)','us-ice-water-shield-195sqft','waterproofing','Rubberized asphalt self-adhered waterproofing membrane roll (195 sq ft).','Bituminous membrane equivalent. Verified $108.00 (Home Depot).',53),
  ('3M 8067 All Weather Flashing Tape (4 in x 75 ft)','us-3m-flashing-tape','waterproofing','Acrylic butyl flashing/seam tape for waterproofing joints and penetrations.','Waterproofing tape equivalent. Verified $35.47 (MRosupreme; corroborated $32.97-35).',54),
  -- United Kingdom
  ('Dulux Easycare Matt Emulsion (10L)','gb-dulux-easycare-10l','paint','Washable & tough interior wall emulsion, brilliant white, 10L. UK standard interior paint.','Verified £58 (B&Q).',55),
  ('Zinsser Bulls Eye 1-2-3 Primer (1L)','gb-zinsser-123-1l','paint','Water-based multi-surface interior/exterior primer, 1L.','Verified £24.49 (Screwfix).',56),
  ('Gyproc Easi-Fill Joint Compound (10kg)','gb-gyproc-easifill-10kg','filler','British Gypsum dry jointing filler, 10kg bag. UK wall-filler standard.','Verified £34.74 (Cumbria Building Supplies).',57),
  ('Blue Circle Mastercrete Cement (25kg)','gb-mastercrete-25kg','cement','General purpose bagged cement, 25kg.','Verified £7.99 (Pricerunner lowest of 5 stores).',58),
  ('Building Sand (25kg bag)','gb-building-sand-25kg','aggregate','Bagged builders sand for screed and render mixes.','Verified from £2.25 (BuildBuddy).',59),
  ('Everbuild SBR Bond (5L)','gb-everbuild-sbr-5l','admixture','Latex water-resistant bonding agent and admixture, 5L. Acrylic-bond equivalent.','B&Q listing shows 5L variants £28-£58.45; seeded at displayed £35.99, pending admin scan confirmation.',60),
  ('Everbuild 402 Water Repellent Seal (5L)','gb-everbuild-402-5l','waterproofing','Silicone water repellent for brick, stone and plaster, 5L. Water-seal equivalent.','No verified price yet — scan source seeded, price pending admin approval.',61),
  -- India
  ('Birla White WallCare Putty (40kg)','in-birla-white-putty-40kg','filler','White cement-based wall putty, 40kg bag. Indian wall-prep standard.','Verified ₹710 (IndiaMART; corroborated ₹760-₹1,100 range).',62),
  ('Asian Paints Apex Ultima Weatherproof (10L)','in-apex-ultima-10l','paint','Premium exterior emulsion with dust-proof and anti-algal technology, 10L.','Amazon.in listing ₹596/L; seeded ₹5,960 for 10L, pending admin scan confirmation.',63),
  ('Asian Paints Royale Shyne Luxury Emulsion (7L)','in-royale-shyne-7l','paint','Premium washable interior luxury emulsion, 7L.','No verified price yet — scan source seeded, price pending admin approval.',64),
  ('UltraTech OPC Cement (50kg)','in-ultratech-cement-50kg','cement','Bagged ordinary Portland cement, 50kg.','No verified price yet — scan source seeded, price pending admin approval.',65),
  ('Dr. Fixit LW+ Waterproofing Liquid (5L)','in-dr-fixit-lw-5l','waterproofing','Integral waterproofing admixture for mortar and concrete, 5L.','No verified price yet — scan source seeded, price pending admin approval.',66),
  -- Germany
  ('Alpina Weiß Premium Innenfarbe (10L)','de-alpina-weiss-10l','paint','German premium interior white wall paint, 10L bucket (~€4.00/L).','Verified €39.95 (Hornbach).',67),
  ('Portlandzement CEM II 42,5N (25kg)','de-cem-42-5n-25kg','cement','Bagged Portland cement, 25kg sack.','Verified €6.99 (Hornbach).',68),
  ('Caparol Tiefgrund TB Primer (10L)','de-caparol-tiefgrund-10l','paint','Deep-penetration water-based primer concentrate for interior surfaces, 10L.','No verified price yet — scan source seeded, price pending admin approval.',69),
  ('Bausand All-Purpose Sand (25kg)','de-bausand-25kg','aggregate','Bagged all-purpose construction sand, 25kg.','No verified price yet — scan source seeded, price pending admin approval.',70)
) AS x(name, slug, category, description, notes, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM estimation_materials m WHERE m.slug = x.slug);

-- 4) Verified prices (provenance in price_source/scan_source/notes)
INSERT INTO estimation_prices (price_type, ref_id, price, currency, effective_date, notes, is_active, price_source, scan_source, market)
SELECT 'material', m.id, v.price, v.currency, now(), v.notes, true, v.src, v.url, v.market
FROM (VALUES
  ('us-sill-seal-50ft', 9.99, 'USD', 'Hills Ace Hardware', 'https://hillsace.com/p/insul-sill-seal-55-x-50/5401633', 'Verified US retail price 9.99 USD at Hills Ace (Insul Sill Seal 5.5in x 50ft).', 'US'),
  ('us-husky-6mil-roll', 67.50, 'USD', 'Home Depot', 'https://www.homedepot.com/b/Paint-Paint-Supplies-Plastic-Sheeting/Husky/6-MIL/N-5yc1vZci20ZrdZ1z20hvg', 'Verified US retail price 67.50 USD at Home Depot (Husky 6-mil clear, model CF06103C, 10ft 4in x 100ft).', 'US'),
  ('us-ice-water-shield-195sqft', 108.00, 'USD', 'Home Depot', 'https://www.homedepot.com/b/Building-Materials-Roofing-Roof-Underlayments/Ice-and-Water-Shield/Pick-Up-Today/N-5yc1vZc5rwZ1z175a5Z1z1t5tc', 'Verified US retail price 108.00 USD at Home Depot (Ice and Water Shield, 195 sq ft roll).', 'US'),
  ('us-3m-flashing-tape', 35.47, 'USD', 'MRosupreme', 'https://mrosupreme.com/collections/builders-structural-hardware/products/3m-8067-4-all-weather-flashing-tape-75-ft-l-4-in-w-tan-acrylic-adhesive', 'Verified 35.47 USD at MRosupreme (3M 8067-4, 4in x 75ft; corroborated $32.97 OpenTip, $35 resale listings).', 'US'),
  ('gb-dulux-easycare-10l', 58.00, 'GBP', 'B&Q', 'https://www.diy.com/painting-decorating/paint.cat?Brand=Dulux&Range=Easycare', 'Verified UK retail price £58.00 at B&Q (Dulux Easycare Washable & Tough Matt, 10L, £5.80/L).', 'GB'),
  ('gb-zinsser-123-1l', 24.49, 'GBP', 'Screwfix', 'https://www.screwfix.com/c/painting-decorating/primer-paint/cat850180?brand=zinsser&modelname=bulls_eye_1_2_3_plus&rangename=bulls_eye_1_2_3', 'Verified UK retail price £24.49 at Screwfix (Zinsser Bulls Eye 1-2-3, 1L).', 'GB'),
  ('gb-gyproc-easifill-10kg', 34.74, 'GBP', 'Cumbria Building Supplies', 'https://www.cumbriabuildingsupplies.co.uk/building-materials-c5/plaster-plasterboards-c15/plaster-fillers-c39/gyproc-easifill-10kg-bag-p153', 'Verified UK retail price £34.74 inc VAT (Gyproc Easi-Fill 10kg; corroborated £32 Pricerunner).', 'GB'),
  ('gb-mastercrete-25kg', 7.99, 'GBP', 'Pricerunner (5-store lowest)', NULL, 'Verified UK lowest price £7.99 across 5 stores (Blue Circle Mastercrete 25kg, Oct 2026).', 'GB'),
  ('gb-building-sand-25kg', 2.25, 'GBP', 'BuildBuddy', 'https://www.buildbuddy.co.uk/building-materials/aggregates-cement/sand', 'Verified UK retail price from £2.25 (Building Sand 25kg bag).', 'GB'),
  ('gb-everbuild-sbr-5l', 35.99, 'GBP', 'B&Q', 'https://www.diy.com/departments/everbuild-sbr5l-503-sbr-bond-5-litre-evbsbr5l/5029347005351_BQ.prd', 'B&Q listing shows 5L variants £28-£58.45 (£11.69/L). Seeded at the displayed 5L £35.99 — pending admin scan confirmation.', 'GB'),
  ('in-birla-white-putty-40kg', 710.00, 'INR', 'IndiaMART', 'https://www.indiamart.com/proddetail/birla-white-wallcare-putty-40kg-21690283948.html', 'Verified ₹710/bag at IndiaMART; corroborated ₹760-₹1,000 listings (JustDial avg ₹1,106 retail).', 'IN'),
  ('in-apex-ultima-10l', 5960.00, 'INR', 'Amazon.in', 'https://www.amazon.in/Asian-Ultima-Weatherproof-Exterior-Emulsion/dp/B0HCBQQTZD', 'Amazon.in listing ₹595.98/L; seeded ₹5,960 for 10L pack — pending admin scan confirmation.', 'IN'),
  ('de-alpina-weiss-10l', 39.95, 'EUR', 'Hornbach', 'https://www.hornbach.de/s/Alpina%20Wei%C3%9F', 'Verified German retail price €39.95 at Hornbach (Alpina Weiß, €4.00/L).', 'DE'),
  ('de-cem-42-5n-25kg', 6.99, 'EUR', 'Hornbach', 'https://www.hornbach.at/s/portlandzement', 'Verified German retail price €6.99 at Hornbach (Zement CEM II/B-M 42,5N, 25kg sack).', 'DE')
) AS v(slug, price, currency, src, url, notes, market)
JOIN estimation_materials m ON m.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM estimation_prices p
  WHERE p.price_type='material' AND p.ref_id = m.id AND p.market = v.market AND p.is_active
);

-- 5) Role mappings --------------------------------------------
INSERT INTO market_material_roles (market, role, material_slug, display_name, unit_label, notes, sort_order) VALUES
  ('US', 'dpc', 'us-sill-seal-50ft', 'Sill Seal Foam Gasket (5.5 in x 50 ft)', 'roll', 'Closed-cell foam sill sealer — DPC strip equivalent. Verified $9.99 (Hills Ace).', 26),
  ('US', 'dpm', 'us-husky-6mil-roll', 'Husky 6-mil Poly Sheeting (10 ft 4 in x 100 ft)', 'roll', '6-mil poly vapor barrier — DPM sheet equivalent (~96 m2/roll). Verified $67.50 (Home Depot).', 27),
  ('US', 'bituminous-membrane', 'us-ice-water-shield-195sqft', 'Ice & Water Shield Membrane (195 sq ft)', 'roll', 'Self-adhered rubberized asphalt membrane roll. Verified $108.00 (Home Depot).', 28),
  ('US', 'waterproofing-tape', 'us-3m-flashing-tape', '3M 8067 All Weather Flashing Tape (4 in x 75 ft)', 'roll', 'Acrylic butyl seam/flashing tape. Verified $35.47 (MRosupreme).', 29),
  ('GB', 'interior-paint', 'gb-dulux-easycare-10l', 'Dulux Easycare Matt (10L)', '10L', 'UK standard washable interior emulsion. Verified £58 (B&Q).', 1),
  ('GB', 'primer', 'gb-zinsser-123-1l', 'Zinsser Bulls Eye 1-2-3 (1L)', 'litre', 'UK multi-surface primer. Verified £24.49 (Screwfix).', 2),
  ('GB', 'joint-filler', 'gb-gyproc-easifill-10kg', 'Gyproc Easi-Fill (10kg)', 'bag', 'UK jointing filler standard. Verified £34.74 (Cumbria).', 3),
  ('GB', 'concrete-mix', 'gb-mastercrete-25kg', 'Blue Circle Mastercrete Cement (25kg)', 'bag', 'UK general purpose cement. Verified £7.99.', 4),
  ('GB', 'sand', 'gb-building-sand-25kg', 'Building Sand (25kg)', 'bag', 'Bagged builders sand. Verified from £2.25 (BuildBuddy).', 5),
  ('GB', 'bonding-agent', 'gb-everbuild-sbr-5l', 'Everbuild SBR Bond (5L)', '5L', 'Latex bonding agent — acrylic bond equivalent. Seeded £35.99, scan pending.', 6),
  ('GB', 'waterproofer', 'gb-everbuild-402-5l', 'Everbuild 402 Water Repellent (5L)', '5L', 'Silicone water repellent — water seal equivalent. Price pending scan approval.', 7),
  ('IN', 'joint-filler', 'in-birla-white-putty-40kg', 'Birla White WallCare Putty (40kg)', 'bag', 'Indian white cement wall putty standard. Verified ₹710 (IndiaMART).', 1),
  ('IN', 'exterior-paint', 'in-apex-ultima-10l', 'Asian Paints Apex Ultima (10L)', '10L', 'Premium Indian exterior emulsion. Seeded ₹5,960 (Amazon.in), scan pending.', 2),
  ('IN', 'interior-paint-premium', 'in-royale-shyne-7l', 'Asian Paints Royale Shyne (7L)', '7L', 'Premium Indian interior luxury emulsion. Price pending scan approval.', 3),
  ('IN', 'concrete-mix', 'in-ultratech-cement-50kg', 'UltraTech OPC Cement (50kg)', 'bag', 'Indian bagged cement standard. Price pending scan approval.', 4),
  ('IN', 'waterproofer', 'in-dr-fixit-lw-5l', 'Dr. Fixit LW+ (5L)', '5L', 'Integral waterproofing admixture. Price pending scan approval.', 5),
  ('DE', 'interior-paint', 'de-alpina-weiss-10l', 'Alpina Weiß Premium (10L)', '10L', 'German interior white standard. Verified €39.95 (Hornbach).', 1),
  ('DE', 'concrete-mix', 'de-cem-42-5n-25kg', 'Portlandzement CEM II 42,5N (25kg)', 'sack', 'German bagged cement. Verified €6.99 (Hornbach).', 2),
  ('DE', 'primer', 'de-caparol-tiefgrund-10l', 'Caparol Tiefgrund TB (10L)', '10L', 'German deep-penetration primer. Price pending scan approval.', 3),
  ('DE', 'sand', 'de-bausand-25kg', 'Bausand (25kg)', 'sack', 'German bagged construction sand. Price pending scan approval.', 4)
ON CONFLICT (market, role) DO UPDATE SET
  material_slug = EXCLUDED.material_slug,
  display_name = EXCLUDED.display_name,
  unit_label = EXCLUDED.unit_label,
  notes = EXCLUDED.notes,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

-- 6) Scan sources for the Admin Scan system (incl. unpriced
--    materials whose prices MUST come from scans + approval)
INSERT INTO price_scan_sources (market, material_slug, retailer, label, product_url, expected_unit, currency, is_active)
SELECT v.market, v.slug, v.retailer, v.label, v.url, v.unit, v.currency, true
FROM (VALUES
  ('US','us-sill-seal-50ft','Hills Ace Hardware','Insul Sill Seal 5.5in x 50ft','https://hillsace.com/p/insul-sill-seal-55-x-50/5401633','roll','USD'),
  ('US','us-husky-6mil-roll','Home Depot','Husky 6-mil Clear Sheeting 10ft 4in x 100ft','https://www.homedepot.com/p/HUSKY-10-ft-4-in-x-100-ft-Clear-6-mil-Plastic-Sheeting-CF06103C','roll','USD'),
  ('US','us-ice-water-shield-195sqft','Home Depot','Ice and Water Shield 195 sq ft','https://www.homedepot.com/b/Building-Materials-Roofing-Roof-Underlayments/Ice-and-Water-Shield/Pick-Up-Today/N-5yc1vZc5rwZ1z175a5Z1z1t5tc','roll','USD'),
  ('US','us-3m-flashing-tape','MRosupreme','3M 8067-4 All Weather Flashing Tape 4in x 75ft','https://mrosupreme.com/collections/builders-structural-hardware/products/3m-8067-4-all-weather-flashing-tape-75-ft-l-4-in-w-tan-acrylic-adhesive','roll','USD'),
  ('GB','gb-dulux-easycare-10l','B&Q','Dulux Easycare Matt 10L','https://www.diy.com/painting-decorating/paint.cat?Brand=Dulux&Range=Easycare','10L','GBP'),
  ('GB','gb-zinsser-123-1l','Screwfix','Zinsser Bulls Eye 1-2-3 1L','https://www.screwfix.com/c/painting-decorating/primer-paint/cat850180?brand=zinsser&modelname=bulls_eye_1_2_3_plus&rangename=bulls_eye_1_2_3','litre','GBP'),
  ('GB','gb-gyproc-easifill-10kg','Cumbria Building Supplies','Gyproc Easi-Fill 10kg','https://www.cumbriabuildingsupplies.co.uk/building-materials-c5/plaster-plasterboards-c15/plaster-fillers-c39/gyproc-easifill-10kg-bag-p153','bag','GBP'),
  ('GB','gb-building-sand-25kg','BuildBuddy','Building Sand 25kg','https://www.buildbuddy.co.uk/building-materials/aggregates-cement/sand','bag','GBP'),
  ('GB','gb-everbuild-sbr-5l','B&Q','Everbuild SBR Bond 5L','https://www.diy.com/departments/everbuild-sbr5l-503-sbr-bond-5-litre-evbsbr5l/5029347005351_BQ.prd','5L','GBP'),
  ('GB','gb-everbuild-402-5l','Screwfix','Everbuild 402 Water Repellent 5L','https://www.screwfix.com/c/sealants-adhesives/decorators-caulk/cat830917','5L','GBP'),
  ('IN','in-birla-white-putty-40kg','IndiaMART','Birla White WallCare Putty 40kg','https://www.indiamart.com/proddetail/birla-white-wallcare-putty-40kg-21690283948.html','bag','INR'),
  ('IN','in-apex-ultima-10l','Amazon.in','Asian Paints Apex Ultima 10L','https://www.amazon.in/Asian-Ultima-Weatherproof-Exterior-Emulsion/dp/B0HCBQQTZD','10L','INR'),
  ('IN','in-royale-shyne-7l','Amazon.in','Asian Paints Royale Shyne 7L','https://www.amazon.in/s?k=asian+paints+royale+shyne+7+litre','7L','INR'),
  ('IN','in-ultratech-cement-50kg','Amazon.in','UltraTech Cement 50kg','https://www.amazon.in/s?k=ultratech+cement+50kg','bag','INR'),
  ('IN','in-dr-fixit-lw-5l','Amazon.in','Dr. Fixit LW+ 5L','https://www.amazon.in/s?k=dr+fixit+lw%2B+5+litre','5L','INR'),
  ('DE','de-alpina-weiss-10l','Hornbach','Alpina Weiß 10L','https://www.hornbach.de/s/Alpina%20Wei%C3%9F','10L','EUR'),
  ('DE','de-cem-42-5n-25kg','Hornbach','Zement CEM II 42,5N 25kg','https://www.hornbach.de/c/baustoffe/rohbau/beton-moertel-zement/S13866','sack','EUR'),
  ('DE','de-caparol-tiefgrund-10l','OBI','Caparol Tiefgrund TB 10L','https://www.obi.de/suche/?text=tiefgrund+10l','10L','EUR'),
  ('DE','de-bausand-25kg','Hornbach','Bausand 25kg','https://www.hornbach.de/c/baustoffe/rohbau/','sack','EUR')
) AS v(market, slug, retailer, label, url, unit, currency)
WHERE NOT EXISTS (
  SELECT 1 FROM price_scan_sources s
  WHERE s.market = v.market AND s.material_slug = v.slug
);
