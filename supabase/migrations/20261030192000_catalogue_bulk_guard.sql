-- Bulk and multi-buy listings quote a total, not one pack, so they must never be
-- read as the price of a single 25kg bag.
create or replace function public.catalogue_title_is_bulk(p_title text)
returns boolean language sql immutable as $$
  select coalesce(p_title, '') ~* '^\s*[0-9]+\s*x\s'
      or coalesce(p_title, '') ~* '\m(bulk|pallet|pack of|trade pack|multi ?buy)\M'
      or coalesce(p_title, '') ~* '\([0-9]{2,}\s*kg\)'
      or coalesce(p_title, '') ~* '[0-9]+\s*kg\s*(each\s*)?-?\s*bulk';
$$;

create or replace function public.automap_catalogue_products(p_market text default null)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare mapped integer := 0;
begin
  update public.catalogue_products set material_slug = null, match_score = null, match_status = 'unmapped'
   where match_status in ('suggested','auto_mapped');

  with nouns(noun) as (values
    ('cement'),('concrete'),('sand'),('gravel'),('ballast'),('timber'),('plywood'),('chipboard'),
    ('plasterboard'),('plaster'),('steel'),('rebar'),('brick'),('block'),('tile'),('paint'),
    ('pipe'),('cable'),('insulation'),('screed'),('mortar'),('slate'),('shingle'),('sleeper'))
  , titled as (
    select c.id, c.market, c.title,
           (select n.noun from nouns n where lower(c.title) like '%' || n.noun || '%' order by length(n.noun) desc limit 1) noun,
           (select m1[1] from regexp_matches(lower(c.title), '([0-9]+(?:\.[0-9]+)?)\s*(kg|litre|liter|ml|l|tonne|ton|sqm|m2|mm|cm|m)\M') m1 limit 1) qty,
           (select m1[2] from regexp_matches(lower(c.title), '([0-9]+(?:\.[0-9]+)?)\s*(kg|litre|liter|ml|l|tonne|ton|sqm|m2|mm|cm|m)\M') m1 limit 1) unit
      from public.catalogue_products c
     where c.match_status = 'unmapped' and c.price is not null and c.price > 0
       and not public.catalogue_title_is_bulk(c.title)
       and (p_market is null or c.market = p_market)
  ), scored as (
    select t.id, m.slug, 0.95::numeric as score
      from titled t
      join public.estimation_materials m
        on m.is_active
       and m.slug like lower(t.market) || '-%'
       and t.noun is not null
       and lower(m.name) like '%' || t.noun || '%'
       and (select m2[1] from regexp_matches(lower(m.name), '([0-9]+(?:\.[0-9]+)?)\s*(kg|litre|liter|ml|l|tonne|ton|sqm|m2|mm|cm|m)\M') m2 limit 1) is not distinct from t.qty
       and (select m2[2] from regexp_matches(lower(m.name), '([0-9]+(?:\.[0-9]+)?)\s*(kg|litre|liter|ml|l|tonne|ton|sqm|m2|mm|cm|m)\M') m2 limit 1) is not distinct from t.unit
  ), best as (select distinct on (id) id, slug, score from scored order by id, score desc)
  , done as (
    update public.catalogue_products c
       set material_slug = b.slug, match_score = b.score, match_status = 'auto_mapped'
      from best b where b.id = c.id returning 1
  )
  select count(*) into mapped from done;
  return mapped;
end;
$$;

create or replace function public.apply_catalogue_aliases(p_market text default null)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare r record; written integer := 0;
begin
  for r in
    select c.id, c.market, c.source_id, c.supplier, c.title, c.price, c.currency, c.material_slug,
           s.source_class, s.licence_name, s.licence_url, s.attribution_text, s.product_url
      from public.catalogue_products c
      join public.price_scan_sources s on s.id = c.source_id
     where c.price is not null and c.price > 0
       and c.material_slug is not null
       and c.match_status in ('auto_mapped','approved')
       and not public.catalogue_title_is_bulk(c.title)
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
