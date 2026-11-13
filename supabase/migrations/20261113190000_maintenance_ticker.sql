-- Maintenance ticker
--
-- Adds the site-wide orange announcement strip that sits under the fixed
-- header. It is deliberately separate from `maintenance_mode`: the gate closes
-- the site, the ticker only informs, so an operator can warn about planned work
-- without taking the calculators offline.
--
-- Rollback: supabase/migrations/rollback/20261113190000_maintenance_ticker.down.sql

alter table public.site_settings
  add column if not exists maintenance_banner_enabled boolean not null default false,
  add column if not exists maintenance_banner_message text;

-- A runaway paste should not become a minute-long scroll. 240 characters is
-- roughly two sentences, which is all the strip can carry readably.
alter table public.site_settings
  drop constraint if exists site_settings_maintenance_banner_length;
alter table public.site_settings
  add constraint site_settings_maintenance_banner_length
  check (
    maintenance_banner_message is null
    or char_length(btrim(maintenance_banner_message)) <= 240
  );

-- No message, no banner: a half-configured row can never show an empty strip.
alter table public.site_settings
  drop constraint if exists site_settings_maintenance_banner_needs_message;
alter table public.site_settings
  add constraint site_settings_maintenance_banner_needs_message
  check (
    maintenance_banner_enabled = false
    or (
      maintenance_banner_message is not null
      and btrim(maintenance_banner_message) <> ''
    )
  );

comment on column public.site_settings.maintenance_banner_enabled is
  'Show the site-wide maintenance ticker under the header.';
comment on column public.site_settings.maintenance_banner_message is
  'Text scrolled by the maintenance ticker. Max 240 characters.';

-- Reading the ticker must cost nothing: anonymous visitors poll this row, so it
-- stays a single indexed-row read through the existing public select policy.
create index if not exists site_settings_maintenance_banner_idx
  on public.site_settings (maintenance_banner_enabled)
  where maintenance_banner_enabled = true;
