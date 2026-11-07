-- Restore the documented NG white cement + screeding paint ratio.
--
-- The live row was carrying coverage 12 m² per group with one coat and a
-- whole bucket of Bond enabled. With 2 paint buckets per 12 m² that is
-- 3.3 L/m² of paint against FRELUX's own published ratio (2 buckets per
-- 20 m² = 2 L/m²), so a 40.5 m² room quoted 8 buckets of paint, 4 bags of
-- white cement and 4 buckets of Bond.
--
-- This restores the seeded ratio (20 m², 2 coats, 20% waste, Bond dormant).
-- Prices are deliberately untouched: they are the owner's commercial figures.
--
-- Rollback: rollback/20261108010000_restore_ng_screeding_mix_ratio_rollback.sql

UPDATE public.screeding_system_config
SET
  coverage_area_m2 = 20,
  default_coats = 2,
  waste_percentage = 20,
  paint_quantity = 2,
  cement_quantity = 1,
  extra_enabled = false,
  updated_at = now()
WHERE system_type = 'white_cement_paint'
  AND market = 'NG'
  AND is_active = true;
