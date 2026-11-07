-- Rollback for 20261108010000_restore_ng_screeding_mix_ratio.sql
-- Restores the values the row carried before the correction was applied
-- (captured 2026-11-08 from the live row, updated_at 2026-11-07 20:15).

UPDATE public.screeding_system_config
SET
  coverage_area_m2 = 12,
  default_coats = 1,
  waste_percentage = 10,
  paint_quantity = 2,
  cement_quantity = 1,
  extra_enabled = true,
  updated_at = now()
WHERE system_type = 'white_cement_paint'
  AND market = 'NG'
  AND is_active = true;
