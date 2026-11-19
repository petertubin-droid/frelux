-- Reverses 20261119150000_icf_eifs_gb_au_roles.sql
DELETE FROM public.market_material_roles
WHERE (market = 'GB' AND role IN ('eifs-basecoat', 'eifs-adhesive', 'eifs-mesh'))
   OR (market = 'AU' AND role IN ('eifs-basecoat', 'eifs-mesh', 'icf-rebar'));

DELETE FROM public.estimation_prices p
USING public.estimation_materials m
WHERE p.ref_id = m.id
  AND p.effective_date = '2026-11-19'
  AND m.slug IN ('gb-eifs-basecoat', 'gb-eifs-adhesive', 'gb-eifs-mesh',
                 'au-eifs-basecoat', 'au-eifs-mesh', 'au-icf-rebar');

DELETE FROM public.estimation_materials
WHERE slug IN ('gb-eifs-basecoat', 'gb-eifs-adhesive', 'gb-eifs-mesh',
               'au-eifs-basecoat', 'au-eifs-mesh', 'au-icf-rebar');
