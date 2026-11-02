-- Third DE batch: five researched draft articles for the German drywall (metal stud) wall system.
-- Articles remain drafts; publication/review gates are not bypassed.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, attributed), never AI generated.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='DE' AND candidate_key='system:de-drywall-metal-stud') THEN RAISE EXCEPTION 'DE metal stud drywall topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Rigips','https://www.rigips.de/','Rigips','Metal stud partition systems, board types, jointing and surface quality levels'),
  ('Fermacell','https://www.fermacell.de/','Fermacell','Gypsum fibre boards, dry screed and dry construction system guidance'),
  ('Bundesverband der Gipsindustrie','https://www.gips.de/','Bundesverband der Gipsindustrie','Gypsum products, board standards and technical information for dry construction'),
  ('Beuth Verlag, German standards','https://www.beuth.de/de','Beuth Verlag','Published DIN standards for gypsum boards, cladding and partitions'),
  ('DIN, Deutsches Institut für Normung','https://www.din.de/de','DIN','Standards framework including board and partition series'),
  ('VOB online','https://www.vob-online.de/','VOB','Contract rules and technical conditions of contract for building work (ATV)'),
  ('Deutsches Institut für Bautechnik','https://www.dibt.de/','DIBt','Technical approvals and fire assessment for dry construction systems'),
  ('Bundesverband Farbe Gestaltung Bautenschutz','https://www.farbe.de/','Bundesverband Farbe','Trade guidance on coating and filling dry construction surfaces')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='DE' AND t.candidate_key='system:de-drywall-metal-stud'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: Dry construction on site (NK Bau Montageservice, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Trockenbau.jpg','Wikimedia Commons','Cover photograph overview article, CC BY-SA 4.0'),
  ('Image credit: Plasterboard fixing, Gipskartonduebel (Franz & friends, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Gipskartonduebel_01_(fcm).jpg','Wikimedia Commons','Cover photograph materials article, CC BY-SA 4.0'),
  ('Image credit: Dry construction in Munich (Casey Hugelfink, CC BY-SA 2.0)','https://commons.wikimedia.org/wiki/File:Trockenbau_in_M%C3%BCnchen.jpg','Wikimedia Commons','Cover photograph installation article, CC BY-SA 2.0'),
  ('Image credit: Plasterboard and tools (Timothyjosephwoo, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Drywall_and_tools.jpg','Wikimedia Commons','Cover photograph quality article, CC BY-SA 4.0'),
  ('Image credit: Plasterboard repair work (Carl Nurmi, CC BY 3.0)','https://commons.wikimedia.org/wiki/File:Drywall_Repair_Portland-Cascade_Painting_and_Restoration_-_panoramio.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY 3.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='DE' AND t.candidate_key='system:de-drywall-metal-stud'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'DE',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='DE' AND t.candidate_key='system:de-drywall-metal-stud'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'DE','DE',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('de-drywall-metal-stud-overview', 'German Metal Stud Drywall: The System Behind the Surface', 'A German overview of the metal stud drywall system: CW and UW profiles, gypsum boards, cladding layers and jointing, and why fire, sound and surface class are all decided before the first board goes on.', $wallarticle1$# German Metal Stud Drywall: The System Behind the Surface

A German drywall partition looks like a simple object: boards screwed to a metal frame. It is in fact a certified system, and the certificate is what makes it worth building.

Fire resistance, sound insulation, structural capability and surface quality are properties of the assembly rather than of its parts. Change a board type, add a layer, widen a stud spacing or omit the insulation, and the properties change with it, which is why German drywall work is specified as a named system with a tested build-up rather than as a material list.

## The frame

The frame is made of cold-formed galvanised steel sections. Vertical studs, known as CW profiles, are set into horizontal tracks, UW profiles, fixed to floor and ceiling.

Stud spacing follows the board, the load and the required performance: a wall carrying a heavy shelf needs closer studs than an empty partition, and a wall that must achieve a fire rating needs the spacing its certification requires.

The cavity between the studs is where insulation, services and sound control live, and where the reason for a drywall partition being better than a solid one often lies.

## The boards

Gypsum boards are the standard facing, supplied in standard, moisture-resistant and fire-rated variants, and in different thicknesses.

Gypsum fibre boards are the alternative, denser and stronger, used where impact resistance, moisture tolerance or a specific fire performance is required. Both types are fixed with screws designed for the purpose and jointed with a system filler and tape.

Board choice is the first variable in every performance claim. A fire-rated board swapped for a standard one changes the assembly, and it does so invisibly.

## One layer or two

German drywall is built in one or two layers per side, and the layer count is a design decision.

Two layers give more mass, better sound insulation, better fire performance and a surface with fewer visible joints because the joints are staggered. They also cost more in material and labour.

Many residential partitions are built in two layers for the sound benefit alone, since a single-layer partition has a characteristic hollow sound that no amount of filling removes.

## Fire and sound as system properties

A fire-rated partition is a tested build-up with a stated resistance in minutes, and it is certified as a whole.

Sound insulation is expressed as a weighted rating for the assembly, and it depends on the boards, the cavity, the insulation and, critically, on how the edges are sealed. A partition with excellent laboratory figures and a poorly sealed head detail performs far below its rating in a real building.

Both properties are therefore delivered by the system and by the detailing rather than by the boards alone [1](https://www.rigips.de/) [7](https://www.dibt.de/).

## The surface

The finished surface is described by quality levels, in the same class-based convention that governs German plaster work.

A basic level accepts a visible joint and is suitable for a flat paint in an undemanding position. Higher levels require a full-surface skim and a surface free of visible joints and texture, which is what a critical light or a gloss finish needs.

The level is agreed before work starts because it determines the jointing method and the labour, and because it is the basis on which the finished wall is judged [8](https://www.farbe.de/).

## Where the system is used

Three uses dominate. The partition, a free-standing wall between rooms. The lining, a layer of board and frame fixed against an existing wall to level it, insulate it or hide services. And the ceiling, where the same profiles and boards form a suspended surface.

Each has its own standards and its own details, and each shares the same principle: a frame, a cavity, boards, and a jointing method that produces a surface.

## The standards frame

Dry construction in Germany is covered by standards for gypsum boards and their application, for metal stud partitions and linings, and by the ATV for dry construction work within the VOB contract framework [4](https://www.beuth.de/de) [6](https://www.vob-online.de/).

The practical consequence for a householder is the same as elsewhere in German building: a wall is specified by reference to a system and a class rather than described in prose, and the specification is what a dispute would be settled against.

## What the later articles cover

Materials deals with profiles, boards, insulation, fixings and jointing compounds. Installation follows the frame, the boards, the staggered joints and the finishing sequence. Quality covers the levels, the checks that catch a hollow wall and the fire and sound verification. Maintenance covers repairs, fixings and the alterations that are always wanted later.

## Partition, lining and ceiling

The three uses of the system behave differently and are specified separately.

A partition is free-standing and carries its own stability through the tracks, the studs and the board skins, which is why its fixing to floor and ceiling is a structural item rather than a convenience. A lining is fixed back to an existing wall and gains its stability from that wall, so its studs can be shallower and its acoustic purpose is usually different. A ceiling is a horizontal assembly and is governed by its own standards, hangers and deflection requirements.

Understanding which of the three is being built prevents the most common design error, which is detailing a partition as though it were a lining.

## Why dry construction dominates German fit-out

Dry construction dominates interior fit-out in Germany for three reasons that have nothing to do with cost alone.

It is fast, because there is no drying time between the frame and the surface. It is adaptable, because services run in the cavity and can be changed later. And it is precise, because a metal frame produces a plane that wet trades find harder to guarantee.

Those three advantages are the reason a German office fit-out or a loft conversion is almost always a dry construction job, and they are also the reasons its detailing discipline is so strict: the system gives nothing for free.

## What a householder should take from this

A drywall wall is a system, and the parts of the system that matter most are the ones that will never be seen again.

The insulation in the cavity, the sealant at the perimeter, the board type and the staggered joints all decide how the wall performs, and none of them is visible from the room. That is why the specification and the photographs of the frame are worth more than the finish, and why the finish is what most conversations are about.

## The standards that make the system

German dry construction rests on a small group of standards: those for gypsum boards and their application, those for metal stud partitions and linings, and the contract conditions for the trade.

The board standards define dimensions, tolerances and properties. The application standards define the fixing, the joints and the permissible spacings. The contract conditions define the scope and the standard of work owed.

Together they turn a wall into a specified product, which is the reason a German partition can be priced, built and inspected by three different parties without disagreement about what was meant.

## Where the wall meets the floor

The floor detail is the most overlooked part of the system and one of the most consequential.

A partition stands on the structural floor, which means the floor finish changes the wall's effective height and the door's clear opening. Where a screed or a raised floor is installed after the wall, the relationship is straightforward; where an existing floor finish is lifted, the wall may need extending.

German practice details that junction explicitly, and the alternative is a wall that had to be adjusted after the floor was laid, with the adjustment visible at the skirting.

## Acoustic separation between dwellings

Where a drywall partition separates two dwellings, the requirement is a statutory one rather than a matter of comfort.

The performance depends on the system, the cavity insulation, the perimeter sealing and, critically, on avoiding flanking paths through the structure. Two partitions with excellent laboratory ratings can fail in a building where sound travels through a continuous floor.

That is why acoustic design is a building question rather than a wall question, and why a wall that is being asked to do more than it was designed for cannot be fixed by better boards alone.

## A final practical note

Nothing in this overview requires an unusual product. It requires a system chosen for its performance and a build-up followed exactly.

That is why the specification is the important document and the colour is the unimportant one, and why the wall will be judged years after everyone has forgotten which paint was used.

## The economics of dry construction

The cost of a drywall wall is dominated by labour and by the performance it is asked to deliver.

A basic partition and an acoustic partition contain the same profiles and almost the same boards, and the difference in price lies in the layer count, the insulation, the sealing and the care. That is a useful thing for a householder to know, because it means the upgrade that matters is rarely the one that looks expensive.

## The one-line summary

A German drywall wall in a sentence: a galvanised frame, a filled cavity, boards in the specified layers with staggered joints, and a jointing level agreed before the first sheet goes on.

Every article in this series is an application of that sentence, and every defect in a finished wall is a departure from it.

## Where a drywall wall is the wrong answer

Dry construction is not universal, and the German market does not pretend otherwise.

Where mass is wanted, for acoustic separation between dwellings or for thermal buffering, masonry or concrete is better and cheaper to make perform. Where a wall must carry heavy loads without reinforcement, solid construction is simpler. Where moisture will be persistent, a drywall wall needs specific boards and specific detailing, and it may still be the wrong choice.

Knowing those three limits prevents the disappointment that comes from expecting a lightweight wall to behave like a heavy one.

## A note on terminology

German dry construction uses its own vocabulary, and the terms appear on quotations.

Metallständerwand is a metal stud partition, Vorsatzschale a lining, Beplankung the cladding, Spachtelung the jointing, and the quality levels are the same convention used in plastering. Reading a quotation is largely a matter of knowing which of those items is included.

## Reading a quotation for a partition

A German drywall quotation is short and specific, and its specificity is the thing to check.

It should name the system, the board type and layers, the stud spacing, the insulation, the jointing level, and whether the perimeter seal and any pattresses are included. It should also state the fire and sound ratings the wall is being built to achieve.

A quotation that lists an area, a board thickness and a price is a quotation for a wall of unspecified performance, and the gap will be discovered when the wall is used rather than when it is paid for.

## References

1. Rigips.
2. Fermacell.
3. Bundesverband der Gipsindustrie.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Deutsches Institut für Bautechnik.
8. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows dry construction work on site, taken by NK Bau Montageservice and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a metal stud drywall assembly under construction. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 9, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Trockenbau.jpg/1280px-Trockenbau.jpg')

, ('de-drywall-metal-stud-materials', 'Profiles, Boards and Jointing: German Drywall Materials', 'A German materials guide for metal stud drywall: CW and UW profiles, gypsum and gypsum fibre boards, cavity insulation, screw types, jointing compounds and the accessories that decide whether a wall stays silent.', $wallarticle2$# Profiles, Boards and Jointing: German Drywall Materials

The material list for a metal stud wall is short, and every item on it affects a performance figure that the finished wall will be judged against.

Choosing those items in the right order is the whole of the specification: performance first, then boards, then frame, then jointing.

## CW and UW profiles

CW profiles are the vertical studs, formed from galvanised steel with folded edges that give stiffness and a surface for the screws.

Their depth determines the wall thickness and the cavity, and it also determines how much insulation can be fitted and how much the wall resists racking. Their gauge determines how far apart they can be spaced and what they can carry.

UW profiles are the horizontal tracks at floor, ceiling and junctions. They are slightly wider than the studs so that the studs sit inside them, and their fixing to the structure is where the wall's stability and the acoustic seal are made.

## The board families

Standard gypsum board is the default facing: paper-faced, with a gypsum core, and available in thicknesses from around 9.5 to 25 millimetres.

Impregnated moisture-resistant board is used in kitchens, bathrooms and anywhere the surface will be damp, and it is recognisable by its green paper. Fire-rated board has a core with additives that hold together under heat and is used wherever the partition carries a fire rating.

Gypsum fibre board is the denser alternative, with higher impact resistance, better moisture tolerance and a different fixing and jointing regime. It is the board of choice where a wall will take knocks or where a thin, strong partition is wanted [1](https://www.rigips.de/) [2](https://www.fermacell.de/).

## Insulation

The cavity is filled with mineral wool insulation, and the fill is a performance item rather than a comfort extra.

In a fire-rated partition the insulation is part of the tested build-up. For sound, it damps the cavity resonance that would otherwise let a hollow wall transmit speech. For thermal performance, it completes the wall's contribution.

The correct product is a mineral wool slab of the stated density, friction-fitted to fill the cavity without compressing the boards outward. Loose or missing insulation is the most common reason a wall underperforms its acoustic rating.

## Fixings

Screws are drywall screws of the right length and type: longer for two-layer work, corrosion-resistant in wet areas, and with a bugle head that seats without tearing the paper.

The screws are driven to sit just below the board surface without breaking the paper, because a screw that breaks the paper holds nothing. Screw spacing is specified by the system, and it is tighter at board edges than in the field.

Where heavy items will be fixed later, the answer is a pattress or a rail behind the board rather than a heavier fixing afterwards.

## Jointing compounds and tape

Jointing is done with a system filler and a paper or glass-fibre tape, in a sequence of filling, taping and finishing coats.

The filler's shrinkage and hardness are matched to the board, and the tape bridges the joint so that movement does not open it. Where two-layer cladding is used, the joints of the second layer are staggered over the first, and the joints that are filled are only those of the outer layer.

Mixing brands within one jointing system is where joint failures come from, because the tape, the filler and the board are designed to work together.

## Accessories that decide the details

A short list of accessories carries a disproportionate share of the outcome.

Acoustic sealant, applied to the track before it is fixed and to the perimeter before the boards, closes the gaps that would otherwise short-circuit the sound rating. Corner beads protect external corners. Movement joints allow the wall to accommodate structural deflection. And a vapour or airtightness membrane, where the wall is part of an external envelope, closes the cavity.

None of those items is expensive and all of them are invisible once the wall is finished, which is why they are the first to be omitted from a cheap quote.

## Tools

The tool list is specific: tin snips for the profiles, a setting tool or crimper, a screwdriver with a depth stop, a board lifter, a taping knife set, a pole sander, and a laser or a long straightedge for setting out.

The board lifter is the item a householder never owns and always needs, because holding a sheet overhead while fixing it is how boards get broken and ceilings get uneven.

## Storage and handling

Boards are heavy, brittle at the edges and vulnerable to moisture, and they are stored flat on a dry surface rather than leaning against a wall.

Profiles are stored flat to avoid twisting, since a twisted stud produces a bowed wall. Insulation is kept dry because wet mineral wool compresses and loses its performance.

The handling rule that matters is that boards are carried on edge in pairs, which is how two people move a sheet without breaking it.

## The material list as a specification

Read together, the list is a specification: system, board type, layer count, stud spacing, insulation, fixing type, jointing system, and the accessories that close the perimeter.

A wall built to that list has a predictable fire rating, acoustic performance and surface quality. A wall built from whatever was on the van has none of those, and it looks identical from the outside.

## Board thickness and what it changes

Board thickness is a performance variable and not only a strength variable.

A thicker board adds mass, which improves sound insulation. It spans further, which allows wider stud spacing. It resists impact better and it takes a longer screw. And it costs more and weighs more, which is a real constraint on a ceiling.

The practical allocations are consistent across the German market: thinner board on ceilings where weight matters, thicker board on walls that will be knocked, and two thinner layers where the fire or sound performance needs mass but the total thickness is constrained.

## Which insulation, and why density matters

Mineral wool in a partition cavity works in two ways: it absorbs sound within the cavity, and in a fire it resists the passage of heat.

Both depend on density and on the fill being complete. A light, loosely fitted wool performs noticeably worse than a denser slab friction-fitted to the full depth, and the difference is audible in an occupied building even though it is invisible afterwards.

The specification therefore names a product rather than a generic description, and the installation check is that nothing is compressed and nothing is missing.

## A materials list for a partition

For a single partition: UW track, CW studs, the specified board in the specified layers, mineral wool, drywall screws in two lengths, jointing compound and tape, corner beads, acoustic sealant and a repair plug for any later fixing.

The list is short and every item answers to a performance figure. That is the difference between a materials list and a system specification.

## Compatibility of boards and fillers

Board and jointing compound are designed as a pair, and substituting one for the other is where most drywall surface failures begin.

A paper-faced board takes a compound that bonds to paper. A gypsum fibre board takes a different compound and often a different surface preparation, because it has no paper to bond to. Using a paper-board compound on a fibre board produces joints that age badly and a surface that flicks up at the edges.

The guarantee on a jointing system is usually conditional on using the whole system, which is a commercial fact worth knowing when a cheaper substitute is proposed.

## What a merchant will ask

A German merchant asked for drywall materials will want to know the system, the board type and the layer count before recommending anything.

Answering those three makes the rest straightforward, including the screw length, which depends entirely on the layers. A customer who cannot answer them is usually buying a repair rather than a wall.

## Weight, and what a board can carry

A drywall wall carries very little on its own, and what it can carry depends on the fixing and on the build-up.

A plasterboard fixing in a single layer of 12.5 millimetre board holds a modest load. The same fixing in a two-layer wall holds considerably more. A load beyond that needs the frame, and the frame needs to have been designed for it.

German practice is to install pattresses or rails during construction for any known heavy item, which is why a well-built German kitchen wall has timber or steel where the cabinets will hang and nothing visible to indicate it.

## Why drywall surfaces crack where they do

Drywall cracks concentrate at joints, at board edges and at the perimeter, and each location has a mechanism.

A joint crack indicates a tape failure or movement across the joint. A crack along a board edge indicates a fixing that was too sparse, allowing the board to flex. A crack at the perimeter indicates that the wall has moved independently of the structure, which is expected and which the sealant should have accommodated.

Reading those three locations is enough to diagnose most drywall cracking without opening the wall.

## Where the cost sits

The cost of a drywall wall is concentrated in three items: the boards, the layer count and the jointing level.

Profiles and insulation are relatively minor in cost and major in performance, which is why a cheap wall is rarely cheap in the parts that matter. A wall that has the right frame and insulation and a basic surface will outperform a wall with a high surface level and a cavity that was filled carelessly.

Knowing where the money should go is the practical value of the specification.

## Two small items that decide comfort

Acoustic sealant and a board lifter are the two items most often missing from a householder's drywall list.

The sealant closes the perimeter that would otherwise let sound past the wall, and the lifter is what makes a ceiling possible for two people rather than four. Neither is expensive and both change the outcome more than any product upgrade on the list.

## A note on buying boards

Boards are bought by type and thickness, and the type is not interchangeable.

A standard board where a moisture-resistant one was specified will fail at the wet area within a few years. A standard board where a fire board was specified removes a rating that nobody can see. Those two substitutions are the most common in domestic work and the most expensive to correct.

## References

1. Rigips.
2. Fermacell.
3. Bundesverband der Gipsindustrie.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Deutsches Institut für Bautechnik.
8. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows a plasterboard fixing of the kind used to hang loads from a drywall surface, taken by Franz & friends and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows one of the small components on which a drywall wall's usefulness depends. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 9, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Gipskartonduebel_01_%28fcm%29.jpg/1280px-Gipskartonduebel_01_%28fcm%29.jpg')
, ('de-drywall-metal-stud-installation', 'Setting Out, Boarding and Jointing a German Metal Stud Wall', 'A German installation sequence for metal stud drywall: setting out and fixing the tracks, studs and services, insulation, one or two board layers with staggered joints, and the jointing sequence up to the agreed quality level.', $wallarticle3$# Setting Out, Boarding and Jointing a German Metal Stud Wall

A metal stud wall is built in a fixed order, and every stage leaves something the next stage cannot correct.

The frame sets the plane, the boards set the surface, and the jointing sets the quality level. This article follows the work in that order, for a partition built to a stated system.

## Setting out

Setting out establishes the wall's position, its line and its level, and it is done with a laser or a chalk line before any material is cut.

The floor and ceiling lines are marked, the openings are marked, and the wall's thickness is checked against the door frames, the services and the finished surfaces it will meet. A wall set out to the wrong line is a wall that has to be rebuilt or a room that is out of square.

The setting out also decides where joints in the boards will fall, because joints belong over a stud and not between them.

## Fixing the tracks

UW tracks are fixed to the floor and ceiling at the spacing the system requires, with a resilient or acoustic sealant bedded under the track where sound performance matters.

The sealant is the detail that decides whether the wall achieves its rating. A track fixed dry leaves a gap along the floor and the ceiling, and the gap lets sound past the wall entirely, whatever the cavity contains.

At door openings the track is cut and the studs are doubled to carry the frame, since an opening is where a partition concentrates its load.

## Studs and services

CW studs are cut slightly short and set into the tracks at the stated spacing, with the first and last studs fixed and the intermediate studs positioned to the board module.

Before boarding, the services go in: electrical boxes fixed to the studs at the right height, cables and pipes run through the cavity, and any reinforcement for heavy items installed. Doing this before boarding is not merely convenient; after boarding, every service becomes a hole.

Noggings or rails are added where a wall-mounted item will need support, such as a basin, a screen or a heavy shelf.

## Insulation

The cavity is filled with the specified mineral wool, friction-fitted between the studs and cut to fit around services without compressing it.

The insulation is fitted before the second side is boarded, which is the only point at which the cavity is accessible. Missing or compressed insulation is invisible afterwards and is the most common cause of a partition that disappoints acoustically.

## The first side

Boards are cut to the module, lifted into place against the frame and screwed at the specified spacing, with the board's bound edge at the joints where the system requires it.

Boards are set with a small gap at the floor and not tight against the ceiling, because the wall needs room for movement and because a tight board telegraphs the structure above. The perimeter gap is closed later with sealant.

Where two layers are built, the first layer's joints are offset from where the second layer's joints will fall, which is the reason for staggering: a joint that runs through both layers is a crack waiting to open.

## The second side and the second layer

The second side is boarded after the services and insulation are complete, following the same module and the same staggering rule.

In two-layer work the second layer is fixed with longer screws that engage the stud through both layers, and the joints are filled only on the outer layer. Screws are set just below the surface without breaking the paper, and a screw that misses a stud is removed rather than left, because it holds nothing and shows later.

## Jointing

Jointing proceeds in stages: a bedding coat into the joint, the tape pressed into it, a second coat over the tape, and one or more finishing coats feathered wider each time.

The number of coats and the width of the feathering are dictated by the quality level agreed for the wall. A basic level needs the joints closed; a high level needs a full-surface skim, because a joint that is filled but not skimmed remains visible in raking light.

Sanding follows each stage, and the screw heads are filled in the same sequence. External corners receive beads, and the perimeter gap is sealed before the final coat.

## The surface level and the light

The German convention here, as with plaster, is that the level is agreed in advance and the finished wall is judged against it.

That protects both parties. A jointing contractor working to a stated level knows what to deliver, and a client knows what a wall in raking light is entitled to look like. The light the room will have is the practical reference, since a wall that is acceptable under a ceiling fixture can look uneven beside a window.

## Drying, dust and the next trade

Jointing compounds bring water, and the wall needs to dry before it is painted or before the next trade works against it.

Dust control matters in dry construction more than in most trades: sanding dust travels, settles on every surface and contaminates the next coat of anything. Vacuum-assisted sanding and sealed openings between rooms are standard practice for that reason.

## Handover

The handover record names the system, the board types, the layer count, the stud spacing, the insulation and the jointing level, along with the fire and sound ratings claimed.

It is a short document and it is the only way a later alteration can be made without breaking a performance the wall was built to achieve.

## Boarding ceilings

A ceiling is boarded before it is finished and after the services above are complete, because access afterwards is expensive.

Boards are fixed with the long edge across the joists or the ceiling grid, joints are staggered, and the fixings are closer than on a wall because gravity is working against the assembly. A ceiling that is boarded with tight joints and no gap at the perimeter will crack at the wall junction within a season.

Services above a ceiling are photographed before it is closed, which is the cheapest record in construction.

## Working with other trades

Dry construction in Germany is a coordination trade: it follows the first fix and precedes the second fix.

The sequence that works is frame, services rough-in, insulation, boarding, jointing, then electrical finishing, joinery and decoration. Compressing that sequence produces boxes set at the wrong depth, cables behind boards with no route, and pattresses installed after the wall was closed.

The coordination is not difficult and it is entirely a matter of order, which is why a drywall contractor's programme is usually the one that disciplines the others.

## Protecting a finished wall

A finished drywall wall is vulnerable in a way a plastered wall is not: it dents rather than chips, and a dent in a board is a depression that paint cannot hide.

Protecting corners and the lower metre of a wall during the remaining trades costs almost nothing. Repairing a dented corner afterwards costs a board patch, a joint, sanding and two coats, and it is never invisible in raking light.

## Two layers, practically

Two-layer cladding is built by fixing the first layer of thinner board and following with a second of the thickness the system states.

The second layer's joints are offset from the first, and the second layer's screws are long enough to reach the stud through both. The first layer's joints are not taped, because they are never seen; the second layer's are.

Where the first layer is taped as well, which happens when a contractor follows a single-layer habit, the wall gains nothing and the labour is wasted. Where the first layer's joints are aligned with the second's, the wall gains a continuous crack path.

## What remains after the boards are up

The parts of a drywall wall that decide its performance are all installed before the boards are closed, which is why the frame stage is the one worth watching.

Insulation, services, pattresses, acoustic sealant and the board staggering are all decisions taken in a period of a few hours. Afterwards, they are assumptions.

## Working to a set-out drawing

Large drywall jobs are built from a set-out drawing that gives the wall positions, the openings and the board module.

The drawing is not decoration. It is what makes the joints fall over studs, the openings land on doubled studs and the services align across rooms. A job built without one relies on the setting out being redone at each wall, which is slower and less accurate.

For a single domestic partition the set-out is a chalk line and a measure. For a floor of offices it is a drawing, and the difference in outcome is entirely in the joints.

## Dust, and the reason it matters so much

Drywall sanding produces a fine dust that settles on every surface and contaminates the next coat of anything.

The practical controls are vacuum-assisted sanding, plastic sheeting at openings, and a final wipedown before any primer. Where dust is left on a jointing compound and then primed, the primer bonds to the dust rather than to the compound, and the finish fails in a pattern that follows the sanding.

That failure is entirely preventable and entirely common.

## Sound testing the wall you have built

A simple test after construction, before the rooms are occupied, tells you whether a partition performs as intended.

Stand on one side and have someone speak in a normal voice on the other. If the words are intelligible, the wall is losing performance somewhere, and the likely places are the perimeter, a service penetration or missing insulation.

The test is not a measurement, and it is precise enough to catch the mistakes that matter in a dwelling.

## The order that prevents rework

The order that prevents rework is: frame, services, insulation, first layer, second layer, jointing, decoration, second fix.

Every departure from that order costs something specific. Services after boarding mean holes. Insulation after the first layer means the cavity is half closed. Decoration before second fix means a socket cut through fresh paint.

The order is not a preference and it is the same in every market.

## Handing over a wall you can trust

A wall handed over with its system name, its board build-up and its ratings can be maintained. A wall handed over with nothing but a painted surface cannot.

That is why the record matters more than the finish, and why a photograph of the open frame is the single most valuable image in any building file.

## References

1. Rigips.
2. Fermacell.
3. Bundesverband der Gipsindustrie.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Deutsches Institut für Bautechnik.
8. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows dry construction work in Munich, taken by Casey Hugelfink and made available under CC BY-SA 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows a metal stud drywall assembly during construction. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 10, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Trockenbau_in_M%C3%BCnchen.jpg/1280px-Trockenbau_in_M%C3%BCnchen.jpg')

, ('de-drywall-metal-stud-quality', 'Judging a German Drywall Wall: Levels, Ratings and Hollows', 'A German quality framework for metal stud drywall: what the surface levels require, how to inspect joints and corners, the fire and sound checks that matter, and the hollow wall symptoms that reveal a build-up error.', $wallarticle4$# Judging a German Drywall Wall: Levels, Ratings and Hollows

A drywall wall is judged in three ways: how its surface looks, what it does in a fire, and how much sound it stops. Only the first is visible, which is why the other two need a document.

A quality assessment therefore has two halves, and both are cheap to do at handover and expensive to reconstruct later.

## The surface levels

The quality levels describe what the finished surface is allowed to show: whether a joint may be visible, whether screw heads may telegraph, and whether the surface must be smooth enough for a gloss finish or a critical light.

At the basic level, joints are filled and taped and the wall is fit for a flat paint in an ordinary position. At the higher levels, joints are feathered wide, screw heads are filled, and a full-surface skim is required to remove the texture differences between board face, joint filler and skim.

Agreeing the level before the work is what makes the handover a check rather than a discussion [8](https://www.farbe.de/).

## Inspecting a joint

Joints are inspected under raking light, with a straightedge along the wall and a hand across the surface.

What matters: whether the joint is dished or proud, whether the tape is visible as a ridge, whether the feathering extends far enough that the transition cannot be felt, and whether the screw heads are filled flush.

Trowel marks and sanding scratches show as a fine texture that a matt paint hides and a sheen reveals. That is the practical argument for inspecting before painting rather than after.

## Corners, edges and openings

Corners are where drywall work is most often weak.

An external corner without a bead is vulnerable and looks unfinished. An internal corner should be taped and filled, not simply butted. The junction with a door frame should be neat and sealed, because that is where sound and dust both travel.

The reveal at an opening is a small surface with three visible edges, and it shows the standard of the whole job, since it cannot be hidden by furniture or paint.

## What a hollow wall tells you

Tapping a wall is a diagnostic, and the sounds mean specific things.

A consistent hollow sound across a field is normal for a drywall partition. A dull thud where the wall should be hollow suggests missing insulation, a pattress, or something pressed against the boards. A rattle suggests a loose fixing or a screw that missed. A soft spot suggests a board that was not fixed along an edge.

On a wall that must perform acoustically, the insulation check is worth doing with an inspection camera through a socket box or a small hole, because it is otherwise unknowable.

## Fire performance verification

Fire performance is verified from the documentation and from the visible build-up, not from the surface.

The checks are: the specified board type, the specified layer count, the stud spacing, the insulation and the sealing of the perimeter and any penetrations. A penetration that is not fire-stopped is a hole in the rating, whatever the wall's paperwork says.

Where a partition is a compartment boundary, the certification and the penetration sealing are the two things an inspector will look at first [7](https://www.dibt.de/).

## Sound performance verification

Sound is verified by inspecting the details that are easy to omit.

The perimeter sealant, the insulation fill, the absence of back-to-back sockets in the same stud bay, and the treatment of any junction with a structural element. A wall that is acoustically excellent in the middle and open at the head performs as the head detail allows.

For a domestic partition the practical check is to stand on one side and listen to a conversation on the other. If speech is intelligible, a detail is missing, and the most likely detail is the perimeter seal.

## Defects worth naming at handover

Five defects recur: joints that crack along the tape, screw heads that show as a grid of bumps, board joints that are not staggered in two-layer work, corners without a bead, and a wall that is out of plane because a stud was twisted.

Each is diagnosable by inspection and each is correctable before decoration. After decoration, each becomes an argument.

Where a joint has cracked within weeks, the cause is usually movement that the tape could not bridge or a joint that lacked compound behind the tape. Re-taping the joint properly is the repair; adding more filler over the crack is not.

## Documentation worth keeping

The record for a drywall wall is a page: the system name, the board types, layer count, stud spacing, insulation, the jointing level, the fire rating claimed and the sound rating claimed, plus photographs of the frame before boarding.

That last item is the most valuable, because the frame and cavity are the only parts of the wall that can never be seen again.

## What a good wall feels like

A well-built German drywall partition sounds solid when tapped in the field, feels firm under the hand, shows no joint in raking light, and does not transmit speech.

Those four impressions correspond exactly to the four performance items in this article, which is a useful coincidence: the things a client notices are the things the system was specified to deliver.

## Judging a lining against a partition

A lining and a partition are judged differently, because their purposes differ.

A lining is judged on its plane and its finish, since it exists to make a wall straight and to hide what is behind it. Sound performance is secondary unless the lining is an acoustic upgrade.

A partition is judged on all three: surface, fire and sound. A perfect surface on a partition that transmits speech is a failure of the specification rather than of the trade, and it is worth knowing which failure you are looking at before the conversation starts.

## What a specification should contain

A German drywall specification names the system, the board type and layers, stud spacing, insulation, jointing level, fire rating and sound rating.

That list is what a contractor prices and what an inspector checks. Where a quotation lists only square metres and a board thickness, the performance items are not in it, and they will not be in the wall either.

## Checking a system against its certificate

A drywall system arrives with a certificate or an approval that lists the build-ups it covers.

Checking a wall against it is a documentary exercise: board type, layer count, stud spacing, stud gauge, insulation, fixing spacing, and the sealing details. Each item on the list is either present or not.

Where a wall must achieve a fire rating, that check is not optional, and it is the one an inspector will perform first. A wall that is one board type away from its certificate is a wall with no rating, whatever the drawing says.

## Judging a wall before decoration

The last moment at which a drywall wall can be corrected cheaply is before it is painted.

At that point the joints are visible without distraction, the surface can still be sanded, and a defect can be fixed with filler rather than with a repair patch. An inspection in raking light at that stage finds loose tape, unfilled screw heads and proud joints, and each is a minute of work.

After paint, each is a repair.

## What an inspector looks at first

An inspector of German drywall work looks at the perimeter before the field.

The head and base details, the junctions with structural walls, the openings and the penetrations. Those are where performance is lost and where the field cannot compensate.

Then the board layout, for staggering and for joints that land on studs. Then the fixings, for spacing and for screws that missed. The surface is checked last, because it is the only part a client can see and the only part that can be corrected later at modest cost.

## The sample wall

Where a client and a contractor disagree about a surface level, a sample wall resolves it in the way a sample panel does in plastering.

A square metre, boarded and jointed to the level being discussed, viewed in the room's light, shows what the level means. It costs an hour and it prevents a dispute about the whole wall.

On a project with several partitions, one sample is enough, and it becomes the reference for the rest.

## Why the level and the light belong together

A quality level is defined by what is visible, and what is visible depends on the light.

A wall finished to a mid level under a ceiling fixture can look entirely different beside a tall window, where raking daylight finds every joint. That is why German practice names the lighting condition when a level is agreed, and why it is worth agreeing a level for the room's worst moment rather than its best.

## Verifying the frame before it is closed

A drywall frame is inspected before boarding, and the inspection is short.

Studs plumb and at the stated spacing, tracks fixed and sealed, openings doubled, pattresses where loads will come, and services complete with boxes at the right depth. Those five items take ten minutes per wall and they are the last chance to correct anything structural.

After boarding, each of those items becomes a demolition.

## When the surface is good enough

A wall is good enough when it meets the agreed level in the agreed light, and not when it is perfect.

Chasing perfection on a drywall wall costs labour with no visible return, and it often damages the surface it was meant to improve through repeated sanding and re-filling. Knowing where the standard is, and stopping there, is a professional judgement worth respecting.

## Repairing a drywall surface after heavy use

A wall in a family home accumulates the marks of use: scuffs at shoulder height, dents at trolley height, and pin holes from pictures.

Each is a small repair, and the sequence is the same: fill proud of the surface, sand back, prime the patch, feather the paint beyond it. Doing several at once on a panel rather than individually saves the colour matching problem entirely.

Where scuffing is repeated in the same place, a scrub-resistant paint on that panel reduces the frequency of the repair without changing the wall.

## The two questions that decide a drywall job

Before any drywall work, two questions decide everything else.

What must this wall do: separate rooms, carry a fire rating, stop sound, or simply hide a wall behind it. And what surface does the room need, under the light it will have.

The answers set the system, the board, the insulation and the level. The colour comes much later and matters least.

## References

1. Rigips.
2. Fermacell.
3. Bundesverband der Gipsindustrie.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Deutsches Institut für Bautechnik.
8. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows plasterboard and drywall tools, taken by Timothyjosephwoo and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the boards and tools of the trade this article's checks are applied to. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 10, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Drywall_and_tools.jpg/1280px-Drywall_and_tools.jpg')
, ('de-drywall-metal-stud-maintenance', 'Living With a Drywall Wall: Repairs, Fixings and Alterations', 'A German maintenance guide for metal stud drywall: repairing holes and dents, hanging loads safely, re-sealing a wall that leaks sound, adding a socket, and altering a fire-rated partition without breaking the rating.', $wallarticle5$# Living With a Drywall Wall: Repairs, Fixings and Alterations

A drywall wall is easy to damage and easy to repair, which is the opposite of what most people expect. The difficulty is not the repair; it is doing it in a way that preserves whatever the wall was built to do.

This article covers the four things that actually happen to a drywall wall in service: holes, fixings, alterations and sound that appears from nowhere.

## Dents and small holes

A dent that has not broken the paper is filled and sanded, and it disappears.

A hole up to the size of a fist is repaired with a patch: the edges are squared, a piece of board is cut to fit and backed with a batten or a repair plug, and the joint is taped, filled and feathered beyond the repair.

The mistake that shows afterwards is filling a hole without taping it. Filler alone shrinks and cracks, and the repair becomes visible within a season in any light that falls across it.

## Larger repairs

A hole larger than a hand, or damage at a corner, needs a piece of board and a proper backing.

The damaged section is cut back to the studs on both sides, a new piece is cut to the opening and screwed to the studs, and the joints are taped in the normal way. Where a stud was damaged, a new piece of profile is fitted alongside and fixed to the track.

In two-layer walls the layers are repaired in the same staggered way they were built, because a repair that aligns its joints with the layer beneath reproduces the original weakness.

## Hanging things safely

A drywall wall carries pictures, mirrors, shelves and televisions, and each has a different answer.

Light items hang from a plasterboard fixing, which spreads the load behind the board. Heavy items need a fixing that reaches the studs or a pattress installed for the purpose. Very heavy items, such as a wall-hung boiler or a basin, need a frame or a rail behind the board, which is a job for the original construction rather than for afterwards.

The practical rule is that the load determines the fixing, and the wall's build-up determines what the fixing can reach. A stud finder or a magnet is the essential tool, since it locates the screws and therefore the frame.

## Altering a fire-rated wall

The most consequential maintenance mistake on a drywall wall is an unconsidered alteration to a fire-rated partition.

A new socket, a new cable, a pipe penetration or a removed section all create a hole in the compartment. Each needs fire-stopping with an approved product and method, and the rating is only preserved if that is done [7](https://www.dibt.de/).

The practical advice is to know which walls in a building are compartment boundaries before drilling any of them, and to treat those walls as a different class of object from an ordinary partition.

## Sound that appears later

A partition that was quiet and became audible has usually been altered rather than degraded.

The common causes are a socket added back-to-back with one on the other side, a gap opened at the perimeter by settlement or by a skirtings removal, and a service penetration left unsealed. Each is a small repair with a large acoustic effect.

Where a wall was never quiet, the answer is usually missing cavity insulation or an unsealed head detail, and the honest remedy may be to take off a section of board and correct the build-up rather than to add acoustic panels to the face.

## Re-coating a drywall surface

A drywall surface takes paint readily, and the preparation is a light sand, a dust removal and a primer.

The primer matters here as much as on plaster: the board face, the joint compound and any repair absorb differently, and without a primer the difference shows as patchiness in a sheen finish. On a wall that was previously painted with a silk or eggshell product, the joints are usually visible through the finish, which is a filling problem rather than a paint problem.

A matt paint is the forgiving choice on a drywall wall, for exactly that reason.

## Cracks at joints

A crack that follows a joint is a tape or movement problem rather than a board problem.

The repair is to open the crack, remove the loose material, re-bed the tape in compound and feather it out. Where the same joint cracks repeatedly, the cause may be structural movement above the wall or a stud that is not fixed, and the repair then needs to address the frame rather than the surface.

Repeatedly filling a joint crack without re-taping is the most common wasted effort in drywall maintenance.

## Skirtings, architraves and the perimeter seal

Trim is where a drywall wall is most often modified and most often degraded.

Removing a skirting can break the perimeter seal and open a path for sound. Refitting it should include renewing the sealant line at the floor junction, which is a small job with a disproportionate effect. Architraves fixed with screws into the frame rather than into the board hold better and stay tight.

The perimeter of a drywall wall is a performance detail throughout its life, not only during construction.

## When to call a specialist

Three situations justify one: damage to a fire-rated partition, a wall that has visibly moved, and a load that the wall is not built to carry.

In each case the work is a system question rather than a patching question, and the cost of asking is far below the cost of guessing.

## Records after alterations

Every alteration is worth a line in the maintenance record: what was done, when, and with what.

A wall that has been altered three times without a record is a wall nobody can assess later. A few lines, a photograph of the opening before it was closed, and the date are enough to keep a drywall wall's history usable.

## Storage, movement and long-term stability

A drywall wall settles, and the settlement is visible at the perimeter rather than in the field.

Trims work loose, sealant lines open, and a hairline gap appears where the board meets the ceiling. Those are normal consequences of a lightweight assembly moving with the building, and the maintenance response is to renew the sealant line rather than to re-board the wall.

Where movement is larger than that, the cause is usually above the wall rather than in it, and the repair belongs to the structure.

## Altering a wall to add a door

Adding a door to a drywall partition is a routine alteration and it has one structural consequence worth knowing.

The opening interrupts the top track, so a new header is required, made of two profiles back to back or a purpose-made section, with the vertical studs doubled each side of the opening. Cutting an opening and leaving the track interrupted produces a wall that sags above the door within a year.

The rest is boarding, taping and decoration, which is why the alteration is cheap when it is done correctly and expensive when it is done quickly.

## When a wall should be rebuilt rather than repaired

A drywall wall is worth rebuilding when the damage is structural rather than cosmetic.

If a stud is bent, a track is loose, water has soaked a board through, or a section of wall was removed without reinstating the frame, then the repair is a rebuild of that section. Patching the board over a bad frame produces a wall that looks repaired and behaves as though it was never built.

The test is simple: press the wall in the damaged area. Movement means the frame, not the board.

## Renovating around a drywall wall

When a room behind a drywall wall is renovated, the wall itself is usually the least considered element and the most affected one.

New tiling in an adjoining bathroom changes the moisture load on the board. A removed radiator leaves brackets and holes. New flooring changes the skirting line and the perimeter seal.

Treating the wall as part of the renovation rather than as a boundary of it is the habit that keeps its performance intact. The specific items to check afterwards are the perimeter seal, any penetration and the integrity of the board in wet areas.

## Tidying the record after a decade

A drywall wall that has been lived with for ten years has accumulated alterations, fixings, patches and paint.

Spending an hour mapping that history, with a photograph of each wall and a note of what was done, produces a document that makes the next alteration straightforward and the next sale easier. It also reveals the alterations that were not fire-stopped, which is the one item worth correcting without delay.

## When to repaint after a repair

A repaired drywall surface should be primed and painted as soon as the filler has dried and been sanded.

Leaving a repair unprimed allows it to absorb moisture from the air unevenly and makes the eventual finish patchier. More practically, an unprimed patch is visible as a dull island, which is a reminder that the job is unfinished every time the room is used.

Matching the paint is the second problem: a repair on a weathered wall is best painted across a whole panel or elevation rather than spot-painted.

## When a wall has to be opened

Sometimes a wall is opened deliberately, to reach a service, and the reopening is a small project in itself.

The method is to cut a clean rectangle between studs, keep the offcut if it is undamaged, and reinstate the board with a backing batten rather than by patching with filler. The joint is taped and feathered, and the perimeter of the repair is primed before painting.

A wall opened carefully can be closed invisibly. A wall opened with a hammer is a wall with a permanent scar.

## A drywall wall and its acoustics over time

Acoustic performance does not degrade on its own; it is lost through alterations.

A partition that was quiet becomes less so when a socket is added back to back, when a skirting is removed and refitted without sealant, or when a service is run through it without a seal. Each is a small change with a large effect, and each is reversible.

That is the reassuring part: the wall has not become worse, it has been altered, and the alteration can be undone.

## What a well-kept wall looks like after ten years

A drywall wall that has been looked after shows its age only at the perimeter and at the places people touch.

The sealant line at the floor may have been renewed twice, the paint is faded on the sunny side, and there are a few repaired patches that were done well enough to be invisible. The frame, the insulation and the fire performance are exactly as they were built.

That is the ordinary outcome of ordinary maintenance, and it is worth aiming at rather than replacing a wall that is doing its job.

## References

1. Rigips.
2. Fermacell.
3. Bundesverband der Gipsindustrie.
4. Beuth Verlag, German standards.
5. DIN, Deutsches Institut für Normung.
6. VOB online.
7. Deutsches Institut für Bautechnik.
8. Bundesverband Farbe Gestaltung Bautenschutz.

## Image credit

The cover photograph shows plasterboard repair work, taken by Carl Nurmi and made available under CC BY 3.0 via Wikimedia Commons through the panoramio project. It is a real photograph, not AI generated, and it shows the kind of repair this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 9, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Drywall_Repair_Portland-Cascade_Painting_and_Restoration_-_panoramio.jpg/1280px-Drywall_Repair_Portland-Cascade_Painting_and_Restoration_-_panoramio.jpg')

) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='DE' AND t.candidate_key='system:de-drywall-metal-stud'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='DE' AND t.market_code='DE'
  AND t.candidate_key='system:de-drywall-metal-stud'
  AND a.wall_topic_id=t.id AND a.wall_market_code='DE' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
