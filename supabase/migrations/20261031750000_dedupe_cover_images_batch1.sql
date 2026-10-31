-- Dedupe batch 1: unique Wikimedia covers for six articles that shared an image with another market.
-- cover_image_url and source rows only; no watched columns touched, so published/approved status is preserved.
BEGIN;
ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER wall_source_review_attribution;
UPDATE public.learn_articles SET cover_image_url='https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Indoor_painting_supplies_%2830185142347%29.jpg/1280px-Indoor_painting_supplies_%2830185142347%29.jpg' WHERE slug='fr-interior-masonry-paint-materials';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at)
 SELECT a.wall_topic_id, 'Cover: Indoor painting supplies (30185142347).jpg', 'David Mulder (CC BY-SA 2.0)', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Indoor_painting_supplies_%2830185142347%29.jpg/1280px-Indoor_painting_supplies_%2830185142347%29.jpg', 'Cover photograph attribution', 'accepted', coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), now()
 FROM public.learn_articles a WHERE a.slug='fr-interior-masonry-paint-materials'
 AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url='https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Indoor_painting_supplies_%2830185142347%29.jpg/1280px-Indoor_painting_supplies_%2830185142347%29.jpg');
UPDATE public.learn_articles SET cover_image_url='https://upload.wikimedia.org/wikipedia/commons/b/b7/Bathroom_in_the_Beamish_Museum_02.JPG' WHERE slug='us-wet-area-tile-installation';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at)
 SELECT a.wall_topic_id, 'Cover: Bathroom in the Beamish Museum 02.JPG', 'Immanuel Giel (Public domain)', 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Bathroom_in_the_Beamish_Museum_02.JPG', 'Cover photograph attribution', 'accepted', coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), now()
 FROM public.learn_articles a WHERE a.slug='us-wet-area-tile-installation'
 AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url='https://upload.wikimedia.org/wikipedia/commons/b/b7/Bathroom_in_the_Beamish_Museum_02.JPG');
UPDATE public.learn_articles SET cover_image_url='https://upload.wikimedia.org/wikipedia/commons/7/78/Kitchen_renovation_spackling_to_cover_holes_and_tape_between_sheetrock_boards.JPG' WHERE slug='us-drywall-finish-levels-overview';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at)
 SELECT a.wall_topic_id, 'Cover: Kitchen renovation spackling to cover holes and tape between sheetrock boards.JPG', 'Tomwsulcer (CC0)', 'https://upload.wikimedia.org/wikipedia/commons/7/78/Kitchen_renovation_spackling_to_cover_holes_and_tape_between_sheetrock_boards.JPG', 'Cover photograph attribution', 'accepted', coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), now()
 FROM public.learn_articles a WHERE a.slug='us-drywall-finish-levels-overview'
 AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url='https://upload.wikimedia.org/wikipedia/commons/7/78/Kitchen_renovation_spackling_to_cover_holes_and_tape_between_sheetrock_boards.JPG');
UPDATE public.learn_articles SET cover_image_url='https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Brick_Veneer.jpg/1280px-Brick_Veneer.jpg' WHERE slug='us-masonry-veneer-materials';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at)
 SELECT a.wall_topic_id, 'Cover: Brick Veneer.jpg', 'BRICKSTACKER (CC BY-SA 4.0)', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Brick_Veneer.jpg/1280px-Brick_Veneer.jpg', 'Cover photograph attribution', 'accepted', coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), now()
 FROM public.learn_articles a WHERE a.slug='us-masonry-veneer-materials'
 AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url='https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Brick_Veneer.jpg/1280px-Brick_Veneer.jpg');
UPDATE public.learn_articles SET cover_image_url='https://upload.wikimedia.org/wikipedia/commons/d/dc/AAC_14.jpg' WHERE slug='in-aac-block-quality';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at)
 SELECT a.wall_topic_id, 'Cover: AAC 14.jpg', 'Tarmo Tamm (project manager), Markus Otsus, Artur Kaljo (CC BY 4.0)', 'https://upload.wikimedia.org/wikipedia/commons/d/dc/AAC_14.jpg', 'Cover photograph attribution', 'accepted', coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), now()
 FROM public.learn_articles a WHERE a.slug='in-aac-block-quality'
 AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url='https://upload.wikimedia.org/wikipedia/commons/d/dc/AAC_14.jpg');
UPDATE public.learn_articles SET cover_image_url='https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/1970%27s_walk_in_shower.jpg/1280px-1970%27s_walk_in_shower.jpg' WHERE slug='us-wet-area-tile-quality-checks';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at)
 SELECT a.wall_topic_id, 'Cover: 1970''s walk in shower.jpg', 'Atomicdragon136 (CC BY 3.0)', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/1970%27s_walk_in_shower.jpg/1280px-1970%27s_walk_in_shower.jpg', 'Cover photograph attribution', 'accepted', coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), now()
 FROM public.learn_articles a WHERE a.slug='us-wet-area-tile-quality-checks'
 AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url='https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/1970%27s_walk_in_shower.jpg/1280px-1970%27s_walk_in_shower.jpg');
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;
COMMIT;
