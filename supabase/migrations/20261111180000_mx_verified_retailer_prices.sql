-- First verified Mexican retail captures for the market benchmarks.
--
-- Every MX price row so far is a web survey (origin 'scan', status 'reported'):
-- "Comex 19L MX$1,199" with no page behind it. These three come from one
-- retailer that publishes each pack size separately, so the figure is the
-- price of the 19 L cubeta itself rather than the per-litre headline a
-- variable product shows. Captured with scripts/price-scan/woo-variant-price.mjs
-- on 2026-11-11.
--
-- Two benchmark materials are added rather than reusing the brand SKUs they
-- resemble: mx-sellador-19l is Acuario 501 and mx-imperm-19l is Fester
-- Imperfacil 22.8 L, so filing an Adhekon 19 L bucket under either would put
-- another product's price into that material's median.

begin;

insert into estimation_materials (name, slug, category, is_active, sort_order, last_updated_via, regional_multiplier, base_price)
values
  ('Sellador vinílico 19 L (MX)', 'mx-bench-sellador-19l', 'paint', true, 0, 'manual', 1, 0),
  ('Impermeabilizante acrílico 5 años 19 L (MX)', 'mx-bench-imperm-19l', 'waterproofing', true, 0, 'manual', 1, 0)
on conflict (slug) do nothing;

with capture(slug, price, url, note) as (values
  ('mx-vinilica-19l', 495::numeric,
   'https://materialesconstruccion.mx/tienda/adheckon/pinturas/pintura-vinilica-basica/',
   'Materiales de Construcción MX: Adhekon Pintura Vinílica Básica, cubeta 19 L, MX$495 (variant price, captured 2026-11-11)'),
  ('mx-bench-sellador-19l', 790::numeric,
   'https://materialesconstruccion.mx/tienda/adheckon/sellador-vinilico/',
   'Materiales de Construcción MX: Adhekon Sellador Vinílico 5x1, cubeta 19 L, MX$790 (variant price, captured 2026-11-11)'),
  ('mx-bench-imperm-19l', 1150::numeric,
   'https://materialesconstruccion.mx/tienda/adheckon/impermeabilizante-precios/impermeabilizante-acrilico-5/',
   'Materiales de Construcción MX: Adhekon Impermeabilizante Acrílico 5 años, cubeta 19 L, MX$1,150 (variant price, captured 2026-11-11)')
)
update estimation_prices p
set price = capture.price,
    currency = 'MXN',
    price_source = capture.note,
    origin = 'manual',
    verification_status = 'verified',
    scan_confidence = 'high',
    source_url = capture.url,
    verified_at = timestamptz '2026-11-11 16:45:00+00',
    price_kind = 'retail',
    market = 'MX',
    last_scanned_at = now(),
    updated_at = now()
from capture
join estimation_materials m on m.slug = capture.slug
where p.ref_id = m.id and p.price_type = 'material';

with capture(slug, price, url, note) as (values
  ('mx-vinilica-19l', 495::numeric,
   'https://materialesconstruccion.mx/tienda/adheckon/pinturas/pintura-vinilica-basica/',
   'Materiales de Construcción MX: Adhekon Pintura Vinílica Básica, cubeta 19 L, MX$495 (variant price, captured 2026-11-11)'),
  ('mx-bench-sellador-19l', 790::numeric,
   'https://materialesconstruccion.mx/tienda/adheckon/sellador-vinilico/',
   'Materiales de Construcción MX: Adhekon Sellador Vinílico 5x1, cubeta 19 L, MX$790 (variant price, captured 2026-11-11)'),
  ('mx-bench-imperm-19l', 1150::numeric,
   'https://materialesconstruccion.mx/tienda/adheckon/impermeabilizante-precios/impermeabilizante-acrilico-5/',
   'Materiales de Construcción MX: Adhekon Impermeabilizante Acrílico 5 años, cubeta 19 L, MX$1,150 (variant price, captured 2026-11-11)')
)
insert into estimation_prices
  (price_type, ref_id, price, currency, price_source, origin, verification_status,
   scan_confidence, source_url, verified_at, price_kind, market, effective_date, is_active)
select 'material', m.id, capture.price, 'MXN', capture.note, 'manual', 'verified',
       'high', capture.url, timestamptz '2026-11-11 16:45:00+00', 'retail', 'MX', date '2026-11-11', true
from capture
join estimation_materials m on m.slug = capture.slug
where not exists (
  select 1 from estimation_prices p where p.ref_id = m.id and p.price_type = 'material'
);

commit;
