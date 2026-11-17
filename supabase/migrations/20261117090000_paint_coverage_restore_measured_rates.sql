-- =========================================================
-- FRELUX: restore the measured paint coverage rates
--
-- The paint_types rows were seeded on 2026-07-26 at rates the published
-- product data supports (Emulsion 10, Gloss 12, Satin 11, Enamel 13, Primer
-- 12 m2 per litre per coat). On 2026-08-22 every one of them was edited down
-- and a "Matt" row was added at 5 m2/L. The engine divides area by coverage to
-- get litres, so the production rates asked for between 1.5 and 2.5 times the
-- paint: a 100 m2 wall in two coats came out at 50 L of emulsion instead of
-- 20 L.
--
-- Measured spread rates, all per coat:
--   Berger Paints Nigeria, Luxol Emulsion technical manual: 10 to 12 m2/L
--   Berger Super White acrylic emulsion: 11.6 m2/L
--   Dulux Trade Vinyl Matt: up to 17 m2/L
--   A US gallon covering 350 sq ft is 8.6 m2/L
--
-- The restored figures sit at or below the published rates where the sources
-- disagree, because over-supplying is the safer error for a site estimate, and
-- the engine warns when a configured rate falls under 8 m2/L.
-- =========================================================

UPDATE public.paint_types SET coverage_rate = 10, coverage_unit = 'm2_per_liter'
 WHERE name = 'Emulsion';

UPDATE public.paint_types SET coverage_rate = 11, coverage_unit = 'm2_per_liter'
 WHERE name = 'Matt';

UPDATE public.paint_types SET coverage_rate = 12, coverage_unit = 'm2_per_liter'
 WHERE name = 'Gloss';

UPDATE public.paint_types SET coverage_rate = 11, coverage_unit = 'm2_per_liter'
 WHERE name = 'Satin';

UPDATE public.paint_types SET coverage_rate = 13, coverage_unit = 'm2_per_liter'
 WHERE name = 'Enamel';

UPDATE public.paint_types SET coverage_rate = 12, coverage_unit = 'm2_per_liter'
 WHERE name = 'Primer-only';
