-- Fourth authored GB batch: five researched draft articles for the UK interior block/brick -> skim -> mist -> emulsion chain.
-- Owner directive 2026-10-26: every article carries a real photograph cover (Wikimedia Commons, attributed), never AI generated.
-- Nigeria is deliberately excluded. Articles remain drafts; editorial review gates are not bypassed.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='GB' AND candidate_key='assembly:gb-interior-block-skim-paint') THEN
  INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type,verification_status)
  VALUES ('GB','assembly:gb-interior-block-skim-paint','Block/brick interior skim plaster and emulsion chain','finish_assembly','candidate');
END IF; END $$;

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,mp.default_language
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON true
JOIN public.market_profiles mp ON mp.country_code=t.market_code
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-interior-block-skim-paint'
ON CONFLICT(topic_id,theme_key,language_code) DO NOTHING;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('British Gypsum, *Thistle Finishing Plaster, product data sheet*', 'https://www.british-gypsum.com/documents/product-data-sheet-pds/british-gypsum-pds-thistle-finishing-plaster.pdf', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK block/brick skim and emulsion chain; requires human local/editorial review before acceptance.'),
  ('British Gypsum, *Installation Guidance: Thistle Finishing Plaster*', 'https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-finishing-plaster.pdf', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK block/brick skim and emulsion chain; requires human local/editorial review before acceptance.'),
  ('British Gypsum, *Thistle Plasters Residential Brochure* (incl. Thistle Bond-It bonding agent)', 'https://www.specifiedby.com/artex/thistle-bondingcoat/artex-ltd_thistle-bondingcoat-1_brochures_0_thistle-plasters-residential-brochure-2015.pdf', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK block/brick skim and emulsion chain; requires human local/editorial review before acceptance.'),
  ('British Gypsum, *Installation Guidance: Thistle Undercoat Plaster*', 'https://www.scribd.com/document/892635792/British-Gypsum-Installation-Guidance-Thistle-Undercoat-Plaster', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK block/brick skim and emulsion chain; requires human local/editorial review before acceptance.'),
  ('British Gypsum, *Thistle Plaster Systems, White Book specification selector PL0029*', 'https://www.british-gypsum.com/Specification/White-Book-Specification-Selector/plasters/thistle-plaster-systems/pl0029', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK block/brick skim and emulsion chain; requires human local/editorial review before acceptance.'),
  ('Dulux Trade, *Plaster Primer (moisture tolerant) product data*', 'https://files.plytix.com/api/v1.1/file/public_files/pim/assets/f9/73/a4/63/63a473f9ea58e20001a27d35/texts/07/48/51/68/6851480794f53e70ccd40856/DULTPPM_Dulux-Trade-Plaster-Primer-Moisture-Tolerant-White_1.pdf', 'Dulux Trade', 'Citation for one or more of five source-linked draft articles about the UK block/brick skim and emulsion chain; requires human local/editorial review before acceptance.'),
  ('Scottish Government, *Building standards technical handbook 2017: domestic (durability, workmanship and fitness of materials, citing BS 8000 workmanship codes)*', 'https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/', 'Scottish Government', 'Citation for one or more of five source-linked draft articles about the UK block/brick skim and emulsion chain; requires human local/editorial review before acceptance.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-interior-block-skim-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Cover photograph: *Plasterer, Ruthun* by John Thomas (National Library of Wales), public domain, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Plasterer,_Rhuthun_NLW3362661.jpg', 'Wikimedia Commons', 'Real photograph cover image credit for the overview article; not AI generated; license verified via Commons API.'),
  ('Cover photograph: *One man is mixing plaster on a board on the floor* (Wellcome Collection), CC BY 4.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:One_man_is_mixing_plaster_on_a_board_on_the_floor_and_anothe_Wellcome_V0039549.jpg', 'Wikimedia Commons', 'Real photograph cover image credit for the materials article; not AI generated; license verified via Commons API.'),
  ('Cover photograph: *SkimCoatApplication* by the Oregon Department of Transportation, CC BY 2.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:SkimCoatApplication_(43376691030).jpg', 'Wikimedia Commons', 'Real photograph cover image credit for the installation article; not AI generated; license verified via Commons API.'),
  ('Cover photograph: *Stucadoor in actie, Velsen* (Rijksdienst voor het Cultureel Erfgoed, photographer G.Th. Delemarre), CC BY-SA 4.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Stucadoor_in_actie_-_Velsen_-_20240473_-_RCE.jpg', 'Wikimedia Commons', 'Real photograph cover image credit for the quality article; not AI generated; license verified via Commons API.'),
  ('Cover photograph: *Rolling in the Middle* by Michael Coghlan, CC BY-SA 2.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Rolling_in_the_Middle_(34571931105)_(cropped).jpg', 'Wikimedia Commons', 'Real photograph cover image credit for the maintenance article; not AI generated; license verified via Commons API.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-interior-block-skim-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'GB','GB',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('gb-interior-block-skim-paint-overview', 'UK Block Walls to Emulsion: Chain Overview', 'A British overview of the interior finish chain most UK rooms wear: block or brick backgrounds, the undercoat where suction demands one, the skim that becomes the visible face, the mist coat that seals it, and the emulsion that colours it.', $wallarticle1$# UK Block Walls to Emulsion: Chain Overview

## The chain, read as one sentence

Take a structural wall of blockwork or brickwork, decide from its suction whether it needs a plaster undercoat, give it one if the decision says so, finish the face with a thin skim of gypsum finishing plaster, wait until that skim is thoroughly dry, seal the porous new surface with a thinned mist coat or a dedicated primer, and then, and only then, give the room its colour with full coats of emulsion [1][5][6]. Every word of that sentence carries a decision this series has taken the space to explain, because the chain is the default interior finish of British housing and the chain is also where most of its failures are manufactured. The articles that follow walk the chain in order, from the shelf of bags and beads to the final roller pass, and this overview holds the map.

## Why the chain exists, and what each link earns

The chain exists because a masonry background and a painted wall have opposite needs. A block or brick wall is structural, cheap, rough, and absorbent; a painted wall wants to be smooth, even, and chemically quiet. No single material bridges that gap well in one pass, so British practice splits the job into links, and each link earns its place by being the cheapest honest way to do one thing. The undercoat, where the background demands it, evens the suction and the surface so the later coats behave identically everywhere [3][5]. The skim provides the smoothness, because a few millimetres of fine gypsum can be trowelled to a paint-ready face that centimetres of coarse undercoat never could. The mist coat stabilises the skim's porosity so the emulsion adheres evenly instead of being drunk unevenly into the fresh plaster [1][6]. The emulsion, finally, is the only link the occupant consciously sees, which is precisely why it is the link that takes the blame for the failures of the links beneath it.

## The honest variable: why the chain says "undercoat where required"

The phrase "where required" is the most important three words in the chain, and the overview owes them a full paragraph. British backgrounds vary enormously in how much water they drink. Medium-density and lightweight blockwork, and absorbent brickwork, pull water fast from a fresh plaster, which can weaken the bond and burn the mix before it has set; for these, a properly specified undercoat matched to the suction is not optional luxury but the difference between a wall that lasts and a wall that delaminates [3][5]. Smoother, lower-suction backgrounds can sometimes take a suitable finishing plaster or a designed one-coat material directly, with a bonding agent controlling the surface instead [3][5]. The specification tables in the manufacturers' system documents, not habit, are what decide "where required", and the reader who learns to read those tables by their background rather than by their postcode has understood the chain's whole governing logic [5].

## The standards and the system documents, the chain's referees

The chain's rules live in two kinds of literature, and the overview should name both honestly. British and European standards, including the workmanship expectations referenced in the UK building standards handbooks, set the general level of care: backgrounds prepared, coats applied to the thicknesses and sequences specified, materials mixed and used within their working times [7]. The manufacturers' system documents then translate that care into named products and exact sequences, and in British plastering the manufacturer's system document carries decisive weight, because the products are engineered and tested as systems rather than as interchangeable powders [1][2][5]. The reader who wants one sentence of governance for the whole chain can keep this one: follow the system document, and where the system document and the job site disagree, stop and ask the manufacturer rather than improvising.

## How the chain meets the occupant, and what it asks of them

The chain does not end when the decorator packs up, because the skim keeps drying for a long time after it looks finished, and the first year of a plastered wall is a drying year. The system documents ask that plasters be thoroughly dry before decoration, while allowing that a permeable paint can go on in the interim, and this single honest sentence governs a whole family of timing decisions [1]. A mist coat that goes on too early is trapped moisture rather than sealed porosity; emulsion that follows it in a rush can bubble, peel, or shadow with the drying's own map. The overview's advice to the reader is the advice the trade gives itself: give the skim the drying time the season and the room allow, ventilate without blasting the wall with draughts, and treat the first decoration as the wall's first birthday rather than its christening.

## What the overview leaves to the other four articles

The overview closes by handing the reader to the rest of the series with its own map. The materials article tells the shelf apart: the undercoats and their backgrounds, the finishing plasters, the beads and bonding agents, the primers and emulsions, and the tools that keep them honest [3][5][6]. The installation article walks the working day itself, from suction control and the first undercoat rule to the skim's trowelling stages and the mist coat's dilution [2][4][6]. The quality article watches the chain with a straight eye: the checks that catch a failing background before it is plastered over, and the lighting that exposes a skim's honesty [7]. The maintenance article follows the chain across the years, when hairlines appear and repainting comes due, and when to repair a patch and when to ask why it failed. Together they keep the promise this overview opened with: the chain read as one sentence, but kept, as the trade keeps it, as a discipline.

## The chain in the building's wider story

The chain sits inside a larger British story the overview should acknowledge, because the reader who understands where the chain came from will respect its links more readily. Solid plastering over masonry is the older tradition; the factory-made gypsum plasters that dominate the modern shelf were the twentieth century's gift to the trade, bringing predictable set times and a whiteness that made the mist coat and emulsion acts possible at scale. The building standards handbooks that govern modern work cite the workmanship codes of the BS 8000 series for exactly the craftsmanship this chain demands [7]. What has not changed is the chain's engineering logic: preparation, suction, structure, seal, and decoration, in that order, whatever the era of the bags.

## The reader's three questions, asked and answered

Three questions cover most of what a reader meeting this chain for the first time wants to know, and the overview answers them directly. First, why not plasterboard everywhere: because masonry backgrounds are everywhere in British building, because direct plastering is robust and fire-resisting, and because the chain finishes the walls the structure already provides [5]. Second, why the chain has so many coats: because each coat has one engineering job, and stacking the jobs in separate layers is what makes each layer cheap, reliable, and repairable [2][5]. Third, whether the order can be hurried: it cannot, because the chain's chemistry and drying set its own calendar, and the peeling, crazing, and shadowing that follow impatience are the chain's way of keeping the record [1]. The rest of the series is these three answers, expanded into the working week and the owning decade.

## The chain's cousins, and where each belongs

The overview owes the reader a short map of the chain's neighbours, because the British interior shelf holds more than one tradition. Plasterboard drylining, whether screwed to timber studs or dabbed to masonry, trades a little of direct plastering's robustness for speed and board finish, and its own series article covers that world; the chain this series follows stays on the masonry background and its plasters. Textured and render-finish interior traditions, mostly historical in British housing, belong to other stories. What the reader should keep from the comparison is the decision logic: the background that exists, the room the wall must serve, and the system documents that translate both into materials, are the same three inputs whichever chain is chosen, and the overview's map is honest enough to show the borders as well as the territory [5][7].

## The economic honesty of the chain

An overview that never mentions money insults its reader, so this one states the chain's economics plainly. Direct plastering over masonry is not the cheapest wall by material cost, and it is not the fastest by labour hour, but it earns its keep in the decades: a well-specified skim, sealed and decorated properly, is a durable, fire-resisting, repairable surface whose maintenance costs are the lowest of the serious options, because its repairs are local, its materials are universal, and its craft is still practised in every British town [5][7]. The chain's honest economy is therefore a whole-life economy, and the reader choosing between finishes should price the wall across its maintenance life rather than across its installation week. The rest of this series is, in one sense, a manual for collecting that whole-life saving: every gate honoured and every timing respected is money the chain will not need to spend again.

## A closing orientation, the map folded small

The overview folds the whole series into a final orientation the reader can carry. The chain has five links, background, undercoat where required, skim, mist coat, emulsion, and one law: each link does one job, in sequence, to the specification [1][5][6]. The chain's governance lives in two literatures, the standards that set the workmanship expectations and the manufacturers' system documents that name the materials and their sequences, and the two are read together rather than in competition [5][7]. The chain's calendar is chemical, not contractual, and the drying of the skim is the season the whole decoration respects [1]. Hold the map this way, and the four articles that follow are not new information but the same map at walking scale.

## The wall the occupant inherits, the overview's last honest sentence

The overview's final paragraph belongs to the occupant, because every wall in this series will eventually belong to one. What the occupant inherits from a properly kept chain is a surface that is smooth because the skim was ruled, even because the undercoat was flattened, durable because the bond was engineered against suction, and beautiful because the sealing and decoration respected the drying that governed them all [1][5]. The rooms this series is written for are ordinary British rooms, in ordinary streets, finished by the chain this overview has mapped, and the overview's last honest sentence is the trade's own: the chain is common, but the keeping of it never is.

## References

1. British Gypsum, *Thistle Finishing Plaster, product data sheet*.
2. British Gypsum, *Installation Guidance: Thistle Finishing Plaster*.
3. British Gypsum, *Thistle Plasters Residential Brochure* (incl. Thistle Bond-It).
4. British Gypsum, *Installation Guidance: Thistle Undercoat Plaster*.
5. British Gypsum, *Thistle Plaster Systems, White Book specification selector PL0029*.
6. Dulux Trade, *Plaster Primer (moisture tolerant) product data*.
7. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a plasterer at work on a wall in Ruthun, Wales, photographed by John Thomas and released by the National Library of Wales into the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle1$, 'overview', 8, 'https://upload.wikimedia.org/wikipedia/commons/2/24/Plasterer%2C_Rhuthun_NLW3362661.jpg')
, ('gb-interior-block-skim-paint-materials', 'Materials for UK Skim and Emulsion Chains', 'A British materials guide to the interior finish chain: undercoat plasters matched to suction, finishing plasters, beads and bonding agents, mist coats and primers, emulsions, and the tools that keep the chain honest.', $wallarticle2$# Materials for UK Skim and Emulsion Chains

## Reading the plaster aisle by its backgrounds

The British plaster aisle is organised, once the reader learns its logic, by the background rather than by the bag. Undercoat plasters exist because backgrounds differ, and the honest way to shop them is to take the wall's name along. For most masonry backgrounds, including brickwork and medium-density and aircrete blockwork, the matched undercoats are the workhorses, engineered to grip absorbent surfaces and to take the finishing coat on schedule [3][5]. For smoother, lower-suction backgrounds, different undercoats and bonding control do the work, and the system documents are explicit about which product belongs where [3][5]. The reader who buys by brand loyalty instead of by background is buying the chain's most common failure, because the shelf's differences are engineering, not marketing.

## The finishing plaster, the face the room will judge

The finishing plaster is the chain's visible promise, and the shelf's most popular bags are the multifinish family, designed as the final skim over the undercoats and plasterboard alike [2][5]. Its working behaviour, the set time that gives a working window, the trowel-finish quality, the whiteness that takes colour honestly, is what the whole chain exists to deliver, and the product data sheets are refreshingly direct about the working rules: the mixing water is measured, the mix is made by adding plaster to water and not water to plaster, and the working time is treated as the limit it is [2]. The materials article's honest advice is to buy the finishing plaster the system specifies, in the quantity the area and the thickness actually need, and to refuse the romantic idea that plastering skill can rescue a mis-specified or half-set bag.

## Bonding agents, beads, and the small honest parts

Two small shelves complete the plaster side of the aisle. Bonding agents exist for the backgrounds that would otherwise drink the skim's water away or refuse it adhesion altogether, and the manufacturer's guidance is the governing voice on where they are needed and how they are applied [3][5]. Beads, the thin metal or plastic sections that form and protect angles and reveals, are the chain's geometry made physical, and a wall's corners are only as honest as its beads are straight. Both shelves reward the same habit: buy the part the system names, fix it to the line rather than to the hope, and let the small parts do the quiet work the skim will later take the credit for.

## The paint side of the aisle: mist coats, primers, and emulsions

Across the aisle, the paint shelf holds the chain's second act. The mist coat, a thinned first application of a suitable emulsion or a dedicated plaster primer, exists to seal the skim's porosity evenly, and the manufacturers' guidance governs both its dilution and its timing [1][6]. Trade primers engineered for new plaster are documented for exactly this use, and their data sheets should be read as the chain's contract between plaster and decoration [6]. The emulsions themselves then divide by sheen and duty, from the flat matt that flatters imperfect light to the silk that shrugs off kitchen steam, and the honest selector asks each room what it does to its walls before asking what colour it wants them. The one purchase the article will name as a mistake is the economy of skipping the sealing coat, because the peeled patches that follow are the chain's most preventable and most public failure [1][6].

## Tools: the honest list, not the full catalogue

The tool shelf is short when written honestly. A hawk and a trowel, clean water, a mixing bucket and a paddle, a straightedge for the undercoat's rule, a spirit level, a corner tool for the beads, a dust sheet, and on the paint side a roller with the right sleeve, a brush for cutting in, and a mixing stick for the mist coat [2][4]. The tools that matter are the clean ones: plaster transfers contamination without forgiving it, and the bucket that carried yesterday's half-set mix is the beginning of today's pinholes. The materials article closes where the aisle closes, with the reminder that the chain's materials are engineered as a system, and that the most expensive item on any shelf is the one used for the wrong purpose [5].

## Quantities, storage, and the honest arithmetic of a bag

The materials article owes the reader the arithmetic that prevents both shortage and waste, and the honest arithmetic starts with the coverage figures the manufacturers publish rather than with the merchant's guess. A finishing plaster's data sheet states its mixing water and its working time, and from the area, the specified thickness, and the coverage per bag the shelf list is written to the job rather than to the rumour [2][4]. Storage is part of the specification too: plasters kept dry, off the floor, in their sealed bags, and used within the shelf life the manufacturer states, because a plaster that has taken damp from the shed sets in the bag rather than on the wall. The paint side of the aisle has its own arithmetic: the emulsion's spreading rate on the can is the honest basis for litres per coat, and the mist coat's dilution is calculated from the same rate rather than poured by feel [6].

## The specification habit, and the shelf that rewards it

The materials article closes by teaching the habit that governs the whole shelf: reading the specification before buying the bag. The system documents map every background to its matched materials, and the reader who takes the wall's description to the document comes away with named products, sequence, and thickness instead of a hopeful assortment [5]. The habit extends to the small parts: the bead chosen for the angle it will actually form, the bonding agent used where the document puts it and nowhere else, and the primer chosen for new plaster because its data sheet says so in words [3][6]. The shelf, read this way, stops being a wall of near-identical bags and becomes what it actually is: a filing cabinet of engineered answers, waiting for the question to be asked correctly.

## The emulsion shelf, read by duty

The paint aisle rewards the same background-first reading as the plaster aisle, and the article teaches it with the room's duties. Vinyl matt remains the default British interior face because it flatters the skim's minor truths and takes repainting generously; silk endures the steam of kitchens and the handprints of halls; kitchen and bathroom grades answer wet rooms directly; and contract matt, thin and porous, is the mist coat's own classic material precisely because it soaks in and seals without forming a skin that later coats would have to fight [6]. The article's honest warning is against the economy that skips from skim straight to a heavy vinyl topcoat: the manufacturer's data sheets for new-plaster primers exist because fresh plaster's porosity is a documented engineering condition, not a nuisance, and the chain's paint side is engineered to meet it [1][6].

## The small shelf, read honestly

The chain's small consumables deserve their honest paragraph before the article closes. Sandpaper and abrasives in fine grades, for the between-coat flattening that decoration standards expect; filler for the decorator's minor making good, distinct from plaster because its chemistry and duty are different; masking tapes and protection sheets, because the chain's quality includes the joinery that shares the wall's edge; and sugar soap or its modern equivalents, because maintenance repainting begins with cleaning and not with paint [6]. The tools of cleanliness are the last items on the list because they are the first items used: the dust sheet, the clean water, and the wiped trowel are the chain's smallest materials and its most consistent teachers.

## What the shelf cannot sell, the article's honest close

The materials article closes with the honest inventory of what no shelf in the trade supplies. The shelf cannot sell suction control by the bag; it sells the materials, and the background reading that matches them remains a craft the buyer brings or hires [3][5]. It cannot sell timing; the working time and the drying days are the materials' own chemistry, and the shelf only states them honestly on its data sheets for the buyer who reads [1][2]. And it cannot sell the clean bucket, the straight bead, or the patient trowel; it sells the tools that make those virtues possible, and the virtues themselves remain the trade's. The reader who leaves this article knowing which questions to ask of each bag, which background to name to each system document, and which parts of the chain no purchase can shortcut, has taken everything the shelf has to give and nothing it cannot [5][6].

## Sourcing, delivery, and the merchant conversation

The materials article adds one further practical shelf: the builder's merchant, where the chain's materials are actually bought and where the honest buyer arrives prepared. The conversation that protects the chain is short: the background named, the system named, the products the system names, and the coverage arithmetic done before the counter [2][5]. Delivery is inspected as part of specification: bags sound and dry, batches matched where the whiteness matters, primers and emulsions dated within their shelf lives, and everything stored off the floor and out of the weather's reach [6]. The merchant who hears the background named is a merchant who cannot sell the wrong bag by accident, and the buyer who reads the data sheets is a buyer the shelf cannot surprise; between those two honesties, most of the chain's material failures are retired before they are purchased [3][5].

## The mixing water, the chain's quietest material

The materials article's last aisle item is the one no one buys: the water, which appears in every system document's mixing instructions and earns a paragraph precisely because it is free. The manufacturers state the water per bag because the plaster's set and strength are engineered to that water, and the honest mixer measures it, keeps it clean, and resists the improvisations that a hot day suggests [2][4]. The water is also the chain's diagnostic: the background that drinks it too fast, the bucket that carries yesterday's set in it, and the room whose weather is changing the mix's behaviour in the trowel, all announce themselves in and around the water before they announce themselves on the wall. The materials list is honest to the end: the cheapest item on it is the one whose discipline the whole chain borrows.

## References

1. British Gypsum, *Thistle Finishing Plaster, product data sheet*.
2. British Gypsum, *Installation Guidance: Thistle Finishing Plaster*.
3. British Gypsum, *Thistle Plasters Residential Brochure* (incl. Thistle Bond-It).
4. British Gypsum, *Installation Guidance: Thistle Undercoat Plaster*.
5. British Gypsum, *Thistle Plaster Systems, White Book specification selector PL0029*.
6. Dulux Trade, *Plaster Primer (moisture tolerant) product data*.

## Image credit

The cover photograph shows plasterers mixing plaster on a board, a historical photograph from the Wellcome Collection made available under CC BY 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle2$, 'materials', 8, 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/One_man_is_mixing_plaster_on_a_board_on_the_floor_and_anothe_Wellcome_V0039549.jpg/1280px-One_man_is_mixing_plaster_on_a_board_on_the_floor_and_anothe_Wellcome_V0039549.jpg')
, ('gb-interior-block-skim-paint-installation', 'Skimming and Painting UK Block Walls: Installation', 'A British installation guide for the interior chain: preparing the background, controlling suction, applying the undercoat to the rule, skimming in trowel stages, drying, mist coating, and finishing with emulsion.', $wallarticle3$# Skimming and Painting UK Block Walls: Installation

## Preparing the background, the chain's first hour

The working day begins with the background, because everything the chain later does depends on the wall's condition and suction. The background must be clean: dust, snots, grease, and old residues are removed, and any damaged or hollow areas are cut back and made good before any new material arrives [4][5]. Suction is then assessed honestly against the system documents, and controlled rather than ignored: highly absorbent backgrounds are treated as the system specifies, whether by wetting, by a bonding agent applied as directed, or by the selection of an undercoat engineered for the purpose [3][5]. Service holes and junctions are addressed now, not later, because a wall plastered over an unfinished service chase is a wall that will be reopened with a hammer in front of the decorator.

## The undercoat, ruled and unhurried

Where the chain's specification calls for an undercoat, the undercoat is applied to the rule rather than to the eye: mixed to the manufacturer's water, laid to the specified thickness, and levelled with a straightedge so the wall's plane is established in the coarse coat where it is cheap to establish [4][5]. The undercoat's surface is then keyed or scratched as the system requires, to give the finishing coat its mechanical grip, and the timing between coats is treated as the specification states it rather than as the day's convenience dictates [2][5]. The installation article's honest rule for the undercoat is the trade's own: flat first, because the skim can hide the undercoat's colour but never its hollows.

## The skim, in trowel stages

The finishing plaster is mixed by adding plaster to clean water, in the quantities the product data states, and used within its working time without resurrection [2]. The skim goes on in thin coats, built to the fine thickness the system specifies, and the trowelling is done in stages as the set progresses: laying on, flattening, and then the final passes that bring the surface to its paint-ready polish, with the timing read from the plaster itself, glossy then matte then ready, rather than from the clock [2][5]. The two hours of a skim are the chain's most skilled, and the article will not pretend they can be taught in a paragraph; what can be taught is the respect for the sequence, the water, and the timing that separates the trade from the optimistic amateur, and the good sense to watch the skim's behaviour and adjust to the room's temperature and suction as the system documents instruct [2][5].

## Drying, the quiet stage nobody photographs

The skim then dries, and the drying is a stage of the work, not an absence of work. The system documents are direct: plasters must be thoroughly dry before decoration, though a permeable paint can be applied in the interim [1]. Drying time depends on thickness, background, temperature, and ventilation, and the honest installer plans it rather than gambling it: steady ventilation without concentrated draughts, no frozen or artificially scorched walls, and no decoration of a wall whose colour still maps its damp. The chain's most expensive peeling starts exactly here, in the impatience between a skim that looks dry and a wall that is [1][6].

## The mist coat, and the emulsion that follows

On the dry skim, the sealing coat goes on: a thinned emulsion or the documented plaster primer, mixed as the manufacturer states and cut in with the same care as any finish coat [1][6]. The mist coat's purpose is porosity, not colour, and its even, thin application is what lets the full coats follow without patchy sheen. The emulsion then completes the chain: full coats at the spreading rate the paint's own data states, edges cut in while the roller keeps the wet edge company, and the room's colour applied to a wall whose every layer beneath has been treated as the system specified. The installation article closes with the trade's summary of the whole day: the chain rewards sequence and punishes shortcuts, in that exact order.

## The working day's quiet hazards, named

The installation sequence has hazards that never appear on a method statement but appear on every wall that ignores them, and the article names the three the trade respects most. Temperature and draughts: a skim that sets too fast in a hot, dry room crazes, and one that sets too slowly in a cold one stays wet past the day's patience, so the room's conditions are managed as deliberately as the mixing water [2]. Contamination: the bucket, the water, and the paddle that carry a half-set residue plant pinholes in the next mix, so cleanliness is procedural rather than aesthetic. Overworking: the trowel pass made after the plaster has begun to set drags rather than polishes, and the trade's discipline is to read the set and stop on time, because the surface's gloss is earned by the plaster's chemistry and not by persistence [2][5].

## The paint day, sequenced like the plaster day

The decorator's day deserves the same sequencing respect as the plasterer's, because the chain's second act fails by the same laws. The room is cleared and sheeted, the dry skim is brushed free of dust, and the mist coat is mixed to the manufacturer's stated dilution and applied as a thin, even sealer rather than as a first attempt at colour [1][6]. The full emulsion coats then follow at the spreading rate the can states, with edges cut in and rolled fields kept wet-edged so the laps dry invisibly [6]. The honest decorator gives each coat the drying the can specifies before judging it, and resists the temptation to touch a coat that is still levelling. The chain's two days, plaster and paint, are really one discipline with two sets of materials, and the article's sequence teaches both halves of it.

## Suction control in practice, the day's first engineering

The installation article gives suction control its own working description because it is the day's first engineering decision and the one most often faked. The background is assessed: a splash of clean water on the dry wall shows the drinker, and the system documents name the treatment the drinker needs, from wetting to a bonding agent applied as directed to an undercoat selected for its grip [3][5]. The bonding agent is applied to the manufacturer's instructions: undiluted where the document says undiluted, at the coverage it states, and allowed the drying it specifies before the plaster follows over it [3]. What the honest installer refuses is the folk practice of universal dilute PVA by guesswork, not because the chemistry is never right but because the system's tested instruction is always more honest than the site's habit [3][5].

## Openings, beads, and the geometry before the gloss

Before the skim's first trowel, the wall's geometry is fixed, and the sequence teaches this honestly. Beads are set to level and line at reveals, corners, and skirting junctions, because the skim will follow the bead and the eye will follow the skim; a bead set by hope is a corner that no paint will forgive [5]. Internal angles are gauged, and the wall's high and low points are found with the straightedge while they are still cheap to correct in the undercoat [4][5]. Services and termination points, sockets, switches, and the plaster's stopping lines at ceilings and floors, are agreed before the first mix. The sequence's law is that the skim inherits the geometry, so the geometry is finished first; the installation article's working day spends its first hours on what the last hours will be seen by.

## The handover to the decorator, a contract of dryness

The installation article's last sequence is the handover between its own two halves, because the plaster day and the paint day are two crews or two seasons, and the wall between them is a contract. The skim is delivered sound: clean, trowel-finished, uncrazed, and then given the drying the system requires before decoration, with the permeable interim paint permitted but the full finish still waiting on true dryness [1][5]. The decorator receives the wall with its record: the products used, the dates, and the suction treatments, because the mist coat inherits them all [3][6]. The paint day then runs as its own sequence, mist coat thinned as stated, full coats at the can's rate, and the wall's colour applied to a surface every layer of which was allowed its own time [6]. The chain's two days meet at the contract of dryness, and the honest installer and the honest decorator both sign it.

## Weather, seasons, and the room as a climate

The installation sequence treats the room as a climate because the materials do. Winter work: the room is kept from frost, both while the plasters set and while they dry, because a frozen wall is a wall whose chemistry was suspended and whose surface will confess the interruption [5]. Summer work: the hot, dry room that flashes a skim's water away is calmed, by shading, by dampened backgrounds where the system permits, and by the honest decision to mix smaller and work faster within the plaster's own time [2]. Ventilation is the season's partner in every direction: enough to carry the drying's moisture, never so much that the wall is scorched by a draught's highway. The installation article's honest summary of all this is one sentence the trade keeps: the plaster does not care about the calendar on the wall, only the weather in the room, and the sequence is written to the weather the room actually has.

## Beads and trims, the geometry under the surface

The installation sequence returns once more to the beads, because they are the wall's geometry made metal and the sequence's last chance to place them properly. Skimming beads are fixed plumb, level, and to the line the room's finish will demand, at reveals, arrises, and the junctions the system documents name, and the skim is brought onto and over them so the finished arris is the bead's edge rather than the plasterer's nerve [5]. The sequence's honest note is that beads are geometry, not decoration: the corner that will take the vacuum cleaner's decade of small collisions is built in this quiet hour of fixing, and the wall that skips it spends the maintenance years apologising at every corner. The installation day ends with the beads proven, the surface ruled, and the wall's shape finally a fact rather than an intention.

## References

1. British Gypsum, *Thistle Finishing Plaster, product data sheet*.
2. British Gypsum, *Installation Guidance: Thistle Finishing Plaster*.
3. British Gypsum, *Thistle Plasters Residential Brochure* (incl. Thistle Bond-It).
4. British Gypsum, *Installation Guidance: Thistle Undercoat Plaster*.
5. British Gypsum, *Thistle Plaster Systems, White Book specification selector PL0029*.
6. Dulux Trade, *Plaster Primer (moisture tolerant) product data*.

## Image credit

The cover photograph shows a skim coat being applied to a wall, taken by the Oregon Department of Transportation and made available under CC BY 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle3$, 'installation', 9, 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/SkimCoatApplication_%2843376691030%29.jpg/1280px-SkimCoatApplication_%2843376691030%29.jpg')
, ('gb-interior-block-skim-paint-quality-checks', 'UK Skim and Emulsion Quality Control', 'A British quality program for the interior chain: checking the background before it disappears, the undercoat''s rule, the skim''s surface honesty, the mist coat''s adhesion, and the finished wall under honest light.', $wallarticle4$# UK Skim and Emulsion Quality Control

## The gate that matters most, before the first bag opens

The quality program for the interior chain begins where the failures begin: the background, inspected before anything covers it. The honest check is short but stubborn. Is the wall clean and free of the dust and residues that break bond? Are hollows, cracks, and damaged arrises made good, and are junctions and services resolved so no one will reopen the wall later [4][5]? Is the suction understood, and matched to the materials actually on the shelf, rather than assumed from the last job [3][5]? A background that fails this gate is cheap to fix and expensive to plaster over, and the program's first rule is that no bag is opened until these answers are yes.

## Watching the undercoat, the coat that sets the plane

Once the undercoat is on, the checks are geometric and procedural. The wall's plane is read with the straightedge and level, because the skim can follow a flawed plane but cannot repair it [4][5]. Thickness is honest where the specification's numbers are met, not exceeded by enthusiasm or thinned by economy. The key for the finishing coat is present, uniform, and not polished over. And the timing to the skim is treated as the system states it, because the bond between coats is a chemical appointment rather than a scheduling preference [2][5]. The program records what was checked and what was found, because the skim will soon hide the evidence and the record is what keeps the memory honest.

## The skim's surface, judged in the right light

A skimmed wall tells the truth only under the right interrogation, and the quality program uses both instruments the trade uses: touch and raking light. The hand finds the trowel marks, pinholes, and drag that the eye forgives; the lamp held close and low along the surface finds the hollows and the bumps the daylight flattens. Crazing, the fine map of a skim that dried too fast or was worked past its time, is read as a symptom of process rather than as bad luck, and its causes are traced back through the mixing, the room's conditions, and the timing before any repair is attempted [2][5]. The surface's whiteness and even suction matter too, because they are what the mist coat and emulsion will inherit: the program checks that the surface is uniformly dry and uniformly porous before the paint side of the chain is allowed to begin [1].

## The sealing coat's proof, and the paint's verdict

The mist coat is the chain's least glamorous coat and its most telling test. Applied to a properly dry skim, thinned or primed as the manufacturer documents, it should penetrate and seal evenly, dry without lifting, and take the first full coat of emulsion without protest [1][6]. The quality program's checks here are adhesion and evenness: no peeling at edges, no glossy patches where the dilution drifted, no bands where the roller's laps dried into the record [6]. The finished emulsion is then judged as the room will judge it, in daylight from its own windows and in the evening under the lamps the occupant actually uses, because the wall's colour and sheen live in the light the room keeps, and the quality article's honest last word is that the chain is finished when the room says so, not when the roller is washed.

## The gates in the chain's calendar

The quality program sets its gates where the chain's chemistry sets its appointments, and the article lists them in the order the work passes them. Gate one, the background inspection, closes before the first mix [4][5]. Gate two, the undercoat's plane and key, closes before the skim is booked [4][5]. Gate three, the skim's surface and dryness, closes before any paint is opened, and it is the gate that most often gets rushed, which is why the system documents state the drying requirement in words the program copies into its own records [1]. Gate four, the mist coat's adhesion and evenness, closes before the full coats begin [1][6]. Gate five, the finished wall under the room's own light, closes the chain and opens the occupancy. Each gate is a short inspection with a written answer, and the program's discipline is that no gate is passed on the promise of the next.

## Records, samples, and the quiet authority of a photograph

The quality program keeps three records the maintenance decade will be glad of. The specification record: which products, from which system, applied to which backgrounds, because the future's patch repairs begin as paperwork [5]. The observation record: what each gate found, including the defects accepted and the reasons, because a wall's honest history prevents tomorrow's misdiagnosis. And the photographic record: the wall at each gate, in flat light, from fixed positions, because the camera catches what the eye forgives and dates what the memory smooths. None of this is bureaucracy for its own sake; it is the chain's quality made durable, and it costs minutes at the moments when minutes are cheapest [7].

## The workmanship standard, read as the inspector's brief

The quality article's programme needs a standard to inspect against, and the British workmanship codes, cited by the building standards handbooks, are that standard's spine: preparation complete, materials as specified, coats to the specified sequence and thickness, and work protected while it cures [7]. The programme translates this into the inspector's brief: the specification is read before the wall is, the system document is on the table when the gate is walked [5], and the inspection's questions are the specification's questions asked of the wall in person. The inspector's honest position is that they are the chain's advocate, not its adversary: a gate found failed is work saved, and a gate passed honestly is the day's cheapest insurance for the decade that follows.

## The three failures that teach the most, described honestly

The quality article closes by describing the chain's three classic failures, because a programme that knows them recognises them early. The first is the peeling topcoat, whose cause is almost never the emulsion and almost always the skipped or mistimed sealing of a skim that was not truly dry [1][6]. The second is the crazed skim, whose fine map records a drying too fast, a working past the set, or a suction left uncontrolled at the source [2][5]. The third is the hollow patch, the area that sounds different when tapped because the bond at its boundary was never made, and whose lesson runs back through suction, timing, and cleanliness to the background gate the programme opened with [4][5]. Each failure is the chain's memory of a skipped step, and the programme that reads them this way converts them from blame into maintenance intelligence.

## Lighting, the inspector's only trick, explained

One paragraph of the quality programme deserves to teach its central instrument properly: the light. Plaster and paint both belong to the family of surfaces whose honesty is directional, because a skim's hollow and a topcoat's lap both hide under flat ambient light and confess under a low, raking source, and the professional inspection deliberately changes the light rather than trusting the room's. The programme's practice is three looks: daylight from the room's own windows, a close lamp moved slowly along and across the wall, and the evening lamps the occupant will actually live with, because each look finds a different family of truths and the wall must satisfy them all [1][6]. The inspection that uses only one light inspects only one wall, and the programme's records note the light used, because a defect found by lamp and invisible by day is still a defect the occupant will eventually meet at night. The quality article's teaching on lighting is therefore not a trick but an honesty: the wall is judged under every light the room will own, or the judgment flatters the wall and fails the occupant.

## The sample panel and the first wall, read together

The programme's practice for a multi-wall job is the sample panel, a representative area plastered and decorated first, and then read as the specification made flesh [5]. The panel shows the skim's surface quality under the room's light, the mist coat's sheen, and the emulsion's true colour over the sealed skim, and the programme's gate is that the panel is accepted in writing before the rest of the wall follows [6]. The panel also teaches the crew: the suction met on the real background, the timing the real room imposes, and the finish the real specification produces, so that the first wall of the production run begins as the panel's student rather than as its gamble. The honest programme treats the panel as cheap insurance, because every wall that follows it is a wall that cannot blame the specification for surprising anyone [1][7].

## The acceptance walk, written as a script

The programme's final gate deserves its script, because a good inspection is a rehearsal rather than a wander. The acceptance walk runs the wall's full perimeter in daylight, lamp in hand, record in the other: touch for trowel marks and pinholes, raking light for hollows and crazing, straightedge where the plane matters, and the mist coat's adhesion checked at the edges that peeling prefers [1][2]. The paint's verdict is read in the room's own evening light, the colour and sheen judged on the wall the occupant will actually own [6]. The script ends with the file: findings written, defects assigned and dated, and the wall handed over with its history attached, because the acceptance walk is not the end of the chain but the beginning of its record [7].

## When the programme stops work, and why that is a kindness

A quality programme earns its keep on the days it stops the work, and the article closes by saying so plainly. The gate that fails, the background still drinking, the undercoat still hollow, the skim still wet when the decorator's van arrives, is not a crisis but the system working: the stopped hour is the cheapest hour in the chain, and the plastered-over defect is the most expensive, and the programme exists to spend the first instead of the second [1][5]. The trade's culture supports the stoppage when the specification is on the table, because the standards the programme inspects to are the same standards the trade works to [7]. The article's last word is the one every experienced plasterer gives the apprentice for free: the wall keeps every shortcut, so keep none.

## References

1. British Gypsum, *Thistle Finishing Plaster, product data sheet*.
2. British Gypsum, *Installation Guidance: Thistle Finishing Plaster*.
3. British Gypsum, *Thistle Plasters Residential Brochure* (incl. Thistle Bond-It).
4. British Gypsum, *Installation Guidance: Thistle Undercoat Plaster*.
5. British Gypsum, *Thistle Plaster Systems, White Book specification selector PL0029*.
6. Dulux Trade, *Plaster Primer (moisture tolerant) product data*.
7. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a plasterer at work, taken for the Rijksdienst voor het Cultureel Erfgoed by photographer G.Th. Delemarre in Velsen and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle4$, 'quality', 8, 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Stucadoor_in_actie_-_Velsen_-_20240473_-_RCE.jpg/1280px-Stucadoor_in_actie_-_Velsen_-_20240473_-_RCE.jpg')
, ('gb-interior-block-skim-paint-maintenance-repair', 'UK Skimmed Walls: Maintenance and Repair', 'A British maintenance guide for skimmed and emulsioned walls: the first year''s hairlines, patch repairs that match, stain honesty, repaint cycles, and the rooms that ask more of their walls.', $wallarticle5$# UK Skimmed Walls: Maintenance and Repair

## The first year, read as drying

The maintenance of a skimmed wall begins in its first year, because a young plaster is still losing water and the building around it is still settling into its seasons. Fine hairline cracks that appear at junctions, corners, and over structural movement are the wall's first honest report, and the maintenance article's first discipline is triage: a hairline at a bead or a board joint is usually shrinkage and is filled and repainted; a crack that widens, or a family of cracks that maps the structure, is referred rather than decorated over. The temptation of the first year is to blame the plasterer for every line, and the honest habit is to read the line first and assign the blame second.

## Patch repairs, matched honestly

A skimmed wall earns its maintenance reputation from patches, and patches reward patience. The damaged area is cut back to sound plaster with a tidy boundary, the edge is flatted so the patch can feather rather than step, and the same finishing plaster, mixed as its data sheet directs, is laid on thin and trowelled in the same stages as the original [2][5]. Suction at the patch boundary is controlled so the new skim does not burn against the old, and where the background is exposed by the damage the same background questions are asked again before the new plaster is allowed to forget them [3][5]. The patch is then sealed with the same logic the wall was: a mist coat or primer on the dry patch, then emulsion brought out from the wall to blend, with the honest admission that perfect colour matching over new plaster is a staged negotiation with time rather than a promise [1][6].

## Stains and marks, the honest separation

Stains ask for diagnosis before treatment, because the maintenance habit that damages most walls is the cosmetic reflex. A water stain with a drying edge is a plumbing or rainwater problem wearing a decorator's question, and the wall will not keep the secret: the source is found and fixed, the plaster dried, and only then is the stain sealed and repainted, because paint over an active leak is a diary the wall keeps in public [1]. A scuff or a greasy mark from daily life, by contrast, is exactly what the chain's modern emulsions are designed to take, and mild cleaning and spot repainting are the honest answers. The article's separation rule is simple: if the mark is the wall's, clean or repaint it; if the mark is water's or damp's, stop and find the source first.

## Repainting, the chain's renewable act

Repainting is the maintenance the chain expects and the easiest to do well. A sound skimmed wall takes its next emulsions after light washing and any localized filling, and the sheen chosen for the repainted room is the room's own maintenance decision: matt hides and flatters, silk endures the kitchen and the hallway, and each repaint is a chance to change the wall's duty as well as its colour [6]. The article's practical guidance is to repaint before the substrate's scars show through the thinning coat, to keep a record of the colours and products used, and to treat the paint shelf's own data sheets as the maintenance manual they are.

## When to call the trade back

The maintenance article closes with the honest boundaries of the do-it-yourself hand. A hairline filled badly is a cosmetic failure; a ceiling skim that sags, a patch that will not bond, a damp line that returns after every repaint, or a crack that moves between visits, are structural or systemic questions that the plastering trade and the building's other specialists should answer [5][7]. The chain this series has followed rewards stewardship exactly as it rewards good workmanship, and the wall that is read honestly across its years repays the reading with decades of quiet service.

## The annual walk, and what it looks for

The maintenance article gives the wall a calendar, and the calendar's spine is the annual walk: a slow circuit of the rooms, in daylight, with a pencil. The walk looks for the wall's honest signals, and the pencil marks them for the file: hairlines that have appeared, stains that have changed, patches whose sheen has drifted from the field, and the corners where furniture and life have left their scuffs. The walk also looks at the wall's enemies where they live: the gutters and downpipes outside that can feed a stain inside, the plumbing runs above the ceilings, and the ventilation of the wet rooms whose steam the emulsion is asked to endure. Ten honest minutes a year, written down, is the entire difference between a wall maintained and a wall merely repainted [7].

## Repairing the repair, the honest second attempt

Some of the maintenance decade's work is the repair of earlier repairs, and the article faces this directly. The over-thick patch that now shines, the filled crack that has re-opened because the movement was structural, the mist coat that was skipped on one wall of the room and now peels in one corner: each is a documentary failure as much as a material one, and the honest second attempt begins by reading the first attempt's evidence before disturbing it. The repair of a repair follows the chain in miniature: cut back to sound material, match the system's products, control the suction at the boundary, seal before painting, and blend with the record rather than the memory [2][5][6]. Done this way, the second attempt is usually the last, which is the quietest definition of maintenance quality the article can offer.

## The wet rooms, where the chain works hardest

The maintenance article devotes its hardest paragraph to kitchens and bathrooms, because those rooms ask the interior chain to stand outdoors-level duty. Steam, splash, and cleaning are constant, and the honest maintenance answer begins at specification: water-resisting paint systems and the sheens that shrug, applied over the sealed skim the chain requires, with ventilation maintained so the wall never has to dry the room's mistakes [6]. The wet room's inspection adds mould and its honesty: growth at corners and behind furniture is usually condensation asking for ventilation rather than damp asking for the decorator, and the article's triage separates the wall's problems from the room's habits before any repainting is ordered. Where genuine wetting occurs, the plumbing-or-envelope question from the stain section is asked again, because a wet room's wall deserves the same diagnostic honesty a rain-stained bedroom gets.

## Keeping the record, the cheapest maintenance there is

The article ends with the maintenance decade's cheapest tool and its most neglected one: the record. A short file per wall, specification, dates, colours, and the annual walk's pencilled findings, turns every future repair from archaeology into appointment [5][7]. The repaint chosen because the record named the last one, the patch that matched because the record named the plaster, and the crack that was referred because the record showed its growth, are the three quiet ways the record earns its keep. The chain this series has followed was built by people who wrote things down; the maintenance article's last honest sentence is that the wall's next decade is written the same way.

## The specialist handoffs, asked for honestly

The maintenance article's final teaching is the honest recognition of its own limits, because a wall's decade always contains questions a maintenance routine should escalate rather than answer. The crack that moves between visits, the stain that returns after the source was "fixed", the sagging ceiling, and the damp that survives both the plumber and the roofer are the building's questions, not the decoration's, and they go to the building's specialists: the structural engineer, the damp surveyor, the plastering trade for the repairs beyond the patch, and where the building is old or listed, the conservation authorities whose literature this series cites with respect [7]. The escalation is not defeat; it is the same triage the article began with, applied at the scale of the building. The wall that is escalated honestly, diagnosed properly, and then repaired to the chain's own standards, keeps the maintenance decade's promise: that the cheapest wall is the one the reader actually understands.

## The repaint's own sequence, kept honest

The maintenance article ends where the chain began, because a repaint is the chain run again in miniature and deserves its own honest sequence. The wall is cleaned, so the new coats bond to the wall and not to the decade's dust [6]. Defects are triaged by the article's rules: hairlines filled, stains diagnosed, and anything structural referred rather than decorated [7]. The surface is flattened lightly, edges are masked and protected, and the paint is applied at the spreading rate the can states, in the coats the room's duty requires [6]. The repaint's record joins the file: the colour, the product, and the date, so the next repaint begins as this one ended, with the wall's history on the table and the wall's future written to specification. That closing of the loop is the whole difference between a wall that is merely painted and a wall that is genuinely kept.

## The tools of the maintenance decade, and their honest keeping

The maintenance article's final shelf is the house's own, and its inventory is short and honest: the pencil for the annual walk, the filler knife and the fine abrasives for the patch that the decade will inevitably ask for, the primer for the repair that must seal before it paints, and the paint record that turns every repair from a guess into an appointment [6]. The keeping of these tools is the keeping of the habit: the box that lives with the wall's file is a maintenance programme that survives the owner's busy years, and the wall that is inspected annually and repaired promptly repays the attention with the chain's quietest gift, which is the decades that pass without incident [7].

## A closing example, the corner that told the truth

The maintenance article ends with a composite example, because a decade of walls teaches in stories. A hall corner, scuffed by years of school bags, is patched in an afternoon by the article's rules: cut back, feathered, sealed, and repainted from the record, and the repair is invisible within the week [2][6]. The same wall, two winters later, shows a stain above the skirting on the party wall side; the walk's pencil and the file's history turn it to the rainwater goods, not the decoration, and the gutter repair costs less than the repainting it would have demanded [7]. The two small events are the article's whole argument in miniature: the wall that is read, recorded, and repaired to the chain's logic costs pennies of attention; the wall that is merely painted costs pounds of reaction. The series has followed the chain from the structural background to that pencil, and the last word is the first one's promise kept.

## References

1. British Gypsum, *Thistle Finishing Plaster, product data sheet*.
2. British Gypsum, *Installation Guidance: Thistle Finishing Plaster*.
3. British Gypsum, *Thistle Plasters Residential Brochure* (incl. Thistle Bond-It).
4. British Gypsum, *Installation Guidance: Thistle Undercoat Plaster*.
5. British Gypsum, *Thistle Plaster Systems, White Book specification selector PL0029*.
6. Dulux Trade, *Plaster Primer (moisture tolerant) product data*.
7. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a painter rolling a coat of paint, taken by Michael Coghlan and made available under CC BY-SA 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle5$, 'maintenance', 8, 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Rolling_in_the_Middle_%2834571931105%29_%28cropped%29.jpg')
) AS a(slug,title,excerpt,content,theme,read_time_minutes,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='GB' AND t.candidate_key='assembly:gb-interior-block-skim-paint'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO UPDATE SET
  wall_topic_id=EXCLUDED.wall_topic_id,
  wall_article_theme=EXCLUDED.wall_article_theme,
  wall_market_code=EXCLUDED.wall_market_code,
  wall_language_code=EXCLUDED.wall_language_code,
  market=EXCLUDED.market,
  cover_image_url=COALESCE(EXCLUDED.cover_image_url, public.learn_articles.cover_image_url);


UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='GB' AND t.market_code='GB'
  AND t.candidate_key='assembly:gb-interior-block-skim-paint'
  AND a.wall_topic_id=t.id AND a.wall_market_code='GB' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
