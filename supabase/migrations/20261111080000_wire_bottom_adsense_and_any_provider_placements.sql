-- Bottom ad slots and provider coverage
--
-- Owner directive (2026-11-11): the bottom slots are AdSense only, and every
-- other placement must be responsive to any active provider rather than a
-- snapshot of whoever happened to be switched on when the row was written.
--
-- Two problems this fixes:
--   1. BottomAdSlot (rendered sitewide in Layout, mobile only) requests the
--      placement key `adsense_bottom`, which had no row in this table. The slot
--      therefore resolved to nothing on every page load: dead revenue and a
--      component that could never measure its height. The AdSense lock itself is
--      structural in code (providerSlug="google_adsense" never cascades); it
--      only needed a placement to read.
--   2. Every display placement listed the three currently-active providers by
--      id. That is a snapshot: activating a network later would serve nowhere
--      until someone edited 35 rows. An empty provider_ids array is the "any
--      active provider, in priority order" path already supported by
--      getProvidersForPlacement, so placements now follow the live roster.
--
-- AdSense stays first in the chain: ad-config promotes it whenever the provider
-- row carries settings.primary, which the owner flips from Admin -> Ads.

begin;

-- 1. The bottom placement, AdSense only, mobile only (the component is mobile
--    only by design: the bottom navigation is the only pinned element there).
insert into public.ad_placements (
  placement_key,
  placement_name,
  placement_type,
  page_target,
  is_active,
  provider_ids,
  ad_unit_ids,
  display_rules,
  sort_order
)
values (
  'adsense_bottom',
  'Google AdSense - Bottom (under mobile nav, AdSense only)',
  'banner',
  'global',
  true,
  '["06f616f0-b932-4e48-ad64-73589b656ada"]'::jsonb,
  '{}'::jsonb,
  '{"mobile": true, "desktop": false, "min_height": 50, "refresh_seconds": 0}'::jsonb,
  998
)
on conflict (placement_key) do update set
  placement_name = excluded.placement_name,
  placement_type = excluded.placement_type,
  page_target = excluded.page_target,
  is_active = true,
  provider_ids = excluded.provider_ids,
  display_rules = excluded.display_rules,
  sort_order = excluded.sort_order;

-- 2. Bottom slots stay locked to Google. sticky_bottom is the legacy key for
--    the same position, kept but switched off so a single slot owns it.
update public.ad_placements
   set provider_ids = '["06f616f0-b932-4e48-ad64-73589b656ada"]'::jsonb
 where placement_key = 'sticky_bottom';

update public.ad_placements
   set is_active = false
 where placement_key = 'sticky_bottom';

-- 3. Every other placement follows the live provider roster (any active
--    provider, priority order, AdSense promoted when the primary flag is set).
update public.ad_placements
   set provider_ids = '[]'::jsonb
 where placement_key not in ('adsense_bottom', 'sticky_bottom');

-- 4. Rows no code references: a push banner and a colours slot that were
--    replaced by their neighbours, plus a second Learn mid-article slot that was
--    never wired. Switched off rather than deleted, so nothing is lost and
--    re-enabling is one toggle.
update public.ad_placements
   set is_active = false
 where placement_key in ('article_push_1', 'colors_native', 'learn_article_mid_1');

commit;
