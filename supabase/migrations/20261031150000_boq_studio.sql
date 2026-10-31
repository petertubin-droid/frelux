-- 20261031150000_boq_studio.sql
-- Bill of Quantities Studio: template registry, editable section library, and a
-- rich document payload on the existing quote table.
--
-- Design notes:
--  * boq_quotes is reused (no parallel BOQ table). Its existing `items` and
--    `totals` columns keep serving the quote workflow untouched; the studio
--    writes its structured document into `boq_document`.
--  * boq_quote_revisions already snapshots a quote for history, so a revision
--    of a studio document is stored the same way.
--  * Templates and the section library are admin-managed configuration, not
--    user data.
--
-- ROLLBACK:
--   alter table public.boq_quotes
--     drop column if exists boq_document,
--     drop column if exists template_slug,
--     drop column if exists measurement_system,
--     drop column if exists market_code;
--   drop table if exists public.boq_section_library;
--   drop table if exists public.boq_templates;

alter table public.boq_quotes add column if not exists boq_document jsonb;
alter table public.boq_quotes add column if not exists template_slug text;
alter table public.boq_quotes add column if not exists measurement_system text default 'metric';
alter table public.boq_quotes add column if not exists market_code text;

create table if not exists public.boq_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  standard text not null default 'Commercial',
  market_code text,
  currency text,
  measurement_system text not null default 'metric' check (measurement_system in ('metric','imperial')),
  rounding_decimals integer not null default 2 check (rounding_decimals between 0 and 4),
  show_material_rate boolean not null default true,
  show_labour_rate boolean not null default true,
  show_plant_rate boolean not null default false,
  page_size text not null default 'a4',
  footer_note text,
  default_preliminaries_pct numeric(6,3) not null default 0,
  default_overhead_profit_pct numeric(6,3) not null default 0,
  default_contingency_pct numeric(6,3) not null default 0,
  default_retention_pct numeric(6,3) not null default 0,
  default_tax_pct numeric(6,3),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boq_section_library (
  id uuid primary key default gen_random_uuid(),
  standard text not null default 'Commercial',
  code text not null,
  title text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (standard, code)
);

create index if not exists boq_quotes_user_idx on public.boq_quotes (user_id, updated_at desc);
create index if not exists boq_section_library_order_idx on public.boq_section_library (standard, sort_order);

alter table public.boq_templates enable row level security;
alter table public.boq_section_library enable row level security;

drop policy if exists boq_templates_read on public.boq_templates;
create policy boq_templates_read on public.boq_templates
  for select to authenticated using (is_active or is_admin());

drop policy if exists boq_templates_admin_write on public.boq_templates;
create policy boq_templates_admin_write on public.boq_templates
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists boq_sections_read on public.boq_section_library;
create policy boq_sections_read on public.boq_section_library
  for select to authenticated using (is_active or is_admin());

drop policy if exists boq_sections_admin_write on public.boq_section_library;
create policy boq_sections_admin_write on public.boq_section_library
  for all to authenticated using (is_admin()) with check (is_admin());

grant select on public.boq_templates, public.boq_section_library to authenticated;
grant insert, update, delete on public.boq_templates, public.boq_section_library to authenticated;
grant all on public.boq_templates, public.boq_section_library to service_role;

-- The sixteen measured sections required for a Nigerian commercial BOQ, plus
-- preliminaries and external works. Seeded once; admins edit from here on.
insert into public.boq_section_library (standard, code, title, sort_order)
values
  ('Commercial','01','Preliminaries',10),
  ('Commercial','02','Site Preparation',20),
  ('Commercial','03','Earthworks',30),
  ('Commercial','04','Foundation',40),
  ('Commercial','05','Concrete Works',50),
  ('Commercial','06','Reinforcement',60),
  ('Commercial','07','Blockwork',70),
  ('Commercial','08','Roofing',80),
  ('Commercial','09','Doors and Windows',90),
  ('Commercial','10','Electrical Installations',100),
  ('Commercial','11','Plumbing Installations',110),
  ('Commercial','12','Plastering',120),
  ('Commercial','13','Screeding',130),
  ('Commercial','14','Flooring',140),
  ('Commercial','15','Ceiling Works',150),
  ('Commercial','16','Painting',160),
  ('Commercial','17','Finishing',170),
  ('Commercial','18','External Works',180)
on conflict (standard, code) do nothing;

insert into public.boq_templates (slug, name, description, standard, market_code, currency, measurement_system,
  show_plant_rate, default_preliminaries_pct, default_overhead_profit_pct, default_contingency_pct, default_retention_pct, default_tax_pct)
values
  ('ng-commercial','Nigeria Commercial BOQ','Nigerian building procurement, 18 measured sections.','Commercial','NG','NGN','metric',
    false, 2.5, 10, 5, 0, 7.5),
  ('ng-nrm2','Nigeria NRM2','RICS New Rules of Measurement 2 layout.','NRM2','NG','NGN','metric',
    false, 2.5, 10, 5, 5, 7.5),
  ('uk-nrm2','United Kingdom NRM2','NRM2 for UK tendering and JCT contracts.','NRM2','GB','GBP','metric',
    true, 3, 10, 5, 5, 20),
  ('international-icms','International ICMS','ICMS cost classification for cross-border reporting.','ICMS',null,'USD','metric',
    true, 0, 8, 5, 0, null)
on conflict (slug) do nothing;
