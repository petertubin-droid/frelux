-- Repair the maintenance ticker schema when its original migration was not
-- applied, and refresh PostgREST immediately so the admin UI can see the fields.
alter table public.site_settings
  add column if not exists maintenance_banner_enabled boolean not null default false,
  add column if not exists maintenance_banner_message text;

alter table public.site_settings
  drop constraint if exists site_settings_maintenance_banner_length;
alter table public.site_settings
  add constraint site_settings_maintenance_banner_length
  check (
    maintenance_banner_message is null
    or char_length(btrim(maintenance_banner_message)) <= 240
  );

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

create index if not exists site_settings_maintenance_banner_idx
  on public.site_settings (maintenance_banner_enabled)
  where maintenance_banner_enabled = true;

notify pgrst, 'reload schema';
