-- Rollback for 20261031163000_supplier_network_directory.sql
begin;

drop trigger if exists supplier_profiles_coordinates on public.supplier_profiles;
drop function if exists public.set_supplier_coordinates() cascade;

alter table public.supplier_profiles
  drop column if exists latitude,
  drop column if exists longitude;

delete from public.marketplace_product_categories where slug in ('timber', 'finishing-materials');

commit;
