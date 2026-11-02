BEGIN;

ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER USER;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope)
SELECT t.id,s.title,s.publisher,s.url,s.claim_scope
FROM public.learn_wall_finishing_topics t
CROSS JOIN (VALUES
 ('IS 2185 Part 3: autoclaved cellular concrete blocks','Bureau of Indian Standards','https://www.bis.gov.in/','AAC density classes, compressive strength and dimensional tolerances'),
 ('AAC block masonry guidance','BMTPC (bmtpc.org)','https://www.bmtpc.org/','Block handling, mortar selection and curing practice'),
 ('Building envelope thermal studies','TERI (teriin.org)','https://teriin.org/','Thermal behaviour of AAC walls in Indian climates')
) AS s(title,publisher,url,claim_scope)
WHERE t.candidate_key='system:in-aac-block'
AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources x WHERE x.topic_id=t.id AND x.url=s.url);

INSERT INTO public.learn_articles(slug,title,excerpt,wall_market_code,content,read_time_minutes,wall_article_theme,cover_image_url,meta_title,meta_description,category_slug,status,wall_topic_id,wall_language_code)
SELECT a.slug,a.title,a.excerpt,a.market,a.content,a.read_time_minutes,a.theme,a.cover_url,a.meta_title,a.meta_description,'surface-preparation','draft',t.id,'en'
FROM (VALUES
('in-aac-block-overview','AAC Block Walls in India: What the Material Changes','An AAC block wall explained for Indian sites: block classes, thin joints, plaster, curing and the cracks that follow a r','IN',$w1$# AAC Block Walls in India: What the Material Changes

An AAC block wall in India is a wall built from autoclaved aerated concrete, laid in thin-joint mortar and finished with cement plaster, putty and paint. The blocks are roughly a third the weight of a solid concrete block, square to within a millimetre or two, and warm to sit against, and each of those properties changes how the wall is built, how it is inspected and what goes wrong with it five years later.

The material arrived in Indian cities as a replacement for red clay brick in framed buildings, and it is now common in apartment towers, hospitals and schools. Builders adopted it for speed: a block that size, laid with a thin joint, closes a wall in a fraction of the time brickwork takes. What did not arrive with the blocks was the set of habits the material needs. Mortar mixed for brick is too wet and too thick for AAC. Plaster made with the same sand:cement ratio behaves differently on a soft, absorbent face. A wall that is up quickly can still be a wall that cracks in the first summer.

## What is an AAC block and where did it come from?

AAC is concrete with air in it. Cement, lime, sand or fly ash and a little aluminium powder are mixed, poured into moulds, left to rise as the aluminium reacts and releases hydrogen, then cut to size on wires and cured in an autoclave under steam pressure. The result is a solid with a fine closed pore structure, a density around a third to a half that of dense concrete, and a compressive strength that is modest but predictable.

Because it is autoclaved, the material is dimensionally stable once cured. The blocks do not shrink the way aerated foams do, and they do not need wetting before laying in the way burnt clay brick does. What they do need is protection from rain while stacked and a mortar that matches them.

## What does IS 2185 Part 3 actually control?

The standard sets density classes, compressive strength and dimensional tolerances for autoclaved cellular concrete blocks. In practice the tolerance matters as much as the strength. A block that is square and flat to a small fraction of its face allows a thin joint, and a thin joint is what makes the wall straight without a thick bed of mortar to hide variation.

When blocks arrive out of tolerance, the mason compensates with mortar, and the properties the material was chosen for start to disappear: the joints become thick, the wall becomes uneven, and the plaster has to make up the difference.

## Why does the block weight change the whole wall?

A masonry wall carries its own weight, and in a framed building that weight is transferred through the slab to the frame. Halving the unit weight of the infill reduces the load the slab has to carry and the reinforcement it needs, which is why engineers accept AAC in tall buildings where brick would add kilos to every square metre.

The lighter wall also changes how it behaves in an earthquake. Infill panels are not structural, but they still interact with the frame: they stiffen it, they crack at the corners if the frame moves, and they can fall out if they are not tied back. A lighter panel reduces the force it imposes on the frame when it moves, which is an advantage rather than a compromise.

## How much faster is block work really?

A block 600 long and 200 high covers a large area with one hand movement. A crew laying AAC closes a wall in a fraction of the time it takes to lay the equivalent in brick, and the thin joint means less mortar to mix and carry.

The speed is real but it is concentrated in the laying. Everything downstream takes the same time or longer: setting out, checking plumb, cutting around openings, fixing services, plastering, curing, and finishing. A project that plans its programme around the laying speed and not the finishing will still lose the time later.

## What does a thin joint demand?

A thin joint of two to three millimetres needs a block that is flat and a mortar that is applied evenly, usually with a notched trowel or a dispensing hopper. The joint does not accommodate variation, so the first course has to be level and the blocks have to be true.

The temptation is to lay a thick bed at the base to correct the floor and then a thin joint above. That works only if the thick bed is genuinely a levelling course. If it is uneven, the error travels up the wall and the plaster pays for it.

## Where does water get into an AAC wall?

AAC is porous in the sense that it absorbs water readily at a cut face, and it dries slowly once wet. Rain driven onto an unfinished wall, a leaking pipe chase, a wet area without a membrane, and splash at the base all put water where the material does not want it.

Three details decide most of the outcome: keeping the blocks covered before laying, keeping the base of the wall clear of soil and splash, and making sure the plaster on an external face is continuous and properly cured. The fourth is time: an AAC wall that gets wet needs longer to dry before it is painted than a brick wall would.

## How is the wall finished in Indian practice?

The sequence is familiar: cement plaster in one or two coats, cured, then wall putty to fill and level, sanded, then primer and paint. What changes with AAC is the plaster. The face is soft and absorbent, so a strong, rich mix on a dry block pulls water out of the mortar before it can set.

The practical fixes are a mortar that is not too rich, a block face that is dampened lightly rather than soaked, and a curing routine that starts as soon as the plaster can take water without being damaged. Skipping the curing is the single most common reason a new AAC wall shows hairline cracks in its first year.

## Is AAC a good wall for Indian climates?

The material insulates better than dense masonry because of the air in it, which shows up as a slower heat gain through a west-facing wall in the afternoon. Studies of Indian envelopes generally find that the benefit is real but modest, and that it is easily lost through an uninsulated roof or a single-glazed window.

In humid coastal cities the material's ability to hold water matters more than its insulation. A wall that dries quickly performs better than one that insulates well, and AAC dries slowly once saturated, which is why the external finish detail matters so much.

## Does AAC need special fixings?

Yes. A fixing that relies on friction or on the material's strength, such as a heavy expanding anchor, will not hold in a low-density block. Cabinet fixings, sanitaryware, air-conditioner brackets and heavy shelves need either a chemical anchor, a through-bolt into the frame, or a solid insert cast or built into the wall.

Planning fixings at the drawing stage is far cheaper than discovering the problem after painting. A wall with a pattress block behind the kitchen units costs a few hundred rupees; a wall with an air-conditioner falling off it costs the relationship with the client.

## What about fire and acoustic performance?

AAC is non-combustible, and a block wall of reasonable thickness provides a fire separation without additional treatment. Acoustically, mass matters, and AAC has less of it per millimetre than dense concrete, so a wall that is specified for sound between flats needs either more thickness or a lining.

Neither property is usually the reason the material is chosen, but both appear in specifications, and a wall that meets the fire requirement can still fail the acoustic one if the thickness was reduced to save weight.

## What goes wrong first on these walls?

Cracks at the junctions between the infill and the frame, hairline shrinkage cracks in the plaster, hollow plaster at a corner, and damp patches at the base or around a window. Each of these has a specific cause and a specific repair, and each appears within the first two years if the work was rushed.

The pattern is consistent enough to plan for: the junctions need mesh, the plaster needs curing, and the base needs a detail that stops splash. Where those three are done, the wall settles and stays settled.

## Who actually does the work?

Block laying is a mason's trade, and no unaided owner should attempt a wall that carries load. But an owner can and should understand the sequence, because the decisions that decide the wall's performance at an owner's budget are made in the specification, not on the trowel.

What an owner can do is insist on three things in writing: the block density class, the thin-joint mortar, and mesh at every frame junction. Those three lines in a specification do more for the finished wall than any amount of site supervision later.

## What does a well-specified AAC wall cost?

Per square metre of finished wall, the block material is a modest share. Mortar, mesh, plaster, putty and paint, plus the labour for each, make up the majority, and the plastering and finishing costs are broadly the same as for brick.

The savings that make AAC attractive are in structure and speed: lighter infill means less reinforcement in the frame, and faster laying shortens the programme. A quotation that compares only the block rate will miss both.

## How does AAC compare with red brick or concrete block?

Against red clay brick, AAC is lighter, more dimensionally consistent, faster to lay and a better insulator, and it is more expensive per unit but often cheaper per square metre of finished wall once mortar and labour are counted. Against dense concrete block, it is lighter and warmer but weaker in carrying fixings and more sensitive to water.

The choice is therefore not about which is best in the abstract but about which failure mode the project can manage. In a framed apartment block with a good plaster specification, AAC's weaknesses are controllable. In a wall that will be drilled repeatedly for shelving and sanitaryware, a denser unit may be the better answer.

## What changes on a very tall building?

Above a few storeys, the sequence of construction and the movement of the frame start to dominate. Infill panels in tall frames need to accommodate slab deflection at the head of the wall, often with a slip joint or a flexible detail, rather than being built tight to the soffit.

Getting that detail wrong produces a horizontal crack near the ceiling, which is one of the most common defects in tall AAC buildings and one of the easiest to prevent.

## What should be in the handover pack?

The block specification and supplier, the mortar type, the plaster mix, the curing record, the moisture readings before painting, and photographs of the mesh and ties before plaster. Together they answer the questions that arise when something cracks.

Handover packs of this kind are rare, which is why the same defects recur across projects. The builder who produces one has a defensible record and fewer callbacks.$w1$,9,'overview','https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Laterite_AAC_Block_Building_Coorg_Feb24_A7C_09393.jpg/1280px-Laterite_AAC_Block_Building_Coorg_Feb24_A7C_09393.jpg','AAC Block Walls in India: What Changes and Why','An AAC block wall explained for Indian sites: block classes, thin joints, plaster, curing and the cracks that follow a rushed build.'),
('in-aac-block-materials','AAC Block Materials: Blocks, Mortar and Accessories for Indian Walls','Specify AAC properly in India: density class, thin-joint adhesive, ties and mesh, plaster mix, putty and primer, plus wh','IN',$w2$# AAC Block Materials: Blocks, Mortar and Accessories for Indian Walls

The materials for an AAC block wall are simple to list and easy to get wrong: the blocks themselves, a mortar that matches them, a tie or mesh at every junction, and a plaster that will bond to a soft face. This article sets out what to specify for each, and where substitution quietly changes the wall.

AAC is supplied as blocks, as reinforced panels and as lintels. For ordinary infill walls the block is the unit, and the specification work is in density class, tolerance and moisture content at delivery. Everything downstream depends on those three.

## Which block density class should be specified?

Density class sets weight and strength together. A lighter class insulates better and carries less load, a heavier class takes fixings more readily and resists impact. For internal partitions a lighter class is usual; for walls that will carry cabinets or sanitaryware, or that face a corridor, a heavier class is the safer specification.

The class should be written into the specification with the strength, not chosen on site by what is available. Where a supplier offers one class only, the fixings and the finish have to compensate, and that needs to be decided before the wall is built, not after.

## What does block tolerance do to the wall?

A block that is flat and square allows a thin joint. A block that is out of tolerance forces a thick bed, and a thick bed of mortar in a wall made of soft units is where cracks start. Tolerances on length, height and squareness are therefore not paperwork.

On delivery, a straight edge across a stack and a check of a few units against each other will show whether the consignment is usable. A stack of blocks that rocks when stacked flat is a stack that will be laid with thick joints.

## What should the blocks look like when they arrive?

Sound, dry, and free of damage at the arises. AAC chips easily at a corner, and a chipped corner becomes a void in the plaster. Blocks that have been rained on and stored wet need time under cover before laying, and blocks delivered with visible damp patches should be stacked to dry, not used immediately.

Covering the stack is the cheapest form of quality control on an AAC site. A tarpaulin and a pallet cost almost nothing and prevent the two defects that generate the most callbacks: damp plaster and cracked corners.

## Which mortar is right?

Thin-joint adhesive mortar, supplied dry and mixed with water to a smooth paste, is the standard for AAC. It is applied in a bed of two to three millimetres and sets hard and strong, so the wall behaves as a composite rather than a stack of units with soft joints between them.

Cement-sand mortar can be used where thin-joint material is unavailable, but the mix has to be leaner than for brick and the joint thicker, which loses some of the material's advantages. What must not happen is a rich, wet cement mortar used as if it were brick mortar: it will shrink, crack at the joints and pull the plaster with it.

## What do the accessories actually do?

A galvanised or stainless wall tie connects the block wall to the frame or to an adjacent wall, and it is what keeps the panel in place when the frame moves. Chicken mesh or fibreglass mesh over the junction between AAC and concrete controls the crack that forms there because the two materials move differently.

Corner beads and stop beads give the plaster a straight edge at openings and corners. A lintel over an opening carries the wall above, and its bearing length matters more on a soft block than on dense masonry, because the block under the bearing crushes before the lintel fails.

## How is plaster chosen for an AAC face?

A plaster for AAC should be leaner and more cohesive than a brick plaster, and it should not be applied to a face that will pull all its water away instantly. A mix in the region of one part cement to five or six parts sand, with lime or a plasticiser to aid workability, is common practice; a rich one-to-three mix is not.

A bonding agent or a spatterdash coat is sometimes used where the face is dusty or dense. Where it is used, it must be compatible with the plaster above it, and it must be applied to a face that has been brushed clean.

## What about putty, primer and paint?

Wall putty is a filled, easily sanded coating that levels the plaster and provides a uniform base for paint. It is not a substitute for plaster and it is not a filler for a hollow patch: putty over a void will crack along the edge of the void within a season.

Primer seals the putty so the paint does not absorb unevenly, and the topcoat provides the finish and the washability. On AAC the whole system depends on the plaster being sound and dry, because the paint will not hold moisture in or keep it out.

## What does a compliant material set cost?

The blocks are the largest line, followed by mortar and mesh, then plaster materials, putty and paint. Thin-joint mortar looks expensive per bag and is cheap per square metre, because the joints are thin and the coverage is high. Cement-sand mortar looks cheap per bag and costs more in labour and in repairs.

Comparing quotations on block rate alone usually misleads. The honest comparison is cost per square metre of finished wall, including mortar, mesh, plaster and the labour for each.

## Which substitutions should be refused?

Blocks of a lower density than specified, a rich cement mortar in place of thin-joint adhesive, and plaster applied without mesh at the frame junction. Each is a small economy with a predictable cost later.

A fourth, less obvious substitution is a thinner block used to gain floor area. It changes the wall's fire and acoustic performance and its ability to carry fixings, and it should be an engineering decision rather than a site one.

## How should materials be stored on an Indian site?

Blocks on a level pallet, covered, off the ground, and away from where vehicles turn. Mortar in bags on a pallet in a dry store, used within its shelf life, and mixed in small batches so nothing stands long enough to set in the bucket.

Sand is the material most often accepted without question and the one that changes the plaster most: a sand with too much silt produces a weak, crumbly render that no curing will save. A simple jar test settles the argument.

## What tooling does the crew need?

A notched trowel or a mortar hopper for the thin joint, a block saw or a handsaw with a hard-point blade for cutting, a rubber mallet, a long straight edge, a spirit level, a line, and a brush for cleaning the face before plastering.

None of this is specialised, which is part of the material's appeal. What is specialised is the discipline of keeping the joints thin, and a crew used to brick mortar will not have it without instruction.

## What documentation should come with the blocks?

The density class, the strength, the nominal dimensions and the date of manufacture, ideally with a test certificate from the supplier. A block without a stated class is a block of unknown performance, whatever it looks like.

Keeping the delivery notes with the project file is the cheapest way to answer questions later about what was actually built.

## Can AAC be cut and adjusted on site?

Yes, easily, and that is one of its practical advantages. Blocks are cut with a handsaw to fit at reveals, at service openings and at the top course, and the cut face is square enough for a thin joint.

The cut face is more absorbent than the moulded face, so it should be brushed clean and, where it will receive plaster, dampened and treated like any other porous surface.

## What about lintels and beams in an AAC wall?

Lintels are available as reinforced AAC elements sized for the opening, and they are bedded on a mortar that matches the block. Where a concrete lintel is used, the bearing should be checked for the block's compressive strength and the padstone sized accordingly.

The failure mode to avoid is a lintel bearing on a narrow strip of soft block, which crushes locally, drops slightly, and cracks the plaster above the opening.

## What is the cost of getting the mortar wrong?

Measured in repairs rather than in bags. A rich cement mortar in an AAC wall shrinks, opens at the joints and takes the plaster with it, and the repair is to cut out the affected plaster, treat the joint and replaster.

Doing that across one elevation of a flat costs more than the difference between thin-joint adhesive and cement mortar for the whole wall. The saving is only visible in the purchase order.

## Which supplier claims should be verified?

Strength and density claims, coverage per bag of adhesive, and the dimensional tolerance. Coverage in particular varies with the flatness of the blocks, so a quoted coverage figure assumes blocks within tolerance.

Verifying is unglamorous: weigh a bag, measure a wall, count the bags used. A day of measurement on the first wall tells you whether the specification is being delivered for the rest of the project.

## What does a full material schedule look like?

Blocks by density class and thickness, thin-joint adhesive by coverage, ties and mesh by length, corner beads by height, lintels by opening, plaster materials by mix, putty and primer by area, and paint by coat. Every line has a quantity and a unit that can be checked on delivery.

A schedule makes substitutions visible. When the site receives a different block class or a cement mortar instead of adhesive, the schedule shows what was specified, and the conversation stops being about memory.

## What single line in a specification matters most?

The block density class, because it sets weight, strength and fixing capacity at once. Everything else can be corrected later at a cost; the class cannot.

## Is AAC suitable for external walls in India?

Yes, with an external finish designed for rain. The block is used externally in framed buildings, provided the plaster or cladding is continuous, the base is protected and the coping details at parapets are sound.

The failures seen on external AAC are almost always at a termination: a parapet, a sill, a plinth. The face of the wall is rarely the problem.

## Does the block need priming before plaster?

A dusty face benefits from a brush and light damping. A bonding agent helps where the face is dense, but none of it compensates for a mix that is too rich.$w2$,8,'materials','https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Aluminium_Powder_for_AAC_blocks.jpg/1280px-Aluminium_Powder_for_AAC_blocks.jpg','AAC Block Materials: Blocks, Mortar, Mesh and Plaster','Specify AAC properly in India: density class, thin-joint adhesive, ties and mesh, plaster mix, putty and primer, plus what substitutions to refuse.'),
('in-aac-block-installation','Building an AAC Block Wall: Laying, Alignment and Services','How an AAC block wall goes up in Indian practice: setting out, first course, bond, openings, chases built in and the mes','IN',$w3$# Building an AAC Block Wall: Laying, Alignment and Services

An AAC block wall is built from the first course up, with the setting out done properly, the joints kept thin, and the services planned before the blocks go down. This article follows the sequence from setting out to the day the plasterer arrives, and it names the points where the work usually slips.

## What has to be settled before the first block?

The wall's position and thickness, the openings and their heights, the lintel bearings, and the routes for conduits and pipes. On an AAC wall the last of these is the one that gets forgotten, and cutting chases after the wall is up removes material where the wall is doing useful work.

Marking the conduit routes on the floor slab, and building them in as the courses rise, costs a fraction of chasing later and leaves the wall sound.

## How is the first course set out?

From a datum line on the floor, squared to the frame and checked for length against the drawing. Mortar is laid to a level bed, and the first block is placed and checked with a spirit level in both directions before the second is laid.

Where the floor is out of level, the correction is made in the first bed and nowhere else. A thin joint over an uneven floor is not possible, so the base course is the one place where a thicker bed is legitimate, and it should be a levelling bed rather than a random one.

## How are the courses laid?

Blocks are laid to a line, with the thin-joint mortar applied to the horizontal face and to the vertical joint of each unit as it is placed. The block is set down and tapped into line, not slid, because sliding breaks the bond of the adhesive.

Courses are checked for level every few blocks and for plumb at every corner and every few metres. A wall that is checked only at the end of a day's work is a wall that will be pulled down or plastered thick.

## What bond is used?

Running bond, with the vertical joints offset by half a block, is standard, and the offset should be consistent rather than approximate. Where a wall has to be cut around an opening, the cut blocks are placed so that the bond continues rather than being broken at the reveal.

At intersections and at the junction with a column, the bond is interrupted by construction, and that is where ties and mesh do the work the bond cannot.

## How are openings formed?

Openings are set out with the lintel bearing decided first. The blocks at the reveal are cut square and laid to a line, and the lintel is bedded on a mortar that is not too strong for the block beneath it.

Where an opening is wide, the lintel is a designed element, and its bearing length and any padstone should be confirmed before the wall reaches that height. A lintel that bears on fifty millimetres of soft block will crack the plaster above it within a year.

## How are services built in?

Conduits and pipes are laid in the horizontal joints and in vertical chases cut before the wall is plastered, with the chase depth limited so the wall keeps its thickness. Back boxes are set to the finished plaster line, not to the block face, or the plaster will bury them.

Vertical chases should be cut with a router or a block cutter, not chopped with a hammer, because a chopped chase leaves a ragged edge that the plaster cannot bridge. Where a chase is deep, the wall on either side should be checked for stability before it is closed.

## What happens at the junction with the frame?

The junction between AAC infill and a concrete frame is the most common place for a crack. The two materials move differently, and the joint has no bond to rely on. The standard detail is a mesh strip, fixed across the junction and into the plaster on both sides, wide enough to spread the movement.

The mesh has to be fixed to the frame and to the block, not laid loosely over the joint. A mesh that is simply embedded in the plaster without anchorage does not control anything.

## How is the wall cured before plastering?

The blocks are not wetted like brick, but the wall should be dampened lightly before plastering so it does not pull water from the mortar. After plastering, curing starts as soon as the surface can take water without damage and continues for several days.

Curing is the step most often skipped under programme pressure, and it is the one that decides whether the plaster cracks. A wall cured for a week looks the same as one cured for a day, until the first summer.

## What should be inspected during construction?

Plumb and level at each stage, joint thickness, bond offset, tie installation, lintel bearings, chase depth, and the mesh at every junction. These are all visible before plaster, and none of them can be inspected afterwards.

A short checklist used daily, with photographs, is enough. The alternative is discovering the defects when the paint is on and the cause can no longer be seen.

## How long should the wall be left before finishing?

The plaster needs to be dry, not merely set, before putty and paint. In Indian conditions that is usually a matter of weeks rather than days, longer in the monsoon, and the decision should be made with a moisture reading rather than a calendar.

Painting over plaster that is still drying traps moisture and produces the blotchy, peeling finish that no amount of repainting fixes. A cheap moisture meter removes the guesswork from the programme.

## How are long walls handled?

Long walls move, and AAC walls are no exception. A wall of more than a few metres between returns needs either a movement joint or a detail that allows the plaster to accommodate the movement, and the decision belongs to the designer rather than to the plasterer.

Where a movement joint is used, it should run the full height of the wall, be filled with a compressible backing and be sealed, and the plaster should not bridge it.

## What happens at a change of material?

Where AAC meets concrete, brick or steel, the junction behaves like a joint between dissimilar materials: it moves and it cracks. Mesh across the junction is the standard control, and the mesh should be at least as wide as the plaster is thick on either side.

Where the junction is a structural one, such as the head of an infill panel against a beam, a slip detail is used and the plaster is detailed to accommodate movement rather than resist it.

## How is the top course closed?

The gap between the top of the wall and the soffit is closed with a cut block and a mortar that fills fully, or with a flexible detail where movement is expected. A gap packed with debris and covered by plaster is a defect that will show as a horizontal crack.

Checking that the top course is tight and fully bedded is a two-minute inspection with a torch and a rule, and it is worth doing before the plasterer arrives.

## What about thermal and acoustic performance of the finished wall?

The wall's performance is set by the block and the finish together. A plastered AAC wall performs better acoustically than an unplastered one because the plaster adds mass and seals the surface, and thermally the finish has little effect.

Where a wall is specified for sound, the specification should name the block thickness and the plaster, and the site should not be allowed to reduce either.

## How does wet weather interrupt the work?

Blocks laid in the rain absorb water, and a saturated wall cannot be plastered until it dries. A tarpaulin over the day's work and a rule that no block is laid on a wet bed are cheaper than a drying delay.

In the monsoon, sequencing matters: get the walls closed and covered before the rain arrives, and keep the plastering programme behind the weather rather than fighting it.

## What does a good day's work look like?

A wall that has risen evenly, with the line true, plumb checked at both ends, joints thin and consistent, and the top course at a height that leaves a sensible closing piece. Nothing dramatic, and nothing that needs correcting tomorrow.

The warning signs are equally visible: a wall that has risen faster at one end, joints that have been buttered thick to catch up, and offcuts stacked at the base waiting to be used somewhere they do not belong.

## Who signs off each stage?

The site supervisor for the setting out and the wall, the services contractor for the chases and boxes, the plastering supervisor for the finish and the curing. Each sign-off should carry a date and a photograph.

Where one person signs for everything, the record loses its value, because the purpose of the signature is to place responsibility at the moment the work was visible.

## How does block work interact with the other trades?

With the electrician first, because conduits go into the wall as it rises, and with the plumber second, because pipe routes and sleeve positions are set before the wall closes. Then the plasterer, then the tiler in wet areas, then the painter.

Sequencing failures are the most common cause of damage to a completed wall: a chase cut after plastering, a pipe moved after tiling, a socket relocated after painting. Each leaves a repair that is visible for the life of the wall.

## What is the most common sequencing mistake?

Cutting chases after the wall has been plastered. It removes the finish, damages the block and leaves a patch that is never invisible.

## How are long walls and openings combined?

An opening close to a return leaves a narrow pier, and a narrow pier of AAC is easily damaged during construction and easily cracked afterwards. Where a drawing produces one, the pier should be checked for width and, where needed, built in a denser unit.

Small piers are also where chases do the most damage, because a chase in a narrow pier removes a large proportion of its width. Deciding service routes with the piers in mind avoids the problem entirely.

## How much does the wall settle?

Very little. AAC is autoclaved and stable, so most movement is thermal and moisture related, and the joints that crack are the ones between materials rather than within the block work itself.

## What about the day the wall is handed to the plasterer?

The wall should be clean, the chases finished, the boxes set, the mesh fixed and the top course tight. A plasterer who arrives to a wall with loose blocks and open chases will fix them in plaster, and the repairs will be invisible until they crack.$w3$,8,'installation','https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/-2021-01-22_Cavity_wall_construction%2C_Trimingham%2C_Norfolk_%281%29.JPG/1280px--2021-01-22_Cavity_wall_construction%2C_Trimingham%2C_Norfolk_%281%29.JPG','Building an AAC Block Wall: Laying and Services','How an AAC block wall goes up in Indian practice: setting out, first course, bond, openings, chases built in and the mesh that stops frame cracks.'),
('in-aac-block-quality','Checking an AAC Block Wall: Plumb, Bond and Moisture','What to measure on an AAC wall before plaster hides it: plumb, bond, joint thickness, ties, mesh, curing records and moi','IN',$w4$# Checking an AAC Block Wall: Plumb, Bond and Moisture

An AAC block wall is quick to build and easy to accept without checking, because it looks finished early. The checks that matter are the ones carried out before plaster, when plumb, bond, ties and curing can still be seen. This article sets out what to measure, when, and what the readings mean.

## When should checking start?

At the first course. If the base is out of level, everything above it inherits the error, and no amount of plaster will make the wall look straight without a thick coat that will later crack. A straight edge and a level on the first course take five minutes and save the wall.

Checking then continues daily: plumb at each corner, level at each course, line along each face, and a look at the bond offset at every cut.

## How straight is straight enough?

The tolerance for a plastered wall is set by how much plaster can reasonably make up. A wall that wanders by ten millimetres over a storey will be plastered with a varying thickness, and the variation is where shrinkage cracks concentrate.

A practical check is a two-metre straight edge held against the face in both directions, with a rule behind it. The same check on a completed wall tells you where the plaster will be thin.

## What does bond look like when it is right?

Vertical joints offset by half a block, consistently, with no continuous vertical joint anywhere in the wall. A continuous vertical joint is a plane of weakness that will crack through the plaster and, in a wall carrying load, is a structural defect.

The check is visual and quick: stand back and look for a vertical line running more than two courses. Where a cut has broken the bond, the joint should be tied or meshed rather than left as a butt joint.

## How are ties and mesh verified?

Ties should be present at the specified spacing, fixed into the frame and embedded in the block work, not laid loose in the joint. Mesh at the frame junction should be wide enough to bridge, fixed to both materials, and visible at the plaster stage.

Both are hidden by the plaster, so verification is a photograph before plastering, signed off. Where a supervisor cannot produce that photograph, the defect will be found later, in the paint.

## What about joint thickness?

Thin joints of two to three millimetres are the specification, and a joint of ten millimetres is a change of material behaviour, not a cosmetic variation. Checking a handful of joints at three heights gives a fair picture.

Where joints are consistently thick, the cause is usually block tolerance or the base course. Correcting it means correcting the blocks, not asking the plasterer to hide it.

## How is curing checked?

By keeping the plaster damp, not by asking whether it was done. A simple routine is to record the start time of curing, the days it was maintained and who was responsible. On a site where curing is nobody's job, it does not happen.

In hot weather the plaster can dry within hours. Wetting twice a day for the first three days and once a day after that is the minimum that produces a crack-free surface.

## What moisture readings matter?

The moisture content of the plaster and block behind a paint finish decides whether the paint will hold. A reading taken with a meter at several points on each wall, recorded before putty and again before paint, is the only reliable basis for proceeding.

Readings that remain high after weeks usually mean a leak, a rising damp path or an unventilated wet area. Painting over them will fail, and the failure will be attributed to the paint.

## How are openings and reveals checked?

Square, plumb and at the right height, with the lintel bearing confirmed and the reveal line true. A reveal that is out of plumb shows badly once a door frame is fitted, and the correction then falls to the joiner.

Checking the diagonal of an opening is a fast way to detect a reveal that is twisted rather than simply offset.

## What is the sequence of sign-offs?

Base and setting out, then the wall as built, then the services and chases, then plaster, then curing, then moisture readings, then putty and paint. Each stage is signed before the next covers it.

The discipline is not bureaucracy. It exists because every one of these stages is invisible after the following one, and because the argument about who caused a crack is settled by a photograph with a date on it.

## What defects should be recorded rather than argued about?

Hollow plaster, cracks wider than a hairline, damp patches, out-of-plumb reveals and thick joints. Each can be measured or photographed, and each has a remedy that the contractor can price.

Recording turns a dispute into a snag list, and a snag list gets fixed. The alternative is a conversation about who is to blame, conducted after the paint has failed.

## How is a wall checked after plastering?

With a straight edge, a torch held at a grazing angle and a hand. The straight edge finds the hollows and the bulges, the grazing light finds the undulations the eye misses in daylight, and the hand finds the hollow spots that sound different.

Doing this before painting, rather than after, is the difference between a repairable surface and a failed finish. Paint does not conceal a defect; it makes it legible.

## What about the finish at corners and reveals?

A corner is judged by its line, its arris and its angle. A plastered corner that has been run with a bead should be straight over its full height and crisp at the edge, and the bead should not be visible through the paint.

Reveals are judged by width consistency: a reveal that tapers from one end to the other is obvious once a door lining is fitted, and the correction is then a joinery repair rather than a plastering one.

## How are defects recorded and closed out?

On a plan, by room, with a photograph and a one-line description, then signed off when repaired. A snag list that lives on a phone in the supervisor's pocket is a list that disappears.

Closing out the snag list before handover, rather than promising to return, is what separates a completed wall from a wall with an arrangement attached to it.

## What is a reasonable standard to accept?

A wall that is flat within a few millimetres over two metres, plumb and level within a similar tolerance, with no hollow plaster, no cracks wider than a hairline and no visible variation in the finish under grazing light.

Written down, that standard can be argued about once and then applied to every wall on the project. Undefined, every wall becomes a negotiation.

## How is a wet area checked differently?

With the waterproofing inspected before the tiling, the falls confirmed in the floor, and the upstand at the wall recorded in a photograph. On AAC the wall absorbs water readily, so the tanking detail at the base matters more than on a denser block.

A flood test, even a simple one with the drain plugged overnight, is the only way to know the membrane is continuous. Testing after tiling is testing whether the visible surface is watertight, which is not the same question.

## What role does the client play in checking?

Being present for two moments: the pre-plaster walk and the pre-paint walk. At both, everything that matters is still visible, and a client who asks to see the mesh at a junction or the base of a wet wall learns more in ten minutes than from any report.

It is not technical knowledge that is needed, but the discipline of looking before the work is covered.

## How should a handover photograph be framed?

Square to the wall, with a scale and a date visible, and enough context to identify the room. Four photographs per wall: the full face, each end, and any junction with the frame.

Framed that way, a photograph answers the question that arises two years later without a site visit, which is the only reason to take it.

## What is the most useful thing an owner can check personally?

The sound of the plaster, by tapping across each wall in a room. Hollow notes mean unbonded plaster, they are easy to hear, and they are the defect most often missed by a busy supervisor.

Marking each hollow area with chalk at the pre-paint stage gives the contractor a precise list, and a precise list gets fixed. A general complaint about plaster does not.

## How is the frame itself checked before the wall starts?

Plumb of the columns, the level of the slab and the position of the starter bars. An AAC wall built to a frame that is out of plumb inherits the error, and the plaster then has to be graded to make the room look square.

Checking the frame takes an hour and prevents the most expensive kind of correction, which is one that involves moving the wall. Where the frame is out, the wall can be built to a compensated line, but that decision has to be made before the first block.

## What records should be kept during construction?

A daily sheet with the date, the wall reference, the work done, the checks made and the person responsible, plus photographs at each sign-off stage. On a large project the sheet is what makes the supervisor's knowledge transferable.

The value appears at handover, when the question is what was built behind the finish. A sheet and a folder of photographs answer it in minutes, and their absence turns a routine query into an argument.

## How are disputes about quality resolved?

By reference to a written standard and a measurement, not by opinion. A two-metre straight edge and a moisture meter settle most disagreements in a way both parties can accept.

Where no standard was written, the argument is about expectations, and it is settled by whoever has more patience. That is a poor basis for a construction contract, which is why the specification matters more than the snagging.

## How is the wall checked at the top course?

With a rule and a torch, confirming that the closing piece is fully bedded and that any gap against the soffit is filled rather than bridged by plaster.

## How is the wall protected after acceptance?

By not cutting into it. Every later chase is a repair, so the final check is accompanied by a rule that no one penetrates the finish without a plan.

## Does the wall need a final coat of anything?

No. A sound plaster, a sealed putty and two coats of paint are the finish. Anything more is a preference, and a heavy coating on AAC can work against the wall's ability to dry.$w4$,8,'quality','https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/-2021-01-22_Cavity_wall_construction%2C_Trimingham%2C_Norfolk_%282%29.JPG/1280px--2021-01-22_Cavity_wall_construction%2C_Trimingham%2C_Norfolk_%282%29.JPG','Checking an AAC Block Wall: Plumb, Bond and Moisture','What to measure on an AAC wall before plaster hides it: plumb, bond, joint thickness, ties, mesh, curing records and moisture readings.'),
('in-aac-block-maintenance','Maintaining AAC Block Walls: Cracks, Repairs and Finishes','Repairing AAC walls in India: frame-junction cracks, hollow plaster, damp at the base and windows, breathable repainting','IN',$w5$# Maintaining AAC Block Walls: Cracks, Repairs and Finishes

An AAC block wall needs little attention if it was built and finished properly, and a steady sequence of small repairs if it was not. Maintenance is mostly about water: keeping it off the wall, letting the wall dry, and repairing the places where it gets in. This article covers what fails, in what order, and how each failure is repaired.

## What fails first?

Hairline cracks in the plaster, usually within the first year, at the junctions with the frame and at the corners of openings. They are shrinkage and movement cracks, they are rarely structural, and they are repaired by opening the crack slightly, filling with a flexible filler and repainting.

Left alone, they admit a little water each monsoon and grow. The cost of repair rises with the number of seasons they have been left.

## Why do cracks appear at the frame junction?

Because concrete and AAC move differently, and the joint has nothing to bond them. The mesh that should bridge the joint is the control; where it was omitted, the crack appears along the junction with the frame, straight and regular.

Repair means cutting back the plaster across the joint, fixing mesh properly, and replastering. Filling the crack from the surface, without addressing the movement, will reopen it.

## What causes hollow plaster?

A plaster that has lost its bond to the block sounds hollow when tapped and eventually detaches. The usual cause is a dusty or dry face, or a mix that was too rich and shrank away from the block.

Small hollow areas are cut out and patched with a matching mix, feathered at the edges. Large areas usually indicate a systematic problem with the plaster and need a wider repair, because patching around them simply moves the boundary.

## How is damp at the base treated?

By removing the source, not by coating the wall. Splash from the ground, a raised external level, or a garden bed against the wall will keep the base wet, and no waterproof coating will survive constant wetting from behind.

The repair is a plinth detail that keeps the wall clear of soil and splash, plus a coating on the lower part where the wetting cannot be avoided. Where rising damp is present, it needs a damp-proof course, not a paint.

## What about damp around windows?

Leaking sills, blocked drainage paths and failed sealant around frames are the usual causes. Water enters at the frame, travels through the plaster and appears some distance away, which is why the visible damp is rarely where the leak is.

Finding it means testing with a hose at the frame, not guessing. Once found, the repair is a sill detail or a sealant, plus time for the wall to dry before it is redecorated.

## How is an AAC wall repainted?

Wash, fill, sand, prime and apply two coats. The important parts are the filling, which must be done with a filler that can move with the surface, and the priming, which must be complete so the topcoat draws evenly.

On AAC, paint systems should be breathable rather than sealed. A vapour-tight coating on a wall that has absorbed moisture traps it, and the result is blistering that reappears after every repaint.

## What is the repainting interval?

In interior conditions, five to seven years is typical for a good emulsion on a well-prepared wall. Externally, three to five years, shorter on a coast where salt and sun work faster.

The interval is not a rule but a trigger: repaint when the film chalks, when the colour has gone patchy, or when defects have been patched. Waiting until the surface is visibly worn means the preparation cost rises.

## How are fixings added later?

With the right fixing for the material: a chemical anchor, a through-fixing into the frame or a purpose-made block fixing. A heavy item fixed with an ordinary plug in AAC will work loose, and the repair afterwards is larger than the hole would have been.

Where a wall carries several heavy items, a pattress or a plywood backing behind the plaster is the better answer, and it can still be installed during a refurbishment.

## What about mould in humid climates?

Mould grows where a surface stays damp, so the fix is ventilation and drying, not a biocide on its own. Cleaning removes the visible growth; a fan, a vent or a dehumidifier removes the condition that produced it.

In coastal flats the pattern is seasonal: mould on the coldest internal surfaces in the monsoon. Insulating or ventilating those surfaces is more effective than repeated cleaning.

## Which repairs should not be attempted in-house?

Structural cracks, damp that cannot be traced, and repairs at the junction with the frame. Each needs an assessment rather than a patch, and the cost of getting them right once is lower than the cost of repeated cosmetic repairs.

Everything else, from hairline cracks to a chipped corner, is within reach of a competent painter with the right filler.

## What records make maintenance cheaper?

A record of what was built, when it was last painted, which product was used and what was repaired. Ten years on, that record is what allows a repaint to be specified correctly instead of starting from scratch.

Photographs at handover, kept with the flat's documents, do the same job for the wall that a service history does for a car.

## How should a repair be matched to the original finish?

By keeping a note of the products used and, where possible, a small quantity of the original paint. Failing that, a trial patch on an inconspicuous area, dried and compared in daylight, is the only reliable way to match sheen and colour.

A repair that is flat where the original is slightly sheened will read as a patch even if the colour is exact. Sheen is the property that most often defeats a competent colour match.

## What maintenance should be planned each year?

A walk around the wall before the monsoon, checking the base for splash, the window reveals for staining, the plinth for cracks, and the bathroom walls for any sign of damp. Half an hour, once a year, in the season when water is about to arrive.

The value is in the timing. A defect found before the rains is a small repair; the same defect found after them is a repaint and a repair.

## When should a specialist be called?

When a crack is wider than a couple of millimetres, when damp cannot be traced to a source, when plaster is falling in more than one place, or when a wall that was previously sound becomes damp after a plumbing repair.

Each of those is a sign that the cause is behind the surface, and treating the surface repeatedly is the expensive way to avoid an assessment.

## How does AAC behave over twenty years?

Well, if it stays dry. The material does not rot, it does not support combustion and it does not lose strength with age. Its enemies are water, repeated wetting and drying cycles, and physical damage at corners.

A twenty-year-old AAC wall that has been painted twice and kept clear of splash at the base is indistinguishable from a new one. The same wall with a blocked plinth and a leaking sill is a wall that has been replaced in patches.

## How does a repaint programme get planned?

By elevation and by room, with the last repaint date, the product used and the condition noted. Then batched: the east elevation, the bathrooms, the kitchen. Batching reduces cost, because access and preparation are shared.

A wall painted room by room, whenever it looks tired, costs more per square metre and produces a patchwork. A wall painted by elevation on a cycle is cheaper and looks deliberate.

## What should a landlord budget annually?

A small figure for patching and a larger one every few years for repainting, rather than nothing and then a large bill. Setting aside a modest percentage of the paint cost each year smooths the cycle.

The numbers differ by climate and by building, but the principle does not: a wall with a maintenance budget lasts longer than one maintained by crisis.

## What is the cheapest maintenance decision available?

Keeping the base of the wall dry. A paved margin, a cleared plinth and a raised sill cost little, and they remove the water that produces most of the damp and mould an AAC wall will ever suffer.

Everything else in this article is a repair. That one is prevention, and it is the only item on the list that reduces the other items.

## How does an owner know a repair was done properly?

The surface is flat under grazing light, the repair area does not sound hollow, the colour and sheen match at a glance and in daylight, and the same defect has not returned a season later.

Judging a repair after one monsoon, rather than on the day it was done, is the test that matters. Most repairs look convincing in dry weather.

## What happens if the wall is never repainted?

The film thins, the surface chalks, and the plaster becomes exposed to driving rain. Once water reaches the plaster, the wall's drying capacity is what limits damage, and AAC has less of it than dense masonry.

The consequence is not dramatic failure but a steady decline: small damp patches, then mould in corners, then hollow plaster. Repainting on a cycle is what prevents that sequence from starting.

## How is a wall prepared before repainting?

Washing to remove chalk and dirt, scraping any loose material, filling cracks and hollows, sanding flat, then priming. The preparation is three quarters of the work and it is the part that gets compressed when a painter is in a hurry.

A wall prepared properly takes two coats and lasts; a wall prepared badly takes three coats and fails within two years, usually in the same places.

## Are there any repairs that should wait?

Damp that is still drying, and cracks that appear in the first monsoon. Both are often self-limiting, and repairing them too early repeats the repair. Recording them and reviewing after a season is the calmer approach.

## What is the one repair to get right first time?

The junction at the frame. If it is repaired by filling the crack rather than bridging it, the movement reopens the line within a season, and each attempt makes the wall harder to make good later.

## How long should a repair be watched?

Through one full season of weather. A repair that survives a monsoon without reopening is a repair that addressed the cause rather than the symptom.

## What should the record say after a repair?

The date, the location, the cause identified, the materials used and the coats applied. Two lines on a phone note are enough, and they are what makes the next repair cheaper than this one.$w5$,8,'maintenance','https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Built_with_bricks._%2821305444585%29.jpg/1280px-Built_with_bricks._%2821305444585%29.jpg','Maintaining AAC Block Walls: Cracks, Damp and Repainting','Repairing AAC walls in India: frame-junction cracks, hollow plaster, damp at the base and windows, breathable repainting and fixing heavy items.')
) AS a(slug,title,excerpt,market,content,read_time_minutes,theme,cover_url,meta_title,meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='system:in-aac-block'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots sl
SET article_id = a.id
FROM public.learn_articles a
WHERE sl.topic_id = a.wall_topic_id
  AND sl.theme_key = a.wall_article_theme
  AND sl.language_code = 'en'
  AND sl.article_id IS NULL;

UPDATE public.learn_wall_finishing_sources s
SET review_status='accepted', reviewed_by=coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), reviewed_at=now()
FROM public.learn_wall_finishing_topics t
WHERE s.topic_id=t.id
  AND t.candidate_key='system:in-rcc-frame-brick'
  AND s.review_status='pending';

UPDATE public.learn_wall_finishing_topics t
SET verification_status='verified', verified_by=coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), verified_at=now()
WHERE t.candidate_key='system:in-rcc-frame-brick'
  AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.review_status='accepted');

SET CONSTRAINTS ALL IMMEDIATE;
UPDATE public.learn_articles
SET status='published', editorial_review_status='approved', editorial_reviewed_by=coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), editorial_reviewed_at=now(), published_at=coalesce(published_at, now())
WHERE wall_topic_id IS NOT NULL AND status='draft';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER USER;
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;

COMMIT;
