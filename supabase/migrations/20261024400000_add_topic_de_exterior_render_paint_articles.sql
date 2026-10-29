-- Second DE batch: five researched draft articles for the German exterior render and facade paint topic.
-- Articles remain drafts; publication/review gates are not bypassed.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, attributed), never AI generated.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='DE' AND candidate_key='assembly:de-exterior-render-paint') THEN RAISE EXCEPTION 'DE exterior render paint topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Sto','https://www.sto.de/','Sto','Render and facade coating systems, vapour permeability and surface protection'),
  ('Caparol','https://www.caparol.de/','Caparol','Facade paints, primers and substrate preparation for exterior render'),
  ('Brillux','https://www.brillux.de/','Brillux','Exterior coating systems and facade surface assessment'),
  ('Bundesverband Farbe Gestaltung Bautenschutz','https://www.farbe.de/','Bundesverband Farbe','Trade guidance and technical leaflets for facade coating work'),
  ('Beuth Verlag, German standards','https://www.beuth.de/de','Beuth Verlag','Published DIN standards for render, coatings and thermal insulation systems'),
  ('DIN, Deutsches Institut für Normung','https://www.din.de/de','DIN','Standards framework including render and coating classification series'),
  ('VOB online','https://www.vob-online.de/','VOB','Contract rules and technical conditions of contract for building work (ATV)'),
  ('Deutsches Institut für Bautechnik','https://www.dibt.de/','DIBt','Technical approvals for external wall insulation and coating systems'),
  ('Wienerberger','https://www.wienerberger.de/','Wienerberger','Masonry substrates and their behaviour under render and facade finishes'),
  ('Putz.de','https://www.putz.de/','Putz.de','Render materials, application practice and facade detail guidance')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='DE' AND t.candidate_key='assembly:de-exterior-render-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: Rendered facade of a listed villa, Markranstädt (Poschmann Immobilien, CC BY 4.0)','https://commons.wikimedia.org/wiki/File:Putzfassade-eckturm-villa-markranstaedt-eisenbahnstrasse-1a.jpg','Wikimedia Commons','Cover photograph overview article, CC BY 4.0'),
  ('Image credit: Render over natural stone before a waterproof coating, Weimar (Kai Kemmann, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Verputzte_Kellerwand_aus_Naturstein_vor_dem_Auftrag_einer_wasserdichten_Beschichtung,_Mutterhaus_des_Sophienhauses,_Trierer_Stra%C3%9Fe_2,_Westvorstadt,_99423_Weimar.jpg','Wikimedia Commons','Cover photograph materials article, CC BY-SA 4.0'),
  ('Image credit: Plasterers rendering a building (Sam Wilson, CC BY-SA 2.0)','https://commons.wikimedia.org/wiki/File:Plasterers_working_on_a_building.jpg','Wikimedia Commons','Cover photograph installation article, CC BY-SA 2.0'),
  ('Image credit: Rendered Gründerzeit commercial and residential building (Gunther Falchner, CC BY-SA 3.0)','https://commons.wikimedia.org/wiki/File:Verputztes_Gr%C3%BCnderzeitwohn-_und_Gesch%C3%A4ftshaus_-_Meinhard-Grebendorf_Obere_Dorfstra%C3%9Fe_-_panoramio.jpg','Wikimedia Commons','Cover photograph quality article, CC BY-SA 3.0'),
  ('Image credit: Rendered timber frame house of 1680, Eschwege (Gunther Falchner, CC BY-SA 3.0)','https://commons.wikimedia.org/wiki/File:Verputzter_Fachwerkr%C3%A4hmbau_-_1680_von_Justus_Henrich_Knierim_gebaut_-_Eschwege_Vor_dem_Berge_12_-_panoramio.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 3.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='DE' AND t.candidate_key='assembly:de-exterior-render-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'DE',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='DE' AND t.candidate_key='assembly:de-exterior-render-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'DE','DE',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('de-exterior-render-paint-overview', 'German Exterior Render and Facade Paint: The Weather Skin', 'A German overview of the facade chain: mineral render as the weather skin, facade paint as its protection and colour, and why permeability, crack bridging and algae decide more than colour choice.', $wallarticle1$# German Exterior Render and Facade Paint: The Weather Skin

A German facade is usually a rendered one. Masonry is finished with a mineral render that forms the building's weather skin, and that skin is protected and coloured by a facade coating designed to shed rain while still letting the wall breathe.

Understanding that division of labour is the whole of this topic. The render takes the weather and provides the surface; the paint protects the render and gives it colour. A coating chosen as if it were a decorative layer on a sealed substrate will fail, and a render left uncoated will weather faster than it needs to.

## Why Germany builds rendered facades

Rendered masonry is the dominant German facade because it is a single continuous skin with no joints to maintain, it is relatively cheap to build, and it can be detailed to shed water at sills, copings and bases.

The render is also the sacrificial layer. When a facade weathers, it is the render that erodes and the render that is repaired, which protects the masonry behind it. A cladding has different virtues; a rendered wall has this one, and the whole maintenance philosophy of German facades follows from it.

Two construction types dominate: monolithic render applied directly to masonry, and render applied over an external wall insulation system, where the render is the outer component of a bonded assembly.

## The thermal insulation case

The second type deserves separate mention because it changes what the facade is for. In an external wall insulation system the render sits on an insulation board that is adhesively bonded and mechanically fixed to the masonry, with a glass-fibre mesh embedded in a base coat beneath the finishing render.

The render there is the system's weather protection and its impact resistance, and it is a proprietary assembly that is approved as a whole. The German institute for building technology administers those approvals, and a system is not a collection of parts bought separately [8](https://www.dibt.de/).

That means repairs to an insulated facade belong to the system rather than to the trade, which is the single most useful thing a householder can know before commissioning work on one.

## The render's job, and the paint's

Render provides a continuous, vapour-open, rain-shedding surface with enough thickness to absorb the small movements of the wall behind it.

Paint provides water repellency at the surface, colour, resistance to algae and dirt, and a renewable layer. It also provides crack bridging of a limited kind if the product is specified for it.

Neither function is optional in a German climate, where a facade is wet for a large part of the year and where frost follows the wet. The pairing is what makes the wall durable, and treating the paint as decoration is how the pairing breaks down.

## The permeability principle

Facade coatings are classified by how readily they let water vapour through, expressed as a diffusion resistance figure, and by how strongly they resist liquid water at the surface.

The good products combine a high resistance to liquid water with a low resistance to vapour. That combination is the whole point of a modern facade coating and the reason mineral and silicone-based products dominate the German market.

A coating with high vapour resistance traps moisture that has entered the wall, and the trapped moisture finds the weakest point in the render and blisters or flakes it there. The failure appears at a detail, but its cause is the coating's physics [1](https://www.sto.de/) [2](https://www.caparol.de/).

## The algae question

Green growth on shaded facades is the most visible maintenance problem in German residential building, and it is not a cosmetic matter.

Algae and mould grow where a surface stays wet, which means north and west elevations, areas under trees, and any facade where the coating has lost its water repellency. Insulated facades are more prone because their outer surface is cooler and stays damp longer.

The German response is threefold: coatings with a film-preservative or algae-resistant formulation, hydrophobic treatments that shed water, and detailing that reduces wetting. Products are tested for resistance to algae and mould, and the test results are a more useful buying signal than a claim on a bucket [5](https://www.beuth.de/de).

## Standards and the contract frame

Exterior render and coating work is covered by the DIN render series and the coating classification standards, applied through the ATV for the relevant trades in the VOB contract framework [4](https://www.beuth.de/de) [7](https://www.vob-online.de/).

The practical consequence, as with German interiors, is that a specification refers to a standard and a product class rather than describing an outcome in prose. Surface texture, grain size, coating class and system approval are all nameable.

## What the later articles cover

Materials deals with render types, mesh and base coats, facade coatings and primers. Installation follows the work from scaffolding to the second coat, including the weather window. Quality covers adhesion, permeability and algae testing. Maintenance covers cleaning, inspection and the repointing of a facade cycle.

The thread is that the German facade is a system with a skin and a coating, and that maintaining the coating is what keeps the skin doing its job.

## What renders do badly, and what that tells you

A render is good in compression and poor in tension, which is why it cracks where the wall moves and where the substrate changes.

That single fact explains the details German render practice insists on: movement joints at the right places, mesh at corners and junctions, and a limitation on how much a render is asked to span. Where those details are missing, the render cracks and the coating is blamed.

Reading a facade's cracks is therefore a way of reading its detailing. A crack that follows a line between two substrates is a missing joint; a crack at the corner of a window is a missing mesh; a map of crazing is a render mix that was too strong for its substrate.

## Render thickness and what it buys

Render thickness is a specification item rather than a detail, because thickness governs how much movement the render can absorb and how well it resists impact.

A thin decorative finish behaves differently from a base coat plus finishing render, and the difference is most visible on a facade that takes weather on an exposed elevation. Where a facade is being repaired, matching the existing thickness matters as much as matching the mix, since a thin patch beside a thick field behaves differently under thermal movement.

Telling a contractor to repair the render without specifying thickness is how a facade ends up with patches that telegraph within two years.

## The economics of a facade

A facade is the largest single surface of a house and the one that determines how the building is judged from the street.

German practice reflects that: money goes into the render and the coating system, and the detailing that keeps water out of both. The colour is the last decision and the cheapest, which is why a facade chosen by its colour alone rarely ages well.

The economics are simple. A render repair costs a multiple of a coat of paint, and a re-render costs a multiple of a repair. Every stage of maintenance is cheaper than the one it postpones, and the whole schedule is decided by how quickly small defects are noticed.

## Regional variation in German facade practice

German facade practice is nationally consistent in its standards and locally varied in its buildings.

The north and west, with more wind-driven rain, place more weight on water repellency and on the resistance of coatings to staying wet. The east and south, with colder winters and more sunshine respectively, place more weight on frost resistance and on ultraviolet stability. Insulated facades are more common in some regions than others for reasons of grant history and energy policy as much as climate.

A specification written for one region is a starting point in another. The substrate and the exposure are what change, and both are visible on site.

## Rain on a facade, physically

Driving rain arrives at a facade with kinetic energy, and a surface that absorbs it takes water into the render while a surface that sheds it does not.

Two properties govern the outcome: the surface's water absorption and the render's pore structure. A hydrophobic surface sheds most of the rain that lands on it, and the pores beneath let the small amount that enters escape as vapour.

That is the mechanism the coating classes describe, and it explains why a facade that looks sealed can be wetter than one that beads and dries. Sealing is not the objective; controlled wetting and free drying is.

## What a householder should take from this overview

Two things. First, the facade is a system, and its performance is decided by how its layers and details work together rather than by the coating alone.

Second, the cheapest intervention is always the earliest one. A wash, a cleared gutter and a repaired sill each cost a fraction of the repaint they postpone, and they are the reason a well-kept German facade can go fifteen years between coatings.

## Where the risk concentrates

Three places on a German facade carry most of the risk of failure, and a survey that ignores them misses the point.

The plinth, because water collects and salt attacks. The sills and drips, because that is where rain is meant to be thrown clear and where a coating can quietly destroy the detail. And the junctions around windows and doors, where movement and water meet.

A facade that is sound at those three places and tired in the field needs paint. A facade that is failing at any of them needs a repair, whatever the field looks like.

## The one-line summary

The German facade in a sentence: a mineral skin that sheds rain and dries outward, protected by a coating that does the same, maintained at its details before it fails in its field.

Everything in the following articles is an application of that sentence.

## Reading this series against a real building

A useful exercise, after reading the five articles, is to walk around a rendered building and name what you see.

The plinth, the sills, the junctions, the shaded elevation with its green tint, the sunlit elevation with its faded colour. Each has an article behind it and a decision attached to it, and the walk takes ten minutes.

That habit, more than any product knowledge, is what makes a householder able to judge a quotation and to maintain a facade.

## References

1. Sto.
2. Caparol.
3. Brillux.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Deutsches Institut für Bautechnik.
8. Wienerberger.
9. Putz.de.
10. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows the rendered facade and corner tower of a listed villa in Markranstädt, taken by Poschmann Immobilien and made available under CC BY 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a full render and coating finish on a German building. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 10, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Putzfassade-eckturm-villa-markranstaedt-eisenbahnstrasse-1a.jpg/1280px-Putzfassade-eckturm-villa-markranstaedt-eisenbahnstrasse-1a.jpg')

, ('de-exterior-render-paint-materials', 'Render Systems, Mesh and Facade Coatings in German Practice', 'A German materials guide for exterior facades: lime-cement and silicone resin renders, reinforcing mesh and base coats, mineral and silicone facade paints, primers and hydrophobising treatments.', $wallarticle2$# Render Systems, Mesh and Facade Coatings in German Practice

The materials for a German facade fall into three groups: the render itself, the components that hold it together, and the coating that protects it.

Each group is chosen in a defined order. The render follows from the substrate and the system; the coating follows from the render.

## Lime-cement render

Lime-cement render is the workhorse of German facades and of masonry in general. It is strong, weather-resistant and cheap, and it is available in grades that run from a light base coat to a finishing render.

Its weaknesses are its stiffness and its tendency to crack where the substrate moves. That is why it is applied in layers and why mesh is embedded where cracks are expected, at corners, at junctions between materials and across the whole surface of an insulated facade.

Where the substrate is soft or historic, lime-cement render is often the wrong choice, and a lime-rich or purely lime render is specified instead.

## Silicone resin and silicone-based renders

Silicone resin renders combine mineral fillers with a silicone resin binder, giving a render that is water-repellent and highly vapour-permeable at the same time.

They are the standard finishing render on insulated facades and on many monolithic walls for that reason: the surface sheds rain while the assembly beneath it dries outward.

They are also less prone to algae than a plain mineral finish, because the surface stays drier, although no product eliminates growth on a shaded elevation.

## Lime and mineral renders

Pure lime renders and mineral renders are used on historic buildings, on soft masonry and where a very open, vapour-permeable surface is wanted.

They are more tolerant of movement and of damp than a stiff cement render, and they are compatible with old masonry that needs to dry inward and outward. They are also less resistant to impact and require a coating that is equally permeable.

Using a hard cement render on soft historic masonry is the classic German conservation error, and its consequences are the same in any country: the render survives and the masonry behind it erodes.

## Base coats and reinforcing mesh

Where a facade carries an insulation system, the render is built over a base coat reinforced with glass-fibre mesh.

The mesh is embedded in the fresh base coat with an overlap at the sheet edges, and its purpose is to control cracking rather than to add strength. The detail matters more than the material: mesh that is not embedded, or that sits too close to the surface, controls nothing.

On monolithic render the same principle applies locally, with mesh set into the render at corners of openings and at junctions between different substrates.

## Facade paints

Four coating families dominate the German exterior market.

Mineral and silicate paints bond with the mineral render and are the most permeable, which suits lime and mineral finishes. Dispersion paints are the toughest and most flexible and are widely used on existing painted facades. Silicone resin paints combine repellency with permeability and are the general-purpose choice on insulated systems. And dispersion-silicate hybrids aim at the middle, offering mineral bonding with acrylic toughness.

Each family has a compatible primer, and mixing families across a system is where coatings fail for chemical rather than physical reasons.

## Primers and consolidants

The primer on a facade does the same work as a primer inside: it binds, equalises suction and improves adhesion.

On a chalky or weathered render, a consolidating primer is applied to stabilise the surface so that the coating has something to hold. On a repaired facade, the patches are primed separately so that they do not flash through the finish.

Where a mineral coating is applied over an existing acrylic paint, the correct primer is one that both keys to the old film and accepts the new mineral product, which is a specific product rather than a generic one.

## Hydrophobising treatments

A hydrophobic treatment is a water-repellent impregnation that penetrates the render without forming a film, making the surface shed water while remaining vapour-open.

It is used on facades that are sound but absorbent, and as a maintenance treatment between repaints. It is not a substitute for a coating that has failed, and it cannot correct a crack.

The distinction matters in the German market because a hydrophobic treatment can make a facade look renovated for a season without addressing the reason it was absorbing water.

## Repair materials

Three repair materials cover most facade work: a render repair mortar matched to the existing render, a flexible facade filler for cracks, and a fabric or mesh strip for cracks that may reopen.

Matching is the governing principle, as with interior work. A repair mortar stronger than the surrounding render concentrates stress at its edges, and the crack returns around the patch.

## The coating's technical classes

Facade coatings are classified by water vapour permeability, water absorption, crack bridging ability and resistance to algae and mould.

Those four classes are what a specification should name. A coating with good crack bridging belongs on a render with a history of hairline cracking. A coating with low water absorption belongs on an exposed elevation. A coating with high permeability belongs over mineral render and on insulated systems.

Reading those classes on a data sheet is the difference between buying a coating and choosing one.

## Tools and consumables

A facade job needs scaffolding or a tower, a low-pressure washer, a stiff brush, a long-pile roller for textured render, a spray unit for large areas, masking for windows and sills, and a moisture meter.

The item most often missing is the low-pressure washer. High pressure drives water into the render and damages the surface, which is the opposite of what preparation needs.

## Silicate and mineral coatings in detail

Silicate coatings bond chemically with a mineral substrate, which is why they are so often specified over a lime or mineral render.

The bond is mechanical as well as chemical, so the render must be absorbent and clean, and the primer must be mineral-compatible. A silicate coating over an acrylic primer is a coating that cannot do the thing it was chosen for.

Where a facade has an existing dispersion paint, a silicate product is not the automatic upgrade it is sometimes sold as. The correct sequence is to remove or key the old film, prime with a product designed for the transition, and then coat.

## What a facade coating must resist

The German market tests exterior coatings against a defined set of stresses, and naming them makes product selection less mysterious.

Rain and driving rain, frost, ultraviolet light, dirt, biological growth, and the alkalinity of a fresh mineral substrate are the six. A coating is chosen for the stresses its elevation will actually see.

A south facade needs ultraviolet and heat resistance. A north facade needs resistance to growth and to staying wet. A plinth needs resistance to splash, salt and abrasion. One product rarely leads on all three.

## What to ask at the merchant

Three questions get useful answers at a German building materials merchant: which render suits this substrate, which coating suits this render, and which primer makes the two compatible.

The answers are specific and they are written down on the data sheets the merchant holds. A householder who asks those questions and keeps the answers has a specification, which is more than most quotes contain.

## Powder, paste and the practical choice

Render arrives as a dry powder to be mixed or, in smaller quantities, as a paste. Coatings arrive ready to use.

For small repairs the paste products are convenient and for larger areas the powder is cheaper, but the deciding factor is usually drying and open time rather than price. A repair that skins before it is worked cannot be floated, and that is a property of the mix rather than of the skill.

## The render mix and its strength

Render strength is chosen to suit the substrate, not to be as strong as possible.

A strong render on a soft background cracks because it cannot follow the background's movement. That is why historic masonry takes a lime render, modern block takes a lime-cement render, and insulated systems take a proprietary base coat.

The mix is therefore a structural decision disguised as a materials decision, and choosing it without knowing what the wall is made of is how repair becomes replacement.

## Coatings for the plinth zone

The plinth is coated differently from the field, and the reason is the quantity of water it meets.

Splash from paving, salt from de-icing and snow piled against the wall all attack the base of a facade, so plinth coatings are formulated for higher water resistance and for resistance to salt and abrasion. They are typically darker than the field, which also hides the splash line.

Coating the plinth with the field product and the field colour is one of the small errors that produces a permanently dirty-looking base within two winters.

## Biocides in facade coatings, and what they mean

Facade coatings commonly include film preservatives to resist algae and mould, and the German market regulates and labels them.

The honest reading is that a preservative reduces growth on the film and that it depletes over time, which is why a coating's resistance is highest when new. It is also why cleaning and a hydrophobic treatment extend a facade's clean appearance between repaints.

## Storage on a German site

Render powder and facade coatings are both damaged by frost and damp, and a German winter will find any material left in an unheated container.

Powder is stored dry and off the ground, coatings are stored frost-free, and leftover product is kept indoors with its label. That last habit supplies the touch-up that a facade will eventually need.

## Matching a repair to an existing render

Repairing a render is a matching exercise in four variables: strength, thickness, texture and colour.

Strength protects the substrate, thickness protects the movement behaviour, texture protects the appearance, and colour is dealt with by the coating. Get the first three right and the coating hides the fourth.

Get strength wrong and the repair outlives the wall it was meant to protect, which is the failure mode that conservation guidance exists to prevent.

## Two products that are often confused

A facade filler and a render repair mortar are not the same thing, and the confusion costs money.

A filler closes a crack and is formulated to be sanded and painted. A repair mortar rebuilds missing render and is formulated to be applied in layers and to key to the substrate. Using filler to rebuild a missing patch produces a soft island that falls out within a season.

The material is chosen by the depth of the repair, which is why a survey precedes a materials order.

## A materials list for a facade job

For a typical single-house facade: render repair mortar matched to the existing render, mesh strip for cracks, filler for hairline defects, consolidating primer, facade coating in two coats, plinth coating, masking materials, and a biocide wash.

The list is short. The decisions within it, about strength, class and compatibility, are what the specification is for.

## References

1. Sto.
2. Caparol.
3. Brillux.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Deutsches Institut für Bautechnik.
8. Wienerberger.
9. Putz.de.
10. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows render applied over natural stone on a historic basement wall in Weimar, taken by Kai Kemmann and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a mineral render surface receiving a coating. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 9, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Verputzte_Kellerwand_aus_Naturstein_vor_dem_Auftrag_einer_wasserdichten_Beschichtung%2C_Mutterhaus_des_Sophienhauses%2C_Trierer_Stra%C3%9Fe_2%2C_Westvorstadt%2C_99423_Weimar.jpg/1280px-Verputzte_Kellerwand_aus_Naturstein_vor_dem_Auftrag_einer_wasserdichten_Beschichtung%2C_Mutterhaus_des_Sophienhauses%2C_Trierer_Stra%C3%9Fe_2%2C_Westvorstadt%2C_99423_Weimar.jpg')
, ('de-exterior-render-paint-installation', 'Scaffold to Second Coat: Coating a German Facade', 'A German installation sequence for facade work: scaffold and masking, low-pressure cleaning and biocide treatment, render repair, priming, spraying and rolling two coats, and the weather window that decides whether any of it holds.', $wallarticle3$# Scaffold to Second Coat: Coating a German Facade

A facade job is a sequence with two constraints that no amount of labour can compress: the weather and the drying of water.

Everything else can be organised. This article follows the work on a rendered German facade from the scaffold to the second coat.

## Step one: access and protection

Scaffolding is erected and, where required, approved, and the ground below is protected.

Masking then covers windows, sills, downpipes, lights and adjacent surfaces. Sills and drips are protected with particular care because a coating that bridges a drip destroys the detail's function, and the water that was meant to be thrown clear of the wall starts running down the render.

Protection of the ground matters as much: facade coating on paving or on a parked car is a problem the contractor owns.

## Step two: assess the render

Before cleaning, the render is assessed for soundness, cracks and moisture.

Hollow areas are mapped by tapping, cracks are measured and their pattern noted, and a moisture meter is used at several heights. The base of the wall is nearly always the wettest part and the most important reading.

Where the render is hollow over a large area, the answer is repair rather than coating, and the job stops until it is done. Painting over a debonded render is the most expensive mistake available in facade work, because the coating will fall with the render.

## Step three: clean

Cleaning removes dirt, algae, chalk and loose material, and it is done at low pressure with the right chemistry.

High pressure is the common error. It drives water into the render, damages the surface and can dislodge the render itself. A fan tip at low pressure with a suitable detergent is the correct method, working from the bottom up to avoid streaks and rinsing from the top down.

Where biological growth is present, a biocide wash is applied, left to work for the stated time and rinsed. Residue left on the facade is a bond breaker and a food source for the next generation of growth.

## Step four: repair

Repairs address three things: cracks, hollow or missing render, and failed details.

Cracks are opened to a V or chased, cleaned, and filled with a render-compatible repair mortar; where movement is likely, a mesh strip is bedded across the repair. Hollow render is cut back to sound material, the edge is undercut slightly, and a matched mortar is applied in layers.

Details are the third category and the most neglected: a failed sill joint, a cracked reveal, a damaged drip. Those are small items and they are where water enters the wall, so they are repaired before the coating goes on rather than after.

## Step five: allow to dry and check

Repair mortars and washed render both carry water, and the coating waits for them.

The check is a moisture reading at several points per elevation, not a visual inspection. Render can look dry within hours and stay wet for days, and a coating applied over that water will blister in the first cold snap.

In a German autumn this can add a week to a programme. The alternative is a failure that appears in January.

## Step six: prime

The primer binds the surface, equalises suction and improves adhesion of the coating.

On a chalky facade a consolidating primer is used. On repaired areas the primer goes on separately so that the patches do not draw the coating differently from the surrounding render. On a facade changing coating family, for example from an acrylic paint to a mineral one, the primer is the product that makes the change possible.

Application is by brush and roller, working the primer into the texture, with a coverage rate taken from the data sheet rather than from habit.

## Step seven: two coats

Two coats are applied, the second after the first has dried to the stated interval.

Application suits the surface: roller on a fine render, spray with back-rolling on a textured one, brush at the edges and details. Spraying speeds a large elevation and requires the discipline of working a section at a time to a wet edge, because a lapped coat on a facade is visible for years.

Coating thickness matters as much as coat count. A thin two-coat film performs worse than a full two-coat film, and the difference is a coverage rate obeyed rather than assumed.

## The weather window

The window is defined by air temperature, substrate temperature, humidity, wind and the prospect of rain.

Most German facade coatings are applied above five to ten degrees Celsius, and substrate temperature is the figure that matters on a cold wall in shade. Rain within the drying period damages a fresh coat, and strong sun on a dark render can skin the coating before it bonds.

The method is to work around the building with the sun, to start on the elevation that will be shaded at midday, and to check the forecast for the full drying period rather than for the application hour.

## Step eight: details and inspection

The details are inspected and finished: the junction with the ground, the sill drips, the reveals, the edges at downpipes, and the coating line under the eaves.

Then the facade is inspected from the ground and from the scaffold, in daylight, for uniformity, coverage and missed areas. From the scaffold the top of each elevation is checked, because that is where coverage is thinnest and where nobody looks from below.

## Removing the scaffold

Scaffolding comes down after the coating is dry, and the removal is the moment when the facade is seen as the public will see it.

Any damage from the scaffold, and any area that was masked and not finished, is corrected before the scaffold goes. That last look, from a distance, in ordinary daylight, is the most honest inspection of the whole job.

## Handover

The handover record is a page: render repairs carried out, primers and coatings with their product classes, colours and codes, the dates, and photographs of each elevation.

That record is what a repaint in twelve years will rely on, and it is what a warranty claim would rest on. It takes ten minutes to write at the end of a job and saves a survey the next time.

## Spraying a facade properly

Spraying is the standard method on large elevations and it has three requirements that determine whether the result is even.

The first is a consistent distance and angle, because a spray pattern applied from varying distances produces a film of varying thickness which shows as patches. The second is back-rolling, which works the coating into the render texture and evens the film. The third is a section-by-section method working to a wet edge.

Applied that way, spraying is fast and uniform. Applied without back-rolling, it leaves a facade that looks coated and behaves as though it was not.

## Working at height

Scaffold work has its own discipline: tools tethered, a method for moving along the lift, and a rule that nothing is left on a board when the lift changes.

The practical items are a bucket that hooks to the scaffold, a roller on a pole for the edges, and a plan for the areas that cannot be reached from the boards, such as behind a downpipe or under a sill. Those are the places where the last coat is thinnest.

## When the weather closes in

A facade job that runs into rain is not a disaster if the stopping point is chosen deliberately.

Stopping at the end of a coat leaves a facade that can wait. Stopping mid-elevation leaves a lap line that will be visible for a decade, so the coat is finished on the section it was started on even if the next section has to wait for better weather.

That habit is why experienced facade crews talk about sections rather than about days.

## Priming a repaired facade

A repaired facade is a patchwork of absorptions, and the primer is the stage that makes it behave as one surface.

The repaired areas receive their own primer, feathered beyond the repair edges, and the field receives its primer as specified. Where this is skipped, the repairs show as dull or glossy patches within days and as adhesion failures within a year or two.

The extra hour is the difference between a facade that looks repaired and one that looks renovated.

## Two coats, and why the second matters

A single coat on a weathered render gives colour and little protection, because the film is thin where the surface is open.

The second coat brings the film to its specified thickness and closes the surface, which is what delivers the water repellency. That is why the coat count is a contract item in German work rather than a matter of judgement on the day, and why a facade coated once fails visibly sooner than the same facade coated twice.

## A word on colour and durability

Colour affects durability in ways that are not always obvious.

Strong colours, particularly dark reds and blues, fade faster under ultraviolet light and are harder to touch up invisibly. Very light colours show dirt and algae less but show shadows and repairs more. On a facade with a history of patch repairs, a mid-tone reads as more uniform than a white.

Choosing a colour with those behaviours in mind is a maintenance decision as much as an aesthetic one.

## Preparing an existing painted facade

Where a facade has been painted before, preparation changes and the change is not cosmetic.

The existing coating is tested for adhesion and identified where possible. A sound acrylic film can receive another acrylic system with a suitable primer. A chalky film is stabilised or removed. A mineral facade that has been painted with a dispersion will not accept a silicate coating without the transitional primer designed for it.

Painting over an unknown coating is the most common reason a repaint fails early, and the test that prevents it takes a morning.

## Working around occupants

A facade job on an occupied building, which is normal in German housing, adds a set of small constraints: windows that must remain usable, balconies that must be cleared, and a scaffold that changes how people enter their homes.

Agreeing the schedule per elevation, and warning occupants before each one, is the practice that keeps a job welcome. The technical work is unaffected; the experience of it is entirely determined by that coordination.

## Sequencing with the other trades

A facade job coordinates with roofers, window fitters and joinery, and the order is not arbitrary.

Sills and flashings are completed before coating, because coating over a detail that is about to change wastes the coating. Window replacements are completed before the render repairs, because the reveals will need re-rendering. Gutters are cleared and repaired before the facade is washed, since otherwise the wash is undone by the next rain.

Getting that order right is project management rather than craft, and it is the part that determines whether the facade is finished once.

## When a facade cannot be coated

Occasionally the honest answer is that a facade cannot be coated until something else is done.

Where the render is wet from a defect, salt-contaminated, or friable across an elevation, a coating is a decision taken too early. The correct sequence is to correct the cause, allow the render to dry, and then assess whether the render itself is still sound enough to coat.

Saying so is part of a professional assessment, and it is the sort of assessment that a quotation is not.

## References

1. Sto.
2. Caparol.
3. Brillux.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Deutsches Institut für Bautechnik.
8. Wienerberger.
9. Putz.de.
10. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows plasterers rendering a building, taken by Sam Wilson and made available under CC BY-SA 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the render work that precedes any facade coating. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 10, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Plasterers_working_on_a_building.jpg/1280px-Plasterers_working_on_a_building.jpg')

, ('de-exterior-render-paint-quality', 'Judging a German Facade: Adhesion, Permeability and Algae', 'A German quality framework for facade coatings: moisture and adhesion checks before work, the technical classes that predict performance, algae and dirt resistance, and the defects that indicate the render rather than the paint.', $wallarticle4$# Judging a German Facade: Adhesion, Permeability and Algae

A facade coating is judged by the state of the render beneath it, years later. The quality question at handover is therefore about the system rather than the paint: does the render still adhere, is the wall dry, and does the coating shed water without trapping it.

## Checking the render, not just the paint

The first quality check on a facade job is the soundness of what is being coated.

Tapping the render across each elevation maps the hollow areas. A render that is debonded over a patch will fail regardless of the coating, and the failure will be blamed on the coating. A probe with a knife at a crack edge shows whether the render is friable or sound.

Doing that survey before pricing the work, rather than after, is what separates an assessment from a quotation.

## Moisture readings

The second check is moisture, taken at several heights and on several elevations.

The base of a wall is the critical zone, since splash and rising damp both concentrate there. A reading that is high at the base is a drainage, plinth or ground-level question, and no coating solves it.

Where readings are high across an elevation, the cause is usually a defect at a sill, a coping or a roof detail rather than the render itself. Those are the items to repair before any coating is specified.

## The classes that predict performance

Four technical classes on a facade coating data sheet do most of the predictive work.

Water vapour permeability determines whether the wall can dry outward. Water absorption determines how much rain the surface takes up. Crack bridging determines whether the coating survives the render's own movement. And resistance to algae and mould determines how the facade looks after three wet winters.

A specification that names those four is a specification that can be checked. A specification that names a colour and a brand is a purchase [1](https://www.sto.de/) [5](https://www.beuth.de/de).

## Adhesion testing

On an existing coating, adhesion is tested rather than assumed.

A cross-cut test or a simple pull with tape on a cleaned area shows whether the old film is sound enough to receive a new one. Where it lifts, the old coating is removed or a compatible system is specified.

Where the existing coating is unknown, which is common on older German buildings, the test is the only reliable method and it costs an afternoon.

## Algae and dirt, honestly assessed

Algae resistance is a real product property and it is not a guarantee.

The honest position, which German technical guidance supports, is that a coating with a preservative film reduces growth and that no coating prevents it on an elevation that stays wet. The variable that matters most is water: rainwater running off a detail, a leaking gutter, or a surface that never dries because vegetation shades it.

A quality record that notes the exposure of each elevation is therefore more useful than a promise about a product.

## Defects and what they indicate

Six defects recur, and each points at a stage.

Blistering indicates water behind the coating, usually from a detail or from an application over damp render. Flaking in sheets indicates adhesion failure, usually from chalk or dirt left under the coating. Crazing and hairline cracking indicate a render that is too stiff or a coating without crack bridging. Chalking indicates binder breakdown from ultraviolet light. Algae or mould indicates a surface that stays wet. And dirt pick-up indicates a surface that has become rough through weathering.

None of those six is diagnosed by looking at the paint alone.

## Uniformity and the texture question

Facade texture is a design decision and a quality variable at the same time.

A fine render shows every deviation in the plane and every patch. A coarse texture hides both, which is why repairs on textured facades are easier to conceal and why fine facades are more expensive to keep uniform.

Where repairs have been made on a fine facade, the coating has to bridge a tone difference rather than hide a texture difference, and the honest remedy is often to coat a whole elevation rather than a patch.

## Insulated facades and system approval

On an external wall insulation system the quality question extends to the system.

The render, base coat, mesh, fixings and coating are an approved assembly, and a repair that substitutes a component breaks the approval. Where damage extends into the insulation, the repair belongs to a system-approved contractor rather than to a painter [7](https://www.dibt.de/).

That constraint is not bureaucracy: an insulated facade works as an assembly, and a mismatched patch is where water gets in and where the next failure starts.

## Evidence worth keeping

The record for a facade job is: photographs of each elevation before and after, moisture readings, the repairs carried out, the products used with their classes and colour codes, and the dates.

That record answers the two questions that arrive later, which are whether the facade met its specification and what is on it. It is also what a warranty discussion needs in order to be a discussion rather than an argument.

## What good looks like in five years

A facade coated correctly, with its details in order, looks almost unchanged in five years apart from some fading on the sunniest elevation and possibly a green tint at the base of a north wall.

A facade coated over unaddressed defects looks worse than it did before the work, because the new coating fails in patches and against a clean background. That contrast is the visible difference between assessment and assumption.

## Comparing two quotations

Two quotations for the same facade will usually differ in four places, and knowing them makes the comparison honest.

The extent of the cleaning, since a wash and a biocide treatment are different items. The extent of the render repair, which is where a cheap quote hides. The primer, which is either specified or not. And the number and thickness of coats.

A quotation that names those four can be compared with another. One that names a colour and an area cannot.

## Sample areas on facades

A sample area on a facade serves two purposes: it agrees the appearance and it tests the substrate.

Two square metres per elevation, prepared and coated as specified, show how the coating covers the render's texture and whether the repairs are hidden. Left through a season they also show whether the system holds, which is more evidence than any data sheet.

On a large facade the sample is worth the small cost several times over.

## The inspection from the ground

A facade is usually judged from the ground, in daylight, at a distance, and the checks should be made in those conditions.

Uniformity across each elevation, straightness at the edges of windows and downpipes, the absence of laps and drips, and the finish at the plinth and under the eaves. The details that took the longest to do are frequently invisible from there, which is why a photographic record of the details is worth making.

## Judging a colour in place

Colour on a facade is affected by the render's texture, the light on each elevation and the surrounding buildings.

A sample painted on the wall, viewed at different times of day and against the neighbours, answers a question that a card in a shop cannot. On a large facade the sample should be large, because a small patch of a strong colour reads quite differently when it covers a whole elevation.

## When the render is not the problem

A facade that looks patchy after rain may be telling you about the wall's drying rather than its finish.

Areas that stay dark for hours after rain are areas that are absorbing, and absorption usually concentrates where a detail is delivering water or where a repair has changed the surface. Watching a facade during and after rain is the most informative inspection available, and it requires nothing but a window.

## What a warranty should cover

A facade coating warranty typically covers the product and not the labour, and it is conditional on preparation and on the conditions of application.

That makes the preparation the practical warranty. Where a client wants protection, the useful questions are about what will be done before the coating and how the weather will be judged, rather than about the length of the guarantee.

## The insulation system's own checks

On an insulated facade, quality includes the system and not only the surface.

Fixings and adhesion are checked from the scaffold by tapping and by inspecting the board edges where accessible, and any soft or hollow area suggests a debond or a wet board. Render thickness over the mesh is checked at a few opened points where a repair is being made.

Those checks are the difference between renewing a coating on a sound system and coating a system that is quietly failing behind it.

## The record that protects a householder

A written record of what was specified, what was found and what was done is the householder's protection in any later disagreement.

It is also the only way to know, at the next cycle, whether a facade's condition has improved or deteriorated, since memory of a facade's appearance five years ago is unreliable and a photograph is not.

## Judging a facade in the rain

The most informative inspection of a facade happens during and just after rain.

Areas that stay dark for hours are areas that are absorbing, and absorption concentrates where a detail delivers water or where a repair changed the surface. Streaks show the water's path and point to the defect above.

An inspector with a camera on a wet afternoon learns more about a facade than a survey in dry weather, and the evidence is easy to record and to compare year on year.

## Documenting with photographs

Four photographs per elevation, taken from the same positions each cycle, create a comparison that no description can match.

The positions are worth recording: the same corner, the same distance, the same time of day. Over three cycles those photographs show fading, growth and repairs in a way that is immediately obvious and completely objective.

## One check that catches most problems

Stand at the corner of the building and look along each wall, close to the surface, with the sun or a light at a shallow angle.

Deviations in the plane, hollows left by repairs, and any area where the render has moved all show up immediately in that view. It takes a minute per elevation and it finds what photographs and distant views hide.

It is the same raking-light method used inside, applied to a wall that is far less forgiving.

## References

1. Sto.
2. Caparol.
3. Brillux.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Deutsches Institut für Bautechnik.
8. Wienerberger.
9. Putz.de.
10. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows a rendered Gründerzeit commercial and residential building, taken by Gunther Falchner and made available under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a large rendered facade of the kind this article's checks are applied to. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 9, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/Verputztes_Gr%C3%BCnderzeitwohn-_und_Gesch%C3%A4ftshaus_-_Meinhard-Grebendorf_Obere_Dorfstra%C3%9Fe_-_panoramio.jpg/1280px-Verputztes_Gr%C3%BCnderzeitwohn-_und_Gesch%C3%A4ftshaus_-_Meinhard-Grebendorf_Obere_Dorfstra%C3%9Fe_-_panoramio.jpg')
, ('de-exterior-render-paint-maintenance', 'Keeping a German Facade: Cleaning, Inspecting and Repainting', 'A German maintenance guide for rendered facades: annual inspection points, low-pressure cleaning, algae on north elevations, the repaint cycle, when render needs repair rather than paint, and the records worth keeping.', $wallarticle5$# Keeping a German Facade: Cleaning, Inspecting and Repainting

A German rendered facade asks for a small amount of attention regularly and a larger amount occasionally. The regular part is inspection and cleaning; the occasional part is repainting and render repair.

The whole maintenance philosophy follows from the fact that the render is the sacrificial layer. Protecting it is cheaper than replacing it, and inspecting it is how problems are found while they are still small.

## The annual inspection

One walk around the building a year, with binoculars for the upper elevations, finds most of what matters.

The items to look at: the base of each wall, where splash and damp show first. The sills and drips, which are where water enters. The area under downpipes and gutters. The north and west elevations, for algae. Any crack that has changed since last year. And the render around windows, where movement concentrates.

A note of what was found and a photograph of anything new creates a maintenance history at almost no cost.

## Cleaning

Cleaning is the cheapest form of facade maintenance and the one that most extends the life of a coating.

Dirt holds moisture against the surface and provides nutrients for growth. A wash with a mild detergent at low pressure, rinsed thoroughly, removes both. High pressure is avoided because it damages render and drives water into the wall.

Frequency depends on exposure: a facade under trees or near a road benefits from an annual wash, while a sheltered rural elevation may need one every few years.

## Algae and the north elevation

Green growth is the standard German facade problem and the treatment is a biocide wash rather than scrubbing.

The wash is applied, left for the stated time, and rinsed. Scrubbing without killing the organism spreads it, and painting over it feeds it.

Where growth returns every year, the cause is persistent wetting: a leaking gutter, a shaded elevation, a planter against the wall, or a coating that has lost its repellency. Correcting the wetting is what interrupts the cycle, and a hydrophobic treatment can help on a sound but absorbent facade [1](https://www.sto.de/).

## The repaint cycle

A facade coating in a German climate typically lasts around ten to fifteen years, with the sun-facing elevations going first and shaded elevations lasting longer but gathering growth.

The decision to repaint is made on condition: chalking that marks hands, colour loss, a surface that has become rough, and any area where the coating has failed.

Repainting follows the same chain as the first application in miniature: clean, repair, dry, prime the repairs, coat twice. A repaint over a dirty or chalky facade fails faster than the coating it replaced.

## When the render needs repair rather than paint

The distinction is the most important judgement in facade maintenance.

A facade that is sound but faded needs paint. A facade with hollow patches, cracks that have widened, or areas where the render has lost its key needs repair before paint, and coating over it wastes the coating.

The test is the tap and the crack: hollow sounds and cracks wider than hairline are repair items. Where the render is friable to the touch, the surface is failing and the repair is larger than a patch.

## Cracks and what they mean

Fine hairline crazing across a render is normal and is controlled by a coating with crack-bridging ability.

A single crack that runs diagonally from a corner of an opening suggests movement at a weak point and is repaired with mesh and a matched mortar. A horizontal crack along a floor line or at a junction between substrates is a movement joint and should be treated as one rather than filled solid.

A crack that widens year on year is asking for a structural opinion, and filling it repeatedly is a way of paying for the same information twice.

## The base of the wall

The plinth zone deserves its own paragraph because it fails first and most.

Splash from the ground, de-icing salt in winter, and snow piled against the wall all attack the render at the base. A plinth coating with higher water resistance is the German detail, along with a splash zone of paving or gravel that keeps water away from the wall.

Where the render at the base is crumbling, the cause is often a raised ground level bridging the damp-proof course, and correcting the level is the repair rather than re-rendering the plinth.

## Insulated facades in maintenance

An external wall insulation system adds two maintenance items: the render's impact resistance and the system's integrity.

Dents and punctures are repaired with system-compatible materials, and any damage that exposes the insulation is repaired promptly because a wet insulation board loses its performance and can support growth.

Cleaning is done gently, and the coating is renewed with a system-approved product so that the assembly stays as approved [7](https://www.dibt.de/).

## Making a facade last

Three habits separate a facade that lasts from one that is repeatedly repaired.

Wash it before it looks dirty. Repair a detail when it is small, especially sills, drips and joints. And repaint at the first sign of chalking rather than at the first sign of failure.

None of those is skilled work, and each of them postpones the expensive intervention by years.

## Records and the resale conversation

A facade with a documented maintenance history is a materially better asset than one without.

The file should hold the products and colour codes of the last coating, the repairs carried out, photographs of each elevation at each cycle, and any system documentation for an insulated facade. A buyer's surveyor will ask for exactly that.

A one-page summary per cycle is enough, and it takes less time to write than the first conversation about it will take without one.

## Washing a facade without damaging it

The method matters more than the chemistry, and the rules are short.

Work from the bottom upward when applying detergent, so that streaks do not run down clean areas, and rinse from the top down. Keep pressure low enough that the render is not disturbed, and keep the nozzle moving so that no one spot takes the full flow.

On a historic or lime render the pressure is lower still, and on a very soft surface the answer is a brush and a hose rather than a machine. The damage from over-washing shows as a roughened surface that gathers dirt faster than before, which is the opposite of the intention.

## Gutters, downpipes and the details that wet walls

Most facade staining starts above the facade. An overflowing gutter, a leaking joint, a downpipe discharging against the wall, or a defective flashing all deliver water to a surface that was not designed for it.

Clearing gutters twice a year and checking the joints after the first autumn storm is a ten-minute task with a disproportionate effect. Where a green streak runs down an elevation, the streak marks the water's path, and following it upward usually finds the defect.

That is the cheapest diagnostic in facade maintenance, and it costs nothing but a look.

## Scaffolding as a maintenance opportunity

Scaffolding is the expensive item in facade maintenance, and while it is up the opportunity should be used.

Gutters, flashings, sills, drips and the render around windows can all be inspected and repaired with the scaffold in place at a fraction of the cost of returning for each item. A job planned around the scaffold rather than around the painting alone costs less in total, even when it includes work that could have waited.

## The five-year plan for a facade

Rather than reacting to failures, a facade can be maintained on a simple cycle.

Year one wash, year two wash and inspect the details, year three wash and treat any early growth, year four wash and re-establish the plinth zone protection, year five review the coating's condition and plan the repaint.

That cycle costs a small amount each year, keeps the facade looking maintained, and means the repaint arrives as a planned event rather than as an emergency. German housing associations work to similar cycles for exactly that reason.

## When to call a specialist

Three facade conditions need more than a painter: a render that is hollow over large areas, water appearing inside the building at a detail, and any damage that exposes insulation.

In each case the work is a system repair rather than a coating, and the coating follows afterwards. Calling a painter first in those situations produces a coated facade with the problem intact underneath, which is the most expensive outcome in this topic.

## A final practical note

Nothing in this maintenance article requires a specialist. A wash, a clearing of gutters, a note of what was found and a photograph each year will keep a rendered facade sound for decades.

The specialist skills are needed when something is already wrong, and the whole point of the routine is to make that moment later and smaller.

## What a facade cycle costs over thirty years

Over thirty years, a rendered German facade will see roughly two to three coating cycles, one render repair and probably one detail overhaul.

The proportion spent on coatings is small, and the proportion spent on repairs is dominated by how early the details were maintained. A facade maintained annually costs less over thirty years than one repaired when it fails, and the difference is largely the cost of scaffolding and access rather than of materials.

That is the practical argument for the routine in this article, and it is the same argument in every market.

## Handover between owners

When a German house changes hands, a facade maintenance file is a genuine asset.

It answers the buyer's questions about age, products and repairs, and it prevents the new owner from repeating a treatment that has already failed. Where a file does not exist, the first cycle after purchase usually includes a survey that the file would have made unnecessary.

## A note on expectations

A rendered facade in Germany is expected to last decades and to need recoating within fifteen years. That is the realistic baseline.

Anything shorter usually means a defect in the details or a coating applied over a wet or dirty surface. Anything longer is possible on a sheltered elevation with a good system, and it is a bonus rather than a plan.

## Six questions before commissioning facade work

What will be done to clean the facade, and at what pressure. Which render repairs are included, and what material will be used. Which primer, and why that one. How many coats, and at what coverage. What happens if it rains. And what will be recorded at handover.

A contractor who answers all six specifically is working to a method. The answers also become the standard against which the finished facade is judged, which is the quiet purpose of asking.

## References

1. Sto.
2. Caparol.
3. Brillux.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Deutsches Institut für Bautechnik.
8. Wienerberger.
9. Putz.de.
10. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows a rendered timber frame house built in 1680 in Eschwege, taken by Gunther Falchner and made available under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows an old rendered facade whose maintenance cycle this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 9, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Verputzter_Fachwerkr%C3%A4hmbau_-_1680_von_Justus_Henrich_Knierim_gebaut_-_Eschwege_Vor_dem_Berge_12_-_panoramio.jpg/1280px-Verputzter_Fachwerkr%C3%A4hmbau_-_1680_von_Justus_Henrich_Knierim_gebaut_-_Eschwege_Vor_dem_Berge_12_-_panoramio.jpg')

) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='DE' AND t.candidate_key='assembly:de-exterior-render-paint'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='DE' AND t.market_code='DE'
  AND t.candidate_key='assembly:de-exterior-render-paint'
  AND a.wall_topic_id=t.id AND a.wall_market_code='DE' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
