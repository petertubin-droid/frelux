-- Dedupe batch 2: unique covers for five more articles (photo relevance hand-checked).
BEGIN;

ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER USER;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles SET cover_image_url='https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Blue_window_on_lime_plaster_wall%2C_Volakas%2C_Tinos%2C_Greece_julesvernex2.jpg/1280px-Blue_window_on_lime_plaster_wall%2C_Volakas%2C_Tinos%2C_Greece_julesvernex2.jpg' WHERE slug='us-veneer-plaster-skim-installation';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at)
 SELECT a.wall_topic_id, 'Cover: Blue window on lime plaster wall, Volakas, Tinos, Greece julesvernex2.jpg', 'Jules Verne Times Two (CC BY-SA 4.0)', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Blue_window_on_lime_plaster_wall%2C_Volakas%2C_Tinos%2C_Greece_julesvernex2.jpg/1280px-Blue_window_on_lime_plaster_wall%2C_Volakas%2C_Tinos%2C_Greece_julesvernex2.jpg', 'Cover photograph attribution', 'accepted', coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), now()
 FROM public.learn_articles a WHERE a.slug='us-veneer-plaster-skim-installation'
 AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url='https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Blue_window_on_lime_plaster_wall%2C_Volakas%2C_Tinos%2C_Greece_julesvernex2.jpg/1280px-Blue_window_on_lime_plaster_wall%2C_Volakas%2C_Tinos%2C_Greece_julesvernex2.jpg');
UPDATE public.learn_articles SET cover_image_url='https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Aerated_autoclaved_concrete_-_detail.jpg/1280px-Aerated_autoclaved_concrete_-_detail.jpg' WHERE slug='in-aac-block-installation';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at)
 SELECT a.wall_topic_id, 'Cover: Aerated autoclaved concrete - detail.jpg', 'Marco Bernardini (CC BY-SA 3.0)', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Aerated_autoclaved_concrete_-_detail.jpg/1280px-Aerated_autoclaved_concrete_-_detail.jpg', 'Cover photograph attribution', 'accepted', coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), now()
 FROM public.learn_articles a WHERE a.slug='in-aac-block-installation'
 AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url='https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Aerated_autoclaved_concrete_-_detail.jpg/1280px-Aerated_autoclaved_concrete_-_detail.jpg');
UPDATE public.learn_articles SET cover_image_url='https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Azabujuban_station_Oedo_platform_wall_tiles.jpg/1280px-Azabujuban_station_Oedo_platform_wall_tiles.jpg' WHERE slug='us-wet-area-tile-maintenance-repair';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at)
 SELECT a.wall_topic_id, 'Cover: Azabujuban station Oedo platform wall tiles.jpg', 'Tyuvc (CC BY-SA 4.0)', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Azabujuban_station_Oedo_platform_wall_tiles.jpg/1280px-Azabujuban_station_Oedo_platform_wall_tiles.jpg', 'Cover photograph attribution', 'accepted', coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), now()
 FROM public.learn_articles a WHERE a.slug='us-wet-area-tile-maintenance-repair'
 AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url='https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Azabujuban_station_Oedo_platform_wall_tiles.jpg/1280px-Azabujuban_station_Oedo_platform_wall_tiles.jpg');
UPDATE public.learn_articles SET cover_image_url='https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Carpenters_installing_sheetrock_in_the_back_of_house_area_in_the_future_LIRR_Concourse._10-30-2019_%2848997634792%29.jpg/1280px-Carpenters_installing_sheetrock_in_the_back_of_house_area_in_the_future_LIRR_Concourse._10-30-2019_%2848997634792%29.jpg' WHERE slug='de-drywall-metal-stud-maintenance';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at)
 SELECT a.wall_topic_id, 'Cover: Carpenters installing sheetrock in the back of house area in the future LIRR Concourse. 10', 'MTA Capital Construction Mega Projects (CC BY 2.0)', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Carpenters_installing_sheetrock_in_the_back_of_house_area_in_the_future_LIRR_Concourse._10-30-2019_%2848997634792%29.jpg/1280px-Carpenters_installing_sheetrock_in_the_back_of_house_area_in_the_future_LIRR_Concourse._10-30-2019_%2848997634792%29.jpg', 'Cover photograph attribution', 'accepted', coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), now()
 FROM public.learn_articles a WHERE a.slug='de-drywall-metal-stud-maintenance'
 AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url='https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Carpenters_installing_sheetrock_in_the_back_of_house_area_in_the_future_LIRR_Concourse._10-30-2019_%2848997634792%29.jpg/1280px-Carpenters_installing_sheetrock_in_the_back_of_house_area_in_the_future_LIRR_Concourse._10-30-2019_%2848997634792%29.jpg');
UPDATE public.learn_articles SET cover_image_url='https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Brickwork_in_Russia._Moscow_region._img_02.jpg/1280px-Brickwork_in_Russia._Moscow_region._img_02.jpg' WHERE slug='us-masonry-veneer-overview';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at)
 SELECT a.wall_topic_id, 'Cover: Brickwork in Russia. Moscow region. img 02.jpg', 'Dmitry Makeev (CC BY-SA 4.0)', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Brickwork_in_Russia._Moscow_region._img_02.jpg/1280px-Brickwork_in_Russia._Moscow_region._img_02.jpg', 'Cover photograph attribution', 'accepted', coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), now()
 FROM public.learn_articles a WHERE a.slug='us-masonry-veneer-overview'
 AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url='https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Brickwork_in_Russia._Moscow_region._img_02.jpg/1280px-Brickwork_in_Russia._Moscow_region._img_02.jpg');
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER USER;
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;

COMMIT;
