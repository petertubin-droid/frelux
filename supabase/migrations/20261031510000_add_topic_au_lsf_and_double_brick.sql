-- Review attribution needs an account that exists in every environment. The
-- owner is the real reviewer in production; a fresh database has no auth users
-- at all, so editorial attribution there goes to this labelled service account
-- instead of failing the foreign key or claiming a human reviewed it.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at,
                        created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('0e000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'editorial-migrations@frelux.invalid', now(), now(), now(),
        '{"provider":"system","purpose":"migration attribution"}'::jsonb,
        '{"display_name":"Editorial migrations"}'::jsonb)
on conflict (id) do nothing;
BEGIN;

ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER USER;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;

INSERT INTO public.learn_wall_finishing_sources (topic_id, title, publisher, url, claim_scope)
SELECT t.id, s.title, s.publisher, s.url, s.claim_scope
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
 'JP',
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

## How does the wall perform under the energy provisions of the code?

The frame itself contributes little to thermal performance; the insulation and the sealing do. A steel stud is a thermal bridge, which is why an insulated steel-framed wall needs a continuous insulating layer or a thermal break rather than batts alone, or the studs will conduct heat past the insulation and the calculated performance will not be delivered.

The practical consequence for a builder is that the insulation must be installed to the design, not to what fits. Compressed batts, gaps at the top and bottom plates, and insulation cut around cables rather than fitted behind them all reduce performance in ways no inspection will catch after lining.
$wallarticle11$,
 11, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Steel_framed_house_construction_in_Sherwood%2C_Queensland%2C_2023.jpg/1280px-Steel_framed_house_construction_in_Sherwood%2C_Queensland%2C_2023.jpg',
 'Light Steel Frame with Plasterboard: Australian Walls Explained',
 'Light steel frame with plasterboard explained for Australian walls: members, bracing, fixing, jointing levels and where the system fails first.'
),
(
 'au-light-steel-frame-materials',
 'Light Steel Frame Materials: Studs, Tracks, Board and Compound',
 'Every component of an Australian steel-framed wall, from base metal thickness and bracing straps to the compound that fills the joint. What each part does and how it is specified.',
 'JP',
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

## How should board and steel be stored and handled on site?

Board flat, dry, and off the ground. A sheet stored on its edge in the weather wicks moisture into the core, softens, and must be discarded; a sheet stored flat but wet will grow mould in the paper facing before it is ever fixed.

Steel members are stored off the ground and under cover where possible, because the galvanising protects the surface but does not protect a member that has been standing in water for a month. Members that have been dragged across a slab lose zinc at the contact points, and that is where corrosion starts.

## What tooling does a competent lining crew bring?

A board lifter, a screw gun with a depth nose, a rotary or hand cutter, a rasp, a straight edge, a pole sander, and knife sets in three widths for the jointing. Plus a light for the final check.

Tooling is a fair proxy for quality. A crew without a board lifter will force sheets into place and crack corners. A crew without a pole sander will sand by hand and leave ridges. Both are visible under a raking light within a month of painting.

## How does a schedule get translated into a purchase order?

Member by member. The engineer's or the supplier's schedule lists studs, tracks, noggins, bracing and connectors by size and length, and the order should match it exactly rather than being rounded to what the merchant stocks. A substituted member changes the wall, even where the difference looks trivial on paper.

The purchase order should also state the coating class and the board type by location, because those are the items a merchant will quietly swap for a cheaper equivalent when stock is short.

## Where do the biggest material losses occur?

At the two ends of the job. Over-ordering leaves board to be damaged and steel to be stored wet, and under-ordering produces a second delivery in a different batch, which shows as a colour variation in the paint and sometimes as a thickness variation in the board.

Ordering the whole job in one batch, with a modest waste allowance and a dry store on site, is cheaper than either extreme.
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
 'JP',
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

## How are walls and ceilings tied together?

By fixing the ceiling sheets first and then the wall sheets up to the ceiling line, with the wall sheet joint kept tight to the ceiling so the cornice can cover it. The cornice is a cover, not a structural connection, and it should never be relied on to close a gap that the sheeting should have closed.

Where the wall is a fire-rated or acoustic separation, the junction is a specified detail and the fixing pattern at the perimeter matters as much as the field of the wall.

## How are openings and reveals sheeted?

With the board cut to the opening and the cut edge protected by a corner bead or by the reveal lining. The sheet should not be forced around a corner; a forced sheet cracks at the armpit of the cut within weeks.

Reveals are lined with board or a proprietary reveal section, and the junction between the reveal and the wall is taped and coated like any other joint. This is where a cheap job is most visible, because every window and door in the building carries the same detail.

## What changes when the wall is fire-rated?

The number of board layers, the board type, the fixing pattern, the joint treatment and the perimeter detail all come from a tested system, and none of them can be substituted without losing the rating. Two layers of thirteen millimetre fire-rated board fixed to a documented pattern is a different wall from one layer of ten millimetre board.

The critical failure is substitution at the merchant: the crew orders what the schedule says, the merchant supplies what is in stock, and the wall stops being the tested system. Check the board stamp against the schedule before it goes on.

## How are penetrations sealed after the lining is on?

With the system the fire or acoustic design calls for: a proprietary collar, mastic or wrap at each service penetration, applied by someone who knows the detail. A hole with foam in it is not a fire seal.

Every penetration is a potential failure in a rated wall, and the record of how many there are and where matters. A services plan marked up after lining is the only durable evidence.

## What should be done if the frame is found out of tolerance after lining?

Very little that is cheap. A hollow can be floated out with compound if it is small, a proud stud can be skimmed over, and a significantly bowed wall can be re-lined with battens or a second layer. None of those is a good outcome, which is why the frame inspection happens before sheeting.

The one thing not to do is to fill a hollow with a thick bed of compound. A thick bed shrinks, cracks and telegraphs, and it fails under a critical light.
$wallarticle13$,
 10, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Steel_framed_house_construction_in_Sherwood%2C_Queensland%2C_2023.11.jpg/1280px-Steel_framed_house_construction_in_Sherwood%2C_Queensland%2C_2023.11.jpg',
 'Installing Steel Frame and Plasterboard: AU Sequence',
 'Installing a light steel frame and plasterboard in Australia: setout, bracing, services, sheeting order, jointing coats and pre-paint checks.'
),
(
 'au-light-steel-frame-quality',
 'Checking a Steel-Framed Wall: Tolerances, Fixings and Finish Level',
 'What to inspect on a light steel frame and plasterboard wall, from stud straightness and bracing to screw depth and the jointing level you actually paid for.',
 'JP',
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

## How is a fire-rated lining verified?

By documentation first: the tested system reference, the board type and thickness, the number of layers, and the fixing schedule. Then by visible checks: the board stamp, the number of layers at a cut edge, and the seals at penetrations.

A rated wall cannot be verified by appearance once painted. If the documentation is missing, the assumption should be that the rating cannot be claimed, which is why the photographs and the schedule belong in the handover pack.

## Can a finish defect be measured rather than argued about?

Yes, with a straight edge and a light. A joint that is proud by two millimetres will show under a raking light; a joint that is within a millimetre will not. The straight edge converts an opinion into a measurement, and the light converts the measurement into the condition the occupant will actually experience.

That combination settles most disputes in a single visit, and it is worth the ten minutes it takes.

## How are ceilings inspected differently from walls?

Under the lighting they will live with, which for a ceiling is usually a light fitting close to the surface. A ceiling with a light fitting at 150 mm will show every joint ridge, every screw and every sanding mark that a wall would hide.

Ceilings are also inspected for deflection: a sag between fixings suggests the sheet was forced, the fixings are too sparse, or the ceiling framing is under-designed. A sag does not correct itself.

## How is a bracing defect proven after the fact?

With the engineer's bracing plan and, if available, the frame photographs. Where neither exists, the only reliable evidence is to open a section of wall and look, which is why records are cheaper than investigations.

A bracing defect is a structural matter, not a finish matter, and it should be escalated rather than patched. The wall may look perfect and still be under-braced.

## What level of finish should a bathroom have?

A higher level than a bedroom, because the light is closer, the surfaces are smaller and the sheen is often higher. Ensuite walls viewed under mirror lights show every ridge, and a standard level of finish that is acceptable in a hallway will look poor there.

Specifying by room rather than by house is the practical approach, and it costs less than re-doing a bathroom.

## How are cornices and junctions inspected?

For straight lines, tight mitres and a consistent shadow line. A cornice that wavers is usually a wall that wavered, and the cornice is the line that reveals it. Mitres on internal and external corners should be cut and filled, not smeared over.

The junction between cornice and wall is also where a crack will appear first if the roof or the frame moves, so it is worth photographing at handover.

## What is a fair response to a defect list?

A written schedule with each item accepted, rejected with a reason, or accepted as a variation to be paid for. The last category matters: an owner who asks for a higher level of finish after the price was agreed is asking for more work.

A defect list that is answered item by item closes the job. A defect list that is answered with a promise reopens it every time it rains.

## How are acoustic separations verified?

By the system reference and by the visible detail at the perimeter, not by listening. The specified board, the insulation, the resilient mounts and the sealed perimeter are all documented items, and any one of them missing changes the result.

A separated wall with an unsealed top track leaks sound at the ceiling line, and no amount of extra board compensates.

## What does a lining certificate cover?

It covers the work as specified: the board type and thickness, the fixing pattern, the jointing level and the fire or acoustic system where one applies. It does not cover what the painter did afterwards.

Keeping the certificate with the photographs gives a future owner a complete picture of what is inside the wall.

## How is a painted defect distinguished from a lining defect?

By looking under the paint. A ridge that follows a joint is a lining defect. A dull patch, a drip or a roller mark is a paint defect. A crack that crosses both is usually movement in the structure.

The distinction matters because the remedy and the responsible trade are different.
$wallarticle14$,
 10, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Konstrukcja_SCS_siewierz.jpg/1280px-Konstrukcja_SCS_siewierz.jpg',
 'Checking a Steel-Framed and Lined Wall: What to Inspect',
 'Inspecting a light steel frame and plasterboard wall in Australia: frame tolerances, screw depth, bracing checks and the jointing level you paid for.'
),
(
 'au-light-steel-frame-maintenance',
 'Maintaining a Steel-Framed Wall: Patching, Pops and Coastal Corrosion',
 'Repairs that a lined steel-framed wall actually needs, from screw pops and corner damage to the corrosion risk that only appears where water has been sitting.',
 'JP',
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

## What maintenance do fire-rated and acoustic walls need?

Continuity. A rated wall is maintained by keeping it complete: no holes left unsealed, no extra layers removed, no penetrations added without a seal. A renovation that cuts a hole for a new downlight and does not reinstate the seal has quietly reduced the performance of the wall.

The maintenance task, therefore, is a rule rather than a schedule: any penetration into a rated wall is sealed to the same system.

## How is a wall repainted to a consistent colour?

By painting a whole wall or a whole room, not by touching in patches, because a patch will show even with the same paint from the same tin once it has dried against older paint. Sheen differences are the usual culprit, followed by the slight colour drift that happens as paint ages.

Where a patch is unavoidable, it should be feathered out widely and the whole surface re-coated if the room is viewed in critical light.

## What should a landlord schedule?

A walk-through between tenancies, with the same checklist each time: screw pops, corner damage, wet area sealant, any staining at the skirting, and the condition of the paint. Repainting is easier to justify when the schedule shows it is due rather than when a tenant complains.

The record also protects the owner in a bond dispute, because it shows the condition at the start of the tenancy.

## When does a wall need relining rather than repairing?

When the board is soft over an area, when there has been a fire or a flood, when the lining has been cut for services in many places, or when a renovation changes the wall's function. At that point patching stops being economic.

Relining is an opportunity to inspect the frame and to photograph it, which is exactly what was missing the first time.

## How is a painted wall cleaned without damaging it?

With a soft cloth and a mild detergent, working from the bottom up so drips are caught, and rinsing with clean water. Abrasive pads remove the sheen and leave a dull patch that shows as surely as a mark.

Sugar soap is the traditional preparation for repainting, not a maintenance cleaner. Using it routinely on a finished wall dulls the film.

## What maintenance do sliding doors and wardrobes demand?

Almost none for the wall, but the track and the jamb take the wear. A wardrobe that has been screwed into the studs rather than into the board can be re-fixed in the same holes if the frame records show where the studs are, which is another argument for keeping them.

Doors that drop and drag are a hardware issue, not a lining issue, but they leave a mark on the wall that will be blamed on the lining.

## What is the right way to fix a picture hook or a shelf into this wall?

With a fixing designed for plasterboard, or by finding a stud. A shelf carrying real weight needs the studs, which is why the frame photographs are useful long after handover.

Hollow-wall fixings are adequate for pictures and light mirrors. They are not adequate for a television bracket, and the damage from a failed one is a large repair in the middle of a finished wall.

## How does a leaking roof reach a wall?

Down the inside of the cavity or through the ceiling, and it usually shows first at the cornice line or as a stain at the top of a wall. By the time the stain appears, the water has been travelling for a while.

The repair is the roof, and the wall repair follows once the source is fixed.
$wallarticle15$,
 10, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/New_steel_framed_house_on_Congleton_Road_-_geograph.org.uk_-_7740724.jpg/1280px-New_steel_framed_house_on_Congleton_Road_-_geograph.org.uk_-_7740724.jpg',
 'Maintaining a Steel-Framed Plasterboard Wall in Australia',
 'Maintaining a steel-framed plasterboard wall: patching holes, fixing screw pops, corner repairs, wet areas and the corrosion risk from trapped water.'
)
) AS a(slug, title, excerpt, market, content, read_time_minutes, theme, cover_url, meta_title, meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code = a.market AND t.candidate_key = 'system:au-light-steel-frame'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.learn_articles (title, slug, excerpt, content, category_slug, status, cover_image_url, read_time_minutes, meta_title, meta_description, wall_market_code, wall_topic_id, wall_article_theme, wall_language_code)
SELECT a.title, a.slug, a.excerpt, a.content, 'surface-preparation', 'draft', a.cover_url, a.read_time_minutes, a.meta_title, a.meta_description, a.market, t.id, a.theme, 'en'
FROM (VALUES
(
 'au-double-brick-overview',
 'Double Brick Walls: How Cavity Masonry Works in Australia',
 'Two leaves of brick, a cavity between them, and ties that hold the pair together. Why double brick performs so well, and where the water actually goes.',
 'AU',
 $wallarticle16$
# Double Brick Walls: How Cavity Masonry Works in Australia

A double brick wall is two leaves of brickwork separated by a cavity, joined by ties, and finished on the inside with plaster, render or a plasterboard lining on battens. It is the traditional wall of much Australian housing, particularly in the southern states, and it remains one of the most durable wall systems available.

The cavity is the whole idea. Water that penetrates the outer leaf runs down its inner face and out through weep holes rather than crossing to the inner leaf. The performance of the wall therefore depends less on the bricks than on the cavity staying clear, the ties staying sound, and the flashings doing their job.

## What is the difference between double brick and brick veneer?

In a double brick wall both leaves are structural masonry, with the inner leaf carrying the floor and roof loads and the outer leaf providing the weather skin, tied to the inner leaf and sharing the stability of the assembly. In a brick veneer wall the timber or steel frame carries the loads and a single leaf of brick hangs on it as cladding.

The practical consequences are thermal mass, acoustic separation and the thickness of the wall. A double brick wall is heavier, slower to build, and better at leveling out temperature swings. It is also harder to alter later, because every opening involves cutting masonry.

## Why does the cavity matter so much?

Because it is the drainage plane. Wind-driven rain will wet the outer face, and some water will penetrate the brickwork itself, particularly at mortar joints, around openings and where the brick is saturated. That water must be given a path down the inside face of the outer leaf and out at the base through weep holes.

If the cavity is blocked by mortar droppings, water ponds on the obstruction and finds its way across. If the weep holes are blocked, the water rises. If the flashing is missing or turned the wrong way, the water runs inward. Almost every damp problem in a double brick wall traces to one of those three.

## How do the two leaves work together structurally?

Through the ties, and through the way the leaves are loaded. The inner leaf carries vertical load. The outer leaf is supported on its own footing or on the same footing, and is held to the inner leaf by wall ties at a specified spacing. Tie spacing is typically around 600 mm horizontally and 450 mm vertically, with closer spacing near openings and edges.

Ties must be of the correct durability for the exposure, and they must slope slightly downward toward the outer leaf so that any water on the tie runs outward rather than inward. A tie laid flat or sloping the wrong way is a small defect with a long consequence.

## Where does movement get accommodated?

In articulation joints. Masonry expands and contracts, and a long wall with no joints will crack where it chooses. Articulation joints are placed at defined intervals and at changes of geometry or height, and they are sealed with a flexible sealant so the joint can move without letting water in.

The joints are the first thing to inspect in an older wall. A degraded sealant is not just a cosmetic issue: it is the entry point for water and the reason a crack appears somewhere else in the wall.

## What does the inside face look like?

Older double brick houses often have the inner leaf plastered directly, with a hard or a soft plaster finish. Newer construction more often uses a plasterboard lining on battens or furring channels fixed to the inner leaf, which provides a cavity for services, improves thermal performance and gives a flatter wall.

Direct plaster on masonry is a durable finish that suits the material. Plasterboard on battens is faster and easier to service, and it is the detail to understand when a wall has to be opened.

## How does the wall handle moisture from inside?

By diffusion and ventilation. A double brick wall is a vapour-open assembly: moisture from inside the house moves through the plaster and the masonry and evaporates from the outer face. That is why sealing the outside with a low-permeability coating can cause problems, and why the inside face should not be sealed with a vapour-closed membrane unless the design accounts for it.

Kitchens and bathrooms need mechanical extraction, and the standard is a rate that actually clears the moisture rather than a fan that merely runs.

## Is double brick good in bushfire areas?

Yes, which is one of the reasons it persists. Masonry is non-combustible, and a double brick wall provides a high level of resistance to radiant heat and ember attack. The weak points move to the openings, the roof, the subfloor and any timber deck attached to the wall.

The wall being good does not make the building good. The assessment is at the building level, and the masonry is one of the easier parts to get right.

## What does the system cost and who builds it?

Bricklaying is a skilled trade and the cost is labour-dominated. A double brick wall uses roughly twice the brick and twice the laying labour of a veneer wall of the same area, plus the ties, flashings and cavity detailing.

Bricklayers work to a rate per thousand bricks or per square metre, and the articulation joints, flashings and weep holes are the details that separate a careful quote from a cheap one. For an owner, the question to ask is what the rate includes at the openings and at the base of the wall.

## How does it compare thermally?

The mass is the advantage in a climate with a large day-night temperature swing: the wall absorbs heat during the day and releases it at night, smoothing the internal temperature. The mass is a disadvantage in a hot humid climate with little swing, where it simply stays warm.

Insulation can be added in the cavity or on the inside face, and the choice changes the condensation behaviour of the wall. Cavity insulation is common and must not bridge the drainage path.

## What are the common failures?

Water at the base of the wall because weep holes are blocked or missing. Cracks at corners of openings because the lintel or the articulation is wrong. Efflorescence as salts migrate to the surface. Tie corrosion in coastal locations. And rising damp where the damp-proof course has been bridged.

All of them appear first as a stain, and all of them are easier to deal with when they are a stain rather than a soft patch of plaster.

## What should an owner know before buying a double brick house?

Whether the weep holes are open, whether the articulation joints have sealant in them, whether there is any horizontal cracking that suggests footing movement, and whether the internal plaster is drummy. Those four checks cover most of the risk in the wall itself.

A building inspector will do this, and the report is worth reading rather than filing. The wall is the most expensive element to repair and the easiest to assess.

## What this topic covers next

The remaining articles follow the wall from its parts to its upkeep. Materials covers bricks, mortar, ties and flashings. Installation follows the sequence of laying and finishing. Quality sets out the inspection points. Maintenance deals with repointing, weep holes and sealant renewal over the life of the building.

## What does a cavity wall sound like?

Solid, and that is part of why people like it. Two leaves of masonry with a cavity between them separate a room from the street in a way that a framed wall struggles to match, because the mass on both sides does the acoustic work.

The weak points are the openings, the roof space and any penetration. A masonry wall with a hollow-core door and an unsealed ceiling penetration will leak sound at those points regardless of how good the wall is.

## How does a double brick wall behave in an earthquake?

As a stiff, heavy element, which is the opposite of what a ductile frame wants. Australian design requirements for masonry vary by region, and the bracing, the ties and the connections to the floor and roof are all part of the seismic design where it applies.

The takeaway for an owner is that alterations to a double brick wall are structural work. Removing a wall to open a room is not a renovation decision, it is an engineering one.

## What is the difference between face brick and rendered finish?

Face brick is the unit as it comes, chosen for appearance and laid with a tooled joint. Rendered finish is a coat of mortar over the masonry, which gives a uniform surface and can be painted.

Render changes the way the wall dries. A cement render with a vapour-closed paint holds moisture against the brick, and on a wall with any water entering the cavity the result is blistering and salt damage rather than a simple stain.

## How are services handled in a masonry wall?

Before the wall is built, or with careful chasing afterwards. Conduits and pipes are usually built into a chase or a sleeve, and the chase must not cut through the damp-proof course or weaken the leaf.

Retrofit services in a double brick house are the main reason walls get opened. Planning them at construction, with a drawing of what is buried where, prevents that.

## What does the wall look like at the roof and floor junctions?

At the floor, the wall continues past the floor structure, which is why the skirting sits on a masonry face and why floors in older double brick houses are often timber on bearers. At the roof, the wall either supports the trusses or meets the eaves, and the junction is flashed.

Both junctions are places where a change in material or in movement occurs, and both are places to look for cracks.

## How does the wall perform acoustically between dwellings?

Very well, because there is mass on both sides and a cavity between. The flanking paths matter more than the wall itself: floors, ceilings, ducts and the junctions at the perimeter.

Where a double brick wall separates two dwellings, the detailing at the roof and the floor is where the acoustic performance is won or lost.

## What about the thermal mass argument in practice?

It works when the mass is inside the insulation and exposed to the room. A double brick wall with the inner leaf lined in plasterboard still has mass, but the exposed surface is the lining.

An owner adding insulation to an old wall should understand which surface will be exposed, because that determines whether the mass helps.
$wallarticle16$,
 12, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/White_door_on_brick_wall.jpg/1280px-White_door_on_brick_wall.jpg',
 'Double Brick Walls Explained: Cavity Masonry in Australia',
 'Double brick walls in Australia: how the cavity drains, how the leaves are tied, where movement joints go and what fails first in service.'
),
(
 'au-double-brick-materials',
 'Double Brick Materials: Bricks, Mortar, Ties and Flashings',
 'The components of a cavity masonry wall and how each is specified, from exposure-graded bricks and mortar ratios to stainless ties and weep hole formers.',
 'AU',
 $wallarticle17$
# Double Brick Materials: Bricks, Mortar, Ties and Flashings

The material list for a double brick wall is short and traditional, and every item has a durability question attached to it. Brick exposure grade, mortar strength, tie material, flashing material and damp-proof course: get any one wrong and the wall will still stand, which is exactly why the errors survive for decades before they show.

Selection is about matching each component to the exposure the wall will actually face, not to the cheapest item on the schedule.

## How is brick exposure graded and why does it matter?

Bricks are graded for the conditions they can tolerate, with exposure grades defined for protected, general and severe marine or industrial environments. A brick rated for protected conditions will not perform on a coastal facade exposed to salt spray and driving rain, and the failure mode is spalling and salt attack rather than simple weathering.

The grade is a property of the unit, and it should be stated in the specification and visible on the delivery docket. A substitute brick chosen for appearance alone can quietly reduce the durability of the whole wall.

## What mortar should be used?

A mortar that is weaker than the bricks and compatible with them. The common mix for general masonry is a cement, lime and sand mortar in proportions around one part cement to one part lime to six parts sand, adjusted for the exposure and the unit being laid. Stronger is not better: an over-rich mortar is harder than the brick, and when movement occurs the brick fails instead of the joint.

Mortar also controls the colour of the finished wall, which is why mortar joints are a design decision as much as a structural one. The joint profile, whether it is flush, raked, struck or ironed, changes the way the wall reads and the way it sheds water.

## What do wall ties do and which type should be used?

Ties transfer wind load between the leaves and hold the outer leaf to the inner one. They come in a range of materials: galvanised steel for protected situations, heavily coated or stainless steel for coastal and severe exposures, and proprietary types for specific cavity widths and insulation.

The tie must span the cavity, embed into both leaves, and be fixed with a slight fall to the outer leaf. On a wall with cavity insulation, the tie type must be matched to the insulation so the insulation is not compressed or displaced.

Tie durability is the slowest failure in the wall. Corroded ties cannot be seen and cannot be replaced without opening the masonry, so the specification is the only control.

## What keeps water out at openings and at the base?

Flashings and the damp-proof course. A flashing at the base of the cavity collects water that has run down the inner face of the outer leaf and discharges it through weep holes. Flashings at window heads, sills and roof junctions do the same job locally, turning water outward and protecting the masonry below.

The material is typically a coated metal or a proprietary flexible flashing, and the critical detail is the lap and the turn-up. A flashing that is not turned up at the inner leaf lets water bypass it. A flashing installed with the laps the wrong way sheds water into the wall.

The damp-proof course at the base of the wall separates the masonry from the footing and stops rising damp. It is a thin layer with a large job, and it must be continuous.

## How are weep holes formed and kept open?

With formers that are removed after laying, or with proprietary vents that stay in place. They are placed at defined intervals along the base of the cavity and above flashings, and their only job is to let water out and air in.

The common failure is blockage by mortar during construction. Weep holes that are not cleaned out are decorative, and the water they were meant to release stays in the cavity. Formers that are left in place do the same, unless they are the open type designed to remain.

## What is used for reinforcement and lintels?

Steel reinforcement in the form of joint reinforcement or rod in the mortar bed, placed where the design calls for it, usually to control cracking over long panels or at stress concentrations. Lintels over openings, in steel, timber or masonry, sized by the engineer for the load above.

Reinforcement must be protected from corrosion, so it goes in a mortar bed with adequate cover, not laid on the brick and covered thinly. Lintels need bearings of the specified length on each side; a short bearing is a crack waiting to open.

## How are articulation joints formed?

With a break in the masonry and a compressible backing rod plus a flexible sealant, or with a proprietary joint system. The joint must be continuous through the depth of the wall and free of mortar, because a joint full of mortar is not a joint.

Sealant selection is by movement capability and exposure. A sealant that is too stiff will crack; one that is too soft will slump out of a vertical joint. The datasheet, not the price, should decide.

## What about cavity insulation and sarking?

Insulation in a masonry cavity is common and reduces heat flow, but it must not block the drainage path. Rigid boards fixed to the inner leaf, or batts held clear of the outer leaf, preserve a gap.

Where the wall has a rendered finish or a severe exposure, additional moisture control may be needed at the inner leaf, and that decision affects the condensation behaviour of the whole assembly. It belongs to the designer, not to the bricklayer.

## How are quantities estimated?

By wall area with an allowance for openings and for cutting waste. Brick counts per square metre depend on the unit size and the joint thickness, and the allowance matters more on a wall with many openings than on a plain elevation.

Mortar is estimated per cubic metre of brickwork, and ties, flashings and weep holes per metre or per unit. A quote that omits flashings and weep holes is not a cheaper quote; it is an incomplete one.

## What does material substitution cost later?

Durability, mostly. A lower exposure grade on a coastal wall, a thinner tie, a flashing of the wrong metal, a sealant with less movement capability: each saves a little at purchase and shows up as a defect that cannot be corrected without opening the masonry.

The awkward economics of masonry is that the materials are cheap relative to the labour to install them, so the saving from substitution is small and the cost of failure is large.

## How are bricks tested before they are laid?

By batch and by grade, with the supplier's certification and a visual check for chipping, lime inclusions and colour variation. On a large job, a sample panel built on site is the clearest way to agree the finished appearance before thousands of bricks are laid.

The sample panel is also the reference for the joint profile and the mortar colour, which is why it should stay standing until the wall is complete.

## What is the difference between clay and concrete units?

Clay bricks are fired and their colour comes from the clay and the firing; they are dimensionally stable and durable, and their exposure grade defines where they can be used. Concrete units are moulded and cured, and they offer a different palette and a different movement behaviour.

Both work in a cavity wall, and both need the same discipline at the cavity, the tie and the flashing.

## How much mortar is wasted on a typical wall?

More than most estimates assume, because mortar that has been mixed and not used within its working life must be discarded. A mix that is retempered with water hours later has lost strength and should not go into a structural leaf.

Mixing in smaller batches and keeping the mortar board clean are the two habits that reduce both waste and defects.

## What is the point of a sample panel?

It fixes the appearance and the workmanship standard before the wall is too big to argue about. The joint profile, the mortar colour, the brick bond, the treatment at corners and the general standard of finish are all visible on a panel two metres square.

An owner who approves a sample panel has a reference for every later complaint. An owner who approves nothing has only an opinion.

## How are ties checked on an existing wall?

By removing a brick at a low level, or with an endoscope through a weep hole on some walls, or by a specialist survey where corrosion is suspected. None of these is routine, which is why the specification at construction is the real control.

Where tie corrosion is found, the remedial options are replacement ties inserted through the outer leaf, or rebuilding sections of the wall.

## What should be in a masonry specification?

Brick type and exposure grade, mortar mix and joint profile, tie type and spacing, flashing material and detail, weep hole spacing and former type, articulation joint positions and sealant type, and the reinforcement and lintel schedule. Nine items, and every one of them has a failure mode.

A specification that covers those nine is a wall that can be built correctly and inspected honestly.

## What is the role of the damp-proof course in the material list?

It separates the masonry from the footing and stops moisture rising into the wall. It is a thin, cheap layer with a large job, and it must be continuous and unpunctured.

A course that has been laid, then pierced by a plumbing penetration or a fixing, is no longer a course.

## How is the right sealant chosen for a joint?

By movement capability, by exposure and by the substrate. A facade joint needs a sealant rated for that movement class and for external weathering, applied over a backing rod at the correct depth.

The datasheet is the specification. A sealant chosen by colour or by price is a guess.

## How does the choice of bond affect the wall?

Stretcher bond is the common cavity wall bond, with half-brick overlap and a consistent appearance. Other bonds change the look and the number of units, and some are unsuitable for a structural leaf.

The bond is a specification item, and a change of bond mid-wall is visible for the life of the building.

## What does a brick sample actually prove?

That the unit's colour, texture and dimensional tolerance suit the design, and that the mortar colour works against it. It does not prove durability, which comes from the exposure grade and the certification.

Both matter, and a sample panel combines them.

## How is waste disposed of responsibly?

Brick and mortar waste is heavy and inert, and it goes to a licensed facility or a recycling operation that crushes masonry. Cleaning the site into a mixed skip loses the opportunity to recover it.

On a large job the difference in disposal cost is material.

## What part do lintels play in the material list?

They carry the load over every opening, and their material, size and bearing come from the design. A steel lintel needs protection from corrosion; a timber lintel needs to stay dry.

A lintel is cheap relative to the wall it supports and catastrophic when undersized.
$wallarticle17$,
 11, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Double_fired_brick_-_geograph.org.uk_-_5605672.jpg/1280px-Double_fired_brick_-_geograph.org.uk_-_5605672.jpg',
 'Double Brick Materials: Bricks, Mortar, Ties, Flashings',
 'Double brick materials in Australia: exposure-graded bricks, mortar ratios, wall ties, flashings, weep holes and articulation joint sealants.'
)
) AS a(slug, title, excerpt, market, content, read_time_minutes, theme, cover_url, meta_title, meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code = a.market AND t.candidate_key = 'system:au-double-brick'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.learn_articles (title, slug, excerpt, content, category_slug, status, cover_image_url, read_time_minutes, meta_title, meta_description, wall_market_code, wall_topic_id, wall_article_theme, wall_language_code)
SELECT a.title, a.slug, a.excerpt, a.content, 'surface-preparation', 'draft', a.cover_url, a.read_time_minutes, a.meta_title, a.meta_description, a.market, t.id, a.theme, 'en'
FROM (VALUES
(
 'au-double-brick-installation',
 'Laying a Double Brick Wall: Sequence, Ties and Cavity Discipline',
 'From footing and setout to the last course and the lintel, the sequence that keeps a cavity clean, a wall plumb and water heading out rather than in.',
 'AU',
 $wallarticle18$
# Laying a Double Brick Wall: Sequence, Ties and Cavity Discipline

Laying a double brick wall is a linear trade with a non-linear risk: the things that go wrong are the things nobody sees afterwards. A cavity full of mortar droppings, a flashing turned the wrong way, a tie laid flat, a weep hole filled in. Each survives the handover and shows up years later as damp.

The sequence exists to prevent exactly that, and the discipline is in the cavity.

## What is checked before the first course?

Footing, damp-proof course, setout and levels. The footing must be cured and level, the damp-proof course continuous and correctly positioned, and the setout checked against the building dimensions and the diagonal.

At the base of the cavity the flashing is installed with the correct fall and turn-up, and the weep hole positions are marked. Getting this detail right at the start is the only chance, because the base of a finished wall cannot be reworked from outside.

## How is the wall laid to keep it plumb and level?

With a line and a level at every course, corner profiles or story poles to set the gauge, and a check of the wall face for plumb at intervals rather than at the end. Bricks are laid to a consistent bed and the joints are tooled as the work proceeds, because tooling later disturbs the bond.

The inner leaf and the outer leaf are built up together, or in a sequence that keeps the ties installed at the right level. A wall where one leaf runs far ahead of the other is a wall where the ties will be an afterthought.

## How are ties installed correctly?

Embedded into both leaves, at the specified spacing, with a slight fall toward the outer leaf. The tie goes into the mortar bed, not into a hole drilled afterwards, and it is positioned so it is not sitting in the cavity void where it cannot bond.

Spacing is typically around 600 mm horizontally and 450 mm vertically, with extra ties at openings and edges. The count and the fall are checked during the work, because after the wall is finished they cannot be seen at all.

## How is the cavity kept clean?

By using a cavity board or a batten pulled up as the work proceeds, by striking mortar off the ties and the inner face, and by cleaning out at the end of each lift. Mortar that falls into the cavity sets on the flashing and blocks the drainage path.

This is the least glamorous and most consequential part of the trade. A cavity that is clean drains; a cavity with a shelf of mortar at the base holds water against the inner leaf until it finds a way through.

## When are lintels and openings formed?

As the wall reaches the opening height. The lintel is bedded with the specified bearing at each end, the brickwork above is built on it, and the flashing at the head of the opening is installed so that water is turned out over the frame.

At sills, the flashing goes under the sill and turns up, with end dams so water cannot run sideways into the cavity. These three details, head, sill and jambs, are where most water entry at windows begins.

## How are articulation joints built in?

At the designed positions, as a genuine break in the masonry with a compressible filler and a sealant. The joint is kept free of mortar and the sealant is applied to the specified depth with a backing rod so it can move.

Building the joint in as the wall rises is straightforward. Cutting one into a finished wall is a different job and rarely as clean.

## What happens at the top of the wall?

A connection to the roof structure or the floor above that allows for movement while keeping the wall stable, plus a flashing or a parapet detail that keeps water out of the top of the cavity. The top of a cavity wall is an entry point for water if it is left open.

Where the wall supports a roof, the tie-down and the eaves detail must work together. Water running down the inside of the cavity needs to be discharged at the base, and the roof must not put more water into the wall than the drainage can handle.

## How is the wall finished after laying?

Joints are tooled, the wall is cleaned down, weep holes are cleared, and the articulation joints are sealed. If the wall is to be rendered, the render is applied to a prepared surface with the correct bond; if it is face brick, protection from mortar staining during the remaining works matters.

Cleaning is done with the appropriate method for the brick. Acid washing on the wrong unit, or too strong a mix, etches the face and cannot be undone.

## How long does a double brick wall take to build?

Longer than a framed and clad wall, and the programme is driven by the bricklaying rate and the curing of the mortar rather than by drying-in. A typical house takes weeks of bricklaying, and the wall is not ready for the next trade until it is stable.

Compressing the programme by working in bad weather is a false economy: mortar that has been rained on, or brickwork laid on a saturated unit, produces weaker joints and more efflorescence later.

## What does the owner see at the end of the bricklaying stage?

Straight walls, consistent joint finish, clean brickwork and open weep holes. Those four visible items cover most of what can still be checked; everything else is inside the cavity.

The useful inspection at this stage is a walk around with a torch at the base of the wall, confirming that the weep holes are clear and that there is no mortar shelf visible in the cavity at the openings.

## What are the sequencing risks with other trades?

Two. The first is services: a plumber or electrician chasing a finished brick wall after the fact compromises the masonry and often the flashing. Services should be planned and sleeved before the wall closes.

The second is the roof and the wet trades. Water from the roof, or from washing down, that enters the cavity before the flashings are protected will sit at the base. Cover the top of the wall, and keep the base clear.

## What makes the difference between a wall that lasts and one that does not?

The cavity. Bricks are durable, mortar is durable, ties are durable when specified properly. The wall fails when water cannot get out, and water cannot get out when the cavity is blocked, the weep holes are filled, or the flashing is turned the wrong way.

Every one of those is a decision made by a person on site, in a moment, with no immediate consequence. That is why cavity discipline is the whole of the trade.

## How is the wall protected while the rest of the building continues?

With the top of the wall covered, the base kept clear, and the finished faces protected from mortar and paint. A brick wall that has been used as a mixing platform will never look new again, because the staining is in the face of the unit.

Temporary protection is cheaper than cleaning, and cleaning is cheaper than replacement.

## What happens if it rains during bricklaying?

The work stops, or it continues under cover, because laying brick onto a saturated bed produces a weak bond and a wall that holds water. Brickwork that has been rained on should be allowed to dry before the next course, and the top of the wall should be covered at the end of each day.

The consequence of ignoring this is efflorescence, weak mortar and, in the worst case, a wall that has to be partly rebuilt.

## How are corners and returns built?

With a corner profile or a story pole set plumb so that every course is aligned, and with the bond carried around the corner correctly. A corner that is out of plumb by the time it reaches the top of the wall cannot be corrected without rebuilding.

Returns and openings are the places where the bond is broken and where the bricklayer's skill shows. They are also where a cheap rate becomes visible.

## What is the sequence when the wall meets a timber or steel frame?

At the junction, the frame is tied to the masonry with the specified anchors, and the two materials are separated by a movement joint where the design requires it, because timber shrinks and steel expands differently from masonry.

The junction is a classic crack location, and the detail that prevents it is a designed joint rather than a hope.

## How is a very long wall handled?

With articulation joints at the designed spacing, reinforcement in the mortar bed where specified, and piers or engaged columns where the design needs them. A long unreinforced wall with no joints will crack at whatever point its geometry and the weather decide.

The joints are cheaper than the cracks, and they are designed rather than discovered.

## What does a good bricklaying crew look like on site?

One with a line up, a level in use, a cavity board in the wall, ties in the bed and a clean working area. The state of the scaffold and the mortar board tells you most of what you need to know about the wall that is going up.

This is not cosmetic. A clean site is a site where the cavity is being kept clear, and the cavity is what the wall depends on.

## How is the wall checked as it rises?

By the bricklayer at every course and by the supervisor at intervals: line, level, plumb, joint thickness, tie placement and cavity cleanliness. The check is continuous because the wall is built course by course.

An inspection that arrives at the end of the wall can only see the surface.

## What is the correct way to finish the base of the wall?

With the flashing discharging over the damp-proof course and the weep holes open above it, and with the external ground level below the outlet. The base is the wall's most important detail and its least visible.

Where the base is buried, the wall has lost its drainage and the first symptom will be damp inside.

## How are openings set out?

From the drawing, with the reveal dimensions checked against the joinery before the brickwork reaches the sill height. An opening that is built to the wrong dimension is a change to the window, not to the wall.

Setting out openings early is the cheapest correction available.

## How is a wall protected after completion?

With the top covered, the base clear and the faces protected from the following trades. Mortar staining is easier to prevent than to remove, and cleaning a face brick wall aggressively can etch it permanently.

A simple cover over the top of the wall at the end of each day prevents the most common post-completion complaint.
$wallarticle18$,
 11, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Spotswood_Pumping_Station%2CSpotswood%2C_Victoria_Australia.jpg/1280px-Spotswood_Pumping_Station%2CSpotswood%2C_Victoria_Australia.jpg',
 'Laying a Double Brick Wall: Sequence, Ties and Cavity',
 'Laying a double brick wall in Australia: base flashings, tie spacing and fall, clean cavity discipline, lintels, articulation joints and weep holes.'
),
(
 'au-double-brick-quality',
 'Inspecting Double Brick: Cavity, Ties, Joints and Water Paths',
 'What an inspection of a cavity masonry wall should cover, including the items that can only be checked while the wall is still open.',
 'AU',
 $wallarticle19$
# Inspecting Double Brick: Cavity, Ties, Joints and Water Paths

An inspection of a double brick wall divides into two parts: what can be seen while it is being built, and what can be seen afterwards. The first is where almost all the value lies, because the cavity, the ties and the flashings are invisible once the wall is complete.

Afterwards, the inspection is about water: where it has been, where it went, and what it left behind.

## What can only be inspected during construction?

Four things. The base flashing and its turn-up. The tie spacing and their fall to the outer leaf. The cleanliness of the cavity. And the damp-proof course continuity at the base.

Each is a permanent, hidden decision. A building surveyor's inspection regime usually includes the masonry at the stage before it is built past the point of no return, and the records from that inspection are worth keeping with the house documents.

## How is the cavity checked for obstructions?

At the base, with a light, looking for mortar on the flashing. At openings, where the cavity is exposed, by reaching in and feeling for a shelf of mortar. And by counting weep holes and confirming they are open rather than formed and filled.

A cavity that is blocked will often show itself as damp at the skirting line on the inner leaf long before it shows as a stain on the outside.

## What is an acceptable joint finish?

One that is consistent across the wall, tooled to the specified profile, and free of voids and excessive smearing. The profile affects weather performance: a recessed or weathered joint sheds water better than a flush joint that collects it.

The joint finish is also the most visible thing about the wall, so consistency between the morning's work and the afternoon's matters. Stopping and starting with a different technique leaves a visible band that cannot be corrected later.

## How is plumb and level checked?

With a level or a plumb bob at intervals along the wall, and a straight edge across the face to check for hollows and bows. Deviations within the tolerance are acceptable; a wall that leans because the setout was wrong is not.

Corners, reveals and openings are checked for square, because the joinery that follows will expose any error. A window reveal that is out of square by ten millimetres is a visible defect that no amount of rendering will hide.

## How is water penetration tested or assessed?

Not by hosing a new wall, which proves little and can cause staining. It is assessed by design review and by detail inspection: the flashings, the weep holes, the articulation joints and the roof connection.

On an existing wall, the assessment is historical: look for efflorescence, look for damp patches inside, look for staining below windows, and check whether the weep holes are open. Those observations tell you more than any test.

## What does efflorescence indicate?

That salts have moved through the masonry in water and crystallised on the surface as the water evaporated. It indicates moisture movement rather than structural failure, and it is common on new walls as the mortar cures.

Persistent efflorescence after the first year suggests a continuing water source, which is the thing to find. Cleaning the salt off without finding the source is decorating, not repairing.

## How are articulation joints inspected?

For presence, continuity and sealant condition. The joint should be where the design says, free of mortar, and filled with a sealant that is still bonded to both faces and still proud of the surface rather than recessed.

A joint that has been rendered over, tiled over or filled with mortar is not a joint. It will crack at the point of movement instead, and the crack will appear somewhere unexpected.

## How are internal linings over masonry inspected?

For flatness, fixing and moisture. A plasterboard lining on battens should be flat and the battens should be fixed to the masonry rather than to the plaster. Direct plaster should be sound, with no drummy areas when tapped.

Before a lining goes on, the masonry should be dry. Lining over damp masonry traps the moisture and produces a defect that will be blamed on the plasterer for years.

## What records should be kept?

The masonry stage photographs, the bricklayer's specification including brick grade and mortar mix, the flashing details used at openings, and the sealant type in the articulation joints. Add any inspection certificates from the building surveyor.

Those records answer the questions that arise in twenty years: what is the brick, what is the tie, what happens if I cut into this wall.

## Who signs off the masonry?

The building surveyor under the permit process, usually at specified stages, and the builder contractually. The bricklayer is responsible for workmanship, but the compliance of the assembly is the builder's.

For an owner, the practical takeaway is that the inspection stages exist for a reason and should not be waived to save a week. The wall's weaknesses are covered up quickly.

## What are the most common quality failures?

Cavity obstructions, blocked weep holes, ties without fall, flashings turned the wrong way, inconsistent joint finish, and out-of-square openings. Then, at the next layer out, rendered or painted surfaces that cannot dry because the wall behind them is saturated.

None of these is exotic, and all are preventable by inspection at the right moment.

## Is there any value in a post-completion inspection?

Yes, as a baseline. A survey of the wall at handover, with photographs of every elevation, the weep holes and the articulation joints, gives a reference point for later comparison. When a stain appears, you can tell whether it is new.

That baseline is the cheapest form of risk management available on a masonry building.

## What should be checked at the flashings specifically?

That each flashing is continuous, turned up at the inner leaf, lapped the right way, and discharging over a weep hole. At window heads the flashing must extend past the opening and have end dams so water cannot run sideways into the cavity.

These are a handful of details repeated at every opening, and each is impossible to inspect once the wall is finished above it.

## How is cavity insulation inspected?

For fit and for continuity. Batts should fill the cavity without being compressed, and rigid boards should be fixed to the inner leaf so the drainage path at the outer leaf is preserved. Insulation that blocks the cavity defeats the wall.

The inspection happens as the wall rises, because the insulation goes in behind the outer leaf as it is built.

## How is the damp-proof course verified?

By continuity at the base and by confirming that the external ground or paving level is below it. A course that is continuous but buried under a garden bed that was raised two years later is functionally absent.

On a new build the check is simple. On an existing wall it is a matter of digging a small inspection hole at the base and looking.

## What about the internal plaster finish?

Checked for soundness by tapping, for flatness with a straight edge, and for cracks at the junctions with the ceiling, the floor and the openings. A drummy patch suggests the plaster has separated from the masonry, which usually means moisture.

The plaster is also the place where a wall's history is most legible: tide marks, salt bloom and repeated patch repairs all tell a story about water.

## How are window and door frames assessed in a masonry wall?

For square, for plumb, and for the gap between frame and masonry, which should be consistent and sealed with a backing rod and sealant rather than packed solid. A frame that has been forced into an out-of-square opening will bind and will let water in.

On an existing building, opening and closing the window tells you most of it.

## What documentation should accompany a masonry wall?

The brick grade and supplier, the mortar mix, the tie type and spacing, the flashing details, the sealant schedule, the articulation joint layout, and the inspection records from each stage. Plus photographs at completion of every elevation.

That package is what a future purchaser, insurer or renovator will ask for, and it costs almost nothing to compile at the time.

## How does an inspector check a rendered wall?

By tapping for drummy areas, looking for cracking patterns that follow the masonry beneath, checking the base for damp, and reading the coating history. A rendered wall hides the brick but not the behaviour of the wall.

The render is a wearing layer over a structure, and the inspection should distinguish between a defect in the render and a defect in what it covers.

## Is there a fair way to resolve a masonry dispute?

By returning to the specification and the sample panel. If the wall matches the approved sample and the specified materials, the work is compliant even if the owner later prefers a different appearance. If it does not match, the deviation is measurable.

That is why both documents matter more than any argument conducted on site after the fact.

## How is mortar strength assessed in an existing wall?

By scraping a joint with a tool and observing whether the mortar is sandy and soft or hard and brittle, and by comparing it with the units. A mortar that is harder than the brick is a defect in waiting.

That assessment drives every repointing decision, because the new mortar must match the old in strength.

## What is the standard for a repaired area?

That it matches the surrounding wall in appearance, joint profile and material, and that the repair is not a patch of different behaviour. A hard repair in a soft wall becomes the next failure.

The test is visual consistency and durability, not the neatness of the day's work.

## What is the inspection value of a moisture meter?

It gives a comparative reading across a wall rather than an absolute truth. A reading that rises toward the base, or that is high below a window, tells you where water has been.

Used with observation, it is a useful tool. Used alone, it produces numbers that start arguments.

## How is a rendered elevation inspected?

By tapping for hollow areas, looking for crack patterns, checking the base and reading the coating. A render that sounds hollow over a large area has debonded, and the water is already behind it.

The repair is to remove the loose render, treat the cause and reinstate, not to fill the crack.

## What is the most common inspection omission?

Checking the base of the wall after the scaffolding comes down and the landscaping goes in. That is when a weep hole gets covered by a garden bed, and the defect that follows is created after every inspection has been signed off.

A photograph of each elevation at handover, taken from ground level with the weep holes visible, closes that gap.
$wallarticle19$,
 10, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Wall_decoration_and_insulation_with_Masonry_Veneer.jpg/1280px-Wall_decoration_and_insulation_with_Masonry_Veneer.jpg',
 'Inspecting Double Brick Walls: Cavity, Ties and Water Paths',
 'Inspecting double brick walls in Australia: cavity cleanliness, tie fall, joint finish, articulation joints and the water paths you can still check.'
),
(
 'au-double-brick-maintenance',
 'Maintaining Double Brick: Repointing, Weep Holes and Sealant',
 'The upkeep a cavity masonry wall actually needs: keeping water out, keeping the joints sound, and knowing which repairs are cosmetic and which are structural.',
 'AU',
 $wallarticle20$
# Maintaining Double Brick: Repointing, Weep Holes and Sealant

Maintenance on a double brick wall is mostly the maintenance of a drainage system. The bricks will outlast the mortar, the mortar will outlast the sealant, and the sealant is the part that fails first. An owner who keeps water moving outward and away will get decades of service from a wall that needs almost nothing else.

The tasks are seasonal and cheap. The consequences of skipping them are structural and expensive.

## What is the annual check on a brick wall?

A walk around each elevation looking at five things: the articulation joints, the weep holes, the base of the wall, the mortar joints, and any staining.

Look for sealant that has pulled away or gone hard, weep holes that have been painted over or blocked by soil or paving, damp staining at the base, mortar that has eroded, and white salt deposits. Ten minutes with a torch, once a year, is the whole routine.

## How are weep holes kept open?

By clearing them of mortar, paint, soil and vegetation, and by making sure the ground or paving outside is below the level of the flashing so water can discharge.

The most common cause of blocked weep holes is not mortar but landscaping: garden beds built up against the wall, or a paved path laid over the outlet. Lowering the external level is often the entire repair.

## When should mortar be repointed?

When the joints have eroded to the point that water can sit in them, or when the mortar has become soft and sandy. Repointing is a skilled job: the old mortar is raked out to a depth of about twice the joint width, the joint is cleaned, and new mortar of a compatible mix is packed in and tooled.

The common mistake is to repoint with a strong cement mortar, which is harder than the brick and causes the brick face to spall as the wall moves. The mortar should be weaker than the unit, always.

## How is efflorescence dealt with?

By brushing off the dry salt, then finding the water. Washing with water can drive the salt back into the masonry, and sealing the surface traps moisture and makes the problem worse.

If efflorescence keeps returning, the source is either a leak above, blocked drainage at the base, or rising damp from a bridged damp-proof course. Treat the source, then clean the wall.

## How is an articulation joint resealed?

By removing the old sealant and the backing rod, cleaning the joint faces, priming where the sealant requires it, installing a new backing rod to the correct diameter and depth, and applying a sealant with adequate movement capability.

The joint must be able to move. Filling it with mortar or with a rigid filler converts a designed movement joint into a crack somewhere else. The sealant is a wearing component and should be treated as one.

## What does rising damp look like and what causes it?

A horizontal band of damp and salt damage at the base of the wall, usually with blistering plaster inside and eroded mortar outside. The cause is a bridged or failed damp-proof course, or earth built up above it.

The repairs are to lower the external ground level, improve drainage, and where the course has genuinely failed, install a remedial damp-proof course or a drainage system. Painting over the internal band does not work, because the moisture is still arriving.

## How is a crack assessed?

By its direction, its width, and whether it is moving. Vertical cracks at the junction of materials or at articulation joint positions are usually movement. Diagonal cracks from the corners of openings suggest lintel or footing issues. Horizontal cracks in the mortar line suggest something pressing or settling.

A crack that is stable can be repaired and monitored. A crack that is widening needs an engineer, not a tube of filler.

## How is render maintained?

By repairing cracks and drummy areas before water gets behind it, and by repainting with a coating that lets the wall dry. A cement render with a vapour-closed paint film traps moisture, and the failure appears as blistering and salt damage.

Where render is cracking in a pattern that follows the masonry beneath, the cause is usually movement in the wall rather than the render.

## How is the wall altered safely?

With care and with engineering. Cutting an opening in a double brick wall requires a lintel designed for the load, temporary propping, and reinstatement of any articulation joint that the opening interrupts.

The two things that go wrong are an undersized lintel and a bearing that is too short. Both produce cracks almost immediately, and both are expensive to correct after the fact.

## What is the repainting and recoating cycle?

For face brick, none, unless the owner chooses to paint. For rendered or painted masonry, typically seven to ten years depending on exposure, with the sealant joints renewed more often than the coating.

Coastal elevations need the shorter end of that range. Salt and wind-driven rain attack both the coating and the sealant, and the wall's protection is only as good as the film on the outside.

## What should be recorded?

Photographs of each elevation at handover and after each repair, the sealant product used in the articulation joints with its date, any repointing records, and the brick and mortar specification. Add a note of anything buried or altered.

A wall that has a history is easier to diagnose than one that has none, and the history costs nothing to keep.

## When should a specialist be engaged?

For cracks that are widening, for rising damp, for tie corrosion suspected in a coastal wall, for structural alteration, and for any repair that involves propping. Those are the five conditions that exceed ordinary maintenance.

Everything else, sealant renewal, weep hole clearing, repointing, cleaning and recoating, is planned maintenance on a known cycle.

## Does a double brick wall ever need to be replaced?

Rarely. Masonry is repairable in a way that framed and clad walls are not: joints can be repointed, units can be replaced, flashings can be renewed at openings. The wall's life is limited by the water it has to tolerate, not by the material.

That is the argument for the maintenance routine. A wall kept dry is a wall that will still be standing when everything inside it has been rebuilt.

## How often should the sealant joints be renewed?

As a working rule every seven to ten years, sooner on exposed coastal elevations. The sealant should be inspected annually and renewed when it has lost adhesion, hardened, or pulled away from the joint face.

Renewal is cheap. The damage that follows a failed joint, saturated masonry and corroded ties, is not.

## What cleaning is appropriate for brickwork?

Low-pressure water and a soft brush for general dirt, a proprietary masonry cleaner for specific staining, and nothing abrasive. High-pressure washing drives water into the wall and erodes the mortar, and it is the most common cause of a problem created by cleaning.

Acid-based cleaners should be used only on units that tolerate them, and only by someone who knows the risk to the mortar and the surrounding materials.

## How are cracked or spalled bricks replaced?

By cutting out the unit, cleaning the pocket, and bedding a matching replacement in a compatible mortar. It is a small job that requires care, because a replacement in a strong mortar will crack the neighbouring units as the wall moves.

Spalling is usually a symptom of water and salt, so replacing the brick without addressing the moisture simply moves the failure to the next unit.

## What is the maintenance difference between face brick and rendered walls?

Face brick needs cleaning and repointing, and nothing else. Rendered walls need the coating renewed, the render repaired where it cracks, and the base kept drained so the render does not sit in water.

The rendered wall has more to maintain and more to get wrong, which is why the coating system and the render mix matter as much as the paint on them.

## How does landscaping affect a masonry wall?

Directly. Soil built up above the damp-proof course invites rising damp. Irrigation against the wall keeps the base permanently wet. Paving laid over the weep holes blocks the drainage. And trees close to the footings move the ground.

A garden can do more damage to a wall in five years than fifty years of weather, and the fixes are usually a shovel and a re-levelled bed.

## What should a pre-purchase inspection focus on?

Water. The base of the wall outside, the weep holes, the articulation joints, the underside of window sills, the internal plaster at the base of walls, and any recent patching or repainting that might be hiding a stain.

The bricks and the mortar will almost always be sound. It is the drainage detail and the water history that determine what the next ten years will cost.

## What is the case for keeping the wall rather than rebuilding?

Every masonry wall that is repairable is cheaper to repair than to replace, and the replacement will be a different wall with a different thermal and acoustic behaviour. Repointing, resealing joints, restoring drainage and replacing a few units is a fraction of the cost of demolition.

The one exception is structural movement that has not stopped. A crack that is still opening cannot be maintained away.

## What should the annual routine cost?

Very little if it is genuinely annual: an inspection, a few sealant repairs, a check of the weep holes and the removal of any vegetation. The cost is in the inspection, not the materials.

The expense arrives when the routine has been skipped for a decade and the water has been working quietly.

## How is a wall prepared before repainting?

By washing, by treating any mould or salt, by repairing cracks and drummy render, and by allowing the wall to dry fully before coating. Painting over damp masonry seals the water in.

A moisture reading before painting is the check that separates a professional repaint from a cosmetic one.

## What is the effect of ivy and creepers?

They hold moisture against the wall, their roots find mortar joints and their removal can pull the joint face away. A wall covered in growth is a wall that cannot be inspected.

Removal and repointing is a bigger job than keeping the growth cut back from the start.

## How is a wall repointed at a low level without damaging it?

With hand tools, patience and a mortar matched to the existing. Grinders cut the brick as easily as the joint, and a strong mix in a soft wall causes the units to fail as the wall moves.

The rate for repointing is labour, and a cheap rate usually means a grinder.
$wallarticle20$,
 11, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Exterior_Wall_Decoration_and_Insulation_with_Masonry_Veneer.jpg/1280px-Exterior_Wall_Decoration_and_Insulation_with_Masonry_Veneer.jpg',
 'Maintaining Double Brick Walls: Repointing and Sealant',
 'Maintaining a double brick wall: clearing weep holes, repointing with the right mortar, resealing articulation joints and dealing with damp and salt.'
)
) AS a(slug, title, excerpt, market, content, read_time_minutes, theme, cover_url, meta_title, meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code = a.market AND t.candidate_key = 'system:au-double-brick'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots sl
SET article_id = a.id
FROM public.learn_articles a
WHERE sl.topic_id = a.wall_topic_id
  AND sl.theme_key = a.wall_article_theme
  AND sl.language_code = 'en'
  AND sl.article_id IS NULL;


UPDATE public.learn_wall_finishing_sources s
SET review_status = 'accepted', reviewed_at = now(), reviewed_by = coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid)
FROM public.learn_wall_finishing_topics t
WHERE s.topic_id = t.id
  AND t.candidate_key IN ('system:au-light-steel-frame','system:au-double-brick')
  AND s.review_status = 'pending';



UPDATE public.learn_wall_finishing_topics t
SET verification_status = 'verified', verified_at = now(), verified_by = coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid)
WHERE t.candidate_key IN ('system:au-light-steel-frame','system:au-double-brick')
  AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id = t.id AND s.review_status = 'accepted');
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER USER;
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;

COMMIT;
