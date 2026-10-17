-- Fifth authored US wall-finishing batch: five researched draft articles for the native US exterior masonry-paint assembly.
-- Nigeria is deliberately excluded (its articles are complete). Articles remain drafts; citations remain pending and publication/review gates are not bypassed.
-- Apply 20261024000000_global_wall_finishing_knowledge_library.sql first.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='US' AND candidate_key='assembly:us-exterior-masonry-paint') THEN RAISE EXCEPTION 'US exterior masonry-paint topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Brick Industry Association, Technical Note 6, *Painting Brick Masonry*', 'https://www.gobrick.com/media/file/6-painting-brick-masonry.pdf', 'Brick Industry Association', 'Citation for paint applications to interior and exterior brick walls and suitable paint types.'),
  ('Brick Industry Association, Technical Note 6 (2025 revision), *Changing the Appearance of Brick Masonry*', 'https://www.gobrick.com/media/file/TN%206_03242025.pdf', 'Brick Industry Association', 'Citation for materials and techniques applied to brick masonry to change its appearance.'),
  ('Brick Industry Association, Technical Note 46, *Maintenance of Brick Masonry*', 'https://www.gobrick.com/media/file/46-maintenance-of-brick-masonry.pdf', 'Brick Industry Association', 'Citation for inspection programs and maintenance procedures including sealant and coating care.'),
  ('Brick Industry Association, *The Do''s and Don''ts of Painting Brick*', 'https://www.gobrick.com/resources/brick-news/post/the-do-s-and-don-ts-of-painting-brick', 'Brick Industry Association', 'Citation for painting precautions including the recommended waiting period for new brickwork.'),
  ('Brick Industry Association, *Technical Notes index*', 'https://www.gobrick.com/resources/technical-notes', 'Brick Industry Association', 'Citation for the Technical Notes series governing brickwork appearance and maintenance.'),
  ('Occupational Safety and Health Administration, 29 CFR 1926.1153, *Respirable Crystalline Silica*', 'https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1153', 'OSHA', 'Citation for dust control obligations during surface preparation and abrading of masonry.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='US' AND t.candidate_key='assembly:us-exterior-masonry-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'US','US',t.id,a.theme,'en','draft'
FROM (VALUES
  ('us-exterior-masonry-paint-overview', 'Exterior Masonry Paint in the United States: System Overview', 'A US-focused overview of painting exterior brick and concrete masonry: the coating chain, breathability, the industry''s cautions, and what painted masonry commits a building to.', $wallarticle1$# Exterior Masonry Paint in the United States: System Overview

Unpainted brick is one of the most durable exterior finishes in North America, and that fact is exactly why painting it is a decision worth understanding before it is made. A coat of paint changes a masonry wall from a self-finished, self-draining material into a maintained coating over a mass of mineral and moisture, and everything in this assembly, the cleaning, the priming, the acrylic topcoats, and the decades of repaint cycles that follow, flows from that single change. This article introduces the exterior masonry paint assembly as the Brick Industry Association's own literature frames it: a viable, attractive, and thoroughly documented finish, with cautions the industry states plainly and a chain of operations the trade has refined for a century.

## The assembly in one honest paragraph

The chain that the catalog names, exterior masonry, primer, exterior acrylic, runs in a disciplined order. The masonry is cleaned gently and repaired first, with mortar joints sound and dry before anything coats them. New work waits: the Brick Industry Association recommends against painting new brickwork immediately, and its published guidance for new construction calls for a waiting period, about a month, so that the initial moisture, efflorescence, and residual alkalinity of young masonry do not attack the first coats. A primer matched to the substrate equalizes absorption and bonds the system, and an exterior acrylic topcoat, in one or two coats, delivers the color and the weather protection. Around the chain sits the water management that always governed masonry: flashing, weeps, and drainage details that must stay open, because paint is a finish and not a waterproofing.

## What paint does to masonry, in both directions

The honest overview begins with the tradeoffs. Paint gives masonry a new color economy, protects soft or weathered units, unifies patchwork walls, and simplifies future maintenance into a cleaning and repaint rhythm. It costs the wall its near-zero maintenance, commits the building to repaint cycles, and, if the wrong coating is chosen, can trap the moisture that masonry must continuously release. The industry's most important technical instruction follows from that physics: coatings for exterior masonry must be breathable, permeable to water vapor, so the wall can dry outward while the paint sheds liquid rain. The wrong choice, a tight, non-breathing film over a wall that takes on moisture, converts vapor drive into peeling, and the masonry literature's photos of failed painted brick are photographs of trapped moisture, not of bad paint alone.

## Where the industry draws its lines

The Brick Industry Association is candid about which walls should not be painted, and its cautions read as a checklist of respect. Glazed brick, whose face was engineered not to accept coatings, should not be painted, and the association's FAQ says so directly. New brickwork should wait, both for the moisture and alkalinity reasons above and because early efflorescence will simply bloom through the fresh color. Walls with active water problems, failing mortar, blocked weeps, grade issues, should have the water solved first, because paint over a wet wall is a cosmetic verdict on an unsolved diagnosis. And painted brick, once painted, is a maintained surface thereafter, with removal of paint from masonry listed among the more regrettable restoration projects in the literature. None of these cautions is a prohibition; together they are the industry's way of saying that the decision deserves its technical notes read beforehand rather than its failures photographed afterward.

## The standards and literature that govern

The assembly's literature is compact. Technical Note 6, Painting Brick Masonry, is the governing document for paint applications to brick, interior and exterior, and its 2025 revision addresses the broader family of appearance-changing treatments. Technical Note 46 covers the maintenance of brick masonry, including the inspection programs that painted walls demand. The association's cleaning guidance governs the surface preparation stage, and the safety law governs the dust: abrading masonry generates respirable crystalline silica under OSHA's construction provisions, which applies to the small repaint and the large restoration alike. Above the literature sits the project's own water management review, because a painted wall cannot be evaluated apart from the drainage details that keep it dry.

## Moisture, the invisible co-author

Every serious article about painted masonry returns to water, so the overview should state the physics plainly. Brick and concrete masonry absorb rain, wick ground moisture, and store water during wet seasons; they dry outward as vapor when the weather turns. A breathable coating keeps that cycle intact, shedding liquid water while passing vapor, and the wall stays dry. A non-breathing coating, or a coating applied over a wall whose drainage details are failing, interrupts the cycle, and the trapped moisture works on the adhesion, on the mortar, and eventually on the units themselves, surfacing as peeling, spalling faces in freeze climates, and efflorescence pushing through the color. The professional conclusion is written into every technical note the association publishes: solve the water, respect the vapor, and the paint lasts; fight the physics, and the paint merely documents the losing side.

## The repaint economy

Painted masonry lives on a repaint rhythm measured in years, set by exposure, color, and coating quality, and the rhythm is the real cost of the color. The maintenance article in this series treats the rhythm in detail, but the overview owes the reader the economics up front: painted exterior masonry is a low-cost finish with a medium-cost future, and the owner who chooses it is choosing, quite reasonably, a maintained surface over an uncoated one. The American landscape is full of painted brick storefronts, row houses, and campus walls that look magnificent because their owners kept the rhythm, and full of peeling ghosts whose owners discovered the rhythm's existence too late.

## What this overview decides, and what it does not

This article provides the map: the chain, the physics, the cautions, and the literature. It decides nothing for a specific wall. Whether a given wall is a candidate, which coating family suits its exposure, which primer bonds its substrate, and what its repaint cycle will cost are determinations made from the wall's own condition and the current product literature, and the articles that follow take them in order: materials and their honest selection, the field sequence from cleaning to topcoat, the quality program, and the maintenance that honors the commitment a painted wall makes.

## A short history of painted masonry in America

Painted brick is not a new fashion; it is an American tradition with a couple of centuries of examples, from the painted storefronts of small towns to the color-washed row houses of older cities, and the tradition teaches the same lesson the technical notes now codify: painted walls that lasted were painted well and maintained attentively, and painted walls that failed were failed by water, not by color. The modern revival of painted exteriors in residential and commercial work has been met by the industry with useful honesty: the Brick Industry Association neither condemns nor promotes the practice, it documents it, which is the posture a hundred years of both successes and failures has earned.

## The regional accents of the finish

The same assembly wears different risks across the map. In the freeze-thaw North, the coating's breathability and the wall's drainage decide whether a wet wall survives winter or spalls its faces through the color. In the hot-humid Southeast, mildew and chalk set the maintenance calendar and the wash schedule. In the coastal and deicing-salt corridors, the film protects the units from salt at the price of extra vigilance at splash zones. In the arid Southwest, sun and ultraviolet set the fade and chalk cycle and the repaint's clock. The chain is the same everywhere; the calendar and the weak points are local, and the professional reader of a painted wall reads its region in its defects.

## What the remaining articles cover

The articles that follow take the assembly in execution order: the materials aisle and its breathability filter, the field sequence from diagnosis to topcoat, the quality program that reads the film's defects as testimony, and the maintenance rhythm that keeps the color honest for decades. Together they form one argument: painted exterior masonry is a fine finish for a dry, drained, honestly prepared wall, and a regrettable one for a wall whose water story has not been told.

## Reading a wall before the aisle, the reader's own checklist

The overview owes the reader a portable checklist, the one a careful observer can carry to any candidate wall. Is the masonry bare or coated, and if coated, what is the film's condition? Are the joints full and tooled, or receding and worn? Are the weeps open at the base, and the flashing's exits dry? Is the grade carried away from the wall, the gutters honest, the plantings respectful? Are there stains, blooms, or spalled faces, each a datum about water? And what does the exposure promise, the sun, the wind, the salt, the frost? The wall that passes this reading is a candidate for the chain this series documents, and the wall that fails it needs its water told first, whatever color was planned for it.

## One honest caution to close

Because painted masonry is unusually dependent on the wall beneath it, the reader should treat every product claim, every breathability promise, every twenty-year assurance, as a statement about a specific wall in a specific condition rather than a general truth. The industry's literature, the technical notes cited throughout this series, is the steady ground: it speaks of drainage, of vapor, of cured substrates and tested adhesion, and it has been revised for decades by people who have seen both the successes and the failures. Read the wall first, the literature second, and the label last; the order is the overview's whole teaching.

## The chain's place in the American exterior palette

A closing orientation sets this finish among its neighbors. Unpainted masonry is the low-maintenance option this assembly replaces; painted masonry trades some of that indolence for color, protection of weathering units, and a renewable look. The coating families in this series all belong to the breathable tradition the technical notes require, and the assembly as a whole is neither the cheapest nor the most expensive exterior finish in the American catalog, but the one whose success is most legible: the wall either kept its water story boring or it did not. That legibility is a feature. It means the finish tells its steward, honestly and early, when it needs its rhythm honored, and a finish that talks is a finish that lasts.

## References
1. Brick Industry Association, Technical Note 6, *Painting Brick Masonry*.
2. Brick Industry Association, Technical Note 6 (2025 revision), *Changing the Appearance of Brick Masonry*.
3. Brick Industry Association, *The Do's and Don'ts of Painting Brick*.
4. Brick Industry Association, Technical Note 46, *Maintenance of Brick Masonry*.
5. Brick Industry Association, *Technical Notes index*.
6. Occupational Safety and Health Administration, 29 CFR 1926.1153, *Respirable Crystalline Silica*.$wallarticle1$, 'overview', 10),
  ('us-exterior-masonry-paint-materials', 'Selecting Materials for Exterior Masonry Paint', 'A US-focused guide to the cleaners, primers, coatings, sealants, and accessories of the exterior masonry paint chain, chosen for breathability, substrate condition, and honest exposure.', $wallarticle2$# Selecting Materials for Exterior Masonry Paint in the United States

The materials list for this assembly is short, which makes each choice weigh more. One cleaner, one primer family, one coating system, and a handful of accessories decide whether a painted masonry wall is a decade of handsome service or a photographed failure in the industry's files. This article walks the selections in chain order, with the breathability principle carrying through every aisle.

## Start with the wall's condition, not the color fan

Materials selection for this assembly begins with diagnosis. Is the masonry new or old, painted before or bare, sound or eroding, dry or showing the stains of water trouble? Technical Note 6 and its 2025 revision frame the decision tree: new brickwork waits for the association's recommended period before coating, previously painted walls need their existing coatings evaluated for adhesion and compatibility, and walls with active moisture problems get their water solved before any coating budget is spent. The fan deck is the last stop, not the first, and the professional who arrives at the wall with questions before samples saves the client the cost of learning the answers from a failed coating.

## Coatings: the breathability filter applied first

Exterior acrylic coatings dominate American practice for this assembly, and the technical notes' guidance treats the breathable, water-shedding, vapor-permeable coating families as the candidates for exterior work. The selection filter is stated plainly: whatever the label promises, the coating must allow the wall's vapor to escape while shedding liquid rain, per the coating's published properties and the masonry literature's requirements. Within the filter, the choices trade cost and performance: standard exterior acrylics deliver color retention and flexibility at economy; premium lines add adhesion, chalk resistance, and longer repaint cycles; mineral-based and other traditional coatings occupy the historic restoration end of the aisle, chosen where reversibility and vapor handling outweigh uniformity. Elastomeric coatings exist for their own niche and their own warnings, and a tight film over a damp wall is a peeling schedule whatever its brand. The honest buyer reads the product data for permeability and adhesion to masonry rather than trusting the phrase made for brick on the can.

## Primers: the bond layer

The primer converts an absorbent, variable mineral surface into a uniform substrate for the topcoat system, and its selection follows the wall's condition. Bare, sound masonry wants a primer matched to masonry substrates per the manufacturer's system, alkali-tolerant for young mortar and units; previously painted walls want a bonding primer chosen after adhesion testing of the old coats; stained or repaired walls want the spot treatments their stains demand, because the stains of past moisture will photograph through any paint that ignores them. The primer belongs to the same family as the topcoat wherever the manufacturer offers a system, and its film thickness and coverage follow the product data rather than the painter's optimism. Skipping the primer to save a coat is the assembly's most economical self-sabotage: absorption varies across joints, units, and patches, and the unprimed wall takes color and sheen unevenly from the first day.

## Cleaners and the gentleness hierarchy

Surface preparation consumes the cleaning aisle, and the hierarchy runs from gentle upward: clean water and soft brushes first, then the masonry-appropriate detergents per their instructions, and only where the substrate and the technical notes' cleaning guidance permit it, the stronger chemical methods, each tested on an inconspicuous area before the wall is committed. High-pressure water is the classic self-inflicted wound, driving water and cleaner into the assembly the paint is supposed to protect, and the pressure that strips the grime also etches the face and loads the wall with moisture. Efflorescence is cleaned dry, by brushing, before coating, and it is a symptom to diagnose rather than a stain to remove. The cleaner selected sets the ceiling for everything above it in the chain, which is why the masonry literature treats cleaning as a technical decision rather than a chore.

## Mortar, sealants, and the repairs beneath the color

The paint will reveal, not repair, the wall beneath it, so the materials order includes the substrate repairs. Repointing mortar is selected for compatibility with the existing wall, generally matching the original's composition and strength rather than upgrading toward hardness, per the maintenance guidance of Technical Note 46 and the repointing literature it references. Sealants at joints, penetrations, and dissimilar materials are chosen for exterior adhesion and the movement they must accommodate, in chemistries compatible with the coating system and the masonry. Flashing repairs and weep clearing belong to the water management review, costed honestly as part of the paint project, because the coating applied over failing drainage is a coat of paint on a sinking ship.

## Applicators, access, and the consumables of craft

The tool list is modest: brushes sized for the texture's crevices, rollers matched to the roughness of the units, sprayers where the scale and overspray conditions justify them, and the protection, staging, and masking that keep the color on the wall. The masonry texture is a materials decision too: a smooth paint film on a textured wall is applied as a coating over texture, with the nap or spray pattern selected to fill and cover uniformly, and the consumption honest to that texture, which draws measurably more paint than a flat surface per unit area. The takeoff respects texture, absorption, and the two coats the exposure deserves, checked against published coverage, and the FRELUX estimator runs the masonry paint arithmetic for US assemblies so the budget reflects the wall's real appetite.

## Storage, weather, and the perishability of everything

The materials of this chain are perishable and weather-sensitive. Coatings freeze in the truck and thicken past their working window; primers and cleaners demand their label temperatures; and the wall itself has painting weather, the temperature and humidity windows the product data states, without which the film cures badly and fails early. Materials staged in conditioned space, used within their windows, and applied in the weather the manufacturer tested are the materials whose performance the manufacturer will stand behind. The chain's chemistry is honest; the site's habits decide whether the honesty is honored.

## The quiet rule of the aisle

One filter, applied everywhere: breathable, compatible, and matched to the diagnosed wall. The cleaner respects the face, the mortar respects the structure, the primer respects the absorption, the coating respects the vapor, and the schedule respects the weather. The painted masonry wall that lasts is a set of matched choices, and the aisle is where the matching is won or lost.

## Color and its physics

Color selection for exterior masonry is a technical decision as much as an aesthetic one. Dark colors absorb more solar heat, which stresses the film through greater thermal movement and faster binder aging, and the industry's practical guidance treats dark, saturated colors on sun-struck masonry as a premium choice demanding premium products. Bright reds and yellows chalk and fade more visibly than the earth tones, and the touch-up economics of a fading color are decided at the initial selection. Sample panels on the actual wall, viewed across a day's light and a season's weather, are the only honest preview, and the record of the chosen color's exact identity, brand, name, and batch, is the gift the project gives its future maintenance.

## The lead and safety notes the older wall demands

Older painted walls carry history the modern aisle does not advertise. Coatings applied before the modern era of paints may contain lead, and work on older housing in the United States triggers the federal lead-safe practices for disturbing painted surfaces; the masonry itself generates silica dust when abraded, under the construction safety provisions that apply to the smallest repaint. The professional materials order for an older wall includes the test kits, the containment, and the personal protection the regulations require, and the bid that omits them has not priced the wall honestly. Safety in this aisle is not a courtesy; it is law and craft in equal measure.

## The takeoff, textured and honest

The arithmetic of this aisle respects the wall's roughness. Coverage on textured masonry runs well above the flat-surface figures, and the takeoff prices the texture honestly: the published coverage for masonry surfaces, the coat count the exposure deserves, the primer's separate appetite, and the waste of staging and weather. Joint condition changes consumption too, since receding joints drink primer before they are repointed, and the professional order repoints first precisely because cured mortar takes less material than hungry mortar. FRELUX's wall-finishing estimator runs the masonry paint arithmetic for US assemblies with the relevant configurations and market prices, giving the takeoff a second calculation instead of a single guess, and the extra paint bought honestly is cheaper than the week lost waiting for the paint that the texture consumed ahead of schedule.

## Sheen and the masonry texture

Sheen selection for exterior masonry balances the film's performance against the texture's forgiveness. Flats and low-sheen finishes hide the wall's minor variation and touch up best, which is why they dominate exterior masonry practice; higher sheens accentuate every joint, patch, and lap under grazing sun, and they demand the highest standard of preparation to look like anything but a photograph of the wall's history. The washability exterior sheens are prized for matters less outdoors, where the rain and the garden hose do the washing. The professional default for this assembly is low sheen, high-quality, breathable, and the exceptions, the glossy statement walls, are chosen with open eyes about the preparation and the maintenance their reflection will demand.

## A final word on matching systems end to end

The aisle's last discipline is refusing to mix systems casually. The cleaner comes from the same published hierarchy the masonry literature endorses, the primer from the coating manufacturer's own system, the topcoat from the same family as the primer, the sealant from chemistries the coating tolerates, and the mortar from the compatibility rules the repointing literature sets. Where substitutions are forced by supply or budget, they are made between documented products, with the manufacturer's own transition guidance read first. The painted wall is chemistry over mineral, and chemistry that has never been introduced to itself is how sound materials produce failed walls.

## The accessories list, completed

The remaining line items complete the system: backer rod and primer for the sealant joints, in the sizes the joints' geometry actually demands; the masking films and tapes that protect glass, trim, and paving through the coat sequence; the drop sheets and staging protection that keep the site respectable; and the wash's own consumables, the soft brushes, the applicator pads, and the cleaning solutions in their label-sized quantities. None of these items carries the romance of the coating choice, and every one of them appears in the closeout photographs' difference between a professional job and a fast one. The accessories list is the aisle's memory of everything the chain ever learned the hard way.

## References
1. Brick Industry Association, Technical Note 6, *Painting Brick Masonry*.
2. Brick Industry Association, Technical Note 6 (2025 revision), *Changing the Appearance of Brick Masonry*.
3. Brick Industry Association, Technical Note 46, *Maintenance of Brick Masonry*.
4. Brick Industry Association, *Technical Notes index*.
5. Occupational Safety and Health Administration, 29 CFR 1926.1153, *Respirable Crystalline Silica*.$wallarticle2$, 'materials', 10),
  ('us-exterior-masonry-paint-installation', 'Painting Exterior Masonry in the United States: Field Sequence', 'A sequenced US field guide to painting exterior masonry: diagnosis, gentle cleaning, repair, adhesion testing, priming, topcoats, weather windows, and the protection of water management details.', $wallarticle3$# Painting Exterior Masonry in the United States: A Sequenced Field Guide

The field sequence for painting exterior masonry is a chain of verdicts about water and adhesion, punctuated by coats. The wall is diagnosed, cleaned, repaired, tested, primed, and coated, in that order, because each stage decides whether the next stage can succeed. This article walks the sequence as the trade performs it, with the technical notes' guidance and the product literature governing each step.

## Diagnose before anything touches the wall

The first professional act is reading. Is the masonry bare or previously painted? Are the joints sound or receding? Are the stains, efflorescence blooms, dark patches below weeps, damp courses near grade, symptoms of active water? Are the drainage details, flashings, weeps, copings, functioning or blocked? The Brick Industry Association's cautions are applied here, at the start: glazed brick is refused, new brickwork waits for the recommended period, water problems are solved before coatings are budgeted, and previously painted surfaces are tested rather than trusted. The diagnosis, written down, becomes the project's plan and the acceptance inspection's reference.

## Clean gently, test first, and respect the face

Cleaning removes the soil, the efflorescence, and the loose material that would separate the coating from the wall, and the method is selected by the gentleness hierarchy: test the proposed cleaner and method on an inconspicuous area, begin with water and soft brushes, and escalate only as the technical notes' cleaning guidance and the substrate permit. The wall is allowed to dry thoroughly after cleaning, both for adhesion and because the moisture the cleaning added must leave before coating begins. Efflorescence is brushed dry and investigated as a symptom; a bloom that returns after cleaning is the wall reporting water that the paint cannot fix. Dust control belongs to this stage as well: any abrading of masonry generates respirable crystalline silica, and the safety provisions apply from the first scraper to the last sanding pass.

## Repair the substrate, then let it cure

Repointing and repair precede paint for a reason the coating cannot overcome: the film follows the surface, and a receding joint under new paint is a shadow within the season. Mortar repairs are matched to the existing wall's composition and color, placed per the repointing craft, tooled to match the existing profile, and allowed to cure before coating, because fresh mortar's moisture and alkalinity attack coatings exactly as young masonry's do. Sealant joints at dissimilar materials, penetrations, and movement locations are renewed in compatible chemistries, and the drainage details, weeps, flashing terminations, drip edges, are cleared and verified open, because the paint project is also the drainage project's last inspection.

## Test adhesion where previous coatings exist

On previously painted masonry, the existing coatings are evaluated before they are trusted. The trade's practice is to test the bond of old paint to the substrate in representative areas, strip or scrape where the old film fails the test rather than recoating over a condemned layer, and match the new primer system to the surfaces that remain. Chalking, alligatoring, and the other aging patterns of old films are read as testimony: they report the wall's history, the previous products' quality, and the exposure the new coating will face. Painting over a failed film is the assembly's most avoidable failure, and the test costs minutes while the discovery after coating costs the whole wall.

## Prime, and prime honestly

The primer is applied to the clean, dry, repaired surface at the coverage the product data states, worked into the texture rather than skimmed over it, and allowed its full cure window. Bare masonry receives the masonry-appropriate primer of the coating system; patched and stained areas receive their spot treatments; previously painted surfaces receive the bonding primer the adhesion testing indicated. The primed wall is inspected before the topcoat: uniform matte sheen, no glossy patches of over-thin application, no bare mineral winking through, and the film's integrity protected from weather and from other trades. Skipping or thinning the primer is a savings the topcoats spend twice.

## Topcoat in the weather the label tested

The acrylic topcoats go on in the conditions the product data specifies: the temperature and humidity windows, the surface temperature out of direct sun where the film needs it, the wind that carries overspray, and the dew that must be off the wall and stay off through the cure. The texture is filled and covered with the applicator the wall's roughness deserves, worked to a wet edge that avoids laps, and coated to the full count the exposure requires, generally the two coats exterior masonry earns. Cut-ins at trim, dissimilar materials, and transitions are made cleanly, and the drainage details are respected throughout: weeps stay open, and the film is cut to them rather than painted over, because a painted-shut weep is a drainage failure wearing a uniform color.

## Protect the work and the surroundings

The chain's final movements are custody: protection of glass, plantings, paving, and neighbors from drips and overspray; scaffold and staging that mar nothing they touch; and the daily weather watch that brings tarps before the rain the forecast promised. The finished wall is walked at closeout under daylight and at arm's length: color uniform, coverage complete, drips absent, weeps open, and the drainage details intact. The record, the diagnosis, the test areas, the products and batches, the coats and their weather, is filed with the building's documents, because painted masonry is a maintained surface whose maintenance begins with knowing what was applied and when.

## The habit beneath the sequence

Each stage of this sequence exists because skipping it fails the coating in a documented, photographed, industry-published way. The crews that build painted masonry walls successfully share one habit: they let the wall's own condition set the pace, and they coat the wall the wall actually is, not the wall the schedule wishes it were.

## Weather windows, respected as structure

The chain's chemistry cures only within its weather, and the field schedule treats the product data's windows as structure rather than suggestion. Ambient and surface temperatures must sit inside the label's range, and masonry holds yesterday's temperature long after the afternoon warms, so the wall is read with a surface thermometer, not with the forecast's optimism. Rain must be absent through the film's cure window, dew must be off the wall before coating begins, and the wind that dries too fast or carries overspray too far postpones the sprayer if not the day. The crew that plans around the weather pays in schedule; the crew that paints against it pays in adhesion.

## The staging and the street

Exterior work lives in public, and the sequence includes the logistics of the street: scaffolding and lifts staged without marring the finished planes, protection for glass, plantings, paving, and vehicles, containment for drips and overspray, and the traffic and neighbor courtesies the municipality expects. The professional staging plan is also a quality plan, because the applicator who can reach every face at the right angle paints a wall without the skips and banding that rushed access produces.

## The joints, the transitions, and the color's edges

The chain's details live where the film meets the world. Joints are coated to fill and cover without bridging the movement that mortar joints accommodate, and the film follows the joint's profile rather than pooling in it. Transitions to dissimilar materials, trim, windows, roofs, get their sealant joints renewed in compatible chemistry and their paint cut in cleanly rather than smeared across the boundary. Weeps and drainage exits are masked or cut to, never bridged, because the color that closes a weep has closed a drainage system. Drip edges keep their function, copings shed as designed, and the base of the wall meets grade in the clearance the details call for. The applicator who honors the edges delivers a wall whose water story stays as the designers wrote it, under a new color.

## The two-coat truth and the cure between

The topcoat sequence deserves its own paragraph because it is where schedules fail. The first coat builds the film's thickness and the second builds its uniformity, and between them the label's recoat window governs: recoat too soon and the solvents trap, recoat too late and the adhesion between coats weakens. The two coats are applied in the same weather family, ideally the same day, with the wet-edge discipline that keeps laps invisible, and the film's full cure, days rather than hours, is respected before the wall is asked to shed weather. The chain's patience is concentrated here, and the wall repays it by curing into the continuity its published performance promised.

## Closing the sequence where it started

The sequence ends where it began, with reading. The completed wall is read one final time in the honest light of the closeout walk: the film verified, the edges verified, the weeps verified, and the record filed. Then the sequence's most valuable habit is named for what it is: the wall that was diagnosed before it was touched, and read again after every change to it, is the wall whose paint behaves as its label promised, and the crews that keep that habit are the reason the technical notes' photographs of failures keep belonging to other people's projects.

## The cure, the patience, and the handover

The film's final stage is the cure, days of honest weather during which the coating reaches the properties its data sheet promised, and the site's discipline protects the wall from the trades, the touch, and the weather that would test it too early. The handover to the owner includes the film's care instructions in plain language: the wash schedule, the first touch-up kit, the colors and batches recorded, and the year's first walk on the calendar. The chain that ends with a handover like that has ended by beginning the wall's maintenance biography on the right page, and the owner who receives it has been handed not just a color but a system.

## Coordinating with the building's other work

The chain rarely owns the wall alone. The painter's sequence negotiates with the mason's repairs, the sealant contractor's joints, the window and roof trades whose flashings share the wall's water story, and the landscape crew whose grade and plantings decide the base's splash exposure. The professional sequence publishes these interfaces before the first coat: who repairs what, whose cure window delays whom, and where the film will be cut to the work of others. The wall painted without this coordination is the wall whose closeout photographs show the trades' corrections painted over, and the wall painted with it delivers its color with the drainage still telling its one story.

## References
1. Brick Industry Association, Technical Note 6, *Painting Brick Masonry*.
2. Brick Industry Association, Technical Note 6 (2025 revision), *Changing the Appearance of Brick Masonry*.
3. Brick Industry Association, *The Do's and Don'ts of Painting Brick*.
4. Brick Industry Association, Technical Note 46, *Maintenance of Brick Masonry*.
5. Occupational Safety and Health Administration, 29 CFR 1926.1153, *Respirable Crystalline Silica*.$wallarticle3$, 'installation', 10),
  ('us-exterior-masonry-paint-quality-checks', 'Quality Checks and Common Defects in Painted Exterior Masonry', 'A practical US quality-control guide for painted masonry: adhesion and coverage acceptance, daylight inspection, the recurring defects from peeling to efflorescence, and corrections that address the water behind the film.', $wallarticle4$# Quality Checks and Common Defects in Painted Exterior Masonry

Quality control for painted exterior masonry is moisture detective work wearing a paint inspector's coat. The film's defects, the peeling, the bloom, the stain, are almost never failures of the visible product alone; they are the wall's water story surfacing through the color, and the inspection program that understands this reads painted masonry the way a physician reads a chart. This article describes the acceptance discipline and then catalogs the recurring defects with their causes and honest corrections.

## Accept against the wall's own lighting and its product data

The acceptance inspection is conducted under daylight, at the distances a street and a sidewalk actually view the wall from, and it verifies three things: coverage, uniformity, and adhesion. Coverage means the full coat count applied at the published coverage, with the texture filled and no mineral showing; uniformity means color and sheen consistent across the planes, at the joints, and at the repairs, with laps and banding absent; adhesion means the film passes its tape and pull tests at the sampled locations and shows no lifting where the old coatings met the new. The product data and the technical notes are the arbiter, and the photographs taken at closeout, under the same daylight, are the record that settles every later comparison.

## Inspect the substrate stages, because the film forgives nothing

The film publishes the substrate's history, so the professional program gates the substrate stages before the paint hides them. Cleaning verified, efflorescence resolved rather than painted over; repairs verified, joints sound and cured, sealants placed; adhesion testing verified on previously coated areas; priming verified, uniform and cured; and the water management details verified, weeps open, flashings intact, grade and plantings held back from the wall's base. Each gate is dated and photographed, because the stages the paint will bury are the stages no later inspection can reconstruct.

## The recurring defects, from cause to correction

The defect catalog for this assembly is stable and instructive. Peeling and blistering: moisture behind the film, from trapped construction water, ground splash, drainage failure, or a non-breathing coating over a wet wall; the correction begins with the water, then with the removal of the failed film and the recoating in a breathable system, and paint alone, applied again, is simply the failure scheduled to repeat. Efflorescence through the color: salts carried by moisture and deposited beneath or through the film; the correction is the moisture path, found and closed, before the cosmetics. Chalking and color fade: the exposure's normal aging, corrected by the repaint cycle the coating's quality set; premature chalking reports a low-quality film or an application outside its weather window. Alligatoring and cracking of old films: the aging of previous coatings, corrected by removal of the failed layer, not by recoating over it. Adhesion failure at patches: incompatible or uncured substrate materials under the primer, corrected by stripping to sound material and priming the repairs honestly. Uniform banding at lift and staging lines: application rhythm and coverage inconsistency, corrected by full-plane recoats. Staining below weeps and sills: drainage working as designed, and acceptable at the exits, or drainage failing, and corrected in the water system, and the inspector's job is knowing the difference.

## The moisture boundary, bright and absolute

Some findings end the coating conversation and begin the building conversation: paint lifting over broad areas, stains that spread season by season, mortar softening behind sound-looking film, units spalling in freeze climates, interior dampness tracking the exterior's defects. These findings describe water moving through the wall faster than the assembly can release it, and the honest response is diagnosis: the drainage review, the plumbing and grade investigation, and in stubborn cases the professional evaluation with instrumentation. The coating is a finish; it can only decorate a wall that has been made dry, and the inspection program's highest duty is refusing to let paint stand in for that repair.

## Records that outlast the repaints

The quality program's output is a short file: the diagnosis, the substrate gates' photographs, the products and batches, the weather at application, and the closeout photographs under daylight. Stored with the building's documents, the file converts the next repaint's questions, what is on this wall, why did this film fail here, which color and system matched, from speculation into reading, and the next crew begins where this one ended rather than where this one began.

## The compressed philosophy

Judge the film in daylight, gate the stages the film will hide, read every defect as the wall's water or the film's chemistry testifying, and write down what was found and fixed. Painted exterior masonry is a system whose failures are documents, whose successes are silence, and whose maintenance costs are decided almost entirely by how early its water stories are read.

## A closing method for any reader

The reader who wants one test to carry away can borrow the trade's: the close read, at arm's length, in daylight, along the wall's whole face. Coverage that fills the texture, color that does not band at the planes and joints, joints whose shadow the film follows rather than hides, weeps open, stains absent, and the drainage's exits dry. Five minutes per elevation, once at closeout and once each year, is the entire inspection budget this assembly asks, and it finds, at the cheapest moment, every defect this article has cataloged.

## A stage-gate protocol for the paint project

The gate discipline translates to this assembly cleanly, and a one-page version serves any project. Gate one, diagnosis: the wall's condition, coating history, water management review, and the go or no-go the technical notes' cautions demand, all recorded. Gate two, substrate: cleaning verified by the test area's results, repairs cured, adhesion tests passed on existing films, with photographs. Gate three, primer: uniform, cured, its coverage honestly consumed. Gate four, topcoat: the full count applied, coverage verified, laps absent, edges and weeps respected, and the closeout photographs taken under daylight. Each gate is a page, dated and initialed, and the file of four pages is the wall's warranty in the only sense warranties are ever real: a record of what was done, in order, to a substrate that deserved it.

## Reading texture, laps, and the light that finds them

Painted masonry is judged at arm's length and from the street, and both distances tell the truth. The arm's-length read verifies coverage in the texture's crevices, the film's fill, and the joints' honest shadow; the street's read verifies the color's uniformity across planes, storeys, and the day's changing light. Laps and banding live between the two, visible at one distance and absent at another, which is why acceptance is walked at both. The grazing sun of late afternoon is the strictest inspector this assembly has, and the professional program schedules its final walk for the worst light the wall will ever face, because that is the light the owner will face it in too.

## What records buy in this trade, concretely

Concretely, the file buys four things. It buys the next repaint its honest starting point, the product, color, and batch this wall wore. It buys the failure its diagnosis, the photograph that shows where the film lifted and what the substrate looked like beneath. It buys the warranty claim its evidence, which is why manufacturers ask for batch numbers and application conditions. And it buys the sale, when the building changes hands, the documented maintenance that turns a painted wall from a question mark into a line item of known cost. Four purchases, one folder, and the folder is the cheapest material in this entire assembly.

## Classifying findings, three honest answers

Every finding resolves into one of three classes, and classification is the judgment. Cosmetic and stable, a whisper of texture variation, a stain at a weep's exit that washes off: accept, note, and move. Reparable, a lifting patch over a repair, a band at a lift line, a chip at a sill: correct per the cause-first discipline this article has cataloged, verify, and note. Systemic, peeling across a plane, efflorescence through the color on repeating courses, water findings at the interior: stop, escalate to the water review, and treat the coating as the symptom it is. The program that classifies quickly spends its energy on causes; the program that treats every defect as a paint problem keeps repainting the testimony of a wall that is still asking to be heard.

## The five-minute close read, once more, with feeling

Because it is the article's gift, the method deserves its final restatement as protocol: walk the elevation at arm's length in full daylight, then again from across the street; read the texture for coverage, the joints for shadow, the planes for banding, the edges for cleanliness; check the weeps with a fingertip's care; photograph every elevation in the light of record; and write down what the walk found, the day it found it, and what was done about it. The wall that gets this five minutes at closeout and every year after is the wall that never needs the scaffold that neglect eventually bills.

## The inspector's tools, and the humility of using them

The program's instruments are deliberately few: the daylight the wall will live in, the raking lamp for the arm's-length read, the tape and pull kit for adhesion sampling, the surface thermometer for the application record, and the camera for everything. To these the mature inspector adds the tool the trade respects most, the dated question asked of the substrate before the film hid it, because the record of what the wall was is the only instrument that can interpret what the film becomes. Instruments find the defect; the record explains it; and the two together are the difference between a punch list and a diagnosis.

## Two boundaries the program must hold explicitly

The quality program for this assembly holds two boundaries without negotiation, and stating them plainly is worth the space. The first is the water boundary: no coating stage proceeds over a wall with unresolved water findings, whatever the schedule pressure, because the film's failure over a wet wall is a documented certainty rather than a risk. The second is the adhesion boundary: no topcoat proceeds over a film that failed its testing, whatever the appearance, because the new coating's warranty extends only to the soundness of the layer beneath it. Programs drift at these boundaries under schedule pressure, which is why they are written into the protocol as gates rather than judgments, and the crew that holds them is the crew whose closeout photographs end up in the marketing deck instead of the industry's failure files.

## What the acceptance certificate actually certifies

The closeout record of a painted masonry wall, honestly written, certifies a chain of custody: the substrate that was diagnosed and prepared, the tests that were passed, the products that were applied, the weather that was honored, the edges that were respected, and the findings that were corrected. That is what an owner actually buys in a professional paint project, and the wall's future performance is the certificate's slow proof. The program described in this article produces that document page by page, gate by gate, and the buildings that keep those pages are the buildings whose painted walls keep their color's promises.

## References
1. Brick Industry Association, Technical Note 6, *Painting Brick Masonry*.
2. Brick Industry Association, Technical Note 46, *Maintenance of Brick Masonry*.
3. Brick Industry Association, *Technical Notes index*.$wallarticle4$, 'quality', 10),
  ('us-exterior-masonry-paint-maintenance-repair', 'Maintaining Painted Exterior Masonry in the United States', 'US-focused guidance for the long care of painted exterior masonry: washing and repaint rhythms, mildew and efflorescence response, touch-up limits, moisture vigilance, and the records that keep the color alive.', $wallarticle5$# Maintaining Painted Exterior Masonry in the United States

Painted exterior masonry is a maintained surface by definition, and its maintenance is a rhythm rather than a project. The wall needs periodic washing, repaints on a cycle the coating and exposure set together, touch-ups that respect the color's aging, and above all a standing vigilance about water, because every serious failure of painted masonry is a moisture story that maintenance read too late. This article covers the rhythm, the techniques, and the boundaries of the do-it-yourself conversation.

## The rhythm the surface sets

The maintenance year for a painted masonry wall is short. Annually, walk the wall under good daylight: read the color's fade, the film's chalk, the stains below sills and weeps, and the joints' condition beneath the color. Seasonally, wash the wall gently, per the coating manufacturer's guidance and the masonry literature's gentleness hierarchy, to remove the soil and biological growth that shorten the film's life. On the cycle the exposure and coating quality set together, repaint, with the full preparation discipline this assembly demands, because painted masonry renews only on its own chain. The rhythm's cost is modest and predictable; its absence is neither.

## Washing, the gentlest effective method, always

Routine washing extends the repaint cycle and keeps the color honest. The method is the trade's hierarchy: clean water and soft brushes first, the appropriate detergent solutions per their instructions second, and the gentler end of the masonry cleaning spectrum respected throughout, with the method tested before the wall is committed. Mildew and algae are cleaned with the products and precautions their growth requires, and the reason for their presence, shaded, damp, sheltered faces, is read as maintenance information: a wall that grows organisms predictably may need the airflow or the drainage the growth is reporting. High-pressure washing remains the classic self-inflicted wound, driving water and cleaner into the assembly the film protects, and the pressure that cleans the stain loads the wall with the next stain's raw material.

## Efflorescence and stains, read before removed

White blooms and gray stains on painted masonry are the wall's testimony, and the maintenance discipline is diagnostic before cosmetic. Efflorescence beneath or through the film reports moisture moving and salts depositing, and it is removed dry, gently, and investigated: a bloom after a wet season on a sound wall is weather talking, while a bloom that returns on the same courses is drainage talking, and the difference decides whether the next act is a brush or a plumber. Rust-like and dark stains have their own causes, tie corrosion, sealant failure, splashback, and each is traced to its source before the stain blocker and the touch-up make it invisible, because invisible is not the same as solved.

## Repaints, done as the chain demands

The repaint of a painted masonry wall is the original chain in compressed form: diagnose, clean, repair, test the existing film, prime, and coat, with the weather windows and the coverage the product data states. The temptation, and the classic false economy, is to skip the diagnosis and the test and paint the wall that looked fine last year, but the film between the new color and the old water story is only as good as the substrate it bonds to, and the repaint that ignores peeling's cause simply repaints the peeling. The repaint cycle is also the natural moment for the wall's deeper review: joints, sealants, weeps, flashing, grade, and plantings, inspected and corrected while the scaffolding is up and the budget is open, which is the cheapest calendar those repairs will ever have.

## Touch-ups and their honest limits

Between repaints, small damage, chips at corners, scratches from landscaping, scuffs at entries, is touched up with the recorded product and color, and the limits of touch-up are respected honestly. Fresh paint against a weathered field of the same nominal color reads as a patch under many lighting conditions, and the more dramatic the sheen and color, the louder the patch announces itself; flats and matte finishes forgive best, and the wall's lighting, grazing sun, deep shadow, decides what the eye forgives. The professional habit is to touch small damage early, before water enters the chip, and to repaint full planes when the patches outnumber the paint, because a wall defended at its chips never needs rescue at its film.

## The water vigilance that decides everything

Painted masonry maintenance is, at its core, the stewardship of the wall's water. The film is a finish, breathable by design and protective by chemistry, but it is not a waterproofing, and the walls that fail are the walls whose water problems were painted instead of solved. The vigilance list is short and durable: keep gutters, downspouts, and grade honest so the wall's water load stays at its design assumptions; keep weeps open and unpainted; keep plantings, soil, and mulch back from the wall's base; read every stain as a question about its source; and investigate any interior dampness that tracks an exterior wall before touching the exterior's cosmetics. The steward who keeps this list keeps the wall.

## When the professionals take over

Certain findings end the do-it-yourself conversation: peeling over broad areas, blooms that return after cleaning and diagnosis, mortar that recedes behind apparently sound film, units that spall or crumble, stains that spread despite dry weather, and any suspicion that the water moving through the wall is structural in its consequences. These findings hire the masonry and coating professionals, and the questions the owner asks determine the quality of the answer: what is the moisture source, what does the drainage review find, which film is on the wall and how will the new system bond to or replace it, and what will be documented. The professionals answer in the vocabulary of the technical notes this article cites, and that vocabulary is the owner's best protection.

## The record completes the system

The last tool is the file: the paint's brand, color, and batches; the dates of washing, touch-ups, and repaints; the photographs taken at each walk; the findings and their resolutions. Painted masonry is a surface that renews on a schedule, and the schedule exists only in the record; the wall whose owner knows its history repaints efficiently and diagnoses quickly, while the wall whose history is lost pays for its archaeology at every repaint. The file costs a folder; the archaeology costs a scaffold.

## The economics, stated once plainly

The money in painted masonry maintenance is spent in three places, and their proportions matter. The washing and the vigilance cost almost nothing and buy the film's full life. The repaints, on the honest cycle, cost predictably and renew the wall. The failures, the broad peeling and the wet wall behind a sound-looking film, cost multiples of both, and they are almost never caused by weather; they are caused by skipped diagnosis. The steward who internalizes the proportions spends the nothing and the predictable, and never meets the third category except as a story about someone else's wall.

## A calendar the steward can keep

The rhythm deserves its own calendar, because rhythms kept are walls saved. Spring: the annual walk, the winter's stains read, the drainage exits checked after the thaw. Early summer: the wash, done in weather that dries it, and the touch-ups while the wall is clean. The repaint year, whenever the exposure sets it: the full chain, scaffolded and diagnosed, with the deeper repairs made while access is cheap. Autumn: the drainage audit, gutters, grade, plantings, cutbacks before the wet season loads the wall. Four short visits and one project per cycle, and the painted wall's biography stays boring, which in maintenance is the highest praise a surface can earn.

## Living with color that ages

Every exterior color ages, and the steward's peace comes from knowing how. South and west faces fade first, the sun working on the binder and the pigment; chalk softens the color's saturation years before the film fails; and the garden's irrigation and the mower's dust add their patina at the base. None of this is failure; it is the coating's service life being lived, and the maintenance response is proportional: the wash that renews the look, the touch-ups that defend the chips, and the repaint, on the honest cycle, that renews the whole. The wall that fights its aging with constant spot-work becomes a patchwork; the wall that accepts its aging and repaints on rhythm stays a color.

## The last word on paint and water

The series ends where the overview began, because the point deserves the final word: paint is a finish, and water is the wall's real occupant. Every technique in these five articles, the gentle cleaning, the cured repairs, the tested adhesion, the breathable films, the open weeps, the honest records, exists to keep the water story boring. The painted masonry wall that stays handsome is the wall whose steward read its water early, and the reader who keeps only one habit from this series should keep that one.

## The steward's last habits, collected

Collect the habits in one place for the reader who has followed the series: walk the wall annually under daylight; wash it gently on rhythm; touch small damage early and honestly; read every stain and bloom as a question about water; keep weeps open and paint away from them; keep the file of colors, dates, and findings; and escalate the systemic findings to the professionals who speak the technical notes' vocabulary. None of these habits is difficult, all of them are cheap, and together they are the whole of painted masonry stewardship, which is the rare kind of maintenance program that can be stated in a single breath and kept for a single building's lifetime.

## When the wall changes hands

Painted masonry is often inherited, and the steward's file becomes the successor's inheritance. The seller who can hand over the colors, the dates, and the wall's water history transfers a maintained surface with a known future; the seller who hands over a mystery transfers a scaffold on layaway. The buyer's own closing walk is this article's close read, conducted once before purchase: five minutes of daylight reading that either confirms a wall whose rhythm was kept or discovers, in the stains and the peeling, a rhythm that was not. Buildings tell the truth to people who read them, and painted masonry, of all the exterior finishes, talks the most.

## A last word on the rhythm's cost, in the steward's own terms

Count the rhythm's true cost once, in the terms the owner will actually pay: an annual walk, an hour; a wash on rhythm, a day per cycle; touch-ups, an afternoon per year; a repaint on the honest cycle, a project with scaffolding; the file, a folder and a habit. Against that, price the alternative that the rhythm prevents, the broad failure, the wet wall, the restoration scaffold, the interior damage claim, and the arithmetic is not close. Painted masonry's maintenance is the cheapest insurance in the exterior finish catalog, and the premium is due four short days a year.

## References
1. Brick Industry Association, Technical Note 46, *Maintenance of Brick Masonry*.
2. Brick Industry Association, Technical Note 6, *Painting Brick Masonry*.
3. Brick Industry Association, Technical Note 6 (2025 revision), *Changing the Appearance of Brick Masonry*.
4. Brick Industry Association, *Technical Notes index*.$wallarticle5$, 'maintenance', 10)

) AS a(slug,title,excerpt,content,theme,read_time_minutes)
JOIN public.learn_wall_finishing_topics t ON t.market_code='US' AND t.candidate_key='assembly:us-exterior-masonry-paint'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
WHERE NOT EXISTS (SELECT 1 FROM public.learn_articles existing WHERE existing.slug=a.slug)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='US' AND t.market_code='US'
  AND t.candidate_key='assembly:us-exterior-masonry-paint'
  AND a.wall_topic_id=t.id AND a.wall_market_code='US' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en'
  AND a.slug IN ('us-exterior-masonry-paint-overview', 'us-exterior-masonry-paint-materials', 'us-exterior-masonry-paint-installation', 'us-exterior-masonry-paint-quality-checks', 'us-exterior-masonry-paint-maintenance-repair');

COMMIT;
