-- Third GB researched-candidate topic: dot and dab plasterboard drylining over masonry.
-- Registered as verification_status='candidate'; admin promotion gate unchanged.
-- Articles remain drafts. Cover photographs per the 2026-10-26 owner directive.
-- Theme keys use the canonical registry values (overview, materials, installation, quality, maintenance).
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='GB' AND candidate_key='assembly:gb-dot-and-dab') THEN
  INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type,verification_status)
  VALUES ('GB','assembly:gb-dot-and-dab','Dot and dab plasterboard drylining over masonry','finish_assembly','candidate');
END IF; END $$;

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,mp.default_language
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON true
JOIN public.market_profiles mp ON mp.country_code=t.market_code
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-dot-and-dab'
ON CONFLICT(topic_id,theme_key,language_code) DO NOTHING;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t
CROSS JOIN (VALUES
  ('British Gypsum, Installation Guidance: Gyproc DriWall Adhesive','https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-gyproc-driwall-adhesive.pdf','British Gypsum','Dab pattern, 20 percent minimum contact area, continuous trowel band, setting times'),
  ('British Gypsum, White Book: DriLyner Dab','https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-drilyner-dab.pdf','British Gypsum','DriWall Adhesive as gypsum-based bonding compound for dot and dab fixing to masonry'),
  ('British Gypsum, Gyproc DriWall Adhesive FAQs','https://www.british-gypsum.com/download-documents/product-updates/gyproc-driwall-adhesive-faqs.pdf','British Gypsum','Minimum 2 hour set, weather and site dependence'),
  ('British Gypsum, Product Update: Gyproc DriWall Adhesive (May 2024)','https://www.british-gypsum.com/media/106206/download?attachment','British Gypsum','Revised formulation, purity and particle size consistency'),
  ('British Gypsum, White Book: Finishes','https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-finishes.pdf','British Gypsum','Low-permeability coverings restrict drying of water-based adhesives'),
  ('SpecFinish, Review of British Standard BS 8212 begins','https://specfinish.co.uk/review-of-british-standard-bs-8212-begins/','SpecFinish','BS 8212 status since 1995 and harmonised standard review'),
  ('NHBC, Good craftsmanship guide: brickwork and blockwork','https://www.nhbc.co.uk/','NHBC','Masonry background requirements'),
  ('Scottish Government, Building standards technical handbook 2017: domestic','https://www.gov.scot/publications/building-standards-technical-handbook-2017-domestic/','Scottish Government','Workmanship and substrate standards')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-dot-and-dab'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t
CROSS JOIN (VALUES
  ('Image credit: Elm Place gypsum board interior wall (Marina-Shehata, CC0)','https://commons.wikimedia.org/wiki/File:Elm-Place-Dry-Wall-Gypsum-Board-Interior-wall.jpg','Wikimedia Commons','Cover photograph overview article, CC0'),
  ('Image credit: Drywall and tools (Timothyjosephwood, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Drywall_and_tools.jpg','Wikimedia Commons','Cover photograph materials article, CC BY-SA 4.0'),
  ('Image credit: Gib board tapered edges 01 (Panamitsu, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Gib_board_aka_plasterboard_tapered_edges_01.jpg','Wikimedia Commons','Cover photograph installation article, CC BY-SA 4.0'),
  ('Image credit: Dry wall (MrBeastRapper, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Dry_wall.jpg','Wikimedia Commons','Cover photograph quality article, CC BY-SA 4.0'),
  ('Image credit: Drywall with a thermostat (MrBeastRapper, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Drywall_WITH_A_THERMOSTAT_%21.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 4.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-dot-and-dab'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'GB','GB',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('gb-dot-and-dab-overview', 'UK Dot and Dab Drylining: Chain Overview', 'A British overview of dot and dab: the gypsum dabs that bond plasterboard to masonry, why the method dominates modern UK drylining, when it is the wrong choice, and the jointing and paint work that follows.', $wallarticle1$# UK Dot and Dab Drylining: Chain Overview

Dot and dab is the British trade name for direct bonding plasterboard to a masonry wall with dabs of gypsum adhesive rather than a stud frame. British Gypsum defines Gyproc DriWall Adhesive as a gypsum-based bonding compound for exactly this purpose, "dot and dab" fixing of plasterboards to masonry backgrounds [2](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-drilyner-dab.pdf). It is fast, it is thin, and on the right wall it is the cheapest honest way to a flat internal face.

The chain reads in one sentence: prepare the masonry, apply adhesive dabs in a regular pattern covering a minimum of twenty percent of the board area, press the board home, let the adhesive set, then joint, tape and finish as any drylined wall [1](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-gyproc-driwall-adhesive.pdf).

## Why the method dominates

Three advantages explain the method's reach across British housing. It adds almost no thickness, because the board sits on dabs perhaps ten to fifteen millimetres proud of the wall rather than on a stud zone. It needs no timber or metal frame, so it is quicker and cheaper than drylining on studs, and it works directly on dense blockwork and brick. And it leaves the board face flat even where the masonry behind is not, because the dabs can be varied in thickness to flatten a wavy wall.

The method's fourth advantage is its best-kept secret: the void between board and wall is a service zone for cables and small pipes, and the plasterboard's thermal and acoustic performance is often better than the bare masonry it covers.

## When the method is wrong

The same void that is an advantage in the dry case becomes a trap in the wet one. A wall with rising damp, penetrating damp, or heavy condensation should not be drylined in dot and dab without a proper damp remedy first, because the adhesive and the board's paper face both dislike sustained moisture, and the void hides the evidence until the wall is ruined.

Dot and dab is also the wrong answer where the building's performance depends on the masonry being seen: heritage walls that must breathe, walls carrying external rainwater goods that wet the face, and situations where the wall's thermal continuity matters and a continuous insulated lining would be better than a thin adhered one.

Where the wall needs insulation, a proprietary insulated drylining board with its own adhesive system is the sensible upgrade, and where the wall needs a service zone for ducts, a framed system is more honest than cramming the void.

## The standards map

The work sits at the meeting point of three documents. BS 8212 has governed drylining and partitioning practice since 1995 and remains in force while a harmonised European standard is developed [6](https://specfinish.co.uk/review-of-british-standard-bs-8212-begins/). British Gypsum's White Book DriLyner Dab chapter gives the system's design rules [2](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-drilyner-dab.pdf), and the installation guidance for the adhesive gives the workmanship rules, including the twenty percent contact area and the continuous trowel band [1](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-gyproc-driwall-adhesive.pdf).

## The chain's five articles

The overview article you are reading sets the scene. The materials article covers the adhesive, boards, beads and tapes. The installation article walks the wall from preparation through dabs and boards to the finished, filled joints. The quality article sets the checks that catch a hollow or damp-prone job before it is decorated. The maintenance article covers fixing to dabbed walls, patching and the damp question that decides whether a dabbed wall can stay.

## What a reader should take from the overview

A reader who finishes this overview should be able to answer three questions. Is this wall a candidate for dot and dab? It is, when the masonry is sound, dry, and fairly even, and when a thin lining suits the room. Is this wall a candidate for something else? It is, when damp or heritage constraint rules the method out, and the article has named the alternatives. And what happens after the board is up? The joints, tapes and finish follow exactly as they do on a stud wall, which is why the chain's later articles share so much with the plasterboard chain's.

Those three answers carry the deciding before any material is ordered, and the deciding is what keeps a cheap method from becoming an expensive mistake.

## The method's family tree

Dot and dab is one entry in a family of direct-bonding systems. Bonding compound has been used to stick plasterboard to masonry since the middle of the twentieth century, and the modern gypsum adhesive is the family's most controlled member: factory-blended powder, predictable set, and a documented contact requirement. Its cousins include insulated adhesive-bonded linings, plaster-based parge coats on uneven walls, and the older practice of sticking boards with dabs of bonding plaster where the background allows. The family resemblance is the principle: the wall itself is the support, and the board's flatness is made in the adhesive layer rather than in a frame.

British practice settled on dot and dab for the same reason it settled on plasterboard for ceilings: it removed labour from the wall at scale. A pair of dryliners can line a room's masonry in a morning, where a stud frame plus insulation plus boarding is a two-day conversation, and the difference in cost is what put the method into nearly every volume house built in the last four decades. The method's spread is also the reason its failures are so numerous: a fast cheap method applied without its guidance multiplies fast cheap mistakes, and the trade's repair literature reads like a catalogue of dabs applied too few, too far from edges, or onto walls that were never dry.

## The void, described honestly

The space between the board and the wall is the method's defining feature, and it deserves a paragraph of its own. In the dry, well-detailed case the void is an asset: it carries cables, it breaks the direct path for sound through the wall at some frequencies, and it lets a cold wall's face be separated from the warm room. In the wet or poorly detailed case the same void is a condenser, a cable route for damp, and a place where mould can grow unseen until the board's paper face stains.

The honest description of the void is therefore conditional, and the condition is water. Every dot and dab decision in the rest of this chain's articles reduces to whether the void will stay dry.

## The British housing context

British housing stock makes the method's questions urgent rather than academic. Solid brick walls, blocked-up fireplaces, external render failures and 1930s cavity walls with bridged ties all put moisture near the internal face, and a dot and dab lining on any of them is a lining standing on a promise the wall may not keep. The maintenance article's damp question is the British question, and the quality program's moisture survey is the British gate.

## The sound question

Dot and dab's acoustic behaviour is often better than the bare wall's, and the reason is worth stating because it is used to sell the method. The board's mass, the soft adhesive dabs, and the air in the void form a layered system that absorbs some of the sound energy that would otherwise cross a rigid wall directly. The improvement is real, and it is frequency-dependent and modest, and any claim beyond that belongs to a tested system rather than to the method in general.

Where sound separation matters, the specification moves up to acoustic boards and a system that has been tested as a whole. The overview's job is to say that the method has an acoustic dimension and to refuse the folklore that any dabbed wall is a soundproof wall.

## Fire and the wall's layers

A dabbed lining is part of the wall's fire performance, and the board family chosen determines what that performance is. Standard wallboard resists fire for a period the system's documentation states, fire-rated board resists for longer, and the joints, the fixing pattern and the cavity details all participate. The lining that ignores its fire role is a lining that may pass a room's decoration review and fail a building's compliance review.

The practical instruction for a reader is that the board's name, not the adhesive's, carries the fire conversation, and the system documentation is where the numbers live.

## Thermal continuity, named honestly

Dot and dab improves a wall's thermal performance mainly by adding a layer the room feels, and it does not fix thermal bridging at junctions. The dabs themselves are the method's thermal weakness: each dab is a small bridge between the cold wall and the warm board, and the industry's answer is the insulated board system where the insulation is continuous and the adhesive is designed for it.

A reader comparing a plain dabbed wall with an insulated one should compare the whole wall's U-value and not the board's label, and should ask the junction question at the same time. The overview names this because the maintenance decade will meet it as condensation at the cold corner, and the corner was decided at specification.

## The detail that separates a good job from a lucky one

The good job and the lucky job look identical at handover. The difference is in the details the quality article will audit: the background was surveyed, the dabs were patterned to the guidance, the boards were set true, the set was respected, the joints landed on tapers, and the file kept the evidence. None of those details is expensive. All of them are invisible a month later, and all of them decide whether the wall's tenth year looks like its first.

## A short history of the British lining

The British internal wall has been relined with almost every material the islands could buy. Timber lath and lime plaster held the walls for three centuries, plasterboard on timber battens arrived between the wars, plasterboard on metal studs industrialised the trade after 1945, and gypsum adhesive on dabs became the volume housebuilder's default as the twentieth century closed. Each transition kept the same promise, a flat internal face, and each one changed the labour that delivered it.

The dot and dab era is distinguished by how little it asks of the wall and how much it asks of the adhesive. The lath era asked the plasterer for three coats and a century of skill, the stud era asked the carpenter for a frame, and the dab era asks one trade for a survey, a mix and a pattern. That reduction is the method's genius and its exposure, because when the survey is skipped there is no frame to carry the wall's honesty and no plaster thickness to hide it.

## The reader's three questions

The overview's practical test is three questions asked in order. Is the wall sound and dry, asked with a meter and not a glance. Is the method right for the room, asked with the void's behaviour in mind. And is the finish planned, asked with the hanging schedule and the paint schedule already drawn. A wall that answers all three is ready for its dabs, and a wall that answers two is a wall that will answer the third in a repair.

## What the chain delivers

The five articles deliver a complete method: the survey and the decision here, the shelf in the materials article, the sequence in the installation article, the gates in the quality article, and the decade's care in the maintenance article. The reader who has read all five can hold a conversation with a dryliner, price a room, inspect a finished wall and plan its first repair, and that is the standard the chain holds itself to.

## References

1. British Gypsum, *Installation Guidance: Gyproc DriWall Adhesive*.
2. British Gypsum, *White Book: DriLyner Dab*.
3. British Gypsum, *Gyproc DriWall Adhesive FAQs*.
4. British Gypsum, *Product Update: Gyproc DriWall Adhesive (May 2024)*.
5. British Gypsum, *White Book: Finishes*.
6. SpecFinish, *Review of British Standard BS 8212 begins*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a gypsum board interior wall, photographed by Marina-Shehata and released under CC0 via Wikimedia Commons. It is a real photograph, not AI generated, and its status was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle1$, 8, 'overview', 'https://upload.wikimedia.org/wikipedia/commons/6/61/Elm-Place-Dry-Wall-Gypsum-Board-Interior-wall.jpg')
, ('gb-dot-and-dab-materials', 'Materials for UK Dot and Dab Drylining', 'A British materials guide to the dot and dab shelf: gypsum bonding adhesive, the board families, beads, tapes, jointing compounds and the fixings a dabbed wall will later need.', $wallarticle2$# Materials for UK Dot and Dab Drylining

The dot and dab shelf is short and honest: one adhesive family, the plasterboard families, the jointing consumables, and the beads that edge the work. Everything else on a dabbed job is the same material the other drylining chains use.

## The adhesive

Gyproc DriWall Adhesive is the reference product: a gypsum-based bonding compound mixed from powder with clean water and used within a ninety-minute working time [4](https://www.british-gypsum.com/media/106206/download?attachment). Its 2024 formulation was revised for higher purity and a more consistent particle size, which reads in the trade as a smoother mix and a dabbing action that holds its shape [4](https://www.british-gypsum.com/media/106206/download?attachment).

The adhesive takes a minimum of two hours to set, and British Gypsum's FAQs are honest that site and weather conditions shift that figure, recommending three to six hours before the boards are finished [3](https://www.british-gypsum.com/download-documents/product-updates/gyproc-driwall-adhesive-faqs.pdf). A specification that plans the finishing pass inside two hours is a specification arguing with the product.

## The boards

Standard wallboard suits most dry, warm rooms. Moisture-resistant board belongs in kitchens and bathrooms, fire-rated board on compartment walls and ceilings that need it, and acoustic board where sound separating matters more than cost. The board's taper matters to the jointing that follows: the tapered edge is what lets tape and filler finish flush, and the quality article treats the taper as a checked feature rather than an accident of manufacture.

Insulated plasterboard, with its own factory-applied insulation and compatible adhesive, is the upgrade where a dabbed wall must also reduce heat loss. It follows the same method with heavier sheets and a stricter fixing discipline, and the adhesive manufacturer's own system rules should be followed rather than mixed across brands.

## The jointing consumables

Tape, jointing compound and the filling knives the plasterboard chain's materials article describes apply unchanged here. The one addition worth naming is the beads: corner beads protect the external angles that dot and dab walls always seem to create, and stop beads terminate the lining where it meets a reveal or a door frame.

## The fixings that follow

A dabbed wall is a cavity wall on the inside face, and the fixings that later hang the kitchen cabinets must know it. Cavity fixings, resin anchors into the masonry behind, and the timber pattresses that a sensible job sets into the dabs before the board goes on all belong in the materials conversation, because the maintenance article's first question about any dabbed wall is what will be fixed to it later.

## What the shelf cannot sell

The shelf cannot sell a dry wall. Dot and dab's adhesive is water-based, and the product's own guidance warns that low-permeability coverings restrict the drying of water-based adhesives, so the covering chosen for the finished wall must tolerate the system's drying behaviour [5](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-finishes.pdf). It cannot sell even masonry either, and the quality article's plumb and dab-pattern checks are where that honesty gets proved.

## The adhesive's working character

The ninety-minute working time and the two-hour minimum set are the numbers the programme is built around, and the trade's experience of the product matches the datasheet's tone. The mix is stiff enough to hold its shape on the trowel and wet enough to bond, and the distinction between a dab that spreads under the board and a dab that sits like a pebble is the hand skill the method rewards. Over-mixed adhesive stiffens early, and adhesive mixed thin slumps and starves the contact area, so the mixing discipline the plaster articles describe applies here with the same force.

The 2024 formulation change matters in practice because consistency of the powder changes the amount of water needed and the feel of the dab, and a site that learned the old mix by eye must learn the new one by the measuring jug. Product updates are the quietest documents in construction and among the most consequential, and this one is a small example of why the file keeps them.

## Boards, tapers and the joint that follows

The board choice is the room's decision more than the method's. A dry living room takes standard wallboard, and the taper on its long edges is the shallow valley the jointing will fill. A bathroom takes moisture-resistant board, and its face repels the splashes while its edges still behave like plasterboard at the joints. A wall that must resist fire takes the rated board, and the fixing pattern and joint treatment that come with the rating are part of the board's contract with the building.

The one board rule that belongs in every conversation is that cut edges are not tapers. A joint made on cut edges needs a different treatment, and a dabbed wall full of cut-edge joints is a wall that will telegraph every one of them under raking light. Planning the board layout so that tapers meet tapers is the materials article's contribution to the quality article's success.

## Beads, adhesives and the insulated variant

Beads are the method's corners: thin galvanised or plastic profiles that protect the angles and give the plasterer or jointing compound a straight edge to work to. They are cheap, they are quick, and a dabbed wall without them has corners that crumble in the first year of use.

Insulated plasterboard on dabs is the method's heavier cousin. The insulation is factory-bonded to the board, the adhesive must be the system's own, and the fixing must carry the extra weight. The upgrade is worth it where the wall is cold and dry, and it is not worth it where the wall is damp, because insulation on a wet wall is a blanket on a fever.

## Adhesive quantity, and the arithmetic the trade skips

The adhesive bag's coverage is a quantity the specification should meet and the site should verify. A board's dab pattern at twenty percent contact uses a calculable amount of adhesive per square metre, and a job that has used half the expected bags has either found a miracle or skipped the pattern. Counting bags against boarded area is the cheapest honest audit in the method, and it belongs beside the knuckle test in the quality article's toolbox.

## Jointing compound, tape and the finish shelf

The jointing shelf is shared with every plasterboard chain and deserves the same discipline: setting compounds for speed, air-drying compounds for breadth, paper tape for strength at the flats, and the corner tools that make an external angle look like a corner rather than a repair. The dabbed wall changes nothing here, and the materials article resists inventing a speciality where none exists.

## Fixings, from shelf to boiler

The fixing shelf is where a dabbed wall's future is decided. A light shelf needs a cavity anchor, a frame needs the same anchor in a stronger grade, a boiler or a wall-hung basin needs a resin anchor into the masonry or a pattress set behind the board, and a television bracket needs the pattress without exception. The materials article's advice is to buy a small assortment of cavity fixings and a few resin anchors with every dabbed wall's decoration budget, because the wall will ask for them and the household that owns the assortment rarely fails twice.

## The insulated board's own shelf

Insulated plasterboard carries its own material questions: the insulation's thermal conductivity, the board's thickness, the adhesive's compatibility, and the fixing's length. The system's documentation answers all four, and the trade's worst habit is mixing brands of board and adhesive because one was on offer. A dabbed insulated wall is a system, and systems are bought as systems.

## What the shelf cannot sell, once more

The shelf cannot sell a flat wall, a dry background, or a first board that is true. Those three are bought with labour, patience and the survey that starts the installation article, and the materials article's last honest line is that the cheapest item on a dot and dab job is the board, and the most expensive is the mistake.

## Storage and the site's small civilities

Board and adhesive both dislike the back of a wet van. Boards are stored flat on a level surface, adhesive bags on a pallet clear of the ground, and both are kept out of standing water and direct sun. The ceramics of storage are unglamorous and the wall pays for them: a board stored on its edge for a fortnight has a memory of the floor that the taper will show.

## Mixing water and the clean bucket

The mixing water must be clean, the bucket must be clean, and the mixer must be the drill paddle the adhesive's instructions expect. A dirty bucket seeds the mix with set gypsum, which accelerates the set unpredictably, and a mix that sets in the bucket is a mix that has been mixed twice. The trade's habit of a dedicated adhesive bucket is one of those small disciplines that separates a professional dryliner from a fast one.

## The adhesive's shelf life

The powder's date matters. A bag that has taken damp during storage sets lumpy and bonds weakly, and a site that buys adhesive in the depth of winter and stores it in an unheated container has bought a lottery. The materials article's instruction is to read the batch date and to reject any bag with visible lumps before mixing, because the wall cannot audit the bag after it is covered.

## The consumables a room actually needs

A typical room's dot and dab consumables list fits on a card: adhesive by the estimated coverage, boards by the room's square metreage plus ten percent, a bead per external angle, a roll of tape, two bags of jointing compound, and a dozen cavity fixings held back for the occupier's first month. The card is short because the method is short, and a shelf that grows beyond the card is usually a sign that the survey found a wall the method cannot answer.

## Board quantities and the waste rule

The waste rule is ten percent for a simple room and fifteen for a room with reveals and angles, and the rule exists because the method's boards are cut once and used once. Offcuts that fit a reveal are kept beside the wall they belong to, not carried to the skip, and the site's discipline about offcuts is a small line in the materials article with a large line in the budget.

## References

1. British Gypsum, *Installation Guidance: Gyproc DriWall Adhesive*.
2. British Gypsum, *White Book: DriLyner Dab*.
3. British Gypsum, *Gyproc DriWall Adhesive FAQs*.
4. British Gypsum, *Product Update: Gyproc DriWall Adhesive (May 2024)*.
5. British Gypsum, *White Book: Finishes*.
6. SpecFinish, *Review of British Standard BS 8212 begins*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows plasterboard cuts with the tools of installation and maintenance, photographed by Timothyjosephwood and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle2$, 8, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Drywall_and_tools.jpg/1280px-Drywall_and_tools.jpg')
, ('gb-dot-and-dab-installation', 'Dotting and Dabbing a Wall: Installation', 'A British installation sequence for dot and dab: dry sound masonry, the dab pattern that gives twenty percent contact, the board placement, the setting window, and the jointing that follows.', $wallarticle3$# Dotting and Dabbing a Wall: Installation

The installation article walks the wall in the sequence the guidance sets: background, dabs, board, setting time, joints. Each gate is small and each one carries the next.

## Background preparation

The wall must be sound, dry and reasonably even before the adhesive meets it. Loose material comes off, dust comes off, and heavy suction is controlled so that the adhesive's water is not stolen before the gypsum can set. The background check is the same wall survey the other chains describe, and the NHBC craftsmanship guidance on masonry backgrounds is the reference discipline [7](https://www.nhbc.co.uk/).

Where the wall is very uneven, the deepest dabs may need a levelling approach before the boards go up, because a dabbed board can only flatten the wall by the thickness of adhesive it carries, and a hundred-millimetre dab is not a dab, it is a problem.

## The dab pattern

The guidance is direct: dabs applied in a regular pattern giving a minimum of twenty percent contact area between board and background, with a continuous trowel-applied band where the system calls for it, and dabs kept at least twenty-five millimetres from the board edges [1](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-gyproc-driwall-adhesive.pdf).

The twenty percent is not decoration. The adhesive carries the board's weight, resists the loads the finished wall will see, and seals the board to the wall in a way that resists air movement behind. A dab pattern of four thin blobs per board passes an untrained eye and fails the guidance, and the quality article's audit is built to catch exactly that.

## Board placement and setting

Dabs are applied for one board at a time, and the board is pressed home and checked plumb and flat while the adhesive is still soft. The board is tapped with a straight edge or a level rather than kicked into position, and once it is true it is left alone.

The set takes a minimum of two hours, and the guidance recommends three to six hours before finishing [3](https://www.british-gypsum.com/download-documents/product-updates/gyproc-driwall-adhesive-faqs.pdf). The temptation to start taping inside the hour is the most common dot and dab failure on fast sites, and the wall remembers it as a hollow or a crack at the joint.

## Sequential working

The boards go up in a run, each one dabbed and pressed against the last, with the joints landing where the board manufacturer's edge profile expects them. Boards are staggered so that a vertical joint does not run the full height of the wall, and the cut edges are kept away from the joints where the taper can be used.

## The joints and the finish

Once set, the wall is jointed and taped exactly as the plasterboard chain describes: tape bedded in the compound, two or three fills, feathering either side of the taper, sanding back to a flat face. The quality article's joint checks apply unchanged, and the finish that follows is the mist coat and the emulsion the plasterboard chain's installation article sets out.

## Services and the void

Cables and small pipes can run in the dabbed void where the system allows, and the electrician and the plumber are consulted before the boards go up rather than after. The maintenance article's thermostat photograph is the visible face of that conversation: every service point on a dabbed wall is a designed hole, and designing it beats discovering it.

## Weather, warmth and the programme

The adhesive is a gypsum product and it likes normal site conditions. Very cold walls, very hot rooms and heavy draughts all disturb the set, and the programme that plans for the set is the programme that does not return. The dot and dab trade's own advice is to treat the wall as the product's partner: dry, sound, and patient.

## The first board, and why it sets the room

The first board of a run is the reference the rest of the wall follows. It is dabbed, set plumb, and checked with the level and the straight edge before the next board is offered up, because a first board half a degree out is a wall with a twist that no amount of taping hides. The dryliner's habit of checking the first board twice and every following board once is the whole craft in a sentence.

## The reveals, the skirting line and the awkward corners

Dot and dab's easiest mistake is at the edges of the room. Window reveals, door openings and the skirting line are where the lining meets the building's other trades, and each junction has a detail. The reveal must land square and at a consistent depth, the skirting line must be straight enough for the trim carpenter's skirting, and the ceiling junction must meet the ceiling that the same crew may or may not have lined.

The dab pattern at the skirting line deserves the continuous band the guidance allows, because the skirting is later fixed through the board there and a hollow line of dabs invites a loose skirting. The same logic applies at the ceiling line when a cornice or a shadow gap is planned.

## Sequencing with the other trades

The wet trades go first, the electrician's first fix goes in the void, the boards go up, the joints are finished, the painter takes the mist coat, and the second fix follows. Dot and dab compresses that sequence a little, because there is no frame cavity to coordinate, but the compression is where the errors live: a socket box that was not planned before the board went on is a hole cut in a finished wall.

The electrician and the dryliner should walk the room together before any dab is mixed, marking every box, every cable route and every point the void must carry. The thermostat photograph in this chain is what that walk prevents: a service point that looks designed rather than discovered.

## The finish, and the drying promise

The joints are finished exactly as the plasterboard chain describes, and the finish that follows is the same mist coat and emulsion. The one element unique to dot and dab is the drying promise: British Gypsum's finishes guidance warns that low-permeability coverings restrict the drying of water-based adhesives, so the wall's first covering should be chosen with the adhesive's moisture in mind [5](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-finishes.pdf).

The practical reading is simple. The wall dries through its face, the face needs to be able to give moisture away for the first weeks, and a vinyl covering applied too early traps the moisture the adhesive is still releasing. A breathable emulsion or a thin first coat respects the promise, and the maintenance article's recoating advice builds on the same rule.

## What the trades before the dryliner owe the wall

Every dot and dab wall inherits the work of the trades that came before. The brickwork or blockwork must be sound and cured, the plastering or rendering done, the damp proof course intact, the roof weathertight, and the service first fix complete enough that the void can be planned. A lining installed before the building is dry is the classic sequence error, and the method punishes it more than a stud wall does because there is nowhere for the fabric's moisture to go.

## Who the dryliner owes the wall

The dryliner owes the next trades three things: boards that are true, joints that land where the taper allows, and a void that is not full of mortar snots, cable offcuts and board trims. The last one is the least glamorous and the most frequent complaint from the electrician's second fix, and the dryliner's clean-out before the boards close the void is a small habit with a large reputation.

## The day's rhythm and the crew's discipline

A dot and dab day has a rhythm: survey, mix, dab, board, check, and move on. The crew that skips the check is a crew producing boards rather than walls, and the difference surfaces at the jointing stage when the taper is not where the taper should be. The rhythmic discipline is the same one the plaster articles describe, applied to adhesive instead of gypsum plaster, and it is learned the same way: by making enough walls that the check becomes automatic.

## The handover of the wall

The wall is handed over twice. Once to the jointing and painting trades, who need the boards set and the set complete, and once to the building's occupier, who needs the wall to be what the specification said. The installation article's last section is a one-page handover: the survey record, the dab photographs, the set times observed, and the finish inspection, because the wall's two handovers are the same handover and the file is the bridge between them.

## The final instruction to the crew

The installation article's final instruction is the craftsman's oldest: leave the wall better than the survey promised. A survey that found a wall of average evenness and a crew that left a wall of excellent flatness is a crew working within the method's gift, and the wall's decoration will spend a decade saying thank you.

## The wall's first week

The first week after the boards are set is the week the adhesive finishes its work. The wall is not loaded, not drilled and not coated with a covering that seals its face, and the site's other trades are told the same. A wall's first week is quiet by design, and the quiet is part of the specification.

## The set window in winter and in summer

The set window stretches in winter and quickens in summer, and the programme that fixes one number for both seasons is a programme that finishes early in July and late in January. The adhesive's own FAQ states the practical range, and the site's temperature log is the honest companion of the set clock.

## The boards that follow the first

The first board sets the plane, and the following boards follow it. Each one is dabbed, tapped to the plane, checked against the straight edge and left, and the run grows as a series of small decisions rather than a single gesture. The rhythm is the craft, and the craft is the wall.

## The clean-out and the close

Before the last board closes the void, the dryliner sweeps it: mortar snots off the masonry, cable offcuts out, and the dabs checked one last time where they can still be reached. The clean-out is three minutes per wall and the electrician's first fix is the trade that notices, and a wall that closes over a messy void is a wall that hums, rattles and stains.

## References

1. British Gypsum, *Installation Guidance: Gyproc DriWall Adhesive*.
2. British Gypsum, *White Book: DriLyner Dab*.
3. British Gypsum, *Gyproc DriWall Adhesive FAQs*.
4. British Gypsum, *Product Update: Gyproc DriWall Adhesive (May 2024)*.
5. British Gypsum, *White Book: Finishes*.
6. SpecFinish, *Review of British Standard BS 8212 begins*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows plasterboard tapered edges with the fixing screws visible along the taper, photographed by Panamitsu and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle3$, 9, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Gib_board_aka_plasterboard_tapered_edges_01.jpg/1280px-Gib_board_aka_plasterboard_tapered_edges_01.jpg')
, ('gb-dot-and-dab-quality-checks', 'UK Dot and Dab Quality Control', 'A British quality program for dot and dab drylining: background survey, dab pattern audit, the twenty percent contact proof, plumb and flat checks, and the damp question that overrides all of them.', $wallarticle4$# UK Dot and Dab Quality Control

The quality article turns the guidance into gates: each one is checkable, each one has evidence, and each one is answered before the next trade arrives.

## The background survey

The first gate is the wall itself. Sound, dry, dust-free, and even enough that dabs can do their work. The survey records moisture readings before the boards go up, because a dabbed wall hides its background, and a moisture problem discovered after boarding costs the whole lining.

## The dab pattern audit

The second gate is the pattern. The inspector checks that the dabs are regular, that the contact area reaches the twenty percent the guidance requires, that the dabs stay twenty-five millimetres clear of the board edges, and that any continuous band the system calls for is present [1](https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-gyproc-driwall-adhesive.pdf).

Proving the twenty percent before the board covers it is a photograph and a tape measure, and the panel that shows one board's dabs against a marked grid is the most useful sample panel on the job.

## Plumb, flat and the taper

The wall is checked for plumb with a level and for flatness with a straight edge, and the board faces are checked for the taper that the jointing needs. A dabbed board that is true to the eye and hollow to the knuckle is the failure the audit is built to catch, and the knuckle test is supplemented by tapping the wall in a grid before the jointing starts.

## The joint and finish checks

Once jointed, the wall is inspected as the plasterboard chain's quality article describes: joints flat and feathered, corners true, no pinholes, and the wall passing the raking-light inspection before decoration.

## The damp override

The last gate overrides every other gate. A dabbed wall with any hint of damp at the dab voids, at the skirting line, or at the reveal is a wall whose lining should not be completed until the source is found. The maintenance article treats this as the central question of the wall's life, and the quality program treats it as a stop-work condition rather than a snag.

## The records

The file keeps the survey readings, the dab photographs, the sample panel record, and the finish inspection, because a dabbed wall's future is only as honest as its file. The reader who built the wall and the reader who maintains it are the same reader at two different times of the building's life.

## The sample panel and the twenty percent proof

The most useful quality tool on a dot and dab job is a sample panel: one board's worth of dabs applied on a marked grid, photographed with a tape measure in frame, and signed off before the run begins. The panel turns the twenty percent requirement from a percentage in a document into a pattern the crew can copy, and the photograph becomes the evidence the file cites when a later inspection asks whether the pattern was followed.

## The knuckle test and the grid

Hollow-sounding dabs are the failure the finished wall cannot show, so the audit happens before the joints are filled. Tapping the wall in a regular grid, listening for the change in note, and marking the hollows for investigation catches dabs that failed to bond, boards pressed onto stiff adhesive, and the worst case, a dab pattern that was sparse from the start. The knuckle is not a precision instrument, but it is honest about the difference between a wall that is bonded and a wall that is only touching.

## Straightness, plumb and the room's square

The wall is checked for plumb in two directions and for flatness along its length, and the room's square is checked at the corners the lining defines. A dabbed lining can gently correct a room that was slightly out of square, but the correction must be deliberate and recorded, not the accident of where the boards landed. The straight edge, the level and the diagonal tape measure are the three tools of this gate.

## The finish inspection, and the raking light

The final gate is the finished wall read in raking light. Joints flat and feathered, no ridges, no pinholes, no shadow where the taper meets the field of the board. Raking light is unforgiving by design: it shows the wall as the evening lamp will show it, and a wall that passes raking light passes the room's own inspection.

## When the program stops work

The program has three stop conditions, and the inspector is empowered to call all three. The background is wet. The dab pattern is short. The void has been compromised by another trade. Any one of them is a conversation with the site manager before the next board goes on, and the conversation is cheaper than the wall's repair.

## The trail a good inspector keeps

The inspector's trail is the wall's diary. The background survey with its moisture readings, the sample panel photograph, the grid-tap notes, the plumb and flat record, the joint and finish inspection, and the raking-light photograph. Eight documents, one wall, and a year later the file answers every question the building will ask.

## The inspector's independence

The quality article assumes the inspector is not the crew that built the wall, and where the same person does both jobs, the article assumes the audit is performed as if it were a stranger's wall. The assumption is the difference between quality control and quality theatre.

## The snag and the stop-work, kept apart

A snag is a small defect the next trade can fix. A stop-work is a condition that must be resolved before the next trade starts. A dabbed wall's snags include a pinhole at a joint and a bead that needs a touch of filler. Its stop-works include a wet background, a sparse dab pattern, and a void compromised by a later chase. The program keeps the two lists apart because a stop-work treated as a snag becomes a wall's whole repair, and a snag treated as a stop-work becomes a site's whole week.

## The handover gate and the building's debut

The wall is handed to the decorator with the record complete and to the occupier with the finish inspection done. The raking-light photograph is the last item in the file and the first thing the building's maintenance decade will ask for, and a wall that passes both handovers does not need a second debut.

## The inspector's closing habit

The inspector's closing habit is the photograph. Every gate ends with a picture and a line in the record, because the wall cannot testify and the file can. The habit is also the inspector's protection, since the day a defect is disputed is the day the record earns its keep, and the record was made when the truth was still cheap.

## The wall that fails and the wall that passes

The wall that passes is unremarkable: flat, dry, true, finished. The wall that fails is remarkable only in hindsight, and its failures are the ones this program was written around: the wet background, the sparse dabs, the early finish, the compromised void. Reading the two walls side by side is the program's real curriculum.

## The straight edge and the shadow gap

The straight edge's test is the wall's own plane, and the shadow gap's test is the building's detail. Where a shadow gap profile meets a dabbed wall, the lining's edge must be set to the profile's line exactly, because the gap shows the wall's truth in a way no paint can. The program inspects the gap before the skirting and after it, since the skirting's line is the gap's final witness.

## The dab audit, done the boring way

The dab audit is deliberately boring: the supervisor pricks the set dabs at a handful of points per wall, listens for the hollow and solid answer, and writes the tally on the board. Ten pricks per room, two minutes each, and the record tells the truth about contact area better than any conversation, because a wall tapped with a knuckle is a wall that has been asked, and the asking is what makes the twenty percent claim real rather than rhetorical.

## The record a drylining job should leave

The record should leave the wall's biography in five lines: substrate and its preparation, adhesive and its mix, dab pattern and contact tally, board type and thickness, and the date each coat set before finishing. The biography is what the next trade checks before it screws anything to the wall, and what the building's steward checks when a fixing pulls loose a decade later, and both of them are owed the same five lines by the same file.

## The two questions every dabbed wall must answer honestly

Every dabbed wall faces two questions at handover, and the quality program exists to answer both with evidence rather than opinion. Is the wall where it should be? Plumb lines, laser and straightedge answer that one in millimetres. And is the wall stuck the way it claims? The dab audit, the contact tally and the set-time record answer that one in contact area and dates. A wall that passes the first question and fails the second is straight and hollow, which is the worst of both, and a program that checks only plumbness is a program that has answered the easy half.

## Why the last inspection belongs to the next trade

The dryliner's final inspection belongs, in practice, to the decorator who arrives next, because the decorator's first pass sees every board joint, every hollow dab and every proud edge in raking light. Inviting that trade in a week early, with a pencil and no paint, converts a stranger's complaint into the program's own finding, and a finding recorded by the program is a finding fixed under warranty rather than argued about on a price. The invitation costs a coffee; the argument it prevents costs a room.

A drylining job is a wall made of islands, and the quality program is the map that proves each island is where it promised to be, holding what it promised to hold, on the day it promised to set. The map costs a tap and a tally, and it is the only document the wall will ever need.

The inspector who writes the tally plainly is protecting the next trade, the next owner and the next decade, and the protection costs two minutes per room and a pencil.

## References

1. British Gypsum, *Installation Guidance: Gyproc DriWall Adhesive*.
2. British Gypsum, *White Book: DriLyner Dab*.
3. British Gypsum, *Gyproc DriWall Adhesive FAQs*.
4. British Gypsum, *Product Update: Gyproc DriWall Adhesive (May 2024)*.
5. British Gypsum, *White Book: Finishes*.
6. SpecFinish, *Review of British Standard BS 8212 begins*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a plain painted drywall wall face, photographed by MrBeastRapper and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle4$, 8, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Dry_wall.jpg/1280px-Dry_wall.jpg')
, ('gb-dot-and-dab-maintenance-repair', 'UK Dabbed Walls: Maintenance and Repair', 'A British maintenance guide for dot and dab walls: what they will hold, how to fix to them, patching and re-finishing, and the damp question that decides whether the lining can stay.', $wallarticle5$# UK Dabbed Walls: Maintenance and Repair

A dabbed wall is a good wall with a hollow behind it, and maintenance is mostly about respecting the hollow.

## What the wall will hold

A dabbed board carries its own weight and the finish on it. It does not carry a heavy cupboard without help. The fixings a dabbed wall needs are the cavity anchor that reaches the masonry behind, the resin anchor for heavy loads, and the pattress that the original installer should have set into the dabs behind the kitchen run. The wall's fixing map belongs in the building's file, and the maintenance article's advice is to build it if it is missing.

## Fixing to the wall

A shelf, a picture and a mirror are cavity fixing territory: the anchor spreads the load in the void rather than in the board. A television, a boiler or a wall-hung unit is the resin anchor or the pattress territory, and the fixing that ignores the difference is the fixing that fails in year three rather than year one.

## Patching a hole

A hole in a dabbed board is patched like any plasterboard repair: cut back to sound board, back the patch, fix the new piece, fill the joints, and refinish. The one addition is the void: the patch must not open a path for air or moisture into the cavity behind, and a dabbed patch should carry its own dabs where the hole is large.

## Repainting and recoating

The recoating cycle is the plasterboard chain's cycle: clean, assess, patch, spot prime, and repaint. The dot and dab addition is the note in British Gypsum's finishes guidance: low-permeability coverings restrict the drying of water-based adhesives, so a wall that is being re-covered in vinyl should be confirmed dry throughout, and the first covering should follow the system's own guidance [5](https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-finishes.pdf).

## The damp question

A dabbed wall is a cavity wall on the inside, and damp that reaches the void finds no drain. The maintenance routine is the same as the quality program's override: any tide mark, any soft board, any musty smell at the skirting line is investigated before the wall is recoated, and the source is fixed before the lining is repaired.

## When the lining comes off

Some dabbed walls reach the end of their life honestly: the board is soaked, the adhesive has failed, or the room is being rebuilt. Removing the lining is then a controlled job, and the mason's wall behind it is inspected and dried before the next lining is chosen, which may not be dot and dab at all.

## The specialised handoffs

Electricians and plumbers work on dabbed walls every week, and a maintenance regime that keeps their chase positions and service zones in the file is a regime that keeps the walls repairable. The thermostat photograph is the small visible reminder: every service on a dabbed wall is a designed interface, and designing it once is cheaper than discovering it twice.

## The fixing map, built before it is needed

The maintenance article's most valuable deliverable is not a repair technique but a document: the fixing map. Every dabbed wall has a structure behind it, and the map records where the dabs, the pattresses and the service zones are, so that the next owner hangs the cupboard on the dabs rather than through the hollow between them. A map made at first fix costs an hour and saves a wall.

## Patching, and the patch that stays flat

The patch sequence is short, and the sequence is what keeps the wall flat. Cut a neat rectangle back to solid board, cut a piece of the same thickness, back it with a batten or a patch plate, fix it clear of the finish plane, fill the joints, and treat the patch as a joint. The dabbed wall's extra rule is moisture: the patch must not bridge the void open to a damp background, and a patch over a suspected damp area is a patch that will fail.

## Recoating, and the sheen question

The recoating cycle is the plasterboard chain's cycle with the dot and dab rule attached: assess, clean, patch, prime, and repaint with a covering the wall can tolerate. Sheen choices are the decorator's decision, and the maintenance article's only addition is the wall's drying memory: a wall that was dabbed recently should not receive a low-permeability coating until the system's drying has finished.

## When the lining has to come off

Some dabbed walls are removed rather than repaired, and the removal is a controlled job: cut the boards in sections, pry them from the dabs, and inspect the masonry behind. The masonry is then the building's next decision. A dry sound wall can take a new lining, a damp wall must be remedied first, and a heritage wall should receive the breathable treatment the lime article describes rather than another dabbed sheet.

## The damp investigation, step by step

When a dabbed wall shows a damp sign, the investigation has an order. First, the source: roof, gutter, downpipe, raised external ground, bridged damp proof course, or internal plumbing. Second, the path: the void behind the board, the skirting line, the reveal, or the floor junction. Third, the wall's condition: the masonry's moisture reading, the board's firmness, the dab's adhesion. The order matters because the repair of the lining before the repair of the source is a repair the wall will repeat.

## The records the maintenance file keeps

The maintenance file for a dabbed wall keeps the fixing map, the paint schedule with product names and dates, the moisture readings at each inspection, and a photograph of any repair. The file is short by design, because the wall's life is mostly uneventful, and the file's purpose is to make the uneventful decades provable.

## The wall at ten years and at fifty

At ten years a dabbed wall's honest state is a decorated face with a few filled holes and possibly one patched area, and the file records whether the damp question was ever asked and answered. At fifty years the wall has either been relined once or has outlasted its decoration twice, and the masonry behind is due its own inspection. The long view is not romantic, and it is the only view that keeps the lining honest.

## The handoff to the next steward

The next steward of the building inherits the file, the fixing map and the wall's habits. The maintenance article's closing instruction is to add to that inheritance: photograph the repairs, date the paint, record the moisture, and leave the next reader a wall that explains itself.

## The occupier's one-page routine

The occupier's routine fits on one page. Look at the skirting line and the reveals twice a year for tide marks. Keep the external drainage clear. Use the right fixing for the weight. Photograph any repair with its date. Read the fixing map before drilling anything. Five habits, ten minutes a year, and the wall's decade is uneventful.

## The repair that teaches the building

Every repair teaches the building something, and the maintenance file's job is to write it down: which dab pattern the wall actually had, where the pattresses actually were, how the paint actually aged. The next repair reads the lesson and costs less, and the building's maintenance becomes a small, honest, compounding craft.

## The kitchen run and the pattress that was planned

The kitchen run is the dabbed wall's great exam. Wall units, base units, extractor and splashback all hang from fixings that must find structure, and the original pattress that the installer set into the dabs behind the run is the wall's quiet gift to its future. Where the pattress was not planned, the resin anchor into the masonry is the honest substitute, and the maintenance article's advice is to test one anchor before trusting eight.

## The hollow behind, and what it teaches

The void behind a dabbed board is a small room the building did not need, and everything the wall later does quietly happens there: pipes tick, cables warm, and any moisture that reaches the masonry has somewhere to wander before it finds a face. Diagnostics start with that room in mind, because a stain on a dabbed wall is a story about the void, and the story is told by looking at the dabs that failed, the pipes that moved, and the masonry that got wet without anyone asking.

## When the wall should be rebuilt rather than patched

A dabbed wall that has failed across a whole elevation, or that has been soaked by a roof leak for a season, is a rebuild rather than a patch, and the honest telling of that to an owner is the maintenance trade's most valuable sentence. The patch is for the wall that has one story to tell; the rebuild is for the wall whose whole biography has been rewritten by water, and knowing which wall is which is the difference between a repair and a rerun of the same problem.

## The phone call that starts every maintenance story

Every maintenance story starts with a sentence that sounds like something else: a picture that will not hang straight, a socket that has gone dead, a smell after rain. The surveyor's job is to translate the sentence back to the wall's anatomy, and on a dabbed wall the translator is the knowledge that boards sit on adhesive islands over a void, and that every symptom travels through that void before it reaches the room. The translation is the trade's real skill, and it is teachable in exactly one paragraph, which is why this article keeps repeating it.

## Keeping the record alive for the next owner

The maintenance record should outlive the owner who commissioned the work, which means it should live where the building lives: in the handover file, with the guarantee, with the photographs, and with the plain sentence that says what the wall is made of. A new owner who inherits that sentence inherits the ability to maintain the wall without archaeology, and the file that carries it has done more for the building than any single repair could.

Maintenance on a dabbed wall is diagnosis first and repair second, always in that order, and the order is the whole craft. The wall that is understood before it is opened rarely needs opening twice.

The wall that is understood, repaired and recorded in that order is a wall that keeps its promise, and the promise is what the whole chain was built to keep.

## References

1. British Gypsum, *Installation Guidance: Gyproc DriWall Adhesive*.
2. British Gypsum, *White Book: DriLyner Dab*.
3. British Gypsum, *Gyproc DriWall Adhesive FAQs*.
4. British Gypsum, *Product Update: Gyproc DriWall Adhesive (May 2024)*.
5. British Gypsum, *White Book: Finishes*.
6. SpecFinish, *Review of British Standard BS 8212 begins*.
7. NHBC, *Good craftsmanship guide: brickwork and blockwork*.
8. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a wall-mounted thermostat fixed to a plasterboard drywall face, photographed by MrBeastRapper and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle5$, 8, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Drywall_WITH_A_THERMOSTAT_%21.jpg/1280px-Drywall_WITH_A_THERMOSTAT_%21.jpg')
) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='GB' AND t.candidate_key='assembly:gb-dot-and-dab'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='GB' AND t.market_code='GB'
  AND t.candidate_key='assembly:gb-dot-and-dab'
  AND a.wall_topic_id=t.id AND a.wall_market_code='GB' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
