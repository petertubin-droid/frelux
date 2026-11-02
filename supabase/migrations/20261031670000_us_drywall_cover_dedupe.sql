BEGIN;

ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER USER;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles SET cover_image_url=$u$https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/Assembly_required_150106-F-MJ664-207.jpg/1280px-Assembly_required_150106-F-MJ664-207.jpg$u$ WHERE slug='us-drywall-finish-levels-installation';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at) SELECT a.wall_topic_id,$t$Cover photograph: interior wall boarding work in progress$t$,$p$U.S. Air Force (public domain)$p$,$f$https://commons.wikimedia.org/wiki/File:Assembly_required_150106-F-MJ664-207.jpg$f$,$c$Cover photograph: interior wall boarding work in progress$c$,'accepted',coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid),now() FROM public.learn_articles a WHERE a.slug='us-drywall-finish-levels-installation' AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url=$f$https://commons.wikimedia.org/wiki/File:Assembly_required_150106-F-MJ664-207.jpg$f$);
UPDATE public.learn_articles SET cover_image_url=$u$https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Assembly_required_150106-F-MJ664-997.jpg/1280px-Assembly_required_150106-F-MJ664-997.jpg$u$ WHERE slug='us-drywall-finish-levels-quality-checks';
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope,review_status,reviewed_by,reviewed_at) SELECT a.wall_topic_id,$t$Cover photograph: interior finish at handover$t$,$p$U.S. Air Force (public domain)$p$,$f$https://commons.wikimedia.org/wiki/File:Assembly_required_150106-F-MJ664-997.jpg$f$,$c$Cover photograph: interior finish at handover$c$,'accepted',coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid),now() FROM public.learn_articles a WHERE a.slug='us-drywall-finish-levels-quality-checks' AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=a.wall_topic_id AND s.url=$f$https://commons.wikimedia.org/wiki/File:Assembly_required_150106-F-MJ664-997.jpg$f$);
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER USER;
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;

COMMIT;
