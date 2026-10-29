-- Fourth DE batch: five researched draft articles for German blockwork with lime render.
-- Articles remain drafts; publication/review gates are not bypassed.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, attributed), never AI generated.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='DE' AND candidate_key='system:de-blockwork-lime') THEN RAISE EXCEPTION 'DE blockwork lime render topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Kalksandstein-Industrie','https://www.kalksandstein.de/','Kalksandstein-Industrie','Lime-sand blockwork properties, suction behaviour and render compatibility'),
  ('Bundesverband Porenbetonindustrie','https://www.bv-porenbeton.de/','Bundesverband Porenbeton','Autoclaved aerated concrete blockwork and its surface preparation'),
  ('Xella','https://www.xella.de/','Xella','Block masonry systems and manufacturer guidance on plastering blockwork'),
  ('Putz.de','https://www.putz.de/','Putz.de','Lime render materials, application practice and substrate preparation'),
  ('Beuth Verlag, German standards','https://www.beuth.de/de','Beuth Verlag','Published DIN standards for render systems and their application'),
  ('DIN, Deutsches Institut für Normung','https://www.din.de/de','DIN','Standards framework for render and plaster work'),
  ('VOB online','https://www.vob-online.de/','VOB','Contract rules and technical conditions of contract for building work (ATV)'),
  ('Bundesverband Farbe Gestaltung Bautenschutz','https://www.farbe.de/','Bundesverband Farbe','Trade guidance on coating and finishing mineral substrates')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='DE' AND t.candidate_key='system:de-blockwork-lime'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: White lime render surface (Patrick Oberdörfer, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Kalkputz_wei%C3%9F.jpg','Wikimedia Commons','Cover photograph overview article, CC BY-SA 4.0'),
  ('Image credit: Autoclaved aerated concrete block (Patrick Oberdörfer, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Porenbetonstein.jpg','Wikimedia Commons','Cover photograph materials article, CC BY-SA 4.0'),
  ('Image credit: Lime-sand blocks stacked on pallets (StromBer, CC BY-SA 3.0)','https://commons.wikimedia.org/wiki/File:KalksandsteinPalettenstapel.jpg','Wikimedia Commons','Cover photograph installation article, CC BY-SA 3.0'),
  ('Image credit: Autoclaved aerated concrete test cube (Patrick Oberdörfer, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Porenbeton_Testw%C3%BCrfel.jpg','Wikimedia Commons','Cover photograph quality article, CC BY-SA 4.0'),
  ('Image credit: Lime-sand block from the Jura region of Bavaria (Michael KR, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Kalksandstein_aus_dem_Jura.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 4.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='DE' AND t.candidate_key='system:de-blockwork-lime'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'DE',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='DE' AND t.candidate_key='system:de-blockwork-lime'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'DE','DE',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('de-blockwork-lime-overview', 'German Blockwork with Lime Render: A Mineral Pair', 'How German blockwork and lime render work as a pair: the block families, why suction governs adhesion, why a mineral render suits a mineral wall, and how the surface class is decided before work starts.', $wallarticle1$# German Blockwork with Lime Render: A Mineral Pair

Most German walls are built from blocks and finished with a mineral render. The pairing is not incidental. A lime-rich render on a block wall works because both materials are mineral, both are vapour-open, and both move in a similar way when the building warms and cools.

Get the pair right and a wall will go decades without trouble. Get the render's suction control wrong, or choose a cement-rich render for a soft block, and the failure appears at the surface within a couple of years while its cause sits in the wall.

## Why blockwork dominates in Germany

Block masonry is the default German wall for two reasons: it is fast to lay and it delivers a precise plane.

Blocks arrive dimensionally accurate, they are laid in thin or normal mortar joints depending on the system, and they are light enough to handle without plant. A block wall goes up quickly, and its accuracy is what makes a thin render possible.

The three block families that matter are lime-sand blocks, autoclaved aerated concrete and lightweight concrete blocks, and they behave quite differently under a render.

## Lime-sand blockwork

Lime-sand blocks are dense, strong and dimensionally stable, made from lime, sand and water under pressure.

Their density makes them good acoustically and structurally, and it also makes them a relatively strong substrate with low suction. A render on lime-sand blockwork bonds well, and the render's mix can be closer to a normal lime-cement ratio because the substrate will not draw the water out of it too quickly.

Their weakness is thermal, and their stiffness means that movement in the structure above can concentrate in the render rather than in the wall [1](https://www.kalksandstein.de/).

## Autoclaved aerated concrete

Aerated concrete, known in German as Porenbeton, is light, insulating and highly absorbent.

That absorbency is the single most important fact for anyone rendering it. Fresh aerated concrete will pull water out of a render mix so fast that the render never cures properly, and the result is a surface that dusts, crazes or fails to bond.

The German answer is not a stronger render but a correct preparation: the right primer, and where the system requires it, controlled pre-wetting so that the block takes up water before the render is applied rather than during curing [2](https://www.bv-porenbeton.de/).

## Lightweight concrete blocks

Lightweight concrete blocks sit between the two: lighter than lime-sand, less absorbent than aerated concrete, with an aggregate that gives them their lower density.

Their render behaviour is generally forgiving and their surface needs the same attention to suction as any block wall. Where they are used for their thermal properties, the render still has to be vapour-open, because a wall's insulation value is only realised if the surface behind it can dry.

## Why lime

Lime render is chosen for three properties that no synthetic system reproduces at the same cost.

It is vapour-open, so a wall dries outward. It is flexible and slightly self-healing at hairline cracks, because lime continues to carbonate and close micro-fissures. And it is compatible with historic and soft masonry, where a stronger render would damage the wall it protects.

Those three properties are why lime render remains the standard finish on German blockwork and the default specification for older masonry [4](https://www.putz.de/).

## The suction problem

Suction is the mechanism by which a porous substrate pulls water from a fresh render, and it governs whether the render cures or fails.

Too much suction and the render dries before it sets, losing strength and adhesion. Too little and the render stays wet, slumps and shrinks. The German method controls suction with a primer and, where specified, with pre-wetting, and it tests the substrate before deciding.

A wall that has been primed correctly renders easily. A wall that has not renders badly in ways that only appear later, which is why suction control is the heart of this topic.

## Movement, and where cracks come from

Cracks in a rendered block wall come from four places: movement of the structure, differential movement between materials, shrinkage in the render itself, and stress concentrations at openings.

German practice addresses all four rather than one. Movement joints are placed where the structure or the geometry requires them, mesh is embedded at junctions between materials and at the corners of openings, and the render mix is chosen so that its own shrinkage is modest.

A crack that appears in a straight line along a junction is telling you which of the four was missed.

## Exterior and interior

The same pair is used inside and outside, with different demands.

Outside, the render is the weather skin and needs frost resistance, water repellency and a coating. Inside, it is a decorative and fire-protective surface and needs a plane and a class.

The materials change between the two but the principle does not: a mineral render on a mineral substrate, with suction controlled and the surface class agreed.

## The standards frame

Render work in Germany is governed by the DIN render standards and by the contract conditions of the VOB for the relevant trade.

The practical effect, as throughout German building, is that a specification names a render type, a coat thickness and a surface class rather than describing a look. Those names are what a contractor prices and what an inspector checks [5](https://www.beuth.de/de) [7](https://www.vob-online.de/).

## What the later articles cover

Materials deals with the block families, the render types and the primers that make them compatible. Installation follows setting out, laying, suction control and the render coats. Quality covers thickness, adhesion, crack diagnosis and the surface class. Maintenance covers repair, recoating and the inspection routine.

## Why the pair is cheap to build and expensive to get wrong

A rendered block wall is one of the cheapest ways to make a wall in Germany, which is why it is everywhere and why it is so often done without a specification.

The materials are ordinary, the labour is fast and the trades are common. What is not ordinary is the discipline: suction control, coat thickness, curing and mesh at junctions. None of those items costs much, and all of them are omitted when nobody has specified them.

The economics therefore run the wrong way for a householder. The saving from skipping the preparation is immediate and small, and the cost arrives three winters later as a render that has to be replaced rather than recoated.

## Thermal behaviour of a block wall

Blockwork's thermal performance is a property of the wall, not of the render, and the render's job is to protect the wall's ability to perform.

A dense lime-sand wall relies on insulation and mass together. An aerated concrete wall relies on its own porosity, which is why its thermal value is high for its thickness. In both cases a coating that traps moisture reduces the wall's performance, because a wet wall conducts heat far better than a dry one.

That is the thermal argument for vapour-open finishes. A wall that dries stays warmer, and a wall kept warm dries more easily.

## Acoustic behaviour

Lime-sand blockwork is the acoustic workhorse of German residential building because its density resists the transmission of airborne sound.

A rendered surface adds a small amount of mass and, more usefully, closes the pores so that sound does not pass through the wall as readily. The render's contribution is modest; the block's density does the work.

Where sound performance matters, the details matter more than the materials: junctions sealed, openings closed, and no path around the wall. Those are the same details that decide whether an acoustic wall achieves its rating in a real building rather than in a test.

## Fire performance of the pair

Both materials are non-combustible, which is one reason the pair is used in walls that carry a fire requirement.

Blockwork provides the fire resistance, and the render adds a protective layer that resists the passage of heat and stays in place while the wall behind it is exposed. Where a wall must achieve a stated resistance, the specification names the block and the render thickness together.

A repair that removes render from a fire-rated wall and does not reinstate the same thickness is a small change to a performance nobody can see.

## Water and the exterior block wall

On an external wall the render is the first defence and the block is the second.

Rain that penetrates a render reaches the block, and a block wall can hold a surprising amount of water. That is why exterior walls need to dry outward as well as shed rain inward, and why a sealed coating on a rendered block wall produces problems rather than solving them.

The details decide most of the outcome: sills that throw water clear, drips that work, and a base that keeps splash away from the render. Those three items matter more than any product specification.

## Old block walls and new renders

Where an old block wall is being re-rendered, the existing wall tells you what the new render must do.

A wall that has been damp will have salts in its surface, and a new render over salt will fail on a predictable schedule. A wall that has lost its original render has probably done so because of water, and re-rendering without correcting the source reproduces the failure.

The preparation for an old wall is therefore diagnostic: find why the render failed, correct it, allow the wall to dry, and only then choose the render for the replacement.

## The one-line summary

Rendered blockwork in a sentence: a mineral wall, a mineral render chosen for its suction behaviour, applied in coats to a stated thickness, cured without being rushed, and finished to an agreed class.

Every article in this series is an application of that sentence, and every failure on this kind of wall is a departure from it.

## Where the risk concentrates

Three places on a rendered block wall carry most of the risk.

The base of the wall, where splash and ground water attack both block and render. The corners of openings, where stress concentrates and where mesh is most often omitted. And the junctions between blockwork and other materials, where differential movement opens a crack that a coating cannot bridge.

A wall sound at those three places is a wall that will last, whatever its finish looks like.

## What a householder should take from this

Two things. First, the render is part of the wall's weather protection, not a decorative skin, and its quality was decided by the preparation rather than by the trowel.

Second, the specification is short and nameable: block type, render type, primer, coat thickness, class. A householder who asks for those five items in writing has a much better chance of getting a wall that behaves.

## References

1. Kalksandstein-Industrie.
2. Bundesverband Porenbetonindustrie.
3. Xella.
4. Putz.de.
5. Beuth Verlag, German standards.
6. DIN, Deutsches Institut für Normung.
7. VOB online.
8. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows a white lime render surface, taken by Patrick Oberdörfer and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a finished lime render of the kind this series describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 9, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Kalkputz_wei%C3%9F.jpg/1280px-Kalkputz_wei%C3%9F.jpg')

, ('de-blockwork-lime-materials', 'Blocks, Lime Renders and Primers: German Materials', 'A German materials guide for rendered blockwork: lime-sand, aerated concrete and lightweight blocks, air lime and lime-cement renders, primers and pre-wetting, mesh and the tools that control suction.', $wallarticle2$# Blocks, Lime Renders and Primers: German Materials

A rendered block wall involves three material groups: the blocks, the render and the preparation that joins them.

Each group has one variable that decides success. For blocks it is suction; for renders it is the binder ratio; for preparation it is whether the substrate was tested before anything was mixed.

## Lime-sand blocks in detail

Lime-sand blocks are manufactured by pressing a mixture of lime, sand and water and curing it under steam pressure.

The result is a dense, dimensionally consistent block with good compressive strength and excellent acoustic mass. Standard, thin-bed and thermal variants exist, with the thermal variant having a lower density and taking a render with more care.

For the render trade, the relevant properties are low suction and stability. A lime-sand wall accepts a lime-cement or lime render without pre-wetting in most conditions, and the render's own shrinkage is the main movement to control [1](https://www.kalksandstein.de/).

## Aerated concrete in detail

Aerated concrete is made by adding a gas-forming agent to a lime, cement and sand mix, then curing it under steam pressure so that the material sets with a fine pore structure.

That pore structure is what makes it light and insulating, and it is also what makes it thirsty. A freshly laid aerated concrete wall can take water from a render mix faster than the render can cure.

The practical consequence is that aerated concrete is rendered with a system designed for it: a primer that controls suction, and in many systems a controlled pre-wetting of the wall before the render is applied [2](https://www.bv-porenbeton.de/) [3](https://www.xella.de/).

## Lightweight concrete blocks

Lightweight concrete blocks use a porous aggregate, which reduces density and improves thermal performance at a modest strength cost.

For rendering, they behave as an intermediate case: more absorbent than lime-sand, less than aerated concrete, and generally tolerant of a normal lime-cement render.

Where they are used on an external wall, the render must still be vapour-open, because the wall's thermal performance depends on its ability to dry.

## Air lime renders

Air lime render, or Luftkalkputz, is a render based on lime putty or hydrated lime with no cement content.

It is the most vapour-open and the most flexible of the common renders, and it is the correct choice for historic and soft masonry. It carbonates slowly, needs a longer curing period, and prefers to be applied in thin coats with time between them.

It is also the render that most rewards good suction control, since a lime render applied to a wall that draws its water will never develop the strength it is capable of.

## Lime-cement renders

Lime-cement renders add a proportion of cement to give early strength, better frost resistance and faster programme.

They are the workhorse render for exterior blockwork in Germany, and their binder ratio is the variable that decides their behaviour. More cement makes a stronger, stiffer render that resists weather better and cracks more readily over movement. More lime makes a softer, more flexible render with slower strength gain.

Choosing the ratio to match the block is the specification decision. A cement-rich render on a soft or moving substrate is the classic error, and its symptom is cracking that follows the joints.

## Primer and pre-wetting

Suction control is delivered by two means, and they are not interchangeable.

A primer is a liquid applied to the block surface to equalise its suction, and it is specified by the render system. Pre-wetting is water applied to the wall some time before the render, so that the pores are already partly full.

German practice distinguishes the two carefully: pre-wetting is timed, because a wall wetted an hour before is too wet, and a wall wetted ten minutes before has not absorbed evenly. The primer is the more controllable option and is the more common one on modern blockwork.

## Mesh and reinforcement

Mesh in a lime render is a crack-control measure, not a structural one.

It is embedded in the render at junctions between different substrates, at the corners of openings, along wall-to-column and wall-to-beam lines, and across areas where movement is expected. On aerated concrete systems, mesh is often used more widely because the substrate's flexibility encourages movement.

The mesh must be embedded in the body of the render, not laid on the surface, and it must overlap at the edges.

## Anchors, beads and accessories

A short list of accessories completes the system: render beads at external corners, stop beads at the junction with other materials, movement joints, and the fixings that hold them.

On blockwork the bead is fixed to the masonry rather than to the render, so that it stays true when the render moves. A bead held only by render is a bead that will show a step within a year.

## Tools

The tool list is modest and specific: a hawk and trowel, a float for the finish texture, a notched trowel or a scratcher for keying, a long straightedge, a sponge float, a mixing paddle and a hosepipe.

The straightedge and the float do most of the visual work: one establishes the plane, the other produces the texture. Neither compensates for a render applied in the wrong number of coats.

## Storage and mixing

Lime and lime-cement renders arrive as powder in bags and are mixed with water on site.

The mix is measured rather than estimated, since adding water to make a mix workable changes its strength. Powder is stored dry and off the ground, and opened bags are used rather than kept, because lime products absorb moisture and start to set in the bag.

## What a merchant will ask

A German merchant asked for a render for blockwork will want to know the block type, whether the wall is inside or outside, and whether it will be coated.

Those three answers determine the render type, the binder ratio and the primer. A customer who answers them buys a system rather than a bag of powder, and the price difference between the two is small.

## The materials list as a specification

Read together, the materials form a specification: block type, render type and binder ratio, primer, pre-wetting if required, mesh positions, beads and joints.

A wall built to that list is predictable. A wall built from whatever was delivered is a wall whose behaviour will be discovered later, usually at the first hard frost.

## Lime putty and hydrated lime

Lime for render comes in two forms, and they behave differently.

Lime putty is slaked lime stored wet, and it produces a render with better workability and a softer, more flexible set. Hydrated lime is a dry powder, more convenient to handle and cheaper to store, with slightly different working characteristics.

Both are mineral, both are vapour-open, and both carbonate over time. The choice is a matter of the system and the trade's preference rather than of performance class, and a manufacturer's product will state which it uses.

## Additives and what they change

Render additives change working properties rather than performance class, and the German market sells them for specific problems.

A water-retention additive keeps a render workable on an absorbent substrate. A fibre additive reduces shrinkage cracking. An air-entraining additive improves frost resistance and workability. Each has a legitimate use and each can be over-used.

The practical rule is that an additive should be part of the system rather than a remedy invented on site. A render that needs an additive to be applied to a particular wall is usually a render chosen wrongly for that wall.

## Pigments and coloured renders

Render can be coloured through its full thickness with mineral pigments, and German facades frequently are.

A through-coloured render has advantages: the colour cannot peel because it is not a film, and small damage is less visible. Its limitation is that the colour is fixed at manufacture and cannot be changed without a coating.

Where a colour is likely to change, a render designed to be coated is the sensible choice. Where the colour is expected to be permanent, through-colouring is more durable than any coating, and it is cheaper over a thirty-year cycle.

## Quantities and delivery

Render quantities are calculated from area and coat thickness, and getting the estimate wrong is more expensive than it looks.

Deliveries are heavy and arrive on pallets, which means access matters: a wall rendered from a scaffold needs the material lifted to a sensible position rather than carried along a board. Leftover powder cannot be stored indefinitely, because lime products absorb moisture.

The practical approach is to order in two drops for a large wall: enough to start and enough to finish, with the second drop timed to the actual rate of work.

## Compatibility between render and coating

The coating on a lime render has to be at least as vapour-open as the render, and the German market is organised around that constraint.

Mineral, silicate and lime-based coatings meet it. Acrylic dispersion coatings generally do not, although specialist products exist. A wall that has been coated with an incompatible product needs the coating removed or a compatible system specified on top.

That single compatibility rule explains why lime-rendered walls are specified with their coatings rather than handed over as a bare surface.

## Two products that are often confused

A render and a coating are different materials with different jobs, and a wall that needs one is not improved by the other.

Render fills, levels and protects the wall. A coating protects the render and gives it colour. Using a thick coating to level a wall produces a film that cracks and peels, and using a thin render as a coating produces a surface with no protection at all.

The confusion is common in domestic work, where a "render paint" is sometimes sold as a solution to an uneven wall. It is not.

## Buying against the block, not the brand

Two renders from different manufacturers with the same binder ratio and the same primer strategy are more similar than two products from one manufacturer designed for different blocks.

That is the practical use of the classification. It lets a buyer choose on suitability and price, and it explains why a merchant's question about the block type comes before any recommendation about a product.

## Delivery, quantities and the second drop

Render quantities follow area and thickness, and the delivery plan follows the work rate.

Ordering in two drops keeps powder dry and fresh, and it matches the material to the pace of the trade rather than to a pallet discount. Leftover bags cannot be kept across a season, because lime products absorb moisture and begin to set.

## A materials list for a room

For a single rendered room: blocks already laid, lime or lime-cement render, primer for the substrate, mesh at junctions, beads at corners, and the mixing and floating tools.

The list is short, and every item on it answers to a performance requirement rather than to a preference.

## References

1. Kalksandstein-Industrie.
2. Bundesverband Porenbetonindustrie.
3. Xella.
4. Putz.de.
5. Beuth Verlag, German standards.
6. DIN, Deutsches Institut für Normung.
7. VOB online.
8. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows an autoclaved aerated concrete block, taken by Patrick Oberdörfer and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the block type whose suction behaviour governs so much of German render practice. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 9, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Porenbetonstein.jpg/1280px-Porenbetonstein.jpg')

, ('de-blockwork-lime-installation', 'Laying Blocks and Rendering: The German Sequence', 'A German installation sequence for rendered blockwork: bond and mortar joints, masonry tolerances, suction control, render coats and keying, the float finish, mesh at junctions and the drying that cannot be hurried.', $wallarticle3$# Laying Blocks and Rendering: The German Sequence

Blockwork and render are two trades in sequence, and the second depends entirely on the first.

A wall laid to tolerance renders easily and straight. A wall laid with accumulated error needs a thick render to correct it, and a thick render is a render that will crack.

## Setting out the masonry

Setting out establishes the wall's line, level and gauge before the first block is laid.

The course gauge is set from the block height so that the coursing works out at openings, and the bond is chosen so that vertical joints do not align. On a long wall, a profile at each end and a line between them keeps the courses level across the run.

That preparation is what makes the wall plumb, and a plumb wall is the precondition for a thin, even render.

## Mortar and joints

German blockwork uses either normal mortar joints or thin-bed adhesive, depending on the block system.

Thin-bed systems rely on the dimensional accuracy of the blocks and produce a joint of a few millimetres, which reduces thermal bridging and speeds the work. Normal mortar joints are thicker and more forgiving of variation, and they need to be filled and finished as the work proceeds.

Either way, the joints are full, because a hollow joint is a path for water and a weak point for the render to follow.

## Tolerances and what they cost

Masonry tolerances are the subject that decides how much render a wall needs.

A wall within tolerance takes a render of the specified thickness. A wall outside tolerance takes a render thick enough to correct it, and that thickness then behaves differently: it shrinks more, cracks more readily and is heavier on its own adhesion.

The economic argument for accuracy in the masonry is therefore the render's durability rather than an abstract standard.

## Preparing the surface

Before the render, the wall is brushed down, dust is removed and any mortar snots are cut off.

That preparation is also the moment to check suction. A droplet of water applied to the block face tells you a great deal: one that sits and is slowly absorbed indicates a moderate substrate, one that vanishes instantly indicates a thirsty one that needs a primer.

On aerated concrete the primer is applied and allowed to dry to the stated interval, because a primer applied minutes before the render does not have time to work.

## The first coat

The first coat, or base coat, is applied with enough pressure to key it into the block surface and is then scratched or combed to provide a mechanical key for the next coat.

Applying the first coat properly matters more than any later coat, because it is the one that bonds. It is applied in a thickness the render system allows, and it is not polished or trowelled smooth, since a smooth base coat gives the next coat nothing to grip [4](https://www.putz.de/).

## Curing between coats

The interval between coats is a curing interval, not a drying interval, and the distinction is the whole of lime's behaviour.

A lime render gains strength by carbonation, which requires moisture and time. Rushing the next coat traps the first one before it has carbonated, and the wall ends up with a render that is soft at depth and hard at the surface.

German practice allows the stated interval and protects fresh render from sun and wind, which dry it too fast. Dampening a lime render between coats, where the system allows it, is a normal part of the method.

## The finishing coat and its texture

The finishing coat establishes the plane and the texture.

It is applied, ruled off with a straightedge to the beads and the surrounding work, then floated to the texture the specification names: a fine sponge finish, a lightly textured float finish, or a rougher finish for a facade that will be coated.

The texture is not decoration. A float finish closes the surface, while a rougher finish gives a coating a key, and the choice is made with the coating in mind.

## Corners, openings and junctions

Corners and junctions receive their accessories before the finishing coat.

Beads are fixed to the masonry at external corners, mesh is embedded across the junction between different substrates and diagonally at the corners of openings, and movement joints are formed where the design requires them.

Those details are the ones that decide whether the render cracks in five years, and they take minutes each. They are also the first items omitted when a programme is tight.

## Weather and the working window

Rendering is weather-dependent in both directions: frost damages fresh lime render, and strong sun or wind dries it too quickly.

The working window is defined by temperature, wind and the prospect of rain, and the render is protected afterwards: sheeting on a scaffold, damping in hot weather, and no rendering onto a frozen wall.

A German autumn tests that discipline, and the failures of the following spring are usually the ones made in October.

## Handover to the next trade

The render is left to cure before it is coated, and the interval is stated by the render and coating manufacturers.

Meanwhile the details are checked: the beads are straight, the junctions are complete, the movement joints are clear, and any area that cured badly, which shows as a pale or dusty patch, is identified before it is coated rather than after.

## Handover

The handover record names the block type, the render type and binder ratio, the primer, the coat thicknesses and the surface class, with the dates and the weather conditions at application.

It is a short page and it is the difference between a wall that can be maintained and a wall that has to be assessed from scratch the next time anyone touches it.

## Rendering in hot and cold weather

The two weather extremes fail a render in opposite ways, and both are managed rather than fought.

In hot, dry, windy weather the render dries before it can cure, which produces a dusty, weak surface. Damping the wall, working in shade and protecting fresh render from wind are the controls. In cold weather the render freezes before it sets, and the damage is permanent.

German practice sets a temperature floor and a protection regime around it. Neither is optional, because neither can be corrected afterwards.

## Access and scaffolding

Render work is done from a scaffold, and the scaffold's position decides what the trade can achieve.

Boards at the right height allow a coat to be applied in one continuous movement, which is what produces an even surface. Boards at the wrong height force the trade to work in awkward arcs, and the result shows as a band where the reach changed.

Scaffold ties are an additional detail: each one leaves a hole in the render, and each is made good after the tie is removed. That making good is part of the render scope, not an afterthought.

## The float finish

The float is what produces the render's texture, and it is worked in a circular or figure-of-eight movement while the render is still green.

Floating does two things: it closes the surface and it removes the marks left by the trowel. A surface that is floated too early stays open and tears. One that is floated too late cannot be closed, and the trowel marks remain under the texture.

The float finish is also the point at which the render's plane is finalised, which is why the straightedge is used before the float rather than after.

## Movement joints

Movement joints are formed where the wall will move: at structural junctions, at long runs, and where a wall changes direction or height.

The joint is a deliberate break in the render, filled with a compressible material and sealed, so that movement happens at the joint rather than as a crack elsewhere. A joint that is filled solid with render is not a joint at all.

German practice places them by design and notes their positions, because a movement joint that is later covered by a coating is a joint nobody will remember when the next repair is needed.

## Interfaces with floors and joinery

The render meets other trades at the floor, at the skirting and around openings, and each junction has a conventional order.

Skirtings are fitted after the render, and the render stops above the floor finish so that the skirting covers the junction. Window and door frames are set with a gap that is sealed, not filled with render, because movement at the frame would crack a rigid fill.

Getting those junctions in the right order is what makes the finished room look considered, and it is a matter of sequencing rather than of materials.

## Programme and what cannot be compressed

The render's programme is set by curing, and curing cannot be compressed.

A wall that is rendered on Monday and coated on Wednesday has a render that has not carbonated, and its surface may look finished while its body is still weak. That is why the coating interval is stated by both the render and coating manufacturers and why a programme that ignores it produces failures later.

The honest way to plan a rendered wall is backwards from the coating date, with the render's curing time as a fixed constraint.

## What the render covers

A render hides the blockwork and it does not correct it.

Where masonry is out of tolerance, the correction belongs to the masonry trade and is done with the blocks, not with a thicker render. That division of responsibility is what keeps the render thin, and a thin render is a render that can be relied on not to shrink away from the wall.

## Site conditions

A block wall being rendered needs shade, stable temperature and a surface free of dust, and those conditions are managed rather than hoped for.

Sheeting on a scaffold, damping of the substrate, and scheduling around the sun are ordinary measures on a German site. Their absence is the most common explanation for a render that looked right in September and failed in February.

## Handing over to the coating trade

The render is handed over as a cured surface with its class and its material documented, and the coating is specified to match.

That handover is a small formality with a large effect: a coating chosen against a documented render can be checked for compatibility, and a render applied to a documented block can be assessed after the event.

## Two coats or three

The number of render coats follows the total thickness required, and the system states the maximum thickness of each coat.

A thin finish may be two coats over a base coat; a wall that needs correction may require three, each within the thickness the system allows. Applying one thick coat instead of two thinner ones is the most common departure from the method, and it produces shrinkage cracks that no coating will bridge.

## References

1. Kalksandstein-Industrie.
2. Bundesverband Porenbetonindustrie.
3. Xella.
4. Putz.de.
5. Beuth Verlag, German standards.
6. DIN, Deutsches Institut für Normung.
7. VOB online.
8. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows lime-sand blocks stacked on pallets, taken by StromBer and made available under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the blockwork that this article's render sequence is applied to. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 10, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/KalksandsteinPalettenstapel.jpg/1280px-KalksandsteinPalettenstapel.jpg')

, ('de-blockwork-lime-quality', 'Judging Rendered Blockwork: Thickness, Adhesion and Class', 'A German quality framework for rendered blockwork: tapping and probing for adhesion, checking thickness and plane, diagnosing the four crack patterns, verifying suction preparation and agreeing the surface class.', $wallarticle4$# Judging Rendered Blockwork: Thickness, Adhesion and Class

A rendered block wall is judged on four things: whether the render is stuck, whether it is thick enough, whether it is straight, and whether the surface meets its class.

Three of those can be checked with a hammer, a straightedge and a light. The fourth is a matter of agreement, which is why the class is named before work starts.

## Adhesion: the tap test

The first quality check is whether the render has bonded, and the standard method is a careful tap with a light hammer or a knuckle across the wall in a regular pattern.

A sound render gives a dull, consistent note. A hollow note indicates a debonded area, which may be a small patch from a dry mix or a large area from poor suction control or a dusty substrate.

Small hollows are recorded and monitored. Large or clustered hollows are a defect, and they are the most serious because the render will eventually detach and take its coating with it.

## Thickness

Thickness is checked at an opening, a reveal or any place where the render's edge is visible, and it should match the specified coat build-up.

A render thinner than specified has less capacity to absorb movement and provides less weather protection, and it is a defect regardless of how it looks. A render much thicker than specified has usually been used to correct masonry, and it carries a higher risk of shrinkage cracking.

Both are worth noting at handover, because both change how the wall will behave.

## Plane and straightness

The plane is checked with a straightedge held against the wall in several directions, and with a raking light along the surface.

The straightedge shows deviation directly. Raking light shows it as a shadow, which is how the room's users will see it. A wall that passes the straightedge and fails in raking light is a wall that will be noticed every evening.

The class decides how much deviation is acceptable, and the lighting condition is why the class has to be agreed in the context of the room.

## The four crack patterns

Cracks in a rendered block wall follow one of four patterns, and the pattern names the cause.

Hairline crazing over an area indicates a render that dried too fast or a mix that was too rich. A crack along the junction between two materials indicates missing mesh. A diagonal crack from the corner of an opening indicates stress concentration and missing diagonal reinforcement. And a straight vertical or horizontal crack indicates a movement joint that was omitted or a structural movement.

Diagnosing that way is what turns a repair into a correction rather than a covering-up.

## Suction preparation, verified afterwards

Suction preparation is invisible after the event, and it is diagnosed from the render's condition rather than from a record.

A render that dusts on the surface, powders under the finger or has a pale and chalky appearance in patches often indicates a substrate that drew the water out. A render that has slumped or shows drying shrinkage cracks indicates the opposite.

Where those signs appear, the question to ask is what was done to the block before the render went on, and the answer usually explains everything.

## Moisture and the exterior wall

On an external wall, moisture is the quality item that decides durability.

Readings taken at several heights and on several elevations show whether the render is shedding water as intended. High readings at the base point to splash or ground-level bridging rather than to the render. High readings in the field point to a defect at a detail above.

The check is worth doing at handover and again after the first winter, because a facade that performs in September may not perform in February.

## Surface class and the light

The surface class defines what the wall is allowed to show, in the same convention used throughout German finishing work.

A basic class accepts a visible undulation in ordinary light. A higher class requires the surface to appear even in raking light, which is a different quantity of work at the floating and finishing stage.

The honest position is that a wall built and finished to a high class costs more, and that a wall finished to a basic class looks entirely satisfactory until a sofa is placed beside a window.

## Defects worth naming

Five defects recur in rendered blockwork: hollow patches, shrinkage crazing, cracks at junctions, beads that are proud or stepped, and a surface that dusts.

Each maps to a stage: suction control, mix design, mesh positioning, bead fixing, and curing. Naming the stage in a handover note is what allows a correction to be specified rather than debated.

## A sample panel

Where work is substantial, a sample panel of a square metre establishes the texture, the plane and the class before the rest of the wall is done.

It is the same instrument used in plastering and in facade work. It costs an hour of a skilled trade's time and it converts an argument about appearance into a comparison with an agreed reference.

## Documentation

The record for a rendered block wall is a page: block type, render type and binder ratio, primer, thicknesses, surface class, dates, weather, and photographs of the wall before the render and after the finishing coat.

On an external wall, add the moisture readings and the exposure of each elevation. That record is what makes the next intervention straightforward and what a warranty claim would rest on.

## What good blockwork and render feel like

A well-rendered block wall sounds solid across its whole surface, feels hard and cool to the hand, and looks even in the worst light the room can offer.

Those three impressions correspond to adhesion, thickness and class, which are exactly the items in this article. A client who notices a problem is usually noticing one of them, and it is worth knowing which one before calling a contractor.

## Inspecting with a straightedge

A two-metre straightedge held against a rendered wall in three directions gives the plane a number.

Held vertically, horizontally and diagonally, it shows where the wall departs from a flat surface and by how much. The class agreed for the wall states how much departure is allowed, and the measurement converts a conversation about appearance into a comparison with a figure.

The straightedge is the tool that both sides of a dispute should be holding, and it costs less than an hour of anyone's time.

## What a hollow actually means

A hollow sound under the tap test has several possible causes, and they are worth distinguishing.

A small hollow near a corner is usually a bead that was not bedded properly. A hollow in the field is usually a dry patch where the render did not bond, often from a dusty substrate or uncontrolled suction. A hollow along a whole course suggests a block face that was too smooth for the mix.

Each has a different repair. Recording where the hollows are, rather than only that hollows exist, is what allows the correct repair to be specified.

## Verifying at openings

Openings are where the render is thickest in number and most visible in detail, and they are the best place to judge the work.

At a window reveal the render's thickness is visible, the corner bead is visible, and the junction with the frame is visible. Those three show whether the render was built to the specification, whether the bead was fixed to the masonry and whether the frame detail was sealed.

A reveal that is neat, square and sound is a reliable indicator that the rest of the wall was done properly.

## The coating's role in quality

On an external wall the coating is part of the quality of the finished surface, not a separate trade.

The coating's vapour permeability determines whether the render can dry, its water absorption determines how much rain the surface takes, and its adhesion determines whether it stays. Those three need to match the render and the exposure.

A wall can be rendered perfectly and fail through its coating, which is why the two are specified together in German practice rather than in sequence by different parties.

## Checking after the first winter

The most informative inspection of an external rendered wall happens after its first winter.

Frost, rain and drying cycles reveal defects that no summer inspection finds: patches that have blown, areas that stay damp, salt that has appeared at the base, and coatings that have lost adhesion where water collected.

A walk round the building in late February, with a photograph of anything new, is the cheapest quality assurance available on a rendered block wall.

## Negotiating the class honestly

The class conversation is where clients and contractors most often talk past each other, and it can be resolved in one sentence.

That sentence names the class, the room's lighting condition and the finish that will be applied to the wall. A wall judged in raking light under a sheen finish is a different proposition from a wall judged in ordinary light under a matt paint.

Agreeing those three items before work starts is what makes an honest handover possible, and it costs nothing.

## What the class does not cover

A class covers the appearance of a surface and it does not cover adhesion, thickness or weather performance.

Those are separate items with separate checks, and a wall can meet its class while failing on adhesion in a small area. Knowing which item is being discussed is what stops a surface argument from standing in for a structural one.

## Photographing before and after

Four photographs per wall, taken with raking light before the finishing coat and in daylight after it, record both the surface and the changes made to it.

They cost five minutes and they answer the questions that arrive a year later, which are almost always about what the wall looked like before someone decided it was unacceptable.

## When to accept a wall

A wall is acceptable when it meets the agreed class in the agreed light and passes the adhesion and thickness checks.

Perfection beyond that is not usually available at any price, and chasing it with repeated filling and sanding damages the surface it was meant to improve. Knowing where the standard sits is a professional judgement, and it is the one worth paying for.

## Verifying the substrate before the render

The check that prevents most failures happens before the render and is rarely recorded.

A droplet test for suction, a visual scan for dust and mortar snots, and a check that the primer is dry to its stated interval. Each takes seconds per square metre and each is the item that a rushed job skips.

Where a render later fails, the question that answers everything is what the substrate looked like before it went on.

## References

1. Kalksandstein-Industrie.
2. Bundesverband Porenbetonindustrie.
3. Xella.
4. Putz.de.
5. Beuth Verlag, German standards.
6. DIN, Deutsches Institut für Normung.
7. VOB online.
8. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows an autoclaved aerated concrete test cube, taken by Patrick Oberdörfer and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a test specimen of the block material whose properties this article's checks are about. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 10, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Porenbeton_Testw%C3%BCrfel.jpg/1280px-Porenbeton_Testw%C3%BCrfel.jpg')

, ('de-blockwork-lime-maintenance', 'Keeping Rendered Blockwork: Cracks, Coatings and Inspection', 'A German maintenance guide for rendered blockwork: inspecting renders and coatings, repairing hairline and structural cracks, recoating a lime finish without sealing it, and recognising salt and damp that no paint will fix.', $wallarticle5$# Keeping Rendered Blockwork: Cracks, Coatings and Inspection

A rendered block wall needs little maintenance and repays attention generously. The routine is an annual look, a repair when a crack appears, and a recoat when the surface asks for it.

The temptation is to treat the render as a painted surface and the coating as maintenance. The reality is the other way round: the render is the wall's protection and the coating protects the render.

## The annual inspection

One walk around the wall, outside and inside, finds most of what matters.

Outside: the base of the wall, the sills and drips, the area under gutters and downpipes, and any crack that has changed since last year. Inside: the corners of openings, the junction between the wall and the ceiling, and any area that feels damp.

A note and a photograph each year creates a record that makes the next judgement easy. Without it, every observation is an isolated impression.

## Hairline cracks

Hairline crazing across a render is common and usually harmless, and it is controlled by the coating rather than repaired.

A lime render's capacity to heal micro-cracks by continued carbonation is one of its advantages, and a coating with modest crack-bridging ability covers the rest. The mistake is to fill every hairline individually, which produces a patchy surface that reads worse than the cracks did.

Where the crazing is dense and new, the cause is a render that dried too fast, and the response is to check the coating and to avoid repeating the conditions in future work.

## Cracks that need repair

A crack that is wider than a hairline, that follows a junction, or that widens year on year needs repair rather than observation.

The repair is to open the crack slightly, clean it out, dampen it, fill it with a compatible mortar and, where movement is likely, bed a mesh strip across it. Filling a moving crack with a rigid filler guarantees a repeat.

A diagonal crack at the corner of an opening indicates that the diagonal reinforcement was missing, and repairing it properly means adding the mesh that should have been there.

## Repairing damaged render

Where render has been knocked off or has detached, the repair is a patch built in the same way as the original.

The edge is cut back to sound material, the substrate is prepared and primed, the base coat is applied and keyed, and the finishing coat is brought out to the surrounding plane and texture. A patch that is too smooth or too fine reads as a patch forever, which is why the texture and the float finish matter as much as the mortar.

On a wall being recoated afterwards, a well-made patch is invisible. On a wall that is not being recoated, a patch is visible by definition and the better answer may be to recoat the elevation.

## Recoating a lime render

A lime render is recoated with a coating that is at least as vapour-open as the render, which in practice means a mineral, silicate or lime-based product.

An acrylic coating over a lime render reduces the wall's ability to dry outward, and the moisture that is trapped finds the weakest point in the render. That is the single most consequential maintenance error on this type of wall, and it is invisible until it fails.

Where a wall has previously been coated with an acrylic product, the recoat should be a compatible one, and the wall's drying behaviour should be part of the decision [4](https://www.putz.de/) [8](https://www.farbe.de/).

## Salt and efflorescence

White deposits on a rendered wall indicate salt moving through the wall and crystallising at the surface.

The salt comes from the ground, from the blocks themselves or from a source of water, and the treatment is to find and stop the water. Removing the deposit with a dry brush and allowing the wall to dry is the immediate response; re-rendering without correcting the source is a repeat of the same failure.

Where salt returns repeatedly at the base of a wall, the cause is ground water or a bridged damp course, and the repair belongs to the building rather than to the render.

## Damp, mould and the interior

Damp on the inside of a rendered block wall usually points at the same details from the other side.

A blocked cavity, a failed flashing, a leaking gutter or a cold bridge will all show as a damp patch inside, and none of them is solved by a coating. The honest sequence is to identify the source, correct it, allow the wall to dry and then assess the render and the finish.

Coating a damp patch traps the moisture and moves the problem to the next weakest point, which is usually at the edge of the coating.

## When to call a specialist

Three conditions deserve one: a crack that widens over successive years, render that has detached over a large area, and damp that returns after a repair.

Each suggests a cause in the structure or the drainage rather than in the render, and each is cheaper to diagnose than to keep repairing.

## The maintenance cycle

A rendered block wall in a German climate typically sees an inspection every year, a wash every few years, a recoat every ten to fifteen years and a render repair at some point in its life.

That cycle assumes the coating stays vapour-open and the details stay in order. Both are cheap to maintain and expensive to restore.

## Records and their value

A one-page file: block and render types, the date of the render, the coatings used with their product families and colour codes, the repairs, and photographs of each elevation at each cycle.

A wall with that file behaves predictably for its whole life, and a wall without it is assessed from scratch every time anyone touches it. On a rendered building, that file is the difference between maintenance and guesswork.

## Cleaning a rendered wall

Cleaning a rendered block wall is a low-pressure operation, and the pressure limit is the point of it.

A soft brush, a hose and a mild detergent remove dirt and biological growth without disturbing the render's surface. A pressure washer used at close range opens the render's pores, drives water into the wall and leaves a roughened surface that gathers dirt faster than before.

Where growth is present, a biocide wash applied and rinsed is more effective than scrubbing, and it does not spread the organism across the wall.

## Recoating sequence

Recoating follows the same logic as a first coating, in miniature.

The wall is cleaned and allowed to dry, the cracks are repaired, the repairs are primed, and two coats are applied. The interval between coats is taken from the data sheet rather than from the weather.

A recoat over a dirty or damp wall fails faster than the coating it replaced, which is why the first three steps matter more than the coat count. Skipping them is the most common reason people conclude that a coating did not last.

## Algae and shade

Green growth appears where the wall stays wet, and the pattern on a rendered block wall usually points at a cause.

The base of a north wall, the area under trees and the shadow of a neighbouring building are the usual locations. A leaking gutter produces a vertical streak that marks the water's path.

Correcting the wetting, cleaning the wall, and where appropriate applying a hydrophobic treatment to a sound but absorbent render addresses the cause. Repainting over the growth addresses only the appearance.

## Rendering over a failed render

Where render has failed over an area, the temptation is to render over it, and the temptation should be resisted.

A new render applied over a detached one inherits the detachment. The failed area is removed back to sound material, the substrate is checked for moisture and salt, and the repair is built up in the same system as the original.

Where failure has been caused by water, the water is the first repair. That order is what prevents a second failure in the same place within a couple of years.

## Interior touch-ups

Inside, a rendered block wall is usually painted, and touch-ups are the everyday maintenance item.

A filled patch is primed and painted across a full panel rather than spot-painted, because a spot repair on a weathered wall shows as a change in sheen. Where the wall was painted with a matt product, the repair is nearly invisible; where it was painted with a sheen product, the whole panel is the practical unit of repair.

Sand-filling rather than filling proud is what keeps the patch level, and it takes a minute longer per patch.

## Choosing a contractor

Three questions separate a render contractor from a plasterer with a van on a rendered block job.

Which render and binder ratio suits this block, and why. What will be done about suction, and how will the substrate be tested. How thick will each coat be, and what is the interval before coating.

A contractor who answers all three in specifics is working to a system. The answers also become the record, which is what makes the wall maintainable afterwards.

## What repainting will not fix

A coating will not fix a damp wall, a salt-contaminated render, or a crack that is still moving.

Each of those has a cause behind the render, and each repeats after a repaint on a schedule that the weather sets. Recognising the three before commissioning work is what saves the cost of doing the job twice.

## Salt, one more time

Salt appears at the base of walls because water is arriving there, and the repair is the water rather than the render.

A dry brush removes the deposit, a season of drying tells you whether the source has been corrected, and only then is a finish considered. Rendered block walls at ground level are where this lesson is learned most often.

## A note on expectations

A rendered block wall, built and maintained as this series describes, needs no more than a wash, a repair when something is damaged, and a recoat when the surface asks for it.

That is a modest claim and a realistic one. It assumes the suction was controlled, the render was cured, and the coating stayed vapour-open. None of those assumptions is difficult; all of them are optional, and skipping any of them shortens the interval.

## When recoating is not the answer

Where a render has lost its key over a large area, recoating is a way of paying twice.

The coating will fail with the render, and the diagnosis will have to be made afterwards with the coating in the way. Assessing the render first, by tapping, and repairing what is unsound is the sequence that costs less and lasts longer.

## References

1. Kalksandstein-Industrie.
2. Bundesverband Porenbetonindustrie.
3. Xella.
4. Putz.de.
5. Beuth Verlag, German standards.
6. DIN, Deutsches Institut für Normung.
7. VOB online.
8. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows a lime-sand block from the Jura region of Bavaria, taken by Michael KR and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the block material whose rendered surfaces this article's maintenance routine covers. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 9, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Kalksandstein_aus_dem_Jura.jpg/1280px-Kalksandstein_aus_dem_Jura.jpg')

) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='DE' AND t.candidate_key='system:de-blockwork-lime'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='DE' AND t.market_code='DE'
  AND t.candidate_key='system:de-blockwork-lime'
  AND a.wall_topic_id=t.id AND a.wall_market_code='DE' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
