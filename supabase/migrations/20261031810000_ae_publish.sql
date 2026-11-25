BEGIN;
UPDATE public.learn_wall_finishing_article_slots sl SET article_id=a.id FROM public.learn_articles a WHERE sl.topic_id=a.wall_topic_id AND sl.theme_key=a.wall_article_theme AND sl.language_code=a.wall_language_code AND a.wall_market_code='AE' AND sl.article_id IS NULL;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles SET status='published', editorial_review_status='approved', editorial_reviewed_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, editorial_reviewed_at=now(), published_at=coalesce(published_at, now()) WHERE wall_market_code='AE' AND wall_topic_id IS NOT NULL;
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics SET verification_status='verified' WHERE candidate_key='system:ae-rc-block-gypsum';
COMMIT;
