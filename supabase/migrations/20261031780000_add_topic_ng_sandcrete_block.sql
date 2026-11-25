BEGIN;
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope) SELECT t.id,v.title,v.publisher,v.url,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES ('ABNT NBR 13749 - pintura de fachadas','ABNT','https://www.abnt.org.br/','Exigencias de pintura de paredes externas'),('Manual de revestimento de fachadas','ABCP','https://abcp.org.br/','Argamassas de revestimento externo, chapisco, emboco e textura'),('Normas e boas praticas de fachada','CBIC','https://cbic.org.br/','Praticas de execucao, vedacao e manutencao de fachadas'),('Formacao em pintura e revestimento externo','SENAI','https://www.senai.br/','Tecnicas de revestimento, textura e pintura de fachada')) AS v(title,publisher,url,claim_scope) WHERE t.candidate_key='system:ng-sandcrete-block' AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);
INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,status,author,read_time_minutes,cover_image_url,meta_title,meta_description) SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation',a.market,t.id,a.theme,'en','draft','FRELUX Learn',a.read_time_minutes,a.cover_url,a.meta_title,a.meta_description FROM (VALUES
  ($a1$ng-sandcrete-block-overview$a1$, $b1$Sandcrete block walls in Nigeria: how the wall is built$b1$, $d1$Sandcrete block walls in Nigeria explained: block strength, mortar, render and paint, and what makes a wall last through rainy season.$d1$, 'NG', $w1$# Sandcrete block walls in Nigeria: how the wall is built

A sandcrete block wall is the default wall of Nigerian construction, from Lagos bungalows to Abuja duplexes and school blocks in Kaduna. It is a wall made of hollow or solid blocks moulded from a sand and cement mix, laid in mortar, then rendered and painted. Understanding how that wall performs, what it costs and where it fails is the difference between a building that stands for forty years and one that shows cracks before the first rainy season ends.

The wall is simple in principle and demanding in practice. Sand, cement and water become blocks. Blocks become a wall. Mortar joins them. Render covers them. Paint protects the render. Each stage carries the next, and each stage has a failure mode that shows up months later, usually as a crack above a window, a damp patch at the base or paint that peels in sheets.

## Why sandcrete and not brick

Nigeria builds with sandcrete because sand is everywhere, cement is available in every state capital and the block can be moulded on site with unskilled labour supervised by one experienced hand. Clay brick needs a kiln, a supply chain and a tradition of bricklaying that most states do not have at scale. Concrete block, the machine-pressed cousin of sandcrete, is stronger and more consistent, and it dominates commercial work in Lagos and Port Harcourt where block strength is specified and tested.

The practical consequence is a market where quality varies enormously between one site and the next. A block from a roadside moulding yard in Ibadan and a block from a mechanised plant in Lekki can share the same nominal size and differ by a factor of two in compressive strength. That difference is invisible once the wall is rendered.

## What the wall actually carries

A sandcrete block wall in a framed building carries almost nothing but itself and the wind. In a loadbearing building, and much of Nigerian low-rise housing is loadbearing, the wall carries the floor and roof loads down to the strip footing. That distinction matters more than any other single fact about the wall, because it determines the block strength, the mortar mix and the supervision required.

In loadbearing work, a 150 mm hollow block is not a substitute for a 225 mm block. Builders who substitute to save cost create a wall that stands until it is loaded, then cracks at the corners and over openings. The failure is slow, visible and expensive.

## The build sequence in plain terms

Setting out comes first: corners squared, lines run, levels transferred from the foundation. Then the first course, laid on a mortar bed thick enough to correct any irregularity in the footing. Then courses to the next opening, with the blockwork brought up evenly on both sides of the wall line so the work does not lean.

Openings are formed with lintels or beams, never by leaving blocks unsupported. Above the opening, a reinforced lintel spans the gap and bears at least 150 mm on each side. After the wall reaches full height, it cures before rendering. Rendering comes in two coats, a spatter dash or scratch coat for grip and a finishing coat for level. Paint follows when the render is dry, not when it looks dry.

## Where the money goes

In most Nigerian markets, the wall is one of the three largest line items in a house budget, alongside the roof and the foundation. The block itself is often the cheapest component per square metre. Labour, mortar, scaffolding and render cost more than the block. A cheap block that needs thicker render to look straight ends up costing more than an expensive block that does not.

The cost lesson repeats everywhere: the wall is a system, and the cheapest component rarely produces the cheapest wall.

## What this series covers

The five articles in this cluster take the wall apart. Materials covers block specification, mortar ratio and render mix. Installation covers setting out, blocklaying, openings and curing. Quality checks covers what to test and when. Maintenance covers cracks, efflorescence, damp and repainting. The overview you are reading sets the frame: what the wall is, why it is built this way and what decides whether it lasts.

## The one habit that matters most

Supervision beats specification. A site with a tested block, a stated mix and someone who checks plumb every third course will outperform a site with better drawings and nobody watching. In sandcrete construction, the wall records every shortcut taken, and it records them in public, on the elevation, for the life of the building.

## How the wall behaves in Nigerian weather

Two seasons do different damage. The rains test the render and the paint. The dry season and the harmattan test the block itself, because the wall dries, shrinks and moves while the sun heats one face and not the other.

A wall that is rendered on the outside and left bare inside will move differently on each face. That differential movement is why external render and internal plaster should be applied close together in time, not months apart. Where the two faces are finished in different seasons, hairline cracks appear at the junction of wall and ceiling, and along the line where an extension meets the original building.

Wind-driven rain on the coast is the other factor. In Lagos and Port Harcourt, rain does not fall vertically. It hits the wall at an angle and finds every defect in the render: a hollow patch, a shrinkage crack, a joint that was not filled. Buildings near the water show damp on internal walls within two seasons if the external render is not sound.

## Where the wall fails, in order of frequency

Cracks above openings come first, almost always because the lintel bears too little or the block over the opening was not bonded. Cracks at corners come second, usually from foundation movement or from a wall built without a proper return. Damp at the base comes third, from ground level being too high relative to the floor or from a missing damp proof course.

Efflorescence comes fourth: white salt bloom on the render, a symptom of moisture moving through the wall and evaporating at the surface. Paint failure comes last, and it is usually a consequence of the other four rather than a problem in its own right.

## Who does the work

Blocklaying in Nigeria is learned on site. Formal training exists, and the Council of Registered Builders of Nigeria sets standards for the industry, but the labour market is dominated by hands trained by other hands. That is not automatically bad. It does mean that the specification on the drawing only becomes real if someone on site understands why it is there.

The practical rule is to check the first three courses yourself. If the first courses are square, level and properly bonded, the wall will usually follow. If they are not, no amount of supervision later will fix the geometry.

## What good looks like at handover

A good sandcrete wall, at handover, has an even surface under a straight edge, no hollow sound when tapped, no crack wider than a hairline, dry skirting boards and paint of one consistent tone across each elevation. Those five checks take twenty minutes and tell you more than any certificate.

Everything else in this cluster explains how to get to that handover.

## What the owner should ask before work starts

Four questions. What block strength is specified, and can I see a test result. What mortar mix will be used on site, not on the drawing. Who checks plumb and how often. When will the wall be cured, and with what.

A builder who answers all four without hesitation is a builder who has done this before. A builder who answers none is a risk that no contract clause will fix.

## A note on drawings

Most Nigerian house drawings specify blockwork in a note rather than a detail. The note says 225 mm sandcrete block in cement mortar, and stops there. That is a specification of shape, not of performance. The block strength, the mortar ratio and the curing regime are all left to the site.

Owners who want a wall that performs should convert that note into three numbers: block strength in newtons per square millimetre, mortar ratio by volume, and curing days. Three numbers on a drawing change more outcomes than three pages of general conditions.

## The bottom line

Build the wall as a system and it disappears into the building. Build it as a stack of blocks and it announces itself every rainy season.$w1$, 9, 'overview', $v1$https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Stacks_of_red_bricks_and_concrete_blocks_at_a_construction_site_during_the_day_in_an_urban_environment.jpg/1280px-Stacks_of_red_bricks_and_concrete_blocks_at_a_construction_site_during_the_day_in_an_urban_environment.jpg$v1$, $t1$Sandcrete block walls: how they are built$t1$, $m1$Sandcrete block walls in Nigeria explained: block strength, mortar, render and paint, and what makes a wall last through rainy season.$m1$),
  ($a2$ng-sandcrete-block-materials$a2$, $b2$Materials for sandcrete walls: block, mortar, render and paint$b2$, $d2$How to specify sandcrete blocks, mortar mix and paint for Nigerian walls, with the checks that separate good block from weak stock.$d2$, 'NG', $w2$# Materials for sandcrete walls: block, mortar, render and paint

Material choice decides the wall before anyone lays a block. In Nigeria, the specification that matters is short: block strength and size, mortar ratio, render mix and the paint system. Everything else is detail.

## Specifying the block

Sandcrete blocks are specified by size and by compressive strength. The common sizes are 450 by 225 by 225 mm for loadbearing external walls, 450 by 225 by 150 mm for internal partitions and 450 by 225 by 125 mm for non loadbearing work. Strength is expressed in newtons per square millimetre, and the standards organisation of Nigeria publishes the requirements that blocks should meet.

In practice, three things separate a good block from a bad one. The mix, usually one part cement to six or eight parts sand for a good block and leaner for a cheap one. The compaction, which is the difference between a block that rings when tapped and one that crumbles at the corner. And the curing, which is where most roadside yards fail, because blocks left in the sun without water never reach their design strength.

A simple field test: drop a block flat from waist height onto hard ground. A well made block breaks into a few large pieces. A weak block shatters into crumbs. It is not a laboratory test, but it separates the two categories on the site in five seconds.

## Mortar, and why the ratio matters

Mortar joins blocks and accommodates their irregularities. A mix of one part cement to four or five parts sand is the working range for structural blockwork. Richer mixes are stronger than the block and cause cracks at the joint instead of distributing movement. Leaner mixes crumble and let water in.

The joint thickness should be about ten millimetres, consistent, with the vertical joints filled. Unfilled vertical joints are the single most common defect in Nigerian blockwork, and they are invisible after rendering. They also halve the wall's resistance to rain penetration.

## Render, in two coats

Rendering is a two coat operation. The first coat, sometimes called a spatter dash or scratch coat, is a strong mix thrown or pressed onto the wall to key into the block surface. The second coat brings the wall to level and provides the surface the paint will sit on.

A common mistake is to apply one thick coat to save time. It shrinks, cracks and debonds. Two thinner coats, with curing between them, produce a surface that lasts. Where the wall is very uneven, the correct answer is to correct the blockwork, not to build up render to fifty millimetres.

## The paint system

Exterior paint on a rendered wall needs three components: a primer or sealer to control suction, a topcoat that resists rain and ultraviolet light, and enough coats to reach the manufacturer's stated thickness. In Nigerian conditions, acrylic emulsions and textured coatings dominate the market.

The cheapest emulsion on the shelf often needs three coats to cover, which erases the saving. A mid-range acrylic at two coats usually costs the same and lasts twice as long. On the coast, where salt is in the air, the difference is larger still.

## Sand: the material nobody specifies

Sand is the largest ingredient by volume and the least specified. Sharp, well graded river sand produces a strong block. Fine, silty sand produces a weak one, and no amount of extra cement fully compensates.

A simple test on site: squeeze damp sand in your hand. If it holds shape and breaks cleanly, it has enough fines to work. If it stains your palm with mud, it carries too much silt and should be washed or rejected. Sand with visible clay lumps should not go into a block mould at all.

## Cement: storage is part of specification

Cement loses strength in storage. A bag that has sat through a rainy season in a damp store, or hardened into lumps, is not the product the specification assumed. Bags should sit on pallets, off the floor, under cover, used in rotation.

On site, the tell is lumps. Lumpy cement should be sieved and used only in non structural work, or rejected. Using it in a block mix is how a wall ends up with a strength nobody can explain.

## Water and curing

Clean water, not water from a drain or a muddy puddle. The curing regime matters as much as the mix: blocks cured with water daily for a week reach far higher strength than blocks left dry. On site, this means covering the block stack and wetting it, which costs one labourer's attention for a few minutes a day.

For rendered walls, curing the render for three days before the next coat prevents the shrinkage cracks that later look like structural faults.

## What to buy, in order of return

Spend first on block quality, second on supervision, third on render materials, fourth on paint. The order is not intuitive, because paint is the visible part. But paint on a sound wall lasts eight years and paint on a cracked wall lasts two, whatever the tin says.

## Sourcing without guesswork

Buy blocks from a yard that cures under cover and can show a consistent stack. Buy cement from a distributor with turnover, not from a shop where bags have faded. Buy sand from one supplier and keep the source, because changing sand mid project changes the block.

That is the whole material specification, and it fits on one page.

## The block moulding decision

Many Nigerian projects mould blocks on site rather than buying them. This can save money and can also produce the weakest wall on the street, depending on who is supervising. On site moulding makes sense when the sand is good, the cement is fresh, curing can be managed and one person owns the quality.

It makes no sense when the moulding is handed to a gang paid by the block. Volume pay rewards speed, and speed in block moulding means lean mixes and short curing. If you mould on site, pay by tested output, not by count.

## Storage of blocks before laying

Blocks should be stacked on level ground, off wet soil, and left to cure rather than laid the day they are moulded. A block that goes into the wall at three days old is still shrinking. Laying it locks that shrinkage into the wall, and the wall cracks along the joints.

Two weeks of curing before laying is the practice that separates a wall that stays true from one that moves in its first year.

## A final word on substitution

Substitution is where material specification dies. The block becomes 125 mm instead of 150. The cement becomes a cheaper brand mid project. The render becomes one coat instead of two. Each substitution is small and each is justified by cost.

Taken together they turn a specified wall into an unspecified one. The fix is procedural, not technical: any substitution is written down, approved and recorded, so that the wall has a history instead of a rumour.

## Matching products across the wall

The render, the primer and the paint should come from a system that is designed to work together. Manufacturers publish compatible systems, and using them removes the risk of a primer that seals too well or a topcoat that attacks the render.

Where products are mixed, the risk is not the average result but the worst interaction, and that shows up months later in one patch of wall.

## What sandcrete block actually is

Sandcrete is a mixture of sand, cement and water, moulded and cured. It is not concrete, which contains coarse aggregate. That single difference explains most of its behaviour: sandcrete is weaker in compression and more porous than concrete, so it depends on good curing and a sound mortar to perform.

Block strength is quoted in N/mm2 and the common range in Nigerian production runs from about 1.5 to 4.5 N/mm2. A block that crumbles at the corner when handled is at the bottom of that range, whatever the seller says.

## Buying blocks on site

Ask three things: where the blocks were cured, how long they have been stacked, and whether they ring when struck. Blocks that ring are dense and well cured. Blocks that thud are dry, weak or cracked internally.

Buy from a yard that keeps stock moving. Blocks stacked for months in the open lose strength to alternate wetting and drying.$w2$, 8, 'materials', $v2$https://upload.wikimedia.org/wikipedia/commons/b/b0/EFTA00002210_-_Gravel_path_leads_from_a_construction_site_filled_with_building_materials_and_stacks_of_concrete_blocks_overlooking_the_ocean_under_a_partly_cloudy_sky.jpg$v2$, $t2$Sandcrete block, mortar and paint to specify$t2$, $m2$How to specify sandcrete blocks, mortar mix and paint for Nigerian walls, with the checks that separate good block from weak stock.$m2$),
  ($a3$ng-sandcrete-block-installation$a3$, $b3$Building the sandcrete wall: setting out to curing$b3$, $d3$Setting out, first course, blocklaying, curing and rendering: the sequence that keeps a Nigerian sandcrete wall straight and sound.$d3$, 'NG', $w3$# Building the sandcrete wall: setting out to curing

Execution is where specification becomes a wall. The sequence is fixed and the tolerances are tight, which is good news: a supervisor who knows the sequence can control the outcome without any laboratory.

## Setting out

Setting out starts at the foundation, not at the wall. Corners are established from the site plan, squared using the three four five method or a total station, and checked diagonally. A wall built on a foundation that is out of square will be out of square forever, and every later trade inherits the error.

Lines are then run between corners, and the first course is laid to the line, not to the eye. The line is checked for level and for straightness before the second course starts. Doing this once properly saves a week of correction later.

## The first three courses

The first course sits on a mortar bed that corrects the footing. Where the footing is high in one place and low in another, the bed varies in thickness, and that is acceptable in the first course only.

Courses two and three establish the wall's character. They are checked for plumb on both faces, for level along the line, and for bond. Blocks should be laid so that vertical joints do not align between courses. A running bond with a half block at the corner is the standard, and a stack bond without reinforcement should not appear in a loadbearing wall at all.

## Openings and lintels

Openings are set out from the drawing and formed with a lintel that bears at least 150 mm on each side. In loadbearing walls the lintel is reinforced concrete, cast in place or precast, and it must be cured before the wall above is loaded.

The blocks above the lintel should not be laid until the lintel has gained strength. On many sites the wall goes up over a freshly cast lintel the next morning, and the deflection that follows is the crack that appears three months later above the window.

## Bonding and returns

Returns, the corners where one wall meets another, should be bonded course by course rather than butted. Where a wall is built later against an existing wall, toothed bonding or wall ties are used, and a movement joint is considered at the junction.

Extensions are the classic failure: a new wall built tight against an old one, rendered as if continuous, then cracked along the junction within a season. A straight vertical joint, filled and finished, is honest and durable.

## Scaffolding and safety

Blockwork above two metres needs a working platform. In Nigerian practice this is often a scaffold of timber poles lashed together, which is acceptable if it is braced, planked and inspected. Falls are the most common serious accident on residential sites, and they are almost always preventable with a platform and a plank.

The wall does not care how the mason reached the course, but the mason's family does.

## Rendering sequence

Rendering starts when the wall has cured, not when the mason has finished. A wall that is rendered the same week it is built traps moisture and shrinks under the render, and the render cracks in a pattern that follows the blockwork.

The first coat is applied with force, thrown or pressed so that it keys into the block face. It is left rough. The second coat goes on after the first has set, brought to level with a straight edge and finished with a float. Thickness is controlled by the straight edge, not by eye.

## Curing the render

Three days of damp curing after the finishing coat prevents the shrinkage cracks that later look structural. On site this means wetting the wall morning and evening, or covering it with polythene if the harmattan is blowing.

A render that dries too fast is a render that cracks. The cracks are hairline at first and become the entry point for rain within two seasons.

## Weather rules

Do not render in direct sun on a hot afternoon, because the surface dries before it cures. Do not render in rain, because the coat washes. Do not paint a wall that has been rained on within the last day, because the moisture is still moving outward and the paint will blister.

These are not refinements. They are the difference between a surface that lasts and a surface that is redone.

## Sequence discipline

The wall rewards order: block, cure, render, cure, paint. Every step compressed shortens the life of the finish. Every step given its time costs a few days and buys years.

## Working around services

Conduits for electrical and plumbing are either chased into the blockwork after laying or built in during laying. Building in is better: a chase cut after the wall is rendered weakens the wall and creates a line of weakness that later cracks.

Where a chase is unavoidable, cut it vertically and deep enough for the conduit plus cover, then fill with a strong mortar and allow it to cure before rendering. Horizontal chases longer than a metre should not be cut into a loadbearing wall at all.

## Supervision checkpoints

Four checkpoints catch nearly every serious defect. After setting out: are the corners square and the diagonals equal. After three courses: is the wall plumb and level. Before rendering: are the joints filled and the wall cured. Before painting: is the render dry, sound and free of hollow patches.

A supervisor who attends those four moments does not need to stand on site all day.

## Handing over to the next trade

The wall leaves the mason's hands ready for the next trade: render, conduit, or paint. That handover should be explicit. A wall signed off as plumb, cured and clean starts the next stage well. A wall handed over with a shrug starts the next stage with an argument.

## Common site shortcuts and their cost

The three most common shortcuts are laying blocks on an uncured foundation, using a lean mortar to stretch cement, and rendering before the wall has cured. Each saves a day. Each produces a defect that costs more than the day saved, usually within two years.

A supervisor who refuses those three shortcuts is worth more than any specification.

## Setting out and the first course

The first course decides the wall. Set out with a line, check the diagonals of every room for square, and bed the first course on a mortar bed that is fully compacted, not spot bedded at the corners.

Spot bedding is the most common defect found in Nigerian blockwork. The block sounds hollow under it for the life of the building, and the render cracks along the joints above it.

## Height per day

Blockwork should not rise more than about one metre per day. Fresh mortar cannot carry the weight of a wall built faster, and the wall compacts under itself, producing a lean that appears a month later.

## Curing the render

Render needs water for the first three days. Wet it twice a day with a fine spray or cover it with damp hessian. A render that dries too fast shrinks and cracks in a map pattern that no paint will hide.

## Scaffolding and safety

Most Nigerian house walls are built from bamboo or timber scaffolding. It works if it is braced and if the working platform is wide enough to stand on. A scaffold that flexes under a loaded block should be rebuilt, not repaired.

Keep the top of a part built wall covered overnight. Rain on an uncured wall washes mortar out of the joints and leaves a line of weak blockwork that shows up later as a crack.


Cover the wall, cover the blocks, and the rain costs nothing.


And covering costs a sheet, not a rebuild.$w3$, 9, 'installation', $v3$https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Concrete_block_wall_constructed_for_a_three_story_building_in_the_concourse_that_will_be_the_future_office_space_for_LIRR_personnel._%28CM014B%2C_2-13-2018%29_%2840241762042%29.jpg/1280px-thumbnail.jpg$v3$, $t3$Blockwork and render: the sequence that works$t3$, $m3$Setting out, first course, blocklaying, curing and rendering: the sequence that keeps a Nigerian sandcrete wall straight and sound.$m3$),
  ($a4$ng-sandcrete-block-quality-checks$a4$, $b4$Checking a sandcrete wall: what to test and when$b4$, $d4$Tap tests, moisture checks, plumb and joint inspection: how to check sandcrete blockwork and render before any paint goes on.$d4$, 'NG', $w4$# Checking a sandcrete wall: what to test and when

Quality on a blockwork site is not a certificate at the end. It is a series of small checks at the moments when a defect is still cheap to fix. This article sets out those checks in the order they occur.

## Before work starts

Check the block supply before the first block is laid. Ask for the nominal size, the mix and the curing regime. Break a block. Tap a stack. Look at the yard: are blocks under cover, on pallets, wet.

Check the sand: squeeze it, look for clay, smell it. Check the cement: open a bag, look for lumps. Check the drawings: is there a block strength, a mortar ratio and a curing requirement, or only a note.

## Setting out and the first courses

Check the diagonals of the building outline. They should be equal within ten millimetres over a normal house. Check the first course for level with a straight edge and a spirit level, in at least three places along each wall.

Check plumb on the first three courses with a plumb bob or a level held vertically, on both faces. Check bond: no continuous vertical joint should run more than one course.

## During blocklaying

Check joint thickness with a rule at random points. Ten millimetres is the target. Check that vertical joints are filled by looking at the wall from the end, where the joint is visible in section.

Check the line every third course, not every tenth. Wall that drifts off line is corrected course by course, never by rendering over it.

## Openings and lintels

Check bearing length of each lintel: at least 150 mm each side. Check that the wall above a lintel was not laid before the concrete gained strength. Check that lintels are level; a lintel out of level shows in the window.

## Before rendering

Tap the wall at random with a knuckle or a hammer handle. A hollow sound means a block that is loose or a joint that never filled. Check that the wall has cured for the specified period. Check that chases are filled and cured.

## After rendering

Check the surface with a two metre straight edge in several directions. Check for hollow patches by tapping. Check for cracks: hairline shrinkage cracks are common and usually harmless, but cracks wider than a millimetre should be investigated before painting.

Check moisture with a simple meter, or with the hand: a wall that feels cold and damp is not ready for paint.

## After painting

Check colour consistency across each elevation in daylight, not under work lights. Check for runs, sags and missed areas at the top and bottom of the wall. Check that the paint film is continuous around corners and reveals.

## Recording the checks

A one page checklist per elevation, signed and dated, is enough. It gives the owner a record, the contractor a defence and the next trade a baseline. Sites that record their checks build better walls, because the act of recording changes what gets checked.

## Testing block strength without a laboratory

Laboratory testing is the correct method and rarely available on a small site. The field alternative is a comparison: break one block from the stack and one known good block side by side, and compare the failure pattern and the force needed.

Another practical test is water absorption. Weigh a block dry, soak it for a day, weigh again. A block that gains more than about a fifth of its dry weight is too porous, and will draw water into the wall.

## What the checks are for

Each check answers one question. Is the material as specified. Is the geometry right. Is the wall bonded and filled. Is the finish sound. Those four questions cover the wall's whole life, because almost every defect that appears later is the delayed consequence of a wrong answer at one of those moments.

## The cost of skipping checks

A hollow patch found before painting costs a patch of render. Found after painting, it costs render, primer and paint, plus the labour to blend the repair into the elevation. The multiplier is roughly five.

A crack above a lintel found before the wall above is loaded costs a rebuilt opening. Found a year later, it costs the same repair plus the decoration of the room and the argument about who pays.

## How often to inspect

On a residential site, three visits cover it: at setting out, at mid height, and before painting. On a commercial site with a clerk of works, checks are continuous and recorded daily. The principle is the same: inspect at the moment the defect is created, not at the end when it is expensive.

## A short checklist to carry

Corners square. Diagonals equal. First course level. Three courses plumb. Joints ten millimetres and filled. Lintel bearing 150 mm. Wall cured before render. Render tapped sound. Surface true under a straight edge. Paint dry before inspection.

Ten items, twenty minutes, and a wall that behaves.

## Judging render without instruments

Tap with the handle of a screwdriver at a grid of points about a metre apart. A dull, solid sound is bonded render. A hollow, papery sound is debonded render, even if it looks perfect.

Mark hollow spots with chalk and count them per elevation. A few isolated spots can be cut out and repaired. A pattern across a whole elevation usually means the render coat was too thick or the wall was too wet when it was applied.

## Judging paint

Look along the wall at a shallow angle with the sun behind you. Runs, sags, missed corners and thin patches all show in raking light and disappear in flat light.

Then look at the base of the wall and behind downpipes, where coverage is usually weakest and where rain arrives first.

## When a defect is not a defect

Not every mark is a fault. Shrinkage crazing in the first season is normal. Slight colour variation between elevations facing different directions is normal, because light and weathering differ. A hairline crack at a ceiling junction is normal in most construction.

The skill is knowing which symptoms to watch and which to fix. Watch anything that changes. Fix anything that lets water in.

## Checking the render

Tap the render with a coin a week after application. A dull thud means the render has debonded from the block and will eventually fall. A sharp tap means it is bonded.

Mark hollow areas with chalk and count them per elevation. More than a few isolated patches means the whole elevation should come off and be redone, because patching hollow render simply moves the defect.

## Moisture checks before painting

Measure moisture with a meter, or tape a square of polythene to the wall for 24 hours and look for condensation underneath. Painting over a wall above about 15 percent moisture traps water and guarantees blistering within a season.

## Checking the paint film

Look along the wall in raking light and count the areas where the block joints show through. Joints visible through the paint mean the render was too thin over the mortar lines, and the fix is another coat of render, not another coat of paint.

## Checking plumb and level

Use a spirit level on a straight edge, or a plumb line on a tall wall, at least at each corner and once mid wall. Record the deviation in millimetres over the height. A wall out of plumb by more than about 10 mm over three metres will show in the render and in any door frame set into it.


Record the numbers, not the impression, and the wall can be argued about with evidence.


That is the whole point of a check.


Evidence ends the argument before it starts.
 Always.$w4$, 8, 'quality', $v4$https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/-2021-01-23_Concrete_Block_wall%2C_Trimingham%2C_Norfolk.JPG/1280px--2021-01-23_Concrete_Block_wall%2C_Trimingham%2C_Norfolk.JPG$v4$, $t4$Checking blockwork and render before painting$t4$, $m4$Tap tests, moisture checks, plumb and joint inspection: how to check sandcrete blockwork and render before any paint goes on.$m4$),
  ($a5$ng-sandcrete-block-maintenance-repair$a5$, $b5$Maintaining a sandcrete wall: cracks, damp and repainting$b5$, $d5$Cracks, efflorescence, damp and repainting on sandcrete walls: what each symptom means and the repair that stops it returning.$d5$, 'NG', $w5$# Maintaining a sandcrete wall: cracks, damp and repainting

A sandcrete wall needs little attention if it was built well and a great deal if it was not. Maintenance is therefore mostly diagnosis: working out whether a symptom is cosmetic or structural, and fixing the cause rather than the surface.

## Reading a crack

Cracks tell you where the movement is. A vertical crack at the junction of two walls is a movement joint doing its job badly, or a wall built without a joint. A diagonal crack running from the corner of a window towards the floor is usually foundation settlement or an under designed lintel. A horizontal crack at mid height of a long wall suggests the wall is bowing, which is serious.

Hairline map cracking across a rendered surface is shrinkage, and it is usually harmless. Cracks that are wider than a millimetre, or that grow between inspections, need investigation before any repair.

## Measuring movement rather than guessing

Mark a crack with a pencil line across it at two points and write the date beside each. Measure the width with a crack gauge or a rule. Check again in a month. A crack that has not moved is dormant and can be filled. A crack that has moved is active, and filling it is cosmetic.

This one habit separates owners who spend money well from owners who repaint the same wall every year.

## Damp at the base

Damp at the base of a wall has three common causes in Nigerian buildings. The ground level outside is higher than the floor inside, so water runs towards the wall. The damp proof course is missing, bridged by mortar or render, or placed too low. And the roof throws water at the base because there is no gutter, or the gutter discharges against the wall.

The fix follows the cause. Lower the external ground, clear the dpc line, or add a gully and a shoe to the downpipe. Painting over damp is the one repair that never works.

## Efflorescence

White salt bloom on the render means water is passing through the wall and evaporating at the surface, carrying salts with it. It is a symptom, not a disease.

Brush it off dry, find the water path and close it. Sealing the surface without finding the water traps moisture inside the wall, and the next symptom is paint blistering or render debonding.

## Repairing render

A hollow or cracked patch of render is cut back to sound material with a hammer and chisel, squared at the edges, wetted, then filled in two coats with a mix similar to the original. The repair is floated to match, left to cure, then primed and painted with the elevation, not patched.

Patching a single spot with fresh paint is visible forever. Repainting the whole elevation is the professional answer and, over a decade, the cheaper one.

## Repainting

Repaint when the surface chalks, when the colour has faded unevenly, or when the film has thinned enough to show the render texture. In most Nigerian conditions that is every four to seven years for a decent acrylic, and sooner on the coast.

Preparation is the whole job: wash, allow to dry, scrape loose paint, fill cracks, spot prime bare patches, then two coats. Paint applied over a dirty wall fails within a year, whatever the tin promised.

## What to do each year

Walk the building in the dry season. Look at the base of every wall, the corners, the reveals around windows and doors, and the roof edge. Clear gutters. Cut vegetation away from the wall. Check that downpipes discharge away from the building.

An hour a year, done consistently, is the difference between a wall that needs a repair in a decade and a wall that needs a rebuild.

## Mould and algae

Green staining on a north facing wall is algae, not dirt. It grows where moisture sits and light is low. Wash with a dilute bleach solution, rinse, allow to dry, and repaint with a coating that resists biological growth.

Removing the stain without removing the moisture source means it returns within a season. Fix the shading, the leaking gutter or the planter against the wall first.

## Salt damage on the coast

Near the sea, salt crystallises inside the render and pushes it off in flakes. The symptom looks like bad paint and is actually a salt problem. The treatment is to remove loose material, allow the wall to dry, apply a salt resistant primer and repaint with a coating intended for coastal exposure.

Washing the wall with fresh water twice a year slows the process considerably.

## When to call in a professional

Call one when a crack is wider than two millimetres, when a wall is visibly out of plumb, when damp persists after the obvious causes are removed, or when render falls away in sheets over a large area. Those four conditions point to causes that surface repair cannot fix.

Everything else is maintenance, and maintenance is cheap.

## A maintenance calendar that works

January: walk the building, list defects, photograph them. February: clear gutters and downpipes before the rains. March: repair cracks and render while the wall is dry. April: repaint the elevation that needs it, before the rains arrive.

The order matters. Repairing in the wet season traps water in the repair. Painting in the wet season blisters the film. The dry months exist for this work.

## Keeping a simple record

Photograph each elevation once a year from the same spot. The comparison between years shows movement, staining and fading that memory cannot hold.

Four photographs a year, kept in a phone album, are the cheapest building survey available.

## Choosing between repair and replacement

Replacement is the right answer when the render has lost adhesion across most of an elevation, when the blockwork behind it is soft or hollow, or when a wall has bowed. In those cases patching produces a wall that fails again in a different place.

Repair is right when the defects are local, the blockwork sounds solid and the wall is plumb. Most walls fall into this category, and most owners are sold the other one.

## What a repaint should include in writing

A quotation for repainting should state: surface preparation method, number of coats, product name and type, treatment of cracks, treatment of any damp or mould, and the areas included. A quote that says only paint the building has no content.

The written scope is also the standard against which the job is checked. Without it, the argument at the end is about taste rather than workmanship.

## The economics of neglect

A wall left unmaintained does not fail suddenly. It fails in a sequence: hairline cracks, then water entry, then render debonding, then block saturation, then structural repair. Each stage costs roughly three times the previous one.

Intervening at the first stage is nearly free. Intervening at the fourth stage is a rebuild of the elevation.

## Efflorescence explained

White powder on the wall is salt carried to the surface by water and left behind when the water evaporates. It is a symptom, not a problem in itself. Brushing it off without finding the water source guarantees its return.

The source is usually a leaking downpipe, a bridged damp proof course, or a planter bed above the damp course. Fix that, then brush and wait a dry season before repainting.

## Repainting a wall that has been painted before

Wash, allow to dry, scrape loose film, spot prime bare patches, then apply two coats. One thick coat over old paint fails sooner than two thin coats, because the film cannot release solvent.

## When to call a professional

Call one when a crack is wider than about two millimetres, runs diagonally from a corner, or appears suddenly. Those point to foundation movement, not to the paint, and painting over them wastes money.$w5$, 8, 'maintenance', $v5$https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/-2021-01-22_Cavity_wall_construction%2C_Trimingham%2C_Norfolk_%283%29.JPG/1280px--2021-01-22_Cavity_wall_construction%2C_Trimingham%2C_Norfolk_%283%29.JPG$v5$, $t5$Cracks, damp and repainting a sandcrete wall$t5$, $m5$Cracks, efflorescence, damp and repainting on sandcrete walls: what each symptom means and the repair that stops it returning.$m5$)
) AS a(slug,title,excerpt,market,content,read_time_minutes,theme,cover_url,meta_title,meta_description) JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='system:ng-sandcrete-block' ON CONFLICT (slug) DO NOTHING;
UPDATE public.learn_wall_finishing_article_slots sl SET article_id=a.id FROM public.learn_articles a WHERE sl.topic_id=a.wall_topic_id AND sl.theme_key=a.wall_article_theme AND sl.language_code='en' AND sl.article_id IS NULL AND a.slug LIKE 'br-exterior-render-paint-%%';
ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER wall_source_review_attribution;
UPDATE public.learn_wall_finishing_sources s SET review_status='accepted', reviewed_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, reviewed_at=now() FROM public.learn_wall_finishing_topics t WHERE s.topic_id=t.id AND t.candidate_key='system:ng-sandcrete-block' AND s.review_status='pending';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics t SET verification_status='verified', verified_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, verified_at=now() WHERE t.candidate_key='system:ng-sandcrete-block' AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.review_status='accepted');
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles SET status='published', editorial_review_status='approved', editorial_reviewed_by='d74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid, editorial_reviewed_at=now(), published_at=coalesce(published_at, now()) WHERE wall_topic_id=(SELECT id FROM public.learn_wall_finishing_topics WHERE candidate_key='system:ng-sandcrete-block') AND slug LIKE 'br-exterior-render-paint-%';
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;
COMMIT;
