-- A tool is not a material.
--
-- A staged Canadian row "Irwin 18" Pipe Wrench" was auto-mapped to
-- ca-pipe-drainage and written as a price observation, which would have priced
-- PVC drainage pipe off the cost of a wrench. Classification stays permissive so
-- a human can approve odd titles; the step that writes money must not. This
-- guard sits at that boundary and preserves the original function body.

create or replace function public.catalogue_title_is_tool(p_title text)
returns boolean language sql immutable as $$
  select coalesce(p_title, '') ~* (
    '(^|[^a-z])(' ||
    'pipe wrench|wrench|pliers|spanner|screwdriver|hammer|drill|driver bits?|' ||
    'sprayer|spray gun|hose|nozzle|tip|cartridge|sander|sanding|trolley|' ||
    'ladder|charger|battery|blade|blades|brush|brushes|roller|rollers|' ||
    'tray|bucket|trowel|float|level|tape measure|clamp|vice|saw|' ||
    'compressor|pump|work light|tool belt|toolbox|safety glasses|gloves|' ||
    'paint kit|applicator set|extension pole' ||
    ')([^a-z]|$)'
  );
$$;
grant execute on function public.catalogue_title_is_tool(text) to service_role, authenticated;

create or replace function public.apply_catalogue_aliases(p_market text default null)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare r record; written integer := 0;
begin
  for r in
    select c.id, c.market, c.source_id, c.supplier, c.title, c.price, c.currency,
           c.material_slug, c.match_status,
           s.source_class, s.licence_name, s.licence_url, s.attribution_text, s.product_url
      from public.catalogue_products c
      join public.price_scan_sources s on s.id = c.source_id
     where c.price is not null and c.price > 0
       and c.material_slug is not null
       and c.match_status in ('auto_mapped','approved')
       and not public.catalogue_title_is_bulk(c.title)
       and not public.catalogue_title_is_tool(c.title)
       and (p_market is null or c.market = p_market)
  loop
    insert into public.market_price_observations
      (market, country_name, material_slug, material_id, brand, specification, unit, price, currency,
       price_type, source_class, source_id, source_url, source_format, extraction, confidence,
       supplier_name, observed_on, observed_at, verified_at, reliability_score,
       licence_name, licence_url, attribution_text, original_currency, original_price)
    select r.market, mp.country_name, r.material_slug, m.id, r.supplier,
           left(r.title,160), coalesce(m.unit_id::text, 'each'), r.price, r.currency,
           'retail', coalesce(r.source_class,'retail_catalogue'), r.source_id, r.product_url,
           'json', 'catalogue_alias', 'medium', r.supplier, current_date, now(), now(), 0.8,
           r.licence_name, r.licence_url, r.attribution_text, r.currency, r.price
      from public.market_profiles mp
      left join public.estimation_materials m on m.slug = r.material_slug
     where mp.country_code = r.market
       and not exists (
         select 1 from public.market_price_observations o
          where o.source_id = r.source_id and o.material_slug = r.material_slug
            and o.observed_on = current_date and o.price = r.price);
    if found then
      written := written + 1;
      update public.catalogue_products set observations = observations + 1 where id = r.id;
    end if;
  end loop;
  perform public.recompute_source_reliability();
  return written;
end;
$$;
grant execute on function public.apply_catalogue_aliases(text) to service_role, authenticated;

-- Quarantine anything already written from a tool title.
delete from public.market_price_observations o
 using public.catalogue_products c
 where o.specification = left(c.title, 160)
   and o.market = c.market
   and public.catalogue_title_is_tool(c.title);

update public.catalogue_products
   set match_status = 'rejected_tool', material_slug = null
 where public.catalogue_title_is_tool(title)
   and match_status in ('auto_mapped','approved');
