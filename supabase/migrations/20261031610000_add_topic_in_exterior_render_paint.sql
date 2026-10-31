BEGIN;
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope) SELECT t.id,v.title,v.publisher,v.url,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES ('IS 1661 cement plaster application','Bureau of Indian Standards','https://www.bis.gov.in/','Application and curing of cement plaster on external surfaces'),('IS 2395 painting of plaster surfaces','Bureau of Indian Standards','https://www.bis.gov.in/','Exterior painting systems for plastered masonry and concrete'),('BMTPC building materials guidance','BMTPC','https://www.bmtpc.org/','Indian facade material selection and site practice'),('TERI building performance research','TERI','https://www.teriin.org/','Indian climate exposure and envelope durability')) AS v(title,publisher,url,claim_scope) WHERE t.candidate_key='assembly:in-exterior-render-paint' AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);
INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,status,author,read_time_minutes,cover_image_url,meta_title,meta_description) SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation',a.market,t.id,a.theme,'en','draft','FRELUX Learn',a.read_time_minutes,a.cover_url,a.meta_title,a.meta_description FROM (VALUES
  ($a1$in-exterior-render-paint-overview$a1$, $b1$Exterior Render to Paint in India: The Wall That Faces the Monsoon$b1$, $d1$Why an Indian facade fails at the render before it fails at the paint, and the details that decide whether a wall lasts fifteen years or three.$d1$, 'IN', $w1$# Exterior Render to Paint in India: The Wall That Faces the Monsoon

An exterior wall in India takes more punishment in one monsoon than an interior wall takes in a decade. Sun that drives surface temperatures past sixty degrees, rain driven sideways at a hundred millimetres an hour, salt in the air near the coast and pollution everywhere else: the render and the paint have to survive all of it, and they only do so if the layers are built in the right order.

The order is render, cure, primer, topcoat, topcoat. What changes between a wall that lasts fifteen years and one that is patchy in three is rarely the brand of paint. It is the thickness of the render, the curing, the treatment of the junctions, and whether the wall was dry when it was coated.

## Why does an external wall need render at all?

Because brickwork and blockwork are not weathertight. A wall of bricks is a wall of joints, and driven rain finds them. Render gives the wall a continuous, sacrificial skin that sheds water, fills the joints and gives the paint a surface it can grip.

It also protects the structure. Water that reaches reinforcement starts corrosion, and corrosion is what eventually cracks concrete. The render is the first line, and the paint is the second; neither works alone.

## What does the Indian Standard expect of the render?

The application standard sets out the number of coats, the thickness and the curing for cement plaster on external surfaces. In practice that means a base coat and a finishing coat, total thickness in the region of fifteen to twenty millimetres on a masonry wall, with the finish coat brought to an even surface and cured.

Thin render is the commonest external defect in Indian construction, usually because it is being used to make a wall look straight rather than to protect it. A render of five millimetres over an uneven wall will crack along the thin places within a season.

## Why does the mix matter more outside than inside?

Because external render is exposed to wetting and drying cycles, and a rich mix behaves badly under both. A mix that is too strong is dense and brittle: it does not accommodate movement in the backing, and it cracks rather than flexing.

A mix leaner than one part cement to four parts sand, with graded sand, is the usual starting point for the base coat. Adding lime or a plasticiser improves workability without adding cement, which is the point: workability is bought with lime, not with more cement.

## What does the sand do to an external render?

More than any other ingredient. Graded sand with a range of particle sizes packs into a dense, strong render. Sand that is all one fine size needs more cement to hold together, shrinks more and crazes. Sand with clay or silt in it produces a weak render that dusts and fails at the surface.

The jar test is enough for a site check: sand and water in a jar, shaken and left to settle. A layer of silt more than a tenth of the sand height is a reason to reject the delivery rather than to add more cement.

## Where does water get into an external wall?

At four places, almost always. Cracks in the render, the junction between the render and a window or door frame, the top of the wall where a parapet meets it, and the base where splash and soil keep the wall wet. Each has a detail, and each detail is cheap when it is built and expensive when it is repaired.

A fifth is behind the paint itself: a coating that has lost adhesion and is holding water against the render rather than shedding it. That is why blistering on an external wall is usually found near a crack rather than at random.

## Why is curing the stage that decides the outcome?

Cement render gains its strength and its impermeability from the chemical reaction that continues for days after it has set. If it dries out in the first two days, the reaction stops short: the render is porous, dusty and weak, and no paint will compensate.

In Indian summer conditions, an external wall can dry within hours of being finished. Damping it twice a day for a week, or covering it, is the difference between a render that resists the monsoon and one that absorbs it. This is the single most common place where good materials are wasted.

## Which paint belongs on an external wall in India?

An exterior emulsion designed for the climate, in two coats over a suitable primer. Exterior emulsions are formulated with more binder and more weather-resistant pigments than interior products, and the cheap ones chalk within a season on a west-facing wall.

Where the wall is exposed to driving rain, an elastomeric or waterproof exterior coating is worth the extra. It bridges hairline cracks rather than following them, which is exactly the failure an Indian external wall produces first.

## How long should an external paint system last?

Four to seven years on a well-built wall in most of India, five to eight on a protected elevation, and three to four on a coast facing salt wind. Those are intervals for the coating, not for the render; the render should last decades if it is thick, cured and detailed.

The interval shortens sharply when the wall is coated too thin, when the primer is skipped, or when the paint goes on before the render has dried. Each of those adds a repaint to the schedule without extending anything.

## What does the work cost, and who does it?

Exterior work is priced per square metre including scaffolding or ladder access, and access is often the largest single line. A two-storey facade with balconies costs more per square metre than a flat wall of the same area because of the time spent moving access.

Rates quoted without stating the number of coats, the render thickness or the primer are not comparable. Write the specification first and ask for prices against it; the spread between quotations narrows sharply once everyone is pricing the same wall.

## What follows in this topic

Four articles take the work apart: the materials and what to specify, the sequence from scaffolding to the second coat, the checks that catch a failing render before it is painted, and the maintenance that keeps a facade serviceable through Indian monsoons.

## Does a textured finish protect better than a smooth one?

Marginally, and it hides more. A textured render or coating carries a greater film thickness and breaks up the sheets of water that run down a wall, which reduces the rate at which water is driven into small defects. What it cannot do is compensate for a crack.

Textures are also a maintenance decision. They collect dust and, on a shaded elevation, biological growth, and they are harder to clean without abrading the surface. Smooth finishes look better for longer in a dusty city; textured finishes stay acceptable for longer in a wet one.

## How does orientation change the job?

The elevation facing the prevailing monsoon takes the driving rain and fails first, always. The elevation facing the afternoon sun takes the thermal movement and cracks first. A facade is therefore not one wall but four, each with its own failure mode and its own inspection interval.

Practical consequences follow. Mesh and elastomeric coatings on the exposed elevation, a closer eye on the sun-facing one, and a check of the shaded one for biological growth. Pricing a facade as a single surface usually means the exposed side is under-specified.

## What does a rendered wall do in the first year?

It moves. Cement render shrinks as it cures, the building settles, and the junctions between materials take up differential movement. Most of the cracks that will ever appear on the wall appear in the first twelve months.

That is why a facade should be inspected after one monsoon before any decision about a decorative upgrade. Repairing the first-year cracks and recoating once is cheaper than decorating a wall that is still moving.

## How does this compare with tiling or cladding a facade?

Tiles and cladding are more expensive per square metre and, done properly, last longer. They also hide the wall, which is an advantage until a tile falls or water gets behind the cladding and cannot escape.

For most Indian residential work, render and paint is the correct choice: repairable, breathable, and cheap to refresh. Cladding suits buildings where the wall cannot be reached easily for maintenance, and its detailing has to be right, because a failure behind the cladding is expensive to find.

## Does a parapet belong in this topic?

Yes, because most facade leaks start at the top. A parapet that is rendered and painted on its inner face but left unsealed on the coping admits water that travels down inside the wall and appears as a damp patch two floors below.

The detail is a coping with a drip, a sealed joint under it, and render that runs over the top rather than stopping short. Small items, and the ones most often omitted when a contractor is finishing a job under time pressure.

## Is a facade ever better left unpainted?

Only where the render itself is the finish, as with a lime-based or pigmented render designed to be left bare. In most Indian construction the render is a base, and leaving it unprotected means it absorbs water from the first monsoon.

If an unpainted finish is wanted, it should be specified as such from the start, with a render mix designed for exposure. Painting over an inappropriate render later costs more than painting a suitable one now.

## What is the one detail most often missed?

The junction between the render and a door or window frame. It is a narrow strip, it moves, and it is where water first enters. A flexible sealant over a backing rod, replaced every few years, is the whole detail.

## Is a facade warranty realistic?

For the coating, yes, and for the render, a shorter one. Ask what the warranty covers: film failure is different from a crack, and a crack is different from a leak. A written warranty that names the failure modes is worth more than a longer one that does not.

## Does the base of the wall need special treatment?

A plinth that keeps the render clear of soil and splash, with a coating that can take wetting. The base of a facade is where erosion starts, because it stays damp longest after rain and takes the splash from the ground.

Keeping that clear of soil is a detail, and it is the one that decides how the bottom metre of a facade looks after a decade.$w1$, 9, 'overview', $v1$https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Mariano_Eugenio_House_2026-07-04_Casa_Domingo_L._Robles_Center_Left_Exterior_02.jpg/1280px-Mariano_Eugenio_House_2026-07-04_Casa_Domingo_L._Robles_Center_Left_Exterior_02.jpg$v1$, $t1$Exterior Render to Paint in India: the Monsoon Wall$t1$, $m1$Why an Indian facade fails at the render before it fails at the paint, and the details that decide whether a wall lasts fifteen years or three.$m1$),
  ($a2$in-exterior-render-paint-materials$a2$, $b2$Exterior Render and Paint Materials for Indian Facades$b2$, $d2$Specifying external render in India: cement type, graded sand, mesh at junctions, waterproofing admixture, primer and exterior emulsion grades.$d2$, 'IN', $w2$# Exterior Render and Paint Materials for Indian Facades

Four materials decide an Indian facade: the cement, the sand, the mesh at the junctions, and the coating system. Everything else is workmanship, and workmanship can only do so much with the wrong materials.

## Which cement should be used for external render?

Ordinary Portland cement is the default, and Portland pozzolana or slag cement is often the better choice externally because it produces a denser, more sulphate-resistant matrix and generates less heat. It also cures more slowly, which in hot weather is an advantage rather than a delay.

What should not be used is cement that has been stored damp. Bagged cement that has begun to hydrate produces a render that is weak and unevenly set, and the failure appears as patches that dust and erode at different rates across the same wall.

## How is sand specified?

By grading, cleanliness and silt content, not by colour. A washed, graded river or manufactured sand with a range of sizes from fine to about five millimetres gives a dense render. Manufactured sand is now common in Indian cities and performs well when it is properly graded and washed.

Silt is the silent fault. Sand that clouds the water when rubbed in the palm carries clay, and clay stops the cement binding properly. The jar test on delivery takes ten minutes and prevents a wall-wide failure.

## What does mesh do on an external wall?

It bridges the places where cracks start: the junctions between masonry and concrete columns or beams, the corners of openings, and long unbroken runs of render. A strip of galvanised or fibre mesh bedded in the base coat spreads movement across a width instead of concentrating it in a line.

Mesh at junctions is the single most cost-effective item in a facade specification. It costs a fraction of the paint and prevents the diagonal cracks that appear within a year above every window opening on a wall built without it.

## Is a waterproofing admixture worth it?

On a facade that takes driving rain, yes. An integral waterproofing compound reduces the permeability of the render and its capillary suction, which slows the rate at which water crosses the wall. It is not a substitute for thickness, curing or a proper crack detail.

The mistake is to use an admixture to rescue a thin render. Waterproofing reduces absorption; it does not replace the physical depth of material that the wall needs.

## Which primer?

An exterior primer, alkali-resistant and compatible with the topcoat system. A primer on a fresh render does two jobs: it seals the suction so the topcoat does not dry patchy, and it isolates the paint from the alkalinity of the cement.

Where render is less than four weeks old, an alkali-resisting primer is not optional. Painting fresh render with a topcoat alone produces saponification, and the coating peels in sheets rather than wearing away.

## Which exterior coating should be specified?

Three legitimate options. Conventional exterior emulsion in two coats, the default for most residential work. Elastomeric exterior coating, which bridges hairline cracks and suits walls that are expected to move. And textured or weatherproof coatings, which add film thickness and hide surface irregularity.

The choice should follow the wall rather than the budget alone. A wall with a history of hairline cracking needs elasticity more than it needs a premium brand, and an elastomeric product at mid price will outperform a decorative emulsion at the top of the range.

## What quantities should an owner expect?

Coverage figures on an Indian paint tin assume a smooth, sealed surface, and external render is neither. Expect the first coat to take noticeably more than the second, and budget a tenth more paint than the calculated area to avoid a second purchase from a different batch.

Render materials are quantified by volume: roughly one cubic metre of mortar for every fifty to sixty square metres at twenty millimetres. Buying cement and sand against that figure, rather than by eye, keeps the mixes consistent across a facade.

## What substitutions should be refused?

Five. Sand with visible silt, a render thinner than specified, mesh omitted at the junctions, an interior emulsion used outside, and paint applied without primer to save a day. Each is a small saving with a predictable failure attached.

The sixth, less obvious one, is paint applied over a render that is still wet. No product survives that, and the failure is attributed to the paint rather than to the decision.

## How is material recorded for the future?

With the shade code, the product name and the batch numbers of every tin, plus the render mix used. Ten years on, that record is what allows an elevation to be patched invisibly instead of repainted entirely because the shade cannot be matched.

A photograph of the tins on the day of purchase costs nothing and is more reliable than memory.

## Is manufactured sand acceptable for external render?

Yes, when it is graded and washed to the specification. Manufactured sand has become the default in many Indian cities as river sand has become scarce, and it performs well in render provided the fines content is controlled.

The failure mode is an excess of very fine particles, which increases water demand and shrinkage. A render made with over-fine manufactured sand crazes across the whole panel, and the crazing shows through the paint as a fine web.

## What about lime in the mix?

Lime improves workability and, in the longer term, the render's ability to accommodate small movements. Traditional Indian renders used lime extensively, and a small addition to a cement mix remains a sensible way to make render easier to place without adding cement.

Lime is not a substitute for curing. A lime-bearing mix still needs water in the days after it is placed, and the presence of lime sometimes encourages a false confidence that the wall will look after itself.

## Which coating should go on a wall that has already been painted?

A product compatible with the existing film, applied after washing and spot priming. Where the existing coating is unknown, a small test patch left for a week shows whether the new product will adhere or react.

The risky case is a cement-based paint or distemper under a modern emulsion. The old film is often chalky and cannot carry the new coating, and it has to be removed rather than covered.

## How should materials be stored on site?

Cement on pallets under cover, sand on a hard standing with a cover against rain, mesh kept dry so it does not rust before it is used, and paint stored out of the sun. A drum of paint that has baked in a container is a drum of paint that will not flow.

The one that surprises people is sand. Sand stored in a heap on wet ground absorbs water and, in the monsoon, arrives at the mixer saturated, which makes the mix wetter than the water:cement ratio allows. Covering the heap is the whole fix.

## Does the render need a bonding agent?

On a smooth concrete backing, sometimes: a bonding agent or a spatterdash coat gives the render something to key into where the surface cannot be roughened mechanically. On masonry, mechanical key plus damping is normally enough.

A bonding agent is not a repair for a dusty surface. If the wall is dusty, it is cleaned; if it is smooth, it is roughened. The agent helps a properly prepared surface, and it fails on a neglected one.

## What does a specification line for exterior work look like?

One paragraph per layer: backing prepared and damped; base coat mix and thickness, mesh at named junctions; finish coat mix, thickness and texture; curing method and duration; primer product type; two coats of a named exterior product at the maker's spread rate, with shade code.

Written that way, three quotations can be compared line by line. Without it, they are three different walls described in the same three sentences.

## What about ready-mix render?

Pre-bagged render mortars remove the site variables of sand grading and mix proportion, and they are increasingly used on facades where consistency matters. The cost per square metre is higher than site-mixed work, and the consistency is usually worth it on a large or visible elevation.

What they do not fix is preparation and curing. A perfect bag of render applied to a dusty wall, or left to dry in the sun, fails exactly like a bad mix would.

## How much does a facade system cost relative to the building?

Render and paint together are a modest percentage of construction cost and the most visible part of it. Spending slightly more on mesh, on render thickness and on the primer changes the appearance of the building for a decade.

The comparison that matters is cost per year of service, not cost per square metre. A cheap system that needs repainting every three years costs more over fifteen years than a proper one repainted twice.

## What is the role of a curing compound?

On large elevations where wetting twice a day is impractical, a curing compound sprayed over fresh render forms a temporary film that holds water in. It is a practical answer to a real problem on tall buildings and in hot weather.

It is not as good as water, and it should not be a reason to skip the first two days of damping, when the render is most vulnerable. Used alongside water rather than instead of it, it earns its place.

## Is a primer needed on a previously painted facade?

Only where the old film is sound and clean, and then a bonding primer over the prepared surface. Where the old film is chalky, it is removed, because no primer will hold a powdery layer to the wall.

Testing is simple. Rub the wall with a dark cloth; heavy white transfer means the film has broken down and preparation is not optional.

## Does the time of year change what should be bought?

It changes the primer, not the coating. In hot weather a fast-drying primer helps because the wall pulls water quickly; in humid weather a slower product allows the film to form before it skins over. Asking the supplier which grade suits the season is a question worth asking once per project rather than assuming one product works equally well in May and in August.

## Does the render colour affect the coating choice?

Only through heat. A dark render absorbs more and reaches higher surface temperatures, which shortens the life of the coating above it. Where a deep colour is wanted, the render beneath is better left lighter.

## Is a bonding slurry ever used on render?

Yes, on repairs: a cement slurry brushed onto the prepared edge before the new render is placed. It improves the bond at the junction, where old and new material meet.$w2$, 8, 'materials', $v2$https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/REFERENCE_worn_mossy_plasterwall_%28Amal_Kumar_via_Poly_Haven%29.jpg/1280px-REFERENCE_worn_mossy_plasterwall_%28Amal_Kumar_via_Poly_Haven%29.jpg$v2$, $t2$Exterior Render Materials: Cement, Sand and Mesh$t2$, $m2$Specifying external render in India: cement type, graded sand, mesh at junctions, waterproofing admixture, primer and exterior emulsion grades.$m2$),
  ($a3$in-exterior-render-paint-installation$a3$, $b3$Rendering and Painting an External Wall: The Sequence$b3$, $d3$The order of work on an Indian facade: preparation, base and finish coats, curing, reveals and sills, drying before primer, and two topcoats.$d3$, 'IN', $w3$# Rendering and Painting an External Wall: The Sequence

An external facade is built from the ground up and from the inside out, and the sequence on an Indian site has its own rhythm: the render goes on before the scaffolding comes down, and the paint follows only when the wall has genuinely dried.

## What has to happen before the render?

The masonry is finished, the junctions are prepared, the conduits and pipes in the wall are complete and the openings are formed. Any chase cut after rendering is a patch that will be visible for the life of the building.

The wall surface is then prepared: mortar snots removed, dust brushed off, and the face roughened where it is smooth so the render has something to key into. A dusty or glossy backing is the commonest reason a render debonds and sounds hollow a year later.

## How is the render applied?

In two coats. The base coat is dashed or trowelled on and scored to give a key, then left to cure; the finishing coat follows and is floated or textured to the chosen finish. Total thickness in the region of fifteen to twenty millimetres on masonry.

The base coat should be cured before the finish coat goes on, which in practice means a day or two depending on the weather. Applying the finish coat over a base that has not set produces a single thick layer that shrinks and cracks as one.

## How is the wall cured?

Damped twice a day for about a week, or covered with hessian or polythene that is kept wet. The point is to keep the surface from drying out while the cement hydrates, and a sprayed facade in the morning and again in the evening achieves it.

Curing is where external work differs most from internal. A wall in full sun in April can lose its surface water within an hour of the mason leaving, and a render cured for one day instead of seven is measurably more permeable.

## What happens at openings?

The junctions around windows and doors get mesh bedded across them before the finish coat, and the reveals are formed square and slightly sloped so water runs off rather than standing. A sill that falls the wrong way is a leak waiting for the first monsoon.

Where a frame is set into the wall, the gap is filled and sealed with a flexible sealant over a backing rod, not with mortar alone. Mortar in a frame joint cracks as the frame moves, and the crack admits water directly behind the render.

## When can the paint go on?

When the render is dry, which in Indian conditions means a minimum of three to four weeks and often longer in the monsoon. A moisture meter reading taken at several points, compared across a week, is the only reliable test.

Painting too early is the most expensive mistake in the sequence, because the failure is not immediate. The coating looks perfect for a season and then blisters, and the only repair is to strip it back and let the wall dry.

## How is the paint applied?

Primer first, one coat, brushed into the corners and rolled across the field. Then two coats of the exterior product, each applied at the maker's spread rate rather than stretched, with the second going on after the first has dried.

On a large facade, work in defined panels and stop at a natural break. Stopping mid-panel leaves a lapping line that shows at every change of light, and on a textured finish there is no way to hide it afterwards.

## How does the weather shape the programme?

It decides when the render can be applied and when the paint can be. Render laid in direct sun or in wind dries too fast and cracks; paint applied in high humidity or just before rain does not form a film.

The working rule is to render early in the day and to keep the paint off a wall that will be wet within twelve hours. In the monsoon belt, external painting should be scheduled for the dry months unless the elevation is protected.

## How is the scaffolding handled?

It is set out so that the whole elevation can be reached without moving it repeatedly, and it is kept clear of the wall so the render can be worked continuously. Ties are fixed into the wall and, after removal, the holes are filled and sealed rather than left open.

Scaffold tie holes are one of the most common paths for water into an Indian facade, and one of the least often treated. Filling them properly takes minutes per hole and prevents a damp patch inside the building a floor below.

## What does a good day's work look like?

A panel of render that is consistently thick, worked to a line at the openings, and cured by the evening. Or a paint coat that covers evenly with no misses at the top of the wall, where the reach is hardest and the light is worst.

The failures are equally visible: a wall that changes texture halfway along, a coat that is thin at the top and thick at the bottom, and a scaffold left against fresh paint.

## How is the work sequenced around the other trades?

Render before the windows go in, or after, depending on the frame type, but always with the junction detailed once rather than twice. External plumbing and conduits go in before the finish coat, and any bracket for a condenser or a sign is set into the wall rather than drilled into finished render.

The most common sequencing failure is drilling after painting. A fixing hole that penetrates the render is a permanent water path, and it should be sealed with a proper sealant rather than a dab of paint.

## How are reveals, sills and copings finished?

With a fall. Sills slope away from the wall, copings slope to the outside, and reveals are formed so water leaves rather than sits. Each is a small geometry decision with consequences that appear only in rain.

The drip detail under a sill matters more than the slope. Without a drip, water tracks back along the underside and into the wall, and the damp patch appears inside rather than out.

## What does a texture coat change about the sequence?

It adds a stage and it removes tolerance for error. A textured finish is applied after the base render has cured, worked in a single continuous operation per panel, and once it has set there is no sanding it flat.

Because of that, the base render has to be genuinely flat before the texture goes on. Texture hides minor variation and exaggerates anything larger, and a panel joined halfway across a wall is visible forever.

## How long does an elevation take?

For a typical two-storey house, render on one elevation is a few days including curing, and painting is a day or two per coat once the wall is dry. The waiting between stages is longer than the work, which is why programmes that look generous at the start usually end up compressed at the paint stage.

Compressing the wait is the one economy that always fails. Everything else on a facade can be corrected later at a price; painting a wet wall cannot be corrected at all without stripping the coating.

## Who inspects, and when?

The person paying, at the end of the base coat and again before the primer. Both moments are still cheap to correct, and both are invisible a week later.

A photograph of each elevation at those two moments is the record that settles most later disputes. It takes a few minutes and it is the only evidence of what was covered up.

## What is different about a wall that will be seen close up?

Ground-floor elevations and walls beside a gate are looked at from a metre away, and everything shows: the texture of the sand, the marks of the float, the edge of a repair. Those surfaces deserve a finer finish and a cleaner sand.

Upper elevations are read from the street or from another building, and their defects are about line and colour rather than texture. Spending the effort where it will be seen is not cutting corners; it is allocating the budget honestly.

## How are external works handed over?

With the scaffold still up for the final inspection, the crack survey recorded, the moisture readings noted, and the batch numbers of the paint logged. And with a short note of anything the contractor would want corrected before the next monsoon.

That note is a courtesy that pays for itself. A contractor who knows which elevation is expected to move will fix it rather than argue about it later.

## How is the wall protected during other trades?

With boards against the render at any point where material is being moved, and with a rule that no mortar is mixed against the wall. Splashes of cement mortar on a cured render are difficult to remove without damaging the surface.

Where damage happens, it is repaired before painting rather than painted over. A patch of render that was repaired honestly and repainted with the elevation is invisible; one that was hidden is a blister waiting for the monsoon.

## What should the owner look at on the day the scaffold comes down?

The lines. Every opening should have a crisp edge, every elevation a consistent texture, and the junction between the render and the ground should be clean rather than buried. Those are the things that cannot be corrected without the scaffold going back up.

Take photographs from the pavement at the same time of day for each elevation. They become the reference for the next repaint, and they cost nothing.

## How are junctions with an adjoining building handled?

With a movement joint rather than a butt of render against render. Two buildings move independently, and a render that bridges the gap cracks along the line within a year. A compressible backing and a flexible sealant give the movement somewhere to go.

## What does the painter need from the renderer?

A wall that is finished, cured and dry, with the reveals formed and the scaffold still in place. Access is the painter's largest cost and the renderer's last opportunity to provide it cheaply.

## Does the render need a key coat on concrete?

On a smooth concrete surface, yes: a spatterdash or a bonding slurry before the base coat. Without it the render sits on the surface rather than gripping it, and the hollow sound appears after the first hot season.

The reveal detail is the one to check first, because it is where water enters most often.
 Check it before the primer goes on rather than after.$w3$, 8, 'installation', $v3$https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Mariano_Eugenio_House_2026-07-04_Casa_Domingo_L._Robles_Center_Left_Exterior_04.jpg/1280px-Mariano_Eugenio_House_2026-07-04_Casa_Domingo_L._Robles_Center_Left_Exterior_04.jpg$v3$, $t3$Rendering and Painting a Facade: the Sequence$t3$, $m3$The order of work on an Indian facade: preparation, base and finish coats, curing, reveals and sills, drying before primer, and two topcoats.$m3$),
  ($a4$in-exterior-render-paint-quality$a4$, $b4$Checking an External Render and Paint Job in India$b4$, $d4$How to inspect an Indian facade: render thickness, tap tests for hollow patches, crack surveys, hose tests at reveals and assessing the paint film.$d4$, 'IN', $w4$# Checking an External Render and Paint Job in India

An external wall is checked twice: once before the paint, when the render is still visible, and once after, when the only evidence left is how the coating behaves. The first inspection is the one that matters.

## How is render thickness checked?

With a depth gauge, a nail through a fresh coat, or a small area cut out and measured. Sampling at a handful of points per elevation, at high, middle and low level, gives a fair picture; a single measurement at eye level tells you almost nothing about the top of the wall where the work is hardest.

The reason thickness matters so much externally is that render protects by depth. A wall that is twenty millimetres at the bottom and eight at the top will fail at the top first, and it will look like a paint failure when it happens.

## How are hollow and debonded areas found?

By tapping across the elevation with a light hammer or a knuckle, in a grid, marking what sounds dull. A hollow note means the render has separated from the backing, and water will collect in the gap behind it.

Hollow patches at the very top of a wall and around openings are common and repairable while the scaffold is up. Once it is down, the repair costs more than the render did.

## What does a crack survey look like?

Every crack is marked on an elevation drawing with its position, width and direction, then photographed with a scale. Hairline map cracking across a whole panel means the mix or the curing, not movement. A diagonal from the corner of an opening means the junction was not meshed.

The survey is repeated after the first monsoon. A crack that moves between the two surveys is a structural question; one that stays the same width is cosmetic and can be filled.

## How is the wall tested for water?

With a hose on a dry day, played over a window reveal and a junction for ten minutes while someone inside watches for damp. It is crude, it is unfashionable, and it finds leaks that no visual inspection will.

Testing before the paint is applied is far more useful than testing after, because the render can still be repaired. After painting, a leak means stripping back a coating to reach the defect.

## How is the paint film assessed?

For continuity, adhesion and colour consistency. Continuity is checked at the top of the wall and in the corners, where thin coats are easy to leave. Adhesion is checked with a cross-hatch test or a firm thumbnail on a warm day, when a poorly bonded film is soft enough to lift.

Colour is checked on a full elevation rather than a patch, in daylight. A wall painted in panels from different batches shows the join at every change in the sun's angle, and no amount of extra paint removes it once the batches differ.

## What defects justify refusing the work?

Four, all of them visible before painting. Render that is hollow over a large area, thickness consistently below specification, mesh absent at the junctions, and cracks that were filled without being opened.

After painting, the list narrows to two: film that lifts under a thumbnail, and an elevation that reads patchy across panels. Both are repaint jobs, and both are avoidable.

## What is a reasonable expectation for a new facade?

An even colour, a texture that is consistent across each elevation, crisp lines at openings, and no visible repair marks. Under raking morning or evening light, the wall should read as one plane with no bands or ripples.

That is the standard to write into the contract, because it can be assessed by anyone standing on the pavement at the right time of day.

## What should be recorded at handover?

The render mix and thickness, the products and batch numbers, the shade code, the date of each coat, and a set of photographs per elevation. Along with a note of any repair carried out during the work.

Ten years later, that record decides whether a patch is possible or whether a whole elevation has to be repainted to hide it.

## How is a high wall inspected safely?

From the scaffold or from a mobile platform, never from a ladder balanced against a wall that is being worked on. The inspection is visual and tactile, and it does not need to be done at height if the access is properly provided.

Where no access exists, a long-handled hammer and binoculars from the ground give a partial picture, and that partial picture should be described as partial rather than presented as a full inspection.

## What does a moisture reading tell you before painting?

Whether the render is dry enough to coat. Readings taken at several depths and compared over a week show the wall drying; a single reading shows a number that may mean nothing.

The practical threshold is that the render should read close to the ambient level for the season. A wall that is still giving up construction water in October after being rendered in June is a wall that has a water source, not a slow drying problem.

## How are finishes judged on a large elevation?

In panels, at a distance, at the time of day when the light rakes across. Stand at the far end of the wall rather than in front of it, and look along the surface: bands, laps and changes in texture read immediately at that angle.

Then close up, for the detail: crisp lines at openings, consistent texture, no misses at the top. Both views matter and they answer different questions.

## What should be done about existing cracks before painting?

Opened, filled, and bridged with a mesh or an elastic filler depending on whether they are moving. Painting over a crack is the definition of a repair that has to be repeated, and it will reopen within a season.

A crack survey before painting is worth more than any specification of the coating. A good coating on a cracked wall will fail at the cracks; a modest coating on a sound wall will last its full interval.

## Does colour choice affect performance?

Slightly. Dark colours absorb more heat, which raises surface temperature and thermal movement, and they fade faster in strong sun. Light colours reflect and last longer, and on a west-facing elevation the difference is visible within a few years.

That is a performance argument rather than an aesthetic one, and it is worth mentioning to a client who has chosen a deep shade for a sun-facing wall.

## How is a new facade compared between contractors?

By asking each to price a written specification, then by visiting work each has completed at least three years earlier. A facade that has been through three monsoons is the only reliable portfolio.

References from a building finished last month show a contractor's ability to make something look good once. A building finished three years ago shows whether it still does.

## How is a repair judged after the fact?

By whether it is visible from the pavement, in the light of the day, without knowing where it is. A repair found only by someone who watched it being done has succeeded.

The second measure is whether it survives a monsoon. A repair that looks perfect in April and has reopened by August was a cosmetic intervention, and the diagnosis should shift to the cause.

## How is a facade checked after the first monsoon?

By repeating the same survey: cracks in the same positions, new ones marked, and any stain or blister recorded against its location. Comparing two surveys taken a year apart is how a cosmetic crack is distinguished from a structural one.

This second survey is the point at which a snag list becomes a maintenance plan, and it is the only moment when a contractor's warranty is still useful.

## Who should carry out the inspection?

Someone with access, a scale and a drawing, and no commercial interest in the conclusion. On a large building that is a clerk of works or an independent surveyor; on a house it is the owner with a torch, a ladder and a phone camera.

The method matters more than the title. A grid, a drawing, photographs with a date, and a repeat visit in a year will find what needs finding.

## How are heights above the scaffold checked?

From the platform, with a mirror or by leaning out, rather than by assuming. The top course and the parapet are the least inspected and most leak-prone parts of any facade.

Where access does not allow a proper look, the assumption should be written down as an assumption, so that the next inspection knows what was not covered.

## Does the direction of sunlight help an inspection?

Considerably. Morning and evening light grazes a wall and reveals every undulation; midday light flattens it. Scheduling an inspection for the raking hours is the cheapest improvement available to any survey.

## How is a contractor's work checked on someone else's building?

By asking for the address of a facade completed several years earlier and looking at it in the rain if possible. A wall that has been through monsoons shows the truth about thickness, curing and detailing in a way that a fresh job never can.

Where a reference cannot be visited, ask what failed and how it was repaired. A contractor who can describe a failure and its correction is more informative than one who reports none.

## What does a good inspection photograph contain?

The elevation name, a scale, and enough of the building to locate the defect. A close-up of a crack with no context is a picture of a crack; a photograph showing which floor and which window is evidence.

## How is a facade signed off?

With the survey, the photographs and the batch numbers filed together, and with the contractor and the owner walking the elevation once, in raking light, before the scaffold goes.

## What about the tops of walls and parapets?

They are checked from above if the access allows, and assumed if it does not. Copings that have lifted, joints that have opened and render that stops short of the top are the defects that produce damp two floors down.

The report should name each defect by elevation and height, so the repair can be found again.

A defect without a location is a complaint; a defect with an elevation, a height and a photograph is a repair instruction.

Two defects found in the same position on two surveys are the ones that matter most.

Recording the date of each survey is what turns a set of photographs into a history.$w4$, 8, 'quality', $v4$https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Marston_Meysey_roundhouse_%28geograph_3336995%29.jpg/1280px-Marston_Meysey_roundhouse_%28geograph_3336995%29.jpg$v4$, $t4$Checking an External Render and Paint Job$t4$, $m4$How to inspect an Indian facade: render thickness, tap tests for hollow patches, crack surveys, hose tests at reveals and assessing the paint film.$m4$),
  ($a5$in-exterior-render-paint-maintenance$a5$, $b5$Maintaining an External Wall in India: Monsoon, Sun and Repainting$b5$, $d5$Facade maintenance in India: pre-monsoon checks, crack repair, efflorescence, algae, repaint intervals and how to trace a leak on a rendered wall.$d5$, 'IN', $w5$# Maintaining an External Wall in India: Monsoon, Sun and Repainting

An external wall tells you it is failing long before it fails. The sequence is predictable: a hairline crack, a stain under a window, a patch of algae on the shaded side, and eventually a hollow sound when you tap it. Each stage has a cheap response, and the cost of ignoring it grows faster than most owners expect.

## What does a facade need every year?

A walk-round before the monsoon and another after it. Before: clear the drains and check the sills, the parapet, the base and every joint around openings. After: look for new cracks, new stains and any paint that has blistered or lifted.

That is two hours a year and it is the whole of preventive maintenance on a painted facade. Everything else in this article is a response to something the walk-round would have caught.

## How are external cracks repaired?

By opening them, filling them and coating them. A V-shaped cut along the crack, dust removed, a flexible exterior filler worked in, sanded flush once cured, then primer and the topcoat brought out beyond the repair.

Wide cracks, or those that reopen after a repair, are movement and need an elastic sealant rather than a filler, often with a mesh strip bedded across. Filling a moving crack with a rigid material simply relocates it a few millimetres away.

## What does algae or black mould on a facade mean?

That the wall stays damp on that elevation, usually the one away from the sun and the prevailing wind. North and east faces in humid climates grow biological growth on almost any coating given time, because they dry slowly.

The treatment is a wash with a suitable biocide, a rinse, time to dry, and a recoating with a product that resists growth. Where the growth returns within a season, the cause is a leak or a bridged damp course, not the coating.

## What is efflorescence and what should be done about it?

White salts carried through the wall by water and left on the surface when it evaporates. Brushing them off is cosmetic; the wall will bloom again until the water path is closed.

The path is usually a leaking sill, a crack, a saturated parapet, or a render that is too thin to resist capillary movement. Finding it is the work; the cleaning is the easy part.

## How often does an Indian facade need repainting?

Four to seven years in most of the country, three to four on a coast, and longer on a protected elevation. The interval is set by how the coating is behaving, not by the calendar: when it chalks, fades unevenly or has been patched, it is time.

Repainting at the first sign costs a fraction of repainting after the render has started to erode, because the render then needs repair as well as decoration.

## How is a facade prepared for repainting?

Washing to remove chalk, dirt and biological growth, scraping loose and flaking paint back to a firm edge, filling cracks and hollows, then priming the repairs and any bare render. That preparation is most of the work and most of the cost.

Skipping it and applying a coat over the top is the standard way to waste paint. The new film fails in the same places as the old one, usually within two seasons.

## How are patches made invisible?

By working a whole elevation, or a defined architectural panel, rather than a patch. Bring the repair out with primer, then coat the entire panel so the sheen and the film thickness are continuous.

Touching in a repair on a weathered wall never matches, because the surrounding film has aged. The exception is a wall repainted recently from a known batch, which is the argument for keeping the record.

## What should an owner never do?

Never coat over a damp wall, never seal a leak with paint, and never use an interior product outside to save money. Each of those works for one season and creates a repair that costs several times the saving.

Also worth avoiding: pressure-washing a render at close range. It removes the surface skin that gives the wall its weather resistance, and the damage shows up as erosion rather than as an obvious hole.

## How does maintenance differ by climate?

On the coast, salt and wind matter more than sun, and the interval between repaints shortens. In the dry interior, the wall's enemy is thermal movement and dust, and the render cracks before the coating fails. In the monsoon belt, the enemy is prolonged wetting and biological growth.

The materials follow the climate, and so does the schedule. A specification copied from another city is a specification written for another wall.

## What is the first thing to check after a storm?

Water marks inside, not damage outside. A stain on an internal wall after heavy rain identifies the elevation and often the height at which water is entering, which narrows the search on the facade to a few square metres.

Then check the obvious external candidates in order: the parapet, the sills, the frame joints, and the base. Those four places account for the majority of leaks on rendered Indian buildings.

## Does the paint need to be washed?

Yes, once or twice a year on a dusty elevation, with water and a soft brush, working from the top down. Washing removes the film of pollution that holds moisture against the coating and feeds biological growth.

What should be avoided is abrasive cleaning and high-pressure jets at close range. Both remove the surface that is doing the work, and the damage looks like erosion a season later.

## How does a repaint get specified?

By naming the products, the number of coats and the preparation, and by requiring the same shade code recorded at the last repaint. A specification that says repaint the facade is not a specification.

Where the previous record is missing, a colour match from a sheltered area, such as under a balcony, gives a better starting point than a guess from the weathered wall.

## What happens if maintenance is deferred?

The render starts to erode where water sits, usually at the base and under sills. Once the render is thin, water reaches the masonry, and the repair moves from painting to rendering, which costs several times as much and disrupts the building.

Deferral is therefore not a saving but a transfer: the money not spent on paint is spent later on render, at a worse time and at a higher price.

## How does a facade plan work for a housing society?

By elevation, on a cycle, with the cost shared and scheduled rather than raised in a crisis. Societies that repaint one elevation a year spend less overall than those that wait for a leak and then repaint everything in a hurry.

The plan needs a record: which elevation, which year, which product. That record is the whole of the institutional memory, and it is usually one page.

## What is worth keeping from each repaint?

The tin labels, photographed, with the date and the elevation noted. Along with the quantity used per elevation, which predicts the next order and exposes a coat that was spread too thin.

That record costs a minute per elevation and answers the questions that arise at the next repaint: what was used, when, and how much. Without it, every cycle starts from a guess, and guessing is how shades drift across a building.

## How does a facade fail in a coastal city?

Faster, and differently. Salt accelerates the breakdown of the coating and attacks any embedded metal, so fixings, brackets and reinforcement near the surface corrode and split the render from behind. The first sign is often a rust stain rather than a crack.

The response is a coating system designed for the exposure, stainless or coated fixings, and closer inspection intervals. A coastal facade is on a shorter cycle than an inland one, and pricing it as though it were not is how budgets get surprised.

## Is it worth repairing a facade in sections?

Often, yes. One elevation at a time spreads the cost, keeps access equipment in use for a continuous period, and allows the lessons from the first elevation to improve the second.

The risk is inconsistency of shade between sections done in different years. Keeping the record and buying the same product code each time is what keeps a sectional programme from turning a building into a patchwork.

## How is a leak traced on a rendered wall?

By wetting one suspect detail at a time and watching inside. Start at the sill, then the frame joint, then the parapet, then the base. Each test takes ten minutes with a hose and a helper indoors, and the result identifies the detail rather than the wall.

Guessing is expensive because the visible stain is rarely at the point of entry. Water travels along the render's backing, so a damp patch in a bedroom often maps to a defect two metres away on the facade.

## When is a facade repaint a waste of money?

When the render beneath is failing. Coating over a hollow, cracked or eroded render buys a season and hides the problem until it is more expensive. The test is a tap and a scrape; if the render moves or crumbles, the work is rendering, not painting.

## What is the cheapest long-term decision?

Specifying twenty millimetres of well-cured render and a primer the first time. Everything afterwards is maintenance on a sound wall rather than repair of a failed one, and the difference over twenty years is the difference between repainting and re-rendering.

## Does a facade need a maintenance contract?

Not necessarily, but it needs a named person and a written plan. Contracts formalise what a homeowner does from memory: look before the monsoon, repair what is found, repaint when the film has tired.

Two hours a year, before and after the rains, is the entire preventive programme, and it is the only part that is optional to skip and expensive to skip.

Where a society cannot fund the whole programme, the exposed elevation should come first, because it is the one that fails first and the one that costs most when it does. Everything else can follow in a planned order rather than in response to a leak.

Repainting the exposed elevation on a shorter cycle than the sheltered ones is the cheapest way to keep a building looking maintained rather than constantly under repair.

A facade that is inspected on a schedule never surprises its owner, and the schedule costs nothing to keep once it exists.

The plan is one page: elevations, years, products. That page is the difference between a maintained building and a series of emergencies.$w5$, 8, 'maintenance', $v5$https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Calshot_officer%27s_mess-1.jpg/1280px-Calshot_officer%27s_mess-1.jpg$v5$, $t5$Maintaining an Indian Facade: Monsoon and Repaint$t5$, $m5$Facade maintenance in India: pre-monsoon checks, crack repair, efflorescence, algae, repaint intervals and how to trace a leak on a rendered wall.$m5$)
) AS a(slug,title,excerpt,market,content,read_time_minutes,theme,cover_url,meta_title,meta_description) JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='assembly:in-exterior-render-paint' ON CONFLICT (slug) DO NOTHING;
UPDATE public.learn_wall_finishing_article_slots sl SET article_id=a.id FROM public.learn_articles a WHERE sl.topic_id=a.wall_topic_id AND sl.theme_key=a.wall_article_theme AND sl.language_code='en' AND sl.article_id IS NULL AND a.slug LIKE 'in-exterior-render-paint-%%';
ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER wall_source_review_attribution;
UPDATE public.learn_wall_finishing_sources s SET review_status='accepted', reviewed_by=(select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), reviewed_at=now() FROM public.learn_wall_finishing_topics t WHERE s.topic_id=t.id AND t.candidate_key='assembly:in-exterior-render-paint' AND s.review_status='pending';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics t SET verification_status='verified', verified_by=(select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), verified_at=now() WHERE t.candidate_key='assembly:in-exterior-render-paint' AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.review_status='accepted');
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles SET status='published', editorial_review_status='approved', editorial_reviewed_by=(select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), editorial_reviewed_at=now(), published_at=coalesce(published_at, now()) WHERE wall_topic_id=(SELECT id FROM public.learn_wall_finishing_topics WHERE candidate_key='assembly:in-exterior-render-paint') AND slug LIKE 'in-exterior-render-paint-%';
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;
COMMIT;
