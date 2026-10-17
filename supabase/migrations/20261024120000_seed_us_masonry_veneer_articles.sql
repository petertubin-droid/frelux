-- Third authored US wall-finishing batch: five researched draft articles for the native US masonry-veneer-over-framing topic.
-- Nigeria is deliberately excluded (its articles are complete). Articles remain drafts; citations remain pending and publication/review gates are not bypassed.
-- Apply 20261024000000_global_wall_finishing_knowledge_library.sql first.

BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='US' AND candidate_key='system:us-masonry-veneer') THEN RAISE EXCEPTION 'US masonry veneer topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Brick Industry Association, Technical Note 28, *Brick Veneer Wood Stud Walls*', 'https://www.gobrick.com/media/file/28-brick-veneer-wood-stud-walls.pdf', 'Brick Industry Association', 'Citation for prescriptive design and construction of anchored brick veneer over wood stud backing.'),
  ('Brick Industry Association, Technical Note 28B, *Brick Veneer / Cold-Formed Steel Framed Walls*', 'https://www.gobrick.com/media/file/28b-brick-veneer-steel-stud-walls.pdf', 'Brick Industry Association', 'Citation for design and detailing of brick veneer over cold-formed steel framing, including anchor and screw selection.'),
  ('Brick Industry Association, Technical Note 18A, *Accommodating Expansion of Brickwork*', 'https://www.gobrick.com/content/userfiles/files/tn18a-Accommodating-Expansion-of-Brickwork.pdf', 'Brick Industry Association', 'Citation for movement accommodation, prescriptive veneer height limits, and expansion joint guidance.'),
  ('Brick Industry Association, Technical Note 7, *Water Penetration Resistance: Design and Detailing*', 'https://www.gobrick.com/media/file/7-water-penetration-resistance-design.pdf', 'Brick Industry Association', 'Citation for drainage wall design, flashing, and water management principles.'),
  ('Brick Industry Association, Technical Note 7B, *Water Penetration Resistance: Construction and Workmanship*', 'https://www.scribd.com/document/485543952/Tech-Note-7B-Nov-2017', 'Brick Industry Association', 'Citation for workmanship practices that govern water resistance of finished brickwork.'),
  ('Brick Industry Association, *Technical Notes index*', 'https://www.gobrick.com/resources/technical-notes', 'Brick Industry Association', 'Citation for the Technical Notes series as the governing reference literature for anchored veneer.'),
  ('ASTM International, ASTM C216, *Standard Specification for Facing Brick (Solid Masonry Units Made from Clay or Shale)*', 'https://www.astm.org/Standards/C216.htm', 'ASTM International', 'Citation for classification and physical requirements of facing brick.'),
  ('ASTM International, ASTM C270, *Standard Specification for Mortar for Unit Masonry*', 'https://www.astm.org/Standards/C270.htm', 'ASTM International', 'Citation for mortar types and proportioning requirements.'),
  ('Mason Contractors Association of America, *ASTM Standards for Brick*', 'https://masoncontractors.org/technical-talks/astm-standards-for-brick/', 'Mason Contractors Association of America', 'Citation for the relationship between ASTM C216 and C270 in veneer practice.')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='US' AND t.candidate_key='system:us-masonry-veneer'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'US','US',t.id,a.theme,'en','draft'
FROM (VALUES
  ('us-masonry-veneer-overview', 'Masonry Veneer over Framing in the United States: System Overview', 'A US-focused orientation to anchored brick and stone veneer over wood or steel stud framing, covering the cavity concept, water management, prescriptive limits, and the standards that govern the system.', $wallarticle1$# Masonry Veneer over Framing in the United States: System Overview

Across much of the United States, the most familiar house and low-rise wall of the past century tells a quiet double story. From the street it is brick, or occasionally architectural concrete masonry or natural stone: solid in appearance, permanent in demeanor, handsome in every weather. Behind that familiar face, however, the wall is almost never structural masonry. It is wood or cold-formed steel framing, sheathed, wrapped, and carrying the loads, while the masonry hangs on the outside as a facing, anchored to its backup by a modest lattice of metal ties. Builders call this assembly anchored masonry veneer, and understanding it honestly, as a drainage skin rather than a structural wall, is the key to building it well, inspecting it competently, and repairing it for decades of service.

## What the system actually is

An anchored veneer wall separates two duties deliberately. The framing, whether dimension lumber or cold-formed steel studs, resists the wind, carries the roof, and defines the structure. The veneer, a single wythe of facing brick, stone, or concrete masonry units laid in mortar, provides the appearance, the first line against rain and sun, and a real but limited contribution to durability. Between the two runs the cavity: a deliberate air space that drains the water that inevitably gets past the outer face, kept to the clear dimension the code path and the Brick Industry Association's Technical Notes require, commonly about one inch where the design keeps insulation out of the cavity. Metal ties bridge the cavity at prescribed spacings, tying the veneer to the backup without making it structural. Flashings collect what the cavity drains and deliver it outside through weep openings. In this arrangement the masonry is a rain jacket with a drainage plane, and every detail that matters exists to keep that jacket draining.

The system's anatomy rewards memorizing in the order construction visits it: sheathing, then the water-resistive and air barrier layers, then flashings at the base, openings, and intersections, then the ties as the veneer rises, then the masonry itself laid in mortar, and finally the weeps, vents, sealant joints, and clean-openings details that let the whole assembly breathe and drain in the order water travels.

## Why the United States builds it this way

The economics explain the popularity. Full structural masonry is a premium wall in most American markets, while veneer delivers the appearance, the fire performance at the surface, the low maintenance, and the resale value of masonry at a fraction of the cost, over a backup the local framing trades already build. The Brick Industry Association's Technical Note 28 documents the prescriptive path for veneer over wood studs, and Technical Note 28B extends the practice to cold-formed steel framing, so both halves of the American framing tradition have mature, published guidance. The prescriptive codes make common sizes of this wall easy to permit: the masonry code limits veneer over wood or steel stud backup to defined heights on the prescriptive path, and Technical Note 18A records those limits and the movement accommodation they presuppose.

The system earns its keep regionally in different ways: in the Southeast and Midwest it delivers wind resistance and ageless curb appeal; in the freeze-thaw North it puts a sacrificial, replaceable rain screen outside the insulation; on the seismic West Coast its light backup and ductile ties suit the ground motion philosophy of light construction. Understanding the regional accent matters, because the same technical note governs in all of them while the risks differ.

## The cavity is the wall

The single most consequential idea in this system is that the wall expects water and manages it. Rain driven across a masonry face will find paths inward, through mortar joints, through hairline separations, through the brick's own porosity. The design response is not to pretend otherwise but to route that water: down the inner face of the veneer, across flashings, and out through weeps, never contacting the sheathing or framing on the way. Technical Note 7, on water penetration resistance, treats design and detailing as the first defense, and its companion 7B treats workmanship as the second, because a drainage wall built carelessly is simply a reservoir. Every flash of insight in this article eventually returns to that principle: keep the cavity clear, keep the flashings continuous, keep the weeps open, and the wall forgives an astonishing amount of weather.

## The veneer moves, and the details let it

Brick is not inert. It expands with moisture after manufacture and tracks temperature season by season; framing shrinks slightly as it dries; stories settle microscopically under load. A veneer wall accommodates all of this through deliberately placed joints and the flexible tie connections that let the facing breathe against its backup without cracking itself. Technical Note 18A treats this movement discipline at length, including the prescriptive height limits and the location of joints at openings, corners, and intervals. The practical translation for anyone reading a set of drawings: the gaps in the masonry are not defects but engineered concessions to physics, sealed with backer rod and sealant and left alone.

## The standards that govern the work

A compact library rules this system, and knowing which document answers which question prevents most disputes. ASTM C216 classifies and sets physical requirements for facing brick, matching unit quality to exposure, including the severe weathering grades northern climates demand. ASTM C270 governs the mortar and its types, which are chosen to suit the veneer rather than to maximize strength. The Brick Industry Association's Technical Notes, 28 and 28B above all, translate the code's prescriptive requirements into design and construction guidance, and the series continues through flashing details, tie selection, movement joints, cleaning, and repair. Above all of it sit the adopted building code and the project's engineered details for anything the prescriptive path does not cover.

## What this overview does not decide

Nothing in this article should be read as a design decision. Tie type and spacing, cavity width, flashing configuration, mortar type, brick grade, joint locations, and seismic or wind requirements belong to the code path, the drawings, and the Technical Notes, and they vary by region, exposure, and building. What this overview provides is the mental model: a drainage skin anchored to a framed backup, governed by published guidance, intolerant of careless detailing, and durable exactly as long as its water management stays intact. The articles that follow take the system in construction order: materials, installation, quality control, and repair.

## The two backup traditions, and their technical pairing

American veneer rides on two framing traditions, and the technical literature treats them as siblings with different habits. Wood stud backup, the dominant residential path, is documented in Technical Note 28: sheathing, water-resistive barrier, corrugated ties fastened to studs through the sheathing, and the prescriptive limits the code path sets for height, wind, and seismic exposure. Cold-formed steel backup, the commercial and multifamily path, is documented in Technical Note 28B: heavier framing, screw-attached adjustable anchors, and the corrosion pairings the note specifies when stainless fasteners engage carbon steel anchors, including the sealing washers that keep screw penetrations from becoming water paths in their own right. A specifier who confuses the two traditions orders the wrong hardware; a builder who respects them orders ties the way the note prescribes and sleeps well.

## Structural honesty, stated plainly

The most important sentence in this overview is the one the system always repeats: the veneer carries nothing but itself and the weather. It is designed as a nonstructural facing, and every detail that pretends otherwise, a veneer asked to carry a shelf, a beam bearing on brick, a tie field expected to arrest gross structural movement, is a misunderstanding wearing a work order. The flip side is equally practical: because the veneer is separated from the structure by its cavity and connected by flexible ties, the system tolerates the small, constant movements of light framing gracefully, provided the movement joints do their engineered work. The wall's strength is its candor about what each layer is for.

## Regional accents, one wall, several climates

The same assembly speaks with a regional accent. In hurricane country the tie schedule and the code's wind provisions tighten, and the inspector's eye falls on anchor engagement. In freeze-thaw country the exposure grade of the unit and the integrity of the drainage details decide whether the face survives thirty winters or spalls in its fifth. In seismic regions the prescriptive limits flex differently, and the veneer's flexibility is a feature rather than a compromise. In the hot-humid Southeast the wall's drying potential and the vapor strategy of the backup matter most. None of these accents changes the drainage principle; all of them change which detail the local craftsman double checks.

## A builder's short reading list

The professional's stack for this system is short and readable. Technical Note 28 or 28B, matching the backup, for the prescriptive frame. Technical Note 7 and its companion 7B, for the drainage philosophy and the workmanship that delivers it. Technical Note 18A, for movement joints and height limits. The ASTM C216 and C270 specifications, for the units and the mortar. The local adopted code, for the prescriptive limits. Everything else in the literature elaborates these five, and a builder who has actually read them carries a quieter confidence than a builder who has merely heard of them.

## What the rest of this series covers

The articles that follow take the system in construction order: materials and their matched selection, the field sequence from backup verification to tooled joint, the quality program that inspects what cover-up would bury, and the maintenance that keeps drainage alive for the wall's whole life. Read together they form one continuous argument: this wall is a drainage system with a handsome face, and it rewards the people who treat it that way.

## Veneer in the American housing economy

It is worth understanding how thoroughly this system defines the American built landscape. Across suburbs, townhouse rows, school additions, retail frontages, and the masonry-clad floors of mixed-use buildings, the anchored veneer over framing is the default way Americans obtain masonry's public virtues at framing's private economy. The system also anchors a supply chain: regional brick plants, mortar and tie manufacturers, flashing system producers, and a mason contractor community whose apprenticeship tradition carries the workmanship standards the technical notes codify. When a market loses its mason contractors, the veneer system's quality floor rises quietly, because the technical notes assume a trade that can read them, and the trade takes years to grow back.

## The drainage wall in one paragraph

Because the idea deserves repetition until it is reflexive: rain crosses the face, some of it enters the outer layers, the cavity catches that water at its inner boundary, the flashing collects it at each interruption, the weeps discharge it, the ties hold the skin to the frame while dripping their shanks dry, and the backup's water management layers stand behind everything as the second line. Every detail in the system, every flashing, every weep, every drip edge, exists in service of that paragraph, and every failure in the system is a sentence of it deleted.

## References
1. Brick Industry Association, Technical Note 28, *Brick Veneer Wood Stud Walls*.
2. Brick Industry Association, Technical Note 28B, *Brick Veneer / Cold-Formed Steel Framed Walls*.
3. Brick Industry Association, Technical Note 18A, *Accommodating Expansion of Brickwork*.
4. Brick Industry Association, Technical Note 7, *Water Penetration Resistance: Design and Detailing*.
5. ASTM International, ASTM C216, *Standard Specification for Facing Brick*.
6. ASTM International, ASTM C270, *Standard Specification for Mortar for Unit Masonry*.
7. Mason Contractors Association of America, *ASTM Standards for Brick*.$wallarticle1$, 'overview', 10),
  ('us-masonry-veneer-materials', 'Selecting Materials for US Masonry Veneer Walls', 'A US-focused guide to choosing facing brick, mortar, wall ties and anchors, flashing, weep devices, and the backup wall components that make anchored veneer endure.', $wallarticle2$# Selecting Materials for US Masonry Veneer Walls in the United States

Materials selection for an anchored veneer wall is an exercise in matched systems. The brick, the mortar, the ties, the flashing, and the backup layers each appear modest in isolation and unforgiving in combination, because the wall succeeds as a drainage assembly whose parts must cooperate chemically, mechanically, and hydraulically. This article walks the decisions in the order a careful US specifier makes them, with the governing standards named where they rule.

## Begin with exposure, not with appearance

Before a brick is chosen for color, decide what climate will ask of it. ASTM C216 classifies facing brick and matches unit quality to exposure, including the severe weathering grades that freeze-thaw climates demand, and selecting below the exposure is the classic false economy: a saturated brick that survives a Georgia winter may spall disgracefully through a Michigan one. The same logic governs orientation and grade of exposure: parapets, copings, sills, and freestanding situations wet more and dry slower than protected wall fields. The technical literature is explicit that durability follows exposure, so the specification writes the climate into the material order before it writes the color.

## Facing brick: the visible half of the decision

Within the correct exposure grade, brick selection balances appearance and function. Size and layout drive the coursing arithmetic: a modular unit keeps the coursing honest with standard openings; oversize or elongated units create contemporary rhythms at the cost of detailing attention. Texture and finish affect weathering behavior, since sanded, glazed, and smooth faces shed and absorb water differently. Color and variation are aesthetic purchases made with open eyes about efflorescence and uniformity expectations. Whatever the choice, the professional habits are constant: verify the C216 grade and type on the delivery against the specification, insist on the manufacturer's certification, keep lot numbers together to avoid banding, and protect the unit from ground moisture on site, because a brick that wicks water from wet soil before installation arrives pre-saturated and primed for later problems.

## Mortar: the quiet majority of the wall's surface

Mortar occupies a fifth of the veneer's visible area and nearly all of its water-handling personality, which makes its selection more consequential than its price suggests. ASTM C270 governs the types, and veneer work typically uses the types the technical literature recommends for above-grade facing walls, balancing workability, bond, and the flexibility that lets a veneer accommodate movement. Strength is deliberately not the goal; a veneer wants a mortar compatible with the units, not a mortar that armors the joints, and the common error is specifying upward toward strength at the expense of bond and movement tolerance. Sand quality, clean water, and controlled mixing decide the mortar the crews actually place, and site practices like retempering beyond the limits, adding foreign material, or letting mortar stand beyond its useful life degrade good mortar into bad joints. Mortar is a fresh product, and its specification is a set of habits as much as a document.

## Ties and anchors: the humble hardware that carries the wall

Wall ties are the system's structural understudies: invisible, inexpensive, and entirely responsible for keeping the veneer attached to its backup. The selection follows the backup. Corrugated sheet steel ties suit wood stud backup within the prescriptive limits of the code path; adjustable, screw-attached ties suit cold-formed steel framing, with Technical Note 28B detailing the anchor and screw selection, including the corrosion pairing that matters when dissimilar metals meet, and the sealing washers the note recommends when stainless screws engage carbon steel anchors. Hot-dip galvanizing protects carbon steel ties in ordinary exposures; stainless steel earns its premium in severe marine or de-icing salt environments, and using anything less there is planting a future failure. Wire size, adjustability range, and the drip details that keep water off the tie's shank all come from the technical notes, and the field's duty is to install the specified tie rather than the convenient one.

## Flashing and weeps: the drainage hardware

The flashings are where the drainage concept becomes hardware, and their material choices trade durability against cost and compatibility. Copper and stainless steel serve for generations and take the soldering that makes base flashings watertight; sheet membranes and composite systems ease installation at the cost of careful detailing at seams and terminations; the choice belongs to the project's exposure and the details rather than habit. End dams, corner turns, and the continuity through openings are design decisions the details settle, but the material must survive the chemistry of the mortar it contacts. Weep devices, whether open head joints, wick materials, tubes, or manufactured vents, exist to keep the exit open; Technical Note 7 treats them as a required part of the drainage system, not an accessory. A flashing without functioning weeps is a bathtub.

## The backup layers the veneer depends on

The veneer's performance rides on layers installed before the first brick. The water-resistive barrier and air barrier family, the sheathing type, the opening preparation, and the backup framing's structural condition together form the wall the drainage system defends, and their compatibility, sequencing, and detailing are governed by the drawings and the Technical Notes rather than by the mason's improvisation. Adhesives, tapes, sealants, and transition membranes get selected as a system from a manufacturer's tested family wherever possible, because the drainage wall is only as continuous as its least compatible accessory.

## Lintels, shelf angles, and the structure behind the face

Openings and story transitions introduce steel into the assembly: lintels carry the veneer across openings, and shelf angles support it at floor lines on taller structures. These pieces belong to the structural design and arrive galvanized or otherwise protected against corrosion at the cavity's wet environment. Bearing details, clearances for movement, and the flashing that must integrate with each steel member are drawn, not debated, and the material specification's duty is to order them per the drawings, protected, at the right lengths and thicknesses. The veneer's dead load is real, and the hardware that carries it deserves respect in the material order.

## Sealants, backer rod, and the joints that move

Movement joints at the locations Technical Note 18A prescribes receive sealant systems selected for the joint's expected movement, exposure, and substrate compatibility. Backer rod sizing, primer selection, and the two-point contact rule that keeps sealant from bonding to three faces are materials decisions with field consequences, and the sealant is chosen for compatibility with masonry and with the backup materials it meets. The temptation to save money at the sealant line is universal and always regretted, because a failed movement joint delivers water directly into the cavity the rest of the assembly protects.

## Sample panels and the discipline of verification

The mature specification ends with a sample panel: a field-constructed representation of the brick, mortar, joint tooling, and workmanship that all parties approve before production begins. It converts aesthetic words into a physical reference, settles the mortar color question before it becomes a dispute, and gives the inspector an agreed standard to measure the work against. Alongside it, the submittal discipline verifies certifications, grades, and product data against the specification before anything reaches the wall. The materials for a masonry veneer wall are individually simple; the craft lies in honoring the relationships that make them one system.

## The takeoff, done honestly

Quantities for veneer flow from a disciplined takeoff rather than from square footage optimism. Gross wall areas come elevation by elevation, openings subtracted with an eye to coursing reality, cut allowances added at openings and corners, and a wastage factor applied for breakage, chipped units, and the ordinary losses of staging. Mortar consumption follows from the joint profile and the unit size; sand and cement or premix follow the mortar type's proportions. Ties come from the spacing schedule applied to actual framing, and flashing quantities from the real flashing profile with laps and terminations counted. FRELUX's wall-finishing estimator exists to run exactly this arithmetic for US assemblies, including the masonry veneer configurations and market prices, so a takeoff can be checked against a second calculation rather than trusted as a single guess. The estimate that respects openings, coursing, and laps is an estimate; the one that divides area by unit coverage is a hope with a decimal point.

## Backup components: ordering the invisible half

For steel stud backup, the material order includes the framing itself: studs and track at the designations the drawings name, deflection track where the head-of-wall details call for it, the correct screws in the correct finishes, and the sheathing family with its fastening schedule. For wood backup, the order respects the framing package already on site and concentrates on the water management layers, the barrier membranes, tapes, and transition details from a single manufacturer's tested system wherever possible. In both traditions the mason's material order and the framer's overlap at the tie interface, and the professional verifies the interface components, the anchors, screws, and sealing washers Technical Note 28B specifies, before the masonry mobilizes rather than after the shortage stops the coursing.

## Accessories that prevent callbacks

The small order prevents the expensive call. Drip screeds and flashing supports hold the base flashing's shape for decades. Weep devices, whether open-head-joint inserts or manufactured vents, keep the exits from being mortar-washed shut. Movement joint fillers, backer rod, and primers prepare the joints the design located. Mortar netting or cavity drainage products at flashing levels keep the droppings from drowning the drainage. Snow guards and scaffold-related items belong to site logistics rather than the wall, but the wall's own accessories deserve line items with real part numbers, because the mason who improvises hardware at the last minute is improvising the building's future.

## Compatibility thinking across the whole section

A final discipline ties the material order together: every product that touches another gets checked for compatibility, chemical, mechanical, and thermal. Flashing materials against mortar's alkalinity. Sealants against the brick, the membrane, and each other. Tie coatings against the screws that fasten them, the pairing Technical Note 28B treats carefully with its stainless and carbon steel combinations and sealing washers. Membranes against the sheathing and the tapes that join them. The wall is a chemistry set as much as a structure, and the supplier literature, read before ordering rather than after failing, is the cheapest laboratory available.

## References
1. ASTM International, ASTM C216, *Standard Specification for Facing Brick*.
2. ASTM International, ASTM C270, *Standard Specification for Mortar for Unit Masonry*.
3. Brick Industry Association, Technical Note 28B, *Brick Veneer / Cold-Formed Steel Framed Walls*.
4. Brick Industry Association, Technical Note 7, *Water Penetration Resistance: Design and Detailing*.
5. Brick Industry Association, Technical Note 18A, *Accommodating Expansion of Brickwork*.
6. Mason Contractors Association of America, *ASTM Standards for Brick*.
7. Brick Industry Association, *Technical Notes index*.$wallarticle2$, 'materials', 10),
  ('us-masonry-veneer-installation', 'Installing Masonry Veneer in the United States: Field Sequence', 'A sequenced US field guide to building anchored masonry veneer: backup preparation, flashing first, layout and coursing, mortar and bond, tie placement, weeps, movement joints, and workmanship that keeps water out.', $wallarticle3$# Installing Masonry Veneer in the United States: A Sequenced Field Guide

A veneer wall is built in an order that surprises people who meet it for the first time: the most important waterproofing happens before the first brick is laid, the wall's future is decided in details that will never be seen again, and the masonry itself, the visible half of the work, is almost the punctuation of a drainage story. This article walks the US practice in the order the work actually proceeds, from backup verification to the final tooled joint.

## Verify the backup before anything touches it

The mason inherits a wall, and the first professional act is to read it. Framing to the drawings, sheathing intact and fastened per schedule, water-resistive and air barrier layers installed and lapped correctly, openings prepared and flashed, and the veneer's bearing surfaces ready. Technical Notes 28 and 28B describe the relationships the veneer assumes on wood and steel backups respectively, and any defect in those assumptions is cheapest to correct before the mason's materials arrive. Coordinate the anchor or screw layout with the stud spacing on steel backup, confirm the tie locations the details require will land on framing, and resolve conflicts with the backup trades while the wall is still open to negotiation.

## Flashing first, always

The discipline that separates durable veneer from litigation is the sequencing rule: flashings are installed before the masonry covers them. Base-of-wall flashing above the foundation, continuous through the cavity and out beyond the wall face, with end dams at terminations. Window and door openings flashed and integrated with the wall's water management layers, so that water arriving at a sill leaves the building rather than entering it. Copings, parapets, and intersections each receive their drawn details before the units that will bury them. None of this can be inspected later, so none of it can be improvised casually: the drainage wall detailed in Technical Note 7 works only if the collection system is continuous, and continuity is installed downward from the top, piece by piece, before it is covered.

## Layout, the story pole, and honest coursing

Veneer layout is the quiet craft that makes the finished wall look inevitable. The mason establishes the bond pattern, verifies coursing heights against the openings with a story pole, sets the first course against the structure, and adjusts so that cut units fall where the pattern can absorb them. Modular coordination with window and door heights, sill slopes, and the building's datum lines belongs to this stage, and an hour spent on layout saves days of awkward cutting. The expansion joints and movement joint locations from Technical Note 18A are marked on the wall during layout, because joints are design features that cannot be retrofitted gracefully into a wall that forgot them.

## Mortar in the field

Mortar arrives as a proportioning discipline. Batch to the specified type and proportions, mix with clean water and consistent sand, keep the mixing time uniform, and honor the limits on retempering and board life the standard and the manufacturer impose. The workability the mason loves is real but bounded: mortar that has stiffened with age gets retempered within limits or discarded, never revived with casual additions. In hot weather the crew shades materials and wets units per the hot weather guidance; in cold weather the work protects fresh mortar from freezing, because a joint that freezes young never develops the bond it was designed for. Protecting the fresh wall at day's end and across weather events is not superstition; it is the reason some walls look new for decades.

## Laying the veneer: bond, tooling, and the air space

The laying work itself is rhythm: a full bed of mortar, the unit placed to the line, joints filled rather than smeared, and the cavity respected. Tooling matters more than it appears: dense, well-tooled concave or weather joints shed water and resist weathering best, and Technical Note 7B's workmanship guidance exists because the difference between sealed and leaky veneer is made at this level of care. Keep the air space clear as the wall rises, mortar droppings are the classic clogging failure, and where details call for keeping open paths to the weeps, install the drainage materials the drawings specify. Place ties as the courses rise, embedded in the mortar joint at the spacing the code and details require, engaged with the backup per their type, never omitted to save a climb, and never bent to fit careless layout. The veneer gains nothing from a tie skipped; the future gains a hazard.

## Weeps, vents, and the exits that must never close

The wall's drainage works only if its exits stay open. Weep openings at the base flashing, at sills, and wherever a flashing terminates, get installed at the spacing the technical notes prescribe and protected from mortar droppings with the details the drawings specify, whether mesh, pea gravel, or manufactured devices. Vents near the top of the cavity, where the details call for them, complete the air path that keeps the cavity dry between storms. The inspection habit that protects all of it: at every flashing, before the course above closes the space, look into the cavity and see daylight at the exits, or do not lay the next course.

## Movement joints and dissimilar materials

At the locations the design and Technical Note 18A prescribe, the mason stops the bond and builds the joint: backing, sealant over backer rod, and the engineered separation that lets the wall's materials move independently. Joints at offsets, changes of backing, story levels, and the prescriptive intervals in long walls are not suggestions, and the crew that omits them to save material is trading sealant for future cracking. Where veneer meets dissimilar materials, sealant joints with proper backer rod close the connection flexibly, because the one thing a veneer must never do is bond rigidly to a material that moves differently.

## Cleaning, protection, and closeout

Fresh veneer is cleaned as it goes, with the gentle methods the technical notes recommend for the unit type, before mortar smears carbonate onto the face. Protect completed work from other trades, keep scaffolding from staining and impact, and walk the finished wall at closeout: joints tooled, joints cut, weeps open, sealant complete, ties verified in the inspector's record, and the sample panel's standard met. The wall that photographs beautifully at closeout is the same wall that drains quietly for fifty years, and both are decided by the sequence described here.

## Lintels, bearings, and the loads the veneer actually has

Across openings, the veneer is carried on lintels sized by the structural design, and the installation respects the bearing details the drawings show: bearing lengths, bearing surfaces, and the clearance that lets the veneer move without cracking itself on its own support. The flashing over each lintel integrates with the opening's water management rather than stopping at the steel, and the joints at the lintel's ends land where the movement discipline expects them. Nothing about a lintel is decorative, and the crew's responsibility is placement per the drawings, protection of the steel's coating, and the mortared seat the bearing requires. A veneer wall's cracks most often begin at a bearing that was improvised, and the discipline here is simply to refuse to improvise.

## Sills, copings, and the details that decide weathering

Sills, copings, and parapet caps are where weather concentrates, and their installation is the wall's exam. Stone and precast sills set on continuous flashing with end dams, projected drips that throw water clear of the face below, and sealed joints where sections meet. Copings over parapets receive their drawn caps and flashing continuous under them, with the joints tooled and sealed as the details require. The mason who rushes a coping because the schedule is tight is choosing the wall's least forgiving location to save twenty minutes, and the water will hold the grudge on the interior finish below. Detail work at the top of the wall is worth whatever it costs in attention, because everything below it depends on staying dry.

## Hot, cold, and the weather that changes the work

Mortar and fresh masonry are sensitive to weather, and the field provisions are published discipline. In hot weather, shade the materials, cool the mixing water, dampen the units where the unit's absorption calls for it, and protect the fresh wall from rapid drying, because a joint that flash dries never cures to its design. In cold weather, heat the materials as the guidance allows, avoid laying units colder than the provisions permit, and protect the fresh wall from freezing, because a frozen joint is a permanent weakness wearing a normal face. Wind matters too: fresh tall walls braced per the scaffolding and safety plan, and work stopped when the weather outruns the provisions. Weather is not an excuse in this trade; it is a schedule input the standards have already priced.

## Trade coordination and the sequence of the building

The veneer is a tenant in a crowded building. The flashing integrates with the roof's edge and the window installers' details; the ties coordinate with the framing inspection; the weeps must survive the landscaper's mulch and the mason's own droppings; and the cleaning at the end must not undo the sealant work of the trades before it. The professional sequence negotiates these interfaces at layout, in writing, with the other trades' foremen, because the wall's details are a chain of custody for water, and every interface is a handoff that either holds or leaks. A mason who builds the wall as a citizen of the building, rather than as a solo performance, delivers a wall that drains on the day the certificate of occupancy is signed.

## The pre-cover choreography

Before each course closes the cavity behind it, a small ceremony repeats: photograph the flashing, count the ties against the schedule, look into the cavity and see it clear, see daylight at the weeps, and lay the next course. The ceremony takes minutes and is the only inspection that cannot be reconstructed later, so the professional sites institutionalize it as a rhythm, not a paperwork drive. The record it produces, dated and attached to the elevation, is the wall's biography and the crew's insurance, and the crews that keep it never argue about who was responsible; the wall simply tells them.

## The scaffold, the site, and the public

The veneer rises from scaffolding in occupied environments more often than not, and the professional sequence treats the public side as part of the work. Walk-through protection, falling-material containment, scaffold ties that do not scar the finished wall, and staging that lets the mason reach every joint at the right angle are logistics that read directly in the finished coursing. Housekeeping below, covered mortar piles, and unit stacks kept dry and covered are not cosmetics; they are the conditions that produce the workmanship the technical notes require, because a mason working over mud and chaos cannot deliver a wall that drains.

## References
1. Brick Industry Association, Technical Note 28, *Brick Veneer Wood Stud Walls*.
2. Brick Industry Association, Technical Note 28B, *Brick Veneer / Cold-Formed Steel Framed Walls*.
3. Brick Industry Association, Technical Note 7, *Water Penetration Resistance: Design and Detailing*.
4. Brick Industry Association, Technical Note 7B, *Water Penetration Resistance: Construction and Workmanship*.
5. Brick Industry Association, Technical Note 18A, *Accommodating Expansion of Brickwork*.
6. ASTM International, ASTM C270, *Standard Specification for Mortar for Unit Masonry*.$wallarticle3$, 'installation', 10),
  ('us-masonry-veneer-quality-checks', 'Quality Checks and Common Defects in US Masonry Veneer', 'A practical US quality-control guide for anchored masonry veneer: pre-cover inspections of flashing and ties, cavity discipline, workmanship standards, the recurring defects, and the correction sequences that hold.', $wallarticle4$# Quality Checks and Common Defects in US Masonry Veneer

Quality control in an anchored veneer wall is mostly archaeology prevented. The features that decide the wall's fate, the flashings, the ties, the clear cavity, the open weeps, are buried by the work that follows them, so the inspection discipline centers on catching everything before it disappears. This article sets out the checks in the order they matter, then catalogs the defects that recur across US construction and the corrections that actually hold.

## Inspect the backup wall as the mason's first act

The quality program begins with acceptance of the inherited wall: framing aligned to tolerances, sheathing undamaged and fastened per schedule, water-resistive and air barrier layers lapped and taped per their manufacturer, openings prepared and flashed, and the anchor or screw layout coordinated with the backup framing. Technical Note 28B describes the requirements steel backup brings, and the wood-stud equivalent in Technical Note 28 does the same for its tradition. Discrepancies are escalated to the responsible trade before masonry mobilizes, because the veneer's alignment can never be better than the backup's honesty.

## The pre-cover inspections that cannot wait

Three inspections must happen while the cavity is open, and each one is cheap compared to its alternative. First, flashings: continuous through the cavity, turned up at ends and dams, lapped and sealed per the details, integrated with the wall's water management layers at every opening. Second, ties: correct type for the backup, at the spacing the code and drawings require, embedded in the joint mortar and engaged with the backup, without the omissions and bent shanks that careless rigging leaves. Third, the cavity: clear of mortar droppings at every flashing level, the air space at its required dimension, and the drainage path from inner face to weep unobstructed. These three are recorded with photographs and signed, because the wall's later life will be interpreted through whatever record exists, and no record means no defense.

## Workmanship on the visible face

The exposed surface is judged against the sample panel and the technical notes' workmanship guidance. Full mortar joints, properly tooled into the dense, weather-shedding profiles that Technical Note 7B documents as the workmanship half of water resistance, are the standard; smeared, shallow, or untooled joints are the beginning of a leak, whatever they look like from the curb. Alignment, level coursing, plumb, and the bond pattern are checked with the usual instruments, and tolerances are held to the project's stated values, not to the eye's forgiveness. Cleaning belongs to quality as well: mortar smears removed with the gentle methods appropriate to the unit, efflorescence addressed as a moisture symptom rather than scrubbed as a stain, and the wall left looking like the sample panel it was promised to resemble.

## The recurring defects, from cause to correction

The catalog of veneer defects is stable across regions, and each entry rewards study because each is preventable. Efflorescence, the white salt bloom on new walls: moisture moving through the assembly dissolving and depositing salts; prevented by dry materials, covered stock, and a functioning drainage path; corrected by solving the moisture source first and the cosmetic residue second. Spalling faces in freeze-thaw climates: saturated units freezing; prevented by correct exposure grade selection and detailing that keeps water moving outward; corrected by unit replacement and the moisture review that explains why. Cracked or stepped mortar joints above openings: movement unaccommodated or bearing details wrong; prevented by the joint discipline of Technical Note 18A and correct lintel bearing; corrected by repointing after the movement path is fixed. Weeps clogged with droppings: cavity discipline failed; prevented at installation with the drainage details; corrected by reopening the exits and, where needed, opening the wall's first course honestly. Ties omitted or corroded: rigging or specification failure; prevented by the pre-cover count; corrected, when discovered later, by the engineered remediation a professional designs rather than a patch guessed at. Bulging veneer: the gravest entry, water in the cavity, tie failure, or both; this defect stops the do-it-yourself conversation immediately and belongs to qualified structural review.

## Reading stains and learning the wall's language

A veneer wall communicates its problems in stains and openings, and quality control includes literacy. Dark streaks below sills and weeps mean the drainage is working or failing, and the difference is read in whether the staining is localized at exits, which is normal, or spreading across the field, which is not. Efflorescence lines tracing mortar joints mean moisture is moving through the joints rather than down the cavity. Interior dampness at window corners points to the opening integration rather than the wall field. The professional reader treats each mark as a datum, locates the moisture path behind it, and corrects the path rather than the paint.

## Records that outlast everyone

The stage-gate record is the inspection program's memory: dated photographs of flashings before cover, tie counts by elevation and course band, the approved sample panel, the mortar certifications, and the closeout walkthrough's punch list with its corrections. Stored with the building's documents, the record converts every future question, from warranty claims to renovation openings, from speculation into lookup. Buildings are remembered only as well as they are documented, and veneer walls are buried architecture almost by definition.

## The philosophy, compressed

Inspect before covering, verify against references rather than memories, correct causes rather than appearances, and write down what was verified. A veneer wall built under that discipline gives its owners nothing to notice for decades, which is precisely the point.

## Tolerances, instruments, and what straight means

The veneer's geometry is judged with instruments, not with the eye's generous forgiveness. Lines and levels verify coursing and openings, straightedges find bow and alignment across the face, and the project's stated tolerances, in the specification and the technical notes, convert those readings into accept or correct. The panel points and story heights are checked against the structure's own datum, because a veneer that is internally perfect but disagrees with the building's window bands is a defect the architect will find without a level. Sampling matters: a measured bay per elevation, checked and recorded, tells more than a hundred casual glances, and the record's pattern is what the punch list acts on.

## The stage-gate protocol, veneer edition

The inspection program that works on this system has four gates, each with a name, a date, and a photograph. Gate one accepts the backup: framing, sheathing, and water management layers verified before the mason mobilizes. Gate two is the flashing gate: every flashing level inspected, continuous, dammed, and integrated, before the masonry above it is laid. Gate three is the tie and cavity gate: counts verified, embedment checked, cavity clear, weeps open to daylight. Gate four is the finish gate: joints, alignment, cleaning, sealant, and the sample panel comparison walked under the project's lighting. Gates two and three are the wall's conscience, and the record they produce is the difference between a building that can prove itself and a building that can only promise.

## Sample panel and mockup discipline

The sample panel earns its cost at the first dispute it prevents. Built with the project's brick, mortar, tooling, and workmanship, approved by all parties, and maintained on site as the reference, it converts adjectives into evidence: what shade the mortar really dries to, how the tooling really reads at distance, how the cleaning really performs. On large projects a mockup bay, with its opening details, flashing, ties, and sealant, extends the panel into three dimensions and rehearses the crew on the actual details before production. The punch list then has a referee, and the referee lives on site, which is the only place a standard can actually be applied.

## Viewing conditions: judging a wall with light

A veneer is read at distance and under the sun, and acceptance recognizes that. Color variation that disappears at the curb is not a defect; banding from mixed lots reads at any distance and is. Joints and coursing are judged from the viewing distances the specification contemplates, and the cleaning standard is agreed against the panel under actual daylight rather than under the scaffolding's shade. The inspector who judges a wall at nose distance and the one who waves it past from the parking lot are both wrong; the discipline is to agree on the light and the distance before the argument, which is why the sample panel and the walkthrough exist.

## Reject, repair, or accept, in three honest classes

Every finding falls into one of three classes, and the classification is where the judgment lives. Cosmetic and stable, a color variation, a minor tooling irregularity at an elevation's end: accept or touch up, document, and move on. Reparable, a defective joint, a missing weep insert, a sealant failure: correct per the technical notes, verify, and document the correction. Systemic, omitted ties across a course band, flashing discontinuity, cavity clogging through a story: stop, evaluate the extent, and design the correction rather than patching the symptom, because a systemic defect is a process failure that will keep producing until the process changes. Quality control that cannot classify cannot decide, and indecision at this scale is simply deferred cost.

## Efflorescence and the new wall's first winter

A word deserves its own section because it frightens more owners than it should. Efflorescence, the white salt residue that blooms on new masonry, is common on young walls as construction moisture dries out of the assembly, and it is a cosmetic event with a diagnostic value: it proves water is moving through the material. The correct response is patience first, gentle removal second, and investigation third, because efflorescence that recurs each winter on the same courses is telling the steward exactly where the drainage is failing, a gift wrapped in an ugly bow. Quality control reads the bloom; maintenance acts on the path it traces.

## Documentation that survives the warranty

A closing word on the paperwork, because veneer quality control ends as a record-keeping discipline. The accepted backup, the photographed flashings, the counted ties, the walked finish, and the signed gates belong together in a closeout package indexed by elevation, filed with the building's permanent documents rather than in a trailer that leaves with the superintendent. Five years later, when an owner asks why a stain appears below the third-floor window, the package answers with a photograph of the sill flashing as installed. The walls that age gracefully are the walls whose owners can prove how they were built, and the proof is assembled, brick by brick and photograph by photograph, during the weeks this article describes.

## References
1. Brick Industry Association, Technical Note 7B, *Water Penetration Resistance: Construction and Workmanship*.
2. Brick Industry Association, Technical Note 28B, *Brick Veneer / Cold-Formed Steel Framed Walls*.
3. Brick Industry Association, Technical Note 18A, *Accommodating Expansion of Brickwork*.
4. ASTM International, ASTM C216, *Standard Specification for Facing Brick*.
5. Brick Industry Association, *Technical Notes index*.$wallarticle4$, 'quality', 10),
  ('us-masonry-veneer-maintenance-repair', 'Maintaining and Repairing US Masonry Veneer Walls', 'US-focused guidance for the long care of anchored masonry veneer: inspection rhythms, drainage upkeep, repointing craft, efflorescence and spalling response, and the signs that call for professional review.', $wallarticle5$# Maintaining and Repairing Masonry Veneer Walls in the United States

A well-built veneer wall is one of the lowest-maintenance skins in American construction, and that reputation is exactly the trap. Because the wall asks so little, buildings ask nothing for decades, until the neglected half of the system, the drainage and its hardware, quietly fails. Maintenance of anchored veneer is therefore less about masonry repair than about stewardship of water management, punctuated by skilled tuckpointing when the mortar ages. This article covers the rhythms, the repairs, and the boundaries between them.

## How the system ages

The masonry half of the wall weathers predictably: mortar joints erode slowly under rain and thermal cycling, faces may spall in freeze-thaw climates if units stay wet, and efflorescence blooms whenever moisture moves salts through the assembly. The drainage half ages by clogging and corrosion: weeps collect debris, flashings stiffen and tear at terminations, sealant joints at movement locations lose elasticity, and ties, if water saturates the cavity for years, corrode where their galvanizing was thinnest. Almost every serious veneer failure in service traces to the drainage half rather than the masonry, and almost every visible symptom, stain, crack, bulge, damp interior, is the drainage announcing its neglect.

## The annual walk, done properly

Once a year, in daylight, walk the wall with intent. Read the weep openings at the base and sills: open and dry is health, blocked or stained is work. Read the sealant joints at corners, windows, and movement joints for cracking or adhesion loss, and note any that have hardened visibly. Read the mortar joints for receding, cracked, or missing sections, especially above openings and at parapets. Read the face for new cracks, stepped joints, efflorescence, or staining patterns, and photograph anything worth remembering. Downspouts, gutters, grading, and splashback belong to the walk because water sources around walls decide water loads inside them. Ten minutes of annual attention per elevation is the entire preventive budget a veneer asks, and the walk repays it for decades.

## Repointing, the craft renewal

When mortar joints recede or crack, the renewal is repointing, and the craft lies in matching and restraint. Deteriorated mortar is removed to a sound depth without chiseling the units' arrises, the cavity is kept closed to debris, the joint is dampened, and new mortar is placed in lifts and tooled to match the original profile and color. The mortar is selected for compatibility with the original, generally matching the type and hardness rather than upgrading to a high-strength mix, because a joint stronger than its units transfers stress to the brick and turns joint repair into brick repair. Color matching, sand matching, and a trial panel in an inconspicuous area prevent the wall from becoming a patchwork quilt. Done well, repointing is invisible after weathering and adds decades; done badly, with thin smears over unsound joints, it is cosmetic deceit that must be repeated at higher cost.

## Efflorescence, spalling, and the moisture lesson

Efflorescence is treated in the order the physics dictates: find and stop the moisture source, then clean the residue with the gentlest effective method, dry brushing first, and only then consider specialized cleaning if the appearance demands it. High-pressure washing that forces water into the assembly is the classic self-inflicted wound, because the pressure that removes the salt also loads the wall with the water that brought it. Spalling faces in northern climates mean the unit froze wet, and the repair sequence begins with the moisture review, sill drips, coping integrity, weep function, before any unit replacement, because replacing the brick without treating the wetting merely schedules the next spall.

## Cleaning, gently and correctly

Periodic cleaning keeps veneer handsome and harmless when the methods respect the material. Gentle water and soft brushes handle ordinary soiling; proprietary masonry cleaners, used strictly per their instructions and dwell times, handle biological growth and atmospheric grime; and the temptation of the pressure washer is resisted until the method has been checked against the unit's guidance and the wall's drainage openings, with the technical notes' cleaning guidance as the arbiter. Whatever dissolves or scours the surface, whatever drives water inward, and whatever is mixed by enthusiasm rather than instruction belongs nowhere near the wall.

## The drainage maintenance nobody sees

The invisible upkeep is what the wall depends on: weeps reopened with care when blocked, sealant joints renewed on schedule rather than on failure, gutters and downspouts kept clear so the wall's water load stays at design assumptions, vegetation and soil held back from the face, and any interior dampness investigated at the wall rather than at the drywall. When a wall is opened for renovation, windows, doors, additions, the flashing and tie details disturbed by the work are restored to the drawn configuration, because the renovation that ignores drainage details buys a localized failure at the renovation's edge.

## When to stop and escalate

Certain findings end the maintenance conversation and begin the professional one: bulging or outward movement of the veneer, which suggests water and tie trouble behind the face; stepped cracking that recurs after repointing; corroded ties or shelf angles exposed by any opening; long-term saturation with stained, soft, or deteriorating masonry over broad areas; and any condition suggesting the backup framing, sheathing, or structural support is involved. These are structural conversations with qualified review, engineered remediation, and documentation, and treating them as repair projects is how small problems become large claims. The boundary is not a hedge but the honest reading of a system whose serious failures hide behind a handsome face.

## The long view

Maintained with attention, a veneer wall outlasts its owners' tenure and most of its own repair records. The economics are almost unfairly favorable: the system asks for an annual walk, timely sealant, an occasional repointing campaign, and protection of its drainage details during other work, and in exchange it delivers a century of handsome, fire-resisting, low-attention service. The walls that fail are nearly always the walls nobody walked, and the walk costs almost nothing.

## A seasonal calendar for the steward

The veneer's maintenance year is short and worth keeping. Spring: walk the walls after the freeze season, read the weeps, and look for the efflorescence that winter's moisture deposited; check the gutters the melting handed off. Summer: the repair window, repointing campaigns, sealant renewals, and cleaning done in weather that lets materials cure honestly. Autumn: the drainage audit, gutters, downspouts, grading, and any vegetation reaching for the face, all corrected before winter tests them. Winter: watch the ice and the staining it leaves, and plan rather than repair, because frozen walls forgive neither mortar nor sealant applied in the cold. Four short visits a year, and the wall writes a quiet biography.

## The steward's kit

The recurring work needs a modest kit kept together and inventoried: a repointing set of chisels, rakes, and a hawk; the matching mortar materials in sealed containers; soft brushes and the approved cleaner for the unit type; sealant, backer rod, and primer compatible with the previous joints; a small mirror and light for reading weeps at the base; a camera for the record. The kit's virtue is friction reduction: maintenance that begins with a search for materials ends as a project, while maintenance that begins with a ready kit ends in an afternoon.

## Renovations, additions, and protecting the drainage during them

The wall's most dangerous year is the year someone else works near it. Window replacements disturb the openings' integration; additions cut flashings and tie fields; painters and insulation contractors seal the weeps or vent paths that the drainage needs; landscapers bury the base flashing's termination in soil and mulch. The steward's role during any renovation is to hold the drawings and the Technical Notes up to the proposed work, insist that disturbed flashing, ties, and weeps are restored to the drawn configuration, and document the wall's condition before and after. A renovation that treats the veneer as scenery rather than a drainage system will eventually present the bill, and the bill arrives as a stain on an interior finish.

## Records, drawings, and the wall's memory

A maintained wall accumulates a file worth keeping: the original drawings and specifications where they exist, the inspection walks with their photographs, the repointing and sealant campaigns with materials and dates, and the record of any professional evaluations. The file converts every future question, the warranty claim, the buyer's inspection, the renovation's design, from archaeology into reading. For older buildings the file begins now, with a baseline walk and photographs of every elevation, because a record started late is still a record, and the wall's memory is the steward's only durable tool.

## Warranty, insurance, and the paper trail's quiet value

When veneer problems reach the professional stage, the paperwork decides the economics. Warranty claims require proof of construction details the claimant often no longer has; insurance evaluations ask what maintenance was performed and when; remediation designs ask what the original details intended. The steward who photographs flashings during any opening, who keeps the sealant and repair records, and who walks the wall annually holds the evidence that turns disputes into arithmetic. The wall was designed with published guidance; the owner who can show the wall was maintained per that guidance holds the better side of most conversations that follow.

## Closing the loop with the builder's literature

The steward's last habit is to keep the technical literature close: Technical Notes 7 and 7B for water, 18A for movement, 28 and 28B for the assembly's prescriptive frame, and the cleaning and repair notes the Brick Industry Association maintains for the situations this article could only outline. The notes are written for exactly the audience this article serves, the owner and the tradesperson who want the wall to outlast them, and they are revised as the industry learns. The wall ages honestly; the literature keeps pace; the steward who reads both is never surprised.

## The economics of attention

The numbers behind veneer stewardship deserve a plain statement, because the discipline is easier to keep when its arithmetic is visible. The annual walk costs an hour or two per building. Sealant renewal, done on schedule, costs a fraction of the interior damage a failed joint admits. Repointing a wall in its middle age costs a fraction of rebuilding veneer that neglect has pushed to structural failure. The catastrophic repairs, bulging sections, tie remediation, water-damaged interiors, are almost never acts of weather; they are the compound interest of deferred small maintenance, charged at usurious rates. The owner who internalizes that arithmetic spends the small sums with a light heart, and the wall pays the investment back in decades of silence.

## References
1. Brick Industry Association, Technical Note 7, *Water Penetration Resistance: Design and Detailing*.
2. Brick Industry Association, Technical Note 7B, *Water Penetration Resistance: Construction and Workmanship*.
3. Brick Industry Association, Technical Note 18A, *Accommodating Expansion of Brickwork*.
4. ASTM International, ASTM C216, *Standard Specification for Facing Brick*.
5. Brick Industry Association, *Technical Notes index*.$wallarticle5$, 'maintenance', 10)

) AS a(slug,title,excerpt,content,theme,read_time_minutes)
JOIN public.learn_wall_finishing_topics t ON t.market_code='US' AND t.candidate_key='system:us-masonry-veneer'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
WHERE NOT EXISTS (SELECT 1 FROM public.learn_articles existing WHERE existing.slug=a.slug)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='US' AND t.market_code='US'
  AND t.candidate_key='system:us-masonry-veneer'
  AND a.wall_topic_id=t.id AND a.wall_market_code='US' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en'
  AND a.slug IN ('us-masonry-veneer-overview', 'us-masonry-veneer-materials', 'us-masonry-veneer-installation', 'us-masonry-veneer-quality-checks', 'us-masonry-veneer-maintenance-repair');

COMMIT;
