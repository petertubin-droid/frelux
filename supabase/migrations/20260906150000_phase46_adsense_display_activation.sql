-- =========================================================
-- Phase 46: AdSense display activation (audit follow-up)
--
-- Audit result (2026-09-06): all 51 code slot keys exist in
-- ad_placements, are active, and are wired to the full active
-- provider chain (google_adsense → adsterra → monetag).
-- The only provider-level blocker was google_adsense having
-- settings.display_ads_enabled = false (set while awaiting
-- approval). AdSense rendering additionally requires per-slot
-- ad unit IDs (Admin → Ads → placement → AdSense unit ID),
-- which remain to be filled from the AdSense dashboard — so
-- enabling this toggle is safe and takes effect per-slot the
-- moment units are added.
--
-- Idempotent: safe to run more than once.
-- =========================================================

UPDATE public.ad_providers
SET settings = jsonb_set(
      COALESCE(settings, '{}'::jsonb),
      '{display_ads_enabled}',
      'true'::jsonb,
      true
    ),
    updated_at = now()
WHERE slug = 'google_adsense'
  AND (settings ->> 'display_ads_enabled') IS DISTINCT FROM 'true';
