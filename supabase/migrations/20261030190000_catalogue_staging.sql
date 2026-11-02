create table if not exists public.catalogue_products (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  source_id uuid references public.price_scan_sources(id) on delete cascade,
  supplier text,
  title text not null,
  unit_hint text,
  price numeric,
  currency text,
  material_slug text,
  match_score numeric,
  match_status text not null default 'unmapped',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  observations integer not null default 0,
  unique (source_id, title)
);
create index if not exists catalogue_products_market_status on public.catalogue_products (market, match_status);

create table if not exists public.material_aliases (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  source_id uuid references public.price_scan_sources(id) on delete cascade,
  product_title text not null,
  material_slug text not null,
  unit text,
  confidence numeric not null default 1,
  created_by text,
  created_at timestamptz not null default now(),
  unique (source_id, product_title)
);

grant select, insert, update, delete on public.catalogue_products, public.material_aliases to service_role, authenticated;
grant select on public.catalogue_products, public.material_aliases to anon;

-- Staging keeps every catalogue row, priced or not, so a supplier catalogue is
-- never discarded just because Frelux has not mapped it yet.
create or replace function public.stage_catalogue_product(
  p_market text, p_source uuid, p_supplier text, p_title text,
  p_price numeric, p_currency text, p_unit text
) returns void language sql security definer set search_path to 'public' as $$
  insert into public.catalogue_products
    (market, source_id, supplier, title, price, currency, unit_hint)
  values (p_market, p_source, p_supplier, left(p_title, 300), p_price,
          upper(coalesce(p_currency,'')), left(coalesce(p_unit,''), 24))
  on conflict (source_id, title) do update
    set price = coalesce(excluded.price, catalogue_products.price),
        currency = coalesce(nullif(excluded.currency,''), catalogue_products.currency),
        last_seen = now(),
        supplier = coalesce(excluded.supplier, catalogue_products.supplier);
$$;

-- Turns staged rows into prices only where an approved alias says which Frelux
-- material the product is. No alias, no price: guessing is what makes a price
-- book lie.
create or replace function public.apply_catalogue_aliases(p_market text default null)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare written integer := 0; r record;
begin
  for r in
    select c.id, c.market, c.source_id, c.supplier, c.title, c.price, c.currency,
           a.material_slug, a.unit, a.confidence,
           s.source_class, s.licence_name, s.licence_url, s.attribution_text, s.product_url
      from public.catalogue_products c
      join public.material_aliases a
        on a.source_id = c.source_id and a.product_title = c.title
      join public.price_scan_sources s on s.id = c.source_id
     where c.price is not null and c.price > 0
       and (p_market is null or c.market = p_market)
  loop
    insert into public.market_price_observations
      (market, country_name, material_slug, material_id, brand, specification, unit, price, currency,
       price_type, source_class, source_id, source_url, source_format, extraction, confidence,
       supplier_name, observed_on, observed_at, verified_at, reliability_score,
       licence_name, licence_url, attribution_text, original_currency, original_price)
    select r.market, mp.country_name, r.material_slug, m.id, r.supplier,
           left(r.title, 160), coalesce(r.unit, m.unit_id::text, 'each'), r.price, r.currency,
           'retail', r.source_class, r.source_id, r.product_url, 'json', 'catalogue_alias',
           greatest(0.5, least(0.98, coalesce(r.confidence, 0.9))),
           r.supplier, current_date, now(), now(), 0.8,
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
      update public.catalogue_products
         set match_status = 'applied', material_slug = r.material_slug,
             observations = observations + 1
       where id = r.id;
    end if;
  end loop;
  perform public.recompute_source_reliability();
  return written;
end;
$$;

-- Conservative auto-mapping: every material noun in the product title must
-- appear in the Frelux material name, and the units must be compatible.
create or replace function public.automap_catalogue_products(p_market text default null)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare mapped integer := 0;
begin
  with candidates as (
    select c.id, c.market, m.slug, m.name,
           case
             when lower(c.title) like '%' || lower(split_part(m.slug,'-',2)) || '%' then 0.9
             else 0.0 end as score
      from public.catalogue_products c
      join public.estimation_materials m on m.is_active
     where c.match_status = 'unmapped'
       and (p_market is null or c.market = p_market)
       and split_part(m.slug,'-',2) is not null
       and length(split_part(m.slug,'-',2)) > 3
  ), best as (
    select distinct on (id) id, slug, score from candidates
     where score >= 0.9 order by id, score desc
  )
  update public.catalogue_products c
     set material_slug = b.slug, match_score = b.score, match_status = 'suggested'
    from best b where b.id = c.id;
  get diagnostics mapped = row_count;
  return mapped;
end;
$$;
