-- First CA batch: five researched draft articles for the native Canadian wood frame + drywall topic.
-- CA topics are seeded by 20261024000000_global_wall_finishing_knowledge_library.sql.
-- Articles remain drafts; publication/review gates are not bypassed.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, attributed), never AI generated.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='CA' AND candidate_key='system:ca-wood-frame-drywall') THEN RAISE EXCEPTION 'CA wood frame + drywall topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('National Research Council Canada, Codes Canada','https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada','NRC Canada','The National Construction Codes as Canada''s model code system and the frame in which house construction is regulated'),
  ('National Research Council Canada, Codes Canada publications','https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications','NRC Canada','Published model codes and their adoption by provinces and territories'),
  ('Natural Resources Canada, Energy efficiency for buildings','https://natural-resources.canada.ca/energy-efficiency/buildings','NRCan','Insulation, airtightness and energy performance expectations for Canadian buildings'),
  ('ASTM C1396/C1396M, Standard Specification for Gypsum Board','https://www.astm.org/c1396_c1396m-17.html','ASTM International','Gypsum board types, thicknesses and physical requirements referenced in Canadian specification practice'),
  ('Canada Mortgage and Housing Corporation, housing professionals','https://www.cmhc-schl.gc.ca/en/professionals','CMHC','Canadian housing practice, renovation and durability guidance for residential construction'),
  ('Wood WORKS!, Canadian Wood Council','https://woodworks.ca/','Canadian Wood Council','Wood frame design, detailing and construction practice in Canada'),
  ('Canadian Home Builders'' Association','https://www.chba.ca/','CHBA','Residential construction industry practice in Canada'),
  ('Ontario Regulation 332/12 (Ontario Building Code)','https://www.ontario.ca/laws/regulation/120332','Government of Ontario','A provincial adoption of the national model code, showing how code requirements reach the site')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='CA' AND t.candidate_key='system:ca-wood-frame-drywall'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: Hanging Drywall (U.S. Navy, public domain)','https://commons.wikimedia.org/wiki/File:Hanging_Drywall_(9020064).jpg','Wikimedia Commons','Cover photograph overview article, public domain'),
  ('Image credit: Drywall and tools (Timothyjosephwood, CC BY-SA 4.0)','https://commons.wikimedia.org/wiki/File:Drywall_and_tools.jpg','Wikimedia Commons','Cover photograph materials article, CC BY-SA 4.0'),
  ('Image credit: Texaco Nanticoke drywall penetrations (Achim Hering, CC BY 3.0)','https://commons.wikimedia.org/wiki/File:Texaco_nanticoke_drywall_penetrations.jpg','Wikimedia Commons','Cover photograph installation article, CC BY 3.0'),
  ('Image credit: Drywall firestop deficiency (Achim Hering, public domain)','https://commons.wikimedia.org/wiki/File:Drywall_firestop_problem4.jpg','Wikimedia Commons','Cover photograph quality article, public domain'),
  ('Image credit: Drywall splotch (Herbert Blenstein, CC BY-SA 3.0)','https://commons.wikimedia.org/wiki/File:Drywall_splotch.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 3.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='CA' AND t.candidate_key='system:ca-wood-frame-drywall'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'CA',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='CA' AND t.candidate_key='system:ca-wood-frame-drywall'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'CA','CA',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('ca-wood-frame-drywall-overview', 'Canadian Wood Frame and Drywall: System Overview', 'A Canadian overview of the platform-framed wall and its gypsum finish: how the assembly is built, why the cold climate decides its details, and where the code, the vapour barrier and the board meet.', $wallarticle1$# Canadian Wood Frame and Drywall: System Overview

Almost every house in Canada is a wood frame building wearing a gypsum interior. The framing is dimension lumber, nailed or screwed into platform-framed walls at standard spacings. The interior face is gypsum board, taped and painted. The cavity between them carries insulation, services and a vapour barrier that exists because the climate demands it.

That assembly is not a North American default that happens to work north of the border. It is a wall designed around a specific problem: keeping a warm, moist interior away from a cold exterior for six months of the year without trapping water where it cannot escape.

## Why wood frame dominates

Wood frame construction spread across Canada for reasons that are still visible on any site: it is fast, it is forgiving of weather during construction, it suits the small-scale builder, and the material grows in the country. The engineering culture that supports it is mature and well documented, with the Canadian Wood Council and its Wood WORKS! programme publishing the design and detailing guidance that designers and builders actually use [6](https://woodworks.ca/).

The house building industry around that material has also organised itself around common practice, and the Canadian Home Builders' Association represents the part of the market that builds most of the country's dwellings [7](https://www.chba.ca/). When people talk about Canadian residential construction, they mean this: a platform-framed wood building, sheathed outside, boarded inside, insulated and sealed in between.

None of that is a claim that wood frame is the only Canadian wall. Insulated concrete forms, steel stud framing and masonry veneers all have real markets, and several appear in this library as separate systems. Wood frame is simply the one that defines what "normal" looks like.

## The anatomy of the assembly, from outside in

From the weather inward, a typical Canadian wood frame wall runs as follows. Exterior cladding, chosen for the region and the budget. A drainage plane and weather-resistive barrier over sheathing. Sheathing, usually oriented strand board or plywood, which braces the wall and provides a nailing base. Studs, dimension lumber at 38 by 89 millimetres or 38 by 140 millimetres, set at 406 or 610 millimetres on centre depending on the design and the insulation strategy. Cavity insulation, mineral wool or glass fibre batts in most houses. A vapour barrier on the warm side, almost always polyethylene, sealed at every joint, perimeter and penetration. Then the gypsum board, fastened to the studs, taped and finished.

Each layer has a job and each job is invisible from the finished room, which is precisely why each layer matters. The cladding sheds most water. The drainage plane handles the water that gets behind the cladding. The sheathing transfers wind and racking loads. The studs carry the loads. The insulation slows heat. The vapour barrier keeps interior moisture from reaching a cold cavity, where it would condense. The board provides the fire resistance, the surface and the paint base.

## Why the cold climate decides the details

Canada's heating-dominated climate reverses the direction of moisture drive for much of the year. Indoors is warm and humid from cooking, washing, breathing and plants. Outdoors in January can be minus twenty. Water vapour moves from more to less, which means it moves outward through the assembly, and it condenses wherever it meets a surface below its dew point.

The response is a system, not a product. The vapour barrier goes on the warm side so the vapour never enters the cavity. The assembly is detailed so that any moisture that does get in can dry outward. Airtightness is treated as a performance requirement rather than a virtue, because a hole in an air barrier carries far more moisture into a cold cavity than diffusion through the same area of material ever will. Energy performance, airtightness and durability are treated together in federal guidance for this reason [3](https://natural-resources.canada.ca/energy-efficiency/buildings).

The practical consequence is that a wall built in Vancouver and a wall built in Winnipeg are the same system with different numbers and different drying strategies. The logic of the build-up is common. The specification is local.

## The code frame, and how it reaches a site

Canada regulates construction through the National Construction Codes, model codes published by the National Research Council and adopted, with local amendments, by provinces and territories [1](https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada). Part 9 of the National Building Code covers housing and small buildings, which is the part that governs most of the walls described in this article.

Because adoption happens provincially, the code in force depends on where a project stands. Ontario, as one example, applies the Ontario Building Code through a provincial regulation that reproduces and amends the model code, and that regulation is what a permit is actually issued against [8](https://www.ontario.ca/laws/regulation/120332). The publications programme is the route by which the model codes and their adoption are documented [2](https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications).

For a finishing contractor the code matters at three points in this assembly. Fire and sound separations, which decide board type and thickness. The vapour and air barrier requirements, which decide whether the wall will perform. And the general workmanship and material standards that a building official can inspect against.

## The gypsum side of the system

Gypsum board in Canada is specified against the ASTM standard for the material, which defines board types, thicknesses and physical requirements [4](https://www.astm.org/c1396_c1396m-17.html). In practice the market works with a small number of choices: regular board at 12.7 millimetres for walls and ceilings, thicker or Type X board where a fire-resistance rating is required, moisture-resistant board in bathrooms and laundry areas, and cement or glass-mat products in wet areas.

The board is only half of the finish. The other half is the jointing: tape bedded in compound, feathered out in passes, sanded flat, then primed and painted. The quality of that work decides whether the wall reads as a smooth plane or as a series of faint ridges under a window's raking light, and the difference is schedule and care rather than expensive material.

## Who does what, and where the handovers are

A Canadian house wall passes through several trades. Framers erect and straighten the studs. Electricians, plumbers and heating contractors run services in the cavity. Insulators fill the cavity. A vapour barrier is installed, sometimes by the insulator and sometimes by a dedicated crew. Drywall hangers board the walls and ceilings, tapers finish the joints, and painters prime and paint.

Every one of those handovers is a place where the system can be quietly compromised. Services run diagonally through a stud line defeat a straight vapour barrier. Vapour barrier lapped the wrong way leaks at the overlap. Board screwed through the barrier without sealing leaves a pinhole that a blower door will find. Insulation compressed into a tight cavity performs below its label.

The later articles in this series take those handovers one at a time. This overview's job is to keep the whole assembly visible, because almost every defect in a Canadian interior wall is a defect of a junction rather than of a material.

## What the later articles cover

Materials deals with lumber, sheathing, insulation, vapour barrier, board types, fasteners and jointing products. Installation walks the sequence from framing check to painted wall. Quality works through the tolerances, the firestopping of penetrations and the inspection points where a wall is either accepted or quietly passed. Maintenance deals with what happens after occupancy: screw pops, joint cracks, water damage, repainting and the renovation that reinstates a barrier someone cut.

Read together they make one argument. In Canada the interior wall is a thermal and moisture assembly that happens to be decorated, and treating it as decoration is how it fails.

## Where the system strains in practice

Three places in a Canadian wood frame wall do most of the straining, and knowing them explains most of what appears on the surface later.

The first is the junction between the wall and the floor or roof structure. Wood shrinks as it dries, and a house built with lumber at fifteen per cent moisture content will lose a measurable amount of height in its first year as it comes to equilibrium with a heated interior. The finishes absorb that movement, which is why hairline cracks at ceiling joints in the first winter are so common. They are evidence of a normal process, not of a bad taper.

The second is any place where the barrier is interrupted: electrical boxes, plumbing penetrations, recessed fixtures, bathroom fans and hose bibs. Each is a small hole in a continuous membrane, and each is the point where moisture gets into the cavity in greater quantity than diffusion would ever deliver.

The third is the cavity itself in a deep cold snap. Insulation slows heat loss but does not stop it, and the outer portion of a thick insulated cavity gets cold. The detailing that keeps that zone dry is the detailing that decides whether the wall lasts as long as the house.

## What the code does not decide

The building code sets the minimum for safety, health and, increasingly, energy performance, and it is enforced through permits and inspections. It does not decide quality in the sense a householder means: how flat the wall is, how well the joints are feathered, whether the paint flashes under a window's light.

Those decisions belong to the contract, the specification and the trade's own standards, and they are the reason two houses built to the same code can feel quite different inside. A code-compliant wall is a safe wall. A good wall is a code-compliant wall plus a set of choices about workmanship that nobody legislates.

The same distinction applies to the finishing trades that follow. A drywall contractor can meet every requirement in the code and still deliver a surface that is a compromise, and the person who notices will be the one painting it.

## What the assembly costs and what that buys

A wood frame wall is cheap to build and expensive to get wrong. The materials are commodity products bought by the lift, and the labour is fast because the system is repetitive: the same stud spacing, the same sheet size, the same tape and compound sequence repeated room after room.

What the low first cost buys is a wall with almost no margin in its detailing. A masonry wall tolerates a certain amount of sloppiness because it is thick and forgiving. A frame wall with a bat of insulation pushed aside and a barrier hole behind an electrical box does not fail visibly for years, and then it fails inside the cavity where nobody can see it.

That is why the specification effort in Canadian residential work concentrates on a handful of small junctions rather than on grand materials choices. The money is well spent on sealant, on backing, on firestopping and on the time to do each of them properly.

## References

1. National Research Council Canada, *Codes Canada*.
2. National Research Council Canada, *Codes Canada publications*.
3. Natural Resources Canada, *Energy efficiency for buildings*.
4. ASTM International, *ASTM C1396/C1396M Standard Specification for Gypsum Board*.
5. Canada Mortgage and Housing Corporation, *Housing professionals*.
6. Canadian Wood Council, *Wood WORKS!*.
7. Canadian Home Builders' Association.
8. Government of Ontario, *Ontario Regulation 332/12 (Ontario Building Code)*.

## Image credit

The cover photograph shows drywall being hung by a U.S. Navy construction crew and is in the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 9, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Hanging_Drywall_%289020064%29.jpg/1280px-Hanging_Drywall_%289020064%29.jpg')
, ('ca-wood-frame-drywall-materials', 'Canadian Wood Frame Materials: Lumber, Board and Sealants', 'A Canadian materials guide for wood frame and drywall walls: dimension lumber and stud spacing, sheathing, insulation, polyethylene vapour barrier, gypsum board types and the jointing products that finish them.', $wallarticle2$# Canadian Wood Frame Materials: Lumber, Board and Sealants

The material list for a Canadian interior wall is short and nearly every item is a commodity product. That is part of why the system is cheap, and part of why it fails: commodity materials are specified by their numbers, and the numbers are the whole difference between a wall that performs and one that quietly does not.

## Dimension lumber and stud spacing

Canadian framing uses dimension lumber, still sold in nominal sizes with actual dimensions that are smaller. A two by four is 38 by 89 millimetres; a two by six is 38 by 140 millimetres. Studs are graded and stamped for species and grade, and that stamp is the structural document for the wall.

Spacing is the first specification decision. At 406 millimetres on centre, the wall is strong and the board edges land on studs at standard sheet dimensions. At 610 millimetres, less lumber is used and the cavity is deeper for insulation, at a cost in stiffness that shows up as a bouncier wall and, sometimes, as more visible joint movement. Wood frame design guidance from the Canadian Wood Council treats spacing, load and deflection together rather than as separate choices [6](https://woodworks.ca/).

Moisture content matters as much as grade. Lumber that is still wet when it is closed behind board will shrink as it dries, and a wall that shrinks after taping produces cracks at joints and screws that sit proud. Framing is expected to be near its in-service moisture content before boarding, and a builder who boards wet lumber is scheduling a callback.

## Sheathing and the weather side

Outside the studs sits the sheathing, generally oriented strand board or plywood, which braces the wall against racking and gives the cladding something to fix to. Sheathing is usually covered by a weather-resistive barrier and detailed with flashing at openings, and that outer half of the assembly belongs to the cladding and envelope trades rather than to the finishers.

It is still worth understanding, because the envelope decides how much moisture reaches the wall that the drywall protects. A wall with a failed drainage plane is a wall whose interior finishes are being asked to survive a leak, and no board or paint does that for long.

## Insulation and the vapour barrier

Insulation in a Canadian wood frame wall is usually mineral wool or glass fibre batts friction-fitted into the stud cavity. The critical instruction is that batts are not compressed: squeezing a batt into a shallow cavity reduces its effective performance and creates voids where convection loops form.

The vapour barrier is polyethylene sheet, commonly six mil, installed on the warm side of the insulation, lapped and sealed at every joint, stapled through the laps rather than through the field, and sealed with an acoustical sealant at the perimeter, at electrical boxes and at every penetration. The barrier is the assembly's moisture control layer and, in a well-detailed wall, part of its air barrier too. Federal energy guidance treats airtightness and insulation as a pair for exactly this reason [3](https://natural-resources.canada.ca/energy-efficiency/buildings).

Where a wall needs more insulation than the cavity can hold, rigid insulation goes outside the sheathing and the dew point moves, which is why the same nominal wall can have quite different build-ups in different Canadian regions.

## Gypsum board types

Board is the visible material and the one most often chosen casually. The ASTM standard for gypsum board defines the types and the physical requirements [4](https://www.astm.org/c1396_c1396m-17.html), and Canadian specification practice follows those definitions.

Regular board at 12.7 millimetres covers most walls and ceilings. Type X board, generally at 15.9 millimetres, is used where a fire-resistance rating is required, and its rating only exists as part of a tested assembly with the right fasteners, the right joint treatment and no unsealed penetrations. Moisture-resistant board, identifiable by its green or blue paper, suits bathrooms and laundry rooms, though it is water resistant rather than waterproof and does not replace a proper wet-area substrate.

Glass-mat and cement boards are used where water is genuinely expected: shower walls, tile backers, and areas subject to repeated wetting. Thicker board is used on ceilings where a flatter surface is wanted, and double-layer systems are used for sound control and for higher fire ratings.

## Fasteners

Drywall screws for wood studs are coarse-threaded, phosphated and self-embedding, with the head designed to dimple the paper without tearing it. Fine-threaded screws are for steel studs. Nails are still permitted in some applications, but screws dominate because they hold better and because a screw can be driven to a consistent depth.

Fastener spacing is specified by the application standard and the assembly being built, and it is tighter on ceilings than on walls for the simple reason that gravity is pulling the board away. Screw depth is a quality item rather than a material one: too proud and the head telegraphs through the finish, too deep and the paper is broken and the fastener has no hold.

Corrosion-resistant fasteners belong anywhere the wall will be damp, which in practice means bathrooms, kitchens and any exterior application.

## Jointing materials

Taping consumes more specification thought than it appears to. Paper tape is strong, low-profile and the default for flat joints. Mesh tape is faster and more forgiving but bulkier. Corner bead, whether metal or plastic, protects external corners and gives the trowel a line to follow.

Joint compound comes in two families. All-purpose compound does everything reasonably. Setting-type compound, mixed from powder, hardens chemically and is stronger and faster, which is why it suits repairs, deep fills and schedule-critical work. A common professional approach beds tape in setting compound and finishes with a lightweight compound that sands easily.

Primers and paints belong on the same list. A drywall primer seals the paper face and equalises suction so the finish coats develop an even sheen, and interior paints in Canada are usually water-based acrylics chosen for scrubbability in kitchens and hallways.

## What not to substitute

The materials list has a few substitutions that look harmless and are not. Sheathing substituted for drywall, or vice versa, changes the fire and structural performance of the wall. Untaped or single-coat joints under a paint that is expected to hide them produce a finish that fails the first raking light. A cheaper vapour barrier product installed without sealed laps is not a vapour barrier in any meaningful sense.

Material failures in this system are rarely about a bad batch. They are about a material used outside the role it was specified for, which is the same lesson as every other wall system in this library.

## Buying and storing

Board is damaged by the same things that damage it in service: water and impact. Sheets stored flat on a dry surface, off the ground, with the ends supported, will hang cleanly. Sheets stacked on edge against a damp wall will take a set and hang with a bow.

Lumber should be stored under cover and stacked with spacers so air can move through it. Compound should be protected from frost, because a frozen tub separates and never mixes back to the same consistency. Tape should be kept dry, since damp paper tape tears and will not bed.

## Thickness, span and why 12.7 millimetres is not universal

Half-inch board, 12.7 millimetres, is the working default for walls and for most ceilings on domestic spacing, and it is what most Canadian houses actually receive. It is not the only answer.

Where joists are spaced wider or the ceiling is required to be flatter, thicker board resists sag between supports and reads better under paint. Where a fire-resistance rating is required, the assembly's tested specification decides both the product and the thickness, and that specification cannot be improved by guesswork. Where sound separation matters, double layers or resilient channel change the assembly entirely.

The habit worth building is to check the assembly rather than the wall. The board thickness on a house plan belongs to a system, and the system is documented somewhere: on the drawings, in the fire-resistance design, or in the manufacturer's literature for the specific assembly.

## Sourcing in the Canadian market

Canadian buyers encounter a market dominated by a small number of manufacturers with regional plants, alongside imported product. Brands differ in paper, core and edge treatment, and the specification language differs with them: a board described as lightweight, standard or mould-resistant is describing a product family rather than a single item.

Where a project needs a specific performance, the route is the manufacturer's published data and the assembly listing rather than the shelf label. The same applies to joint compound: an all-purpose product and a lightweight finishing product behave differently enough that a taper will notice within one pass, and mixing brands between coats is a reliable way to produce a surface that sands unevenly.

Quantity estimation matters too, because a second delivery mid-job costs more in schedule than the surplus costs in money. A rough rule of thumb for a normal room is one sheet per ten to twelve square metres of surface allowing for waste, with more waste on rooms full of openings.

## Consumables that decide the finish

The materials that decide how a wall reads are the cheap ones: tape, compound, sandpaper, caulk and primer. A project can buy the best board on the market and ruin it with a compound applied too thick and sanded too little.

Tape choice is a good example. Paper tape needs a bed of compound and rewards a careful first pass. Mesh tape tolerates a dry application and a quick skim, which makes it popular on repairs and risky on long joints where movement is expected. Corner bead, whether metal, plastic or paper-faced, decides whether external corners stay crisp through a house move.

Sandpaper grit matters more than people expect. Too coarse and the paper face is scuffed in a way paint will not hide; too fine and the compound is burnished rather than cut, which creates a slick surface the next coat will not bond to.

Caulk and sealant belong on the consumables list too, because the junction between board and a bathtub, a window frame or a cabinet is where water gets in. A paintable acrylic suits dry junctions; a kitchen and bath sealant suits the wet ones.

## Storing board on a Canadian site

Board arrives wrapped and leaves the truck in the weather. On a Canadian site in November that matters: a wet sheet is heavier, softer and more likely to tear at the fasteners, and a sheet that has taken on water at the edges will not butt cleanly against its neighbour.

Sheets stored flat on blocking, under cover, with the wrapper still on, stay usable. Sheets leaned against a wall for a week take a bow that no taper can hide. The rule is the same one that applies to lumber: keep it flat, keep it dry, and give it time to reach room temperature before it goes on the wall.

## References

1. National Research Council Canada, *Codes Canada*.
2. National Research Council Canada, *Codes Canada publications*.
3. Natural Resources Canada, *Energy efficiency for buildings*.
4. ASTM International, *ASTM C1396/C1396M Standard Specification for Gypsum Board*.
5. Canada Mortgage and Housing Corporation, *Housing professionals*.
6. Canadian Wood Council, *Wood WORKS!*.
7. Canadian Home Builders' Association.
8. Government of Ontario, *Ontario Regulation 332/12 (Ontario Building Code)*.

## Image credit

The cover photograph shows cut sections of half-inch drywall with installation and repair tools, photographed by Timothyjosephwood and made available under CC BY-SA 4.0 via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 8, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Drywall_and_tools.jpg/1280px-Drywall_and_tools.jpg')
, ('ca-wood-frame-drywall-installation', 'Wood Frame and Drywall Installation: Boarding to Paint', 'A Canadian installation sequence for wood frame walls: framing check, services, vapour barrier, boarding, screw spacing, taping in three coats, sanding, priming and painting in a heating climate.', $wallarticle3$# Wood Frame and Drywall Installation: Boarding to Paint

Installation is where a Canadian wall either earns its performance or loses it. The trades are separate, the schedule is compressed, and the parts of the assembly that matter most are the ones nobody will see again.

This article follows the work in order, from the framing check to the painted wall, and treats the vapour barrier as the centre of gravity rather than an interruption between insulation and boarding.

## Checking the framing before anything covers it

The first job belongs to the framer, but the hanger inherits it. Studs are checked for plumb, straight and secure, plates for level, and openings for square. A stud that is crowned the wrong way, one that is twisted, or one that stands proud of its neighbours will show as a ridge or a dip in the finished wall no matter how carefully the board is hung.

Where the wall is being brought to a higher standard, studs are straightened with a plane or a shim, and backing is added anywhere a fixture will hang: cabinets, grab bars, televisions, towel rails. Backing is much cheaper now than the repair that replaces a failed fixing later.

## Services, and the penetrations they create

Electrical, plumbing and heating services run through the stud cavity, and every one of them is a future hole in the vapour barrier and the air barrier. The sequence matters: services are roughed in and inspected before insulation and the barrier go on, so that penetrations are made once and sealed once.

Penetrations are a Canadian durability issue rather than an abstract one. A cable passing through a polyethylene barrier without a sealed boot carries moisture into a cold cavity on every cold night, and a bathroom fan duct leaving through a wall creates the same problem with a larger hole. Sealing those with the correct tapes and sealants is a five-minute job that is routinely skipped.

Backing plates, nail plates and fire-rated boxes belong at this stage too, before the insulation hides the wire.

## Insulation and the vapour barrier

Batt insulation is fitted tight to the studs and to the plates, with no compression and no gaps at the corners where the wall meets the ceiling. Where a cavity is irregular, a piece is cut to fit rather than stuffed into place.

The vapour barrier follows, on the warm side, lapped and taped, sealed to the framing at the perimeter with an acoustical sealant, and carried continuously behind electrical boxes with the correct sealing method rather than cut around them. The barrier is checked before boarding, because after boarding it is a rumour.

Airtightness is verified in better Canadian projects with a blower door test, and the result is a single number for the whole house. Where a test is planned, the barrier work should assume it: the test will find every unsealed penetration, and finding them before the drywall is cheap.

## Boarding

Boards are hung horizontally on walls as a rule, which puts the tapered long edges at eye level where a joint is easiest to hide behind tape and compound, and leaves the less friendly butt joints to the corners. Ceilings are boarded first in most sequences, because lifting boards to a ceiling is easier without walls in the way and because the wall boards then support the ceiling edges.

Boards are fitted with a small gap at the floor and a controlled gap at abutting sheets, then fastened. Screws are driven to just dimple the paper without breaking it, spaced closer on ceilings than on walls according to the application standard, and kept back from board edges by the distance the standard requires so the edge does not crumble.

Openings are cut after the board is fixed, using the opening as a template, which produces a cleaner line than measuring. Corners and recesses get corner bead or a reinforced joint.

## Taping and finishing

Taping is three passes. The first beds the tape into compound over every joint, pressing it flat and wiping the excess. The second covers the tape and fills the recess formed by the tapered edges, and the third feathers the compound out beyond the joint to blend the plane.

Setting-type compound is used for the first pass where strength or speed matters, and a lightweight compound for the later passes where sandability matters. Each coat dries before the next, and in a Canadian winter that drying is slower than the label suggests, because a cold house with the heat off dries compound very slowly indeed.

Sandings between coats are light and done with a block, under a raking light. The finish level is decided before the work starts: a Level 4 finish suits most painted walls, and the higher levels exist for gloss paints and critical lighting. Corners, screw heads and any repaired area get the same attention as the flats, because paint reveals everything.

## Temperature and drying

Every product in the sequence has a temperature window, and Canadian winters make it a scheduling constraint rather than a footnote. Board, compound and paint all expect an interior above roughly ten degrees Celsius, and best practice keeps the space near twenty with some ventilation.

A house that is boarded and taped cold will hold moisture in the compound, delay the next coat, and produce a finish that sands unevenly and paints with flashing. Where temporary heat is used, it also introduces moisture as a combustion product unless it is vented, which is a trap worth knowing.

## Priming and painting

The first coat on new board is a primer or a thinned first coat that seals the paper and the compound to a similar suction. Skipping it produces a finish with dull patches over the joints, no matter how good the paint.

Finish coats are applied with a roller for even texture, cutting in first and rolling while the cut edge is still wet. Two coats are normal on new work, and the paint should be a product rated for the room: scrubbable in kitchens and hallways, moisture-tolerant in bathrooms.

## Handover checks

Before the room is handed over, a short list settles most disputes. Look along each wall under a raking light for ridges and hollows. Check that every screw is filled and no head is proud. Open and close the doors. Check that the vapour barrier was not cut behind any fixture that was installed after boarding. Confirm the fire-resisting assemblies are intact, with penetrations sealed and boxes correct.

That list takes twenty minutes and covers the failures that would otherwise surface in the first winter.

## Sequence and the other trades

The drywall schedule sits downstream of almost every other trade and upstream of two. Electrical, plumbing, heating and ventilation must be roughed in and inspected first. Insulation and the vapour barrier follow. Boarding, taping, priming and painting come last, and any trade that needs to open a wall after that point is a change order waiting to happen.

The practical consequence is that decisions about fixtures must be made earlier than householders expect. A wall-mounted television, a heated towel rail, a wall-hung vanity or a future grab bar all need backing installed before boarding, and none of them can be added afterwards without cutting a hole.

A good site sequence also protects the barrier. Services that arrive late are the ones run diagonally, with the barrier cut and taped back inexpertly, which is exactly the failure the assembly was designed to avoid.

## Hanging ceilings well

Ceilings deserve their own method because they are the surface most likely to look wrong and the hardest to repair afterwards. Boards are fixed perpendicular to the joists so that the long edges cross the framing and the short edges land on it, which reduces the number of butt joints. Joints are staggered between rows.

Lifting boards into place needs either two people or a lift, and the board must be supported while it is fastened rather than screwed up into position, which is how edges get crushed. Screws go in first around the perimeter and then across the field, working from the centre outward so the board is pulled flat rather than trapped in a bow.

Where a ceiling receives a texture or a high-sheen paint, the standard goes up rather than down. A flat matt finish hides a great deal; a gloss or a strongly lit surface hides nothing.

## Working through a Canadian winter

Winter work is normal in Canada and it brings a specific set of constraints. Boards brought in from a cold truck need time to reach room temperature and to shed surface moisture before they are hung. Compound stored below freezing may be unusable. Adhesive and sealant will not cure in the cold.

Temporary heat solves some of this and creates other problems. Unvented combustion heaters add water vapour to the air, which the fresh board and compound absorb, and the result is a slow finish that sands badly. Vented or electric heat, ventilation and patience are the combination that works.

The best winter sites schedule the interior finishing after the building is closed in, heated and dry, which is a sequencing decision made months earlier rather than a trick available on the day.

## Fixing the board, and the details that show

Fastening is where speed and quality pull hardest against each other. A screw gun with a depth-setting nose drives screws to a consistent dimple and does it quickly, which is why professional crews use one. Hand-driving the same wall takes three times as long and produces a more variable surface.

The details that show later are the ones nobody photographs: a screw driven just short of the board so it holds nothing, a screw driven through the paper so the head has no purchase, a butt joint squeezed tight with no gap so the compound has nowhere to go, and a board forced over a proud stud so the whole sheet bows.

Each of those is invisible at the time and obvious a year later as a pop, a crack or a shadow. Which is why the fastening stage is where the quality of the crew is easiest to judge: stand in the room and look along the walls before the taper arrives.

## Between boarding and taping

The interval between boarding and taping is the quietest stage and one of the most important. The room should be dry, heated and stable, and any inspection the builder intends to do should happen now, while a wrong board can still be swapped and an unfilled penetration can still be sealed.

It is also the stage at which a householder sees the assembly as it really is, bare board on studs with the barrier behind it. Photographs taken here are worth more than any taken later, because they show what is inside the wall rather than what covers it.

## References

1. National Research Council Canada, *Codes Canada*.
2. National Research Council Canada, *Codes Canada publications*.
3. Natural Resources Canada, *Energy efficiency for buildings*.
4. ASTM International, *ASTM C1396/C1396M Standard Specification for Gypsum Board*.
5. Canada Mortgage and Housing Corporation, *Housing professionals*.
6. Canadian Wood Council, *Wood WORKS!*.
7. Canadian Home Builders' Association.
8. Government of Ontario, *Ontario Regulation 332/12 (Ontario Building Code)*.

## Image credit

The cover photograph shows drywall penetrations for electrical conduit before firestopping, photographed by Achim Hering and made available under CC BY 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it illustrates the services stage that every wall assembly has to survive. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 9, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Texaco_nanticoke_drywall_penetrations.jpg/1280px-Texaco_nanticoke_drywall_penetrations.jpg')
, ('ca-wood-frame-drywall-quality', 'Accepting a Canadian Drywall Wall: Quality Gates', 'A Canadian quality framework for wood frame and drywall walls: surface tolerances, fastener and joint defects, vapour barrier continuity, firestopping of penetrations, and the inspection points that decide acceptance.', $wallarticle4$# Accepting a Canadian Drywall Wall: Quality Gates

A drywall wall is accepted or rejected long before anybody paints it, and the decision is made at a handful of points where the work is still open to inspection. This article sets out those points for Canadian wood frame construction, in the order they occur, and describes what a competent inspection actually looks for.

## Gate one: the framing and the backing

Framing is inspected for plumb, straight, level and secure, with stud spacing confirmed against the design. In Canada the wall may be carrying more than finishes: it may be part of a fire separation or a shear-resisting element, and spacing that has drifted affects both.

Backing is the second half of this gate. Any future fixing point should have solid material behind it, and the inspection is simply to walk the wall and ask what will be hung on each metre of it. A wall that passes framing inspection and later cannot hold a towel rail has passed the wrong inspection.

## Gate two: the vapour barrier and airtightness

The vapour barrier and the air barrier are inspected before boarding, because after boarding they cannot be verified without destructive investigation. The check is visual and methodical: continuous membrane, correct lapping, sealed laps, sealed perimeter, sealed penetrations, and boxes detailed so the membrane runs behind them rather than being cut away.

This is the single most consequential inspection in a Canadian interior wall. The building code requires the barrier; the climate enforces it. Federal energy guidance links airtightness to durability and performance, which is why a blower door test is the accepted proof in better projects [3](https://natural-resources.canada.ca/energy-efficiency/buildings).

## Gate three: boarding

Boarding quality is visible in four things. Fastener spacing, which should match the assembly and be tighter on ceilings. Fastener depth, which should dimple without tearing the paper. Board alignment, with tapered edges meeting tapered edges so there is a recess for compound. And board condition, with no crushed edges, no broken corners and no sheets forced into place.

Penetrations for services are checked here too, because a neat hole is easier to seal than a ragged one, and because the firestopping that follows depends on the hole being the right size.

## Gate four: flatness

Flatness is measured rather than judged. A straightedge of about two metres laid against the wall in several directions reveals hollows and humps, and the accepted tolerance for normal domestic work is a small deviation over that length, tightened where gloss paint or critical lighting is specified.

Under a raking light the wall tells the truth. A light held close to the surface and shone along the wall shows every ridge, every unfilled screw and every imperfect butt joint, and it does so while the compound is still sandable.

## Gate five: the joints

Joint quality separates competent taping from a painted-over first attempt. Tape should be fully bedded with no blisters or lifted edges, and no tape should be visible as a distinct band under the finish. Butt joints, which have no taper to hide in, should be feathered wide enough to disappear.

Cracking at joints in the first season is common in Canadian houses, and its usual causes are known: framing that was wet when boarded, a house dried out too fast by construction heat, or movement in a floor system that was not considered when the ceiling was fixed. A crack that appears in the first winter is a diagnostic clue, not automatically a defect of the taper.

## Gate six: fire separations and firestopping

Where a wall is a fire separation, its rating depends on the whole tested assembly: board type and thickness, fastener type and spacing, joint treatment, and the correct treatment of every penetration. The rating is not a property of the board alone, and a rated wall with an unsealed penetration is not a rated wall.

Photographs circulated in building-science circles show how routinely this fails in practice: a finished, painted, fire-resistance rated drywall assembly opened up to reveal electrical and mechanical service penetrations with no firestop at all. The deficiency is invisible from the room and obvious from the ceiling void.

Inspection therefore includes the penetrations, the duct dampers, the shaft and the garage separation, at the point of construction rather than at occupancy.

## Gate seven: moisture and drying

A wall should not be boarded wet, and it should not be dried violently afterwards. Framing moisture content, slab moisture and construction heat all affect the finished wall, and the Canadian winter makes the drying question sharper: heating a new house hard to dry the compound can also dry and shrink the framing around it.

Good practice keeps the space warm and ventilated rather than hot, and allows compound to dry at its own rate. Where a schedule forces speed, the answer is a setting-type compound and more time between coats, not more heat.

## Gate eight: the finish coat

The final gate is the painted surface seen as a householder will see it, in daylight, from normal viewing distance and at an angle. Ridges, flashing over joints, patches of different sheen and roller marks all belong to this gate.

A defect found here is a painting or finishing defect and is cheap to fix. A defect of flatness, vapour barrier or firestopping found here is a construction defect, and it is expensive. That asymmetry is the argument for inspecting at every gate rather than at the end.

## What an inspection record should contain

The documentary side is simple and often missing. A record of the framing inspection, photographs of the vapour barrier before boarding, a note of the board type and fire rating where applicable, photographs of firestopping at penetrations, and a final flatness check. Ten photographs and one page.

That record is what a homeowner needs when a wall cracks in the first winter, what a builder needs when a warranty claim arrives, and what a future renovation needs before somebody cuts into a barrier that everyone has forgotten about.

## Why acceptance is a process

Canadian walls fail in ways that are invisible at handover and expensive at year five. The quality system exists to catch those failures while the wall is open, which is the only time they are cheap. That is the whole justification for gates, and it is why the finish is the least important of the eight.

## Sound and privacy checks

Where a wall separates bedrooms, bathrooms or a dwelling from a garage or a neighbouring suite, sound performance is part of what is being accepted, and it is decided by details rather than by board.

The check at completion is simple and informal: stand on one side and listen while somebody talks on the other. A wall that transmits conversation clearly has an assembly problem, and the usual causes are back-to-back electrical boxes, unsealed perimeter joints, or insulation that was compressed or omitted. Penetrations and gaps matter more than the board itself, which is the same principle as the vapour barrier.

At the construction stage, the checks are visual: insulation filling the cavity fully, no shared boxes between rooms, sealant at the perimeter, and the specified board type and layer count actually installed. None of those can be verified after the paint goes on.

## Documenting with photographs

A photograph costs nothing and settles arguments. The set worth taking on any Canadian interior project is short: the framing with backing in place, the vapour barrier before boarding with its sealing visible, the insulation in the cavity, the firestopping at penetrations, the boarded wall before taping, and the finished wall under raking light.

Each photograph is timestamped on most phones and belongs in a folder named for the room. That folder is what a renovator consults five years later before drilling a wall, and what a warranty conversation needs if a defect appears.

The same habit supports quality conversations during the work. A contractor who photographs each stage is a contractor who expects to be inspected, and that expectation changes behaviour in a way no clause in a contract achieves.

## The homeowner's walkthrough

Before final payment, a householder can conduct a useful inspection with no tools beyond a torch, a two-metre straightedge and a notebook.

Walk each wall with the torch held close and almost parallel to the surface, and mark anything that shows as a ridge, a hollow or a dull patch. Lay the straightedge vertically, horizontally and diagonally in a few places. Open and close every door and window and listen for rubbing. Look at every ceiling joint under the same light. Check the corners for crushed board. Check that the paint has no roller marks or missed edges.

Then, if the building is new, ask where the fire separations are, what board was used in them and how the penetrations were sealed. A builder who can answer has built the wall properly. A builder who cannot has left something to be discovered later.

## What a tolerance really means

A flatness tolerance is a number, but its purpose is a viewing condition. The tolerance exists so that a wall seen in ordinary daylight from across a room reads as flat, and so that a wall seen under a window's raking light does not read as a series of ridges.

That is why the standard tightens whenever the finish gets glossier or the lighting gets more critical. A wall under a matt emulsion and a soft ceiling light can carry a deviation that would be unacceptable under a semi-gloss in a stairwell with a tall window.

Two practical consequences follow. The finish level should be agreed in writing before taping starts, because it changes the amount of work. And a householder who plans to repaint in a lower-sheen product should know that the wall's tolerance was set for the finish it was built for.

## Sign-off without paperwork

An inspection that produces no document did not really happen. The useful minimum is a one-page record per room: the date, the board type, the fire rating where applicable, a note that the barrier was photographed and a tick for the flatness check.

That page is not bureaucracy. It is what converts a verbal assurance into evidence, and evidence is the only thing that survives a change of owner, a change of builder or a change of memory.

## Correcting a defect without starting over

Most defects found at a gate are correctable in place. A proud screw is driven and filled. A hollow is skimmed and feathered. A tape blister is cut out, rebedded and refinished. A crushed corner is rebuilt with compound and a corner tool.

The exceptions are the ones worth knowing. A vapour barrier that was cut and left unsealed behind a boarded wall means opening the wall, and the honest response is to open it. A missed firestop in a rated separation is the same. A ceiling hung on wet lumber with insufficient fasteners may only need extra screws and re-taping, or it may need the board removed and the framing corrected.

Deciding which is which is the reason the gates are ordered as they are. Everything visible before boarding is cheap. Everything discovered after paint is a negotiation.

## References

1. National Research Council Canada, *Codes Canada*.
2. National Research Council Canada, *Codes Canada publications*.
3. Natural Resources Canada, *Energy efficiency for buildings*.
4. ASTM International, *ASTM C1396/C1396M Standard Specification for Gypsum Board*.
5. Canada Mortgage and Housing Corporation, *Housing professionals*.
6. Canadian Wood Council, *Wood WORKS!*.
7. Canadian Home Builders' Association.
8. Government of Ontario, *Ontario Regulation 332/12 (Ontario Building Code)*.

## Image credit

The cover photograph shows a finished, painted, fire-resistance rated drywall assembly with service penetrations that were left without firestops, photographed by Achim Hering and placed in the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and it is the exact deficiency this article's firestopping gate exists to catch. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 9, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Drywall_firestop_problem4.jpg/1280px-Drywall_firestop_problem4.jpg')
, ('ca-wood-frame-drywall-maintenance', 'Living With a Wood Frame Wall: Maintenance and Repair', 'A Canadian maintenance guide for drywall interiors: seasonal humidity control, screw pops and joint cracks, water damage and its early signals, repainting, and keeping the vapour and fire barriers intact through renovations.', $wallarticle5$# Living With a Wood Frame Wall: Maintenance and Repair

A Canadian wood frame interior is designed to be maintained rather than admired. It will show screw pops in its second winter, hairline cracks at a few joints, and possibly a water stain from a roof or a plumbing fault. None of that is unusual and all of it is manageable if it is read correctly.

## Seasonal humidity is the biggest single lever

The wall's performance depends on the moisture it is asked to handle, and in a heating climate the householder controls most of that. Winter indoor humidity in a well-built Canadian house is usually kept in the thirty to forty per cent range: high enough for comfort and health, low enough that the assembly's cold surfaces stay above the dew point.

Too little humidity and the house is uncomfortable and the woodwork shrinks. Too much and window condensation appears first, then frost on the inside of window frames in a cold snap, then moisture problems inside walls that nobody can see. A cheap hygrometer and a little attention is the whole system.

Condensation on windows is the household's early warning device and should be treated as one. It is the visible end of a moisture load that is also reaching the wall cavities.

## Vapour and air barriers belong to the house, not the wall

A hole cut in a vapour barrier after occupancy is still a hole. Recessed lights installed into a ceiling, a bathroom fan vented into an attic, a new exterior door, an electrical panel change, a basement renovation: each is a place where the barrier can be interrupted and is often not repaired.

Renovations in Canada should treat barrier continuity as a specific item, sealed and photographed before the new work closes it up. That habit costs little and preserves the performance the house was built with.

## Screw pops, and what they mean

A screw pop is the tip of a screw showing through the finish as the framing shrinks and the board relaxes. It is a cosmetic defect caused by a normal drying process, and it is repaired by driving or removing the offending screw, filling the dimple with a setting compound, sanding and repainting.

Where pops appear in a line across a wall, or in a pattern that follows joists, the cause may be structural movement or an assembly that was built with insufficient fasteners. A single pop is maintenance. A wall of pops is information.

## Joint cracks

Hairline cracks at tape joints in the first heating season are common and are usually caused by framing shrinkage, by a house dried out too quickly during construction, or by movement between floors and walls. The repair is straightforward: open the crack slightly, embed new tape in setting compound, feather out, sand and repaint.

Cracks that recur at the same joint every year, or that widen, should be investigated. Recurring cracks at a ceiling joint can indicate a floor system deflection problem, and recurring cracks around an opening can indicate movement that a cosmetic repair will never solve.

## Water damage, and reading the stain

Drywall reacts visibly to water, and the reaction is diagnostic. A small leak produces a stain, then a softened area, then swelling and, if it continues, a failure of the board's core. Discoloration with a defined edge suggests an event that has stopped. A stain that grows suggests an active leak.

The correct response to a water stain is not paint. It is to find the source, remediate the moisture, confirm the board is sound, and only then refinish. Board that has been wet and stayed wet loses its strength and its fire performance and may need replacing rather than drying. Where the leak has reached a wall cavity, the insulation and the vapour barrier behind the board are part of the repair.

## Mould and the cold corner

Canada's cold climate produces cold corners: junctions where insulation is thin, framing is continuous to the exterior, or a shelf of snow sits against a wall. Those are the places where warm interior air meets a cold surface and condenses.

Mould on a cold corner is a thermal problem wearing a cleaning problem's clothes. Cleaning with a biocide removes the visible growth and changes nothing about the cause. The fixes are insulation, air sealing and air movement, and they belong to a renovation rather than a Saturday afternoon.

## Repainting, and when to repaint a whole wall

Patching paint is a skill and a compromise. In a matt finish, a feathered patch often disappears. In a washable or low-sheen finish, it usually does not, and repainting the wall corner to corner is the honest answer.

Repainting a drywall room is a simple sequence: clean the surfaces, fill and sand any defects, spot prime the repairs, then apply two coats with a roller, cutting in first. Primer matters over repairs because new compound and old paint take up paint differently, and that difference is the flashing that makes a repair visible.

Bathrooms and kitchens benefit from a paint rated for the humidity and the cleaning they receive, and ceilings benefit from a flatter finish that hides minor unevenness.

## Fire separations after renovation

A renovation that adds a room in a basement, converts a garage, or opens a ceiling must respect the fire separations the house was built with. That means the correct board on the correct side of the separation, penetrations firestopped, and doors and dampers rated for the assembly.

This is one of the few maintenance topics where the right answer is usually a professional. A fire separation that has been quietly compromised during a renovation offers no warning until the night it is needed.

## A short annual routine

A Canadian household can cover most of this in an hour a year. In autumn, before the heating season, walk the rooms with a light held along the walls, note any new cracks or pops, check the humidity gauge, test the bathroom and kitchen exhausts with a tissue, and look at the attic hatch and any external wall for stains. In spring, repeat the wall walk and check the windows for condensation damage.

The routine produces a short list. Most years the list is empty, and that is the point: a wall that is watched is a wall that gets repaired while the repair is still small.

## Repairing a hole properly

A hole in drywall is the repair a householder is most likely to attempt, and the method that works is the one that treats the board as a surface rather than a void.

Small holes are filled with setting compound in two passes with a light sand between. Holes larger than a screw head but smaller than a fist need a patch: a square of new board slightly smaller than the opening, fixed to a backing piece or a repair clip, then taped and feathered. Anything large enough to need a stud-to-stud repair is a boarding job in miniature, with new board, new tape and three coats.

The failures in amateur patching are consistent. Filler applied too deep in one pass shrinks and cracks. Patches left proud are sanded into a hollow. And repairs painted without primer show as a dull patch that no amount of extra paint fixes.

## Kitchens, bathrooms and the wet wall

The interior of a Canadian house is not uniform in its exposure. Kitchens carry grease and steam, bathrooms carry sustained humidity, and laundry rooms can carry both. Those rooms ask more of the same wall system.

Paint rated for the exposure is the first line, and it should be applied over a proper primer. Exhaust fans that actually move air to the exterior are the second, and the difference between a fan that works and one that merely makes noise is measurable with a tissue held against the grille. Where moisture-resistant board was not used in a bathroom, the honest remedy is a renovation rather than another coat of paint.

The wet wall itself, the one inside a shower, belongs to tile backer systems and waterproofing rather than to painted drywall, and this library treats it as a separate assembly.

## Selling, insuring and the paper trail

A documented interior wall is worth more than an undocumented one in practical terms. When a house is sold, evidence that fire separations and vapour barriers were built and maintained answers a buyer's inspector. When a water claim is made, photographs of a dry, intact assembly before the event help separate a sudden leak from long-term neglect.

The paper trail does not need to be elaborate. A folder with the drawings, the photographs from construction, any renovation permits and the receipts for repairs is enough. Houses change hands, and the knowledge of what is inside the walls changes hands with them only if somebody wrote it down.

## Ventilation as maintenance

The single most effective maintenance action in a Canadian house is running the exhaust fans. A bathroom fan left on for twenty minutes after a shower removes the moisture that would otherwise condense inside the wall, and a kitchen hood that actually vents outdoors removes the grease and steam that would otherwise settle on every surface.

The check is physical rather than technical. Hold a tissue against the grille while the fan runs: if it holds, the fan is moving air; if it falls, the fan is noise. Ductwork crushed in an attic, disconnected at a fitting or terminated into the roof space is one of the commonest defects found in Canadian houses, and each of them turns a moisture source into a wall problem.

Filter changes, dryer vent cleaning and keeping furniture off exterior walls in winter all belong to the same category of cheap actions that protect expensive assemblies.

## When the repair belongs to a professional

Most drywall maintenance is within reach of a careful householder. Some of it is not: water damage that has spread into a cavity, a ceiling that has sagged after a leak, a fire separation that was compromised during a renovation, and any repair where the wall is structural or the moisture source is unknown.

The distinction is worth making early. A repair attempted over an unresolved moisture problem adds cost and hides evidence, and both are harder to undo than to avoid.

## Reading a wall a year later

Twelve months after handover, a Canadian interior wall has been through a full heating season and has settled into whatever it is going to be. That moment is the best time for a considered look rather than a casual one.

Walk the rooms with a light along the walls and note where cracks have appeared, whether screw heads have surfaced, and whether any ceiling or exterior wall shows a stain. Compare the list against the photographs taken at construction. A wall that has produced two hairline cracks in a season is behaving normally; a wall that has produced a line of pops under a joist is telling you something about the floor above.

Acting on that list while the defects are small is the whole of maintenance. The repairs themselves are ordinary, and the judgement about which ones to make is the part that improves with attention.

## References

1. National Research Council Canada, *Codes Canada*.
2. National Research Council Canada, *Codes Canada publications*.
3. Natural Resources Canada, *Energy efficiency for buildings*.
4. ASTM International, *ASTM C1396/C1396M Standard Specification for Gypsum Board*.
5. Canada Mortgage and Housing Corporation, *Housing professionals*.
6. Canadian Wood Council, *Wood WORKS!*.
7. Canadian Home Builders' Association.
8. Government of Ontario, *Ontario Regulation 332/12 (Ontario Building Code)*.

## Image credit

The cover photograph shows drywall board and finish reacting to a small water leak, photographed by Herbert Blenstein and made available under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the staining pattern this article's water-damage section describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 8, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Drywall_splotch.jpg/1280px-Drywall_splotch.jpg')
) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='CA' AND t.candidate_key='system:ca-wood-frame-drywall'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='CA' AND t.market_code='CA'
  AND t.candidate_key='system:ca-wood-frame-drywall'
  AND a.wall_topic_id=t.id AND a.wall_market_code='CA' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
