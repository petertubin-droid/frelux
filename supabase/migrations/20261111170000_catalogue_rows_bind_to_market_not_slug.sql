-- Catalogue rows must be wildcards, not a sentinel slug.
--
-- price-intel-scan binds a feed row to a material either by an explicit
-- material_slug or by matching against the market catalogue
-- (catalogueForMarket). The wildcard is "*": anything else is treated as a
-- single material slug. The catalogue migrations wrote '_catalogue', which
-- matched no material, so every registered storefront was fetched, parsed and
-- then bound to nothing. This rebinds those rows to the wildcard.
--
-- Safe to re-run: it only touches rows still carrying the sentinel.

update public.price_scan_sources
   set material_slug = '*',
       updated_at = now()
 where material_slug = '_catalogue';

do $$
declare
  n integer;
begin
  select count(*) into n
    from public.price_scan_sources
   where material_slug = '*';
  raise notice 'wildcard catalogue sources: %', n;
end $$;
