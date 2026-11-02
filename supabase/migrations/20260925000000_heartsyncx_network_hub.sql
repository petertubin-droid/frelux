-- =============================================================
-- 20260925: Heartsyncx Network Hub — apply Heartsyncx's complete ad
-- settings surface to Frelux.
--
-- What this migration does:
--  1. Ensures the three network provider rows exist
--     (google_adsense / monetag / adsterra). Monetag and Adsterra are
--     NOT seeded by the phase-15 system providers, so they are added
--     here when missing.
--  2. Ensures the six placement rows the Network Hub's slot mapping
--     writes to exist (home_top, home_native, home_sidebar,
--     learn_in_article, learn_article_bottom, global_footer).
--  3. Applies the CURRENT LIVE Heartsyncx values (read from the
--     Heartsyncx production database on 2026-09-25):
--       - AdSense publisher ca-pub-3404100134534192, active
--       - Adsterra active with its Direct Link URL
--       - Monetag inactive/unconfigured (as on Heartsyncx)
--     Existing credentials are MERGED, never destroyed.
--  4. Mirrors the publisher id into site_settings for the legacy
--     AdSense fallback path and enables ads globally.
-- =============================================================

-- ── 1. Network provider rows ────────────────────────────────
INSERT INTO ad_providers (name, slug, provider_type, priority, is_system, is_active, credentials, settings) VALUES
  ('Google AdSense', 'google_adsense', 'display', 1, true, true, '{"publisher_id":""}', '{"auto_ads":false,"lazy_load":true}'),
  ('Monetag', 'monetag', 'mixed', 2, true, false, '{}', '{}'),
  ('Adsterra', 'adsterra', 'display', 3, true, false, '{}', '{"format":"banner"}')
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Placement rows the Hub's slot mapping writes to ───────
INSERT INTO ad_placements (placement_key, placement_name, placement_type, page_target, is_active) VALUES
  ('home_top',            'Home Top (Heartsyncx: header)',         'banner',     'home',    true),
  ('home_native',         'Home Native (Heartsyncx: homepage)',    'native',     'home',    true),
  ('home_sidebar',        'Home Sidebar (Heartsyncx: sidebar)',    'banner',     'sidebar', true),
  ('learn_in_article',    'Learn In-Article (Heartsyncx: in_article)', 'in_article', 'learn', true),
  ('learn_article_bottom','Learn Article Bottom (Heartsyncx: article_bottom)', 'in_article', 'learn', true),
  ('global_footer',       'Global Footer (Heartsyncx: footer)',    'banner',     'global',  true)
ON CONFLICT (placement_key) DO NOTHING;

-- ── 3. Heartsyncx live values (merge, never clobber) ─────────
-- AdSense: publisher id + active
UPDATE ad_providers
   SET is_active = true,
       credentials = COALESCE(credentials, '{}'::jsonb)
                     || '{"publisher_id":"ca-pub-3404100134534192"}'::jsonb
 WHERE slug = 'google_adsense';

-- Adsterra: active + the Heartsyncx Direct Link (the only live
-- Adsterra value on Heartsyncx as of 2026-09-25). Everything else
-- is configured from the Network Hub.
UPDATE ad_providers
   SET is_active = true,
       credentials = COALESCE(credentials, '{}'::jsonb)
                     || '{"direct_link_url":"https://www.profitableratecpmnetwork.com/hpzkujs07w?key=6db86acc5c2da62d5443f3546980be69"}'::jsonb
 WHERE slug = 'adsterra';

-- Monetag: left untouched — Heartsyncx has it deactivated with no
-- zones; the Network Hub manages it end-to-end.

-- ── 4. site_settings mirror (legacy AdSense fallback path) ───
UPDATE site_settings
   SET ads_enabled = true,
       adsense_publisher_id = 'ca-pub-3404100134534192'
 WHERE id = (SELECT id FROM site_settings LIMIT 1);
