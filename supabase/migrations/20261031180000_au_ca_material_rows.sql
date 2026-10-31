-- =========================================================
-- AU and CA material rows for the staged catalogues (2026-10-31)
--
-- The AU and CA feeder catalogues were staged and then mapped at zero. The
-- cause was not the suppliers and not the scanner: the products they sell had
-- no material row in that market to bind to. Plyco sells plywood and Handley
-- Lumber sells lumber, while the AU and CA catalogues held paint, rebar and
-- gypsum only.
--
-- These rows exist so a real observation has somewhere to land. They carry NO
-- PRICE. A product appearing on a merchant's page is not a price, and one
-- catalogue observation is not consensus; the price book fills from approved
-- observations exactly as it does everywhere else.
--
-- Rows are limited to products the staged catalogues actually list. This is
-- not a speculative expansion of the catalogue.
-- =========================================================

-- Plywood is bought and sold by the sheet across AU and CA. The units table
-- had pieces, metres and square metres but no sheet, so a per-sheet price had
-- no honest unit to attach to.
insert into estimation_units (name, symbol, category, sort_order)
select 'sheets', 'sheet', 'count', 11
where not exists (
  select 1 from estimation_units where symbol = 'sheet'
);

insert into estimation_materials
  (name, slug, category, description, unit_id, pack_size, supplier, notes)
values
  (
    'Hoop Pine AC Plywood 18mm (AU)',
    'au-hoop-pine-ac-plywood-18mm',
    'timber',
    'Hoop Pine AC grade plywood, 18mm sheet. Structural and interior use.',
    (select id from estimation_units where symbol = 'sheet' limit 1),
    null,
    'Plyco',
    'Catalogue row created 2026-10-31 to receive Plyco observations. Unpriced until an approved observation exists.'
  ),
  (
    'Hoop Pine AA Marine Plywood 24mm (AU)',
    'au-hoop-pine-aa-marine-plywood-24mm',
    'timber',
    'Hoop Pine AA grade marine plywood, 24mm sheet. Exterior and marine use.',
    (select id from estimation_units where symbol = 'sheet' limit 1),
    null,
    'Plyco',
    'Catalogue row created 2026-10-31 to receive Plyco observations. Unpriced until an approved observation exists.'
  ),
  (
    'Premium Birch Plywood 30mm (AU)',
    'au-premium-birch-plywood-30mm',
    'timber',
    'Premium birch plywood, 30mm sheet. Cabinet and joinery grade.',
    (select id from estimation_units where symbol = 'sheet' limit 1),
    null,
    'Plyco',
    'Catalogue row created 2026-10-31 to receive Plyco observations. Unpriced until an approved observation exists.'
  ),
  (
    'Treated Lumber 2x6 (CA)',
    'ca-treated-lumber-2x6',
    'timber',
    'Pressure treated softwood lumber, 2x6 section.',
    (select id from estimation_units where symbol = 'piece' limit 1),
    null,
    'Handley Lumber',
    'Catalogue row created 2026-10-31 to receive Handley Lumber observations. Unpriced until an approved observation exists.'
  )
on conflict (slug) do nothing;

-- The hardware rows on the same catalogue (Construction Screws, Dock Hardware)
-- deliberately get no material row. They are not building materials, and a
-- row for them is how a fastener ends up priced as timber.
