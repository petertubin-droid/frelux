BEGIN;
UPDATE public.learn_wall_finishing_article_slots sl SET article_id=a.id FROM public.learn_articles a WHERE sl.topic_id=a.wall_topic_id AND sl.theme_key=a.wall_article_theme AND sl.language_code=a.wall_language_code AND a.wall_market_code='NG' AND a.slug LIKE 'ng-sandcrete-block-%%';
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles SET status='published', editorial_review_status='approved', editorial_reviewed_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, editorial_reviewed_at=now(), published_at=coalesce(published_at, now()) WHERE wall_market_code='NG' AND slug LIKE 'ng-sandcrete-block-%';
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;
COMMIT;
