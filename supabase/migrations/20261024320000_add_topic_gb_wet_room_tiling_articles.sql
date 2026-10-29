-- Fourth GB researched candidate topic: tiling wet rooms (tanking and tiling).
-- Registered as verification_status='candidate'. All articles status='draft',
-- editorial_review_status='draft', market/wall_market_code='GB', wall_language_code='en'.
BEGIN;

INSERT INTO public.learn_wall_finishing_topics(market_code, candidate_key, title, summary, verification_status, derived_from)
SELECT 'GB','assembly:gb-wet-room-tiling','Tiling wet rooms: tanking and tiling',
  'A British walk-through of wet room finishes: substrate assessment, proprietary tanking membranes, tile and adhesive selection, tiling and grouting sequence, and the maintenance regime that keeps a wet room watertight.',
  'candidate','researched'
WHERE NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='GB' AND candidate_key='assembly:gb-wet-room-tiling');

INSERT INTO public.learn_wall_finishing_sources(topic_id,market_code,title,url,source_type)
SELECT t.id,'GB',s.title,s.url,s.source_type
FROM public.learn_wall_finishing_topics t
JOIN (VALUES
 ('BAL, A technical guide to tiling wet rooms and tanking','https://www.bal-adhesives.com/a-technical-guide-to-tiling-wet-rooms-and-tanking/','guidance'),
 ('The Tile Association, Technical Publications','https://www.tiles.org.uk/technical-support/technical-publications/','standard'),
 ('The Tile Association, Recent Changes to BS 5385 Part 1:2018','https://www.tiles.org.uk/wp-content/uploads/2019/04/TTA-Presentation-on-Recent-Changes-to-BS-5385-Part-1-2018-Reduced-File-Size.pdf','standard'),
 ('Tile and Stone Journal, TTA offers support to NHBC to bring new tiling guidance in line with British standards','https://www.tileandstonejournal.com/tta/tta-offers-support-to-nhbc-to-bring-new-tiling-guidance-in-line-with-british-standards/','guidance'),
 ('HBD, Avoid failures in bathrooms and wetrooms with BAL Waterproof 1C','https://www.hbdonline.co.uk/news/avoid-failures-in-bathrooms-and-wetrooms-with-bal-waterproof-1c/','manufacturer'),
 ('Libnor catalogue, BS EN 14891 liquid-applied water impermeable products','https://libnor.gov.lb/CatalogDetails.aspx?id=6039&language=en','standard'),
 ('NHBC, Good craftsmanship guide: brickwork and blockwork','https://www.nhbc.co.uk/builders/products-and-services/standards-and-technical-guidance','guidance'),
 ('Scottish Government, Building standards technical handbook 2017: domestic','https://www.gov.scot/publications/building-standards-technical-handbook-2017-domestic/','regulation')
) AS s(title,url,source_type) ON true
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-wet-room-tiling'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources x WHERE x.topic_id=t.id AND x.url=s.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'GB',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-wet-room-tiling'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_wall_finishing_sources(topic_id,market_code,title,url,source_type)
SELECT t.id,'GB',s.title,s.url,'image'
FROM public.learn_wall_finishing_topics t
JOIN (VALUES
 ('Wikimedia Commons: Old bathroom with subway tiles, Mulhouse (Alf van Beem, CC0)','https://commons.wikimedia.org/wiki/File:Old_bathroom_with_subway_tiles.JPG'),
 ('Wikimedia Commons: Porcelain wall tiles, Klimex Ultrastrong (Asurnipal, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Dornbirn-Porcelain_wall_tiles_Klimex_ultrastrong_brown-red-bricks-02ASD.jpg'),
 ('Wikimedia Commons: Wall tile (The Carlisle Kid, CC BY-SA 2.0)','https://commons.wikimedia.org/wiki/File:Wall_tile_-_geograph.org.uk_-_3437207.jpg'),
 ('Wikimedia Commons: 2019 broken tile in bathroom (Gerardolagunes, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:2019_broken_tile_in_bathroom.jpg'),
 ('Wikimedia Commons: Landguard Fort shower room (Michael Garlick, CC BY-SA 2.0)','https://commons.wikimedia.org/wiki/File:Landguard_Fort,_Shower_Room_-_geograph.org.uk_-_6903528.jpg')
) AS s(title,url) ON true
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-wet-room-tiling'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources x WHERE x.topic_id=t.id AND x.url=s.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'GB','GB',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('gb-wet-room-tiling-overview', 'UK Wet Room Tiling: Chain Overview', 'A British overview of wet room finishes: why tanking is the whole game, how the chain runs from substrate survey to grout, and where the standards put the lines of responsibility.', $wallarticle1$# UK Wet Room Tiling: Chain Overview

A wet room is a room that is designed to get wet everywhere, and that one sentence is the whole reason its finishing chain differs from a bathroom's. In a bathroom, water is expected at the shower and tolerated elsewhere. In a wet room, the floor is the shower, the walls take spray, and the water that misses the drain sits on the surface until it evaporates or finds a way down. The finish is not the waterproofing. The finish is the decoration over a waterproofing system that has to be complete before the first tile is fixed, and every failure in the wet room trade traces back to somebody confusing those two ideas.

The British position is unusually clear on this. BS 5385 Part 1:2018, as summarised in the Tile Association's presentation on the changes, states that in wet areas such as showers, wet rooms and steam rooms, substrates should be protected with a suitable proprietary tanking membrane system [3](https://www.tiles.org.uk/wp-content/uploads/2019/04/TTA-Presentation-on-Recent-Changes-to-BS-5385-Part-1-2018-Reduced-File-Size.pdf). The Tile Association publishes a dedicated guidance document, Tiling In Wet Rooms and Showers, within its technical publications list [2](https://www.tiles.org.uk/technical-support/technical-publications/), and NHBC's technical guidance carries a wet area clause with tanking requirements that the TTA has publicly supported [4](https://www.tileandstonejournal.com/tta/tta-offers-support-to-nhbc-to-bring-new-tiling-guidance-in-line-with-british-standards/). Read as a set, those documents say the same thing in three registers: a wet room is a system, not a surface.

The chain that follows from that reads as six stages. Survey the substrate and the room. Tank the wet area with a proprietary system. Select tiles, adhesive and grout that suit the tanking and the exposure. Tile and grout in a sequence that protects the tanking. Inspect and record before handover. Maintain with a regime that respects the membrane underneath.

Each stage has a gate, and each gate exists because the stage after it hides the stage before it. Nobody can inspect a tanking membrane once it is tiled, and that single fact is why this chain's quality article is longer than the others in the series.

## Why tanking is the whole game

Tanking is the trade's word for a continuous waterproof layer between the substrate and the tile. It comes in two broad families. Sheet membranes are factory-made and glued or bonded to the substrate. Liquid-applied membranes, which include the polymer-modified cementitious and dispersion products covered by BS EN 14891 [6](https://libnor.gov.lb/CatalogDetails.aspx?id=6039&language=en), are painted or trowelled on in coats to a specified thickness. Both families work. What matters more than the family is the continuity of the layer and the discipline of the terminations.

Continuity means the membrane runs across the floor, up the walls to a defined height, into the corners without a break, around the waste and any pipe penetration, and over any threshold or upstand. A membrane that stops short of a corner, or that is punctured by a fixing and never sealed, is not a smaller membrane. It is a hole with a membrane around it.

Terminations are the hard part, and every proprietary system supplies its own tapes, corners, collars and seals for exactly that reason. BAL's guidance on tanking makes the same point from the manufacturer's side: the surface must be clean, dry and free from anything that stops adhesion before any of the system goes on [1](https://www.bal-adhesives.com/a-technical-guide-to-tiling-wet-rooms-and-tanking/). A membrane that is not stuck down is a membrane that is not there.

## What a wet room asks of the substrate

Wet room substrates are asked for three things: stability, soundness and a surface the tanking can grip. That rules out loose or friable material, paint that powders under a fingernail, old adhesive that was never meant to be over-coated, and any gypsum background that will soften when it stays damp. It also rules out movement joints treated as decoration; a wet room needs its movement accommodated in the tiling, not suppressed by it.

The floor deserves its own paragraph, because the level of the floor decides the drain arrangement and the drain arrangement decides the tanking detail. The floor must fall to the drain, the drain must be fixed and sealed before the membrane is dressed into it, and the membrane must be continuous through the drain flange. A former or tray that is not set level, or a drain that is adjusted after the membrane is on, will cost more to correct than the whole tanking job.

## Where the standards put responsibility

The British standards do not design the wet room. They set the frame in which the designer, the tanking manufacturer, the tiler and the main contractor each know what they owe. BS 5385 asks for a suitable proprietary system, which is the standards' way of saying: use a system, use it as its maker instructs, and do not improvise a system out of components that were never tested together.

NHBC's wet area guidance and the TTA's support for it point the same direction on new build, where the warranty provider is entitled to see that the tanking was specified and installed as a system [4](https://www.tileandstonejournal.com/tta/tta-offers-support-to-nhbc-to-bring-new-tiling-guidance-in-line-with-british-standards/). In Scotland the building standards handbook sets the broader frame of fitness and water safety that the wet room sits inside [8](https://www.gov.scot/publications/building-standards-technical-handbook-2017-domestic/).

The practical consequence for anyone commissioning a wet room is simple. Ask for the tanking specification in writing, ask for the manufacturer's installation instructions alongside it, and ask who is signing that the membrane was installed to those instructions. A wet room without those three answers is a room with an opinion rather than a system.

## How the later articles use this overview

The materials article deals with the tanking families, the tile and adhesive pairing, and the grout and sealant choices that finish the job. The installation article walks the sequence from survey to grouting. The quality article is the longest, because the gates that matter most happen before the tile hides them. The maintenance article covers what a household can do without disturbing the membrane, and when to call somebody who understands it.

A reader who takes one thing from this overview should take the ordering. Waterproofing, then tiling. Never the reverse, never simultaneous, and never as an afterthought once the layout looks wrong.

## The question the client rarely asks

Clients ask what the tiles will look like. They should also ask what happens to the water that does not go down the drain, because that question determines the whole specification. A wet room's floor is a shallow basin for as long as it takes to dry, and the basin's success depends on a fall, a drain and a membrane working as one assembly rather than as three separate products that happen to be in the same room.

Designers who answer that question early find the rest of the wet room much easier to specify, because the answer settles the floor build-up, the drain type, the tile format and the tanking extents in a single decision. Clients who ask it late discover that the answer was already assumed by whoever drew the room, and assumed answers are the ones that get argued about when the first puddle appears.

## Small rooms, large consequences

Wet rooms are usually small, and small rooms have a habit of amplifying decisions. A fall that is three millimetres short is invisible in a large bathroom and obvious in a wet room. A tile that is two millimetres out of level reads as a mistake when the room is 1,800 millimetres wide. The tolerances that matter are the ones the room can show, and a compact wet room shows almost all of them.

That is not an argument against wet rooms. It is an argument for taking the survey seriously, taking the setting-out seriously, and treating the finish as the visible consequence of decisions taken long before it. The room's smallness is the reason its chain is strict, and the strictness is the reason it can be beautiful.

## Retrofit and new build are different rooms

A wet room formed in a new build can be designed from the structure upwards: the falls are built in, the drain is positioned before the screed, and the tanking is specified with the rest of the envelope. A retrofit wet room works against a building that already has opinions about levels, joists and drainage, and those opinions are usually expensive to overrule.

Retrofit is still very achievable, and it is often the best use of a small back bedroom or an underused corner. What it needs is an early agreement about the floor build-up, because losing 40 millimetres of headroom in a room with a low ceiling is a design decision rather than a detail, and the decision has to be taken before the former is bought.

## What the reader should be able to say

By the end of the chain, a reader should be able to say four things about their own wet room: what system is protecting it, how the fall and drain were set, which surfaces are tanked and to what height, and where the record of those facts lives. A wet room owner who can say those four things can have a sensible conversation with any contractor for the rest of the building's life, and that conversation is worth more than any guarantee.

The chain is short, the standards are clear, and the failure modes are well known. What separates a good wet room from a bad one is almost never knowledge. It is the willingness to hold the sequence when the programme is pressing, and that willingness is the quiet subject of every article that follows.

Read the six stages as a promise: survey before tanking, tanking before tiling, inspection before handover, and care after it. A wet room that keeps that promise is a room that will be ordinary for decades, and ordinary is exactly what a good wet room should be.

That is the promise this chain exists to keep, and the room that keeps it will outlast the fashion that chose its tiles.

A wet room that keeps that promise outlasts the fashion that chose its tiles, and it does so without asking anybody to remember why the sequence mattered.

## References

1. BAL, *A technical guide to tiling wet rooms and tanking*.
2. The Tile Association, *Technical Publications*.
3. The Tile Association, *Recent Changes to BS 5385 Part 1:2018*.
4. Tile and Stone Journal, *TTA offers support to NHBC to bring new tiling guidance in line with British standards*.
5. HBD, *Avoid failures in bathrooms and wetrooms with BAL Waterproof 1C*.
6. Libnor catalogue, *BS EN 14891 liquid-applied water impermeable products*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows an old bathroom with subway tiles in Mulhouse, France, photographed by Alf van Beem and released under CC0 via Wikimedia Commons. It is a real photograph, not AI generated, and its status was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle1$, 9, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Old_bathroom_with_subway_tiles.JPG/1280px-Old_bathroom_with_subway_tiles.JPG')
, ('gb-wet-room-tiling-materials', 'Wet Room Tiling: Materials and Selection', 'A British materials guide to wet rooms: tanking membrane families, tile and adhesive pairing, grouts and sealants, and the selection questions that decide whether the system works.', $wallarticle2$# Wet Room Tiling: Materials and Selection

The materials list for a wet room looks short: membrane, adhesive, tile, grout, sealant. The selection work underneath it is not short, because every item has to be compatible with the one above and below, and compatibility is a promise made by manufacturers to each other rather than a property of any single product.

## The tanking membrane families

Two families dominate British wet rooms. Sheet membranes arrive factory-made, usually as a flexible mat with a fleece face that the adhesive can key into, and they are bonded to the substrate and lapped at joints with the manufacturer's tape or a bonded overlap. Liquid-applied membranes arrive as a paste or dispersion that is brushed, rolled or trowelled on in coats to a specified wet or dry thickness, with reinforcing tape and corner pieces bedded into the first coat at every junction.

BS EN 14891 is the standard that describes liquid-applied water impermeable products for use beneath ceramic tiling, and its scope names the chemistries involved: polymer-modified cementitious mortars, dispersions and reaction resin products [6](https://libnor.gov.lb/CatalogDetails.aspx?id=6039&language=en). That scope matters at selection because it tells the specifier that the product is intended to sit under tile, and that its performance claims are made in that context rather than as a standalone coating.

The choice between families is less about quality than about the room. Sheet membranes suit tight programmes and are quick to dress into a drain flange with the maker's pre-formed collar. Liquid systems suit complex geometry, awkward returns and substrates that a sheet would struggle to follow, provided the applicator respects the coat thickness and the recoat window. Neither family tolerates a substrate that has not been prepared, and BAL's tanking guidance puts surface preparation first for that reason: clean, dry, and free of anything that would stop the system bonding [1](https://www.bal-adhesives.com/a-technical-guide-to-tiling-wet-rooms-and-tanking/).

A ready-mixed option such as BAL Waterproof 1C shows how far liquid systems have come: the manufacturer reports that it needs no priming on most common substrates and is ready to tile after a short cure, with a stated minimum thickness for walls and a heavier minimum for floors [5](https://www.hbdonline.co.uk/news/avoid-failures-in-bathrooms-and-wetrooms-with-bal-waterproof-1c/). Specifiers should read the current data sheet rather than this article for the numbers, but the shape of the claim is worth understanding: the thickness requirement is not a suggestion, it is the mechanism by which the product is waterproof.

## Tiles for a wet room

Tile selection in a wet room is a selection of the whole assembly, not just the face. Porcelain is the default for floors because it is dense, stable under repeated wetting, and available in slip-resistant finishes. Ceramic is common on walls where the mechanical duty is lower. Natural stone is possible and beautiful, and it brings its own requirements for sealing and for adhesive choice, because some stones are sensitive to the alkalinity of cementitious products.

Size and format matter more in a wet room than in a dry room. Large formats reduce grout lines and therefore reduce the area of the finish that depends on grout, but they also concentrate stress at the perimeter and demand a flatter substrate and full-bed adhesion. Small formats and mosaics follow the falls of a shower floor more comfortably and are the traditional choice where a drain sits in a dished former.

Slip resistance on the floor is a safety decision as well as a specification one, and it should be made against the actual use: a family bathroom, an accessible shower, and a commercial wet room are three different briefs.

## Adhesives, grout and sealant

The adhesive has to do two jobs in a wet room. It has to bond the tile, and it has to be compatible with the membrane beneath it. That compatibility is the reason proprietary systems are specified as systems: the membrane manufacturer has tested a family of adhesives over their membrane, and the tile adhesive manufacturer has tested their product over that family.

Cementitious adhesives dominate, classified under BS EN 12004 by their performance rather than their chemistry, and the classification on the bag tells the specifier more than the marketing does. Dispersion adhesives have their place on stable backgrounds in dry or intermittently wet areas, but a wet room floor is not that place.

Grout is the finish's most exposed material and the one most often blamed for failures it did not cause. Cementitious grouts are standard, and epoxy grouts are used where chemical resistance or very low porosity is wanted. Whatever the choice, the grout is not the waterproofing, and a grout that is asked to be the waterproofing will eventually be asked for more than it can give.

Sealant belongs at the junctions that move: floor to wall, wall to wall in the shower, around the waste, and at any change of plane where a flexible movement accommodation is needed. The sealant should be a sanitary-grade silicone or a hybrid that matches the manufacturer's system, applied over a properly dried joint, and never used to bridge a gap that should have been filled with a solid backing.

## The selection questions that decide the outcome

Four questions settle most wet room material selections. What system is being used, and is every other product compatible with it? What is the substrate, and does it need a primer, a backer board or a repair before anything goes on? What is the exposure, meaning which surfaces are permanently wet, which are splash zones, and which are merely humid? And who is signing the installation, because the signature decides how much of the manufacturer's guidance becomes an obligation.

Answer those in writing before the first bag is ordered and the material selection is largely done. Answer them after the membrane is on and the answers become arguments.

## Why the system beats the shopping list

A wet room assembled from a good membrane, a good adhesive and a good grout, each bought separately and each excellent in its own right, is a worse gamble than a modest system bought as a set. The reason is not brand loyalty. It is that a system's components have been tested against each other, and the failures that matter in tiling are almost always interface failures rather than product failures.

Manufacturers invest heavily in those interfaces: an adhesive formulated to key into a particular fleece, a tape that bonds to a particular cured membrane, a primer that prepares a particular substrate for a particular dispersion. A specifier who treats the interfaces as somebody else's problem gets a specification that reads well and performs unpredictably, and unpredictability in a wet room is expensive.

## The cost of the wrong grout

Grout choices are often made on colour and cleaned up on performance. In a wet room the performance question comes first: a cementitious grout in a shower that is used twice a day will need attention within a few years, while an epoxy grout in the same position may outlast the tile. The difference in material cost is small compared with the difference in the labour of renewal, and the labour of renewal in a wet room includes the risk of damaging the waterproofing beneath.

Specifiers who price the whole life of the joint rather than the bag of grout tend to choose differently, and clients who are shown that arithmetic tend to agree with them.

## Waste, traps and the things you cannot see

The drain is the least glamorous component in the specification and the one with the most influence on the outcome. A wet room waste has to pass the flow of a shower while sitting in a shallow build-up, and it has to be accessible enough to clear without lifting tiles. Linear channels and gully formers solve different problems, and the choice should follow the floor structure rather than the catalogue.

Whichever is chosen, the trap has to be reachable and the seal has to survive the drying that a wet room's draughts impose. A trap that loses its seal lets smells back into the room, and a trap that cannot be reached turns a routine clean into a demolition.

## Samples, batches and the colour that arrives later

Tile and grout colours vary between production batches, and a wet room is often large enough that the variation shows. The practical answer is to order the whole job from one batch where possible, and to keep a box of tiles and a bag of grout in store for future repairs. The cost is small, and it saves the far larger cost of a repair that is visible because nobody kept the reference.

Manufacturers publish batch and shade information for exactly this reason, and the specification should note it so that the site knows to check rather than to hope.

A single specification sheet carrying the membrane, the adhesive, the grout, the sealant and the tile, with a manufacturer and a product code against each, prevents more failures than any amount of site supervision. It also makes the procurement conversation honest, because a substitution has to be argued rather than slipped in.

The materials section of a wet room specification is short enough to fit on one page, and the page is worth writing by hand and keeping. Products change, ranges are discontinued and colours are retired, and the page is what allows a repair ten years later to match the room rather than merely to fill a hole.

Written down, that page also settles disputes with suppliers who offer an equivalent, because an equivalent that cannot be shown to be compatible is not an equivalent at all.

## Adhesive coverage is a material choice too

Coverage is usually discussed as a technique, and it is also a material property. A thick-bed cementitious adhesive can build out a slightly uneven wall, a thin-bed adhesive needs a flatter background and rewards proper trowel selection, and a dispersion adhesive behaves differently again. Choosing the adhesive without choosing the trowel and the substrate tolerance is choosing a third of a specification.

The client-facing consequence is simple. If the tile format has grown, or the wall is rougher than the survey suggested, the adhesive and the trowel need to be revisited rather than stretched. Stretching them is how a wet room acquires the hollow-sounding tile that nobody notices until a grout line cracks two winters later.

## Keeping the specification alive

Specifications rot. Products are discontinued, ranges are re-coloured and suppliers substitute quietly. A wet room spec that is written once and filed never updated becomes a document that describes a room that no longer exists, which is worse than no document at all because it invites false confidence.

The discipline that fixes this is small: date the spec, note the batch references at installation, and revisit it when any repair is done. Ten minutes of bookkeeping per job keeps the specification true for the life of the room.

## References

1. BAL, *A technical guide to tiling wet rooms and tanking*.
2. The Tile Association, *Technical Publications*.
3. The Tile Association, *Recent Changes to BS 5385 Part 1:2018*.
4. Tile and Stone Journal, *TTA offers support to NHBC to bring new tiling guidance in line with British standards*.
5. HBD, *Avoid failures in bathrooms and wetrooms with BAL Waterproof 1C*.
6. Libnor catalogue, *BS EN 14891 liquid-applied water impermeable products*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows porcelain wall tiles in a brick-format finish, photographed by Asurnipal and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle2$, 8, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Dornbirn-Porcelain_wall_tiles_Klimex_ultrastrong_brown-red-bricks-02ASD.jpg/1280px-Dornbirn-Porcelain_wall_tiles_Klimex_ultrastrong_brown-red-bricks-02ASD.jpg')
, ('gb-wet-room-tiling-installation', 'Wet Room Installation: Survey to Grout', 'A British wet room installation sequence: substrate survey, tanking application, drain and penetration detailing, tiling order, grouting and sealing, with the cure windows that protect each stage.', $wallarticle3$# Wet Room Installation: Survey to Grout

Wet room installation is a sequence with dependencies, and the dependencies are sterner than they look. Each stage closes the one before it, so the order is not an administrative preference. It is the only order in which the work can still be inspected.

## Stage one: the survey

The survey answers four questions before anything is ordered. What is the substrate, layer by layer, down to something structural? Is it dry, and can that be proved rather than assumed? Is it flat enough for the tile format chosen, and is the floor falling to the drain? And what has to move or be removed, because a wet room is unforgiving of pipes and cables that cross the tanking zone without a planned detail.

The survey produces a sketch, and the sketch carries the drain position, the tanking extents, the tile setting-out lines and the position of every penetration. That single sheet becomes the instruction for the trades that follow and the record for the inspection that ends the job.

## Stage two: substrate preparation

Preparation is where wet rooms are won. Loose material comes off, dust comes off, and anything that would stop a membrane bonding is removed rather than painted over. BAL's tanking guidance is blunt about the standard: surfaces must be clean, dry and free of barriers to adhesion before the system is applied [1](https://www.bal-adhesives.com/a-technical-guide-to-tiling-wet-rooms-and-tanking/).

Where the substrate is gypsum-based, or where the room needs a flatter and more stable background than the existing wall offers, a tile backer board is fixed to the frame or the wall and the joints are taped and filled as the board maker instructs. Where the floor needs a fall, a former or a screed to falls is installed and set before any membrane work begins.

The last act of preparation is the primer, where the system calls for one, and the primer is allowed its full drying time. A primer that is still tacky when the first coat goes on is a bond that will be tested by water rather than by time.

## Stage three: tanking

Tanking starts at the details, not the field. Corners get their pre-formed pieces or their reinforcing tape bedded into the first coat. The drain flange gets its collar, dressed in and sealed as the system instructs. Pipe penetrations get their seals, and any fixing that must pass through the membrane gets a sealed collar designed for the purpose.

Only then does the field coat go on, and it goes on at the specified thickness rather than at the thickness that feels right. Liquid systems typically need two coats at right angles with a recoat window respected in both directions: too soon and the first coat is disturbed, too late and the second coat needs preparation before it will bond. Waterproof 1C illustrates the modern pattern, with a manufacturer claim of no priming on most substrates and a tiling window measured in hours rather than days [5](https://www.hbdonline.co.uk/news/avoid-failures-in-bathrooms-and-wetrooms-with-bal-waterproof-1c/).

Sheet membranes follow the same logic in a different grammar. Adhesive is combed over the prepared substrate, the sheet is laid and rolled to expel air, laps are formed in the direction that sheds water, and the joints are sealed with the maker's tape or bonded overlap. The membrane is carried up the walls to the height the design requires, and the top edge is finished so that water running down the wall cannot get behind it.

## Stage four: tiling

Tiling begins when the membrane is fully cured and the tiling window has opened. It begins with setting out, because a wet room shows its setting-out more than any other room: the drain should sit in a sympathetic relationship with the tile grid, and cuts should be arranged so that the slivers land where nobody stands.

Wall tiling generally runs before floor tiling, so that the floor tiles can be cut to the wall tile face and the floor is not walked on while the walls are built up. Adhesive is applied with a notched trowel sized to the tile, the tile is bedded with a twisting pressure to collapse the ridges, and the coverage is checked by lifting an occasional tile rather than hoping. Large formats and any tile in a wet zone should be full-bed, which means back-buttering or a trowel technique that leaves no voids.

Movement joints are installed where the design requires them, and the perimeter of the floor is left as a movement joint rather than grouted tight to the wall. That decision is made at tiling, and it cannot be recovered later without removing tiles.

## Stage five: grouting and sealing

Grouting happens after the adhesive has set, and it happens in two passes: work the grout in, then clean back before it skins. The aim is a joint that is full, dense and slightly recessed rather than a surface smear that will craze and collect dirt.

Sealant follows the grout, not the other way round. Junctions that move get a flexible sanitary sealant applied to a clean, dry joint with the correct backing, and the sealant is tooled to a profile that sheds water rather than holding it.

## Stage six: commissioning and handover

The last stage is the one that gets skipped when the programme slips: a controlled wet test. Water is run through the shower and the drain for long enough to prove the falls and the waste, the room is inspected, and the inspection is recorded with photographs of the tanking before it was covered as well as the finished work.

The photographs are not decoration. They are the only durable evidence that the membrane was continuous, and they are what a warranty provider will ask for if the room ever leaks.

## What the sequence protects

Read as a whole, the sequence protects three things. It protects the membrane from being punctured by later trades. It protects the tile from being laid on an uncured or unprepared surface. And it protects the owner from discovering a defect at the only moment it becomes expensive, which is after the grout has set.

Every stage has a natural stopping point where the work can be inspected by someone who did not do it. Taking those stopping points is the difference between a wet room that is finished and a wet room that is merely tiled.

## The trades that come after you

A wet room is rarely built by one trade in one uninterrupted sequence. Plumbing, electrical, tiling and decoration often interleave, and every trade that follows the tiler is a risk to work that is already complete. The mitigation is not vigilance in the abstract; it is physical protection and a programme that puts the protected work last. Boards over the floor, tape over vulnerable corners and a clear instruction that nobody fixes anything into the wet zone without a planned detail are worth more than any amount of post-installation inspection.

The tiler's leverage here is the sign-off sheet. A tradesman who hands over a completed membrane with photographs and a written note that any penetration must be agreed in advance has transferred the risk to the person who breaks the rule, and that transfer is the most useful thing a tiler can do for a client.

## Weather, temperature and the cure window

The tanking and tiling sequence is sensitive to the room's conditions in a way that a dry-wall job is not. Cold slows cure, draughts dry primers unevenly, and a room that is too warm can skin a liquid membrane before it has been worked into a corner. The installation article's cure windows assume a normal internal environment, and a site that cannot offer one should be heated, sheltered or rescheduled rather than pushed.

Manufacturers publish the temperature range for their systems, and the range is a constraint rather than a suggestion. A winter wet room installed in an unheated shell is the classic example of a job that passes its wet test in March and fails its inspection in June.

## Working to the drawing, and deviating in writing

Setting-out lines that exist only in the tiler's head are lines that will be argued about. The drawing that emerges from the survey should carry the grid, the drain centre, the tanking extents and the cut positions, and any departure from it during the work should be recorded rather than absorbed.

That discipline is not bureaucracy. It is the mechanism by which the next trade, the checker and the client all look at the same room, and it is the difference between a wet room that can be maintained and one that has to be guessed at every time it is touched.

## The handover conversation

Handover is the last chance to transfer knowledge rather than just keys. A short conversation about the extractor, the drain cleaning, the sealant joints and the products that are safe to use is worth more to the client than a folder of certificates they will never read, and it costs ten minutes.

The best handover ends with the client able to describe the room's waterproofing in their own words. If they can do that, the maintenance article's advice will land, and the room will get the care it was designed for.

The wet room that is built in the right order needs no heroics at the end, and the wet room that needs heroics at the end was built in the wrong order. That sentence is the whole installation article compressed, and it is worth remembering when the first shortcut is proposed on site.

A tiler who explains the sequence to the client before starting is doing two jobs at once: delivering the work and earning the patience the work requires. Wet rooms are impatient rooms, and the explanation is what buys the time the cure windows demand.

The order is the craft, and the craft is the reason the room works, and both are worth saying out loud before the first board is cut.

## The detail that decides the room

Every wet room has one detail that decides whether it will be dry for twenty years, and it is almost always the junction rather than the field. The floor-to-wall corner, the drain collar, the upstand at the doorway and the shower valve penetration are where the water concentrates and where the geometry fights the membrane.

Time spent on the details before the field coat is time spent at the cheapest moment in the job. The same details revisited after tiling are the most expensive work the room will ever need, and they will never be as sound as they could have been on the first pass.

## References

1. BAL, *A technical guide to tiling wet rooms and tanking*.
2. The Tile Association, *Technical Publications*.
3. The Tile Association, *Recent Changes to BS 5385 Part 1:2018*.
4. Tile and Stone Journal, *TTA offers support to NHBC to bring new tiling guidance in line with British standards*.
5. HBD, *Avoid failures in bathrooms and wetrooms with BAL Waterproof 1C*.
6. Libnor catalogue, *BS EN 14891 liquid-applied water impermeable products*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a decorative wall tile detail, photographed by The Carlisle Kid and made available under CC BY-SA 2.0 via Wikimedia Commons and geograph.org.uk. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle3$, 9, 'installation', 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Wall_tile_-_geograph.org.uk_-_3437207.jpg')
, ('gb-wet-room-tiling-quality-checks', 'Wet Room Quality Control: Gates Before the Tile', 'A British quality program for wet rooms: substrate sign-off, membrane thickness and continuity checks, drain and penetration inspections, full-bed and joint audits, and the photographic record that outlives the grout.', $wallarticle4$# Wet Room Quality Control: Gates Before the Tile

Wet room quality control has one governing idea: the defects that matter are invisible after tiling, so the checks must happen before the tile. Everything else in this article follows from that.

## Gate one: substrate sign-off

The substrate is signed off before any membrane work begins, against four criteria. Soundness: no friable, loose or painted surface that a membrane cannot grip. Dryness: proved by meter or by the system maker's accepted method, not by the look of the wall. Flatness: measured against the tolerance the tile format needs. And fall: measured on the floor with a level and a straightedge, with the drain at the low point.

A substrate that fails any of those is repaired or replaced, and the repair is recorded, because a repair that is invisible in the finished room is still a fact about the wall.

## Gate two: system and compatibility

The second gate is documentary rather than physical, and it is the one most often missed. The tanking system, the adhesive and the grout should be a compatible set, and the compatibility should be evidenced by the manufacturers' own literature rather than by a fitter's experience. Where the system maker publishes an approved adhesive list, the list is the specification.

The gate is signed when the products on site match the products specified, with batch references recorded so a future investigation can trace what actually went into the room.

## Gate three: membrane thickness

Liquid membranes are checked for thickness, not for appearance. Coat thickness is measured wet or dry according to the maker's method, in a set number of places per wall and per floor, and the results are logged. A coat that looks generous but measures thin is the classic wet room failure mode, because the product's waterproofing is a function of its cured thickness rather than its colour.

For sheet membranes the equivalent check is the bond: the sheet is sounded and probed for hollow areas, and any hollow is cut out, patched and re-tested rather than pressed down and forgotten.

## Gate four: continuity and details

This is the gate that catches most real defects, and it is a visual audit conducted against a checklist. Corners: are the pre-formed pieces or the reinforcing tapes present, bedded and lapped in the correct sequence? Drain: is the flange collar dressed in, continuous with the field membrane, and sealed? Penetrations: is every pipe, every fixing and every cable entry sealed with a purpose-made collar? Upstands and thresholds: does the membrane rise high enough, and is the top edge terminated so water cannot run behind it?

The audit is done twice: once while the membrane is still accessible, and once at the moment before tiling begins. The second pass is short and catches the damage done by the intervening trades, which is the damage nobody admits to.

## Gate five: tiling adhesion and coverage

Once tiling begins, the checks change from continuity to coverage. Adhesive coverage is verified by periodically lifting a tile, by tapping tiles for hollow notes, and by confirming that the notched trowel, the adhesive and the substrate were matched. Large formats and all wet zone tiles should show full-bed adhesion, with no voids behind the tile that could collect water.

The check is destructive by nature, which is why it is done early and on a sample rather than at the end and in a panic.

## Gate six: joints, grout and sealant

Grout is checked for depth and density, not just for colour: joints should be filled to a consistent depth with no voids and no surface smearing. Movement joints are confirmed where specified, including the floor perimeter, and the sealant joints are inspected for bond, profile and continuity.

A sealant joint that is proud, thin or tooled into a concave that holds water is a defect at handover even though it looks neat.

## Gate seven: the wet test

The wet test runs water through every outlet for a sustained period, with the room observed from below where that is possible and from the dry side of every junction. It is not a proof of the membrane, because a membrane can pass a test on the day and fail in a year. It is a proof that the waste, the falls and the visible junctions behave, and it is the last chance to find a plumbing fault with the grout still accessible.

## Gate eight: the photographic record

Every gate produces a photograph, and the photographs are filed together with the product data sheets and the batch references. The record has three audiences: the client, who is entitled to know what is behind the tile; the warranty provider, who will ask for it; and the next contractor, who will be grateful for it.

A photograph taken at the right moment is worth more than any number of assurances given afterwards. It is also the only artefact of the job that improves with age.

## What good quality control looks like from outside

From outside, a well-controlled wet room job looks unremarkable. The programme has short holds at each gate. There is a folder with data sheets in it. Somebody other than the installer signs the membrane check. The photographs exist before the tiles do.

That unremarkable shape is the point. Quality control in a wet room is not a performance for the client. It is a set of small, boring, documented decisions taken at the only moments when they are still cheap.

## Why eight gates and not three

Three gates would be cheaper and would catch the obvious defects: a substrate that is visibly wet, a membrane that is visibly missing, a grout that is visibly hollow. Eight gates catch the defects that are not visible, which are the ones that produce a leak in year three rather than a complaint in week one. The extra gates are all documentary or dimensional, and they cost minutes rather than days.

A programme that cannot afford eight gates cannot afford a wet room, and it is better to discover that during tendering than during a warranty claim.

## How the gates interact with the programme

Gates cost time, and time is the currency of every building programme. The way to keep both is to run the gates in parallel with the work rather than after it: the substrate sign-off happens as each wall is prepared, the membrane audit happens as each area is finished, and the photographic record grows with the job rather than being assembled at the end.

Run that way, the quality program adds almost nothing to the critical path and removes the largest single risk from the programme. Run the other way, as a single inspection at handover, it adds a day and catches a fraction of the defects.

## The signature question

Every gate needs a signature, and the signature should belong to someone who did not do the work. That is not distrust. It is the recognition that the person who has spent three days with a wall sees what they intended rather than what is there, and a second pair of eyes is the cheapest instrument in the whole wet room.

Where a second person is genuinely unavailable, the gate can be self-inspected against a written checklist with photographs. The checklist forces the same questions, and the photographs provide the same evidence, which is most of the value even without the second pair of eyes.

## Recording failures as well as successes

A quality program that only records passes is a program that has forgotten why it exists. Where a gate finds a defect, the defect, the repair and the re-check belong in the record alongside the passes, because that history is what tells a future owner which parts of the room have already been disturbed.

The record is also the best training document a firm can own. Six months of gate sheets show a new starter exactly where the risks live in a wet room, in the firm's own handwriting rather than in a generic manual.

## Independent checks and the cost of not having them

Where the tanking is being installed for a warranty provider or a commercial client, an independent check of the membrane before tiling is often a condition of the cover. That check is not an insult to the installer. It is the mechanism by which the provider can offer a warranty at all, and a job that plans for it discovers nothing at the wrong moment.

Residential jobs rarely have that layer of assurance, which is why the photographic record matters so much more in a house. The photographs are the substitute for the independent inspector, and they are only as good as the person who took them.

The gates are cheap, the record is cheap, and the alternative is a room that cannot be inspected once it is finished. Anybody who has chased a leak through a tiled wet room will tell you which side of that equation they would rather be on.

Quality control in a wet room is ultimately an argument made in advance rather than a defence made afterwards, and the documents assembled at the gates are the argument. They cost a morning. They save a wall.

The argument is stronger than any guarantee, because a guarantee promises to fix a failure while a record makes the failure less likely to happen at all.

## The gate that protects the warranty

Where a warranty provider is involved, the membrane inspection is the gate that matters most, and the paperwork around it is what converts an installation into cover. Providers want to see the system specified, the products matched and the membrane checked before the tile went on, and they want the photographs that prove it.

The gate is therefore worth planning for rather than discovering. A job that schedules the inspection gets it at a convenient moment; a job that does not gets the inspection at the least convenient one, which is the morning the tiler arrives.

## What a good gate sheet looks like

A gate sheet is one page with the gate's name at the top, the criteria down the left, a pass or fail against each, a signature and a date. Nothing about it is clever, and that is precisely why it works: a person can complete it in a corridor and a manager can audit it in a minute, and a future owner can understand what was checked without needing the person who did the checking.

The best gate sheets also carry a small box for notes about anything unusual, because the unusual things are what a later investigation actually needs. A wall that took three coats to reach thickness is a fact worth recording, even though the gate passed.

## References

1. BAL, *A technical guide to tiling wet rooms and tanking*.
2. The Tile Association, *Technical Publications*.
3. The Tile Association, *Recent Changes to BS 5385 Part 1:2018*.
4. Tile and Stone Journal, *TTA offers support to NHBC to bring new tiling guidance in line with British standards*.
5. HBD, *Avoid failures in bathrooms and wetrooms with BAL Waterproof 1C*.
6. Libnor catalogue, *BS EN 14891 liquid-applied water impermeable products*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a cracked floor tile in a bathroom, photographed by Gerardolagunes and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it illustrates the class of defect this article is written to prevent. Its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle4$, 9, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/2019_broken_tile_in_bathroom.jpg/1280px-2019_broken_tile_in_bathroom.jpg')
, ('gb-wet-room-tiling-maintenance-repair', 'Wet Room Maintenance: What a Household Can Do', 'A British maintenance guide for wet rooms: cleaning regimes that respect the membrane, grout and sealant upkeep, early leak signals, safe repairs, and the records worth keeping.', $wallarticle5$# Wet Room Maintenance: What a Household Can Do

A wet room needs less maintenance than its reputation suggests, and the maintenance it does need is mostly about not damaging things while cleaning them. The membrane under the tile is doing the waterproofing, and the household's job is to keep the layers above it sound so the membrane is never asked a question.

## The cleaning regime

Wet rooms fail faster from cleaning than from use. Abrasive powders and pads cut through sealant, dull glazed porcelain and open grout, and strong acids attack cementitious grout and some natural stones. The safe regime is the boring one: a pH-neutral cleaner, a soft brush or microfibre, and enough dwell time to let the chemistry work instead of the elbow.

The other half of the regime is drying. A squeegee on the walls and a dry mop on the floor after use does more for a wet room's long-term appearance than any specialist product, because it removes the water that would otherwise evaporate and leave its minerals behind.

Ventilation belongs in this section even though it is not a cleaning task. A wet room without adequate extraction stays humid long after the water is gone, and persistent humidity is the ally of mould in sealant joints and of movement in timber behind the finishes.

## Grout and sealant upkeep

Grout is a consumable. Over years, cementitious grout erodes in the wettest zones, hairline cracks appear where the substrate moves, and the joint begins to hold water rather than shed it. The maintenance response is to rake out and re-grout the affected area rather than to smear new grout over the old, because a thin cosmetic layer will fail again within a season.

Sealant joints are the first line of defence at every change of plane, and they degrade faster than grout because they are designed to move. A joint that has lost adhesion, gone hard, or grown mould behind the surface should be cut out, cleaned, dried and replaced with a sanitary-grade sealant. Sealant over sealant is a repair that hides a problem rather than solving it.

Epoxy grouts and high-performance sealants last longer and behave differently, and they should be maintained with the products their manufacturers recommend rather than with the general advice above.

## Early warning signs

A wet room gives warnings, and the warnings are worth knowing because the difference between a cheap repair and an expensive one is usually the delay between the sign and the response.

A musty smell that does not clear with cleaning suggests moisture where it should not be, often behind a wall or under a floor. A tile that sounds hollow when tapped may have debonded, and a debonded tile in a wet zone is a route for water behind the finish. Grout that darkens and stays dark in one area is holding water. A stain on an adjacent ceiling or a skirting that swells on the other side of a wall is the membrane's verdict arriving late.

Any of those signs justifies an investigation by someone who understands tanking, and the investigation is best done before the second sign appears.

## Repairs a household can safely attempt

Replacing a broken tile is within reach of a careful DIY-er, provided the tile is not over a tanking detail and the replacement is bedded with a compatible adhesive and the joint re-grouted and re-sealed. Replacing a sealant joint is similar: cut out, clean, dry, prime if the maker requires it, apply, tool, cure.

What a household should not attempt is anything that pierces the membrane: new fixings through a wet zone wall, a new shower valve without a planned penetration detail, or lifting floor tiles to chase a drain. Each of those turns a surface repair into a system repair, and a system repair needs the system's own components.

## The annual inspection

Once a year, the wet room gets a proper look. The shower outlet is cleared and checked for flow. The sealant joints are inspected for adhesion and mould. The grout is checked in the wettest square metre. The extractor is cleaned and tested. Any hollow-sounding tile is noted, and any persistent damp patch is investigated rather than watched.

The inspection takes under an hour, and its value is that it happens on a schedule rather than in response to a leak.

## Records worth keeping

Keep the tanking system's name, the installation date, any photographs taken before tiling, and the details of whoever installed it. Keep the tile and grout product names as well, because matching a repair later is far easier with the original specification than with a colour sample held up in a shop.

Those records cost nothing to keep and are the difference between a repair and a rebuild when something eventually needs attention.

## What maintenance is really protecting

The household is not protecting the tiles. Tiles are durable and replaceable. The household is protecting the membrane, which is neither, and everything in this article exists to keep that membrane out of the conversation.

Keep the joints sound, keep the surface dry, keep the ventilation working, and watch for the early signs. A wet room maintained that way will look after itself for decades, and the maintenance article will have done its job by being boring.

## Where maintenance stops and repair begins

The line between maintenance and repair is the point at which the membrane becomes involved. Cleaning, grouting and sealing are maintenance: they restore the layers above the membrane and leave the system intact. Any intervention that requires access behind the tile, or that changes a penetration, is repair, and repair in a wet room requires the same system thinking as the original installation.

Households that understand the line make better decisions, because they stop treating a persistent damp patch as a cleaning problem. The patch is information, and the information is always about the membrane or about water that has found a way around it.

## Mould, and what it is telling you

Mould in a wet room is normal in small quantities and a signal in large ones. A thin film on a sealant joint that returns after cleaning is a ventilation and drying issue. Mould that has grown behind the sealant, or that reappears within days of cleaning, suggests water is being held in the joint rather than passing over it, and a joint that holds water is a joint that has lost its profile or its bond.

The response is to renew the joint rather than to escalate the cleaning products. Bleach will whiten the surface and leave the cause in place, and the cause is the only thing that matters.

## Products that promise to seal a leak

The market offers sprays and coatings that claim to seal a leaking shower without removing tiles. Some of them work on very specific defects, and none of them replaces a membrane. A household tempted by one should ask what the product is bonding to, because in a wet room the answer is usually grout, and grout is not the waterproofing.

Where a leak is confirmed, the honest options are to investigate the junction, to renew the joint, or to open the finish and repair the system. The sprays sit between those options and rarely shorten the journey.

## When to call somebody

The household that calls early is the household that spends least. A confirmed leak, a hollow-sounding tile in a wet zone, a sealant joint that will not stay sealed, and a damp patch on an adjacent wall are all reasons to bring in somebody who understands tanking rather than somebody who understands tiling.

The distinction matters because the two trades will give different answers, and only one of them is looking at the layer that is actually failing. Asking a tiler to solve a membrane problem is like asking a decorator to solve a structural crack: the work will look right and the cause will still be there.

## A maintenance calendar that fits a real household

Once a week, the room is dried after the last shower and the extractor is left to run. Once a month, the drain is cleared and the sealant is looked at while the shower runs. Once a year, the joints are checked properly, the grout is inspected in the wettest square metre, and the extractor is cleaned.

That calendar is not demanding, and its value is that it replaces worry with a routine. A household that knows what to look at and when has converted an anxious subject into a manageable one.

Maintenance is the least glamorous article in any finishing chain and the one that decides how long the others last. On a wet room it decides something more: whether the waterproofing is ever tested by neglect rather than by water.

A maintenance regime is a form of respect for work that is mostly invisible, and the wet room rewards that respect with decades of quiet service. Few rooms in a house give so much for so little attention.

Do the seven small things, keep the record, and let the room be ordinary.

## Repairing a hollow tile before it fails

A tile that sounds hollow is a tile that has lost its bond, and in a wet zone it is a route for water that the membrane was never asked to handle. The repair is to cut out the affected tile, clean the bed, re-prime and re-fix with a compatible adhesive, then re-grout and re-seal the joints around it.

The work is modest and the timing is everything. A hollow tile repaired in the season it is noticed costs a morning. The same tile left until water has found the substrate costs a section of the room, because the failure that follows is rarely confined to the tile that warned about it.

## The habit that makes maintenance real

Maintenance advice fails when it lives on a website and succeeds when it lives in a routine. The households whose wet rooms stay sound are rarely the ones with the most technical knowledge; they are the ones where somebody notices the sealant on the same weekend every year, because noticing has become a habit rather than a project.

That habit is the last link in the chain that begins with a survey and a membrane, and it is the link most likely to be lost. Everything the earlier articles build depends on it, which is why the maintenance article is the one worth reading twice.

A wet room that is looked after this way stops being a source of worry and becomes simply the room where the shower is, which is all anybody ever wanted from it, and which is more than most rooms in a house ever achieve.

## References

1. BAL, *A technical guide to tiling wet rooms and tanking*.
2. The Tile Association, *Technical Publications*.
3. The Tile Association, *Recent Changes to BS 5385 Part 1:2018*.
4. Tile and Stone Journal, *TTA offers support to NHBC to bring new tiling guidance in line with British standards*.
5. HBD, *Avoid failures in bathrooms and wetrooms with BAL Waterproof 1C*.
6. Libnor catalogue, *BS EN 14891 liquid-applied water impermeable products*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows the shower room at Landguard Fort, photographed by Michael Garlick and made available under CC BY-SA 2.0 via Wikimedia Commons and geograph.org.uk. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle5$, 8, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Landguard_Fort%2C_Shower_Room_-_geograph.org.uk_-_6903528.jpg/1280px-Landguard_Fort%2C_Shower_Room_-_geograph.org.uk_-_6903528.jpg')
) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='GB' AND t.candidate_key='assembly:gb-wet-room-tiling'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='GB' AND t.market_code='GB'
  AND t.candidate_key='assembly:gb-wet-room-tiling'
  AND a.wall_topic_id=t.id AND a.wall_market_code='GB' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
