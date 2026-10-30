-- FRELUX Site & Soil Intelligence Engine
--
-- ROLLBACK PLAN (no existing object is altered by this migration; run in this
-- order to undo it completely):
--   drop table if exists public.site_intelligence_audit;
--   drop table if exists public.foundation_scenarios;
--   drop table if exists public.geotechnical_reports;
--   drop table if exists public.project_sites;
--   drop table if exists public.regional_site_profiles;
--   drop table if exists public.soil_classifications;
--   drop function if exists public.is_site_reviewer();
--
-- Design constraints, deliberately enforced in the schema:
--   * No table stores a bearing capacity that a human did not enter. Regional
--     data is screening only and carries a source reference.
--   * A soil classification maps to no numeric strength. It describes material,
--     not capacity, so nothing can silently size a foundation from a dropdown.
--   * Reports carry their own verification state, separate from the uploader.

-- Reviewers: administrators, plus verified professionals who may confirm
-- geotechnical findings on a project they can already see.
create or replace function public.is_site_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'professional')
  );
$$;

-- 1. Soil classifications -----------------------------------------------------
create table if not exists public.soil_classifications (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  code text not null unique,
  name text not null,
  name_fr text,
  summary text not null,
  engineering_notes text not null,
  implication text not null,
  drainage_flag boolean not null default false,
  dewatering_flag boolean not null default false,
  ground_improvement_flag boolean not null default false,
  investigation_priority text not null default 'standard'
    check (investigation_priority in ('standard', 'elevated', 'essential')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Regional screening profiles ---------------------------------------------
-- Screening only. Every row must name where its statement came from, and a
-- profile without a source is not published to the public page.
create table if not exists public.regional_site_profiles (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  region_slug text not null,
  region_name text not null,
  city_slug text,
  soil_classification_id uuid references public.soil_classifications (id) on delete set null,
  groundwater_note text,
  flood_exposure text check (flood_exposure in ('low', 'moderate', 'high', 'unknown')),
  drainage_note text,
  terrain_note text,
  erosion_note text,
  source_reference text not null,
  source_url text,
  source_year integer,
  verification_status text not null default 'sourced'
    check (verification_status in ('sourced', 'verified', 'withdrawn')),
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, region_slug, city_slug)
);

-- 3. Project sites -----------------------------------------------------------
create table if not exists public.project_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id uuid references public.user_projects (id) on delete set null,
  label text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  address text,
  country_code text,
  city_slug text,
  soil_classification_id uuid references public.soil_classifications (id) on delete set null,
  -- Where the classification came from. A selection is not a finding.
  soil_source text not null default 'not_stated'
    check (soil_source in ('not_stated', 'map_screening', 'user_selection', 'report_verified')),
  screening jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_sites_user_idx on public.project_sites (user_id, created_at desc);
create index if not exists project_sites_project_idx on public.project_sites (project_id);

-- 4. Geotechnical reports ----------------------------------------------------
create table if not exists public.geotechnical_reports (
  id uuid primary key default gen_random_uuid(),
  project_site_id uuid not null references public.project_sites (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  report_type text not null
    check (report_type in ('soil_investigation', 'borehole_log', 'laboratory', 'bearing_capacity', 'groundwater')),
  title text not null,
  storage_path text not null,
  original_filename text,
  report_date date,
  prepared_by text,
  findings text,
  -- Only ever transcribed from the uploaded document by a human.
  bearing_capacity_kpa numeric check (bearing_capacity_kpa is null or bearing_capacity_kpa > 0),
  groundwater_depth_m numeric check (groundwater_depth_m is null or groundwater_depth_m >= 0),
  borehole_count integer check (borehole_count is null or borehole_count > 0),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'rejected')),
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists geotech_reports_site_idx on public.geotechnical_reports (project_site_id, created_at desc);
create index if not exists geotech_reports_status_idx on public.geotechnical_reports (verification_status);

-- 5. Foundation scenarios ----------------------------------------------------
create table if not exists public.foundation_scenarios (
  id uuid primary key default gen_random_uuid(),
  project_site_id uuid not null references public.project_sites (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  foundation_type text not null
    check (foundation_type in ('strip', 'pad', 'raft', 'pile', 'ground_improvement')),
  -- The bearing capacity the scenario actually used, and its provenance. A
  -- scenario cannot exist without saying where the number came from.
  bearing_capacity_kpa numeric not null check (bearing_capacity_kpa > 0),
  bearing_source text not null
    check (bearing_source in ('report_verified', 'user_assumption')),
  assumptions jsonb not null default '{}'::jsonb,
  quantities jsonb not null default '{}'::jsonb,
  cost_breakdown jsonb not null default '{}'::jsonb,
  currency text not null default 'NGN',
  price_basis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists foundation_scenarios_site_idx on public.foundation_scenarios (project_site_id, created_at desc);

-- 6. Audit trail (append-only) ----------------------------------------------
create table if not exists public.site_intelligence_audit (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null default auth.uid(),
  action text not null check (action in (
    'report_verified', 'report_rejected', 'report_uploaded',
    'soil_classification_changed', 'regional_profile_changed',
    'site_saved', 'site_deleted'
  )),
  entity text not null,
  entity_id text not null,
  before jsonb not null default '{}'::jsonb,
  after jsonb not null default '{}'::jsonb,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists site_audit_created_idx on public.site_intelligence_audit (created_at desc);

-- Row level security ---------------------------------------------------------
alter table public.soil_classifications enable row level security;
alter table public.regional_site_profiles enable row level security;
alter table public.project_sites enable row level security;
alter table public.geotechnical_reports enable row level security;
alter table public.foundation_scenarios enable row level security;
alter table public.site_intelligence_audit enable row level security;

drop policy if exists soil_classifications_read on public.soil_classifications;
create policy soil_classifications_read on public.soil_classifications
  for select using (is_active or public.is_admin() or public.is_site_reviewer());

drop policy if exists soil_classifications_admin_write on public.soil_classifications;
create policy soil_classifications_admin_write on public.soil_classifications
  for all using (public.is_admin()) with check (public.is_admin());

-- Screening data is readable once it names a source; drafts stay internal.
drop policy if exists regional_profiles_read on public.regional_site_profiles;
create policy regional_profiles_read on public.regional_site_profiles
  for select using (verification_status in ('sourced', 'verified') or public.is_admin());

drop policy if exists regional_profiles_admin_write on public.regional_site_profiles;
create policy regional_profiles_admin_write on public.regional_site_profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists project_sites_owner_read on public.project_sites;
create policy project_sites_owner_read on public.project_sites
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists project_sites_owner_write on public.project_sites;
create policy project_sites_owner_write on public.project_sites
  for insert with check (user_id = auth.uid());

drop policy if exists project_sites_owner_update on public.project_sites;
create policy project_sites_owner_update on public.project_sites
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists project_sites_owner_delete on public.project_sites;
create policy project_sites_owner_delete on public.project_sites
  for delete using (user_id = auth.uid());

drop policy if exists geotech_reports_read on public.geotechnical_reports;
create policy geotech_reports_read on public.geotechnical_reports
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or (public.is_site_reviewer() and exists (
      select 1 from public.project_sites s where s.id = project_site_id
    ))
  );

drop policy if exists geotech_reports_owner_insert on public.geotechnical_reports;
create policy geotech_reports_owner_insert on public.geotechnical_reports
  for insert with check (
    user_id = auth.uid()
    and verification_status = 'unverified'
    and exists (select 1 from public.project_sites s where s.id = project_site_id and s.user_id = auth.uid())
  );

-- An owner may correct metadata on their own unverified upload, but never set
-- a verification state: that is what the trigger below enforces.
drop policy if exists geotech_reports_owner_update on public.geotechnical_reports;
create policy geotech_reports_owner_update on public.geotechnical_reports
  for update using (user_id = auth.uid() and verification_status = 'unverified')
  with check (user_id = auth.uid() and verification_status = 'unverified');

drop policy if exists geotech_reports_reviewer_update on public.geotechnical_reports;
create policy geotech_reports_reviewer_update on public.geotechnical_reports
  for update using (public.is_site_reviewer()) with check (public.is_site_reviewer());

drop policy if exists geotech_reports_owner_delete on public.geotechnical_reports;
create policy geotech_reports_owner_delete on public.geotechnical_reports
  for delete using (user_id = auth.uid() and verification_status <> 'verified');

drop policy if exists foundation_scenarios_owner on public.foundation_scenarios;
create policy foundation_scenarios_owner on public.foundation_scenarios
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists site_audit_read on public.site_intelligence_audit;
create policy site_audit_read on public.site_intelligence_audit
  for select using (public.is_admin() or actor = auth.uid());

drop policy if exists site_audit_insert on public.site_intelligence_audit;
create policy site_audit_insert on public.site_intelligence_audit
  for insert with check (actor = auth.uid());

-- No update or delete policy: the trail is append-only by construction.

-- A verified report keeps its verification and a verified reading is immutable
-- unless a reviewer changes it, so ordinary owners cannot rewrite evidence.
create or replace function public.guard_report_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_site_reviewer() then
    return new;
  end if;
  if old.verification_status is distinct from new.verification_status
     or old.verified_by is distinct from new.verified_by
     or old.verified_at is distinct from new.verified_at
     or old.review_note is distinct from new.review_note then
    raise exception 'Only a reviewer can change verification state.';
  end if;
  return new;
end;
$$;

drop trigger if exists geotech_reports_guard on public.geotechnical_reports;
create trigger geotech_reports_guard
  before update on public.geotechnical_reports
  for each row execute function public.guard_report_verification();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_sites_touch on public.project_sites;
create trigger project_sites_touch before update on public.project_sites
  for each row execute function public.touch_updated_at();

drop trigger if exists geotech_reports_touch on public.geotechnical_reports;
create trigger geotech_reports_touch before update on public.geotechnical_reports
  for each row execute function public.touch_updated_at();

drop trigger if exists soil_classifications_touch on public.soil_classifications;
create trigger soil_classifications_touch before update on public.soil_classifications
  for each row execute function public.touch_updated_at();

drop trigger if exists regional_profiles_touch on public.regional_site_profiles;
create trigger regional_profiles_touch before update on public.regional_site_profiles
  for each row execute function public.touch_updated_at();

-- Seed: descriptive classifications only. No strength values, because a soil
-- name is not a bearing capacity and must never be read as one.
insert into public.soil_classifications
  (slug, code, name, name_fr, summary, engineering_notes, implication, drainage_flag, dewatering_flag, ground_improvement_flag, investigation_priority, sort_order)
values
  ('clay', 'CL', 'Clay', 'Argile',
   'Fine-grained, cohesive material that holds water and changes volume with moisture.',
   'Strength and compressibility depend on consistency and plasticity, not on the name alone. Seasonal shrinkage can affect lightly loaded foundations.',
   'Usually requires a borehole with laboratory classification before sizing anything.',
   false, false, false, 'elevated', 10),
  ('sandy', 'SA', 'Sandy soil', 'Sol sableux',
   'Coarse-grained, free-draining material.',
   'Bearing behaviour depends on relative density and on whether the sand is loose or dense. Loose sands can settle under load.',
   'Confirm density and groundwater level before relying on any capacity figure.',
   false, false, false, 'standard', 20),
  ('silty', 'SI', 'Silty soil', 'Sol limoneux',
   'Fine-grained material with low plasticity, often holding water at the surface.',
   'Silts are sensitive to moisture and can lose strength quickly when saturated or disturbed.',
   'Investigate frost and moisture susceptibility; avoid assuming cohesive strength.',
   false, false, true, 'elevated', 30),
  ('lateritic', 'LA', 'Lateritic soil', 'Sol latéritique',
   'Iron-rich residual soil common in tropical regions, often indurated at depth.',
   'Behaviour varies widely between loose surface material and compacted, cemented horizons.',
   'The depth and thickness of the cemented layer matter more than the label.',
   false, false, false, 'standard', 40),
  ('gravel', 'GR', 'Gravel', 'Gravier',
   'Coarse granular material with good drainage.',
   'Strength depends on grading, density and confinement, not on gravel content alone.',
   'Screening of the matrix fines is usually needed to judge behaviour.',
   false, false, false, 'standard', 50),
  ('rock', 'RK', 'Rocky ground', 'Terrain rocheux',
   'Weathered or intact rock at or near the surface.',
   'Excavation difficulty and founding level dominate cost; rock strength must be measured, not assumed from appearance.',
   'Expect slower excavation and possibly different founding solutions.',
   false, false, false, 'elevated', 60),
  ('organic', 'OR', 'Organic soil', 'Sol organique',
   'Soil containing significant organic matter, often dark and compressible.',
   'Organic content brings unpredictable settlement and long-term volume change.',
   'Usually unsuitable as a founding stratum without treatment or removal.',
   false, false, true, 'essential', 70),
  ('peat', 'PT', 'Peat', 'Tourbe',
   'Highly compressible accumulation of partially decomposed plant material.',
   'Peat consolidates heavily under load and has very low strength.',
   'Almost always requires ground improvement, replacement or a deep foundation solution.',
   true, false, true, 'essential', 80),
  ('waterlogged', 'WL', 'Waterlogged soil', 'Sol gorgé d''eau',
   'Soil at or near saturation, with a high water table.',
   'Excavations may need dewatering; uplift and buoyancy can govern design below the water table.',
   'Establish groundwater level and seasonal variation before planning excavation.',
   true, true, false, 'essential', 90),
  ('reclaimed', 'RC', 'Reclaimed land', 'Terrain remblayé',
   'Ground built up with imported fill or made ground.',
   'Fill is variable by nature: thickness, composition and compaction are usually unknown without investigation.',
   'Assume nothing about uniformity; investigation is normally essential.',
   true, false, true, 'essential', 100),
  ('mixed', 'MX', 'Mixed conditions', 'Conditions mixtes',
   'More than one soil type present across the site or with depth.',
   'Differential behaviour between zones can drive foundation choice more than any single classification.',
   'Zone the site and investigate each area separately.',
   false, false, false, 'elevated', 110)
on conflict (slug) do nothing;
