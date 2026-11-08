-- Phase: AdSense primary publisher switch (owner directive 2026-11-08).
--
-- The original account (pub-3404100134534192) is not clearing ad review. The
-- second account (pub-4906239537212380) becomes the primary that verification
-- and serving use, while the original stays authorised: its ads.txt record and
-- its loader remain, so nothing is withdrawn and its history is preserved.
--
-- Three surfaces have to agree with the crawler for verification to pass:
--   1. ads.txt / app-ads.txt            — static files, already carry both lines
--   2. index.html loader + meta tag     — static, now names the primary account
--   3. ad_providers creds + site_settings — this migration
--
-- The runtime AdSlot renderer reads credentials.publisher_id from ad_providers,
-- so without this the page source and the served units would disagree and the
-- crawler would still see the account that cannot serve.
--
-- Idempotent: safe to re-run.

-- ── 1. Provider row: primary account ────────────────────────
UPDATE ad_providers
   SET credentials = COALESCE(credentials, '{}'::jsonb)
                     || '{"publisher_id":"ca-pub-4906239537212380"}'::jsonb,
       settings = COALESCE(settings, '{}'::jsonb)
                  || '{"additional_publisher_ids":"ca-pub-3404100134534192"}'::jsonb
 WHERE slug = 'google_adsense';

-- ── 2. site_settings mirror (legacy AdSense fallback path) ──
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS adsense_additional_publisher_ids text DEFAULT '';

UPDATE site_settings
   SET adsense_publisher_id = 'ca-pub-4906239537212380',
       adsense_additional_publisher_ids = 'ca-pub-3404100134534192'
 WHERE id = (SELECT id FROM site_settings LIMIT 1);
