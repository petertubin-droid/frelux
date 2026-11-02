-- Verified supplier catalogues, registered from evidence rather than hope.
--
-- Each source below was fetched on 2026-10-31 and returned a machine readable
-- product list containing building materials. See
-- scripts/price-scan/verified-sources.json for the probe output, product counts
-- and the sources that failed.
--
-- Registering a source does not put a price in the book. The catalogue is
-- staged, each product must be matched to a material, and the normal consensus
-- path promotes it. That distinction is the point: coverage grows on evidence.
--
-- Rows are inserted only when the catalogue URL is not already present, so this
-- migration is safe to re-run.

do $$
declare
  s record;
  inserted integer := 0;
begin
  for s in
    select *
      from (values
        ('AU', 'Paint Access', 'Paint Access (AU)',
         'https://paintaccess.com.au/products.json?limit=250',
         'AUD', 'https://paintaccess.com.au',
         'Public products.json. Paint and coatings coverage for Australia.'),
        ('AU', 'Plyco', 'Plyco (AU)',
         'https://plyco.com.au/products.json?limit=250',
         'AUD', 'https://plyco.com.au',
         'Public products.json. Timber and plywood coverage for Australia.'),
        ('CA', 'Handley Lumber', 'Handley Lumber (CA)',
         'https://handleylumber.com/products.json?limit=250',
         'CAD', 'https://handleylumber.com',
         'Public products.json. Lumber and building supplies for Canada.'),
        ('IE', 'Woodworkers', 'Woodworkers (IE)',
         'https://woodworkers.ie/products.json?limit=250',
         'EUR', 'https://woodworkers.ie',
         'Public products.json. Timber coverage for Ireland.')
      ) as t(market, retailer, publisher, catalogue_url, currency, base_url, notes)
  loop
    if not exists (
      select 1 from public.price_scan_sources
       where product_url = s.catalogue_url
    ) then
      insert into public.price_scan_sources (
        market, material_slug, retailer, label, product_url,
        expected_unit, currency, is_active,
        source_class, publisher, can_price_products,
        licence_name, licence_url, attribution_text,
        access_status, access_notes, reliability_score, source_format
      ) values (
        s.market,
        '_catalogue',
        s.retailer,
        s.retailer || ' catalogue (' || s.market || ')',
        s.catalogue_url,
        'unit',
        s.currency,
        true,
        'retail_catalogue',
        s.publisher,
        true,
        'Supplier storefront terms',
        s.base_url || '/policies/terms-of-service',
        'Prices from ' || s.retailer || ' (' || s.market || ')',
        'ok',
        s.notes,
        0.6,
        'json'
      );
      inserted := inserted + 1;
    end if;
  end loop;
  raise notice 'verified catalogues registered: %', inserted;
end $$;
