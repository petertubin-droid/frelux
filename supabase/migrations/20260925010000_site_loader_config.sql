-- Site-wide loading experience configuration (FRELUX admin panel).
-- Stored on the single site_settings row; consumed by BrandedLoader.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS loader_config jsonb DEFAULT NULL;

COMMENT ON COLUMN public.site_settings.loader_config IS
  'Admin-configured loader experience: { enabled, style, size, speed, primary_color, secondary_color, show_logo, logo_url, text }. Consumed by src/components/ui/BrandedLoader.tsx.';
