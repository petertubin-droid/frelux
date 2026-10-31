-- 20261031163000_supplier_network_directory.sql
-- Directory wiring for the supplier network: map coordinates on supplier
-- profiles (so suppliers appear on the existing FRELUX map) and the two
-- material categories the directory needs that the shared taxonomy lacked.
--
-- ROLLBACK: see supabase/migrations/rollback/20261031163000_supplier_network_directory_rollback.sql

begin;

alter table public.supplier_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- Backfill coordinates only from the market city the supplier already named.
-- No guessed pin: a supplier without a matching tracked city stays unmapped.
update public.supplier_profiles p
set latitude = c.latitude,
    longitude = c.longitude
from public.market_cities c
where p.latitude is null
  and p.city is not null
  and lower(c.name) = lower(p.city)
  and c.country_code = p.market_code
  and c.latitude is not null
  and c.longitude is not null;

-- New suppliers inherit their city's pin the same way.
create or replace function public.set_supplier_coordinates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.latitude is null or new.longitude is null then
    select c.latitude, c.longitude into new.latitude, new.longitude
    from public.market_cities c
    where lower(c.name) = lower(new.city)
      and c.country_code = new.market_code
      and c.latitude is not null
      and c.longitude is not null
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists supplier_profiles_coordinates on public.supplier_profiles;
create trigger supplier_profiles_coordinates
  before insert or update of city, market_code on public.supplier_profiles
  for each row execute function public.set_supplier_coordinates();

-- Taxonomy: the shared category tree already covers cement, steel, sand,
-- granite, blocks, roofing, tiles, paint, electrical, plumbing, doors, windows
-- and equipment. Timber and finishing materials were missing.
insert into public.marketplace_product_categories (slug, name, parent_id, sort_order, is_active)
select 'timber', 'Timber & Wood Products', id, 9, true
from public.marketplace_product_categories
where slug = 'building-materials'
on conflict (slug) do nothing;

insert into public.marketplace_product_categories (slug, name, parent_id, sort_order, is_active)
select 'finishing-materials', 'Finishing Materials', id, 10, true
from public.marketplace_product_categories
where slug = 'building-materials'
on conflict (slug) do nothing;

commit;
