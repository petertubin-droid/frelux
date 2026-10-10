-- =========================================================
-- FRELUX BEFORE/AFTER CASE STUDIES (workspace item 9)
--
-- Case studies are curated editorial profiles built DIRECTLY on
-- the existing gallery system: every case study references one
-- gallery_entry (which already carries the project category,
-- location, completion date and the before/after image pairs in
-- gallery_images). The gallery stays the media/moderation layer;
-- case_studies adds the story: headline, summary, scope,
-- challenges, outcome, materials, duration and budget.
--
-- RLS mirrors the gallery model: anonymous visitors may read
-- published case studies, admins manage everything, and the
-- application layer additionally requires the underlying
-- gallery entry to be approved/featured and public before it is
-- shown or publishable.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  gallery_entry_id uuid NOT NULL UNIQUE
    REFERENCES public.gallery_entries(id) ON DELETE CASCADE,

  headline text NOT NULL,
  summary text NOT NULL,
  project_scope text,
  challenges text,
  outcome text,

  materials_used text[] NOT NULL DEFAULT '{}',
  project_duration text,
  budget numeric,
  currency text NOT NULL DEFAULT 'NGN',

  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_studies_published
  ON public.case_studies (is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_case_studies_entry
  ON public.case_studies (gallery_entry_id);

ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_studies FORCE ROW LEVEL SECURITY;

-- Public (including signed-out visitors) may read PUBLISHED case
-- studies only. The app layer further filters to entries whose
-- gallery entry is approved/featured and public.
CREATE POLICY "case_studies_public_read"
  ON public.case_studies FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Admins manage the full case-study catalogue.
CREATE POLICY "case_studies_admin_all"
  ON public.case_studies FOR ALL
  TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
