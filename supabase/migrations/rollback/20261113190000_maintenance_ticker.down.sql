-- Rollback for the maintenance ticker.
-- The two columns are the whole feature surface: the component renders nothing
-- when they are absent, so dropping them restores the previous site exactly.
drop index if exists public.site_settings_maintenance_banner_idx;
alter table public.site_settings
  drop constraint if exists site_settings_maintenance_banner_needs_message,
  drop constraint if exists site_settings_maintenance_banner_length,
  drop column if exists maintenance_banner_message,
  drop column if exists maintenance_banner_enabled;
