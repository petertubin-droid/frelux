-- ============================================================
-- Activation of all inactive ad placements across the website
-- Owner request 2026-10-29:
-- "Audit the website for inactive adslots and activate them"
--
-- This migration:
-- 1. Inserts missing placement rows for slots rendered in code:
--    - tools_mid: ConstructionTools.tsx
--    - market_top: MarketLanding.tsx
--    - market_mid: MarketLanding.tsx
--    - wall-finish-top: WallFinishEstimator.tsx
-- 2. Explicitly activates (is_active = true) all rendered placements
--    including sidebar placements (learn_sidebar, marketplace_sidebar)
-- 3. Ensures the full active provider chain (Google AdSense, Adsterra,
--    Monetag) is wired to all display placements.
-- ============================================================

BEGIN;

INSERT INTO public.ad_placements (
  placement_key, placement_name, placement_type, page_target,
  is_active, provider_ids, ad_unit_ids, display_rules, sort_order
)
VALUES
  ('tools_mid', 'Construction Tools Mid', 'banner', 'tools', true,
   '["06f616f0-b932-4e48-ad64-73589b656ada", "c4373ff9-4b5f-4c45-9974-23d43e21b8cb", "545bacb5-ab9c-4301-9a60-a5361e360f8a"]'::jsonb, '{}'::jsonb,
   '{"mobile":true,"desktop":true,"refresh_seconds":0,"min_height":100}'::jsonb,
   85),
  ('market_top', 'Market Landing Top', 'banner', 'market', true,
   '["06f616f0-b932-4e48-ad64-73589b656ada", "c4373ff9-4b5f-4c45-9974-23d43e21b8cb", "545bacb5-ab9c-4301-9a60-a5361e360f8a"]'::jsonb, '{}'::jsonb,
   '{"mobile":true,"desktop":true,"refresh_seconds":0,"min_height":100}'::jsonb,
   150),
  ('market_mid', 'Market Landing Mid', 'banner', 'market', true,
   '["06f616f0-b932-4e48-ad64-73589b656ada", "c4373ff9-4b5f-4c45-9974-23d43e21b8cb", "545bacb5-ab9c-4301-9a60-a5361e360f8a"]'::jsonb, '{}'::jsonb,
   '{"mobile":true,"desktop":true,"refresh_seconds":0,"min_height":100}'::jsonb,
   155),
  ('wall-finish-top', 'Wall Finish Estimator Top', 'banner', 'tools', true,
   '["06f616f0-b932-4e48-ad64-73589b656ada", "c4373ff9-4b5f-4c45-9974-23d43e21b8cb", "545bacb5-ab9c-4301-9a60-a5361e360f8a"]'::jsonb, '{}'::jsonb,
   '{"mobile":true,"desktop":true,"refresh_seconds":0,"min_height":100}'::jsonb,
   90)
ON CONFLICT (placement_key) DO UPDATE
SET is_active = true,
    provider_ids = EXCLUDED.provider_ids,
    updated_at = now();

-- Ensure all rendered placements are active and wired to all active providers
UPDATE public.ad_placements
SET is_active = true,
    provider_ids = CASE
      -- If placement currently has no providers, wire default full chain
      WHEN provider_ids IS NULL OR provider_ids = '[]'::jsonb THEN
        '["06f616f0-b932-4e48-ad64-73589b656ada", "c4373ff9-4b5f-4c45-9974-23d43e21b8cb", "545bacb5-ab9c-4301-9a60-a5361e360f8a"]'::jsonb
      ELSE provider_ids
    END,
    updated_at = now()
WHERE placement_key IN (
  'learn_sidebar',
  'marketplace_sidebar',
  'tools_mid',
  'market_top',
  'market_mid',
  'wall-finish-top',
  'calculator_mid',
  'calculator_native',
  'calculator_hub_mid',
  'calculator_hub_native',
  'estimator_mid',
  'estimator_native',
  'gallery_mid',
  'gallery_native',
  'color_detail_mid',
  'color_detail_native',
  'ai_feature',
  'ai_assistant_native',
  'image_estimator_native',
  'home_top',
  'home_native',
  'learn_top',
  'learn_native',
  'learn_article_top',
  'learn_article_mid_2',
  'learn_in_article',
  'learn_category_mid',
  'learn_category_native',
  'marketplace_native'
);

COMMIT;
