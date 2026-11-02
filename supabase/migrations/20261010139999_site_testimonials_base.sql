-- =========================================================
-- Site testimonials base table (2026-10-10)
--
-- site_testimonials was originally created directly against
-- production via the Management API and only recorded in the
-- prod migration ledger as the later admin-policies migration.
-- Fresh preview databases (Supabase Preview CI) therefore never
-- received the CREATE TABLE and failed:
--   ERROR: relation "public.site_testimonials" does not exist
-- This backfills the base table idempotently (IF NOT EXISTS) so
-- every environment converges on the same schema. It is a no-op on
-- production, where the table already exists with these exact
-- columns. No seeded or generated content; real user quotes only.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.site_testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author_name text not null,
  author_role text,
  author_location text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

ALTER TABLE public.site_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read active testimonials" ON public.site_testimonials;
CREATE POLICY "anon read active testimonials"
  ON public.site_testimonials FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "auth read active testimonials" ON public.site_testimonials;
CREATE POLICY "auth read active testimonials"
  ON public.site_testimonials FOR SELECT
  TO authenticated
  USING (is_active = true);
