-- Fifth CA batch: five researched draft articles for the native Canadian exterior masonry paint topic.
-- Articles remain drafts; publication/review gates are not bypassed.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, attributed), never AI generated.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='CA' AND candidate_key='assembly:ca-exterior-masonry-paint') THEN RAISE EXCEPTION 'CA exterior masonry paint topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Dulux Canada','https://www.dulux.ca/','Dulux Canada','Exterior masonry coating systems, surface preparation and weather limits'),
  ('Benjamin Moore Canada','https://www.benjaminmoore.com/en-ca','Benjamin Moore','Exterior coating selection, primers and substrate preparation'),
  ('Sico','https://www.sico.ca/','Sico','Canadian exterior paint products, coverage and application guidance'),
  ('Cement Association of Canada','https://www.cement.ca/','Cement Association of Canada','Masonry, render and concrete substrate behaviour in Canada'),
  ('National Research Council Canada, Codes Canada','https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada','NRC Canada','The National Construction Codes as the model code system for Canadian buildings'),
  ('National Research Council Canada, Codes Canada publications','https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications','NRC Canada','Published model codes and their adoption by provinces and territories'),
  ('Natural Resources Canada, Energy efficiency for buildings','https://natural-resources.canada.ca/energy-efficiency/buildings','NRCan','Envelope performance and moisture behaviour of exterior walls'),
  ('Canada Mortgage and Housing Corporation, housing professionals','https://www.cmhc-schl.gc.ca/en/professionals','CMHC','Canadian housing practice, exterior durability and moisture guidance'),
  ('Ontario Regulation 332/12 (Ontario Building Code)','https://www.ontario.ca/laws/regulation/120332','Government of Ontario','A provincial adoption of the model code, showing how requirements reach the site')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='CA' AND t.candidate_key='assembly:ca-exterior-masonry-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: White painted brick walls (macrolepis, CC BY 3.0)','https://commons.wikimedia.org/wiki/File:White_painted_brick_walls_-_panoramio.jpg','Wikimedia Commons','Cover photograph overview article, CC BY 3.0'),
  ('Image credit: Painted brick wall, Kronstadt (Intero Tillen, CC0)','https://commons.wikimedia.org/wiki/File:Painted_brick_wall,_Kronstadt.jpg','Wikimedia Commons','Cover photograph materials article, CC0'),
  ('Image credit: Pressure washing a wall (Retired electrician, CC0)','https://commons.wikimedia.org/wiki/File:Moscow,_spring_pressure_washers,_Apr_2026_01.jpg','Wikimedia Commons','Cover photograph installation article, CC0'),
  ('Image credit: Brick wall with flaking paint (Acabashi, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Brick_wall_with_flaking_paint_in_St_Peters_Broadstairs_Kent_England.jpg','Wikimedia Commons','Cover photograph quality article, CC BY-SA 4.0'),
  ('Image credit: Repainting a building exterior (Payton Chung, CC BY 2.0)','https://commons.wikimedia.org/wiki/File:Repainting_(2493643341).jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY 2.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='CA' AND t.candidate_key='assembly:ca-exterior-masonry-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'CA',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='CA' AND t.candidate_key='assembly:ca-exterior-masonry-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'CA','CA',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('ca-exterior-masonry-paint-overview', 'Exterior Masonry Paint in Canada: The Coating and the Wall', 'A Canadian overview of painting exterior masonry: what brick, block and render need from a coating, how freeze-thaw and salt decide performance, and the chain from washing to the second coat.', $wallarticle1$# Exterior Masonry Paint in Canada: The Coating and the Wall

Painting a masonry wall looks like painting any other wall and is not. Brick, block and render are porous, alkaline, and often still drying out months after they were built, and they sit through a Canadian winter of freeze-thaw cycles that punishes any film that cannot move with its substrate.

The coating is only half of the system. The other half is what the wall is made of and what state it is in, and the failures that people blame on paint are usually failures of understanding that half.

## Why paint masonry at all

Masonry has been left bare for centuries, and there is a respectable argument that unpainted brick should stay that way. The case for painting is usually one of appearance, uniformity and repair: a wall that has been patched, extended or mixed in its brickwork reads as one surface when it is painted.

The case for paint as weather protection is real and narrower than the marketing suggests. A coating that adheres and breathes adds a sacrificial layer that takes the weather instead of the masonry, and it slows the wetting that drives freeze-thaw damage. A coating that seals the wall and traps water accelerates exactly the decay it claims to prevent.

That distinction, breathable versus sealed, is the single most important idea in this article and the reason product selection matters less than most people assume and surface preparation matters more.

## The substrates, and how they behave

Brick is fired clay and is porous but stable. Mortar joints are softer than the brick and absorb water, which is why joints are usually the first place a painted wall fails.

Concrete block is more absorbent and more alkaline than brick, and it holds construction moisture for a long time. Render, the cement or lime-based coating over block or brick, has its own porosity and its own tendency to crack at movement joints.

Precast concrete panels and fibre cement boards behave differently again, with smoother faces and different suction. Each substrate takes a coating, but the primer and the preparation are not the same, which is why a single generic approach produces patchy results.

## The Canadian climate as the real specification

Three seasonal forces decide whether a coating survives in Canada. The first is freeze-thaw: water that enters the wall and freezes expands, and repeated cycles spall the face of the masonry.

The second is salt, both from coastal air and from de-icing salt splash on lower walls, which accelerates surface breakdown and is unforgiving of any coating that is not fully adhered.

The third is ultraviolet exposure combined with wetting, which breaks down the binder in a coating and produces chalking, the powdery deposit that runs down a wall and marks whatever it touches.

Coating literature for the Canadian market is written around those forces rather than around aesthetics, which is worth remembering when a colour is being chosen before a product.

## The chain

Exterior masonry painting is a five-stage chain: wash, repair, allow to dry, prime or stabilise, and apply two coats.

Washing removes dirt, mould and chalk. Repair addresses cracks, spalled areas and failed mortar. Drying is the stage that cannot be rushed and the one most often skipped. Priming equalises suction and stabilises a friable surface. The finish coats provide colour and the weather film.

Each stage has a failure that belongs to it, and the diagnostic value of that is considerable: flaking paint at the base of a wall is usually a washing and suction problem, while blistering in patches is moisture coming from behind.

## When not to paint

Some walls should not be painted, and a professional should say so. Solid brickwork of a certain age that was designed to dry by evaporation is one; a wall with an active damp problem is another; a wall whose paint is already failing across its whole face is a third, because the correct answer is removal rather than another coat.

Where a wall is heritage, or where it is part of an assembly that depends on drying outward, the decision belongs with someone who understands the wall rather than with a colour card.

Canadian housing guidance treats exterior finishes as part of a moisture strategy rather than a decorative one, and that framing is the right one to bring to this decision [8](https://www.cmhc-schl.gc.ca/en/professionals).

## What the code has to say

Exterior finishes in a Canadian house fall within the model codes and their provincial adoptions, mainly in relation to moisture control, clearances and the performance of the enclosure rather than to paint as such [5](https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada).

The parts that matter in practice are the ones that decide whether the wall stays dry behind the finish: the roof overhang, the flashing, the grade, the drainage and the eaves. Those are code and good-practice items, and no coating compensates for them [6](https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications) [9](https://www.ontario.ca/laws/regulation/120332).

## What the later articles cover

Materials deals with coating families, primers and repair products. Installation follows the work from washing to the second coat, including weather windows. Quality covers the checks that predict whether the coating will still be there in ten years. Maintenance covers washing, repainting and the failures that indicate water rather than paint.

The thread is that a masonry coating is judged by its adhesion and its breathability long after its colour has been forgotten.

## What paint does to a masonry wall, physically

A coating on masonry is a thin, semi-permeable membrane. It reduces the rate at which rain wets the wall and the rate at which the wall dries, and the two effects are not equal.

Rain arrives fast and in quantity; drying is slow and continuous. A coating that halves the wetting rate but also halves the drying rate changes the wall's moisture balance only marginally, which is why breathability matters more than waterproofing on solid masonry.

A coating that stops wetting almost entirely and also stops drying shifts the balance decisively, and the wall accumulates water season after season. That is the mechanism behind most of the spalling that gets blamed on frost.

## Why the first paint is a decision, not a default

Painting a wall commits the owner to a maintenance cycle and forecloses the option of leaving the masonry exposed. That is a real cost and it deserves a real decision.

Where the wall is a modern cavity wall with a brick outer leaf, paint is largely cosmetic and the cavity handles the water. Where the wall is solid brick or stone, paint changes how the wall manages moisture, and the choice of coating becomes a building-physics decision rather than a decorating one.

Making that distinction before the first coat is applied is worth more than any advice about brands.

## What a householder should expect

Realistically, a properly applied exterior masonry coating on a Canadian house gives a decade or more of service, with an annual wash and occasional touch-ups.

It will chalk slowly on the sun-facing elevations. It will gather algae on the shaded ones. It will need the sealant at windows renewed before it needs repainting. None of that is failure; all of it is the maintenance any exterior finish asks for.

## Regional differences across Canada

Exterior coating practice varies with the coast and the climate rather than with the province.

On the Atlantic and Pacific coasts, salt air and wind-driven rain make adhesion and breathability the dominant concerns, and coatings are chosen for their tolerance of a wall that is wet more often. In the prairie interior, ultraviolet exposure and the sheer range of temperature are the drivers, and chalking becomes the visible failure. In central Canada, freeze-thaw cycles and de-icing salt at ground level do most of the damage.

The material choices do not change much between regions. The emphasis does, and a specification that suits one region is not automatically right for another.

## The coatings market in Canada

Exterior masonry products sold in Canada come from a small number of manufacturers with national distribution, which means the same product families are available across the country.

That is convenient and it has one consequence worth noting: the advice on a tin is written for a national market, and local conditions can be more severe than the label assumes. Where a wall is unusually exposed, the conservative choice is the more permeable product applied in more coats, rather than a heavier film.

## The question of repainting an unpainted wall

Older masonry that has never been painted is a different proposition from masonry that is being refreshed.

On an unpainted wall the first coat must bond to a porous mineral surface whose suction is unknown, and the preparation has to establish that suction before anything else is decided. A mist coat or a primer is the usual answer, and the first coat should be checked to confirm it has bonded before the second is applied.

One-way commitments are worth stating plainly: once a wall is painted, it stays painted. The decision is easier to make correctly at the start than to reverse later.

## Common assumptions worth correcting

Three assumptions recur in homeowner conversations about masonry paint, and each is wrong in a way that costs money.

The first is that a thicker coating protects better. A thicker film that cannot breathe protects the paint and harms the wall. The second is that sealing the wall stops damp. Damp comes from the ground, from leaks and from condensation, and a sealed face can make all three worse. The third is that a premium product compensates for preparation. It does not, and the premium is wasted on a chalky surface.

Correcting those three before a project begins prevents most of the disappointment that follows it.

## A note on what this series does not cover

Two adjacent subjects belong to other topics in this library and are not repeated here.

Interior masonry and plaster finishes have their own article sequence, because the substrates, the products and the inspection standards differ. Roofing and above-wall waterproofing sit outside the wall-finishing scope, although they decide the fate of a painted elevation as much as any coating does.

Where a wall fails because of a roof detail, the remedy is a roofing repair and the coating work waits until the wall is dry again. Knowing the boundary is part of specifying honestly.

## The one-line summary

If a single sentence had to carry this topic, it would be this: masonry needs a coating that keeps rain out and lets vapour out, applied to a wall that is clean, sound and dry.

Every product decision, every preparation step and every maintenance routine in the following articles is an application of that sentence.

## References

1. Dulux Canada.
2. Benjamin Moore Canada.
3. Sico.
4. Cement Association of Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows white painted brick walls, taken by macrolepis and made available under CC BY 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows masonry carrying a full painted finish. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 9, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/White_painted_brick_walls_-_panoramio.jpg/1280px-White_painted_brick_walls_-_panoramio.jpg')

, ('ca-exterior-masonry-paint-materials', 'Masonry Coatings, Primers and Repair Products', 'A Canadian materials guide for exterior masonry painting: acrylic and elastomeric coatings, silicate and mineral paints, stabilising primers, repair mortars, crack fillers and the products that treat efflorescence.', $wallarticle2$# Masonry Coatings, Primers and Repair Products

The products for exterior masonry divide into four families: coatings, primers and stabilisers, repair materials, and the treatments for the specific problems masonry produces. Choosing within each family is straightforward once the substrate and its condition are understood.

## Acrylic masonry coatings

Water-based acrylic masonry paint is the mainstream product on the Canadian market, and for most walls it is the right choice. It adheres well to masonry, stays flexible enough to accommodate normal movement, and is vapour-permeable enough to let the wall dry outward.

Products differ in binder content and in flexibility. A high-build acrylic gives better obliteration and a thicker film; an elastomeric product is formulated to bridge small cracks by stretching with the wall, which suits rendered surfaces with a history of hairline cracking.

The trade-off with elastomerics is that a thicker, more flexible film is less breathable than a thin acrylic, so they belong on walls that crack rather than on walls that stay wet.

## Silicate and mineral paints

Silicate paints bond chemically with mineral substrates rather than forming a film on top of them, and they are highly vapour-permeable. They are the traditional answer for masonry that must keep drying outward, and they remain available in Canada for that reason.

The application requirements are stricter: the substrate must be mineral, absorbent and clean, and the working method differs from a latex paint. Where those conditions are met, a silicate coating is the most sympathetic finish available for an older wall.

## Limewash and the heritage case

Limewash is the oldest coating in this library and still the correct one on some historic masonry, where any film-forming paint would trap moisture in a wall designed to breathe. It is applied thin, in several coats, and it wears rather than peels.

Its practical disadvantages are real: it chalks onto clothing, needs recoating more often than a modern paint, and requires a skill that is no longer common. Where it is right, nothing else performs as well.

## Primers and stabilisers

The primer's job on masonry is to equalise suction and to bind a chalky or friable surface so that the finish coat has something to hold.

A stabilising solution is used where the surface is powdery and cannot be removed by washing. It penetrates and consolidates rather than coating, and it must be allowed to cure before painting, because a stabiliser that is still tacky will fail under the finish.

On highly absorbent block, a thinned first coat or a specific masonry primer controls suction so that the finish coat does not dry too fast and lose adhesion.

## Repair materials

Cracks are filled with a material that matches the movement of the wall. A rigid filler in a moving crack simply transfers the crack to the paint film above it.

Small cracks take an acrylic or flexible filler. Wider cracks, and cracks at joints, may need a fabric reinforcement bedded into the filler. Spalled areas and missing mortar are repaired with a mortar matched to the existing one in strength and colour, because a hard repair mortar beside a soft historic brick causes the brick to erode instead.

## Treating efflorescence

Efflorescence is the white salt deposit that appears when water moves through masonry and evaporates at the surface. It is a symptom, and the treatment follows from that.

The deposit is brushed off dry, never washed back into the wall. The source of the water is investigated: a leaking gutter, a bridged damp course, a planter against the wall, or a coating that is trapping moisture. Only when the wall is dry and the salt has stopped appearing should a coating be considered.

Sealing efflorescence in with paint is the standard way of converting a cosmetic problem into a spalling one.

## Biocide washes and mould

North-facing walls in Canada gather algae and mould, particularly under trees and on shaded elevations. A biocide wash removes it and, more importantly, kills the organism so that it does not return through the new paint.

The wash is applied, allowed to work for the specified time, and rinsed thoroughly. Rinsing is the step that is often skimped and it is the one that matters, because residue left on the wall interferes with adhesion.

## Application products, and one that is forgotten

Brushes, rollers and spray equipment all work, and the choice follows the texture. A rough render takes a large roller or a spray; a smooth panel takes a short-nap roller.

The forgotten product is the sealant at junctions: where masonry meets a window frame, a downpipe or a different material. A flexible exterior sealant there prevents the water entry that would otherwise undermine the coating at its most vulnerable point.

## Storage and the Canadian season

Exterior paint should not be applied below the temperature on the label, and in Canada that closes the season for water-based products somewhere in the autumn.

Storage matters too. A tin that has frozen in a garage is compromised, and using it in spring is a false economy. Buying for the job rather than for the shelf avoids the problem.

## How much product, and why coverage varies

Coverage figures on a masonry coating tin assume a smooth, sealed surface, and masonry is rarely either.

Rough render, porous block and open-textured brick all take more paint than the label suggests, sometimes by half as much again. The practical approach is to calculate from the area, add a margin for texture, and buy for the first coat generously because a starved first coat is the most common cause of a patchy finish.

Keeping a litre back for touch-ups is worth more than saving it on the invoice.

## Colour, heat and the wall's own moisture

Colour choice on masonry is usually an aesthetic decision with one physical consequence worth knowing.

A dark coating absorbs solar heat, which drives moisture in the wall outward more aggressively. On a wall that is already damp, that can produce blistering in the first sunny week after application. On a sound wall it is simply warm.

Light colours reflect and show dirt less on chalky deposits but more on algae. In Canada, the practical advice is to choose the colour after the moisture question has been settled, not before.

## Primer or no primer

The question of whether to prime is answered by the substrate rather than by preference.

Chalky, friable or highly absorbent surfaces need a stabiliser or a primer. Previously painted walls in sound condition may need only spot priming at repairs. New render and new block, both alkaline and absorbent, usually need a primer or a mist coat to control suction.

Skipping a necessary primer saves a small percentage of the material cost and risks the entire job.

## How coatings fail, in material terms

Understanding why coatings fail in material terms makes product selection less arbitrary.

Ultraviolet light breaks the polymer chains in a binder, and the broken fragments leave the film as chalk. Water entering the film from behind pushes it off the substrate, which is blistering. Alkali from fresh concrete or cement render attacks some binders, which is why new masonry needs a period of weathering or a specific primer. Movement beyond the film's elasticity produces cracking, which then admits water.

Each mechanism maps to a product choice: chalk resistance to binder quality, blister resistance to permeability, alkali resistance to primer selection, and crack resistance to elasticity.

## The one product that is not paint

The most important item in a masonry coating specification is often not a coating at all but the sealant at junctions.

Where masonry meets timber, metal or uPVC, movement is inevitable and the sealant absorbs it. A coating applied over a joint that has no sealant will crack there, and the crack will let water into the wall at the point where the detailing is most difficult.

Specifying the sealant, and replacing it on a schedule, is cheaper than any coating upgrade.

## Reading a technical data sheet

The sheet carries four numbers that decide most of the outcome: the minimum application temperature, the recoat time, the coverage rate and the drying time to rain resistance.

Those four are the practical specification. A product with a wide temperature window suits a Canadian autumn; one with a fast recoat time keeps a two-coat job inside a weather window; a realistic coverage rate prevents starvation; and a stated rain resistance time tells the painter how long the wall must be left alone.

Everything else on the sheet is useful and secondary to those four.

## Admixtures, additives and honest claims

Coating marketing uses a vocabulary of additives: silicone for water repellency, fungicide for growth resistance, fibres for crack bridging.

Each has an effect and none replaces preparation. A silicone-enhanced coating applied over chalk fails as a silicone-enhanced failure. A fungicide keeps a coating free of growth only while the wall behind is not wet.

The realistic position is that additives improve a coating that was correctly applied and do very little for one that was not.

## The repair materials most jobs need

Three repair products cover most masonry situations: a flexible acrylic filler for hairline cracks, a mortar-matched repair material for spalled areas and open joints, and a fabric or mesh for cracks that are likely to move again.

Buying them at the same time as the coating is a small convenience with a large effect, because a wall that is being washed and painted is the moment when small repairs are cheap.

## Sampling before buying

A wall is not a colour card, and masonry in particular changes what a colour looks like.

The practical method is a sample panel of a square metre, coated in the chosen product, viewed at different times of day. Lime-based and cement-based substrates shift the appearance of light colours noticeably, and a colour chosen indoors on a small chip is frequently a surprise outdoors.

The cost of a sample is negligible compared with a repaint.

## Tools that make the difference

Four tools carry most of the quality on a masonry repaint: a stiff brush for working coating into texture, a long-pile roller for rough render, a stabilising brush or sprayer for the biocide wash, and a hose with enough reach to rinse properly.

The hose is the humblest and the most important. Rinsing residue from a biocide wash is the step that decides adhesion on a wall that has been cleaned, and a bucket of water is not a rinse.

## Buying for the whole cycle

Buying a little more than the job needs, and storing what is left in a frost-free place with its label intact, pays back at the first touch-up.

The touch-up will come, usually at a doorway or a corner where something was carried past, and having the exact product is the difference between a two-minute repair and a trip to a paint shop to guess at a match.

## References

1. Dulux Canada.
2. Benjamin Moore Canada.
3. Sico.
4. Cement Association of Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows a painted brick wall in Kronstadt, taken by Intero Tillen and released under CC0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows paint film sitting on a masonry substrate. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 8, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Painted_brick_wall%2C_Kronstadt.jpg/1280px-Painted_brick_wall%2C_Kronstadt.jpg')
, ('ca-exterior-masonry-paint-installation', 'Washing, Repairing and Coating a Masonry Wall', 'A Canadian installation sequence for exterior masonry painting: washing and biocide treatment, crack and spall repair, drying, stabilising primer, weather windows, and the two finish coats.', $wallarticle3$# Washing, Repairing and Coating a Masonry Wall

Almost all of the work in painting exterior masonry happens before the first brush touches the wall. Washing, repairing and drying are the stages that decide whether the coating is still there in ten years, and they occupy most of the schedule.

This article follows the sequence for a Canadian exterior, from the first wash to the final inspection.

## Washing

Washing removes the three things that prevent adhesion: dirt, biological growth and chalk from an old coating.

Pressure washing is effective and must be used with judgement. Too much pressure on soft brick, on render or on mortar joints drives water into the wall and erodes the surface, and a wall washed too hard takes days longer to dry. A fan tip held at a distance, working downward, is the right technique.

Where growth is present, a biocide wash follows and is rinsed thoroughly. Rinsing is not a formality; residue left behind is a bond breaker.

## Repair

Repair covers cracks, spalled brick faces, failed mortar joints and damaged render.

Cracks are opened slightly, cleaned and filled with a flexible filler, with fabric reinforcement where movement is likely. Spalled areas are cut back to sound material and rebuilt with a repair mortar matched to the substrate. Failed mortar is raked out and repointed to the depth and profile the wall needs.

The principle throughout is matching: a repair that is harder or denser than the surrounding masonry pushes the next failure into the original material.

## Drying

Drying is the stage that cannot be compressed and the one most often overruled by a schedule.

A washed wall needs time, and a repaired wall needs more, because the repair materials bring their own water. The check is a moisture meter at several points, not a hand on the surface: masonry can look dry and still hold enough water to fail a coating.

In a Canadian autumn, drying time lengthens as temperatures fall, and a wall that would dry in two days in July may need a week in October. That reality should be in the programme rather than discovered on site.

## Priming and stabilising

Primer is applied to equalise suction and to bind a friable surface. On a chalky wall a stabilising solution goes on first and must cure fully before any coating.

On very absorbent block, a primer or a thinned first coat prevents the finish coat from drying too fast. On previously painted walls in sound condition, a primer may be needed only over the repairs, which are spot primed and feathered in.

The test that matters is simple: rub the dry surface with a dark cloth. Chalk on the cloth means the surface needs stabilising before anything else happens.

## Weather windows

Exterior coating is applied within a window defined by air temperature, substrate temperature, humidity and the prospect of rain.

Water-based masonry coatings are typically applied above about ten degrees Celsius, and substrate temperature matters as much as air temperature because a cold wall slows film formation. Rain within the drying period damages a fresh coat, and wind accelerates drying in a way that can cause the film to skin before it has bonded.

The practical method is to work in elevations, starting on the elevation that will be in shade when the sun is on the others, and to watch the forecast for the full drying period rather than for the application hour.

## Application

Two coats are the norm for a colour change or a first paint, and the second follows the manufacturer's recoat interval rather than "when it looks dry".

Application begins at the top of an elevation and works down, so that runs are caught and so that the finish is uniform. A brush works the coating into the texture; a roller speeds coverage on flatter surfaces; spraying suits large areas and requires back-rolling to work the coating into the surface.

Windows, doors, downpipes and adjacent surfaces are masked, and the sealant joints are checked before the first coat rather than after, because a failed seal painted over is still a failed seal.

## Edges, details and the parts people forget

The details decide how the job looks and how long it lasts. The junction between wall and ground is where splash and rising damp attack, and it is where cheap work shows first. The tops of walls and parapets need coating on the coping faces and under the drips.

Window reveals, sills and the underside of any projection are where water collects, and they are the parts most often left half-painted. A reveal painted down to the frame with a proper edge and a sealed junction is the difference between a professional job and a coat of paint.

## Inspection at completion

The final inspection is done in daylight, from a distance and close up.

From a distance the question is uniformity: laps, patches and colour variation. Close up the question is coverage: texture that is still visible as bare masonry, missed edges, and coating that has been applied too thin over a porous patch.

Any defects found at this stage are corrected with the same product and the same method, because a touch-up with a different sheen or a different dilution is visible for years.

## Handover, and the first winter

The wall leaves the painter's hands and immediately meets a Canadian winter, which is the real test. A coating that survives its first freeze-thaw season intact will usually survive many.

The useful handover note is a short one: the products used, the date, the number of coats, and the advice to look at the wall in spring for any area that has blistered or lost adhesion. Early action on a small area costs a morning; late action costs a season.

## Access, safety and the practical constraints

Exterior masonry work happens at height, and access decides both the method and the risk.

Ladders suit a single elevation and short reaches; scaffolding or a tower is needed for a full house. Working at height with a paint kettle is a genuine hazard, and the safe method usually costs less than the injury it prevents.

Ground protection matters as much as access. A coating that lands on paving, on a car or on a neighbour's wall is a problem the painter owns, and drop sheets and masking are cheaper than a claim.

## Working with the sun

Sun is the variable that most affects a water-based coating on masonry. A wall in direct sun can be far hotter than the air, and a coating applied to it skins before it bonds.

The professional method is to follow the shade around the building, starting on the elevation that will be shaded when the sun is at its strongest. On a hot day that can mean an early start and a long midday break, which is a schedule reality rather than an inconvenience.

## After the second coat

The last checks are made while the coating is still fresh: any missed patch, any drip, any place where the masking was imperfect.

Then the masking comes off, ideally while the coating is still soft at the edge, so that the line breaks cleanly rather than peeling a strip of new paint off the wall.

## Spray, brush or roller

The application method changes the appearance as well as the speed.

Brushing works the coating into texture and produces a slightly stippled finish that hides irregularities. Rolling is faster on flat surfaces and leaves a light texture of its own. Spraying is fastest and requires back-rolling on textured masonry so that the coating is worked in rather than sitting on the surface.

The practical rule is to spray on large flat elevations, roll on medium texture, and brush the details. Mixing methods on one elevation shows, so the method is chosen for the whole face.

## Weather windows and the season

The Canadian exterior season is short, and the constraint is substrate temperature rather than air temperature.

A wall in shade in October can be several degrees colder than the air, and a coating applied to it will not form a film properly even on a mild afternoon. The method is to measure rather than to assume, and to work the sun-facing elevations last when the days are shortening.

Rain in the first hours after application is the risk that ends most late-season jobs. Checking the forecast for the full drying period, rather than for the application window, is the professional habit.

## Sequence summary

Read as a whole the sequence is: survey, wash, biocide, rinse, repair, dry, check moisture, prime or stabilise, coat twice, inspect, hand over with a record.

Every stage has a test attached to it, which is what makes the method teachable. The survey produces a specification. The wash ends when water runs clear. The repair ends when the surface is sound and flush. The drying ends at a moisture reading. The prime ends when the surface is uniformly sealed.

A job organised around those tests is a job where the arguments happen early and the outcome is predictable.

## Working around windows and services

Windows, doors, vents, lights and downpipes are where masking, sealant and cutting in meet.

The sequence is to check the sealant first, renew it where it has failed, and then mask. Painting over a failed seal leaves a defect hidden for years, and renewing it after the paint is on means cutting the fresh coating.

Vents and outlets are removed where possible and masked where not, so that the coating does not bridge an opening that has to remain open.

## The handover conversation

The handover on an exterior coating job is short and should say three things: what was applied, when it will need attention, and what the householder should watch for.

That third item is the useful one. Chalking on the sunny side, algae on the shaded side, blistering at the base, and a sealant that has opened at a window are the four early signals, and each has a corresponding small action.

A householder told what to watch for in April usually catches things in May, and the coating lasts its full life.

## What to do if the weather turns

A weather change mid-job is normal, and the response is to stop at a coat boundary rather than mid-elevation.

A finished coat can be left for a fortnight without harm if it is clean and dry. A half-applied coat cannot, because the lap where the work stopped will remain visible and the uncoated area will weather differently.

Planning coats per elevation, rather than per day, is how a schedule survives a Canadian forecast.

## Two elevations, two different jobs

A single house rarely has one masonry condition. A north wall collects growth and stays damp; a west wall takes driving rain; a south wall chalks under ultraviolet.

Specifying per elevation rather than per house is what a good contractor does instinctively, and it is why a quote that treats a house as one uniform area is worth questioning. The preparation and sometimes the coating differ by face, and so does the amount of repair.

## References

1. Dulux Canada.
2. Benjamin Moore Canada.
3. Sico.
4. Cement Association of Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows a wall being cleaned with a pressure washer, taken by the Wikimedia Commons contributor Retired electrician and released under CC0. It is a real photograph, not AI generated, and it shows the washing stage that this article treats as the foundation of adhesion. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 9, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Moscow%2C_spring_pressure_washers%2C_Apr_2026_01.jpg/1280px-Moscow%2C_spring_pressure_washers%2C_Apr_2026_01.jpg')

, ('ca-exterior-masonry-paint-quality', 'Will the Coating Still Be There? Judging Exterior Masonry Paint', 'A Canadian quality framework for exterior masonry coatings: adhesion and moisture tests before painting, breathability, coverage and film build, the defects that predict failure, and the evidence worth keeping.', $wallarticle4$# Will the Coating Still Be There? Judging Exterior Masonry Paint

Exterior paint is judged years after it is applied, when the wall has been through several winters. The quality question at handover is therefore predictive: does this coating have what it needs to survive, and is there any reason to think it does not.

## The moisture test

The most useful single check before painting is the moisture reading of the wall. A coating applied over damp masonry will blister, and the blistering is not a paint defect but a record of the day the decision was made.

Readings are taken at several points on each elevation and at different heights, since the base of a wall is nearly always wetter than the top. Where a reading is high, the cause is investigated before any coating: a bridged damp course, a leaking gutter, a raised planter, or a render that is trapping water.

Refusing to paint a damp wall is the most valuable quality decision in this trade, and it is the one most often traded away for a schedule.

## The adhesion and chalk test

Two simple tests predict adhesion. The first is the cloth rub, which shows whether the surface is chalky. The second is a patch test: a small area coated, allowed to cure, and then scratched with a fingernail or pulled with tape.

A patch that lifts or powders has identified a problem on a square metre instead of a whole elevation. On previously painted walls the test also shows whether the existing film is sound enough to receive a new coat or has to come off.

## Breathability and the wall behind

A masonry coating must allow the wall to dry outward, and this is a property of the whole system rather than of the finish coat alone.

The check is documentary rather than visual: does the specified system include a primer and a topcoat that are permeable, and is the wall's own drying path intact. Where a high-build or elastomeric product has been used for crack bridging, the wall behind it is more dependent on its other drying routes, and those routes are worth confirming.

The visual symptom of a breathability failure appears after a winter: blistering in patches, paint lifting in sheets, and a wall face that is intact underneath.

## Coverage and film build

Coating applied too thin fails early, and the reason is usually a porous substrate that drew the first coat in.

The checks are straightforward: two coats as specified, the coverage rate from the tin taken seriously rather than treated as an aspiration, and a visual check for texture that is still showing bare. On highly absorbent block, a primer or a mist coat prevents the first coat from disappearing into the surface.

Where a colour change is significant, three coats may be needed for full obliteration, and that should be an agreed variation rather than a surprise.

## The defects that predict failure

Six defects are worth watching for in the first year. Blistering, which means water behind the film. Flaking or peeling in sheets, which means adhesion failure, usually from dust, chalk or damp. Chalking, which is binder breakdown from ultraviolet exposure. Efflorescence breaking through, which means water is still moving through the wall. Algae or mould returning, which means the biocide wash was incomplete or the wall stays wet. And cracking that follows the repair work, which means the repair was too rigid.

Each has a cause in the preparation rather than in the finish, and each is diagnosable without removing the coating.

## Colour, uniformity and the repair problem

A painted wall is judged on its uniformity as much as its durability. Repairs that were not primed absorb differently and show as dull patches. Old and new coatings of the same colour can differ in sheen even when the colour matches.

The professional control is to coat a whole elevation in one operation where possible, and to keep the batch consistent across a face. Where a repair must be invisible, priming and feathering beyond the repair boundary are what make it so.

## The records worth keeping

For an exterior coating job the record is short: the products, the number of coats, the date, the moisture readings before painting, the repair materials used, and photographs of each elevation.

That record answers the two questions that arrive later: whether the coating failed within its service life, and what exactly is on the wall so that a repaint can be specified without guesswork. It is also what a warranty claim rests on.

## Warranties, honestly read

Exterior coating warranties are usually limited to product replacement rather than labour, and they are conditional on preparation and on application within the stated conditions.

Reading them before the work rather than after a failure changes the specification: the conditions they name are the conditions that decide performance, which is another way of saying that the preparation is the warranty.

## The verification method

Where a client wants reassurance, the cheapest is a test panel on a representative area, finished and left through a season.

A panel that has weathered one winter intact is stronger evidence than any specification, and it costs a square metre and a small quantity of product. For a large or exposed elevation, it is the single most useful quality control available.

## Compatibility with what is already there

On a previously painted wall the first question is what the existing coating is, because a new product must be compatible with it.

A water-based acrylic applied over a sound acrylic is straightforward. The same product over a cement-based paint, a limewash or a silicon-based coating may not adhere. Where the existing coating is unknown, a patch test on a cleaned area is the only reliable method, and a patch left for a week is better than one inspected after an hour.

Where the existing paint is chalking badly, a stabiliser or a full removal is the choice, and there is no third option that works.

## Scaffolding, access and the inspection opportunity

Access equipment is a cost line and also an opportunity. A wall at close range reveals its joints, its mortar condition, its flashings and its sealant, none of which can be assessed from the ground.

A survey done from the scaffold before the coating is specified is where most of the real information comes from: which areas need repair, where the water is getting in, and whether the wall behind the coating is sound.

That survey is the difference between a painting job and a maintenance decision.

## Judging a job from the ground

A client will judge the work standing in the garden, so the checks should include that view.

From the ground, uniformity of colour, straightness of edges at windows and doors, and the absence of laps and drips are what register. The detail work at reveals and sills, which the painter spent the most time on, is often invisible from there, which is why a photograph record of the details is useful to both parties.

## Judging the existing wall before specifying

A coating specification begins with three questions about the wall: what is it made of, what is on it, and how does water behave on it.

The first two come from inspection and from asking. The third comes from watching the wall in rain, which is the most informative hour anyone will spend on the job. Where water beads and runs, the surface is shedding; where it darkens and stays dark, the wall is absorbing and the coating decision changes accordingly.

A specification written without those answers is a colour choice with a warranty attached.

## Verifying a contractor's method

A householder can verify method without technical knowledge by asking four questions and listening for specific answers.

How will the wall be washed. What will be done about the chalk. How long will the wall be left to dry. What happens if it rains. A contractor who answers each specifically is working to a method; one who answers in generalities is working to a habit.

The answers also establish, in advance, what the standard of care will be if something fails later.

## The failure that is nobody's fault

One class of failure deserves separate treatment because it is genuinely not the painter's: water arriving in the wall from a defect elsewhere.

A blocked gutter, a failed roof flashing or a raised patio can wet a wall from behind and blister a perfectly applied coating. The coating is the messenger.

Documenting the moisture readings before the work is the protection here. A record taken on a dry wall that later blisters under a leaking gutter is the difference between a warranty claim and a shared understanding.

## Sample areas and client agreement

A sample area resolves most disputes before they exist, and on masonry it does something more: it reveals how the coating behaves on that particular wall.

A sample on a chalky patch will show the adhesion problem that the rest of the wall will have. A sample over a repaired area will show whether the repair is invisible. Two square metres, finished properly and inspected after a week, is the cheapest quality assurance in the trade.

Where the client is uncertain about colour, the sample becomes a decision tool as well, because a masonry coating in sunlight is a different colour from a card in a shop.

## Inspection before payment

The final inspection is done from the ground, from the scaffold and at the details.

From the ground: uniformity and edges. From the scaffold: coverage over texture and the state of the surface under the coating, since areas missed at the top of a wall are common and invisible from below. At the details: reveals, sills, the junction with the ground and the sealant lines.

A job is accepted when all three views have been seen, which is a five-minute routine that prevents most callbacks.

## When a second coat is not enough

Occasionally a wall needs more than two coats, and the reason is nearly always a substrate that is absorbing the coating rather than a product that is thin.

A highly porous block wall, a very rough render, or a dramatic colour change all consume material. In those cases the answer is a mist coat or a primer followed by two full coats, rather than three coats of finish over an unprepared surface.

Recognising which of those situations applies is the difference between solving the problem and buying more paint.

## Working with an inspector or an engineer

Where a wall is part of a larger remediation, the coating is one line in a scope written by someone else.

In that case the useful contributions are the moisture readings, the photographs of the wall before painting, and a clear statement of what the coating cannot fix. Those three items prevent a painter being blamed for a water problem that belongs to the envelope.

## References

1. Dulux Canada.
2. Benjamin Moore Canada.
3. Sico.
4. Cement Association of Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows a brick wall with flaking paint, taken by Acabashi and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the adhesion failure this article's checks are designed to prevent. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 9, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Brick_wall_with_flaking_paint_in_St_Peters_Broadstairs_Kent_England.jpg/1280px-Brick_wall_with_flaking_paint_in_St_Peters_Broadstairs_Kent_England.jpg')
, ('ca-exterior-masonry-paint-maintenance', 'Keeping a Painted Masonry Wall: Washing, Repainting and Repair', 'A Canadian maintenance guide for painted masonry: the repainting cycle, annual washing, algae and efflorescence, what flaking and blistering actually mean, and how to deal with a wall that should never have been painted.', $wallarticle5$# Keeping a Painted Masonry Wall: Washing, Repainting and Repair

A painted masonry wall asks for one thing regularly and several things occasionally. The regular item is washing; the occasional items are repainting, touching in damage and addressing the water problems that masonry always eventually develops.

Understanding which of those is in front of you is most of the skill, because the wrong response to a symptom is how a small maintenance item becomes a wall repair.

## The repainting cycle

In a Canadian climate a sound exterior masonry coating can be expected to last somewhere between seven and fifteen years depending on exposure, colour and substrate. South and west elevations weather fastest; a north-facing wall in shade tends to gather algae instead.

The decision to repaint is made on condition rather than on a calendar: chalking that marks hands and clothing, colour loss on the sun-facing elevations, and any area where the film has begun to fail.

Repainting follows the same chain as the first application, in miniature: wash, repair, dry, prime the repairs, and coat. A repaint applied over a dirty or chalky wall fails faster than the coat it replaced.

## Washing, once a year

An annual wash is the cheapest form of maintenance available and the one that most extends the life of the coating.

Dirt holds moisture against the film, algae holds more, and both obscure the small failures that are easy to address early. A soft wash with a brush and a mild detergent, rinsed thoroughly, is enough for most walls; a pressure washer is used with care and at a distance.

Washing in spring is the practical routine, after the winter has done its work and before the growth season starts.

## Algae, mould and the north wall

Green or black growth on a shaded elevation is an organism, not dirt, and it needs a biocide rather than a scrub.

The treatment is a wash that kills the growth, left to work for the stated time and rinsed away. Scrubbing without killing simply spreads it, and painting over it provides a new food source.

Where growth returns every year, the cause is persistent damp: a leaking gutter, a planter against the wall, poor ventilation in a shaded corner, or a coating that has stopped shedding water. Treating the cause is what stops the cycle.

## Efflorescence and salt

White salt deposits on a painted wall mean water is moving through the masonry and evaporating at the surface, and that the coating is not stopping it.

The deposit is brushed off, and the investigation begins. Common causes in Canada are a bridged damp-proof course, a downspout discharging at the wall, grade that has risen above the damp course, and de-icing salt splash on a low wall.

Where efflorescence recurs, the paint is not the problem and repainting is not the answer. The water path is.

## Flaking, blistering and peeling

These three words describe three different failures and each points somewhere specific.

Flaking is loss of adhesion between coating and substrate, typically from chalk, dust or damp at the time of application. Blistering is water vapour pushing the film away from behind, which means moisture in the wall rather than on it. Peeling in sheets is usually a coating applied over an incompatible or powdery previous coat.

In all three cases, the repair is removal of the loose material back to sound coating, investigation of the cause, and refinishing from the repair outward. Painting over any of them reproduces the failure within a season.

## Touching in damage

Small damage is worth fixing promptly: a scuff at a doorway, a chip where a ladder leaned, a crack at a window corner.

The repair is filler, sanding, spot priming and a coat feathered beyond the damage. The colour match will be imperfect on a weathered wall, which is the reason touch-ups are done on a whole panel or a whole elevation rather than as spots.

Where the wall cannot be matched, the honest options are a panel repaint or waiting for the full repaint cycle. A patchwork of spot repairs looks worse than the damage it corrects.

## A wall that should not have been painted

Some walls are painted by a previous owner and should not have been. Solid brickwork of a certain age, walls with an active damp problem, and buildings where the paint is trapping moisture all fall into this category.

The remedies are limited and each is expensive: removal by abrasive or chemical means, a breathable recoat over a stripped surface, or accepting the wall and managing the consequences.

The maintenance answer in the meantime is to keep the wall as dry as possible: gutters clear, drainage working, splash reduced, and any area of failed coating removed rather than covered.

## Preparing for winter

The Canadian maintenance calendar has one deadline: everything that can be done before the first hard frost.

Autumn is for clearing gutters and downpipes, checking the sealant at windows and junctions, cutting back vegetation that holds damp against the wall, and touching in any damage while the temperature still allows painting.

A wall that goes into winter with a failed seal and a blocked gutter will spend the spring recovering.

## The long view

Painted masonry is one of the more durable exterior finishes available and one of the more forgiving, provided the two rules are respected: keep water out of the wall and keep the coating able to let water out.

Everything in this article follows from those two rules. A householder who washes the wall annually, keeps the drainage working and treats failures when they are small will get the full life from the coating. One who ignores the wall until it looks bad will spend the money on repairs instead of paint.

## Looking after the details between repaints

The coating is the visible layer and the details are what keep it dry: sealant joints, flashings, gutters, downpipes and the drips over openings.

These are inspected once a year and repaired as needed, which is a fraction of the cost of a repaint. A failed sealant joint at a window is a small tube of mastic and an hour; left for three winters it is a wet wall behind a coating that has to be removed.

The same applies to the base of the wall, where splash erodes the coating and where the first failures always appear.

## What to do after a hard winter

After an unusually severe winter, a short survey pays for itself: look along the wall at ground level, at the base of downpipes, and under the drips of every projection.

Identify any blister, any area that sounds hollow when tapped, and any place where the coating has lost its sheen or its colour in a patch. Those are the early signs, and they are all small repairs in spring.

Recording what was found and what was done creates the maintenance history that makes later decisions easy.

## Selling a house with painted masonry

A painted masonry wall is a selling point when its history is known and a question mark when it is not.

The useful disclosure is the age of the coating, the products used, the last wash and inspection, and any water problem that has been addressed. A buyer's inspector will look for exactly that information and for the evidence of water at the base of walls.

A folder with a photograph of each elevation at the last repaint answers most of it before anyone climbs a ladder.

## The seasonal calendar, briefly

Spring: wash the wall, inspect for winter damage, repair small items, check gutters and sealants.

Summer: repaint if due, taking advantage of the temperature window, and touch in any damage found in spring.

Autumn: clear gutters and downpipes, cut back vegetation, renew sealant before the cold, and finish any coating work while temperatures allow.

Winter: observe. Note where snow sits against the wall, where ice forms at the base, and where a downpipe discharges. That observation becomes the spring work list.

## Choosing a contractor for exterior masonry

The questions that separate a specialist from a general painter are specific to masonry.

Ask how the wall will be washed, what will be done about chalk, how moisture will be checked, and what product is specified for the substrate. Ask for photographs of a previous masonry job two or three years old, which is the only useful reference for durability work.

A contractor who welcomes those questions is usually the one worth hiring, and the ones who deflect them have told you something.

## Repairing rather than repainting

Some failures are better repaired than painted over, and distinguishing them saves a whole cycle.

Where a coating has failed in a defined patch, the correct repair is removal of the failed material, investigation, priming and recoating that patch, feathered into the surrounding area. The alternative, painting the whole elevation to hide the patch, costs more and hides the cause.

Where failure is widespread and follows a pattern, such as the base course of a wall or the area under a downpipe, the pattern is the diagnosis and the repair belongs to the cause rather than the surface.

## The value of a maintenance history

A written history, even a few lines a year, changes how a wall is maintained.

It tells the next owner when the coating was applied, what was used, and which problems have recurred. It tells a contractor what has been tried. And it prevents the most expensive pattern in exterior maintenance, which is repeating a treatment that has already failed twice.

A page per elevation is enough, with the date, the work done and a photograph.

## What a good exterior job feels like afterwards

A well maintained painted masonry wall is unremarkable, which is the point. It sheds rain, it holds its colour, it gathers a little algae on the north side and it needs a wash in spring.

The signs of a job that will get there are visible in the first year: no blistering after the first wet autumn, no chalk on a hand brushed along a sunlit wall, and sealant joints that are still tight at the windows.

Those three observations, made a year after the work, predict the next decade better than any warranty.

## The householder's five-minute check

Walking the outside of a house in spring and looking at the base of each wall, the area under each downpipe and the sealant at each window takes five minutes.

It finds the four things that matter, and it converts exterior maintenance from a project into a routine.

## Where to spend, and where not to

If a maintenance budget is limited, spend it on water management before coatings.

A cleared gutter, a repaired downspout, a raised drain outlet and a renewed sealant joint cost less than a repaint and prevent more damage. Only when those are done does spending on the coating produce its full life.

That ordering is the honest economics of exterior maintenance, and it is the same ordering that applies inside the building.

## References

1. Dulux Canada.
2. Benjamin Moore Canada.
3. Sico.
4. Cement Association of Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows a building exterior being repainted, taken by Payton Chung and made available under CC BY 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the repaint stage this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 8, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Repainting_%282493643341%29.jpg/1280px-Repainting_%282493643341%29.jpg')

) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='CA' AND t.candidate_key='assembly:ca-exterior-masonry-paint'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='CA' AND t.market_code='CA'
  AND t.candidate_key='assembly:ca-exterior-masonry-paint'
  AND a.wall_topic_id=t.id AND a.wall_market_code='CA' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
