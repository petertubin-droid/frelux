-- ICF/EIFS price book, batch 2: EIFS coatings and adhesives (US).
--
-- Dry-mix adhesive and base coat are the same product in most US EIFS
-- systems (Dryvit Genesis DM), so one verified price serves both keys.
-- The finish and primer figures convert a 5-gallon pail price to $/kg
-- using the pail's nominal 27 kg net weight, which is why they are
-- recorded as low confidence rather than manual.

insert into estimation_materials (name, slug, category, description, is_active, last_updated_via)
values
  ('EIFS adhesive / base coat (dry mix)', 'us-eifs-basecoat', 'plaster',
   'Polymer-modified dry-mix adhesive and mesh-embedding base coat, per kg of dry powder.', true, 'manual'),
  ('EIFS adhesive (dry mix, same product)', 'us-eifs-adhesive', 'adhesive',
   'Board adhesive, per kg of dry powder. Same Genesis DM product as the base coat in this market.', true, 'manual'),
  ('EIFS textured acrylic finish', 'us-eifs-finish', 'plaster',
   '100% acrylic textured finish coat, per kg.', true, 'manual'),
  ('EIFS acrylic primer', 'us-eifs-primer', 'primer',
   'Tinted acrylic primer for EIFS base coat, per kg.', true, 'manual')
on conflict (slug) do nothing;

insert into estimation_prices
  (price_type, ref_id, price, currency, market, scan_confidence, price_source, source_url, effective_date, is_active, origin, price_kind)
select 'material', m.id, v.price, v.currency, v.market, v.confidence, v.source, v.url, date '2026-11-19', true, 'manual', 'retail'
from (values
  ('us-eifs-basecoat', 2.14::numeric, 'USD', 'US', 'manual',
   'Dryvit Genesis DM 50 lb bag at $48.53 = $2.14/kg of dry mix (bag yields about 5 gal of mixed base coat)',
   'https://brickit.com/products/dryvit-adhesive-dm'),
  ('us-eifs-adhesive', 2.14::numeric, 'USD', 'US', 'manual',
   'Dryvit Genesis DM 50 lb bag at $48.53 = $2.14/kg; the same product bonds the board and embeds the mesh',
   'https://brickit.com/products/dryvit-adhesive-dm'),
  ('us-eifs-finish',   4.45::numeric, 'USD', 'US', 'low',
   'Senergy textured finish 5-gallon pail at $120.10, converted at a nominal 27 kg net weight. Verify pail weight locally.',
   'https://www.negysum.com/category/eifs_stucco_basecoat_adhesives'),
  ('us-eifs-primer',   3.22::numeric, 'USD', 'US', 'low',
   'StoPrime Sand 5-gallon pail at $87.06, converted at a nominal 27 kg net weight. Verify pail weight locally.',
   'https://cherbmi.com/category/eifs_stucco_basecoat_adhesives')
) as v(slug, price, currency, market, confidence, source, url)
join estimation_materials m on m.slug = v.slug
where not exists (
  select 1 from estimation_prices p
  where p.ref_id = m.id and p.market = v.market and p.is_active
);
