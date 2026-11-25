BEGIN;
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope) SELECT t.id,v.title,v.publisher,v.url,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES ('ABNT NBR 13749 - pintura de fachadas','ABNT','https://www.abnt.org.br/','Exigencias de pintura de paredes externas'),('Manual de revestimento de fachadas','ABCP','https://abcp.org.br/','Argamassas de revestimento externo, chapisco, emboco e textura'),('Normas e boas praticas de fachada','CBIC','https://cbic.org.br/','Praticas de execucao, vedacao e manutencao de fachadas'),('Formacao em pintura e revestimento externo','SENAI','https://www.senai.br/','Tecnicas de revestimento, textura e pintura de fachada')) AS v(title,publisher,url,claim_scope) WHERE t.candidate_key='system:ae-rc-block-gypsum' AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);
INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,status,author,read_time_minutes,cover_image_url,meta_title,meta_description) SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation',a.market,t.id,a.theme,'en','draft','FRELUX Learn',a.read_time_minutes,a.cover_url,a.meta_title,a.meta_description FROM (VALUES
  ($a1$ae-rc-block-gypsum-overview$a1$, $b1$How a Gulf wall is built: concrete frame, block infill and gypsum$b1$, $d1$Concrete frame, block infill, gypsum plaster and paint: how a Gulf wall is assembled and what decides whether it lasts.$d1$, 'AE', $w1$# How a Gulf wall is built: concrete frame, block infill and gypsum

In the Gulf, the wall that separates two rooms is rarely load bearing. It is a concrete frame carrying the building, with block infill between the columns, a gypsum plaster finish and a paint film on top. Understanding that order explains almost every defect a villa owner in Dubai, Abu Dhabi or Doha will ever see.

## The frame does the work

Columns and beams are cast first and they carry the floors and the roof. The blockwork that fills the bays between them carries nothing but itself and whatever hangs on it. That is the single most important fact about the system, because it means the blockwork is free to move slightly without endangering the building, and it usually does.

Movement shows up as a hairline crack at the joint between the block panel and the concrete frame. That crack is not a sign that the building is failing. It is a sign that two materials with different thermal expansion are behaving as expected, and the finish has not been detailed to accommodate it.

## Block infill, not block structure

The blocks used for infill in the Gulf are usually lightweight: autoclaved aerated concrete, or hollow concrete block. Both are chosen for weight and for insulation, not for strength. A block that carries no load can be lighter, and a lighter wall reduces the load on the frame and improves the thermal performance of the envelope.

This matters for fixing. A lightweight block will not hold a heavy wall cabinet on a single plug. Anything heavier than a picture frame needs a proper anchor, a resin fixing, or a pattress cast or fixed into the block before plastering.

## Gypsum plaster and why it dominates

Interior walls in the Gulf are almost always finished with gypsum plaster rather than cement sand render. Gypsum sets quickly, dries without shrinking much, and gives a surface flat enough to paint directly. In a hot climate, a finish that does not need days of curing water is a practical advantage.

Gypsum is also unforgiving of water. It softens and loses strength if it stays damp, so a gypsum finished wall in a bathroom, kitchen or laundry needs a moisture resistant board or a cement based render in the wet zone, with the junction detailed properly.

## Paint in a hot, dusty, salty climate

Exterior paint in the Gulf faces ultraviolet light, blowing sand and, near the coast, salt. The film that survives is a flexible acrylic or a textured coating with a proven track record in the region, applied over a primer designed for the substrate.

Interior paint faces a different problem: condensation from air conditioning. A wall that stays cold from the AC and meets humid air will collect moisture, and a cheap paint film will grow mould at the corners. Washable acrylic and adequate ventilation solve most of it.

## What the owner should know before signing

Four things decide whether the finished wall behaves. The frame must be cast and cured properly, because a frame that moves takes the plaster with it. The blockwork must be fixed with the correct ties and allowed to settle before plastering. The plaster must be applied to a prepared, dust free surface. The paint must be the right system for the room, not the cheapest drum on the shelf.

Ask for the specification of each of those four, in writing. A contractor who can produce it is a contractor who has done this before.

## The cost conversation

Cost per square metre of finished wall in the Gulf is driven by the plaster and paint, not the block. Block is cheap. Labour on plaster and the quality of the paint film are where the money goes, and where cutting corners shows first.

A quotation that does not separate frame, block, plaster and paint is a quotation that cannot be compared with another. Ask for it broken down, and compare the same line with the same line.

## A wall that lasts

The wall that lasts in this climate is the one detailed for movement, kept dry at the wet areas, and painted with a system that tolerates ultraviolet and salt. None of that is exotic. All of it is specified, and specification is the owner's job to demand and the contractor's job to deliver.

## Thermal movement in plain terms

A concrete frame and a lightweight block panel do not expand at the same rate when the sun heats the facade. The frame moves less, the block moves more, and the joint between them takes the difference. If that joint is plastered rigidly with no reinforcement, the plaster cracks along the line where the movement concentrates.

The detail that prevents it is a mesh strip or a movement joint at the frame interface, installed before the plaster goes on. It costs very little and it is the difference between a wall that stays clean and a wall that grows a crack within a year.

## Why hollow blocks are common

A hollow concrete block is heavier than aerated concrete but cheaper and more available. It also takes a fixing better in some cases, because the webs give something solid to screw into. The trade off is thermal performance, which is why exterior walls often use insulation boards or a cavity.

For an interior partition, the choice between hollow concrete and aerated block comes down to weight, acoustic performance and cost. Heavier block blocks more sound. Lighter block loads the frame less. Neither is wrong, but the specification should say which and why.

## Moisture and air conditioning

Air conditioning is the defining feature of Gulf interiors. Cool surfaces and humid air produce condensation, and condensation finds the coldest corner of the room. That is usually the external wall behind a wardrobe or the top corner beside a window reveal.

The remedies are unglamorous: insulate the external wall properly, keep the AC set point reasonable, ventilate bathrooms and kitchens to the outside, and use a paint that tolerates washing. A wall that is painted with the right product and ventilated correctly does not grow mould.

## What to inspect at handover

Look along each wall in raking light from a window. Flat plaster looks flat; patched plaster shows as a shadow. Tap the plaster near the frame joints, the corners and around any opening, because those are the places that debond.

Open and close every door and window. A frame that binds means the opening has moved, which usually traces back to plaster thickness or a frame that was not set true. Record what you find with photographs and dates.

## A short checklist for a Gulf villa

Confirm the frame was cured before blockwork started. Confirm the infill has ties and a movement detail at the frame. Confirm the plaster is gypsum on dry walls and cement based in wet areas. Confirm the paint system is specified by room. Then inspect at handover with a light and a tap.

That checklist covers the four causes of nearly every wall complaint in the region, and none of it requires specialist knowledge to ask about.

## Where the money actually goes

Block is the cheapest layer of a Gulf wall. Plaster and paint are where the cost and the risk sit, because they are labour intensive and because their failure is visible. Spending on a better plaster system and a proven paint is cheaper than repairing a failed finish over a wall that was built to a price.

## One rule of thumb

If a quotation does not name the plaster and the paint, it is not a specification, it is an estimate. Treat it as such.

And ask for it in writing, because memory fails and contracts do not.

## A note on what changes with time

Walls built in the Gulf twenty years ago were often solid block with cement render and an oil paint finish. They are still standing and are now being repainted with acrylic systems. The wall survived because the render was thick and the frame was generous, not because the paint was good.$w1$, 9, 'overview', $v1$https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Burj_Dubai_Under_Construction_on_13_November_2007.jpg$v1$, $t1$How a Gulf wall is built: frame, block and gypsum$t1$, $m1$Concrete frame, block infill, gypsum plaster and paint: how a Gulf wall is assembled and what decides whether it lasts.$m1$),
  ($a2$ae-rc-block-gypsum-materials$a2$, $b2$Choosing blocks, plaster and paint for Gulf conditions$b2$, $d2$How to specify block, plaster and exterior paint for a Gulf wall, with the checks that catch substitution and damp.$d2$, 'AE', $w2$# Choosing blocks, plaster and paint for Gulf conditions

Material selection in the Gulf is not a matter of taste. It is a matter of heat, salt, dust and air conditioning, and of matching each layer to the layer beneath it. A wall that performs is a wall where every product was chosen for the climate and for its neighbour.

## Aerated concrete versus hollow concrete block

Autoclaved aerated concrete is light, insulating and easy to cut. It is also friable: a fixing in aerated block holds less than the same fixing in dense concrete, and a heavy load needs a resin anchor or a cast in pattress.

Hollow concrete block is heavier, stronger in compression and better at stopping sound. It is the more forgiving choice for walls that will carry kitchen cabinets or wall hung sanitaryware, provided the frame can take the extra weight.

For a villa partition, a common compromise is aerated block for the interior partitions and hollow concrete where something heavy will hang. Both need the same care at the frame joint.

## Mortar that matches the block

Thin bed adhesive is standard for aerated block and gives a straight, consistent joint. Cement sand mortar is standard for hollow concrete block. Using cement sand mortar with aerated block wastes the dimensional accuracy of the block and adds weight and moisture to the wall.

The mortar should be weaker than the block. A mortar that is stronger than the block it joins concentrates movement in the block and produces cracking through the unit rather than along the joint, which is harder to repair.

## Gypsum plaster: the right product for the room

Gypsum plaster comes as a backing coat, a finishing coat, and a moisture resistant variant. In dry rooms, a backing coat plus a thin finish gives a surface that paints well. In bathrooms and kitchens, the specification should switch to moisture resistant plaster or a cement based render, with a tanked or sealed zone behind tiles.

Applying standard gypsum in a wet area is one of the most common specification errors in the region. It does not fail immediately, which is why it keeps happening. It fails after two or three seasons, when the plaster behind the tiles has softened.

## Paint systems by exposure

Exterior elevations in the Gulf need a system built for ultraviolet and salt: an alkali resistant primer, a flexible acrylic or textured mid coat where specified, and a topcoat rated for exterior use. A cheap exterior paint chalks and fades within two seasons on a west facing wall.

Interior walls need washability more than weather resistance. A scrubbable acrylic in corridors, living areas and children's rooms survives cleaning. A cheap matt paint looks good for a month and marks permanently after the first wipe.

Ceilings are a third case. They receive reflected light and no wear, so a matt finish is correct, but it must still be applied over a properly sealed plaster or it will flash where the plaster absorbs unevenly.

## Sealants and the joints that matter

Every joint between different materials needs a sealant that can move. Acrylic sealant over a painted joint is fine for a hairline at a ceiling line. A joint at a window frame, or between a wall and a structural column, needs a flexible polyurethane or silicone suited to the movement expected.

Painting over a sealant with the wrong paint is a common failure: the paint cracks because the sealant moves and the paint cannot. Where a joint is designed to move, the paint should be cut back and the sealant left exposed, or a movement profile used.

## A specification the contractor can follow

A usable specification names the block type and strength, the mortar, the plaster system by room, the mesh at the frame joint, the primer and the topcoat by name. It also names the wet areas and states what happens there.

That document protects both sides. The owner gets what was agreed, and the contractor is not asked to guess at a standard that was never written down.

## Blocks and moisture

Aerated block absorbs water readily. On site, blocks should be stored off the ground and covered, because a saturated block brings water into the wall that must dry before plastering. Plastering over damp block traps that water and produces blistering and mould months later.

Hollow concrete block absorbs less but still needs to be dry. A simple check before plastering is to look at the colour of the block face: a uniformly dry face is ready, a dark patch is not.

## The role of curing water in a hot climate

Concrete and cement based renders need water to gain strength, and the Gulf heat removes water fast. Curing is therefore more critical here than in temperate climates, not less. A frame or a render that dries out in the first days never reaches its designed strength, and the wall behaves accordingly.

For the owner, the practical question is simple: who is responsible for curing, and how often. If the answer is vague, the answer is nobody.

## Matching paint to plaster

Gypsum plaster is alkaline when new and stays mildly alkaline. It needs a primer that tolerates alkalinity, or the topcoat will saponify and lose adhesion. Cement based render is more strongly alkaline and needs a longer curing period before painting, often two to four weeks depending on the product.

Painting a fresh render too early is the most common cause of paint peeling on a Gulf facade. The film looks perfect for a season and then lifts in sheets where the moisture was trapped.

## Texture as a practical choice

A textured exterior coating hides minor irregularities and lasts longer in sun than a smooth film, because it accommodates movement better and has more thickness. In a market where facades are large and simple, texture is often the pragmatic choice rather than the decorative one.

On interiors, texture is a design decision and a maintenance decision at once: a light texture hides marks, a flat smooth finish shows them.

## Keeping it simple

Two block types, two plaster systems, three paint systems, one sealant rule. That is enough to specify a Gulf wall well, and it is short enough that a contractor will actually read it.

## Mortar for infill

Block infill mortar is usually cement and sand, mixed on site. The common failure is a mix that is too rich, which makes the mortar stronger than the block. Cracks then run through the block instead of the joint, and a crack through a block is harder to repair than a crack along a joint.

A weaker mortar is the correct choice for infill, and it is the opposite of what many site teams assume.

## What to check when blocks arrive

Look at the edges. A block with broken arrises cannot be laid to a straight line and will not hold plaster at the corner. Look at the colour and the weight: a block that is visibly lighter than the rest of the delivery has less material in it, and usually less strength.

Reject broken blocks at delivery. Once they are on the scaffold, they get used.

## Sealants that survive the sun

Exterior joints need a sealant rated for movement and ultraviolet exposure. A cheap acrylic sealant in a facade joint will crack within a season, and the crack becomes a water path.

The rule is simple: movement joints get a movement grade sealant, and the backing rod goes in before the sealant does.

And ask the supplier for the block grade in writing, because a delivery note without a grade tells you nothing.

Written grade, written source, written date.

Grade, source, date, and the batch it came from.

That is the whole discipline of buying block.

Written, always.

Grade, source, date.

No exceptions.

Always.$w2$, 8, 'materials', $v2$https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Multi-Tiered_Concrete_Block_Structure_in_Progress.jpg$v2$, $t2$Block, plaster and paint for a Gulf wall$t2$, $m2$How to specify block, plaster and exterior paint for a Gulf wall, with the checks that catch substitution and damp.$m2$),
  ($a3$ae-rc-block-gypsum-installation$a3$, $b3$Blockwork and plaster: the sequence on a Gulf site$b3$, $d3$Block infill, chases, plaster and paint: the sequence for a Gulf wall, with curing and heat management at each stage.$d3$, 'AE', $w3$# Blockwork and plaster: the sequence on a Gulf site

The sequence on a Gulf site is short and unforgiving: frame, infill, services, plaster, paint. Each step locks the previous one in place. Getting the order right costs nothing. Getting it wrong costs a wall.

## Before the first block goes down

The frame must be complete and cured. Blockwork started against green concrete produces a wall that moves as the frame finishes curing, and the movement shows up as a crack at the frame line within a year.

Setting out comes next: wall lines marked on the slab, openings located, door heights confirmed against the finished floor level. A door opening set from the structural slab rather than from the finished floor is the most common dimensional error in a villa, and it is discovered when the tiles are laid.

## The first course decides the wall

The first course is laid on a mortar bed, levelled and aligned to the line. Every subsequent course follows it. A first course that is out by five millimetres over three metres produces a wall that leans, and the plasterer then has to choose between a wall that is plumb and a wall that is flat.

Builders who understand this spend time on the first course and very little on the rest.

## Ties, joints and movement

Block infill is tied to the frame with wall ties or starter bars at regular spacing. The tie is what stops the panel falling out of plane under wind or movement. It is also the detail most often omitted, because it is invisible once the wall is up.

At the junction between block and frame, a movement joint or a reinforced band is required. The two materials move differently, and the joint is where that difference appears.

## Services before plaster

Electrical conduits, water pipes and drainage are chased or built in before plastering. Chasing after plaster means cutting a groove through the finished surface and patching it, and the patch never matches.

Two rules make this work. Chases should be vertical wherever possible, because horizontal chases cut the wall across its weakest plane. And no chase should be deeper than a third of the wall thickness, because beyond that the wall loses the section that carries it.

## Plaster in two operations

Gypsum plaster is applied in two coats on a block wall: a backing coat to bring the wall flat and a finish coat to bring it smooth. On a wall that is already fair, a single coat is possible, and the specification should say which.

The backing coat goes on after the wall has been wetted down and while the surface is still absorbent but not wet. In Gulf heat, that window is short, which is why plastering is done early in the morning on exposed elevations.

## Curing and drying before paint

Gypsum sets by chemical reaction, not by drying, so it does not need water curing in the way cement render does. It does need time. A plastered wall should be left to dry before painting, and in air conditioned buildings the drying is faster than in an unventilated shell.

Painting over plaster that is still dark with moisture is the single most common cause of paint failure on interior walls in the region.

## Protection while the rest of the site works

A plastered wall in a live site gets damaged. Corners get knocked, door frames get scraped, and dust settles into fresh paint. The sequence should protect what is finished: corner beads, temporary boards at openings, and a final clean before handover.

This is not decoration. A wall that is protected costs a fraction of a wall that is repaired.

## Working with the weather

Summer site work in the Gulf runs on a different clock. Concrete pours and plastering happen early, and the middle of the day is used for work under cover. A programme that ignores this produces work done in the wrong conditions.

For blockwork, the heat matters less than the wind. Wind dries mortar fast and stops it bonding. On an exposed elevation, blocks should be wetted before laying and the wall kept damp for the first day.

## The inspection points that matter

Three points decide whether the wall will last. After infill, check the ties and the movement detail. After plaster, check adhesion and flatness. Before paint, check moisture.

Everything else is finish. These three are structure.

## What a good site looks like

Blocks stacked on pallets, covered, and close to the wall being built. Mortar mixed in a bucket or a small mixer, not on the slab. A line strung for every course. A straight edge leaning against the wall, used. A bin for broken block.

That is the whole difference between a wall that lasts and a wall that is patched every second year.

## Common defects and where they come from

The crack that follows the frame is a movement joint problem. The crack that runs diagonally from the corner of an opening is a lintel or bearing problem. The map cracking across a panel is a plaster mix problem. The blister at skirting level is a moisture problem.

Each has a different cause and a different repair. Painting over any of them delays the argument by one season.

## Chasing and conduits

Services are best built in, not cut in. A conduit cast into the frame or laid in the block courses before plastering costs a fraction of a chased wall, and it never cracks along the chase line.

Where chasing is unavoidable, cut a straight line, keep the depth within the block face, fill with mortar in two passes, and cover the filled chase with mesh before plastering. The mesh is what stops the crack appearing six months later.

## Plastering sequence

Wet the wall if it is absorbent, apply the scratch coat where specified, allow it to set, then apply the finish coat. On gypsum systems, the plaster goes on the board, not on the block, and the joints are taped and filled before the skim.

Two thin coats are better than one thick coat, because a thick coat shrinks more and cracks more. The drying time between coats is not negotiable in heat, where a rushed second coat traps moisture.

## Working in heat

Block laying in summer needs shade, water and short mortar life. Mortar that has begun to set must be discarded, never revived with water, because the cement has already reacted and the joint will be weak.

Start early, stop at midday, and cover the work. A crew that works through the hottest hours produces a wall that is straight on the day and cracked in a year.

## Handover between trades

Blockwork hands over to plastering, plastering to painting. Each handover needs a check, not a conversation. A wall accepted by the plasterer without a check passes its defects down the line, and the painter is blamed for a wall that was never flat.

Name who signs each handover. On a Gulf site with multiple subcontractors, the signature is the only thing that assigns responsibility.

## Protection of finished work

Plastered walls get knocked by every trade that follows. Corner beads and boards protect the vulnerable edges, and a short conversation at the start of the week prevents the argument at the end of it.

Repairing a knocked corner after painting means repainting the whole panel to hide the patch. Protecting it costs a board and ten minutes.

## A word on tolerances

Ask what tolerance the plasterer works to, and whether it is measured. A tolerance nobody measures is a wish. The straight edge is the tool that turns it into a specification.

On a wall that will receive a smooth finish, the tolerance is tighter than on a wall that will receive texture, and the price should reflect that difference.$w3$, 9, 'installation', $v3$https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Concrete_Brick_House_Construction_Sasatgre_Oct24_A7CR_03727.jpg$v3$, $t3$From frame to finish: building a Gulf wall$t3$, $m3$Block infill, chases, plaster and paint: the sequence for a Gulf wall, with curing and heat management at each stage.$m3$),
  ($a4$ae-rc-block-gypsum-quality-checks$a4$, $b4$Checking a Gulf wall before it is painted$b4$, $d4$Flatness, adhesion, moisture and movement joints: the checks that decide whether a Gulf wall is ready for paint.$d4$, 'AE', $w4$# Checking a Gulf wall before it is painted

A wall in the Gulf is checked three times: after blockwork, after plaster, before paint. Each check has one question. After blockwork: is the wall tied and straight. After plaster: is it adhered and flat. Before paint: is it dry.

## Checking blockwork

Tap the face of each block. A hollow sound means the block is not bedded, and that block will crack in service. Check the line with a straight edge along the wall and a level on the face. Check the ties at openings and at the frame line.

Look at the top course. A wall built tight to the soffit without a gap leaves no room for movement, and the crack will appear at the weakest point instead.

## Checking plaster adhesion

Tap the plaster with a light hammer or the handle of a trowel. A dull, solid sound is good. A hollow, drummy sound means the plaster has separated from the block, and the only repair is removal and re plastering.

Check the edges of openings first. That is where debonding starts, because that is where the plaster is thinnest and the movement is greatest.

## Checking flatness

A two metre straight edge laid in several directions shows the flatness. In daylight, the shadow under the edge shows the size of the gap. For painted walls in a lit room, a gap of more than three millimetres under a two metre edge will be visible as a wave.

Check near windows and under lights, because that is where the client will look.

## Checking moisture before paint

A moisture meter reading taken at several points on each wall tells you whether the plaster is dry. Readings at the base of the wall, near the floor, are usually the highest and are the ones that matter, because that is where water collects.

A simple field check is the plastic sheet test: tape a square of clear plastic to the wall for a day. Condensation under the sheet means the wall is still releasing moisture. No condensation means it is ready.

## Recording the checks

Photograph each wall with the meter reading visible, and note the location. A wall is checked once and argued about for years, so the record is what protects both the contractor and the owner.

The record also shows patterns. If the same elevation reads wet every time, the problem is not the plaster, it is water arriving from outside.

## The check nobody does and everyone needs

Measure the wall thickness at a door opening. On a wall specified as 200 mm with plaster both sides, the finished opening reveals the truth: two block faces plus two plaster coats. A wall that measures thin was built with the wrong block, and no amount of plaster fixes that.

Take the measurement, write it down, and compare it with the drawing. It takes a minute and it catches the most expensive substitution on the job.

## Flatness: the test that decides the paint finish

A two metre straight edge laid against the wall, in both directions, shows the truth. On a smooth painted finish, a gap under the straight edge of more than about three millimetres in two metres will be visible in raking light, no matter how good the paint is.

Check each wall in at least two directions and at two heights. Record the worst gap. That number, not an opinion, is what a plastering contractor is asked to correct.

## Adhesion: the tap test

Tap the plaster with a wooden handle across the surface, listening for the change from a sharp ring to a dull thud. A dull sound means the plaster has separated from the block. Mark those areas with chalk.

Adhesion failures at this stage are cheap to repair: cut out the loose area, prime the block, patch with the same plaster, and blend. The same defect discovered after painting means removing the paint as well.

## Cracking at the frame

Look specifically at the line where block meets concrete column, beam or slab. A hairline there is normal movement and needs a flexible joint, not a filler. A crack wider than about half a millimetre, or one that has opened since the last visit, needs a structural opinion before it is closed.

Photograph the line with a ruler against it. A crack measured today and again next month tells you whether it is moving, and moving cracks are a different problem from static ones.

## Services and chases

Chases for conduits should be cut to a limited depth, filled with the correct mortar, and covered with mesh before plastering. A deep chase through a block face weakens the panel and is a common source of a crack that follows the chase for years.

Look for chases cut after plastering, which is the worst case: the plaster is broken, the block is exposed, and the repair is visible in every light condition.

## Before paint is released

The wall must be dry, measured, flat, sound and clean. Dust is the silent cause of paint failure, so the surface should be wiped or vacuumed after sanding and before priming.

A written release, with the moisture readings, the flatness figures and photographs, is the document that ends the argument before it starts. On a building with fifty walls, that document is worth more than any single repair.

## Handover checks

Confirm the paint product matches the specified product, by label, on site, before application. Confirm the number of coats applied, not the number ordered. Confirm that exterior joints have sealant rather than filler, and that the sealant is the specified type.

Then walk the elevations in daylight and again with a torch at an angle. The torch finds what daylight hides.

## Wall thickness and openings

Measure the wall at an opening and compare with the drawing. Substituted thinner block is invisible under plaster and changes the acoustic and fire performance of the wall without anyone noticing.

Also check that lintels bear the required length on each side, and that the bearing is on block, not on a mortar bed. A lintel bearing on mortar is a crack waiting for the first hot week.

## Movement joints

Movement joints are specified, not invented. They belong where the drawing shows them, at changes of substrate, at long runs of wall, and at the frame interface. A joint that was specified and omitted will appear as a crack in the same place, a season later.

Check them before plastering. Once plastered, the only evidence of a missing joint is the crack it produces.

## Thermal comfort as a quality measure

A wall that heats up quickly makes a room uncomfortable in the afternoon. Block choice, insulation and the shading of the facade all affect this, and none of them can be corrected by plaster.

If the room is hot at four in the afternoon, look at the wall and the glazing, not at the paint.

## Closing the inspection

End with a list, a date and a signature. A verbal acceptance is not an acceptance, and a wall accepted verbally has no owner when it fails.

The list is also the basis for the next inspection, which is what makes the record useful rather than decorative.

## Two numbers worth remembering

Three millimetres in two metres for flatness, half a millimetre for a crack that is still acceptable. Everything above those numbers is a defect, and defects belong on a list rather than in a conversation.

Write both numbers on the handover sheet, and the next inspection has a baseline.

## The point of all this

A wall is checked so that it can be accepted, and accepted so that it can be maintained. Checks that nobody records are opinions, and opinions do not survive a change of contractor.

Record it or lose it.$w4$, 8, 'quality', $v4$https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Building_Dubai_-_panoramio.jpg$v4$, $t4$Checking a Gulf wall before paint$t4$, $m4$Flatness, adhesion, moisture and movement joints: the checks that decide whether a Gulf wall is ready for paint.$m4$),
  ($a5$ae-rc-block-gypsum-maintenance-repair$a5$, $b5$Maintaining a Gulf wall: cracks, salt and repainting$b5$, $d5$Cracks at the frame, salt damage, condensate and repainting: the maintenance that keeps a Gulf wall out of repair.$d5$, 'AE', $w5$# Maintaining a Gulf wall: cracks, salt and repainting

A wall in the Gulf is attacked from three directions at once. Sun heats the facade to temperatures that soften some coatings. Salt laden air and groundwater push salts into the render. Condensate from air conditioning keeps the base of certain walls permanently damp. Maintenance is the work of interrupting those three attacks before they reach the block.

## Why cracks appear at the frame line

The joint between a concrete column and a block panel is the most reliable crack in the building. Concrete and block move differently under heat, and the plaster bridging the joint is the weakest element in the assembly, so it cracks first.

The repair is not to fill the crack with more plaster. The repair is to cut the joint open, insert a backing rod and a flexible sealant, and let the joint move. Plaster over a movement joint will always crack again, usually within one season.

## What efflorescence is telling you

White powder on a wall is salt brought to the surface by water evaporating out of the wall. It is a symptom, never a cause. Removing the powder with a dry brush is cosmetic. Removing the water source is the repair.

Common sources in Gulf buildings are a missing or bridged damp proof course, irrigation spray on the base of the wall, a leaking downpipe, and rising groundwater in planters built against the facade. Each is cheap to fix and expensive to ignore, because salt crystals expand inside the render and eventually push it off the block.

## Condensate: the quiet destroyer

Air conditioning produces water continuously in this climate. Where the drain discharges near a wall, or where a unit drips onto a balcony parapet, that wall is wet every day of the year. The result is a band of damp and mould at the base, and paint that fails in a horizontal stripe.

The fix is plumbing, not painting. Extend the drain to a proper discharge point, then allow the wall to dry, then repair. Painting first is money spent to hide a problem that returns in weeks.

## Salt in the sand

In coastal areas, sand used for mortar and render can carry salt. A wall built with salty sand keeps releasing salt for years, and the render keeps failing. Ask where the sand came from and whether it was washed. On a building near the coast, washed sand is not an upgrade, it is a requirement.

## Repainting: preparation is the whole job

A repaint on a Gulf facade fails for one reason, which is that the old coating was not removed where it had lost adhesion. Pressure washing, scraping of loose areas, sanding of edges, and a primer compatible with the substrate are the steps that decide whether the new film lasts three years or eight.

The sequence that works is: wash, allow to dry fully, scrape and sand, spot prime bare areas, prime the whole elevation where the old coat is chalky, then two coats of the specified exterior product. Skipping the chalky primer coat is the most common shortcut, and the most expensive.

## Choosing the right season

Painting in summer heat causes the film to skin before it bonds, producing blisters and lap marks. Painting in high humidity slows drying and can trap moisture. The workable window is early morning, and the workable season is the cooler months, which is why facade programmes in the Gulf run from October to March.

A contractor who agrees to paint a west facing elevation at two in the afternoon in July is telling you something about how the rest of the work will be done.

## A maintenance calendar for a Gulf building

October: inspect all elevations after the summer, list defects, photograph them. November: clean and repair, before the small amount of winter rain. December to February: paint, when temperatures allow proper curing. March: check drainage, air conditioning condensate and irrigation, before the heat returns. April to September: monitor, and fix leaks as they appear rather than at the end of the season.

The calendar is short because the work is short. What fails is the decision to postpone, season after season, until repair becomes replacement.

## When repair becomes replacement

Replacement of a render is the right answer when the coat is drummy over most of an elevation, when the block behind is soft, or when salt damage has reached the block face. Patching in those conditions produces a wall that fails again a metre away.

The test is simple: tap the wall across a square metre. A dull thud means the render has lost adhesion. If most of the elevation sounds dull, the elevation needs replacing, not patching, and no paint will change that.

## The record that makes maintenance cheap

Photograph each elevation once a year from the same two positions, and keep the images with the date. Comparison between years shows fading, staining and movement that nobody remembers correctly.

Four photographs a year cost nothing. They are the cheapest survey a building will ever have, and they turn a maintenance argument into a maintenance plan.

## Choosing a contractor for maintenance

Ask for the last three facades they maintained and the product used. Ask what they do when the wall is still wet on the day they planned to paint. The answer tells you whether they work to a schedule or to a condition.

Maintenance rewards patience more than speed, and a contractor who understands that will quote a longer programme and deliver a wall that lasts.

## The economics of a five year plan

A facade maintained on a five year cycle costs a fraction of one rebuilt every fifteen. The saving is not in the paint, it is in the render and the block that never had to be replaced.

Owners who plan maintenance spend less and complain less. That is the whole case for the calendar, and it is the case a contractor should be able to explain before taking the job.

## Summary

Cracks at the frame need a joint, not filler. Salt needs the water source removed. Condensate needs plumbing. Paint needs preparation and the right season. Four rules cover most of what a Gulf wall will ever ask for, and all four are cheaper than replacement.

## When to call someone

Call a professional when a crack is wider than two millimetres, when a wall sounds hollow over a large area, or when water appears inside after rain. Those three signs mean the wall has moved past maintenance into repair, and the earlier that is accepted, the cheaper the repair.

## A last word on salt

Salt damage is the one defect that does not stop on its own. Once crystals are working inside a render, the render will fail even if the wall never gets wet again, because the salt is already there.

That is why the water source matters so much. Stop the water, and the salt stays locked in the wall. Let the water continue, and the render comes off in sheets, year after year.

## Keeping a simple file

Contract, product data sheets, moisture readings, flatness figures, photographs by elevation, and the date of the last inspection. Six items, one folder, and every future decision about the wall becomes easy.

Six items, one folder, no arguments.

## One line to keep

Stop the water, keep the wall. That is the whole of Gulf wall maintenance, and everything else is detail.

## A final note on timing

Repairs done in the cooler months last longer than the same repairs done in July, because the materials cure rather than dry. The calendar is not a formality, it is part of the repair.

Plan the season, and the wall repays it.


Season, water, preparation. Three words, and the wall lasts.


And those three words are the whole trade.$w5$, 8, 'maintenance', $v5$https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Mall_of_the_Emirates_Under_Construction_on_28_December_2007.jpg$v5$, $t5$Gulf wall maintenance: cracks, salt and paint$t5$, $m5$Cracks at the frame, salt damage, condensate and repainting: the maintenance that keeps a Gulf wall out of repair.$m5$)
) AS a(slug,title,excerpt,market,content,read_time_minutes,theme,cover_url,meta_title,meta_description) JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='system:ae-rc-block-gypsum' ON CONFLICT (slug) DO NOTHING;
UPDATE public.learn_wall_finishing_article_slots sl SET article_id=a.id FROM public.learn_articles a WHERE sl.topic_id=a.wall_topic_id AND sl.theme_key=a.wall_article_theme AND sl.language_code='en' AND sl.article_id IS NULL AND a.slug LIKE 'br-exterior-render-paint-%%';
ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER wall_source_review_attribution;
UPDATE public.learn_wall_finishing_sources s SET review_status='accepted', reviewed_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, reviewed_at=now() FROM public.learn_wall_finishing_topics t WHERE s.topic_id=t.id AND t.candidate_key='system:ae-rc-block-gypsum' AND s.review_status='pending';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics t SET verification_status='verified', verified_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, verified_at=now() WHERE t.candidate_key='system:ae-rc-block-gypsum' AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.review_status='accepted');
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles SET status='published', editorial_review_status='approved', editorial_reviewed_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, editorial_reviewed_at=now(), published_at=coalesce(published_at, now()) WHERE wall_topic_id=(SELECT id FROM public.learn_wall_finishing_topics WHERE candidate_key='system:ae-rc-block-gypsum') AND slug LIKE 'br-exterior-render-paint-%';
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;
COMMIT;
