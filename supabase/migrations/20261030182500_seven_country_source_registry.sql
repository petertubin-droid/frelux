
alter table public.price_scan_sources drop constraint if exists price_scan_sources_source_type_check;
alter table public.price_scan_sources add constraint price_scan_sources_source_type_check
  check (source_type in ('product','search','index'));
drop view if exists public.country_coverage_seven;
update public.price_scan_sources
   set can_price_products = public.source_class_prices_products(source_class)
                             and coalesce(source_format,'') = 'product',
       access_status = coalesce(access_status, case
         when coalesce(source_format,'') = 'search' then 'search_page_only'
         when last_scan_status = 'failed' then 'blocked'
         when last_scan_status = 'ok' then 'open'
         else 'untested' end),
       access_notes = coalesce(access_notes, case
         when coalesce(source_format,'') = 'search'
         then 'Search results page, not a product page. Cannot yield a verified price.' end)
 where can_price_products is null
    or can_price_products is distinct from (public.source_class_prices_products(source_class) and coalesce(source_format,'') = 'product');

with v(market, publisher, label, url, cls, lic, lic_url, attrib, access, notes, fmt) as (values
 ('GB','Office for National Statistics / data.gov.uk','Building materials and components statistics','https://www.data.gov.uk/dataset/75ee36ed-21f7-4d7b-9e7c-f5bf4546145d/building-materials-and-components-statistics','official_government_statistics','Open Government Licence v3.0','https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/','Contains public sector information licensed under the Open Government Licence v3.0.','open_api','CKAN package API responds (verified 2026-10-30). Statistics dataset, not product prices.','api'),
 ('US','U.S. Bureau of Labor Statistics','Producer Price Index databases','https://www.bls.gov/ppi/databases/','official_price_index','Public domain (U.S. Government work)','https://www.bls.gov/opub/privacy.htm','Source: U.S. Bureau of Labor Statistics, Producer Price Index.','open_api','Public API v2 responds without a key (verified 2026-10-30). Index values only.','api'),
 ('CN','National Bureau of Statistics of China','National statistics (English)','https://www.stats.gov.cn/english/','official_government_statistics','Chinese government publication terms','https://www.stats.gov.cn/english/','Source: National Bureau of Statistics of China.','html_only','English site reachable; machine API needs a registered key. No product prices.','search'),
 ('CA','Statistics Canada','Table 18-10-0289-01, construction materials price indexes','https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810028901','official_price_index','Statistics Canada Open Licence','https://www.statcan.gc.ca/en/reference/licence','Adapted from Statistics Canada table 18-10-0289-01.','open_api','WDS API reachable; vector identifiers required before a series can be pulled.','api'),
 ('AU','Australian Bureau of Statistics','Producer Price Indexes, Australia','https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/producer-price-indexes-australia/latest-release','official_price_index','Creative Commons Attribution 4.0','https://www.abs.gov.au/website-privacy-copyright-and-disclaimer','Source: Australian Bureau of Statistics.','html_only','Release page reachable; SDMX host did not answer from this environment.','search'),
 ('MX','INEGI','API del Banco de Indicadores','https://www.inegi.org.mx/servicios/api_indicadores.html','official_government_statistics','INEGI terms of free use','https://www.inegi.org.mx/inegi/terminos.html','Source: INEGI.','needs_credentials','API requires a personal token before any indicator can be read.','api'),
 ('AE','Statistics Centre Abu Dhabi','statad.gov.ae open statistics','https://statad.gov.ae/','official_government_statistics','UAE open data terms','https://statad.gov.ae/','Source: Statistics Centre Abu Dhabi.','html_only','Portal reachable; no documented price API found.','search'),
 ('AE','Statistics Centre Ras Al Khaimah','Building materials prices','https://css.rak.ae/en/home/statistics-themes/economic-statistics/building-materials-prices/','official_government_statistics','RAK government publication terms','https://css.rak.ae/en/home/','Source: Statistics Centre Ras Al Khaimah, building materials prices.','html_only','Published market prices on an HTML page; needs a permitted extraction route.','search'),
 ('AE','Dubai Statistics Center','dsc.gov.ae','https://www.dsc.gov.ae/','official_government_statistics','Dubai open data terms','https://www.dsc.gov.ae/','Source: Dubai Statistics Center.','html_only','Portal redirects; no documented price API found.','search')
)
insert into public.price_scan_sources
  (market, material_slug, retailer, label, product_url, currency, is_active, source_type, source_format,
   publisher, source_class, can_price_products, licence_name, licence_url, attribution_text,
   access_status, access_notes, cadence_hours, next_scan_at, notes)
select v.market, '__index__', v.publisher, v.label, v.url,
       mp.currency_code, false, 'product', v.fmt,
       v.publisher, v.cls, false, v.lic, v.lic_url, v.attrib,
       v.access, v.notes, 168, now() + interval '7 days', 'Official statistics connection'
from v join public.market_profiles mp on mp.country_code = v.market
where not exists (select 1 from public.price_scan_sources s where s.product_url = v.url);

create or replace view public.country_coverage_seven as
with codes(code) as (values ('GB'),('US'),('CN'),('CA'),('AU'),('MX'),('AE')),
price_state as (
  select p.market,
         count(*) filter (where p.supplier_price is not null) as priced_materials,
         count(*) filter (where p.verification_status = 'pending_approval') as awaiting_approval,
         count(distinct public.canonical_category(m.category)) filter (where p.supplier_price is not null) as categories_priced
  from public.market_material_prices p
  left join public.estimation_materials m on m.id = p.material_id
  group by p.market
)
select mp.country_code as market,
       mp.country_name,
       mp.currency_code as currency,
       (select count(*) from public.price_scan_sources s where s.market = mp.country_code and s.is_active) as active_product_sources,
       (select count(*) from public.price_scan_sources s where s.market = mp.country_code
          and s.source_class like 'official%') as official_sources,
       (select count(*) from public.price_scan_sources s where s.market = mp.country_code
          and s.source_class like 'official%' and s.access_status = 'open_api') as official_sources_live,
       (select count(*) from public.price_scan_sources s where s.market = mp.country_code
          and s.is_active and s.can_price_products) as product_sources,
       (select count(*) from public.market_index_series i where i.market = mp.country_code and not i.is_test) as index_points,
       (select max(i.period_start) from public.market_index_series i where i.market = mp.country_code) as latest_index_period,
       (select max(i.collected_at) from public.market_index_series i where i.market = mp.country_code) as last_index_at,
       (select count(*) from public.market_price_observations o where o.market = mp.country_code
          and o.price is not null and not coalesce(o.is_test,false) and not coalesce(o.is_outlier,false)) as product_observations,
       (select count(distinct o.supplier_name) from public.market_price_observations o
         where o.market = mp.country_code and o.price is not null) as suppliers,
       (select max(o.observed_at) from public.market_price_observations o
         where o.market = mp.country_code and o.price is not null) as last_product_at,
       coalesce(ps.awaiting_approval, 0) as awaiting_approval,
       (select count(*) from public.market_price_alerts a where a.market = mp.country_code and a.acknowledged_at is null) as open_alerts,
       coalesce(ps.categories_priced, 0) as categories_priced,
       (select count(*) from public.material_categories) as categories_required,
       coalesce(ps.priced_materials, 0) as priced_materials,
       case
         when coalesce(ps.categories_priced,0) >= (select count(*) from public.material_categories) then 'covered'
         when coalesce(ps.priced_materials,0) > 0 then 'partial_supplier_prices'
         when (select count(*) from public.market_index_series i where i.market = mp.country_code) > 0 then 'index_only'
         else 'no_data' end as coverage_status
from public.market_profiles mp
left join price_state ps on ps.market = mp.country_code
where mp.country_code in (select code from codes);
