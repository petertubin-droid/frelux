-- =========================================================
-- Site testimonials admin management (Track 5, 2026-10-10)
--
-- site_testimonials was created in an earlier phase with only
-- public/anon read policies for ACTIVE rows, so no admin UI could
-- ever manage it: admins could not even see inactive quotes.
-- This adds the missing admin policies (read all + write),
-- mirroring the gallery/case-studies model. Real user quotes
-- only; there is no seeded or generated content.
-- =========================================================

-- Admins may read every testimonial, including inactive ones.
DROP POLICY IF EXISTS "admin read all testimonials" ON public.site_testimonials;
CREATE POLICY "admin read all testimonials"
  ON public.site_testimonials FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins may publish, edit, reorder and retire testimonials.
DROP POLICY IF EXISTS "admin write testimonials" ON public.site_testimonials;
CREATE POLICY "admin write testimonials"
  ON public.site_testimonials FOR ALL
  TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
