-- Fourth researched-candidate topic for US: ceramic tile for wet areas.
-- The topic is registered as verification_status='candidate' (schema gate: only an
-- authenticated admin can promote it to 'verified' via the admin console).
-- Articles remain drafts; publication/review gates are not bypassed.
-- Apply 20261024000000_global_wall_finishing_knowledge_library.sql first.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='US' AND candidate_key='assembly:us-wet-area-tile') THEN
  INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type,verification_status)
  VALUES ('US','assembly:us-wet-area-tile','Ceramic tile for wet areas','finish_assembly','candidate');
END IF; END $$;

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,mp.default_language
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON true
JOIN public.market_profiles mp ON mp.country_code=t.market_code
WHERE t.market_code='US' AND t.candidate_key='assembly:us-wet-area-tile'
ON CONFLICT(topic_id,theme_key,language_code) DO NOTHING;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Tile Council of North America, *2026 TCNA Handbook for Ceramic, Glass, and Stone Tile Installation*', 'https://tcnatile.com/products/publications/2026-tcna-handbook-for-ceramic-glass-and-stone-tile-installation/', 'Tile Council of North America', 'Citation for standardized installation methods, including wet-area and shower installations, and their substrate, membrane, and setting requirements.'),
  ('Tile Council of North America, *ANSI Standards*, A108/A118/A136.1', 'https://tcnatile.com/resource-center/ansi-standards/', 'Tile Council of North America', 'Citation for the American National Specifications for the Installation of Ceramic Tile and the material standards for mortars, membranes, and grouts.'),
  ('ANSI, *ANSI A108/A118/A136.1:2026: Installation of Ceramic Tile*', 'https://blog.ansi.org/ansi/ansi-a108-a118-a136-2026-installation-ceramic-tile/', 'ANSI', 'Citation for the current edition of the tile installation specifications.'),
  ('Schluter-Systems, *KERDI Waterproofing Membrane*', 'https://www.schluter.com/schluter-us/en_US/Membranes/Waterproofing-(KERDI)/Schluter-KERDI/p/KERDI', 'Schluter-Systems', 'Citation for bonded waterproofing membranes in shower, steam shower, and tub surround applications.'),
  ('Schluter-Systems, *Shower System Installation Handbook*', 'https://assets.schluter.com/asset/570120892212/document_i2tt9fh4sp2n562jmirhppbv4o/shower-system-installation-handbook.pdf', 'Schluter-Systems', 'Citation for shower system installation guidelines, including membrane height requirements and pan installation.'),
  ('National Tile Contractors Association, *NTCA Reference Manual*', 'https://www.tile-assn.com/page/ntca-reference-manual', 'National Tile Contractors Association', 'Citation for the industry reference addressing common installation obstacles and issues.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='US' AND t.candidate_key='assembly:us-wet-area-tile'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'US','US',t.id,a.theme,'en','draft'
FROM (VALUES
  ('us-wet-area-tile-overview', 'Ceramic Tile for Wet Areas in the United States: System Overview', 'A US-focused overview of tiled showers, tub surrounds, and wet rooms: the wet-area assembly as a system, the standards that govern it, and why waterproofing is the whole argument.', $wallarticle1$# Ceramic Tile for Wet Areas in the United States: System Overview

A tiled shower is the most demanding interior surface in the American home, and the demand is not the tile. Porcelain and ceramic shrug at water indefinitely, which is why they own the wet room. The demand is the assembly beneath: the substrate that carries the plane, the waterproofing that carries the water, the mortar that carries the load, and the grout and sealant that carry the daily duty, and the tile is merely the visible face of a system whose success or failure happens out of sight. This overview introduces the wet-area system as its industry presents it, through the Tile Council''s handbook methods, the ANSI installation specifications, and the manufacturer systems like Schluter''s that dominate the modern shower, and it makes the argument the whole series rests on: in wet areas, the waterproofing is the installation, and the tile is its finish.

## The wet area as a system

The American tile industry''s central document, the TCNA Handbook, presents installations as methods, complete assemblies named and numbered, substrate by membrane by setting by finishing, and the wet-area methods are its most consulted pages. The system view follows the water: the substrate, framed or backer-boarded, flat and solid, the membrane, sheet-bonded or liquid-applied, waterproofing the plane and sealing the penetrations, the sloped pan collecting the floor''s water to the drain, the mortar bonding the tile to the membrane''s protected surface, the grout closing the field, and the sealant joints at the planes'' changes of direction closing the assembly''s movement. Every component is governed, the substrate preparation and membrane materials by the ANSI specifications, the assembly by the Handbook''s methods, and the whole by the manufacturer''s system literature where a branded system like the KERDI shower is used, and the installation that honors the system inherits its tested performance.

## Why wet areas are the hardest tile work

Wet-area tile is hard for one reason: the failure is hidden and the failure is water. A kitchen floor that is set poorly shows its lippage and sounds its hollows at once, and the correction, while expensive, is mechanical. A shower that is waterproofed poorly looks perfect for years while the water it absorbs quietly destroys the substrate, feeds the biology, and presents itself finally as the stain on the ceiling below, and the correction at that point is demolition rather than repair. The industry''s response to this asymmetry is its whole quality culture: the handbook''s methods exist so that assemblies are specified rather than improvised, the ANSI specifications exist so that materials are defined rather than approximated, the manufacturer''s systems exist so that waterproofing is engineered rather than assumed, and the installer certification culture exists because the difference between a twenty-year shower and a five-year one is invisible until it is catastrophic.

## The governing documents, mapped

The wet-area paper trail is unusually clear. The TCNA Handbook, current edition cited here, is the method book, the wet-area assemblies named with their substrates, membranes, and service ratings, and the reader specifying a shower picks a method rather than inventing one. The ANSI A108, A118, and A136 families are the material and execution specifications, the mortars, membranes, and grouts defined by grade and the installation defined by provision. The manufacturer''s system literature, Schluter''s shower handbook among the most complete, governs the engineered assemblies from drain to showerhead, and the NTCA Reference Manual collects the industry''s hard-won answers to the obstacles the field actually meets. The specification that cites all four honestly has specified a system, and the installer who reads all four has inherited decades of other people''s tuition.

## The modern shower''s quiet revolution

The biggest change in American wet-area practice deserves its own paragraph: the rise of the bonded waterproofing system. The older tradition trusted the pan, the clamping drain, and the slope, with the wall cavities breathing their own risks, and the modern systems waterproof the entire envelope, walls and floor together, with bonded membranes that move the water management from behind the assembly to within it, where it can be tested, warranted, and repaired. The manufacturer''s literature is explicit about the envelope''s rules, the membrane''s height to the showerhead at minimum in enclosed showers per the system handbooks, the pan''s slope to the drain, the penetrations sealed in the system''s own sealant families, and the flood test before the tile ever follows. The revolution''s result is the shower that dries between uses and drains to the plumbing rather than the framing, and the reader building or maintaining one should know which tradition the existing shower represents, because the maintenance differs with the physics.

## What the system asks, and what it delivers

The wet-area system asks for the best of the tile trade: the flat substrate, the engineered membrane, the tested assembly, the certified installer, and the disciplined sequence, and it is the most expensive tile work per square foot in the building. What it delivers is the surface that outlives the house''s other finishes by decades, cleans with water and mild products, wears the daily flood and the steam and the chemistry without complaint, and repays its premium every time the bathroom is used rather than renovated. The American bathroom''s renovation cycle is famously wasteful, and the wet-area system built to the standards is the single best defense against it, which is the argument this series exists to make in execution order: the materials, the sequence, the acceptance, and the decades.

## Reading this series, and reading your own shower

The articles that follow take the system through the five themes: the materials aisle, where the membranes and mortars and grouts are chosen as one tested family, the field sequence, from substrate to flood test to setting to grouting, the quality program, where the hidden system is verified before the tile hides it, and the maintenance, the gentle decades that keep the assembly''s water story boring. The reader who finishes the series can also read an existing shower, its stains and its biology and its sealant joints telling the story of the assembly beneath, and the reader who owns a shower worth keeping will find the series''s maintenance chapter the cheapest insurance they have ever read.

## The wet area''s service ratings, read honestly

The handbook''s methods carry service ratings, the assemblies classified for the exposures and the uses they are engineered to serve, and the wet-area specification reads them the way the building code reads its occupancies: as promises the assembly can keep, tested rather than asserted. The reader specifying a residential shower and the reader specifying a commercial steam room are specifying different assemblies, and the handbook''s ratings are the map from the room''s reality to the method that serves it, which is the industry''s central gift to the specification writer: the honesty of a tested match between the service and the system.

## The steam room''s note, a boundary within the boundary

The steam room deserves its own sentence in any wet-area overview, because it is the wet area''s extreme: continuous vapor at temperatures that drive moisture into every assembly''s chemistry, and the methods and systems that serve it, the steam-rated membranes and the sloped ceilings, are engineered for the exposure the ordinary shower never approaches. The reader who meets a residential steam shower specification has met the wet-area trade''s summit, and the standards'' and systems'' literature for it is the most conservative in the tile industry, which is the industry''s honest way of saying that everything in this series matters more where the water becomes weather.

## What the overview holds for the reader

Hold the water''s path. That is the overview''s single image for the whole series: the water lands on the tile, crosses the grout''s and the sealant''s honest joints, runs the slope to the drain, and exits through the plumbing, and every layer of the system, membrane, mortar, and joint, exists to keep that path boring. The reader who holds the path reads every article that follows as its elaboration, and the reader who builds or maintains to the path inherits the wet area''s decades, which are the longest decades any interior surface offers.

## The certified installer culture, and why it exists here first

The wet area is where the American tile industry built its certification culture first, and the reason is the failure asymmetry this overview has described: the assembly''s defects hide until they are catastrophic, so the industry''s defense has to be upstream of the defects, in the training and the credential that makes the right assembly the installer''s habit. The associations'' and manufacturers'' credential programs exist, the specifications increasingly name them, and the reader hiring for a wet area should ask the credential question plainly, because the certified installer is the flood-tested shower''s closest cousin, a probability made legible before the work begins.

## What the overview owes the do-it-yourselfer

The overview''s honest duty to the homeowner-reader is a caution rather than an encouragement: the wet area is the one interior assembly where the industry''s literature, this series included, and the failure statistics agree that the professional''s value is decisive, because the hidden system''s gates, the flatness, the envelope, the flood test, are the work the finished beauty conceals. The homeowner who sets tile beautifully and waterproofs hopefully is the industry''s most loyal repair customer, and the homeowner who wants the wet area''s decades hires the trade that floods its showers before it tiles them. That is not a marketing sentence, it is the physics.

## Reading an existing shower, the diagnostic opening

The overview''s final skill is the reverse read, the shower whose documents are gone: the era''s clues, the pan''s and drain''s tradition, the membrane''s presence in the wall''s details, the grout''s and sealant''s chemistry, all readable with a flashlight and this series''s vocabulary, and the readings preserved in the file the series teaches to keep. The steward who names the tradition correctly, bonded envelope or old pan, maintains it with its own rules rather than the other''s, and the shower that is known, whatever its era, is the shower that behaves.

## The international note, briefly

For FRELUX''s international readers, the American wet-area system is also a trading language: the handbook''s methods and the ANSI grades appear in specifications wherever American building culture travels, and the reader who knows them reads a US-specified wet area anywhere the specification went. The global reader building to other traditions will recognize the same physics, the water''s path, wearing different documents'' names, and the overview''s image travels farther than its citations, which is the article''s quiet compliment to its own industry.

## References
1. Tile Council of North America, *2026 TCNA Handbook for Ceramic, Glass, and Stone Tile Installation*.
2. Tile Council of North America, *ANSI Standards*, A108/A118/A136.1.
3. ANSI, *ANSI A108/A118/A136.1:2026: Installation of Ceramic Tile*.
4. Schluter-Systems, *KERDI Waterproofing Membrane*.
5. Schluter-Systems, *Shower System Installation Handbook*.
6. National Tile Contractors Association, *NTCA Reference Manual*.$wallarticle1$, 'overview', 10),
  ('us-wet-area-tile-materials', 'Materials for US Wet-Area Tile Installations', 'A US-focused materials guide to tiled wet areas: tile selection and slip resistance, backer boards, bonded membranes, mortars and grouts per ANSI grades, and the engineered shower kits, bought as one system.', $wallarticle2$# Materials for US Wet-Area Tile Installations

The wet-area aisle is the tile trade''s pharmacy: everything works or fails as a family, the substrate boards and membranes and mortars and grouts chosen to the same methods and specifications, and the substitution habit that the dry trades tolerate is, in a shower, the scheduling of a demolition. This article walks the family in installation order, from the tile itself down to the sealant, with the ANSI material grades and the manufacturer systems as the shelf''s law.

## The tile: porcelain, ceramic, and the wet-area realities

The wet-area tile is chosen from the standards'' own vocabulary. Porcelain, the dense, low-absorption body, dominates the modern shower for its water behavior and its strength, and the glazed ceramics serve the walls in the colors and formats the design asks. The wet-area specifics matter more than the body: the floor tile''s slip resistance, read from the manufacturer''s documentation and matched to the shower''s use, the wet-room formats that handle the drains'' slope, the mosaics that wrap the curbs and benches the large formats cannot, and the trim profiles and finishes that end the field''s edges. The tile''s water absorption and its documented suitability for the wet area are verified from the product''s data rather than the sample''s beauty, because the shower is the one room where the wrong tile is not a style error but a maintenance sentence.

## Substrates and backer boards: the plane beneath

The wet-area substrate is the assembly''s foundation, and the standards are particular about it. Cement-based backer boards are the traditional wet-area answer over framing, fastened per the manufacturer''s schedule, taped and treated per their literature, and the newer foam-based boards, some carrying the waterproofing within themselves, serve the engineered systems they belong to. The substrate''s two virtues are solidity and flatness, the framing true, the board fastened without flex, and the surface within the flatness tolerances the installation specifications define, because the tile''s plane is inherited from the substrate''s, and the wet area''s lippage is both an aesthetic complaint and a drainage one. The buyer who accepts the substrate honestly, flat, solid, and dry, has bought the assembly''s quietest insurance.

## Membranes: the waterproofing heart of the system

The membrane aisle is where wet-area tile becomes a wet-area system, and the choice is between two honored families. The sheet-bonded membranes, Schluter''s KERDI the most documented example, waterproof in a predictable, tested film, their seams sealed in the system''s own bands and corners, their envelope engineered from the drain to the showerhead. The liquid-applied membranes, per their ANSI grades and their manufacturers'' coats and coverage, paint the waterproofing onto the substrate in verified films. Both families demand the same disciplines, the substrate''s preparation, the coats'' or sheets'' verification, the penetrations'' sealing, and the flood test''s proof, and neither forgives the improvisation that skips them. The membrane is chosen with the system''s literature open, and the manufacturer''s warranty, where one is offered, is the engineering''s promise to the buyer who honored every page of it.

## Mortars and grouts: the ANSI grades, honestly read

The setting and jointing materials are defined by the ANSI A118 family, and the wet-area reading is specific. The thinset mortars are chosen per grade and per suitability, the modified mortars the membrane systems call for, unmodified where the system''s literature calls for it, the bonding to the membrane governed by the system''s own instructions rather than the aisle''s habits. The grouts follow, cement-based in their colors and their sealed realities, the epoxy grouts for the wet areas that want the joint chemistry the maintenance dreams of, and the premixed families for the installations their literature serves. The grades are read honestly, the modified and unmodified distinction is honored to the letter, and the wet area that mixes the families carelessly, the wrong mortar over the wrong membrane, the wrong grout in the wrong service, has scheduled its own bond argument regardless of how beautifully it was set.

## The engineered shower kits and the drain''s geometry

The modern wet area is often bought as a kit, and the kit is the system''s discipline in a box: the presloped trays and the benches, the drain assemblies engineered to the membrane, the boards, bands, and corners, and the installation handbook that governs the whole from the subfloor to the showerhead. The kits eliminate the two great field improvisations, the pan''s slope and the drain''s integration, and they replace them with tested geometry, which is why the manufacturers can warrant the envelope the field builds from them. The kit''s buyer inherits the kit''s law, no substitutions, no skipped details, and the kit''s literature read before the pallet is opened, and the buyer who follows it has bought the shower''s twenty years on the first day.

## Sealants, profiles, and the movement''s details

The wet-area assembly''s movement is served by its details: the sealant joints at the planes'' changes, walls to floors, corners, curbs, and the fixtures'' penetrations, applied in the neutral-cure families the industry uses over the chemistry beneath them, in the geometry, the backer rod and the tooling, that sealant practice requires, and the edge profiles that end the tile''s fields with the movement accommodation and the clean lines the extruded trims provide. The details are small, cheap, and the entire difference between the shower that flexes gracefully and the shower that cracks its complaints, and the materials article''s last advice is the series''s first law in miniature: the assembly''s movement is engineered, in materials chosen for it, or it is written into the grout as the cracks the future reads.

## The whole shelf, bought as one sentence

The wet-area shelf, summarized for the buyer who reads one paragraph: the tile documented for wet areas and slip, the backer board and its fasteners per their literature, the membrane system with its bands and its sealant, the mortar grades the system calls for, the grout the service deserves, the kit''s geometry where the kit is used, and the sealant joints'' and profiles'' details, all from the methods and specifications the industry maintains. Bought as one sentence, the shelf is a tested system, and the shower that inherits it is the twenty-year shower this series describes, which is the only kind worth its price.

## The niche, the bench, and the wet area''s furniture

The modern wet area carries its own furniture, the niches and benches and shelves the design installs, and the materials aisle serves them with the same system''s honesty the field receives: the niche''s components and its membrane integration, the bench''s foam or masonry geometry and its waterproofing, and the details'' trims and profiles that end the furniture''s edges where the water lands. The furniture is where the wet area''s water story gets its hardest geometry, the horizontal shelf the water stands on, the niche the spray enters directly, and the materials chosen for these details, from the system''s own shelf, are the difference between the furniture that sheds and the furniture that soaks.

## The takeoff, run through the estimator

The wet-area takeoff deserves the same second calculation the series gives every assembly: the tile''s area with the cuts'' and formats'' honest waste, the membrane''s coverage with the bands'' and corners'' line items, the mortar''s and grout''s coverage per their published figures, the pan''s and drain''s kit contents verified against the method''s needs, and the sealant''s and profiles'' linear feet from the geometry the drawings state. FRELUX''s wall-finishing estimator runs the US wet-area arithmetic, and the takeoff that respects the system''s own coverage figures orders once, sets once, and finishes without the second delivery the hopeful round numbers schedule.

## Buying the system''s literature before its pallets

The materials article''s last paragraph belongs to the literature itself: buy the handbook''s current edition, download the system''s installation handbook, keep the ANSI standards'' pages the methods reference, and read the NTCA manual''s chapters on the obstacles your project''s geometry will meet. The literature costs less than one pallet of anything in this aisle, and it is the difference between ordering a system and ordering a guess, and every manufacturer whose products this article has named publishes its instructions for free, which tells the reader what the industry thinks of the buyer who skips them.

## The shelf''s perishables and their windows

The wet-area materials are perishable in the chemistry''s usual ways: the membranes'' liquids freeze in the truck and cure on the shelf, the mortars'' bags hydrate in the humidity, the grouts'' colors drift in the damp storage, and the sealants'' cartridges expire in their cradles. The staged aisle lives inside, dated, rotated, and warm, and the wet area built of fresh materials sets and cures to the properties the literature promised, while the wet area built of the compromised shelf publishes the literature''s failure chapters in its own field. The buyer''s freshness habit is the shelf''s cheapest quality gate.

## The grout''s chemistry, chosen for the life wanted

The grout choice deserves its own closing argument, because it is the wet area''s most consequential small decision: the cement grouts offer the colors and the familiarity at the price of the sealing''s and the chemistry''s maintenance, the epoxy grouts offer the decades of chemical indifference at the price of the installation''s discipline, and the premixed families offer their own bargains their literature states. The steward who chooses the grout is choosing the maintenance calendar, and the reader who reads this article''s maintenance chapter before the grout aisle is the reader who chooses it knowingly, which is the whole purpose of a series that puts the articles in this order.

## The accessories'' final inventory

The aisle''s final inventory completes the buyer''s list: the spacers'' honest widths, the leveling systems the larger formats'' lippage discipline demands, the mixing and grouting tools the chemistry requires, the sponges and the floats kept clean as instruments, and the protection, the papers and the tapes, that keep the finished field safe through the project''s last weeks. The accessories are the system''s small letters, and the wet area built with the right small letters reads, at closeout, like a document that was proofread, which is the impression every buyer is actually purchasing.

## One matched sentence, the aisle''s whole law

The shelf''s final law, stated one more time as the article''s close: the wet area is a system, and the system is bought as one sentence, the board and its fasteners, the membrane and its bands, the mortar the membrane calls for, the grout the service deserves, the sealant and profiles the movement needs, all from the methods and the systems that tested them together. The aisle''s substitutions, however innocent, edit the sentence the warranty and the physics both read, and the buyer who keeps the sentence intact buys the twenty years this article''s aisle exists to sell.

## References
1. Tile Council of North America, *ANSI Standards*, A108/A118/A136.1.
2. Schluter-Systems, *KERDI Waterproofing Membrane*.
3. Schluter-Systems, *Shower System Installation Handbook*.
4. Tile Council of North America, *2026 TCNA Handbook for Ceramic, Glass, and Stone Tile Installation*.
5. National Tile Contractors Association, *NTCA Reference Manual*.$wallarticle2$, 'materials', 10),
  ('us-wet-area-tile-installation', 'Installing Tile in Wet Areas: The US Field Sequence', 'A sequenced US field guide to wet-area tile: substrate and flatness, membrane envelopes and flood tests, layout, setting, grouting, and the movement joints, done in the order that keeps water out forever.', $wallarticle3$# Installing Tile in Wet Areas: The US Field Sequence

The wet-area sequence is the tile trade''s most rule-bound work, and the rules exist because the assembly''s failures are invisible until they are expensive. The sequence that follows is the industry''s, read from the handbook methods, the installation specifications, and the manufacturer systems, and its single organizing principle is the water''s path: every step either prepares the plane, moves the water, or protects the path''s integrity, and the crew that understands the path builds the shower that never argues.

## Substrate: the plane and its proof

The sequence begins with acceptance of the framing and the substrate''s preparation. The framing is solid, the backer or foam boards fastened per their manufacturer''s schedule, seams treated per their literature, and the surface brought within the flatness tolerances the installation specifications define, because the wet area''s water behavior depends on the plane as much as the membrane does. The substrate is dry, clean, and verified, and the acceptance is written, because the substrate is the first layer the tile will never let anyone see again.

## The membrane envelope: from drain to showerhead

The waterproofing is built as an envelope, and the system''s literature draws it. The drain is integrated first, the clamping or bonded assembly per the system''s design, the pan is waterproofed to its slope, the tray or the mud per the method, and the walls are membraned in the system''s sequence, the handbook literature explicit that enclosed showers carry the membrane up to the showerhead''s height at minimum, the seams banded, the corners cornered, the penetrations sealed in the system''s own families. The liquid-applied alternatives follow their coats and their coverage to the same envelope, film verified wet and dry, and the two families share the proof step that separates professional wet areas from hopeful ones: the flood test, the finished membrane holding water per the test''s protocol, the water''s level marked, the hours watched, and the assembly''s watertightness demonstrated before a single tile follows. The shower that passed its flood test carries the proof forever, and the shower that skipped it carries the question.

## Layout and the design''s honest arithmetic

With the envelope proven, the layout begins, and the wet area''s layout is honest arithmetic: the tile''s format divided into the shower''s dimensions, the cuts computed to keep the fields symmetric and the slivers out of the sightlines, the drain''s location centered to the floor''s field, the curbs and benches wrapped in the mosaics or the profiles their geometry needs, and the niches and fixtures placed before the setting begins rather than cut after it. The layout is drawn, dry-laid where the geometry argues, and approved, because the wet area is the room where the grout lines publish every layout decision daily, at the distances the bather actually stands.

## Setting: the mortar''s discipline

The setting follows the mortar''s discipline: the modified or unmodified thinset the system calls for, mixed to its ratio, spread in the directions that keep the coverage honest, the tile bedded with the beat and the lift that wet-area service demands, the full coverage the wet floor especially requires, because a voided floor tile is both a hollow sound and a water''s pocket. The joints are held to the spacers'' honest widths, the lippage is held to the tolerances the standards and the maintenance both care about, and the setting proceeds at the pace the mortar''s open time and the membrane''s protection allow. The wet area''s setting is the trade''s best work, because it is the work the water will interrogate for decades.

## Grouting, curing, and the sealant joints

The grout follows the setting''s cure per the grout''s literature, the field jointed in the colors the specification chose, the cement-based per their sealing''s needs, the epoxy per its own rules and its own cleanup, and the joints finished to the profile the cleaning will live with. The movement''s details come last and matter most: the changes of plane, wall to floor, wall to wall, the curb''s and bench''s corners, are sealed in the neutral-cure sealants over backer rod, in the joints the method and the manufacturer call for, because the grout that is asked to absorb the movement will crack its answer into the field. The grouted shower is cured honestly, kept from water and use per the literature''s windows, and handed over with the sealant joints'' dates written in the file.

## The flood test''s cousins: the verifications between

The professional sequence verifies between its steps: the membrane''s wet film and its dry film, the flood test''s held level, the setting''s coverage sampled at the first tiles'' lift, the lippage read with the straightedge as the field grows, and the grout''s cure before the first shower''s service. Each verification is minutes, and each minutes-long verification is the difference between the twenty-year shower and the five-year one, because the wet area''s defects are hidden by design, and the sequence''s only honest strategy is to catch them while they are still visible.

## Protection of the finished envelope

The finished wet area is protected as the project''s most expensive small room: the other trades are kept off the fresh field, the drains are covered against the debris that clogs them, the corners are guarded against the ladders and the fixtures'' deliveries, and the shower''s first users are the owner''s family rather than the punch list''s boots. The closeout photographs, taken under the bath''s own light, become the file''s first pages, and the handover that includes the system''s name, the membrane''s brand, the grout''s color, and the sealant''s date gives the shower the biography the maintenance years will read.

## The niche''s and the fixtures'' honesty

The field guide''s last operational note is the penetrations'': the niche''s membrane integration is executed as the system''s detail, the fixtures'' penetrations sealed in the system''s families, the door''s and glass''s trims set to the curb''s geometry, and every hole through the envelope treated as the water''s potential path rather than the hardware''s convenience. The wet area''s leaks overwhelmingly begin at the penetrations, the industry''s decades of failure literature says so, and the sequence that treats each one as a detail with its own literature is the sequence whose showers never contribute to the literature.

## Coordination with the plumbing, glass, and finish trades

The wet-area sequence negotiates its neighbors: the plumbing''s rough-in verified before the pan, the drain''s height set to the assembly''s finished plane, the glass''s curbs and jambs built to the door''s tolerance, and the paint''s and trim''s trades following the tile''s protection rather than the tile''s schedule. The superintendent who publishes the wet area''s interface map, plumbing first, tile second, glass third, finishes last, ends the project with the bathroom telling one water story instead of three, and the shower that never leaks is the story''s quiet proof.

## The field''s best habits, gathered

The wet-area crews that never see their work in the failure literature share habits the field guide should gather: the substrate read and written before the boards go up, the envelope built and flood-tested before the tile follows, the layout''s arithmetic done dry, the mortar''s ratio mixed to the bag and the coverage lifted to check, the lippage straightedged as the field grows, the joints sealed at the planes'' changes, and the finished shower protected and photographed for the file. Seven habits, none of them expensive, and together they are the twenty-year shower''s whole recipe, which is the field guide''s most encouraging sentence: the wet area''s excellence is procedural, and the procedures are written down.

## The mud pan''s note, the old craft''s living branch

The field guide owes one paragraph to the traditional mud pan, the mortar-floored shower the old craft still builds, because the handbook''s methods include it and the trade''s best hands still execute it: the deck''s mix and its slope to the drain, the pan liner''s integration, the clamping drain''s weep holes kept open, and the craft''s patience that the tray''s kits have mechanized without replacing. The reader who meets a mud pan, in a specification or in an older building, meets the wet-area tradition at its most skillful, and its maintenance respects the liner''s and the weeps'' details the same way the kits'' literature respects the tray''s, with the water''s path as the guide''s single star.

## The sealant''s timing, the sequence''s quiet trap

One more field caution deserves its paragraph: the sealant joints'' timing. The sealant that follows the grout belongs after the grout''s cure, the assembly''s moisture settled and the joints'' geometry stable, and the sealant applied into a damp joint or onto a green grout is the joint that fails first and fails forever, because the chemistry beneath it was never allowed to become what the sealant''s literature assumed. The professional sequence dates its grout and its sealant the way the file dates them, and the sealant''s date is the last date the sequence writes before the closeout''s photographs.

## The scaffold''s short week, once more

The wet-area sequence, compressed into the week the trade actually schedules: the boards and the envelope''s days, the flood test''s witnessed hours, the setting''s day or two at the mortar''s honest pace, the grout''s day, the sealant''s day after the cure, and the protection''s days until the project''s end. A week and a weekend, in the hands of the certified crew, for the room''s twenty years, and the superintendent who sees the sequence this plainly defends its cures from the schedule''s pressures without needing the failure literature''s arguments, because the arithmetic makes the case by itself.

## The closeout''s evidence, the sequence''s last product

The sequence''s last movement is the closeout''s evidence, the photographs under the bath''s own light, the punch walk''s findings corrected while the crew is present, the file''s pages completed with the system''s names and the gates'' dates, and the handover that teaches the owner the two habits, the squeegee and the annual walk, that keep the sequence''s product for its decades. The wet area that ends its installation this way begins its service the same way, known and kept, and the sequence''s whole discipline exists so that the first sentence of the shower''s life is a sentence the last decade can still read.

## The board''s seams and the envelope''s seams, one discipline

The field guide''s final technical note is the seams'' discipline, shared by both layers: the boards'' seams are treated per the manufacturer''s schedule, taped and set in the families their literature names, and the membrane''s seams are banded and cornered per the system''s, the two seam systems never confused and never skipped, because the wet area''s water finds the seams the way the light finds the dust. The envelope is a seamed product, and the seams are the envelope''s truth, and the crew that honors the two seam disciplines delivers the watertight assembly the flood test then confirms and the decades then reward.

## References
1. Tile Council of North America, *2026 TCNA Handbook for Ceramic, Glass, and Stone Tile Installation*.
2. ANSI, *ANSI A108/A118/A136.1:2026: Installation of Ceramic Tile*.
3. Schluter-Systems, *Shower System Installation Handbook*.
4. National Tile Contractors Association, *NTCA Reference Manual*.$wallarticle3$, 'installation', 10),
  ('us-wet-area-tile-quality-checks', 'Quality Checks for Wet-Area Tile in the United States', 'A US quality-control guide for tiled showers and wet rooms: verifying the hidden system, acceptance under honest light, the defect catalog from lippage to leaks, and the moisture boundary that ends arguments.', $wallarticle4$# Quality Checks for Wet-Area Tile in the United States

The wet-area quality program verifies what the tile will hide. The finished shower shows its beauty and conceals its assembly, and the program''s work is to make the concealed system prove itself before the tile covers it, then to hold the finished surface to the standards its service demands. The program''s instruments are the flood test, the straightedge, the knuckle, the light, and the file, and its absolute is the moisture boundary, the rule that ends the cosmetic conversation whenever the water story speaks.

## The gates, before the tile hides them

The wet-area gates are the sequence''s checkpoints, and each is the last honest look at a layer. Gate one, the substrate: flat, solid, dry, and accepted in writing, the framing''s and boards'' documents verified. Gate two, the membrane: the envelope built per the system''s literature, the seams and penetrations sealed per its details, and the flood test''s held level witnessed and recorded, because the test is the waterproofing''s only proof and the project''s most valuable hour. Gate three, the setting: coverage sampled, lippage checked as the field grows, the layout''s cuts verified against the approved lines. Gate four, the joints: grout cured, sealant joints placed at the changes of plane, the movement''s details executed in the families the methods name. The gates'' photographs are the shower''s warranty in the only sense warranties are ever real, evidence of what was done while it could still be seen.

## Acceptance of the finished surface

The finished shower is accepted for the standards'' own properties, read under the bathroom''s own light at the distances the bather stands. The plane: no lippage beyond the tolerances the specifications and the trim''s exposure allow, the field''s joints true, the floor''s slope verified by the water''s own behavior at the first rinse. The cuts: symmetric, the slivers out of the sightlines, the fixtures'' penetrations neat and sealed. The joints: grout filled and finished to its profile, the sealant joints tooled and continuous at every change of plane, the corners and curbs sealed rather than grouted. The fixtures: the drain''s clamping and the fixtures'' trims set to the system''s details, the glass door''s and the curb''s geometry shedding the spray where the design drew it. The acceptance walk classifies its findings with the trade''s three honest answers, cosmetic, repairable, systemic, and the wet area''s systemic findings, the water''s paths and the hollow''s extents, are the program''s escalations rather than its punch items.

## The defect catalog, read as testimony

The wet-area defects name their causes with unusual clarity. Lippage, the joint''s proud edge: the substrate''s flatness that was never verified, the setting''s beat that was never lifted, and the correction is the standard''s tolerance read honestly and the repair priced from the finding''s extent. Hollow tiles, the voided bond: the coverage the wet floor especially forbids, corrected by the removal and reset the bond''s failure requires rather than the injection the file prefers to forget. Cracked grout and cracked tile at the corners and planes: the movement the sealant joints exist to absorb, corrected by the rejointing per the methods and the honest admission that the grout was never the movement''s material. Efflorescence, the white mineral testimony: the assembly''s moisture migrating through the cement, read as a symptom of the water story rather than a cleaning problem, and closed at its source. The mold and the stains at the field''s low corners: the water''s residency, the ventilation''s failure, the slope''s or the drain''s story, and the finding that ends the do-it-yourself conversation and begins the moisture boundary''s. The catalog''s lesson is the program''s thesis: the wet area''s defects are the hidden assembly''s testimony, and the program that gated the assembly reads the testimony as confirmation rather than news.

## The moisture boundary, the program''s absolute

The boundary deserves its statement in the quality chapter as well: unexplained moisture, the spreading stain, the persistent reading, the ceiling''s evidence below the bathroom, ends the punch list and begins the diagnosis. The wet-area failure modes are hidden by design, and the program''s response is proportionate to the stakes, the source found, the assembly opened where the evidence says, the membrane''s or the drain''s story told by the materials'' own condition, and the repair made to the system rather than to the symptom. The painted-over moisture finding is the scheduled demolition, and the program that holds the boundary is the reason its showers never make the industry''s failure literature.

## The file, and the twenty-year read

The program''s file holds the wet area''s whole biography, the gates'' photographs, the membrane''s brand and its test''s date, the mortars'' and grouts'' identities, the sealant''s families and dates, and the acceptance walk''s images under the bath''s light. The file is the difference between the shower maintained for twenty years and the shower renovated in ten, because the maintained one is known, its materials matched at its repairs, its water story witnessed, and its repairs done at the small prices the file''s knowledge buys. Five minutes of reading, once a year, and the file keeps the wet area the cheapest room in the house, which is the quality program''s whole economics, stated once.

## The instruments, wet-area edition

The program''s instruments, gathered for the pocket: the flood test''s plug and its marked level, the straightedge for the plane and the lippage, the knuckle for the bond''s honest tap, the light of the bath itself for the acceptance walk, the moisture instrument for the boundary''s questions, and the camera for the gates the tile will hide. The wet area''s program carries one more instrument the other assemblies lack, the water itself, the flood test''s held level and the first rinse''s drainage read as evidence, and the professionals who use their instruments at the gates read their closeouts with nothing to find.

## When the program and the schedule argue

The wet area''s schedule pressure deserves its own closing caution, because the sequence''s cures and tests are the schedule''s most tempting cuts: the membrane''s coat that is tiled before its cure, the flood test skipped for the delivery''s deadline, the grout''s service before its chemistry. The professional program holds the gates as gates, because the assembly''s hidden failures compound silently, and the week saved at the flood test is the decade lost at the demolition, and the schedule that respects the cures arrives at the closeout with the twenty-year shower, which is the only arrival the wet area''s price ever promised.

## The three boundaries, wet-area edition

The quality program''s absolute boundaries, stated for this assembly: no tile over an unverified membrane, because the flood test is the envelope''s only proof. No grout asked to absorb the movement the sealant joints exist to take, because the crack is the grout''s answer and the leak is the water''s. And no cosmetic response to a moisture finding, ever, because the wet area''s failures compound hidden and the paint that covers the stain schedules the demolition that explains it. The three boundaries are the program''s spine, and the showers that respect them are the ones the maintenance chapter gets to describe as quiet.

## When the program disagrees with the eye

The closing honesty the quality article owes its reader: the finished wet area can be beautiful and wrong, and the program''s value is precisely the disagreements the eye cannot referee. The gorgeous field over the untested envelope, the perfect joints over the hollow bond, the pristine shower over the migrating moisture, are the wet-area industry''s classic failure photographs precisely because the surface''s beauty is the system''s camouflage, and the program''s gates are the only eyes that see through it. The walk that ends with nothing to find is the walk that began with everything verified, and that is the quality program''s whole content in one sentence.

## The flood test''s documentation, the file''s crown

The quality article''s final paragraph belongs to the flood test''s documentation, the wet-area file''s crown jewel: the test''s date, its held level, its witnessed hours, and its photographs, recorded as the membrane''s proof and the warranty''s foundation, because the manufacturers'' warranties and the standards'' methods alike point back to the moment the envelope demonstrated itself. The shower that carries its flood test''s page in the file carries its twenty years'' evidence on day one, and the shower that does not carries a question no later photograph can answer, which is the program''s last argument for writing everything down while it can still be seen.

## Two classifications the program teaches early

The wet-area program''s findings classify with special care in two cases. The hairline crack at the tile''s field: read before it is judged, because the crack names either the substrate''s movement the assembly should have absorbed or the tile''s own story, and the two readings lead to two different programs. The dark grout at the shower''s low corner: read before it is cleaned, because the persistent dark after the dry is the water''s residency, and the cleaning that erases it erases the evidence with it. The program''s culture is the reading before the response, and the wet area, more than any assembly in this series, rewards the patience.

## The program''s economics, wet-area arithmetic

The quality program''s arithmetic deserves its closing statement: the gates'' hours cost tens, the flood test''s morning costs tens, the file''s discipline costs nothing, and the wet-area failure''s excavation costs tens of thousands and the bathroom''s months. The program is the cheapest insurance in the interior trades precisely because the assembly it insures is the most expensive to excavate, and the builders who internalize that ratio fund their quality programs from the savings their programs make, which is the quietest and most honest economy in construction.

## The record''s afterlife, one final statement

The quality program''s record earns the article''s last word one more time, because the wet-area file''s afterlife is the longest in this series: the warranty''s claims point to the flood test''s page, the repairs'' professionals point to the system''s name, the renovation''s designers point to the grout''s color, and the twenty-year steward points to the file and knows the shower better than the crew that built it knew their own weather. The program''s whole content is a few hours of walking and writing, and its product is decades of knowing, and there is no other trade in this series where the file''s value is so obvious, which is the quality chapter''s quietest recommendation of the industry it documents.

## The five-minute read, stated as protocol, one final time

Because the quality chapter is the one the steward returns to most, its portable protocol deserves its final, complete statement: find the specification''s method and read it, bring the bath''s own light and the knuckle''s own tap, read the plane and the joints and the fixtures, check the file for the flood test''s page, classify every finding with the three honest answers, and hold the moisture boundary without exception. Five minutes, the documents, and the discipline, and the wet area either testifies to its gates or confesses their absence, and the reader who can conduct that walk has learned everything this chapter exists to teach.

## References
1. Tile Council of North America, *2026 TCNA Handbook for Ceramic, Glass, and Stone Tile Installation*.
2. ANSI, *ANSI A108/A118/A136.1:2026: Installation of Ceramic Tile*.
3. Schluter-Systems, *KERDI Waterproofing Membrane*.
4. National Tile Contractors Association, *NTCA Reference Manual*.$wallarticle4$, 'quality', 10),
  ('us-wet-area-tile-maintenance-repair', 'Maintaining Wet-Area Tile in the United States', 'US guidance for the decades of tiled showers and wet rooms: the gentle cleaning chemistry, grout and sealant renewal, the ventilation habit, leak vigilance, and repairs that respect the hidden system.', $wallarticle5$# Maintaining Wet-Area Tile in the United States

A wet-area installation built to the standards is one of the longest-lived surfaces a building can own, and its maintenance is the gentlest in this series, provided the steward respects the two habits the system''s physics asks: keep the water moving and keep the joints honest. This article covers the rhythms, the renewals, the vigilance, and the repairs, and it ends where the wet area''s whole story lives, at the hidden boundary between the tile''s beauty and the assembly''s integrity.

## The gentle chemistry, daily and weekly

The glazed tile field cleans with the mildest products that work, the pH-neutral families the tile and grout manufacturers recommend, applied with the soft tools the glazes forgive, and the weekly rinse-and-wipe that keeps the soap''s and the hard water''s films from becoming the stains the harsh chemistry is then invited to remove. The harsh chemistry, the acids and the abrasives the hardware aisle sells, etches the grout, dulls the glazes, and attacks the sealant joints, and the steward who never buys it has preserved more showers than any product ever did. The squeegee''s habit, the ten seconds that dries the field after the last shower, starves the biology and the hard-water deposits at their source, and it is the single highest-return habit in the entire maintenance calendar.

## Ventilation, the water''s exit

The wet area''s water story includes the vapor, and the ventilation serves it: the fan sized to the room''s volume, run through the bath''s windows per the manufacturers'' guidance, and the airflow maintained so the assembly dries between the uses. The unventilated bathroom is the biology''s greenhouse, and the mildew''s stains at the field''s corners and the ceiling''s evidence above it are the airflow''s testimony rather than the grout''s failure. The steward''s fan habits, on at the bath''s beginning and past its end, are cheaper than any cleaning product, and the ventilation''s annual cleaning, the grille and the housing, keeps the machine''s rating honest for the decades it was sized for.

## Grout, sealed and renewed on rhythm

The cement grout''s field is a sealed surface living a wet life, and its maintenance is the seal''s renewal on the honest rhythm the grout''s literature and the shower''s use define: the annual inspection of the seal''s beading and the joint''s condition, the resealing where the water stops beading, and the regrouting where the joint''s own condition has failed, the small areas refreshed with the matched color and the honest preparation the repair''s literature teaches. The epoxy grouts live their own low-maintenance lives, unsealed and chemical, and the steward''s only duty there is the cleaning the chemistry allows. The grout that is maintained at small never becomes the shower''s renovation, and the resealing hour every few years is the wet area''s cheapest insurance renewal.

## The sealant joints, the assembly''s honor guard

The sealant joints at the planes'' changes, the walls'' corners, the floor''s perimeter, the curb and the fixtures, age on the calendar the sealants'' chemistry defines, and the wet-area steward inspects them at the annual walk and renews them at the first honest failures, the old joint removed rather than caulked over, the geometry restored, the backer rod respected, and the new joint tooled in the neutral-cure family the assembly beneath it allows. The failed sealant joint is the water''s invitation into the assembly''s hidden layers, and the renewed joint is the invitation''s withdrawal, and the renewal, done on rhythm rather than on evidence of leaks, is the entire difference between the two futures the wet area can live.

## Vigilance: the leak''s early readings

The wet area''s failures announce themselves early to the steward who listens: the stain on the ceiling below, the grout''s persistent dark at the field''s low corners, the musty story the ventilation cannot explain, the tile''s new hollow sound at the knuckle''s tap, the loose fixture trim that moves where it once held. Each reading is the hidden system''s early testimony, and the response is proportionate and early: the diagnosis the quality article''s moisture boundary governs, the professional''s instruments and the honest opening of the assembly where the evidence directs, and the repair made to the system, the membrane''s and the drain''s and the joint''s own story respected, rather than the cosmetic''s cover that schedules the demolition. The wet area that is listened to at its whispers never speaks at its shouts.

## Repairs that respect the system

The wet-area repair, when it comes, is the system''s maintenance in miniature: the cracked tile removed with the joint''s care and reset in the mortar the field wears, the grout''s color matched and the joint''s profile matched, the sealant joints renewed in their families, and the membrane''s integrity respected wherever the repair''s opening touches it, because the cut that crosses the envelope must be resealed in the envelope''s own materials and methods or the repair becomes the leak. The larger interventions, the pan''s and the drain''s repairs, the wall''s openings, belong to the trade that knows the system, and the steward''s wisdom is the same wisdom the whole series teaches, hire the system''s own professionals for the system''s own failures, and keep the file that lets them diagnose in minutes what the unfiled building makes them excavate.

## The decades, kept honest

The wet area''s maintenance calendar, gathered for the reader who wants the whole program in one place: the daily squeegee and the fan''s habits, the weekly gentle wash, the annual walk with the sealant''s and the grout''s inspection, the resealing and the recaulking on their rhythms, the ventilation''s annual cleaning, and the file''s page at the year''s end recording the shower''s story in its own words. Two hours a year, and the tiled wet area outlives the house''s other finishes with its beauty intact, which is the system''s whole promise, and the steward''s whole inheritance for honoring it.

## The renovation question, answered honestly

The American bathroom''s renovation culture deserves the series'' last honest word: the wet area built to the standards does not need renovating, it needs maintaining, and the renovation industry''s ten-year bathroom cycle is, in a large fraction of its cases, the maintenance that was never done arriving dressed as a design choice. The steward who reads this series and keeps its calendar owns the shower that the renovation culture never gets to sell, and the steward who inherits an older assembly reads it first, the standards'' vocabulary turning the previous owner''s improvisations into the file''s honest knowns, and maintains from knowledge rather than from the calendar''s averages. That is the whole difference between the bathroom that lasts and the bathroom that gets redone, and it is decided, like everything in this series, at the water''s edge and in the file''s pages.

## Passing the wet area forward

The handover, one final time, is the series''s last act: the file that names the system, the membrane, the grout''s color, the sealant''s families, and the maintenance calendar, passed to the next steward with the shower''s biography intact. The wet area that arrives with its story is maintained in minutes a year, and the wet area that arrives as a mystery is renovated in weeks a decade, and the difference is a folder, and the folder is free.

## The five-minute annual walk, wet-area edition

The steward''s portable protocol, one more time, in this assembly''s own words: look at the ceiling below the bathroom, read the grout''s low corners for the persistent dark, tap the suspicious tile with the knuckle, press the sealant joints with a fingertip, run the fan and watch the water''s exit at the drain, and write the year''s page in the file. Five minutes, once a year, and the wet area''s every whisper is heard while it is still a whisper, and the shower keeps the decades it was built for, and the steward keeps the money the renovation culture was counting on.

## The professional''s boundary, once more

The maintenance article''s last practical sentence is the escalation''s rule: the wet-area findings that cross the moisture boundary, the persistent stains, the moving hollows, the ceiling''s evidence, belong to the trade''s professionals, the associations'' members and the systems'' certified installers, whose instruments and literature exist for exactly these diagnoses. The steward''s role at that boundary is the file''s, the readings recorded, the history honest, the access unhurried, and the series''s experience says the professional who receives a filed wet area repairs it in days while the professional who receives a mystery excavates it for weeks, and the folder is the difference, again, between the two.

## The last word, the squeegee and the file

The series'' last word, wet-area edition, is its two cheapest tools: the squeegee that keeps the field dry and the biology starved, and the file that keeps the system known and the repairs honest. One costs a few dollars and ten seconds a day, the other costs a folder and a page a year, and together they are the entire distance between the wet area that lasts the house''s life and the wet area that renovates every decade, and no product in the aisle between them buys what they buy for free. The steward who keeps the two tools keeps the shower, and the shower, kept, is the best bathroom surface the building owns, every day it is used, for as long as the house stands.

## When the wall changes hands, the wet area''s chapter

The handover''s wet-area chapter, one final inventory: the system''s and membrane''s names, the flood test''s date, the grout''s and sealant''s identities and colors, the repairs'' and renewals'' calendar, and the annual walk''s protocol, all in the folder the series has been teaching since its first article. The next steward who receives it inherits the twenty-year shower on its first day, and the next steward who receives a mystery inherits a renovation on a schedule, and the difference is, one more time, a folder, and the folder is free, and the wet area is the proof of how much a free folder can be worth.

## The quiet wet area, the series'' close

The wet-area series closes where it opened, with the water''s path, kept boring by the system beneath and the habits above: the tile that sheds, the joints that hold, the slope that drains, the envelope that contains, the fan that dries, the file that remembers. Every article in this series has been one sentence in the same quiet argument, that the wet area is engineered and the engineering is knowable and the knowing is the stewardship, and the shower that is known never makes a sound, which is the finest thing a bathroom can ever say about itself. The reader who keeps the path boring keeps the best surface in the house, and the house, and the decades, and the file, and the squeegee, do the rest.

## References
1. National Tile Contractors Association, *NTCA Reference Manual*.
2. Tile Council of North America, *2026 TCNA Handbook for Ceramic, Glass, and Stone Tile Installation*.
3. Schluter-Systems, *Shower System Installation Handbook*.
4. ANSI, *ANSI A108/A118/A136.1:2026: Installation of Ceramic Tile*.$wallarticle5$, 'maintenance', 10)

) AS a(slug,title,excerpt,content,theme,read_time_minutes)
JOIN public.learn_wall_finishing_topics t ON t.market_code='US' AND t.candidate_key='assembly:us-wet-area-tile'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
WHERE NOT EXISTS (SELECT 1 FROM public.learn_articles existing WHERE existing.slug=a.slug)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='US' AND t.market_code='US'
  AND t.candidate_key='assembly:us-wet-area-tile'
  AND a.wall_topic_id=t.id AND a.wall_market_code='US' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en'
  AND a.slug IN ('us-wet-area-tile-overview', 'us-wet-area-tile-materials', 'us-wet-area-tile-installation', 'us-wet-area-tile-quality-checks', 'us-wet-area-tile-maintenance-repair');

COMMIT;
