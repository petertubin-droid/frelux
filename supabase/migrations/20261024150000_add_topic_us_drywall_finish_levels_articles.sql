-- First researched-candidate topic for US: drywall levels of finish (Level 0-5).
-- The topic is registered as verification_status='candidate' (schema gate: only an
-- authenticated admin can promote it to 'verified' via the admin console).
-- Articles remain drafts; publication/review gates are not bypassed.
-- Apply 20261024000000_global_wall_finishing_knowledge_library.sql first.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='US' AND candidate_key='assembly:us-drywall-finish-levels') THEN
  INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type,verification_status)
  VALUES ('US','assembly:us-drywall-finish-levels','Drywall levels of finish (Level 0-5)','finish_assembly','candidate');
END IF; END $$;

-- Slots for the new topic (same generation pattern as the library migration).
INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,mp.default_language
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON true
JOIN public.market_profiles mp ON mp.country_code=t.market_code
WHERE t.market_code='US' AND t.candidate_key='assembly:us-drywall-finish-levels'
ON CONFLICT(topic_id,theme_key,language_code) DO NOTHING;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Gypsum Association, GA-214-2021, *Levels of Finish for Gypsum Panel Products*', 'https://www.americangypsum.com/sites/default/files/2022-05/ga-214-2021_17.pdf', 'Gypsum Association', 'Citation for the definition, recommended uses, and acceptance criteria of levels of gypsum board finish.'),
  ('Gypsum Association, GA-216-2024, *Application and Finishing of Gypsum Panel Products*', 'https://gypsumpublications.com/product/application-and-finishing-of-gypsum-panel-products-ga-216-2024/', 'Gypsum Association', 'Citation for application and finishing provisions across the coat sequences each level requires.'),
  ('ASTM International, ASTM C840-25, *Standard Specification for Application and Finishing of Gypsum Board*', 'https://www.astm.org/Standards/C840.htm', 'ASTM International', 'Citation for application and finishing criteria including joint treatment coats and decoration preparation.'),
  ('USG, *Sheetrock Brand Installation and Finishing Guide*, J371', 'https://www.usg.com/content/dam/USG_Marketing_Communications/united_states/product_promotional_materials/finished_assets/sheetrock-gypsum-panels-installation-guide-en-J371.pdf', 'USG', 'Citation for manufacturer finishing recommendations and product selection by level.'),
  ('USG, *Sheetrock Brand Tuff-Hide Primer-Surfacer Submittal*, J1613', 'https://www.usg.com/content/dam/USG_Marketing_Communications/united_states/product_promotional_materials/finished_assets/sheetrock-primer-surfacer-tuffhide-submittal-J1613.pdf', 'USG', 'Citation for primer-surfacer products used to achieve the highest level of finish.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='US' AND t.candidate_key='assembly:us-drywall-finish-levels'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'US','US',t.id,a.theme,'en','draft'
FROM (VALUES
  ('us-drywall-finish-levels-overview', 'Drywall Levels of Finish in the United States: Level 0 to Level 5', 'A US-focused reference to the gypsum board levels of finish: what each level means, where each is used, how they are chosen, and why the level named in the specification decides the wall''s whole future.', $wallarticle1$# Drywall Levels of Finish in the United States: Level 0 to Level 5

American drywall finishing has a vocabulary so useful that it appears in specifications, bid sheets, punch lists, and disputes alike: the levels of finish, a graduated scale from bare board to skimmed perfection, defined by the Gypsum Association in GA-214 and echoed through the ASTM standard for gypsum board finishing. The levels exist to answer one question honestly, how smooth does this surface need to be, and they answer it with a chain of defined operations rather than with adjectives. This article is the reference: what each level is, where each belongs, how the choice is made, and what riding on the choice is.

## Why a scale exists at all

The scale exists because smoothness is expensive in proportion to its perfection, and because decoration and lighting set the bar, not pride. A wall hidden above a ceiling needs almost nothing; a wall under grazing light and gloss paint needs everything the trade can give; and the levels between map every room's real requirement in order. The specification that names the level per room converts smoothness from an argument into a verifiable scope: the contractor prices it accurately, the inspector accepts against it mechanically, and the owner gets what the lighting actually demands. The trade's most common disputes, the wall that was expected at one level and built at another, are failures of vocabulary rather than of craft, and the vocabulary is free.

## The levels in order

GA-214 defines the levels, and their sequence rewards reading as a ladder of operations, each level containing the work of the one below. The lowest levels leave the board essentially as installed or barely taped, and are reserved for concealed spaces and temporary work. The lower-middle levels add the tape coat and one additional coat, suiting surfaces destined for heavy texture or for areas out of general view. The standard level for most American interiors adds the further coat and fastener treatment that flat paint and light texture require, and it is the level most residential rooms receive. Above it, the highest level adds a skim treatment of the entire surface, thin compound or a primer-surfacer applied everywhere, and belongs to gloss and enamel coatings, severe-angle lighting, and the walls photography inspects. One more habit of the scale deserves stating plainly: each level is defined by operations performed, not by results claimed, which is what makes the system inspectable, and the inspection in each case is conducted under lighting approximating the room's final service conditions.

## Choosing the level: the specification''s real work

The choice is made room by room, from three questions. What decoration will the wall wear, flat paint forgives, texture forgives more, gloss forgives nothing? What light will the wall live in, diffuse and dim forgives, grazing and bright reveals? And what is the wall for, concealed service spaces, storage, and mechanical rooms justify the bottom of the scale, while lobbies, conference rooms with window walls, and gallery-like corridors demand its top. The mature specification writes these answers down per room, and the bid that follows prices the labor honestly per level, which is where the level system also functions as an economic instrument: a contractor who understands levels can bid low-level rooms cheaply and high-level rooms accurately, while a contractor without the vocabulary bids an average everywhere and delivers an average everywhere.

## What each level costs, and what it commits

The ladder''s economics rise steeply at its top. The middle levels differ by a coat or two of compound, incremental in labor and materials; the highest level adds a skim of the entire surface, or a primer-surfacer pass, which multiplies the finishing labor on that wall and demands the most skilled hands on the crew. The commitment runs the other direction in time: a surface finished to its correct level is cheap to maintain for decades, because repaints and repairs have a defined target, while a surface finished below its room''s lighting is a permanent exhibition of its own joints, and the money saved at finishing is spent at every repaint trying to hide what the light insists on showing.

## The levels and the rest of the chain

The finish level interacts with everything around it. The taping materials and compounds beneath it are chosen per the manufacturer''s literature, and GA-216 with the ASTM specification governs the coats each level requires. Priming and decoration follow the level: the highest level exists precisely to receive gloss coatings and critical light, and painting a high-gloss enamel over a lesser level is the classic self-defeating specification. Repairs and maintenance, in turn, restore the wall to its original level rather than to a generic smoothness, which is why the wall''s file should record its levels. The level is not an isolated grade; it is the setting that the whole chain, materials, application, acceptance, and renewal, is tuned to.

## Reading this reference

The articles that follow apply the level system in execution order: the materials each level consumes, the field sequences that produce each level, the acceptance inspections that verify each level under honest light, and the maintenance that renews each level through the building''s life. Together they treat the levels as what they are, the American wall-finishing trade''s central standard, worth learning once and using for a career.

## The levels' short history, and why the industry agreed on them

The scale was born of a dispute. As gypsum board displaced plaster across the American interior through the mid-twentieth century, contractors, architects, and owners needed a common answer to how smooth is smooth, and the industry answered with a graduated standard that every party could price, build, and inspect against. The Gypsum Association maintains it, the ASTM specification echoes it into contract language, and the manufacturers' finishing guides translate it into product sequences. Its longevity is the proof of its design: a standard that survives a century of American construction is one that made all parties equally accountable to the same words, and every edition's revisions have kept that balance rather than replacing it.

## Where the scale shows up in real documents

The levels appear in the places money changes hands. Specifications name them room by room. Bids are built from them, because the labor between levels differs measurably and an honest contractor bids the ladder, not a blur. Inspection checklists reference them, and the finishing guides, like USG's, map their product sequences onto them. Disputes are settled by them, because the level named in the schedule is the fact both parties can verify. The reader who learns the scale learns the trade's contract language, which is a different skill from the trowel work, and buildings are governed by both.

## The levels and the trades that build them

The scale also maps the labor market. The low levels hang above ceilings in the hands of hangers moving fast; the standard level is the taper's bread and butter, the sequence every apprentice learns first; the highest level is the specialist's stage, the skim and the surfacer performed by the hands the trade reserves for its showcase work. A crew's composition, its tools, and its pace are all set by the levels its project names, and the estimator who reads the schedule's levels correctly has already read the project's labor story before the first scaffold stands.

## A portable reading of any specification

The reader can carry the overview in four questions. What level does each room's schedule name? What decoration and light does each room live with, and does the named level match them? What did each level's presence or absence cost the bid, room by room? And where does the specification disagree with itself, the gloss over the low level, the texture over the high one, so the argument can happen on paper before it happens on the wall? Four questions, asked before the compound opens, are worth more than any four the punch list will ever ask.

## The levels and the rest of the world

A closing perspective places the American scale in its global context. Other finishing traditions reach comparable ends by different vocabularies, plaster trades with their own grades of true, but the gypsum levels system is unusual for being written onto a board product and inspectable against operations. For FRELUX''s international readers the interest is practical: American-built or American-specified projects worldwide carry this vocabulary in their documents, and the reader who knows the scale can read a US-specification project anywhere the specification traveled. The scale exports with the product, which is one more reason it deserves a reference article of its own.

## Reading the level of a wall that has no documents

The overview''s last gift is the reverse reading: given a finished wall and no specification, what level is it? The textured surface above a standard finish is a texture-bearing level; the flat-painted surface with invisible joints reads as the standard level under diffuse light; the gloss lobby with no visible joints under grazing light is the top of the scale or a miracle. The reverse reading is diagnostic, it sets repair targets and repaint expectations honestly, and it is the skill that lets a steward maintain walls whose builders are long gone and whose documents are longer gone.

## A note on editions and the reader''s obligation

The scale is maintained, which means the reader''s citation has a date on it. GA-214''s current edition governs any project''s specific language, the ASTM specification is revised on its own calendar, and the manufacturer guides are updated as products change, so the professional habit is to confirm the current edition when a specification is written rather than quoting the edition this article cites. The obligation is small and the cost of honoring it is smaller, and the disputes that come from quoting superseded standards are as unnecessary as they are expensive.

## The vocabulary in one honest table of speech

Because the article is a reference, a spoken summary serves the reader who will use it in conversation. The untaped level is the surface above the work, the taped level is the surface inside the walls we never see, the texture-bearing levels are the surfaces the texture defends, the standard level is the surface the American interior is made of, and the skimmed level is the surface the light performs on. Five sentences, spoken at a walkthrough, tell any room''s story, and the professional who can speak them can also hear them, which is how specifications get corrected before they get built.

## What the overview asks of the reader

The overview asks for one commitment: read the level of every room you ever specify, buy, or walk through, and let the named level be the first fact you know about a wall. The level is the wall''s contract with its light, its coating, and its future, and every other article in this series is simply the level system kept. Begin with the name, and the rest of the scale follows.

## References
1. Gypsum Association, GA-214-2021, *Levels of Finish for Gypsum Panel Products*.
2. Gypsum Association, GA-216-2024, *Application and Finishing of Gypsum Panel Products*.
3. ASTM International, ASTM C840-25, *Standard Specification for Application and Finishing of Gypsum Board*.
4. USG, *Sheetrock Brand Installation and Finishing Guide*, J371.
5. USG, *Sheetrock Brand Tuff-Hide Primer-Surfacer Submittal*, J1613.$wallarticle1$, 'overview', 10),
  ('us-drywall-finish-levels-materials', 'Materials by Level of Finish for US Drywall', 'A US-focused guide to the tapes, compounds, textures, and surfacers each drywall level of finish consumes, from the taped-only levels through skim coats and primer-surfacers.', $wallarticle2$# Materials by Level of Finish for US Drywall

Every level of the finish scale is, in the end, a materials package: the same aisle serves the whole ladder, but each rung consumes it differently, and the buyer who understands the mapping buys neither too little for a high level nor too much for a low one. This article walks the materials level by level, with the manufacturer literature and the standards governing each selection.

## The shared foundation

All levels above the bare-board start from the same foundation: joint tape, joint compound, and fastener treatment, selected per the manufacturer''s guidance and applied per GA-216 and the ASTM specification. Paper tape bedded in compound remains the trade''s standard for joint strength; fiberglass mesh tape belongs with setting compounds per the manufacturers'' compatibility restrictions. Compounds divide into drying types, in their taping, topping, all-purpose, and lightweight formulations, and setting types, with their chemical cure and deep-fill strength. The foundation does not change with the level; what changes is how much of it each level consumes and what it adds on top.

## The low levels: economy as a materials plan

The bottom rungs of the scale are almost a materials savings plan. The untaped level uses nothing beyond the hung board. The taped level adds tape and its bed coat. The level above adds a single additional coat over the tape and a coat over fastener heads, and these levels are where the heavy textures of the American interior, orange peel and its cousins, find their substrate. The materials plan for these levels concentrates its quality where structure lives, in the tape and its bed, and economizes elsewhere, and the economy is honest because the decoration above it, heavy texture, is designed to forgive what the surface leaves.

## The standard levels: the broad middle of the aisle

The level most American interiors receive is a materials package of the full foundation plus additional coats: tape bedded, coated through the further passes, fastener heads treated through their successive fills, corners and beads finished to line. The materials additions here are patience and compound, in the quantities the wider feathering demands, and the abrasives that bring the surface to its specified smoothness. Priming enters the package at this level and above, because the painted decoration these surfaces receive needs the porosity balance primer provides, and the manufacturer''s drywall primer is selected per the finish system the room will wear.

## The highest level: the skim and the surfacer

The top of the scale adds the materials that build the surface itself toward perfection. The skim treatment applies a thin coat of compound, or a designated skim product, over the entire surface, not merely the joints, sealing the texture of the paper into a continuous plane. The alternative promoted by the manufacturers is the primer-surfacer, USG''s Tuff-Hide among the documented products, a high-build coating applied over the standard finish that levels and equalizes the surface while priming it, engineered for the gloss coatings and grazing light that justify the level. The materials decision at this rung is between the two paths, applied per their product literature and priced honestly, because both deliver the level and neither forgives a substrate beneath them that was not finished to the level below.

## Texture materials for the texture-borne levels

Where the specification routes a room through heavy texture, the texture products join the package: the spray-applied and hand-applied texture compounds in their aggregate grades, from the fine orange peel to the coarser patterns, applied per their product instructions and over the level the specification calls for. The texture materials selection also belongs to the level system because texture changes repair economics, the texture must be matched in any future repair, and the specification that names heavy texture for a room is choosing a lower preparation level and a higher repair complexity in the same sentence. The buyer who understands the trade-off buys texture with open eyes.

## Primers and coatings, matched to the level

The decoration's primers and paints complete the package and must be matched to the level the surface achieved, because the level and the coating are a system: the highest level exists for gloss and enamel, and applying a gloss over a lesser surface wastes both the coating and the room's light. The primers equalize porosity everywhere, spot-prime repairs on repaints, and where the primer-surfacer was used, the finish system follows that product's literature. The paint quantity takeoff at each level reflects reality: skimmed and surrfaced walls consume less paint than unprimed porous ones, and the takeoff that respects the level's preparation is the takeoff that does not run out of finish on the last wall.

## Tools by level

The tool kit grows with the level. The low levels need knives and a taper''s basics; the standard level adds the sanding and finishing tools that wide feathering demands; the skim coat adds the skimming blades and the largest knives, or the spray rig for surfacer application; the highest levels reward the good lights and straightedges that verify the work as it proceeds. The crew that owns its level''s tools works at its level''s pace, and the crew that borrows a higher level''s schedule without its tools delivers the lower level it actually equipped.

## Estimating materials through the level lens

The level system is also a materials arithmetic. The taped levels consume tape and a bed coat''s worth of compound; each additional coat multiplies consumption toward the standard level''s quantities; the skim coat adds compound or surfacer across the entire surface area, a step change the takeoff must price; texture products follow the pattern''s consumption per area and the waste of learning a sprayer''s rhythm. FRELUX''s wall-finishing estimator runs these quantities for US drywall assemblies with the configurations and market prices of each level''s scope, so the budget per room can be checked against a second calculation instead of a single guess, and the project that knows its levels orders its materials to its actual schedule rather than to an average that fits no room.

## Quality tiers inside each product family

Within each family, the level tells the buyer where quality money matters. At the low levels, economy compounds serve their concealed homes honestly. At the standard level, the workhorse formulations earn their keep in drying predictability and sanding kindness. At the skim and the surfacer, premium products and fresh stock are not luxuries, because the thin films and wide passes of the highest level publish every shortcut their chemistry allows. The buyer who spends uniformly spends wrongly twice: too much below the ladder and too little above it. The level is the specification for the shopping list.

## The compatibility rules, restated for the buyer

The materials article''s quiet close is the same rule the whole series carries: the matched system. The tape matches the compound, the compound matches the level, the level matches the decoration, the primer matches the coating, and the coating matches the light. The buyer who shops the ladder one rung at a time, and who reads each product''s literature before the pail opens, assembles a wall whose materials behave like a system rather than a quarrel, and the level system is the plan the quarrel is argued against.

## Staging, storage, and the perishability that serves levels

The level''s materials are perishable in the ways that matter to thin films and wide passes. Compounds past their shelf life work badly at exactly the levels that can least afford it; the skim products and surfacers are the chemistry most sensitive to freezing, heat, and age; and the texture products'' consistency is the first casualty of a pail left open in the sun. Materials staged in conditioned space, rotated by date, and used within their windows deliver the manufacturer''s performance at every rung of the ladder, and the crew that stages its materials by level, low-level economy in the cheap seats, high-level freshness in the front row, has understood the aisle more deeply than any catalog can teach.

## The accessories that each level calls for

The accessory list grows with the ladder as well. The low levels need little beyond the tape and the staples of the taper''s kit; the standard level adds the wider knives, the corner tools, and the sanding arsenal; the skim and surfacer stages add the skim blades, the spray equipment or the heavy-nap application tools, and the lights that verify the plane as it is built; the texture stages add the sprayer, the compressor settings, and the knockdown blades the pattern requires. Accessories are the visible signature of the level the crew expects to build, and the supplier who reads a crew''s order can name the rooms they are finishing without seeing the schedule.

## When the manufacturer''s product and the level must agree

The last materials caution is the boundary between the level''s definition and the product''s claims. A level is achieved by the operations the standard defines, and the product, the surfacer, the texture, the compound, is a means the manufacturer documents toward that achievement; the product''s literature does not rewrite the standard, and the specification that names a product rather than a level has traded a verifiable target for a brand name. The buyer who keeps the distinction clear purchases products as the level''s instruments, reads their literature as the instrument''s manual, and holds the level as the wall''s actual definition, which is the arrangement the standards, the manufacturers, and the trade all endorse.

## The takeoff through the ladder, room by room

The materials article''s practical arithmetic, restated as the estimator''s workflow: list the rooms with their named levels, apply each level''s consumption to each room''s area, joints, and fastener counts, add the texture or skim step-changes where the schedule calls them, and total the pails, rolls, sheets, and gallons against the manufacturer''s published coverage. The takeoff that runs the ladder honestly is the bid that neither starves the high-level rooms nor gilds the low ones, and it is the single discipline that most reliably separates the profitable finishing project from the heroic one. FRELUX''s estimator exists to be that second calculation, and the level system is the structure it calculates through.

## The environmental aisle, briefly

Modern finishing has an environmental tier as well, and the level system interacts with it honestly: low-emission compounds and coatings exist across the price range, the surfacer and texture products carry their own documentation, and the specification with indoor-air goals names its documents rather than trusting its adjectives. The buyer''s obligation is unchanged, verify the claim against the product''s data, and the level''s obligation is unchanged, the environmental tier is a characteristic of the product, not a substitute for the operations that define the rung. A green label on a wall built below its level is still a wall built below its level, and the light will say so in the same accent.

## References
1. Gypsum Association, GA-214-2021, *Levels of Finish for Gypsum Panel Products*.
2. Gypsum Association, GA-216-2024, *Application and Finishing of Gypsum Panel Products*.
3. USG, *Sheetrock Brand Installation and Finishing Guide*, J371.
4. USG, *Sheetrock Brand Tuff-Hide Primer-Surfacer Submittal*, J1613.
5. ASTM International, ASTM C840-25, *Standard Specification for Application and Finishing of Gypsum Board*.$wallarticle2$, 'materials', 10),
  ('us-drywall-finish-levels-installation', 'Achieving the Levels of Finish in the Field', 'A US field guide to producing each drywall level of finish: coat sequences, feathering discipline, skim coats and primer-surfacers, texture application, and the drying patience each level demands.', $wallarticle3$# Achieving the Levels of Finish in the Field

The levels of finish are defined as operations, and this article is the operations manual: what the crew actually does, in order, to deliver each level, from the taped-only surfaces above ceilings to the skimmed walls of a gloss-painted lobby. The standards define the target; the field guide describes the craft.

## The shared beginning: bedding the tape

Every level above bare board begins identically, because the tape bed is the joint''s structure and no later coat repairs a bad one. Tape is bedded in compound along every joint, pressed to full embedment, folded cleanly into inside corners, and set with bead on outside corners, per the application provisions of GA-216 and the ASTM specification. Fastener heads take their first fill in the same pass. The beginning is performed identically whatever the final level, and the crew that rushes it for a low-level room is gambling the building''s future on the one thing that level still had to get right.

## Producing the lower levels

The taped level stops after the bed coat: the joints are covered and structurally sound, and the surface is destined for concealment. The next level adds one further coat over the tape and the fill over fastener heads, and its product is a surface ready for heavy texture or for areas out of general view. The field discipline at these levels is honesty about where they live: above ceilings, behind tile, in mechanical spaces, and the failure mode is not roughness but overreach, the temptation to hang a high-level room on low-level operations because nobody looked at the schedule closely. The crew that produces these levels cleanly is finishing the rooms they belong to, at the cost those rooms deserve.

## Producing the standard level

The standard interior level is produced by the coat sequence the trade knows by heart: the bed coat, the second coat feathered wider, the third feathered wider still, fastener heads filled until they vanish, corners coated one side at a time, beads finished to a straight line. Each coat goes on thin, dries fully, and is checked before the next; the feathering widens until the joint''s transition outlasts the eye''s perception at the room''s viewing distance. The sanding that follows works with graduated abrasives to the specified smoothness, and the priming that closes the sequence equalizes the surface for the paint the room was promised. The level''s secret is patience distributed evenly, and its product is the quiet wall that most American rooms are made of.

## Producing the highest level

The highest level begins with everything the standard level contains, and then adds the treatment that makes the surface continuous rather than merely joint-free: the skim coat, a thin pass of compound over the entire surface, worked to fill the paper''s texture and the finish''s pores, sanded lightly to a continuous plane, or the primer-surfacer alternative, applied per its product literature in the coats and coverage its submittal documents specify. The skim demands the crew''s best hands and honest drying between passes, and the surfacer demands the same in a spray pattern and a back-rolled wetness, and both demand the substrate of the full standard level beneath them, because the skim and the surfacer level the surface, they do not forgive what the surface lacks. The field proof of the level is the light: no grazing lamp in the room finds a joint, a fastener, or a texture change, and the closeout inspection under the room''s own lighting confirms it before the gloss ever opens.

## Texture as a level''s ceiling

Where the schedule routes rooms through texture, the texture application is the last operation and it sets the ceiling on preparation: heavy textures accept the lower levels, and the spray pattern, orange peel to knockdown, is applied per the product''s instructions, with the knockdown timed to the texture''s wetness and the pattern approved on a sample before production. The texture crew works after the level is complete and before the paint, and the texture''s consistency, mix, pressure, and timing, is the quality of the level that everyone will see. The field discipline is the sample: the approved panel on the wall, sprayed and knocked to the owner''s eye, is the standard the production sprayer holds.

## Drying, conditioning, and the pace of chemistry

Every level''s operations run at drying''s pace. The building is conditioned to the compound manufacturer''s temperatures and ventilation, coats are verified dry before recoating, and the skim and surfacer passes that define the highest level are the most sensitive of all, because their thin films and wide areas show every environmental shortcut. The crew plans its levels around the calendar chemistry actually allows: bed coats on day one, second and third coats on their own dryings, skim or surfacer on a wall that has earned it, texture on a dry surface, paint in the coating''s own windows. The wall finished out of sequence dries into a record of the sequence it was given.

## Handoffs and verification at each level

The field sequence ends at each level with a verification walk: the named level, checked under raking light, against the operations its definition requires. The taped level has its tape, the textured levels have their coats and their pattern, the standard level has its feathering and vanished fasteners, the highest level has its continuous plane. The walk is short and it is the last cheap moment at every rung of the ladder, and the record of walking it, dated per room, is the project''s own proof that the specification''s words became the wall''s facts.

## Crewing and pacing the ladder

The level system is a scheduling instrument as much as a materials one. The low levels turn over quickly, hung, taped, concealed; the standard level runs the taper''s multi-coat calendar, with drying days between passes; the skim and surfacer add the highest level''s specialized labor to the end of the sequence, often by the trade''s best hands, moving room to room after the standard work clears. The superintendent who sequences the ladder, low levels closed early, standard rooms flowing, top-level rooms staged for the specialists, runs a quiet job; the one who treats the building as a single undifferentiated surface discovers the ladder''s existence at the punch stage, when the low-level rooms have been overworked and the high-level rooms underdone, both at the worst possible price.

## Protecting the finished rungs

Each completed level is fragile to the trades that follow. The taped ceiling must not be used as a storage shelf; the standard walls must survive the trim, flooring, and fixture trades; the skimmed lobby must survive the building''s final weeks, which is why the level system''s last field habit is protection, staged and enforced, and why the highest level''s closeout photographs exist: as the record of the plane before the world got at it. The level a crew builds is only as durable as the protection culture that follows it, and the maintenance article''s whole economy depends on this one being honored.

## The last word on the field''s part of the system

The standards define the levels, the manufacturers supply the materials, and the field performs the truth between them. Every sentence in this field guide reduces to the same instruction, honest operations in sequence, each one performed as if the light that will judge it is already on, because in the building that light arrives the day the owner does. The crew that internalizes that instruction produces the scale''s entire meaning without ever quoting it, and the crew that quotes it without the instruction produces the punch list the scale was invented to prevent.

## When the schedule and the ladder disagree

The field reality is that schedules compress, and the level system''s honesty becomes most valuable exactly then. The compressed schedule cannot repeal drying chemistry, and the professional response is sequencing, not omission: low-level rooms closed early, standard rooms flowing on their calendar, the highest levels staged for their specialists at the end, and any true impossibility escalated to the parties who can change the schedule rather than absorbed silently into the wall. The compressed project that respects the ladder delivers; the one that pretends the ladder away delivers the punch list, and the punch list takes longer than the drying ever would have.

## The scaffold''s view, and the order rooms are finished

Practical sequencing moves room by room up the ladder, and the field guide should say it plainly: low-level rooms finish first and disappear behind their ceilings; standard rooms flow through the building on the drying calendar; the high-level rooms wait for the specialists and their staged protection. The order is not decoration but logistics, and it echoes through everything, materials staging, crew assignment, inspection scheduling, and the building''s own weather of other trades. The crew that finishes a building in the ladder''s order finishes it once; the crew that finishes it room by room at random finishes the same rooms three times.

## The drying calendar, written on the wall

Because the field guide deserves a closing image, here is the drying calendar the trade actually lives on, written as the wall experiences it: bed coat on the first day, the joint''s structure set; second coat after the first is verified dry, the feathering widened; third coat on its own honest drying, the fasteners gone; the skim or surfacer on a surface that has earned it, the plane built; texture on the dry surface, the pattern approved; primer when the dust has settled; paint in its weather and its windows. Six lines, each with a drying day or two inside it, and the building that honors the calendar delivers the schedule''s levels without the schedule''s drama. The calendar is not the enemy of speed; it is the definition of it.

## The tools that watch the level rise

The modern high-level finish has acquired verification tools the older trade would have envied: the grazing lamps that ride the scaffold, the straightedges that span the flats, and the habit of photographing each stage under its own light for the file. The field guide''s counsel is to use them as the sequence''s witnesses rather than as its critics, the light at each coat''s completion, the edge at each feathering''s width, the photograph at each gate''s walk, so that the wall''s story is being told as it is written rather than reconstructed after the paint. The tools that watch the level rise are the same tools that prove it rose.

## References
1. Gypsum Association, GA-216-2024, *Application and Finishing of Gypsum Panel Products*.
2. ASTM International, ASTM C840-25, *Standard Specification for Application and Finishing of Gypsum Board*.
3. Gypsum Association, GA-214-2021, *Levels of Finish for Gypsum Panel Products*.
4. USG, *Sheetrock Brand Installation and Finishing Guide*, J371.
5. USG, *Sheetrock Brand Tuff-Hide Primer-Surfacer Submittal*, J1613.$wallarticle3$, 'installation', 10),
  ('us-drywall-finish-levels-quality-checks', 'Inspecting and Accepting Drywall Levels of Finish', 'A US quality-control guide to verifying each drywall level of finish: operation-based acceptance, lighting conditions, defects by level, and the records that make the scale enforceable.', $wallarticle4$# Inspecting and Accepting Drywall Levels of Finish

The levels of finish are the most inspectable standard in the finishing trades, because each level is defined by operations performed rather than impressions made. Acceptance is therefore mechanical honesty: confirm the room''s specified level, verify the operations that define it, and judge the result under lighting approximating the room''s final service conditions. This article describes the inspection program for the scale, from the low levels to the skim, and catalogs the defects each level produces when its operations are shortchanged.

## The acceptance protocol, level by level

The protocol begins with the specification, which names each room''s level; the inspection has no other authority. At the low levels, acceptance verifies the operations present, tape bedded, fasteners filled once, the texture substrate ready, and resists the urge to demand beauty where the schedule asked for structure. At the standard level, acceptance verifies the full coat sequence, the wide feathering, the vanished fasteners, and the corners'' truth, with the raking light as the instrument and the room''s viewing distances as the standard. At the highest level, acceptance verifies the continuous plane, the skim or surfacer applied over the full surface, no joint, fastener, or texture visible under the grazing light the room will live in. At every rung, the question is the same: were the operations this level is made of actually performed, and the evidence is the wall itself under the agreed light.

## Lighting, the scale''s referee

The scale is meaningless apart from lighting, because each level exists for a light condition. The acceptance walk uses lighting approximating the room''s final service: diffuse for the textured corridor, grazing for the glossed lobby, and where the specification paired a level with its light honestly, the wall either passes or fails in minutes. The disputes come from the mismatches, the high light over the low level, and the inspection program''s duty is to catch the mismatch at the specification stage rather than at the punch stage. The professional inspector carries the light the room will use and judges the wall with it, and the specification that named the level is the sentence that made the light honest.

## Defects, cataloged by the level that produced them

Each level produces its own characteristic defects when its operations are shortchanged, and the catalog teaches the system. At the low levels: hollow tape from poor bedding, the one structural sin the economy levels still forbid. At the textured levels: texture over a joint that was not ready, the pattern that telegraphs the seam it was meant to forgive. At the standard level: ridges from narrow feathering, fastener pops from careless setting, the joint that photographs under the flat paint the level was supposed to support. At the highest level: the skim that bridged rather than filled, the surfacer applied over a damp wall, the gloss that found the one joint the skim missed, and every one of these is the level testifying that an operation beneath it was skipped. The defects are diagnostic precisely because the levels are defined by operations: each defect names its missing operation, and the correction is the operation restored, not merely the surface dressed.

## The gates and the record

The inspection program gates the work at each level''s completion: the room list with its named levels, the walk at each level, the findings marked and corrected while the crew is present, and the dated initials that make the record real. The record''s power is economic: a wall whose level was verified in sequence needs no closeout archaeology, the punch list verifies against its gates, and the disputes that consume finishing projects, the two-sides-of-the-same-wall arguments, end before they begin because both parties inspected the same operations under the same agreed light. The folder costs nothing and settles everything, which is the whole architecture of the scale''s enforceability.

## The five-minute read any room deserves

The reader who wants the portable version of this article can hold the protocol in one breath: find the room''s named level, bring the room''s own light, verify the operations that define the level, mark what the light finds, and write down the walk. Five minutes per room at each gate, and the scale does what it was designed to do, which is make smoothness a fact rather than a claim.

## The mismatch catalog, read as prevention

The inspection program''s most valuable output is the mismatch caught early, and the catalog of classic mismatches is short enough to memorize. Gloss or enamel over the standard level: the sheen performs the x-ray the level cannot survive; the fix is a level change at the specification stage or a sheen change before the paint opens. Heavy texture over the highest level: the skim was wasted money, and the fix is the schedule''s own arithmetic. Critical light over a textured ceiling: the retrofit options are few and ugly, and the fix was one sentence in the design phase. Flat paint over the top level: the wall will look magnificent and the money was spent twice, once on the skim and once on the paint that hid it. The mismatches all rhyme: the level, the light, and the coating must be chosen as one sentence, and the inspection program exists to read that sentence aloud before it is built wrong.

## Sampling and the authority of the walk

Acceptance is sampled honestly: every room walked, the critical surfaces under the raking light, the textured surfaces at distance and angle, the high-level surfaces at the grazing angles their fixtures produce. The walk is the sample, and the dated record of the walk is the acceptance; nothing else the project produces, not the invoices, not the assurances, not the manufacturer''s literature, substitutes for the wall itself under the light it will live in, read by someone who knows what the schedule said it should be.

## The record''s afterlife

The acceptance record outlives the project in the ways that matter. The warranty claim is settled by it, the coating''s performance arguments are decided by it, the renovation''s designer reads the wall''s level from it rather than from a test hole, and the sale of the building transfers the wall''s history in a folder instead of a shrug. The five-minute walks that produced it were the cheapest inspection program in the trade, and their pages are the only part of the finishing project that appreciates with time.

## Close the acceptance article with the trade''s own wisdom

The scale''s inspection culture has produced a generation of American finishers who say the same thing in different accents: the wall tells you everything if you bring the right light and read it honestly. The quality program in this article is simply that habit, formalized into dates and initials so the wall''s testimony becomes evidence, and evidence is what every wall in a finished building eventually needs to be.

## The three answers, classified once more

Every finding resolves into the trade''s three honest classes, applied here through the level lens. Cosmetic and stable, within the level''s own standard under its own light: accept and record. Reparable, an operation missing that the level''s definition requires: restore the operation, re-walk, and record. Systemic, the wrong level entirely, the mismatch built into the room: stop, because no field repair rewrites a specification, and the correction is a design conversation, not a compound pass. The classification is the inspector''s whole judgment, and the level system is what makes the classification possible at all.

## What acceptance looks like when everyone meant well

The honest program also covers the friendly failure, the wall everyone liked under the work lights and no one walked under the room''s own light. The friendly failure is why the protocol names the lighting at the specification stage and never lets the work light substitute for it, because the work light is designed to see by and the room''s light is designed to live by, and they are different instruments with different verdicts. The five-minute walk under the room''s own fixtures is the entire difference between a wall that passes at closeout and a wall that passes at closeout and then photographs its ridges in every listing, and the program exists for the second wall.

## The inspector''s library card

The acceptance program''s tools are five and no more: the specification, which names the level; the room''s own lighting, which defines the verdict; the raking lamp, which finds what the fixtures miss; the tape-and-pull kit, which tests what adhesion claims; and the dated record, which makes the walk real. Every other instrument in the finishing trades elaborates one of these five, and the inspector who carries them all, and who knows which one each finding belongs to, has the entire level system in a toolbox that fits in one hand. That portability is the scale''s quiet genius, and it is why the vocabulary has outlived every generation of products it was written for.

## A final word on the honest no

The inspection program''s most valuable sentence is the honest no, delivered at the gate, while the correction is cheap. No, this room is not at its named level; no, this light is not the room''s light; no, this wall does not pass the walk. The program that can say no at the gates says yes once, at the end, and the building that receives that yes has received the only acceptance the finishing trades can actually guarantee, which is the wall, at its level, under its light, witnessed and recorded. The honest no is the scale''s whole inspection culture compressed to one syllable, and the professionals who can say it are the reason the vocabulary still means something.

## The rooms nobody inspects, and the walls that suffer for it

The honest program audits its own blind spots, and the finishing trades'' blind spots are predictable: the ceiling above the corridor, the wall behind the shelving, the garage, the mechanical room, the surfaces whose low levels make them easy to skip entirely. The level system''s discipline extends here as well, because the low levels still have their operations, the bed tape still needs its bedding, the fastener still needs its coat, and the neglect that skips them is the same neglect that skips the standard room''s feathering when no one is watching. The program that walks every room, including the hidden ones, builds a building whose concealed stories match its public ones, and the program that walks only the lobby builds a lobby that photographs well over a building that quietly disagrees with it.

## References
1. Gypsum Association, GA-214-2021, *Levels of Finish for Gypsum Panel Products*.
2. Gypsum Association, GA-216-2024, *Application and Finishing of Gypsum Panel Products*.
3. ASTM International, ASTM C840-25, *Standard Specification for Application and Finishing of Gypsum Board*.$wallarticle4$, 'quality', 10),
  ('us-drywall-finish-levels-maintenance-repair', 'Maintaining Drywall Surfaces by Level of Finish', 'US guidance for renewing, repairing, and repainting drywall surfaces according to their original level of finish, with the repair sequences that restore each level honestly.', $wallarticle5$# Maintaining Drywall Surfaces by Level of Finish

Maintenance of a finished drywall surface is honest only when it respects the level the surface was built to. The level is the wall''s identity: it tells the maintainer what the joints beneath the paint were given, what the repairs must restore, and what the light in the room will forgive or expose. This article covers repair, repaint, and renewal through the level system''s lens, from the textured corridor to the glossed lobby, and closes the series by returning the vocabulary to the people who will use it longest, the stewards.

## Why the level matters after the painters leave

The level outlives the project. It lives in the wall''s response to damage, the textured room absorbs a scuff the glossed room displays, in the repair''s target, a standard-level wall needs its feathered sequence restored, a top-level wall needs its skim, and in the repaint''s preparation, which primes the compound it adds and blends to the plane its level defines. The owner who knows the room''s level repairs to the level and stops; the owner who does not either under-repairs, and the light finds the patch, or over-repairs, and the budget finds the excess. The level is the maintenance budget''s arithmetic, and the file that records it is the cheapest maintenance instrument a building owns.

## Repairs at the textured levels

Textured surfaces forgive damage better than any other, and their repairs are matched rather than erased. The damaged area is corrected beneath the texture, the compound restored and sanded, and then the texture itself is matched: the spray pattern approximated on cardboard until the density and droplet size read the same, applied to the repair, and knocked or left to match the field. The honest limits are stated plainly: heavy textures match beautifully on small repairs, and large repaired areas may need the full wall''s respray to read as one surface, which the level''s repair economics should have told the estimator at the beginning. The textured room''s maintenance rhythm is otherwise gentle: washing, touch-up paint in the field''s color, and the scuffs that the texture''s shadow already half-forgives.

## Repairs at the standard level

The standard interior surface repairs by restoring its own operations: the joint treatment rebuilt if the damage crosses a seam, the feathering recreated at the repair''s width, the fastener treatment honored where pops return, and the whole primed and painted to the plane''s breaks. The level''s generosity is that its repairs vanish under flat and matte paints with modest skill, and its discipline is the primer, because the fresh compound against the aged paint photographs without it. The repaint years renew the standard-level wall cheaply: wash, repair, spot-prime, and roll the coats, and the room that was finished honestly at the beginning renews honestly ever after.

## Repairs at the highest level

The top of the scale repairs at the top''s price. A repair on a skimmed or surrfaced wall must restore the continuous plane, not merely the joint-free surface: the damaged area is finished to the standard level and then skimmed or surrfaced locally, sanded to feather into the surrounding plane, and primed with the system the wall wears. The light that justified the level will interrogate the repair, and the honest maintainer repaints the full plane between natural breaks rather than promising an invisible patch under gloss, because the level''s light keeps that promise only for the whole plane. The glossed lobby''s maintenance file should read like the specification it descends from: the level named, the system recorded, the repairs dated to the plane.

## Repaints, read against the level

Every repaint consults the wall''s level twice: once for preparation, which must return the surface to what its level requires, joints feathered, fasteners set, skims restored, and once for coating, whose sheen must respect the level the light will expose. The classic maintenance failure is the upgrade that wasn''t: the flat-painted room repainted in satin to modernize, on a surface finished for flat, and the new sheen performing an x-ray of the joints the old paint had quietly hidden. The level and the sheen are a system, and the repaint that changes one must honor the other, which is why the file''s record of level and paint family is the steward''s best tool.

## The steward''s level-aware year

The annual walk, performed with the room''s own light, reads each wall against its level: the textured corridor''s scuffs, the standard rooms'' touch heights, the glossed lobby''s whole-plane honesty under its grazing fixtures. Small damage is touched early, before water finds it; stains are diagnosed before they are painted; pops are reset beside their originals and refinished to the level; and the file, growing one page a year, keeps the building''s walls as legible at twenty as at two. The level system was designed for specification and acceptance, but its longest service is this: a vocabulary in which a building can know itself, room by room, for the whole of its painted life.

## When the level must change, and how to do it honestly

Buildings evolve, and rooms change their light and their coatings, so the steward''s level-aware maintenance includes the honest level change. The room gaining gloss needs the level raised: the standard surface brought to the skim or the surfacer before the coating, or the coating changed to a sheen the current level supports. The room losing its critical lighting, the wall that loses its grazing fixture, may forgive a repaint at a sheen the old level never supported. Each change is priced honestly by reading the level ladder in this series, and each is recorded in the file, because the building''s next steward will otherwise learn the level the expensive way, under the light the room was just given.

## The file, one last time, because it is the whole system

The level system''s final product is not a smooth wall; it is a knowable one. The wall whose level is recorded, whose repairs are dated to the plane, whose sheens honor its finish, is a wall that ages cheaply and changes confidently, and the wall whose level is unknown spends its life being rediscovered, one failed touch-up at a time. The folder is the cheapest material in this entire series, and it is the only one whose value compounds.

## The series'' close, in the steward''s vocabulary

The levels of finish were invented for builders and inspectors, and this series has argued that they belong to stewards equally. The level tells the repair its target, the repaint its preparation, the coating its honest sheen, and the building its own biography. The steward who finishes this series with the vocabulary owns the walls in a way the builder''s warranty never quite promised: not guaranteed smooth, but known, room by room, for the whole of their painted lives. That is what a good standard does when it is understood, and it is why the gypsum industry''s modest ladder of operations deserves a reference series of its own.

## The steward''s five questions, ending the series

End with the questions the steward asks each wall, once a year, with the file open. What level was this room built to, and does the file say? What light does the room wear now, and does the level still answer it? What has damaged the wall, and was it repaired to the level? What coating is on the calendar, and does its sheen respect the level beneath it? And what should the file record next, so the wall stays known? Five questions a room, a few minutes a year, and the levels of finish complete their long journey from specification language into the ordinary stewardship of an American building''s longest-lived surface.

## The economics of level-aware stewardship, one final time

The money in this series is all in the same three places: the walks cost almost nothing, the repairs on rhythm cost modestly, and the discoveries made late cost enormously. The level system is what makes the late discovery rare, because a wall that is known, its level recorded, its repairs matched, its coatings chosen in honesty, is a wall whose maintenance is arithmetic rather than archaeology. The steward who has followed this series owns the arithmetic; the walls, room by room, will quietly pay it back.

## A last note on teaching the levels forward

The steward''s final act with any good vocabulary is to teach it forward, to the next owner, the next crew, the next inspector. The level system earns its place in a building''s file precisely because it is learnable in an afternoon and useful for a century, and the handover that includes a one-page level map of the building, each room named with its level, its coating, and its light, is the handover that ends the archaeology forever. This series was written to be that page''s explanation; the file, and the habit of keeping it current, is the page itself.

## The last paragraph the series owes the wall

The levels of finish were written by an industry that wanted its smoothness to be a fact, and this series has tried to hand that fact forward, from specification to scaffold to inspection to the long stewardship where the fact finally pays. A finished wall is one of the largest surfaces a building owns and one of the few whose quality every occupant judges daily, and the level system is the quiet piece of language that keeps that judgment friendly. May every room the reader ever touches be built to the level its light deserves, and may the file always say which one that was.

## Passing the vocabulary to the next crew

One last act of stewardship deserves its own paragraph, because it is the one that compounds the most: writing the level down for whoever comes next. The renovation crew that finds a one-page map of the building''s levels, coatings, and repair history begins its work in minutes instead of days; the maintenance contractor that finds the file bids the job honestly instead of padding for archaeology; and the next steward, the one holding the keys in twenty years, inherits a building that knows itself. The level system''s gift to the trade was a common language; the steward''s gift to the future is writing it down; and the wall, which after all the inspection and all the maintenance just wants to be quiet, gets its quiet the only way it is ever secured, by being understood.

## References
1. Gypsum Association, GA-214-2021, *Levels of Finish for Gypsum Panel Products*.
2. Gypsum Association, GA-216-2024, *Application and Finishing of Gypsum Panel Products*.
3. USG, *Sheetrock Brand Tuff-Hide Primer-Surfacer Submittal*, J1613.
4. ASTM International, ASTM C840-25, *Standard Specification for Application and Finishing of Gypsum Board*.$wallarticle5$, 'maintenance', 10)

) AS a(slug,title,excerpt,content,theme,read_time_minutes)
JOIN public.learn_wall_finishing_topics t ON t.market_code='US' AND t.candidate_key='assembly:us-drywall-finish-levels'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
WHERE NOT EXISTS (SELECT 1 FROM public.learn_articles existing WHERE existing.slug=a.slug)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='US' AND t.market_code='US'
  AND t.candidate_key='assembly:us-drywall-finish-levels'
  AND a.wall_topic_id=t.id AND a.wall_market_code='US' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en'
  AND a.slug IN ('us-drywall-finish-levels-overview', 'us-drywall-finish-levels-materials', 'us-drywall-finish-levels-installation', 'us-drywall-finish-levels-quality-checks', 'us-drywall-finish-levels-maintenance-repair');

COMMIT;
