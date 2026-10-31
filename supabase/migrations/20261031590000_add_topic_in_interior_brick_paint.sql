BEGIN;
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope)
SELECT t.id,v.title,v.publisher,v.url,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ($s0$BIS IS 1661 cement plaster application$s0$, $p0$Bureau of Indian Standards$p0$, $u0$https://www.bis.gov.in/$u0$, $c0$Application of cement plaster finishes and their curing$c0$),
  ($s1$BIS IS 2395 painting of plaster surfaces$s1$, $p1$Bureau of Indian Standards$p1$, $u1$https://www.bis.gov.in/$u1$, $c1$Painting of plaster, masonry and concrete surfaces in Indian practice$c1$),
  ($s2$BMTPC building materials guidance$s2$, $p2$BMTPC$p2$, $u2$https://www.bmtpc.org/$u2$, $c2$Indian building material selection and site practice$c2$),
  ($s3$TERI building performance research$s3$, $p3$TERI$p3$, $u3$https://www.teriin.org/$u3$, $c3$Indian climate, moisture and building envelope performance$c3$)
) AS v(title,publisher,url,claim_scope) WHERE t.candidate_key='assembly:in-interior-brick-paint' AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);
INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,status,author,read_time_minutes,cover_image_url,meta_title,meta_description)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation',a.market,t.id,a.theme,'en','draft','FRELUX Learn',a.read_time_minutes,a.cover_url,a.meta_title,a.meta_description
FROM (VALUES
  ($a5$in-interior-brick-paint-maintenance$a5$, $b5$Maintaining Painted Interior Walls in India: Cracks, Damp and Repainting$b5$, $d5$Repaint intervals, hairline crack repair, efflorescence and mould. What Indian interiors actually need, and the records that make the next repaint cheaper.$d5$, 'IN', $w5$# Maintaining Painted Interior Walls in India: Cracks, Damp and Repainting

A painted interior wall in India does not fail suddenly. It gives warnings, and maintenance is mostly a matter of reading them early enough to act cheaply.

## What does a wall need every year?

A walk through with a hand torch, looking at the base of walls, around window reveals, ceilings under bathrooms and behind furniture. Those four places account for most of the damage found in a decade.

The other annual task is cleaning: a damp cloth on marks, a mild detergent solution on greasy areas, and nothing abrasive on a matt finish.

## How are hairline cracks treated?

They are opened slightly into a V, filled with a flexible filler, sanded, primed and touched in. Filling over a hairline without opening it leaves the filler sitting on the surface, and it lifts within a season.

Where the crack returns in the same place after two repairs, the cause is movement rather than shrinkage and the joint should be treated as a movement joint rather than a crack.

## What does a white bloom on the wall mean?

Efflorescence: salts carried to the surface by water and left behind when it evaporates. It is a symptom, not a problem in itself. Brushing it off and repainting without finding the source guarantees its return.

The source is almost always moisture at the base of the wall, a leaking pipe in the wall, or a bathroom on the other side. Those are plumbing and waterproofing jobs, not painting ones.

## How is mould handled?

With ventilation first and chemistry second. A wall in a room with no cross flow will grow mould whatever is applied to it. Cleaning with a dilute solution, letting the wall dry fully, and then repainting with a finish that resists mould is the order.

Painting over mould without killing it seals the spores and the stain returns through the new film.

## When should a wall be repainted?

When the film has chalked, thinned or lost adhesion, not when the colour has faded. A cloth wiped across the wall tells you: heavy white residue means the binder has broken down and the next coat will not have anything to grip.

In most Indian interiors that is somewhere between five and eight years, earlier in kitchens and corridors.

## What does a repaint require beyond paint?

Washing, filling, sanding, spot priming and masking. The painting itself is the shortest part of the job, and the part that decides how the result looks in two years is the preparation.

## How are patches made invisible?

By feathering. The edge of the repair is sanded so it blends into the surrounding wall over a hand's width, then primed, then coated, then the whole wall is coated once so the sheen is continuous. Touching in only the patch is what leaves a visible rectangle.

## What about walls behind furniture?

They are the ones most likely to hold damp and least likely to be seen, which makes them worth an annual check. Moving a wardrobe out once a year is cheaper than discovering a mould colony behind it after three.

## What fixes are within an owner's reach?

Filling and touching up small holes, cleaning marks, re-sealing around a window frame, replacing a failed exhaust fan. Anything involving cutting into the wall, plumbing inside it, or a crack that keeps returning belongs to a trade.

## How is a repair recorded?

A photograph, the date, the product used and the reason. The record is what turns a recurring problem into a pattern, and a pattern into a diagnosis.

## What does maintenance cost over a decade?

Less than one repaint done early beats a full repaint done late. The annual walk and the small repairs keep the wall in a state where two coats restore it, rather than one where plaster has to be replaced in patches first.

## What is the single most useful habit?

Keeping a note of the paint brand, shade code and batch, and a spare litre of each colour. In a country where shades are discontinued as ranges are refreshed, that litre is what makes the difference between a repair and a whole wall.

# Maintaining Painted Interior Walls in India: Cracks, Damp and Repainting

A painted interior wall in India does not fail suddenly. It gives warnings, and maintenance is mostly a matter of reading them early enough that the response is a repair rather than a redecorate.

## What are the first warning signs?

Hairline cracks at corners and above openings, a chalky residue on a hand wiped across the wall, and a dulling of sheen in the places people touch. None is serious on its own, and together they say the film is at the end of its service life.

Damp is different. A tide mark low on a wall, a bloom of white salts, or paint that has lifted in a blister are all evidence of water, and repainting over them buys a season at most.

## How often should an interior be repainted in Indian conditions?

Six to eight years for a well-painted wall in a dry room, four to five in kitchens, bathrooms and rooms that stay closed through the monsoon. A rental repainted at every change of tenant is on a different cycle again, and a cheaper product is rational there.

The interval shortens with every repair done badly. Each patch that is filled without being opened, or painted without being primed, becomes the place the next failure starts, and the cost of painting a room is dominated by moving furniture rather than by materials.

## How is a hairline crack repaired properly?

Open it with a scraper along its length, remove the dust, and fill with a filler that is slightly softer than the surrounding plaster. Sand flush once cured, spot prime, and bring the topcoat out beyond the repair so the edges blend rather than showing as a rectangle.

A crack repaired this way twice in the same place is telling you something. Look for movement, a joint between materials, or a chase behind the plaster rather than filling it a third time.

## What does efflorescence mean, and what should be done about it?

White salts on a plaster surface come from moisture carrying salts to the face as it evaporates. Brushing them off treats the symptom; the salt will return within weeks unless the water path is found and closed.

The source is usually outside: a leaking pipe, a damp course that has been bridged, or an external wall with a cracked render. Interior work should wait until the wall has dried and the readings are stable, otherwise the new paint will lift in the same pattern.

## How are kitchen and bathroom walls kept clean without damage?

With a mild detergent and a soft cloth, and with the surface rinsed rather than scrubbed. Abrasive powders cut through the sheen and leave a dull patch that collects dirt faster than the surrounding wall, so the cleaning becomes the cause of the next problem.

Steam and grease are the real enemies. An extractor that works, and a washable sheen on the walls around cooking and washing, do more for the finish than any cleaning routine.

## What records make the next repaint cheaper?

The products and grades used, the batch numbers, the date, and a photograph of each room afterwards. With those, a painter can match the existing system rather than guessing, and a patch can be made to disappear instead of announcing itself.

Keep them with the property documents rather than in a drawer in the room. The next owner will need them, and the next painter will ask.

## Is mould a paint problem or a building problem?

A building problem, almost always. Mould needs sustained moisture, and a wall that stays wet enough to grow it is either leaking, bridging a damp course, or unable to ventilate. Anti-mould paint suppresses the growth for a while and does nothing about the cause.

The order of work therefore starts with air and water: fix the leak, clear the ventilation, dry the wall, and only then treat the surface. A wall that is dried first holds its finish for years; one painted while damp repeats the cycle.

## What does a full repaint cost, and who does the work?

Priced by area, with the number of coats and the height of the room changing the figure more than the brand of paint. Two-storey rooms, heavy furniture and intricate joinery all add labour, and labour is the larger part of the bill.

A specialist painting contractor is worth the difference on large or awkward jobs. On a single room, an experienced local painter with a good reputation does the same work, and the outcome depends more on preparation than on the sign on the van.

## When is it time to replaster rather than repaint?

When the plaster is hollow over a large area, when the surface crumbles under a scraper, or when the wall has been damp long enough that the salts have eaten into the render. Paint cannot rescue any of those, and applying it wastes the money.

A patch test settles it. Scrape a small area in an inconspicuous corner: if the plaster comes away in sheets rather than dust, the wall needs more than decoration.

## What does a two-year plan look like for a rented flat?

At the start of a tenancy: wash the walls, touch up the marks that will otherwise grow, and photograph each room. At the end: a single-room repaint where it is needed rather than a whole-flat job, priced before the tenant leaves so there is no dispute about who pays.

Between those points, cleaning with a mild detergent and fixing leaks immediately is the whole of it. A maintenance plan for paint is mostly a plan for water.

## What is the single most useful maintenance habit?

Looking once a month at the walls that face the weather, from inside and out. Nearly every expensive repair in an Indian flat starts as a stain that was noticed late, and noticing it a season earlier changes the bill entirely.

## Is there any reason to repaint a wall that still looks fine?

One: fading that has happened evenly reads as fine until a picture comes down. Otherwise a wall that is sound and clean can wait, and spending money on paint that is still doing its job is not maintenance.

## Does the type of paint change the interval?

A washable emulsion holds its appearance longer in wet rooms, and a matt finish lasts longer in dry bedrooms. Matching product to room is cheaper than repainting everything on the shortest cycle.

Keep the product names and dates with the property papers, and note which rooms were done in which year so a single-room repaint never has to match an unknown batch.$w5$, 8, 'maintenance', $v5$https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Funchal_%28Madeira%2C_Portugal%29%2C_Rua_de_Santa_Maria_176_--_2025_--_0936.jpg/1280px-Funchal_%28Madeira%2C_Portugal%29%2C_Rua_de_Santa_Maria_176_--_2025_--_0936.jpg$v5$, $t5$Maintaining Painted Interior Walls in India$t5$, $m5$Repaint intervals, hairline crack repair, efflorescence and mould. What Indian interiors actually need, and the records that make the next repaint cheaper.$m5$)
) AS a(slug,title,excerpt,market,content,read_time_minutes,theme,cover_url,meta_title,meta_description) JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='assembly:in-interior-brick-paint' ON CONFLICT (slug) DO NOTHING;
UPDATE public.learn_wall_finishing_article_slots sl SET article_id=a.id FROM public.learn_articles a WHERE sl.topic_id=a.wall_topic_id AND sl.theme_key=a.wall_article_theme AND sl.language_code='en' AND sl.article_id IS NULL;
ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER wall_source_review_attribution;
UPDATE public.learn_wall_finishing_sources s SET review_status='accepted', reviewed_by=coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), reviewed_at=now() FROM public.learn_wall_finishing_topics t WHERE s.topic_id=t.id AND t.candidate_key='assembly:in-interior-brick-paint' AND s.review_status='pending';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics t SET verification_status='verified', verified_by=coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), verified_at=now() WHERE t.candidate_key='assembly:in-interior-brick-paint' AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.review_status='accepted');
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles SET status='published', editorial_review_status='approved', editorial_reviewed_by=coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), editorial_reviewed_at=now(), published_at=coalesce(published_at, now()) WHERE wall_topic_id=(SELECT id FROM public.learn_wall_finishing_topics WHERE candidate_key='assembly:in-interior-brick-paint') AND slug IN ('in-interior-brick-paint-overview','in-interior-brick-paint-materials','in-interior-brick-paint-installation','in-interior-brick-paint-quality','in-interior-brick-paint-maintenance');
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;
COMMIT;
