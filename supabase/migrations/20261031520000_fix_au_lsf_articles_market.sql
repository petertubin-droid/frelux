BEGIN;

ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER USER;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;

BEGIN;

INSERT INTO public.learn_wall_finishing_sources (topic_id, title, publisher, url, claim_scope, review_status)
SELECT t.id, s.title, s.publisher, s.url, s.claim_scope, 'accepted'
FROM public.learn_wall_finishing_topics t
JOIN (VALUES
 ('system:au-light-steel-frame','National Construction Code, Volume Two','Australian Building Codes Board','https://www.abcb.gov.au/','Housing provisions for wall framing, linings and fire performance'),
 ('system:au-light-steel-frame','Light gauge steel framing for residential construction','Australian Steel Institute','https://www.steel.org.au/','Cold-formed steel framing members, bracing and durability'),
 ('system:au-light-steel-frame','Plasterboard fixing and jointing systems','Gyprock (CSR)','https://www.gyprock.com.au/','Sheet fixing centres, compounds and levels of finish'),
 ('system:au-light-steel-frame','Steel framing in bushfire and termite areas','Australian Building Codes Board','https://www.abcb.gov.au/','Non-combustible framing and termite risk management'),
 ('system:au-double-brick','Masonry structures and cavity construction','Think Brick Australia','https://www.thinkbrick.com.au/','Brick properties, mortar, ties and cavity detailing'),
 ('system:au-double-brick','National Construction Code, Volume Two','Australian Building Codes Board','https://www.abcb.gov.au/','Weatherproofing, articulation and masonry provisions'),
 ('system:au-double-brick','Internal linings over masonry','Gyprock (CSR)','https://www.gyprock.com.au/','Battens, furring and plasterboard over masonry walls'),
 ('system:au-double-brick','Exposure and durability of clay masonry','Think Brick Australia','https://www.thinkbrick.com.au/','Salt attack, efflorescence and exposure grading')
) AS s(topic_key, title, publisher, url, claim_scope) ON s.topic_key = t.candidate_key
WHERE NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources x WHERE x.topic_id = t.id AND x.url = s.url AND x.title = s.title);

INSERT INTO public.learn_articles (title, slug, excerpt, content, category_slug, status, cover_image_url, read_time_minutes, meta_title, meta_description, wall_market_code, wall_topic_id, wall_article_theme, wall_language_code)
SELECT a.title, a.slug, a.excerpt, a.content, 'surface-preparation', 'draft', a.cover_url, a.read_time_minutes, a.meta_title, a.meta_description, a.market, t.id, a.theme, 'en'
FROM (VALUES
(
 'au-light-steel-frame-overview',
 'Light Steel Frame with Plasterboard: How Australian Walls Work',
 'A light steel frame carries the load, the plasterboard provides the finish, and the jointing level decides whether anyone can see the difference. This is how the dominant Australian internal wall is put together.',
 'AU',
 $wallarticle11$
# Light Steel Frame with Plasterboard: How Australian Walls Work

A light steel frame with plasterboard is the default internal wall in most new Australian housing. Cold-formed steel studs at 600 mm centres carry the lining, the plasterboard is screwed and glued to those studs, the joints are taped and sanded to a defined level of finish, and the result is painted. The frame is straight, termite-resistant, non-combustible and quick to erect, which is why it has taken over from timber in much of the country.

The system is simple to describe and demanding to execute. Almost everything that goes wrong later, the visible joint line, the screw pop, the crack above a doorway, traces back to a decision made before the first sheet went on: whether the frame was straight, whether the bracing was installed, whether the sheet was stored flat and dry, and whether the jointing was built up in the right number of coats for the finish level the job actually needed.

## What does a light steel frame actually consist of?

A wall frame is a set of vertical studs sitting inside a top track and a bottom track. The studs are cold-formed steel sections, commonly C-shaped, with the tracks being simpler U-sections that hold the studs at top and bottom. Thickness is described as base metal thickness, and residential walls typically use members in the range of 0.55 mm to 1.15 mm depending on the loads, the height of the wall and whether the frame is also acting as bracing.

The frame is not just a carrier for plasterboard. It resists wind pressure on the building envelope, it transfers load from above, and in most houses it also provides the lateral bracing that keeps the structure square under wind and earthquake action. Bracing is achieved with strap or angle cross-bracing, or with a sheet product fixed to the frame in a defined pattern, and it must not be cut away later by a plumber or an electrician who wants a clear run for a pipe.

## Why has steel replaced timber in so much Australian housing?

Three reasons, in order of importance to the people paying.

First, termites. A steel frame cannot be eaten, so the frame drops out of the termite management problem entirely, which simplifies the compliance story in high-risk areas. Second, straightness. A cold-formed stud arrives straight and stays straight if it is stored properly, which means the finished wall is flatter and the jointing is easier to bring to a high level of finish.

Third, speed and predictability. Frames can be assembled on site or delivered pre-fabricated, they do not need to be checked for moisture content before lining, and they do not shrink. A timber frame that dries after lining will move and crack the joints above it. A steel frame will not, though it will move thermally and it will corrode if it stays wet.

## Does a steel frame need different plasterboard?

No, the board is the same family of gypsum plasterboard used over timber. What changes is the fixing detail. Steel studs are thin, so screws must be self-drilling and must be driven to dimple the paper without tearing it. Screws are placed at closer centres than on timber because the steel flange is narrow and the board needs support along its edge.

Board thickness is chosen for the service condition rather than the frame. Ten millimetre board is common on walls and ceilings in ordinary domestic situations, thirteen millimetre where the wall is required to provide fire resistance or where a higher impact resistance is wanted, and moisture-resistant board in wet areas. The board is fixed with the long edge across the studs, joints staggered between courses, and the sheet laid so that the tapered edge, where there is one, forms the recess that the jointing compound fills.

## What does the jointing level mean in practice?

The level of finish defines how flat and how free of visible joint evidence the wall must be, and it is agreed before the jointing starts. A level suitable for a ceiling painted with a flat finish under diffuse light is not the same as a level suitable for a wall where a critical light will rake across it and show every ridge.

Getting to the higher levels costs real money, because it means wider jointing coats, more sanding and often a skim. The mistake owners make is to accept a price for a standard level and then complain about joint shadowing under a wall washer. The jointing level is a specification item, not a matter of opinion afterwards.

## Where does a steel-framed wall fail first?

Four places, and all four are predictable.

Screw pops appear where screws were driven too deep or too shallow, or where the frame has moved. Cracks appear at the corners of openings and at board joints where the frame was not straight or the sheet was forced into place. Corrosion appears at the bottom track where water has sat, typically because the slab was wet, the frame was left exposed, or a leak was never fixed. And joint shadowing appears wherever the jointing was under-built for the finish level that was specified.

None of these is a fault of steel as a material. Each is a fault of a decision, and each is visible in the first year if anyone looks.

## What should an owner check before the lining goes on?

Three things, all cheap to check and expensive to fix later.

The frame should be straight and plumb, with studs at the specified centres and noggins where the specification calls for them. The bracing should be complete and uncut, and it should be possible for the builder to show where it is. And the frame should be dry, with no water sitting in the bottom track, because a steel member that has been holding water will start to corrode from the inside where nobody can see it.

Photograph the frame before lining. The photographs are the only record of what is behind the wall, and they are what a future repair, a future renovation or a future dispute will rely on.

## Does the frame need to be earthed or bonded?

An electrical question with a construction consequence: a steel frame is a conductive body and must be treated as such by the electrical installation. The wiring rules require the frame to be bonded where it is accessible to touch and where the installation calls for it, and the bonding conductor is installed by the electrician, not the plasterer.

The practical point for a builder is coordination. The bond must be made to the frame before the lining closes the wall, because afterwards it means cutting a hole. Mark it on the frame inspection and photograph it, along with the bracing.

## How does the wall handle a bathroom or a laundry?

With moisture-resistant board in the wet area, a water-resistant substrate behind tiling, and a vapour strategy that keeps moisture out of the frame cavity. Steel does not feed mould, but a steel stud that stands wet will corrode, and corrosion at the bottom track of a shower wall is a common and expensive failure in buildings where the waterproofing was detailed badly.

The safe pattern is the one the standards describe: continuous waterproofing turned up the wall, a substrate appropriate to the tile weight, and no penetrations that rely on sealant alone. The board is the visible layer, not the waterproofing.

## What about acoustic performance?

A steel-framed wall can be a good acoustic separator or a poor one, and the difference is in the details rather than the studs. Mass in the board, insulation in the cavity, a resilient mounting detail, and complete sealing at the perimeter all contribute. A wall that is acoustically specified but not sealed at the top track will leak sound through the gap.

Where a wall separates dwellings, or a bathroom from a bedroom, acoustic performance is a compliance item and the detail should come from the specification, not from what the plasterer happens to have on the truck.

## How long does a steel-framed wall last?

Indefinitely, in the ordinary sense, provided it stays dry. Steel framing in a protected internal environment does not degrade. The lining is the wearing surface: plasterboard is a mineral product that will soften if it stays wet, will crush if it is hit hard, and will need patching during the life of the building.

The repaint cycle becomes the maintenance clock. Internal walls in a rental property might be repainted every five to seven years, an owner-occupied house perhaps every ten. Each repaint is an opportunity to inspect for cracks, screw pops and moisture damage, and it is cheaper to deal with those at repaint than to discover them when a wall is being replaced.

## What does the system cost and who does the work?

In the Australian market the frame is erected by a frame and truss supplier or a framing crew, the plasterboard is fixed and jointed by a lining contractor, and the painting is a separate trade. Costs are quoted per square metre of wall area for lining, and the level of finish changes the rate.

The trades are licensed or registered differently by state, and the compliance certificate for the lining usually sits with the builder rather than the subcontractor. For an owner, the useful question is not the rate but what level of finish the rate includes, and whether the bracing and bond have been photographed before the wall was closed.

## What is fixed and what is negotiated?

Fixed by physics and by the code: the frame must be straight enough to line, the bracing must be complete, the wet areas must be waterproofed, and the lining must achieve the specified fire and acoustic performance.

Negotiated: the level of finish, the sheet size, the cornice profile and the paint sheen. These are the items where an owner can spend money usefully, and where a cheap default will be visible every day for the life of the building.

## What this topic covers next

The next articles take the system apart in the order it is built. Materials covers the members, boards and compounds. Installation follows the frame, the lining and the jointing. Quality sets out what to inspect at each stage. Maintenance deals with the repairs and repainting that a steel-framed wall will need over its life.
$wallarticle11$,
 11, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Steel_framed_house_construction_in_Sherwood%2C_Queensland%2C_2023.jpg/1280px-Steel_framed_house_construction_in_Sherwood%2C_Queensland%2C_2023.jpg',
 'Light Steel Frame with Plasterboard: Australian Walls Explained',
 'Light steel frame with plasterboard explained for Australian walls: members, bracing, fixing, jointing levels and where the system fails first.'
),
(
 'au-light-steel-frame-materials',
 'Light Steel Frame Materials: Studs, Tracks, Board and Compound',
 'Every component of an Australian steel-framed wall, from base metal thickness and bracing straps to the compound that fills the joint. What each part does and how it is specified.',
 'AU',
 $wallarticle12$
# Light Steel Frame Materials: Studs, Tracks, Board and Compound

The material list for a light steel frame with plasterboard is short, which is part of why the system is popular, and every item on it has a specification consequence. A stud that is too thin for the wall height will deflect. A board that is the wrong type for a wet area will fail. A compound that is too hard for the jointing sequence will be impossible to sand flat.

An owner or a builder selecting materials is really answering four questions: what the frame must carry, what the lining must resist, what the jointing must achieve, and what the environment will do to all of it over twenty years.

## Which steel members go into a residential wall frame?

Studs and tracks, plus the bracing and the connectors that hold them together. The stud is the vertical member. The track is the horizontal channel at top and bottom that the studs sit into. Both are cold-formed from galvanised steel strip, and both are described by base metal thickness, section depth and flange width.

Depth is chosen for the wall height and the load rather than by habit: a 64 mm stud is common in non-load-bearing partitions, 76 mm and 89 mm in load-bearing walls, and deeper sections where the wall is tall or carries significant load. Base metal thickness separates a member that will perform from one that will oil-can under wind load, and the thinner the steel the more carefully the frame must be braced and handled.

Galvanising is what buys durability. The coating class matters more than most buyers realise, because a wall frame near the coast, or one that gets wet during construction, relies entirely on that coating for its corrosion resistance.

## What holds the frame together and keeps it square?

Bracing, and it is the component most often compromised by later trades. Strap bracing is a galvanised steel strap fixed diagonally across studs in a defined pattern, tensioned and nailed or screwed at each end. Angle bracing does the same job with a light angle section. Sheet bracing uses the lining itself or a structural sheet fixed in a specified pattern.

The bracing design comes from the engineer and it is not interchangeable with whatever is on the truck. A frame that loses one brace to a plumber's pipe run loses stiffness, and the visible consequence is usually a crack at a corner or a door that stops closing squarely.

Noggins, also called blocking or dwangs depending on where in the country the reader is standing, are horizontal members between studs. They stiffen the frame, support board edges where a sheet ends mid-wall, and provide fixing for heavy items. They are cheap during framing and expensive afterwards.

## Which plasterboard thickness and type should be used?

Ten millimetre board for ordinary walls and ceilings, thirteen millimetre where fire resistance, impact resistance or a better acoustic result is specified, and moisture-resistant board in bathrooms, laundries and behind tiles.

Beyond thickness, the board type is a performance choice. Standard board is a gypsum core with paper facings. Moisture-resistant board has a core and facings formulated to resist damp. Fire-rated board has glass fibre and other additives that hold the core together when it is attacked by fire. Impact-resistant board is denser and tougher. Acoustic board is heavier.

The taper matters as much as the type. A recessed tapered edge gives the jointing compound somewhere to sit so the finished joint can be flush. Square-edged board is used where a feature joint is wanted or where the board will be covered, and it cannot be brought to a seamless finish without a skim.

## What fasteners and adhesives are used, and why both?

Screws alone will hold a board. Screws plus a stud adhesive will hold it better and reduce the number of fasteners needed, because the adhesive spreads the load and the screws hold the board until the adhesive sets.

The screw for steel studs is a self-drilling bugle-head screw, sized so it penetrates the steel without stripping. Length is chosen to give the specified penetration through the board and into the steel. Driving depth is the skill: too deep and the screw breaks the paper facing and the board loses its grip, too shallow and the head stands proud and shows through the paint.

Adhesive must be compatible with the board and applied in a continuous or regularly spaced bead to the stud face. On a steel frame, adhesive also reduces the drumming sound of a lightly fixed wall, which is why a wall with adhesive feels more solid than one with screws only.

## What jointing materials are needed?

Compound, tape, and the beads. Jointing compound comes as a setting type, which hardens chemically and is used for the first coats and for filling, and as a drying type, which is used for finishing coats because it sands more easily. Mixing the sequence wrongly is one of the most common causes of a joint that is hard to sand and still visible after painting.

Tape is paper or mesh. Paper tape is stronger and gives a better finish in skilled hands. Mesh tape is more forgiving and is often used with setting compound, but it is more prone to telegraphing if the joint is built up thinly.

Corner beads protect external corners: metal, plastic or paper-faced. A paper-faced bead gives the cleanest painted corner because it tapers into the surrounding board. And a stopping knife set in three widths, plus a pole sander, is the tooling that makes the difference between a flat joint and a ridge.

## What goes behind and inside the wall?

Insulation, vapour control, and services. Insulation batts sit between studs for thermal and acoustic performance, and they must fill the cavity without being compressed. A vapour control layer or a sealed lining strategy keeps moist air out of the cavity, and it is only effective if it is continuous, including behind the bottom track and around penetrations.

Services must be planned before lining. Electrical cable is run through the studs, which means holes in the stud web, and those holes must be within the limits the framing standard allows and should be fitted with grommets where the cable passes through steel. A hole cut in the wrong place in a narrow flange removes the very material that makes the stud work.

## How are quantities calculated and waste controlled?

Board is calculated from wall area plus a waste allowance that depends on the room geometry. A simple rectangular room with full-height sheets wastes little. A room broken by windows, doors and returns can waste fifteen per cent or more, and the estimate should reflect that rather than assuming a flat rate.

Sheet size drives both waste and handling. Longer sheets mean fewer horizontal joints and a better finish, but they need two people and a clear path. The cheapest board is the one that arrives flat, stays dry, and is fixed with the fewest joints, which is a planning outcome rather than a purchasing one.

## How does material choice change near the coast or in a cyclone region?

Corrosion and wind load both increase the specification. Near the coast, higher galvanising classes and stainless or heavily coated fasteners are the norm, and the frame must be protected from salt spray during construction. In cyclone regions the frame is designed for higher pressures, bracing is heavier, fixings are closer, and the lining may need to be fixed to a schedule that stops it coming off under pressure.

The material list changes, and so does the inspection regime. A coastal or cyclonic frame should be inspected before lining and the inspection recorded, because the components that matter most are exactly the ones that are hidden afterwards.

## What should an owner see in a material schedule?

Four items, at minimum: the stud and track sizes with base metal thickness and coating class, the bracing type and fixing pattern, the board type and thickness by location, and the jointing level with the compound system intended to achieve it. Add the insulation and the acoustic or fire rating where they apply.

A schedule that lists only "steel frame and plasterboard" is not a specification. It is a hope, and the difference is only visible once the wall is being painted under a raking light.

## Does the cheapest material list cost less overall?

Rarely. Thin studs deflect and the wall shows it. Cheap compound that sets hard costs extra sanding labour. Board stored on its edge in the weather wicks moisture and has to be replaced. The savings are on the invoice and the cost appears in the labour, the callbacks and the repaint.

The useful comparison is installed cost at the specified finish level, not material cost at the gate.

## What about sustainability and embodied carbon?

Steel framing is recycled and recyclable, with a well-established recovery route in Australia. Gypsum board is recyclable in some metropolitan areas and increasingly manufactured with recycled content. Insulation choice drives the operating energy more than the frame does.

The honest position is that the wall's environmental performance is dominated by what happens over its life: how well it is insulated, how long it lasts, and whether it is repaired rather than replaced.
$wallarticle12$,
 10, 'materials', 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Light_gage_metal_framing.JPG',
 'Light Steel Frame Materials: Studs, Tracks and Board',
 'Light steel frame materials for Australian walls: stud and track sizes, base metal thickness, bracing, plasterboard types and jointing compounds.'
)
) AS a(slug, title, excerpt, market, content, read_time_minutes, theme, cover_url, meta_title, meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code = a.market AND t.candidate_key = CASE WHEN a.slug LIKE 'au-light-steel-frame-%' THEN 'system:au-light-steel-frame' WHEN a.slug LIKE 'au-double-brick-%' THEN 'system:au-double-brick' END
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.learn_articles (title, slug, excerpt, content, category_slug, status, cover_image_url, read_time_minutes, meta_title, meta_description, wall_market_code, wall_topic_id, wall_article_theme, wall_language_code)
SELECT a.title, a.slug, a.excerpt, a.content, 'surface-preparation', 'draft', a.cover_url, a.read_time_minutes, a.meta_title, a.meta_description, a.market, t.id, a.theme, 'en'
FROM (VALUES
(
 'au-light-steel-frame-installation',
 'Installing a Steel Frame and Lining It: The Australian Sequence',
 'Setout, bracing, services, board, jointing, cornice, paint. The order matters more than the speed, and every stage leaves evidence for the next one to hide.',
 'AU',
 $wallarticle13$
# Installing a Steel Frame and Lining It: The Australian Sequence

Installing a light steel frame wall is a sequence of stages that each conceal the last. Once the plasterboard is on, the bracing, the straightness of the studs and the position of the noggins are all invisible. That is why the installation article is really an article about records: what was verified before it was covered.

The physical work is fast. A framing crew can put up the walls of a house in days, and a lining crew can sheet and joint a room in a day. The failures that appear later come from the transitions between those crews rather than from either one working badly.

## What happens before the first stud goes in?

Setout. The wall position is marked on the slab or the floor deck, checked against the drawings, and squared off a known reference. Errors at setout propagate all the way to the skirting and the door reveals, and they are almost impossible to correct later without visible consequences.

At the same time the underlay, the bottom track packing and the damp-proofing detail at the slab edge are considered. A bottom track sitting in water is a future corrosion site, so the slab should be dry, and where a moisture barrier is specified it goes under the track, not around it afterwards.

## How is the frame erected and braced?

Tracks are fixed first, then studs are cut to length and located at the specified centres, then the top track goes on and the assembly is squared. Noggins and trimmers go in for board edges and openings, and the bracing is installed to the engineer's pattern.

Bracing is the item to photograph. Strap bracing must be tensioned properly and fixed at both ends with the specified fasteners. A brace that is loose does nothing. A brace that has been cut to make room for a pipe does nothing either, and both conditions look identical once the wall is lined.

Openings get a trimmer stud each side and a lintel or header above, and the frame around them must be straight, because a bowed head will show as a curved shadow at the top of the door.

## How are services coordinated with the frame?

Before lining. Electrical cable, data, plumbing and any ducting must be run in the cavity, and the holes for them must comply with the framing limits: a hole in the web of a stud, not a notch out of a flange, and no holes clustered in the same place.

Grommets are required where cable passes through steel to protect the sheath from the sharp edge. Cable must also be kept a defined distance from the face of the stud where it might be damaged by a future fixing, or protected by a metal capping plate, because the next person to hang a picture will drill where the plans say there is nothing.

Every one of those decisions is free before lining and expensive afterwards.

## What is the right order for sheeting a wall?

Ceilings first, then walls, then the joints, then the cornice. Sheets are lifted, checked for damage, and cut face-up with a sharp knife and a straight edge. The sheet is offered to the wall with the tapered edge at the joints and the long edge across the studs.

Fixings start at the centre of the sheet and work outwards, so the board is pulled flat rather than stretched. Screws go at the specified centres along studs and marginally closer along sheet edges, and the head is driven to dimple the paper without cutting it.

Sheets are staggered so that four corners never meet at a single point, and the joints are kept away from the corners of openings where stress concentrates.

## How is the jointing built up?

In coats, each wider than the last. The first coat fills the recess and beds the tape. The second covers the tape and starts to spread the joint out. The third, and sometimes a fourth, brings the joint flush and feathers the edges so the transition is imperceptible.

Each coat is allowed to set before the next, and the setting compound is used early while the drying compound is used for the finishing coats. Sanding comes between the later coats and after the last one, with a pole sander and a light held across the wall rather than along it, because light across the surface reveals the ridge that a casually sanded joint leaves behind.

Cornice is fixed after the jointing, with the joint at the wall and ceiling filled and the mitres cut cleanly at internal and external corners.

## How is the wall checked before painting?

With a light. A raking light across the wall shows every ridge, hollow and missed screw. The lining contractor should do this check themselves, because the painter will not fix it and the owner will see it every evening when the sun comes in at the right angle.

Screw heads should be dimpled and filled, not proud and painted over. Cornice lines should be straight and the mitres tight. Around openings the reveal should be square and the board should not be crushed at the corner.

## What sequencing mistakes cause the most callbacks?

Three, in order of frequency.

Services installed after lining, forcing holes in a finished wall. Wet area waterproofing applied over an unsuitable substrate because the board was chosen for cost rather than for the tile load. And painting started before the jointing compound was fully dry, which traps moisture and produces a joint that looks fine for a month and then shows a shadow.

Each is a coordination failure, not a skill failure, and each is prevented by a short conversation at the right moment.

## How long does each stage take?

For a typical house, framing is measured in days, sheeting in days, jointing in days with drying time between coats, and painting after that. The drying time is the part that gets compressed under programme pressure, and it is the part that should not be.

A jointing sequence that is rushed produces a wall that looks complete and fails in the first heating season. The programme should show the drying time as work, not as slack.

## How is the work protected once it is finished?

With sequencing and with temporary protection. Lining is one of the last trades to enter a room, and the wall should not be used as a workbench afterwards. Corner protection during the remaining works saves a repair that will never look invisible.

Where a finished wall must be protected, a temporary board against the surface is better than tape, which can pull the paint or the paper facing when removed.

## What does the owner get at handover?

Photographs of the frame, the bracing and the services before lining, plus the level of finish that was specified and the paint system used. Those three items answer almost every question that will arise in the following decade.

A handover pack with those records is worth more than a folder of brochures. It is the only evidence of what is inside the wall.

## Does a steel-framed wall sound different when it is finished?

Yes, if it is built without adhesive or insulation, and this is a common complaint. A lightly fixed steel stud wall drums when it is knocked, and it transmits sound from the room next door more readily than a heavier assembly.

The remedy is in the build, not the paint: adhesive on the studs, insulation in the cavity, and in acoustic walls a resilient detail at the perimeter. Once the wall is finished, the only cures are surface ones and they are less effective.

## What is the single most useful inspection during installation?

The frame inspection before sheeting, done with a straight edge, a level and a camera. Straight studs, complete bracing, correct noggins, and openings square. Ten minutes at that moment prevents most of what this topic's quality article will describe.

Everything after that inspection is finishing. Everything before it is structure.
$wallarticle13$,
 10, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Steel_framed_house_construction_in_Sherwood%2C_Queensland%2C_2023.11.jpg/1280px-Steel_framed_house_construction_in_Sherwood%2C_Queensland%2C_2023.11.jpg',
 'Installing Steel Frame and Plasterboard: AU Sequence',
 'Installing a light steel frame and plasterboard in Australia: setout, bracing, services, sheeting order, jointing coats and pre-paint checks.'
),
(
 'au-light-steel-frame-quality',
 'Checking a Steel-Framed Wall: Tolerances, Fixings and Finish Level',
 'What to inspect on a light steel frame and plasterboard wall, from stud straightness and bracing to screw depth and the jointing level you actually paid for.',
 'AU',
 $wallarticle14$
# Checking a Steel-Framed Wall: Tolerances, Fixings and Finish Level

Checking a steel-framed wall is a matter of knowing which defects matter, which are cosmetic, and which are invisible until they are expensive. A bowed stud is structural geometry. A proud screw head is cosmetic until the paint telegraphs it. A missing brace is invisible and serious.

The inspection has two windows: before sheeting, when everything is visible, and after painting, when only the consequences are visible. The first window is where quality is decided.

## What tolerance is reasonable for a wall frame?

The frame should be plumb, straight and square within the tolerances the framing standard sets, and those tolerances are tighter than most owners expect and looser than most plasterers would like. A stud that is straight within a few millimetres over its height is acceptable. A stud with a visible bow is not.

The practical test is a straight edge held against the studs and a level held against the face of the wall. For a wall that will be brought to a high level of finish, the frame should be at the good end of the tolerance, because the jointing can only flatten a limited amount before it becomes a skim.

## How are fixings checked?

By looking at the screw heads and by counting. Screws should be at the specified centres along each stud, closer at sheet edges, and set so the head dimples the paper without cutting it. A screw driven too deep has broken the paper and the board is no longer held; it will pop when the building moves.

On steel studs the screw must also have penetrated the steel, which can be checked by trying to withdraw one. A screw that spins freely has not engaged, and a board fixed with spinning screws is held by adhesive alone.

## How is bracing verified?

From the engineer's drawing, against what is actually in the wall, before lining. Each braced panel is identified, the strap or sheet is confirmed, and the end fixings are checked for the specified fasteners and tension.

The trap is partial removal. A brace that has been cut for a pipe and re-fixed with a twisted strap is no longer a brace, and the frame may still stand, which is why the defect is not discovered until a wind event or a crack appears at a corner.

## What does each level of finish actually require?

A basic level is suitable where the wall will be painted with a flat finish and viewed in ordinary light. A mid level, which is where most residential work sits, requires joints filled, taped and coated so that no joint or fastener is visible under normal lighting. A high level requires a surface that will survive critical raking light and gloss or sheen finishes, and it costs significantly more.

The specification should name the level. An inspection then asks one question: does the finished wall show joints or fasteners under the lighting the room will actually have? That is a fair test at any level, and it is the test an owner can apply themselves.

## What defects should be recorded rather than repaired?

All of them. A defect record with photographs, location and description is the basis for a repair agreement, and it distinguishes workmanship defects from movement that happens after handover.

Record screw pops, joint cracks, corner damage, skirting gaps and any damp staining at the bottom track. Damp staining is the one that should never be accepted, because it means water has been in the cavity and the frame may be corroding.

## How are wet areas inspected differently?

Wet areas are inspected for waterproofing continuity rather than finish. The board type must match the location, the waterproofing must be continuous and turned up the wall, penetrations must be sealed with the specified system, and the fall to the waste must be verified before tiling.

The plasterboard in a wet area is a substrate, not a membrane. An inspection that accepts a tidy tiled surface without evidence of the membrane underneath has checked the wrong thing.

## What about acoustic and fire performance?

Both are verified by documentation and by visible detail, not by listening or by looking at the paint. For fire, the board type, the number of layers and the fixing pattern must match the tested system. For acoustics, the assembly must match the specified system, including insulation and perimeter sealing.

Where a wall is a separating wall or a fire-rated wall, the tested system reference should be recorded at handover. A substituted board or a missing layer voids the performance, and nobody can tell afterwards.

## How is the jointing inspected under raking light?

With a bright light held close to the wall and angled across it, at night or with blinds closed, and with the observer standing off to the side. The light reveals ridges at joint edges, hollows where the joint was not filled, missed screw heads and sanding scratches.

This is the test painters rely on and it is the test owners should insist on before the topcoat. Once the topcoat is on, the evidence is buried under paint and the argument becomes about opinion rather than observation.

## Who is responsible for what when a defect appears?

Responsibility follows the trade boundary. The framing contractor owns straightness and bracing. The lining contractor owns fixing and jointing to the specified level. The painter owns surface preparation and coating. The builder owns the coordination and the specification.

Most arguments about wall defects are actually arguments about the specification. If the level of finish was never stated, the lining contractor can defend a joint that shadows under a wall washer, and they are entitled to.

## How is a repair assessed before it is accepted?

By looking at it under the same lighting that revealed the defect, after the repair has been painted, not before. A patch that looks invisible in daylight with the blinds open can show plainly under a raking light at night.

Acceptance criteria should be written into the repair agreement: the defect is closed when it is not visible under the lighting condition that revealed it. That sentence prevents most repeat visits.

## What records make a wall inspectable later?

Four items: the frame photographs with the bracing marked, the level of finish specified, the board type by location, and the paint system used with the sheen. Add the wet area waterproofing certificate where it applies.

With those four, a future owner, insurer or repairer knows what they are dealing with. Without them, every repair starts by cutting a hole to find out.

## Does a certificate of occupancy depend on any of this?

The lining itself is not usually the subject of a separate certificate, but the fire-rated and wet area elements are, and the bracing is part of the structural certification. The practical consequence is that the records supporting those items must exist before the wall is closed.

An owner who asks for the photographs and the certificates at handover is asking for the only durable evidence the work was done as specified.
$wallarticle14$,
 10, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Konstrukcja_SCS_siewierz.jpg/1280px-Konstrukcja_SCS_siewierz.jpg',
 'Checking a Steel-Framed and Lined Wall: What to Inspect',
 'Inspecting a light steel frame and plasterboard wall in Australia: frame tolerances, screw depth, bracing checks and the jointing level you paid for.'
),
(
 'au-light-steel-frame-maintenance',
 'Maintaining a Steel-Framed Wall: Patching, Pops and Coastal Corrosion',
 'Repairs that a lined steel-framed wall actually needs, from screw pops and corner damage to the corrosion risk that only appears where water has been sitting.',
 'AU',
 $wallarticle15$
# Maintaining a Steel-Framed Wall: Patching, Pops and Coastal Corrosion

A steel-framed plasterboard wall needs very little maintenance and what it does need is predictable: patch the damage, fix the screw pops, deal with any water before it reaches the frame, and repaint before the surface fails. The frame itself, if it stayed dry, will outlast the decorations several times over.

The exception is water. Everything expensive about maintaining this wall involves moisture that got where it should not have been, and the first sign is usually a stain rather than a crack.

## How is a hole in plasterboard repaired so it disappears?

By rebuilding the surface in the same way it was built. Small holes are filled with a setting compound, taped if the hole is wider than the taper can bridge, and then coated out in two or three passes with sanding between. Larger holes need a patch of board cut to fit, screwed to a backer or to the studs, and jointed like a new sheet.

The critical step is feathering: the repair compound must extend well beyond the patch so the transition is spread over a wide area. A repair that stops at the edge of the patch will show as a ring under any sheen paint, no matter how carefully it is sanded.

Matching texture matters only where the wall has a texture. Most Australian walls are smooth, which makes the repair easier and the finish unforgiving.

## Why do screws pop and what should be done about them?

Because the board moved and the screw did not, or because the screw was driven too deep and lost its grip in the first place. A pop is a screw head pushing through the paper, usually with a small circular crack around it.

The repair is to drive a new screw alongside, set slightly deeper into the stud, then remove or recess the popped screw and fill over it. Filling without re-fixing simply repeats the failure at the next seasonal movement.

A wall with many pops in one area is telling you something: the frame may be moving, the board may have been forced, or the jointing may have been applied over a damp surface. Investigate before patching the whole wall.

## What causes cracks at door and window corners?

Stress concentration. The corner of an opening is where the wall changes shape, and a framed opening concentrates movement. Cracks there are common, and most are cosmetic.

A hairline crack is filled, taped and refinished. A crack that opens and closes seasonally needs a different approach: a flexible filler, or a taped repair with a wider build-up so the movement is distributed. A crack that keeps returning in the same place, in a fire-rated or bracing wall, needs an engineer rather than a plasterer.

## How does corrosion become an issue in a steel-framed wall?

Through water. A steel stud in a dry internal cavity does not corrode. A stud that has stood in water, or a bottom track that has held water, will corrode from the inside, and the visible signs are staining at the skirting line, a musty smell, or paint blistering low on the wall.

Coastal buildings face an additional pathway: airborne salt that enters the cavity and settles on unprotected steel. The defence is the galvanising class chosen at construction, which is why the material schedule matters years later.

If staining appears at the base of a wall, the sequence is to find the water source first. Repainting over a damp bottom track hides the evidence and lets the corrosion continue.

## How are wet area walls maintained?

By keeping the waterproofing intact. The maintenance tasks are re-sealing movement joints and penetrations with the specified sealant, repairing any cracked tile or grout promptly, and checking that the shower wastes and tap penetrations are sound.

Water that gets behind the tiles reaches the plasterboard substrate, and moisture-resistant board is resistant rather than waterproof. A soft or drummy patch behind a tile is a substrate failure, and the repair is to remove the tile and the board rather than to re-grout.

## What is the repainting cycle and what does it cost?

Internal walls in Australia are typically repainted every seven to ten years, sooner in high-traffic rental properties and later in a well-kept owner-occupied home. The cost is driven by preparation and by the number of coats rather than by paint quality alone.

A repaint is the moment to deal with the accumulated small defects: screw pops, corner damage, hairline cracks. Doing that work at repaint is cheap because the wall is being prepared anyway. Doing it separately is a call-out.

Low-sheen and washable finishes are easier to keep clean in kitchens, hallways and children's rooms, and the sheen level is where an owner gets the most practical value for money.

## How should a damaged corner be repaired?

With a corner bead or a paper-faced bead set into compound, not with filler alone. An external corner takes impact continuously, and a filler-only repair will chip out again within months.

The sequence is to cut back the damaged area to sound board, fix a new bead, coat it out, and sand. The result is stronger than the original if the bead is properly bedded, because the corner now has a mechanical protection rather than just compound.

## What maintenance does the frame itself need?

None, if it stayed dry and the bracing is intact. The frame is not serviceable once lined, which is why the installation records matter: they are the only way to know where the bracing is before a renovation starts cutting.

If a renovation will remove a wall or cut an opening, the bracing layout in the photographs tells the designer what must be replaced. Without them, an engineer has to assume the worst.

## How are ceilings and cornices maintained?

Cornice cracks at the wall-ceiling junction, particularly in trussed roofs where the roof moves. Small cracks are filled with a flexible filler and repainted. Larger separations suggest movement in the roof structure and should be investigated rather than patched repeatedly.

Cornice is also the first place water appears from a roof leak. A stain on a ceiling or a cornice line is a roofing question, not a lining question.

## What should an owner keep as a maintenance record?

A single sheet per property: the date of each repair, what was repaired, the paint used with its sheen and colour code, and any photographs. Add the original frame photographs and the level of finish.

That record turns a guess into a decision. It means the next painter buys the right colour, and the next repairer knows what is behind the board.

## When should a specialist be called?

For water staining at a bottom track, for cracks in a bracing or fire-rated wall, for a soft patch in a wet area, and for any repair larger than a sheet. Those four conditions exceed what a handyman repair can responsibly handle.

Everything else, pops, holes, corner chips, scuffs and repainting, is ordinary maintenance that a competent trade or a careful owner can manage.

## Does a steel frame ever need to be replaced?

Only if it has corroded structurally, which requires prolonged water exposure, or if the building is being reconfigured. In ordinary service, the frame outlives every lining and every paint system applied to it.

That is the quiet advantage of the system. The wall is maintenance-light because the expensive part, the structure, is not the part that wears.
$wallarticle15$,
 10, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/New_steel_framed_house_on_Congleton_Road_-_geograph.org.uk_-_7740724.jpg/1280px-New_steel_framed_house_on_Congleton_Road_-_geograph.org.uk_-_7740724.jpg',
 'Maintaining a Steel-Framed Plasterboard Wall in Australia',
 'Maintaining a steel-framed plasterboard wall: patching holes, fixing screw pops, corner repairs, wet areas and the corrosion risk from trapped water.'
)
) AS a(slug, title, excerpt, market, content, read_time_minutes, theme, cover_url, meta_title, meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code = a.market AND t.candidate_key = 'system:au-light-steel-frame'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots sl
SET article_id = a.id
FROM public.learn_articles a
WHERE sl.topic_id = a.wall_topic_id
  AND sl.theme_key = a.wall_article_theme
  AND sl.language_code = 'en'
  AND sl.article_id IS NULL;
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER USER;
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;

COMMIT;
