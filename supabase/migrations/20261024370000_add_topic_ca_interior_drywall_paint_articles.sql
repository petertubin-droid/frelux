-- Fourth CA batch: five researched draft articles for the native Canadian interior drywall to paint topic.
-- Articles remain drafts; publication/review gates are not bypassed.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, attributed), never AI generated.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='CA' AND candidate_key='assembly:ca-interior-drywall-paint') THEN RAISE EXCEPTION 'CA interior drywall to paint topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('CGC Inc. (CertainTeed Gypsum Canada)','https://www.cgcinc.com/','CGC Inc.','Board products, finishing systems, finish levels and installation guidance for Canada'),
  ('National Gypsum Company','https://www.nationalgypsum.com/','National Gypsum','Gypsum board, joint compound and finishing accessory technical data'),
  ('Dulux Canada','https://www.dulux.ca/','Dulux Canada','Interior primer and paint systems, surface preparation and recoat guidance'),
  ('Benjamin Moore Canada','https://www.benjaminmoore.com/en-ca','Benjamin Moore','Primer selection, sheen choice and coating application guidance'),
  ('National Research Council Canada, Codes Canada','https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada','NRC Canada','The National Construction Codes as the model code system for Canadian buildings'),
  ('National Research Council Canada, Codes Canada publications','https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications','NRC Canada','Published model codes and their adoption by provinces and territories'),
  ('Natural Resources Canada, Energy efficiency for buildings','https://natural-resources.canada.ca/energy-efficiency/buildings','NRCan','Airtightness, insulation and moisture expectations that bear on interior finishes'),
  ('Canada Mortgage and Housing Corporation, housing professionals','https://www.cmhc-schl.gc.ca/en/professionals','CMHC','Canadian housing practice, moisture control and renovation guidance'),
  ('Ontario Regulation 332/12 (Ontario Building Code)','https://www.ontario.ca/laws/regulation/120332','Government of Ontario','A provincial adoption of the model code, showing how requirements reach the site')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='CA' AND t.candidate_key='assembly:ca-interior-drywall-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: Drywall worksite with board and equipment, NIOSH (public domain)','https://commons.wikimedia.org/wiki/File:Drywall_Crane_Workers.jpg','Wikimedia Commons','Cover photograph overview article, public domain'),
  ('Image credit: Drywall screw, MrX (CC BY-SA 3.0)','https://commons.wikimedia.org/wiki/File:Drywall_screw.png','Wikimedia Commons','Cover photograph materials article, CC BY-SA 3.0'),
  ('Image credit: Drywall installation, City of Boston Archives (CC BY 2.0)','https://commons.wikimedia.org/wiki/File:Drywall_installation_in_unidentified_home_(10926427913).jpg','Wikimedia Commons','Cover photograph installation article, CC BY 2.0'),
  ('Image credit: Rated drywall assembly defeated by absent firestops, Achim Hering (public domain)','https://commons.wikimedia.org/wiki/File:Drywall_reality.jpg','Wikimedia Commons','Cover photograph quality article, public domain'),
  ('Image credit: Drywall repair and repainting, Carl Nurmi (CC BY 3.0)','https://commons.wikimedia.org/wiki/File:Drywall_Repair_Portland-Cascade_Painting_and_Restoration_-_panoramio.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY 3.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='CA' AND t.candidate_key='assembly:ca-interior-drywall-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'CA',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='CA' AND t.candidate_key='assembly:ca-interior-drywall-paint'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'CA','CA',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('ca-interior-drywall-paint-overview', 'Interior Drywall to Paint in Canada: The Finishing Chain', 'A Canadian overview of the interior finishing chain: hanging board, taping, joint compound, sanding, primer and paint, and why each step in the sequence exists rather than being skipped.', $wallarticle1$# Interior Drywall to Paint in Canada: The Finishing Chain

The most common interior finish in Canada is a chain of seven steps, and the reason it looks easy is that a good contractor makes the joins invisible. The steps are hanging, taping, filling, sanding, priming and painting, with inspection threaded through all of them.

Each step exists because of a problem the previous one left behind. Board arrives with joints; tape bridges them; compound hides the tape; sanding removes the ridges; primer seals the paper so paint behaves; paint provides the finish. Skip one and the failure is visible at the end of the chain, which is why the sequence is worth understanding even for someone who will never hold a trowel.

## What the chain is

Drywall board is fixed to framing with screws, leaving a grid of tapered joints and flat butt joints. Paper tape is bedded into a first coat of compound over every joint. Two or three further coats feather the compound out until the joint is wider than the light can find. The whole wall is then sanded, dusted, primed and painted.

In Canada the board is normally 12.7 millimetres thick in residential work, fixed with screws at a spacing the assembly requires, and finished to a level agreed before the work started.

The choice between a two-coat and a three-coat system, between a setting compound and a drying one, and between paper and mesh tape belongs to the contractor. The choice of finish level belongs to the client, and it should be written down.

## The levels of finish, in plain terms

The industry describes drywall finishes in levels, from a basic level that is suitable for a ceiling void behind tiles up to a level that is appropriate for gloss paint under critical lighting. Each level defines how much compound, how much sanding and how precise the result must be.

For a Canadian house, most painted walls and ceilings are finished to a mid level that assumes a flat paint under ordinary lighting. Higher levels exist for gloss finishes, for walls washed by a window or a wall-washer, and for rooms where the surface is the feature.

The practical consequence is that a householder who chooses a gloss finish for a hallway should say so before taping starts, because the level of finish is decided by the taping and sanding, not by the paint.

## Why primer is not optional

New board is faced with paper, and paper is absorbent. Paint applied directly to it soaks in unevenly, and the result is a patchy first coat with visible joints and a difference in sheen between the paper and the compound.

Primer solves that by sealing the surface and equalising suction across paper and compound alike, so the finish coats sit on a uniform base. Canadian product literature treats primer as part of the system for new drywall rather than as an optional extra [3](https://www.dulux.ca/) [4](https://www.benjaminmoore.com/en-ca).

There is a second reason specific to this climate. Interior work in Canada often happens in winter, in a heated but dry building, and a wall that has just been sanded holds a great deal of dust. Primer, applied after dusting, binds what remains and gives the finish coats something to hold.

## Moisture, mould and the Canadian interior

A finished wall in Canada lives through a wide annual range of humidity. Indoors, a heated house in February is dry and a humid July is not, and a basement bathroom adds its own load on top.

That range is why board type matters. Moisture-resistant board is used where humidity is high, glass-mat or cement board where water is genuinely expected, and ordinary board everywhere else. It is also why the paint choice follows the room: a bathroom paint that withstands scrubbing and condensation is a different product from a hallway paint that must resist scuffing [8](https://www.cmhc-schl.gc.ca/en/professionals).

The failure that follows a wrong choice is not immediate. It appears as paint peeling at a shower, as mould in a corner behind furniture, or as a joint that swells and telegraphs through the finish in the second winter.

## The code side, briefly

Interior finishes in a Canadian house fall under Part 9 of the model codes, adopted provincially [5](https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada). Two code subjects bear directly on this chain.

The first is fire resistance. Where a wall is a fire separation, the board thickness, the number of layers and the fastener spacing are part of a listed assembly, and the finishing work must not compromise it. The second is the thermal barrier over foam plastics, where the board is a code requirement rather than a decorative layer [5](https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada).

The provincial adoption decides which edition applies where the building stands, which matters when a renovation is being permitted against a newer code than the house was built to [6](https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications) [9](https://www.ontario.ca/laws/regulation/120332).

## What goes wrong, in one list

The same six defects account for most interior finishing complaints: joints that telegraph through the paint, screw heads that show, ridges left by sanding, dust trapped in the finish, patches where the primer was skipped, and cracks that open at the first heating season.

Every one of them is a sequence failure rather than a product failure, and every one is cheaper to prevent than to repair.

## What the later articles cover

Materials deals with board types, compounds, tape, screws, primer and paint, and how to choose between the variants. Installation follows the work from the first board to the second coat. Quality covers the finish levels, the inspection under light, and the fire and thermal-barrier checks. Maintenance covers repainting, patching, texture matching and moisture.

The thread is that a painted wall is a record of the care taken three steps earlier, and that the paint itself is the least important coat in the system.

## The chain in a renovation

A renovation runs the chain with one difference: the board is going onto an existing building rather than a new frame.

That means the framing is old, the walls may be out of plumb, and whatever the previous owner did is under the surface. The sequence gains a survey stage: checking the framing for rot and for straightness, confirming where services run, and deciding whether the existing board comes off or is overlaid.

Overlaying new board on old is a legitimate technique where the old surface is sound and the added thickness can be absorbed at doors and trim. Removing it is the better answer where the wall is damp, where services need re-routing, or where the finish needs to be right rather than merely better.

## Why the paint is the last coat that matters least

Householders judge a room by its paint, and professionals judge it by what is under the paint. That divergence explains most of the disappointment in interior work.

A perfect paint film over a poorly feathered joint shows the joint. A modest paint over a well finished wall looks flawless. The money spent on premium paint would have bought more visible quality in the taping stage, which is the trade-off this article's sequence is designed to make explicit.

The same logic applies to the primer, which is cheaper than the paint and does a job the paint cannot. Both are decisions about where the value sits in the chain.

## Costs, and where they sit

A finishing chain is costed by area, and the proportion spent on each stage is instructive.

The board and screws are the smallest part. The labour of taping and sanding is the largest, and it rises sharply with the finish level because each extra coat and each sanding pass adds hours. Paint and primer are a modest material cost and a significant labour cost.

The practical consequence is that upgrading a finish level is a labour decision, and downgrading one saves very little on materials while risking an unhappy client. Most disputes about interior work are really disputes about which level was bought.

## How the chain differs around the house

The same sequence runs in every room and the emphasis moves. Ceilings take more board and more care with joints because the light hits them at a shallow angle. Bathrooms introduce moisture-resistant board and a paint that scrubs. Basements introduce cooler surfaces and a humidity question that belongs to the foundation before it belongs to the finish. Garages and utility rooms are often finished to a lower level and painted with a robust product rather than a decorative one.

Knowing which room is which is how a specification stays proportionate. Finishing a utility room to a level appropriate for a formal dining room wastes money; doing the reverse produces a wall that disappoints in the room that matters.

## Where the money is spent across a house

Across a whole house, the finishing chain is one of the largest single line items, and it is the one most often trimmed when a budget tightens.

Trimming it is a false economy for a specific reason: everything else in a room is judged against its walls. Cabinetry, flooring and lighting all sit in front of the finish, and a poor surface makes every one of them look worse. Trimming tile or trim is a visible saving; trimming the wall finish is an invisible saving that the room reports for years.

## The end of the chain, and the start of maintenance

The moment the last coat dries, the wall enters a different phase. It stops being a construction item and becomes part of the house, subject to sunlight, furniture, children and the seasons.

That transition is why the handover conversation matters. A wall handed over with its paint codes recorded and its first-winter behaviour explained will be maintained rather than repaired, and the difference shows a decade later.

## A note on national variation

Interior finishing practice does not change much between Canadian provinces, because the products and the labour market are national.

What does change is the code edition in force and the way it is administered, along with local expectations about basement finishes and about the level of finish a new house receives. A contractor moving between markets adjusts to the inspection culture more than to the technique.

For a householder the useful question is local: which edition of the code governs a permit here, and does the work need one. The answers come from the municipal authority, and asking early costs nothing.

## Why this chain rewards patience

Every stage of the chain is a drying or curing stage as much as a working stage, and impatience is what produces most of the defects that get blamed on products.

A joint recoated before it dried sags. A wall primed before it was dusted fails. A wall painted before the primer cured lifts. None of those is a material failure, and each is prevented by a schedule that respects the intervals the manufacturer publishes.

Patience is the least expensive input in the sequence and the one most often cut under schedule pressure, which is why the argument for it belongs in the plan rather than in the argument at handover.

## References

1. CGC Inc. (CertainTeed Gypsum Canada).
2. National Gypsum Company.
3. Dulux Canada.
4. Benjamin Moore Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows a drywall worksite with board and equipment in place, a National Institute for Occupational Safety and Health photograph in the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 9, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Drywall_Crane_Workers.jpg/1280px-Drywall_Crane_Workers.jpg')

, ('ca-interior-drywall-paint-materials', 'Materials for Drywall Finishing and Painting in Canada', 'A Canadian materials guide for interior finishing: board types, setting and drying compounds, tape, corner bead, screws, sanding and dust control, primer selection and the paint sheens that suit each room.', $wallarticle2$# Materials for Drywall Finishing and Painting in Canada

The materials for this chain are commodity products with specific jobs, and almost every failure traced back to them is a case of the right product used in the wrong place.

## Board types and where each belongs

Ordinary gypsum board is the default for dry interior walls and ceilings. It is faced with paper, cut with a knife, and fastened with screws.

Moisture-resistant board is specified for bathrooms, laundry rooms and kitchen areas where humidity is routine. Type X board is specified where a fire-resistance rating is required, and it is a different product rather than a thicker version of the same one. Glass-mat and cement boards are specified where water is genuinely expected, notably behind tile in a shower.

In Canadian basements, the choice is often moisture-resistant board on the exterior walls and ordinary board on the partitions, with the real moisture control belonging to the foundation and the drainage rather than to the board [8](https://www.cmhc-schl.gc.ca/en/professionals).

Thickness follows the assembly. Residential walls are commonly 12.7 millimetres, ceilings and rated assemblies may call for more, and the specification rather than the supplier decides.

## Compounds: setting and drying

Joint compound comes in two families and they behave differently.

Setting compounds are supplied as a powder and harden by chemical reaction, so they cure in a fixed time regardless of humidity and can be recoated quickly. They are strong, shrink little, and are the usual choice for the first coat and for repairs.

Drying compounds are supplied ready-mixed and harden as the water evaporates. They are softer, easier to sand, and convenient for the light finishing coats. Their drying time depends on temperature, humidity and thickness, which in a Canadian winter means a cold room can stall the work for days.

Most professional work mixes the two: setting compound for bedding tape and filling, drying compound for the coats that will be sanded.

## Tape

Paper tape is the standard for flat joints and corners. It is strong, it bonds into the compound, and it resists the cracking that a rigid filler would show.

Mesh tape is self-adhesive and quick, and it is used where the joint is unlikely to move and where speed matters. It is less tolerant of poor bedding, and it does not perform as well in a corner where two boards meet at an angle.

Corner bead finishes external corners. Metal bead is the durable default, with paper-faced and plastic variants available for specific details. The choice matters where a corner takes impact, which in a house means most of them.

## Screws, and the wrong ones

Drywall screws are specified by length and by thread type: coarse thread for wood framing, fine thread for steel studs. Using a wood screw in a steel stud, or a drywall screw that is too short to reach the framing, produces a board that is held by nothing.

Screw spacing follows the assembly, and where the wall is fire rated the spacing is part of the listing. Overdriving breaks the paper face and destroys the fixing, which is why a depth-setting nose on the driver is standard on a professional job [1](https://www.cgcinc.com/).

## Sanding, dust and the tool that changed the trade

Sanding removes the ridges the taping left. Traditionally done by hand with a pole and a sponge, it is now commonly done with a random-orbit sander connected to a vacuum, which collects most of the dust at source.

That matters for two reasons. Dust travels through a house and settles on every surface, and a finish applied over dust fails. A vacuum-assisted sander is the single most effective dust control in the trade, and it is the reason modern interior work is cleaner than the work of twenty years ago.

Grits are chosen for the stage: a coarser paper for the first pass over ridges, finer for the final pass before primer.

## Primer, sealer and the difference

Primer for new drywall is a sealing product, not a diluted paint. Its job is to equalise suction and bind dust, and it is formulated for the high absorbency of paper and compound.

Where a wall has been patched, a spot primer over the repair prevents the patch from flashing through the finish. Where a wall is being painted a strong colour over a light one, a tinted primer reduces the number of finish coats needed.

The distinction worth remembering is that primer is cheaper than paint and does a job paint cannot do. Using paint as a primer costs more and performs worse.

## Paint and sheen

Interior paint in Canada is normally water-based, with acrylic and latex formulations dominating. Sheen is the decision that most affects how a room ages.

Flat paint hides imperfections and shows dirt. Eggshell and pearl are the usual compromise for walls: washable without reflecting every flaw. Semi-gloss suits trim, doors and bathrooms, where scrubbing is routine and the surface is expected to shine.

The choice should follow the room and the light. A flat wall in a hallway washed by a window will show every joint the taping left, which is a finish-level conversation rather than a paint one.

## Consumables and the small items

The rest of the list is unglamorous and decisive: a taping knife in two widths, a mud pan, a corner tool, a sanding pole, a dust mask, drop sheets, caulk for the junctions at trim and floor, and a supply of clean rags.

Caulk is the item most often forgotten. The joint between board and trim, and board and floor, is where movement shows, and a flexible seal there is the difference between a crisp line and a crack in the first season.

## Working with the Canadian climate

Two seasonal realities affect material choice. In winter, a heated building is dry and compound dries fast, but a cold building will not dry at all, and setting compound is the safer choice when the heat is intermittent.

In summer, humidity slows the drying compounds and softens freshly sanded surfaces. Choosing a setting compound for the structural coats removes the weather from the schedule, which is why it is the professional default.

## Buying quantities without waste

The quantities for interior work are easy to estimate and easy to over-buy.

Board is counted by area with a margin for cuts and damage, and buying sheets long enough to span a room reduces joints. Compound is bought by the pail, and a five gallon pail covers a surprising area; the mistake is buying three and returning two.

Tape is cheap and running out mid-job is a nuisance, so a roll per room is normal. Primer and paint are bought to the calculated coverage with a small margin for the second coat, and the leftover is kept labelled with the room and the sheen, because a touch-up in three years will want exactly that.

## Sealing the edges

The detail that most affects how a room looks after a year is not the wall face but the junctions.

Where board meets trim, floor or a window frame, a flexible sealant absorbs the small movement that would otherwise open a crack. Where board meets a bathtub or a shower tray, the sealant must be one suited to a wet area and to the materials it touches.

The order matters: sealant first, then paint the trim over it, so that the line is defined once. Sealing after painting and then painting the sealant is how a crisp edge becomes a wavy one.

## Storage on a Canadian site

Board and compound are both sensitive to how they are stored, and the sensitivity is seasonal.

Board stored flat and dry keeps its edges; board stored on edge or in a damp garage arrives with soft corners and a paper face that has taken up moisture. Compound freezes, and a frozen pail is a ruined pail, which matters from November onwards.

Paint should be kept above freezing before use and stored where it will not freeze afterwards, since the leftover tin is the future touch-up. A shelf in a heated basement is the right home for it.

## Compound strength and where it matters

Setting compounds vary in strength, and the difference shows where a joint is thin or where a repair has to hold.

A high-strength setting compound is used for the first coat over tape and for repairs that will be sanded hard. A lighter product is used for the finish coats, where the aim is a surface that feathers to nothing rather than a joint that resists impact.

Using one product for everything works, and it sacrifices either workability or durability. Reading the pail for its intended stage is the simplest quality decision a buyer can make, and it costs nothing.

## Board edges and what they tell you

A board's long edge is tapered so that a joint can be filled flush; its short edge is square, which is why butt joints need more compound and more width to disappear.

The taper is also a quality signal on delivery. A board whose taper is crushed has been stored or handled badly, and its joint will take more work to hide. Checking edges on delivery costs a minute and prevents a day of extra taping.

## Primer on repairs and the flashing problem

A patch painted without spot primer shows as a dull or glossy island under a finish coat, because the patch absorbs differently from the surrounding paint film.

Spot priming the repair with a product suited to the existing finish prevents that, and feathering the new paint beyond the patch hides the boundary. It is a two-minute step and the difference between an invisible repair and a permanent reminder of a plumbing leak.

## Where to spend on materials, and where not

Two purchases repay their cost: the tape and the primer.

Paper tape is the difference between joints that crack and joints that do not, and it costs almost nothing relative to the labour it protects. Primer is the difference between a finish that holds its sheen and one that dries patchy, and it is dramatically cheaper than the finish coats it protects.

Two purchases rarely repay their cost: premium board where an ordinary board would meet the same assembly requirement, and a premium paint applied over a poor surface. Both are examples of spending money where the problem is not.

## The tools worth buying once

A householder doing repeated maintenance should buy three things properly: a good taping knife that will not flex, a vacuum attachment or sander that captures dust, and a step ladder that is light enough to move between rooms without resentment.

Those three make the difference between doing the work and avoiding it. Everything else can be bought cheaply as needed, and most of it already exists in a house with a toolbox.

## References

1. CGC Inc. (CertainTeed Gypsum Canada).
2. National Gypsum Company.
3. Dulux Canada.
4. Benjamin Moore Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph is a close view of a drywall screw, taken by the Wikimedia Commons contributor MrX and made available under CC BY-SA 3.0. It is a real photograph, not AI generated, and it shows the one component that holds the whole assembly to its framing. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 8, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Drywall_screw.png/1280px-Drywall_screw.png')
, ('ca-interior-drywall-paint-installation', 'Hanging, Taping, Sanding and Painting: The Work Sequence', 'A Canadian installation sequence for interior finishing: board layout and fastening, taping and coat sequences, drying, sanding and dust control, priming, cutting in and the two finish coats.', $wallarticle3$# Hanging, Taping, Sanding and Painting: The Work Sequence

The work is quick when it is ordered and slow when it is not. Board goes up first and everything after it depends on how well that was done, because no amount of compound hides a board that was fixed with a two millimetre step between panels.

This article follows the sequence step by step for a Canadian interior, from the first board to the second coat.

## Layout and hanging

Hanging starts with layout. Boards are set horizontally where possible, so that the long tapered edge lands at a height a person can reach with a trowel, and joints are staggered between rows so that four corners never meet at one point.

Lighting is set before boarding wherever possible, because the position of a fixture decides where a board joint can safely fall. Backing is installed for anything heavy that will be fixed later, and service boxes are brought to the correct depth for the board thickness.

Boards are butted snugly but not forced, with a small gap at the floor so the board does not sit in moisture. Screws are driven to a dimple without breaking the paper, at the spacing the assembly requires, with more screws around the perimeter and at corners.

## Taping

Taping beds the tape into the first coat of compound. The joint is filled, the tape is pressed in and wiped down, and the excess is removed so that only a thin layer remains under the tape.

Inside corners get a folded tape, external corners get bead, and butt joints, which have no taper to hide them, are floated wider than tapered joints because there is no recess to receive the compound.

The first coat is not a finish coat. Its job is adhesion and crack resistance, and a tape that is properly bedded will not blister when the later coats go on.

## Filling and feathering

The second and third coats build the joint out until it is invisible. Each coat is applied wider than the last, with the trowel pressure concentrated on the edges so that the compound thins to nothing where it meets the board face.

This is the part of the work that separates a good finish from a fair one. A joint that is filled but not feathered shows as a shadow under a raking light long after the paint is dry.

Screw heads and bead are filled in the same passes, and the whole sequence is timed so that each coat is dry before the next arrives.

## Drying, and the Canadian schedule problem

Drying compounds need warmth and air movement. A cooler room slows them, a humid room slows them more, and a sealed room with no ventilation will hold the moisture the compound is releasing.

In a Canadian winter the building is usually heated, which helps, but it is often not ventilated, which does not. Opening a window for an hour a day moves the moisture out and is part of the method rather than a comfort decision.

Setting compounds avoid the problem entirely, which is why a schedule that must be met tends to use them for the early coats.

## Sanding and dust

Sanding flattens the ridges that feathering left. A pole sander with a coarse paper makes the first pass, a finer paper follows, and the wall is checked by hand and by light between passes.

Dust control is now standard practice with a vacuum-assisted sander, and it changes the whole job: less dust in the air, less on the floors, less on the freshly sanded surface that will be primed next.

After sanding, the wall is dusted and inspected. Any defect visible at this stage is cheaper to fix now than after the primer.

## Prime

Primer is applied to the whole surface, not just the joints, and it is applied generously enough to seal the paper. On a new wall this is the coat that makes the finish possible.

Spot priming is used where the wall is being repainted and only patches are new, with the patch primed and feathered into the surrounding area before the finish coats.

In a basement or a bathroom, the primer choice may change to a product suited to the higher humidity of the room [3](https://www.dulux.ca/).

## Cutting in and rolling

Painting starts with the edges: a brush along the ceiling line, the corners, and the trim, applied in a band wide enough to be rolled into while it is still wet.

The wall is then rolled in a W pattern to distribute the paint and finished with straight passes in one direction, keeping a wet edge so that the lap marks do not appear. Two coats are normal, with the second applied after the first has dried to the manufacturer's recoat time.

Ceilings are painted first where a room is being finished in one sequence, so that any spatter on the walls is covered by the wall coats.

## Trim, caulk and the last details

Trim is painted in its own sequence, usually after the walls so that any brush slip can be corrected. Caulk is applied at the junctions, tooled smooth and left to cure before any paint touches it.

The order matters: caulk, then paint over the caulk with the trim colour, then a final inspection. Doing it in the other order means the caulk line is cut in twice.

## Cleanup and handover

The last stage is the least visible: removing the dust, checking every wall under a light, and touching in the small defects that only appear once the room is clean.

Handover is a walkthrough with the light on. Joints that show, screws that are visible, patches that flash, and paint that has been applied too thin are all easier to agree on in that moment than a month later.

## Weather, heat and the second winter

The one thing a householder should know about this sequence is that it is finished when the building has been through a season.

A wall painted in June and inspected in July has not yet met the heating season, when the house dries and the framing moves slightly. That is when a hairline crack appears at a butt joint or a screw pop lifts a dimple, and it is a normal, minor, repairable event rather than a failure of the work.

The professional response is to return after the first winter, or to tell the client what to expect and how to fill it. Either is better than an argument.

## Working in an occupied house

Most Canadian interior finishing happens in a house somebody is living in, which changes the method more than the materials.

Dust control becomes the first consideration rather than the last: plastic sheeting on doorways, a vacuum-assisted sander, and a decision about which rooms are out of use and for how long. A single doorway barrier with a zip door costs little and keeps the rest of the house livable.

Scheduling follows the compound. Setting compounds allow two coats in a day and sanding the next morning; drying compounds can stretch a small job across a week in cold weather. Telling a householder which it will be is part of the quote.

## The first winter, honestly explained

The most useful thing a contractor can say at handover is what will happen in the first heating season.

As the house dries and the heating runs, minor shrinkage shows at butt joints and occasional screw heads lift a fraction. Neither indicates poor work; both are cosmetic and both are repairable in an afternoon with compound, sandpaper and the leftover paint.

Householders who are told this treat it as normal. Householders who are not treat it as a defect, which is a conversation nobody enjoys in February.

## Boarding around services and openings

The detail work in hanging is all at the openings. Boards are cut to the opening rather than the opening being cut later where accuracy matters, and cut-outs for boxes are made with a router or a saw once the board is fixed, which gives a cleaner line than measuring.

Boxes are pulled forward to the finished plane, because a box set to the framing rather than the board leaves a gap around the device plate that no amount of caulk hides.

Backing for heavy fixings is fixed to the framing before the board, and its position is recorded. It is the cheapest item on the job and the one most appreciated two years later.

## Crew size and the pace of the work

Finishing is a sequence with drying built in, so the pace is set by chemistry as much as by labour.

A small job is usually one person moving through the stages; a large one is two or three, with one hanging and one taping behind. Adding people to a drying stage does not speed it up, which is why a schedule that compresses the compound is a schedule that will fail.

The professional answer is to use setting compounds and larger sanding capacity rather than to add labour to a stage that is waiting for water to leave a joint.

## Protection of finished work

The last stage of any interior job is protecting what has been done. Floors covered, corners shielded, and a rule about who walks where.

A finished wall is soft for its first days and a scuff mark from a ladder is a repair. The cost of a roll of protective board is trivial against the cost of returning to repaint a hallway because the plumber leaned a pipe against it.

## After the painter, before the client

The final inspection is done with everything clean, all protection removed, and the light on. Anything found is fixed then, while the compound and the paint are still on site.

A room handed over after that inspection is a room that will be judged on its merits rather than on its loose ends.

## Working alone, and the safety details

Interior finishing is safe work with a few specific hazards. Board is heavy and awkward for one person, and a ceiling sheet is a two-person item regardless of strength.

Dust is a respiratory hazard even in small quantities, and the mask that is worn for a five-minute sanding is the one that gets forgotten at the end of a long day. Setting compounds are alkaline and dry the skin; gloves are the simple answer.

Ladders are where most householder injuries happen in this trade, and the fix is not technique. It is buying a stable ladder and not overreaching from it.

## Clean as you go

The habit that separates a professional job from an amateur one is cleaning at every stage rather than at the end.

Wipe the mud pan, scrape the trowel, sweep the floor between coats, and vacuum the wall before primer. Each takes a minute and each prevents a defect that would take an hour to correct after the paint is on.

## References

1. CGC Inc. (CertainTeed Gypsum Canada).
2. National Gypsum Company.
3. Dulux Canada.
4. Benjamin Moore Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows drywall being installed in a home, from the Massachusetts Bureau for Lathing and Plastering collection held by the City of Boston Archives and made available under CC BY 2.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it dates from the 1960s, showing that the hanging stage has changed less than the products. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 9, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Drywall_installation_in_unidentified_home_%2810926427913%29.jpg/1280px-Drywall_installation_in_unidentified_home_%2810926427913%29.jpg')

, ('ca-interior-drywall-paint-quality', 'Judging a Painted Wall: Finish Levels and Integrity', 'A Canadian quality framework for interior finishing: finish levels and what they promise, inspection under raking light, the defects that matter, and the fire and thermal-barrier integrity that paint must not compromise.', $wallarticle4$# Judging a Painted Wall: Finish Levels and Integrity

A painted wall is judged by eye and by hand, and both judgements need a standard. The industry's standard is the level of finish, agreed before work began, and the check is whether the wall meets it under the lighting it will live with.

## What a finish level promises

A finish level describes how much of the joint will remain visible and under what lighting it will disappear. A lower level accepts that a joint may be faintly visible in raking light; a higher level does not.

The practical mistake is agreeing a level that does not match the paint. A flat emulsion under soft light flatters a mid level. A gloss or a washable sheen under a window shows every ridge, and the wall that was acceptable at a mid level becomes unacceptable at no extra fault of the taper.

Writing the level down, and the lighting it will be judged under, is the whole of this quality gate.

## The raking light test

The inspection tool is a light held almost parallel to the wall. At that angle every ridge, hollow and drift of compound casts a shadow, and the wall reveals its history.

The test is done at two stages: after sanding, when defects can still be corrected with compound, and after the finish coats, when the wall is what it will be. A wall that fails at the second stage is a rework conversation, which is why the first stage is where the attention belongs.

Daylight is the second test, and it is the one the householder will apply. A wall can pass a torch and look uneven in a sunlit room; both are legitimate, and the finish level should say which governs.

## The defects that matter

Six defects cover most complaints. Joints that telegraph through the paint, where the compound was feathered too narrowly. Screw heads that show, where the dimples were filled proud or the paper was broken. Ridges from sanding, where the paper was too coarse or the pass too brief. Dust in the finish, where the wall was not cleaned before primer. Patches that flash, where the spot primer was skipped. And cracks at the first heating season, where the joint was not properly bedded.

Each has a cause earlier in the chain, and each is cheap at the right stage and expensive later. The pattern is the same as every other system in this library: the failure is visible at the end and decided at the start.

## Fire separation integrity

In a rated assembly the board, the number of layers, the fastener spacing and the treatment of penetrations are the rating. The finishing work must preserve them.

That means no board substituted for a cheaper equivalent, no extra holes without firestopping, and no reduction in the number of layers because the joint looked easier with one. The photographs of such failures in the professional literature are remarkably common, and they all show a hole cut through a rated wall with nothing sealing it.

The quality check is simple and should be scheduled: after the finishing work, inspect every penetration in a rated wall and confirm a listed firestop is in place.

## Temperature, humidity and the coating

Paint fails as a system rather than as a coat. A finish applied in a cold room will not form a film properly, and one applied over a damp wall will blister or peel regardless of quality.

The checks are unglamorous: surface temperature above the minimum on the can, moisture content of the board within the normal range, and dilution of the first coat as the manufacturer specifies. In a Canadian winter those numbers are easy to satisfy in a heated building and impossible in an unheated one.

## The thermal barrier question

Where board covers foam plastic insulation, the board is a code-required thermal barrier, and its type and thickness are not negotiable. This arises in basements, in ICF construction and in any assembly with foam behind the board [5](https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada).

The check belongs at the boarding stage, but the consequence lands on the painter's work: a wall finished over the wrong board looks perfect and is non-compliant. The record is the answer, and the inspection should be photographed before taping.

## Moisture before paint

Paint over a wet wall is the most expensive mistake in the chain, because the remedy involves removing the finish. Board moisture should be checked before priming in any basement, in any wall that has been repaired after a leak, and in new construction before the heating is running.

A moisture meter reading taken at several points is a minute's work. A blistering paint film across a wall is a week's.

## Handover, and what to write down

The handover record for interior finishing can be one page: the finish level agreed, the board type per wall, the primer and paint products used with their sheens, the firestop locations in any rated wall, and the date of completion.

That page answers the questions that arrive later, when a householder wants to touch up a wall and cannot remember the sheen, or when a renovator needs to know whether a wall is rated.

## The judgement call

A painted wall is the least dramatic deliverable in construction and the one most judged by users, because it is the only surface they see every day. The standard is not perfection: it is the standard that was agreed, met in the lighting the room actually has.

Judged that way, quality is not a matter of taste. It is a matter of whether the level of finish, the fire integrity and the moisture condition were all verified before the last coat went on.

## Sampling the surface rather than the wall

Quality is judged on a sample as well as on the whole, and the sample should be a real wall rather than a patch of scrap board.

A sample area of a few square metres, finished through to the second coat under the room's own lighting, is the cheapest way to settle a finish-level argument before the whole house is done. It shows the client what the level means, and it shows the contractor what the light will reveal.

Where a room has critical lighting, a sample is not optional. The whole value of the exercise is that the argument happens once, on a small area, while it is still cheap.

## Dust as a quality subject

Dust is treated as a housekeeping matter and it is really a finishing matter. A surface carrying dust will not accept primer evenly, and a wall primed over dust will show a mottled finish that no second coat corrects.

The controls are the vacuum sander, a wipedown before priming, and a clean, still room. Any of them alone helps; all three together are what makes a professional result look effortless.

## The records worth keeping

Two things are worth writing down at the end of interior work: the products used, with sheens and colours, and the firestop locations in any rated wall.

Both are trivially cheap to record and both are expensive to reconstruct. A paint code from a can lid photographed and filed is the difference between a seamless touch-up and a room repaint.

## Coordination with the other trades

No trade finishes a wall alone. The electrician, the plumber and the HVAC installer each leave something behind, and each of those things is a finishing detail.

Boxes need to be at the right depth, and cables need to be clear of the screw line. A pipe that sits proud of the framing produces a bulge that shows under paint forever. A duct that was not planned forces a bulkhead that changes the room.

The check is a walkthrough before boarding, with the wall and the services visible, and a second after boarding but before taping. Both are short and both prevent the kind of defect that has no cheap remedy.

## Lighting, and the argument nobody needs

Light decides what a wall looks like, and the same wall can pass or fail depending on where the light comes from.

A window at the end of a hallway throws light along the wall and finds every deviation. A ceiling fixture washes the surface flat and hides them. A wall-washer does the opposite of what people expect and shows the wall more clearly than any other fitting.

Naming the lighting in the specification, and testing the wall under it, is what turns a subjective argument into a measurable one. It is also the reason a sample wall on site is worth more than any written standard.

## When a defect is not a defect

A faint variation in sheen across a large flat wall is normal in any paint system and is not a finishing defect. A shadow at a joint under a torch at night is normal at a mid level of finish.

Knowing the difference protects both parties. The professional position is that defects are deviations from the agreed level under the agreed lighting, and everything else is the honest appearance of a painted surface.

## Contract, sequence and the schedule

A finishing schedule is short and every dependency is real: services rough-in, inspection, boarding, taping, sanding, priming, paint, trim, final inspection.

Compressing it is possible with setting compounds and additional sanding capacity, and not possible without either. A contractor asked to cut a week from a finishing programme is being asked to change a method, and a method change has a consequence which should be named rather than discovered.

Writing the sequence into the agreement protects both parties from the assumption that effort alone can bend drying times.

## How a defect is diagnosed

When a wall disappoints, the diagnosis runs backwards through the chain. A shadow that follows a joint is a feathering defect. A bump is a screw. A dull patch is a primer omission. A crack is movement or bedding.

Working backwards is faster than guessing, because each symptom belongs to one stage. It also tells the client what happened, which is more useful than an apology and often settles the question of who pays to fix it.

The same method applies to paint defects. Sagging is application. Flashing is suction. Peeling is adhesion, and adhesion is a preparation question. Each answer points at one stage of the sequence this library has described.

## The second opinion

Where a dispute about finishing quality is heading somewhere expensive, a second professional opinion is cheap.

An independent finisher, asked to look at a wall under its own lighting and give a level, will resolve most arguments in an hour. The result is either a small rework or a demonstration that the wall meets what was agreed, and either outcome is worth more than a prolonged disagreement.

## References

1. CGC Inc. (CertainTeed Gypsum Canada).
2. National Gypsum Company.
3. Dulux Canada.
4. Benjamin Moore Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows a drywall assembly that was required to have a fire-resistance rating, defeated on site by absent firestops, taken by Achim Hering and placed in the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and it is the failure this article's fire-integrity check exists to catch. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 9, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Drywall_reality.jpg/1280px-Drywall_reality.jpg')
, ('ca-interior-drywall-paint-maintenance', 'Repainting and Repairing Interior Walls in Canada', 'A Canadian maintenance guide for painted drywall: the repainting cycle, patching holes and dents, matching texture, screw pops and cracks, moisture and mould, and choosing the right product for each room.', $wallarticle5$# Repainting and Repairing Interior Walls in Canada

A painted wall in a Canadian house lasts about a decade before it looks tired, and the reason is light rather than wear. Paint yellows, sheen flattens where it is washed, and scuffs accumulate at the heights people touch.

Everything else in this article is repair: holes, cracks, screw pops and the occasional damp patch. All of it is within reach of a careful householder, provided the repair is treated as a small piece of the finishing chain rather than as a cosmetic patch.

## The repainting cycle

Repainting is the cheapest way to change a room and the hardest to do badly enough to regret. The sequence is the same as the original finish: clean, repair, sand the repairs, spot prime, then two coats.

Cleaning comes first and is usually skipped. Kitchen walls carry a film of cooking grease, and paint applied over it will not adhere at any price. A degreasing wash followed by a rinse is the difference between a finish that lasts and one that peels at the edges.

Sheen should match the original where a wall is being partially repainted, because a different sheen in the same room reads as a patch even when the colour matches.

## Patching a hole

A small hole is patched from the front with a repair clip, a plug of board or a setting compound, then taped and feathered exactly as a joint would be. A larger hole needs a piece of board cut to fit, backed with a batten or a repair panel, taped and finished.

The finishing is the part that decides whether the patch is visible. Compound is applied wider with each coat, sanded with a block and checked under a light before priming.

Where the wall is textured, matching the texture is a separate problem and the one most likely to defeat a householder.

## Matching a texture

Textured ceilings and walls are common in Canadian homes, and a patch that is flat against a textured surround will show no matter how well the paint matches.

The method is practice and restraint: test the compound and the tool on a spare piece of board until the pattern matches, then apply it to the patch with the same motion. A stipple from a roller, a drag from a brush and a sweep from a trowel each produce a different pattern, and the pattern in the room is the specification.

Where matching proves impossible, the honest options are to re-texture the whole surface or to skim it flat. Skimming is often the better long-term answer, and it removes the problem rather than hiding it.

## Screw pops and cracks

A screw pop shows as a small circular bump with a crescent crack around it. The cause is either a screw driven too far, which broke the paper, or a screw that was not driven far enough and has been pushed out by minor movement.

The repair is to drive a new screw alongside, or to reset the original slightly deeper, then fill, sand and paint. Filling over a pop without addressing the fixing only postpones it.

Cracks at joints in the first heating season are normal and are repaired by raking out the loose material, filling with a setting compound, taping where the crack is wide, and refinishing. A crack that returns every year is a movement question rather than a finishing one.

## Moisture, mould and the damp corner

A damp patch on a painted wall is a message about water, not about paint. The investigation starts with the obvious sources: a roof, a bathroom above, a window detail, a foundation, a blocked eave, or a downspout discharging against the wall.

Mould in a corner behind furniture is usually condensation, caused by cold surfaces and still air. The remedy is air movement, warmth and a wash with an appropriate cleaner, followed by a paint suited to the room [8](https://www.cmhc-schl.gc.ca/en/professionals).

Painting over mould without fixing the moisture is a postponement that costs more the second time.

## Choosing products room by room

Each room has a different enemy. Kitchens face grease and steam. Bathrooms face condensation and scrubbing. Hallways face scuffing. Basements face humidity and cooler surfaces. Children's rooms face everything.

The product follows the enemy: washable sheens in wet and busy rooms, moisture-resistant products where condensation is routine, and a mould-resistant formulation in a basement that stays humid despite best efforts.

Canadian product ranges cover those cases, and the technical data sheets state the recoating and curing times that the schedule depends on [3](https://www.dulux.ca/) [4](https://www.benjaminmoore.com/en-ca).

## Preparing a basement properly

A basement repaint is the one job worth slowing down for. The walls are cooler, the humidity is higher, and any moisture problem will return through the new paint.

Preparation means washing the walls, repairing cracks and checking the moisture reading before priming. Where a wall has been wet, the cause is investigated before the paint goes on, because a finish is a membrane and it will trap what is behind it.

The paint itself should suit a space that is cooler and damper than the rest of the house, and the ventilation should be checked before the first coat rather than after.

## What not to do

Three habits cause most of the damage in householder repairs: painting over a defect instead of fixing it, using filler where tape is needed, and sanding a patch so hard that the surface dishes below the surrounding wall.

Each is quick, and each is visible afterwards in a way that the careful version never is. The rule of thumb is that the repair should feel slightly slower than it needs to, because the last ten percent of the work is what the eye actually sees.

## A short annual check

An hour a year keeps interior finishes ahead of decay. Look along the walls with a light for new cracks and pops. Check ceilings under bathrooms and around chimneys for stains. Look at the base of exterior walls in winter for condensation or frost. Test the exhaust fans with a tissue.

Anything found is either a finishing touch-up or a moisture investigation, and the earlier it is found the cheaper it is.

## The long view

Interior finishes are the part of a building that records its history: the patched wall where a door was moved, the ceiling where a leak was repaired, the hallway that has been repainted four times because it is the hallway.

None of that is decline. A painted wall is designed to be maintained, and maintenance is what keeps a house feeling cared for at a fraction of the cost of a renovation. The work is ordinary, the materials are cheap, and the difference between a tired room and a fresh one is usually one weekend.

## Tools for householder repairs

A householder doing their own maintenance needs a short kit: a flexible knife, a taping knife in two widths, a mud pan, a sanding block and sponge, a small tin of setting compound, a roll of paper tape, a patch of primer and a labelled tin of the room's paint.

That kit covers holes, pops, cracks and texture repairs, which is most of what a decade of occupation produces. The rest, notably a ceiling with a stain that keeps returning, needs an investigation rather than more tools.

## Repainting a whole room efficiently

Doing a room in a sensible order is what keeps a repaint to a weekend. Ceiling first, then walls, then trim, then the floor protection removed last.

Furniture is grouped in the centre and covered, edges are taped only where a crisp line needs one, and the cutting in is done wall by wall so the rolled coat meets a wet edge. Two coats with the stated recoat interval is faster than one thick coat that sags.

The last hour is for touch-ups, which is the stage that makes the difference between a room that has been painted and a room that looks painted.

## Choosing when to call someone

Most interior maintenance is householder work. The exceptions are worth naming.

Call a professional for a ceiling stain that keeps returning, for a crack that widens over months, for paint that peels in sheets rather than in patches, for mould that returns after cleaning, and for anything in a wall that is a fire separation.

Each of those points to a cause behind the paint, and repainting the symptom is how a small problem becomes a large one.

## Keeping a record of finishes

A simple folder, physical or digital, with a photograph of each paint can label and the room it belongs to, saves hours later.

Include the sheen and the brand as well as the colour, because a colour match with the wrong sheen still reads as a patch. Add the date of the last repaint and the name of the product used on the trim, and the file answers every touch-up question a house will generate.

## The honest economics

Painting is the cheapest transformation available to a house and the one most often postponed because it is disruptive rather than difficult.

Two rooms a year, done properly, keeps a house ahead of decline at a cost that never feels like a project. Left for a decade, the same work becomes a renovation, with furniture moved, walls repaired and decisions about colours that were once simple becoming consequential.

## Materials that have improved, and one that has not

Dust control and compound formulation have improved beyond recognition in thirty years. A wall finished today with a vacuum sander and a modern setting compound is cleaner and faster than the same wall in 1990.

The item that has not improved is the discipline of the person with the trowel. The compound still has to be feathered, and the paper tape still has to be bedded properly, and no product removes that requirement.

It is worth saying because the marketing suggests otherwise. A product that claims to remove a stage from the chain has generally moved the risk rather than removed it.

## When repainting is not the answer

Occasionally the correct advice is that a wall should not be repainted at all. A wall with a recurring damp problem, a ceiling under a failing roof, or a surface that has been painted so many times that the film is thick and failing all need work behind the finish rather than over it.

Recognising that is a money-saving judgement. Repainting a damp wall is spending a weekend to postpone a leak, and the leak will win.

The remedy in each case is the same: find the cause, fix the cause, dry the assembly, then finish. Only the last step involves paint at all.

## References

1. CGC Inc. (CertainTeed Gypsum Canada).
2. National Gypsum Company.
3. Dulux Canada.
4. Benjamin Moore Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows drywall repair and repainting work in progress, taken by Carl Nurmi and made available under CC BY 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and it shows the repair stage this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 8, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Drywall_Repair_Portland-Cascade_Painting_and_Restoration_-_panoramio.jpg/1280px-Drywall_Repair_Portland-Cascade_Painting_and_Restoration_-_panoramio.jpg')

) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='CA' AND t.candidate_key='assembly:ca-interior-drywall-paint'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='CA' AND t.market_code='CA'
  AND t.candidate_key='assembly:ca-interior-drywall-paint'
  AND a.wall_topic_id=t.id AND a.wall_market_code='CA' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
