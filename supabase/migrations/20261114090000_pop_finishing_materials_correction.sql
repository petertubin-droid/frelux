-- POP finishing materials, corrected against Nigerian supplier packaging.
--
-- The finishing list carried five rows and two of them were the same product
-- under different names: "Screeding Compound" (a 20 kg bag at 4,000) and
-- "Finishing Putty" (priced per kg at 800). Screeding putty is what goes on a
-- POP ceiling, it is bought as one 20 kg bucket at 13,500, and one bucket
-- covers 30 m2 at two coats, so the compound row and the per-kg row collapse
-- into a single row. "Primer" is no longer part of this list at all.
--
-- Sandpaper is sold by the yard at 600, not by the sheet at 300, and one yard
-- rubs down 5 m2. Ceiling paint is a 20 L bucket at 17,000, not a 4 L tin.
--
-- The two retired rows are deactivated rather than deleted so estimates that
-- already reference them keep resolving.

update pop_materials
set name = 'Screeding Putty',
    category = 'finishing',
    unit = 'kg',
    coverage_rate = 1.5,      -- 30 m2 per 20 kg bucket, two coats
    coverage_unit = 'm²',
    package_size = 20,
    package_unit = 'kg',
    unit_price = 13500,
    sort_order = 1,
    is_active = true,
    updated_at = now()
where id = 'f3a55a5b-308f-47c0-b6ae-c96369e1a958';

update pop_materials
set unit = 'yard',
    coverage_rate = 5,        -- 5 m2 rubbed down per yard
    coverage_unit = 'm²',
    package_size = 1,
    package_unit = 'yard',
    unit_price = 600,
    sort_order = 2,
    is_active = true,
    updated_at = now()
where id = '87e70cd8-94fd-4b2b-9a8f-c06a105852ab';

update pop_materials
set unit = 'litre',
    coverage_rate = 12,
    coverage_unit = 'm²',
    package_size = 20,        -- 20 L bucket
    package_unit = 'litre',
    unit_price = 17000,
    sort_order = 3,
    is_active = true,
    updated_at = now()
where id = '1952146f-af80-45f0-8752-479599a95bdf';

update pop_materials
set is_active = false,
    updated_at = now()
where id in (
  '334899c9-f567-4ea0-b59d-c473f26e24f4',  -- Screeding Compound, replaced by putty
  'ad62cb38-16f6-4691-8262-e3b2cd35d1c4'   -- Primer, no longer part of the list
);
