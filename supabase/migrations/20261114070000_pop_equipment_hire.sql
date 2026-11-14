-- Equipment as a first-class POP cost line.
--
-- Plant and tool hire (a scaffold tower, a mixer, a grinder) is not consumed by
-- area and not owned by the crew: it is hired by the day. So pop_materials gains
-- an "equipment" category and a "per_day" quantity basis, priced as
-- days × per_day_rate × unit_price, where unit_price is the day rate.
--
-- No rows are seeded: hire rates are market data that must be reviewed before
-- they go into a price book. An admin adds them, and until a line exists the
-- estimator simply has no equipment cost.

alter table public.pop_materials
  add column if not exists per_day_rate numeric;

alter table public.pop_materials
  drop constraint if exists pop_materials_category_check;
alter table public.pop_materials
  add constraint pop_materials_category_check
  check (
    category = any (
      array[
        'primary'::text,
        'finishing'::text,
        'decorative'::text,
        'framework'::text,
        'ceiling_boards'::text,
        'fasteners'::text,
        'equipment'::text,
        'labour'::text
      ]
    )
  );

alter table public.pop_materials
  drop constraint if exists pop_materials_quantity_basis_check;
alter table public.pop_materials
  add constraint pop_materials_quantity_basis_check
  check (
    quantity_basis = any (
      array['area'::text, 'per_worker'::text, 'per_day'::text]
    )
  );

-- A hire line without its day rate cannot be priced, and a basis of per_day
-- with no units per day would silently cost zero: refuse both at the source
-- rather than letting the estimator report a number it cannot stand behind.
alter table public.pop_materials
  drop constraint if exists pop_materials_per_day_rate_required;
alter table public.pop_materials
  add constraint pop_materials_per_day_rate_required
  check (
    quantity_basis is distinct from 'per_day'
    or (per_day_rate is not null and per_day_rate > 0)
  );

notify pgrst, 'reload schema';
