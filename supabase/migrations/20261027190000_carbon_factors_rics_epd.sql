-- Sustainability Pillar 5: RICS/EN 15978 lifecycle modules + EPD provenance
-- on carbon factors. New columns are nullable so every existing row stays
-- valid; a NULL module_stage means the product-stage (A1-A3) assumption is
-- applied by the engine and surfaced in the assessment warnings.

alter table public.carbon_factors
  add column if not exists module_stage text,
  add column if not exists epd_id text,
  add column if not exists epd_plant text;

comment on column public.carbon_factors.module_stage is
  'RICS/EN 15978 lifecycle module (A1, A2, A3, A4, A5, B1..B7, C1..C4, D). NULL = product stage (A1-A3, cradle to gate) assumed by the engine and stated in the assessment warnings.';
comment on column public.carbon_factors.epd_id is
  'EC3/OpenEPD declaration id when this factor was sourced from a third-party verified EPD (Building Transparency EC3).';
comment on column public.carbon_factors.epd_plant is
  'Manufacturing plant for plant-specific EPD factors.';

-- Valid-module guard: only RICS/EN 15978 module codes are accepted.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'carbon_factors_module_stage_rics'
  ) then
    alter table public.carbon_factors
      add constraint carbon_factors_module_stage_rics
      check (
        module_stage is null
        or module_stage in (
          'A1','A2','A3','A4','A5',
          'B1','B2','B3','B4','B5','B6','B7',
          'C1','C2','C3','C4','D'
        )
      );
  end if;
end $$;

-- Index for the category merge path (EPD vs admin factor resolution).
create index if not exists carbon_factors_category_active_idx
  on public.carbon_factors (lower(category)) where is_active;
