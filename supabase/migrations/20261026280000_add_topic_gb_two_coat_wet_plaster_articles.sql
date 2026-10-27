-- First GB researched-candidate topic: two-coat wet plaster (undercoat + multi-finish skim).
-- The topic is registered as verification_status='candidate' (schema gate: only an
-- authenticated admin can promote it to 'verified' via the admin console).
-- Articles remain drafts; publication/review gates are not bypassed.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, attributed), never AI generated.
-- Apply 20261024000000_global_wall_finishing_knowledge_library.sql first.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='GB' AND candidate_key='assembly:gb-two-coat-wet-plaster') THEN
  INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type,verification_status)
  VALUES ('GB','assembly:gb-two-coat-wet-plaster','Two-coat wet plaster (browning or hardwall plus multi-finish skim)','finish_assembly','candidate');
END IF; END $$;

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,mp.default_language
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON true
JOIN public.market_profiles mp ON mp.country_code=t.market_code
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-two-coat-wet-plaster'
ON CONFLICT(topic_id,theme_key,language_code) DO NOTHING;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('British Gypsum, *White Book: Plaster systems*', 'https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK two-coat wet plaster system; requires human local/editorial review before acceptance.'),
  ('British Gypsum, *Installation Guidance: Thistle MultiFinish*', 'https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK two-coat wet plaster system; requires human local/editorial review before acceptance.'),
  ('British Gypsum, *Declaration of Performance: Thistle undercoat plaster range (Bonding Coat, Browning, Hardwall, Tough Coat)*', 'https://www.british-gypsum.com/documents/declaration-performance-dop/british-gypsum-dop-plast100-thistle-undercoat-plaster-range.pdf', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK two-coat wet plaster system; requires human local/editorial review before acceptance.'),
  ('CEN, *EN 998-1, Specification for mortar for masonry, Part 1: Rendering and plastering mortar (catalogue entry)*', 'https://standards.globalspec.com/std/10055736/en-998-1', 'CEN', 'Citation for one or more of five source-linked draft articles about the UK two-coat wet plaster system; requires human local/editorial review before acceptance.'),
  ('NHBC, *Good craftsmanship guide: brickwork and blockwork*', 'https://www.newbuildinspections.com/wp-content/uploads/2024/07/nhbc-good-brickwork-guide.pdf', 'NHBC', 'Citation for one or more of five source-linked draft articles about the UK two-coat wet plaster system; requires human local/editorial review before acceptance.'),
  ('Scottish Government, *Building standards technical handbook 2017: domestic (durability, workmanship and fitness of materials, citing BS 8000 workmanship codes)*', 'https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/', 'Scottish Government', 'Citation for one or more of five source-linked draft articles about the UK two-coat wet plaster system; requires human local/editorial review before acceptance.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-two-coat-wet-plaster'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Cover image credit: Plastering a wall, Donaghanie, photograph by Kenneth Allen, CC BY-SA 2.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Plastering_a_wall,_Donaghanie_-_geograph.org.uk_-_5784055.jpg', 'Wikimedia Commons', 'Real photograph used as the overview article cover image; license verified via the Wikimedia Commons API at drafting time; not AI generated.'),
  ('Cover image credit: A construction worker mixes plaster in a bucket using a drill attachment, photograph by NPS, public domain, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:A_construction_worker_mixes_plaster_in_a_bucket_using_a_drill_attachment._%289619716c-5174-4c6e-8c74-85c053c5cec5%29.JPG', 'Wikimedia Commons', 'Real photograph used as the materials article cover image; license verified via the Wikimedia Commons API at drafting time; not AI generated.'),
  ('Cover image credit: Plastering the Wall, photograph by Andrew Comings, CC BY 2.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Plastering_the_Wall_(2529677768).jpg', 'Wikimedia Commons', 'Real photograph used as the installation article cover image; license verified via the Wikimedia Commons API at drafting time; not AI generated.'),
  ('Cover image credit: Plastering the Wall with Care, photograph by Johnnybam, CC BY-SA 4.0, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Plastering_the_Wall_with_Care.jpg', 'Wikimedia Commons', 'Real photograph used as the quality article cover image; license verified via the Wikimedia Commons API at drafting time; not AI generated.'),
  ('Cover image credit: Workers mix plaster and continue plaster work on church walls, photograph by NPS, public domain, via Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:Workers_mix_plaster_and_continue_plaster_work_on_church_walls._%2811167792-5535-4064-b241-45d7b3e39df8%29.jpg', 'Wikimedia Commons', 'Real photograph used as the maintenance article cover image; license verified via the Wikimedia Commons API at drafting time; not AI generated.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-two-coat-wet-plaster'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'GB','GB',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('gb-wet-plaster-overview', 'UK Two-Coat Wet Plaster: Chain Overview', 'A British overview of the two-coat wet plaster system: suction-matched undercoats like browning and hardwall, the multi-finish skim above them, and the drying discipline that governs the whole craft.', $wallarticle1$# UK Two-Coat Wet Plaster: Chain Overview

The two-coat wet plaster system is British wall finishing at its most traditional and most enduring: a backing coat worked onto the masonry to make the wall flat and true, and a thin finish coat worked over it to make it smooth. The bags on the shelf have changed names over the decades, but the craft has not: suction matched, undercoat ruled, skim troweled through its stages, and the wall left to dry before anyone decorates it. This overview walks the system the way a British plasterer would explain it to an apprentice, with the manufacturer's guidance open beside the hawk.

## The chain in one paragraph

The chain reads: a sound masonry background, a suction assessment, an undercoat chosen to suit it, and a finish coat skimmed on in the millimetres of thickness that give the system its name. The undercoat is where the wall's truth is made: high-suction backgrounds like brick and block get the plasters designed to grip them, and the board and plaster systems assembled by the manufacturer's White Book put each product in its tested place [1](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf). The skim is where the wall's face is made, and the finish plaster that provides a smooth, inert and high quality surface is the product the whole craft ascends toward [1](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf).

## Why the two coats, instead of one or none

The two coats divide the work the way all good engineering divides it. The undercoat carries the wall's rough duties: it fills the masonry's irregularities, it builds the thickness that brings the wall to plane, and it is ruled and flattened with the tools that suit a coarse, heavy material. The finish coat carries the room's fine duties: a thin, tight, bright surface that no thick coat could hold without crazing. One coat asked to do both would crack under the contradiction, and the two-coat answer is the plasterer's oldest piece of structural honesty: the thickness does the flatness, the thinness does the smoothness, and never the two jobs in one mix.

## The undercoat families, chosen by suction

The undercoat shelf is a suction table. Browning belongs to the high-suction backgrounds, the bricks and blocks that drink water fast; Hardwall belongs to the medium-to-high suction masonry where a denser, harder backing earns its keep, and the declaration of performance for the undercoat range lists the family's members and their declared types [3](https://www.british-gypsum.com/documents/declaration-performance-dop/british-gypsum-dop-plast100-thistle-undercoat-plaster-range.pdf). The choice is not cosmetic: an undercoat that fights its background fails at the bond, and the plasterer who reads the wall before opening a bag is the one whose work is still on the wall in thirty years.

## The skim, and the timing that makes it

The finish coat is a chemistry of minutes and the manufacturer's installation guidance treats it that way: clean water at the stated ratio per bag, the plaster added to the water rather than the reverse, and the working time respected from the first trowel to the last [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf). The skim's stages, laid on, flattened, troweled, polished, are not decorative rituals but the plaster's own setting curve read by hand, and the craft's rhythm is the same one the guidance documents in its mixing and application instructions.

## The drying, and the decoration it gates

The finished wall must be dry before decoration, and the permeable interim paint the manufacturer's literature allows is the honest bridge between a wall that is ready to seal and a programme that wants to paint. The building standards' workmanship codes frame the wider expectation, that materials and workmanship suit the building's conditions and last its life [6](https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/). The overview keeps the drying gate because the chain's most famous failures, the paint that peels, the wall that stains, are almost always a decoration that refused to wait.

## How the batch divides the system

The materials article stocks the shelf and reads the suction table. The installation article runs the sequence from background to polish. The quality article sets the gates the wall is inspected through. The maintenance article keeps the surface honest for the decades it will carry. Each article opens by restating the chain in miniature, and each closes with the same promise: the system works when its conditions are kept, and the articles say what the conditions are.

## The reader's three questions, asked and answered

Three questions cover most of what a reader meeting this system needs from an overview, and it answers them directly. Why wet plaster, in a drylining age: because masonry backgrounds are still the British norm, because wet plaster's robustness and repairability reward them, and because the tested systems behind the products are still the specification many builders trust [1](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf). Why the coats cannot be hurried: because each coat's chemistry sets its own calendar, and the crazed, hollow, or shadowed wall is the calendar ignored [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf). And what the occupant inherits: a dense, monolithic, paintable surface whose maintenance is the cheapest of the serious finishes, because its repairs are local and its materials are universal.

## A closing orientation, the map folded small

The overview folds to a map the apprentice can carry: read the wall, match the undercoat to its suction, rule the undercoat to plane, skim to the timing, dry to the calendar, decorate to the conditions. The four articles that follow are the map at walking scale, and the overview's last sentence is the trade's own: the wall keeps every coat honestly given and every shortcut forever.

## The system's cousins, and where each belongs

The two-coat system has cousins the overview should name so the reader knows which article belongs to their wall. Over plasterboard, the one-coat skim traditions run their own shorter article in this library. Over dot and dab drylining, the jointing chains run theirs. The wet plaster system this batch follows stays on the masonry background, the brick and block walls that still make most British rooms, and the overview's honest border is the suction question: the wall that has masonry behind it earns this system, and the wall that has board behind it earns the others. The cousins matter because the shelf shares products across them, and the MultiFinish bag that skims a masonry wall also skims a board wall; what differs is the undercoat's duty and the background's thirst.

## The economic honesty of the system

The overview owes the reader one honest piece of economics. Wet plaster costs more than drylining in the hours it takes, and it repays in the decades it lasts: the dense, monolithic surface resists knocks, takes fixings without ceremony, and patches in its own materials without seams. The specification that chooses wet plaster is buying robustness and repairability rather than speed, and the householder choosing between them should price the wall across its whole life, because the cheap week and the durable decade are different ledgers, and the wet plaster system is the decades ledger's favourite entry.

## How the system meets the building's other stories

The wet plaster wall does not stand alone: it meets the masonry it covers, the fixings it will carry, and the decoration it will wear, and each meeting has its own honesty. The good masonry the craftsmanship guides describe [5](https://www.newbuildinspections.com/wp-content/uploads/2024/07/nhbc-good-brickwork-guide.pdf) is the background this system rewards most, and the wall's substrate owes the plaster its soundness before the plaster owes the room its surface. The standard's own story matters too: the factory made plastering mortars the European specification catalogues [4](https://standards.globalspec.com/std/10055736/en-998-1) are the shelf's legal frame, and the reader who knows the frame exists reads the bags with more confidence.

## The overview's last honest sentence

The overview ends with the sentence the trade has earned: the two-coat system is common, and the keeping of it never is. The coats are named, the timings are published, the suction table is on every data sheet, and the wall that gets all three is the wall that carries its room for fifty years without a story. The four articles that follow are that sentence, expanded into the working day and the owning decade, and the reader who carries only the sentence has still carried the system's whole heart.

## The reader's honest position, whoever they are

The overview's last service is to place its readers honestly. The specifier finds the system's decision points named in order, suction, undercoat, skim, drying, and the tested systems the White Book assembles around them [1](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf). The plasterer finds the craft's timings respected rather than compressed, because the overview was written by people who know the set cannot be hurried. The decorator finds the drying gate stated in the old trade's plain terms, and the occupant finds the maintenance article's promise of a surface that repays its decades cheaply. No reader is the overview's favourite, and every reader gets the same sentence to keep.

## The standards shelf, where the system files its promises

The overview keeps a short standards shelf so the reader knows where the system's promises are filed: the European specification for factory made plastering mortars [4](https://standards.globalspec.com/std/10055736/en-998-1), the manufacturer's White Book that assembles the tested systems [1](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf), and the workmanship codes the building standards cite for the craft's wider frame [6](https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/). The shelf is small, and its message is smaller: the system is documented, and the trades who keep it well can name their documents on request.

## The apprentice's paragraph, and why the overview keeps one

The overview keeps an apprentice's paragraph because the two-coat system is a craft before it is a product, and the craft's transmission is why the article exists at all. To the apprentice: the wall will tell you its suction if you listen, the set will tell you its stages if you respect them, and the trowel will tell you the truth if you keep it clean. Every product named in this batch sits inside that older curriculum, and the bags with their data sheets are the craft's modern memory rather than its replacement. The overview's last teaching is the trade's first one: learn the wall before you learn the bag, and both will serve you for fifty years of walls.

## References

1. British Gypsum, *White Book: Plaster systems*.
2. British Gypsum, *Installation Guidance: Thistle MultiFinish*.
3. British Gypsum, *Declaration of Performance: Thistle undercoat plaster range*.
4. CEN, *EN 998-1, Specification for mortar for masonry, Part 1*.
5. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
6. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a plasterer working on a wall at Donaghanie, County Tyrone, Northern Ireland, photographed by Kenneth Allen and made available under CC BY-SA 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle1$, 9, 'overview', 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Plastering_a_wall%2C_Donaghanie_-_geograph.org.uk_-_5784055.jpg')
, ('gb-wet-plaster-materials', 'Materials for UK Two-Coat Wet Plaster', 'A British materials guide to the wet plaster shelf: undercoat families matched to suction, multi-finish skim chemistry, clean water and mixing discipline, beads, and the tools that keep the craft honest.', $wallarticle2$# Materials for UK Two-Coat Wet Plaster

The wet plaster shelf is small, honest, and unforgiving: a few bags, a bead rack, clean water, and tools that have not changed shape in a century. This article stocks the shelf the way the plasterer stocks the van, with each item chosen for the job it will actually do.

## The undercoat shelf, read as a suction table

The undercoat families divide by background. Browning belongs to the high-suction brick and block backgrounds; Hardwall belongs to the medium-to-high suction masonry and brings the harder, denser backing that halls and high-traffic areas appreciate; the bonding coats belong to the low-suction and special backgrounds; and the range's declared types and performances are documented in the manufacturer's declaration of performance [3](https://www.british-gypsum.com/documents/declaration-performance-dop/british-gypsum-dop-plast100-thistle-undercoat-plaster-range.pdf). The shelf's honesty is that none of them is generally better; each is better for one wall, and the wall decides.

## The finish shelf, and its chemistry

The multi-finish skim is the system's celebrity and its most disciplined material. The installation guidance is specific about the craft's first act: clean water at the stated volume per bag, the plaster added to the water gradually while mixing, not the reverse [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf). The guidance's numbers are not suggestions; they are the mix the plaster's setting curve is calibrated to, and the bucket that ignores them is the wall that pays.

## The beads, and the small parts that get inspected forever

Skirting, arch and angle beads give the wall's edges the straight lines the coats will follow, and the bead rack is part of the shelf because the bead is part of the specification: chosen for the edge it will form, fixed to the line the room will judge, and finished into the coats rather than decorated over. The bead that is out of plumb is the corner that no skim will forgive.

## The tools, and their long apprenticeship

The hawk and float, the darby and rules, the trowel that polishes and the brushes that wet: the tool list is short and every item is a skill wearing a handle. The powered mixer belongs to the modern kit, but its discipline is the old one, the clean bucket between mixes and the water measured rather than poured [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf).

## What the shelf cannot sell

The shelf cannot sell suction control, timing, or the patience the skim's stages demand. It cannot sell a dry day for the undercoat or a warm room for the finish, and it cannot sell the clean water that becomes half the wall. The materials article ends with the buyer's honest list: read the wall before the shelf, buy the bag the wall asks for, and bring the discipline the bag assumes.

## The water, the shelf's quietest material

Water is the system's quietest material and its most important one after the plasters themselves. The mixing guidance is explicit: clean water, at the stated volume per bag, with the plaster added gradually to the water while mixing [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf). The water's honesty matters twice: the set it enables, and the wall it refuses, because dirty water is salts and organics that stain and weaken the surface for years. The shelf's cheapest item is the one the craft polices hardest, and the apprentice learns the bucket before the trowel.

## The storage discipline, bags that stay as good as factory

The bags live dry, off the floor, in their sealed state until the hour of use, because a plaster that has drunk damp sets in the bag and nowhere else. The shelf life the manufacturer states is read rather than assumed, the batch numbers are noted for the file, and the shed that keeps the bags honest is part of the materials list even though no merchant sells it. The buyer who respects storage buys the wall the factory calibrated, and the buyer who does not buys a lottery.

## The coverage arithmetic, done with the data sheet open

The honest bill of materials is arithmetic before it is shopping: the wall's area, the coat thicknesses the system specifies, the yield per bag the data sheets state, and a margin for the real world's waste. The plasterer who does the arithmetic buys one delivery and finishes the wall; the plasterer who guesses buys three and ends mid wall on the wrong day, which is the coverage lesson every trade learns exactly once. The materials article refuses to print universal numbers because the numbers belong to each product's own documents, and the honest reader keeps them open while the arithmetic is done.

## The bead rack, chosen for the edge it will actually form

The bead shelf deserves its own paragraph because beads are geometry wearing galvanised skin: skirting beads for the junctions, arch beads for the curves the room will inspect, angle beads for the corners that take the vacuum's decade of small collisions. Each bead is chosen for the edge it will actually form, fixed to the line the coats will follow, and the bead that is wrong for its edge is the corner that no finish forgives. The rack is small, inexpensive, and the most inspected square centimetres of the whole wall.

## The buyer's three questions, asked at the merchant

The materials article closes with the three questions that protect the purchase: which background, because the suction table decides the undercoat; which room, because the hall's Hardwall and the bedroom's Browning answer different duties; and which week, because the working times the guidance states [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf) schedule the wall's days. The buyer who answers the three questions walks out with a wall rather than a pile of bags, and the merchant who hears them answered cannot sell the wrong shelf by accident.

## The waste shelf's honest arithmetic

The honest buyer budgets the waste with the materials: the part bag that sets because the day ran out, the mixed-too-much bucket the working time retired, and the droppings that every real wall produces. The waste is not failure, it is the margin the working times impose, and the arithmetic that includes it is the arithmetic that finishes walls. The buyer who pretends the waste away is the buyer who runs out of finish at the last corner, and the last corner is the least forgiving place in the craft to be short.

## The undercoat's honest characters, compared closely

The materials article owes the suction table more than a list, it owes a comparison. Browning is the high-suction wall's traditional answer, a lightweight undercoat that grips the thirsty brick and block backgrounds while it builds the wall to plane. Hardwall is the harder, denser member of the family, the undercoat for medium-to-high suction masonry that answers the halls and stairwells with the impact resistance the family's name promises, and the declaration of performance lists its type and fitness alongside its cousins [3](https://www.british-gypsum.com/documents/declaration-performance-dop/british-gypsum-dop-plast100-thistle-undercoat-plaster-range.pdf). The bonding coats serve the low-suction and special backgrounds where the family's gypsum grip needs help. The comparison's honest conclusion is that the shelf sells backgrounds, not bags, and the buyer who names the wall first has already chosen correctly.

## The finish's honest character, against its cousins

The multi-finish skim earns its own comparison, because the finish shelf has members too: the board finish that suits plasterboard's lower thirst, and the multi-finish that was formulated to serve both board and masonry's wet-plaster undercoats, the smooth, inert, high quality surface the White Book's system literature describes [1](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf). The comparison matters at the patch and the whole wall alike, because the finish that suits the undercoat bonds as a system and the finish chosen by habit bonds as a coincidence. The shelf's honest rule is the same at both scales: read the surface the finish will meet, and buy the bag that was formulated to meet it.

## The small consumables, and their quiet duties

The shelf's small consumables finish the honest list: the bonding agent where the system's guidance puts it, the scrim and the tapes the repair culture keeps, the abrasives in fine grades for the between coat flattening, and the sugar soap the repaint culture begins with. Each consumable is a small duty with a large consequence, because the bonding agent is the bond's insurance and the abrasive is the paint's foundation, and the shelf that stocks them all is the shelf that behaves like a system rather than a pile. The consumables' paragraph closes the article because their honesty is the article's whole point: the wall is built from the big bags and finished by the small ones, and the buyer who respects both respects the wall.

## The shelf's closing roll call

Assemble the shelf at the end and look at it honestly: the undercoat bag the suction table chose, the finish bag the undercoat's surface earned, the bead rack for the edges the room will inspect, the clean water at the stated ratio, the powered mixer with the clean bucket, the tools with their long apprenticeship, and the consumables that carry the small duties. The shelf is smaller than a van and larger than most careers, and the buyer who has read this article knows that its most important item, the discipline the bags assume, is stocked in the person or not at all. May every shelf assembled from this article stock that item first, because every other item on the list behaves only when it is present.

## The merchant conversation, scripted honestly

The merchant's counter deserves its script, because the shelf is bought there and the wall is protected or betrayed in the same conversation. The script is short: name the background, the masonry's type and condition; name the system, the undercoat family and the finish the suction table chose; name the week, because the working times schedule the days; and ask for the batch numbers, because the file wants them. The counter that hears the script cannot sell the wrong bag by accident, and the counter that does not hear it sells by price alone, which is the wrong bag arriving by a different route. The script's last line is the trade's oldest: read the data sheet before the till, because the wall will read the mixing water after it.

## References

1. British Gypsum, *White Book: Plaster systems*.
2. British Gypsum, *Installation Guidance: Thistle MultiFinish*.
3. British Gypsum, *Declaration of Performance: Thistle undercoat plaster range*.
4. CEN, *EN 998-1, Specification for mortar for masonry, Part 1*.
5. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
6. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a construction worker mixing plaster in a bucket using a drill attachment, photographed by the National Park Service and released into the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and its status was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle2$, 8, 'materials', 'https://upload.wikimedia.org/wikipedia/commons/e/e9/A_construction_worker_mixes_plaster_in_a_bucket_using_a_drill_attachment._%289619716c-5174-4c6e-8c74-85c053c5cec5%29.JPG')
, ('gb-wet-plaster-installation', 'Applying UK Two-Coat Wet Plaster: Installation', 'A British installation sequence for two-coat wet plaster: reading suction, laying and ruling the undercoat, keying and skimming to the set, and the drying discipline that hands the wall to the decorator honestly.', $wallarticle3$# Applying UK Two-Coat Wet Plaster: Installation

Installation is the craft's day, and the two-coat system gives it two halves: the undercoat day that builds the wall's truth and the skim day that finishes its face. This article runs both, in the order the plasterer runs them, with the manufacturer's guidance as the metronome.

## Reading the background, the day's first engineering

The wall is read before it is plastered: its suction, its soundness, its deviations. The splash test's honest verdict, a masonry background that drinks fast gets the undercoat designed for it, and the craft's suction treatments, wetting and bonding agents, are applied where the reading says they belong [3](https://www.british-gypsum.com/documents/declaration-performance-dop/british-gypsum-dop-plast100-thistle-undercoat-plaster-range.pdf). The good masonry the craftsmanship guides celebrate, clean, level and true [5](https://www.newbuildinspections.com/wp-content/uploads/2024/07/nhbc-good-brickwork-guide.pdf), is the background this system rewards most.

## Laying the undercoat, and ruling it true

The undercoat goes on in the thicknesses the system allows, laid between grounds or beads, ruled with the darby and floated to close the surface and key the face for its skim. The coat's purpose is geometry: the wall's plane is made here, in the coarse material designed to carry it, and the skim that follows is only as flat as the undercoat beneath it. The coat is allowed its setting time before the skim is booked, because the undercoat still drinking when the skim arrives is the wall whose story ends in crazing.

## The skim's stages, read from the plaster

The finish coat goes on thin, in the working time the guidance states, mixed to its stated water and applied in the continuous pass the hawk feeds [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf). The stages that follow, flattening, straightening, troweling, and the final polish that brings the surface bright, are the plaster's own setting curve read by hand, and the plasterer works with the curve rather than against it. The working time is the craft's honest clock: the plaster that has begun to set is not retempered, not worked, not rescued; it is allowed to be what it is.

## The drying, and the handover it earns

The wall's drying is its own affair, governed by warmth, ventilation, and the calendar rather than the programme, and the decoration waits for the dryness the manufacturer's system literature describes, with the permeable interim paint the honest bridge when decoration must precede full dryness [1](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf). The workmanship codes the building standards cite frame the expectation plainly: work to the conditions, and the work lasts the building's life [6](https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/).

## The grounds and beads, fixed before the first mix

The installation's first hour is geometry: grounds set to line and level, beads fixed plumb at the arrises, and the wall's high and low points found while they are still cheap to correct. The undercoat will follow the geometry the way water follows a channel, and the plasterer who fixes the grounds honestly is the one whose finished wall meets the straightedge on the first pass. The hour costs nothing the programme was not already spending, and it buys the whole day's work its standard.

## The weather in the room, the craft's own climate

The plaster keeps the room's hours, not the calendar's: the cold room that stalls the set, the hot room that flashes it, the draught that crazes the surface as it dries. The installation manages the room's climate as deliberately as the mixing water, shading the window that bakes, closing the draught that scorches, and warming the wall that would otherwise take the set's patience away. The guidance's working times assume a reasonable room [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf), and the honest installation is the room that keeps the assumption.

## The clean handover, the day's last coat

The day ends with the cleaning, and the cleaning is the craft's last honest act: the buckets washed for tomorrow, the boards swept of the droppings that stain, and the room left to dry in the ventilation the wall deserves. The plasterer's kit photographed clean is the system's diploma, and the wall handed over with its room in order dries to the standard the whole day worked for.

## The suction treatments, and where the guidance puts them

The installation's suction treatments follow the manufacturer's system rather than the site's folklore: the wetting the high-suction wall takes, the bonding agent the difficult background takes, and the undercoat's own formulation doing the quiet work its family was designed for [3](https://www.british-gypsum.com/documents/declaration-performance-dop/british-gypsum-dop-plast100-thistle-undercoat-plaster-range.pdf). The treatments are not optional rituals; they are the bond's engineering, and the wall whose suction was treated to the guidance is the wall whose bond outlives the decorator's warranty.

## The sequence's own clock, respected in hours

The two-coat day has its own clock, and the installation states it plainly: the undercoat's set before the skim is booked, the skim's working time from the first trowel, and the drying days between the polish and the decoration. The clock is the plaster's chemistry, not the programme's preference, and the installation that works inside it ends every day with a wall that sets as the bags promised. The clock's honest name is patience, and it is the one tool the merchant does not stock.

## Laying and ruling, the undercoat's honest hours

The undercoat's hours deserve their own honest description, because this is the day the wall's truth is made. The first pass lays the plaster between the grounds, the hawk feeding the float, and the wall taking its coat in the continuous rhythm the mix's working time allows. The second pass rules it: the darby or the straightedge, worked in the long strokes that find the high spots and fill the lows, and the wall coming true under the tool's argument. The third pass closes and keys the surface, the float bringing the coat to the texture the skim will grip, because the undercoat's face is the skim's foundation and the key is the bond's handshake. The hours are honest work, and the wall that receives them is the wall whose skim meets a plane rather than a lottery.

## The skim's working time, lived minute by minute

The skim's working time is the craft's most famous hour, and the installation describes it honestly, minute by minute. The first minutes lay the plaster thin and even, the hawk never far from the trowel, the room's wall covered before the set's clock catches the first batch. The middle minutes flatten and straighten, the trowel cutting the proud and filling the hollow, the surface coming to plane. The later minutes trowel and polish, the steel finding the plaster's brightness as the set firms beneath it, and the guidance's stated water and mixing discipline [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf) is the clock's calibration underneath every minute. The plasterer who works with the clock finishes bright; the plasterer who fights it finishes dragged, and the wall remembers the difference for fifty years.

## The openings, beads and the room's geometry, finished first

The openings deserve the sequence's honest attention, because the reveals and the arrises are where the wall's geometry becomes visible craft. The beads are fixed before the first mix, plumb and true, because the skim will follow the bead the way the eye will follow the skim. The reveals are ruled to their angles, the internal corners gauged, and the wall's high and low points corrected in the undercoat while the correction is still cheap. The sequence's law, geometry before gloss, holds at every scale from the whole wall to the single opening, and the installation that finishes its geometry first is the installation whose surfaces finish themselves.

## The mixing discipline, the batch that behaves

Every coat begins as a batch, and the guidance's mixing discipline is the batch's first quality gate: clean water to the stated ratio, whole bags at once, the plaster added to the water gradually while mixing [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf). A batch stretched with extra water is a coat with the strength of its weakest guess, and a bucket that carries yesterday's set plants pinholes in today's wall. The discipline costs minutes and the whole day borrows its honesty from it.

## The handover's file, and the wall's first record

The installation's final act is the record: the products and batches used, the coats and their timings, the room's conditions, and the photographs from the positions the file will always name. The record costs minutes and buys the maintenance decade its inheritance, and the handover that includes it is the wall's first honest maintenance act. The installation article closes where the quality article opens, with the file between them, and the wall that travels with its record is the wall that never has to explain itself twice.

## The drying's own paragraph, weather kept honest

The drying deserves its own paragraph at the installation's close, because it is the coat that no trowel gives and the gate every decorator waits for. The wall dries on warmth, ventilation, and time, and the forced heat that bakes one face while the other stays damp is the drying's classic betrayal. The room given gentle air and honest patience dries evenly, decorates honestly, and carries its paint for decades; the room given the blower and the deadline dries unevenly, decorates beautifully for a fortnight, and peels by the anniversary. The installation's last instruction is the building standards' oldest [6](https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/): let the work suit the conditions, and the work will last the building's life.

## The ceiling's paragraph, the same craft overhead

The ceiling earns its paragraph in any honest installation article, because it is the two-coat system's most athletic room and the one the neck inspects forever. The ceiling's suction is read as the wall's was, its beads and grounds fixed to line, its undercoat ruled to the plane the lamp will rake, and its skim worked through the same stages the guidance states [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf), with the difference that gravity now argues against every pass. The ceiling done honestly is the room's quiet crown, and the ceiling done carelessly is the lamp's permanent exhibition, and the craft's answer to gravity is the same answer it gives every difficulty: smaller batches, faster passes, and a working time respected to the minute.

## References

1. British Gypsum, *White Book: Plaster systems*.
2. British Gypsum, *Installation Guidance: Thistle MultiFinish*.
3. British Gypsum, *Declaration of Performance: Thistle undercoat plaster range*.
4. CEN, *EN 998-1, Specification for mortar for masonry, Part 1*.
5. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
6. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a worker plastering a wall, photographed by Andrew Comings and made available under CC BY 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle3$, 9, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Plastering_the_Wall_%282529677768%29.jpg/1280px-Plastering_the_Wall_%282529677768%29.jpg')
, ('gb-wet-plaster-quality-checks', 'UK Wet Plaster Quality Control', 'A British quality program for two-coat wet plaster: suction gates, undercoat flatness and key, skim surface and thickness honesty, drying verification, and the raking light that tells the wall the truth.', $wallarticle4$# UK Wet Plaster Quality Control

The quality program for wet plaster is short because the wall audits itself: the surface that was honestly made shows its gates passed, and the surface that was not shows them failing, in a language the light translates. This article sets the gates in the order the work passes them.

## Gate one, the suction reading

The program opens with the background's reading: suction assessed, treatments applied where indicated, and the undercoat matched to the wall the tests found [3](https://www.british-gypsum.com/documents/declaration-performance-dop/british-gypsum-dop-plast100-thistle-undercoat-plaster-range.pdf). The gate's record is a sentence in the file, and the gate's power is the failures it prevents at the bond.

## Gate two, the undercoat's plane and key

The undercoat is checked before the skim covers it: flat to the rule, plumb at the beads, and keyed to receive. The workmanship the building standards expect, honest materials applied to their conditions [6](https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/), is checked here at its cheapest, while the coarse coat can still be corrected.

## Gate three, the skim's surface

The skim is checked in the raking light and the flat: no trowel marks, no pinholes, no crazing, and the surface bright and even, the smooth, inert and high quality face the system literature promises [1](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf). The thickness honesty belongs to this gate too, because a skim stretched thin is a skim that crazes, and the millimetres the system names are part of its specification.

## Gate four, the dryness

The drying gate is checked before decoration, by the calendar the system literature states and the wall's own condition, because the paint that seals a wet wall is the program's most expensive signature [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf).

## The records, and the wall's diploma

The program closes with the file: the reading, the coats, the dates, the weather, and the photographs that hand the maintenance decade its inheritance. The building standards' workmanship codes are the frame [6](https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/), and the file is the picture the frame holds.

## The two walks, daylight and lamp

The quality program inspects in two lights because the wall tells different truths in each. The daylight walk reads flatness, colour of the new surface, and the beads' lines; the lamp walk, held flat and moved slowly, prints the surface's texture in shadow, the trowel marks, the pinholes, and the crazing that flat light forgives. The program books both walks into the day's plan, because the occupant will live with the lamp's verdict every evening, and the wall that passes both is the wall that stays decorated.

## The sample panel, and the wall that cannot surprise

On the larger job the program builds its certainty with a sample panel: one corner carried through both coats, inspected in the room's own light, and read against the specification before the rest of the wall follows [1](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-plaster-systems.pdf). The panel teaches the room's suction and the day's timing on a wall that is allowed to be a rehearsal, and the program that spends the morning on the panel saves the week on the walls that follow it. The panel is the quality article's favourite bargain, and its findings go in the file beside the photographs.

## When the program stops work, the kindest gate

The quality program's real authority is the stop: the undercoat that is not flat is corrected before the skim covers it, the skim that met a damp wall is stopped before the paint seals the damp in, and the surface that has begun to set is not retempered back to life. The stop costs an hour and saves the wall, and the program that never stops work is the program that has decided the maintenance article will discover its defects instead.

## The program's honest percentage

The honest program admits that inspection catches the failures that matter rather than every flaw that exists: the bond at the hollow, the flatness at the rule, the thickness at the bead, and the dryness at the gate. The percentage is honest because the tools are honest, and the wall that passes the tools passes the decades. The workmanship codes the building standards cite [6](https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/) are the expectation, the tools are the audit, and the file is the proof.

## The bond, checked at the hollow

The bond is the quality article's deepest question, because everything else the program checks rides on it. The hollow test, the knuckle or the coin on the surface, reads the bond's honesty through the sound it returns, and the hollow that sounds is the patch that will let go, sooner or later, of the wall it was meant to marry. The program sounds the wall systematically, corners, fields, and the junctions of coats, and the hollow found before decoration is raked and refilled at a fraction of its eventual cost. The bond's honesty begins at the suction reading and ends at the dryness gate, and the program walks it the whole way.

## The crazing question, and the drying that answers it

Crazing, the fine map the surface draws when it dries too fast or too thin, is the skim's most honest failure, and the program's answer is the drying's conditions rather than the surface's rescue. The skim of honest thickness, over the undercoat of honest plane, in the room of honest climate, does not craze, and the program's drying gate checks the conditions rather than patching the symptom. Where crazing appears, the reading goes back to the cause, thickness, suction, or draught, and the correction goes to the cause too, because the surface that has drawn its map is telling the program where its conditions were broken.

## The two photographs, and the file between them

The program photographs the wall twice, after the undercoat and after the skim, because the photographs hold what the memory smooths: the plane before it was covered, the surface before it was painted, and the dates that let the maintenance decade read its inheritance honestly. The file between the photographs holds the reading, the batches, the weather, and the gates' findings, and the whole record costs less than one hour of the day it documents. The quality article's closing argument is the file's: the wall built with gates and recorded honestly is the wall whose quality survives the people who made it.

## The bead lines, read with the level

The bead lines are the wall's straightest claims and the program reads them with the level: the arris that runs plumb, the skirting line that runs level, and the arch that runs true to its curve. The beads set by eye are the lines the lamp finds, and the program's gate is the line the level reads rather than the line the memory defends. The bead's inspection is honest because the geometry is honest, and the corner that passes the level passes the decade of vacuum cleaners that follows.

## The dust and the cleanliness, gates nobody photographs

The program's quietest gates are the ones nobody photographs: the background's cleanliness before the first coat, the bucket's cleanliness between batches, and the surface's cleanliness before the decoration. The dusty bond is the hollow's parent, and the cleanliness the craft polices is procedural rather than aesthetic. The workmanship the building standards frame [6](https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/) assumes the clean wall, and the program's quiet gates are how the assumption is kept.

## The program's closing gift, evidence over adjectives

The quality article's closing gift is the same as its opening question: evidence over adjectives. The wall that is smooth is also measured, the wall that is flat is also ruled, and the wall that is dry is also tested, and the program's records turn the adjectives into the numbers the file keeps [6](https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/). The gift is cheap on the day and priceless in the decade, because the maintenance steward who inherits numbers maintains with confidence, and the steward who inherits adjectives maintains with guesses. The two-coat system deserves the numbers, and the program that keeps them is the system's last honest coat.

## The lighting instrument, the program's cheapest and truest

The quality article closes with the instrument it trusts most, because the torch is the program's whole philosophy in one hand. Held flat to the wall and moved slowly, the torch prints the surface's honesty in shadow: the trowel mark, the pinhole, the crazed patch, the proud bead, and the patch that was never truly feathered. The program walks the wall with the torch before the skim is accepted, before the decoration is booked, and once at handover with the room's own lamps, because each pass finds what the previous pass left, and the wall that survives the torch survives the decades. No gauge in the program's kit costs less, and none tells more, and the quality article's last recommendation is the apprentice's first: own a torch, and trust what it says.

## The coat's own calendar, checked against the record

The program's last check is the calendar's, because the coats' honest timings leave dates that the file can verify: the undercoat's set before the skim, the skim's working time respected, and the drying's days between the polish and the decoration. The wall that was hurried tells the calendar's story in its surface, and the program that keeps dates keeps the proof that it was not. The calendar gate costs the file a few lines and buys the wall's whole defence, because the hurried wall cannot blame the materials whose dates the record clears [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf), and the honest wall never needs to blame anyone at all.

## The final gate, the wall's public debut

The program's final gate is the handover itself, read in the two lights the room will own: the daylight that shows the wall's plane and colour, and the evening lamp that shows its texture and truth. The wall passes its debut when it passes both, and the file's last photograph is taken from the positions the maintenance decade will return to, so that the wall's story can be compared honestly for as long as the building stands. The gate costs a morning and pays the building's whole decorative life, because the wall that debuts honestly never has to explain a second beginning.

## References

1. British Gypsum, *White Book: Plaster systems*.
2. British Gypsum, *Installation Guidance: Thistle MultiFinish*.
3. British Gypsum, *Declaration of Performance: Thistle undercoat plaster range*.
4. CEN, *EN 998-1, Specification for mortar for masonry, Part 1*.
5. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
6. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a worker plastering a wall with care, photographed by Johnnybam and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle4$, 8, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Plastering_the_Wall_with_Care.jpg/1280px-Plastering_the_Wall_with_Care.jpg')
, ('gb-wet-plaster-maintenance-repair', 'UK Wet Plaster Walls: Maintenance and Repair', 'A British maintenance guide for two-coat wet plaster walls: reading cracks and hollows, patching in the wall''s own materials, the repaint cycle, and the heritage handoffs that deserve specialists.', $wallarticle5$# UK Wet Plaster Walls: Maintenance and Repair

A wet plastered wall is the most repairable surface in the British finish family, because its materials are universal and its craft is local: this article is the householder's and steward's guide to keeping the surface honest for the decades it was built to carry.

## The annual read, and what it looks for

The maintenance calendar begins with a read in raking daylight: hairlines that have appeared, hollows that sound different, stains that have grown, and the corners where life leaves its marks. The wall's honest signals are few and legible, and the pencil marks the year's small list before it becomes the decade's large one.

## Cracks, read before they are filled

A crack is the wall talking, and the honest reader listens before filling. Hairline shrinkage cracks near openings are movement being ordinary; a crack that grows season by season is a structural story that belongs to a surveyor; a stain that follows a crack is water telling its route, and the fix begins above the ceiling or behind the pipe, never on the surface [5](https://www.newbuildinspections.com/wp-content/uploads/2024/07/nhbc-good-brickwork-guide.pdf).

## The patch, in the wall's own materials

The patch repair is the system run in miniature: cut back to sound, match the suction, fill with the undercoat materials for the deeper wounds and the finish plaster for the surface, and work the boundary so the patch feathers into the field rather than announcing itself. The manufacturer's mixing and application guidance governs even the smallest bucket [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf), because the plaster that sets wrong in a patch crazes exactly like the plaster that set wrong on the wall.

## The repaint, and the seal it depends on

The repaint cycle is the surface's renewal, and it begins with the same drying gate the new wall obeyed: the wall dry, the mist coat thinned as the paint's data sheet states, and the full coats at the can's spreading rate. The workmanship the building standards expect of the wall's life [6](https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/), extends to its decoration, because the paint is the wall's last coat and its first defence.

## The specialist handoffs, named kindly

Some repairs belong to specialists, and the honest article names them: the ceiling that bows wants its fixings checked, the wall that moves wants a surveyor, and the heritage plasterwork that deserves its traditions wants hands that speak lime fluently. The repair that is handed off honestly is the repair that ends the story, and the church walls in the cover photograph, worked by people who keep the old surfaces alive, are the closing image of what maintenance done well preserves.

## The wall's enemies, named honestly

The maintenance article names the wall's enemies in order of frequency: water, movement, and impact. Water arrives as the leak, the stain, and the tide mark, and it is diagnosed at its source, above the ceiling or behind the pipe, because the wet plaster that has been genuinely soaked is replaced rather than decorated [5](https://www.newbuildinspections.com/wp-content/uploads/2024/07/nhbc-good-brickwork-guide.pdf). Movement arrives as the crack that grows, and it is referred rather than filled. Impact arrives as the dent, and the dent is the patch repair's ordinary customer, filled in the wall's own materials and feathered to the field.

## The older wall's dignity, and its traditions

The older plastered wall carries its history in its surface, and the honest maintenance keeps the history rather than erasing it: the gentle repairs that respect the wall's existing texture, the breathable coatings the older building's fabric needs, and the recognition that a wall plastered in another century belongs, when it needs major work, to hands that speak its dialect. The conservation handoff is not defeat, it is the same triage the article began with, extended to the building's old age, and the steward who makes it kindly is the steward whose walls outlive the argument.

## The annual walk, written as a script

The maintenance calendar deserves its script: the slow circuit in raking daylight, the pencil for the small list, the hollow test at the corners the furniture hides, and the glance at the rainwear and plumbing the wall's stains implicate. The walk takes ten minutes and prevents the year's small honest from becoming the decade's large expensive, and the script's last line is always the same: write it down, because the wall's file is the next repair's inheritance.

## The record, the wall's cheapest maintenance

The wall's record, specification, dates, colours, and the walk's findings, turns every future repair from archaeology into appointment, and the repaint chosen because the record named the last one is the repaint that matches. The maintenance article's cheapest tool is the pencil and its most neglected one is the file, and the wall that has both keeps its surface honest for the generations the system was built to carry. The closing image is the cover photograph's promise: the church walls worked by people who kept the old surfaces alive are what every maintained wall becomes when the keeping is done kindly and the record is kept honestly.

## The patch repair's honest sequence

The patch repair deserves its sequence told in full, because it is the maintenance article's most used lesson. The wound is cut back to sound material, the feather's boundary drawn generously, and the background's suction read and treated as the new work was, because the patch is a small wall and obeys the same physics. The deeper wounds take the undercoat materials, ruled and keyed as the wall once was; the surface takes the finish plaster, mixed to the guidance's clean water and stated ratio [2](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-thistle-multifinish.pdf) and worked through the same stages the wall was worked through. The patch dries on the wall's own calendar, and the paint that seals it respects the same gate. The patch done to this sequence is invisible in a year and honest in a decade, and the patch done any other way is the maintenance article's recurring character.

## The wall's neighbours, and the trades it keeps

The wet plastered wall keeps company with the building's other stories, and the maintenance steward keeps an eye on the neighbours. The masonry behind the plaster has its own damp and movement stories, and the plaster's stains are often the masonry's headlines. The fixings the wall carries owe it the right anchors and the honest weights. The floor and ceiling the wall meets owe it their movement joints, and the crack that follows the junction is the building asking for one. The steward who reads the neighbours kindly is the steward whose wall tells fewer stories, and the maintenance article's last skill is knowing which stories belong to other crafts.

## The repaint's own sequence, kept honest

The repaint is the maintenance article's closing craft, and it runs the chain's own sequence in miniature: the wall washed so the new coats bond to the wall rather than the decade's dust, the repairs filled and sealed before the colour, the mist coat thinned to the paint's data sheet and applied as a sealer rather than a first attempt, and the full coats rolled at the can's stated rate with the edges cut in and the laps dried invisible. The repaint done to this sequence restores the surface for another cycle, and the repaint done to the calendar rather than the wall is the surface's early retirement notice. The honest sequence is the article's last lesson and the wall's last coat's first condition, and the steward who keeps both keeps the surface young for the generations it was built to carry.

## The closing walk, and the article's farewell

The maintenance article ends with the walk it began with, because the walk is the whole article in one habit: the raking light, the pencil, the small list, the file updated, and the wall left to its quiet decade. The wet plastered wall that is walked annually, repaired promptly, and repainted honestly is the British finish family's longest lived member, and the farewell is the trade's own: the wall keeps its history, and the steward keeps the wall.

## The steward's closing credo

The maintenance article closes with the credo small enough to pin inside the shed door: walk the wall yearly, read before filling, patch in the wall's own materials, respect the drying before the painting, hand the heritage to its specialists, and keep the file. The credo is the whole two-coat system compressed to a pocket card, and the walls kept by it are the proof across every British street the system covers. The wet plastered wall is the most repairable surface the finish family owns, and the steward who keeps it honestly is holding up the oldest and best promise in the British finish library: a surface built by hands that knew their materials, kept by hands that read them, and handed on with its story intact.

## The specialist paragraph, the honest end of the DIY map

The maintenance article ends by drawing its own boundary honestly, because the boundary is the article's kindness. The patch the householder can feather is the maintenance article's gift; the ceiling that bows, the crack that moves, the damp that returns, and the heritage that deserves its dialect are the specialist's, and the wall that reaches its specialist promptly is the wall that reaches its next decade cheaply. The boundary moves with the householder's honesty about their own patience, and the article's last sentence is the boundary's whole map: know what the wall is saying, and know whether the reply is a filler knife or a phone call.

## The fixings paragraph, the wall's everyday question

The wet plastered wall answers the everyday question better than any of its cousins, because the dense plaster surface takes the picture hooks and the light shelves with the ordinary wall plugs the shelf stocks, and the fixings driven into sound plaster hold what the packet promised. The heavier duties, the television brackets and the heavy mirrors, ask for the masonry behind, found by the stud of the tapping technique the wall rewards, and the fixing's honesty is the maintenance article's small everyday lesson: match the fixing to the weight, not to the optimism, and the wall holds both quietly. The paragraph belongs in the maintenance article because the wall's fixings are its most frequent audience, and the surface that keeps its fixings keeps its occupant's respect.

## References

1. British Gypsum, *White Book: Plaster systems*.
2. British Gypsum, *Installation Guidance: Thistle MultiFinish*.
3. British Gypsum, *Declaration of Performance: Thistle undercoat plaster range*.
4. CEN, *EN 998-1, Specification for mortar for masonry, Part 1*.
5. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
6. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows workers mixing plaster and continuing plaster work on church walls, photographed by the National Park Service and released into the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and its status was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle5$, 8, 'maintenance', 'https://upload.wikimedia.org/wikipedia/commons/3/31/Workers_mix_plaster_and_continue_plaster_work_on_church_walls._%2811167792-5535-4064-b241-45d7b3e39df8%29.jpg')
) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='GB' AND t.candidate_key='assembly:gb-two-coat-wet-plaster'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;


UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='GB' AND t.market_code='GB'
  AND t.candidate_key='assembly:gb-two-coat-wet-plaster'
  AND a.wall_topic_id=t.id AND a.wall_market_code='GB' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
