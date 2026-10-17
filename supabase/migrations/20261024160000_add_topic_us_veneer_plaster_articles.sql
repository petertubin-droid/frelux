-- Second researched-candidate topic for US: veneer plaster skim over gypsum board.
-- The topic is registered as verification_status='candidate' (schema gate: only an
-- authenticated admin can promote it to 'verified' via the admin console).
-- Articles remain drafts; publication/review gates are not bypassed.
-- Apply 20261024000000_global_wall_finishing_knowledge_library.sql first.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='US' AND candidate_key='assembly:us-veneer-plaster-skim') THEN
  INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type,verification_status)
  VALUES ('US','assembly:us-veneer-plaster-skim','Veneer plaster skim over gypsum board','finish_assembly','candidate');
END IF; END $$;

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,mp.default_language
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON true
JOIN public.market_profiles mp ON mp.country_code=t.market_code
WHERE t.market_code='US' AND t.candidate_key='assembly:us-veneer-plaster-skim'
ON CONFLICT(topic_id,theme_key,language_code) DO NOTHING;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('USG, *Diamond Brand Veneer Finish Submittal*, P777', 'https://www.usg.com/content/dam/USG/pdpmovedocuments/diamond-veneer-finish-submittal-P777.pdf', 'USG', 'Citation for hand-applied veneer finish products over gypsum base and two-coat systems.'),
  ('USG, *Imperial Brand Veneer Finish Submittal*, P775', 'https://www.usg.com/content/dam/USG_Marketing_Communications/united_states/product_promotional_materials/finished_assets/imperial-veneer-finish-submittal-P775.pdf', 'USG', 'Citation for high-strength single-coat veneer finish over gypsum base.'),
  ('National Gypsum, *Installing One and Two Coat Veneer Plaster Systems*', 'https://www.nationalgypsum.com/ngconnects/blog/building-knowledge/installing-one-and-two-coat-veneer-plaster-systems', 'National Gypsum', 'Citation for step-by-step installation of plaster base and one- and two-coat veneer systems.'),
  ('National Gypsum, *Gold Bond Kal-Kote Gypsum Veneer Plastering Guide Specification*', 'https://www.buildsite.com/pdf/nationalgypsum/Gold-Bond-Kal-Kote-Smooth-Finish-Plaster-Guide-Specifications-2191557.pdf', 'National Gypsum', 'Citation for guide specification of base, one-coat, and two-coat veneer plaster systems.'),
  ('ASTM International, ASTM C843, *Standard Specification for Application of Gypsum Veneer Plaster*', 'https://www.astm.org/Standards/C843.htm', 'ASTM International', 'Citation for application criteria for gypsum veneer plaster.'),
  ('ASTM International, ASTM C844, *Standard Specification for Application of Gypsum Base to Receive Veneer Plaster*', 'https://www.astm.org/Standards/C844.htm', 'ASTM International', 'Citation for installation criteria for gypsum plaster base panels.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='US' AND t.candidate_key='assembly:us-veneer-plaster-skim'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'US','US',t.id,a.theme,'en','draft'
FROM (VALUES
  ('us-veneer-plaster-skim-overview', 'Veneer Plaster over Gypsum Board in the United States: System Overview', 'A US-focused overview of veneer plaster: thin troweled gypsum plaster over absorptive gypsum base, one-coat and two-coat systems, why the trade values it, and the standards that govern it.', $wallarticle1$# Veneer Plaster over Gypsum Board in the United States: System Overview

Between drywall and plaster, the American building trades kept a best-of-both surface, and veneer plaster is its name. The system hangs a special gypsum base panel, its face a highly absorptive paper that trades call blue board for its cool tint, and then trowels a thin coat of gypsum plaster over the entire surface. The result is a monolithic, hard, paint-ready wall with the look and durability of plaster at close to drywall speed, and the system has earned a loyal following in quality residential work, high-end commercial interiors, schools, and anywhere that walls take abuse and light is unforgiving. This article introduces the system as its manufacturers and standards present it: what it is, how its one-coat and two-coat variants differ, what it asks of a project, and what it delivers.

## The system in one honest paragraph

A veneer plaster wall is built in two movements. First the base: absorptive gypsum panels, tapered-edge, fastened to framing with their end joints staggered, installed per the application standard for gypsum base. Then the plaster: special-purpose gypsum plasters mixed per their bag instructions and troweled thinly over the whole face, over a pretreated, mesh-taped joint field, in a single coat or in the two-coat base-and-finish sequence, finished smooth or textured per the specification. The plaster bonds chemically and mechanically to the base''s thirsty face paper, the joints vanish beneath the continuous film, and the surface dries to a hard, dense, uniform plane that takes paint directly, with primer per the coating system and none of the sanding dust of the joint compound chain.

## One coat, two coats, and what each is for

The system''s two families serve different ambitions, and the manufacturers document both. The one-coat systems apply a single, thin pass of a veneer plaster over the taped base, and their appeal is speed, a day''s wall troweled in hours, with hardness and monolithic finish far beyond drywall. The two-coat systems add the sequence of a basecoat and a finish, building a slightly thicker, even harder surface, and they serve the abuse-prone and the perfectionist rooms. The choice is priced honestly at the bid: the one-coat wall costs somewhat more than taped drywall, the two-coat wall costs more still, and both buy durability, sound, and finish quality that drywall''s levels of finish reach only at their top and their most expensive.

## Why the trade keeps the system alive

Veneer plaster survived the drywall revolution because it answers complaints drywall cannot. Its surface is harder, resisting the dents and abrasion that mark compound-finished walls, which is why schools and hospital corridors have loved it for decades. Its finish is monolithic, hiding joints without the wide feathering and the critical-light risk of the compound chain, because the whole surface is one continuous plaster film rather than paper interrupted by joints. Its surface is paint-ready and forgiving, taking flat, satin, and even gloss coatings with honest uniformity, because there is no porosity mismatch to flash. And its installation is fast and quiet by plaster standards, one thin troweled coat instead of three-coat work over lath, with none of the sanding that makes drywall finishing a dusty week. The trade that knows the system prices it into quality interiors confidently, and the trade that does not misprices it as a luxury and loses its advantages to habit.

## The standards and documents that govern

The system''s paper trail is compact and readable. ASTM C844 governs the application of the gypsum base itself, the panel installation the plaster depends on. ASTM C843 governs the application of the veneer plaster over that base. The product literature, USG''s Diamond and Imperial veneer finish submittals among them, defines the materials'' mixing, thickness, and finish expectations, and the manufacturer guides, National Gypsum''s installation sequence among them, walk the field through base, tape, and coat. The guide specifications assembled around the Gold Bond products show how the system is specified in contract language, base, one-coat or two-coat products, tapes, and the standards each references. Nothing about the system is folklore; the whole of it has been documented for decades by an industry that kept its plaster craft alive by pairing it with board products.

## What the system asks, honestly stated

Veneer plaster''s demands are the mirror of its advantages. It wants a conditioned space, because gypsum plaster sets and dries by chemistry and evaporation that temperature and humidity govern. It wants scheduling discipline, because the base''s absorptive face is time-sensitive, and the manufacturers warn plainly that base left standing too long, or faded by light, bonds poorly and may need a bonding treatment before the plaster follows. It wants trained hands, because troweling a thin, uniform, monolithic coat is a craft skill the compound trades do not automatically bring, and the difference between a smooth system and a ridged one is entirely in the wrist. And it wants a realist''s maintenance file, because repairs, while simpler in some ways than compound repairs, need the plaster products and the matching technique, and the building that treasures its veneer walls does well to keep their story in writing.

## Where the system sits among its neighbors

In the American interior''s family of surfaces, veneer plaster is the connoisseur''s drywall and the democrat''s plaster. Against the drywall chain, it offers its monolithic hardness at a modest premium over the highest compound levels. Against conventional plaster, it offers modern speed, board availability, and the familiar framing world. Its natural habitats are the projects that keep walls for decades, schools, institutional work, quality custom homes, and the ceilings and feature walls of commercial interiors whose owners want the plaster look without the plaster schedule. For FRELUX''s international readers, the system is also a window into the American trade''s continuity, the old plaster craft surviving inside the gypsum age by adapting to the board.

## What this overview decides, and what it does not

This article is the map, not the decision. Whether a given project suits veneer plaster, one coat or two, smooth or textured, is a specification question answered from budget, exposure, and labor availability, and the articles that follow take the system in execution order: the materials aisle, the field sequence from base to troweled finish, the quality program for a surface whose beauty is its uniformity, and the maintenance that keeps the monolithic wall monolithic for the building''s whole life.

## A short history: plaster''s adaptation that survived

Veneer plaster is the plaster trade''s answer to the gypsum age, and its history explains its character. As gypsum board displaced three-coat plaster after the war, the plaster industry asked what its craft could do over the new panels, and the answer was the absorptive-faced base and the thin, troweled coat: plaster''s hardness and monolithic beauty, delivered at board-speed. The products that answered, Imperial and Kal-Kore and their siblings, are still with us because the answer was sound, and the system today occupies a stable niche, the premium interior surface for owners who want plaster''s virtues without plaster''s schedule. The reader who understands the history understands the system''s psychology: it is a craft tradition that chose to modernize, and it carries both halves of that choice, the old standards of the plasterer and the new logistics of the board trade.

## The system''s economics, stated once

The money question deserves a plain answer. Veneer plaster costs more than standard drywall finishing, moderately for the one-coat systems and more for the two-coat, and it costs less than conventional plaster. What the premium buys is a harder, more abuse-tolerant, more uniform surface with simpler repaints and a longer service life, and the buyers who specify it, schools, hospitals, quality residential and commercial work, are buying the decades rather than the day. The honest estimator prices the system''s labor realistically, the trowel hands are scarcer than the compound hands, and the honest owner weighs the premium against the maintenance ledger the wall will write. FRELUX''s wall-finishing estimator runs this arithmetic for US assemblies, and the system that is priced honestly is the system that delivers its value.

## What the overview asks the reader to hold

Hold the image of the monolith. Every advantage the system offers, the hidden joints, the hard face, the uniform paint, the quiet decades, flows from one design decision: the entire surface is one material, applied continuously, over a base made to receive it. Every demand the system makes, the fresh base, the matched chemistry, the trained wrist, protects that same decision. The articles that follow simply elaborate the image, and the reader who keeps it will find every detail of the system making sense at once.

## The system and the drywall chain, compared honestly

Because most readers arrive from the compound chain, a comparison closes the overview. The drywall chain hides joints by feathering wide and praying the light is kind; veneer plaster hides joints by covering them with the same material that covers everything, and the difference under grazing light is the difference between an essay and a monolith. The compound chain sands; the plaster system trowels, and the building''s dust and its finish quality both change accordingly. The compound chain repairs with any pail from any aisle; the plaster wall repairs with its own chemistry, and the discipline cuts both ways. The two systems share the gypsum family''s moisture rule and its standards culture, and the reader who knows both buys the right one per room, which is the highest form of the trade''s literacy.

## Reading the walls that already exist

The overview''s last skill is the reverse read, the wall without documents. The uniform, hard, faintly cool surface with no joint ghosts is the veneer tradition; the raking light finds its age in the movement cracks and the impact repairs, and the steward who identifies the system correctly repairs it with the right chemistry and keeps it out of the compound aisle''s habits. Half the maintenance trouble in plastered buildings begins with a misdiagnosis at this first read, and the overview''s job is to prevent it.

## Where the reader meets this system

The overview closes by naming the rooms where readers actually encounter veneer plaster: the school corridor whose walls have taken a half-century of book bags, the hospital hallway repainted in every color scheme without ever showing a joint, the custom home''s smooth feature walls, the commercial lobby whose grazing fixtures interrogate every surface and find the veneer wall silent. The system is rare enough to be special and established enough to be everywhere that quality concentrates, and the reader who can name it when they meet it is halfway to maintaining it properly, which is all any overview can ask.

## References
1. USG, *Diamond Brand Veneer Finish Submittal*, P777.
2. USG, *Imperial Brand Veneer Finish Submittal*, P775.
3. National Gypsum, *Installing One and Two Coat Veneer Plaster Systems*.
4. National Gypsum, *Gold Bond Kal-Kote Gypsum Veneer Plastering Guide Specification*.
5. ASTM International, ASTM C843, *Standard Specification for Application of Gypsum Veneer Plaster*.
6. ASTM International, ASTM C844, *Standard Specification for Application of Gypsum Base to Receive Veneer Plaster*.$wallarticle1$, 'overview', 10),
  ('us-veneer-plaster-skim-materials', 'Selecting Materials for US Veneer Plaster Systems', 'A US-focused guide to the gypsum bases, one-coat and two-coat veneer plasters, tapes, bonding agents, and tools of the veneer plaster aisle, chosen as one matched system.', $wallarticle2$# Selecting Materials for US Veneer Plaster Systems

The veneer plaster aisle is small, and that is its charm and its trap: a handful of products must work as one chemistry, and a single mismatched substitution can compromise the whole surface. The selection is best read as one system chosen from one manufacturer''s literature, verified against the standards, and staged fresh. This article walks the aisle in the order the wall consumes it.

## The base: the board that makes it veneer

Everything begins with the absorptive gypsum base, the panel whose thirsty face paper accepts and bonds the thin plaster coat, and whose selection is not optional, ordinary drywall''s glass-smooth face will not bond a veneer coat reliably, and the substitution is the classic system-destroying mistake. The manufacturers'' bases, USG''s Imperial and Gold Bond''s Kal-Kore among them, come in the thicknesses and edge profiles the systems call for, in standard and fire-rated cores for the assemblies the drawings name, and their application is governed by ASTM C844. The buyer verifies the correct product by name, checks the delivery against it, and protects the panels'' face from the fading that light and time inflict, because the manufacturers are explicit that a faded face bonds poorly and may require a bonding treatment before plastering.

## One-coat products: the speed family

The one-coat systems use a single veneer plaster applied thinly over the taped base, and the aisle''s examples, Gold Bond''s Uni-Kal and X-KALibur, USG''s Imperial veneer finish among the single-coat finishes, are chosen by the set times their bags declare, the extended-set products buying workability for large areas and hot weather, the standard products buying speed for scheduled efficiency. The selection questions are honest and few: how much wall per hour will the crew trowel, what set time does the project''s temperature and pace need, and what finish, smooth or textured, does the room expect. The one-coat products are the system''s economy, and their freshness is their chemistry, bags stored dry, dated, and used within their seasons.

## Two-coat products: the basecoat and finish pair

The two-coat systems build the same wall in two passes, a basecoat over the taped joints and field, then a finish coat, and their products, Gold Bond''s Kal-Kote basecoat and finish pair, USG''s Diamond veneer finish applied over its basecoat among the documented sequences, are selected and used strictly as the manufacturer pairs them. The basecoat builds thickness and fills; the finish brings the hardness, color, and the trowel''s final word; and mixing the pairs across manufacturers or across generations of product lines is chemistry introduced to strangers. The two-coat aisle serves the abuse-heavy and the critical-light rooms, and its products'' submittals define the thicknesses, coverage, and the finish options, smooth or textured, that the specification chooses between.

## Tape, trim, and the reinforcement details

The joint treatment beneath the plaster is its own small aisle: the coated fiberglass reinforcing tapes made for veneer systems, wider than compound-chain tapes and embedded in the pretreatment pass the manufacturers specify, and the metal and vinyl trims that give the system''s corners and edges their lines. The tape choice is not cosmetic, the mesh is the joint''s reinforcement within the plaster film, and the manufacturer''s tape is chosen with the manufacturer''s plaster, per the guides that pair them by name. Trim accessories are selected by exposure, outside corners taking the bead their finish expects, and the case-by-case items, control joints where the design calls for them, are ordered per the drawings rather than improvised on site.

## Bonding agents and the repair chemistry

The bonding aisle is the system''s insurance. Where the base has waited too long, faded in light, or been contaminated, and the manufacturers'' literature says plainly that this happens and what to do, the bonding agent restores the surface chemistry the plaster needs, chosen from the same manufacturer''s line and applied per its instructions. The same aisle serves repairs, patches, and the spot treatments the maintenance years will need, and the wise buyer learns it during the project, not after it, because the building that loves its veneer walls will repair them with the same chemistry that built them.

## Tools: the craft''s short list

The veneer trade''s tools are few and personal: the trowel, the hawk, the mixing drum and the drill arm, the brushes for the water''s kiss at the edges, the floats for the textured finishes. The trowel is the craft''s instrument, kept clean, kept flexible, and owned rather than borrowed, because the wrist that knows it leaves the finish the surface is famous for. The tools are inexpensive, their maintenance is daily, and the difference between a monolithic wall and a ridged one lives in them and in the hands that hold them, which is why the aisle''s last item, the skilled applicator, is the only one the budget cannot shortcut.

## Storage, freshness, and the perishable aisle

Every product in this system is perishable in the way gypsum chemistry is. The plasters set by crystallization that moisture initiates, so bags live dry, off the floor, and inside the conditioned space; mixed plaster goes on the wall within its set window or not at all; the base panels keep their faces shaded and their stacks dry, and the project that respects the chemistry''s schedule is the project whose walls set hard, bond true, and finish beautifully. The aisle''s materials are honest, and they repay the honesty of their handling many times over.

## The takeoff and the estimator''s arithmetic

The veneer aisle''s quantities run through the system''s own coverage figures: base panels by area with the waste of cutting and openings, tape by the joint footage, plaster by the bags the manufacturers'' coverage tables state for the wall''s area and the coat''s thickness, bonding agent for the faces the schedule may age, and the coating system''s gallons over the finished uniform field. The one-coat and two-coat systems consume differently, the two-coat buying its extra hardness with the basecoat''s bags and the extra day, and the takeoff prices the choice honestly before the first bag opens. FRELUX''s estimator gives the US veneer assemblies their second calculation, and the project that checks its takeoff against it orders once, finishes once, and stands by both.

## The specification''s short list, for buyers who write their own

The buyer''s submittal list is the aisle distilled: the base by product name and core type, the veneer system named as the manufacturer pairs it, the tape by name, the bonding agent from the same shelf, and the standards, the base application and veneer application specifications, written in as the references that govern. The guide specifications the manufacturers publish show exactly how this list is assembled in contract language, and the buyer who adapts one writes a specification that the trade respects and the inspector can enforce, which is the whole art of buying a chemistry honestly.

## Why one manufacturer''s shelf, stated as chemistry

The aisle''s deepest rule deserves its own closing statement: the veneer system is one manufacturer''s chemistry, and the shelf is chosen as one shelf. The base''s paper is designed for the plaster''s grip; the tape is designed for the plaster''s embedment; the bonding agent is designed for the base''s face; the finish is designed over its own basecoat. The cross-aisle substitution that the compound trades tolerate routinely is, in this system, an experiment run on the client''s wall, and the manufacturers'' pairings by name are the industry''s way of saying so. The buyer who honors the shelf buys the system the way it was tested, and the wall behaves the way the literature promised.

## Quantity, freshness, and the schedule''s handshake

The aisle''s final discipline is the handshake between quantity and schedule: buy to the takeoff, stage to the sequence, and use within the windows. Plaster bought late and rushed arrives stressed; plaster bought early and stored long arrives past its best; the takeoff that respects the coverage tables and the schedule that respects the chemistry meet in the middle, on a wall that sets when it should and finishes as it must. The buyer''s calendar and the plasterer''s wrist are colleagues, and the aisle is where their handshake happens.

## The accessories and the consumables, completed

The aisle''s small items complete the system and deserve their line items: the staples for the mesh, the mixing drums and the drill arms in the sizes the batches actually are, the water buckets kept clean as the chemistry''s instruments, the sponges and floats of the finish''s two words, and the protection, paper, tapes, and drop surfaces, that keeps the troweled wall''s splash off the floors the other trades own. None of these items is glamorous and every one of them appears in the difference between a professional day and a rushed one, and the buyer who completes the list orders once and stages once, which is the aisle''s whole logistics.

## The environmental note, briefly

The modern veneer aisle carries its environmental tier as well, recycled-content bases and low-emission products documented in the submittals rather than advertised in adjectives, and the specification with indoor-air goals names its documents. The buyer''s verification habit is unchanged, the claim checked against the product data, and the system''s honesty is unchanged, the environmental tier is a characteristic of the products, not a substitute for the shelf''s chemistry or the field''s discipline.

## The one-aisle summary, for the buyer in a hurry

The buyer who reads only one paragraph of the materials article should read this one: order the absorptive base by product name and protect its face, order the plaster system as the manufacturer pairs it, one-coat or two-coat as the specification chooses, order the manufacturer''s mesh tape and the bonding agent from the same shelf, buy the trowel''s few tools and the protection''s few consumables, and stage everything fresh, dry, and inside the conditioned space. That single sentence, honored, is the aisle''s entire contribution to a successful wall, and every paragraph above it is the same sentence with its reasons shown.

## The submittal packet, assembled and read

The materials article''s last practical act is the submittal packet, assembled once and read by everyone: the base''s product data and fire-rating listings, the plaster system''s submittals with their mixing and thickness tables, the tape''s and bonding agent''s data sheets, and the guide specification that binds the pile into contract language. The packet is the aisle''s translation into paperwork, the inspector''s reference, and the maintenance file''s first pages, and the buyer who assembles it before the first pallet ships has bought the project its smoothest possible path. The packet, like the shelf it documents, is chosen as one system, and its completeness is the first quality gate the project passes.

## References
1. National Gypsum, *Installing One and Two Coat Veneer Plaster Systems*.
2. National Gypsum, *Gold Bond Kal-Kote Gypsum Veneer Plastering Guide Specification*.
3. USG, *Imperial Brand Veneer Finish Submittal*, P775.
4. USG, *Diamond Brand Veneer Finish Submittal*, P777.
5. ASTM International, ASTM C844, *Standard Specification for Application of Gypsum Base to Receive Veneer Plaster*.$wallarticle2$, 'materials', 10),
  ('us-veneer-plaster-skim-installation', 'Installing Veneer Plaster in the United States: Field Sequence', 'A sequenced US field guide to veneer plaster: base installation and protection, mesh taping, mixing discipline, one-coat and two-coat troweling, set and finish, and the conditioning the chemistry demands.', $wallarticle3$# Installing Veneer Plaster in the United States: A Sequenced Field Guide

Veneer plaster installation is a rhythm: the base goes up like drywall, the joints are pretreated and taped, and then the whole wall receives its thin, continuous coat of plaster in a single coordinated performance whose quality is decided by preparation, temperature, and wrist. The standards, ASTM C844 for the base and C843 for the plaster, frame the sequence, and the manufacturers'' guides, National Gypsum''s among them, walk it step by step. This article assembles the field craft in execution order.

## Prepare the substrate and the building

The sequence begins as every interior finish does, with acceptance of what lies beneath and conditioning of the air the finish needs. Framing is inspected for alignment and fastening, the space is brought to the temperature and ventilation the plaster products'' literature calls for, and the materials are staged inside, dry and dated. The base panels are handled with their faces protected, because the absorptive paper that bonds the plaster is also the paper that light and time fade, and the manufacturers'' warning is explicit: base left standing too long bonds poorly, and faded faces may need a bonding agent before the plaster follows. The professional schedule hangs the base close ahead of the plastering, close enough that the chemistry meets a thirsty face, and the sequence itself becomes the quality plan.

## Hang the base to the plaster''s standards

The base installation follows the gypsum base application standard: panels fastened to the framing with the bugle-head screws the guides name, ends in light contact, end joints staggered, openings cut clean, and the whole surface true, because the thin plaster coat that follows is a witness, not a corrector, of the base''s honesty. The guides sequence the work plainly, upper corner first, marks and receptacles cut before the panel goes up, and the crew that hangs plaster base like it treasures it, square, plumb, and gently handled, has finished the hardest part of a successful veneer job before the first bag opens.

## Tape and pretreat the joints

The joint treatment is the system''s hidden reinforcement. The coated fiberglass tape is applied over the joints and angles, stapled or embedded per the manufacturer''s sequence, wider and different from the paper tape of the compound chain, and the joints receive their pretreatment pass of the basecoat or one-coat plaster before the field coat covers everything. The pretreatment fills the tapered edges, embeds the mesh, and gives the field coat a level highway over the joints, and the crew that treats this pass casually plants the ridges the finish coat will publish. The tape is the manufacturer''s, matched by name to the plaster, and the staples are the guides'', because this is a chemistry, and chemistry forgives fewer improvisations than the compound trades are used to.

## Mix for the set you can actually work

The plaster is mixed per the bag, to the water proportion the instructions state, with clean cold water, a clean drum, and a batch size the crew can trowel within the set time the product declares. The extended-set products buy time for large walls and warm days; the standard products demand the disciplined batch rhythm of a crew that knows its own speed; and retempering, reviving, or stretching a batch past its window is the classic self-inflicted failure, because plaster that begins setting in the drum goes on the wall as lumps, and lumps under a monolithic finish are forever. The mixing station is the chemistry''s bench, kept clean, kept shaded, and kept honest.

## Trowel the one-coat wall

The one-coat application is the system''s sprint. The mixed plaster goes onto the hawk and onto the wall in thin, confident passes, worked to the thickness the submittal defines, over the pretreated joints and the whole field, in the continuous rhythm that ends each panel before the set begins. The trowel''s edge brings the surface to its plane, the water brush eases the edges where the passes meet, and the finish, smooth or textured, is chosen and executed per the specification and the product''s finish options. The one-coat wall''s quality is visible in hours, and its signature is the disappearance of the joints beneath a continuous, uniform film whose hardness will surprise anyone who grew up on compound.

## Build the two-coat wall

The two-coat sequence adds patience between passes: the basecoat over the taped joints and field, applied to its thickness and allowed its set, then the finish coat, thinner and harder, troweled to the surface the room was promised. The basecoat is the builder, filling and leveling; the finish is the artist, bringing the color, the density, and the trowel''s final word; and the pair is applied strictly in the manufacturer''s sequence, with the set windows between respected as structure. The two-coat wall serves the abuse-heavy rooms and the critical light, and its extra day and extra labor buy the hardest surface the gypsum tradition offers short of conventional plaster itself.

## Set, dry, and the painting that follows

The wall sets by crystallization within hours and dries to paint-readiness over the days the products'' literature defines, in the conditioned space the project maintains, and the drying is verified honestly, by the wall''s color and feel, before the coating schedule begins. The finished surface takes its coating system directly, primer per the paint manufacturer''s masonry-of-gypsum guidance, and the uniform, unjointed substrate delivers the sheen and color uniformity that compound-finished walls only reach at their highest levels and their greatest expense. The closeout walk under the room''s own light finds, in a wall built to this sequence, nothing to find, and that silence is the system''s whole promise kept.

## The habits that make the system shine

The crews that deliver beautiful veneer plaster share habits: the base hung fresh and never faded, the joints taped and pretreated without exception, the batches mixed to the bag and used within their window, the wall conditioned before, during, and after, and the trowel work performed by the hands that know it. The system rewards discipline with one of the finest interior surfaces in the American repertoire, and it punishes shortcuts with exactly the defects its literature catalogs, and the crew that has read both lists knows which one it is on.

## Conditioning through the whole schedule

The chemistry''s environment deserves one more paragraph, because it spans the whole sequence rather than a single stage. The base wants a dry, conditioned building before it is hung and after, while it waits its plastering; the plaster wants the temperatures and ventilation its bag states, through set and through dry; and the finished wall wants the building''s systems honest before the coating schedule begins, because a wall finished into a cold, wet building carries that history under its paint forever. The superintendent who holds the interior climate across the sequence, not merely on plastering day, is the quiet co-author of every successful veneer wall, and the schedule that budgets conditioning is the schedule that does not pay for it twice.

## Coordination with the trades around the plaster

The veneer sequence is short but particular about its neighbors. The base''s installation shares the framing and fastening world with the hangers; the plastering day wants the room clear, the other trades elsewhere, and the floors protected from the splash a troweled wall occasionally sheds; and the coating trades follow only after the dry the products define. The crew that publishes this short calendar to the project, base on these days, plaster on that one, no traffic until the set, paint the week after, finishes the system inside a building that cooperates with it, and the building that cooperates is half the quality.

## A closing word on the craft''s dignity

The field guide''s last paragraph belongs to the hands. Veneer plaster is one of the remaining places in American construction where a craft skill is visible in the finished product every day of the building''s life, the trowel''s rhythm read in the wall''s plane decades after the wrist that set it has gone home. The crews that carry the skill are fewer than the walls that deserve them, and the project that finds one should schedule it kindly, stage it honestly, and let the system show what it can do. The standards and the submittals govern the science; the craft governs the result; and the veneer wall, more than any surface in the gypsum family, is the meeting of the two.

## The finish''s two words, smooth and texture

The field guide''s last operational note is the finish''s fork. The smooth finish is the system''s signature, troweled to the plane and painted glossy or flat with equal confidence, and it demands the crew''s best rhythm. The textured finishes, floated or otherwise patterned per the products'' finish options, forgive the wall''s minor events and change the light''s conversation, and they demand the float''s own rhythm instead. The specification names the fork, the sample panel referees it, and the crew that has read both this article and its own wrists delivers whichever fork was named.

## The scaffold''s week, written plainly

A closing picture of the sequence as it occupies a real week: day one, the base hung, taped, and pretreated, the building conditioned and the materials staged; day two, the plastering day itself, the drum''s rhythm and the trowel''s passes, the wall set by evening and drying through the night; the days after, the dry verified, the coating scheduled, the room returned to the building''s calendar. The veneer wall compresses the compound chain''s week of coats and sandings into a rhythm this short, and the superintendent who sees the schedule written this plainly schedules the building around it gratefully. The wall that follows this week keeps its monolith, and the week that respects the chemistry ends the way this field guide ends, with a closeout walk that finds nothing to find.

## One last caution the literature keeps repeating

The manufacturers'' most repeated warning deserves the field guide''s last word: do not let the base outpace the plaster. Base hung weeks early, faces faded by light and time, is the system''s most common self-inflicted wound, and the bonding agent that rescues a faded face is a treatment, not a restoration, and the schedule that avoids the fading entirely is the schedule that never needs the rescue. The sequence''s whole art is keeping the base and the plaster in the same week, the chemistry and the surface in the same condition, and the crew that masters nothing else from this guide should master the calendar it implies.

## References
1. National Gypsum, *Installing One and Two Coat Veneer Plaster Systems*.
2. ASTM International, ASTM C843, *Standard Specification for Application of Gypsum Veneer Plaster*.
3. ASTM International, ASTM C844, *Standard Specification for Application of Gypsum Base to Receive Veneer Plaster*.
4. USG, *Diamond Brand Veneer Finish Submittal*, P777.
5. USG, *Imperial Brand Veneer Finish Submittal*, P775.$wallarticle3$, 'installation', 10),
  ('us-veneer-plaster-skim-quality-checks', 'Quality Checks and Common Defects in Veneer Plaster', 'A practical US quality-control guide for veneer plaster: acceptance of the monolithic surface, base and bond verification, the recurring defects from bond failure to ridging, and corrections that respect the chemistry.', $wallarticle4$# Quality Checks and Common Defects in Veneer Plaster

Quality control for veneer plaster is quality control of a chemistry''s witnesses. The system''s beauty is its continuity, a surface with no joints to find and no fasteners to count, and its defects are the record of where the chemistry, the preparation, or the wrist fell short. The inspection program verifies the stages the plaster will hide, reads the finished surface under the room''s own light, and knows the defect catalog the manufacturers'' literature has been writing for decades. This article is that program.

## The gates, before the plaster covers them

The veneer wall''s decisive inspections happen while the evidence is open. Gate one, the base: correct product by name, hung to the base application standard, fastened, staggered, true, and fresh, with the manufacturers'' fading warning honored in the schedule, any questionable face documented and slated for the bonding treatment. Gate two, the joints: the manufacturer''s mesh tape, embedded or stapled per the guide, and the pretreatment pass placed before the field coat. Gate three, the environment: temperature, ventilation, and materials staged to the products'' literature, because the chemistry that follows sets by conditions the program either verified or ignored. The plaster coat is the last chance to see any of this, and the program''s photographs of the gates are the wall''s warranty in the only currency that matters, evidence.

## Acceptance of the finished surface

The finished wall is accepted for what it is, a monolithic plane. The inspection walks it under the room''s own lighting, at its viewing distances, and asks the system''s own questions: is the surface continuous, with no joint shadows, fastener ghosts, or panel boundaries reading through the film? Is the plane true, the trowel''s ridges and hollows absent, the corners and beads straight? Is the finish uniform, smooth or textured per the specification, the color consistent field-wide, and the thickness within the product''s defined range? Is the surface hard, cured to the density the system promises, and sound, with no soft spots, drumming areas, or bond-suspicious hollows? The wall that answers yes to all of it has delivered the system''s entire point, and the wall that answers no is telling the inspector which gate failed, because in veneer plaster the defects name their own causes.

## The defect catalog, from cause to correction

The system''s recurring failures are few and famous. Bond failure, the coat that lifts or drums over patches of the surface: the faded or contaminated base face, the damp or dusty panel, the batch applied to a wall the chemistry could not grip; corrected by removing the failed area to sound material, restoring the face''s condition per the bonding aisle, and replastering honestly. Pinholes and sweat-outs, the small blemishes where the set misbehaved: the mixing, temperature, or retempered batch''s testimony; corrected by the touch-out techniques the manufacturers document, and prevented by the mixing discipline. Ridging at joints, the ghost lines the trowel left or the pretreatment permitted: the pretreatment pass too thin, the tape''s crown, the field coat''s feathering; corrected before paint by the local refinishing the surface accepts. Soft spots and slow sets, areas that stayed wet and weak: the cold wall, the hot batch, the water ratio the bag did not sanction; corrected honestly where the set never came, by removal and replacement rather than paint. Cracks at corners and openings, the movement the framing or the assembly imposed: the system''s honest response to stress rather than a defect of the chemistry; corrected by the movement accommodation the design calls for and the refinishing that follows. The catalog''s lesson is the article''s thesis: veneer plaster''s defects are process failures with names, and the program that gates the process meets none of them.

## Reading the wall with the standards in hand

The inspection program''s authority is the written pair, the ASTM application standards and the manufacturers'' product literature, and the inspector walks the wall with both in mind: the base verified to its standard, the plaster applied within its product''s thickness and finish definitions, the set and dry verified before the coating schedule began. The disputes that veneer walls generate, and they are few compared to the compound chain''s, are settled by the documents, and the program that collected its evidence at the gates settles them in minutes.

## Records and the long memory

The program''s file is brief and valuable: the gates'' photographs, the products and batches, the mixing water''s source and the days'' temperatures, the closeout walk''s images under the room''s light. The file converts the wall''s future maintenance from archaeology into reading, and the veneer wall, which will outlast several generations of paint, deserves the biography. The buildings that keep these files are the buildings whose plastered rooms age into their reputations, and the buildings that do not keep them pay for the forgetting at every repair.

## The compressed philosophy

Gate the stages, mix to the bag, condition the space, trowel with intention, and read the defects as testimony. Veneer plaster is the most honest surface in the gypsum tradition, hard, uniform, and unforgiving of shortcuts in exactly the proportion that it is beautiful, and the quality program is simply the honesty, formalized.

## The sample panel''s place in a chemistry

Where the specification wants certainty, the veneer system accepts the trade''s oldest referee: the sample panel, built by the project''s own crew, on the project''s own base, with the project''s own bags, and approved by all parties before production begins. The panel shows the finish''s texture and color, the trowel''s rhythm, and the hardness the room was promised, and it converts the specification''s adjectives into evidence the punch list can point to. On the systems whose beauty is uniformity, the panel also sets the uniformity''s bar, and the crews that build to an approved panel finish walls that argue nothing at closeout.

## The classification, three honest answers

The findings resolve into the trade''s three classes, applied here through the chemistry''s lens. Cosmetic and stable, a whisper of texture variation within the finish''s own definition: accept and record. Reparable, the pinhole, the ridge, the small bond spot: correct with the system''s chemistry and the manufacturer''s techniques, verify, and record. Systemic, bond failure across a plane, soft sets through a wall, the moisture findings: stop, because a systemic defect in a chemistry is the process or the environment speaking, and it will keep speaking until the process or the environment changes. The classification is the inspector''s judgment, and the veneer system, honest as it is, makes the classification easier than any surface in the gypsum family.

## The inspector''s five-minute close read

The portable protocol, one more time, veneer edition: walk the wall under the room''s own light; read the plane for continuity, the monolith for joint ghosts; read the corners and openings for the movement the building wrote; sound any suspect area with the knuckle''s honest tap; and check the file for the gates the plaster buried. Five minutes, and the wall either testifies to its gates or confesses its shortcuts, and the veneer system, whose whole character is honesty, makes the read easier than any surface the inspector will ever walk.

## When to walk away from a dispute, and how

The program''s final skill is the graceful escalation. The finding that cannot be settled by the gates'' evidence, the bond question the photographs cannot answer, the moisture suspicion the file cannot close, goes to the parties who can: the manufacturer''s technical services, the standards'' inspection, and where warranted, the opening of the wall itself, documented. The professional program treats the escalation as evidence-gathering rather than argument, and the file that escalates cleanly is the file that settles quickly, because in veneer plaster, as in every chemistry, the truth is in the wall, and the wall is always available to those who read it respectfully.

## The file''s last virtue, speed

The quality program''s record earns one more sentence than the other articles gave it, because in veneer plaster the file is faster than any other surface''s: a wall with its gates photographed and its batches recorded answers its disputes in minutes, its repairs are designed in minutes, and its repaints are specified in minutes, and the minutes compound across the decades the wall serves. The five-minute walks that wrote the file were the cheapest labor on the project, and their pages are the only project documents that appreciate.

## The honest close of the quality article

The article closes where the system''s quality actually lives: not in the inspection, which merely reads the wall, but in the sequence the inspection verifies, the fresh base, the matched chemistry, the conditioned space, and the honest wrist. The program described here is the reading taught to see, and the walls that reward the reading are the walls that were written to be read. Veneer plaster, of all the gypsum family''s surfaces, is the one that keeps this promise most purely, and the inspector who has learned to read it carries the trade''s standards, the manufacturers'' literature, and the craft''s dignity forward, one five-minute walk at a time.

## The lighting, agreed before the trowel

The veneer wall''s acceptance deserves one final note on light, because the monolith is a light-dependent promise: the wall that is silent under grazing fixtures was built for them, and the wall finished smooth under work lights may not have been. The specification''s honest sentence names the room''s final lighting at the beginning, the sample panel is approved under it, and the closeout walk uses it, and the wall whose light was agreed early argues nothing at the end. The inspectors who skip this agreement conduct their walks anyway, and the walls they walk testify to the skipping in every angle the fixtures make.

## The three boundaries the program holds absolutely

The veneer quality program holds three boundaries without negotiation, and naming them is the article''s last duty. First, the base boundary: no plaster over a faded, contaminated, or unverified face without the bonding treatment the literature requires, because bond is the system''s foundation and the program either verifies it or schedules its failure. Second, the set boundary: no coating over a wall whose set and dry are unverified, because paint over green plaster is a bond argument scheduled for the repaint. Third, the moisture boundary: no cosmetics over water findings, ever, because the gypsum family''s one absolute rule is written in every standard and every article in this series, and the veneer system keeps it like the rest. The three boundaries are where the program earns its keep, and the walls that respect them are the walls whose closeout photographs end up in portfolios rather than in files of regret.

## References
1. National Gypsum, *Gold Bond Kal-Kote Gypsum Veneer Plastering Guide Specification*.
2. ASTM International, ASTM C843, *Standard Specification for Application of Gypsum Veneer Plaster*.
3. ASTM International, ASTM C844, *Standard Specification for Application of Gypsum Base to Receive Veneer Plaster*.
4. National Gypsum, *Installing One and Two Coat Veneer Plaster Systems*.$wallarticle4$, 'quality', 10),
  ('us-veneer-plaster-skim-maintenance-repair', 'Maintaining and Repairing US Veneer Plaster Walls', 'US guidance for the long care of veneer plaster surfaces: cleaning and repaint rhythm, crack and patch repair with matched chemistry, impact response, and the records that keep the monolithic wall whole.', $wallarticle5$# Maintaining and Repairing Veneer Plaster Walls in the United States

A veneer plaster wall is one of the longest-lived interior surfaces a building can own, and its maintenance is correspondingly quiet: the surface takes decades of wear that would mark compound-finished walls, its repaints are simple, and its repairs, when they come, are the craft''s own chemistry applied in miniature. The steward''s work is to respect the system''s identity, a hard, monolithic film over a gypsum base, and to repair it with the same materials and the same discipline that built it. This article covers the rhythms, the repairs, and the boundaries.

## How the system ages

The veneer wall ages by impact and by building movement, and only rarely by its own chemistry. The surface''s hardness shrugs off the abrasion that marks drywall, so the touch-height scuffs and furniture dents that dominate compound-wall maintenance are fewer and shallower here. Hairline cracks appear at corners and openings where the building''s framing moves, the same movement every gypsum surface answers. Water is the system''s one serious enemy, and the moisture findings that end the do-it-yourself conversation are the same here as throughout the gypsum family. Otherwise the wall simply endures, repainting gracefully for decades, and the steward''s calendar is correspondingly light.

## The repaint rhythm, honest and simple

Repainting a veneer wall is the compound chain''s easiest case, because there is no compound: the surface is uniform, absorbs uniformly, and takes the coating system directly, and the prep is wash, repair, prime, and paint rather than the feathering and sanding other walls demand. Primer equalizes the new repairs against the aged field, the coating''s sheen is chosen with the room''s wear and light, and the monolithic substrate delivers the color and sheen uniformity that other surfaces buy at their highest finish levels. The veneer wall''s repaints are cheap, and the building that keeps the coating schedule honest will find the wall outlasting its own paint generations.

## Repairs: the chemistry applied in miniature

The system''s repairs are the system''s products, and the aisle''s first lesson is to keep the wall''s own chemistry on the shelf. Small dents and chips are filled with the veneer products the wall was built of, or the patching chemistry the manufacturer offers for repairs, mixed and applied per their instructions, troweled flush, and finished to the plane, and the repair is primed and painted with the field. Cracks at movement are opened lightly, filled, and, where they recur, treated with the tape the system uses and refinished, because the wall''s own reinforcement is the correct answer to the wall''s own weakness. Larger damaged areas are corrected in the system''s sequence: the damaged plaster removed to sound edges, the base inspected and repaired, mesh over the patch, pretreatment, coat, finish, prime, paint, and the patch''s story written in the file. The repair''s craft is the same craft that built the wall, thin coats, honest batches, and a trowel held by hands that know the finish, and the repairs done this way vanish into the monolithic surface that earned its reputation.

## Impact, abuse, and the wall''s famous tolerance

The veneer wall''s hardness is its maintenance program''s best friend: the school corridor and the hospital hall take their daily abuse and show it less than any compound surface would. The response to impacts is proportionate: the bruised area is assessed, the dented or crushed spot repaired with the system''s chemistry if the base beneath is sound, and the base''s damage evaluated honestly where it is not, because a plaster film over crushed base is a repair scheduled to return. The steward''s protective habits, door stops, bumper pads, furniture discipline, cost almost nothing and preserve the surface''s signature hardness for the decades it was chosen for.

## Moisture: the boundary, stated plainly

The veneer system''s one unforgiving exposure is water. The gypsum base and the plaster film are both gypsum chemistry, and sustained dampness softens both, stains them, and creates the conditions the mold-prevention literature across the gypsum family treats as health matters rather than decorating matters. The steward''s rule is the family''s rule: find the source, stop it, dry the assembly, and evaluate the materials honestly, replacing wet gypsum rather than drying it by hope, and painting over the stain only after the water''s story has been closed. A veneer wall that has been wet and dried soundly can be repaired to its former self; a veneer wall that stays wet is a plumbing and remediation conversation, and the file that recorded the event is the owner''s best evidence.

## The records that keep a hard wall soft-spoken

The veneer wall''s file is short and worth keeping: the products and batches it was built of, the repairs with their dates and materials, the moisture events and their resolutions, and the coating history by room. The building whose file knows its plastered walls repairs them in hours instead of days, bids their maintenance honestly, and hands its stewards a surface whose whole story is legible. The system was chosen for its durability, and the file is how the durability is kept.

## The long view

Veneer plaster asks more of its builders than the compound chain and rewards its stewards more than any wall in the gypsum family: hardness that shrugs at decades, uniformity that makes repaints simple, repairs that vanish, and a surface whose quality is decided, once, by the discipline of the crew that built it and preserved, always, by the discipline of the hands that keep it. The wall''s quiet is the steward''s profit, and the system''s whole literature, from the standards to the submittals this article cites, exists to keep that quiet unbroken.

## The steward''s annual walk, veneer edition

The veneer wall''s yearly walk is short because the wall is short on complaints: read the touch heights for the impacts the hardness did not fully shrug off, the corners and openings for the movement cracks that framing writes, the ceilings'' stains for the roof stories above them, and the base for the moisture the grade or the plumbing may be telling. Touch-ups and small repairs are done with the shelf''s chemistry while they are small, the coating schedule is honored, and the file gains its page. Ten minutes a room, once a year, and the system''s decades stay quiet.

## Passing the wall forward

The final act of veneer stewardship is the handover, the file and the shelf and the vocabulary passed to whoever holds the keys next: the products the wall was built of, the repairs it has received, the coating it wears, and the rule that the wall''s chemistry is not interchangeable. A veneer plaster wall with its story attached is one of the most legible surfaces a building can offer its next steward, and the legibility, like the hardness beneath it, was chosen and paid for. The building that receives it knowing what it holds will keep it beautifully, and the wall, which after all only ever asked to be understood, gets its wish.

## The last word on the quiet

Every article in this series has ended near the same place, and the ending is the system''s own truth: the veneer wall''s product is quiet. No joint shadows in the light, no scuffs at the touch heights, no maintenance arguments at the repaint, no repair that will not vanish. The steward''s whole job is to keep the chemistry''s honest bargains, the matched products, the prompt repairs, the dry wall, and the quiet keeps itself. That is the deal the system offers, and it has been offering it, unchanged in its essentials, for as long as the gypsum industry has existed.

## The quiet, kept, costs what it always cost

The series'' last arithmetic is small: an annual walk of minutes, a shelf of the wall''s own chemistry, repairs done at small, coatings kept honest, a file that grows a page a year. That is the whole of veneer plaster stewardship, and it is the cheapest maintenance program in the gypsum family precisely because the wall''s builders spent the effort once, at the beginning, in the discipline this series has described. The quiet was bought decades ago by the crew that hung the base fresh and troweled the coat true; the steward''s only job is not to disturb it, and the wall, patient as gypsum always is, will do the rest.

## A note for the reader who owns the next fifty years

The building that holds veneer plaster walls holds one of the trade''s crafts in physical form, and the next fifty years of those walls will be whatever their stewards make of them: kept quiet by the chemistry''s honest bargains, or chipped away by the compound aisle''s convenient improvisations. This series has argued for the quiet, and the argument ends where it began, in the image of the monolith, one material, one coat, one standard, kept whole by understanding. The stewards who hold the understanding hold the walls, and the walls, patient and hard and quietly beautiful, will hold the buildings up behind them for as long as anyone asks.

## The file, the shelf, and the walk, one final inventory

The steward''s kit, inventoried one final time, is almost embarrassingly small: a file of the wall''s products, batches, repairs, and coatings; a shelf of the system''s own chemistry for the repairs that will come; the habit of the annual walk with the room''s own light; and this article''s two rules, repair with the wall''s own chemistry and read the water before the cosmetics. With those four items the steward keeps a veneer wall for the building''s whole life, and without them the wall keeps a surprise for every era''s renovator. The kit is the quiet''s insurance policy, and the premium, as the series has said each time, is almost nothing.

## Closing the series with the craft''s own compliment

The plaster tradition has a compliment it pays its best walls, older than any standard cited in this series: they are said to look like nothing at all, no joints, no repairs, no events, just a surface that seems always to have been there. That compliment is the veneer system''s design specification, and it is the maintenance article''s final goal as well: a wall whose stewardship is invisible, whose file is boring, whose repairs vanish, and whose fifty-year walk finds the same quiet the first-day walk found. The craft deserves the compliment, the standards make it enforceable, and the steward, keeper of the file and the shelf and the walk, earns it simply by understanding what the wall already knows.

## References
1. National Gypsum, *Gold Bond Kal-Kote Gypsum Veneer Plastering Guide Specification*.
2. National Gypsum, *Installing One and Two Coat Veneer Plaster Systems*.
3. USG, *Imperial Brand Veneer Finish Submittal*, P775.
4. ASTM International, ASTM C843, *Standard Specification for Application of Gypsum Veneer Plaster*.$wallarticle5$, 'maintenance', 10)

) AS a(slug,title,excerpt,content,theme,read_time_minutes)
JOIN public.learn_wall_finishing_topics t ON t.market_code='US' AND t.candidate_key='assembly:us-veneer-plaster-skim'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
WHERE NOT EXISTS (SELECT 1 FROM public.learn_articles existing WHERE existing.slug=a.slug)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='US' AND t.market_code='US'
  AND t.candidate_key='assembly:us-veneer-plaster-skim'
  AND a.wall_topic_id=t.id AND a.wall_market_code='US' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en'
  AND a.slug IN ('us-veneer-plaster-skim-overview', 'us-veneer-plaster-skim-materials', 'us-veneer-plaster-skim-installation', 'us-veneer-plaster-skim-quality-checks', 'us-veneer-plaster-skim-maintenance-repair');

COMMIT;
