-- ============================================================
-- Bottom ad-slot consolidation (owner directive 2026-10-27)
--
-- "Remove every other bottom adslot except the sticky adslot which is
-- only connected for AdSense provider only. I hope this will boost
-- AdSense approval."
--
-- The frontend sweep (commit cb3c248f) removed every page-level
-- bottom/footer slot; the AdSense-locked sticky bottom anchor
-- (StickyBottomAd in Layout) is now the single bottom-of-page unit on
-- every public route. This migration brings ad_placements in line:
--
--  - deletes the 16 now-orphaned bottom/footer placement rows
--  - pins sticky_bottom's provider chain to Google AdSense only, so
--    the Admin -> Ads UI reflects the frontend lock (the component
--    enforces providerSlug="google_adsense" regardless)
--  - rewarded_unlock is kept (rewarded-video placement, not a display
--    slot)
--
-- Delete list verified against the live frontend: none of these keys
-- is rendered by any production component after commit cb3c248f.
-- ============================================================

BEGIN;

DELETE FROM public.ad_placements
WHERE placement_key IN (
  'adsense_footer',
  'ai_assistant_footer',
  'calculator_bottom',
  'calculator_hub_bottom',
  'color_detail_footer',
  'colors_gallery_bottom',
  'estimator_bottom',
  'global_footer',
  'home_bottom',
  'image_estimator_bottom',
  'learn_article_bottom',
  'learn_bottom',
  'learn_category_bottom',
  'marketplace_bottom',
  'tools-page',
  'wall-finish-bottom'
);

-- sticky_bottom: AdSense-only chain (google_adsense provider id
-- verified live: 06f616f0-b932-4e48-ad64-73589b656ada).
UPDATE public.ad_placements
SET provider_ids = '["06f616f0-b932-4e48-ad64-73589b656ada"]'::jsonb,
    updated_at = now()
WHERE placement_key = 'sticky_bottom';

COMMIT;
