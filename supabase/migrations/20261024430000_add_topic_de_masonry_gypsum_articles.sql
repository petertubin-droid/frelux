-- Fifth DE batch: five researched draft articles for German interior gypsum plaster on masonry.
-- Articles remain drafts; publication/review gates are not bypassed.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, attributed), never AI generated.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='DE' AND candidate_key='system:de-masonry-gypsum') THEN RAISE EXCEPTION 'DE masonry gypsum plaster topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Bundesverband der Gipsindustrie','https://www.gips.de/','Bundesverband der Gipsindustrie','Gypsum binders, plaster products and technical information for interior plaster'),
  ('Rigips','https://www.rigips.de/','Rigips','Gypsum plaster systems, machine plasters and surface quality levels'),
  ('Putz.de','https://www.putz.de/','Putz.de','Plaster materials, substrate preparation and application practice'),
  ('Beuth Verlag, German standards','https://www.beuth.de/de','Beuth Verlag','Published DIN standards for plaster and render systems'),
  ('DIN, Deutsches Institut für Normung','https://www.din.de/de','DIN','Standards framework for plaster work and surface classes'),
  ('VOB online','https://www.vob-online.de/','VOB','Contract rules and technical conditions of contract for plastering (ATV)'),
  ('Bundesverband Farbe Gestaltung Bautenschutz','https://www.farbe.de/','Bundesverband Farbe','Trade guidance on coating plastered surfaces'),
  ('Xella','https://www.xella.de/','Xella','Block masonry substrates and their plastering requirements')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='DE' AND t.candidate_key='system:de-masonry-gypsum'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: Gypsum plaster surface (Achim Hering, CC BY 3.0)','https://commons.wikimedia.org/wiki/File:Gipsputz_stucco.jpg','Wikimedia Commons','Cover photograph overview article, CC BY 3.0'),
  ('Image credit: Plasterer''s trowel (Sleepytomcat, public domain)','https://commons.wikimedia.org/wiki/File:Stuckateureisen.jpg','Wikimedia Commons','Cover photograph materials article, public domain'),
  ('Image credit: Plastering a wall (Kenneth Allen, CC BY-SA 2.0)','https://commons.wikimedia.org/wiki/File:Plastering_a_wall,_Donaghanie_-_geograph.org.uk_-_5784055.jpg','Wikimedia Commons','Cover photograph installation article, CC BY-SA 2.0'),
  ('Image credit: Plastering work in progress (Haktwo2004, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Plastering.jpg','Wikimedia Commons','Cover photograph quality article, CC BY-SA 4.0'),
  ('Image credit: Hand plastering of a wall (Hasslaebetch, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Plastering_by_maison.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 4.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='DE' AND t.candidate_key='system:de-masonry-gypsum'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'DE',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='DE' AND t.candidate_key='system:de-masonry-gypsum'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'DE','DE',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('de-masonry-gypsum-overview', 'Interior Gypsum Plaster on German Masonry', 'How German interiors are finished in gypsum plaster: the build-up from primer to finishing coat, why gypsum suits masonry indoors and never in wet areas, and how the surface class is agreed before work starts.', $wallarticle1$# Interior Gypsum Plaster on German Masonry

Almost every German interior wall is finished in gypsum plaster, and the reason is practical rather than traditional. Gypsum sets by chemical reaction rather than by drying, which means a plastered room can be decorated within days instead of weeks, and it produces a hard, smooth surface that takes paint and wallpaper without further treatment.

The plaster is applied over masonry, and the pair has to be prepared correctly. A gypsum plaster on a wall that pulls its water away too quickly sets weak and dusty; a gypsum plaster specified in a bathroom will fail in a way that no coating can correct. Those two constraints, suction and moisture, define the whole subject.

## Why gypsum is the default interior finish

Gypsum plaster's advantage over lime and cement indoors is speed, and its second advantage is smoothness. A gypsum plaster sets in hours rather than curing over weeks, so the trade can finish a room and leave it ready for decoration the following day.

Its surface is also naturally fine, which means a decorative finish can be achieved with less work than a lime or cement plaster requires. In German residential building that combination has made gypsum the standard for interior walls and ceilings, while lime and lime-cement remain the standard outside and in wet rooms where their properties matter more.

The distinction is not arbitrary. It follows from what each binder does when it meets water, and from where water is expected.

## Setting versus drying

Gypsum plaster hardens by crystallisation: the hemihydrate in the powder takes up water and re-forms as dihydrate, which is a chemical change that happens on a predictable timescale.

That is fundamentally different from a lime or cement plaster, which hardens by carbonation or hydration over a longer period and depends on moisture being present and then leaving. A gypsum plaster that dries out too fast does not simply gain strength more slowly; it may never develop the strength it was designed for, because the water it needed for crystallisation was taken away.

This is why suction control matters so much on masonry. A block that pulls water from the mix competes directly with the chemical reaction that is supposed to harden the plaster.

## Why gypsum stays out of wet areas

Gypsum is water-soluble in the long run, and it softens and eventually fails if it is kept damp.

A gypsum-plastered wall in a shower will soften at the base, blister its paint and eventually crumble, and no coating prevents that outcome because the problem is the plaster rather than the finish. German practice therefore keeps gypsum out of bathrooms, kitchens behind splash zones, laundries and anywhere that will be persistently wet, and uses lime, lime-cement or a waterproof system instead.

The boundary is drawn at the room, not at the wall, which is why a bathroom wall is plastered in a different material even where it is dry most of the time.

## The build-up

A German interior plaster is built in layers, and the layers have names that appear on quotations.

A spray or key coat, applied to give the substrate a mechanical key where it needs one. A base coat, or grounding coat, which provides the body and the thickness. And a finishing coat, which may be a separate material or, in single-coat machine plasters, the same material worked differently.

Modern machine plasters frequently combine the base and finish in one material applied to a controlled thickness and then floated and trowelled, which is faster and demands more skill at the finishing stage.

## Thickness and what it does

Plaster thickness is a specification item rather than a variable of the trade's convenience.

Thicker plaster provides more fire protection to the wall behind it, more acoustic mass, and more tolerance of substrate irregularity. Thinner plaster dries faster, weighs less, and is less prone to shrinkage cracking, but it demands a flat substrate.

German specifications therefore name a thickness range for each coat and the total. On a domestic masonry wall the total is typically in the range of ten to twenty millimetres depending on the substrate and the performance required, and a wall that needs more than that is a wall that should have been built straighter.

## Suction and the substrate

Suction is the mechanism that decides whether a gypsum plaster reaches its designed strength.

A dense lime-sand block has low suction and gives the plaster time to set. An aerated concrete block is highly absorbent and will take water from the mix faster than the gypsum can use it. A lightweight concrete block sits between the two.

The German response is a primer or a pre-wetting regime, matched to the substrate and stated in the specification. Where suction is not controlled, the plaster sets weak at the surface, dusts under the hand and cannot be repaired by painting.

## The surface classes

German plaster work is described by quality levels, from a basic level that accepts minor unevenness through to levels that require the surface to appear smooth and even under critical raking light.

The class determines the work at the finishing stage: how much filling, how much trowelling and how fine the surface must be. It also determines what the wall is suitable for, since a high class is needed before a sheen paint or a thin wallpaper, while a basic class is adequate under a textured finish in an undemanding position.

The class is agreed before work starts, because it is the basis on which the finished wall will be judged.

## Fire and sound, quietly

Gypsum plaster contributes to two performances that are rarely discussed and always present.

Gypsum contains chemically bound water, which is released when it is heated, so a plastered wall resists the passage of fire better than a bare one. And the plaster's mass, small as it is, adds to the wall's acoustic performance by sealing the surface and closing the pores.

Neither contribution is dramatic on its own. Together they are the reason German specifications often ask for a plastered wall where a drylined wall would have been cheaper.

## The standards frame

Interior plaster work in Germany is governed by the DIN standards for plaster and by the contract conditions of the VOB for the plastering trade.

In practice, a specification names the plaster type, the coat thicknesses and the surface class, and those three items are what a contractor prices and an inspector checks. The vocabulary is standardised, which is what allows a quotation from one contractor to be compared with another [4](https://www.beuth.de/de) [6](https://www.vob-online.de/).

## What the later articles cover

Materials deals with gypsum binders, machine plasters, primers and the tools of the trade. Installation follows the substrate preparation, the coats and the finishing sequence. Quality covers the classes, the checks and the defects worth naming. Maintenance covers repairs, filling and the repainting that follows.

## The economics of plastering rather than drylining

A plastered masonry wall and a drylined one reach a similar standard of finish, and the choice between them is decided by the wall rather than by the price.

Plaster is faster to decorate over once it has dried, it is harder and quieter under the hand, and it contributes to the wall's fire and acoustic performance in a way a thin lining does not. Drylining is faster to install and easier to undo, which is why it dominates where services are extensive or where the wall will be altered.

On a solid masonry wall in a German home, plaster is the default, and the reason is the solidity of the result rather than a tradition.

## A short history

Gypsum plaster became the German interior default in the second half of the twentieth century, as machine application replaced hand work and as the speed of setting made it ideal for volume housing.

Older buildings still carry lime plasters, which is why a plasterer working on an old wall needs to recognise what is there before choosing a repair material. A gypsum plaster repaired with lime, or a lime plaster patched with gypsum, produces a patch that behaves differently from its surroundings and shows within a season.

The material of the existing wall is therefore the first question on any repair, and it is answered by looking rather than assuming.

## What a householder should take from this

Two things. First, the plaster's performance was decided by preparation rather than by the trowel, and the two items that matter most are suction control and the moisture content of the wall.

Second, the specification is short and nameable: plaster type, primer, thickness, class. A householder who asks for those four in writing has a good chance of getting a wall that looks and behaves as expected.

## Terminology that appears on quotations

German quotations for plaster work use a short vocabulary, and reading it correctly is most of the way to comparing offers.

Innenputz is the interior plaster, Gipsputz the gypsum variant, Maschinenputz a machine-applied plaster and Oberputz the finishing coat. Spachtelung is the filling that lifts the surface class, and the classes are the Q levels.

A quotation that names those items is a specification. One that says only Innenputz and a square metre rate leaves the class, the number of coats and the primer undecided, which is where the difference in price usually comes from.

## Where the plaster meets the structure

A plastered wall meets the structure at the ceiling, the floor and any structural column, and each junction is a place where movement will concentrate.

The plaster is not rigidly tied to those elements; the junction is formed so that the plaster can move slightly without cracking. Where that is ignored, a hairline appears along the ceiling line within the first heating season, and it returns after every repair.

Those lines are so common in German flats that they are treated as normal, which is worth knowing before commissioning a repair for one.

## Why drying takes as long as it does

A gypsum plaster sets in hours and dries in days or weeks, and the difference is the water that remains after the chemical reaction has taken what it needs.

That residual water has to leave through the surface, which means ventilation and time. A thick plaster on a cold wall in a wet month takes longer than the same plaster in summer, and the only reliable measure is a moisture reading.

Rushing that stage with heaters damages the plaster and drives moisture into the masonry, which then has to dry again from a worse starting point.

## One sentence to carry

German interior plaster in a sentence: gypsum on masonry, prepared so the wall does not steal the water, applied in named coats, worked in one setting window, and agreed to a class before the first bag is opened.

Every failure in this series is a departure from that sentence, and every departure is cheaper to prevent than to correct.

## Where the risk sits

Three places on a plastered wall carry most of the risk: the base of the wall, where damp and salt arrive; the corners of openings, where movement concentrates; and the junction between different substrates, where a crack will appear if the mesh was omitted.

A wall sound at those three places will look the same in fifteen years. A wall that failed at one of them will have been repaired twice.

## References

1. Bundesverband der Gipsindustrie.
2. Rigips.
3. Putz.de.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Bundesverband Farbe Gestaltung Bautenschutz.
8. Xella.

## Image credit

The cover photograph shows a gypsum plaster surface, taken by Achim Hering and made available under CC BY 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the kind of interior gypsum plaster this series describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 9, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Gipsputz_stucco.jpg/1280px-Gipsputz_stucco.jpg')

, ('de-masonry-gypsum-materials', 'Gypsum Binders, Machine Plasters and Primers', 'A German materials guide for interior gypsum plaster: the gypsum binders and what each is for, machine and hand plasters, lightweight aggregates, primers, mesh, fillers and the tools that produce a class-standard surface.', $wallarticle2$# Gypsum Binders, Machine Plasters and Primers

The material list for an interior gypsum plaster is short, but the distinctions within it decide how the wall behaves for the next thirty years.

A buyer needs to know which gypsum binder is in the product, whether the plaster is a machine or a hand mix, what aggregate gives it its weight, and which primer the system requires for the substrate in front of them. Everything else is workmanship.

## The gypsum binders

Gypsum for plaster comes in several forms, and their differences are about setting behaviour and hardness rather than about chemistry.

Building plaster sets relatively slowly and is used for base coats and general work. Machine plaster gypsum, or Maschinenputzgips, is formulated for pump application with a working time matched to the machine and the trade's pace. Hard-burnt gypsum sets faster and harder and appears in products designed for a particularly durable surface, and in fillers rather than in base coats.

A product's data sheet states its binder, its working time and its hardness, and those three items explain most of its behaviour on a wall.

## Machine plasters and hand plasters

Machine plasters are the standard on German sites because they are delivered dry, pumped and sprayed, which is faster and more consistent than mixing by hand.

A machine plaster is formulated to be pumpable and to remain workable for the time it takes to apply and rule a run. Hand-mixed plasters are formulated for a bucket and a trowel, with a longer open time and a different consistency.

The two are not interchangeable in the middle of a job. A machine plaster worked by hand often sets before it can be finished, and a hand plaster put through a machine may not pump at all.

## Lightweight aggregates

Many interior plasters contain lightweight aggregates such as perlite or vermiculite, which reduce density and improve thermal and acoustic behaviour slightly.

The practical benefits are a warmer surface to the touch, a slightly better acoustic performance, and reduced weight on the wall. The practical cost is a softer surface that dents more readily and needs a harder finishing product if the wall will be knocked.

Where a wall must resist impact, a denser plaster with a harder surface is the better choice, and the lightness matters less than the durability.

## Lime-gypsum plasters

Lime-gypsum plasters combine gypsum with lime, which improves workability, extends the open time and produces a softer, more forgiving surface.

They are common for base coats and for hand work, and they behave better on substrates that move slightly than a pure gypsum plaster. They remain unsuitable for wet areas for the same reason as pure gypsum, which is that the gypsum content is still water-soluble.

The blend is a compromise, and it is a sensible one for general domestic work where the plaster will be painted rather than subjected to impact.

## Primers and key coats

Two different preparations appear on German plaster jobs, and confusing them is a common error.

A primer is a liquid that controls suction and improves adhesion, and it is applied to a dry, absorbent substrate. A key coat, or spray coat, is a thin slurry of plaster and sand thrown or sprayed onto a smooth substrate to give the next coat something to grip.

A dense, smooth block needs a key coat. An absorbent block needs a primer. A wall that needs both gets both, in that order, and the specification names which is required.

## Mesh at the junctions

Reinforcing mesh is bedded into the plaster at the places where movement concentrates: the junction between different substrates, the corners of openings, and across any chasing that has been filled.

The mesh is a crack-control measure rather than a strength measure, and it works only if it is embedded in the body of the plaster rather than laid against the surface. On a domestic job it is usually a strip of a few hundred millimetres wide across each junction.

Skipping it is invisible at the time and visible within a year, when a straight crack appears exactly along the line where the mesh should have been.

## Fillers for the higher classes

Reaching the higher surface classes requires a filler applied over the plaster and sanded back.

The filler is a gypsum-based product formulated to be sanded, and its hardness is matched to the plaster beneath so that the two sand at similar rates. A filler harder than the plaster produces a surface that sands unevenly and shows the difference under a raking light.

The sequence at the higher classes is therefore plaster, filler, sand, prime and decorate, and each step is priced separately in a German quotation.

## Tools

The tool list for gypsum plaster is distinctive: a machine or a mixer, a hawk and trowel, a straightedge long enough to rule a run, a float, a sponge float, a corner trowel and a spray bottle.

The spray bottle is not an afterthought. A gypsum plaster's finishing stage depends on the surface staying workable long enough to be trowelled, and a light mist of water is what makes that possible. Over-watering destroys the surface's hardness, which is why the tool and the technique are learned together.

## Storage and shelf life

Gypsum products are perishable in a way that lime products are not, and the shelf life is short.

Moisture in the air begins to convert the hemihydrate back to dihydrate inside the bag, which reduces the strength and shortens the working time of the mix. Bags are stored dry, off the ground, and used within the period stated on the bag.

A plaster mixed from old stock sets quickly and unevenly, and the trade will notice before anyone else does. Ordering for the job rather than for the season is the practical answer.

## What a merchant will ask

A German merchant supplying interior plaster will want to know the substrate, whether the work is machine or hand, and which surface class is required.

Those three answers determine the product, the primer and the finishing products. A customer who cannot answer them is usually buying a general-purpose product for a job with a specific requirement, and the price difference between the two is small.

## The list as a specification

Read together: gypsum plaster type, applied thickness, primer or key coat for the substrate, mesh at junctions, filler for the class, beads at corners.

A wall built to that list has a predictable surface and a predictable drying behaviour. A wall built from a generic bag has neither, and it looks identical on the day the plaster leaves the site.

## Why the primer is not optional

A primer is a small cost and a large determinant, and it is the item most often dropped from a quotation to make a price.

Its job is to equalise suction so that the plaster sets evenly across the wall. Without it, an absorbent block draws water from the mix, the plaster sets weak and dusty at the surface, and no amount of trowelling restores it.

The primer is applied and dried to its stated interval, which is why a job that is being rushed is a job where the primer was skipped. That single omission explains a large proportion of the plaster failures in German domestic work.

## Beads, stops and movement

Corner beads and stop beads are the small metal or plastic profiles that give a plastered wall its crisp edges.

A bead at an external corner protects the corner from impact and gives the plaster something to finish against. A stop bead at the junction with a window frame, a door lining or a different material gives a clean line instead of a ragged one.

Movement joints are less common indoors than on a facade, but they appear where a plastered wall meets a structural element or runs a long distance. Where the design calls for one, the joint is formed rather than filled.

## Buying the right quantity

Plaster quantities are calculated from area and thickness, and the calculation is worth doing rather than guessing.

A bag covers a predictable area at a stated thickness, and the coverage falls as the thickness rises. On a small job the difference between two bags and three is trivial; on a whole house it is the difference between a tidy site and a heap of spoiled material.

Gypsum products do not keep, so surplus is waste, and ordering to the job rather than to a discount is the practical policy.

## The bag and its label

A German plaster bag carries the binder, the product class, the application thickness, the coverage and the working time, and those five items answer most questions.

The mixing water is stated by the manufacturer, and it is measured rather than judged. Adding water to make a mix easier to work is the most common way a good product is turned into a weak one.

Labels also state the shelf life, which for gypsum products is short, and the storage conditions, which are dry and off the ground.

## Compatibility with the substrate

A plaster and a substrate are a pair, and the German product literature names the substrates each plaster is intended for.

A machine gypsum plaster designed for dense blockwork may not be suitable for highly absorbent aerated concrete without the specified primer, and a plaster designed for renovation work may contain additives that make it tolerant of residual moisture in an old wall.

Reading that part of the data sheet takes two minutes and prevents the most common material error on a domestic job.

## What to keep on site

A plastering job consumes consumables quickly: beads, mesh, filler, sanding sheets, masking film and a supply of clean water.

Keeping a stock of the small items is what allows the trade to finish a wall in one sequence. A job that stops to fetch a bead leaves a set edge that will show, which is why the material is staged before the work rather than during it.

## A short list for a room

For a single room: gypsum or lime-gypsum plaster to the specified thickness, primer suited to the substrate, mesh at the junctions, beads at the corners, filler if the class requires it, and clean water in quantity.

Every item answers a performance requirement. None of them is a preference.

## Why the water matters

Mixing water is an ingredient rather than a convenience, and its quantity is stated for a reason.

Too little water and the plaster is stiff, hard to rule and weak in bond. Too much and the plaster sets soft, shrinks more and loses the hardness the finishing stage depends on. Both errors look similar on the wall and both are permanent.

## References

1. Bundesverband der Gipsindustrie.
2. Rigips.
3. Putz.de.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Bundesverband Farbe Gestaltung Bautenschutz.
8. Xella.

## Image credit

The cover photograph shows a plasterer's trowel, released into the public domain by Sleepytomcat via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the hand tool at the centre of the trade this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 9, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Stuckateureisen.jpg/1280px-Stuckateureisen.jpg')

, ('de-masonry-gypsum-installation', 'Priming, Plastering and Trowelling: The German Method', 'A German installation sequence for interior gypsum plaster on masonry: substrate assessment, suction control, the coats and their thicknesses, ruling and floating, the trowelling that produces the class, and drying before decoration.', $wallarticle3$# Priming, Plastering and Trowelling: The German Method

Gypsum plaster is a fast material applied in a disciplined sequence, and each stage has a failure mode that no later stage can repair.

The substrate is prepared and primed, the plaster is applied and ruled, the surface is floated and trowelled while it is still workable, and the wall is then dried before anything else touches it. This article follows that sequence.

## Step one: assess the substrate

The first task is to look at the wall rather than at the plaster.

The substrate is checked for dust, for mortar snots, for chases that need filling, for any loose material, and for moisture. A wall that is damp is not plastered, because the plaster will trap the moisture and fail at the surface.

Suction is assessed with a droplet of water, and the result decides whether the wall needs a primer, a key coat or neither. That decision is the most consequential of the whole job and takes a minute per square metre.

## Step two: prepare and prime

Preparation removes what would prevent adhesion: dust, loose material, and the residues of other trades.

Priming then controls suction. A primer is applied by brush, roller or spray, and it is allowed to dry to the interval the product states. Applying a primer minutes before the plaster does not give it time to equalise suction, and the plaster behaves as though nothing was done.

On a smooth dense substrate a key coat is applied instead, and it is left to set so that the plaster has a mechanical grip.

## Step three: beads and mesh

Beads at external corners and at the junctions with other materials are fixed before the plaster, set to the finished plane.

Mesh is bedded across the junctions between different substrates and diagonally at the corners of openings, and it is positioned in the middle of the base coat rather than against the wall.

Doing these first is what makes them effective. A bead added afterwards sits on the surface, and mesh pressed into a finished plaster does nothing at all.

## Step four: the base coat

The base coat provides the thickness, and it is applied with the machine or by hand and then ruled off with a straightedge to the beads and the surrounding plane.

Ruling is the stage that establishes the geometry of the room. A wall ruled properly is flat and plumb, and every later stage becomes easier. A wall ruled carelessly cannot be corrected by the finishing coat, because a thick finishing coat cracks and a thin one follows the errors beneath it.

Where a substrate is uneven, the answer is to build out the base coat in the required thickness rather than to fill the hollows later.

## Step five: setting and the finishing window

Gypsum sets on a clock, and the finishing window is the period between the plaster being workable and being too hard to touch.

Within that window the surface is floated and trowelled: floated to close it and remove the trowel marks, then trowelled with a steel trowel and a light mist of water to produce the smooth, dense surface that the higher classes require.

Working outside the window is not possible. A plaster that has set cannot be reworked, and a plaster that is worked too early loses the surface density that makes it hard.

## Step six: the second coat or the filler

Where two coats are specified, the second is applied to the ruled first coat and finished in the same way.

Where a high surface class is specified on a single-coat plaster, a filler is applied over the set plaster, sanded back, and checked under raking light. The filler is what removes the small undulations left by the trowel and produces the flatness that a critical light demands.

The difference between a class met by trowelling and a class met by filling is a difference in labour and in price, and it is worth knowing which one has been bought.

## Corners, reveals and junctions

Corners and reveals are where the trade's skill becomes visible, because they cannot be hidden.

An internal corner is formed with a corner trowel while the plaster is workable, producing a crisp line. An external corner is formed on a bead. A reveal at a window is a narrow surface with two visible edges, and it is plastered and finished like the wall so that the whole opening reads as one surface.

Where a plastered wall meets a drywall partition, the junction is meshed and the two materials are brought to the same plane, because differential movement between them is guaranteed.

## Drying and ventilation

Gypsum plaster sets chemically but it still contains water, and the wall must dry before decoration.

Drying is by ventilation rather than by heat alone. A newly plastered room needs air movement and a steady temperature, and it must not be heated hard to speed things up, because that drives water into the wall rather than out of it and cracks the surface as it goes.

The practical rule is that the room is ventilated daily and not occupied or decorated until the readings say it is dry.

## Winter working

German winter imposes two constraints on plastering: the wall must not be frozen, and the room must be warm enough for the plaster to set.

Plastering onto a frozen wall produces a plaster that never bonds. Heating a room with an open flame while plastering introduces moisture and carbon dioxide that affect the surface, and the standard practice is to heat the building rather than the room.

Programme pressure at the end of a year is where these rules get broken, and the failures appear in the spring.

## Handover to decoration

The plaster is handed over cured, dry and to its agreed class, with the beads and reveals complete and the junctions closed.

Any repair made after handover is a patch, and a patch on a plastered wall is more visible than on any other surface because the plaster's texture and sheen are continuous. That is why the inspection before handover matters more here than elsewhere.

## Handover record

The record names the plaster type, the primer, the coat thicknesses, the surface class, the dates and the room temperatures at application.

It also records what was found in the substrate, since that explains the primer choice and would explain any later failure. It is a page of notes with a disproportionate value ten years later.

## Machine application

Machine application dominates German sites for reasons of consistency as much as speed.

A machine mixes and pumps at a controlled water ratio, which removes the variability of hand mixing and produces a plaster that behaves predictably across a large wall. It also delivers the material to the point of application, which removes the labour of carrying buckets up a stair.

The trade's skill then moves to the ruling and finishing stages, which is where the quality actually lives on a machine-plastered wall.

## Working in sequence around a room

A plastered room is worked in a sequence that keeps the wet edges alive.

Walls are taken one at a time, with the corners formed while the material is still workable and the next wall started before the previous one has set hard, so that the internal corner can be closed in one operation. A corner formed between a set wall and a fresh one is a corner that will show.

Ceilings are usually taken first, because working above a freshly plastered wall risks damaging it.

## The ceiling and the wall junction

The junction between a plastered wall and a ceiling is the line every eye in the room finds.

It is formed by bringing the wall plaster up to the ceiling and finishing the internal corner in one pass, or by setting a stop and closing the line afterwards. A junction that is filled later with filler rather than formed in plaster reads as a drawn line rather than a shadow line.

On a room with a high class specification, that junction is one of the details worth inspecting before the scaffolding or the tower comes down.

## Protecting what is already finished

Once a wall is plastered and dry, it is a finished surface that the remaining trades will damage if nobody protects it.

Masking film on the floor, corner protection on the beads, and a rule about where materials are stacked are ordinary measures on a German site. The alternative is a repair that shows in raking light for the life of the room.

Protection is cheap and it is the first thing dropped when a programme tightens, which is exactly when it is needed.

## The floor junction

The plaster stops above the finished floor level, and the skirting covers the junction.

That detail allows the floor to be laid or replaced later without touching the plaster, and it allows the plaster to move slightly without cracking at the floor. A plaster taken hard down to the screed cracks along the skirting line within a season.

Where the skirting is to be tall or the floor is to change, the stop height is worth agreeing before the plasterer starts rather than after the flooring arrives.

## Working with uneven masonry

Masonry is rarely perfectly flat, and the plaster's job includes correcting a certain amount of deviation.

Where the deviation is within tolerance, the base coat absorbs it. Where it exceeds tolerance, building out the plaster is possible but expensive and increases the risk of cracking, and the honest answer may be to correct the masonry or to line the wall.

Deciding that before the work starts is what keeps a plaster job from becoming a dispute about who pays for thickness.

## What the trade cannot fix later

Three things cannot be corrected after the plaster has set: a missed primer, a missed mesh at a junction and a wall ruled out of plane.

Each is quick to do and each is invisible until the defect appears. That is why an inspection at the frame and primer stage is worth more than any inspection of the finished surface.

## Signing off the room

The room is signed off when the plaster is dry, the class is met, the beads and reveals are complete and the record is written.

Doing that before the decorators arrive is what keeps a plaster defect a plaster conversation rather than a painting one, and it is the last moment at which the trade can correct its own work cheaply.

## Why the finishing window is short

A gypsum plaster stops being workable on a fixed clock, and the clock starts when the powder meets water.

That is why machine application is organised around a run: enough material to cover a manageable area, enough labour to rule and float it before it sets, and a plan for where the run ends. A run that overruns produces a surface that had to be trowelled late, which shows as a hard, glassy patch beside a normal one.

Experienced crews set their run lengths from the working time rather than from the size of the wall.

## References

1. Bundesverband der Gipsindustrie.
2. Rigips.
3. Putz.de.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Bundesverband Farbe Gestaltung Bautenschutz.
8. Xella.

## Image credit

The cover photograph shows a wall being plastered, taken by Kenneth Allen and made available under CC BY-SA 2.0 via Wikimedia Commons through the geograph project. It is a real photograph, not AI generated, and it shows plaster being applied and worked by hand. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 10, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/Plastering_a_wall%2C_Donaghanie_-_geograph.org.uk_-_5784055.jpg/1280px-Plastering_a_wall%2C_Donaghanie_-_geograph.org.uk_-_5784055.jpg')

, ('de-masonry-gypsum-quality', 'Judging a Plastered Wall: Classes, Hardness and Hollows', 'A German quality framework for gypsum plaster: what each surface class requires, how to check flatness in raking light, testing surface hardness and adhesion, and the defects that name the stage they came from.', $wallarticle4$# Judging a Plastered Wall: Classes, Hardness and Hollows

A plastered wall is judged on four things: how flat it is, how hard its surface is, whether it is bonded, and whether it is dry.

The first is a class, the second is a property of the material and the finishing technique, the third is a consequence of suction control, and the fourth is a fact about time. All four can be checked, and none of them can be corrected by decoration.

## The surface classes in practice

The German class system describes what a plastered surface is allowed to show under defined conditions.

At the basic level the surface is fit for a normal decorative finish in an ordinary location, and small unevenness is accepted. At the higher levels the surface must be even enough to look flat under critical raking light and to accept a thin, sheen finish without telegraphing the work beneath.

The class is agreed before work starts, and it determines the labour at the finishing stage: trowelling only, or trowelling plus filling and sanding. A quotation that names a class is a quotation that can be checked.

## Checking flatness

Flatness is checked with a straightedge and with light, and both are needed.

A straightedge of two to four metres, applied vertically, horizontally and diagonally, shows the deviation directly. A raking light along the wall, from a torch or a low sun through a window, shows the same deviation as a shadow that no straightedge can reproduce.

The class defines the tolerance. The light defines whether anyone will notice. A wall that passes the first and fails the second is a wall that will be seen every evening, and it is worth checking both before deciding that the work is done.

## Surface hardness

A gypsum plaster's surface hardness comes from the trowelling, and it is tested with a thumb and a coin rather than with an instrument.

A well-trowelled surface feels dense and resists a light scratch. A surface that has been over-watered, over-trowelled at the wrong moment or worked after it began to set feels soft and powders under a fingernail.

Hardness matters because a soft surface will not hold paint well, will dust under wallpaper and will mark where furniture touches it. It is a property of technique rather than of product, which is why it is the fairest thing to judge a plasterer by.

## Adhesion and hollows

Adhesion is checked by tapping, in a regular pattern, with a knuckle or a light hammer.

A bonded plaster gives a consistent, dull sound. A hollow note indicates a debonded area, which on a gypsum plaster is usually a sign of uncontrolled suction or a dusty substrate, and it is the defect that leads to the plaster falling away in sheets.

Small hollows are recorded. Large or clustered hollows are a defect to be repaired before decoration, and the repair is to cut out the affected area and re-plaster it rather than to inject anything into the void.

## Drying cracks and shrinkage

Fine cracking across a new plaster is common and is usually shrinkage rather than a structural symptom.

Drying cracks follow the pattern of the plaster's own contraction and are typically fine, shallow and random. Structural cracks are straight, follow a junction or an opening, and change width over time.

The distinction decides the response. Shrinkage cracks are filled and decorated over. A crack that follows a junction indicates missing mesh, and a crack that widens indicates movement that a filler will not restrain.

## Reading a defect back to its stage

Five defects recur in German interior plaster, and each maps to a stage.

A dusty surface maps to suction control. Hollow patches map to preparation. Crazing maps to the mix or to drying too fast. A soft surface maps to over-watering at the trowelling stage. A crack along a junction maps to the mesh that was not bedded.

Naming the stage rather than the symptom is what allows a repair to be specified, and it is the difference between an assessment and a complaint.

## The interface with decoration

A plastered wall's quality is partly decided by what is put on it.

A matt paint forgives a mid-class surface. A sheen or eggshell paint reveals every irregularity and every patch of filler that sanded differently. A thin wallpaper amplifies the texture of the plaster beneath it, and a lining paper is the practical way to flatten a mid-class wall before a demanding finish.

Where a client wants a sheen finish, the class should be specified for that finish rather than discovered afterwards.

## Moisture before decoration

Decorating a plaster that is still damp is the most common cause of a failed paint job on a new wall.

The wall is tested with a moisture meter, and it is dry when the readings say so rather than when the surface looks pale. A gypsum plaster that has set is not necessarily dry, and a paint applied over residual moisture will blister or flake within a season.

The interval depends on thickness, ventilation and the season, which is why the test rather than the calendar is the right instrument.

## Sample panels

A sample panel of a square metre, finished to the class being discussed and viewed in the room's own light, settles the question of what the class means.

It is the same instrument used in facade work and in drywall. It costs an hour and it converts the handover from a negotiation into a comparison, which is worth having on any job where the surface matters.

## Documentation

The record is a page: plaster type, primer, thicknesses, class, dates, room temperatures, moisture readings at handover and photographs under raking light.

Add the defects found and corrected. That file is what allows a later repair to match the plaster, and what an insurance or warranty conversation would rest on.

## What a good wall feels like

A well-plastered wall is flat under the hand, hard under a fingernail, uniform in colour and even in tone under a raking light.

Those four impressions correspond to plane, hardness, dryness and class, which are the four items in this article. A client who is dissatisfied is usually noticing one of them, and identifying which one is the first useful thing anyone can do.

## What the class does not promise

A class is a statement about appearance and it says nothing about adhesion, hardness or dryness.

A wall can meet its class and still have hollow patches, a soft surface or a high moisture content, and each of those is checked separately. Knowing which question is being answered is what stops a surface discussion from standing in for an assessment.

The practical order is: adhesion first, then hardness, then moisture, then class. A wall failing an earlier item cannot be redeemed by passing a later one.

## Comparing two quotations

Two quotations for plastering the same room differ in four places, and each is worth pricing explicitly.

The plaster type and its thickness. The primer or key coat, and whether it is included. The number of coats. And the surface class with its finishing work.

A quotation that names those four can be compared with another. One that names an area and a price cannot, and the difference between them usually turns out to be the items that were left out.

## The wall and its light

A plastered wall is seen in the light the room has, and the same surface can look perfect in one room and unacceptable in another.

A room with a tall window produces raking light for hours a day and is the most demanding environment for plaster. A room lit only from above is the most forgiving. That is why the class is agreed with the room's light in mind, and why a sample panel in the actual room settles the argument.

## Checking before the plasterer leaves

The most useful inspection happens while the plaster is still the plasterer's responsibility.

Flatness with a straightedge, hardness by hand, hollows by tapping, and the beads and corners by eye. Each takes minutes and each is easier to correct before the trade leaves the site than after.

A defect found on that walk costs a conversation. The same defect found after decoration costs a repair, a repaint and an argument.

## What a class costs

Each step up the class ladder adds labour: more filling, more sanding and more checking under light.

That is why a client who wants a sheen finish should say so before the class is agreed, and why a contractor who quotes a basic class for a sheen finish is either misreading the brief or planning to argue later.

The price difference is real and it buys a specific thing: flatness under critical light rather than flatness under ordinary light.

## The wall in a photograph

A photograph taken with a flash at an angle will show more of a plastered surface than the eye ever will, and that cuts both ways.

It is a useful record of quality at handover, and it is also a misleading standard, since no wall looks perfect under a flash at a shallow angle. Using the same lighting at handover and at any later inspection is what makes the comparison honest.

## What to do about a defect

A defect found at handover is recorded, described by its stage and given a repair method.

Describing it as a hollow rather than as poor workmanship, and naming the preparation rather than the trade, keeps the conversation about the wall. That habit is worth more than any amount of technical knowledge in the following discussion.

## The standard, not perfection

A plastered wall is judged against a standard, and the standard is the class.

Chasing perfection beyond it produces repeated sanding that thins the surface and repeated filling that changes its texture. Knowing where the standard sits, and stopping there, is what a professional assessment looks like.

## Verifying before decoration

The final quality gate on a plastered wall is the walk-through before the decorators arrive.

Flatness, hardness, hollows, moisture and the class, in that order, with a note of anything to be corrected. That walk-through takes twenty minutes on a flat and it is the only moment at which every item can still be corrected by the trade that caused it.

## What the light will show

Every plastered wall is eventually judged in the worst light it will ever have, which is usually a low winter sun across the surface.

That is the condition the higher classes exist for, and it is the condition under which a sample panel should be viewed. A wall that satisfies a client at noon in summer may not satisfy them in January.

## References

1. Bundesverband der Gipsindustrie.
2. Rigips.
3. Putz.de.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Bundesverband Farbe Gestaltung Bautenschutz.
8. Xella.

## Image credit

The cover photograph shows plastering work in progress, taken by Haktwo2004 and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the plastering stage whose finished quality this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 10, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Plastering.jpg/1280px-Plastering.jpg')

, ('de-masonry-gypsum-maintenance', 'Repairing Plastered Walls: Cracks, Patches and Repainting', 'A German maintenance guide for gypsum-plastered masonry: filling hairline cracks, patching damage, repairing around sockets and leaks, repainting a plaster surface without losing its texture, and recognising damp that paint cannot fix.', $wallarticle5$# Repairing Plastered Walls: Cracks, Patches and Repainting

A gypsum-plastered wall is easy to keep and easy to damage. It resists knocks reasonably, but a hole, a leak or a badly made alteration leaves a mark that no paint hides.

The maintenance skill is not the repair itself. It is doing the repair so that the plaster's texture is restored, because a plastered wall shows a patch by its surface rather than by its colour.

## The annual inspection

A plastered interior asks for a look rather than a procedure.

The things worth checking: the corners of openings, where cracks begin. The area around radiators and pipework, where leaks appear. The base of walls in kitchens and bathrooms, where damp shows first. The ceiling line, where movement between the wall and the floor above appears as a hairline.

A photograph each year makes the difference visible. Without one, a crack that has grown slowly is indistinguishable from a crack that has always been there.

## Hairline cracks

Fine shrinkage cracks are filled rather than excavated.

The crack is opened slightly with a knife, dusted out, filled with a gypsum-compatible filler and sanded flush while the filler is still slightly soft. Sanding a fully hard filler risks sanding the surrounding plaster more than the fill, which produces a shallow dish around the repair.

Where hairline cracking covers a whole wall, the honest response is to accept it and to choose a decorative finish that accommodates it, since filling every crack individually produces a surface that looks worse than the cracks.

## Cracks that mean something

A crack that is straight, that follows a junction, or that widens over successive years is not a decoration problem.

A straight crack between two substrates means missing mesh and the repair must reinstate it. A crack that widens suggests movement in the structure, and filling it repeatedly is a way of paying for the same information twice. A crack around a window reveal often follows the line of the opening's corner, which is where diagonal reinforcement belongs.

Those three are worth diagnosing before any filler is bought.

## Patching a damaged area

A hole or a knocked corner is repaired by cutting back to sound plaster rather than by filling the hollow.

The edges are cut square, the substrate is dusted and primed, and the patch is built in layers to just under the surrounding surface, then finished flush with a filler and textured to match. Texture matching is done with a sponge or a stipple while the filler is workable, and it is the step that decides whether the repair disappears.

A patch that is perfectly flat and perfectly smooth on a plastered wall is a patch that is obvious in raking light.

## Repairs around sockets and services

An electrician's chase or a new socket box leaves a rectangular scar, and it is one of the most common repairs in a German home.

The chase is filled in layers, not in one go, because a deep single fill shrinks and cracks. The final layer is finished flush and textured, and the area is primed before painting so that the fill does not draw the paint differently from the plaster around it.

Where the wall is to be tiled or wallpapered, the repair needs to be flat rather than textured, and the sequence changes accordingly.

## After a leak

A leak into a gypsum-plastered wall is more serious than the same leak into a lime plaster, because gypsum softens and loses strength.

The sequence is to stop the leak, remove the plaster that has softened rather than drying it out, allow the wall to dry, and rebuild the plaster. A gypsum plaster that has been soaked and dried will often look sound and fail within a season, and the only reliable test is whether it is soft to the touch.

Where the leak has been recurrent, the cause is worth fixing before the plaster is reinstated, since a third repair in the same place costs more than the plumbing.

## Repainting a plastered surface

A plastered wall is repainted with the same logic as anywhere else, with one additional constraint: the coating must be vapour-open enough for the plaster to keep drying.

The preparation is a wash, a rinse and a light sand on any glossy areas, then a primer where the surface is bare or patched. Two coats of a matt or low-sheen emulsion are the German domestic default.

Painting over a damp or dirty plaster is how a repaint fails within a year, and painting over a patch without priming it is how a wall ends up with dull islands that never disappear.

## Wallpaper and the plaster beneath

Where a wall is wallpapered, the plaster's condition still matters, because a thin paper reproduces every undulation.

A lining paper is the German remedy for a mid-class plaster under a decorative paper, and it is cheaper than filling and sanding the wall to a higher class. Removing wallpaper afterwards is also a plaster-damaging operation, which is why a wall that will be redecorated repeatedly is often painted rather than papered.

## Damp and mould

Damp patches and mould on an interior wall indicate a source of moisture rather than a defect in the plaster.

A cold bridge, a leaking pipe, a blocked gutter, a bridged damp course or simply insufficient ventilation in a kitchen or bathroom will all produce the same symptom at the surface. Treating the mould without finding the moisture is a temporary measure that damages the plaster as it repeats.

The honest sequence is to find the source, correct it, allow the wall to dry, and then assess whether the plaster needs repair.

## When to call a specialist

Three situations justify one: a crack that keeps returning after repair, plaster that has become soft over an area, and damp that reappears after a repair.

Each suggests a cause behind the plaster, and each is cheaper to diagnose than to keep patching.

## Records and expectations

A one-page file with the plaster type, the coatings used and their colour codes, the repairs made and a photograph of each wall at each cycle is enough.

A plastered wall maintained this way looks unchanged for decades and needs nothing more than a wash and a repaint. That is a modest expectation, and it is met by paying attention to the small things before they become the large ones.

## Cleaning a plastered wall

A plastered wall is cleaned with a damp cloth and a mild detergent, and the rule is not to scrub.

Scrubbing a painted surface burnishes it, and burnishing shows as a change in sheen that no amount of washing removes. On a bare plaster that has not been painted, water is used sparingly, because gypsum softens.

Marks that do not come off with a cloth are usually marks in the paint rather than on it, and the answer is a repaint of the panel rather than more effort with the cloth.

## Repainting sequence

The repaint of a plastered room follows a simple sequence: wash, fill, sand, prime the fills, then two coats.

The primer on the fills is the step that prevents dull islands, and it takes minutes. Cutting in at the ceiling and the skirting before rolling the field is the order that produces a clean line without masking.

Where the room is being repainted in the same colour, one coat over a sound surface is often enough. Where the colour is changing, two coats are the reliable minimum, since a plastered wall absorbs unevenly.

## Kitchen and bathroom boundaries

A gypsum-plastered wall in a kitchen or bathroom needs its wet zones handled deliberately.

Behind a splashback the wall is tiled or otherwise protected, and the plaster behind is not exposed. Where a wall is exposed above a worktop, a washable paint on a sound plaster is adequate. Where it is exposed in a shower area, the plaster is the wrong material and the wall should have been finished differently.

Knowing where those boundaries fall saves a repair that would otherwise be repeated every few years.

## Matching a repair to the existing plaster

A repair is visible if it behaves differently from its surroundings, so matching matters more than speed.

The existing plaster's type, hardness and texture are assessed, and the repair uses a compatible material finished to the same texture. Where the existing wall is a lime plaster, a gypsum repair will be harder and will telegraph its edges.

On an old wall the honest answer is sometimes that the whole wall should be skimmed rather than spot-repaired, since a series of patches on a textured surface is never invisible.

## Furniture, fixings and the plaster

Hanging things on a plastered masonry wall is straightforward, and the fixings are chosen for the wall rather than for the plaster.

A plastered masonry wall holds a plug and screw well, provided the hole is drilled into the masonry and not into the plaster alone. A heavy item is fixed with a longer plug that reaches sound material. Adhesive fixings work on a sound painted surface but pull away paint when removed.

The mark left behind afterwards is a small repair, and it is easier to make before the furniture is moved than after.

## Expectations over a decade

A plastered interior wall maintained with a wash and a repaint every decade, and the occasional patch, looks much as it did when it was new.

The things that age a wall fastest are damp, repeated alterations and decorating with products that seal the surface. None of those is inevitable, and all of them are visible in the maintenance record.

That record, a page of notes and a few photographs, is the whole equipment a householder needs for the wall.

## Living with an old plaster

An old lime-plastered wall behaves differently from a modern gypsum one: it is softer, more tolerant of movement and more vapour-open.

Repairing it with gypsum produces a patch that is harder than its surroundings and shows at the edge. Repairing it with a lime-based filler and finishing it to the same texture is what keeps an old wall coherent, and it is the detail that separates a careful repair from a quick one.

## A word on expectations

A plastered wall maintained as this article describes needs a wash, a repaint every decade and a patch when something is damaged.

That is all. The failures that make plastering feel fragile are almost always moisture or a badly matched repair, and both are predictable enough to avoid.

## The repair that lasts

A plaster repair lasts when three things match: material, texture and moisture content.

The material matches the existing plaster so that the two move and harden alike. The texture matches so that the patch does not read as a patch. And the wall is dry when the repair is made, because a repair over damp plaster fails whatever it is made of.

Those three items are why a careful repair on an old wall takes an hour and a quick one takes ten minutes and comes back.

## References

1. Bundesverband der Gipsindustrie.
2. Rigips.
3. Putz.de.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Bundesverband Farbe Gestaltung Bautenschutz.
8. Xella.

## Image credit

The cover photograph shows hand plastering of a wall, taken by Hasslaebetch and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the plaster work whose maintenance and repair this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 9, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Plastering_by_maison.jpg/1280px-Plastering_by_maison.jpg')

) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='DE' AND t.candidate_key='system:de-masonry-gypsum'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='DE' AND t.market_code='DE'
  AND t.candidate_key='system:de-masonry-gypsum'
  AND a.wall_topic_id=t.id AND a.wall_market_code='DE' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
