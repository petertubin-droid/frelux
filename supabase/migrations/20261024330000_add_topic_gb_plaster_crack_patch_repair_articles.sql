-- Seventh GB researched candidate topic: plaster crack and patch repair.
-- Registered as verification_status='candidate'. All articles status='draft',
-- editorial_review_status='draft', market/wall_market_code='GB', wall_language_code='en'.
BEGIN;

INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type,verification_status)
VALUES ('GB','assembly:gb-plaster-crack-patch-repair','Plaster crack and patch repair','finish_assembly','candidate')
ON CONFLICT DO NOTHING;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t
CROSS JOIN (VALUES
  ('Subsidence Forum, Structural Movement in Buildings (BRE Digest 251 damage categories)','https://www.subsidenceforum.org.uk/pdf/Structural%20Movement%20in%20Buildings.pdf','Subsidence Forum','BRE Digest 251 categories 0 to 5 with crack width bands and recommended action; monitoring where a crack widens progressively'),
  ('NBS publication index, BRE Report BR 292 Cracking in buildings (2nd edition)','https://www.thenbs.com/publicationindex/documents/details?Pub=BRE&DocId=314033','BRE / NBS','Materials behaviour and the mechanisms that cause cracking in buildings'),
  ('BSI, BS 5492 Code of practice for internal plastering','https://knowledge.bsigroup.com/products/code-of-practice-for-internal-plastering','BSI','Backgrounds, application and finish standards for internal plastering'),
  ('BRE Group bookshop, technical publications','https://bregroup.com/store/bookshop/','BRE Group','Published defect, diagnosis and repair guidance'),
  ('SPAB, Advice: technical guidance for old buildings','https://www.spab.org.uk/advice','SPAB','Technical advice on traditional and historic plaster repair'),
  ('IHBC, Institute of Historic Building Conservation','https://www.ihbc.org.uk/','IHBC','Conservation practice guidance for historic fabric repair'),
  ('Scottish Government, Building standards technical handbook 2017: domestic','https://www.gov.scot/publications/building-standards-technical-handbook-2017-domestic/','Scottish Government','Domestic standards frame for fitness, safety and structural stability'),
  ('RICS, Consumer guides','https://www.rics.org/consumer-guides','RICS','Consumer guidance on cracks, movement and commissioning a structural assessment')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-plaster-crack-patch-repair'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t
CROSS JOIN (VALUES
  ('Image credit: Cracks in a church wall (Philip Halling, CC BY-SA 2.0)','https://commons.wikimedia.org/wiki/File:Cracks_in_a_church_wall_-_geograph.org.uk_-_6830328.jpg','Wikimedia Commons','Cover photograph overview article, CC BY-SA 2.0'),
  ('Image credit: Lath and plaster wall (Bill Nicholls, CC BY-SA 2.0)','https://commons.wikimedia.org/wiki/File:Lath_%5E_Plaster_Wall_-_geograph.org.uk_-_4534857.jpg','Wikimedia Commons','Cover photograph materials article, CC BY-SA 2.0'),
  ('Image credit: Plastering a wall, Donaghanie (Kenneth Allen, CC BY-SA 2.0)','https://commons.wikimedia.org/wiki/File:Plastering_a_wall%2C_Donaghanie_-_geograph.org.uk_-_5784055.jpg','Wikimedia Commons','Cover photograph installation article, CC BY-SA 2.0'),
  ('Image credit: Cracks in a church wall, detail (Philip Halling, CC BY-SA 2.0)','https://commons.wikimedia.org/wiki/File:Cracks_in_a_church_wall_-_geograph.org.uk_-_6830331.jpg','Wikimedia Commons','Cover photograph quality article, CC BY-SA 2.0'),
  ('Image credit: Painted wall (Bill Nicholls, CC BY-SA 2.0)','https://commons.wikimedia.org/wiki/File:Painted_wall_-_geograph.org.uk_-_8169523.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 2.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-plaster-crack-patch-repair'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'GB',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-plaster-crack-patch-repair'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'GB','GB',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('gb-plaster-crack-patch-repair-overview', 'UK Plaster Crack and Patch Repair: Chain Overview', 'A British overview of plaster crack repair: why a crack is a message rather than a fault, how the repair chain runs from assessment to repaint, and the point at which filling stops being the right answer.', $wallarticle1$# UK Plaster Crack and Patch Repair: Chain Overview

A crack in a plaster wall is information before it is a defect. It tells you what the building has done, what the finish was asked to absorb, and whether the movement that caused it has finished. Repairing plaster without reading that message is the most common way to spend money twice, because a filled crack that was caused by continuing movement will open again within a season and take the filler, the paint and the confidence of the person who paid for it with it.

This chain exists to slow that moment down. It runs in six stages: look, diagnose, prepare, repair, refinish, monitor. The stages are ordered by cost, and each one is cheaper than the one after it, which is the simplest argument for doing them all.

The British technical frame supports that ordering. Cracking in buildings is understood as a materials and movement problem rather than a cosmetic one, which is why BRE's published work on the subject deals with materials behaviour and the mechanisms that produce cracks rather than with fillers [2](https://www.thenbs.com/publicationindex/documents/details?Pub=BRE&DocId=314033). The classification most often used to decide what a crack means came out of BRE Digest 251, which sorts damage into categories 0 to 5 by width and by consequence, from hairline cracking that is indistinguishable from shrinkage and thermal movement up to widths over 25 millimetres where walls lean badly and shoring may be needed [1](https://www.subsidenceforum.org.uk/pdf/Structural%20Movement%20in%20Buildings.pdf). A crack's width, in other words, is not a cosmetic measurement. It is a risk measurement.

## Why a crack is a message

Plaster cracks for a handful of reasons, and the reasons have different answers. Shrinkage as the material dries, thermal movement of the background, moisture movement in timber or masonry, loading, and ground movement are the familiar five, and they do not look identical on a wall even though they can produce similar lines.

A crack that runs with a plasterboard joint, straight and fine, is usually a joint problem: the tape has failed, or the joint was never taped, or the boards have moved independently. A crack that runs diagonally from the corner of a window or a door is usually a movement problem at a weak point in the wall. A map-cracked surface with no single dominant line is usually a finish problem, often a hard brittle coat over a soft or moving background. A crack that has a step in it, or that is wider at the top than at the bottom, is usually asking for somebody who understands structures rather than somebody who understands filler.

The repair chain does not require the householder to diagnose the building. It does require the diagnosis to be attempted before the filler comes out of the van, because the repair method follows the cause and not the width alone.

## The six stages and what each one is for

Look is the stage that gets skipped. It means recording what is there: where the cracks are, how wide, how long, whether they taper, whether the doors and windows still operate, whether the floor is level, and whether the same line appears on the other side of the wall. BRE's damage assessment questions read almost like this list, and they exist because a crack surveyed properly is usually understood without opening anything up [1](https://www.subsidenceforum.org.uk/pdf/Structural%20Movement%20in%20Buildings.pdf).

Diagnose turns the survey into a hypothesis: movement that has stopped, movement that is continuing, or a failure local to the finish. That distinction decides everything downstream.

Prepare deals with the crack itself and the ground around it. Loose material comes out, edges are sound, dust is gone, and where the crack is a joint or a change of material the repair includes a reinforcement that will accept movement rather than fight it.

Repair fills the crack with something appropriate to its width and to the background, in a way that lets the filler move with the wall or, where the wall has stopped moving, in a way that restores the finish's surface.

Refinish makes the repair invisible: sanding, priming and repainting so the patch does not telegraph through the decoration.

Monitor is the stage that turns a repair into evidence. A repaired crack that is marked and dated, and looked at again in a few months, tells you whether the diagnosis was right. That is the cheapest structural investigation available to a householder.

## Where filling stops being the right answer

Filling is the right answer for a large share of cracks in British homes, and it is the wrong answer for a meaningful minority. The dividing line is not how the crack looks. It is whether the movement behind it is finished.

Where a crack is stable, filling and refinishing are the whole job. Where a crack is active, filling is decoration: it hides the symptom for a season and then reappears, usually wider, with the repair's own failure added to the evidence. Where a crack is wide enough to engage BRE's higher categories, the finish is not the subject at all and the wall is. Category 3 at 5 to 15 millimetres requires opening up and patching by a mason and may mean repointing externally; category 4 at 15 to 25 millimetres involves distorted frames, sloping floors and extensive damage; category 5 above 25 millimetres raises the question of instability and shoring [1](https://www.subsidenceforum.org.uk/pdf/Structural%20Movement%20in%20Buildings.pdf). No filler in the trade is designed for those categories, and no responsible repairer should be reaching for one.

The intermediate cases are where judgement matters, and where monitoring earns its keep. The same source makes the point plainly: a stable two millimetre crack may be dismissed as insignificant, but a crack widening by a millimetre a month is very significant [1](https://www.subsidenceforum.org.uk/pdf/Structural%20Movement%20in%20Buildings.pdf). Width tells you where you are. Rate of change tells you where you are going.

## Why the British frame emphasises standards

Internal plastering in the UK has a code of practice behind it, BS 5492, covering backgrounds, application and finish standards [3](https://knowledge.bsigroup.com/products/code-of-practice-for-internal-plastering). Its relevance to repair is indirect but real: a repair that ignores the background, or that builds a hard coat over a soft one, or that leaves a patch proud of the surrounding plane, is failing the same standards the original plaster was meant to meet. Repair work is often treated as a lesser craft than new work. The standards do not agree, and neither should a specification.

Heritage fabric adds a second frame. Traditional lime plasters are vapour permeable and comparatively flexible, and the conservation bodies that publish advice on them, SPAB and the IHBC among others, are consistent that repairs to old walls should use materials that behave like the original rather than harder modern substitutes [5](https://www.spab.org.uk/advice). A cement-rich patch in a soft lime wall does not merely look different. It concentrates stress at its edges and takes the surrounding plaster with it when the wall moves.

## What the later articles cover

The materials article deals with fillers, backing plasters, reinforcement tapes and the lime versus gypsum question. The installation article walks the repair sequence in order. The quality article is the assessment article in disguise: it works through the crack classification, the monitoring method and the record that proves the repair was appropriate. The maintenance article covers aftercare, repainting, and the signals that mean a structural opinion is needed rather than another tube of filler.

Read as a set, the chain argues one position. A crack is a question, the repair is an answer, and a good repair is one where the answer matches the question. Everything else in this series is detail hanging on that.

## Who does what in the repair chain

British plaster repair is unusual in how many different people can legitimately own a piece of it. A decorator fills and repaints. A plasterer patches and skims. A conservation plasterer takes on lime work in old fabric. A surveyor or structural engineer decides whether a crack is a finish problem or a building problem. In Scotland, local authority building standards teams become relevant where compliance is at stake.

That division is not bureaucracy. It follows the classification: each trade owns the part of the work its competence covers, and the handovers are where work goes wrong. A decorator who fills a category 3 crack has taken on work that belongs to a mason. A surveyor who specifies a lime repair without telling the decorator about the carbonation window has set up a failure. A plasterer who patches a lime wall with gypsum has produced a repair that will look correct for a season.

The household's interest is in the handover being explicit. Who assessed the crack, what band it fell into, who specified the repair, and who is coming back if it reopens. Four questions, answered in writing, and the chain stops being a series of guesses.

## Cost, and why the cheap repair is usually the expensive one

Repair costs are dominated by the assessment and the finish, not by the filler. A tube of filler is a few pounds; a bag of patching plaster is a few pounds more. The money goes into access, preparation, drying time, the second and third visits, and the repainting of a wall.

That cost structure explains a pattern that surprises householders. The repair that fills a crack in an afternoon and fails within a year costs more in total than the repair that monitored it for a season, filled it once and repainted the wall. The second is slower and looks more expensive on the first quote. The first is the one that gets repeated three times before anybody asks why.

There is also a hidden cost in the finish. Every repair that fails takes some of the surrounding plaster with it, and a wall with a history of repeated patches becomes progressively harder to bring back to a flat plane. The cheapest repair is the one that only has to happen once, which is the entire argument for doing the assessment properly.

## What a benign crack looks like

It is worth saying plainly what an ordinary, stable crack looks like, because the anxiety that surrounds cracked plaster often does more damage to a repair budget than the crack does.

A benign crack is usually thin, stable in width when measured over weeks, confined to the finish, and matched by nothing on the other face of the wall. Its edges may be slightly raised, which is typical of a filler or a paint film that has failed rather than the plaster beneath. It often appears at a junction: board joints, the line between a wall and a ceiling, the edge of a chimney breast, the corner of a window reveal. It does not affect the operation of a door or a window, and the wall around it sounds solid when tapped.

That is a long description for a small thing, but the list is exactly what an assessment records, and writing it down is what allows a householder to stop worrying and start repairing.

## What the chain costs in time

The chain is not fast, and pretending otherwise sets up disappointment. Assessment and monitoring can take a season where movement is in question. Preparation and filling are typically a day's work for a room with several cracks, spread over two visits to allow drying. Skimming adds another visit. Painting is a separate day.

A repair that skips the monitoring and the drying is a repair that can be done in an afternoon, and the difference in outcome between those two schedules is the subject of this series.

## References

1. Subsidence Forum, *Structural Movement in Buildings* (reproducing BRE Digest 251 damage categories).
2. NBS publication index, *BRE Report BR 292 Cracking in buildings* (2nd edition).
3. BSI, *BS 5492 Code of practice for internal plastering*.
4. BRE Group, *Bookshop and technical publications*.
5. SPAB, *Advice: technical guidance for old buildings*.
6. IHBC, *Institute of Historic Building Conservation*.
7. Scottish Government, *Building standards technical handbook 2017: domestic*.
8. RICS, *Consumer guides*.

## Image credit

The cover photograph shows cracks in a church wall, photographed by Philip Halling and made available under CC BY-SA 2.0 via Wikimedia Commons and geograph.org.uk. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 9, 'overview', 'https://upload.wikimedia.org/wikipedia/commons/b/b6/Cracks_in_a_church_wall_-_geograph.org.uk_-_6830328.jpg')
, ('gb-plaster-crack-patch-repair-materials', 'Crack Repair Materials: Fillers, Backing and Tape', 'A British materials guide to plaster repair: gypsum fillers and patching plasters, reinforcement tape and scrim, lime repair mortars for old walls, primers, and the compatibility rules that decide which one to use.', $wallarticle2$# Crack Repair Materials: Fillers, Backing and Tape

Crack repair has a short materials list and a long compatibility problem. The list is filler, backing, tape, primer and paint. The problem is that the wrong filler on the wrong background fails in a way that looks like the crack coming back, which sends the householder looking for a better filler when the real fault was a mismatch.

## What a filler is actually being asked to do

A filler has to do three things at once. It has to fill the void without shrinking away from it. It has to move with whatever the surrounding finish does, or be strong enough that the finish moves around it. And it has to accept paint without flashing, grinning or telegraphing through the decoration.

Those three requirements pull in different directions. A filler that is very hard and very strong will resist shrinkage but will not move with a timber frame or a lime wall, and a hairline crack will reappear at its edges. A filler that is soft and flexible will move happily and will show every irregularity under a sheen paint. The trade's answer is a family of products, each positioned between those poles, and the skill is in choosing rather than in filling.

Applicators work with three broad families. Powder fillers, mixed on site, set by chemical action and can be built out in deeper sections in one go. Ready-mixed fillers, which are convenient and dry by evaporation, which makes them slower and slightly more prone to shrinking on deep fills. And repair plasters or patching plasters, which are really a small plastering job in a bag and are used where the crack is part of a bigger area of failed finish.

## Reinforcement: tape, scrim and mesh

Where a crack is a joint or a line that is likely to move again, the repair includes reinforcement. Paper tape, glass-fibre scrim and self-adhesive mesh all do the same conceptual job: they bridge the line and spread the movement across a wider band of filler so that no single hairline takes all of it.

Paper tape is the traditional choice on plasterboard joints and gives a strong, low-profile repair when bedded in filler and then covered. Fibre scrim is quicker and more forgiving of an uneven joint, and it is stronger in tension, but it is bulkier and telegraphs more under a tight skim. Mesh tape sits between the two and is often used on plaster repairs where the surface will be skimmed afterwards.

The choice matters less than the bedding. Tape that is stuck over the crack rather than bedded into a filler bed is a tape that will lift, and a bridged crack with a proud tape edge is a visible defect under paint. Reinforcement does not stop movement. It distributes it.

## Lime versus gypsum: the compatibility question

Traditional British plasterwork is lime based, and lime plasters are vapour permeable and comparatively soft and flexible. Gypsum plasters are harder, set faster and do not tolerate persistent moisture. Putting the second over the first is the single most common materials error in old-building repair, and it fails because the hard patch and the soft background respond differently to the same movement.

Conservation guidance is consistent on the principle: repairs to traditional plaster should use materials that behave like the original [5](https://www.spab.org.uk/advice), and the bodies that advise on historic fabric, including the IHBC, treat that compatibility as a conservation requirement rather than a preference [6](https://www.ihbc.org.uk/). In practice this means lime putty mortars, hydraulic lime mortars or proprietary lime repair products for old walls, and gypsum fillers and plasters where the background is plasterboard or a modern gypsum system.

The practical test is the background rather than the age of the building. A 1930s house with gypsum plaster and plasterboard partitions is a gypsum job. A Victorian cottage with lath and lime plaster is a lime job, and a hard filler used in it will be visible at its edges within a heating season.

## Backing and deep repairs

A crack that is wide enough to need backing is no longer a filler job in the narrow sense. Lath and plaster ceilings that have lost their key, and walls where the plaster has come away from the background, need the plaster reattached or the void filled before any surface repair makes sense.

The materials for that stage are mechanical and chemical: plaster washers or screws to re-secure sound plaster to its backing, a consolidating primer or a bonding agent on the exposed background, and a backing plaster or repair mortar to build the lost thickness back in layers rather than in one heroic fill. British practice for these repairs sits comfortably inside the general frame of BS 5492, which addresses backgrounds and application rather than only the finished face [3](https://knowledge.bsigroup.com/products/code-of-practice-for-internal-plastering).

## Primers, sealers and paint compatibility

Primers do two jobs in a repair. They control suction, so a porous patch does not rob the filler or the paint of its water and leave it weak. And they improve adhesion between dissimilar materials, which is exactly what a repair is.

The rule that avoids most trouble is to prime the repair with the same system the finish will use. A gypsum patch under emulsion wants a thinned first coat or a proprietary sealing primer; a lime patch wants a breathable primer or a mist coat that does not seal the surface. Where the surrounding wall is painted with a silk or eggshell finish, a matt patch will read differently under raking light, and the honest fix is to bring the whole wall to a uniform finish rather than to chase a perfect blend on a small area.

Stain-blocking matters where a repair has been damp. A water stain that is painted over without a blocker will bleed through, and the householder will blame the filler for a problem that belongs to the leak.

## The short list that covers most repairs

For the majority of British domestic repairs, the list is modest: a powder filler for hairline and medium cracks, a patching plaster or repair mortar for areas and depth, paper tape or scrim where a joint or a moving line is involved, a primer compatible with the finish, and the paint that will cover the lot. Add lime repair materials where the background is lime, a consolidating primer where the background is dusty or friable, and plaster washers where the plaster has debonded.

The list is short because the work is small. The failures come from the pairs, not the singles: hard filler on soft background, tape without a bed, primer that seals a lime wall, paint that flashes over a patch. Choose for the pair and the repair will hold.

## What manufacturers will and will not promise

Filler manufacturers publish drying times, sanding guidance and the maximum depth for a single application, and those numbers are the specification. What no manufacturer promises is that their product will hold a crack that is still moving, and several are explicit in their literature that the background must be sound and stable before the product is used.

That qualification matters in a market where the shelf packaging is reassuring and the instructions are small. A ready-mixed filler that says it will not shrink or crack is describing its own behaviour, not the wall's. A powder filler that says it can be built out to a substantial depth is describing a depth capability, not a structural one.

Reading the data sheet takes five minutes and answers the two questions that decide most repairs: how deep can this go in one pass, and what does it need underneath it to bond. Both answers are usually more conservative than the habit of the person applying it.

## Textured and papered walls

A repair in a textured or papered wall is a finish question before it is a plaster question. Where a wall carries a textured coating, the repair has to reproduce the texture or the patch will read as a smooth island in a rough field, and no filler does that on its own. Where a wall carries wallpaper, the paper has to be cut back cleanly, the plaster repaired, and the paper reinstated, which in practice means a decorator is doing the work rather than a plasterer.

Lining paper is often the honest answer in these rooms. A repaired wall with several patches can be brought back to a uniform surface by lining and then decorating, which hides the repairs under a consistent sheet rather than asking paint to disguise texture differences it cannot disguise.

The materials for those routes belong in the same list: filler, primer, lining paper and paste, plus enough paint to finish the wall rather than the patch.

## The tools that belong to the repair

The tool list is small and most of it is already in a household toolbox: a filling knife in two widths, a scraper, a sanding block, a brush, a sponge, a dust sheet and a vacuum. What changes the quality of the outcome is the second tier: a broad knife or trowel for feathering, a straight edge to check the plane, and a raking light.

The raking light is the most underrated item on the list. A worklight or a torch held almost parallel to the wall shows every hollow, every proud edge and every unfilled line, and it shows them while the filler is still soft enough to correct. Sanding without one is sanding blind.

For larger patches, a plasterer's trowel, a hawk and a mixing bucket complete the set. For lime work, a spray bottle and a wooden float are the traditional companions, and they exist because lime rewards a lighter touch than gypsum.

## Buying in the right quantity

Filler is sold in tubes, tubs and bags, and the quantities are misleading in both directions. A tube looks generous and covers a surprising number of hairline cracks, while a bag looks industrial and is often the right purchase for a room with several medium repairs.

Buying slightly more than the estimate is sensible because a second trip to a merchant costs more in time than the surplus costs in money, and a repair that runs out of filler halfway along a crack will have a visible joint where the two mixes meet. Buying far more than the estimate is how garages fill up with half-used tubs that dry out before the next repair.

## Storage between jobs

Filler and plaster are perishable in a quiet, unglamorous way. Powder products take up moisture from the air once the bag is open, which shortens their working time and produces lumps that never mix out. Ready-mixed products skin over in the tub and lose workability long before they are empty. Lime putty, stored properly under a layer of water, keeps far longer than anything else in the kit, which is one of the small practical advantages of traditional materials.

Storing materials dry, sealed and off a cold floor is enough to keep them usable between repairs, and it means the next small crack is a twenty minute job rather than a trip to a merchant.

## References

1. Subsidence Forum, *Structural Movement in Buildings* (reproducing BRE Digest 251 damage categories).
2. NBS publication index, *BRE Report BR 292 Cracking in buildings* (2nd edition).
3. BSI, *BS 5492 Code of practice for internal plastering*.
4. BRE Group, *Bookshop and technical publications*.
5. SPAB, *Advice: technical guidance for old buildings*.
6. IHBC, *Institute of Historic Building Conservation*.
7. Scottish Government, *Building standards technical handbook 2017: domestic*.
8. RICS, *Consumer guides*.

## Image credit

The cover photograph shows a lath and plaster wall, photographed by Bill Nicholls and made available under CC BY-SA 2.0 via Wikimedia Commons and geograph.org.uk. It is a real photograph, not AI generated, and it shows the traditional background that decides whether a repair should be lime based or gypsum based. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 8, 'materials', 'https://upload.wikimedia.org/wikipedia/commons/2/23/Lath_%5E_Plaster_Wall_-_geograph.org.uk_-_4534857.jpg')
, ('gb-plaster-crack-patch-repair-installation', 'Plaster Repair Installation: Rake, Bed, Fill, Skim', 'A British step-by-step repair sequence: raking out, stabilising the background, bedding reinforcement, filling in layers, skimming and sanding, with the cure times that stop a repair reopening.', $wallarticle3$# Plaster Repair Installation: Rake, Bed, Fill, Skim

A plaster repair has a sequence, and the sequence is what separates a repair that disappears from one that returns with the next heating season. This article follows the work in the order it should be done, from a sound edge to a painted wall, on the assumption that the assessment has already decided the crack is stable enough to fill.

## Step one: prove the crack is worth repairing now

Before any tool comes out, the crack gets its date and its width. A pencil mark, a photograph with a ruler alongside, or a proprietary crack gauge all do the job. The record is what makes the next inspection meaningful, and it takes a minute.

Where the crack is in BRE category 0 or 1, meaning hairline to about a millimetre with damage limited to the finish, the repair is straightforward decoration [1](https://www.subsidenceforum.org.uk/pdf/Structural%20Movement%20in%20Buildings.pdf). Where it is wider, or where the wall has moved enough to affect doors, windows or floors, the sequence below is still the sequence, but it should not start until somebody has decided what the movement is doing.

## Step two: rake out and sound the edges

A crack is not a groove and should not be treated as one. The repair needs an edge that the filler can key into, so the crack is opened slightly with a filling knife, a scraper or a small chisel to remove loose material and any dust or old filler inside it. The aim is a shallow V or a clean-sided slot, not a trench.

Around the crack, the surrounding plaster is sounded with a knuckle or a handle. Hollow areas are marked and treated as part of the repair, because a hollow patch next to a filled crack will fail on its own schedule and take the new work with it. Where a hollow is large, the loose plaster comes off back to sound material, and the repair becomes a patch rather than a crack.

The last act of this step is dust removal, with a brush and then a vacuum. Dust is the most common reason a filler does not bond, and it costs nothing to remove.

## Step three: stabilise the background

Preparation continues into the background. A dusty or friable surface is primed or sealed with a consolidating product, because a filler applied to a chalky surface bonds to the chalk rather than to the wall. A very porous background is dampened or primed to control suction, so that the filler keeps enough water to cure properly. Timber and metal backgrounds, where a crack runs along a junction, get a repair method that allows movement rather than one that fights it.

Where the plaster has debonded from its backing, this is the step where it is reattached. Plaster washers or screws through the sound plaster into the backing, with the heads set below the surface, followed by a bonding agent over the fixing area, restore the connection between finish and wall. The repair then treats the fixed area as solid and fills over it.

## Step four: bed the reinforcement

Where the crack is a joint, a change of material or a line that is likely to move again, reinforcement is bedded now. A bed of filler or jointing compound is laid along the line, the tape or scrim is pressed into it while it is still wet, and the tape is then covered with a second pass once the bed has firmed.

The technique matters more than the product. Tape must be fully embedded with no air beneath it and no dry edges, and it should extend beyond the ends of the crack so that the movement is spread into sound material on both sides. Mesh tape applied over a dry wall and skimmed immediately will hold briefly and fail quietly.

## Step five: fill in layers

Filling is done in layers, and the depth decides how many. A hairline crack takes one pass with a fine filler, worked in with a knife at a shallow angle and finished flush. A medium crack takes two passes, the first to fill most of the depth and the second, after the first has firmed, to bring the surface flush. A deep void takes a backing fill first, with a repair mortar or patching plaster rather than a surface filler, and the surface filler comes last.

Each pass is left to set before the next, and each is finished slightly proud rather than flush. Proud filler sands back to the plane; flush filler sands back to a hollow. That single habit is the difference between a repair that disappears and one that shows as a shallow shadow in raking light.

Where the repair is a patch rather than a line, the same logic applies at larger scale: build the thickness back in layers, scratch the surface of each layer to give the next one a key, and bring the final layer just proud of the surrounding plaster.

## Step six: skim and blend

A patch in a plastered wall usually needs a skim to blend into the surrounding surface, and a skimming plaster or a fine finishing filler is the material for it. The skim is applied thin, worked flat with a trowel or broad knife, and feathered out well beyond the repair so that the transition happens gradually rather than at a visible line.

Feathering is where amateur repairs announce themselves. A patch that stops abruptly at its edge, even if it is perfectly flush in the middle, will show under paint because the paint sits differently on a raised or textured edge. Two extra minutes with the knife at a shallow angle is the whole remedy.

Cure times belong here rather than at the end. A gypsum filler that is sanded before it has fully set will drag and tear; a lime repair that is painted before it has carbonated will trap moisture and fail. The manufacturer's cure window is the specification, and the finish waits for it.

## Step seven: sand, prime and finish

Sanding is a light pass with a fine abrasive on a block, with a raking light across the surface to reveal what the eye misses in flat light. The dust is removed, the repair is primed with a product compatible with the final paint, and the wall is painted.

Where the surrounding finish is textured, the repair is textured to match before painting, which is a separate skill and often the reason a repair in a textured wall is visible even when it is perfectly flat. Where the surrounding wall is silk or eggshell, the repair rarely disappears entirely, and the honest answer is to repaint the whole wall.

## Step eight: date it and watch it

The final step is the one that turns a repair into a record. The date goes on the back of the photograph, the width goes in the note, and a note goes in the diary for six months' time. If the line returns, the record tells you how fast and how wide, which is exactly what a professional would ask before diagnosing anything.

## Common failures and what causes them

The recurring failures are few and well understood. Filler that shrinks and pulls away from the edges: the crack was too deep for a single pass of a ready-mixed product. Tape that lifts: it was not bedded. A hard patch on a soft lime wall: the materials were mismatched. A repair that reopens in the same place each winter: the movement is thermal and the repair needs a more flexible method, not a stronger filler. A patch that flashes under paint: it was not primed to match the surrounding suction.

None of those failures is mysterious, and all of them are decided in the first three steps rather than the last three. That is the general rule of this chain, and it is why the quality article spends so little time on tools.

## Working on ceilings, and why gravity changes the method

Ceiling repairs follow the same sequence with two differences that matter. Gravity is against the filler, so deep fills need a backing or a series of thin passes rather than one load that sags before it sets. And access is awkward, which means the work is slower and the temptation to overfill is stronger.

Lath and plaster ceilings add a third difference: the plaster may have lost its key, meaning the nibs of plaster that once gripped between the laths have broken away. A crack in such a ceiling is often the visible part of a larger debonding, and the repair includes reattaching the plaster to the laths with washers or screws before any filling. A ceiling that sounds hollow across a wide area, or that sags noticeably, is a ceiling for a plasterer rather than a decorator, and possibly for a joiner if the laths themselves are failing.

## Protecting the room while you work

Repair dust travels further than people expect, and fine filler dust settles on every surface in a room within an hour. Sheeting the floor, covering furniture, closing doors to the rest of the house and ventilating the work area are not fussiness: they are the difference between a repair and a fortnight of cleaning.

The same applies to water. Wet fillers, damp sponges and washing down all introduce moisture into a room, and a room that is already cold and poorly ventilated will hold that moisture in its walls. Heating and ventilation during the work are part of the method, not an afterthought.

## Working in stages over several days

The most common scheduling mistake in domestic repair is trying to complete a room in one day. The sequence has drying built into it, and drying cannot be compressed without cost.

A workable schedule for a room with several cracks spreads across three visits. The first visit assesses, rakes out, secures any hollow plaster and primes. The second fills, beds any reinforcement and brings the repairs proud, then leaves them to set. The third sands, skims where needed, primes and paints. Where the repairs are deep or the room is cold, the third visit splits again.

Staging has a practical benefit beyond drying. Each stage is inspected before the next one covers it, which means a hollow patch or a poorly bedded tape is found while it can still be corrected cheaply rather than after the paint has gone on.

## Cleaning tools while the material is wet

The last habit worth building is cleaning as you go. Filler and plaster set on tools as readily as they set on walls, and a knife left with a ridge of hardened filler will scratch the next repair it touches. A bucket of water and a sponge beside the work means every tool is clean before it is put down, and the difference in the quality of the following day's work is immediate.

## References

1. Subsidence Forum, *Structural Movement in Buildings* (reproducing BRE Digest 251 damage categories).
2. NBS publication index, *BRE Report BR 292 Cracking in buildings* (2nd edition).
3. BSI, *BS 5492 Code of practice for internal plastering*.
4. BRE Group, *Bookshop and technical publications*.
5. SPAB, *Advice: technical guidance for old buildings*.
6. IHBC, *Institute of Historic Building Conservation*.
7. Scottish Government, *Building standards technical handbook 2017: domestic*.
8. RICS, *Consumer guides*.

## Image credit

The cover photograph shows plastering work on a wall at Donaghanie, photographed by Kenneth Allen and made available under CC BY-SA 2.0 via Wikimedia Commons and geograph.org.uk. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 9, 'installation', 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Plastering_a_wall%2C_Donaghanie_-_geograph.org.uk_-_5784055.jpg')
, ('gb-plaster-crack-patch-repair-quality', 'Assessing a Crack Before Repair: Quality Gates', 'A British assessment method for plaster cracks: reading the BRE damage categories, measuring and monitoring width, testing for hollow plaster, and knowing when repair should wait for a structural opinion.', $wallarticle4$# Assessing a Crack Before Repair: Quality Gates

Quality control in plaster repair is mostly assessment, because a repair is only as good as the diagnosis that chose it. A perfectly executed fill in an active crack is a high-quality mistake. This article sets out the gates that decide whether repair should proceed, and what evidence should exist when it does.

## Gate one: is the finish the problem or the wall

The first question is scope. A crack that is confined to the finish, with sound plaster on both sides and no corresponding line on the other face of the wall, is a finish problem. A crack that appears on both faces, or that has displaced the finish on one side of it, is a wall problem wearing a finish.

The test is simple and needs no tools. Look at the other side of the wall. Look at the ceiling below a first-floor room. Look at the door and window openings in that wall: do they still close as they should? A door that has started to catch, or a window that no longer sits square in its reveal, turns a cosmetic question into a structural one, and the plaster repair should wait.

## Gate two: the width, in BRE terms

Width is the shared language between a householder and a professional, and BRE Digest 251 supplies the vocabulary [1](https://www.subsidenceforum.org.uk/pdf/Structural%20Movement%20in%20Buildings.pdf). Its categories, as reproduced in industry guidance, run from category 0, hairline at about 0.1 millimetres, where no action is required, through category 1 at up to 1 millimetre with damage generally restricted to internal wall finishes and fine cracks easily treated during normal decoration, and category 2 at up to 5 millimetres where doors and windows may stick slightly and cracks are easily filled.

Category 3 begins at 5 millimetres and runs to 15, with doors and windows sticking, service pipes possibly fractured and weather tightness often impaired, requiring some opening up and patching by a mason. Category 4, at 15 to 25 millimetres, brings distorted frames, noticeably sloping floors and walls leaning or bulging, and calls for breaking out and replacing sections of wall. Category 5, above 25 millimetres, describes beams losing bearing, walls leaning badly and requiring shoring, with a danger of instability [1](https://www.subsidenceforum.org.uk/pdf/Structural%20Movement%20in%20Buildings.pdf).

The categories do more than measure. They attach an action to each width band, and the actions escalate from decoration to masonry to rebuilding. A repairer who knows the band knows which trade the job belongs to.

## Gate three: is it moving

A single measurement is a photograph; two measurements are a trend. Where there is any doubt, the crack is monitored rather than filled, and the monitoring is set up properly: a dated mark at each end, a gauge or a pair of tell-tales fixed across the crack, a record of width at a fixed point, and a defined interval.

The published guidance is explicit about why: a stable two millimetre crack can be dismissed as insignificant, while a crack increasing by a millimetre a month is very significant [1](https://www.subsidenceforum.org.uk/pdf/Structural%20Movement%20in%20Buildings.pdf). The same guidance notes that where doubt remains, crack or level monitoring may be necessary, and that a wider inspection of the building and neighbouring properties often explains what a single room cannot.

Seasonality is the trap. Many cracks open in winter and close in summer, which is thermal and moisture movement rather than progressive damage, and a repair done in the wrong season on an unmortared assumption will always reopen. Monitoring across a season is slower than a householder wants and cheaper than a wrong repair.

## Gate four: is the plaster sound around it

The repair's boundary is the sound plaster, so the assessment has to find it. Tapping the wall across a grid, listening for the change from a firm ring to a hollow note, maps the debonded area. The map decides whether the job is a crack repair, a patch repair or a re-skim of a whole wall.

A crack that runs to the edge of a hollow area is telling you that the hollow is part of the crack's cause, not a coincidence. Repairing the line and leaving the hollow is the most common reason a repair fails within a year of being finished.

## Gate five: what is the background and how old

The background decides the repair material, which is why the assessment records it. Plasterboard and modern gypsum plasters take gypsum fillers and tapes. Lath and lime plaster takes lime-based repair materials, because a hard modern patch in a soft traditional wall concentrates stress at the edges [5](https://www.spab.org.uk/advice).

Age and construction matter for a second reason: older buildings move more, and their finishes were designed to accommodate it. The conservation advice bodies, SPAB and the IHBC among them, treat material compatibility in historic fabric as a requirement rather than an aesthetic preference [6](https://www.ihbc.org.uk/). An assessment that records the background honestly is an assessment that will produce a repair matching the wall.

## Gate six: moisture

Damp changes everything. A crack that is wet, or that sits in a wall with a history of damp, is not a candidate for filling until the water source is understood, because filler over a damp background will fail and paint over damp will blister. The assessment therefore includes a moisture reading and a look for the usual sources: failed external render, blocked gutters, raised external ground levels, and internal plumbing.

Where moisture is present, the repair sequence starts with the cause and comes back to the finish later. That ordering is standard in British defect practice and is reflected in the way the standards treat backgrounds and drying before plastering [3](https://knowledge.bsigroup.com/products/code-of-practice-for-internal-plastering).

## Gate seven: the record and the decision

The final gate is documentary. A competent assessment produces a page with the crack location, its width band, its movement status, the extent of hollow plaster, the background type, moisture readings and a recommendation. That page is what turns a verbal opinion into a specification, and it is what a second contractor will ask for if the repair is ever questioned.

## When the answer is not a plaster repair

Some cracks should not be repaired by a decorator at all. Cracks in the higher BRE bands, cracks accompanied by distorted openings or sloping floors, cracks that widen measurably over weeks, and cracks in a wall that is bulging or leaning all point to a structural assessment before any finish work. RICS publishes consumer guidance on how such assessments work and what a surveyor will look for, and it is worth reading before commissioning one [8](https://www.rics.org/consumer-guides).

The same applies in Scotland, where the building standards frame treats fitness and structural stability as matters of compliance rather than decoration [7](https://www.gov.scot/publications/building-standards-technical-handbook-2017-domestic/). A finish repair that disguises a stability problem is not a repair at all.

## Why assessment is the quality system

There is no instrument that measures whether a filler was applied well. There is a great deal of evidence about whether the right repair was chosen, and almost all of it exists before the first tool comes out. That is why this chain puts the gates at the front, and why a document with a width, a date and a photograph is worth more than a very neat patch.

## Reading a crack's direction

The direction of a crack is a clue that costs nothing to read. Vertical cracks in a wall often follow a joint, a chase, or a junction between different materials, and they are frequently about differential movement rather than structural distress. Diagonal cracks that start at the corner of an opening are the classic signature of movement concentrating at a weak point, which is why surveyors look at openings first.

Horizontal cracks are less common in domestic plaster and deserve more attention, particularly near the top of a wall or just above a floor, where they can indicate something more than a finish problem. Cracks that follow a neat curve around a patch of plaster are usually about the patch, not the wall: a hard repair surrounded by a softer material cracks at its own edge.

None of this is diagnosis. It is triage, and triage is what decides whether the next call is to a decorator or to somebody who can read a building.

## The value of a second opinion before spending

Where the uncertainty is real, the cheapest professional input is a short inspection rather than a full survey. A surveyor or an experienced plasterer can usually tell within half an hour whether a crack is in the finish or in the building, and that half hour frequently saves the cost of a repair done twice.

The value is not only in the answer. It is in the record: a dated note from somebody who knows what they are looking at is exactly the evidence a householder needs if a later repair is questioned or if the crack needs to be compared against its future self.

## Photographing the evidence

Photographs are the cheapest assessment instrument available, and they are usually taken badly. The useful photograph is taken square on to the wall with a scale in frame, a ruler, a coin or a crack gauge, and a second one taken close enough to show the crack's edges. A third, taken at an angle with light raking across the surface, shows whether the plaster around the crack has dished or lifted.

Dates matter as much as images. A folder of files named by date is a monitoring record; a camera roll of similar pictures is not. The same discipline applies to the repair itself: a photograph of the finished, painted repair with its date is the reference for every future comparison, and it takes ten seconds.

## Judging the repair after the event

A repair can be judged on four criteria, and none of them requires expertise. Is the surface flat when a straight edge is laid across it. Does the repair disappear in ordinary light from a normal viewing distance. Does it disappear in raking light, which is the harder test. And has the line stayed closed through a heating season.

The first three can be assessed within a week of the paint drying; the fourth needs time. A repair that passes the first three and fails the fourth was almost certainly the right repair applied to the wrong diagnosis, which is why the assessment record matters more than the finish.

## References

1. Subsidence Forum, *Structural Movement in Buildings* (reproducing BRE Digest 251 damage categories).
2. NBS publication index, *BRE Report BR 292 Cracking in buildings* (2nd edition).
3. BSI, *BS 5492 Code of practice for internal plastering*.
4. BRE Group, *Bookshop and technical publications*.
5. SPAB, *Advice: technical guidance for old buildings*.
6. IHBC, *Institute of Historic Building Conservation*.
7. Scottish Government, *Building standards technical handbook 2017: domestic*.
8. RICS, *Consumer guides*.

## Image credit

The cover photograph shows a further view of cracks in a church wall, photographed by Philip Halling and made available under CC BY-SA 2.0 via Wikimedia Commons and geograph.org.uk. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 9, 'quality', 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Cracks_in_a_church_wall_-_geograph.org.uk_-_6830331.jpg')
, ('gb-plaster-crack-patch-repair-maintenance', 'After a Repair: Repainting and Watching the Line', 'A British aftercare guide for repaired plaster: cure and painting windows, blending the finish, keeping a watching brief on the crack, and the changes that mean calling a professional.', $wallarticle5$# After a Repair: Repainting and Watching the Line

A plaster repair is not finished when the filler is smooth. It is finished when the paint has cured, the patch has become invisible in ordinary light, and the line has been watched long enough to know the diagnosis was right. This article deals with that last stretch, which is where most of the disappointment in domestic repair work is generated.

## Let the repair cure before the paint goes on

The temptation after a repair is to paint the same day. Every material in the sequence has a cure window, and paint applied early traps water in the filler or the plaster, which produces a soft patch, a blush under the sheen or, in a lime repair, a surface that never quite hardens.

Gypsum fillers and patching plasters need to be fully set and then dry, which are two different conditions: set is chemical, dry is evaporative. A deep patch can be set within an hour and still be damp inside for days. Lime repairs need longer again, because lime hardens by carbonation, taking in carbon dioxide from the air over a period measured in weeks rather than hours, which is why breathable paint and patience belong together on old walls.

The practical rule is to follow the manufacturer's stated window and then add margin where the repair is deep or the room is cold. A cold room slows everything, and a repair painted at ten degrees takes materially longer than one painted in a warm, ventilated space.

## Prepare the surface, not just the patch

Painting over a repair without preparing the junction is the second most common reason a patch shows. Filler dust sits in the feathered edge and stops the paint bonding, so the whole area is dusted off and, where needed, wiped. A repair that sanded to a slightly burnished surface is keyed lightly so the paint has something to grip.

Priming then does the work described in the materials article: it equalises suction between the patch and the surrounding wall so the paint dries at a similar rate across both. A patch that dries faster than its surroundings pulls the binder in and reads as a dull spot, which is the flash that makes a good repair look like a repair.

## Blend, and know when to repaint the wall

Small repairs can be blended, particularly in a matt finish, by feathering the paint out well beyond the patch and using a roller rather than a brush for the final coat. In a silk, eggshell or washable finish, blending is much harder, because those finishes catch light differently and a patch will often show as a sheen difference even when the colour matches.

The honest answer in those finishes is to repaint the wall corner to corner. It costs a litre of paint and an afternoon and it removes the variable that no amount of technique can fix. Where a wall is one of a pair, both are usually repainted so the room reads evenly.

Colour matching deserves a mention because it defeats a lot of otherwise good repairs. Paint fades and yellows, and a fresh tin of the same colour is rarely a perfect match to a wall that has aged. Touching in with the original tin is usually closer than a new tin, and repainting a whole wall is closer again.

## Keep the watching brief

After the repair, the crack gets a mark and a date. If it is a line that was monitored before repair, the same reference points are reused so the comparison is direct. If it was not monitored, the repair itself becomes the reference: the fresh paint makes any reopening immediately obvious.

The watching brief has a defined period and a defined question. Six months covers a heating season in most British homes, which is long enough to catch thermal movement and short enough that a failure is still cheap to address. The question is not whether a hairline has appeared somewhere in the room, but whether the repaired line has reopened, and whether it is doing so progressively.

A reopened line is not automatic evidence of a bad repair. It is evidence that the movement was not finished, or that the repair method needed to allow more movement than it did. Either answer is useful, and both are better than not knowing.

## Touch-up and re-repair without starting over

If the repair holds and only the paint has suffered, the fix is a touch-up: sand the affected area lightly, spot prime and repaint. If the repair has reopened as a hairline, a second repair is often appropriate, this time with reinforcement across the line so the movement is distributed rather than concentrated in a single pass of filler.

If the line reopens at the same width as before, in the same place, twice, the third attempt should not be a third fill. The pattern is telling you that the method does not suit the movement, and the next step is either a more flexible repair or a look at the cause.

## What the household can reasonably do

The household can keep the room ventilated, keep the heating steady, watch the line at the intervals set out at the repair, and deal with touch-ups promptly. It can also keep the record: the photograph, the date, the width, the material used and the name of anyone who worked on it. That record is short, and it is the difference between a well-informed repair and a fresh start every five years.

What the household should not do is keep filling an active crack. Repeated filling is a way of paying for the same information many times over.

## When to call somebody

There are clear signals that the next decision belongs to a professional. A crack that widens measurably over weeks rather than seasons. A crack accompanied by a door or window that has started to bind. A floor that has developed a noticeable slope. Plaster that has begun to bulge or to sound hollow across a large area. Damp that returns after a repair. Any crack in the higher BRE categories, where the guidance already points to masonry work or structural assessment rather than decoration [1](https://www.subsidenceforum.org.uk/pdf/Structural%20Movement%20in%20Buildings.pdf).

RICS consumer guidance explains what a structural assessment involves and how to commission one, and reading it before making the call makes the conversation much more productive [8](https://www.rics.org/consumer-guides). In Scotland, the building standards frame provides the wider context in which stability and fitness are judged [7](https://www.gov.scot/publications/building-standards-technical-handbook-2017-domestic/).

## Why aftercare is part of the craft

The repair trade has a phrase for the finish that looks right on the day and fails within a year, and it is not a kind one. Aftercare exists to make sure the work gets the cure, the paint system and the observation it needs to prove itself.

That is a modest ambition and it is the whole point of this chain. A repaired crack that nobody has to think about again is the best possible outcome, and it is achieved by the boring disciplines: cure, prime, blend, watch and record.

## Heating, ventilation and the life of a repair

A repaired wall lives in the same environment as the rest of the room, and that environment decides how long the repair lasts. Steady background heating with reasonable ventilation keeps plaster dry and stable. A room that is heated hard and then left cold for weeks moves more, and finishes at the edges of repairs feel that movement first.

Ventilation matters more in kitchens, bathrooms and anywhere the repair is near a moisture source. A crack near a shower or a sink will be exposed to humidity cycles that a hallway never sees, and the repair there should be finished with a paint system rated for the exposure rather than a standard emulsion.

None of this is dramatic advice. It is the ordinary management of a building, applied to a small patch of plaster that happens to be the place where the building's behaviour becomes visible.

## Keeping the record useful

A record is only useful if it is findable. That means one place, physical or digital, with the dated photographs, the note of what was found, the materials used and the name of whoever did the work. Photographs taken with a ruler or a coin in frame are worth more than photographs that show only the crack.

The record has a second life too. When a house is sold, a documented repair with a monitoring history is a better answer to a buyer's question than a verbal assurance. When a repair fails, the record is what allows a professional to advise in one visit rather than three.

## Repainting the whole wall: a practical sequence

Where a wall is being repainted rather than touched in, the sequence protects the repair. The wall is cleaned first, because dust and grease on the surrounding paint will show once fresh paint goes on. Any remaining defects elsewhere on the wall are filled and sanded at the same time, so the wall is brought to one standard rather than two.

The repair is primed before the first full coat, and the first coat is thinned as the manufacturer directs, which is the mist coat that seals the new work and binds any residual dust. The finish coats follow, applied with a roller for even texture and worked into the corners with a brush before the roller passes.

Cutting in around ceilings and edges is done first, one wall at a time, so the cut line stays wet enough to blend. A wall painted in one continuous sequence dries evenly; a wall painted in fragments shows the fragments.

## Seasonal checks that take ten minutes

Two checks a year cover most of what a household needs to know about its plaster. In autumn, before the heating goes on, walk the rooms and look at the walls in low raking light from a window. In spring, after the heating season, do the same. Cracks that open and close across those two visits are responding to temperature and moisture, and they are usually stable in the structural sense even though they are annoying in the decorative one.

Anything that has changed between the two visits, rather than returned to its starting width, is the item worth a professional look. That simple comparison, done twice a year, replaces most of the guesswork in domestic plaster maintenance.

## What good aftercare looks like a year on

A year after a well-executed repair, the wall should be unremarkable. The paint should be even, the repair invisible in ordinary light, and the line closed. Nothing about the room should draw attention to the work that was done in it.

That is a modest standard and it is the correct one. Plaster repair is successful when it disappears, and the disciplines in this article, cure, prime, blend, watch and record, exist to make that disappearance reliable rather than lucky.

## References

1. Subsidence Forum, *Structural Movement in Buildings* (reproducing BRE Digest 251 damage categories).
2. NBS publication index, *BRE Report BR 292 Cracking in buildings* (2nd edition).
3. BSI, *BS 5492 Code of practice for internal plastering*.
4. BRE Group, *Bookshop and technical publications*.
5. SPAB, *Advice: technical guidance for old buildings*.
6. IHBC, *Institute of Historic Building Conservation*.
7. Scottish Government, *Building standards technical handbook 2017: domestic*.
8. RICS, *Consumer guides*.

## Image credit

The cover photograph shows a painted wall, photographed by Bill Nicholls and made available under CC BY-SA 2.0 via Wikimedia Commons and geograph.org.uk. It is a real photograph, not AI generated, and it illustrates the decorated surface a repair has to blend into. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 8, 'maintenance', 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Painted_wall_-_geograph.org.uk_-_8169523.jpg')
) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='GB' AND t.candidate_key='assembly:gb-plaster-crack-patch-repair'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='GB' AND t.market_code='GB'
  AND t.candidate_key='assembly:gb-plaster-crack-patch-repair'
  AND a.wall_topic_id=t.id AND a.wall_market_code='GB' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
