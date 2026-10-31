-- 20261031120000_diaspora_building_types.sql
-- Tracker covers site types the trade calculators never needed. Values are added
-- to the vocabulary; no existing value is removed or renamed.
-- ROLLBACK:
--   alter table public.contractor_projects drop constraint contractor_projects_building_type_check;
--   alter table public.contractor_projects add constraint contractor_projects_building_type_check
--     check (building_type = any (array['residential','commercial','industrial','institutional','renovation']));
alter table public.contractor_projects drop constraint if exists contractor_projects_building_type_check;
alter table public.contractor_projects add constraint contractor_projects_building_type_check
  check (building_type = any (array[
    'residential','commercial','industrial','institutional','renovation',
    'land_development','civil_works','mixed_use','other'
  ]));
