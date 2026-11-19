-- Reverses 20261119170000_icf_eifs_gb_remaining_roles.sql
DELETE FROM public.price_scan_sources
WHERE (market = 'GB' AND material_slug = 'gb-eifs-primer')
   OR (market = 'AU' AND material_slug IN ('au-eifs-adhesive', 'au-eifs-finish', 'au-eifs-primer'));

DELETE FROM public.market_material_roles
WHERE market = 'GB' AND role IN ('icf-rebar', 'eifs-finish', 'icf-concrete');

DELETE FROM public.estimation_prices p
USING public.estimation_materials m
WHERE p.ref_id = m.id
  AND p.effective_date = '2026-11-19'
  AND m.slug IN ('gb-icf-rebar', 'gb-eifs-finish', 'gb-icf-concrete');

DELETE FROM public.estimation_materials
WHERE slug IN ('gb-icf-rebar', 'gb-eifs-finish', 'gb-icf-concrete',
               'gb-eifs-primer', 'au-eifs-adhesive', 'au-eifs-finish', 'au-eifs-primer');
