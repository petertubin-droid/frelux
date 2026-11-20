-- ICF and EIFS/ETICS market price book (Wave 2.1)
--
-- Both estimators now price their bill of quantities from the market's
-- own book (estimation_materials slug "{market}-{key}" +
-- estimation_prices). This migration seeds the rows that were verified
-- against live supplier listings or published price guidance on
-- 2026-11-19. Anything not verified is deliberately NOT seeded: the
-- estimator shows the line as unpriced rather than inventing a figure.
--
-- Keys (see src/lib/estimation/icf-eifs-market.ts):
--   icf-form-block   per m2 of form face
--   icf-corner-block per corner unit
--   icf-concrete     per m3 ready-mix
--   icf-rebar        per kg
--   icf-sealant      per can
--   icf-waterproof   per m2
--   eifs-insulation  per m2 at the 50 mm reference thickness
--   eifs-adhesive    per kg
--   eifs-basecoat    per kg
--   eifs-mesh        per m2
--   eifs-primer      per kg
--   eifs-finish      per kg
--   eifs-fastener    per 100
--   eifs-trim        per m

insert into estimation_materials (name, slug, category, description, is_active, last_updated_via)
values
  -- United States
  ('ICF form block (48 in x 16 in face)', 'us-icf-form-block', 'formwork',
   'Insulated concrete form, straight block, 1219 x 406 mm face (0.495 m2). Price is per m2 of form face.', true, 'manual'),
  ('Ready-mix concrete (ICF pump mix)', 'us-icf-concrete', 'concrete',
   'Ready-mix concrete delivered, 25 MPa class, per m3.', true, 'manual'),
  ('Rebar (#4 / 12 mm)', 'us-icf-rebar', 'rebar',
   'Deformed reinforcement bar, per kg.', true, 'manual'),
  ('Rigid foam insulation board 50 mm', 'us-eifs-insulation', 'insulation',
   'Rigid foam insulation board for EIFS/ETICS, per m2 at 50 mm thickness.', true, 'manual'),
  ('EIFS reinforcing mesh', 'us-eifs-mesh', 'insulation',
   'Alkali-resistant fiberglass reinforcing mesh, per m2.', true, 'manual'),
  -- United Kingdom
  ('ICF form block (UK system)', 'gb-icf-form-block', 'formwork',
   'Insulated concrete form, straight block, per m2 of form face.', true, 'manual'),
  ('EPS insulation board 50 mm', 'gb-eifs-insulation', 'insulation',
   'EPS external wall insulation board, per m2 at 50 mm thickness.', true, 'manual'),
  -- Australia
  ('EPS insulation board 50 mm (AU)', 'au-eifs-insulation', 'insulation',
   'EPS external wall insulation board, per m2 at 50 mm thickness.', true, 'manual')
on conflict (slug) do nothing;

-- Prices: exact listing prices are scan_confidence 'manual'; published
-- price bands are 'low' with the band recorded in price_source.
insert into estimation_prices
  (price_type, ref_id, price, currency, market, scan_confidence, price_source, source_url, effective_date, is_active, origin, price_kind)
select 'material', m.id, v.price, v.currency, v.market, v.confidence, v.source, v.url, date '2026-11-19', true, 'manual', v.price_kind
from (values
  ('us-icf-form-block',  58.49::numeric, 'USD', 'US', 'manual',
   'BuildBlock standard straight block from $28.95 per 48 in x 16 in block (0.4949 m2 face) = $58.49/m2',
   'https://buildblock.com/products/buildblock-icfs/', 'retail'),
  ('us-icf-concrete',   210.00::numeric, 'USD', 'US', 'low',
   'Published band $150-170 per cubic yard delivered (2025), mid-point converted to $210/m3. Verify with your plant.',
   'https://www.fixr.com/costs/concrete-delivery', 'delivery_inclusive'),
  ('us-icf-rebar',        0.72::numeric, 'USD', 'US', 'low',
   'US rebar mill price band $710-720/t ex-works (2025). Retail cut lengths cost more; verify locally.',
   'https://www.accio.com/business/rebar-price-trend', 'ex_depot'),
  ('us-eifs-insulation', 18.84::numeric, 'USD', 'US', 'manual',
   'Rigid foam 2 in x 4 ft x 8 ft R-10 sheet at $56.00 = $18.84/m2 at 50 mm',
   'https://www.homedepot.com/', 'retail'),
  ('us-eifs-mesh',        1.13::numeric, 'USD', 'US', 'manual',
   'Fiberglass stucco/EIFS mesh 38 in x 150 ft (44.1 m2) at $50.00 = $1.13/m2',
   'https://a2z-buildingsupplies.com/product/stucco-mesh-fiberglass-9-5-x-150-4-5-oz/', 'retail'),
  ('gb-icf-form-block',  62.50::numeric, 'GBP', 'GB', 'low',
   'Polysteel UK: ICF formwork £55-70/m2 depending on order size, mid-point used. Verify with supplier.',
   'https://www.polysteel.co.uk/', 'retail'),
  ('gb-eifs-insulation',  7.44::numeric, 'GBP', 'GB', 'manual',
   'EPS SPI 50 mm external wall insulation board, 0.72 m2 sheet at £5.36 inc VAT = £7.44/m2',
   'https://www.insulationboard.co.uk/', 'retail'),
  ('au-eifs-insulation', 32.00::numeric, 'AUD', 'AU', 'low',
   'Australian 50 mm EPS panel trade listings from about $32/m2. Verify with a local supplier.',
   'https://www.gumtree.com.au/s-building-materials/insulation+board/k0c20103', 'retail')
) as v(slug, price, currency, market, confidence, source, url, price_kind)
join estimation_materials m on m.slug = v.slug
where not exists (
  select 1 from estimation_prices p
  where p.ref_id = m.id and p.market = v.market and p.is_active
);
