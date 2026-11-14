-- The same Nigerian finishing correction for the "international" workflow.
--
-- The POP page lets a Nigerian user switch workflow to International, and that
-- list still carried the old row set at the old prices: screeding compound,
-- primer, sandpaper by the sheet, paint in a 4 L tin and putty per kg. The
-- prices are Nigerian either way, so both workflows now carry the same three
-- materials.
--
-- Applied on top of 20261114090000_pop_finishing_materials_correction.

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
where id = '836957f5-6766-4c1b-80e7-4035ec698632';

update pop_materials
set unit = 'yard',
    coverage_rate = 5,
    coverage_unit = 'm²',
    package_size = 1,
    package_unit = 'yard',
    unit_price = 600,
    sort_order = 2,
    is_active = true,
    updated_at = now()
where id = '1a3660c2-e164-4b86-b036-3973cc390cdb';

update pop_materials
set unit = 'litre',
    coverage_rate = 12,
    coverage_unit = 'm²',
    package_size = 20,
    package_unit = 'litre',
    unit_price = 17000,
    sort_order = 3,
    is_active = true,
    updated_at = now()
where id = '1e7f110c-785c-4136-90c2-24bd741eaccd';

update pop_materials
set is_active = false,
    updated_at = now()
where id in (
  '6c6806f6-38d5-4d90-8e4c-463eeaf64f47',  -- Screeding Compound, replaced by putty
  '9b6e53c3-baf4-4441-b54a-db564f49e613'   -- Primer, no longer part of the list
);
