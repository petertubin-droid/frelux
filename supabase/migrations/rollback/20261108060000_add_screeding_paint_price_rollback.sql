-- Rollback for 20261108060000_add_screeding_paint_price.sql

DELETE FROM public.market_material_roles
WHERE market = 'NG' AND role = 'screeding-paint';

DELETE FROM public.estimation_prices p
USING public.estimation_materials m
WHERE p.ref_id = m.id
  AND m.slug = 'ng-screeding-paint-20l'
  AND p.market = 'NG'
  AND p.price_type = 'material';

DELETE FROM public.estimation_materials WHERE slug = 'ng-screeding-paint-20l';
