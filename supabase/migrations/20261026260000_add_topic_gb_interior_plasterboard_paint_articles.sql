-- Fifth authored GB batch: five researched draft articles for the UK plasterboard -> jointing -> optional skim -> mist -> emulsion chain.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, verified licence and attribution), never AI generated.
-- Articles remain drafts; publication/review gates are not bypassed.
-- Apply 20261024000000_global_wall_finishing_knowledge_library.sql first.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='GB' AND candidate_key='assembly:gb-interior-plasterboard-paint') THEN RAISE EXCEPTION 'GB interior plasterboard paint topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('British Gypsum, *Gyproc EasiFill 20 Installation Instructions*', 'https://www.british-gypsum.com/installation/installation-guidance-and-support/installation-guides/gyproc-easifill-20-installation-instructions', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK plasterboard jointing and paint chain; requires human local/editorial review before acceptance.'),
  ('British Gypsum, *Gyproc EasiFill 60 Installation Instructions*', 'https://www.british-gypsum.com/installation/installation-guidance-and-support/installation-guides/gyproc-easifill-60-installation-instructions', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK plasterboard jointing and paint chain; requires human local/editorial review before acceptance.'),
  ('British Gypsum, *Installation Guidance: Gyproc Ready Mix Joint Cement*', 'https://www.british-gypsum.com/documents/installation-guide/british-gypsum-installation-guidance-gyproc-ready-mix-joint-cement.pdf', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK plasterboard jointing and paint chain; requires human local/editorial review before acceptance.'),
  ('British Gypsum, *White Book: System Design Principles*', 'https://www.british-gypsum.com/documents/white-book/british-gypsum-wb-system-design-principles.pdf', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK plasterboard jointing and paint chain; requires human local/editorial review before acceptance.'),
  ('British Gypsum, *Gyproc WallBoard 12.5 mm, product data sheet*', 'https://www.british-gypsum.com/documents/product-data-sheet-pds/british-gypsum-pds-gyproc-wallboard-12-5mm.pdf', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK plasterboard jointing and paint chain; requires human local/editorial review before acceptance.'),
  ('British Gypsum, *Thistle Finishing Plaster, product data sheet*', 'https://www.british-gypsum.com/documents/product-data-sheet-pds/british-gypsum-pds-thistle-finishing-plaster.pdf', 'British Gypsum', 'Citation for one or more of five source-linked draft articles about the UK plasterboard jointing and paint chain; requires human local/editorial review before acceptance.'),
  ('Scottish Government, *Building standards technical handbook 2017: domestic (durability, workmanship and fitness of materials, citing BS 8000 workmanship codes)*', 'https://www.gov.scot/publications/building-standards-2017-domestic/0-general/08-durability-workmanship-and-fitness-of-materials/', 'Scottish Government', 'Citation for one or more of five source-linked draft articles about the UK plasterboard jointing and paint chain; requires human local/editorial review before acceptance.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='GB' AND t.candidate_key='assembly:gb-interior-plasterboard-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'GB','GB',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('gb-interior-plasterboard-paint-overview', 'UK Plasterboard to Emulsion: Chain Overview', 'A British overview of the drywall finishing chain: plasterboard linings, the jointing or skim fork, the mist coat, and the emulsion that meets the occupant, told as one connected craft.', $wallarticle1$# UK Plasterboard to Emulsion: Chain Overview

Most British interiors built in the last half century end their construction story with the same quiet object: a flat, pale board, fixed to a wall or a timber frame, finished at its seams, sealed, and painted. The plasterboard is the wall the room actually knows; the emulsion is the face the occupant actually touches. Between those two moments sits the craft this series describes: the jointing that makes a wall from separate boards, the optional skim that gives it the plaster finish Britain prefers, and the mist coat that decides whether the paint stays on. This is the second of the British assembly chains, the modern sibling of the block and skim chain, and it begins where the boards are already fixed, because the systems that carry them, timber frame, steel frame, masonry with dabs, have their own articles in this library.

## The chain in one paragraph, and its one honest fork

The chain reads: plasterboard, jointing, optional skim, mist coat, emulsion. Boards are fixed with their tapered edges meeting; the joints are taped and filled with jointing compound until the seams disappear; the wall is either left as a jointed board finish, sealed and painted, or it takes a thin skim of finishing plaster over the whole face before decorating. That fork is the chain's biggest decision, and it is made early, because it changes the materials, the programme, the skill set, and the surface the room will live with. A jointed board finish is the faster, thinner route, common in commercial fit-outs and increasingly in homes; a skimmed board gives the deep, monolithic face that British taste still calls a proper plastered wall. Neither is a compromise when it is done well, and neither forgives being done badly. The mist coat then seals the new surface, whatever fork it came from, and the emulsion gives the wall its colour and its sheen.

## Why this chain owns the modern British interior

Plasterboard became the default British lining because it does most of what wet plaster does, in a fraction of the time, in a factory-consistent board. It boards out a room in hours rather than days; it carries fire and acoustic performance through tested systems rather than site craftsmanship; and it waits, tolerant of the pause between trades that real building schedules always impose. The industry around it is mature: the boards themselves are specified to product data sheets, the jointing materials have installation instructions that a diligent dryliner can follow, and the White Book assembles the tested wall systems that make specification legible. That maturity is the reason this chain has earned articles of its own, and it is also the reason the articles are honest about where the craft still lives, because a chain this well documented still fails whenever the hands on the trowel rush the timing or skip the tape.

## The three-way meeting of board, compound, and paint

Every article in this series returns to one idea, and here the idea is the three-way meeting. The board is porous paper faced gypsum: it drinks paint unevenly unless sealed. The jointing compound is gypsum based too, but it drinks differently, and it shrinks as it sets and dries. The emulsion is a waterborne film that needs a surface of even porosity to dry evenly and stay put. The mist coat is the chain's answer to all three at once: a thinned first coat of paint, or a proprietary primer, that evens out the porosity of board and compound together, so the finishing coats never know there were two materials beneath them. Skip it and the wall tells the story itself, with dull patches called flashing where the board sucked the binder, or peeling where the paint lost its grip. The British Gypsum finishing plaster data sheet puts the rule plainly: make sure plasters are thoroughly dry before decorating, and use a permeable paint if you must decorate before full dryness.

## How the chain meets the occupant, and what it asks of them

The chain does not end when the decorator packs up, because the occupant inherits the wall's maintenance story. Plasterboard walls are kind to their owners: they take picture fixings, they patch quickly, and they repaint for decades. But they are also lighter and softer than blockwork, they forgive a knock less readily, and their jointing hates the building movement that a crack through a taped seam records forever. The maintenance article in this series hands the occupant the honest map: which fixings hold in board and which only pretend to, how to repair a dent or a hole with the same jointing materials the wall was born from, and when a blemish is cosmetic and when it is a symptom of something the wall is trying to say about moisture or movement.

## The chain's two honest weaknesses, told now rather than later

The chain has two weaknesses that the whole series keeps in view. The first is water: plasterboard and its compounds tolerate humidity in ordinary rooms, but a leak, a flood, or a persistent damp problem is the beginning of the end for a board face, and the honest response is to find and fix the water and replace the affected board, not to paint over the stain. The second is movement: a building that shrinks, settles, or flexes will telegraph its story through flat taped joints with more clarity than through a rougher finish, and the design of movement joints in long walls and the treatment of the board edges at openings are the chain's defence. Both weaknesses have honest answers, and both answers start with the specifier and the dryliner rather than the decorator.

## Reading the series, a reader's map

The five articles share one wall and one programme. The overview holds the map. The materials article walks the shelf: boards, tapes, compounds, the skim fork's plasters, the sealers and emulsions. The installation article walks the sequence: filling, taping, coating, feathering, skimming where chosen, misting, and the finishing coats. The quality article walks the inspection: the screw heads, the flat seams, the corners, the sanding dust, the light. The maintenance article walks the decades after handover. Read in order they describe one craft; read alone, each still stands on its own footings, because each opens by restating the chain in miniature before it narrows to its own subject.

## The fork's history, and why both branches survived

The jointing versus skim fork has a history worth knowing, because it explains why British rooms still argue about it. The skim branch descends from the wet plaster tradition the country grew up with, and when plasterboard arrived it was first treated as a plastering background, a board to be skimmed like any other. The jointing branch came later and from further away, a taping and filling craft that proved a board face could be decorated directly if its seams were made flat and its porosity sealed, and the commercial fit-out world adopted it for its speed. The fork survives because both branches matured: the skim kept the British face the market trusts, and the jointing kept the commercial programme alive, and neither branch displaced the other. The modern householder meets the argument as a choice between the plasterer's depth of finish and the dryliner's speed, and the honest overview refuses to rank them, because a wall from either branch, done well, outlives the argument.

## What the overview deliberately does not decide

The overview ends by declining to decide the four things that are not its business. It does not decide the board, because the specification owns that choice, from standard wallboard through the moisture resisting and fire performing boards the White Book catalogues, and the chain inherits whatever the building needed. It does not decide the fork, because the room's duty, the budget, and the finish culture decide it together, and the articles that follow describe both branches rather than grading them. It does not decide the paint, because the sheen is a bargain between washability and touch up kindness that the occupant strikes in their own light. And it does not decide the programme, because the wall's drying schedule belongs to the wall and the weather, and the chain's oldest failure is the schedule that overruled them.

## How the chain meets the room's other systems

The chain does not build its wall in isolation, because the plasterboard lining is also the room's acoustic and fire performance, its thermal line, and its services carrier, and the finishing passes either honour those roles or quietly undo them. The boards that carry a fire tested system hold their rating only while their joints are treated as the system's tested design intended, a truth the White Book's system principles make plain when they describe how gaps between boards are sealed as part of the finishing stage itself. The socket and switch openings the electrician cut, the service holes the plumber chased, and the board edges that met the window reveals all belong to the chain's care, because each is a joint in the wider sense, a place where the wall's continuity stops and restarts, and each is treated with the same tape and compound patience the flat seams receive. The overview keeps these meetings in view because the occupant never sees them, and the wall's performance depends on exactly the parts that disappear.

## A closing orientation, the map folded small

The overview closes the way the chain opens: with the whole story in one pocket sized paragraph. The boards give the wall its face; the jointing gives the face its continuity; the skim, where it is chosen, gives the continuity its British depth; the mist coat gives the paint its grip; and the emulsion gives the room its colour and its character. Every later article is one of those five moments told slowly, and every later article begins by restating this paragraph before it narrows. The reader who carries nothing else from the overview carries the paragraph, and the paragraph is the wall.

## The reader's honest position, and the series' promise

The overview's last promise belongs to the reader, whoever they are. The specifier finds the chain's decision points named in order; the dryliner finds the fork's respect for both branches; the decorator finds the drying rules that decide their calendar; and the occupant finds the maintenance article's map of the decades ahead. The series promises each of them the same thing: the wall's whole story, told with the standards open and the shortcuts named as shortcuts, so that the reader's own wall, whichever hands build it, gets the honesty that the printed chain assumes. That promise is the overview's final image, a wall built and finished by people who knew what the next trade needed, kept and repainted by people who knew what the wall was saying, and the library's small attempt to make that wall the ordinary one rather than the lucky one.

## References

1. British Gypsum, *Gyproc EasiFill 20 Installation Instructions*.
2. British Gypsum, *Gyproc EasiFill 60 Installation Instructions*.
3. British Gypsum, *Installation Guidance: Gyproc Ready Mix Joint Cement*.
4. British Gypsum, *White Book: System Design Principles*.
5. British Gypsum, *Gyproc WallBoard 12.5 mm, product data sheet*.
6. British Gypsum, *Thistle Finishing Plaster, product data sheet*.
7. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows the interior of a house under construction with drywall installed, taken by the photographer Gogrr and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle1$, 8, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Interior_of_54_Baker_St._Port_Elgin_during_construction_%283%29.jpg/1280px-Interior_of_54_Baker_St._Port_Elgin_during_construction_%283%29.jpg')
, ('gb-interior-plasterboard-paint-materials', 'Materials for UK Jointing and Emulsion Chains', 'A British materials guide to the plasterboard finishing shelf: boards, tapes, jointing compounds, skim fork plasters, sealers, emulsions, and the tools that make them behave.', $wallarticle2$# Materials for UK Jointing and Emulsion Chains

The materials article walks the shelf the chain is built from, and the shelf has an honest order to it: the boards themselves, the tapes and compounds that join them, the plasters of the optional skim fork, the sealers, and the paints. Each item earns its place by doing something the wall cannot do without, and each has a data sheet or installation instruction that tells the truth about how it behaves in British conditions. The buyer who reads the shelf in that order buys a wall rather than a pile of products.

## The boards, the chain's quiet foundation

The plasterboard is where the chain starts, even though the board was fixed before this series picked up the story, because the jointing materials and paints all assume the board's face: a paper liner over a gypsum core, with tapered or square edges that decide how the joints are treated. British board sizes and thicknesses are standardized in product data sheets, and the chain cares about the details that matter at the seams: board type for the room's duty, edge type for the joint treatment, and the face the mist coat will meet. The White Book assembles the tested systems, and the data sheets say what each board is for; the materials list respects both documents because the chain inherits whatever the specification chose.

## The tapes, the joints' reinforcement

Jointing tape is the quiet structural element of the chain, the reinforcement that keeps a seam from becoming a crack. The paper tapes are bedded in compound and are the traditional choice for tapered joints and internal angles; the self adhesive fibreglass meshes have their following for repairs and for those who prefer to fill straight over the mesh. The trade's own discussions about which tape belongs where are long and lively, and the honest materials answer is that the tape must suit the compound, the joint type, and the system guidance. The one rule that survives every debate: a joint that is not taped will crack, and a joint that is taped badly will crack along the tape instead of across it.

## The compounds, three honest working times

The jointing compounds are the shelf's heart. The powder compounds of the Gyproc EasiFill family are described by their working times: a twenty minute compound for quick fills and snagging, a sixty minute compound for bulk filling and joint finishing, and the intermediate grades between them. The installation instructions for each are specific, from the clean cold water they ask for to the mixing and the two coat habit that the sixty minute compound prefers, and the materials article treats those instructions as the compound's contract with the user. Ready mixed jointing cements are the other branch of the shelf, ready to stir and bed tape in their ~100mm bands straight from the tub, and their guidance is no less specific. The two families have different characters, the powders set chemically and predictably while the ready mixes dry and stay workable longer, and the shelf respects both by matching them to the job's size and the programme's pace.

## The skim fork's plasters

Where the chain takes its skim fork, the shelf changes character: the jointing compounds wait in the van and the finishing plasters take the room. The Thistle finishing plasters are specified by their own data sheets, applied in their own sequence of coats and trowelings, and the skim is thin, millimetres over the board face rather than the thick build of a masonry undercoat. The materials article keeps the fork honest: buying skim materials when the plan is a taped and jointed finish, or jointing materials when the plan is a skim, is the shelf's most expensive misunderstanding, and it usually happens because the fork was decided in someone's head rather than in the specification.

## Sealers and emulsions, the last two shelves

The mist coat is the bridge from plastering to decorating. The choices are the same as the masonry chain's: a thinned first coat of a suitable emulsion, or a proprietary primer such as the moisture tolerant plaster primers the paint industry makes for exactly this job. The emulsions then take their place, and the British shelf offers them by sheen, from the flattest dead matt through vinyl matt and on to silk, each trading washability against touch up friendliness in its own way. The paint manufacturer's data sheet governs the dilution and the recoat times, and the materials article repeats its one honest rule: the data sheet, not the counter legend, decides the mist coat.

## The tools, and their small persistent costs

The tools are the shelf's small persistent costs: jointing knives in their widths, corner tools, sanding blocks and poles with the dust extraction the modern trade demands, mixing buckets and paddles kept clean for the next compound, and the drywall saws and boards cutters that the repair culture keeps alive. The trade has its powered cousins, the automatic taping tools that carry compound and tape in one pass, and the flat boxes that finish joints in the hands of specialists; the shelf respects them without pretending the hand tools are obsolete, because British conditions and British site sizes give the hand tools a long life yet. The tool list ends where the craft begins, with the observation that the best tool on this shelf is patience, and it cannot be bought.

## The shelf's storage honesty, three rules that survive

The materials article has three storage rules that no data sheet lets the buyer skip. The compounds, powders and ready mixed alike, live in dry conditions and stay in their own packaging until the moment of use, because a powder that has drunk damp is a powder that sets wrongly, and a ready mix that has been frozen is a ready mix that has changed its character. The tapes stay dry and clean, because the paper that must bond with compound cannot bond with anything else it has already met, and the self adhesive meshes lose their grip to dust. And the boards themselves, though the fixing trade owns them first, are worth the finishing trade's respect: stored flat, kept dry, carried on edge, because a board with a dished edge hands the jointing passes a geometry they cannot repair. The shelf's honesty is mostly a matter of keeping each material as good as it left the factory.

## The coverage arithmetic, done without optimism

The shelf's last honesty is arithmetic. The compounds cover what their instructions say they cover, at the coat thicknesses those instructions assume, and the buyer who budgets by the optimistic rule of thumb buys the wall's second trip to the merchant. The tapes come in their roll lengths; the boards in their areas; the paints in their theoretical spreads, and the decorator's own rule, a practical allowance for the roller's thirst and the first coat's hunger, is written into every honest bill of quantities the trade has ever produced. The article refuses to print a universal number, because the number belongs to the specific product's data sheet and the specific wall's condition, and the arithmetic that survives is the one done with the data sheet open.

## The compound family's honest characters

The compound shelf rewards a closer reading, because the family's members have characters, not just working times. The setting compounds cure by chemical appointment: twenty minutes from mix to set, honest and predictable, and their fill is hard and their shrinkage small when they are used as their instructions describe. The air drying compounds cure by evaporation, patient with the long evening and generous with rework, and their character suits the bigger fills and the unheated rooms. The ready mixed jointing cements sit between the two, stirred and bedded straight from the tub, and their tub to tape discipline, the 100mm band the guidance names, is their whole craft in one number. The shelf's honesty is that no member is the best compound; each is the best compound for a pace, a depth of fill, and a room, and the buyer who asks which compound rather than which pace has already chosen wrong.

## What the shelf cannot sell

The materials article ends with the shelf's three unsellable items, named honestly because every trade knows them. The first is suction control over the whole wall's history, the priming and sealing instinct that decides whether the mist coat grips, bought with attention rather than money. The second is cleanliness, the washed bucket and the clean water and the knives wiped between coats, because a compound that meets yesterday's set crumbs sets around them and prints them forever. The third is patience, the shelf's rarest stock, and the one the article refuses to pretend arrives in the packaging. The wall built without these three is built from the same materials and to a different standard, and the light will tell the difference for as long as the room stands.

## The board types the shelf inherits, a brief honest list

Because the chain inherits its boards, the materials article ends by naming what the shelf's boards are likely to be. Standard wallboard carries the ordinary rooms; the moisture resisting boards serve the kitchens and bathrooms where humidity lives; the fire performing boards and the acoustic boards serve the tested systems that walls in stairs and corridors owe the building; and the insulated boards bring the thermal line into the lining itself. The jointing and decorating materials meet them all with the same craft, but the mist coat reads them each honestly, because porosities differ and the data sheets differ with them, and the buyer who knows which board the wall wears buys the mist coat that suits it. The list is brief because the board articles elsewhere in this library carry the detail; here it is enough that the shelf's first item is named and known.

## The waste shelf's honest arithmetic

The buyer's last respect is for what the wall does not use, and the honest bill includes the waste shelf's arithmetic. Compounds mixed beyond their setting time are waste by chemistry and are not remixed into hope; tapes cut long are folded into the bin rather than into the joint; paints thinned for a mist coat are thinned for that wall and that day, not decanted into next year's optimism. The arithmetic is not miserliness, it is the same honesty the coverage numbers carried, and the shelf that respects it is the shelf that produces walls rather than leftovers. The article closes with the trade's oldest truth about materials: the wall is built from what the data sheets promise, and the promises hold only for the materials that left their packaging at the right moment for the right job, kept clean, kept dry, and used at the pace their instructions assume rather than the pace the programme wishes.

## References

1. British Gypsum, *Gyproc EasiFill 20 Installation Instructions*.
2. British Gypsum, *Gyproc EasiFill 60 Installation Instructions*.
3. British Gypsum, *Installation Guidance: Gyproc Ready Mix Joint Cement*.
4. British Gypsum, *White Book: System Design Principles*.
5. British Gypsum, *Gyproc WallBoard 12.5 mm, product data sheet*.
6. British Gypsum, *Thistle Finishing Plaster, product data sheet*.

## Image credit

The cover photograph shows a drywall jointing knife, made available under CC0 via Wikimedia Commons by its uploader. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle2$, 8, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Drywall_knife.webp/1280px-Drywall_knife.webp')
, ('gb-interior-plasterboard-paint-installation', 'Jointing and Painting UK Plasterboard: Installation', 'A British installation guide for the plasterboard finishing chain: preparing and pre-filling, taping and bedding, filling and feathering, the optional skim, the mist coat, and the finishing emulsion coats.', $wallarticle3$# Jointing and Painting UK Plasterboard: Installation

The installation article walks the chain in the order the wall experiences it: preparation, taping, filling, the skim fork, the mist coat, and the finishing coats. The sequence has a discipline that surprises no one who has worked it, because each step exists to make the next step possible, and the wall records every step that was skipped in a language the lighting translates for the occupant forever after. The installation instructions on the compound bags and tubs are the programme's script, and the craft is the hands that deliver the lines without dropping them.

## Preparation, the chain's quiet first hour

Preparation begins with a survey of the fixed boards: the screw heads sitting slightly below the face, the cut edges true, the tapered joints meeting as the system intends, and the gaps at perimeters and openings either tight or deliberately sealed. The pre-fill comes next, taking the deep holes and the over cut boards and the damaged corners and filling them so the taping pass meets a wall that is already nearly right, and the sixty minute compound's own instructions describe the two coat habit for deep fills: let the first coat set and dry before the final one. A vacuum and a damp wipe end the hour, because compound does not forgive a dusty bed, and the tape's paper needs to bond to compound, not to talc.

## Taping, the pass that decides everything

Taping is the chain's single most important pass, because it is the reinforcement, and a wall can survive an ugly fill but not a cracked seam. The ready mix joint cement guidance gives the pattern plainly: apply the compound to the joint in an approximately 100mm wide band, centre the tape on the joint, and bed it in with the knife, working the excess out rather than burying the tape under it. The internal angles take their folded tape; the external corners take their beads or their corner trims, set plumb and true because the corner is the wall's most inspected line. The pass ends with the tape just visible under its thin bed, an ancient and exact craft moment, the reinforcement held, the squeeze out cleaned, and the wall left to set.

## Filling and feathering, the joints disappear

The filling passes are where the joints disappear, and they disappear by geometry rather than by quantity: each coat is feathered wider than the last, blending the proud seam into the flat board until the light finds nothing to catch. The powder compounds are mixed to their instructions, clean cold water and a clean bucket, worked within their honest working times, and applied in the sequence their instructions describe, bulk fill first and finishing coat second. The tapered joints make the geometry easy, which is why the boards were fixed that way; the butt joints, where two cut ends meet with no recess, make the dryliner earn the wider feather and the sanding pass that follows. Between coats the compound sets and dries on its own schedule, and the schedule is the chain's clock, not the programme's, and the dryliner who works with the clock rather than against it ends every day with walls that are flat and joints that hold.

## The skim fork, and its different morning

Where the specification chose the skim, the wall's morning changes: the jointing passes stop after the taping and a light fill, and the finishing plaster takes the room instead. The Thistle finishing plaster data sheet and its installation guidance govern that morning: the board face prepared as the system requires, the plaster mixed to its own instruction, applied in its thin coats, and troweled through its stages until the wall carries the continuous monolithic face the fork was chosen for. The fork's discipline is its own, and this article does not compress it into a paragraph, because the plastering craft has its own article in this library; what belongs here is the fork's place in the sequence, the moment the chain hands the wall to a different craft, and the moment it takes it back when the skim is dry.

## Drying, the wall's private schedule

Drying is the chain's least glamorous stage and its most abused. The wall needs to be thoroughly dry before the mist coat, a rule the finishing plaster data sheet states for plasters and that holds no less for jointed board, because paint over a damp wall is a promise the wall will break. Warmth and ventilation do the work; forced heat that bakes one face and leaves the other damp does harm; and impatience is the enemy in every form. The wall tells the truth about its dryness to the hand and to the meter, and the honest decorator reads both and waits for the wall's own verdict rather than the programme's wish.

## Mist coat and finishing coats

The mist coat is the seal: a thinned coat of a suitable emulsion, or a proprietary primer, rolled evenly over the whole face, board, compound, and skim alike, so the finishing coats meet one surface instead of three. It dries fast because it is thin, it reveals the pinholes and the sanding scratches that flat finish hid, and it gives the last honest chance to fill and sand before the colour goes on. The finishing coats follow the paint data sheet: the first cut in at the edges, the roller working wet into wet across the field, the second coat after the stated interval, and the room given back with walls that meet the light evenly because every coat beneath them was even too.

## The internal angles and the beads, told together

The internal angles deserve their telling, because they are the joints the eye inspects most and the hands find hardest. The ready mix guidance that beds tape into its 100mm band on the flat joints describes the same discipline in the angle: compound into the corner, tape folded along its crease and bedded into both faces at once, each pass drawing the excess out rather than piling it in, and the angle left to take its second and third coats in the same feathered patience the flat joints received. The external corners take their beads, and the bead is set before it is finished, because a bead set proud or shy of plumb is a line the whole wall is judged by. The corner work is where the chain's geometry becomes visible craft, and the installation article honours it by describing it slowly.

## Weather, warmth, and the programme's patience

The chain is indoor work, but it keeps the weather's hours anyway, because its materials are water and gypsum and the water must leave. Cold rooms slow the drying compounds and stall the plasters of the skim fork; forced heat bakes the surface and traps the damp behind it; the closed house in winter with no ventilation is a drying chamber working against itself. The honest programme gives the wall what it needs: gentle warmth, moving air, time measured in the wall's own drying rather than the calendar's days, and the compound instructions' setting times treated as the minimums they are, never the maximums the impatient wish them to be. The chain's best insurance is the simplest: schedule the decorating like a craftsman, not like a courier.

## The skim fork's sequence, named briefly and honestly

Where the installation crosses into its skim fork, the sequence changes vocabulary but not character, and it deserves its own honest naming. The board face is prepared as the finishing plaster's guidance requires; the plaster is mixed to its own water and its own cleanliness; the first coat goes on and rules off; the finishing coats follow through their trowelings, each one flattening and refining, until the wall carries the continuous face the fork was chosen for. The timing within that sequence belongs to the plaster and the room, not to the clock, and the dryliner who hands the wall to the plasterer with flat, tight, well taped joints has already decided how good the skim can be. The two crafts meet at that joint, and the chain's honesty is that neither can rescue the other's mistakes, they can only cover them until the light finds them.

## The clean handover, and the room after the dust

The installation ends with the cleaning, and the cleaning is not a courtesy but a finish stage. The sanding dust that settled on the skirting and the sills is the same dust the mist coat would print if it were rolled over it; the compound crumbs in the socket boxes are the electrician's next problem; the taped edges left proud for the second fix are the decorator's first complaint. The honest installer sweeps, vacuums, and wipes the room down before the mist coat, and hands over a wall whose surface can be touched with a white glove, because the mist coat is the seal that must meet the wall and nothing else. The room after the dust is the programme's quiet proof, the moment the chain stops being construction and starts being decoration.

## The programme's honest sequence, told once more

The installation's last service to the reader is the sequence told once more, stripped to its verbs: survey, pre fill, tape, fill, feather, sand, and then either mist and paint, or skim, dry, mist, and paint. The verbs carry the whole chain because each is a gate the previous one opened, and the wall that follows them in order reaches its paint without a story to hide. The sequence is honest about its own length too: it is shorter than the wet trades it replaced, but it is not instant, and the coats that were given their full drying and setting time are the coats that never need the visit back that the skipped ones always earn.

## The handover photograph, and the wall's first record

The installation's final act is the photograph, taken from the fixed positions the file will always name, in the daylight the record prefers. The photograph costs nothing the programme was not already spending, and it buys the wall's first honest record: the colour as it left the roller, the corners as the beads set them, and the whole wall's evidence for the day the maintenance culture needs to ask what changed. The honest installer takes the photographs before the furniture arrives and after the snag list is closed, and hands them over with the keys, because the wall's story begins at handover and the story's first page belongs to the file. The installation that ends with the photograph is the chain's last courtesy, and the maintenance article begins with the same picture, reading it for the decades it will explain.

## References

1. British Gypsum, *Gyproc EasiFill 20 Installation Instructions*.
2. British Gypsum, *Gyproc EasiFill 60 Installation Instructions*.
3. British Gypsum, *Installation Guidance: Gyproc Ready Mix Joint Cement*.
4. British Gypsum, *White Book: System Design Principles*.
5. British Gypsum, *Gyproc WallBoard 12.5 mm, product data sheet*.
6. British Gypsum, *Thistle Finishing Plaster, product data sheet*.
7. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a worker taping drywall joints, taken by the Minnesota National Guard and released into the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and its status was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle3$, 9, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/180726-Z-IL540-1128_%2830058183198%29.jpg/1280px-180726-Z-IL540-1128_%2830058183198%29.jpg')
, ('gb-interior-plasterboard-paint-quality-checks', 'UK Jointing Quality Control and Inspection', 'A British quality program for plasterboard finishing: screw and fastener checks, joint flatness, corner trueness, sanding discipline, mist coat verification, and the lighting that tells the wall the truth.', $wallarticle4$# UK Jointing Quality Control and Inspection

The quality article walks the wall with the light, because a taped and jointed finish lives and dies by what the light finds. The program has its stages, its instruments, and its records, and the stages arrive in the same order the installation did: fasteners, joints, corners, surface, mist coat, finish. At every stage the inspector is asking one of three questions: is it flat, is it true, and will the paint stay on, and the wall answers all three honestly to anyone who knows how to ask.

## The fastener check, the program's first five minutes

The fastener check comes first because everything after it happens over the fasteners. Every screw head should sit slightly below the board face, just enough to take its fill without tearing the paper; heads proud of the face telegraph through the finish as shadows; heads driven through the paper entirely have lost their grip and must be backed out and re driven beside themselves, and the re drive goes into the record. The check is a hand pass and a knife test, feeling for the dish of each head, and the honest finding is a percentage rather than a boast, because a thousand screws always hide a few sinners, and the sinners are cheap to fix before the mist coat and expensive to fix after.

## The joint check, flat by geometry

The joint check verifies the geometry the filling passes promised: no proud edges, no ridged crowns, no hollow valleys, each seam feathered wide enough that a straight edge across it reads within the tolerance the system accepts. The straight edge is the instrument, held in the raking light and flat on the wall, and it finds what the eye flatters: the butt joints that rose, the tapered joints that sank, the second coat that was feathered too narrow to hide its own thickness. The pinholes and the sanding scratches count as joint defects too, because the mist coat will print them, and the fix belongs to the compound shelf, not to the paint.

## The corner check, the wall's straightest lines

The corners are the wall's straightest lines and its most inspected ones, because the eye reads a room by its verticals. The corner check runs the straight edge or the rule up each internal angle and each beaded external, looking for the bows and the bells that the board fix and the bead set conspired to leave. Beads set plumb and true at the start hold their line through the finish; beads set by eye are found out by the light forever after. The quality program records corners as found and as left, because the corner repair is the maintenance article's hardest job, and the file is the maintenance crew's inheritance.

## Sanding, and the dust that tells the truth

The sanding discipline is quality work as much as the trowel work was, and its instruments are the block, the pole, the light, and the vacuum. The compound sands easily and the paper face of the board does not, and the difference defines the pass: sand the ridges off the joints, not the paper off the field, and stop when the geometry says stop rather than when the arm says stop. The modern trade adds the extraction and the masks because the dust is a health issue that the program takes as seriously as it takes flatness, and the dust on the floor is the record of the sanding that happened, read honestly before the vacuum takes the evidence away.

## The mist coat verification, the program's proof

The mist coat is the program's proof, because it is the first uniform surface the wall has ever worn. The verification is a look and a pull: the look finds the flashing and the dull patches where porosity varied, the pinholes the flat compound hid, and the scratches the raking light promised; the pull, a gentle tape test at a corner the record names, tells whether the seal gripped or sat loose. Peeling at this stage is cheap to diagnose and cheaper to fix, a matter of one honest fill and one honest resand, and the program that verifies here never meets the maintenance crew's worst sentence, the paint that came off in sheets because the seal was never real.

## The finishing inspection, the wall's public debut

The final inspection happens twice, in flat daylight and again in the evening light the occupant will actually live by, because a finish that only survives one of them is a finish that will be repainted early. The roller texture is read for evenness, the edges for crispness, the colour for batch honesty across the field, and the records for the last time: the compound and paint batches, the coats and their intervals, the weather and the drying days, and the photographs taken from the fixed positions the file always names. That file is the wall's diploma, and it is handed over with the keys.

## The two-walk inspection, and why the evening light matters

The program's inspections happen twice at handover, and the second walk is the one that earns its keep. The first walk, in flat daylight, reads the wall's flatness and its colour and its evenness, and it is the walk the photograph is taken on. The evening walk, in the raking light of the lamps the occupant will actually use, reads the wall's texture, because the low light lies along the surface and prints every ridge, every sanding scratch, and every proud patch of the mist coat in a shadow the daylight never drew. A finish that passes both walks is a finish that stays decorated; a finish that only passes the daylight is a finish whose first housewarming reveals what the inspection missed. The program books the evening walk into its own diary, because the wall's debut happens at night.

## The records gate, and the file the wall deserves

The program's last gate is the file, and the file is more than a courtesy, because it is the maintenance article's inheritance. The file holds the batch numbers of the boards, the compounds, and the paints, the coats and their intervals, the drying days and the weather they held, the photographs from the fixed positions, and the honest list of the repairs the program found and fixed before anyone else could. The maintenance culture that follows inherits a wall that can be read rather than guessed at, and the repaint in year ten is a weekend instead of an archaeology dig. The records gate costs minutes and pays decades, and the quality program treats it not as paperwork but as the wall's diploma, handed over with the keys.

## The sample panel, and the learning it buys

A quality program on a larger job buys its certainty cheaply with a sample panel, one corner of one room carried through the whole chain first, from screw to final coat, in the light the room will actually live by. The panel teaches the geometry on a wall that is allowed to be a rehearsal: the feather widths the compound wants, the sanding the sheen will forgive, the mist coat dilution the board's porosity asks for, and the number of coats the colour needs to cover honestly. The program inspects the panel with the same two walks the finished wall will get, writes its findings into the file, and fixes the panel's lessons into the programme for every room that follows. The sample panel is the quality article's favourite bargain, a day's work that saves the same day being re spent on every wall in the building.

## When the program stops work, and why that is a kindness

The quality program's real authority is its ability to stop the work, and the honest program uses it early rather than late. The taping pass that buried its tape gets stopped before the filling compounds the mistake into permanence; the skim that met a damp wall gets stopped before the paint seals the damp in; the fastener field that a machine drove without its dish gets stopped before two thousand screws become two thousand shadows. Stopping work feels expensive on the day and is the cheapest tool the program owns, because the wall's defects compound with every coat that covers them, and the stop that costs an afternoon saves the reskims that cost rooms. The program that never stops work is not a kind program, it is a programme that has decided to let the maintenance crew discover its defects instead.

## The lighting discipline, the program's cheapest instrument

The quality program's cheapest instrument deserves its own closing word, because it is a torch and a habit rather than a gauge and a certificate. The torch held flat to the wall, moved slowly along every metre of seam and corner, prints the wall's honesty in shadows: the proud fill, the sanded hollow, the pinhole colony, the proud bead, and the fastener that never took its fill. The habit is to walk the wall with the torch before the mist coat, again before the finishing coats, and once at the very end with the room's own lamps, because each pass finds what the previous pass left. The trade calls it snagging; the program calls it the wall's last friend; and the article closes by noting that no instrument in the program's kit costs less or tells more.

## The program's honest limits, named at the end

The quality program ends its article by naming its own limits, because a program that claims everything convinces no one. The program cannot read the wall's future, only its present; it cannot verify the dryness the meter has not measured, only demand the measurement; and it cannot turn a rushed programme into an honest one, only refuse to lie about what the rush left behind. What the program can do, and does, is hold the chain's five gates shut until each passes, and hand the maintenance culture a wall whose story it can read. The limits are the honesty the article has promised all along, and the wall that reaches paint through a program with limits is the wall that stays painted for the reasons the file can name.

## The fastener audit's honest percentage, one more walk

The fastener audit deserves its closing honesty, because it is the gate the program walks most often and doubts least, and the doubt is the gate's value. A wall of a thousand screws audited by hand finds its sinners in the low tens, and the program fixes them and records them rather than pretending the audit was a formality; the honest percentage is the difference between a wall whose heads were checked and a wall whose heads were assumed. The audit's second walk, after the fixes, is shorter than the first and matters more, because it is the walk that lets the mist coat follow without a single shadow waiting under it. The program that gives the audit its two honest walks has earned the wall's flattest claim: that the paint will meet a face with nothing in it that the file does not name.

## References

1. British Gypsum, *Gyproc EasiFill 20 Installation Instructions*.
2. British Gypsum, *Gyproc EasiFill 60 Installation Instructions*.
3. British Gypsum, *Installation Guidance: Gyproc Ready Mix Joint Cement*.
4. British Gypsum, *White Book: System Design Principles*.
5. British Gypsum, *Gyproc WallBoard 12.5 mm, product data sheet*.
6. British Gypsum, *Thistle Finishing Plaster, product data sheet*.
7. Scottish Government, *Building standards technical handbook 2017: domestic*.

## Image credit

The cover photograph shows a worker sanding drywall, taken by the Georgia National Guard and made available under CC BY 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle4$, 8, 'quality', 'https://upload.wikimedia.org/wikipedia/commons/0/02/Sanding_Drywall_%285891371421%29.jpg')
, ('gb-interior-plasterboard-paint-maintenance-repair', 'UK Plasterboard Walls: Maintenance and Repair', 'A British maintenance guide for plasterboard walls: fixings that hold, dents and holes repaired with the chain's own materials, stains read honestly, and the repaints that keep the wall young.', $wallarticle5$# UK Plasterboard Walls: Maintenance and Repair

The maintenance article is the chain's longest, because the wall spends more decades in service than it spent in construction, and everything it needs it inherits from the materials it was born from. The plankwall culture of repair is generous: the same jointing compounds that built the seams can rebuild a hole, the same tapes can reinforce a crack, and the same mist coat and emulsion can make the repair invisible or nearly so. What the culture demands in return is honesty about what happened, because a repair that hides the cause is a promise the wall will break again.

## Fixings, the wall's everyday question

The everyday question is how to hang things on a board face, and the honest answer begins with what the wall is: plasterboard is strong in sheets and weak at points, and it holds what it is rated to hold, not what optimism asks of it. The picture hooks and light shelves live happily in the cavity fixings that spread their grip behind the board, the television brackets and heavy mirrors need the studs or the framing behind, and the difference between the two categories is the difference between a wall that holds and a wall that sheds its fittings in the night. The maintenance culture finds the studs, chooses the fixing for the weight rather than the packet, and keeps the small honest record of what went where, because the next decorator wants to know.

## Dents and holes, repaired with the chain's own materials

The small dents and the doorknob holes are the wall's routine injuries, and the repair is a miniature of the chain itself: clean the wound, fill it with a jointing compound used exactly as its instructions describe, let the setting compounds set and the drying compounds dry, sand flat, and mist and paint. The twenty minute compound earns its keep here, the small fills done in an evening rather than a weekend, and the instruction sheet's two coat habit for deeper fills prevents the shrinkage dent that one impatient single coat always leaves. The repair ends with the whole wall's dignity intact, because the repairer resists the amateur's temptation to enlarge the patch beyond the wound.

## The bigger holes, and the board behind them

The bigger holes, the furniture crashes and the plumbing access gone wrong, want a piece of board in them rather than a lake of compound, and the honest repair cuts back to a rectangle, fixes a support behind, screws a board patch in, and treats the perimeter as four joints to be taped and feathered exactly as the installation article describes. The repair is the chain replays in miniature, and the dryliner's craft shows in the feathering, because a patch four times too proud is a shadow on the wall forever, and the patch sanded into the surrounding board tears the paper it should be protecting. The materials are the same, the sequence is the same, and the only new skill is the patience to make the geometry tell the truth.

## Cracks and stains, the honest two

Cracks and stains are the maintenance article's honest two. A hairline crack along a joint is usually movement talking, and the response is taped reinforcement, not filler alone, because an untaped refilled joint is a crack with a delay on it; a crack that returns season after season is the wall reporting a structural story that belongs to a surveyor rather than a decorator, and the honest reader of that crack stops decorating and starts asking. Stains are watermarks until proved otherwise: a brown tide mark over a joint is a leak's diary entry, and the repair begins above the ceiling or behind the pipe, not on the surface, because a repainted stain is a stain with a new coat on, not a wall that forgave the water.

## Repainting, the wall's refresh

Repainting is the wall's cheapest renovation and its most satisfying, a weekend that returns a decade. The preparation honours the chain: a wash down, a sanding flat of the old sheen, the gloss cut back, the filled repairs misted, and the new coats rolled evenly, all to the paint data sheet's intervals. The sheen decision is made honestly, because the flatter the paint, the kinder it is to the wall's history, and the shinier the paint, the more loudly it reads every wave and patch the years have written; the occupant who wants a gloss reflection from a boarded wall is asking the light to become an inspector, and the light obliges.

## When to call the specialists

The specialist call is honest maintenance too, and the culture names its moments: the crack that moves, the stain that returns, the sagging ceiling board that wants its fixings checked before it wants its face, and the large repair where the taping and feathering exceed the householder's patience. The specialist arrives with the same materials shelf this article describes, and the difference is speed and the certainty the hands bring, which is exactly what the harder jobs deserve.

## The annual rhythm, and the small inspections that prevent the large ones

The maintenance culture keeps a small annual rhythm, and the rhythm is mostly looking. The once a year walk with the evening light reads the high traffic corners and the door swings, the fixings and the joints, looking for the dents the year has written and the hairlines the movement has opened. The gutters and the downpipes get their glance too, because the wall's oldest enemy arrives as water from above, and the stain at the ceiling edge is read as a plumbing or roofing question rather than a decorating one. The rhythm ends with the small honest list, the dents to fill and the cracks to tape, done in the same materials the wall was born from, and the rhythm's reward is the repair that never became the renovation.

## The older wall's dignity, and the honest limits of repair

The older plasterboard wall earns a closing paragraph of its own, because decades of service give a wall a character the repair culture respects. The waves and the bellies that old board work carries are part of the building's story, sanded flat only at the cost of the paper face, and the honest repairer matches the wall's existing texture rather than polishing it into a smoothness the rest of the room cannot share. The limits are honest too: the board that has taken persistent damp is replaced rather than painted, the ceiling board that sags is refixed rather than skimmed heavier, and the wall whose cracks move every winter is handed to a surveyor's opinion rather than to a decorator's optimism. The maintenance article ends where the chain began, with the same respect for what the wall is trying to say.

## The fixings file, and the wall's hidden map

The maintenance culture's quiet inheritance is the fixings file, the map of what the wall holds and where, because a plasterboard wall is a sheet over a hidden country of studs, noggins, pipes, and cables, and the file is the difference between hanging a television and drilling a disaster. The file records the stud spacings the build left, the service zones the plumber and electrician marked, and the fixings that already hold weight, and the honest householder adds to it every time the wall takes a new fixing. The wall rewards the map with its full strength, because the fixing driven into the stud holds what the packet promised, and the fixing driven blind into the cavity holds only until the evening the wall decides otherwise. The file costs a page and a pencil, and the maintenance article recommends both without irony.

## The specialist handoffs, named kindly

The maintenance article ends with its specialist handoffs, because the wall's harder questions deserve the people who answer them daily. The crack that moves belongs to the surveyor, the stain that returns belongs to the plumber or the roofer, the ceiling that bows belongs to the dryliner with the right fixings and the patience to lift boards, and the large repair that exceeds the householder's taping geometry belongs to the trade that feathers joints for a living. Handing off is not defeat, it is the maintenance culture's last honesty, the recognition that the wall has said something the decorator cannot answer with a filled tube. The wall that gets the right hands at the right moments stays young for decades, and the wall that gets the wrong hands gets repainted early and often.

## The repaint calendar, and the wall's long youth

The maintenance culture's last page is the repaint calendar, the honest rhythm that keeps a plasterboard wall young for decades. The modern emulsions of good quality carry a room through the years between coats, and the calendar's intervals are read from the wall rather than the fashion pages: the hallway that takes the handprints every winter earns its repaint sooner, the bedroom that rarely touches its walls holds its colour longer, and the sheen that was chosen for its washability is the sheen that extends every interval it earns. The calendar's entries are gentle, a wash down one year, a touch up the next, a full weekend's repaint when the colour's turn comes, and the wall that keeps the calendar is the wall that never needs the rescue that the neglected wall eventually books for itself. The chain that began with a flat pale board ends its story with the same wall, painted, held, and repainted, still doing the job it was fixed to do.

## The last walk, and the article's farewell

The maintenance article's last paragraph is a walk, and it belongs to whoever holds the wall's keys. The walk moves room by room with the evening light on, reading the walls as the chain taught: the flat seam, the true corner, the paint that grips, the fixing that holds, and the crack and the stain that tell the truth the surface cannot. Most years the walk ends with nothing but satisfaction, because a wall built through this chain and kept through this culture earns its decades quietly, and the small list it hands the householder is the whole cost of the wall's long youth. The farewell is the library's too: the chain that began with a pale flat board ends as a wall that holds the room together, painted in the colour the occupant chose, and telling its story only when there is something worth saying.

## The wall's neighbours, and the trades it keeps company with

The maintenance wall keeps company, and the article's last honesty is about the neighbours. The plasterboard wall meets the timber frame or the studwork it was fixed to, the masonry behind the dabs it was bonded to, the services it carries, and the floor and ceiling it meets at its edges, and each neighbour hands the wall its occasional question. The stud that shrinks gives the fixings a movement story; the masonry that damps gives the dabbed board a stain to print; the socket that overheats gives the wall a blemish with an electrical cause; and the reader who treats every blemish as a decorating question has answered the wall's neighbours with a filled tube instead of an investigation. The maintenance culture keeps the neighbours in mind, because the wall's long youth is the whole room's achievement, and the wall's only honest job at the end is to keep telling the truth.

## References

1. British Gypsum, *Gyproc EasiFill 20 Installation Instructions*.
2. British Gypsum, *Gyproc EasiFill 60 Installation Instructions*.
3. British Gypsum, *Installation Guidance: Gyproc Ready Mix Joint Cement*.
4. British Gypsum, *White Book: System Design Principles*.
5. British Gypsum, *Gyproc WallBoard 12.5 mm, product data sheet*.
6. British Gypsum, *Thistle Finishing Plaster, product data sheet*.

## Image credit

The cover photograph shows universal wall plugs of the type used for fixings in plasterboard and other wall materials, taken by photographer Raimond Spekking and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API at the time this article was drafted.

$wallarticle5$, 8, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Fischer_Universald%C3%BCbel_UX_10_aus_Biowerkstoff-8365.jpg/1280px-Fischer_Universald%C3%BCbel_UX_10_aus_Biowerkstoff-8365.jpg')
) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='GB' AND t.candidate_key='assembly:gb-interior-plasterboard-paint'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;


UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='GB' AND t.market_code='GB'
  AND t.candidate_key='assembly:gb-interior-plasterboard-paint'
  AND a.wall_topic_id=t.id AND a.wall_market_code='GB' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
