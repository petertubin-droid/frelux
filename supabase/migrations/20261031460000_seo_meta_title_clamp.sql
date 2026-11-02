-- Clamp meta_title to 60 characters at a word boundary (meta_title is not a watched column).
BEGIN;
UPDATE public.learn_articles
SET meta_title = regexp_replace(left(meta_title, 60), '\s+\S*$', '')
WHERE wall_topic_id IS NOT NULL
  AND length(meta_title) > 60;
COMMIT;
