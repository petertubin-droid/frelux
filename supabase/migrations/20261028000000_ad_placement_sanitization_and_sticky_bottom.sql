-- ============================================================
-- Ad placement sanitization sweep + sticky bottom anchor slot
-- Owner request 2026-10-27: "sanitization sweep on ad slots, there are
-- so many of them" + add a sticky bottom ad slot to the website.
--
-- The placement table had drifted from the frontend: 12 rows referenced
-- slot keys no page renders anymore (left behind by the Home/Learn
-- redesigns and the calculators_* to calculator_* key consolidation),
-- while 4 slot keys rendered by real pages had no row at all (those
-- slots resolved to "none" and could never serve).
--
-- Verified against the live frontend before writing:
--  - frontend renders 48 distinct production slot keys (test-slot /
--    slot-a / slot-b are test-only and are NOT placement keys)
--  - dead keys below appear in NO production component
--  - rewarded_unlock is kept: it is the rewarded-flow placement, not a
--    display slot
-- ============================================================

BEGIN;

-- ── 1. Delete dead display placements (no page renders these keys) ──
-- article_push_1 IS still rendered (LearnArticle push) and stays; only
-- the never-rendered twin is removed.
DELETE FROM public.ad_placements
WHERE placement_key IN (
  'article_push_2',
  'calculators_bottom',
  'calculators_mid',
  'calculators_native',
  'home_footer',
  'home_mid',
  'home_mid_2',
  'home_native_3',
  'home_sidebar',
  'learn_article_native',
  'learn_article_native_2',
  'learn_article_native_3'
);

-- ── 2. Add the slot keys real pages render but the table lacked ──
-- home_bottom      → Home.tsx bottom slot (after Pro Connect section)
-- tools-page        → ConstructionTools.tsx tools library footer slot
-- wall-finish-top   → WallFinishEstimator.tsx top slot
-- wall-finish-bottom→ WallFinishEstimator.tsx bottom slot
-- sticky_bottom     → StickyBottomAd dismissible viewport anchor bar
-- provider_ids '[]' = full active fallback chain (AdSense, Adsterra,
-- Monetag by priority), admin can pin/override per placement later.
INSERT INTO public.ad_placements (
  placement_key, placement_name, placement_type, page_target,
  is_active, provider_ids, ad_unit_ids, display_rules, sort_order
)
VALUES
  ('home_bottom', 'Home Bottom', 'banner', 'home', true,
   '[]'::jsonb, '{}'::jsonb,
   '{"mobile":true,"desktop":true,"refresh_seconds":0,"min_height":100}'::jsonb,
   70),
  ('tools-page', 'Construction Tools Page', 'banner', 'tools', true,
   '[]'::jsonb, '{}'::jsonb,
   '{"mobile":true,"desktop":true,"refresh_seconds":0,"min_height":100}'::jsonb,
   80),
  ('wall-finish-top', 'Wall Finish Estimator Top', 'banner', 'tools', true,
   '[]'::jsonb, '{}'::jsonb,
   '{"mobile":true,"desktop":true,"refresh_seconds":0,"min_height":100}'::jsonb,
   90),
  ('wall-finish-bottom', 'Wall Finish Estimator Bottom', 'banner', 'tools', true,
   '[]'::jsonb, '{}'::jsonb,
   '{"mobile":true,"desktop":true,"refresh_seconds":0,"min_height":100}'::jsonb,
   91),
  ('sticky_bottom', 'Sticky Bottom Anchor', 'banner', 'global', true,
   '[]'::jsonb, '{}'::jsonb,
   '{"mobile":true,"desktop":true,"refresh_seconds":0,"min_height":60}'::jsonb,
   100)
ON CONFLICT (placement_key) DO NOTHING;

COMMIT;
