-- Verified supplier catalogues, second sweep: 11 November 2026.
--
-- Six storefronts returned a machine readable product list in their own market
-- currency and were re-read on 2026-11-11 with product titles inspected, not
-- just counted. Evidence lives in scripts/price-scan/verified-sources.json
-- (source entries plus the candidates that failed and why).
--
-- Registering a catalogue still does not put a price in the book. The catalogue
-- is staged, products are matched to materials by the matcher in
-- supabase/functions/price-intel-scan, and only matched rows enter the normal
-- consensus path. Local prices replace the FX reference rows only after that.
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
        ('AE', 'Nextrise', 'Nextrise (AE)',
         'https://nextrisedubai.com/wp-json/wc/store/products?per_page=100',
         'AED', 'https://nextrisedubai.com',
         0.6,
         'WooCommerce store API. Cement, aggregate, blocks, rebar, paint, ridge and pipe in AED.'),
        ('MX', 'Materiales de Construccion', 'Materiales de Construccion (MX)',
         'https://materialesconstruccion.mx/wp-json/wc/store/products?per_page=100',
         'MXN', 'https://materialesconstruccion.mx',
         0.6,
         'WooCommerce store API. Cement, block and plumbing in MXN, priced per bag and per piece.'),
        ('KE', 'Randtech Kenya', 'Randtech Kenya (KE)',
         'https://randtech.co.ke/wp-json/wc/store/products?per_page=100',
         'KES', 'https://randtech.co.ke',
         0.6,
         'WooCommerce store API. Cement, rebar, paint, waterproofing and pipe in KES.'),
        ('ZA', 'DIY Shop', 'DIY Shop (ZA)',
         'https://diyshop.co.za/products.json?limit=250',
         'ZAR', 'https://diyshop.co.za',
         0.6,
         'Shopify products.json. Plaster, cement, blocks, timber and paint in ZAR. Store currency is not in the payload, so the registry currency is the assertion.'),
        ('ZA', 'Buildmat', 'Buildmat (ZA)',
         'https://buildmat.co.za/wp-json/wc/store/products?per_page=100',
         'ZAR', 'https://buildmat.co.za',
         0.6,
         'WooCommerce store API. Paint, timber, cement, rebar and roofing in ZAR. Store currency asserted at registry level.'),
        ('AU', 'Trade Warehouse', 'Trade Warehouse (AU)',
         'https://tradewarehouse.com.au/products.json?limit=250',
         'AUD', 'https://tradewarehouse.com.au',
         0.6,
         'Shopify products.json. Cement, sand, timber, roofing, paint and pipe in AUD. Store currency asserted at registry level.')
      ) as t(market, retailer, publisher, catalogue_url, currency, base_url,
             reliability, notes)
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
        '*',
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
        s.reliability,
        'json'
      );
      inserted := inserted + 1;
    end if;
  end loop;
  raise notice 'verified catalogues registered (2026-11-11): %', inserted;
end $$;
