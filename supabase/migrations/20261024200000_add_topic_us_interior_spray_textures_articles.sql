-- Sixth and final researched-candidate topic for US: interior spray textures.
-- The topic is registered as verification_status='candidate' (schema gate: only an
-- authenticated admin can promote it to 'verified' via the admin console).
-- Articles remain drafts; publication/review gates are not bypassed.
-- Apply 20261024000000_global_wall_finishing_knowledge_library.sql first.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='US' AND candidate_key='assembly:us-interior-spray-textures') THEN
  INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type,verification_status)
  VALUES ('US','assembly:us-interior-spray-textures','Interior spray textures','finish_assembly','candidate');
END IF; END $$;

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,mp.default_language
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON true
JOIN public.market_profiles mp ON mp.country_code=t.market_code
WHERE t.market_code='US' AND t.candidate_key='assembly:us-interior-spray-textures'
ON CONFLICT(topic_id,theme_key,language_code) DO NOTHING;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Homax, *Homax Products: Wall Repair and Texture Solutions*', 'https://www.pittsburghpaints.com/homax/products', 'Homax', 'Citation for the aerosol wall and ceiling texture product line, including orange peel, knockdown, and patching products.'),
  ('Homax, *Pro Grade Knockdown Wall Texture, Water Based, 25 oz*', 'https://hdsupplysolutions.com/p/homax-25-oz-pro-grade-knockdown-wall-texture-water-based-p531412', 'Homax', 'Citation for adjustable aerosol texture products: adjustable pattern and pressure, tinted pre-primed formula, coverage, and dry times.'),
  ('USG, *SHEETROCK Brand Wall and Ceiling Spray Texture*', 'https://www.usg.com/content/dam/USG/pdpmovesds/usg-sheetrock-brand-wall-and-ceiling-spray-texture-unaggregated-sds-en-48000020006.pdf', 'USG', 'Citation for USG spray texture product documentation for walls and ceilings.'),
  ('USG, *Sheetrock Brand Wall and Ceiling Texture, submittal datasheets*', 'https://www.buildsite.com/product/sheetrock-wall-and-ceiling-texture', 'USG', 'Citation for submittal-ready datasheets and specifications for USG wall and ceiling texture products.'),
  ('DAP, *2 In 1 Wall and Spray Texture*', 'https://dap.testrpminc.com/products-projects/our-brands/spray-texture/', 'DAP', 'Citation for all-in-one spray texture products applying orange peel, knockdown, or popcorn patterns with nozzle adjustment and paint-ready times.'),
  ('Gypsum Association, *Recommended Levels of Finish for Gypsum Panel Products, GA-214-2022, Quick Reference Guide*', 'https://gypsumpublications.com/product/recommended-levels-of-finish-for-gypsum-panel-products-quick-reference-guide-pdf-download-ga-214-2022-qrg/', 'Gypsum Association', 'Citation for the levels of finish that define surface preparation prior to decoration, including textured surfaces.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='US' AND t.candidate_key='assembly:us-interior-spray-textures'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'US','US',t.id,a.theme,'en','draft'
FROM (VALUES
  ('us-interior-spray-textures-overview', 'Interior Spray Textures in the United States: Overview', 'A US-focused overview of spray-applied interior textures: the pattern families from orange peel to knockdown, the hopper and aerosol equipment spectrum, and the primer and practice discipline that makes texture uniform.', $wallarticle1$# Interior Spray Textures in the United States: Overview

The American interior has a third finish tradition sitting beside the flat-painted wall and the veneer plaster monolith: the spray texture, the orange peel and knockdown and popcorn surfaces that half the country''s ceilings and a large share of its walls wear. Texture arrived as both economy and style, forgiving the imperfect substrate and playing with the light in ways the flat wall cannot, and it remains a living craft with its own products, its own equipment spectrum from the hopper gun to the aerosol can, and its own discipline, because the texture that looks easy is the most pattern-sensitive finish in the gypsum family. This overview introduces the tradition as its industry presents it, through the texture products of USG''s and Homax''s and DAP''s aisles and the levels-of-finish context that governs the substrate beneath, and it argues the series''s usual case: the texture succeeds as a system, substrate, primer, pattern, and practice, and fails as an improvisation.

## The pattern families, named

The spray texture vocabulary is small and worth knowing by name. Orange peel, the fine splatter that reads like its fruit, is the lightest family, sprayed and left, its density adjustable from fine to heavy on the aerosol products that dominate the touch-up market. Splatter knockdown, the Southwest style that has become a national favorite, sprays the heavier splatter and then flattens its peaks with a wide knife after a partial set, producing the mottled, dragged plane that hides the most and shows the least of the substrate beneath. Popcorn, the aggregated ceiling texture of the mid-century, rounds out the family, and the ceiling story carries its own maintenance chapter, the acoustic era''s product that the modern renovator either loves or removes. The families share one physics: the pattern is born at the nozzle, shaped by the mix''s consistency, the gun''s pressure, and the wrist''s rhythm, and the reader who understands that the pattern is a spray event, not a paint event, understands the whole craft.

## Why texture exists, the honest reasons

The spray texture earns its place for reasons the flat traditions concede. It forgives: the textured plane tolerates the substrate''s minor sins that the gloss and the raking light would publish daily. It plays with light: the patterned surface scatters the illumination that the flat wall reflects, and the room reads softer, the corners read gentler, and the ceiling reads higher in the texture''s diffraction. It wears: the patterned wall takes the household''s touch and the years'' accumulation without the flat wall''s honest ledger, and the repaints are fewer and the cleaning is kinder to the surfaces'' history. And it sells regionally: the American Southwest''s adobe tradition raised the knockdown, and the national homebuilder industry found in the texture a finish that scaled, and the reasons compound into a tradition the renovator inherits rather than chooses.

## The equipment spectrum, from hopper to aerosol

The texture trade''s equipment runs a wide spectrum, and the overview maps it honestly. At the production end, the hopper gun and its compressor, the powder textures mixed to the consistency the pattern demands and sprayed in the overlapping passes the technique requires, and the serious production end runs spray machines for the apartment and tract volumes. At the repair end, the aerosol can, the pre-mixed, water-based products of Homax''s and DAP''s aisles, their adjustable nozzles selecting between fine and heavy orange peel, their knockdown products delivering the Southwest pattern in a hand-held format, and their stated missions are the invisible repair, the touch-up that matches the field without the compressor''s mobilization. The spectrum''s two ends share the physics of the pattern and differ in scale, and the reader''s project chooses its end by the area to be textured rather than by the ambition of the texture itself.

## The substrate''s level, the texture''s foundation

The texture does not repeal the levels of finish, and the gypsum industry''s guidance is the foundation the texture article must lay: the GA-214 levels define the surface preparation before decoration, and the textured surface''s level requirement differs from the flat wall''s, but it exists, and the texture sprayed over the wrong level inherits the wrong level''s story, the ridges and the joints telegraphing through the pattern the flat finish would have shown plainly. The prime is equally governed: the texture products and the coating literature call for the primed surface, the high-solids flat primer coats that equalize the substrate''s porosity, and the texture over the unprimed wall is the pattern the repaint publishes. The tradition''s economy is honest, forgiving the minor sins, not the skipped steps, and the overview''s honesty on this point saves its readers the industry''s most common texture failure.

## What this overview asks the reader to hold

Hold the pattern as an event. The texture is created in the moment of the spray, and its quality lives in three adjustable things, the mix, the pressure, and the rhythm, and every article that follows is the management of those three. The materials article maps the products and their consistencies, the field sequence walks the spray event and the knockdown''s timing, the quality chapter reads the pattern''s uniformity, and the maintenance article keeps the touch-up culture the aerosol aisle was invented to serve. The reader who holds the pattern as an event also holds the series''s most practical lesson in advance: the practice surface, the cardboard and the spare wall, where the event is rehearsed before the room is committed, is the texture trade''s oldest and cheapest habit.

## A short history, the texture''s American century

The spray texture''s American history explains its geography. The popcorn ceiling arrived with the mid-century''s acoustic ambitions and the tract-builders'' economies, and the nation''s ceilings wore it for two decades. The Southwest''s adobe tradition raised the knockdown as a masonry memory translated into a gypsum-era product, and the sunbelt''s building boom carried the pattern across the country, so that the Southwest style became the national standard the renovator now inherits. The orange peel served the production builders as the forgiving finish that scaled with the crew, and the texture''s century closes with the modern smooth-wall fashions of the custom market, which makes the patterned interior a style decision rather than a default, and the overview''s reader inherits the choice rather than the habit. The history matters because the existing house''s texture is an era''s document, and the maintenance and the renovation read the era honestly before they act.

## The equipment''s learning curve, honestly graded

The overview owes the reader the skill grading, because the texture trade''s difficulty is equipment-specific. The aerosol can is the friendliest entry in the entire American finishing aisle, dialed at the cardboard and feathered at the repair, and its worst outcome is a mismatched afternoon. The hopper gun is the mid-tier, the compressor''s pressures and the mixes'' consistencies learned in a weekend and mastered in a season. The production machines are the trade''s own, the apartment-scale volumes the professional crews are paid for, and the reader''s honest self-grading before the project is the overview''s last service: match the equipment to the project, the project to the patience, and the patience to the practice surface, in that order.

## The texture''s regional accents, once more

The pattern families wear regional accents the reader should meet before the buying trip: the Southwest''s heavy knockdowns, the sunbelt''s orange peels, the mid-century''s acoustic ceilings, the custom market''s smooth walls, and the existing house''s pattern is the region''s document read at the doorway. The accents matter less than the reader''s honest identification of the field''s own pattern, because the match and the specification both begin at the naming, and the overview''s vocabulary exists precisely so the naming is accurate, and the household that can say heavy knockdown out loud has already saved the contractor''s visit.

## The overview''s honest limits

The overview states its limits as plainly as its case: the spray texture is a decoration, not an assembly repair, and the texture asked to hide the wall''s structural story, the crack that returns, the water''s stain that moves, is the cosmetic the series has refused everywhere, and the diagnosis precedes the can in this topic exactly as it does in the repair series. The texture''s forgiveness is for the substrate''s minor sins, the fastener''s ghost and the joint''s whisper, and the wall''s larger stories belong to the repair sequence and its professionals, and the overview''s reader holds the boundary with the rest of the series''s disciplines.

## Reading the existing texture, the overview''s diagnostic gift

Because most readers meet this topic as an existing house''s question, the overview''s diagnostic gift is the existing pattern''s read: the family named at arm''s length, the density gauged, the era guessed from the region''s history, and the match''s difficulty priced honestly before the repair aisle is visited. The read takes ten minutes with the flashlight and this article''s vocabulary, and the household that has named its pattern walks the maintenance article with the vocabulary the file needs, and the household that has not is about to learn the pattern''s name at the cardboard''s price, which the overview exists to prevent.

## What this overview has given, and what it asks

The overview has given the vocabulary, the families, the equipment spectrum, the history, and the honest limits, and it asks one thing in return: name the pattern before the project, at the doorway''s distance, with the file''s page open, and let the name drive the shelf, the equipment, and the sequence the articles that follow provide. The texture trade''s whole discipline is the naming, the dialing, and the rhythm, in that order, and the reader who holds the order holds the topic''s whole library in the overview''s single image: one decision, sprayed uniformly, kept forever.

## The last paragraph, the overview''s closing habit

The overview closes with the habit the whole topic runs on, stated one final time in its plainest form: practice at the cardboard, dial at the cardboard, and let the wall receive the practiced pattern, and the texture''s whole library, its products and its physics and its decades, is an elaboration of that single sequence. The reader who keeps the habit keeps the pattern, and the reader who skips it buys the correction, and the overview''s argument, like the series''s, ends where the trade''s does, at the practice surface, where the decision is made and the wall is spared, and the pattern that the household lives with for its decades is the one that was rehearsed for its minutes.

## References
1. Homax, *Homax Products: Wall Repair and Texture Solutions*.
2. Homax, *Pro Grade Knockdown Wall Texture, Water Based, 25 oz*.
3. USG, *SHEETROCK Brand Wall and Ceiling Spray Texture*.
4. USG, *Sheetrock Brand Wall and Ceiling Texture, submittal datasheets*.
5. DAP, *2 In 1 Wall and Spray Texture*.
6. Gypsum Association, *Recommended Levels of Finish for Gypsum Panel Products, GA-214-2022, Quick Reference Guide*.$wallarticle1$, 'overview', 10),
  ('us-interior-spray-textures-materials', 'Materials for US Interior Spray Textures', 'A US materials guide to spray textures: hopper-grade powders from USG, the aerosol line from Homax and DAP, primers and the porosity rule, and the practice surfaces that make the pattern matchable.', $wallarticle2$# Materials for US Interior Spray Textures

The texture aisle is divided by scale, and the buyer''s first decision is the project''s size. The hopper end stocks the powder textures, mixed on site to the consistency the pattern demands, and the aerosol end stocks the pre-mixed cans, adjustable and mission-built for the repair, and both ends are stocked by the industry''s familiar names, USG''s spray texture products at the production end, Homax''s and DAP''s cans at the repair end. This article walks both shelves, then the primers the pattern''s success is built on, and the practice surfaces the trade never skips.

## The hopper shelf: powders, mixes, and the consistency question

The production end''s materials are the powder textures, and the flagship products carry the gypsum industry''s own name, USG''s SHEETROCK-brand spray texture line, unaggregated for the orange peel and knockdown families and aggregated for the popcorn ceilings, their datasheets specifying the mixing, the coverage, and the application the pattern requires. The powder''s honest variable is the mix''s consistency, the water-to-powder ratio that sets the splatter''s size, and the trade''s habit is the same in every region: mix to the product''s instructions first, spray the test surface, and adjust in small steps, because the consistency that looks right in the bucket is corrected at the pattern, never at the ceiling. The shelf''s economy is real, the powder texture is one of the cheapest surfaces per square foot in the finishing trades, and the money moves to the equipment and the labor, which the materials article''s honest takeoff should say plainly.

## The aerosol shelf: cans with missions

The repair end''s materials are the aerosol cans, and their engineering deserves the article''s respect. The Homax line spans the pattern families, orange peel and knockdown and the ceiling textures, with the adjustable nozzles that select the pattern''s density, fine to heavy, and the water-based chemistry that cleans with soap and delays nothing, and the products'' stated coverage, the manufacturer''s own square footage per can, prices the repair honestly. The DAP all-in-one products extend the shelf''s ambition, orange peel, knockdown, or popcorn from one can with the nozzle''s rotation and the paint-ready times the label states, and the pre-primed tints some cans carry answer the flash question before it is asked. The aerosol shelf''s law is the same as the hopper''s: the can is a spray event, rehearsed on cardboard first, and the can that is tested on the wall itself is the repair the wall wears.

## Primers: the porosity rule, stated once

The texture''s foundation is the prime, and the porosity rule governs it: the substrate that receives the texture must be uniform in its absorption, or the pattern''s density varies with the porosity beneath it, the same spray laying heavy on the sealed field and starved on the bare board. The industry''s answer is the primer coat the texture products and the coating literature specify, the high-solids interior flats and the first-coat products the gypsum manufacturers publish, applied before the texture and allowed its honest cure, and the prime is the texture''s cheapest insurance and its most skipped step. The primed surface sprays the pattern the can or the gun was set for, and the unprimed surface sprays the substrate''s autobiography, and the reader who buys the texture should buy the primer in the same transaction.

## Paints and tints: the texture''s finish

The texture is decorated, and the decorated texture has its own materials: the flat and the matte finishes the pattern demands, applied in the thick-nap rollers and the sprays the pattern''s geography requires, and the tinting some texture products accept in the mix itself, the color born in the texture rather than painted over it. The sheen question is the pattern''s own: the gloss and the semi-gloss interrogate the texture''s every peak, and the tradition dresses its patterns in the flats and the eggshells that scatter the light the pattern was built to scatter, and the sheen''s honesty is the room''s daylight test, which the quality chapter walks.

## The practice surfaces and the tools of the event

The texture trade''s cheapest materials are the practice surfaces, the cardboard and the plywood offcuts where the pattern is rehearsed, and the honest shelf includes them because the trade includes them. The tools complete the list: the hopper gun and its compressor at the production end, the wide knockdown knife the splatter family demands, the sanding blocks and the matching abrasives the touch-up''s blend requires, and the masking and the drop cloths that keep the overspray the spray event''s inevitable byproduct off the surfaces the project does not own. The tools and the practice surfaces cost little and decide everything, and the materials article''s last sentence is the trade''s: the pattern is bought at the shelf, but it is made at the cardboard.

## The takeoff, textured honestly

The texture takeoff runs the same second calculation the series gives every assembly: the area by the pattern''s stated coverage, the powder by the mix''s ratio and the coverage the datasheet publishes, the cans by their square footage honestly counted, the primer and the finish''s paint by the texture''s consumption, which exceeds the flat wall''s, and the practice materials as their own line item. FRELUX''s wall-finishing estimator runs the US texture arithmetic, and the project that checks its takeoff orders once and sprays once, and the project that guesses its way to the third can mid-ceiling has met the takeoff''s oldest lesson at the worst moment.

## The shelf''s perennials and the renovation''s inheritance

The materials article''s honest note on the existing house: the texture shelf''s products have changed less than any aisle in the finishing library, the orange peel and knockdown of the aerosol can matching the orange peel and knockdown of the existing walls precisely because the products'' physics never changed, and the renovator''s inheritance is that the match culture works across decades. The era''s differences live in the aggregate ceilings and the patterns'' densities rather than the products'' chemistries, and the reader matching a texture from any American decade will find the modern shelf stocked for the match, which is the aisle''s quiet continuity and the article''s last observation.

## The aggregate question, ceilings'' own shelf

The materials article''s last shelf is the aggregate, and the popcorn ceiling is its whole aisle: the aggregated products, the perlite and the vermiculite families the ceiling era sprayed at the nation''s ceilings, sold as the ceiling textures of the same brands that serve the wall families, and the aggregate''s honest notes are two, the coverage differs from the unaggregated shelf and the removal differs from the knockdown''s, the aggregate scrapping and the fines breathing their cautions. The buyer of the ceiling texture reads the aggregate''s product data with the era''s question in mind, and the maintenance article''s removal section is the shelf''s honest companion reading, and the materials article commends the pairing.

## Storage and shelf life, the texture''s quiet half

The texture shelf''s perishables complete the materials article: the powders hydrate in their bags, the aerosols lose their pressure and settle in their cans, the water-based chemistries freeze in the garage''s winter, and the primers and finishes carry the coating shelf''s own cautions. The stored texture materials live inside, dated, rotated, and the aerosol can that is shaken per its label''s guidance before every use is the can that sprays its stated coverage, and the can that is stored for a decade is the match that fails at the worst moment. The household''s maintenance can is bought fresh, stored inside, and shaken honestly, which is the aisle''s smallest instruction and its most skipped, and the materials article commends it with the rest of the shelf''s honesty.

## One shelf, one sentence, one final time

The texture shelf, one sentence for the buyer in a hurry: the powder products of the gypsum industry''s own brands for the hopper''s production end, the adjustable aerosols of the repair brands for the touch-up end, the high-solids primer for the porosity the pattern depends on, the flats and thick naps for the finish the pattern prefers, the cardboard for the dial that precedes the wall, and the file''s page for the pattern''s future. One sentence, and the shelf''s whole honesty, and the reader who shops it buys the pattern''s success at the store where it is cheapest, one final time, which is the materials article''s entire argument everywhere.

## The practice panels, kept as materials

The last materials note gives the practice panels the shelf''s final slot, because they are consumed like products and hoarded like tools: the cardboard sprayed at the dial and dated with the can''s settings, the panels that matched the wall and the repair, kept in the file''s folder as the pattern''s physical memory, and the next touch-up dialed against the kept panel rather than the remembered one. The panel costs nothing and saves the match, and the household that keeps the file''s folder keeps the wall''s pattern in duplicate, on the wall and in the drawer, and the duplicate is the match''s whole insurance, and the shelf''s finest free product.

## The buyer''s closing honesty

The materials article''s final honesty, priced for the pocket: the texture project''s shelf cost is small, the powder and the cans and the primer and the cardboard together price below any other finish in this library, and the shelf''s whole risk concentrates in one habit, the dial at the cardboard, which costs nothing. The buyer who reads this article has bought the shelf''s whole knowledge at the article''s price, and the shelf that follows the article is the shelf that performs, and the closing counsel is the library''s oldest, one final aisle at a time: the materials are the easy half of every texture project, and the other half is the practice.

## The shelf''s last line item, the honest spare

The shelf''s last line item is the spare, and the materials article commends it: one spare can of the wall''s pattern, bought in the same production run and stored inside, is the match''s whole insurance against the manufacturer''s reformulation and the era''s discontinuation, and the household that buys the spare when the wall is textured buys the match at its cheapest and keeps it at its simplest. The spare is the file''s physical annex, the folder''s companion in the drawer, and the materials article''s closing recommendation is the trade''s quiet habit stated plainly, buy the pattern''s future when the pattern''s present is on the shelf.

## References
1. USG, *SHEETROCK Brand Wall and Ceiling Spray Texture*.
2. USG, *Sheetrock Brand Wall and Ceiling Texture, submittal datasheets*.
3. Homax, *Homax Products: Wall Repair and Texture Solutions*.
4. Homax, *Pro Grade Knockdown Wall Texture, Water Based, 25 oz*.
5. DAP, *2 In 1 Wall and Spray Texture*.
6. Gypsum Association, *Recommended Levels of Finish for Gypsum Panel Products, GA-214-2022, Quick Reference Guide*.$wallarticle2$, 'materials', 10),
  ('us-interior-spray-textures-installation', 'Applying Interior Spray Textures: The US Field Sequence', 'A sequenced US field guide to spray textures: substrate and primer, the mix and the test spray, the spray event''s passes and pressure, the knockdown''s timing, the aerosol touch-up, and the cleanup windows.', $wallarticle3$# Applying Interior Spray Textures: The US Field Sequence

The texture sequence is built around its single event, the spray, and the whole field guide exists to make that event deliberate: the substrate prepared, the primer cured, the mix dialed, the pressure set, the rhythm rehearsed, and only then the room committed. The sequence that follows is the trade''s, gathered from the texture products'' own instructions and the industry''s practice culture, and it serves both ends of the equipment spectrum, the hopper and the aerosol, because the physics is one physics.

## Preparation: the substrate, the primer, and the masking

The sequence begins where every gypsum sequence begins, with the substrate''s acceptance: the surface finished to the level the texture requires, the joints treated, the fasteners filled, and the surface''s condition honest about what the texture is being asked to hide, because the pattern forgives the minor sins and publishes the major ones. The primer follows, the high-solids coat the porosity rule demands, applied full and cured honest, and the masking completes the preparation, the floors, the fixtures, the windows, and the outlets protected against the overspray the event will produce, because the texture''s byproduct is the trade''s cleanup bill, paid at the masking''s price or at the scrubbing''s.

## The mix, the test, and the dial

The texture material is mixed to the product''s stated ratio and tested on the practice surface before the room is touched, and the test is the sequence''s heart. The hopper''s consistency is judged at the pattern the test spray lays down, the splatter''s size and the pattern''s density read against the field''s target, and the adjustments, water in small steps, pressure in small turns, are made at the cardboard until the pattern repeats. The aerosol''s adjustable nozzle is dialed the same way, the pattern''s fine-to-heavy range tested and read, and the first can of a texture project is always partly a test can, spent on the practice surface in the trade''s oldest economy. The dial is finished when the test pattern matches the field''s existing or the specification''s named target, and the sequence''s honesty is that the dial happens before the wall, or the wall becomes the test.

## The spray event: passes, pressure, and rhythm

The spray itself is a discipline of repetition. The gun or the can moves in the overlapping passes the technique requires, each pass covering its predecessor''s half, the distance held steady, the trigger''s timing consistent, and the rhythm unbroken across the field, because the pattern is a record of the wrist and the pressure, and the wrist that varies writes its variation into the wall. The ceilings and the high walls carry the staging and the arm''s endurance as their own variables, and the trade''s habit is the paced progression, the field divided into the sections the arm can spray uniformly, and the sequence that respects its own limits finishes the field uniformly. The event''s product is the pattern that reads as one decision, made across the whole surface, and the reader who watched a good crew spray has seen the repetition the pattern''s uniformity is made of.

## The knockdown''s timing, the second event

The splatter knockdown family has a second event inside its first: the knockdown itself, the flattening of the splatter''s peaks after a partial set, executed with the wide knife dragged lightly across the pattern at the moment the material has stiffened enough to shear and not yet enough to resist. The timing is the family''s whole craft, taught at the practice surface and judged at the sheen of the peaks, and the knockdown that comes early drags the pattern to a smear, the knockdown that comes late tears the peaks it means to plane. The crews work the field in the timing''s rhythm, spray the section, knock the section, spray the next, and the sequence''s product is the mottled, dragged plane the Southwest raised, uniform because the timing was uniform, and the reader who sprays the knockdown owes the practice surface a rehearsal of the second event as well as the first.

## The aerosol touch-up, the repair''s own sequence

The aerosol repair is the production sequence in miniature and deserves its own lines: the damage repaired and primed per the repair series''s sequence, the field''s existing pattern read honestly at the room''s distance, the can dialed at the cardboard until the practice pattern matches, and the repair sprayed in the light passes that blend the new pattern into the old, feathered at the edges and built in the layers the match demands. The touch-up that matches is the aerosol aisle''s whole reason for existing, and the touch-up that misses is almost always the skipped cardboard, the can taken to the wall on hope, and the sequence''s counsel is the trade''s, one more time: the wall is not the practice surface, ever.

## Cleanup, cure, and the finish

The water-based chemistry''s cleanup window closes fast, and the sequence''s last discipline is its first cleanup: the gun, the hopper, and the nozzle flushed in the window the products state, the water-based tools washed with the soap-and-water simplicity their labels promise, and the dried texture a different material entirely, sanded rather than washed. The finished texture cures per the product''s schedule before the finish coat follows, and the finish is applied in the flats the pattern''s light behavior demands, and the room is returned to the household as the patterned surface its specification chose, one decision, sprayed uniformly, and painted honestly.

## The crew''s day, textured honestly

The field guide''s closing picture is the production day, seen plainly: the morning at the masking and the prime''s verification, the midday at the mixes and the dial, the afternoon at the passes and the knockdowns, the section rhythm steady until the field reads as one decision, and the evening at the cleanup the windows demand. The texture crew''s day is the spray event stretched to its production length, and the superintendent who sees it plainly defends its rhythm the way the overview defended its physics, as the pattern''s whole source, and the field that gets its honest day of rhythm repays it with its decades of quiet.

## The staging and the arm, the ceiling''s honest economics

The field guide''s last operational note is the body''s: the ceiling day is the trade''s most physical, the staging moved and the gun held overhead for the passes the ceiling demands, and the production crews pace themselves and their fields honestly, the sections sized to the arm''s uniform reach, the breaks respected, and the ceiling that is sprayed tired is the ceiling whose pattern records the fatigue. The homeowner''s ceiling project is graded accordingly, the aerosol''s lighter reach serving the repairs, and the full ceiling''s hopper day is the trade''s honest labor, priced and respected as such, and the field guide''s counsel is the overview''s equipment grading, applied to the body''s own staging.

## The repair''s blend, the aerosol''s honest sequence close

The field guide''s last close is the blend, the touch-up''s final act: the new pattern sprayed slightly under the field''s density and built in the layers that approach the match, because the pattern that is built up reads as the blend the feathering makes, and the pattern that is sprayed full on the first pass reads as the badge the room announces. The blend''s patience is the aerosol repair''s whole craft, three light passes and the doorway''s read between them, and the repair that ends invisible is the repair that respected its own restraint, which is the sequence''s last sentence and the aisle''s finest product.

## The sequence''s summary card

The field guide''s summary card, for the reader''s pocket and the truck''s visor: substrate honest, primer cured, masking complete. Mix per the product, test at the cardboard, dial until the pattern repeats. Spray in overlapping passes, one rhythm, one pressure, one field. Knock at the timing the practice taught, spray the section, knock the section. Touch up under the density and build in layers, feather to the field. Clean in the water''s window, cure per the schedule, finish in the flats. Six lines, the whole sequence, and the reader who follows them at the cardboard first has followed the entire trade, and the wall receives the practiced pattern, and the room receives the wall, and both are quiet.

## The mixing water, one chemistry note

The field guide''s final chemistry note is the mixing water, because the texture is a water-born product at both ends of the shelf: the hopper''s powder takes the clean water the products'' instructions assume, and the household''s habits, the hot water that thins too far, the hard water that carries its minerals into the pattern''s chemistry, are the dial''s quiet variables. The trade mixes with the water the product''s data names or the clean tap the region supplies honestly, and the reader who suspects the water''s contribution to the pattern''s mystery dials the same can with the distilled jug''s water and reads the difference at the cardboard, which is the chemistry''s cheapest experiment and its most honest.

## The last caution, the mask

The field guide''s last caution is the breath''s: the texture event makes dust, the powder''s mixing and the dried texture''s sanding make the fine particles the respirable kind, and the trade''s masks and the era''s cautions are the sequence''s honest safety step, worn at the mixing, the scraping, and the sanding, and the household''s texture project is graded on its protection as well as its pattern. The water-based chemistries are the aisle''s kindest, and the dust is the aisle''s oldest caution, and the field guide''s sequence ends as every honest sequence does, with the finish''s beauty and the finisher''s health both kept, which is the trade''s whole definition of a good day''s work, one final time.

## The last image, the practiced wall

The field guide''s closing image is the sequence''s whole product, seen plainly: the wall receiving its practiced pattern, the dial''s setting already proven, the wrist''s rhythm already rehearsed, the room''s masking already complete, and the pattern going down as the decision it was, one event, uniform, and the household''s wall joining the tradition''s century of quiet patterns, kept by the can and the folder the maintenance chapter issues. The practiced wall is the topic''s whole argument in one image, and the reader who has followed the sequence to this paragraph has followed the argument to its end, and the wall, one final time, is spared, and the room, and the decade, and the file gets its page.

## References
1. USG, *SHEETROCK Brand Wall and Ceiling Spray Texture*.
2. Homax, *Pro Grade Knockdown Wall Texture, Water Based, 25 oz*.
3. DAP, *2 In 1 Wall and Spray Texture*.
4. Homax, *Homax Products: Wall Repair and Texture Solutions*.
5. Gypsum Association, *Recommended Levels of Finish for Gypsum Panel Products, GA-214-2022, Quick Reference Guide*.$wallarticle3$, 'installation', 10),
  ('us-interior-spray-textures-quality-checks', 'Quality Checks for Interior Spray Textures', 'A US quality guide to textured surfaces: reading pattern uniformity at the room''s distance, matching the existing pattern, the sheen test, and the file of cans and batches that keeps the pattern matchable.', $wallarticle4$# Quality Checks for Interior Spray Textures

Texture quality control is the pattern''s uniformity, read honestly at the room''s distance and in the day''s light, because the texture is the one finish whose entire specification is a single word, orange peel, knockdown, fine, heavy, and whose entire quality is the consistency of that one decision across the whole field. The program is short, the light, the distance, the comparison, and the file, and it is worth doing because the texture''s defects, unlike the flat wall''s, are heard by the room''s occupants for the surface''s whole life, in the pattern that varies at the seam the wrist forgot.

## The uniformity read, at three distances

The pattern''s acceptance is a read at three distances, and each distance asks its own question. At arm''s length, the texture''s individual pattern is read, the splatter''s size, the peak''s height, the density the dial was set for, and the question is the specification''s own, is this the named pattern. Across the room, the field''s uniformity is read, the sections compared, the passes'' overlaps invisible, the seams where the crew stopped and started quiet, and the question is the wrist''s own, does the whole wall read as one event. And at the doorway, the room''s honest view, the pattern''s light behavior is read, the ceiling''s and walls'' scatter uniform, the sheen unbroken, and the question is the room''s own, does the texture look like the house''s decision or the contractor''s. The three reads take five minutes and constitute the entire acceptance, and the texture that passes all three is the pattern the file photographs.

## The match read, the repair''s referee

Where the texture is a repair in an existing field, the acceptance adds the match read, the new pattern compared against the old at the distances the household actually uses, and the match is the texture trade''s hardest skill honestly acknowledged. The existing pattern is read first, its family named, its density gauged, its era''s quirks noted, the Southwest knockdowns of different decades differ as handwriting does, and the repair''s pattern is dialed to the existing at the cardboard until the two samples read as one. The match that succeeds is invisible, and the match that fails is the badge the texture cannot hide, and the quality program''s honest counsel is the practice culture''s, spend the can at the cardboard, and the room at the match.

## The porosity and the flash, the primer''s audit

The texture''s porosity story is the flat wall''s story at a larger scale: the primed field sprays the uniform pattern, and the unprimed patches spray their own density, the pattern thick where the surface drinks and thin where it resists, and the defect reads as the wall''s autobiography through the texture''s veil. The acceptance audits the primer''s coverage at the pattern''s uniformity, and the flash, the finish coat''s sheen varying over the primed and the bare, is the porosity''s second testimony, caught at the doorway''s angle of light. The repairs are honest and few when the prime was full, and the program''s finding is the primer''s audit, and the reader who skipped the prime reads this paragraph as the wall''s message.

## The overspray, the edges, and the neighbors'' evidence

The texture event''s byproduct is the overspray, and the quality program''s environmental read is part of the acceptance: the fixtures and the floors masked and protected, the adjacent surfaces'' edges clean, the windows'' and outlets'' lines sharp, and the overspray that reached the unprotected surfaces cleaned in the window the chemistry allows, the water-based washed while wet, the dried chipped and sanded at a larger cost. The texture project''s reputation in the household is written at the edges, and the program that audits them closes the project with the neighbors'' evidence as clean as the field''s, which is the whole quality story told in one sentence.

## The file: the pattern''s biography

The texture''s file is the pattern''s matchability, and it is the maintenance article''s foundation: the products'' names and batches, the mix''s ratio and the gun''s pressure or the can''s nozzle setting, the practice panels kept in the file''s folder, the finish''s paint and sheen, and the photographs under the room''s light at the three distances. The file turns the future''s touch-ups from archaeology into dial-setting, and the pattern that is filed is the pattern that the aerosol of the next decade can match, and the quality chapter''s last habit is the file''s page, written in the five minutes the closeout takes, which the series has recommended everywhere and recommends here one final time.

## The sheen question, one final answer

The texture''s sheen deserves the program''s last word, because it is the acceptance''s most argued finding: the pattern that reads uniform in the daylight and the fixture''s evening light is the honest success, and the pattern that reads uniform only at the contractor''s chosen hour is the finding the household will meet at its own hours, and the program''s answer is the doorway''s read at two honest times of day. The sheen''s argument is settled by the room''s own light, always, and the acceptance that respects the household''s hours ends the argument before the check clears.

## The program''s one absolute, stated plainly

The quality chapter''s absolute is the practice surface, stated as the program''s law: no pattern''s first pass on the finished wall, ever, the cardboard and the dial preceding the field in every texture project of every size, because the texture is the one finish whose defects are created in seconds and worn for decades. The program''s finding at the unpracticed wall is always the same finding, the pattern that varies, and the correction is always the same correction, the section re-textured from the dial, and the prevention is always the same prevention, the cardboard, and the program states it as law because the trade states it as habit, and the reader inherits both.

## The three honest answers, textured

The acceptance''s classification, the series''s three answers applied to the pattern: the cosmetic and stable, the density''s whisper, the seam''s suggestion at the doorway''s angle, accepted and recorded, because the texture''s forgiveness extends to its own honest variation. The repairable, the seam that reads, the density that shifts at the section''s boundary, corrected by the re-dial and the re-texture of the affected area. And the systemic, the pattern that varies because the porosity or the substrate varies beneath it, escalated to the diagnosis the primer''s audit names. The three answers, applied at the three distances, are the texture program''s whole content, and the program is short because the pattern''s honesty is short, one decision, read at three distances, classified three ways.

## The program''s economics, one closing arithmetic

The quality chapter''s closing arithmetic is the topic''s most encouraging: the cardboard costs nothing, the practice costs minutes, the file costs a page, and the texture''s correction costs the section''s re-spray, the room''s masking again, and the household''s memory of the seam forever. The program''s prevention is the cheapest in the finishing library because the defect''s creation is the fastest, and the ratio between the seconds of the spray and the decades of the pattern is the entire economics, and the reader who has priced the ratio has understood the program''s whole urgency, and the cardboard''s whole philosophy, and the trade''s whole respect for its own pattern.

## The file''s photographs, the pattern''s memory

The program''s closing instrument is the photograph, and the texture''s photographs are the pattern''s whole memory: the field''s pattern under the room''s light at the acceptance''s three distances, the practice panels beside the wall they matched, and the seam''s honest exceptions, if any, recorded as knowns rather than discovered later as arguments. The photographs cost minutes and serve the touch-up''s future, the removal''s reference, and the sale''s disclosure, and the file''s folder of pattern photographs is the texture program''s final product, the pattern made portable, one final time, for whoever holds the can next.

## The three distances, one final walk-through

The program''s closing rehearsal, the acceptance walk conducted in the article''s own words, one final time: stand at the arm''s length and name the pattern, walk the room and read the field''s one-decision uniformity, stand at the doorway and read the light''s scatter and the sheen''s honesty, and write the file''s page while the ladder is still up and the light is still honest. Five minutes, three distances, and the texture either testifies to its dial or confesses its shortcuts, and the reader who can conduct the walk owns the pattern''s whole acceptance, which is the quality chapter''s entire gift, stated plainly, for the wall the reader will own tomorrow.

## The program''s true close, the pattern''s witnesses

The quality chapter''s true close belongs to the pattern''s witnesses, the three readers every textured wall eventually has: the household, who reads the pattern at the doorway every evening, the buyer''s inspector, who reads it once at the sale''s walk, and the future''s touch-up artist, who reads the file''s page and matches the wall in an afternoon because the program wrote everything down. The program''s whole service is to the witnesses, and the wall that serves all three is the wall that passed its three distances, kept its panels, and filed its page, and the quality chapter''s last sentence is the file''s first: the pattern is a decision, and the decision is only as good as its record, one final time, everywhere in this library.

## The seam''s honest exceptions, recorded

The program''s final paragraph gives the seam its honest place in the file, because the textured field''s seams, the section boundaries, the day''s stop-and-start lines, are the pattern''s honest exceptions and the file''s most valuable knowns: recorded at the acceptance, photographed at the doorway''s distance, and classified honestly, the seam that reads at one angle and one hour is a known that the household lives with and the touch-up artist works with, while the seam that is discovered at the sale''s walk is an argument the file could have prevented. The program''s honesty about its own exceptions is the program''s last quality, and the texture''s file is where that honesty lives, and the reader who records the wall''s honest exceptions has recorded the wall''s whole truth, which is the acceptance''s only real product, and the program''s only real promise, and the quality chapter''s very last word.

## One closing sentence, the whole chapter

Because the texture''s quality program is the shortest in this library, its chapter earns a closing sentence that carries it whole: read the pattern at three distances, demand one decision, practice before the wall, and write the page, and the wall that receives these four habits arrives at its acceptance with nothing left to find, which is the quietest sentence in the entire quality-control literature and the only one this patterned chapter ever needed, and the reader who keeps it keeps the pattern, and the program, and the file''s page, and the wall''s whole quiet decade, and the chapter, at last, is done.

## References
1. Gypsum Association, *Recommended Levels of Finish for Gypsum Panel Products, GA-214-2022, Quick Reference Guide*.
2. Homax, *Homax Products: Wall Repair and Texture Solutions*.
3. USG, *Sheetrock Brand Wall and Ceiling Texture, submittal datasheets*.
4. DAP, *2 In 1 Wall and Spray Texture*.$wallarticle4$, 'quality', 10),
  ('us-interior-spray-textures-maintenance-repair', 'Maintaining Interior Spray Textures in the United States', 'US guidance for textured walls and ceilings: the gentle cleaning, the aerosol touch-up culture, repaints with thick naps and sprayers, the pattern-matching repair, and the removal question answered honestly.', $wallarticle5$# Maintaining Interior Spray Textures in the United States

The textured surface is the household''s kindest wall to maintain and the renovator''s most pattern-sensitive one to touch, and its maintenance program is short: clean gently, touch up with the aerosol culture the industry built for exactly that, repaint with the tools the pattern''s geography demands, and answer the removal question honestly when it comes. This article closes the US library''s spray texture topic with the steward''s calendar and the trade''s honest answers.

## Cleaning: the pattern''s gentle chemistry

The textured surface cleans with the flat wall''s gentleness plus the patience the pattern''s geography adds: the soft brush and the vacuum''s brush head for the dust the peaks collect, the damp cloth and the mild solutions for the spots the household writes, and never the abrasive or the scrub that the pattern''s peaks take personally, because the sheared peak is the pattern''s permanent scar and the cleaning''s chemistry leaves the marks the patience prevents. The ceilings'' texture collects the years quietly, and the annual gentle pass with the vacuum''s brush is the whole of the ceiling''s cleaning program for most households, and the texture that is cleaned gently never needs the repaint the harsh cleaning schedules.

## The aerosol touch-up culture, the texture''s gift

The texture''s maintenance culture was transformed by the aerosol aisle, and the article''s heart is its use: the damaged patch repaired per the repair series''s sequence, the field''s pattern read and named, the can dialed at the cardboard until the practice pattern matches, and the repair sprayed in the feathered passes that blend the new into the old, the invisible repair the products'' own mission statement. The touch-up''s skill is the match, the match''s skill is the practice, and the household that keeps one can of the wall''s pattern and the file''s record of its settings owns the texture''s whole maintenance independence, the repair done in an afternoon for the can''s price, which is the aerosol aisle''s entire promise and, honestly delivered.

## Repainting: the thick nap and the spray

The textured wall repaints on the coating''s honest rhythm, and the pattern''s geography demands its tools: the thick-nap rollers that carry the paint into the pattern''s valleys, the sprayers that coat the ceilings and the heavy knockdowns the rollers starve, and the flats and the mattes the pattern''s light behavior prefers, applied at the thickness the peaks require and the evenness the valleys reveal. The repaint''s preparation is the gentle cleaning and the repair''s touch-ups done first, and the repaint that follows the file''s paint page keeps the sheen the household chose rather than discovering it, and the textured room''s repaint is the paint''s honest project, not the texture''s, which is the maintenance''s quiet good news.

## The removal question, answered honestly

The texture''s one hard question is the removal, and the steward deserves the honest answer: the patterned ceiling the household wants flat is removed by the scraping and the wetting the trade knows, a labor of the arms and the drop cloths, and the removal''s decision tree starts with the building''s era and its materials, because the older ceiling textures of certain eras carry the testing obligation the renovation industry''s professionals respect, and the era-appropriate caution is simply this: where the building''s age makes the ceiling''s composition a question, the test precedes the scraper, and the professional precedes the do-it-yourself. The removal that is done honestly, tested, wetted, scraped, skimmed, and primed, ends in the flat ceiling the household wanted, and the removal that skips the era''s question is the renovation literature''s cautionary chapter, and the article''s counsel is the boundary the whole series draws, read first, then act.

## The annual walk, texture edition

The textured household''s annual walk takes minutes: the ceilings read for the water''s testimony the pattern hides better than the flat, the touch heights read for the dents and the aerosol''s small answers, the edges and the corners read for the pattern''s wear and the finish''s sheen, and the file''s page written with the year''s findings while the can of the wall''s pattern is still in production. The texture''s defects hide in the pattern, and the walk that reads the texture honestly reads its stains and its wear with the pattern''s own patience, and the household that walks its textured house keeps the pattern''s decades quiet.

## Passing the pattern forward

The texture''s handover, like every surface''s in this series, is the file: the pattern''s name and products, the can''s settings and the gun''s pressures, the paint''s page, the removal question''s honest answer if the era asked it, and the walk''s calendar, all in the folder the next steward inherits. The pattern that is filed is the pattern that matches forever, the texture that is known is the texture that stays cheap, and the aerosol can that the file names is the smallest and most honest maintenance product in the entire American wall-finishing library, which is the series''s closing compliment to the industry''s friendliest aisle.

## The last word, the can and the folder

The topic''s last word is its two cheapest tools, and they are the series''s most democratic pair: the aerosol can, the finish library''s friendliest product, and the folder, the maintenance culture''s whole memory, and together they keep the textured house matched and known for the decades the pattern was built to serve. The texture that is filed and touched-up is the texture that outlives its fashions, and the household that holds the can and the folder holds the pattern''s whole biography, and the wall, orange peel or knockdown, keeps the Southwest''s masonry memory alive in the gypsum house''s quietest maintenance economy, which is the tradition''s honest closing.

## The steward''s inventory, textured edition

The household''s complete inventory, one final gathering: the vacuum''s brush head for the ceilings'' annual pass, the gentle chemistry''s shelf, the aerosol can of the wall''s pattern, bought while the products are in production and stored inside, the cardboard, kept with the can as its honest partner, the file, the pattern''s page and the paint''s page and the walk''s calendar, and the annual twenty minutes the whole program costs. One drawer, one folder, and the textured house is kept at the quiet the pattern was built to give, and the inventory''s total cost is the can''s price and the calendar''s discipline, which the series has priced honestly everywhere and prices here at its friendly close.

## The last kindness, texture edition

The series''s close, texture edition, is the topic''s kindest: the patterned house is the forgiving house, and the household that holds its can and its folder holds the pattern''s whole economy, and the wall that reads as one decision at the doorway is the wall whose decades are quiet and whose repairs are afternoons. The texture tradition''s gift to the American interior is the surface that forgives, and the maintenance culture''s gift back is the surface that is kept, and the two gifts meet at the cardboard, the can, and the file, and the reader who holds all three is the tradition''s whole heir, and the wall, orange peel or knockdown or the ceiling''s aggregate memory, keeps the house''s story in its pattern and its folder, quietly, for as long as the house stands.

## The quiet pattern, the household''s last inheritance

The last image, the textured edition of the series''s quiet wall: the doorway''s view, the pattern reading as one decision in the evening''s light, the ceiling''s aggregate collecting nothing but the years'' quiet dust, the can and the folder in the drawer, the wall''s biography matched and known, and the household in the room, unaware of the texture entirely, which is the patterned wall''s finest achievement, same as the flat one''s and the plaster one''s, because the finishing library''s three traditions all end at the same quiet, and the reader who has walked them all carries the whole American interior in one image, at rest, and kept.

## The renovation''s honesty, one final note

The maintenance article''s final note is the renovation''s, because the texture''s era question arrives eventually at every patterned house: the household that removes the texture inherits the flat wall''s whole discipline, the level''s requirements and the light''s honesty, which the pattern was forgiving all those years, and the household that keeps the texture inherits the can and the folder''s quiet economy instead, and both inheritances are honest and priced. The renovation that understands the trade-off chooses its wall''s tradition with its eyes open, and the maintenance article''s counsel is simply the series''s last honesty, stated for the pattern: keep what is kept well, change what is changed honestly, and file the wall''s story either way, because the folder outlasts both the pattern and the fashion that replaced it.

## The very last word, the tradition''s own

The US spray texture topic closes, and the tradition''s own last word is its friendliest: the texture is the people''s finish, the aisle the household can actually use, the can that works, the cardboard that teaches, and the pattern that forgives, and the library''s whole authority stands behind the smallest of its topics with the same honesty it gave the largest, because the quiet wall is the quiet wall whatever its finish wears, and the reader who holds the can, the folder, and the twenty minutes a year holds the pattern''s whole American century in a drawer, and the walls, patient as always, keep the house''s quiet, one more finish, one more decade, one more kept wall.

## The household''s closing arithmetic

The closing arithmetic, one last time, priced honestly: the can, a few dollars, the cardboard, free, the folder, free, the walk, twenty minutes a year, the practice, an afternoon once, and the patterned wall''s decades, quiet, matched, and cheap, against the alternative''s corrections, the re-sprayed sections and the failed matches and the renovation that the unfiled pattern eventually schedules. The texture''s maintenance is the smallest in the entire American finishing library, and its requirements are the library''s whole creed in miniature, name the pattern, practice the can, keep the file, walk the wall, and the household that keeps the creed keeps the pattern, and the pattern keeps the house''s quiet, and the quiet is the last word, and the topic, and the tradition''s own.

## The last of the last words

The topic''s truly final paragraph, and the US library''s friendly close, is the tradition''s own summary, one sentence that the whole texture library has been building toward: the patterned wall is the kept wall, and the kept wall is the file, the can, and the twenty minutes, and the household that holds the three holds the quiet, and the quiet, the finishing library''s whole subject from its first article to this one, is the American interior''s whole inheritance, wall by wall, finish by finish, and the reader who has walked the library''s walls with this series holds the quiet''s whole philosophy in a single habit, and the walls of the reader''s own house are waiting, at the doorway''s distance, in the evening''s light, for the walk that keeps them, and the walk is free, and the light is on, and the tradition, patient as its patterns, keeps its quiet, and hands it forward.

## References
1. Homax, *Homax Products: Wall Repair and Texture Solutions*.
2. Homax, *Pro Grade Knockdown Wall Texture, Water Based, 25 oz*.
3. DAP, *2 In 1 Wall and Spray Texture*.
4. USG, *SHEETROCK Brand Wall and Ceiling Spray Texture*.
5. Gypsum Association, *Recommended Levels of Finish for Gypsum Panel Products, GA-214-2022, Quick Reference Guide*.$wallarticle5$, 'maintenance', 10)

) AS a(slug,title,excerpt,content,theme,read_time_minutes)
JOIN public.learn_wall_finishing_topics t ON t.market_code='US' AND t.candidate_key='assembly:us-interior-spray-textures'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
WHERE NOT EXISTS (SELECT 1 FROM public.learn_articles existing WHERE existing.slug=a.slug)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='US' AND t.market_code='US'
  AND t.candidate_key='assembly:us-interior-spray-textures'
  AND a.wall_topic_id=t.id AND a.wall_market_code='US' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en'
  AND a.slug IN ('us-interior-spray-textures-overview', 'us-interior-spray-textures-materials', 'us-interior-spray-textures-installation', 'us-interior-spray-textures-quality-checks', 'us-interior-spray-textures-maintenance-repair');

COMMIT;
