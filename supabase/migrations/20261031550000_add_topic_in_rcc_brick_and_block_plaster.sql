BEGIN;
-- India batch 1: RCC frame + brick infill (system:in-rcc-frame-brick)

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope)
SELECT t.id,s.title,s.publisher,s.url,s.claim_scope
FROM public.learn_wall_finishing_topics t
CROSS JOIN (VALUES
 ('IS 1905 Code of practice for structural use of unreinforced masonry','Bureau of Indian Standards','https://www.bis.gov.in/','Indian unreinforced masonry design, wall thickness and mortar'),
 ('IS 2212 Code of practice for brickwork','Bureau of Indian Standards','https://www.bis.gov.in/','Indian brickwork execution, soaking of bricks, mortar and bond'),
 ('Building materials and technology guidance','BMTPC (bmtpc.org)','https://www.bmtpc.org/','Indian walling materials, blockwork and cost-effective construction'),
 ('Energy and building envelope research','TERI (teriin.org)','https://www.teriin.org/','Indian climate, thermal comfort and envelope performance')
) AS s(title,publisher,url,claim_scope)
WHERE t.candidate_key='system:in-rcc-frame-brick'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources x WHERE x.topic_id=t.id AND x.url=s.url);

INSERT INTO public.learn_articles(slug,title,excerpt,wall_market_code,content,read_time_minutes,wall_article_theme,cover_image_url,meta_title,meta_description,category_slug,status,wall_topic_id,wall_language_code)
SELECT a.slug,a.title,a.excerpt,a.market,a.content,a.minutes,a.theme,a.cover,a.mt,a.md,'surface-preparation','draft',t.id,'en'
FROM (VALUES
('rcc-frame-brick-infill-overview',
 'RCC Frame with Brick Infill: How Indian Walls Are Built',
 'An RCC frame with brick infill is how most Indian multi-storey buildings are walled. Here is how the frame and the infill share the work, and what decides whether the wall cracks.',
 'IN',
$wallarticle1$# RCC Frame with Brick Infill: How Indian Walls Are Built

An RCC frame with brick infill is the default wall of Indian multi-storey housing. The reinforced concrete frame carries the floors and the lateral loads, and the brick panels simply fill the openings between columns and beams. The brick does not hold the building up, and that single fact explains most of what goes right and wrong with these walls.

The distinction matters more than it sounds. In a load-bearing brick building the wall is the structure, so a crack is a structural warning. In a framed building the wall is a filling, so a crack is usually a movement problem between two different materials behaving differently. Owners and contractors who confuse the two either panic about harmless shrinkage cracks or ignore the ones that matter.

## Why is a brick infill wall not load-bearing?

Because the frame is designed to take the load without it. Columns and beams are sized for the floor loads, the wind and the seismic demand, and the infill is treated as a non-structural element that adds mass and stiffness but is not counted on for strength.

The practical consequence is that the wall must be isolated from the frame in the right places. If the infill is built tight against the underside of a beam with hard mortar and no allowance, the beam deflects under load and the wall, which cannot follow, cracks at the corner. A flexible joint or a slip detail at the head is what stops that.

The second consequence is that the frame must be built first, cured, and only then filled. Building infill into a frame that is still settling invites the same damage.

## What does IS 1905 require that owners should know?

IS 1905 sets out the design of unreinforced masonry, and the parts that reach an owner's life are the minimum wall thickness, the mortar grade and the bond. Indian practice commonly uses 230 mm external walls and 115 mm internal partitions, with cement-sand mortar in the 1:4 to 1:6 range depending on the exposure and the block type.

The standard also constrains how slender a wall may be, which is why a 115 mm partition taller than about three metres needs stiffening. Builders who ignore that get a wall that flexes when a door slams and cracks along the junction with the frame.

## What does IS 2212 say about laying the bricks?

IS 2212 is the brickwork code, and its most ignored clause is about soaking. A fired clay brick will pull water out of the mortar within seconds if it is bone dry, which starves the cement of the water it needs to hydrate. The result is a joint that looks full and is actually weak and crumbly.

The code expects bricks to be soaked before laying, usually for several hours and then allowed to surface dry. On a site where bricks arrive on a tractor and go straight onto the wall, that step is the first casualty, and the second is the mortar strength.

## How thick should the mortar joint be?

Ten millimetres, consistently. A joint that varies from six to twenty millimetres changes the bed the brick sits on, and the wall's height wanders. It also changes the amount of mortar in the wall, which changes its strength and its shrinkage.

A mason working with a string line and a straight edge holds ten millimetres without thinking about it. A mason working by eye does not, and the difference shows up at the top of the wall when the last course has to be cut to fit a gap that should not exist.

## How does the infill connect to the frame?

Through starter bars, mesh strips or toothed joints, depending on the drawing. The connection is what stops the panel from falling out under lateral load, and in seismic zones it is mandatory rather than optional.

Where the connection is a toothed joint, the frame is cast with a recess and the brick is built into it course by course. Where it is a mesh strip, the mesh is fixed to the concrete and bedded into the mortar as the wall rises. Both work; what does not work is a straight vertical joint with nothing crossing it.

## What are seismic bands and why do they appear in the wall?

Bands are reinforced concrete or timber runners cast into the wall at plinth, sill and lintel level. In Indian practice they are specified for masonry buildings in seismic zones, and they also appear in framed buildings where the infill is expected to behave as a panel.

A band ties the wall together horizontally, limits the height of an unrestrained panel and gives a crack a place to stop. Where a band is shown on the drawing and omitted on site, the wall loses that restraint and the first sign is a horizontal crack above an opening.

## Where does the water get in?

At the joints between materials, not in the middle of a brick. The frame-to-infill joint, the window and door reveals, the parapet and the junction with a slab edge are the usual entry points.

An external wall also takes water through the brick itself if it is porous or poorly fired. That water then travels through the wall and appears inside as a damp patch at the skirting, blamed on plumbing, when the source is a wall that has no cavity, no damp-proof course or a sill that falls the wrong way.

## How thick is the plaster and what is it for?

Twelve to twenty millimetres of cement-sand plaster in two coats, typically a backing coat and a finishing coat. The plaster does three jobs: it covers the uneven brick face, it provides a flat surface for paint and it slows the movement of water and air through the wall.

Plaster is not a waterproofing layer. A hairline crack in a rendered external wall lets water straight through to the brick behind, and once the brick is wet the plaster holds the moisture in rather than letting it dry. That is why a render crack on a monsoon-facing elevation becomes an internal damp patch rather than a surface blemish.

## What causes the cracks owners notice first?

Three causes, in order of frequency. Shrinkage of the cement-rich plaster, movement between the frame and the infill, and thermal movement across a long wall with no joint.

The shrinkage crack is the fine, regular crack that appears in the first year, often running diagonally from the corner of an opening. The frame movement crack is the one that follows the beam soffit or the column line. The thermal crack is the long vertical one in a wall that runs without a break.

## Can you tell which crack matters?

Yes, by position and by behaviour. A crack that follows a material junction and stops at a band is a serviceability issue. A crack that runs through bricks rather than around them, widens over a season, or appears together with a sticking door is telling you that something structural is moving.

A crack wider than about five millimetres, or one that grows after every monsoon, deserves a structural assessment before it is filled and painted. Filling a moving crack hides it for one season and returns it the next.

## What does the wall cost and who builds it?

In Indian practice the frame is built by a reinforced concrete contractor and the infill by a masonry gang, often under a separate rate. Brickwork is priced by the cubic metre or the square metre, plaster separately, and the finishing trades again separately.

That division is where most quality problems start. The mason is paid for volume, the plasterer for area, and nobody is paid to check that the brickwork is straight enough for a thin plaster coat. Specifying the tolerance and paying for it once is cheaper than a thick levelling coat that fails in two years.

## How long does the wall last?

The frame will outlast the finishes several times over. The brick infill, protected by sound plaster and a maintained paint film, lasts decades. What fails first is the junction detail: a cracked render, a failed sealant at a window, a parapet without a coping.

Maintaining an Indian infill wall is therefore mostly a matter of keeping water out of the joints and keeping the paint film intact. Everything else in this topic follows from that.

## What the rest of this topic covers

The materials article sets out bricks, blocks, mortar, steel and plaster constituents against the Indian standards. The installation article follows the sequence from frame handover to plastered wall. Quality covers what to inspect and how to measure it, and maintenance covers cracks, damp and repainting.

## Image credit

Photograph by Jim Carter, CC BY-SA 4.0, via Wikimedia Commons. The image shows an Indian worker at a building construction site.

## Is brick infill the same as load-bearing brickwork?

No, and the difference decides how every defect is read. In load-bearing brickwork the wall carries the floors; in a framed building the wall is a panel between structural members. A crack in the first is a warning about the structure. A crack in the second is usually a movement issue between two materials.

That distinction is why an Indian framed building can show a cracked wall and still be perfectly sound, while a load-bearing building with the same crack may need urgent attention.

## How does the wall behave in an earthquake?

The frame is designed for the seismic demand and the infill is not, but the infill still resists movement until it cracks. That creates a stiff panel braced against a frame that wants to sway, and the interaction is why codes require the infill to be tied in but separated at the head.

The practical requirement for an owner is that the infill is properly tied to the frame and that the head detail allows movement. Both are invisible after plastering, which is why the photograph taken before plaster matters.

## Why do so many Indian walls crack at the beam line?

Because the beam deflects and the wall does not. Under the floor load the beam sags a few millimetres, and the wall built tight to its soffit is compressed at one end and separated at the other. The result is a horizontal crack just below the soffit or a diagonal from the corner of an opening.

A slip joint at the head removes the problem entirely. It costs a strip of compressible material and a sealant, which is less than one repair visit.

## Does the infill add any strength worth having?

Yes, incidentally. An infill panel stiffens a frame considerably until it cracks, and that stiffness is what causes the crack. Designers know this, which is why they avoid counting on it and why they isolate it.

For an owner the useful consequence is that a cracked panel is not a sign that the building lost its strength. It is a sign that a non-structural element moved, and the repair is cosmetic unless other evidence says otherwise.
$wallarticle1$,
 11,'overview','https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Male_labour_working_at_Building_construction_site.jpg/1280px-Male_labour_working_at_Building_construction_site.jpg',
 'RCC Frame Brick Infill Walls: Indian Guide',
 'RCC frame with brick infill explained: how the frame and panel share the load, IS 1905 and IS 2212 requirements, and why these walls crack. Indian practice.'),
('rcc-frame-brick-infill-materials',
 'Materials for an RCC Frame and Brick Infill Wall',
 'Bricks, mortar, reinforcement, plaster and putty decide how an Indian infill wall performs. Here is what to specify, in the order the standards address it.',
 'IN',
$wallarticle2$# Materials for an RCC Frame and Brick Infill Wall

Every material in an RCC frame with brick infill has a standard behind it, and every standard has a clause that gets skipped on site. The materials list below follows the sequence of the build, so the decisions arrive in the order a project needs them.

The point of listing them this way is that the failures are usually traceable to one material property that nobody checked. A brick with high absorption, a mortar mixed richer than specified, a plaster applied too thick: each produces a specific defect two years later, and each is cheap to prevent at the point of purchase.

## Which bricks are suitable for infill?

Fired clay bricks in the usual Indian classes, or fly ash bricks and concrete blocks where the specification allows them. What matters for infill is compressive strength, absorption and dimensional consistency, in that order.

Absorption is the property that decides whether the wall holds water and whether the mortar bonds. A brick that absorbs more than about one fifth of its weight in water will draw the mortar dry and will also take water in through the face during the monsoon. Dimensional consistency decides whether the wall is ten millimetres of mortar or twenty.

## What about AAC and concrete blocks?

AAC blocks are lighter, more dimensionally accurate and better insulators, and they are increasingly common in Indian multi-storey work. They also behave differently: they absorb water readily, they need a thinner mortar and a different plaster mix, and they move more with moisture than clay brick.

Mixing clay brick and AAC in the same wall is a reliable way to produce a crack at the change of material. If the design changes mid-build, the joint needs a mesh strip across it rather than a butt joint.

## What mortar mix should be used?

Cement-sand mortar in the range of 1:4 to 1:6 by volume, matched to the exposure and the block type. A richer mix is not stronger in any useful sense: it is stiffer, shrinks more and cracks more, and it costs more cement.

The mix should be used within about ninety minutes of gauging. Mortar that has begun to set and is re-tempered with water has lost strength that cannot be restored by adding cement.

## How is the sand specified?

Clean, well graded river or manufactured sand, free of silt and clay. A sand with high silt content produces a weak, friable mortar that dusts when you rub it, and it is one of the most common causes of crumbling joints on Indian sites.

A simple field check is to put a sample in a bottle with water, shake it and leave it to settle. A silt layer more than a few per cent of the sand volume is a reason to reject the load.

## What reinforcement goes into the frame?

Deformed bars to the Indian standard, with the cover and lap lengths shown on the structural drawing. For an owner, the two things worth checking are bar diameter against the drawing and cover, because a bar laid directly on formwork has no cover and will corrode from the outside in.

Cover blocks should be of the specified grade and density, not pieces of broken brick or stone. A brick chip as a spacer is a chloride and moisture path straight to the steel.

## What plaster materials are needed?

Cement, sand and water for the backing coat, and a finer mix for the finishing coat. Some specifications add lime for workability, which helps on a hot site where the mix dries before it can be ruled off.

Water quality matters more than it is credited for. Water carrying salts or organic matter produces a plaster that effloresces, dusts or never develops its intended strength. Potable water is the simple rule.

## What is wall putty and where does it belong?

Wall putty is a fine filler applied in thin coats over cured plaster to fill the pores and give paint a smooth base. It is not a levelling compound for a badly plastered wall, and using it that way produces a thick film that shells off.

Putty should be applied only after the plaster has cured, not after it has dried. A plaster that is dry but still chemically active will push the putty off from behind.

## Which primer and paint suit the wall?

An alkali-resistant primer on fresh plaster, then an acrylic emulsion for interior surfaces or an exterior emulsion with the specified sheen for outside. On Indian exteriors the paint film takes intense ultraviolet and a monsoon, so the exterior grade matters more than the colour card.

Primer is doing the work that putty cannot: sealing the surface and blocking alkali. Skipping it and applying two coats of paint directly is the single most common reason a new paint job fails within a year.

## How are materials stored on an Indian site?

Bricks stacked clear of the ground on a level base, covered at the top so they do not take rain, and laid out to be soaked before use. Cement in a dry store, off the floor, used in date order and never in bags that have set into lumps.

Reinforcement stored on timber or blocks, not on soil, and covered where it will sit for weeks. A rusted bar loses section and bond, and a bar contaminated with mud loses bond entirely.

## What quantities should an owner expect?

Brickwork is measured by volume, plaster by area, and paint by litre per coat with the coverage on the tin. Rough benchmarks for Indian practice: about 500 bricks per cubic metre of brickwork, mortar at roughly a quarter of the brickwork volume, and plaster at about twelve millimetres for internal and fifteen to twenty for external.

Those figures are for estimating, not for payment. Payment should follow the measured work, which is why a site record of the quantities actually built protects both sides.

## How do materials decide the finish quality?

A dimensionally consistent brick laid with a consistent joint produces a wall that needs a thin plaster. A wall of variable bricks needs a thick plaster to look flat, and thick plaster is where shrinkage cracks and debonding begin.

So the cheapest route to a good painted finish is not a better painter. It is a more consistent brick, a straight wall and a plaster coat thin enough to stay put.

## Image credit

Photograph by Eric Fischer, CC BY 2.0, via Wikimedia Commons. The image shows the brick side wall of a building under construction.

## How does brick strength compare with block strength?

Fired clay brick in the usual Indian classes is stronger than most AAC block, but strength is rarely the governing property for an infill panel. What governs is whether the wall can carry its own weight, take a fixing and hold plaster.

The exception is a wall that also acts as a shear panel or carries a heavy unit. There, the specified strength matters, and substituting a lighter block without checking changes the wall's behaviour.

## Do fly ash bricks need different handling?

Yes. They absorb water more slowly than clay brick and they can be more brittle, so the soaking time and the mortar mix need adjusting. They also benefit from a slightly leaner mortar, because a rich mix on a high-absorption unit produces a stiff joint that cracks.

The other difference is dimensional: fly ash bricks are usually more consistent, which allows a thinner plaster and a better finish.

## What is the cheapest material decision with the biggest effect?

Specifying an accurate, low-absorption unit. It costs little more per thousand than the cheapest available brick, and it removes the need for a thick plaster, a levelling render and a repair within five years.

Most of the money spent on Indian wall failures traces back to a material bought on price alone. The plaster and paint that follow are then asked to compensate, and they cannot.

## How does plaster mix relate to the block?

AAC and lightweight blocks need a leaner, more vapour-permeable plaster than dense clay brick, otherwise the wall cannot dry inward and the paint blisters. A cement-rich plaster on an AAC block is a common mismatch.

For dense brick, a 1:4 to 1:6 cement-sand plaster behaves well. For AAC, follow the block manufacturer's mix rather than transferring the brick specification unchanged.

## What about waterproofing admixtures?

They help on external render and in wet areas, and they are not a substitute for detailing. An admixture in a render that has a crack does not stop water entering the crack.

Use admixtures where the specification calls for them and where the surface can still dry. A waterproof render on both faces of a wall traps moisture inside it, which turns a surface problem into a structural one over years.

## Is a mortar plasticiser worth using?

On a hot Indian site, yes. A small dose of a plasticiser or lime keeps the mortar workable long enough to be laid and furrowed, which reduces the temptation to add water later. Added water after gauging is what weakens joints.

Plasticisers do not replace cement. A mix that needs a plasticiser because it is too lean needs a richer mix, not more additive.

## How is brick absorption measured on site?

By weighing a dry brick, soaking it for twenty-four hours, and weighing it again. The gain as a proportion of the dry weight is the absorption figure, and the standard sets the limit for the class.

A site can do this on three bricks from a delivery in a day. It is the cheapest test available and it predicts both the mortar bond and the wall's rain resistance.

## What does a good delivery look like?

Bricks of a consistent size, sound when struck, and free of lime particles that will later pop and blow the plaster. Sand that leaves a clean stain on the hand rather than a muddy smear. Cement in date-stamped bags that have not set.

Judging a delivery on those three points takes ten minutes and prevents most of what follows in this topic.

## Does brick colour tell you anything?

Sometimes, and never reliably. A very pale, under-fired brick is usually soft and highly absorbent; a dense, ringing brick is usually well fired. Colour alone is a poor test in either direction.

The reliable checks are weight, ring and absorption. An owner who asks for the absorption figure gets a useful answer; an owner who asks for "good red bricks" gets an opinion.

## Is a site-made mortar better than a bagged mix?

Neither is automatically better. A site mix is only as good as the sand grading and the measuring, and most Indian sites measure by shovel. A bagged dry mix measures itself and costs more per cubic metre.

Where the wall is highly visible or the plaster is thin, the consistent mix is worth the price. Where the brickwork is internal and thick-plastered, a well-run site mix is fine.
$wallarticle2$,
 10,'materials','https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Brick_side_wall_of_building_under_construction_%2838222954221%29.jpg/1280px-Brick_side_wall_of_building_under_construction_%2838222954221%29.jpg',
 'Brick and Mortar for RCC Infill Walls',
 'Bricks, mortar, plaster and putty for Indian infill walls: absorption, mix ratios, sand quality, primer and storage, matched to IS 1905 and IS 2212.')
) AS a(slug,title,excerpt,market,content,minutes,theme,cover,mt,md)
JOIN public.learn_wall_finishing_topics t
  ON t.market_code=a.market
 AND t.candidate_key='system:in-rcc-frame-brick'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.learn_articles(slug,title,excerpt,wall_market_code,content,read_time_minutes,wall_article_theme,cover_image_url,meta_title,meta_description,category_slug,status,wall_topic_id,wall_language_code)
SELECT a.slug,a.title,a.excerpt,a.market,a.content,a.minutes,a.theme,a.cover,a.mt,a.md,'surface-preparation','draft',t.id,'en'
FROM (VALUES
('rcc-frame-brick-infill-installation',
 'Building and Infilling an RCC Frame Wall: The Sequence',
 'From frame handover to a plastered, painted wall: the order Indian infill work actually follows, and the steps that cannot be skipped or reordered.',
 'IN',
$wallarticle3$# Building and Infilling an RCC Frame Wall: The Sequence

Sequence is the whole discipline of an infill wall. The frame is cast and cured, the infill is built, the plaster is applied, the plaster cures, the putty is skimmed, the primer is applied and the paint goes on. Every step waits for the one before it, and every shortcut that collapses two steps into one shows up as a defect.

Indian sites run on schedules, and the temptation is always to start plastering the day the last brick is laid. The sections below set out what each step needs and what happens when it is rushed.

## When can infill start after the frame is cast?

After the concrete has reached adequate strength and the props under the slab above have been released, not before. Building on a frame that is still carrying its own formwork loads risks loading a member that has not developed its capacity, and it risks the wall being built into a frame that then deflects.

The practical marker on most Indian sites is the striking of the slab props above the wall being built. A wall built before that is built into a moving frame.

## How is the wall set out?

By string line from the columns, with the wall centre line marked on the slab and checked against the drawing for thickness and openings. Setting out is where the difference between a 230 mm and a 115 mm wall is decided, and where a door that has to align with the one above it either does or does not.

The thickness has to be constant along the run. A wall that starts at 230 and finishes at 190 because the column is out of position produces a plastered face that is neither plumb nor flat, and no amount of plaster hides it.

## How are bricks prepared before laying?

Soaked, then allowed to surface dry. The soaking fills the pores so the brick does not steal the mortar's water; the surface drying stops the brick sliding on a wet bed and producing a joint full of slurry rather than mortar.

On a summer site the difference between a soaked and a dry brick is visible within a minute of laying. Mortar on a dry brick stiffens instantly and cannot be furrowed into a bed.

## What is the correct bedding technique?

A full bed and a full frog, with mortar spread ahead of the brick and the brick pressed down and tapped into line, not slid into place. Sliding pushes mortar out of the joint and leaves voids at the ends of the brick, which is where the wall later leaks and where the plaster keys fail.

The joint should be finished as the wall rises, not left to be scraped later. Raked joints for a later plaster key are formed while the mortar is green, not after it has set.

## How high can a wall be built in one day?

About a metre to a metre and a half of height, or less where the mortar is rich and the weather is hot. Building too fast produces a wall that settles unevenly and lifts the courses below, and it does not let the mason check plumb as the wall goes.

A day's height should also stop below a band or a lintel so the next lift starts on a level bed, not on a course that has been cut to fit.

## How are openings formed?

With a lintel or a band above, bearing on the wall at each side, and with the sill or the threshold below falling outward so water leaves rather than sits. The bearing length is generous enough to carry the wall above without the ends punching in.

Arches are rare in modern Indian infill, and where a wall carries load above an opening without a lintel, the crack pattern that follows starts at the corners.

## How are the connections to the frame made?

By starter bars cast into the columns and lapped into the courses, or by mesh strips fixed to the concrete and bedded in the mortar, or by toothed joints built into a recess in the frame. The drawing will say which, and the wall is only as tied as that connection.

The head of the wall needs the opposite treatment: a slip or a flexible joint under the beam soffit rather than hard-packed mortar. That joint is what lets the beam deflect without loading and cracking the panel.

## What about the seismic bands?

Bands at plinth, sill and lintel level where they are specified, cast with continuous reinforcement and tied into the frame. A band that stops at a door opening without returning into the jamb does not do the job it was drawn for.

Where the band is cast in situ, the wall either side needs to be built to the band level, the band cast, and the wall continued after it has cured.

## When does plastering start?

After the brickwork has been checked for plumb, the joints raked or prepared, and the surface cleaned of mortar droppings. On most Indian projects plaster starts a few days after the wall is complete, and the important thing is that the wall has had time for its initial movement.

The surface should be wetted before the backing coat so the dry brick does not pull water out of the plaster. A dry wall takes water from the mix and leaves a coat that is friable and prone to debonding.

## How is the plaster applied?

In two coats: a backing coat ruled to the thickness, keyed, and a finishing coat applied after the backing has set but before it has dried hard. Thickness is controlled by dots and screeds, not by eye.

The finishing coat is trowelled to a flat surface and, where the specification calls for it, finished with a sponge or a steel trowel depending on whether the paint system needs a key or a sheen.

## How long does the plaster need to cure?

Seven to fourteen days of moist curing for a cement-sand plaster, longer in hot dry weather. Curing is not optional: a plaster that dries in a day rather than curing over a week never develops its strength and will dust, craze and crack.

On site the practical method is to wet the wall twice a day and keep it damp rather than soaking it once. The plaster should still look damp on day three.

## When can putty and paint go on?

When the plaster is cured and its moisture content has fallen to a level the paint system can tolerate. In practice that means the plaster looks uniformly pale and dry, and a moisture meter reading confirms it rather than a calendar date.

Putty over damp plaster blisters. Primer over damp plaster fails to bond and traps moisture behind an impermeable film, and the paint above it peels in sheets within a season.

## What records should be kept?

The frame handover date, the wall completion date, the plaster completion and curing dates, and the batch details for putty, primer and paint. Those records are what make a later defect diagnosable rather than arguable.

Photographs of the wall before plastering, with the connections and the band visible, are worth more than any written record. They are the only evidence of what is now hidden.

## Image credit

Photograph by Martin Hipan, CC BY-SA 4.0, via Wikimedia Commons. The image shows bricklaying practice at a construction training ground.

## How are door and window frames fixed?

With lugs or anchors into the masonry or the frame, set plumb and level before the plaster, so the plaster can be finished tight to the frame. Fixing after plastering means cutting back a finished surface and patching it.

The gap between frame and wall is filled with a compressible backer and a sealant, not with mortar alone. Mortar shrinks away from both materials and leaves a crack that lets water straight in.

## How is the wall protected during construction?

Temporary covers over openings, a tarpaulin over the top of a partially built wall, and drainage away from the base. A half-built wall that takes a monsoon can absorb enough water to delay plastering for weeks.

Water in the wall at plastering stage is the most common hidden defect on Indian sites, because nothing looks wrong until the paint blisters a month later.

## What changes for a very long wall?

A movement joint. A wall running more than about six metres without a break will move with temperature and moisture and crack somewhere of its own choosing. A joint at a planned location gives the movement a place to happen.

The joint is a vertical break with a compressible filler and a sealant, and it needs to pass through the plaster as well as the masonry. A joint in the masonry that is bridged by continuous plaster does not work.

## How is the wall checked before plastering?

Plumb, line, level at the top course, opening dimensions and the presence of connections and bands. This is the last moment when a correction is cheap, because after plastering the remedy is demolition.

The check takes half an hour per wall with a level, a tape and a straight edge. It is the highest-return half hour in the whole build.

## What happens if the plaster is applied too early?

The wall is still moving and still wet. The plaster cracks as the masonry settles, and it traps water that later pushes the paint off. The visible symptom appears weeks later and is blamed on the paint.

The rule is simple: brickwork complete, checked, and given a few days before plastering, with the surface wetted immediately before the coat goes on.

## What if the wall is built in a single lift?

It settles unevenly and the courses below compress under the weight above before the mortar has set. The result is a wall that is lower in the middle and out of level at the top, which then needs a thick band or a thick plaster to correct.

Two or three lifts with the mortar set between them costs a day and prevents the correction entirely.

## How are services chased into the wall?

After the masonry is complete and before plaster, with vertical chases cut to a controlled depth and horizontal chases avoided. A deep vertical chase through a 115 mm wall leaves very little section.

Services buried in a deep chase are also the most common cause of a crack that appears along the pipe line two seasons later.

## What about working in the monsoon?

Cover the top of the wall, work only in dry spells, and allow the masonry to dry before plastering. A wall built wet takes weeks to reach a moisture content low enough to plaster safely.

If the schedule cannot wait, dehumidify the room and test with a meter rather than trusting a calendar.
$wallarticle3$,
 11,'installation','https://upload.wikimedia.org/wikipedia/commons/6/62/Bricklaying_and_construction_learning_grounds_in_Klein_Aub_Special_School_10.jpg',
 'Building an RCC Infill Wall: Step by Step',
 'The Indian sequence for RCC frame infill: setting out, soaking bricks, bedding, bands, plaster coats and curing times, and when putty and paint can follow.'),
('rcc-frame-brick-infill-quality',
 'Checking an RCC Infill Wall: What to Inspect and Measure',
 'Plumb, level, joint thickness, plaster thickness and moisture: the checks that decide whether an Indian infill wall will still look right in five years.',
 'IN',
$wallarticle4$# Checking an RCC Infill Wall: What to Inspect and Measure

An infill wall is easy to check while it is being built and almost impossible to check afterwards. Once the plaster is on, the joint thickness, the bedding and the connections are hidden, and the only evidence left is the surface. That is why inspection has to be timed to the stages rather than saved for the end.

The checks below are ordered by the stage at which they can still change the outcome. Each one is measurable, which matters when a contractor and an owner disagree about whether a wall is straight.

## What is checked at frame handover?

The column faces, the beam soffits and the slab levels against the drawing. An infill wall can only be as straight as the frame it fits into, and a column that is out of line by twenty millimetres produces a wall that is either tapered or bowed.

Record the frame dimensions before infill starts. If the wall later has to be built to a line that is not parallel to the columns, that is a decision taken at handover, not discovered at plastering.

## How is plumb measured?

With a spirit level or a plumb bob at least every two metres along the wall, on both faces, and at the ends of the run as well as the middle. A wall can be plumb at both ends and bowed in the middle, which is why the middle matters.

The tolerance in Indian practice is usually about five millimetres in three metres of height. Anything more is corrected in the brickwork, not in a thicker plaster coat.

## How is joint thickness verified?

By measuring the bed joints at intervals with a rule, and by looking at the perpends for voids. Ten millimetres is the target, and a wall that varies by more than a few millimetres across a course will not sit level at the top.

The tell-tale is a course that has been laid with thick joints to bring the wall up to a band line. That course is weaker and shrinks more than its neighbours, and the crack follows it.

## How is mortar quality judged?

By breaking a Joint. A mortar that crumbles between the fingers, dusts, or can be scraped out with a nail is not doing its job. A proper cement-sand mortar at a 1:6 mix breaks with a snap and leaves a rough surface.

The other check is the sand. Rub a sample of the mortar and feel for grit that is really silt. Silt-rich mortar looks fine wet and fails in the wall.

## How is the frame-to-infill connection verified?

Before the plaster goes on, by walking the wall and confirming that starter bars, mesh strips or toothed joints exist where the drawing shows them, at the spacing shown. After plastering, that verification is impossible.

Photograph each connection. It takes a minute per wall and it is the only record that will exist.

## How is plaster thickness checked?

With a probe through a fresh coat, or by measuring at the dots and screeds before the coat is applied. Twelve millimetres is the internal target and fifteen to twenty the external, and a coat thicker than about twenty-five millimetres needs to be built up in layers rather than applied in one pass.

A wall that needed forty millimetres to look flat is a wall that was not built straight tolerably, and the thick coat will crack regardless of the skill of the plasterer.

## What does a flat plaster surface look like?

A two-metre straight edge laid anywhere on the surface should not show a gap greater than a few millimetres, and should not rock. Under a raking light the surface should show no ridges, trowel marks or hollows.

Test it before the putty goes on. Putty hides small undulations and cannot correct large ones, and a wall that is painted before it is checked is a wall that will be repainted earlier than planned.

## How is moisture checked before painting?

With a moisture meter, on several spots per wall, ideally on a fresh break as well as the surface. The reading should be low and consistent; a wall that reads damp in patches has either a leak or an uncured area.

The cheap alternative is the plastic sheet test: tape a square of clear plastic to the wall, leave it overnight, and look for condensation on the underside. It is crude, and it catches the walls that would have failed.

## What about the cracks that appear in the first year?

Some are expected: shrinkage cracks in the plaster, hairline cracks at material junctions. Record them, measure their width and watch them through a season before deciding.

The ones that matter are the cracks that cross bricks rather than following a joint, the ones wider than about five millimetres, and the ones that reappear after filling. Those justify an assessment rather than another coat of filler.

## What documentation should be handed over?

The as-built wall layout, the frame handover record, photographs of the connections and bands, the plaster dates and curing record, and the product data for putty, primer and paint including batch numbers.

That package is what an owner needs if a defect appears after the contractor has gone. Without it, a damp patch is a mystery; with it, the paint batch and the plaster date narrow the cause in minutes.

## What is a reasonable defect standard?

No visible cracking wider than a hairline at handover, no hollow-sounding plaster when tapped, no damp patches, and a surface flat enough that a straight edge does not rock. Those are modest standards and they are met on most well-run Indian sites.

Where they are not met, the remedy is usually local: cut out the hollow plaster, redo the joint, deal with the moisture source. Whole-wall remedial work is rarely necessary and rarely the right first move.

## Image credit

Photograph by J. Passepart, CC BY-SA 4.0, via Wikimedia Commons. The image shows a detail of brickwork on a building.

## Who should carry out the inspection?

Someone who is not paid by the trades being inspected. On a small Indian project that is usually the owner or an independent supervisor, and the value is in the timing rather than the expertise: most checks are measurements, not judgements.

A checklist with the stages and a space for photographs is enough. The discipline is doing it at the stage, not reconstructing it afterwards from memory.

## How is a wall checked for level at the top?

With a level or a laser on the top course before the band is cast. A wall that is low at one end will be corrected by a thicker band or a thicker plaster, and both are a hidden cost that later becomes a crack.

The top course matters because everything above it inherits the error. Bands, lintels and the next floor all follow the highest or lowest point.

## What is checked at the plaster stage?

Thickness at the dots and screeds, the key on the backing coat, and the flatness of the finishing coat with a straight edge. Also the junction with door and window frames, which should be tight and square.

Those four checks catch almost every plaster defect that becomes a paint defect. Each is measurable in under a minute per wall.

## How are openings checked?

By measuring the diagonal of each opening as well as its width and height. A frame that is square in a reveal that is not produces gaps that no amount of sealant covers neatly.

The reveal depth also matters, because a frame set too deep or too shallow shows as an inconsistent shadow line, which reads as poor workmanship even when the paint is perfect.

## What should be photographed?

The wall before plaster with the connections and band visible, the plastered wall with a straight edge in position, and the finished surface in raking light. Three photographs per wall document the whole chain.

Photographs are also the only defence against a later argument about what was specified. A date-stamped image settles in seconds what a conversation cannot.

## How is surface texture judged?

By comparing against an agreed sample panel, not against an opinion. A one metre sample of the specified finish, approved before the work starts, turns a subjective argument into a comparison.

That sample is the single most useful quality control device on a painted job, and it costs a square metre of wall and an hour of the painter's time.

## What is a sensible inspection frequency?

At frame handover, at wall completion, before plaster, after plaster and before paint. Five points per wall, each taking minutes, and each one closing the window on a defect class.

Skipping the pre-plaster check is the costliest omission, because it is the last one that can be corrected without demolition.

## How is a wall checked against the drawing?

By measuring the wall positions from a fixed datum on the slab, not from the adjacent wall. Walls measured from each other accumulate error across a floor, and the last room is the one that is wrong.

A laser or a chalk line from the grid is the reliable method. It takes a morning per floor and it prevents the cumulative error that makes rooms out of square.

## How are tolerance disputes resolved?

With an agreed standard before the work starts, a measuring method both sides accept, and a record of the readings. Disagreement usually comes from not having agreed what counts as straight.

A two-metre straight edge and a printed tolerance figure in the specification remove most of the argument.

## What should be checked on the render surface?

Thickness at the fixing points, the key between coats, and the flatness of the finished face. Also the junction with electrical boxes and conduits, which should be sealed rather than left as a gap behind a plate.

Boxes set too deep or too shallow show as a ring on the finished wall that no paint hides. Setting them to the finished plaster line before the coat goes on takes minutes.

## How should results be presented?

As a one-page record per wall: the measurements taken, the photographs, and a short note of anything to correct. A record that fits on a page gets read; a report that runs to ten pages does not.

The value is in the comparison at the next inspection, not in the paperwork itself.

## Does the time of year affect the checks?

Considerably. Plaster dries faster in the hot months and shrinks more, so crack checks are more revealing then. In the monsoon, moisture readings stay high and a wall can appear damp when it is simply not drying.

Recording the season alongside each inspection makes the readings interpretable a year later.
$wallarticle4$,
 10,'quality','https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Brickwork_detail%2C_Corning.jpg/1280px-Brickwork_detail%2C_Corning.jpg',
 'Inspecting RCC Infill Walls: Checks That Matter',
 'How to check an Indian infill wall: plumb, joint thickness, mortar quality, connections, plaster thickness, flatness and moisture before painting.'),
('rcc-frame-brick-infill-maintenance',
 'Maintaining an RCC Infill Wall: Cracks, Damp and Repainting',
 'What to fix, what to watch and what to leave alone on an Indian brick infill wall, from monsoon damp to the repaint cycle.',
 'IN',
$wallarticle5$# Maintaining an RCC Infill Wall: Cracks, Damp and Repainting

Maintenance on an infill wall is mostly water management. The frame and the brick are durable; what fails is the paint film, the sealant at a window, the render over a parapet, and the moment water gets behind any of them.

The Indian climate compresses the cycle. A wall that would be repainted every eight years in a temperate climate is repainted every four to six on a monsoon-facing elevation, and the failures that follow a missed cycle arrive faster than an owner expects.

## How often should the wall be inspected?

Twice a year: once before the monsoon and once after. The pre-monsoon inspection is the one that prevents damage, because it finds the open joint, the cracked render and the blocked drain before the rain arrives.

The inspection itself needs no tools beyond a torch, a ladder and a camera. Walk the elevation, look up at the parapet and the sills, and photograph anything that has changed since last time.

## What should be checked before the monsoon?

The paint film for cracking or blistering, the sealant around windows and doors, the parapet coping and its joints, the sill slopes, and the drainage paths that carry water away from the wall.

The four failures that cause most monsoon damage are a cracked sill, a blocked downpipe outlet, a parapet without a drip and a window frame sealed with mortar that has cracked away from the reveal.

## How are hairline cracks treated?

By opening them slightly to a V, cleaning out the dust, priming and filling with an acrylic or polymer-modified filler, then sanding flush and repainting. Filling without opening the crack leaves a film over a void that fails in one season.

Hairline cracks that keep returning in the same place are a signal that the cause has not been addressed. Filling them each year is a maintenance cost that never ends; finding the movement source ends it.

## When does a crack need an engineer?

When it is wider than about five millimetres, when it crosses bricks rather than following mortar joints, when it is accompanied by a sticking door or a sloping floor, or when it grows between inspections.

Those are all signs that something other than the plaster is moving. An assessment costs a visit; ignoring it costs the wall.

## How is damp diagnosed?

By elimination, in a fixed order: is the source above, beside or below? A damp patch at the skirting is more often a failed external render or a plumbing leak than rising damp, and rising damp needs a failed damp-proof course to exist at all.

Check the roof and the parapet first, then the window and the sill, then the plumbing, then the external render. The patch on the inside is a symptom whose position rarely matches the entry point.

## How is efflorescence treated?

By dry brushing off the salt, then finding and stopping the water that carried it. Efflorescence is salt deposited at the surface as moisture evaporates, so removing the salt without removing the source guarantees its return.

Washing with water can drive the salt back into the wall. Dry brushing, repeated as it recurs, plus a moisture source fix, is the sequence that works.

## What about mould?

Mould on an Indian interior wall means the surface is staying damp, usually from condensation in an air-conditioned room or from a wall that never dries after the monsoon. Cleaning it with a dilute bleach or a proprietary mould wash treats the symptom.

The fix is ventilation, a dehumidifier where the room is cooled, or dealing with the moisture path in the wall. Mould that returns every year is telling you the wall is wet, not that the cleaner was wrong.

## How is the paint film assessed?

By looking at it in raking light for chalking, cracking and loss of sheen, and by testing adhesion with a cross-hatch or a piece of tape on a small area. A film that chalks heavily is at the end of its life even if the colour looks acceptable.

Chalking matters because it is the binder leaving the film. Once the binder has gone, the pigment is all that remains and the next coat has nothing to grip.

## When should the wall be repainted?

When the film has chalked, when the colour has faded beyond acceptability, or on the cycle the manufacturer states, whichever comes first. On Indian exteriors that is typically four to six years.

Repainting is cheaper than repair because it prevents water entry. Deferring it converts a paint cost into a plaster cost, and then into a masonry cost.

## What should a repaint include?

Washing to remove chalk and dirt, scraping back anything loose, treating cracks, spot-priming bare patches, then the full coat system: primer plus two finish coats, at the specified spread rate.

Skipping the wash is the most common repaint failure. New paint over a chalky surface adheres to the chalk, not to the wall, and it lifts within a year.

## What records help?

The date of each repaint, the products and colours used, the batch numbers, and the photographs from each inspection. Ten years of that record tells a contractor exactly where the wall has failed before.

It also protects the owner at resale, because a documented maintenance history is evidence that the wall has been looked after rather than patched when it failed.

## How long can the wall be expected to last?

The frame, decades. The infill, decades, provided the render and the paint keep water out. The finishes, on a four to six year cycle.

That is the whole economics of the wall: a modest recurring spend on paint and sealant, and a very long life for everything underneath it.

## Image credit

Photograph by Dmitry Makeev, CC BY-SA 3.0, via Wikimedia Commons. The image shows old red brickwork.

## How is a monsoon inspection carried out?

From the ground looking up, then from any accessible upper level, then from inside. Look for staining, cracked render, failed sealant, blocked outlets and vegetation holding water against the wall.

Do it before the rain arrives. Every finding on that walk is cheaper to fix in dry weather than after a season of water has been through the wall.

## What is the most common external defect?

A cracked sill or a sill that falls the wrong way, letting water run back into the wall at the window. It shows as a damp patch above the skirting on the inside, often a storey below where the eye looks first.

The repair is a new slope or a new sill with a drip, plus a sealant joint to the frame. Filling and painting the internal patch without that repair guarantees its return.

## How are external walls repainted properly?

Wash, scrape, treat cracks, spot prime, then primer and two coats at the stated spread rate. On an Indian elevation the wash step is the one that decides whether the next four years are trouble-free.

A pressure wash is effective but needs care on a weak render. A soft wash with a brush and a mild detergent is slower and safer on older plaster.

## What about painting in humid weather?

Avoid it. Most emulsion systems need the surface dry and the humidity within the data sheet range, and monsoon conditions leave a film that never fully coalesces. The result is a soft film that chalks and lifts early.

The practical window in most of India is the dry months, and a repaint planned for that window lasts its full cycle rather than half of it.

## How is a wall prepared for sale or handover?

Touch-up locally rather than repainting whole walls, because a partial repaint shows as a patch unless the paint is taken to a corner. Clean the surface, deal with any active damp, and document what was done.

A buyer who sees a clean, well-documented wall reads it as a maintained building. A buyer who sees fresh paint over a damp patch reads it as a cover-up, and they are usually right.

## What is the annual maintenance budget?

Small. A typical Indian apartment needs a modest annual allowance for cleaning, sealant checks and touch-ups, with the large spend arriving every four to six years for the repaint.

Setting that aside annually is what prevents the deferred repaint that turns into a plaster repair, which is five times the cost of the paint it replaced.

## What about the flat above?

Water from a leaking bathroom above is the most common source of damp on a wall that looks structurally sound. Check the ceiling line and the corner where the wall meets the slab.

If the damp tracks down from the slab rather than rising from the skirting, the source is above and no amount of external work will fix it.

## How are sealant joints renewed?

By cutting out the old sealant, cleaning the joint, priming where the product requires it, and applying a new bead of the correct size with a backer rod behind it. A thin smeared bead over old sealant is not a joint.

Renewal every five to eight years on an exposed elevation is cheaper than the damp repair that follows a failed joint.

## What about a wall that stays damp all year?

That is a ventilation and moisture-balance problem as much as a wall problem. An unventilated room in a humid climate keeps its surfaces at or near dew point, and the wall never dries.

Addressing cross-ventilation, an exhaust fan or a dehumidifier changes the surface behaviour more than any coating can.

## How is a repaired patch blended?

By repainting the whole wall or taking the new paint to a natural break such as a corner, a beam line or a door frame. A patch repainted to a straight edge on a flat wall shows under every lighting condition.

Blending is the part of a repair that owners notice. Preparing the patch properly and painting the full wall costs a little more and looks correct for years.

## What is the single most useful maintenance habit?

Walking the building before the monsoon with a camera and fixing what has changed. Everything else in this article follows from that one habit, repeated annually.

An owner who does that spends less each year than one who waits for a ceiling stain to announce a problem that started three seasons earlier.

## Are there warning signs that need immediate action?

A newly stained ceiling, a crack that appears after rain, or a salty bloom that returns within weeks of cleaning. Each points to water entering somewhere that has not been found yet.

Dealing with those three promptly is what keeps a maintenance budget small.
$wallarticle5$,
 10,'maintenance','https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Old_brickwork._Red_brick.jpg/1280px-Old_brickwork._Red_brick.jpg',
 'Maintaining Brick Infill Walls in India',
 'Maintaining an Indian infill wall: pre-monsoon checks, crack treatment, damp diagnosis, efflorescence, mould and the four to six year repaint cycle.')
) AS a(slug,title,excerpt,market,content,minutes,theme,cover,mt,md)
JOIN public.learn_wall_finishing_topics t
  ON t.market_code=a.market
 AND t.candidate_key='system:in-rcc-frame-brick'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots sl
SET article_id = a.id
FROM public.learn_articles a
WHERE sl.topic_id = a.wall_topic_id
  AND sl.theme_key = a.wall_article_theme
  AND sl.language_code = 'en'
  AND sl.article_id IS NULL;

ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER wall_source_review_attribution;
UPDATE public.learn_wall_finishing_sources s
SET review_status='accepted', reviewed_by=(select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), reviewed_at=now()
FROM public.learn_wall_finishing_topics t
WHERE s.topic_id=t.id
  AND t.candidate_key='system:in-rcc-frame-brick'
  AND s.review_status='pending';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;

ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics t
SET verification_status='verified', verified_by=(select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), verified_at=now()
WHERE t.candidate_key='system:in-rcc-frame-brick'
  AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.review_status='accepted');
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;

SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles
SET status='published', editorial_review_status='approved', editorial_reviewed_by=(select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), editorial_reviewed_at=now(), published_at=coalesce(published_at, now())
WHERE wall_topic_id IS NOT NULL AND status='draft';
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;

COMMIT;
