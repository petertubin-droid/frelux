-- One central control for every ad slot
--
-- Owner directive 2026-11-11: placements should not have to be edited one by
-- one. A single switch decides which network may serve sitewide: all active
-- providers in priority order, AdSense alone, one named provider, or no ads.
--
-- The switch lives on the existing single-row site_settings table, which already
-- carries the display-ads master toggle and is publicly readable (the ad
-- resolver runs for signed-out visitors). Placement rows keep their keys, their
-- positions and their density rules; the provider chain comes from here.
--
-- Values:
--   auto         any active provider, priority order, AdSense promoted when the
--                provider row carries settings.primary (current behaviour)
--   adsense_only the bottom-slot rule extended to the whole site
--   single       the provider named in ad_provider_slug, and nothing else
--   off          no provider for any placement

alter table public.site_settings
  add column if not exists ad_provider_mode text not null default 'auto',
  add column if not exists ad_provider_slug text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'site_settings_ad_provider_mode_check'
  ) then
    alter table public.site_settings
      add constraint site_settings_ad_provider_mode_check
      check (ad_provider_mode in ('auto', 'adsense_only', 'single', 'off'));
  end if;
end $$;

-- A missing or empty settings row must still resolve to the waterfall, so the
-- default is written explicitly rather than left to the column default on some
-- future insert.
update public.site_settings
   set ad_provider_mode = coalesce(nullif(ad_provider_mode, ''), 'auto')
 where true;

comment on column public.site_settings.ad_provider_mode is
  'Sitewide ad provider policy: auto | adsense_only | single | off. Governs every placement; overrides per-placement provider lists.';
comment on column public.site_settings.ad_provider_slug is
  'Provider slug used when ad_provider_mode = single, e.g. google_adsense, adsterra, monetag.';
