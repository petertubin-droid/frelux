-- ICF and EIFS: close the GB gaps, queue the roles retail will not price.
--
-- 20261119150000 mapped GB 5 of 9 roles and AU 4 of 9. The four GB roles still
-- missing (concrete, rebar, finish, primer) and the five AU ones (form block,
-- concrete, adhesive, finish, primer) are what this migration addresses.
--
-- Three GB roles are closed here with retailer-listed prices, converted to the
-- unit each role prices in, with the page recorded:
--
--   GB  icf-rebar     Travis Perkins ROM T12 6 m x 12 mm, GBP 27.53 ex VAT per
--                     bar at 0.888 kg/m (5.328 kg) = GBP 5.17/kg
--   GB  eifs-finish   Travis Perkins K Rend Silicone FT White 25 kg, GBP 20.96
--                     ex VAT = GBP 0.84/kg
--   GB  icf-concrete  easyMix C20-25 pump mix from GBP 112 per m3
--
-- The GB primer and the three AU finishes/adhesives/primer are stocked only as
-- trade lines whose prices are not published on a page a scanner can read, so
-- they are registered as SEARCH sources: the scanner stages candidates for an
-- admin to review, and no price is asserted until one is approved. AU ICF form
-- block and AU pump-mix concrete have no retail listing at all in Australia,
-- exactly as with NG, so they stay unmapped rather than carrying an invented
-- figure.
--
-- Rollback: rollback/20261119170000_icf_eifs_gb_remaining_roles_rollback.sql

-- ---------------------------------------------------------------- materials
INSERT INTO public.estimation_materials
  (name, slug, category, description, notes, effective_date, is_active, sort_order, last_updated_via)
VALUES
  ('Reinforcing bar T12 6 m x 12 mm (GB)', 'gb-icf-rebar', 'rebar',
   'High-yield deformed 12 mm bar, 0.888 kg/m, the vertical and horizontal bar for GB ICF walls.',
   'GBP 5.17/kg, converted from GBP 27.53 per 6 m bar ex VAT at 0.888 kg/m (Travis Perkins, 2026-11-19).',
   '2026-11-19', true, 220, 'manual'),
  ('K Rend Silicone FT render finish (25 kg)', 'gb-eifs-finish', 'render',
   'Self-coloured silicone thin-coat render forming the EIFS finish over the basecoat.',
   'GBP 0.84/kg, converted from GBP 20.96 per 25 kg bag ex VAT (Travis Perkins, 2026-11-19).',
   '2026-11-19', true, 221, 'manual'),
  ('Ready-mixed concrete C20-25 (GB)', 'gb-icf-concrete', 'concrete',
   'Pump-mix concrete filling the ICF core; C20-25 is the class used for two-storey ICF walls.',
   'GBP 112/m3, the supplier''s published starting rate for C20-25 (easyMix, 2026-11-19); the page states prices are per cubic metre but does not state the VAT basis.',
   '2026-11-19', true, 222, 'manual'),
  ('Render primer (GB, candidate discovery)', 'gb-eifs-primer', 'primer',
   'Primer applied to the substrate before the EIFS basecoat; no single product is fixed yet.',
   'No price: registered as a search source so the scanner stages candidates for review (2026-11-19).',
   '2026-11-19', true, 223, 'manual'),
  ('Render adhesive (AU, candidate discovery)', 'au-eifs-adhesive', 'adhesive',
   'Cementitious adhesive bonding insulation board to the AU EIFS substrate.',
   'No price: registered as a search source so the scanner stages candidates for review (2026-11-19).',
   '2026-11-19', true, 224, 'manual'),
  ('Acrylic render finish (AU, candidate discovery)', 'au-eifs-finish', 'render',
   'Pre-mixed acrylic texture finish coat for AU render and EIFS systems.',
   'No price: registered as a search source so the scanner stages candidates for review (2026-11-19).',
   '2026-11-19', true, 225, 'manual'),
  ('Render primer (AU, candidate discovery)', 'au-eifs-primer', 'primer',
   'Primer sealing the AU render substrate before the basecoat.',
   'No price: registered as a search source so the scanner stages candidates for review (2026-11-19).',
   '2026-11-19', true, 226, 'manual')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  notes = EXCLUDED.notes,
  effective_date = EXCLUDED.effective_date,
  is_active = true,
  updated_at = now();

-- ------------------------------------------------------------------ prices
INSERT INTO public.estimation_prices
  (price_type, ref_id, price, currency, effective_date, notes, is_active,
   price_source, scan_confidence, market, origin, price_kind, verification_status,
   source_url, supporting_submissions)
SELECT 'material', m.id, v.price, v.currency, '2026-11-19', v.notes, true,
       'retailer', 'manual', v.market, 'manual', 'retail', 'reported', v.url, 1
FROM (VALUES
  ('gb-icf-rebar', 5.17::numeric, 'GBP', 'GB',
   'GBP 27.53 per 6 m T12 bar ex VAT at 0.888 kg/m converted to the kg the role prices in.',
   'https://www.travisperkins.co.uk/steel-reinforcement/rom-concrete-reinforcing-bar-high-yield-t12-6m-x-12mm/p/923832'),
  ('gb-eifs-finish', 0.84::numeric, 'GBP', 'GB',
   'GBP 20.96 per 25 kg bag ex VAT converted to the kg the role prices in.',
   'https://www.travisperkins.co.uk/render/k-rend-silicone-ft-render-white/p/726965'),
  ('gb-icf-concrete', 112.00::numeric, 'GBP', 'GB',
   'GBP 112 per m3 starting rate for C20-25, already the unit the role prices in; VAT basis not stated by the supplier.',
   'https://www.easymixconcrete.com/about-us/ready-mix-concrete-prices/')
) AS v(slug, price, currency, market, notes, url)
JOIN public.estimation_materials m ON m.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.estimation_prices p
  WHERE p.ref_id = m.id AND p.market = v.market AND p.price_type = 'material'
    AND p.effective_date = '2026-11-19'
);

-- ----------------------------------------------------------- role mappings
INSERT INTO public.market_material_roles
  (market, role, material_slug, display_name, unit_label, notes, is_active, sort_order)
VALUES
  ('GB', 'icf-rebar', 'gb-icf-rebar', 'Reinforcing bar T12 6 m x 12 mm (GB)', 'kg',
   'Priced per kg of bar, from the 6 m stock length.', true, 220),
  ('GB', 'eifs-finish', 'gb-eifs-finish', 'K Rend Silicone FT finish (25 kg)', 'kg',
   'Priced per kg from the 25 kg bag.', true, 221),
  ('GB', 'icf-concrete', 'gb-icf-concrete', 'Ready-mixed concrete C20-25 (GB)', 'm³',
   'Priced per m3 of pump mix; grade matches the ICF core specification.', true, 222)
ON CONFLICT (market, role) DO UPDATE SET
  material_slug = EXCLUDED.material_slug,
  display_name = EXCLUDED.display_name,
  unit_label = EXCLUDED.unit_label,
  notes = EXCLUDED.notes,
  is_active = true,
  updated_at = now();

-- ----------------------------------------------- candidate discovery rows
-- No price is asserted here: these are search pages the scanner reads to stage
-- candidates. A role is only mapped once an admin approves a staged price.
INSERT INTO public.price_scan_sources
  (market, material_slug, retailer, label, product_url, expected_unit, currency,
   is_active, source_type, source_class, access_status, cadence_hours, rotation_group)
SELECT * FROM (VALUES
  ('GB', 'gb-eifs-primer', 'Wickes', 'Render primer search (GB)',
   'https://www.wickes.co.uk/search?text=render+primer', 'kg', 'GBP',
   true, 'search', 'retail_catalogue', 'search_page_only', 24, 2),
  ('AU', 'au-eifs-adhesive', 'Bunnings', 'Render adhesive search (AU)',
   'https://www.bunnings.com.au/search/products?query=render+adhesive', 'kg', 'AUD',
   true, 'search', 'retail_catalogue', 'search_page_only', 24, 2),
  ('AU', 'au-eifs-finish', 'Bunnings', 'Acrylic render finish search (AU)',
   'https://www.bunnings.com.au/search/products?query=render+top+coat', 'kg', 'AUD',
   true, 'search', 'retail_catalogue', 'search_page_only', 24, 3),
  ('AU', 'au-eifs-primer', 'Bunnings', 'Render primer search (AU)',
   'https://www.bunnings.com.au/search/products?query=render+primer', 'kg', 'AUD',
   true, 'search', 'retail_catalogue', 'search_page_only', 24, 3)
) AS v(market, material_slug, retailer, label, product_url, expected_unit, currency,
       is_active, source_type, source_class, access_status, cadence_hours, rotation_group)
WHERE NOT EXISTS (
  SELECT 1 FROM public.price_scan_sources s
  WHERE s.market = v.market AND s.material_slug = v.material_slug
    AND s.product_url = v.product_url
);
