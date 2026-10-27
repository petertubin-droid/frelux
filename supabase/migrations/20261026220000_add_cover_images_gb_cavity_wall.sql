-- Cover images for the five GB brick/block cavity wall articles.
-- Policy (owner directive 2026-10-26): every article carries a real photograph, never AI generated.
-- Images: Wikimedia Commons, CC BY-SA 4.0 / CC BY-SA 2.0 (photographs by Kolforn and M J Richardson).
-- cover_image_url is not part of the editorial-review trigger's watched columns, so draft status is untouched.

BEGIN;

UPDATE public.learn_articles SET cover_image_url =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/-2021-01-22_Cavity_wall_construction%2C_Trimingham%2C_Norfolk_%281%29.JPG/1280px--2021-01-22_Cavity_wall_construction%2C_Trimingham%2C_Norfolk_%281%29.JPG'
WHERE slug='gb-brick-block-cavity-wall-overview' AND market='GB';

UPDATE public.learn_articles SET cover_image_url =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/-2021-01-23_Stainless_steel_wall_ties%2C_Trimingham%2C_Norfolk_%281%29.JPG/1280px--2021-01-23_Stainless_steel_wall_ties%2C_Trimingham%2C_Norfolk_%281%29.JPG'
WHERE slug='gb-brick-block-cavity-wall-materials' AND market='GB';

UPDATE public.learn_articles SET cover_image_url =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/-2021-01-22_Cavity_wall_construction%2C_Trimingham%2C_Norfolk_%282%29.JPG/1280px--2021-01-22_Cavity_wall_construction%2C_Trimingham%2C_Norfolk_%282%29.JPG'
WHERE slug='gb-brick-block-cavity-wall-installation' AND market='GB';

UPDATE public.learn_articles SET cover_image_url =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/-2021-01-23_Aerated_concrete_Block_wall_with_protruding_wall_ties%2C_Trimingham%2C_Norfolk.JPG/1280px--2021-01-23_Aerated_concrete_Block_wall_with_protruding_wall_ties%2C_Trimingham%2C_Norfolk.JPG'
WHERE slug='gb-brick-block-cavity-wall-quality-checks' AND market='GB';

UPDATE public.learn_articles SET cover_image_url =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Wall_ties_at_Bunessan_Mill_-_geograph.org.uk_-_2943673.jpg/1280px-Wall_ties_at_Bunessan_Mill_-_geograph.org.uk_-_2943673.jpg'
WHERE slug='gb-brick-block-cavity-wall-maintenance-repair' AND market='GB';

-- Image attribution recorded alongside the topic's technical sources.
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t
CROSS JOIN (VALUES
  ('Cover photograph: cavity wall under construction, Trimingham, Norfolk (photograph by Kolforn, CC BY-SA 4.0, via Wikimedia Commons)', 'https://commons.wikimedia.org/wiki/File:-2021-01-22_Cavity_wall_construction,_Trimingham,_Norfolk_(1).JPG', 'Kolforn via Wikimedia Commons', 'Image attribution for the overview article cover; real photograph, not AI generated.'),
  ('Cover photograph: stainless steel wall ties, Trimingham, Norfolk (photograph by Kolforn, CC BY-SA 4.0, via Wikimedia Commons)', 'https://commons.wikimedia.org/wiki/File:-2021-01-23_Stainless_steel_wall_ties,_Trimingham,_Norfolk_(1).JPG', 'Kolforn via Wikimedia Commons', 'Image attribution for the materials article cover; real photograph, not AI generated.'),
  ('Cover photograph: cavity wall construction, Trimingham, Norfolk (photograph by Kolforn, CC BY-SA 4.0, via Wikimedia Commons)', 'https://commons.wikimedia.org/wiki/File:-2021-01-22_Cavity_wall_construction,_Trimingham,_Norfolk_(2).JPG', 'Kolforn via Wikimedia Commons', 'Image attribution for the installation article cover; real photograph, not AI generated.'),
  ('Cover photograph: aerated concrete blockwork inner leaf with protruding wall ties, Trimingham, Norfolk (photograph by Kolforn, CC BY-SA 4.0, via Wikimedia Commons)', 'https://commons.wikimedia.org/wiki/File:-2021-01-23_Aerated_concrete_Block_wall_with_protruding_wall_ties,_Trimingham,_Norfolk.JPG', 'Kolforn via Wikimedia Commons', 'Image attribution for the quality checks article cover; real photograph, not AI generated.'),
  ('Cover photograph: wall ties exposed during renovation at Bunessan Mill (photograph by M J Richardson, CC BY-SA 2.0, via Wikimedia Commons)', 'https://commons.wikimedia.org/wiki/File:Wall_ties_at_Bunessan_Mill_-_geograph.org.uk_-_2943673.jpg', 'M J Richardson via Wikimedia Commons', 'Image attribution for the maintenance article cover; real photograph, not AI generated.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='system:gb-brick-block'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

COMMIT;
