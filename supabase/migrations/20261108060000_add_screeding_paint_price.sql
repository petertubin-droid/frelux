-- Add the owner's screeding paint price to the NG price book.
--
-- The white cement + screeding paint system was pricing its paint line from the
-- "interior-paint" slot, which in NG holds interior emulsion at NGN 17,000 per
-- 20 L can. Screeding paint is a different, cheaper product, quoted by the owner
-- at NGN 4,500 per 20 L bucket.
--
-- One observation, recorded as reported rather than verified: a single
-- owner-supplied figure is not independent corroboration.
--
-- Rollback: rollback/20261108060000_add_screeding_paint_price_rollback.sql

INSERT INTO public.estimation_materials
  (name, slug, category, description, notes, effective_date, is_active, sort_order, last_updated_via)
VALUES
  ('Nigerian Screeding Paint (20 L bucket)', 'ng-screeding-paint-20l', 'paint',
   'Screeding paint sold by the 20 L bucket, used with white cement for the traditional Nigerian screed.',
   'Owner-supplied price: NGN 4,500 per 20 L bucket (2026-11-08). Single observation, not independently verified.',
   '2026-11-08', true, 77, 'manual')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  notes = EXCLUDED.notes,
  effective_date = EXCLUDED.effective_date,
  is_active = true,
  updated_at = now();

INSERT INTO public.estimation_prices
  (price_type, ref_id, price, currency, effective_date, notes, is_active,
   price_source, scan_confidence, market, origin, verification_status, supporting_submissions)
SELECT 'material', m.id, 4500, 'NGN', '2026-11-08',
       'Owner-supplied screeding paint price: NGN 4,500 per 20 L bucket (2026-11-08). One observation, not independently verified.',
       true, 'owner', 'manual', 'NG', 'manual', 'reported', 1
FROM public.estimation_materials m
WHERE m.slug = 'ng-screeding-paint-20l'
  AND NOT EXISTS (
    SELECT 1 FROM public.estimation_prices p
    WHERE p.ref_id = m.id AND p.market = 'NG' AND p.price_type = 'material'
      AND p.effective_date = '2026-11-08'
  );

INSERT INTO public.market_material_roles
  (market, role, material_slug, display_name, unit_label, notes, is_active, sort_order)
VALUES
  ('NG', 'screeding-paint', 'ng-screeding-paint-20l', 'Screeding Paint (20 L bucket)', 'bucket',
   'Priced by the owner at NGN 4,500 per 20 L bucket; used by the white cement + screeding paint system.', true, 78)
ON CONFLICT (market, role) DO UPDATE SET
  material_slug = EXCLUDED.material_slug,
  display_name = EXCLUDED.display_name,
  unit_label = EXCLUDED.unit_label,
  notes = EXCLUDED.notes,
  is_active = true,
  updated_at = now();
