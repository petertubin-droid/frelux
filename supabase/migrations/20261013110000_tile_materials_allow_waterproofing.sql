-- Widen tile_materials_category_check to include 'waterproofing'.
--
-- WHY: 20260820090000_phase_tile_material_breakdown.sql replaced the original
-- constraint with a list that omits 'waterproofing', but production (and the
-- 20261013120000 production_catalog_sync dump) legitimately contain
-- 'waterproofing' rows (e.g. 'Waterproofing Membrane', 'Bituminous membrane roll').
-- Replaying the dump on any database that applied the stricter constraint fails
-- with SQLSTATE 23514, which is what turned Supabase Preview red on every commit.
--
-- Timestamped 20261013110000 so it runs BEFORE the 20261013120000 dump on
-- databases that have not yet applied it. Idempotent: on production the
-- constraint already allows 'waterproofing', so this is a no-op rewrite.
DO $mig$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint
             WHERE conname = 'tile_materials_category_check'
               AND conrelid = 'public.tile_materials'::regclass) THEN
    ALTER TABLE public.tile_materials DROP CONSTRAINT tile_materials_category_check;
  END IF;
  ALTER TABLE public.tile_materials
    ADD CONSTRAINT tile_materials_category_check
    CHECK (category IN ('tile', 'adhesive', 'grout', 'spacer', 'cement', 'sand', 'waterproofing', 'labour', 'other'));
END
$mig$;
