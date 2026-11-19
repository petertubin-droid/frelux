-- ICF and EIFS: extend price coverage to GB and AU.
--
-- The engines resolve a system line through market_material_roles, so a market
-- with no mapping prices nothing at all. Before this migration only US (nine
-- roles), GB (two) and AU (one) were mapped. NG is deliberately left empty:
-- ICF and EIFS are not stocked at retail there, so an NG price would have to be
-- invented, and the engines already say "quantities only" instead.
--
-- Every figure below is a retailer-listed price with its page recorded, not an
-- aggregator average. Pack sizes are converted to the role's pricing unit and
-- the basis (VAT/GST) is stated in the note, because the book stores whatever
-- the market quotes.
--
-- Rollback: rollback/20261119150000_icf_eifs_gb_au_roles_rollback.sql

-- ---------------------------------------------------------------- materials
INSERT INTO public.estimation_materials
  (name, slug, category, description, notes, effective_date, is_active, sort_order, last_updated_via)
VALUES
  ('K Rend HP12 basecoat (25 kg)', 'gb-eifs-basecoat', 'plaster',
   'Polymer-modified cementitious basecoat used under thin-coat render and EIFS reinforcing mesh.',
   'GBP 0.47/kg, converted from GBP 11.82 per 25 kg bag ex VAT (TradeKart, 2026-11-19).',
   '2026-11-19', true, 210, 'manual'),
  ('EIFS adhesive dry mix (GB, same product as basecoat)', 'gb-eifs-adhesive', 'adhesive',
   'Cementitious adhesive used to bond insulation boards; in the UK the same HP12 dry mix serves adhesive and basecoat.',
   'Priced as the basecoat product: GBP 0.47/kg from GBP 11.82 per 25 kg bag ex VAT (TradeKart, 2026-11-19).',
   '2026-11-19', true, 211, 'manual'),
  ('Alkali-resistant fibreglass render mesh 1 m x 50 m', 'gb-eifs-mesh', 'insulation',
   'Woven alkali-resistant glass-fibre mesh embedded in the basecoat.',
   'GBP 0.77/m2, converted from GBP 38.50 per 1 m x 50 m roll (MG Builders Merchants, 2026-11-19).',
   '2026-11-19', true, 212, 'manual'),
  ('Rockcote Keycote adhesive basecoat (20 kg)', 'au-eifs-basecoat', 'plaster',
   'Polymer-modified cementitious basecoat to AS 3972, used as adhesive and basecoat for render and EIFS.',
   'AUD 2.49/kg, converted from AUD 49.72 per 20 kg bag (BC Sands, 2026-11-19).',
   '2026-11-19', true, 213, 'manual'),
  ('Alkali-resistant fibreglass wall mesh 1 m x 50 m (AU)', 'au-eifs-mesh', 'insulation',
   'Alkali-resistant fibreglass mesh roll for render reinforcement.',
   'AUD 1.40/m2, converted from AUD 69.90 per 1 m x 50 m roll ex GST (TradieCart, 2026-11-19).',
   '2026-11-19', true, 214, 'manual'),
  ('N12 reinforcing bar 12 mm (AU)', 'au-icf-rebar', 'rebar',
   'Grade 500N deformed bar, 0.888 kg/m, the vertical and horizontal bar for AU ICF walls.',
   'AUD 2.31/kg, converted from AUD 12.30 per 6 m bar at 0.888 kg/m (AUSCON, 2026-11-19); RRP basis, GST inclusive.',
   '2026-11-19', true, 215, 'manual')
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
  ('gb-eifs-basecoat', 0.47::numeric, 'GBP', 'GB',
   'GBP 11.82 per 25 kg bag ex VAT converted to the kg the role prices in.',
   'https://tradekart.com/en-gb/products/k-rend-hp12-basecoat-render'),
  ('gb-eifs-adhesive', 0.47::numeric, 'GBP', 'GB',
   'Same HP12 dry mix as the GB basecoat, priced once and used for both roles.',
   'https://tradekart.com/en-gb/products/k-rend-hp12-basecoat-render'),
  ('gb-eifs-mesh', 0.77::numeric, 'GBP', 'GB',
   'GBP 38.50 per 1 m x 50 m roll converted to the m2 the role prices in.',
   'https://www.mgnbm.co.uk/render-mesh-alkaline-resistant-50m-x-1m/'),
  ('au-eifs-basecoat', 2.49::numeric, 'AUD', 'AU',
   'AUD 49.72 per 20 kg bag converted to the kg the role prices in.',
   'https://www.bcsands.com.au/index.php?main_page=product_info&products_id=3180'),
  ('au-eifs-mesh', 1.40::numeric, 'AUD', 'AU',
   'AUD 69.90 per 1 m x 50 m roll ex GST converted to the m2 the role prices in.',
   'https://www.tradiecart.com.au/build-smart-alkaline-resistant-fiberglass-wall-mesh-1m-x-50m/'),
  ('au-icf-rebar', 2.31::numeric, 'AUD', 'AU',
   'AUD 12.30 per 6 m N12 bar at 0.888 kg/m converted to the kg the role prices in.',
   'https://www.ausconbs.com.au/n12-reinforcement-bar-12mm-at-6m-long')
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
  ('GB', 'eifs-basecoat', 'gb-eifs-basecoat', 'K Rend HP12 basecoat (25 kg)', 'kg',
   'Priced per kg from the 25 kg bag.', true, 210),
  ('GB', 'eifs-adhesive', 'gb-eifs-adhesive', 'EIFS adhesive dry mix (GB)', 'kg',
   'The same HP12 mix bonds the board and forms the basecoat.', true, 211),
  ('GB', 'eifs-mesh', 'gb-eifs-mesh', 'Alkali-resistant render mesh (1 m x 50 m)', 'm²',
   'Priced per m2 of mesh.', true, 212),
  ('AU', 'eifs-basecoat', 'au-eifs-basecoat', 'Rockcote Keycote basecoat (20 kg)', 'kg',
   'Priced per kg from the 20 kg bag.', true, 213),
  ('AU', 'eifs-mesh', 'au-eifs-mesh', 'Alkali-resistant wall mesh (1 m x 50 m)', 'm²',
   'Priced per m2 of mesh.', true, 214),
  ('AU', 'icf-rebar', 'au-icf-rebar', 'N12 reinforcing bar 12 mm', 'kg',
   'Priced per kg of bar, from the 6 m stock length.', true, 215)
ON CONFLICT (market, role) DO UPDATE SET
  material_slug = EXCLUDED.material_slug,
  display_name = EXCLUDED.display_name,
  unit_label = EXCLUDED.unit_label,
  notes = EXCLUDED.notes,
  is_active = true,
  updated_at = now();

-- --------------------------------------------------- evidence on old rows
-- The first twelve ICF/EIFS rows were written without a verification status, so
-- the engines could not tell a supplier price from an aggregator average. None
-- of them is independently corroborated, so they are recorded as reported.
UPDATE public.estimation_prices p
SET verification_status = 'reported',
    notes = COALESCE(p.notes, '') ||
      CASE WHEN COALESCE(p.notes, '') = '' THEN '' ELSE ' ' END ||
      'Verification status set by 20261119150000: single retailer or aggregator observation, not independently corroborated.'
FROM public.estimation_materials m
WHERE p.ref_id = m.id
  AND p.price_type = 'material'
  AND p.verification_status IS NULL
  AND (m.slug LIKE 'us-icf-%' OR m.slug LIKE 'us-eifs-%'
       OR m.slug LIKE 'gb-icf-%' OR m.slug LIKE 'gb-eifs-%'
       OR m.slug LIKE 'au-icf-%' OR m.slug LIKE 'au-eifs-%');
