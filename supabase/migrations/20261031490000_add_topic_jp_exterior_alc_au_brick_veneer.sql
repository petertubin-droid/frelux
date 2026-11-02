-- Japan batch 4 + Australia batch 1: ten researched articles (5 each), SEO-aware.
-- JP: assembly:jp-exterior-alc-paint. AU: system:au-brick-veneer-plasterboard.
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='JP' AND candidate_key='assembly:jp-exterior-alc-paint') THEN RAISE EXCEPTION 'JP exterior ALC paint topic missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='AU' AND candidate_key='system:au-brick-veneer-plasterboard') THEN RAISE EXCEPTION 'AU brick veneer topic missing'; END IF;
END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('JASSO','https://www.jasso.or.jp/','JASSO (jasso.or.jp)','Japanese ALC panel technical information and coating practice'),
  ('Japan Paint Manufacturers Association','https://www.jpma.or.jp/','JPMA (jpma.or.jp)','Japanese coating classification, film build and labelling'),
  ('The Japan Institute of Architects','https://www.jia.or.jp/','Japan Institute of Architects','Japanese facade specification and maintenance practice'),
  ('Ministry of Land, Infrastructure, Transport and Tourism','https://www.mlit.go.jp/','MLIT (Japan)','Japanese building maintenance and inspection obligations')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='JP' AND t.candidate_key='assembly:jp-exterior-alc-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: painters coating a theatre facade, Traumrune, CC BY-SA 3.0','https://commons.wikimedia.org/wiki/File:Peintre_facade_1.JPG','Wikimedia Commons','Cover photograph overview article, CC BY-SA 3.0'),
  ('Image credit: painters with coating materials on a facade, Traumrune, CC BY-SA 3.0','https://commons.wikimedia.org/wiki/File:Peintre_facade_2.JPG','Wikimedia Commons','Cover photograph materials article, CC BY-SA 3.0'),
  ('Image credit: coating a building facade, JosefLehmkuhl, CC BY-SA 3.0','https://commons.wikimedia.org/wiki/File:Wandfarbe.JPG','Wikimedia Commons','Cover photograph installation article, CC BY-SA 3.0'),
  ('Image credit: facade painters at work, Traumrune, CC BY-SA 3.0','https://commons.wikimedia.org/wiki/File:Peintre_facade_3.JPG','Wikimedia Commons','Cover photograph quality article, CC BY-SA 3.0'),
  ('Image credit: small commercial building with a painted facade, Karen Apricot, CC BY-SA 2.0','https://commons.wikimedia.org/wiki/File:Russ_Economy_Superette_-_Happy_Store.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 2.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='JP' AND t.candidate_key='assembly:jp-exterior-alc-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Australian Building Codes Board','https://www.abcb.gov.au/','ABCB','National Construction Code requirements for masonry veneer and wall lining'),
  ('Think Brick Australia','https://www.thinkbrick.com.au/','Think Brick Australia','Clay brick veneer construction, ties, articulation and durability'),
  ('Gyprock','https://www.gyprock.com.au/','Gyprock (CSR)','Plasterboard systems, jointing levels and cornice installation')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='AU' AND t.candidate_key='system:au-brick-veneer-plasterboard'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: clay brick veneer on a timber stud wall with building wrap, Bricktrimble, CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Brick_veneer_residential_construction.jpg','Wikimedia Commons','Cover photograph overview article, CC BY-SA 4.0'),
  ('Image credit: gypsum board interior wall lining, Marina-Shehata, CC0','https://commons.wikimedia.org/wiki/File:Elm-Place-Dry-Wall-Gypsum-Board-Interior-wall.jpg','Wikimedia Commons','Cover photograph materials article, CC0'),
  ('Image credit: brick veneer mock-up construction, U.S. Navy, public domain','https://commons.wikimedia.org/wiki/File:US_Navy_080105-N-4357J-003_Builder_3rd_Class_Courtney_Bombardo,_assigned_to_NMCB-5,_builds_brick_veneer_mock-ups_in_preparation_to_install_on_the_newly_constructed_Main_Gate_Guard_House_in_Akasaki,_Japan.jpg','Wikimedia Commons','Cover photograph installation article, public domain'),
  ('Image credit: tapered plasterboard edge detail, Panamitsu, CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:Gib_board_aka_plasterboard_tapered_edges_02.jpg','Wikimedia Commons','Cover photograph quality article, CC BY-SA 4.0'),
  ('Image credit: brick veneer house, Blue Mountains Library, CC BY-SA 2.0','https://commons.wikimedia.org/wiki/File:The_Family_and_house_at_%27Attercliffe%E2%80%99,_Punchbowl,_NSW.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 2.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='AU' AND t.candidate_key='system:au-brick-veneer-plasterboard'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code IN ('JP','AU')
  AND t.candidate_key IN ('assembly:jp-exterior-alc-paint','system:au-brick-veneer-plasterboard')
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.meta_title,a.meta_description,a.market,a.market,t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('coating-alc-facade-elastic-paint-overview', 'Coating an ALC Facade: Elastic Paint and Sealed Joints', 'Coating an ALC facade means an elastic paint system over sealed joints: why the coating must move with the wall, what it protects, and where these facades fail first.', 'JP', $wallarticle1$# Coating an ALC Facade: Elastic Paint and Sealed Joints

Coating an ALC facade is a waterproofing operation that happens to look like decoration. The elastic paint is the layer that keeps rain out of a wall made of aerated concrete, and the joints beneath it are the places where that layer is asked to move.

If you are searching for how an ALC facade is coated, recoated or repaired, start with the reason: ALC is porous, it moves with the frame, and its joints are designed to flex. A rigid paint cannot bridge a moving joint, so the coating has to be elastic, applied to a specified thickness, over a surface that was prepared properly.

## Why does ALC need a coating at all?

ALC needs a coating because the panel is porous and would otherwise absorb rain.

The material is cellular concrete with an open pore structure. Water does not pass through it quickly, but it does soak into the surface, and a soaked panel is a panel that will release moisture inward, stain, grow mould and lose insulation performance.

The coating closes that surface. It is the only continuous barrier on the wall, which is why its thickness and its elasticity are performance requirements rather than decorative choices.

## What does elastic mean in practice?

Elastic means the coating can stretch with the joint and the panel without splitting, and it is tested as the ability to bridge a moving crack.

The movement comes from two sources: thermal movement of the panel and structural movement of the frame. A coating that can stretch a small amount across those movements will stay continuous. A rigid coating cracks at the joint line, and the crack is exactly where water enters.

Japanese facade specifications therefore state an elastic or semi-elastic system, and they state the film build that achieves the elasticity.

## Why do the joints decide the outcome?

The joints decide because they are the only part of the facade designed to move, and a coating fails where the thing beneath it moves.

A sealed joint has a flexible sealant behind the coating. When the joint opens and closes, the sealant moves and the coating must follow. If the coating is too stiff or too thin, it splits over the sealant and the joint becomes a visible line of failure.

That is why joint treatment is part of the coating specification rather than a separate trade, and why a recoating job inspects the sealant before the first coat.

## What is the coating system made of?

A typical system is a sealer or primer on the prepared panel, a flexible base coat that bridges the joints, and a top coat that provides weather resistance and colour.

The sealer equalises absorption so the base coat does not dry unevenly. The base coat carries the elasticity. The top coat carries the resistance to sun, rain and dirt, and it is the layer that will chalk and fade first.

Some systems add a mesh or a reinforcing strip over joints on a facade with a history of cracking. That is a repair decision, not a standard one.

## How thick does the coating need to be?

Thick enough to bridge the joint movement, which is stated as a dry film thickness or an application rate per square metre.

Thickness is the difference between an elastic coating and a coat of coloured water. Japanese systems state the coverage rate, and the applied thickness is checked by reading the material used against the area covered.

A thin application looks correct for a season and then performs as a brittle film. That is the most common way a facade coating fails before its time.

## What are the failure points on a coated ALC facade?

Five points fail in a consistent order: the joint line, the fixings, the window reveals, the parapet and the corner.

The joint fails first because it moves. The fixings fail second because each one is a penetration where the coating has to be continuous. The reveals and parapets fail because water collects there. Corners fail because movement concentrates at the edges of a panel.

A maintenance inspection that starts at those five places finds almost everything.

## How does the Japanese climate affect the cycle?

The climate shortens the cycle on the wet and sunny sides of a building and extends it on sheltered ones.

A facade that faces the sun and the prevailing rain takes more ultraviolet and more water than a sheltered elevation, and its coating chalks and cracks sooner. A north elevation in a humid area collects dirt and mould, which the coating must resist.

That is why a Japanese recoating specification is written elevation by elevation rather than as a single number for the building.

## What does recoating cost and who does it?

Recoating is priced by area, by the number of coats and by access, and access is usually the largest line.

A mid-rise facade needs scaffold or a gondola, and that cost is paid whether one elevation is coated or four. Coating the whole building in one mobilisation is therefore far cheaper per square metre than coating one side at a time.

The work is done by a coating contractor, with the sealant applicator and the panel specialist involved where joints and fixings need attention before the coating.

## How long does a coating last?

A Japanese facade coating is expected to perform for a decade or so on a well-detailed wall, and less where the elevation is exposed.

The life is set by the top coat's resistance to ultraviolet and dirt, and by the movement the base coat has to absorb. A facade on a sheltered inland site may go longer; a coastal one will not.

The honest way to plan is to inspect annually from the ground and to recoat on the manufacturer's cycle rather than waiting for a visible failure.

## Can you coat over an existing coating?

You can recoat over a sound existing coating, and you must remove one that has lost adhesion.

The test is adhesion and thickness: a coating that is firmly bonded and not excessive in build can be prepared and recoated, while a coating that is blistering, lifting or chalking heavily is removed back to a sound surface. Coating over a failing film gives a new surface that fails with the old one.

Japanese practice also distinguishes a recoat over the same system from a recoating over an unknown one, because compatibility decides the primer.

## What should an owner watch for?

Three visible signs matter: chalk on a hand wiped across the wall, cracks along joint lines, and a change of colour that follows the joints rather than the panels.

Each points to a stage. Chalking is a top coat at the end of its life. Cracks along joints are a base coat that could not bridge movement. Colour following joints is water behind the coating.

Acting at the first of those symptoms is what keeps a recoating job from becoming a repair job.

## Related reading

Materials covers the sealer, elastic base coat, mesh and top coat choices. Installation follows the sequence from washing to the final coat. Quality covers thickness and adhesion checks, and maintenance covers cycles and joint repair.

Related topics in this library: the RC frame with ALC panel infill for the wall underneath, and the Japanese interior gypsum paint assembly for the inside face.

## What happens if the coating is left too long?

A coating left past its life stops being a barrier and starts being a reservoir.

Once the top coat has chalked through and the base coat has hardened, rain no longer runs off the surface; it wets it, and the panel absorbs what the coating no longer resists. The panel then holds water against the frame and the fixings, which is when corrosion and internal damp begin.

Recoating on the cycle is therefore cheaper than recoating late, because the late job includes repairs the early one avoided.

## Does the colour of an ALC facade matter technically?

It matters more than most owners expect, because a dark facade absorbs heat and expands further.

Thermal movement is what the elastic coating and the flexible joints are designed to absorb. A dark wall moves more, works the joints harder and shortens the life of both the sealant and the coating. It also shows every irregularity in the panel plane and every patch in the coating.

Light colours are the technical choice in a Japanese climate, and their lower surface temperature is the reason.

## How does a facade coating interact with the interior?

A facade coating stops rain entering from outside, and it also affects how the wall dries toward that side.

A coating that is highly vapour-tight traps moisture inside the assembly, which is why Japanese systems are described as breathable to a degree while remaining water-resistant. The interior's vapour control and ventilation do the other half of the job.

A building with a sealed facade and no ventilation has the worst of both: water cannot get out on either side.

## What is the difference between a repair and a recoat?

A repair restores local performance; a recoat renews the whole surface. They have different triggers.

A repair is triggered by a defect: a crack, a failed joint, a rust stain, a chip. A recoat is triggered by the age of the coating across the elevation, measured by chalking and colour change rather than by any single fault.

Confusing the two is how a facade gets patched every second year instead of recoated once in ten.

## Who decides when a facade is recoated?

The owner decides, on advice from a contractor or an inspector, and the advice should be evidence rather than a sales cycle.

A considered recommendation states the chalking observed, the adhesion tested, the joint condition and the elevations that differ. A recommendation based on the year alone ignores the exposure, which varies enormously between elevations on the same building.

Asking for that evidence turns a maintenance conversation into a technical one.

## What does a failed coating look like from a distance?

From a distance, a failed coating reads as loss of uniformity: the building looks tired rather than dirty.

The pattern is the clue. Fading that follows the sun is normal ageing. Lines that follow the joints are movement. Blotches that follow the panel layout are water. A patch that looks newer than its neighbours is a repair.

Reading those four patterns from the ground is the skill that a maintenance plan is built on.

## Does a coating change the wall's fire performance?

A facade coating does not change the fire classification of an ALC wall, which is set by the panel and the assembly.

What a coating can affect is surface spread of flame in some circumstances, which is why Japanese specifications sometimes name a coating class on walls near a boundary. That is a legal item rather than a performance one.

The record of the assembly's classification remains the document that matters, and a recoat does not alter it.

## How does a facade coating affect energy use?

It affects energy use modestly, by changing how much solar heat the wall absorbs and how much moisture it holds.

A light-coloured coating keeps the surface cooler, which reduces heat gain in summer. A coating that keeps the panel dry preserves its insulation value, since a wet aerated panel insulates poorly.

Those effects are small compared with the wall's construction, but they explain why colour and integrity appear in energy guidance rather than only in appearance guidance.

## What is the single most useful maintenance habit?

The single most useful habit is looking at the facade after rain rather than on a dry day.

Water reveals what a dry facade conceals: joints that stay dark, patches that dry slowly, streaks that run from a fixing. Those are the earliest evidence available without access.

A photograph taken on the same day each year, from the same position, turns that habit into a record.

## References

1. JASSO.
2. JPMA.
3. Japan Institute of Architects.
4. MLIT.

## Image credit

The cover photograph shows painters coating the facade of a theatre, taken by Traumrune and made available under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows facade coating work of the kind this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 10, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Peintre_facade_1.JPG/1280px-Peintre_facade_1.JPG',
   'Coating an ALC Facade: Elastic Paint Guide', 'Coating an ALC facade: why the paint must be elastic, how sealed joints decide whether it works, the system layers, and the five points that fail first.')

, ('alc-exterior-coating-materials', 'ALC Exterior Coating Materials: Sealer, Base Coat, Top Coat', 'The materials for coating an ALC facade in Japan: ALC sealer and its job, elastic base coats that bridge joints, mesh for cracked areas, top coats rated for sun and rain, and film build.', 'JP', $wallarticle2$# ALC Exterior Coating Materials: Sealer, Base Coat, Top Coat

ALC exterior coating materials are chosen as a system, and the system is what performs. A good top coat over the wrong sealer fails; a cheap top coat over a correct base coat performs for years.

This is a buying guide for the Japanese ALC facade: what each layer does, how it is classified, which product suits which position and exposure, and what a supplier will ask before selling it.

## Why must the sealer be ALC-specific?

The sealer must suit ALC's absorption, which is high and uneven compared with dense concrete.

An ALC sealer penetrates the porous surface and equalises it so the base coat dries at a consistent rate. A sealer designed for dense concrete sits on the surface and leaves the panel drawing the base coat unevenly, which shows as patches of differing sheen and later as patches of poor adhesion.

The sealer is also the layer that binds dust and stabilises a slightly friable surface. On a recoating, it is often the difference between a system that holds and one that lifts.

## What makes a base coat elastic?

A base coat is elastic when its polymer composition gives it elongation at the specified thickness, and that property is stated on the data sheet.

Elongation percentage at a given film thickness is the number that matters. A product with high elongation applied thin does not perform as an elastic coat, because the thickness is part of the property.

Japanese systems publish the required film build per coat. That is why a coating contractor measures material usage rather than judging by eye.

## Does the top coat do anything beyond colour?

The top coat carries the weather resistance: ultraviolet stability, dirt resistance and water repellency.

It is the layer that chalks and fades, and its life sets the recoating cycle. A dirt-resistant top coat keeps a facade looking sound longer, which matters because appearance drives when owners decide to recoat.

On a humid site, a mould-resistant grade is worth the difference in price on north elevations that stay damp.

## When is mesh or reinforcing strip used?

Mesh is used where the substrate has cracked or where a joint has a history of movement beyond the coating's capacity.

It is a repair detail rather than a standard layer. A facade with recurring cracks along a joint line gets a strip over that line before the base coat, which spreads the movement over a wider band of coating.

Adding mesh everywhere is expensive and is not a substitute for correct joint sealing. Where the sealant behind is failing, mesh only delays the symptom.

## Which products suit a coastal or exposed site?

A coastal site needs a system with better resistance to salt, ultraviolet and wind-driven rain, and it needs a shorter inspection interval.

Salt attacks the coating surface and accelerates chalking; wind-driven rain finds every detail. Japanese specifications for exposed sites raise the film build, add a top coat and shorten the maintenance cycle.

The most economical response is a better system applied once, rather than a standard system applied repeatedly.

## How much material does a facade need?

Material quantities follow area, coats and the product's coverage rate, with the joint length as a separate line for the sealant.

A facade with many openings has more joint per square metre, so a sealant estimate taken from area alone comes up short. Coatings are estimated per coat per square metre, and the number of coats is a specification item.

Ordering the whole building from one batch is the practice, because a second batch can differ in shade, and a facade in two shades is a permanent record of a procurement compromise.

## What tools and access are needed?

The tools are rollers, brushes, spray equipment, masking materials and a means of reaching every part of the facade.

Access is the constraint that shapes the method. Scaffold allows full control and slow, careful work; a gondola is faster and constrains the pattern of application; a spray plant covers area quickly but needs masking and protection.

Japanese contractors choose the access first and the application method second, because the method has to suit the platform.

## Which products do not belong on an ALC facade?

Four products cause most failures: a concrete sealer, a rigid decorative paint, a coating applied over a damp panel, and a sealant that the coating cannot bridge.

Each fails for the same underlying reason, which is a mismatch between the movement of the wall and the movement the product can absorb. Recognising that pattern lets a buyer reject a proposal before work starts.

The practical test is to ask for the system's stated elongation and film build, and to compare them with the facade's joint movement.

## What does the material cost relative to the whole job?

Materials are a modest share of a recoating cost, and access is the large share.

That ratio explains why upgrading a system is usually good value: the difference between a standard and a high-performance coating is small against the scaffold, and the improved system delays the next mobilisation.

It also explains why cheap material on an expensive scaffold is the worst combination available.

## How is a system verified before purchase?

A system is verified by its data sheet, its local track record and its warranty terms, read together.

The data sheet gives elongation, film build and coverage. The track record is what local contractors will tell you about a product on this climate. The warranty states what the manufacturer will do if it fails and, more usefully, what conditions void it.

A warranty that requires a specific film build and specific preparation is a warranty that tells you how the job must be done.

## What changes on a repair rather than a recoat?

On a repair, the material list grows a patching mortar, a crack filler and possibly mesh, and the coating is matched to the existing system.

Matching matters because a repair with a different system shows as a patch in the same way a paint touch-up does. Waiting for the next full recoating is often the sensible course where the repair is cosmetic.

Where the repair is a leak, the material is a sealant and the coating is only the closing layer.

## Related reading

The overview explains why the system is elastic. Installation follows the sequence of coats. Quality covers how thickness and adhesion are verified, and maintenance covers the cycle.

## Is a thicker coating always better?

No: thickness beyond the system's design can crack as it cures and can trap solvent or water.

Each product has a specified film build, and the specification exists because both thinner and thicker films perform worse. A thick film of a flexible product skinning over a soft interior is a classic failure on facades where quantity was substituted for care.

The correct question is not how thick the coating is but whether the specified film build was achieved across the elevation.

## How does the primer differ on a recoat?

On a recoat the primer has to bond to an existing coating rather than to bare ALC, so the product and the preparation differ.

A recoat primer is chosen for compatibility with the existing system, and the surface is abraded or washed to give it a key. Applying an ALC sealer over an old coating is a mismatch that shows as poor adhesion across the elevation.

Where the existing system is unknown, a small trial patch is coated, left to cure and tested before the elevation proceeds.

## What role does the joint sealant play in the system?

The sealant is the flexible core of the joint, and the coating is only its cover.

A joint without a sound sealant is a joint that relies on a paint film for waterproofing, which no facade coating is designed to do. That is why joint inspection precedes coating and why replacements are scheduled with the recoat rather than after it.

Sealant and coating should be specified as a compatible pair, since a coating that will not bond to the sealant leaves the joint exposed.

## Which top coat suits a north elevation in a humid city?

A north elevation in a humid city collects dirt and biological growth, so the top coat needs dirt resistance and a mould inhibitor.

South and west elevations need ultraviolet stability more; north elevations need cleanability. Specifying one product for the whole building is a compromise that suits neither, which is why elevation-specific schedules exist on larger Japanese buildings.

On a house, the compromise is reasonable; on a mid-rise facade it is worth the extra line in the specification.

## How is a system's life estimated?

Its life is estimated from the manufacturer's data, the local track record and the exposure of the elevation.

The data gives a nominally tested life; the track record tells you what a product actually does in this climate; the exposure tells you which elevation will fail first. Together they produce a number that is a planning tool rather than a promise.

A facade plan that names the worst elevation as the trigger for the whole building is the standard Japanese approach.

## Can different systems be used on one facade?

Different systems on one facade are possible and are usually a mistake, because the junction between them is where failure concentrates.

Two coatings with different elasticity and different film build meet at a line that moves differently on each side. That line cracks, and it is exactly where water will enter.

Where a phased programme forces a change of product, the junction is detailed as a joint rather than as a butt of two films.

## How is a system priced?

A system is priced by area, coats and access, with the joint work as a separate line measured in linear metres.

Comparing two prices without the coat count and the film build compares two different jobs. The cheapest quote on a facade is usually the one with the fewest coats, and it is the most expensive over a decade.

Asking for the film build per coat alongside the price is the way to make quotations comparable.

## What warranty terms actually matter?

The terms that matter are the required preparation, the required film build, the inspection regime and the exclusion list.

A warranty that voids if the surface was not prepared to a stated standard is only as good as the record proving preparation. That is why photographs and material quantities belong to the warranty file.

A long warranty with vague conditions is worth less than a short one with clear requirements.

## How is a system's cost compared?

Two systems are compared by cost per square metre per decade, which is the price divided by the years the system is expected to last.

That figure makes an expensive system with a long life comparable with a cheap one with a short life. It also exposes the false economy of a system that needs recoating twice as often, since each recoat pays for access again.

Japanese facade budgets are increasingly written this way, because access dominates every other line.

## References

1. JASSO.
2. JPMA.
3. Japan Institute of Architects.
4. MLIT.

## Image credit

The cover photograph shows painters working on a facade with their coating materials, taken by Traumrune and made available under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows facade coating work in progress. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 10, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Peintre_facade_2.JPG/1280px-Peintre_facade_2.JPG',
   'ALC Exterior Coating Materials: Sealers and Coats', 'ALC exterior coating materials: why the sealer must suit ALC, what makes a base coat elastic, when mesh is used, and top coats rated for sun, rain and')

, ('recoating-alc-facade-sequence', 'Recoating an ALC Facade: From Wash to Top Coat', 'How an ALC facade is recoated in Japan: washing and chalk removal, crack and joint repair, sealing, priming, base coat, mesh where needed, then top coats in a weather window.', 'JP', $wallarticle3$# Recoating an ALC Facade: From Wash to Top Coat

Recoating an ALC facade is a preparation job with a coating at the end. Most of the work happens before the first coat, and most failures come from what was skipped in the first two days.

The sequence below is the Japanese method for a facade that is being recoated rather than repaired, and it assumes scaffold or gondola access and a weather window long enough for the system to cure.

## Why does washing come first?

Washing comes first because a coating bonds to the surface, not to the dirt on it.

Facades collect pollution, salt and biological growth, and a coating applied over any of those bonds to the contaminant rather than the panel. The wash removes the loose chalk from the old coating as well, which is essential: a new coat over a chalky surface lifts with the chalk.

Japanese practice uses water and a suitable detergent, with a rinse, and allows the wall to dry before anything else happens. On a humid day that drying is a scheduled delay, not an inconvenience.

## How is chalk and loose coating removed?

Chalk and loose coating are removed by washing and, where necessary, by light abrasion or a high-pressure rinse.

The test is a hand wiped across the surface: if it comes away white, there is chalk and the preparation is incomplete. Localised lifting, blistering or thick build is removed back to a sound edge, since a new coat cannot bridge a film that is already detaching.

Removal leaves a step in the old coating. That step is feathered and primed, because a hard edge is where the new system will crack first.

## How are cracks treated before coating?

Cracks are opened, filled elastically and, where they are recurring, bridged with mesh before the base coat.

A hairline crack is filled with an elastic filler compatible with the system. A crack that follows a joint or a fixing is a symptom, and it is investigated rather than filled, because coating over a moving crack produces the same crack in the new film within a season.

Where a crack has recurred after a previous repair, mesh over the line distributes the movement across a wider band of coating, which is the practical way to keep it invisible.

## What happens at the joints?

At the joints, the sealant is inspected, and where adhesion has failed it is cut out and replaced before coating.

The inspection is a hand test along the joint: a sealant that lifts at the edge under light pressure is not bonded. Replacing it means cutting out, cleaning, priming, a new backer rod and new sealant tooled to profile.

Coating a failed joint seals the failure under a new film, and the film splits over it within a season. That is why joint inspection is the first technical task of a recoating job, not the last.

## How is the primer applied?

The primer is applied to the whole prepared surface at the specified rate, and it is allowed to dry before the base coat.

Primer on ALC does two jobs: equalising absorption and improving adhesion. Applying it patchily produces exactly the variation it was meant to remove, so it is applied as a full coat rather than as spot treatment.

Japanese systems state the primer's coverage, and the quantity used is checked against the area. A primer applied at half rate is a primer that did not do its job.

## How is the base coat built?

The base coat is applied to the specified film build, in one or more passes, and it is the layer that carries the elasticity.

Film build is measured by material consumption against area, and on a large facade it is confirmed by a wet film gauge on a sample. The base coat is where the money is spent on performance, and it is where a contractor under pressure will economise.

Where mesh is specified, it is embedded in the first pass of the base coat so that the coating passes through the mesh rather than sitting on it.

## How are the top coats applied?

Top coats are applied after the base coat has cured, in the specified number, at the specified rate, with the final coat laid off consistently.

Two top coats are normal on a Japanese facade, and the second is the one that carries the surface. Application marks from an inconsistent roller or spray pattern show in raking light and are permanent until the next recoat.

Colour is confirmed against a sample panel before the whole elevation is coated, because a shade decided on a chart and a shade on a wall are different things.

## What weather stops the work?

Rain, wind, high humidity and low temperature each stop or degrade the work, and each has a limit stated by the manufacturer.

Water on the surface before the film forms ruins adhesion. Wind carries spray and dries the film too fast. High humidity slows curing and can leave a soft film. Low temperature stops film formation in some products entirely.

A programme that gives the coating a real weather window is cheaper than one that pushes through and recoats in two years.

## How is the site protected?

Adjacent surfaces, glazing, balustrades and the ground are masked and protected before any material is applied.

Overspray travels, and a coating on glass or on a neighbour's car is a cost that no labour saving recovers. On a Japanese building, the protection also covers the interior side of open windows, since spray enters rooms.

Protection is removed at the end of each elevation's work rather than at the end of the job, so that the building stays usable.

## How long does a recoating take?

The duration is set by the area per elevation, the number of coats and the curing intervals, not by the coating itself.

A single elevation on a small building may be a few days including preparation. A whole mid-rise facade is weeks, with the scaffold as its own mobilisation. Weather days are added rather than absorbed.

The critical path is preparation and curing, and both are usually underestimated in a quotation built from area alone.

## How is the work inspected as it proceeds?

Three checkpoints carry the quality: after preparation, after the base coat, and after the top coat.

After preparation, the check is cleanliness, sound substrate and completed joint repairs. After the base coat, it is film build and continuity, including around fixings and at joints. After the top coat, it is colour, uniformity and edge details.

Stopping at each checkpoint is what makes a recoating job predictable, because each of the three can be corrected only before the next.

## What does the sequence look like on a small building?

On a small building the sequence compresses but does not change: wash, repair, seal joints, prime, base coat, top coats, inspect.

The temptation on a small job is to combine stages, which is how a facade gets a coating without the joint repair it needed. The order is cheap to follow and expensive to skip.

A small commercial facade recoated properly is a decade of quiet; the same facade recoated quickly is a call-back in two seasons.

## Related reading

The overview explains why elasticity matters. Materials covers product choice by exposure. Quality covers what to measure, and maintenance covers the cycle that decides when this sequence runs again.

## How is the facade accessed and what does it change?

Access determines how the work is sequenced: scaffold allows full elevation working, a gondola moves in vertical strips, a platform serves the reachable band.

Each pattern leaves different lap lines if the coating is applied in sections. Planning the access before the application method prevents the laps that show as bands across a facade.

Japanese contractors plan the elevation as a set of panels of work that match the access, so that each section is finished wet at its edge.

## What preparation does a previously coated surface need?

A previously coated surface needs washing, chalk removal, and a key for the new primer.

Washing removes pollution and biological growth. Chalk removal matters because a new coat cannot bond to powder. The key is a light abrasion or a manufacturer's etch, applied to the whole elevation rather than to patches.

Skipping any of the three produces a failure that appears as patches of lifting, and that appears within the first wet season rather than later.

## How are plant and drainage protected?

Plant, drainage and paving are masked or covered before work starts, and the covering is checked daily.

Coating overspray on paving is permanent, and material washed into a stormwater drain is both a pollution offence and a blockage risk. On a Japanese building the ground-level protection also includes the neighbour's boundary, since facades are often close together.

Protection is part of the method statement, not an afterthought on the day.

## What is done about existing mould or algae?

Existing mould and algae are treated and killed before coating, not painted over.

Painting over growth traps it under the film and it returns through the coating within a season. The treatment is an appropriate cleaner, a dwell time, a rinse and a drying period, followed by the coating once the surface is dry.

Where growth keeps returning on one elevation, the cause is usually shade, damp or a drainage outlet discharging onto the wall.

## How is the first coat checked before continuing?

The first coat is checked on a sample area for adhesion, coverage and colour before the elevation proceeds.

The sample is cured and tested by hand and by a tape pull. A failure at that point costs a small area; the same failure discovered after the top coat costs the elevation.

Japanese practice often retains the sample as a reference for the project's colour and texture.

## How does weather delay affect the system?

Weather delay affects adhesion and curing, and it should stop work rather than push it.

Rain on an uncured coat removes material and leaves a surface that will not accept the next coat evenly. Wind dries the film too fast, which can cause mud cracking. Cold stops film formation in some products.

The practical rule is to plan preparation for the weather window and to leave the coating for the days that suit it.

## What does a completed elevation look like?

A completed elevation is uniform in colour and sheen, with no laps, no ridges at joints and no breaks at fixings.

Seen at an angle, it should read as one plane, with the joint grid visible as a designed line rather than as a crack. Seen after rain, it should dry evenly, with no band that stays dark.

Those three observations are the visual test that precedes any measurement.

## References

1. JASSO.
2. JPMA.
3. Japan Institute of Architects.
4. MLIT.

## Image credit

The cover photograph shows a building facade being coated, taken by JosefLehmkuhl and made available under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows coating application on a facade. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 11, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Wandfarbe.JPG/1280px-Wandfarbe.JPG',
   'Recoating an ALC Facade: The Full Sequence', 'Recoating an ALC facade step by step: washing and chalk removal, crack and joint repair, priming, elastic base coat, mesh where needed, then top coats in a')

, ('checking-coated-alc-facade', 'Checking a Coated ALC Facade: Thickness, Adhesion, Bridging', 'How to check a freshly coated ALC facade: dry film thickness and material usage, adhesion and joint bridging, colour uniformity, coating continuity at fixings, and the moisture checks.', 'JP', $wallarticle4$# Checking a Coated ALC Facade: Thickness, Adhesion, Bridging

Checking a coated ALC facade is a set of measurements, not an opinion. Film thickness, adhesion, continuity at joints and fixings, and colour uniformity are the four things that decide whether the coating will perform.

The checks happen while the work is accessible, because afterwards every question becomes an expensive investigation rather than a five-minute test.

## How is film thickness verified?

Film thickness is verified by material consumption against area and, on a sample, by a gauge.

The arithmetic is the primary check: litres used divided by area coated gives a film build, and it is compared with the specification. A job that used materially less material than the arithmetic predicts was applied thin, whatever it looks like.

A wet film gauge or a dry film gauge on a sample confirms the arithmetic. Both are quick, and both need to be done on a panel that can be measured without leaving a visible mark.

## How is adhesion tested?

Adhesion is tested by a cross-cut or a pull-off test on a representative area, and by hand at the edges of the work.

A cross-cut reads the way the film releases: clean squares indicate good adhesion, ragged or partial release indicates a weak bond. A pull-off gives a number, which is useful on a large project with a specification to meet.

The hand test matters too: a film that lifts at a masked edge or at a joint line is a film that will lift across the elevation.

## What does good joint bridging look like?

Good joint bridging is a continuous film over the joint with no crack, no line and no change of sheen along the sealant.

The joint is checked with a straightedge and with raking light. A line that follows the joint exactly is the coating telling you it could not move with the sealant, and it will open.

Where the joint has been meshed, the check also looks for the mesh reading through the film as a texture, which means the mesh was laid on the surface rather than embedded.

## How is continuity at fixings checked?

Each fixing is checked as a penetration: the coating should pass over it without a break, a pinhole or a thin edge.

A fixing is where a facade leaks, because it is a small discontinuity with a metal core that corrodes when wet. The check is close visual inspection with a light, and it is repetitive enough that it is the item most often skipped.

On a facade being recoated after a leak, the fixings are also checked for rust staining, which indicates water has already been inside.

## How is colour uniformity judged?

Colour uniformity is judged on a completed elevation, in daylight, from a distance, and against the approved sample.

Patchiness comes from three causes: uneven primer, uneven film build, and application in two sessions with a lap between them. All three show as a change of tone that follows the application pattern rather than the architecture.

Judging colour on a wet film is meaningless, since many products dry to a different shade. The check belongs on the cured surface.

## What moisture checks apply to a coating?

Before coating, the moisture content of the panel decides whether the work can proceed; after coating, moisture readings indicate whether water is getting in.

A panel that is damp traps water under the film, and the coating blisters or lifts as the moisture moves. That is why a moisture reading before the primer is part of the specification rather than a formality.

After service, a localised high reading behind the facade is evidence of an entry point, and it supports the search at the joint above.

## What defects are acceptable?

Very few, and the acceptable ones are cosmetic and local.

Minor texture variation from a roller is normal on a large elevation. A small dust nib is normal. What is not acceptable is a crack over a joint, a break at a fixing, a lap line between sessions, or a patch of different sheen.

Stating those four as absolute limits gives the inspection a standard, and it stops a cosmetic conversation from burying a functional defect.

## How is a large elevation inspected practically?

A large elevation is inspected in three passes: from the ground for pattern, from access at arm's length for detail, and by sampling for measurement.

The ground pass finds laps, patchiness and anything that follows the architecture. The access pass finds cracks, breaks and edges. The sampling pass produces the numbers for thickness and adhesion.

Doing them in that order is efficient because each pass tells you where the next one should look.

## What should the handover record contain?

The record names the system, the primer, the number of coats and the film build achieved, the joint repairs done and the fixings attended to.

Add photographs at each checkpoint and the material quantities used against the area. Those two items are what allow a warranty claim and what a future recoating specification is built from.

On a building with an inspection obligation, the record also carries the date and the findings of the pre-coating survey.

## Who should inspect?

The inspection belongs to whoever specified the work, not to the contractor applying it.

On a Japanese project that is the architect or a third-party inspector; on a house it is the owner or their representative. A contractor inspecting its own coating is a quality control step, not an independent check.

The cost of an independent inspection is small against a scaffold, which is the argument for doing it while access exists.

## How are repairs judged after coating?

A repair is judged by invisibility in the light that reveals defects, and by adhesion at its edges.

A patch that was coated with the same system and blended at a joint should not be visible from a few metres. A patch that shows as a rectangle means the coating was applied locally rather than blended.

Judging a repair in daylight from the ground is the honest test, since that is how the building will be seen.

## Related reading

The installation article sets out the sequence these checks verify. Materials explains the products that cause each defect. The maintenance article covers what to do when a check finds a fault years later.

## How is a sample area used on a facade?

A sample area is coated first, cured and tested, and it becomes the reference for the elevation.

It fixes the colour, the texture and the film build. Disputes about whether a facade is acceptable are settled by comparison with the sample rather than by opinion.

On a large Japanese project the sample is photographed, dated and kept, sometimes on a hidden part of the wall, as the physical record of what was agreed.

## What does adhesion failure look like in practice?

Adhesion failure appears as blistering, as lifting at an edge, or as a film that releases under a tape pull.

The pattern shows where it started. Blisters over a whole area indicate a damp or dusty substrate. Lifting at masked edges indicates a thin edge. Release at a joint indicates the coating could not bond to the sealant.

Each pattern points to a different stage, which is what makes the inspection useful rather than merely critical.

## How is texture judged?

Texture is judged against the specified finish: roller, spray or a combination, and the texture that results.

A spray finish has a fine even stipple; a roller finish has a directional pattern. Either is acceptable if it is the specified one and if it is uniform. A mix of the two on one elevation reads as patchiness and is a defect.

Judging texture belongs in daylight at a distance, since close inspection exaggerates it.

## What is checked at the parapet and at the base?

At the parapet, the check is that the coating continues over the top and that the coping or flashing sheds water away from the wall.

At the base, the check is that the coating stops above the damp zone and that the ground drainage takes water away. A coating that bridges into wet ground wicks water up into the panel, which is a failure that starts at the bottom and appears as damp high up.

Both details decide whether the elevation performs regardless of the coating.

## How is a facade inspected without full access?

It is inspected from the ground with binoculars, from any available platform, and by sampling on access used for other work.

Ground inspection finds laps, patchiness, staining and joint lines. It cannot test adhesion or thickness. Where access is not available, the honest statement is that the facade has been observed but not tested.

Scheduling a partial access inspection alongside any other work on the building is the practical compromise.

## How does a repair blend when the coating has aged?

A repair blends by using the same system, feathering the edges and, where possible, coating to a joint line.

On an aged facade the new coating will look different even in the same colour, because the old film has changed. Coating between joint lines, so that the repair's edge coincides with a designed line, hides that difference.

Where a large area is repaired, a complete elevation coat is the honest solution.

## How are ladders and edges judged?

Lap marks and edges are judged in daylight along the elevation, looking for bands of differing tone or sheen.

Laps appear where one application session met another and the film overlapped while partly cured. They are permanent features of the finished work, so the check belongs before the elevation is signed off.

Good practice is to work to a joint line or a corner, so that any unavoidable lap coincides with a designed edge.

## How is a facade documented?

A facade is documented with elevation drawings marked up with the areas coated, the dates, the products and the findings.

Photographs are indexed to those elevations so that a later inspection compares like with like. Material quantities per elevation complete the record.

That file is what makes the next recoat a scheduled job rather than a survey.

## What if the inspection finds a fault after the scaffold is down?

The practical response is to record it, quantify it and plan the correction with the next access.

Some faults can be corrected from a platform or a ladder at low level; others cannot. Pretending a facade is sound is not a maintenance strategy.

The cost of re-erecting access is the argument for completing the inspection before the scaffold comes down, which is why the checkpoints in this article are scheduled rather than optional.

## What is the most common inspection finding?

The most common finding is a joint that has lost adhesion under a sound-looking coating.

It is found by the hand test at the joint, and it is invisible from a distance because the coating still bridges the sealant. That is why the test is done at every inspection on access, and why it is worth doing even when the facade looks sound.

Finding it early converts a coating repair into a sealant repair, which is a fraction of the cost.

## References

1. JASSO.
2. JPMA.
3. Japan Institute of Architects.
4. MLIT.

## Image credit

The cover photograph shows facade painters at work, taken by Traumrune and made available under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows coating work at the stage these checks apply to. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 10, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Peintre_facade_3.JPG/1280px-Peintre_facade_3.JPG',
   'Checking a Coated ALC Facade: What to Measure', 'Checking a coated ALC facade: film thickness from material usage, adhesion tests, joint bridging, continuity at fixings, colour uniformity and the moisture')

, ('maintaining-coated-alc-facade', 'Maintaining a Coated ALC Facade: Cycles, Chalking, Joints', 'Maintaining a coated ALC facade in Japan: the recoating cycle, reading chalk and colour change, cleaning without damage, joint resealing between coats, and the sign a leak has started.', 'JP', $wallarticle5$# Maintaining a Coated ALC Facade: Cycles, Chalking, Joints

Maintaining a coated ALC facade is mostly observation, cleaning and timely recoating. The coating is a wear layer, and its whole purpose is to be renewed before the wall behind it suffers.

This article covers what to look at each year, how to read the early signs, how to clean without damaging the film, and how to decide between a recoat and a repair.

## What does an annual inspection look like?

An annual inspection is a walk around the building with three questions: is the coating still continuous, is it still adhered, and is it still the same colour.

From the ground, look for change: a patch that reads darker after rain, a joint that shows as a line, chalk on the hand when you touch a sheltered spot. Those three observations find most developing faults.

The walk takes twenty minutes and replaces most emergency call-outs. It is also the cheapest maintenance instrument available on a coated facade.

## How do you read chalking?

Chalking is a fine powder on the surface, and it is the coating's ultraviolet resistance being consumed.

A light chalk is normal on an older coating and is removed by washing before recoating. A heavy chalk that transfers to a hand or streaks down the facade in rain means the top coat is exhausted and the next coat is due.

Chalking matters beyond appearance because it prevents a new coat from bonding. A recoating over unwashed chalk is a coating that will lift.

## What does colour change tell you?

Colour change tells you which part of the system is failing and where the exposure is worst.

Uniform fading on a sunny elevation is normal ageing of the top coat. Colour change that follows the joints is water behind the coating. Patchy change that follows the application pattern is uneven film build.

Reading those three patterns correctly decides whether the answer is a wash, a recoat, or a joint repair.

## How should a coated facade be cleaned?

It should be cleaned with water, a mild detergent and soft brushes, at a pressure low enough not to damage the film.

High-pressure washing on a facade is a common cause of damage: it lifts the coating at edges and forces water into joints. The safe method is a controlled rinse with the nozzle at a distance and the pressure reduced.

Biological growth is treated with an appropriate cleaner and rinsed, and the surface is allowed to dry. Scrubbing a coated facade with an abrasive is how a clean wall becomes a marked one.

## When do joints need resealing between coats?

Joints need resealing when the hand test shows the sealant has lost adhesion, which can happen well before the coating is due for renewal.

Because the coating bridges the joint, a failed sealant is often invisible until the coating splits. That is why the joint test is done at each annual inspection on the reachable lower storeys, and on access at any opportunity.

Resealing a joint means cutting out, cleaning, priming, a new backer rod, new sealant and recoating over it. A sealant applied over the old one is a repair with a short life.

## What are the signs a leak has started?

Four signs: a damp patch indoors that appears after rain, a rust stain at a fixing, a blister in the coating, and a joint that stays dark longer than its neighbours.

Each points to a different entry route, and each is worth acting on before the rain season rather than after. A blister is usually water vapour pushing out from a wet panel, which means water has already been inside.

The diagnostic habit that works is to find the entry above the evidence, never at it.

## What is the recoating cycle?

The cycle is the manufacturer's stated interval adjusted for elevation and exposure, typically around a decade on a well-detailed Japanese facade.

South and west elevations on an exposed site reach the end sooner; sheltered north elevations later. Coating the whole building in one mobilisation rather than elevation by elevation is far cheaper, which is why the cycle is usually planned per building with the worst elevation setting the date.

Waiting for visible failure is how a recoating job becomes a repair job with panels and fixings in it.

## Can a facade be partially recoated?

A partial recoat is possible and is usually a compromise, because a join between old and new coating shows.

The join is visible as a line of different sheen or shade, and it is also where the new coating's edge is thinnest, so it becomes the next failure point. Partial recoating is reasonable where one elevation has failed early for a known reason.

Where the budget is limited, the better compromise is to recoat the failed elevation completely and wash the rest, rather than to patch across several elevations.

## What should be recorded?

Record the system, the date of each recoat, the joint reseals and every fixing replaced, with photographs from fixed viewpoints.

That record is what lets a later contractor match the system, and it is what lets an owner see whether the maintenance is being done as planned. On a building with an inspection obligation, it is also the evidence.

A one-page history per facade is enough and it saves an investigation at every mobilisation.

## What does maintenance cost over a decade?

Over a decade, a coated ALC facade typically sees annual inspection, periodic cleaning, some joint resealing and one recoat.

The recoat dominates the cost and the access dominates the recoat. Planning the recoat with any panel or fixing repairs, in one mobilisation, is what keeps the total down: each separate visit pays for access again.

The cheapest decade is the one where the inspection found the small faults early, because small faults are handled inside a scheduled visit.

## Related reading

The overview explains why the coating must move with the wall. Materials covers products by exposure. Installation covers the recoating sequence, and quality covers the checks at handover.

Related topics: the RC frame with ALC panel infill for the wall itself, and the Japanese interior gypsum paint assembly for the inside face.

## How is a facade cleaned without damage?

It is cleaned with low pressure, a mild detergent and soft brushes, working from the bottom upward and rinsing downward.

Low pressure protects the film; soft brushes protect the texture. Working upward prevents streaks running over cleaned areas that are then not rinsed again.

High-pressure washing is the commonest cause of coating damage on Japanese facades, and the damage is invisible until the coating lifts at a joint.

## What is the role of ventilation and drainage at the base?

Drainage at the base takes water away from the wall, and ventilation of the cavity lets the wall dry.

A facade whose base is buried in a garden bed, or whose ground falls toward the building, keeps water against the coating. The coating then stays wet, grows growth and ages faster.

Correcting the ground levels and the drainage is maintenance of the facade, even though it involves no coating work.

## How are rust stains treated?

Rust stains are treated by finding the fixing, correcting it and only then cleaning the panel.

Cleaning a rust stain without addressing the fixing produces a stain that returns. The fixing is exposed, assessed and replaced if it has lost section, and the coating is reinstated around it.

Acid-based cleaners on ALC are avoided, since they attack the material as well as the stain.

## When is a panel repair better than a recoat?

A panel repair is better when a single panel has failed structurally, has been damaged by impact, or shows spalling around its fixings.

In those cases coating over the area is a cosmetic act on a local defect. The panel or the fixing is repaired, the area is patched and coated, and the recoat follows when the elevation is due.

Deciding that early prevents a facade being recoated with a known defect under the new film.

## What does a maintenance contract typically cover?

A maintenance contract typically covers annual inspection, cleaning on a cycle, joint resealing on condition and the recoat at the stated interval.

What it should also cover is reporting: a short record of findings each year, with photographs. Without it, the owner is paying for visits and receiving no history, and the next contractor starts from nothing.

Japanese building maintenance agreements increasingly include that reporting requirement.

## How does the owner know a recoat is due?

The owner knows from three signals: the chalking test, the change of appearance after rain, and the age of the last recoat against the system's stated life.

Any two of the three together justify planning the work. Waiting for all three means waiting for a visible failure, which is a recoat plus a repair.

The annual walk is what keeps those signals visible rather than surprising.

## How is a facade cleaned on a large building?

It is cleaned in controlled sections, with the water and the run-off managed.

Water running down a facade carries dirt into joints and stains the surface below. Working in sections, rinsing downward and drying the surface at the end of each section keeps the result even.

On a Japanese mid-rise this is planned with the access, since cleaning and inspection are usually done in the same mobilisation.

## What about graffiti and deliberate damage?

Graffiti is removed with a product suited to the coating, and the area is recoated where the film has been damaged.

A coating with a sacrificial clear layer makes removal possible without recoating the whole elevation, which is why some Japanese commercial facades specify one. Where damage has reached the panel, the repair is a patch and a coat.

The response time matters: graffiti removed within days is cheaper than graffiti that has cured in the sun.

## How does the facade's age affect decisions?

An older facade is judged on performance rather than on appearance, and the balance shifts toward repair and eventual replacement.

Panels and fixings have a service life, and a facade that has been recoated several times may need an assessment of the assembly rather than another coat. That assessment is the point at which a coating contractor should bring in a specialist.

Recognising that point is what prevents money being spent on cosmetic work on a wall that needs repair.

## What is the difference between cleaning and maintenance?

Cleaning changes appearance and maintenance changes performance, and they are often sold as one service.

A washed facade looks better and may last longer, but a wash does not restore a failed joint or a coating that has reached the end of its life. Paying for cleaning while deferring the recoat is paying for appearance on a wall that is losing protection.

A maintenance plan states both, with the recoat as the anchor.

## References

1. JASSO.
2. JPMA.
3. Japan Institute of Architects.
4. MLIT.

## Image credit

The cover photograph shows a small commercial building with a painted facade, taken by Karen Apricot and made available under CC BY-SA 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the kind of small commercial facade that is recoated on a maintenance cycle. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 10, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Russ_Economy_Superette_-_Happy_Store.jpg/1280px-Russ_Economy_Superette_-_Happy_Store.jpg',
   'Maintaining a Coated ALC Facade: Cycles and Signs', 'Maintaining a coated ALC facade: the annual walk, reading chalk and colour change, safe cleaning, joint resealing between coats and the four signs a leak has')

, ('brick-veneer-plasterboard-overview', 'Brick Veneer with Plasterboard: How Australian Walls Work', 'A brick veneer wall with plasterboard lining is the standard Australian house wall: brick skin, cavity, timber or steel frame, sarking, plasterboard and paint, and how each layer works.', 'AU', $wallarticle6$# Brick Veneer with Plasterboard: How Australian Walls Work

A brick veneer wall with plasterboard lining is the standard wall of Australian housing, and it works because the two halves have completely different jobs. The brick skin keeps the weather out; the timber or steel frame carries the house; the plasterboard is the finished internal surface.

That division is what makes the system flexible, and it is also what makes it easy to get wrong. The cavity between the two is not empty space to be filled with insulation and hope; it is a drainage plane with a specific width, and the plasterboard is not a structural element even though it stiffens the wall.

## What is a brick veneer wall?

A brick veneer wall is a single skin of clay brick tied to a timber or steel frame, with a drained cavity between them and the frame lined internally with plasterboard.

The brick is non-structural cladding: it carries its own weight onto the footing and transfers lateral wind load back to the frame through ties. The frame carries the roof, the floors and the wind, and the plasterboard provides the internal finish and part of the fire and acoustic performance.

## Why does Australia build this way?

Australia builds this way because clay brick is cheap and durable there, timber framing is fast, and plasterboard gives a flat interior at low cost.

The combination suits the climate and the labour market: bricklaying is a trade with a deep local base, timber framing is quick on a cleared site, and the finished wall performs well against sun and rain without any coating on the brick.

It also suits renovation. Internal linings can be opened and closed, and the brick skin can stand for the life of the building with repointing rather than replacement.

## What does each layer do?

Each layer has one job, and the system only performs when each is done.

The brick skin sheds rain and provides the visible facade. The cavity drains any water that gets behind the brick and provides a break between the wet outer skin and the frame. The sarking or building wrap on the frame keeps water off the timber and lets vapour escape. The frame carries loads. The plasterboard finishes the inside.

Between them sit the ties, which connect the skin to the frame without rigidly coupling them, and the flashings at openings, which direct water out of the cavity.

## How wide should the cavity be?

The cavity should be wide enough to drain and to ventilate, and it is specified rather than left to chance.

A nominal 40 mm cavity is common in Australian residential work, with a minimum stated in the code and in the masonry standard. It has to be clear at the bottom for drainage through weep holes and at the top for ventilation.

A cavity narrowed by mortar droppings, insulation pushed against the brick, or a frame that is out of line is a cavity that will not drain, and a wall that does not drain will eventually show damp indoors.

## How does water actually behave in this wall?

Water enters the brick skin through wind-driven rain, travels down the back of the brick, and leaves through weep holes at the base.

That is the design assumption: the brick is a screen, not a seal. The cavity and the flashings handle the water that gets through, and the sarking protects the frame from what the cavity does not carry away.

Understanding that changes how an owner thinks about the wall. Brick staining, a damp patch at the base of an internal wall and moss at the base of the facade are all the same story: water got in and did not get out.

## What is sarking for?

Sarking is the water-resistant, vapour-permeable membrane fixed to the outside of the frame, and it does two jobs.

It keeps wind-driven rain off the timber and it lets vapour escape from the inside of the house, which is what prevents condensation in the frame. It also improves the wall's resistance to air movement, which matters for comfort and for energy performance.

Sarking installed with the laps running the wrong way, or torn during bricklaying, is worse than useless because it concentrates water where it cannot drain.

## How is the plasterboard fixed?

Plasterboard is fixed to the frame with screws or with a combination of adhesive and screws, depending on the system specified.

Adhesive fixing produces a flatter, stiffer wall with fewer fixings, and it is common on Australian residential work where the frame is sound. Screw fixing is used where the board must be removable or where the frame is not straight enough for adhesive.

The fixing pattern matters for fire and acoustic performance, which is why it is specified rather than decided on site.

## What is a level of finish?

A level of finish describes how thoroughly the joints and surfaces are prepared before decoration, and Australian and New Zealand practice grades it.

A basic level suits a wall that will be painted with a texture or covered, and a high level is required where the wall will be seen in critical light or has a gloss finish. The grade is agreed in the contract.

The level determines how many jointing passes, how much sanding and how flat the finished wall will be, which is why it is the item to name before work starts.

## How is the lined wall painted?

The lined wall is painted with a sealer or undercoat and two or three coats of low-sheen acrylic, applied to the specified film build.

The sealer equalises the absorption of the board and the joint compound and provides a key. A low-sheen acrylic is the Australian default because it is washable, it does not highlight surface imperfections, and it performs in a hot climate.

The number of coats is a specification item, and a wall painted in two thin coats where three were specified will show joint telegraphing within a year.

## What does this wall cost and who builds it?

This wall is built by a sequence of trades: framer, bricklayer, plasterer and painter, with the builder coordinating them.

Cost is driven by brick area, the number of openings and the level of finish on the lining. Plasterboard is inexpensive in material terms and expensive in labour, because jointing and sanding take time.

Because four trades are involved, the interfaces matter. The bricklayer's ties, the framer's straightness and the plasterer's level of finish all affect each other, and each is a place where responsibility gets disputed.

## What are the commonest faults?

Six faults recur: mortar blocking the cavity, missing or wrongly fixed ties, sarking lapped the wrong way, missing flashings at openings, plasterboard joints that telegraph, and cornice cracks at the wall-ceiling junction.

Each maps to a trade and to a stage. Each is also invisible at handover and obvious within a few seasons, which is why inspection during construction is worth more than a final walk-through.

## Related reading

Materials covers bricks, ties, sarking, plasterboard and paint. Installation follows the build from frame to finish. Quality covers the checks, and maintenance covers repointing, weep holes and repainting.

Related topics in this library: the GB brick and block cavity wall for the same drainage logic in another market, and the US masonry veneer for a closely related system.

## Does this wall perform well acoustically?

It performs reasonably because the two skins, brick and plasterboard, are different materials with a cavity between them.

The brick provides mass and the plasterboard provides a resilient internal layer, and the cavity adds isolation. The acoustic result depends on how the plasterboard is fixed and on whether the cavity contains insulation.

Where a party wall must perform, the specification names the wall type and its acoustic rating, and substituting a lighter lining removes it.

## How is this wall affected by bushfire?

In bushfire-prone areas the wall's performance is set by the outer skin and by the detailing at openings and at the base.

A brick skin resists ember attack well because it is non-combustible and continuous. The weak points are the weep holes, the eaves and the junctions where debris can collect.

The requirements are stated in the code for the site's bushfire attack level, and they apply to details rather than to the wall in general.

## What is a cavity sliding door doing in this wall?

A cavity slider hides the door leaf inside the frame cavity, which changes the wall's construction locally.

The pocket requires a frame and lining designed for it, and the brick skin is unaffected. The details that matter are the head, the pocket lining and the acoustic performance, which is reduced compared with a solid wall.

Specifying the pocket at the frame stage is essential; it cannot be added after the brick is laid.

## How does the wall handle movement?

It handles movement with articulation joints in the brickwork and with the ties, which allow small relative movement between the skin and the frame.

Articulation joints are vertical breaks in the brick skin, placed to control cracking, and they are specified rather than left to the bricklayer. Where they are omitted on a long wall, the cracks appear where the movement should have been allowed.

Their position is a design decision, and their presence is a quality check.

## What about render over brick veneer?

Render over brick veneer is possible and changes the maintenance picture, because the render becomes the weather surface.

A rendered brick skin needs a render system suited to the brick, movement joints that coincide with the brick's articulation joints, and a paint or coating cycle on the render.

Unrendered brick needs almost no external maintenance, which is one of its advantages. Rendering exchanges that for a coating cycle, and it should be a considered choice rather than a default.

## How does the lining affect thermal comfort?

The lining affects comfort by sealing the internal surface against draughts and by holding insulation in the frame.

A well-fixed lining with sealed joints produces a room that feels warmer than an equivalent wall with draughts. The lining itself has little insulation value, so the frame's insulation does the work.

Sealing at the skirting, the cornice and the openings is what turns the lining into an air barrier, and it is a detail rather than a product.

## How long does this wall last?

The brick skin can serve for the life of the building with repointing, and the frame for as long as it is kept dry and protected from termites.

The lining is replaced on a cycle of decades, and the paint on a cycle of years. The wall's life is therefore set by the parts that are maintained rather than by the parts that are built.

That is the practical meaning of durable construction: the expensive parts are protected and the cheap parts are renewed.

## References

1. ABCB National Construction Code.
2. Think Brick Australia.
3. Gyprock.

## Image credit

The cover photograph shows clay brick veneer on a timber stud wall with a water-resistant barrier, taken by Bricktrimble and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the brick skin, the cavity and the frame that this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle6$, 10, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Brick_veneer_residential_construction.jpg/1280px-Brick_veneer_residential_construction.jpg',
   'Brick Veneer with Plasterboard: Australian Walls', 'Brick veneer with plasterboard explained: why Australia builds this wall, what the brick, cavity, sarking, frame and lining each do, and the faults that')

, ('brick-veneer-materials', 'Brick Veneer Materials: Bricks, Ties, Sarking, Plasterboard', 'The materials of an Australian brick veneer wall: brick grades and durability, veneer ties and their fixing, sarking and flashings, plasterboard thickness, joint compound and paint system.', 'AU', $wallarticle7$# Brick Veneer Materials: Bricks, Ties, Sarking, Plasterboard

Brick veneer materials are chosen in pairs: a brick and the tie that holds it, a membrane and the flashing that drains it, a plasterboard and the compound that joins it. Get a pair wrong and the wall fails at their interface.

This is a buying guide for the Australian system: what the products are, how they are graded, which one suits which exposure, and what a supplier will ask before selling them.

## Which brick should be used?

The brick should be rated for the exposure, which in Australian practice means a durability classification matched to the site.

Bricks are graded for salt attack and for thermal movement, and a coastal site needs a higher grade than a sheltered inland one. Using an interior or general-purpose brick on an exposed coastal facade is the classic durability failure, and it shows as face spalling after some years.

The grade is stated in the manufacturer's literature. Buying on appearance and price alone is how a wall ends up with a brick that cannot survive its own weather.

## What do veneer ties do and which type?

Veneer ties connect the brick skin to the frame, transfer wind load, and allow small movement between the two.

Ties are made of galvanised or stainless steel, and the material is chosen for the exposure: stainless on coastal work, heavily galvanised inland. A tie that corrodes expands and cracks the brick around it, which is a structural fault rather than a cosmetic one.

Tie density and fixing are specified, and the fixing into the frame matters as much as the tie itself. A tie fixed with the wrong fastener holds nothing.

## Why does sarking specification matter?

Sarking specification matters because it is the layer that keeps the frame dry and still lets the wall breathe.

The product is a vapour-permeable membrane with a water-resistance rating, and it is installed with lapped joints running so that water drains outward and downward. Tapes and laps are part of the specification, not an optional extra.

A wall built with a non-permeable membrane, or with laps reversed, traps moisture in the frame. The consequence is condensation, timber decay and mould on the inside face, none of which is visible from outside.

## What flashings are needed?

Flashings are needed at every opening, at the base of the wall, at roof junctions and wherever the cavity is interrupted.

A flashing collects water from the cavity and directs it out through weep holes or over a drip edge. Missing or poorly lapped flashings are the most common cause of water appearing inside a brick veneer house.

The flashing material is chosen for compatibility with the brick and the mortar; a flashing that corrodes or reacts with the masonry fails as surely as one that was never installed.

## Which plasterboard thickness?

Plasterboard thickness is chosen for the wall's performance: 10 mm is common on walls, 13 mm where impact resistance, fire rating or a better acoustic result is required.

Thicker board is stiffer, heavier and better at resisting a blow, which matters in corridors and family rooms. Thinner board is easier to handle and cheaper, and it is adequate where the wall is protected.

The thickness also determines the fixing length and the joint treatment, so it is not a decision to change on site when stock runs out.

## Which jointing compound and level?

Jointing compound is chosen with the level of finish, and the level is stated in the contract.

A level that requires taping, three coats and full sanding needs a compound that sands to a feather edge without tearing. A lower level allows a faster compound and a coarser finish.

Mixing a fast-setting compound for a job that will be sanded to a high standard is a common mismatch: it sets harder than the board and sands unevenly.

## Which cornice and how is it fixed?

Cornice is chosen for the ceiling height and the look, and fixed with an adhesive over a bed of compound.

The compound bed takes up the irregularity between wall and ceiling, and the adhesive holds the cornice in place while it sets. A cornice fixed with adhesive alone, without the bed, cracks at the junction when the frame moves.

Cornice cracking at the wall-ceiling line is the most reported defect in Australian houses, and it is almost always a fixing detail rather than a material fault.

## Which paint system?

The paint system for a lined wall in Australia is a sealer or undercoat followed by two or three coats of low-sheen acrylic.

Low sheen is the default because it hides joint telegraphing, cleans easily and performs in strong sunlight. A gloss or semi-gloss is used in wet areas and on trim, where cleaning matters more than concealment.

Film build is a specification item. Three coats applied thin is not the same wall as two coats applied properly, whatever the tin says.

## How much material does a wall need?

Material quantities follow the area with an allowance for openings, cutting and waste, and the allowance differs by product.

Bricks are estimated per square metre with a waste allowance for cutting at openings and corners. Plasterboard is estimated by sheet count against the layout, with a waste allowance for the ceiling and the walls separately. Paint is estimated by area per coat.

Sarking is estimated with a lap allowance, and flashings by length. Ordering plasterboard for the whole room rather than the whole house reduces waste, because offcuts can be used on the smaller walls.

## What does a wall of materials cost?

Materials are a modest share of the wall's cost, and the trades are the large share.

Brick, sarking and plasterboard are commodity products with visible prices. The difference between a good and a poor wall is rarely the material and almost always the labour: the cavity kept clear, the ties fixed, the laps correct, the joints sanded.

That is why the practical buying decision is to spend on the products that are hard to change later, which are the brick grade, the tie material and the membrane.

## Which material substitutions cause trouble?

Four substitutions cause most of the trouble: a lower brick grade for appearance, galvanised ties on a coastal site, a non-permeable membrane for a permeable one, and thinner plasterboard where a fire rating was specified.

Each is invisible once the wall is built, and each removes a performance the owner paid for. Each is also cheap to avoid at the ordering stage and expensive to correct afterwards.

A written schedule with product names, not categories, is what prevents them.

## Related reading

The overview explains the system. Installation follows the build sequence. Quality covers the checks that catch a substitution, and maintenance covers repointing and repainting.

## What is the difference between veneer and cavity brick?

Veneer has one brick skin tied to a frame; cavity brick has two skins and carries its own roof and floor loads.

The difference changes everything downstream: a veneer wall needs ties and a frame that carries the building, while cavity brick needs adequate footings for the mass. A veneer wall is cheaper and faster, and it has become the Australian default.

Mixing the details, such as building a veneer as though it were a structural skin, is a design error rather than a construction one.

## How are bricks delivered and stored?

Bricks are delivered on pallets, stored level on firm ground, and protected from contamination by soil or site runoff.

Bricks laid wet behave differently in the wall, and bricks contaminated with soil stain the mortar and the face. On a tight site, storage is planned so that the bricklayer can reach the pallets without crossing finished work.

Wastage is higher when bricks are stored badly, since chipped faces cannot be used in a visible position.

## What about mortar specification?

Mortar is specified by mix and strength, and it should be weaker than the brick so that any cracking happens in the joint rather than in the masonry.

A mortar that is too strong damages the brick at the face and causes spalling, particularly on softer bricks. A mortar that is too weak erodes and leaves the brick edges exposed.

The mix is stated on the drawings and followed on site, which is where it is most often altered for workability.

## How is plasterboard connected to the frame?

Plasterboard is connected with screws into the frame, with adhesive, or with a combination, and the connection is specified.

Adhesive spreads the fixing over the sheet and stiffens the wall; screws provide the mechanical hold. A combination is common, with adhesive on the studs and screws at the edges.

The connection matters for fire and acoustic performance, which is why it is checked rather than assumed.

## What is the role of the stud adhesive in flatness?

Stud adhesive bridges the small irregularities in the frame, which is why a glued wall can be flatter than a screwed one.

The adhesive is applied in dabs or beads, the sheet is pressed into place and the adhesive takes up the difference. The result is a plane that follows the average of the studs rather than each one.

Where the frame is badly out, adhesive cannot compensate and the frame is corrected instead.

## How does a wall get a fire rating?

A fire rating comes from a tested system: a specific board, a specific fixing pattern, specific joints and specific penetration details.

Substituting any of those removes the rating. That is why the rating belongs to a system rather than to a board, and why the board's label is not the evidence.

On a wall between dwellings, the rating is the item most often damaged by later renovation, since a new opening or a new socket interrupts it.

## What maintenance does the brick skin need?

The brick skin needs very little apart from clear weep holes and occasional repointing.

Brick does not need painting, sealing or coating, and applying a sealer can trap moisture and cause spalling. Cleaning is a wash with water, and harsh cleaning damages the face.

The routine is therefore about water: keep the outlets clear, keep the ground away from the base, and watch the joints.

## What is a typical brick count for a house?

A brick count is estimated per square metre of wall, with an allowance for openings, corners and cutting.

The estimate is used for ordering rather than for design, and the waste allowance is what separates a job that finishes with bricks to spare from one that waits for a delivery. Keeping the spare for later repairs is standard practice on an Australian site.

The count is also what makes a variation order measurable when a window moves.

## References

1. ABCB National Construction Code.
2. Think Brick Australia.
3. Gyprock.

## Image credit

The cover photograph shows a gypsum board interior wall lining, taken by Marina-Shehata and released under CC0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a lined internal wall of the kind this article specifies materials for. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle7$, 10, 'materials', 'https://upload.wikimedia.org/wikipedia/commons/6/61/Elm-Place-Dry-Wall-Gypsum-Board-Interior-wall.jpg',
   'Brick Veneer Materials: Bricks, Ties, Sarking', 'Brick veneer materials for Australian walls: brick durability grades, veneer ties and coastal corrosion, sarking and flashings, plasterboard thickness, joint')

, ('building-brick-veneer-plasterboard-wall', 'Building a Brick Veneer Wall and Lining It in Plasterboard', 'The build sequence for an Australian brick veneer wall: frame and sarking, flashings, bricklaying with ties and a clear cavity, then plasterboard, jointing, cornice and paint.', 'AU', $wallarticle8$# Building a Brick Veneer Wall and Lining It in Plasterboard

Building a brick veneer wall runs two builds in one: the frame and its membrane go up first, the brick skin follows, and the internal lining is fixed and finished behind it.

The order is not arbitrary. The sarking has to be on before the brick, the flashings have to be in before the brick reaches them, and the plasterboard has to come after the roof is on and the house is weatherproof. Doing any of those out of order creates a defect that no later stage can fix.

## How is the frame prepared?

The frame is built, straightened and checked for plumb before anything is fixed to its outside face.

Straightness matters because the plasterboard will reproduce whatever the frame does, and because the brick skin needs a consistent cavity. A frame that is out of line in one bay produces a wall that is both wavy inside and tight against the brick outside.

Services are roughed in before the lining, since the frame cavity is where they run. Cutting a frame after it is bricked is a repair, not a plan.

## How is sarking installed?

Sarking is fixed to the outside of the frame with laps running so water drains outward and downward, and with the joints taped as specified.

The laps are the whole point. A membrane lapped the wrong way channels water into the frame instead of away from it, and that error is invisible once the brick is up.

The membrane is also protected during bricklaying. A torn membrane behind a brick skin is a permanent hole, and it is one of the reasons the bricklayer's work is inspected rather than assumed.

## When do flashings go in?

Flashings go in before the brick reaches them, and they must be in place before any brick is laid over the opening.

Base flashings at the foot of the wall, sill flashings at openings, head flashings above them and the flashing at a roof junction are all installed as the brickwork rises, not retrofitted.

A flashing installed after the brick is a flashing that was not installed. The water it should have collected goes into the frame instead, and the evidence appears indoors months later.

## How is the brick skin built?

The brick skin is laid on the footing, tied to the frame as it rises, and kept clear of the frame by the cavity.

Ties are fixed to the frame at the specified spacing and embedded in the mortar joint as the brickwork reaches them. The cavity is kept clear of mortar droppings, which is a discipline rather than a technique: mortar that falls into the cavity blocks drainage at the base.

Weep holes are left at the base and at the head of openings. They are the outlets for the whole system, and a wall built without them is a wall that will hold water.

## How is the cavity kept clear?

The cavity is kept clear by a cavity batten, by careful mortar handling and by cleaning as the work rises.

A batten pulled up as the brickwork rises lifts droppings out with it rather than letting them accumulate at the base. Cleaning at the end of each lift is faster than cleaning at the end of the wall, and on a tall wall it is the only practical approach.

Insulation, where it is installed in the cavity, is fixed to the frame rather than pushed against the brick, so the drainage path stays open.

## How is the plasterboard fixed?

Plasterboard is fixed after the roof is on and the building is weatherproof, using adhesive, screws or both as specified.

Sheets are set out so that joints land on framing and do not align with the joints on the other side of the wall. A layout decided as the work proceeds produces joints that miss the framing, and joints that miss the framing crack.

Openings are cut after the sheet is fixed, so that the sheet is supported and the cut is clean.

## How are joints finished?

Joints are taped, filled and sanded in passes, to the level of finish specified for the wall.

Each pass is wider than the last, and the sanding follows the joint rather than crossing it. Screw heads are filled in the same sequence. The tapered board edge exists so that the finished joint is flush rather than proud.

The level of finish decides how many passes and how much sanding, and it is agreed before the work starts. A wall finished to a lower level than the contract required is a defect even if it looks neat.

## How is cornice installed?

Cornice is installed after the wall joints are finished and before painting, bedded in compound and fixed with adhesive.

The compound bed accommodates the irregularity between wall and ceiling, and the adhesive holds the cornice while the bed sets. Both are needed: adhesive alone cracks, and bed alone can slump.

Corners are mitred or coped according to the profile, and the joint at each corner is filled and sanded after the cornice is set.

## How is the wall painted?

The wall is painted with a sealer or undercoat and two or three coats of low-sheen acrylic, after the joint compound is dry and dust-free.

Dust from sanding is the enemy here: it contaminates the sealer and shows as a rough film. A vacuum and a damp wipe before the sealer is the method.

The top coats are applied to the specified film build and left to cure before the room is used, which matters in a hot climate where a soft film marks easily.

## What is the sequence between trades?

The sequence is frame, sarking, flashings, brickwork, roof, plasterboard, jointing, cornice, painting.

Each trade hands over a condition the next one depends on. The bricklayer depends on the flashing being in place; the plasterer depends on the roof and on the frame being straight; the painter depends on the jointing being finished and dry.

Compressing that sequence is the commonest cause of defects in Australian residential work, and it is always presented as a programme saving.

## How long does the wall take?

The duration depends on the brick area, the number of openings and whether the lining is done at the same time as the rest of the house.

Bricklaying sets its own pace, weather permitting, and it is the longest single operation. The lining and finishing are quicker but depend on the house being closed in.

On a small house the whole sequence is a matter of weeks. On a larger one the brickwork and the internal work can overlap on different parts of the building, which is where coordination earns its keep.

## What should be inspected during the build?

Six inspection points: the frame before sarking, the sarking and flashings before brick, the ties as the brick rises, the cavity at each lift, the lining layout before fixing, and the joint finish before painting.

Each is cheap to check and impossible to check later. Together they cover everything that a final walk-through cannot see, which is most of what matters in this wall.

## Related reading

The overview explains the system and its logic. Materials covers brick grades, ties, membranes and board. Quality covers the checks in detail, and maintenance covers what to do years later.

## How are openings formed?

Openings are formed by leaving a gap in the brickwork, with a lintel or an arch to carry the brick above.

The lintel is structural, sized for the span and the load, and it needs a bearing at each end. The flashing sits above the lintel and below the brick, and it discharges through weep holes at the head.

The sequence matters: lintel, flashing, then brick above it. A flashing fitted after the brick above has been laid is a flashing that does not exist.

## How is the frame straightened?

The frame is straightened by packing and planing the studs, and by checking with a straightedge across the wall.

A frame that is not straight produces a lining that follows it and a brick cavity that varies. In Australian practice the frame is checked before the lining and before the brick, which are two different tolerances.

Correcting the frame is cheap; correcting a brick skin is not.

## How is the roof connected?

The roof is connected to the frame, which is one reason the frame carries the building in a veneer wall.

The brick skin stops below the roof line or continues to the eaves, depending on the detail, and the junction is flashed. Water at that junction is directed away from the wall rather than into the cavity.

A common defect is a flashing that relies on sealant alone, which fails within a few years.

## How is the site sequenced around weather?

Bricklaying stops in heavy rain because wet bricks and washed mortar joints cannot be laid to standard.

The frame and lining work can proceed under cover while brickwork waits, which is one reason the two halves of this wall are usefully independent. Programming them in parallel sections keeps a weather delay from stopping the whole house.

Sand and cement are stored covered, since damp sand changes the mortar's behaviour.

## How are services run in this wall?

Services run in the frame cavity, in the ceiling space and in the lining, never in the brick cavity.

Cutting a horizontal chase into a brick skin removes its integrity, and running a pipe through the cavity blocks drainage. The frame is the correct route, and the lining is the access.

On a renovation, a new service that has to cross a brick wall goes through an opening with a proper sleeve and flashing, not through the brick.

## What does a good brick finish look like?

A good brick finish is even in colour and coursing, with consistent joint widths and a clean face.

Variation in colour is normal in clay brick and is part of the material's character; wild variation suggests bricks from different batches used without blending. Joint widths that vary indicate a course set out poorly.

Cleaning at the end of the work, with the right product, is what reveals whether the finish is as good as it looked under mortar smear.

## What is the inspection sequence during the build?

The sequence is frame, sarking and flashings, brickwork as it rises, cavity at each lift, lining layout, joint finish, paint.

Each stage is signed off before the next covers it, and each sign-off has a photograph. That chain is the whole quality system of a wall whose important parts are hidden.

A builder who skips a sign-off is not saving time; they are moving the cost to a later date.

## References

1. ABCB National Construction Code.
2. Think Brick Australia.
3. Gyprock.

## Image credit

The cover photograph shows members of a naval construction battalion building brick veneer mock-ups, released into the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and it shows brick veneer being laid against a frame, which is the operation this article sequences. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle8$, 11, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/US_Navy_080105-N-4357J-003_Builder_3rd_Class_Courtney_Bombardo%2C_assigned_to_NMCB-5%2C_builds_brick_veneer_mock-ups_in_preparation_to_install_on_the_newly_constructed_Main_Gate_Guard_House_in_Akasaki%2C_Japan.jpg/1280px-thumbnail.jpg',
   'Building a Brick Veneer Wall: The Full Sequence', 'Building an Australian brick veneer wall: frame and sarking, flashings before brick, bricklaying with ties and a clear cavity, then plasterboard, jointing')

, ('checking-brick-veneer-plasterboard-wall', 'Checking a Brick Veneer and Plasterboard Wall', 'How to check an Australian brick veneer wall: cavity width and clearance, tie density and fixing, sarking laps, weep holes and flashings, plasterboard fixing and level of finish.', 'AU', $wallarticle9$# Checking a Brick Veneer and Plasterboard Wall

Checking a brick veneer wall means checking the parts that will be hidden: the cavity, the ties, the sarking and the flashings. Then checking the parts that will be seen: the lining, the joints and the paint.

The order matters because the hidden items are the ones that cause the expensive failures. A visible defect is an inconvenience; a blocked cavity or a missing flashing is a wall that will leak for the life of the building.

## How is cavity width checked?

Cavity width is checked at several heights on each elevation, against the specified nominal width and its tolerance.

The check is a tape or a purpose-made gauge inserted through a weep hole or a temporarily open joint, recorded at the base, mid-height and top. A cavity that is narrow at the base is a drainage problem; one that is narrow at mid-height is usually a frame alignment problem.

Where the cavity has closed up, the brickwork is rebuilt locally rather than accepted. A wall with a closed cavity has no drainage plane at all.

## How is the cavity checked for mortar?

The cavity is checked for mortar droppings at each lift, before the next lift covers them.

The test is visual through the open top of the cavity at each lift and by feeling for obstructions. Droppings that have collected at the base are removed before the weep holes are expected to work.

A cavity with a mortar shelf at the base holds water permanently, and the evidence is a damp patch at the skirting line on the inside.

## How are ties checked?

Ties are checked for density, for fixing to the frame and for embedment in the mortar joint.

Density is a count against the specified spacing per square metre. Fixing is a pull test on a sample, and embedment is visual as the brickwork rises. A tie that is not embedded, or is fixed with the wrong fastener, transfers nothing.

Ties cannot be checked after the wall is finished, which is why this inspection belongs to the construction stage and why records of it are worth keeping.

## How are sarking laps checked?

Sarking laps are checked for direction, overlap and taping before the brick reaches them.

The lap direction must shed water outward and downward. The overlap must match the specification. Tapes must be applied where required and must be continuous.

A photograph of each elevation's membrane before brickwork is the most useful record on this wall, because it is the only evidence of the layer that protects the frame.

## How are weep holes and flashings checked?

Weep holes are checked for presence, spacing and clearance; flashings are checked for position, lap and discharge.

A weep hole is only useful if it is open and if the flashing behind it directs water to it. A flashing that stops short, laps the wrong way, or discharges into the cavity is worse than none because it concentrates water.

At openings the check covers the sill, the jambs and the head, and at roof junctions the apron and the kick-out.

## How is plasterboard fixing checked?

Plasterboard fixing is checked for the fixing pattern, for joints landing on framing, and for the level of finish achieved.

Fixings are counted against the specified pattern, and the board is pressed to find hollow spots where adhesive has not taken. Joints are checked against the framing layout, since a joint between studs is a joint that will crack.

The level of finish is checked in raking light, which is the only honest test of a joint.

## What does a good joint look like?

A good joint is invisible in raking light: no ridge, no dish, no screw pattern, no change of sheen.

The raking light test is the same instrument used on plaster and on drywall elsewhere, and it costs a torch and a minute. On a wall that will be painted in low sheen, the joint should read as a continuous plane.

Anything visible at that stage is a jointing defect, and correcting it means sanding and recoating rather than painting over.

## How is cornice checked?

Cornice is checked for line, for tightness at the wall and ceiling, and for the finish at corners.

A straight cornice line is checked by eye along the wall from one end; a tight cornice is checked by looking for a shadow line between cornice and wall. Corners are checked for gap and for finish.

Cracks at the cornice line appearing within a year point to the fixing detail or to frame movement, and they are worth recording rather than merely filling.

## How is the paint checked?

Paint is checked for coverage, film build, uniformity and edge quality.

Coverage is confirmed by comparing material used against area and coats. Uniformity is checked in daylight along the wall for lapping and sheen variation. Edges at cornice, architraves and skirting are checked for a straight line without bleed.

A wall painted in two thin coats where three were specified looks acceptable for a year and then shows the joints.

## What defects matter most?

Six matter: a blocked cavity, missing or loose ties, reversed sarking laps, a missing flashing, a joint that telegraphs, and a cornice crack.

The first four are hidden and expensive; the last two are visible and cheap to correct before painting. Naming them by stage keeps a handover conversation technical rather than personal.

Each also has an owner in the trade sequence, which is what makes a defect claim possible.

## What records should be kept?

Keep photographs of the frame, the sarking and flashings, the ties as they were laid, and the cavity at each lift.

Add the plasterboard layout, the level of finish agreed, the paint system and the dates. Those records are what a future renovation, repair or warranty claim depends on.

On an Australian house, they also tell the next owner what is behind the render or the brick.

## Related reading

The installation article sets out the sequence these checks verify. Materials explains the products that cause each defect. The maintenance article covers what to do when a check finds a fault years later.

## How is the level of finish agreed?

The level of finish is agreed in the contract by naming the level, and sometimes by a sample wall.

Naming the level tells the plasterer how many jointing passes and how much sanding are required. A sample settles what the level means in practice on that job.

Disagreement about finish is almost always disagreement about an unstated level, which is why the three words in the contract save an argument later.

## What is checked in the roof space?

In the roof space, the checks are that the sarking terminates correctly, that the wall frame is straight and that the flashing at the junction is in place.

Water entering at that junction is a common source of ceiling stains, and the cause is a flashing detail rather than the roof. The check belongs before the lining goes on.

Ventilation of the roof space is also checked, since condensation there can be mistaken for a wall leak.

## How is a rendered finish judged?

A rendered finish is judged for flatness, for uniform texture and for the absence of shrinkage cracks.

Flatness is checked with a straightedge as on any wall; texture is judged in raking light; cracks are checked after the render has dried. Shrinkage cracks in the first weeks are normal on some systems and are treated by the render manufacturer's method.

Rendered walls also need movement joints that align with the brick's articulation joints, and their absence is the commonest cause of a long crack.

## What are acceptable tolerances?

Tolerances are stated in the standards and in the specification, and they cover frame straightness, lining flatness and joint finish.

Where they are not stated, the argument becomes aesthetic. A wall that is 4 mm out over 2 m is within a normal tolerance and well outside what an eye picks up in raking light.

Quoting the tolerance at the start is the difference between a defect and an opinion.

## How is a wall signed off?

A wall is signed off at the practical completion inspection against the contract documents and the records of the construction inspections.

The sign-off covers the visible finish, the operation of openings and the documentary evidence of the hidden work. Hidden work that was not inspected during construction cannot be signed off retrospectively.

That asymmetry is the reason the construction-stage checks exist.

## What do buyers most often miss?

Buyers most often miss the cavity and the flashings, because both are invisible and both determine whether the house stays dry.

A pre-purchase inspection that looks at weep holes, ground levels and stains will find most of the evidence available without opening the wall. An inspector who reports those items is doing the useful work.

Everything else about the wall is largely cosmetic and repairable.

## How does this wall compare with a double brick wall?

Double brick has mass, quietness and no lining to damage, and it carries its own loads. It also costs more, takes longer and is harder to alter.

Veneer has speed, a flat internal surface, easy service access and a cavity that drains. Its weakness is that the frame must be built well, since the lining will show it.

Australian housing has largely chosen veneer on cost and speed, and the choice holds up as long as the frame and the flashings are right.

## How is a wall checked after the brick is laid and before lining?

After the brick is laid and before the lining, the accessible checks are the cavity, the ties, the flashings and the weep holes.

This is the last moment when the wall's hidden performance can be observed. Once the lining is on, only the internal evidence of water remains.

The check is quick, and it is the one most often omitted because it falls between two trades.

## What does a pre-purchase check cover?

A pre-purchase check covers the visible wall, the roof space, the subfloor and the drainage, and it reports on water rather than on taste.

The useful findings are weep holes that are blocked, ground levels that fall toward the wall, staining at the base and any crack wider than a hairline. Those are the items that cost money after settlement.

Cosmetic items are noted and priced separately, because they are choices rather than defects.

## How is a wall checked for water entry without opening it?

It is checked by looking for the evidence water leaves: stains, efflorescence, moss, and paint that has lifted.

A moisture meter read on the internal lining near the base and around openings confirms what the eye suspects. The readings are compared between walls, since absolute values vary with the season.

Where the evidence is consistent across a wall, the cavity is the suspect; where it is local, an opening or a flashing is.

## References

1. ABCB National Construction Code.
2. Think Brick Australia.
3. Gyprock.

## Image credit

The cover photograph shows the tapered edge of a plasterboard sheet, taken by Panamitsu and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the board detail that makes a flush joint possible and that this article explains how to check. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle9$, 10, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Gib_board_aka_plasterboard_tapered_edges_02.jpg/1280px-Gib_board_aka_plasterboard_tapered_edges_02.jpg',
   'Checking a Brick Veneer and Plasterboard Wall', 'Checking an Australian brick veneer wall: cavity width and clearance, tie density and fixing, sarking laps, weep holes and flashings, plasterboard fixing and')

, ('maintaining-brick-veneer-wall', 'Maintaining Brick Veneer: Weep Holes, Cornice Cracks, Paint', 'Maintaining an Australian brick veneer house: clearing weep holes, reading brick stains and efflorescence, repointing, patching plasterboard, fixing cornice cracks and repainting.', 'AU', $wallarticle10$# Maintaining Brick Veneer: Weep Holes, Cornice Cracks, Paint

Maintaining a brick veneer house is mostly about keeping water moving in the direction the design intended: down the back of the brick, out through the weep holes, away from the wall.

Everything else is smaller. Cracks in the lining, a tired paint film and a patch of efflorescence are all manageable, and all of them are cheaper to handle early than after a season of water sitting where it should not.

## How often should weep holes be cleared?

Weep holes should be cleared at least once a year, and after any work that disturbs the base of the wall.

Garden beds raised against the wall, mulch, paving and soil all block the outlets, and a blocked outlet turns the cavity into a reservoir. The clearing is a matter of a rod or a piece of wire and a few minutes per elevation.

The check is simple: water poured into a weep hole on a dry day should appear at the base rather than disappear into the wall.

## What does efflorescence mean?

Efflorescence is salt brought to the brick face by water and left behind when it evaporates, and it is a symptom rather than a stain.

A single occurrence after construction is normal. Efflorescence that keeps returning means water is entering the wall repeatedly, usually from a blocked cavity, a failed flashing or a garden bed against the brick.

Cleaning it off without finding the source produces a repeat the following season. The diagnosis is the maintenance, and the cleaning is cosmetic.

## What do brick cracks tell you?

Brick cracks tell you about movement, and the pattern tells you which kind.

A crack that steps through mortar joints is usually foundation movement or thermal movement that the articulation joints were meant to absorb. A vertical crack through bricks is a different and more serious signal. A crack at a corner of an opening is a stress concentration that often follows a missing or short flashing.

Any crack wider than a hairline is assessed rather than filled, because filling a moving crack hides it for one season.

## When is repointing needed?

Repointing is needed when mortar has eroded to the point that the joint no longer protects the brick edge.

The mortar is raked out to a sound depth, the joint is cleaned and dampened, and new mortar of a compatible mix is packed and finished. A mortar that is harder than the brick causes spalling, which is why the mix is matched rather than strengthened.

Repointing a small area is a maintenance task; repointing a whole elevation is usually a sign that the wall has been neglected or pressure-washed.

## How is plasterboard damage patched?

Plasterboard damage is patched by cutting back to sound board, inserting a patch backed by timber or a repair plug, taping, filling and sanding to the same level as the field.

The joint treatment is what makes the patch invisible, and it has to match the level of finish of the wall. A patch finished to a lower level shows as a rectangle in raking light.

Painting follows the same system as the wall, over a sealed patch, so that the sheen matches.

## How are cornice cracks fixed?

Cornice cracks are fixed by raking out the crack, filling with a flexible filler, sanding and repainting, and by checking whether the movement is ongoing.

A crack that returns after repair indicates frame movement, moisture or a cornice that was fixed with adhesive alone. Repeating the same cosmetic repair is the expensive way to avoid the diagnosis.

Where the crack is at a wall-ceiling junction in a new house, it is often seasonal movement in the first year and settles after a repair.

## How often should the wall be repainted?

The inside of the house is repainted on appearance, typically every seven to ten years in a dry room and sooner in wet areas.

The outside brick does not need painting and is better left unpainted, since a brick skin is designed to shed water and to dry. Painting brick traps moisture and creates a maintenance cycle that did not exist.

Where a brick wall has been painted by a previous owner, the maintenance becomes a repaint cycle, and the paint must be vapour-permeable.

## What about the cavity and insulation?

Where insulation has been installed in the cavity, it is checked only if there is evidence of a problem: damp patches, condensation, or a cold room.

The insulation should be fixed to the frame so the drainage path stays open. Loose fill blown into a cavity is the usual cause of blocked drainage, and its symptoms are damp at the base and insulation found in the weep holes.

Removing insulation from a cavity is difficult, which is why the installation method is the thing to specify.

## What does maintenance cost over a decade?

Over a decade a brick veneer house typically needs weep hole clearing each year, occasional repointing, internal repainting and small plasterboard repairs.

The large variable is water. A house with clear weep holes and correct flashings needs very little; a house where a garden bed was raised against the wall can need cavity work and internal repairs that dwarf the routine items.

That asymmetry is the case for the annual walk.

## When should a specialist be called?

Call a specialist for a crack wider than a hairline in the brickwork, for damp that persists after the weep holes are cleared, and for any sign of movement at an opening.

Each of those is a structural or waterproofing question rather than a maintenance task. A bricklayer, a building inspector or an engineer may be the right person depending on the symptom.

The cost of a diagnosis is small against the cost of a wall that has been leaking for two years.

## What records help?

Keep photographs of the wall at each elevation, the dates of repointing and repainting, and the paint product and colour code.

On a house with an added structure, keep the flashing and sarking photographs from construction. They are what answers a question about water a decade later, and without them the answer is an investigation.

## Related reading

The overview explains the system and its water logic. Materials covers brick grades and membranes. Installation covers the build sequence, and quality covers the checks that prevent the faults this article repairs.

## How are downpipes and stormwater checked?

Downpipes are checked for connection to stormwater rather than discharging onto the wall or the footing.

A downpipe that discharges at the base of a brick wall puts water exactly where the cavity drains, and the result is damp at the skirting and salt on the brick. The fix is a connection, not a sealer.

On an older house, the check is worth doing once and repeating when any roof work is done.

## What about garden beds and paving against the wall?

Garden beds and paving should sit below the damp-proof course and clear of the weep holes, with the ground falling away from the wall.

A raised bed against a brick wall is the most common cause of a damp internal wall in Australia. Mulch holds moisture against the brick, and the cavity drains into soil rather than out.

Lowering the bed or installing a drainage line against the wall costs little and solves a problem that otherwise recurs every winter.

## How are salt-damaged bricks recognised?

Salt damage appears as spalling faces, powdery surfaces and a white bloom that returns after rain.

The cause is salt in the brick or in the ground, mobilised by repeated wetting. The remedy depends on the source: better drainage for ground salt, replacement for bricks that have lost their face.

On a coastal site, the brick grade should have been matched to the exposure, and a spalling facade is evidence that it was not.

## What is checked in the roof space for wall leaks?

In the roof space, look at the sarking, the flashing at the wall and the top of the frame.

Water stains on the sarking point to a leak above the wall rather than in it. A flashing that stops short or laps the wrong way is visible from inside, and it is the commonest cause of a wall that leaks only in driving rain.

That inspection is part of any damp investigation and takes minutes.

## How is a wall prepared for a renovation?

It is prepared by identifying what is structural, what is cladding and what is lining before anything is removed.

In a veneer wall the frame is structural and the brick is not, so removing internal lining is straightforward and removing brick changes the facade. Cutting a new opening requires lintel, flashing and brick reinstatement.

Deciding that early prevents a renovation from turning into a rebuild.

## What about termites and the frame?

The frame is timber in most Australian veneer houses, and termite management is part of maintaining the wall.

The cavity is not a termite barrier, and weep holes are an entry point for inspection as well as for water. A termite management system, with annual inspection, is what protects the frame.

Where a frame has been damaged, the lining is the access, and the repair is a framing job behind a finished wall.

## What does a well-maintained wall look like after twenty years?

It looks much as it did when it was built: even brickwork, tight joints, clear weep holes and a lining that has been repainted on cycle.

What it does not have is efflorescence, damp at the skirting, cracks wider than a hairline or a garden bed against the base. Those absences are the evidence of maintenance rather than any visible intervention.

That is the argument for the annual walk, which is the whole of the routine.

## How does insurance treat water damage in this wall?

Insurers treat water damage by cause, so the report has to name a mechanism rather than describe a stain.

A blocked weep hole, a failed flashing and a burst pipe are treated differently, and the maintenance history is what distinguishes them. A record of routine clearing is evidence that the wall was maintained.

That is another reason the annual walk is worth writing down rather than remembering.

## How is the lining dried after a leak?

The lining is dried by finding and stopping the entry, then ventilating and, where necessary, removing the damaged board.

Painting over a damp wall traps the moisture and the stain returns. A wall that has been wet for a season may need the board replaced, since gypsum loses strength when saturated.

The drying is a process of days, and the repair follows once the readings are stable.

## What is worth fixing before selling?

The items worth fixing before selling are the ones a building inspection will report as defects: damp, blocked drainage and visible movement.

Those items cost more in negotiation than in repair, and fixing them removes the argument. Cosmetic items are better left, since a buyer will change them anyway.

On a brick veneer house, clearing weep holes and lowering a garden bed is often the whole list.

## References

1. ABCB National Construction Code.
2. Think Brick Australia.
3. Gyprock.

## Image credit

The cover photograph shows a brick veneer house photographed with its family, from the Blue Mountains Library collection, made available under CC BY-SA 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a brick veneer house of the type this article explains how to maintain. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle10$, 10, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/The_Family_and_house_at_%27Attercliffe%E2%80%99%2C_Punchbowl%2C_NSW.jpg/1280px-The_Family_and_house_at_%27Attercliffe%E2%80%99%2C_Punchbowl%2C_NSW.jpg',
   'Maintaining Brick Veneer: Weep Holes and Repairs', 'Maintaining an Australian brick veneer house: clearing weep holes, reading efflorescence and brick cracks, repointing, patching plasterboard, cornice cracks')

) AS a(slug,title,excerpt,content,market,read_time_minutes,theme,cover_url,meta_title,meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market
  AND t.candidate_key = CASE a.market WHEN 'JP' THEN 'assembly:jp-exterior-alc-paint' ELSE 'system:au-brick-veneer-plasterboard' END
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code=t.market_code
  AND t.candidate_key IN ('assembly:jp-exterior-alc-paint','system:au-brick-veneer-plasterboard')
  AND a.wall_topic_id=t.id AND a.wall_market_code=t.market_code AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
