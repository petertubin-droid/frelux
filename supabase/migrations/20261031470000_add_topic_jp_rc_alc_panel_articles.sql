-- Japan batch 2: five researched draft articles for RC frame + ALC panel infill (system:jp-rc-alc-panel).
-- SEO-aware per docs/wall-finishing-seo-standard.md: search phrase in the first 100 words,
-- question-form H2s answered in the first sentence, cost/who-does-it section, sibling links.
-- Articles remain drafts; publication/review gates are not bypassed.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='JP' AND candidate_key='system:jp-rc-alc-panel') THEN RAISE EXCEPTION 'JP RC + ALC topic is missing'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('JASSO','https://www.jasso.or.jp/','JASSO (jasso.or.jp)','Japanese ALC panel industry technical information'),
  ('Ministry of Land, Infrastructure, Transport and Tourism','https://www.mlit.go.jp/','MLIT (Japan)','Japanese building standards law, fire classification and inspection'),
  ('The Japan Institute of Architects','https://www.jia.or.jp/','Japan Institute of Architects','Japanese architectural specification practice'),
  ('JLIC','https://www.jlic.or.jp/','JLIC (jlic.or.jp)','Japanese construction trade and labour standards')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='JP' AND t.candidate_key='system:jp-rc-alc-panel'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: ALC panel cladding installation (Amon-Litecon, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Litecon_AAC_Cladding_Installation.jpg','Wikimedia Commons','Cover photograph installation article, CC BY-SA 4.0'),
  ('Image credit: Completed house with AAC panel exterior (Amon-Litecon, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Litecon_AAC_House_Exterior.jpg','Wikimedia Commons','Cover photograph overview article, CC BY-SA 4.0'),
  ('Image credit: ALC panels in transport (Amon-Litecon, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Litecon_AAC_Panels_Freight_Transport.jpg','Wikimedia Commons','Cover photograph materials article, CC BY-SA 4.0'),
  ('Image credit: Vertical ALC panel assembly (Amon-Litecon, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Litecon_Firewall_Assembly.jpg','Wikimedia Commons','Cover photograph quality article, CC BY-SA 4.0'),
  ('Image credit: Precast concrete facade panels (Achim Hering, CC BY 3.0)','https://commons.wikimedia.org/wiki/File:Precast_concrete_facade.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY 3.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='JP' AND t.candidate_key='system:jp-rc-alc-panel'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'JP',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='JP' AND t.candidate_key='system:jp-rc-alc-panel'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.meta_title,a.meta_description,'JP','JP',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('alc-panel-wall-rc-frame-overview', 'ALC Panel Wall on an RC Frame: How Japanese Infill Works', 'An ALC panel wall is the exterior infill of most Japanese mid-rise housing: how the panels hang on a concrete frame, why the joints decide everything, and where these walls fail first.', $wallarticle1$# ALC Panel Wall on an RC Frame: How Japanese Infill Works

An ALC panel wall is a thin wall of autoclaved lightweight concrete hung on a reinforced concrete frame, and it is the standard exterior infill of Japanese mid-rise housing, schools and small commercial buildings. The panels are factory-made, reinforced, and fixed to the frame with bolts; the joints between them are sealed and coated.

If you are searching for how an ALC panel wall actually goes together, the important thing to understand first is that the panels are not the structure and the joints are not decoration. The frame carries the building; the panels close it; and the sealant in the joints is the part that decides whether the wall stays dry.

## What is an ALC panel wall and why is it used?

An ALC panel wall is a cladding of autoclaved lightweight concrete panels, typically 100 mm thick, fixed vertically or horizontally to a concrete or steel frame and finished with a joint sealant and a coating. It is used because it is light, non-combustible, factory-made and quick to install on a tall building.

Autoclaving gives the material its character. The mix is cured in a pressurised steam vessel, which produces a cellular structure with fine air bubbles, low density and moderate insulation. That structure is why a 100 mm panel can be lifted by two people and why a whole facade can be closed in days.

The trade-off is brittleness. ALC is strong in compression but easily chipped and cracked, and its surface absorbs water. Those two properties shape every detail of how these walls are designed, installed and maintained.

## Why Japanese mid-rise buildings use RC frames with ALC infill

Japan builds apartments and schools as concrete frames with infill, and the infill is usually ALC rather than brick.

The reasons are seismic and practical. A concrete frame resists earthquakes well, and a light infill adds little mass and little load to the frame. Brick or block infill would be heavier, slower and more damaging if it cracked during a tremor. ALC panels flex with the frame rather than fighting it.

There is also a construction order at work. The frame is cast floor by floor, and the panels are installed from the floors as they become available, so the building closes in earlier and interior trades start sooner. On a Japanese programme that overlap is worth real money.

## How thick are ALC panels and what do they weigh?

Standard ALC panels are commonly 100 mm thick, with thicker panels used where the wall carries a fire or insulation requirement. Density is roughly a quarter that of normal concrete, so the panels are light enough to handle by hand with two people.

That lightness is the material's main advantage and its main weakness. It makes installation quick and the building light, and it means the panels have little mass to resist impact, little thermal inertia and a low resistance to fixing pull-out.

Anything hung on an ALC wall therefore needs a fixing designed for the material rather than for concrete. A plug designed for dense concrete will spin and fail in ALC, and the usual result is a hole that has to be repaired before anything can be hung.

## Where does the water get in?

Water gets into an ALC wall at the joints, the openings and any crack, not through the panel face.

The panels themselves are coated, and a sound coating sheds water. The vulnerable line is the joint between panels, which is filled with a sealant that must accommodate movement between two rigid panels on a frame that deflects. When the sealant loses adhesion, water enters the joint, travels behind the coating and appears indoors as a damp patch well below the entry point.

That is why the sealant, its backing and its adhesion are the real subject of an ALC facade, and why a facade that looks intact can still be leaking.

## What the wall looks like from inside

Inside, an ALC panel wall is usually finished with a thin plaster or a putty and a wallcovering, exactly like the interior of a timber-frame house.

The panels are flat and true, so the interior finish is thin. That thinness is a warning: because there is little material between the room and the outside, a cold bridge, a leak or a failed sealant shows indoors quickly.

Where the wall carries a warranty or a fire requirement, the interior finish may be specified as part of the wall's performance. Replacing it with a decorative board of a different class can quietly remove that performance, which is why the original specification is worth keeping.

## How the panels are fixed

The panels are fixed to the frame with bolts through specially formed anchor points, and the fixings are designed to transfer the panel's weight and wind load to the structure without restraining movement.

That last point is the technical heart of the system. A panel that is rigidly fixed at four corners will crack as the frame deflects; a panel fixed to slide slightly will not. Japanese systems use slotted and sliding connections at some edges for exactly this reason.

The fixing detail is also where corrosion matters. An anchor that rusts expands, cracks the panel around itself and lets water in, so the specification of the fixing and the integrity of the coating around it are not minor items.

## The joint is the wall's weak point

If there is one sentence to remember about ALC panel walls, it is that the joint is the wall.

A joint has to do three jobs at once: keep water out, allow movement, and look like a deliberate line on the facade. It does them with a backer rod, a sealant of the right modulus and adhesion, and a coating that bridges the sealant without cracking over it.

Failures cluster at joints because all three jobs are compromised by cheap sealant, poor surface preparation or a coating that is too stiff. When a Japanese facade is recoated, the joints are inspected and often replaced before the coating goes on.

## Does ALC need insulation?

ALC provides some insulation itself, which is why the panels are sometimes used without added insulation on lower buildings.

Its thermal performance is moderate rather than high, so colder regions and higher-performance buildings add insulation either outside or within the frame. Where insulation is added internally, the vapour control and the position of the dew point become critical, because the panel is cold and the room is warm and humid.

That is the same condensation logic as any other wall, applied to a material that is more moisture-sensitive than most.

## Fire and legal classification

ALC is a non-combustible material, which is a large part of its appeal in Japanese construction.

The classification is granted to the material and to the assembly, and the building code decides which walls in which buildings require it. That is why an ALC wall is common on the boundary of a building, on party walls and on the walls of buildings close to a neighbour.

The classification belongs to the specified assembly, not to the material in general. A panel of the right type in the wrong assembly does not automatically comply, which is why the specification names both.

## What it costs and who does the work

An ALC facade is priced by area, and the price is dominated by access, the joint detail and the coating rather than by the panels themselves.

The panels are a factory product with a known price; the labour is a specialist trade, and on a tall building the scaffold or the gondola is a substantial part of the bill. Recoating is a separate, cyclical cost, and joint replacement is the item that turns a repaint into a repair.

The trades involved are the panel installer, the sealant applicator and the coating contractor. On a small repair those may be one firm; on a building they are three, and the interfaces between them are where responsibility gets lost.

## How long does an ALC facade last?

The panels last decades if they stay dry and their coating is maintained. The sealant and the coating are the parts that wear out, on cycles measured in years rather than decades.

A maintained facade, recoated on the manufacturer's schedule with the joints inspected each time, stays serviceable for the life of the building. A neglected one fails at the joints first, then at the coating, and eventually at the anchors, which is when the cost stops being cosmetic.

The practical lesson is that the maintenance budget belongs to the sealant and the coating, not to the concrete.

## Can you cut or alter an ALC panel wall?

You can cut ALC, and that is exactly why alterations are risky.

Cutting a panel for a new opening is straightforward with the right tool, but the cut removes the factory edge, exposes the cellular interior and interrupts the coating and the reinforcement. A reinstated opening needs a new edge detail, new sealant and a new coating, all done to the same standard as the original.

Removing a panel entirely removes part of the wall's fire and weather performance as well as its finish. On a building with a fire classification, that is a compliance question rather than a decorating one.

## How does ALC compare with brick infill or drywall?

Compared with brick infill, ALC is lighter, faster and more flexible, and less massive and less forgiving.

Compared with an internal drywall partition, an ALC wall is an exterior wall with real weather performance, real fire classification and real structural fixings. The two are not interchangeable, and treating an ALC facade as though it were a boarded wall is how a repair turns into a leak.

Its closest relatives are precast concrete panels and other lightweight aerated systems, which share the same logic: factory panels, movement-tolerant fixings, sealed joints and a coating that has to stay flexible.

## What goes wrong first?

On a Japanese ALC facade, the order of failure is consistent.

Sealant adhesion goes first, usually at the joint nearest a corner or an opening where movement concentrates. Water then enters and shows indoors as a stain or a patch of mould. The coating follows, blistering over the wet joint. If the water reaches the anchors, corrosion and spalling follow, and by then the repair is structural rather than cosmetic.

Reading that sequence backwards is how an inspection works: start indoors at the stains, then find the joint above them.

## What the later articles cover

Materials deals with panel types, sealants, backer rods, coatings and fixings. Installation follows the sequence from frame survey to sealed and coated facade. Quality covers the checks that catch a leak before the rain does. Maintenance covers inspection, joint replacement, crack repair and recoating cycles.

Related reading in this library: the interior gypsum paint assembly on Japanese gypsum board, the timber frame wall that shares the same interior logic, and the exterior ALC paint assembly, which covers the coating side in more depth.

## References

1. JASSO.
2. MLIT.
3. Japan Institute of Architects.
4. JLIC.

## Image credit

The cover photograph shows a completed residential house with an AAC panel exterior, taken by Amon-Litecon and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a finished lightweight concrete panel wall of the kind this series describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 11, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Litecon_AAC_House_Exterior.jpg/1280px-Litecon_AAC_House_Exterior.jpg',
   'ALC Panel Wall on an RC Frame: Japanese Infill Guide', 'ALC panel wall on a Japanese RC frame: how the panels hang, why the sealed joints decide everything, and where these walls fail first. Standards and sequence.')

, ('alc-panel-materials-sealants-coatings', 'ALC Panel Materials: Sealants, Coatings and Fixings', 'ALC panel materials explained for Japanese facades: panel grades and thicknesses, the sealant that keeps water out, backer rods, elastic coatings, and the fixings that hold panels without cracking them.', $wallarticle2$# ALC Panel Materials: Sealants, Coatings and Fixings

ALC panel materials decide whether a facade performs, and the panel itself is the least complicated part of the list. The sealant, the backer rod, the coating and the fixings are what a failed facade is usually made of.

This is a buying guide for the Japanese system: what the products are, how they are classified, which one suits which position, and what a merchant will ask you before selling any of them.

## What are ALC panels made of and how are they graded?

An ALC panel is made of cement, lime, silica sand or fly ash, water and an expansion agent, cast with reinforcement and cured in an autoclave. The result is a lightweight cellular concrete with a fine, uniform pore structure.

Panels are graded by density, strength, thickness and reinforcement. Thickness drives the panel's fire and insulation performance, and the reinforcement pattern drives its span and its behaviour when cut. A panel that is cut through its reinforcement loses the capacity the grade promised.

The grade is marked on the panel and stated in the specification. Buying on thickness alone is how a wall ends up with panels that satisfy the drawing dimension and fail the performance requirement.

## Which sealant actually keeps water out?

The sealant has to be elastic, adhere to ALC and tolerate the movement of a joint between two rigid panels on a deflecting frame.

Silicone sealants dominate Japanese ALC facades because they stay elastic for years and adhere well to a prepared ALC surface. Modified silicone and polyurethane products are used where a coating must bridge the sealant, since silicone resists most coatings and needs a compatible one.

The modulus matters more than the brand. A low-modulus sealant stretches with the joint; a high-modulus one grips harder and tears the panel surface when the joint moves. On a facade, that difference is the difference between a sealed joint and a leaking one.

## Why the backer rod matters

Behind the sealant sits a backer rod, and its job is to control the sealant's depth and shape.

A sealant bonds only where it can form an hourglass section with two thin adhesion faces and a thicker centre. If the joint is filled solid, the sealant bonds to the back face and tears away when it stretches. The backer rod prevents that by stopping the sealant at the right depth.

The rod's diameter must be slightly larger than the joint so that it stays in place during application. A rod that is too small falls back and the sealant sinks; one that is too large prevents the sealant reaching the required depth.

## Elastic coatings and why they matter

ALC facades are coated with elastic or semi-elastic coatings, and the elasticity is functional rather than decorative.

The coating has to bridge the joints and any hairline cracking without splitting as the wall moves. A rigid coating cracks over the sealant line within a season, and water then enters exactly where the design tried to keep it out.

Japanese coating systems are specified in coats: a sealer or primer, a base coat, and a top coat, with a specified thickness or application rate. Thickness is the performance, and a system applied thin because it was cheaper is a system that will not bridge the movement it was bought for.

## Fixings and corrosion

The fixings that hold ALC panels are designed for the material: they spread load over a larger area than a concrete anchor and they allow the controlled movement the system needs.

Corrosion is the failure mode to specify against. A fixing that rusts expands and splits the panel around itself, and the crack it makes is a permanent path for water. Stainless or coated fixings are normal on exposed facades for that reason.

Every fixing is also a penetration through the coating, so the detail around it is part of the waterproofing rather than an afterthought. A fixing patched with a stiff mortar instead of a flexible sealant will crack.

## Which coating suits a humid climate?

Japan's humidity and summer heat put a premium on coatings that resist dirt pick-up, mould growth and ultraviolet degradation.

A dirt-resistant top coat keeps the facade looking sound for longer, and an anti-mould additive matters on north elevations that stay damp. Colour matters too: a dark facade absorbs heat, drives movement and shows every irregularity in the panel plane.

The practical specification for a humid climate is a light colour, a flexible system with a proven track record locally, and a maintenance interval the owner will actually follow.

## Repair materials for ALC

Repairing ALC needs materials formulated for the material, not general-purpose mortar.

Patching mortars for ALC are lighter and more flexible than ordinary mortar so that the patch moves with the panel. A stiff patch cracks at its edges and lets water in behind it, which is worse than the hole it filled.

For a crack, an elastic filler and a coating that bridges it is the usual approach; for a chipped corner, a patching mortar shaped to the original profile and then coated. In both cases the coating is what makes the repair waterproof, not the filler.

## Storage on a Japanese site

ALC panels absorb water, and a panel that has been rained on needs to dry before it is coated.

On site, panels are stored clear of the ground, on edge, with the faces protected from standing water. Coating a damp panel traps moisture in the material and produces blistering within months, which is why moisture readings before coating belong to the specification rather than to the coating contractor's judgement.

Sealants and coatings have shelf lives and temperature limits. A sealant applied below its stated temperature will not cure properly, and no amount of skill at the gun fixes that later.

## Quantities and waste

Quantities follow the joint length rather than the wall area for sealants, and the wall area for coatings.

A facade with many openings has more joint per square metre than a plain wall, so a sealant estimate taken from area alone will be short. Coatings are estimated in square metres per coat, and the number of coats is a specification item rather than a sales suggestion.

Panel waste is low on a well-planned elevation and high on a facade with many small returns. Ordering the panels for the elevation rather than for the building total is the practical way to keep both waste and shortfalls down.

## What it costs and who buys it

The materials for an ALC facade are a modest share of the cost, and the access and labour are the large share.

A sealant replacement on a mid-rise building is priced by joint length, access and the number of storeys. A recoating is priced by area and by the number of coats. Panels themselves are rarely the reason a repair is expensive; the scaffold usually is.

The buyer is normally the contractor rather than the owner, which is why the specification has to name products and not just categories. When the owner buys on category, the contractor buys on price within the category.

## Which products do not belong on an ALC wall

Three products recur in failed repairs: ordinary cement mortar as a patching material, a rigid decorative coating over joints, and a sealant chosen for colour rather than movement.

Each fails for the same underlying reason, which is that ALC moves and the product could not. Recognising that pattern is more useful than memorising brands, because it lets a buyer reject a proposal before the work starts.

## Related reading

The overview article explains how the panels hang on the frame and where water enters. The installation article follows the sequence from frame survey to sealed facade, and the quality article covers the checks that reveal a defect before the weather does.

Outside this topic, the exterior ALC paint assembly covers the coating cycle in more depth, and the timber frame wall shows the contrasting Japanese approach to a lightweight wall.

## Which panel thickness suits which wall?

Panel thickness is chosen against a fire requirement, an insulation requirement and a span, and the thickest option is not automatically the right one.

A 100 mm panel is the common exterior infill, and it satisfies many low and mid-rise walls on its own. Thicker panels are used where the wall must achieve a fire rating without added protection, or where a higher insulation value is required from the wall itself.

The span between supports also sets the thickness, because a panel spanning further has to resist wind load with more of its own depth. Those three requirements are checked together, which is why a thickness substitution made on site to use up stock is a change to the wall's performance rather than to its convenience.

## Does the coating colour affect durability?

Colour affects durability more than most buyers expect, and light colours always last better on ALC.

A dark facade absorbs solar heat and expands further than a light one, which puts more movement into the joints and the coating. It also shows every mark, every repair and every unevenness in the panel plane, so a dark finish raises the standard required of the work beneath it.

Japanese specifications for humid climates therefore lean light, and the practical reason is that a light facade stays cooler, moves less and looks sound for longer. Where an owner wants a dark colour, the coating system and the joint detail need to be upgraded rather than the colour chosen alone.

## What does a sealant cost per metre?

Sealant is priced by linear metre, and the price rises steeply with access height rather than with the product.

The material is a small part of the cost per metre. The preparation, the backer rod, the priming and the tooling are the labour, and the access is the multiplier. On a low building a metre of resealed joint is inexpensive; at six storeys it is dominated by whatever is holding the operative against the wall.

That arithmetic is why joint repair is planned with the coating cycle, and why a facade with many small joints is more expensive to maintain than a plain one of the same area.

## How do you check a sealant is the right one?

The right sealant is confirmed by its movement capacity, its adhesion to ALC and its compatibility with the coating, not by its label.

Read the data sheet for the movement accommodation factor, which states how much the joint can move relative to its width. If the facade's calculated movement exceeds it, the sealant is wrong regardless of brand or price.

Then check that the coating specified over it is compatible, because silicone resists most coatings. A system where the sealant and the coating come from the same manufacturer is the simplest way to be sure, and it is the usual Japanese specification.

## Can ALC be repaired with ordinary render?

No, and this is the repair that fails most often. Ordinary cement render is stiffer, denser and stronger than the panel it is applied to.

When the panel moves, the render does not, and the failure appears as a crack around the edge of the patch or as a debonded island that sounds hollow under a tap. Water then enters behind the patch, which is worse than the original damage because the water is now trapped.

An ALC-compatible patching mortar, applied to a prepared and dampened surface and then coated, is the correct repair. It costs more per bag and less per decade.

## References

1. JASSO.
2. MLIT.
3. Japan Institute of Architects.
4. JLIC.

## Image credit

The cover photograph shows ALC panels being transported on a flatbed, taken by Amon-Litecon and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the panels before installation, at the stage where grade, thickness and protection from water all matter. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 10, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Litecon_AAC_Panels_Freight_Transport.jpg/1280px-Litecon_AAC_Panels_Freight_Transport.jpg',
   'ALC Panel Materials, Sealants and Coatings', 'ALC panel materials for Japanese facades: panel grades, the elastic sealant and backer rod that keep water out, coatings that bridge joints, and')

, ('installing-alc-panels-rc-frame', 'Installing ALC Panels on an RC Frame: The Japanese Sequence', 'How ALC panels are installed on a Japanese concrete frame: surveying the frame, setting out, fixing and shimming, sealing the joints, then coating the facade in the order that keeps water out.', $wallarticle3$# Installing ALC Panels on an RC Frame: The Japanese Sequence

Installing ALC panels is a sequence of small decisions that only works in order, and the order is what this article sets out. The frame is surveyed, the panels are set out and fixed, the joints are sealed, and the facade is coated.

Each stage leaves evidence for the next. A frame that was not surveyed produces a facade that is out of line; a joint sealed over a wet or dusty surface fails within a season; a coating applied too early traps moisture. None of those can be corrected from outside afterwards.

## How is the frame surveyed before panels go on?

The frame is surveyed before any panel is fixed, and the survey is the foundation of the facade's flatness.

Concrete frames vary, and the variation is measured against the panel system's tolerance for packing and adjustment. The survey records the deviation of each floor and each bay so that the set-out can compensate for it.

Where the frame is out of tolerance, the correction is made in the fixing detail rather than in the panel. Trying to pull a facade straight with the panels themselves puts stress into a brittle material and produces cracks at the fixings, which is exactly where water will later enter.

## How are the panels set out?

Set-out establishes the joint lines, the openings and the panel module before the first panel is lifted.

The drawing determines where joints fall, and the set-out transfers that to the frame with a laser or a line. Openings are set out first, because the panels around them have to be cut and the cuts have to land where the drawing says.

A set-out done as the work proceeds produces joints that wander and openings that are a few millimetres out of position. On a facade, a few millimetres is visible from the ground, and the correction afterwards is a coating that is thicker in one place than another.

## How are panels fixed and adjusted?

Panels are lifted, positioned, and fixed to the frame with the specified anchors, with shims or adjustment at the connections.

The fixing sequence allows the panel to be aligned before it is finally tightened, and the final tightening is what locks the plane. Panels are checked for plumb, line and level against the set-out, not against the previous panel, because errors accumulate when each panel follows the one before it.

The connections that are designed to slide are left able to slide. Over-tightening a sliding connection is a common site error, and it converts a movement-tolerant joint into a rigid one that will crack.

## Where do the joints get their sealant?

Joints are sealed after the panels are fixed, aligned and checked, and never as a running repair behind the fixing gang.

The joint faces are cleaned and primed as the sealant manufacturer requires, the backer rod is inserted to the correct depth, and the sealant is applied and tooled to the specified profile. Tooling is not cosmetic: it presses the sealant against both faces and forms the surface that sheds water.

Sealing in the wrong conditions is the most common cause of early failure. A dusty face, a damp panel, or an air temperature outside the product's range will produce a joint that looks right and fails within a year.

## When is the facade coated?

The facade is coated after the joints are sealed and the panels are dry, and the drying is measured rather than assumed.

The coating system is applied in its specified coats to its specified thickness, with the joint line detailed so that the coating bridges the sealant. That bridge is the detail that keeps the joint waterproof when the sealant moves, and it fails if the coating is too thin or too stiff.

Coating is also when the facade's appearance is finally set. Colour consistency across panels, and across a building delivered in phases, is checked at this stage rather than after handover.

## How are openings and penetrations handled?

Openings and penetrations are where a facade leaks, and each one needs its own detail.

Window and door openings get a flashing or a sill detail that drains water out rather than into the joint, and the sealant at the frame is a separate line from the sealant between panels. Penetrations for pipes, vents and fixings are sealed with the same care as a panel joint, and each is a place where the coating has to be continuous.

A penetration sealed with mortar instead of a flexible sealant is a crack waiting for the first cold night.

## How does weather affect the programme?

Weather affects sealing and coating far more than it affects panel fixing, and the programme should reflect that.

Sealant will not cure properly in cold or wet conditions, and coatings need a dry substrate and a temperature within range for long enough to cure. In a Japanese summer the constraint is often rain; in winter it is temperature.

A programme that treats sealing and coating as the flexible end of the job will lose those days to weather and then rush them. The sequence that survives a Japanese climate gives the wet trades their own weather window.

## How long does installation take?

Installation speed depends on access, the elevation and the number of openings, not on the panel count alone.

A straightforward elevation on a building with good access closes quickly, because the panels are light and the fixings are repetitive. An elevation with many returns, balconies and openings is much slower, because every junction is a detail.

The interior trades can follow a floor behind the panel gang, which is why the sequence is planned floor by floor rather than facade first and interior later.

## What does it cost and who does the work?

The work is done by a panel installer, a sealant applicator and a coating contractor, and on a large building those are three separate firms.

The cost is dominated by access, the joint length and the coating area. A building that needs a full scaffold pays for the scaffold twice if the sealant and the coating are done on separate mobilisations, which is why they are usually planned together.

For a single repair, one specialist firm may handle all three, and the sensible question to ask is which of the three they are actually qualified in.

## What can go wrong during installation?

Five failures recur: panels fixed out of plane, sliding connections over-tightened, joints sealed over a dusty or damp face, sealant applied outside its temperature range, and coating applied before the panel is dry.

Each is invisible at handover and appears in the first wet season. Each is also cheap to prevent and expensive to correct, because correcting it means removing coating, cutting out sealant and sometimes releasing a panel.

## Related reading

The overview explains why the system exists and where it fails. Materials covers the sealants, coatings and fixings this sequence depends on. Quality covers the checks that catch each of these five failures before the weather does.

## What access is needed?

Access decides the programme and the price, and it should be decided before the panels arrive.

Low buildings are worked from scaffold, mid-rise from scaffold or a gondola, and some elevations from a mobile platform. Each has a different cost and a different productivity, and the sealant and coating work must be able to reach every joint the panels create.

A facade planned without considering how the sealing will be reached produces a job where the installer works from one position and the sealant applicator cannot reach the same joint. That is a design fault, and it appears as a missed joint rather than as a cost.

## How are balconies and returns detailed?

Balconies and returns are where a facade has the most joints per square metre, and where the details most often fail.

Each return is a change of plane, so it needs its own joint and its own flashing logic. The junction between the balcony slab and the panel wall is a horizontal joint that collects water, and it needs a detail that drains rather than one that relies on sealant alone.

A facade with many balconies is therefore more expensive per square metre than a plain one, and its maintenance interval is shorter, because there are simply more places for water to find.

## How are panels protected during the build?

Panels are protected from damage and from water during construction, and the protection is part of the installation method.

A panel that takes an impact before coating has a chip that must be repaired before the coating goes on, and a panel that absorbs water must dry before it is coated. Both are avoidable with simple protection and a delivery sequence that does not leave panels standing on the elevation for weeks.

The other trades are the risk. A scaffold tie, a hoist fixing or a temporary rail bolted through a panel creates a penetration that has to be sealed and coated, and every one of those is a future leak if it is forgotten.

## What is inspected during installation?

Installation inspections happen at three points: after the frame survey, after the panels are fixed and aligned, and after the joints are sealed but before the coating.

The first confirms the tolerance the set-out will work to. The second confirms the plane, the fixings and the sliding connections. The third confirms joint width, backer rod depth and adhesion while the sealant is still visible.

After the coating, the joints are hidden and only their performance remains. That is why the third inspection is the last chance to see the detail that will decide whether the building leaks.

## How does installation interact with the interior trades?

The interior of an ALC building can follow the facade closely, and that overlap is one of the system's commercial advantages.

The panels close a floor, and the interior trades start behind the facade gang rather than after the whole building is clad. On a Japanese programme that overlap is planned deliberately, because it shortens the build without changing the sequence of either trade.

The risk is damage. An interior trade working against a facade that is not yet coated can damage panels or block access to joints. Sequencing the facade's sealing and coating ahead of the interior fit-out on each floor controls that risk.

## What does the set-out drawing actually control?

The set-out drawing controls the joint grid, the panel module and the position of every opening, and it is the document the site works to.

It exists because joints cannot be decided on the wall. A joint that lands where the panels happen to end produces an irregular grid that is visible from the ground and a sealant line that is hard to inspect. A joint that lands where the drawing says produces a facade that reads as a designed surface.

When a change is needed on site, it is made on the drawing and then set out again, rather than improvised. Improvisation at that stage is what makes a facade look assembled rather than built.

## References

1. JASSO.
2. MLIT.
3. Japan Institute of Architects.
4. JLIC.

## Image credit

The cover photograph shows ALC cladding panels being installed, taken by Amon-Litecon and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows panels being positioned and fixed, which is the stage this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 10, 'installation', 'https://upload.wikimedia.org/wikipedia/commons/a/af/Litecon_AAC_Cladding_Installation.jpg',
   'Installing ALC Panels on an RC Frame: Sequence', 'Installing ALC panels on a Japanese RC frame: frame survey, set-out, fixing and alignment, joint sealing, then coating, in the order that keeps the facade')

, ('checking-alc-panel-wall-quality', 'Checking an ALC Panel Wall: Joints, Plane and Water', 'How to check an ALC panel wall in Japan: panel alignment and plane, joint width and sealant adhesion, coating thickness, anchor condition, and the moisture checks that predict a leak.', $wallarticle4$# Checking an ALC Panel Wall: Joints, Plane and Water

Checking an ALC panel wall comes down to four questions: are the panels in plane, are the joints sealed and correct, is the coating doing its job, and are the fixings sound. A facade that passes those four will stay dry; one that fails any of them will leak.

The checks below are the ones that catch a defect while it is still cheap, which on an ALC facade means before the coating closes over it or before the first wet season tests it.

## How do you check the panel plane?

The panel plane is checked against a straightedge and a line, and against the frame survey rather than against the previous panel.

A two-metre straightedge laid across the joints shows the local plane; a line or laser along the facade shows the overall plane. Both are needed, because a facade can be locally fair and globally out of line, and the eye reads the global error from the ground.

Deviation is recorded in millimetres against the tolerance agreed in the specification. Where that tolerance was never stated, the conversation becomes an argument about appearance, which is why it belongs in the specification.

## What makes a good joint?

A good joint has the specified width, a backer rod at the specified depth, sealant adhered to both faces and tooled to a concave profile.

Width and depth are measured rather than estimated. Adhesion is checked by hand: a sealant that lifts at the edge under light thumb pressure is not bonded, whatever it looks like. Tooling marks show that the sealant was pressed home rather than merely injected.

Joint width that varies along a facade is a set-out problem, and it will produce a varying sealant performance. That is why the set-out is checked before sealing, not after.

## How is sealant adhesion tested?

Adhesion is tested by hand and, on a building, by a peel test on a sample joint.

The hand test is a thumb press at the joint edge: a bonded sealant resists, a failed one lifts. A peel test cuts a short section of sealant free at one face and pulls it back to see whether the failure is adhesive, at the panel, or cohesive, within the sealant itself.

The distinction matters because it names the cause. Adhesive failure points to surface preparation or priming; cohesive failure points to the sealant's movement capacity or curing. Both are specification and workmanship questions rather than wear.

## How is coating thickness verified?

Coating thickness is verified by reading the application rate and by measuring on a sample area.

Japanese systems state a wet or dry film thickness, or a coverage rate per coat, and the applied number of coats is checked against the specification. A coating that was applied in two thin passes instead of the specified build will crack over joints when the wall moves.

On a facade, an adhesion check by cross-cut on a test panel and a visual check for holidays, runs and thin edges complete the picture. Coating is the waterproofing, so its thickness is a performance item.

## What are the anchor and fixing checks?

Every fixing is checked for corrosion, for coating continuity around it and for whether the panel is cracked at the connection.

A rust stain on an ALC facade is a fixing that has lost its protection, and the crack that follows is a permanent water path. On an accessible facade the check is close visual inspection; on a tall one it is a sample inspection from a gondola.

Coating continuity around each fixing is the detail that most often gets skipped, because it is small and repetitive. It is also the detail that decides whether the fixing lasts.

## How do you check for water behind the facade?

Water behind an ALC facade is found by looking indoors at the stains and outdoors at the joints above them.

Indoors, the evidence is a damp patch, a tide mark or mould at a level that does not correspond to a window. Outdoors, the search starts above that point, at the joint nearest an opening or a corner, because that is where movement and detail failures concentrate.

A moisture meter read on the panel face adds a number to the observation. Readings taken after rain, on the same day as the indoor evidence, are the most informative.

## What defects matter most?

Six defects recur on Japanese ALC facades, and each points to a stage.

A joint that is too narrow points to set-out. Sealant that lifts at the edge points to preparation. Coating that cracks along the joint line points to a stiff or thin system. A rust stain points to the fixings. A crack radiating from a fixing points to over-tightening or a rigid connection. A damp patch indoors points to a joint above it.

Naming the stage rather than the symptom is what makes a repair possible, and it separates a workmanship issue from wear.

## What should a handover record include?

A handover record for an ALC facade includes the panel grade and thickness, the fixing schedule, the sealant product and application conditions, the coating system and its coats, and the survey and set-out readings.

Add photographs of the joints before coating, the fixings after sealing, and the facade in raking light. Those photographs are the only evidence of the parts that a later repair will have to trust.

On a building with a fire classification, the record also carries the material classification of the panels and the assembly, because that is the item a later alteration most easily destroys.

## How do you judge a facade from the ground?

A facade is judged from the ground in the light it will always have, and that judgement is about pattern rather than detail.

Stand back and look for the joint grid: it should be even, continuous and level in each storey. Look for colour variation across panels, which shows as a patchwork in raking sun. Look along the facade for the line of each floor, which reveals a panel out of plane.

Those three observations cost nothing and catch most of what matters. The detail checks then explain what the eye noticed.

## What does inspection cost and who checks it?

Inspection is priced by access and by the sample size, and the access is nearly always the larger part.

A ground-level visual inspection is inexpensive and catches pattern errors. A gondola inspection with hand testing of joints and fixings is a real cost, and it is the one that finds adhesion failures before they become leaks.

The checker should be someone who did not install the work, which on a Japanese building usually means the architect or a third-party inspector rather than the panel contractor.

## Related reading

The installation article sets out the sequence these checks verify. Materials covers what the sealant, coating and fixings should be. The maintenance article covers what to do when a check finds a fault.

## Who signs off a facade?

Sign-off belongs to someone who did not install the work: the architect on a Japanese project, or a third-party inspector on a larger one.

The sign-off covers the plane, the joints, the coating and the fixings, with the checks recorded and photographed. A contractor signing off its own facade is not an inspection, whatever the paperwork says.

Where a fire classification applies, the sign-off also confirms the panel and assembly classification. That is a documentary check as much as a visual one, and it is the item most often missed because it involves reading rather than looking.

## What is a reasonable defect rate?

A facade is not expected to be perfect, and a reasonable defect rate is written into the specification rather than negotiated at the end.

Small colour variation between panels is normal in a factory product. Occasional minor chipping is corrected before coating. What is not acceptable is a joint outside its tolerance, a sealant that is not adhered, or a fixing that is not protected.

Stating those three as absolute limits, and the cosmetic items as tolerances, means the inspection has a standard to apply instead of an argument to settle.

## How is colour consistency checked?

Colour consistency is checked on a sample area in daylight before the whole facade is coated.

Two panels of the same grade can differ slightly, and a coating applied on a warm day can dry to a different shade than one applied on a cool one. A sample area of a few square metres, viewed in daylight from a distance, settles what the facade will look like.

Where a building is delivered in phases, the sample becomes a reference for the next phase. Without it, phase two is a shade question that nobody can resolve after the fact.

## What do the moisture readings mean?

Moisture readings on an ALC panel mean the panel is not ready for coating, or that water is already behind the surface.

Before coating, a reading that is high is a drying instruction: the panel must be allowed to dry, not coated with a vapour-tight product that traps the moisture in. After a facade has been in service, a localised high reading is evidence of water entry, and it supports the search for the joint above.

The instrument is a guide rather than a verdict, so readings are taken in several places and compared rather than trusted individually.

## How do you check joints you cannot reach?

Joints out of reach are checked from access, or by sampling, and never by assumption.

A gondola allows a hand test of adhesion along every storey. Without access, the practical alternative is to sample a few locations from a platform and to rely on the pattern of the facade: staining, coating cracks along joints and indoor damp patches are the evidence that reaches the ground.

Where none of those is available, the honest position is that the facade has not been inspected, and the maintenance plan should say so rather than assume soundness.

## How is a sample area used?

A sample area of a few square metres, with a joint, a fixing and the finished coating, is the reference for the whole facade.

It settles two arguments before they happen: what the plane is allowed to be, and what the joint is supposed to look like. Both are matters of degree, and a sample makes the degree visible.

On a Japanese building the sample is often left in place as a reference and photographed for the record, so that a later repair can be matched to it rather than to a memory.

## How are fire and legal records verified?

The records are verified by comparing the specification, the delivery labels and the installed material, on a sample basis.

The specification states a classification, the labels evidence what arrived on site, and the sample confirms what was fixed. A gap between any two of those is the finding, and it is worth recording even when the installed material is compliant, because it shows the control worked.

On a completed building the record is the only evidence, since the panels cannot be identified by looking at them.

## References

1. JASSO.
2. MLIT.
3. Japan Institute of Architects.
4. JLIC.

## Image credit

The cover photograph shows ALC panels assembled vertically as a firewall, taken by Amon-Litecon and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the panel-to-panel alignment and joint lines that this article explains how to check. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 10, 'quality', 'https://upload.wikimedia.org/wikipedia/commons/5/50/Litecon_Firewall_Assembly.jpg',
   'Checking an ALC Panel Wall: Joints and Water', 'Checking an ALC panel wall: panel plane and alignment, joint width and sealant adhesion, coating thickness, anchor corrosion and the moisture clues that')

, ('repairing-alc-panel-walls', 'Repairing ALC Panel Walls: Cracks, Sealant and Recoating', 'How ALC panel walls are repaired in Japan: crack and chip repair, joint sealant replacement, anchor corrosion, recoating cycles, and the damp patches that mean the joint above needs attention.', $wallarticle5$# Repairing ALC Panel Walls: Cracks, Sealant and Recoating

Repairing an ALC panel wall is mostly a matter of joints and coatings, and only occasionally a matter of concrete. The panels themselves are durable; the sealant and the coating are the parts that wear, and water is the thing that turns a wear item into a structural one.

This article covers the repairs a Japanese building actually needs: cracks and chips, joint resealing, anchor corrosion and the recoating cycle that keeps a facade serviceable.

## How do you repair a crack in an ALC panel?

A crack is repaired by finding its cause, opening it, filling it elastically and restoring the coating over it.

Hairline cracks from handling or minor movement are opened slightly, cleaned, filled with an ALC-compatible flexible filler and coated. A crack that radiates from a fixing or follows a joint line is a symptom, and filling it without addressing the fixing or the joint guarantees its return.

Cracks wider than a hairline, or cracks that repeat in the same place after repair, indicate movement or a fixing problem. Those are assessed rather than filled, because a filled structural crack is a crack that has been hidden.

## How are chipped corners and damaged edges repaired?

Chipped corners and edges are repaired with a patching mortar formulated for ALC, shaped to the original profile and then coated.

The patch must be lighter and more flexible than ordinary mortar, and the surface must be prepared and dampened as the product requires so that it bonds rather than sits on the panel. A stiff patch shrinks, cracks at its edge and lets water behind itself.

The coating over the patch is what makes it waterproof. A repair that stops at the mortar has restored the shape and not the performance, which is why a patched corner with no coating fails in the first winter.

## How is joint sealant replaced?

Sealant replacement is the core maintenance operation on an ALC facade, and it is done in a sequence that cannot be shortened.

The old sealant is cut out, the joint is cleaned of residue and dust, the faces are primed as specified, a new backer rod is set to the correct depth, and new sealant is applied and tooled. The joint width is checked before sealing, because a joint that has opened beyond the sealant's movement capacity needs a different detail.

Partial replacement, where only the visibly failed sections are cut out, is common and reasonable on a limited budget. It is also the reason some facades are resealed repeatedly at the same few joints, which costs more over a decade than one complete replacement.

## What does anchor corrosion look like and what do you do?

Anchor corrosion appears as a rust stain at a fixing, often with a hairline crack radiating from it.

The repair is to expose the fixing, assess it, replace it if it has lost section, treat or replace the surrounding panel material, and reinstate the coating with continuity around the new fixing. A rust stain painted over is a fixing that will keep corroding inside the wall.

Where several fixings in one area show corrosion, the cause is usually water reaching them from a failed joint above, so the joint repair and the fixing repair belong in the same job.

## When is recoating due?

Recoating is due on the coating manufacturer's cycle, and earlier where the facade shows chalking, colour change, or cracking over joints.

The cycle is stated as a number of years for a given system in a given environment, and it is a maintenance trigger rather than a guarantee. A coastal or polluted site shortens it; a sheltered inland one may extend it.

Recoating before the coating fails is far cheaper than recoating after water has entered, because the second job includes joint repair and possibly panel repair. That arithmetic is the whole argument for a planned cycle.

## What does a damp patch indoors mean?

A damp patch indoors means water is entering above it, and on an ALC facade the entry is almost always a joint or a penetration.

The diagnosis starts outdoors above the patch: the nearest joint, the nearest window or balcony, the nearest penetration. Sealing that joint and observing through the next rain is a valid test, and it is cheaper than opening the wall.

If the patch persists after the joint above is sealed, the search moves to the next detail up, and eventually to the possibility that water is travelling laterally inside the assembly from a distant entry.

## What does repair cost and who does it?

Repair cost on an ALC facade is driven by access, by joint length and by the number of details, not by the panel area.

A joint reseal is priced by linear metre with access on top. A partial recoating is priced by area, and a full one by area and coats. Anchor repairs are priced per fixing once access exists, which is why they are bundled with a joint or coating job.

The trades are the sealant applicator and the coating contractor, with a panel specialist for structural repairs. Asking which of those a firm is qualified in is the practical way to avoid a coating contractor attempting a fixing repair.

## How often should a facade be inspected?

A facade should be inspected annually from the ground and in detail every few years, with the detail interval set by the building's exposure.

The annual walk looks at pattern, staining and joints from below. The detailed inspection, on access, tests adhesion, checks fixings and reads coating thickness. On a Japanese building the detailed inspection is often tied to the coating cycle, because the access is already there.

Records of each inspection, with photographs from the same viewpoints, are what turn a series of visits into a history, and a history is what a repair specification is built from.

## What can be done without access?

Very little, and that is worth saying plainly.

Ground-level work is limited to cleaning, minor coating touch-up at reachable heights and observation. Anything involving joints, fixings or panel repair needs access, and access is the cost that makes small repairs expensive.

The practical response is to group work: hold minor defects until access is needed for the coating cycle, then do everything in one mobilisation.

## What should the maintenance record contain?

The record names the panel grade, the sealant product and date of each reseal, the coating system and date of each recoat, and every fixing replaced.

Add photographs of each repair and of the facade from the same viewpoints each cycle. That record is what allows a new contractor to understand the building, and what allows an owner to see whether a repair was actually done.

## Related reading

The overview explains the system and the failure order. Materials covers the products a repair needs. Quality covers the checks that decide whether a repair has worked.

Related topics in this library: the exterior ALC paint assembly for the coating cycle, and the interior gypsum paint assembly for the inside face of the same wall.

## What is the maintenance budget?

The maintenance budget for an ALC facade is a reseal and a recoat on a cycle, plus an allowance for the repairs those operations reveal.

The reseal is priced by joint length and access, the recoat by area and coats, and the repairs by the item. Planning those three together over ten or fifteen years is what a building's owners actually need, because the numbers are predictable in aggregate even when individual incidents are not.

The mistake is to budget only for the repaint and treat joint and fixing repairs as emergencies. They are not emergencies; they are the predictable content of the next cycle.

## Can a facade be recoated without scaffolding?

Recoating without full access is possible on low buildings and on elevations reachable from a platform, and it is a compromise elsewhere.

Partial access means partial preparation, and a coating applied over unprepared or damp areas fails early at exactly the boundary between the prepared and unprepared work. That boundary is usually visible as a line where the new coating ends, and it is where the next failure starts.

Where the choice is between a partial recoat and waiting a year for access, waiting is often cheaper, provided the joints are monitored in the meantime.

## How long does a reseal last?

A sealant reseal lasts as long as the sealant's movement capacity allows in that joint, which is a function of the joint's width and the building's movement.

Wide joints in a stable building last well. Narrow joints in a building that moves seasonally last less, because the sealant is worked harder. That is why joint width is a design decision rather than a construction outcome.

In a Japanese climate, a reseal on a well-detailed facade is expected to serve for many years, and the inspection cycle exists to catch the few joints that fail early rather than to assume uniform life.

## What is the difference between wear and a defect?

Wear is the expected loss of performance over time: the sealant hardening, the coating chalking, the colour fading.

A defect is a failure that should not have happened in the period: a joint that never adhered, a fixing that corroded behind a sound coating, a patch that cracked at its edge. Wear is budgeted; a defect is a claim.

Telling them apart matters because the response differs. Wear is scheduled; a defect is documented, photographed and raised with whoever did the work, while the evidence is still there.

## What records help a future repair?

Records that help are specific: panel grade and thickness, the sealant product and the date of each reseal, the coating system and each recoat, and every fixing replaced, with photographs from fixed viewpoints.

A future contractor reading that history knows what is on the wall, when it was done and what has already failed. Without it, every repair starts with an investigation, and investigations on facades are priced by access.

The record costs a page per cycle and is the cheapest maintenance instrument a building has.

## What is the first sign a facade needs attention?

The first sign is usually a change in the way the facade looks after rain, not a leak.

A joint that has lost adhesion holds water and darkens differently from its neighbours, and it stays dark longer after rain stops. That observation from the ground costs nothing and identifies the joints worth inspecting.

Waiting for an indoor stain means waiting for water to have travelled through the assembly, which is later and more expensive than catching the joint while it is only damp.

## What should an owner ask before commissioning a repair?

Four questions separate a considered repair from a quick one.

Which joints are being replaced: the failed ones only, or every joint on the elevation. What access is being provided and for how long. Whether the coating is being renewed over the repair, and to what system. And what will be recorded at the end.

A contractor who answers those four gives a repair that can be compared with another. A contractor who quotes per square metre without answering them is quoting an area, not a facade.

## References

1. JASSO.
2. MLIT.
3. Japan Institute of Architects.
4. JLIC.

## Image credit

The cover photograph shows precast concrete facade panels with visible joint lines, taken by Achim Hering and made available under CC BY 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the jointed panel facade whose sealing and recoating this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 10, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Precast_concrete_facade.jpg/1280px-Precast_concrete_facade.jpg',
   'Repairing ALC Panel Walls: Cracks and Sealant', 'Repairing ALC panel walls in Japan: crack and chip repair, joint sealant replacement, anchor corrosion, recoating cycles and what a damp patch indoors tells')

) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url,meta_title,meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code='JP' AND t.candidate_key='system:jp-rc-alc-panel'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='JP' AND t.market_code='JP'
  AND t.candidate_key='system:jp-rc-alc-panel'
  AND a.wall_topic_id=t.id AND a.wall_market_code='JP' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
