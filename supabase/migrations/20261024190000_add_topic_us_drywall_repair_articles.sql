-- Fifth researched-candidate topic for US: drywall repair and patching.
-- The topic is registered as verification_status='candidate' (schema gate: only an
-- authenticated admin can promote it to 'verified' via the admin console).
-- Articles remain drafts; publication/review gates are not bypassed.
-- Apply 20261024000000_global_wall_finishing_knowledge_library.sql first.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='US' AND candidate_key='assembly:us-drywall-repair-patching') THEN
  INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type,verification_status)
  VALUES ('US','assembly:us-drywall-repair-patching','Drywall repair and patching','finish_assembly','candidate');
END IF; END $$;

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,mp.default_language
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON true
JOIN public.market_profiles mp ON mp.country_code=t.market_code
WHERE t.market_code='US' AND t.candidate_key='assembly:us-drywall-repair-patching'
ON CONFLICT(topic_id,theme_key,language_code) DO NOTHING;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Gypsum Association, GA-225-2019, *Repair of Fire-Rated Gypsum Panel Product Systems*', 'https://www.americangypsum.com/sites/default/files/2022-01/ga-225_repair_of_fire-rated_gypsum_board_systems.pdf', 'Gypsum Association', 'Citation for repair procedures dictated by the severity of damage, from small-hole patching to replacement of large areas in fire-rated assemblies.'),
  ('Gypsum Association, *Storms and Flooding: Gypsum Association Technical Resources*', 'https://gypsum.org/hurricanes-and-flooding-gypsum-association-technical-resources/', 'Gypsum Association', 'Citation for replacement requirements for gypsum panels exposed to flood waters and sewage.'),
  ('National Gypsum, *Fire-Rated Wall Repairs: Maintaining Safety Best Practices*', 'https://www.nationalgypsum.com/ngconnects/blog/fire-resistance/fire-rated-wall-repair-best-practices', 'National Gypsum', 'Citation for fire-rated wall repair practices, including patch piece sizing and fastening to framing.'),
  ('DAP, *Patch and Repair Products*', 'https://www.dap.com/products/patch-repair', 'DAP', 'Citation for spackling compounds and wall repair patch kits for small to medium drywall repairs.'),
  ('DAP, *Spackling 101*', 'https://www.dap.com/resources/how-to/spackling-101/', 'DAP', 'Citation for the distinction between spackling compound and joint compound and their appropriate repair uses.'),
  ('3M, *Patch Plus Primer Wall Repair Kit, PPP-Kit*', 'https://www.3m.com/3M/en_US/p/d/v000315659/', '3M', 'Citation for primer-enhanced spackling products for drywall, plaster, stucco, and wood repairs.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='US' AND t.candidate_key='assembly:us-drywall-repair-patching'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'US','US',t.id,a.theme,'en','draft'
FROM (VALUES
  ('us-drywall-repair-overview', 'Drywall Repair and Patching in the United States: Overview', 'A US-focused overview of drywall repair: the severity taxonomy from nail holes to panel replacement, the materials that match each class, and the moisture and fire-rated boundaries that end improvisation.', $wallarticle1$# Drywall Repair and Patching in the United States: Overview

Drywall repair is the most democratic skill in the finishing trades, the one every homeowner attempts and every building eventually needs, and it rewards a single idea more than any other: match the repair to the damage. The American industry has organized its repair guidance around severity, and the Gypsum Association''s repair literature says it plainly, the procedures should be dictated by the severity of the damage, from the doorknob hole patched in an afternoon to the large-area replacement that restores a fire-rated assembly. This overview introduces the repair system as the industry presents it: the damage classes, the materials and sequences that serve each, the two boundaries, moisture and fire-rating, that professional judgment exists to hold, and the repair culture in which the well-matched fix disappears and the mismatched one returns.

## The severity taxonomy, the repair trade''s map

The repair map begins with the damage''s honest classification. The pinholes and nail holes of the moving-picture wall, the small dents and the hairline cracks of the settling house, belong to the spackling class, the lightest fills the aisle offers. The doorknob punctures and the medium holes belong to the patch class, the self-adhesive screens, the patch kits, and the repair clips that bridge a gap up to the palm''s width. The larger damage, the foot-through-the-ceiling class, belongs to the piece class, a squared opening, a fitted replacement panel, and backer strips or framing that give the new gypsum the fastening the old board lost. And the wholesale damage, the water events and the fire-rated penetrations, belongs to the assembly class, where the repair is a construction project governed by the fire-rated literature and the moisture rules rather than by the spackle aisle at all. Each class has its own materials, its own sequence, and its own skill ceiling, and the repair that succeeds is almost always the one that started by naming its class honestly.

## Why drywall forgives, and why it sometimes does not

Gypsum board is famously repair-friendly, and the forgiveness is structural: the material is flat, the fills are compatible, and the finish chain of compound and paint hides almost anything the substrate can support. The forgiveness ends at the system''s two absolutes. The first is moisture: gypsum that has been wet is no longer gypsum in the engineering sense, and the association''s flood guidance is explicit that panels exposed to flood waters or sewage must be replaced, because the contaminants and the lost strength live in the board itself. The second is the fire-rated assembly: the wall or ceiling that carries a rating carries it as a system, and the repair that restores it must restore the system, the thickness, the fastening, and the joints, per the fire-rated repair literature, or the building''s protection is a paint job over a hole in its fire story. Between the two absolutes lies the ordinary repair economy where skill and patience are the whole ticket.

## The repair philosophy: restore to the level

The series''s drywall articles have treated the levels of finish as the wall''s identity, and the repair inherits the idea: a patch succeeds when it restores the surface to the level the room''s light and paint expect, no more and no less. The spackled pinhole restores the Level 4 wall''s quiet, the taped patch restores the joint-free plane, and the replaced panel restores the full assembly including its finish level, and the repair that aims at the wrong target, the over-built patch on the concealed wall, the under-built fill under the gloss, spends its money in the wrong direction both times. The repair is the maintenance face of the level system, and the reader who knows the wall''s level repairs to it by name.

## The documents that govern, a short shelf

The repair literature is unusually accessible. The Gypsum Association''s repair recommendation for fire-rated systems is the professional''s reference, severity-matched procedures with the assembly''s integrity as the goal. The manufacturers'' repair products, the patch kits and spacklings of DAP''s and 3M''s aisles, publish their own instructions, and the distinction they teach, the spackling-versus-compound distinction, is the homeowner''s most useful single lesson: spackling dries faster and shrinks less, made for the small fills, while joint compound carries the wider coats and the taping the larger repairs demand. The fire-rated literature from the manufacturers, National Gypsum''s repair practices among them, completes the shelf for the assembly-class repairs. The whole library costs an afternoon to read and repays decades of use.

## The repair culture: matched, primed, textured, honest

The American repair culture, at its best, has four habits. Match the repair''s class to the damage''s severity, and the materials to the class. Prime the repair, because fresh fill against aged paint is the flash the next coat will publish. Match the texture, because the orange-peel field around the flat patch is the repair the light announces daily. And be honest at the boundaries, water and fire, where the repair becomes a replacement and the professional becomes the right call. The articles that follow take these habits in execution order, the materials aisle, the field sequences by damage class, the quality checks that catch the returning crack, and the maintenance that keeps the small repairs small.

## What this overview asks of the reader

Classify before you buy. That is the overview''s entire request: look at the damage honestly, name its class, read the instructions its class calls for, and then repair with the confidence the classification buys. The repair culture''s failures are almost all classification failures, the spackle asked to bridge a gap, the mesh patch asked to carry a texture it was never shaped for, the soaked panel painted instead of replaced, and the overview''s job is to make the reader''s first look the right one, because in the repair trades the first look is the whole game.

## The economics: repairs are cheap, replacements are not

The repair economy deserves its own paragraph because it is the homeowner''s whole case for the skill: the small fill costs cents and minutes, the bridged patch costs a kit and an afternoon, the piece repair costs a sheet and a day, and the assembly-class repair, when it is needed, costs the professional''s invoice and the building''s schedule, and the whole ladder''s price gradient is the argument for classifying honestly at the bottom. The misclassified repair does not save money, it moves money up the ladder, the spackle that fails twice becomes the kit, the kit that bridges a piece-class hole becomes the piece, and the piece that paints a moisture event becomes the demolition, and the reader who names the class the first time pays the class''s price once. The repair trade''s economics reward the first honest look, and the first honest look is free.

## The DIY boundary, drawn honestly

The overview should also draw the do-it-yourself boundary honestly, because the repair trades are the homeowner''s gateway and the industry''s literature respects the distinction: the fill, the bridge, and the plain piece are within the careful homeowner''s reach, and their manufacturers write the instructions at exactly that reader''s level, the kits assuming the first-timer and the spackling''s indicator assuming no experience at all. The boundary crosses with the assembly, the fire-rated wall, the water event, the ceiling''s structure, and the recurring crack''s diagnosis, and the industry is equally clear on that side, the fire-rated literature and the flood guidance are written for professionals, and the homeowner who reads them correctly reads them as a referral. The honest line between the two is the most valuable sentence this overview can give its reader.

## A note on ceilings and the gravity of repairs

One more honest note, because the repair taxonomy changes with orientation: the ceiling repair works against gravity and above the head, and the sagging fill, the falling patch, and the dripping compound are the ceiling''s special failure modes, the trade answers with the setting compounds and the thin coats and the staging the ceiling demands, and the homeowner''s ceiling repair is the class where the professional''s speed is worth the invoice. The reader who patches a ceiling should patch it in the thin coats the gravity forgives, and the reader who hesitates has read this paragraph correctly.

## Reading the damage honestly, the overview''s first skill

The overview''s practical skill is the damage''s honest read, taught in three questions. What class is this, fill, bridge, piece, or assembly, judged by the gap''s width and the gypsum''s condition rather than by the wall''s urgency? What boundary does this touch, a rated assembly, a wet cavity, a ceiling''s structure, any of which turns the repair into a referral? And what finish does this wall wear, the level and the texture the repair must restore, read from the room''s light before the repair''s materials are chosen? Three questions, a minute with the flashlight, and the repair project begins with the classification the whole series depends on, which is the overview''s whole content and its only homework.

## What the overview has not promised

The honest overview also states what it has not promised: the repair series will not make the reader a taper, a plasterer, or a fire-rated assemblies specialist, because the repair''s four classes have four different ceilings and the series''s ambition is the honest repair within the reader''s reach and the honest referral at its edge. What the series promises is the classification, the sequence, and the finish''s three steps, and the reader who holds those three owns the repair culture''s whole toolkit, because the trade''s excellence, in the repair aisle, is mostly the discipline of matching the small work to its right size, and the discipline is teachable in an afternoon, which is what this overview is.

## The reader''s portable summary

Because the overview is the article the household will actually share, its portable summary deserves its own lines: name the class, fill, bridge, piece, assembly, before touching the wall. Read the boundaries, fire-rating and water, as the professional''s two flags. Buy the class''s materials, prime the repair, match the texture, and paint the whole surface honestly. And write the repair in the file, because the returning crack''s second fill begins at the first fill''s page. Four lines, the repair culture''s whole creed, and the overview has done its job when the reader can recite them at the wall, before the hardware store, with the flashlight already in hand.

## Closing the overview with the industry''s own sentence

The overview closes by returning the industry''s own sentence to the reader, because the Gypsum Association''s repair literature states the entire philosophy in seven words, and they deserve the last word here: the procedures should be dictated by the damage. Every class, every sequence, every boundary in this series is that sentence elaborated, and the reader who carries it to the wall carries the whole repair culture, its classification, its discipline, and its honest limits, in a pocket-sized creed that costs nothing and saves the most expensive mistake the aisle knows, the wrong repair on the right wall.

## References
1. Gypsum Association, GA-225-2019, *Repair of Fire-Rated Gypsum Panel Product Systems*.
2. Gypsum Association, *Storms and Flooding: Gypsum Association Technical Resources*.
3. National Gypsum, *Fire-Rated Wall Repairs: Maintaining Safety Best Practices*.
4. DAP, *Patch and Repair Products*.
5. DAP, *Spackling 101*.
6. 3M, *Patch Plus Primer Wall Repair Kit*, PPP-Kit.$wallarticle1$, 'overview', 10),
  ('us-drywall-repair-materials', 'Materials for US Drywall Repair and Patching', 'A US-focused guide to the repair aisle: spacklings and patch kits for small holes, tapes and compounds for patches, backer strips and replacement board for large damage, and the primers that make repairs vanish.', $wallarticle2$# Materials for US Drywall Repair and Patching

The drywall repair aisle is the finishing trades'' friendliest shelf, and its friendliness hides its one law: every product is made for a damage class, and the repair succeeds at the shelf before it succeeds at the wall. This article walks the aisle by severity, from the spackling tubes to the replacement panels, with the manufacturers'' own guidance as the shelf''s labeling, and the primers and textures that make the finished repair disappear.

## Spackling: the small-fill family

The small-fill family begins the aisle, and its chemistry is designed against the small repair''s enemies, shrinkage and waiting. Spackling compounds, the manufacturers'' guidance explains, dry faster and shrink less than joint compound, which is exactly why they are the small repair''s material: the nail hole and the hairline crack want a fill that can be sanded and painted the same day, and the aisle''s innovations, the dry-time indicators that turn white when the fill is ready, the primer-enhanced formulations that skip a step honestly, serve the small repair''s pace. The family''s limit is structural, the spackling fills, it does not span, and the hole wider than the fill''s honest depth is the next class''s job.

## Patch kits, screens, and clips: the bridge family

The bridge family serves the medium hole, the doorknob puncture and the anchor blowout, and its products carry the repair across the gap. The self-adhesive patch screens and tapes give the fill its reinforcement, the repair clips give the replacement piece its backing inside the wall, and the complete kits, the aisle''s DAP and 3M offerings among them, bundle the components the medium repair needs, screen, compound, knife, and abrasive, with instructions that assume the reader is a first-timer. The family''s discipline is the sizing honesty, the kit''s screen larger than the hole by the margin its instructions state, the compound applied in the thin coats the shrinkage demands, and the family''s ceiling is the palm''s width, the size at which the gap wants a piece of gypsum rather than a bridge of mesh.

## Tapes and compounds: the finish chain''s own

The larger patch joins the wall through the finish chain''s materials, the joint tapes, paper and mesh, and the joint compounds, drying and setting, that this series''s installation articles have already introduced, and the repair aisle simply stocks them in smaller containers. The repair''s compound choice follows the damage''s speed: the setting compounds for the deep fills and the same-day sequences, the all-purpose drying compounds for the patient feathering the finish level wants, and the tapes follow the repair''s geometry, mesh with setting compound at the patch''s perimeter, paper bedded in compound where the strength of the joint matters. The repair that uses the finish chain''s materials correctly inherits the finish chain''s quality, which is the whole idea.

## Backer strips, replacement board, and the piece family

The piece family serves the large damage, and its materials are the wall''s own: replacement gypsum board in the thickness the wall wears, backer strips, the wood or gypsum backers that carry the new piece''s edges inside the opening, and the fasteners the original installation used. The repair clips from the piece family''s lighter end give the mid-size opening its backing without the stud-to-stud cutting, and the family''s specification for the fire-rated wall, where the literature requires the patch to engage the framing, is the boundary between the homeowner''s project and the professional''s, drawn by the assembly''s rating rather than by the hole''s size. The piece family''s honesty is the fit, the opening squared, the piece fitted, the gaps the tape can bridge rather than the gaps the compound is asked to fill.

## Primers: the repair''s invisibility policy

The primer deserves its own paragraph because it is the repair''s most skipped material and the difference between the repair that vanishes and the repair that flashes. The fresh compound and the new board absorb paint differently from the aged field, and the unprimed patch publishes itself at every angle of light as the duller or the brighter spot, and the aisle''s answers, the primer-enhanced spacklings and the spot primers the coating systems provide, exist to equalize the porosity before the finish coat counts on it. The repair''s prime is the two-minute step that protects the hour the repair took, and the maintenance file''s repaint history is the evidence the primer''s defenders cite.

## Textures and finishes: matching the field

Where the damaged wall wore a texture, the repair''s materials include the texture''s match, the spray textures in the orange-peel and knockdown families the aisle stocks in aerosol and jug form, the matching compounds for the hand-applied patterns, and the practice surface, cardboard, where the texture''s density is dialed before the wall is committed. The texture match is the repair''s public face, the doorknob hole perfectly filled under the orange peel that reads wrong at the room''s distance, and the materials article''s counsel is the practice panel the installation series has recommended everywhere else: the texture is matched on the sample first, and the wall receives the approved pattern, not the experiment.

## The aisle''s one-sentence summary

The repair aisle, summarized for the buyer in a hurry: spackling for the fills, kits and screens for the bridges, tapes and compounds for the joints, backers and board for the pieces, primer for the invisibility, texture for the match, and the fire-rated and flood literature for the boundaries the aisle does not serve. One sentence, read before the drive to the store, and the repair project buys its success at the shelf where the prices are small, rather than at the wall where the prices compound.

## The tools: few, honest, and owned

The repair aisle''s tools are the finishing chain''s smallest set: the putty knife in its two or three widths, the sanding blocks in their fine grades, the utility knife that squares and trims, the dust mask and the drop cloth, and the light, the honest raking light, that reveals the plane the fingertips miss. The kits bundle the essentials thoughtfully, and the tool''s whole philosophy is the thin coats'', the knife that flexes, the abrasive that finishes rather than scratches, and the light that tells the truth. The repair tool kit costs less than the professional''s one visit and serves the building''s lifetime, and the steward who owns it and the file''s habit has bought the repair culture''s whole independence.

## Storage and shelf life: the aisle''s quiet chemistry

The repair materials are perishable like everything in this series: the spackling dries in its opened tub, the compounds hydrate in their bags, the aerosol textures lose their pressure, and the primers freeze in the garage''s winter. The repair shelf lives inside, sealed, dated, and inventoried in the file''s page, because the repair that is needed is needed at once, and the material that is dead when the repair arrives is the repair''s first delay. The steward''s repair shelf is the maintenance calendar''s insurance, and its freshness is the habit that keeps it honest.

## The kit''s honest arithmetic, for the buyer in a hurry

The aisle''s summary arithmetic, one more time: the small repair buys the spackling and the fine abrasive, the medium buys the kit or the screen and the clips, the piece buys the board and the backers and the finish chain''s smallest containers, and the primer is bought for all three, and the texture for the textured fields, and the practice cardboard costs nothing. The buyer who shops by class spends twenty dollars and one trip, and the buyer who shops by hope spends three trips and buys the piece-class materials for the fill-class hole, and the aisle''s whole economics is the classification''s, one final time, at the shelf where it is cheapest.

## The fire-rated aisle, and why it is short

The materials article''s last shelf deserves its honest paragraph: the fire-rated repair''s aisle is deliberately short, the matching board in the assembly''s thickness and type, the fastening per the listing''s schedule, the joint treatment per the rating''s details, and the professionals'' literature rather than the consumer''s kits, because the rated wall''s repair is a construction specification, not a shelf project. The homeowner reads the aisle''s shortness correctly, as a referral, and the owner''s materials decision at the fire boundary is the phone call rather than the product, and the aisle''s honesty is the association''s literature, which is why this article cites it in every class''s paragraph the boundary touches.

## The matching of the repair''s paint, a materials footnote that matters

The paint match deserves its final footnote, because the repair''s last material is the finish the room already wears: the file''s record of the paint''s brand, color, and sheen, or the honest cutting of the largest sample the wall can give, is the material that turns the repair''s coat into the room''s coat. The touch-up that guesses the color buys the second repair at the paint counter, and the repaint that knows the batch dissolves the patch in one honest coat, and the file''s paint page is therefore the repair aisle''s last and least expensive material, stocked in the drawer rather than on the shelf, and cited here because nobody else will.

## The substrate''s preparation materials, the aisle''s unglamorous half

The repair''s preparation materials complete the shelf and deserve their unglamorous paragraph: the utility blades that square and trim, the sanding sponges that conform to the corners the flat blocks miss, the tack cloths and the vacuum attachments that keep the dust out of the finish''s future, the drop cloths that keep the dust out of the household''s present, and the containment sheets and the masking that the textured ceilings and the occupied rooms demand. The preparation aisle is the repair''s politeness, and the household that remembers the drop cloth remembers the repair fondly, and the shelf''s last recommendation is therefore social rather than technical, and the trade''s oldest counsel is to honor it.

## What the aisle cannot sell, and the article''s honest close

The materials article''s honest close names what the shelf cannot sell, because the repair''s most important materials are not products: the classification, taught by the overview, the patience, taught by the chemistry''s drying times, the light, borrowed from the trade''s habits, and the file, built by the household''s discipline. The aisle supplies the chemistry and the fiberglass, and the wall''s success supplies the rest, and the buyer who reads this series has already bought the parts the store will never stock, which is why the repair culture is the finishing trades'' friendliest economy, the materials cost twenty dollars and the expertise costs an article, and both prices are honest.

## References
1. DAP, *Spackling 101*.
2. DAP, *Patch and Repair Products*.
3. 3M, *Patch Plus Primer Wall Repair Kit*, PPP-Kit.
4. Gypsum Association, GA-225-2019, *Repair of Fire-Rated Gypsum Panel Product Systems*.
5. National Gypsum, *Fire-Rated Wall Repairs: Maintaining Safety Best Practices*.$wallarticle2$, 'materials', 10),
  ('us-drywall-repair-installation', 'Repairing Drywall in the United States: Sequences by Damage Class', 'A sequenced US field guide to drywall repair: the small fill, the bridged patch, the backed piece, and the fire-rated assembly, each with its honest sequence, priming discipline, and texture match.', $wallarticle3$# Repairing Drywall in the United States: Sequences by Damage Class

The repair field guide is four sequences, not one, and the craft is choosing the right one. The small fill takes minutes, the bridge an afternoon, the piece a day, and the assembly-class repair a professional''s schedule, and each sequence has its own honest steps that the manufacturers'' instructions and the association''s literature write down. This article walks all four, in the order of the damage taxonomy the overview drew.

## Sequence one: the small fill

The small fill begins with preparation, the loose paper trimmed, the dust wiped, the crack opened slightly so the fill has a key. The spackling goes on in the thin coats its chemistry prefers, pressed into the fill with the knife''s blade, drawn flush with the field, and dried per the product''s indicator, and the light sanding that follows brings the fill to the plane with the gentlest abrasive the aisle sells. The sequence ends at the primer for the fills the paint will read, and the two-coat patience the small fill''s shrinkage sometimes demands, and the wall that receives this sequence honestly forgets its nail holes in a morning.

## Sequence two: the bridged patch

The bridged patch serves the medium hole, and its sequence honors the bridge. The opening''s edges are cleaned and squared enough for the screen''s bond, the self-adhesive patch or the kit''s screen is placed over the hole with the overlap its instructions state, and the compound is applied through and over the mesh, the first coat pressing the compound through the bridge''s weave, the later coats feathering wider until the patch''s geometry disappears into the plane. The repair clips serve the openings that want backing inside the wall, the replacement piece held by the clips'' flanges and finished through the same compound chain, and the sequence''s end is the prime and the texture match the field around it wears. The bridged patch''s failure mode is the skipped feathering, the patch''s edge read as a plate under the paint, and the sequence''s patience at the wide coats is the whole difference between the invisible repair and the badge.

## Sequence three: the backed piece

The piece sequence is a small construction project, and its steps are the wall''s own in miniature. The damage is squared into a clean rectangle, the backer strips are placed inside the opening and fastened through the wall''s face, the replacement piece is fitted to the opening''s tolerance and screwed to the backers, and the joint chain follows, tape bedded over the perimeter, coats feathered wide, fastener heads filled, until the piece reads as the wall it joined. The fire-rated wall adds the literature''s requirements, the patch sized to engage the framing per the manufacturers'' fire-rated repair guidance, the assembly''s thickness and fastening restored, and the joints treated per the rating''s details, and the reader whose repair crosses a rated assembly has crossed into the professional''s sequence whether the hole looked big or not. The piece sequence''s product is the wall''s own standard, and its test is the raking light the closeout brings.

## Sequence four: the assembly-class repair

The assembly-class repair, the water event and the fire-rated breach, begins where the spackle aisle ends. The moisture-damaged assembly is opened to its honest extents, the wet materials removed per the association''s guidance, flood-exposed panels replaced rather than dried by hope, and the cavity inspected, dried, and closed with the vapor logic the building''s climate wants. The fire-rated repair follows the severity-based procedures the GA literature provides, the patching of the small holes and the replacement of the large areas, each restoring the assembly''s listed construction, and the reader standing before either damage is standing at the boundary this series has drawn from its first article: the building''s systems are not do-it-yourself territory, and the repair that respects them hires the trade that reads their documents.

## Priming, texturing, and the finish''s honesty

Every sequence ends in the same three steps, and they deserve their own paragraph because they are the most skipped. The repaired surface is primed, the porosity equalized, the flash prevented. The texture, where the field wore one, is matched on the practice panel and applied to the repair''s area, the pattern''s density read at the room''s distance. And the finish coat is applied to the whole surface between the room''s honest breaks, because the touch-up that paints only the patch is the repair the light reads as the patch, and the repaint that paints the whole wall is the repair the file records as the room''s renewal. The three steps are the repair''s public success, and they cost minutes.

## The returning crack, and the repair''s second look

The field guide''s last honesty is the repair that returns, the crack that reopens, the patch that telegraphs, and the professional''s response is diagnostic rather than cosmetic: the returning crack is the building''s movement, the framing''s story, the structural question the cosmetic was asked to cover, and the repair that returns is the wall''s testimony that the diagnosis was skipped. The sequence at the second look is the same, classify honestly, correct the cause, repair to the level, and the reader who repairs a returning crack twice without diagnosing once has met the repair trade''s oldest teaching in its plainest form.

## The texture''s practice panel, the sequence''s rehearsal

Because the texture match is the repair''s most visible challenge, the field guide''s closing operational note is the rehearsal: the aerosol or the mixed texture is tested on cardboard, the pattern''s density dialed by distance and duration, the knockdown''s timing practiced on the sample, and the approved panel held beside the wall until the match reads at the room''s distance. The rehearsal costs ten minutes and a piece of cardboard, and the texture that skipped it is the repair the whole room reads as the repair, which the practice panel prevents for the price of nothing. The repair sequences have all been honest about their steps, and the rehearsal is the texture''s only step that never appears in the aisle''s instructions, because it is the trade''s habit rather than the product''s, and the field guide''s job is to hand the trade''s habits to the reader.

## Coordination and the painted room''s honest schedule

The repair sequence ends in the paint, and the painted room''s schedule deserves the field guide''s last practical note: the repair, the prime, and the finish coat belong to one weather and one weekend, because the half-finished repair, primed and untopcoated, is the room''s badge in primer''s color, and the repaired patch left through the winter is the wall''s unfinished sentence. The household that batches its repairs and paints them honestly, the fills and bridges of a Saturday, the prime and the coats of the next, keeps its walls at the level its rooms expect, and the household that repairs in passing and paints eventually lives with the light''s daily testimony, which the sequence exists to prevent.

## The sequence''s product, one closing image

The field guide''s closing image is the repair''s success, seen plainly: the wall under the room''s own light, at the angle the morning takes, reading as one surface, the fill gone, the bridge gone, the piece gone, the texture continuous, the paint continuous, and the file holding the whole story in a page nobody will need until the next repair begins where this one ended. Every sequence in this guide, the fill''s minutes, the bridge''s afternoon, the piece''s day, the assembly''s professional schedule, ends at that image, and the reader who holds it while the compound dries understands the repair trade''s whole motivation: the wall''s silence, restored honestly, kept cheaply, and passed forward with its story written down.

## A word to the first-timer, from the field guide

The field guide''s last audience is the reader holding their first kit, and its last counsel is the trade''s kindness: the repair forgives the beginner exactly as much as the beginner follows the box, the thin coats and the drying times and the feathering widths are printed on the products precisely because everyone was once at this page, and the first repair''s honest result, a little proud, a little shy of the level, is the tuition the second repair repays. The kits were engineered for this reader, the instructions were written for this reader, and the field guide''s whole architecture exists so this reader''s wall reaches the room''s silence on the second Saturday rather than the fifth, and the trade''s welcome mat is the practice cardboard, free, and the light, honest, and already on.

## The half-inch question, when the patch is a piece of the building

The field guide''s last diagnostic caution is the depth question, because the repair sometimes reaches past the gypsum into the building: the hole that shows the plumbing, the crack that tracks the truss, the water stain that reads the roof, and the sequence''s honest response is the pause the overview''s classification taught, the professional''s question asked before the compound opens. The repair trade''s best-kept secret is that its most valuable skill is the diagnosis, and the field guide''s sequences serve the diagnosis''s aftermath, and the reader who repairs only what the diagnosis approved has kept the whole series''s discipline, and the wall, and the building, and the plumbing, all in one honest pause.

## The dust''s discipline, and the household''s peace

The last operational note belongs to the dust, because the repair''s most resented cost is the household''s: the sanding''s powder, the texture''s overspray, and the cutting''s debris are managed with the containment the preparation aisle sells and the sequence''s discipline deploys, the cloths laid before the first knife''s pass, the vacuum held at the sanding''s edge, the masking shielding the fixtures'' and the floors'' finishes, and the room returned to the household as it was found, minus the damage. The repair that respects the house''s air and the household''s peace is the repair the household will permit again, and the trade''s best reputation in the home is the drop cloth''s, and the field guide commends it as highly as any technique in this article.

## The ceiling''s sequence, written against gravity

Because the overview flagged the ceiling, the field guide owes it its closing sequence: the overhead repair works in the thin coats the gravity forgives, the setting chemistry that stiffens before the sag, the staging that brings the body to the work without the arm''s exhaustion, and the patience that gives the ceiling more coats and more drying than the wall ever needed. The ceiling patch that sags was asked for its coats too thickly, and the ceiling repair that holds was given its coats honestly, and the reader who patches overhead with the same materials and half the material per pass has understood the ceiling''s single lesson, and the field guide''s last sequence closes with the trade''s most literal example of the thin coat''s philosophy.

## References
1. Gypsum Association, GA-225-2019, *Repair of Fire-Rated Gypsum Panel Product Systems*.
2. National Gypsum, *Fire-Rated Wall Repairs: Maintaining Safety Best Practices*.
3. DAP, *Patch and Repair Products*.
4. 3M, *Patch Plus Primer Wall Repair Kit*, PPP-Kit.
5. Gypsum Association, *Storms and Flooding: Gypsum Association Technical Resources*.$wallarticle3$, 'installation', 10),
  ('us-drywall-repair-quality-checks', 'Quality Checks for Drywall Repairs in the United States', 'A US quality-control guide for repairs: reading the raking light, catching the flash and the badge, the fire-rated and moisture boundaries, and the records that keep repairs from returning.', $wallarticle4$# Quality Checks for Drywall Repairs in the United States

Repair quality control is the raking light and the honest boundary. The repair that passes is the one the room''s light cannot find, and the repair that fails is the one the light announces daily, and between them sits the small program this article describes: verify the class, verify the sequence, verify the finish, and hold the two boundaries, moisture and fire-rating, that no cosmetic can cross. The program''s instruments are the light, the fingertip, the straightedge, and the file, and its findings are honest because the repair''s defects, unlike the assembly''s, are all visible if anyone looks.

## The three questions before the repair counts

The repair''s acceptance asks three questions. Does the plane read true, the fill flush with the field, the patch''s feathering invisible to the straightedge and the raking light? Does the surface match, the texture''s density right at the room''s distance, the sheen uniform after the prime, the color continuous after the finish? Does the repair hold, the fill sound under the fingertip, the tape''s edges quiet, the crack''s history closed? The repair that answers yes three times has restored the wall''s level and the room''s quiet, and the repair that answers no is telling its class''s truth, the skipped feathering, the skipped primer, the skipped diagnosis, and the honest program reads the answers as instructions rather than as arguments.

## The defect catalog, small but honest

The repair''s defects are few and readable. The badge, the patch''s edge telegraphing under the light: the feathering too narrow, the class under-chosen, corrected by the wider coats the sequence describes. The flash, the repair''s porosity reading through the paint: the skipped prime, corrected by the two minutes the primer costs. The shrinkage pit, the fill''s dimple after the coats: the fill applied too thick, corrected by the thin coats the product''s chemistry asks. The returning crack, the repair''s most honest defect: the cause undiagnosed, corrected by the second look the field guide describes. The texture mismatch, the field''s pattern broken by the repair''s: the skipped practice panel, corrected on the next repair and lived with, honestly, on this one. The catalog''s lesson is the overview''s: every defect names a skipped step, and the repair that follows its sequence meets none of them.

## The two boundaries, held without exception

The repair program''s boundaries are the series''s absolutes, stated once more because the repair trades meet them most often. The moisture boundary: wet gypsum is replaced, not painted, the flood-exposed panel is removed per the association''s guidance, and the cosmetic that covers the stain is the demolition the file schedules. The fire boundary: the rated assembly is repaired to its listing, the severity-matched procedures of the fire-rated literature, the patch engaging the framing, the joints restored, and the handyman repair on a rated wall is the building''s protection quietly cancelled. The program that holds both boundaries is the program the building''s insurers and inspectors trust, and the program that negotiates them is the program the failures photographed.

## The file, even for the small repairs

The repair file is the series''s last habit, and it earns its paragraph here because repairs are where buildings'' files die. The repair''s date, its class, its materials, its paint batch, the texture''s match and its practice results, written on the file''s page in the five minutes the closeout takes, and the building''s next repair, its next repaint, and its eventual steward all read the page and work from knowledge. The repaired wall that is filed is the wall whose repairs stop returning, because the returning crack''s second repair begins at the first repair''s page, and the diagnosis that page contains is the trade''s whole advantage.

## The five-minute repair walk, for owners

The portable protocol, one final time, in the repair''s own words: bring the room''s light to the wall at its angle, sight the repair''s plane, feel the fill''s sound, read the texture at the distance the room lives at, and check the file''s page. Five minutes, and the repair either testifies to its sequence or confesses its shortcuts, and the owner who can conduct the walk owns the repairs rather than being owned by them, which is the program''s whole gift.

## The sample''s light, and the program''s honest instrument

The repair program''s one instrument deserves its closing paragraph, because it is the only one the article has: light. The repair is a surface story, and the raking light across the patch''s plane, the room''s own light at its own angles, is the program''s entire laboratory, revealing the badge, the flash, the pit, and the mismatch in the five minutes the walk takes. The professionals carry the light because the light is honest, and the owner who borrows the habit from them has borrowed the program''s whole content, which is the quality chapter''s most encouraging sentence: the repair''s quality control is the cheapest in this entire series, and its instrument is free, and its verdicts are accurate, and the wall under the light is telling the truth the whole time.

## The program''s last honesty: some repairs are the wall''s goodbyes

The quality chapter''s final honesty is the diagnosis the program sometimes delivers: the wall whose repairs return and return, whose cracks read the structure''s story, whose water events follow the plumbing''s age, is the wall whose maintenance is a replacement, and the program''s best service is saying so plainly. The repair that cannot succeed is the money the program saves by refusing it, and the professional''s estimate for the honest replacement is the trade''s last gift to the owner the program has served, and the steward who can hear the diagnosis, when it comes, keeps the building''s money on the right side of the wall''s life, which is the program''s quietest and largest economy.

## The program''s three classes, one final reading

The acceptance''s three honest answers, applied to the repair''s small findings, close the program: the cosmetic and stable, the texture''s honest variation, the fill''s whisper at the grazing angle, accepted and recorded, because perfection is not the repair''s deal. The repairable, the badge, the flash, the pit, corrected with the sequence''s own steps while the materials are still on the shelf. And the systemic, the returning crack, the wet story, the rated breach, escalated to the diagnosis and the professional rather than repeated at the wall. The three classes, applied honestly, turn the five-minute walk into the building''s whole repair policy, and the policy''s cost is the walk''s minutes, one final time, which is the quality chapter''s entire economics.

## One last instrument note: photograph the before

The program''s last instrument is the camera, used at the beginning rather than the end: the damage photographed before the repair, the extent and the context recorded, because the repair''s history begins at the damage, and the file''s page reads differently when the first photograph is the hole rather than the finished plane. The before photograph is the diagnosis''s evidence, the recurring crack''s baseline, and the professional''s referral material, and the program that shoots the hole first has written the repair''s whole story in the order it actually happened, which is the file''s only rule and the program''s last habit.

## The repair''s warranty, written by the owner

The program''s closing observation is the repair''s own warranty culture, and it belongs to the file: the repair that is dated, photographed, and recorded carries the only warranty the repair trade actually issues, the evidence that the work was done to the sequence and can be maintained to it, and the second owner, the insurer''s adjuster, and the professional of the next decade all read the same page and price the same wall honestly. The warranty is written by the owner, for the wall, in the five minutes the closeout takes, and it costs the folder and the habit, which the program has been recommending since its first paragraph, one final time, because it is the entire difference between the building that knows itself and the building that rediscovers itself at every repair.

## The light''s last word, and the reader''s own walk

The quality chapter ends as it began, with the light, and its last word is an invitation: the reader who has finished this article owns the five-minute walk, and the walls of their own building are waiting for it, tonight, at the angle the evening takes. The walk is the whole program in motion, the classes read, the boundaries flagged, the file''s pages opened, and the first honest reading of the walls the household lives with is the repair culture''s true beginning, which is the quality chapter''s last teaching and the series''s only assignment, and the light, the honest light, is free, and on, and telling the truth the whole time.

## The program''s one risk, honestly named

The quality chapter''s final honesty names its own risk: the repair program, well learned, can become its own overconfidence, the household that repairs beautifully and diagnoses never, the fifth fill of the crack that needed one professional''s hour. The program''s three honest answers exist precisely against this risk, and the systemic finding''s honest answer is always the escalation, and the walk that ends at the phone call has succeeded exactly as much as the walk that ends at the flawless patch. The repair culture''s confidence is earned at the boundaries as much as at the shelves, and the reader who knows when to stop is the program''s finest product, which is the quality chapter''s closing definition of quality itself.

## The two photographs, before and after, the program''s bookends

The program''s bookends deserve one final, complete statement, because the repair''s file culture begins and ends with them: the before photograph, the damage''s extent and context recorded while the evidence is whole, the diagnosis''s baseline and the professional''s referral material, and the after photograph, the finished plane under the light of record, the sequence''s receipt and the next repair''s starting knowledge. Two frames, a minute apart in the taking and a decade apart in their value, and the wall whose repairs carry both bookends is the wall whose entire history is honest, which is the file''s only ambition and the program''s final product.

## The program''s summary card, for the reader''s pocket

The quality chapter''s final service is the summary card, the program compressed to the pocket''s size and the wall''s: classify the damage before the repair, fill, bridge, piece, assembly. Follow the sequence the class calls for, in the thin coats and the drying times its products print. Prime the repair, match the texture, paint the honest surface. Photograph before and after, date the file''s page, and walk the wall once a year under its own light. Hold the two boundaries, water and fire, as the professional''s flags. Five lines, the whole program, and the reader who carries the card has carried the quality chapter, and the wall under the light has met its keeper.

## References
1. Gypsum Association, GA-225-2019, *Repair of Fire-Rated Gypsum Panel Product Systems*.
2. Gypsum Association, *Storms and Flooding: Gypsum Association Technical Resources*.
3. National Gypsum, *Fire-Rated Wall Repairs: Maintaining Safety Best Practices*.
4. DAP, *Spackling 101*.$wallarticle4$, 'quality', 10),
  ('us-drywall-repair-maintenance-repair', 'The Long View: Keeping Repaired Walls and Preventing New Ones', 'US guidance for the steward: the repaint rhythm over old repairs, the prevention habits that stop the recurring damage, the watch on the water story, and the boundaries where professionals are the maintenance.', $wallarticle5$# The Long View: Keeping Repaired Walls and Preventing New Ones

The maintenance article for a repair topic is really a prevention article, because the repaired wall''s best maintenance is the damage that never happens again, and the series''s steward knows the calendar by heart: protect the touch heights, repaint the whole surfaces, watch the water story, and hold the boundaries. This article closes the drywall repair series with the steward''s long view, the habits that keep the repairs small, the rhythms that keep the surfaces honest, and the honest escalation when the wall''s story crosses the professional''s lines.

## Prevention: the cheapest repairs are the ones never made

The prevention aisle is furniture, not compound: the door stops that keep the doorknob out of the wall, the bumper pads that keep the chair rail out of the corner, the TV mounts'' anchors sized to the wall''s board, the picture rails'' hardware moved honestly rather than the anchors'' holes multiplied. The American wall''s characteristic damage, the doorknob hole and the touch-height dent, is almost entirely preventable, and the steward who spends ten dollars at the hardware aisle spends zero afternoons at the repair aisle, which is the trade''s most honest economy.

## The repaint rhythm, read with the repair file

The repaired wall repaints on the coating''s honest rhythm, and the repair file turns the repaint from archaeology into reading: the repairs'' locations known, their materials known, their primes done, and the repaint''s preparation reduced to the wash, the spot-sand, and the honest decision the file enables, touch-up or whole-surface. The repaint that covers a repaired wall is the repair''s last act of invisibility, the whole-surface coat that finally dissolves the patch''s memory into the room''s renewal, and the file''s page is what lets the painter promise that dissolution and keep the promise.

## The water story, watched at the repairs'' edges

The steward''s watch on the water story concentrates where the repairs have been, because the repair is the wall''s known weakness and the stain''s likely first address: the ceiling patch that discolors again, the baseboard repair that swells, the corner fill that cracks along its old line, each the early testimony the moisture boundary governs. The watch is the annual walk''s first stop, and the response is the program''s absolute, the source found before the cosmetics scheduled, and the wall that is watched at its repairs is the wall whose water story stays boring, which is the whole of the gypsum family''s maintenance law.

## The recurring crack, and the professional''s honest line

The recurring crack deserves the maintenance article''s last diagnostic paragraph, because the steward meets it most often here: the crack that returns each season, filled each time, reading its message through the fill, the framing''s movement, the truss''s lift, the foundation''s story, and the honest response is the escalation the series teaches, the diagnosis before the fourth fill, the professional''s eye on the building''s structure rather than the cosmetic''s hand on the crack''s surface. The line between the steward''s fill and the professional''s diagnosis is the returning itself, and the steward who knows where the line is spends the money at the right side of it.

## The boundaries, in the steward''s calendar

The moisture and fire boundaries live in the steward''s calendar as the two hires the file anticipates: the water event''s remediation contractor, called at the finding rather than after the hope, and the fire-rated repair''s professional, called at the breach rather than after the handyman. The steward''s preparation for both is the file''s pages, the assemblies'' ratings recorded, the materials'' identities kept, and the boundary events'' history honest, because the professional who inherits a filed building repairs it in days and the professional who inherits a mystery excavates it for weeks, and the repair series''s last argument is the same argument the whole library makes, one more time.

## Passing the repairs forward

The repair series closes with the handover''s repair page: the damage history by room, the repairs'' dates and materials, the recurring crack''s diagnosis if it ever came, the repaint''s record, and the prevention hardware''s inventory, all in the folder the building inherits. The wall whose repairs are filed is the wall whose next steward begins from knowledge, and the wall whose repairs are invisible in the light and legible in the file is the series''s finished product, the repair culture''s two-sentence definition of success, gone in the room, known in the drawer.

## The steward''s annual walk, repair edition

The annual walk''s repair stops, gathered for the reader''s calendar: the touch heights, read for the new damage and the old repairs'' sound, the corners and the ceilings, read for the cracks that returned and the stains that moved, the exterior walls'' baseboards, read for the water''s quiet testimony, and the file''s page, written with the year''s findings while they are small. The walk takes twenty minutes, and it is the repair calendar''s whole maintenance program, and the buildings that walk their walls repair in tubes of spackling, and the buildings that do not repair in contracts and projects, and the difference is the twenty minutes, and the twenty minutes are the series''s whole teaching, one more time, in the repair''s own aisle.

## The last word, the ten-dollar habit

The repair series''s last word is its cheapest: the door stop. The damage the wall never takes is the repair the calendar never holds, and the ten dollars of prevention hardware, stops and pads and honest anchors, is the repair budget''s whole margin of safety, and the steward who installs it once keeps the spackling shelf almost unemployed, which is the finest thing a repair article can ever report. The wall''s best repair is the one the door stop prevented, and the file''s blank page where the repair would have been is the maintenance program''s proudest entry, and the series closes on that quiet, saved afternoon, which the reader is welcome to spend anywhere but at the repair aisle.

## The file''s last page, and the series''s last sentence

The repair series''s last page is the file''s, and its last sentence is the maintenance culture''s: the wall that is known is the wall that is cheap, and the wall that is silent under the light and legible in the drawer is the repair trade''s finished product. The reader who keeps the file, walks the walls, stops the doors, and holds the two boundaries has bought the repair culture''s whole independence for the price of a folder and an annual twenty minutes, and the walls, repaired honestly and prevented cheaply, will spend their decades quietly outlasting the fashions that tried to replace them, which is the finest retirement any wall ever earned and the last word this series will spend on them.

## The steward''s last inventory, repair edition

The complete kit, inventoried one final time, is the smallest in this entire series: the prevention hardware, the door stops and pads, the repair shelf, the spackling and the fine abrasive, the primer and the patch kit, the texture''s aerosol and the practice cardboard, the tools, the knife and the light, the file, the paint page and the repair pages and the assembly''s ratings, and the calendar, the annual twenty minutes and the honest referral''s phone numbers. One drawer, one folder, twenty minutes a year, and the walls of the building are kept at their level for the decades the finish chain gave them, and the repair culture''s whole promise, the wall that is silent under the light and known in the drawer, is kept, which is the last word and the series''s quietest success.

## The walls'' long retirement, and the reader''s

The series''s true close is the long view itself: the walls that are stopped, repaired, walked, and filed spend their decades in the quiet the finish chain gave them, and the steward who keeps them spends the same decades spending almost nothing, and the two retirements, the wall''s and the reader''s, are the same economy seen from its two sides. The repair aisle''s products will change names a dozen times over the wall''s life, and the sequences will not change at all, because the sequences are the gypsum family''s physics rather than its marketing, and the reader who learned the physics has learned the permanent part of the trade, which is the series''s whole gift and its only boast.

## A closing kindness to the reader

The series''s final paragraph is a kindness, because the repair culture is the finishing trades'' most humane corner and deserves its humane close: the wall that is damaged is not a failure, it is a building, living, and the household that repairs it is not a project, it is a home, and the repair''s quiet restoration, the filled hole, the matched texture, the painted room, is one of the small competencies that make a house a home, and the industry that wrote the instructions at the homeowner''s level understood this, and this series has tried to honor it. The reader is wished the quiet walls, the working door stops, the boring water story, and the folder that holds it all, and the repair aisle, in its friendly way, will be there anyway.

## The future of the repair aisle, a closing note

The maintenance article''s final note looks forward, briefly, because the aisle is the finishing trades'' most inventive shelf: the primer-enhanced fills, the color-changing dry indicators, the kit cultures that bundle competence for the first-timer, all arrived within a working generation, and the repair culture''s trajectory is toward the household''s increasing independence at the small classes and the profession''s increasing specialization at the boundaries. The reader who keeps the series''s sequences has kept the permanent part, and the reader who shops the aisle''s next inventions will find them all, without exception, variations on the same physics the gypsum family has always taught, and the walls, patient as ever, will keep receiving them the same way, honestly or not, per the discipline of the hands that hold them.

## The quiet wall, the repair series''s final image

The repair series ends with the image its whole architecture was built to produce, and the image is the quietest in the library: the wall, in the evening''s light, telling nothing. No hole, no badge, no flash, no returning crack, the door stopped, the water boring, the file in the drawer with its bookend photographs, and the household in the room, unaware of the wall entirely, which is the wall''s finest achievement and the repair culture''s only real goal. The reader is sent, one final time, to the light, and the wall, whatever it says, says it honestly, and the series, like the file it has recommended, is finished, and the walls begin.

## References
1. Gypsum Association, *Storms and Flooding: Gypsum Association Technical Resources*.
2. Gypsum Association, GA-225-2019, *Repair of Fire-Rated Gypsum Panel Product Systems*.
3. National Gypsum, *Fire-Rated Wall Repairs: Maintaining Safety Best Practices*.
4. DAP, *Patch and Repair Products*.$wallarticle5$, 'maintenance', 10)

) AS a(slug,title,excerpt,content,theme,read_time_minutes)
JOIN public.learn_wall_finishing_topics t ON t.market_code='US' AND t.candidate_key='assembly:us-drywall-repair-patching'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
WHERE NOT EXISTS (SELECT 1 FROM public.learn_articles existing WHERE existing.slug=a.slug)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='US' AND t.market_code='US'
  AND t.candidate_key='assembly:us-drywall-repair-patching'
  AND a.wall_topic_id=t.id AND a.wall_market_code='US' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en'
  AND a.slug IN ('us-drywall-repair-overview', 'us-drywall-repair-materials', 'us-drywall-repair-installation', 'us-drywall-repair-quality-checks', 'us-drywall-repair-maintenance-repair');

COMMIT;
