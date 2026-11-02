-- A staged catalogue row that never leaves 'unmapped' is a decision nobody
-- made. It also inflates how much coverage a market appears to have: 233 staged
-- rows mean nothing if 232 of them are metal sheet and bathroom basins that
-- Frelux does not price. This migration gives every row an honest ending and
-- exposes the totals per market so coverage can be read instead of guessed.

alter table public.catalogue_products add column if not exists rejection_reason text;
alter table public.catalogue_products add column if not exists decided_at timestamptz;

-- Shared noun extraction, so the matcher and the classifier cannot disagree
-- about what a product is.
create or replace function public.catalogue_product_noun(p_title text)
returns text language sql immutable as $$
  select n.noun
    from (values
      ('cement'),('concrete'),('sand'),('gravel'),('ballast'),('timber'),('plywood'),
      ('chipboard'),('plasterboard'),('plaster'),('steel'),('rebar'),('brick'),('block'),
      ('tile'),('paint'),('pipe'),('cable'),('insulation'),('screed'),('mortar'),
      ('slate'),('shingle'),('sleeper')
    ) as n(noun)
   where lower(coalesce(p_title, '')) like '%' || n.noun || '%'
   order by length(n.noun) desc
   limit 1;
$$;

-- Shopify repeats the product title for a single-variant product, which made
-- review rows read "50kg cement - Default Title".
create or replace function public.catalogue_clean_title(p_title text)
returns text language sql immutable as $$
  select btrim(regexp_replace(coalesce(p_title, ''), '\s*-\s*default title\s*$', '', 'i'));
$$;

-- Clean what is already staged without tripping the (source_id, title) key.
delete from public.catalogue_products c
 where c.title ~* '-\s*default title\s*$'
   and exists (
     select 1 from public.catalogue_products c2
      where c2.source_id is not distinct from c.source_id
        and c2.title = public.catalogue_clean_title(c.title)
        and c2.id <> c.id
   );

update public.catalogue_products
   set title = public.catalogue_clean_title(title)
 where title ~* '-\s*default title\s*$';

/**
 * Decide the rows the matcher could not map. Order matters: an unpriced line is
 * a pricing problem before it is a matching problem, and a bulk pack is set
 * aside before nouns are compared because its unit price would have to be
 * invented from the pack count.
 */
create or replace function public.classify_catalogue_backlog(p_market text default null)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer := 0; step integer := 0;
begin
  update public.catalogue_products c
     set match_status = 'supplier_no_price',
         rejection_reason = case
           when c.price is null then 'the supplier publishes no price for this line'
           else 'the supplier publishes a price of zero, so there is nothing to adopt'
         end,
         decided_at = now()
   where c.match_status = 'unmapped'
     and (p_market is null or c.market = p_market)
     and (c.price is null or c.price <= 0);
  get diagnostics step = row_count; n := n + step;

  update public.catalogue_products c
     set match_status = 'bulk_listing',
         rejection_reason = 'multi-buy or bulk pack, so a per-unit price would have to be invented',
         decided_at = now()
   where c.match_status = 'unmapped'
     and (p_market is null or c.market = p_market)
     and public.catalogue_title_is_bulk(c.title);
  get diagnostics step = row_count; n := n + step;

  update public.catalogue_products c
     set match_status = 'no_counterpart',
         rejection_reason = case
           when public.catalogue_product_noun(c.title) is null
             then 'product type is not in the Frelux material catalogue'
           else format('the %s catalogue prices no %s products', c.market, public.catalogue_product_noun(c.title))
         end,
         decided_at = now()
   where c.match_status = 'unmapped'
     and (p_market is null or c.market = p_market)
     and not exists (
       select 1 from public.estimation_materials m
        where m.is_active
          and m.slug like lower(c.market) || '-%'
          and public.catalogue_product_noun(c.title) is not null
          and lower(m.name) like '%' || public.catalogue_product_noun(c.title) || '%'
     );
  get diagnostics step = row_count; n := n + step;

  return n;
end;
$$;

-- What a market's catalogue actually yields, in one row.
create or replace view public.catalogue_coverage_by_market as
select market,
       count(*) as staged,
       count(*) filter (where match_status in ('auto_mapped', 'approved')) as mapped,
       count(*) filter (where match_status = 'unmapped') as awaiting_review,
       count(*) filter (where match_status = 'no_counterpart') as no_counterpart,
       count(*) filter (where match_status = 'bulk_listing') as bulk_listing,
       count(*) filter (where match_status = 'supplier_no_price') as supplier_no_price,
       count(*) filter (where match_status in ('auto_mapped', 'approved')) > 0 as supplies_prices,
       max(last_seen) as last_seen
  from public.catalogue_products
 group by market;

grant select on public.catalogue_coverage_by_market to authenticated, service_role;

select public.classify_catalogue_backlog(null);
