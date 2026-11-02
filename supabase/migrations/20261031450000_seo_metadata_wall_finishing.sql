-- SEO metadata pass: meta_title / meta_description only.
-- Safe on published rows: neither column is watched by the review-attribution trigger,
-- so editorial_review_status and status are preserved.
BEGIN;

WITH base AS (
  SELECT a.id,
         split_part(a.title, ':', 1) AS kw,
         CASE t.market_code
           WHEN 'US' THEN 'US' WHEN 'GB' THEN 'UK' WHEN 'CA' THEN 'Canadian'
           WHEN 'DE' THEN 'German' WHEN 'JP' THEN 'Japanese' WHEN 'AU' THEN 'Australian'
           WHEN 'IN' THEN 'Indian' WHEN 'FR' THEN 'French' WHEN 'BR' THEN 'Brazilian'
           ELSE t.market_code END AS mw,
         CASE a.wall_article_theme
           WHEN 'materials' THEN 'which products to buy, how they are graded and what each one is for'
           WHEN 'installation' THEN 'the step-by-step sequence, coat by coat and fixing by fixing'
           WHEN 'quality' THEN 'how to check the work, what the tolerances are and which defects matter'
           WHEN 'maintenance' THEN 'how to inspect, patch, refinish and when to call a specialist'
           ELSE 'what the assembly is, why it is built that way and where it fails' END AS val
  FROM public.learn_articles a
  JOIN public.learn_wall_finishing_topics t ON t.id = a.wall_topic_id
), calc AS (
  SELECT b.*,
         CASE WHEN length(b.kw) <= 51 THEN b.kw || ': ' || b.mw || ' Guide'
              ELSE left(b.kw, 60) END AS new_title,
         b.kw || ': ' || b.val || '. ' || b.mw ||
           ' practice, standards and materials explained step by step.' AS raw_desc
  FROM base b
), trimmed AS (
  SELECT c.*,
         CASE WHEN length(c.raw_desc) <= 158 THEN c.raw_desc
              ELSE regexp_replace(left(c.raw_desc, 158), '\s+\S*$', '') END AS new_desc
  FROM calc c
)
UPDATE public.learn_articles a
SET meta_title = tr.new_title,
    meta_description = tr.new_desc
FROM trimmed tr
WHERE a.id = tr.id
  AND (a.meta_title IS DISTINCT FROM tr.new_title OR a.meta_description IS DISTINCT FROM tr.new_desc);

COMMIT;
