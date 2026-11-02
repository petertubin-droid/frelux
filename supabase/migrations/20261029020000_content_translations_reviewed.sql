-- =========================================================
-- Reviewed content translations → indexable localized pages
-- 2026-10-29
--
-- Why: locale URLs (/es/, /ja/ …) serve English body copy with client-side
-- machine translation, so they are noindex. This table holds real, reviewed
-- translations keyed by content, which is what lets a locale page be
-- prerendered with translated text, carry reciprocal hreflang, and be
-- indexable in its own right.
--
-- Workflow (the review gate is the point, not a formality):
--   draft     -> machine or human translation staged, never served
--   in_review -> queued for a named reviewer
--   published -> served to users and emitted by prerender
--   rejected  -> kept for history, never served
--
-- content_key is the article slug for content_type='article', or the route
-- path for content_type='page'. Unique per (content_type, content_key, locale)
-- so a locale can never hold two competing versions of the same page.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.content_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'page')),
  content_key TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  title TEXT NOT NULL,
  description TEXT,
  body_md TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'published', 'rejected')),
  translator TEXT,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  source_hash TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_translations_unique UNIQUE (content_type, content_key, locale)
);

CREATE INDEX IF NOT EXISTS idx_content_translations_locale_published
  ON public.content_translations (locale, content_type)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_content_translations_key
  ON public.content_translations (content_type, content_key);

-- updated_at + published_at bookkeeping
CREATE OR REPLACE FUNCTION public.touch_content_translation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := now();
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  END IF;
  IF NEW.status IN ('in_review', 'rejected') AND NEW.status <> COALESCE(OLD.status, '') THEN
    NEW.reviewed_at := now();
    NEW.reviewer_id := COALESCE(NEW.reviewer_id, auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_content_translation ON public.content_translations;
CREATE TRIGGER trg_touch_content_translation
  BEFORE UPDATE ON public.content_translations
  FOR EACH ROW EXECUTE FUNCTION public.touch_content_translation();

-- ── RLS: the public may only ever read published rows; admins write ──
ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_translations_read_published" ON public.content_translations;
CREATE POLICY "content_translations_read_published"
  ON public.content_translations
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "content_translations_admin_read" ON public.content_translations;
CREATE POLICY "content_translations_admin_read"
  ON public.content_translations
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "content_translations_admin_write" ON public.content_translations;
CREATE POLICY "content_translations_admin_write"
  ON public.content_translations
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Public read API: published translations for one locale ──
-- Batch by key so a page can pull everything it needs in one call.
CREATE OR REPLACE FUNCTION public.get_published_translations(
  p_locale TEXT,
  p_content_type TEXT DEFAULT NULL,
  p_keys TEXT[] DEFAULT NULL
) RETURNS TABLE(
  content_type TEXT,
  content_key TEXT,
  locale TEXT,
  title TEXT,
  description TEXT,
  body_md TEXT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.content_type, t.content_key, t.locale, t.title, t.description,
         t.body_md, t.published_at
  FROM public.content_translations t
  WHERE t.status = 'published'
    AND t.locale = p_locale
    AND (p_content_type IS NULL OR t.content_type = p_content_type)
    AND (p_keys IS NULL OR t.content_key = ANY(p_keys))
  ORDER BY t.content_key;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_translations(TEXT, TEXT, TEXT[]) TO anon, authenticated;

-- Which locales currently have indexable content per key? Prerender uses this
-- to build the hreflang alternate set without guessing.
CREATE OR REPLACE FUNCTION public.get_translation_alternates(
  p_content_type TEXT,
  p_content_key TEXT
) RETURNS TABLE(locale TEXT, title TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.locale, t.title
  FROM public.content_translations t
  WHERE t.status = 'published'
    AND t.content_type = p_content_type
    AND t.content_key = p_content_key
  ORDER BY t.locale;
$$;

GRANT EXECUTE ON FUNCTION public.get_translation_alternates(TEXT, TEXT) TO anon, authenticated;

COMMENT ON TABLE public.content_translations IS
  'Reviewed translations of articles and pages. Only status=published is readable by the public and emitted by prerender; that is what makes a locale page indexable with hreflang instead of a machine-translated duplicate.';
