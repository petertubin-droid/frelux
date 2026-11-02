-- Third researched-candidate topic for US: exterior stucco and EIFS cladding.
-- The topic is registered as verification_status='candidate' (schema gate: only an
-- authenticated admin can promote it to 'verified' via the admin console).
-- Articles remain drafts; publication/review gates are not bypassed.
-- Apply 20261024000000_global_wall_finishing_knowledge_library.sql first.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='US' AND candidate_key='assembly:us-stucco-eifs-cladding') THEN
  INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type,verification_status)
  VALUES ('US','assembly:us-stucco-eifs-cladding','Exterior stucco and EIFS cladding','finish_assembly','candidate');
END IF; END $$;

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,mp.default_language
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON true
JOIN public.market_profiles mp ON mp.country_code=t.market_code
WHERE t.market_code='US' AND t.candidate_key='assembly:us-stucco-eifs-cladding'
ON CONFLICT(topic_id,theme_key,language_code) DO NOTHING;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('ASTM International, ASTM C926-26, *Standard Specification for Application of Portland Cement-Based Plaster*', 'https://store.astm.org/c0926-26.html', 'ASTM International', 'Citation for the application of full thickness portland cement-based plaster for exterior stucco work, including coats, thicknesses, and curing.'),
  ('EIFS Industry Members Association, *EIFS Standards*', 'https://www.eima.com/eifs-standards.html', 'EIMA', 'Citation for the ANSI/EIMA consensus standards governing exterior insulation and finish systems.'),
  ('EIFS Industry Members Association, *EIMA Publications*', 'https://www.eima.com/publications.html', 'EIMA', 'Citation for industry technical publications on EIFS application best practices.'),
  ('Sto Corp., *StoTherm EIFS Installation Guide*', 'https://www.stocorp.com/wp-content/uploads/2017/07/Sto-Installation-Guide.pdf', 'Sto Corp.', 'Citation for EIFS field installation sequence, system components, and manufacturer requirements.'),
  ('Sto Corp., *StoTherm EIFS Reference Guide: Repair and Maintenance*, S707B', 'https://www.stocorp.com/wp-content/content/Systems_TechService/reStore/Installation%20and%20Repair/IG_S707B_StoTherm_Repair_and_Maintenance_Guide_EN.pdf', 'Sto Corp.', 'Citation for EIFS repair and maintenance procedures.'),
  ('Portland Cement Association, *Repair of Portland Cement Plaster (Stucco)*', 'https://www.tsib.org/files/Repair%20of%20PCP%20-%20PCA.pdf', 'Portland Cement Association', 'Citation for recommended procedures for repairing portland cement plaster.'),
  ('Portland Cement Association, *Applications of Cement: Stucco*', 'https://www.cement.org/cement-concrete/applications-of-cement/', 'Portland Cement Association', 'Citation for stucco as the common term for portland cement plaster and its exterior finish characteristics.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='US' AND t.candidate_key='assembly:us-stucco-eifs-cladding'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'US','US',t.id,a.theme,'en','draft'
FROM (VALUES
  ('us-stucco-eifs-cladding-overview', 'Exterior Stucco and EIFS in the United States: System Overview', 'A US-focused overview of the two great exterior cladding systems often confused under one word: portland cement stucco over lath, and EIFS over continuous insulation, their physics, and their standards.', $wallarticle1$# Exterior Stucco and EIFS in the United States: System Overview

Two exterior cladding systems dominate the textured American facade, and the trade and the public blur them under a single word, stucco. One is the genuine article, portland cement plaster, applied in coats over lath or masonry, a tradition as old as cement itself and governed today by ASTM C926. The other is the Exterior Insulation and Finish System, EIFS, a composite of insulation board, reinforced basecoat, and textured finish, born of the energy era and governed by manufacturer systems and the industry standards of its association. They look alike from the curb, and they share virtues, durability, design freedom, low maintenance, but they are different materials with different physics, different failure modes, and different maintenance obligations, and the owner who confuses them maintains the wrong wall. This overview separates them honestly and introduces both as the standards and manufacturers present them.

## Stucco: the cement tradition

Portland cement plaster, the material the trade and the public call stucco, is a system of coats over a prepared substrate, and its character is its hardness and its age. Applied over metal lath and a water-resistive barrier on framed walls, or directly over solid masonry, it builds in the classic sequence: a scratch coat scratched to key the next coat, a brown coat bringing the plane, and a finish coat bringing the color and texture, and the application standard defines the coats, their thicknesses, and the curing that makes cement what it is. Stucco''s virtues are fire resistance, rot and rust resistance, a surface that decades of weather soften rather than destroy, and a finish vocabulary from smooth to heavily textured that has dressed the American Southwest and the Mediterranean coastlines of Florida alike. Its demands are the plasterer''s demands: honest mixing, honest thickness, and above all honest curing, because cement plaster that dries instead of curing is a wall of scheduled cracks.

## EIFS: the composite of the energy age

The Exterior Insulation and Finish System is a different animal wearing a similar coat. Its layers are adhesive or mechanically fastened insulation board over a prepared wall, a reinforced basecoat embedded with glass fiber mesh at the field and heavier at high-impact zones, and a textured finish coat over the armored plane, and the whole is engineered as a single manufacturer''s system, the components tested and warranted together. EIFS arrived with the energy consciousness of the building boom and offered what no cement plaster could, continuous exterior insulation, seamless design freedom, thin and light walls, and a finish palette of textures and colors. The industry''s standards and publications, and the manufacturers'' installation guides like Sto''s, govern its assembly, and the association''s consensus standards frame its testing and performance. Its physics differ from stucco at the fundamental level: it is a barrier or drained membrane over insulation rather than a mass of cement, and its history includes the hard lesson, learned at real buildings'' expense, that water which gets behind an undrained barrier stays there, which is why the modern systems are drained by design.

## The two systems'' shared ground

What earns them a shared article, beyond the curb confusion, is genuine common ground. Both are exterior claddings over the wall''s structure rather than the structure itself, and both live or die by the water management of the whole assembly, the flashings, the sealant joints, the termination details, the windows. Both are finished in acrylic and polymer textures that accept cleaning and recoating. Both demand installer certification and system discipline, and both punish improvisation with failures the industry has photographed for decades. And both belong to the same maintenance culture, walk the cladding, mind the sealants, clean the surfaces, repair the impacts, and keep the water story boring, which is the whole of exterior cladding stewardship in one sentence.

## The standards and literature, mapped

The two systems'' paper trails are separate and clear. Stucco''s governing document is the ASTM application specification for portland cement-based plaster, current edition cited here, supported by the accessory standards for lath and the Portland Cement Association''s literature on materials and repair. EIFS is governed by its manufacturers'' system documents, installation guides and repair guides like Sto''s, within the consensus standards framework its association maintains and publishes. The specification that names either system honestly references the correct literature, and the maintenance file that records which system a building wears is the owner''s first defense against the confusion this overview exists to end.

## Choosing between them, in the specification''s own words

The choice between the systems is a specification decision made on energy, structure, budget, and region. Stucco suits the mass-walls tradition, the fire-conscious West and the climates that love its hardness, and it prices its coats and its plasterers. EIFS suits the energy-conscious project, the complex shapes, and the budgets that prefer a light composite, and it prices its system and its certified installers. The hybrid mislabeled wall, EIFS assumed to be stucco and maintained by masons, or stucco assumed to be EIFS and repaired with the wrong chemistry, is the failure this article series is written to prevent, because both systems are excellent at what they do and both are unforgiving of being treated as the other.

## What follows in this series

The articles that follow take both systems through the five-theme pipeline: the materials aisle, where the two chemistries finally separate into their own shelves, the field sequences, curing for one and lamination for the other, the quality programs, acceptance and the defect catalogs, and the maintenance disciplines, repair manuals written by each industry for its own material. Read as one argument, the series says a single thing twice: respect the system the wall actually is, and the wall repays the respect with decades of handsome, low-cost service.

## A short history of both systems, told honestly

Stucco''s American history is the cement industry''s: the material arrived with portland cement itself, dressed the Spanish revival of the Southwest, the Mediterranean of Florida, and the modern developments of the Sunbelt, and earned the reputation the cement association still cites, a finish that resists rot, rust, and fire and softens decades only gracefully. EIFS''s history is shorter and more instructive: the systems arrived from Europe with the energy crisis''s lessons, spread rapidly through the American boom, and then, in the barrier era, learned the water lesson at the expense of real buildings and real owners, the failures that led to the drained designs and the inspection protocols the industry''s standards now assume. The honest telling of both histories is the overview''s purpose: the materials are excellent, the engineering mature, and the failures were the industry''s own tuition, paid once and written down, which is why both literatures read as they do today, conservative at the water''s edge.

## The regional accents, once more

Both systems wear regional risks the steward should know. The freeze-thaw North tests stucco''s cure and punishes the EIFS puncture that admits water to the freeze''s cycle. The humid Southeast tests the sealant joints and the biological growth on shaded faces. The hail belts test the impacts and the insurance files. The Southwest sun tests the finishes'' color and the walls'' thermal cycling. The claddings are national, and their maintenance calendars are regional, and the walk that knows its region reads its wall faster.

## The overview''s one request

Name the wall. That is the overview''s entire request of the reader: learn which system a building wears, from its documents, its details, or the diagnostic clues this series teaches, and maintain the wall that exists rather than the wall the word stucco suggests. The two systems deserve each other''s respect, and the reader who gives it inherits both traditions'' decades.

## What neither system is, a boundary worth drawing

The overview owes one more boundary: neither system is structure, and neither is a repair for structure. Both are claddings over assemblies whose framing, sheathing, and drainage do the actual work, and the crack that traces the framing''s movement or the water that finds the sheathing''s failure is the assembly talking, not the cladding. The owner who asks the cladding to fix the wall behind it asks the finish to do the structure''s job, and the answer, in both industries'' literature, is the same: diagnose the assembly, repair the assembly, then finish it honestly. The systems are honest about their boundaries, and the reader who honors the boundaries gets the decades both materials promise.

## The economics, side by side

Both systems'' costs live in labor and details rather than materials, both are maintained for less than most Americans assume, and both reward their premium with decades the cheaper claddings borrow. Stucco''s price is the plasterer''s weeks and the cure''s patience, EIFS''s is the certified crew and the details'' care, and the budget that prices either honestly gets the facade the curb photographs rather than the one the punch list documents. The reader who wants the arithmetic run for a specific project has the estimator, and the reader who wants the philosophy has this series, and both systems would rather be chosen for the right reasons than the cheap ones.

## The reader''s diagnostic clues, told plainly

Because most readers arrive at this overview holding a wall they cannot name, the article owes them the diagnostic clues. The stucco wall is hard as stone under the knuckle, its cracks follow the panels'' logic and the corners'' geometry, and its texture reads as mineral, the trowel''s and the float''s vocabulary. The EIFS wall gives slightly under firm pressure at the board, its surface reads as polymer rather than mineral, its edges and details show the system''s plastic trims, and its texture is the acrylic''s aggregate rhythm. The boundary cases exist, the cement-based EIFS finishes among them, and the uncertain steward resolves them from the building''s documents or the manufacturer''s identification rather than from a guess, because the entire maintenance library diverges at this first identification.

## Where each system fails the curb''s test, honestly

The honest overview also admits each system''s characteristic complaint. Stucco''s public reputation suffers at its cracks, which the standard''s cure provisions and the accessories'' geometry were invented to prevent, and which the repair manual then teaches to fix. EIFS''s public reputation suffers at its water history, the barrier era''s lessons, which the drained designs and the detail discipline were invented to prevent, and which the inspection protocols then teach to detect. Both reputations are decades out of date when the walls are built to their current literatures, and both are earned again wherever the literatures are ignored, which is the overview''s final symmetry.

## References
1. ASTM International, ASTM C926-26, *Standard Specification for Application of Portland Cement-Based Plaster*.
2. Portland Cement Association, *Applications of Cement: Stucco*.
3. EIFS Industry Members Association, *EIFS Standards*.
4. EIFS Industry Members Association, *EIMA Publications*.
5. Sto Corp., *StoTherm EIFS Installation Guide*.
6. Sto Corp., *StoTherm EIFS Reference Guide: Repair and Maintenance*, S707B.
7. Portland Cement Association, *Repair of Portland Cement Plaster (Stucco)*.$wallarticle1$, 'overview', 10),
  ('us-stucco-eifs-cladding-materials', 'Materials for US Stucco and EIFS', 'A US-focused materials guide to the two exterior cladding systems: cements, sands, lath, and accessories on one shelf, and insulation board, mesh, basecoat, and finish on the other, each bought as one system.', $wallarticle2$# Materials for US Stucco and EIFS: Two Shelves, One Wall

The materials article for this topic is really two articles, because the systems'' aisles do not overlap except at the paint-adjacent end. The stucco shelf is the mason''s chemistry, cements, sands, and the metal and paper accessories that shape the coats. The EIFS shelf is the manufacturer''s kit, board, adhesive, mesh, basecoat, and finish, engineered and warranted as one system, and the industry''s publications treat the kit''s integrity as the system''s integrity. The buyer who respects the two shelves buys walls that perform, and this article walks them in order.

## The stucco shelf: the cement chemistry

Stucco''s materials are as old as the material itself. Portland cement and blended cements provide the binder, sand provides the aggregate in the gradations the application standard and the plaster literature specify, and lime and the admixtures adjust workability, water retention, and bond, all mixed to the proportions the documents state rather than the shovel''s habit. The chemistry''s honesty is the mixing water, clean, measured, and never the carrier of the classic contaminations, and the proportions'' honesty is the mixer''s, batched by the standards'' definitions of coats rather than by the day''s mood. The shelf''s economy is real, the materials are the least expensive of any cladding in this series, and the wall''s cost lives in the labor and the curing time the materials demand.

## Lath, barrier, and the accessories of the stucco wall

Over framed construction, stucco needs its reinforcement and its protection, and the accessories are a system of their own. The water-resistive barrier sheets and flashings shed what gets past the cladding, the metal lath or the alternative reinforcement provides the mechanical key the coats grip, and the attachment, fastened per the lath standards'' requirements, carries the coats'' weight for the wall''s life. Control joints and casing bead divide the field into the panels the standard''s area limits imply, corner and trim accessories give the wall its edges, and the weep screed at the cladding''s base lets the assembly drain. The accessories are chosen as one geometry, the joint spacing and the lath attachment following the standard''s criteria, and the wall that improvises them writes its improvisation into its cracks.

## The EIFS kit: one system, one shelf

The EIFS shelf is the opposite philosophy, a manufacturer''s engineered kit bought as a unit and installed per its system''s literature. The insulation board, the adhesives and fasteners that attach it, the basecoat with its glass fiber mesh reinforcement, the finish coats, and the trims and accessories are components of a tested assembly, and the manufacturers'' guides, Sto''s among them, are explicit that the system is the system: substitutions and additions void the engineering that warrants it. The buyer''s discipline is the kit''s discipline, order by system name, verify the components'' compatibility by part number, and let the manufacturer''s documentation govern every choice the project makes from sheathing outward. The kit includes its own water management in the modern drained systems, the barriers and drainage planes of the current designs, and the specification that names the system honestly inherits the whole of its tested performance.

## Mesh, impact, and the reinforcement grades

The EIFS reinforcement deserves its own paragraph because it is the system''s armor. The standard glass fiber mesh comes in grades, the field weight and the heavier high-impact grades, and the manufacturer''s guide dictates where the grades go, the field, the ground level zones, the impact-prone walls, and the installer who economizes the mesh''s weight buys punctures at the sidewalk''s height. The mesh is embedded, not laid, fully wetted by the basecoat, overlapped per the guide''s dimensions, and the system''s impact resistance, its most tested property, is the mesh''s story told in the lab and paid for at the job site. The reinforcement is where the kit''s discipline and the installer''s craft meet, and the two together make a thin composite that takes decades of weather and the occasional ladder.

## Finishes, textures, and the color vocabulary

Both systems finish in textured coatings, and here the shelves nearly meet. The stucco finish coat is cement-based, its textures from the float and the trowel traditions, integral colored or painted after cure, and the EIFS finish is acrylic and polymer, factory colored, its textures from aggregate grades and trowel rhythms, applied over the reinforced basecoat. The finishes'' shared virtues are the maintenance interface, both clean and recoat, and the specification''s color and texture choices are the cladding''s public face. The buyer''s honesty is the sample panel, the finish approved on the wall before production, and the record''s honesty is the batch and color written in the file, because exterior color is maintained for decades and the file is the only memory that does not fade.

## Storage, protection, and the perishables of both shelves

Both shelves are perishable in their own ways. Cements hydrate in the bag and must stay dry and dated; the lath''s paper and the barrier sheets degrade in sunlight and weather; the EIFS boards are fuel until coated and are damaged by solvents and by long UV exposure, and the kits'' liquids freeze in the truck and expire on the shelf. The staged materials live under cover, inside their windows, and the insulation boards that will become a wall live the way the manufacturer''s handling instructions say, shaded, dry, and uncrushed. The wall built of abused materials carries the abuse behind its finish, and no later coat forgives it, in either system.

## The two takeoffs, run honestly

The stucco takeoff prices the coats by area and thickness, the accessories by the geometry of joints and edges, and the cement and sand by the standards'' proportions, all arithmetic the plasterer''s generations have refined. The EIFS takeoff prices the kit by area with the manufacturer''s coverage tables, the mesh by the impact zones'' honest areas, and the sealant by the terminations the details count. FRELUX''s wall-finishing estimator runs both takeoffs for US assemblies, the two shelves'' quantities checked against a second calculation, and the budget that respects its materials'' arithmetic is the budget that finishes without surprises.

## The accessories'' geometry, the standard''s arithmetic

The stucco accessories deserve their own closing word, because their geometry is the standard''s mathematics in metal. The control joints divide the field into the panel areas the application criteria imply, the casing bead separates the plaster from its dissimilar neighbors, the corner and arch accessories give the edge its strength, and the weep screed holds the wall''s base line and its drainage''s exit. The buyer who orders these accessories as a geometry, computed from the elevations'' actual dimensions, installs the wall''s joints where the standard would put them, and the wall that never needed the repair manual starts at this order sheet.

## The compatibility rules, both shelves

The two shelves close with the same rule the whole series carries: matched systems, end to end. Stucco''s shelf matches cement to sand to water to lath to accessory per the standards'' and the manufacturers'' proportions and requirements, and the mason who improvises the mix is gambling with a wall that cannot be reinspected from inside. EIFS''s shelf matches component to component by part number and system name, and the kit''s warranty is the engineering''s promise to the buyer who honored it. The aisles never cross, and the wall that ends up with one system''s finish on the other''s base is the wall the repair guides photograph first.

## The sample panel, both shelves'' referee

The materials article''s last shared instrument is the sample panel, built on the project''s own wall or a mockup''s honesty, with the project''s own batches and kits, and approved before production. Stucco''s panel fixes the texture, the color, and the finish coat''s recipe, EIFS''s panel fixes the finish''s texture and the color''s batch, and both panels convert the specification''s adjectives into evidence the punch list can point to. The buyer who pays for the panel buys the wall''s only honest preview, and both industries consider the money the best in the whole budget.

## The buyer''s two orders, in one honest summary

The buyer who reads only this paragraph should still order correctly: for stucco, cement and sand to the standard''s proportions, the barrier and lath and accessories as one geometry, the finish''s materials from the approved panel''s recipe, all fresh, dry, and staged. For EIFS, the manufacturer''s complete kit by system name, all components from the same shelf, the impact mesh where the elevations demand it, and the sealant and detail materials the system''s literature names. Neither shelf tolerates the other''s substitutions, and both reward the single order, verified against the takeoff and the documents, with a wall that behaves as its literature promised.

## Storage on site, both shelves'' last mile

The last mile of both aisles is the site''s storage, where good materials wait their turn and bad habits ruin them. Cements stay under cover on raised platforms, dry and dated; the barrier rolls and the lath bundles stay out of the mud and the sun; the EIFS boards stay wrapped, shaded, and uncrushed, their liquids in conditioned space and their mesh dry; and both shelves are staged in installation order, so the crew that needs the lath does not walk over the finish''s pallets to reach it. The storage plan is the materials article''s quiet ending, and the wall that begins with it never learns the expensive way what a frozen pail or a wet board does at installation.

## The takeoff''s honest margins

Both takeoffs carry margins, and honesty about them is the buyer''s last skill: stucco''s margins are the cutting''s waste and the weather''s losses, a planned percentage rather than a hopeful round number, and the EIFS kit''s margins are the board''s cutting pattern and the detail''s extra, computed from the elevations'' actual geometry. The takeoff with honest margins orders once and finishes once, the takeoff without them orders twice and tells the schedule the second delivery''s story. The margin is where the estimate meets the wall, and both systems'' estimators respect it or repeat it.

## The accessories'' and details'' shared honesty

One closing note on the details'' materials, because both shelves meet the same window: the flashings, the sealant backer rods, and the drainage accessories of the modern assemblies are materials decisions with their own literature, chosen in the chemistries the cladding systems'' documents name, and the specification that treats them as afterthoughts buys the water story at the only prices that matter, the warranty''s and the building''s. The details are the wall''s honor in the materials article, as they are everywhere else in this series, and the buyer who spends an hour on them saves the decade.

## References
1. ASTM International, ASTM C926-26, *Standard Specification for Application of Portland Cement-Based Plaster*.
2. Portland Cement Association, *Applications of Cement: Stucco*.
3. Sto Corp., *StoTherm EIFS Installation Guide*.
4. EIFS Industry Members Association, *EIMA Publications*.
5. Portland Cement Association, *Repair of Portland Cement Plaster (Stucco)*.$wallarticle2$, 'materials', 10),
  ('us-stucco-eifs-cladding-installation', 'Installing Stucco and EIFS in the United States: Field Sequences', 'A sequenced US field guide to the two systems: stucco''s barrier, lath, and scratch-brown-finish coats with curing discipline, and EIFS'' substrate, board, basecoat, mesh, and finish lamination per the system guide.', $wallarticle3$# Installing Stucco and EIFS: Two Field Guides in One

The two systems'' installations rhyme only at the beginning, with the substrate''s acceptance and the water management''s review, and then diverge into two different crafts: stucco''s wet chemistry of coats and cures, and EIFS''s dry lamination of boards and reinforced films. The standards and guides are unusually readable, the plaster application specification for one and the manufacturer''s installation guide for the other, and this article walks both sequences in execution order.

## The shared opening: substrate and water

Both sequences begin the same honest way. The framing or sheathing is inspected for the solidity, fastening, and alignment the cladding will publish, and the water management, flashing, kick-outs,WRB, and the drainage plane, is reviewed before anything covers it, because both claddings are finishes over assemblies whose water story they will reveal rather than repair. The staging, protection, and access follow, and the crew that accepts the substrate in writing begins with the record the whole project will end with.

## The stucco sequence: barrier, lath, coats, and the cure

Stucco''s sequence over framed walls is the mason''s rhythm. The barrier and flashings go on first, shed-lapped and sealed, and the metal lath follows, fastened per its attachment requirements, furred and oriented to key the coats, with the accessories, casing bead, control joints, corner reinforcement, and the weep screed at the base, setting the field''s geometry. The scratch coat is mixed to the standard''s proportions and applied to the specified thickness, scratched to key the brown, and cured, and the brown coat brings the wall to plane, straightedged and darbied true, and cures again, and the finish coat, integral colored or paint-ready, brings the texture the specification named. Between every coat, and after, the wall is cured, kept moist through the cement''s hydration window in the weather the schedule provides, because the application standard''s cure provisions are not suggestions, and the stucco that dries instead of curing is the cracked wall the repair manuals photograph. The sequence''s secret is patience in water, and the crew that wets its wall faithfully builds the hardness stucco is famous for.

## Mixing discipline, the stucco chemistry''s core

The stucco mixer is the wall''s chemist. Batches are proportioned by the standard''s definitions, gauged by count or measure rather than shovel, the water is clean and consistent, and the mixing is long enough to hydrate and short enough to work, and each coat''s batch is consistent with the last, because color and strength live in the proportions'' repetition. Retempering, additives'' improvisations, and the mixer''s shortcuts are the classic inputs of the classic failures, and the mixer''s discipline is measured in the wall''s decades.

## The EIFS sequence: board, rasp, and the armored film

The EIFS sequence is the manufacturer''s, and the guide is the law. The substrate is prepared to the system''s requirements, the air and water barrier of the modern systems applied and sealed, and the insulation board is attached, adhesive-ribbed or mechanically fastened per the design, in the running bond pattern the guides specify, rasped flat to the plane, and the openings and terminations cut to the details'' tolerances. The basecoat follows, troweled and the mesh embedded wet-in-wet, fully encapsulated, overlapped per the guide''s dimensions, with the high-impact mesh where the elevation''s exposure demands it, and the basecoat cures before the finish honors it. The finish coat, the system''s public face, is applied to the coverage and the texture rhythm the specification and the sample panel agreed, and the wall that follows the guide to its last detail inherits the system''s tested performance, which is the only performance the warranty recognizes.

## The terminations, sealants, and the details that decide

Both systems'' fates live at their edges. The windows and doors, the penetrations, the roof-wall intersections, and the grade and slab terminations are where the assemblies'' water management succeeds or fails, and both sequences treat the sealant joints and flashing details as the project''s most important square feet, executed per the manufacturers'' details, sealed in the sealant families the systems'' literature names, and inspected with the care the field''s flat acres never receive. The industry''s hardest lessons, the barrier era''s moisture failures above all, are taught at these edges, and the modern drained systems and their details are the lesson''s answer, installed as drawn or not installed at all.

## Coordination with the building''s own trades

Both claddings share the building with the roofers, the window installers, and the landscapers, and the sequences negotiate the interfaces: the roof-wall flashings before the cladding''s terminations, the windows'' own installation and flashing integrated with the cladding''s WRB, and the grade held below the weep screed and the EIFS''s termination line. The superintendent who publishes these interfaces before the first coat or board goes on ends the project with the water management telling one story instead of three, and the cladding, either one, performs as its literature promised.

## The two rhythms, one closing habit

Stucco''s rhythm is wet, patient, and cyclical, coat, cure, wet, coat again. EIFS''s rhythm is mechanical, laminated, and sequential, plane, film, armor, face. The closing habit is the same: follow the governing document, one coat or one detail at a time, verifying each against the standard or the guide, because both systems are engineered to be built exactly as written, and both industries have documented, at the expense of real buildings, what the deviations cost.

## Certifications and the installers the systems trust

Both industries have learned that the material is only as good as its installer, and both have answered with training and certification. The EIFS manufacturers certify the contractors who install their systems, the trade''s associations train the plasterers who carry the cement tradition, and the specification that names a certified installer names the quality program''s first gate. The owner who verifies the installer''s standing with the manufacturer or the association has bought the system''s tested performance rather than its imitation, and the field guide''s last advice to the buyer is simply this: hire the wall''s own trade.

## Protection of the work in progress

Both systems are vulnerable to the trades that follow. The fresh stucco cures against the schedules of the masons and the weather, the finished EIFS punctures against the ladders and the deliveries, and both need the protection culture the interior trades learned long ago, staged walks, protected planes, and the documented handoffs that keep the cladding the last trade''s witness rather than its victim. The superintendent who ends the project with the cladding unmarred has run the project''s last weeks as carefully as its first, and the closeout photographs show it.

## The weather windows, both rhythms

The field guide''s last shared caution is the weather, which both systems'' chemistries respect and both schedules must. Stucco''s coats want the temperatures and the moisture the standard''s cure provisions assume, and the wall that freezes in its cure or bakes in its youth carries the weather''s signature in its cracks. EIFS''s adhesives and finishes want the windows their data sheets state, and the board that goes on a wet or frozen substrate bonds to the condition the substrate was in, not the one the schedule wished. The crews that watch the sky and the wall''s surface thermometer finish in the weather the materials were tested in, and the crews that outrun the weather repaint the consequences.

## The closeout, both walls

The field guide''s last movements are shared again: the closeout walk in honest daylight, the punch list walked and corrected while the mobilization is warm, the photographs under the light of record, and the handover that includes the file, the system''s name, the products'' batches, the sealant joints'' dates, and the walk''s calendar. Both systems end their installation the way they will live, inspected, documented, and known, and the crews that end them this way have delivered the claddings'' whole promise, which is a facade the weather and the decades respect.

## The lath and the plane, the stucco sequence''s hidden gate

The stucco sequence deserves one more emphasis, at its most commonly rushed gate: the brown coat''s plane. The finish coat is thin, and it publishes the plane beneath it, and the brown coat''s straightedging, the screeding, the darbying, and the rod work that bring the wall to its true plane are the difference between the facade the curb photographs and the facade the raking sun interrogates. The crews that take the brown coat''s time give the finish coat its freedom, and the field guide''s counsel to the plasterer is simply this: the plane is built before the texture is born.

## The board''s plane, the EIFS sequence''s same lesson

The EIFS sequence teaches the same lesson one system over: the rasp and the straightedge that true the insulation board''s plane give the basecoat and finish the surface the street will see, and the board that goes on wavy publishes its wave under every texture and every angle of sun. The plane, either system, is the cladding''s honesty, and both fields'' guides put the plane before the finish for the same reason the standard puts the cure before the coat: the later layer inherits exactly what the earlier layer was.

## The crew''s daily rhythm, both systems

The field guide''s final paragraph is the human one. Both systems are performed by crews whose rhythm decides the wall''s quality as surely as any document, the plasterer''s dawn mixing and the day''s coats, the laminator''s steady progression of board and mesh and finish, and the crews that keep their rhythm in the weather''s windows deliver walls whose closeouts are quiet. The rhythm is trained, not hired, and the buyers who ask a crew about its rhythm, its batches, its cure discipline, its mesh laps, are interviewing for the wall''s decades rather than the schedule''s weeks, and the crews that answer well are the crews this guide describes.

## The handoff to the painter, both systems

The field sequences end with the finish''s honest handoff, and in both systems the coatings'' trades follow rules worth stating once more. Stucco''s painted finishes wait for the cure the masonry-paint literature requires, the alkalinity tested and the primer matched to it, and the integral colors live without paint at all, cleaning their way to renewal. EIFS''s finishes accept the manufacturer''s recoat systems directly, and the wrong coating on the polymer finish is the delamination the guide''s repair chapter then documents. The claddings'' last trade is the steward''s first reader, and the handoff that includes the system''s name and literature keeps the wall''s story coherent from the scaffold to the paint store.

## References
1. ASTM International, ASTM C926-26, *Standard Specification for Application of Portland Cement-Based Plaster*.
2. Sto Corp., *StoTherm EIFS Installation Guide*.
3. EIFS Industry Members Association, *EIMA Publications*.
4. Portland Cement Association, *Applications of Cement: Stucco*.$wallarticle3$, 'installation', 10),
  ('us-stucco-eifs-cladding-quality-checks', 'Quality Checks and Common Defects in Stucco and EIFS', 'A practical US quality-control guide for both claddings: stage gates, the stucco crack and bond catalog, the EIFS impact and water-intrusion catalog, and the moisture boundary both systems hold absolutely.', $wallarticle4$# Quality Checks and Common Defects in Stucco and EIFS

The quality program for these two systems reads the wall as testimony: stucco''s defects name the chemistry''s shortcuts, the mixing, the thickness, the cure, and EIFS''s defects name the lamination''s shortcuts, the embedding, the details, the water management. The program gates the stages each cladding hides, walks the finished surface under daylight, and holds a moisture boundary that both systems'' histories have taught at real expense. This article is the program, both catalogs, and the boundary.

## The stage gates, for both systems

The stucco gates are the mason''s: substrate and water management accepted in writing, lath fastened and accessory geometry verified, each coat''s thickness and keying checked before the next, and the cure, wetted and honest, verified through its window, because the standard''s cure provisions are the coat''s strength and the wall''s decades. The EIFS gates are the laminator''s: substrate and barrier verified, board attachment and plane checked, mesh embedding inspected wet-in-wet, the laps and the impact zones verified per the guide, and the terminations and sealant joints walked detail by detail before the finish covers the evidence. Both programs photograph their gates, and the closeout arguments that never happen are the photographs'' dividend.

## Acceptance of the finished surfaces

Stucco''s acceptance reads the wall for its plane, its coat uniformity, and its texture per the approved sample, with the color and tone judged across the field''s panels, and the control joints'' geometry the straight lines the accessories promised. EIFS''s acceptance reads the membrane for its continuity, the finish for its texture and color per the sample, and the details for their execution per the manufacturer''s drawings, with the impact zones'' reinforcement verified by the record rather than assumed. Both walks are conducted in the daylight the street will use, at the distances the curb actually sees, and the findings are classified with the trade''s three honest answers, cosmetic, repairable, systemic, before anything proceeds.

## The stucco defect catalog

Stucco''s failures are the cement''s testimony. Cracking, the cladding''s signature complaint, follows its causes'' map: the omitted or misplaced control joints, the lath''s attachment that let the coat move, the thickness off the standard''s definitions, and above all the cure that was never kept, and the correction is honest, read the crack''s pattern, fix the cause, and repair per the procedures the plaster repair literature documents rather than filling and painting the wall''s complaint. Bond failure, the coat that drums or lifts: the dusty substrate, the contaminated mix, the frozen wall, corrected by removal and reapplication on a prepared surface. Efflorescence and staining: the water''s mineral testimony, read as a symptom and cleaned as a finding, with the source closed before the cosmetics. Color variation and cold joints: the batching''s inconsistency and the day''s interruptions, prevented by the mixer''s discipline and corrected, where honest, by the recoat rather than the apology. The catalog''s lesson is the chemistry''s lesson: stucco''s defects are process failures with names, and the program that gates the process meets none of them.

## The EIFS defect catalog

EIFS''s failures are the membrane''s testimony. Impact damage, the punctured board and torn mesh: the sidewalk''s story, corrected by the repair procedures the system''s repair guide documents, cut-back, mesh, basecoat, finish, and prevented by the impact zones'' honest reinforcement at installation. Basecoat and mesh defects, the hollow or delaminated areas: the embedding''s shortcuts, corrected before the finish by re-lamination. Water intrusion at the details, the system''s serious history: the sealant joint''s failure, the flashing''s omission, the window''s integration, prevented by the details'' execution as drawn and detected by the interior''s stains and the moisture readings the industry learned to take, and the barrier era''s lessons live on in the drained designs and the inspection protocols the standards and the guides now assume. The catalog''s lesson is the kit''s lesson: EIFS is a tested system, and the tested system''s performance is installed at the details or lost at them.

## The moisture boundary, both systems'' absolute

Both catalogs end at the same boundary, and the program states it without negotiation: water findings end the cosmetics conversation and begin the building conversation. The stain that spreads, the reading that persists, the interior damp that tracks the cladding''s location, these are the assembly''s water story surfacing, and the honest response is diagnostic, the source found and closed, the assembly dried, the damaged materials evaluated against replacement rather than hope. The cladding, either one, is a finish over an assembly, and it can only decorate a wall that has been made dry. The programs that hold this boundary save their buildings money at the only time it is cheap, early, and the programs that paint over it buy the industry''s worst photographs.

## Records, and the walk that makes them

The program''s file holds both systems'' evidence, the gates'' photographs, the products and batches, the sealant joints'' details and dates, the moisture events and their closures, and the closeout walk''s images under daylight. The claddings in this article are maintained for decades, and the file is the only memory that does not fade, the only record that answers, at the ten-year walk, what the wall is, what was done to it, and what its water story has been. Five minutes of reading, twice a year, and the file keeps the building''s exterior legible, which is the exterior''s whole maintenance economy.

## The instruments, few and honest

The quality program''s instruments are few and legible: the daylight the street uses, the straightedge the plane needs, the tapping knuckle the bond tells, the moisture instrument the suspicion earns, the sample panel the texture referees, and the camera the file remembers. The programs that carry these six instruments and the documents that govern them settle their walls'' arguments in minutes, and the walls that were gated by them never generate the arguments in the first place, which is the entire economics of quality control in one sentence.

## When the programs disagree, the documents decide

The closing note on disputes: both systems'' arguments are settled by their paper, the standard''s definitions for the cement wall, the system guide''s details for the composite one, and the program that collected its evidence at the gates settles them without the elevators lawyers ride. The standard and the guide are the two walls'' two constitutions, and the quality program is their enforcement branch, and the owner who knows this walks to the file rather than the courthouse.

## Reading the wall, the five-minute skills

The quality program''s portable skills, gathered for the reader''s own walls: the stucco read, sight along the wall in raking daylight for the crack''s patterns, tap the suspicious hollow, trace the stain to its source. The EIFS read, press the suspect bulge, examine the reachable punctures, and inspect the sealant joints at the windows with a fingertip''s care. Both reads take five minutes and find, at the cheapest moment, the findings this article has cataloged, and the steward who reads well finds the wall talking early enough that everything it says is cheap.

## Two catalogs'' shared root

The catalogs close with their shared root, worth one paragraph of its own: nearly every defect in both systems is a water story or a process story, and the water stories outnumber the process stories wherever the details were neglected. The quality program that holds the gates and the moisture boundary prevents both story types in the only place prevention exists, the installation, and the programs that hold them read their walls'' closeouts with nothing to find. The catalogs exist for the walls whose programs did not hold, and the reader who has followed this series to this paragraph knows which wall to build next.

## The three boundaries, stated together

The quality article''s absolute boundaries, gathered for the record: no coating over an uncured stucco coat or an uncured basecoat, because the film cannot outrun its substrate''s chemistry. No finish over an unverified plane, because the texture publishes the plane it was given. And no cosmetics over unexplained water, in either system, ever, because both industries'' histories teach that the water wins and the file remembers. The programs that hold the three boundaries write closeout photographs that belong in portfolios, and the programs that negotiate them write the photographs the repair guides use as examples, and every reader of this series chooses, gate by gate, which portfolio their walls end up in.

## The file''s last page, and the walk that writes it

The quality article''s file gains its last page at closeout, the photographs under the light of record, the punch list''s corrections verified, the products'' and batches'' identities, the sealant joints'' locations and dates, and the moisture boundary''s clean bill or its honest exceptions. The page takes a morning to write and serves the building''s lifetime, and the ten-year steward who reads it knows the wall better than the crew that built it knew their own weather. That is the whole gift of the quality program, both systems, one profession: the wall, made legible, forever.

## The two programs'' one shared habit

The quality article''s compressed close, both systems together: gate the stages, verify the plane, honor the cure, walk the details, photograph everything, and read every defect as the testimony it is. The habit is one habit, whether the wall is cement or composite, and the habit is the difference between the two portfolios this article has described. Quality control in these trades is not a department, it is a way of walking a wall, and the professionals who walk it well are the reason both claddings have reputations at all.

## The moisture instruments, used honestly

The moisture boundary deserves one more paragraph, on its instruments, because the modern quality program measures rather than guesses. The non-invasive meters and the probe instruments the industry adopted read the wall''s water story in numbers, the baselines are taken at closeout when the wall is known dry, and the later readings are compared against them at the walks, and the trend, not the single number, is the finding. The programs that measure convert their moisture suspicions into evidence and their evidence into maintenance budgets, and the programs that guess convert theirs into lawsuits and folklore, and both systems'' industries, having paid the tuition once, now publish the measuring culture the reader should demand of every project, new or old.

## The sample panel''s governance, both systems

The quality program''s referee deserves its final word here as well, because both systems'' acceptance disputes are settled by panels agreed in advance: the stucco panel fixes the mix''s recipe, the texture''s vocabulary, and the color''s tone, and the EIFS panel fixes the finish''s batch and the detail''s execution. The panels are built by the production crew, approved by all parties under the light of record, and kept on site as the standard the wall is walked against, and the punch list that argues with a panel argues with evidence rather than adjectives. The panel is the quality program''s cheapest document and its most consulted one, and the walls that were built to an approved panel are the walls whose closeouts end the day they start.

## References
1. ASTM International, ASTM C926-26, *Standard Specification for Application of Portland Cement-Based Plaster*.
2. Sto Corp., *StoTherm EIFS Reference Guide: Repair and Maintenance*, S707B.
3. Portland Cement Association, *Repair of Portland Cement Plaster (Stucco)*.
4. EIFS Industry Members Association, *EIFS Standards*.$wallarticle4$, 'quality', 10),
  ('us-stucco-eifs-cladding-maintenance-repair', 'Maintaining Stucco and EIFS Exteriors in the United States', 'US guidance for the long care of both claddings: wash and inspection rhythms, crack and impact repair per the systems'' own manuals, sealant stewardship, moisture vigilance, and the files that keep exteriors known.', $wallarticle5$# Maintaining Stucco and EIFS Exteriors in the United States

Both of these claddings were sold on low maintenance, and both honor the promise, on one condition: the maintenance they ask for is actually done. The rhythm is modest, the washes and the walks and the sealant joints, the repairs are documented by each industry in its own repair literature, and the stakes concentrate at the water boundary both systems guard. This article is the steward''s manual for both walls, and it begins where both industries begin, with the walk.

## The annual walk, both editions

Once a year, and after the region''s weather events, the steward walks the exterior in good daylight and reads the wall. On stucco: the cracks and their patterns, the stains'' locations, the control joints'' condition, the base''s weep screed clear and the grade below it. On EIFS: the impacts and punctures at the reachable heights, the sealant joints at windows and penetrations, the terminations'' cleanliness, the dirt and the growth that tell where the water runs. On both: the flashings, the roof-wall intersections, and any interior stains that track the cladding''s weather side. The walk takes minutes, finds everything early, and is the entire difference between the cladding that ages for decades and the cladding that surprises its owner with a bill.

## Washing, gently, on rhythm

Both finishes clean with the gentle hierarchy: clean water and soft tools first, the appropriate mild solutions per the manufacturers'' guidance second, and the pressure washer never, because the pressure that cleans the film drives water into the assembly and the erosion that ages stucco''s face. The dirt and the biological growth the wash removes are also readings, the stains that map the water''s paths, the growth that marks the shaded and damp faces, and the steward who washes and reads in one pass keeps the wall both clean and known.

## Stucco repair, per the plaster''s own manual

Stucco''s repair discipline is documented by the Portland Cement Association''s repair literature, and the honest summary is that stucco forgives almost anything if the cause is read first and the material is matched. Cracks are classified by width and pattern, the structural and the cosmetic separated honestly, and repaired with the mixes and the procedures the manual details, routed, filled, cured, and finished to the field''s texture and color. Spalling and bond failures are cut back to sound material and replastered on prepared substrates, the patch''s edges feathered and cured like the wall was built, and the repair that follows the manual disappears, while the repair that fills and paints returns through its own grave. The manual''s whole teaching is the mason''s: repair the wall with the wall''s own chemistry, and respect the cure.

## EIFS repair, per the system''s own guide

EIFS''s repair discipline is documented by the manufacturers, Sto''s repair and maintenance reference among the published guides, and its honest summary is the kit''s: repair the system with the system''s own components, cut back to sound board and mesh, re-laminate the basecoat with the mesh''s laps, refinish with the finish''s color and texture, and the repair inherits the wall''s tested performance. The impact at the sidewalk height, the puncture from the ladder, the detail''s sealant failure, all have their procedures in the guide, and the installer who follows them restores what was engineered, while the handyman who fills the puncture with the wrong chemistry schedules the delamination the guide was written to prevent. The system''s repair is the system''s installation in miniature, and both are governed by the same document.

## The sealant joints, both systems'' honor guard

The sealant joints at the windows, the penetrations, and the terminations are both claddings'' most important square feet and the maintenance program''s most productive attention. The sealants age on a known calendar, the joints are inspected at the walk, cleaned and resealed per the sealant''s and the system''s literature when the failures begin, and the joint''s geometry, the backer rod and the tooling, is restored rather than caulked over, because the seal over a failed seal is the water''s invitation. The industry''s hardest lessons were taught at these joints, and the steward who keeps them honest keeps the wall''s water story boring, which is the whole game.

## Repaints and recoats, honestly scheduled

Both systems renew their finish coats on honest schedules. EIFS''s acrylic finishes accept cleaning and recoating per the manufacturer''s coating literature, and the recoat restores color and protects the basecoat at a fraction of replacement. Stucco''s painted finishes repaint on the masonry-paint discipline, the wall washed, the repairs cured and primed, and the coating system chosen for the exterior''s alkalinity and vapor, and the integral-colored finishes renew by the wash and the patience, their color the cement''s own. The recoat decisions are made from the wall''s actual condition at the walk, not from the calendar''s averages, and the file that records the finishes'' history prices the next cycle honestly.

## The moisture vigilance and the professionals'' boundary

The boundary article, one final time: stains that spread, readings that persist, interior damp that tracks the exterior, these findings hire the professionals, and the questions the steward asks are the series''s own, what is the source, what does the assembly contain, what will the repair restore. The stucco wall''s answers come from the mason''s literature, the EIFS wall''s from the system''s, and the wall that gets its own system''s answers gets its decades back.

## The files, and the decades

Both claddings'' stewardship ends where it began, in the file: the system the building wears, recorded by name, the products and the colors, the walks'' findings, the repairs'' dates and materials, the sealant joints'' renewal calendar. The building that knows its exterior, stucco or EIFS, maintains it in minutes a year, and the building that does not know maintains it in projects and surprises. The file is the cheapest component of either wall, and it is the only one whose value compounds.

## The steward''s calendar, both walls

The annual rhythm, gathered in one place: spring''s walk after the winter''s testimony, the wash in the growing season''s weather, the sealant joints'' inspection at the same walk, the repairs done at small and per the manuals, the repaint or recoat priced from the wall''s actual condition, and the file''s page at the year''s end. Two days a year, both systems, and the walls that get them are the walls whose decades look easy, which is the quiet truth of both claddings'' low-maintenance promise: it is low, and it is not none, and the steward who knows the difference keeps the difference in the bank.

## Passing the exterior forward

The series'' final habit, for both walls, is the handover that names the system: the file that says which cladding the building wears, the shelf it repairs from, the joints its water management keeps, and the walk that keeps them all honest. The next steward who receives that file inherits decades of quiet, and the wall, stucco or EIFS, keeps the only promise either system ever made honestly, which is that it will outlast everyone who neglects it politely and serve everyone who reads it well.

## The last word, both walls'' own

The series'' last word belongs to the materials themselves, and it is the same word in two accents: continuity. Stucco''s coats are continuous over their lath, EIFS''s film is continuous over its board, and the water management is continuous over the whole, and the maintenance that keeps the continuities intact is the entire stewardship, the walks, the washes, the joints, the repairs, the file. The walls reward the keeping with the decades the curb photographs, and they charge the neglect with the failures this article has cataloged, and both prices are published, which is the fairest arrangement the exterior of a building ever offers its owner.

## The quiet exterior, the series'' last image

The series closes where the interiors'' series closed, with the image of the quiet surface, but the exterior''s quiet is earned against weather rather than light. The wall that sheds its rain, drains its intrusions, flexes with its framing, and wears its decades gracefully is the wall whose steward read it correctly and kept its bargains, and both systems, the cement tradition and the composite modern, offer that wall to whoever honors their literatures. The reader who keeps one habit from this article should keep the walk, because the walk is where every other habit begins, and the quiet is what they all add up to.

## When the wall deserves a professional, and which one

The steward''s last question is the escalation''s, and the answer differs by system: the stucco wall''s serious findings, the structural cracks, the bond failures, the recurring water, go to the plaster trade and the mason''s literature, and the EIFS wall''s go to the system''s manufacturer and its certified contractors, whose repair guides and technical services exist for exactly these calls. The handy generalist serves both walls for the small things and betrays them for the large, and the steward who knows the difference keeps each wall''s serious conversation inside its own industry, where the answers were written down decades ago. The last sentence of this series is therefore a phone book: the stucco wall keeps the plasterer''s number, the EIFS wall keeps the manufacturer''s, and the file keeps both.

## The final inventory, once more with feeling

The steward''s complete kit, both walls, fits in one drawer and one habit: the file that names the system, the manuals each industry wrote, the sealant shelf matched to the walls, the gentle wash''s tools, the annual walk''s calendar, and the phone numbers of the trade and the manufacturer. The kit costs a weekend to assemble and a few days a year to keep, and it is the entire distance between the cladding that ages for decades and the cladding that ages in projects. The walls, both of them, are honest materials, honestly engineered, and the stewardship they ask for is small, published, and fair, and this series has done its whole job if the reader simply keeps the bargains.

## The walls'' last word, the reader''s first

The series ends, and the walls begin, with the walk. However the reader arrived here, as owner, buyer, builder, or steward, the next step is the same and it is outside, in good daylight, at the wall''s own distance, with this series'' questions in mind: what system is this, what is its water telling, what does its file say, and what small thing can be done now that will be large in five years. The walk answers everything this article series could not, because the walk is where maintenance actually happens, and the walls, both of them, are waiting to be read.

## References
1. Portland Cement Association, *Repair of Portland Cement Plaster (Stucco)*.
2. Sto Corp., *StoTherm EIFS Reference Guide: Repair and Maintenance*, S707B.
3. ASTM International, ASTM C926-26, *Standard Specification for Application of Portland Cement-Based Plaster*.
4. EIFS Industry Members Association, *EIMA Publications*.$wallarticle5$, 'maintenance', 10)

) AS a(slug,title,excerpt,content,theme,read_time_minutes)
JOIN public.learn_wall_finishing_topics t ON t.market_code='US' AND t.candidate_key='assembly:us-stucco-eifs-cladding'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
WHERE NOT EXISTS (SELECT 1 FROM public.learn_articles existing WHERE existing.slug=a.slug)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='US' AND t.market_code='US'
  AND t.candidate_key='assembly:us-stucco-eifs-cladding'
  AND a.wall_topic_id=t.id AND a.wall_market_code='US' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en'
  AND a.slug IN ('us-stucco-eifs-cladding-overview', 'us-stucco-eifs-cladding-materials', 'us-stucco-eifs-cladding-installation', 'us-stucco-eifs-cladding-quality-checks', 'us-stucco-eifs-cladding-maintenance-repair');

COMMIT;
