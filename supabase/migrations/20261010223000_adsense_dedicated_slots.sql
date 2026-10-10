-- Phase: AdSense-dedicated ad slots (owner directive 2026-10-10).
--
-- The site's primary monetization is Google AdSense (approval pending;
-- Monetag/Adsterra stay active as temporary fillers). These five placements
-- are locked to the google_adsense provider only — the client renders them
-- via <AdSlot providerSlug="google_adsense">, so no other provider can ever
-- claim them regardless of the DB chain. They exist to put real AdSense
-- units on key routes for the approval review.
--
-- Slots:
--   adsense_footer           - bottom of every page (global, in Layout)
--   adsense_home             - homepage
--   adsense_paint_calculator - flagship paint calculator page
--   adsense_colors           - colors gallery page
--   adsense_learn            - learn / painting tips page
--
-- The client already ships code-defined fallbacks for these keys, so the
-- slots work before this migration runs; these rows give the admin toggles
-- and per-slot ad unit mapping in Admin → Ads → Placements.
--
-- Idempotent: safe to re-run.

INSERT INTO ad_placements (placement_key, placement_name, placement_type, page_target, provider_ids, ad_unit_ids, display_rules)
SELECT
  k.key,
  'Google AdSense — ' || k.label || ' (AdSense only)',
  'banner',
  k.page_target,
  COALESCE((SELECT ARRAY[p.id::text] FROM ad_providers p WHERE p.slug = 'google_adsense' LIMIT 1), '[]'::jsonb),
  '{}'::jsonb,
  '{"mobile":true,"desktop":true,"refresh_seconds":0,"min_height":100}'::jsonb
FROM (VALUES
  ('adsense_footer',           'Footer Bottom',     'global'),
  ('adsense_home',             'Homepage',          'home'),
  ('adsense_paint_calculator', 'Paint Calculator',  'calculator'),
  ('adsense_colors',           'Colors Gallery',    'gallery'),
  ('adsense_learn',            'Learn',             'learn')
) AS k(key, label, page_target)
ON CONFLICT (placement_key) DO NOTHING;

-- Google AdSense is the site's primary provider: make sure it is active.
UPDATE ad_providers
SET is_active = true,
    updated_at = now()
WHERE slug = 'google_adsense' AND is_active = false;

-- AdSense also serves REWARDED ads (H5 Games adBreak bridge already
-- implemented in src/lib/rewarded-bridges.ts). Its seeded provider_type
-- was "display", which hid it from every rewarded-provider dropdown.
-- "mixed" = display + rewarded.
UPDATE ad_providers
SET provider_type = 'mixed',
    updated_at = now()
WHERE slug = 'google_adsense' AND provider_type = 'display';
