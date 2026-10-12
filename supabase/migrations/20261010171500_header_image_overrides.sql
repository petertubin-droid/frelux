-- =========================================================
-- Header image overrides — admin-configurable page header photos
-- =========================================================
-- Owner directive (2026-10-10): every page header resolves a
-- niche-matched backdrop from src/config/page-header-images.ts.
-- This table lets admins override any route's image from the
-- Admin > Header Images screen (paginated grid) without a deploy.
--
-- Semantics (see resolveHeaderImage in the frontend config):
--   route    = path prefix (e.g. "/paint-calculator"); a page
--              matches when its pathname equals the key or lives
--              under it. Longest matching key wins.
--   image_url= local asset path (/assets/headers/paint.jpg) or an
--              absolute URL. Anything stored here beats the code
--              registry; delete the row to fall back to it.
--
-- Fully re-runnable: guards on every object.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.header_image_overrides (
  route      TEXT PRIMARY KEY,
  image_url  TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.header_image_overrides ENABLE ROW LEVEL SECURITY;

-- Public read: PageHeader needs the map on every page (same
-- pattern as site_settings / site_branding).
DROP POLICY IF EXISTS "header_image_overrides_read_all" ON public.header_image_overrides;
CREATE POLICY "header_image_overrides_read_all"
ON public.header_image_overrides FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins may change the header images.
DROP POLICY IF EXISTS "header_image_overrides_admin_write" ON public.header_image_overrides;
CREATE POLICY "header_image_overrides_admin_write"
ON public.header_image_overrides FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Keep updated_at honest.
DROP TRIGGER IF EXISTS "header_image_overrides_set_updated_at" ON public.header_image_overrides;
CREATE TRIGGER "header_image_overrides_set_updated_at"
BEFORE UPDATE ON public.header_image_overrides
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
