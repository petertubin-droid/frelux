-- Add Google Analytics, Search Console verification, and Meta Pixel columns to site_settings
-- These are synced from integration_settings for backward compatibility with AnalyticsScripts.tsx
-- and AdSlot legacy fallback

ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS ga_measurement_id text,
ADD COLUMN IF NOT EXISTS google_site_verification text,
ADD COLUMN IF NOT EXISTS meta_pixel_id text;

-- Ensure integration_settings has proper grants for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON integration_settings TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN site_settings.ga_measurement_id IS 'GA4 Measurement ID (G-XXXXXXXXXX) — synced from integration_settings';
COMMENT ON COLUMN site_settings.google_site_verification IS 'Google Search Console verification token — synced from integration_settings';
COMMENT ON COLUMN site_settings.meta_pixel_id IS 'Meta/Facebook Pixel ID — synced from integration_settings';
