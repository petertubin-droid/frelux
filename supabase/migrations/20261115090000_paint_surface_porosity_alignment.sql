-- Align the paint surface factors with the porosity profiles.
--
-- The site-conditions module models absorption: bare fresh plaster needs about a
-- third more paint than a prepared screed, and a sealed repaint needs about 15%
-- less. The database table, which the paint calculator actually reads, still
-- carried the older flatter figures, so the two disagreed. This records the
-- aligned values and adds the neutral baseline the engine now defaults to.
--
-- Idempotent: updates by key, inserts only when missing.

update public.estimation_surface_conditions
   set coverage_adjustment_factor = 0.75,
       description = coalesce(description, '')
         || ' Unsealed fresh plaster: about 33% more paint on the first coat.',
       updated_at = now()
 where condition_key = 'new_plastered'
   and coverage_adjustment_factor is distinct from 0.75;

update public.estimation_surface_conditions
   set coverage_adjustment_factor = 1.15,
       description = coalesce(description, '')
         || ' Sealed, sound surface: about 15% less paint than a bare screed.',
       updated_at = now()
 where condition_key = 'previously_painted_sound'
   and coverage_adjustment_factor is distinct from 1.15;

insert into public.estimation_surface_conditions
  (condition_key, name, description, requires_preparation,
   primer_recommended, is_active, sort_order)
select 'screeded', 'Screeded / Prepared Plaster',
       'Sound prepared plaster, unpainted: the standard coverage baseline.',
       false, false, true, 0
where not exists (
  select 1 from public.estimation_surface_conditions
   where condition_key = 'screeded'
);
