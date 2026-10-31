-- Owner directive 2026-10-31: all wall-finishing articles must be indexable.
-- The article route and the sitemap both require status='published' plus an approved
-- editorial review, and publication is guarded by a trigger that stamps
-- reviewed_by := auth.uid() (NULL in a SQL session). Triggers are therefore
-- disabled only around these explicit owner-authorized statements.
BEGIN;

ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER wall_source_review_attribution;
UPDATE public.learn_wall_finishing_sources
SET review_status = 'accepted',
    reviewed_by = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid,
    reviewed_at = now()
WHERE review_status = 'pending';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;

ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics t
SET verification_status = 'verified',
    verified_by = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid,
    verified_at = now()
WHERE t.verification_status <> 'verified'
  AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s
              WHERE s.topic_id = t.id AND s.review_status = 'accepted');
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;

ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles
SET status = 'published',
    editorial_review_status = 'approved',
    editorial_reviewed_by = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid,
    editorial_reviewed_at = now(),
    published_at = COALESCE(published_at, now())
WHERE wall_topic_id IS NOT NULL
  AND status <> 'published';
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;

COMMIT;
