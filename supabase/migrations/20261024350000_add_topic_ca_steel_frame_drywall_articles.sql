-- Second CA batch: five researched draft articles for the native Canadian steel frame + drywall topic.
-- CA topics are seeded by 20261024000000_global_wall_finishing_knowledge_library.sql.
-- Articles remain drafts; publication/review gates are not bypassed.
-- Owner directive 2026-10-26: every article carries a real photograph (Wikimedia Commons, attributed), never AI generated.
BEGIN;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_topics WHERE market_code='CA' AND candidate_key='system:ca-steel-frame-drywall') THEN RAISE EXCEPTION 'CA steel frame + drywall topic is missing; apply the wall-finishing library migration first'; END IF; END $$;

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('ASTM C645, Standard Specification for Nonstructural Steel Framing Members','https://www.astm.org/standards/c645','ASTM International','Stud, track and framing member requirements for nonstructural cold-formed steel framing'),
  ('Steel Framing Industry Association','https://www.steelframing.org/','SFIA','Cold-formed steel framing practice, tolerances and technical guidance'),
  ('American Iron and Steel Institute','https://www.steel.org/','AISI','Cold-formed steel design standards and framing technical resources'),
  ('Underwriters Laboratories of Canada','https://www.ul.com/canada','ULC','Listed fire-resistance rated assemblies and certification in Canada'),
  ('National Research Council Canada, Codes Canada','https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada','NRC Canada','The National Construction Codes as the model code system for Canadian buildings'),
  ('National Research Council Canada, Codes Canada publications','https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications','NRC Canada','Published model codes and their adoption by provinces and territories'),
  ('Natural Resources Canada, Energy efficiency for buildings','https://natural-resources.canada.ca/energy-efficiency/buildings','NRCan','Insulation, thermal performance and airtightness expectations'),
  ('Canada Mortgage and Housing Corporation, housing professionals','https://www.cmhc-schl.gc.ca/en/professionals','CMHC','Canadian housing practice, renovation and durability guidance'),
  ('Ontario Regulation 332/12 (Ontario Building Code)','https://www.ontario.ca/laws/regulation/120332','Government of Ontario','A provincial adoption of the model code, showing how requirements reach the site')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='CA' AND t.candidate_key='system:ca-steel-frame-drywall'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_sources(topic_id,title,url,publisher,claim_scope)
SELECT t.id,v.title,v.url,v.publisher,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES
  ('Image credit: Metal Wall Framing, U.S. Navy NMCB-3 (public domain)','https://commons.wikimedia.org/wiki/File:Metal_Wall_Framing_(8938258).jpg','Wikimedia Commons','Cover photograph overview article, public domain'),
  ('Image credit: CFS stud cross section (Rfehr613, public domain)','https://commons.wikimedia.org/wiki/File:CFS_stud_cross_section.jpg','Wikimedia Commons','Cover photograph materials article, public domain'),
  ('Image credit: MetalWallStud, Analogue Kid (CC BY 2.5)','https://commons.wikimedia.org/wiki/File:MetalWallStud.JPG','Wikimedia Commons','Cover photograph installation article, CC BY 2.5'),
  ('Image credit: Drywall firestop problem3 (Achim Hering, public domain)','https://commons.wikimedia.org/wiki/File:Drywall_firestop_problem3.jpg','Wikimedia Commons','Cover photograph quality article, public domain'),
  ('Image credit: Textured drywall ceiling (Loadmaster, CC BY-SA 3.0)','https://commons.wikimedia.org/wiki/File:Drywall-4221R.jpg','Wikimedia Commons','Cover photograph maintenance article, CC BY-SA 3.0')
) AS v(title,url,publisher,claim_scope)
WHERE t.market_code='CA' AND t.candidate_key='system:ca-steel-frame-drywall'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);

INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,'CA',th.theme_key,'en'
FROM public.learn_wall_finishing_topics t
JOIN public.learn_wall_finishing_article_themes th ON th.theme_key IN ('overview','materials','installation','quality','maintenance')
WHERE t.market_code='CA' AND t.candidate_key='system:ca-steel-frame-drywall'
  AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_article_slots sl WHERE sl.topic_id=t.id AND sl.theme_key=th.theme_key AND sl.language_code='en');

INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,author,read_time_minutes,status,is_featured,meta_title,meta_description,market,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,editorial_review_status,cover_image_url)
SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation','FRELUX Editorial',a.read_time_minutes,'draft',false,a.title,a.excerpt,'CA','CA',t.id,a.theme,'en','draft',a.cover_url
FROM (VALUES
  ('ca-steel-frame-drywall-overview', 'Steel Stud Framing and Drywall in Canada: System Overview', 'A Canadian overview of cold-formed steel stud walls with gypsum board: where steel framing is used, why it behaves differently from wood frame in a heating climate, and how the assembly is put together.', $wallarticle1$# Steel Stud Framing and Drywall in Canada: System Overview

Steel framing is the quiet second system of Canadian construction. It dominates commercial and multi-unit residential interiors, it finishes most basements, and it appears wherever a partition must be straight, non-combustible and dimensionally stable. Yet it rarely gets described as a system the way wood frame does.

This overview sets out what cold-formed steel framing is, where it belongs in Canadian building, how a steel-framed wall is assembled behind the gypsum board, and which of its properties matter most in a cold climate. The later articles in the series take materials, installation, quality and maintenance in turn.

## What cold-formed steel framing actually is

Cold-formed steel members are made by bending thin galvanized sheet into shapes at room temperature. A stud is a C-shaped section with a web, two flanges and folded stiffening lips. A track is a U-shaped channel that caps the studs at floor and ceiling. Both are light enough to carry in one hand and stiff enough to hold a wall true over its height.

The material is specified by gauge, which is a thickness designation rather than a strength rating, and by the standard for nonstructural framing members that sets out the dimensional and mechanical requirements [1](https://www.astm.org/standards/c645). In Canadian practice, nonstructural partitions use light gauges, while loadbearing steel framing is designed to the cold-formed steel provisions of the codes, with the technical literature of the steel and framing industries carrying the detail [2](https://www.steelframing.org/) [3](https://www.steel.org/).

Because the steel is galvanized, it resists corrosion in normal interior conditions. Because it is steel, it does not shrink, rot or burn, and it does not support mould. Those four properties explain most of where the system is used.

## Where steel framing belongs in Canada

Three uses dominate. The first is multi-unit residential construction, where party walls and corridor walls must be acoustically separated and fire rated, and where a steel stud partition can carry a tested assembly to a known rating. The second is commercial and institutional interior work, where non-combustibility is a requirement rather than a preference. The third is residential basement finishing, which is where most Canadian householders meet the system: a below-grade room, framed in steel because it will not feed mould and will not move with the seasons.

Steel is also used for exterior walls in some building types, and that application carries the climate's sharpest warning. Steel conducts heat far better than wood, so a steel stud that bridges from a warm interior to a cold exterior becomes a condensing surface. Canadian exterior steel framing therefore depends on continuous exterior insulation, thermal breaks and careful air sealing to keep the studs warm [7](https://natural-resources.canada.ca/energy-efficiency/buildings).

The distinction matters when a designer chooses between systems. Steel is excellent for an interior partition in a heating climate and demanding for an exterior wall in one.

## The assembly, from track to paint

A steel stud partition starts with a floor track fixed to the slab or subfloor and a ceiling track fixed to the structure above. Studs are cut slightly short and set into the tracks at the specified spacing, then plumbed and braced. Openings are framed with additional studs and headers, and services are run through the punched holes that most studs carry, with protective bushings where cables pass through metal.

Board goes on with fine-threaded screws designed for steel, which drill and tap their own hole. Joints are taped and finished exactly as they are on wood, and the wall is primed and painted.

Between the studs sits whatever the assembly is for: insulation for sound, insulation for fire, or nothing at all in a simple partition. Where acoustic performance is the point, the cavity is filled, the perimeter is sealed and sometimes the stud line is doubled or resilient channel is used to break the structural path between the two faces.

## Why steel behaves differently from wood

Wood frame walls move. Lumber shrinks as it dries, and the finishes crack and pop in the first heating season as a result. Steel does not shrink, which removes an entire class of callbacks: a steel-framed wall generally does not produce the line of cracks along a ceiling joint that a wood-framed wall produces in its first winter.

Steel brings its own failure modes instead. Screws can strip in thin metal if they are overdriven. Cut edges and field-drilled holes lose their galvanizing and can rust in a damp environment. A steel stud will not accept a heavy fixing without a proper anchor or backing. And the thermal bridging problem described above is a real design constraint rather than a theoretical one.

The two systems also differ in feel. A steel partition sounds different: hollow, resonant, and thinner under the knuckle. That is not a defect, but it is the reason sound control in steel-framed buildings is specified rather than assumed.

## The code frame in Canada

Steel-framed construction falls under the National Construction Codes, adopted provincially with local amendments [5](https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada). Part 9 covers housing and small buildings, which includes basement finishing in a house, while larger multi-unit and commercial buildings fall under Part 3.

Two code subjects dominate this system. Fire resistance, where the rating belongs to a listed assembly rather than to a product, and the listing in Canada is issued through a certification body [4](https://www.ul.com/canada). And sound transmission, where the code sets the required separation between dwelling units and the assembly has to be built as tested.

The provincial adoption detail is the same as for any Canadian work: the permit is issued against the code in force where the building stands, which is why the model code and its provincial versions both matter [6](https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications) [9](https://www.ontario.ca/laws/regulation/120332).

## The gypsum side

The board on a steel partition is the same material used on wood, specified by the same standard, and finished with the same tape and compound sequence. What changes is the fastening: fine-threaded screws, spaced to the assembly, with the right length for the number of layers.

Where the assembly is fire rated or acoustically rated, the board type, the number of layers and the fastener schedule are part of the listing. Substituting a heavier board or an extra layer is not an improvement; it is a deviation from a tested system, and the rating does not follow it.

Where the wall is a wet area, the board changes to a moisture-resistant or cement product, and the waterproofing belongs to the tile assembly rather than to the paint.

## What the later articles cover

Materials deals with studs, track, gauges, screws, board and the acoustic and fire accessories. Installation follows the work from layout and track fixing to boarding, taping and painting. Quality covers the tolerances, the firestopping of penetrations, and the acoustic details that are invisible once the wall is closed. Maintenance covers corrosion at cut edges, repairs, and what happens to a steel partition during a renovation.

The thread through all five is that a steel partition looks simple and is entirely decided by its details. The studs are cheap. The assembly is not.

## How steel framing reached Canadian basements

The residential route for steel is worth knowing because it explains why so many Canadian householders own a steel-framed wall without realising it.

Basement finishing drove the change. A below-grade room in a Canadian house sits against a foundation that stays cool and, in many houses, damp. Wood framing in that environment is food for mould if it gets wet, and it moves with the seasons as humidity swings. Steel does neither. It is inorganic, dimensionally stable and, in the light gauges used for a partition, cheap enough that the cost comparison stopped mattering.

The result is that a large share of finished Canadian basements are steel stud partitions against a foundation wall, with insulation between the studs and a vapour barrier detailed against the concrete. The assembly has its own logic, closer to the exterior wall described elsewhere in this library than to a simple interior partition, and it is where most maintenance questions about steel framing actually arise.

Above grade, steel appears in multi-unit residential buildings, in commercial fit-outs, and in any interior where a non-combustible partition is specified. Below grade, it appears in houses. Both are the same system with the same details.

## What the system does not do

A steel partition is not a structural wall in most residential work, and it is not a fix for an uneven substrate. It will not straighten a floor that slopes, it will not compensate for a foundation wall that is out of plumb, and it will not carry a heavy load unless it was designed to.

It is also not a sound barrier by itself. A single stud line with one layer of board each side is a lightweight partition, and it transmits sound readily. The performance people expect between a bathroom and a bedroom comes from the complete assembly: insulation, sealing, and often decoupled framing.

And it is not fire rated by virtue of being steel. The rating belongs to the listed assembly, which includes the board, the fasteners and the treatment of every penetration. Steel studs do not burn, but a partition with a hole in it does not stop a fire from passing through the hole.

## Reading a steel wall in the finished room

When a steel-framed wall is complete, it offers a few honest clues about what is behind it. The sound when tapped is thin and resonant compared with a masonry wall, and a wall with a filled cavity sounds noticeably deader than one without.

Baseboards sit differently over a steel partition than over masonry, because the board is the only material behind them. A wall that flexes slightly when leaned on is behaving as designed rather than failing, provided the framing was specified for the loads it meets.

Those clues matter at the point of a renovation. A householder who knows the wall is steel and hollow knows that a heavy shelf needs a proper fixing and that the cavity may be full of services, which is exactly the knowledge that prevents a drill through a cable or a pipe.

## A system that rewards a plan

The recurring lesson across these articles is that the steel partition is designed at the layout stage and built at the boarding stage, with very little room to correct anything in between. Straight members help, and consistent material helps, but the performance comes from decisions made before the first track was fixed.

That is also why the system suits Canadian construction so well. It is repetitive, it is fast, it can be prefabricated or panelised where the project justifies it, and its behaviour in a cold, dry, heating-dominated climate is predictable because nothing in it moves.

The householder's takeaway is narrower but useful: the wall is a set of layers with jobs, and almost every problem in it traces back to one of those layers being interrupted.

## References

1. ASTM International, *ASTM C645 Standard Specification for Nonstructural Steel Framing Members*.
2. Steel Framing Industry Association.
3. American Iron and Steel Institute.
4. Underwriters Laboratories of Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows Seabees and local workers installing metal wall framing, a U.S. Navy photograph in the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle1$, 9, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Metal_Wall_Framing_%288938258%29.jpg/1280px-Metal_Wall_Framing_%288938258%29.jpg')

, ('ca-steel-frame-drywall-materials', 'Steel Frame Materials: Studs, Track, Screws and Board', 'A Canadian materials guide for steel stud partitions: gauges and member shapes, track, fine-thread screws, gypsum board selection, insulation for sound and fire, and the accessories that make an assembly perform.', $wallarticle2$# Steel Frame Materials: Studs, Track, Screws and Board

A steel stud partition is bought as a short list of commodity items and a longer list of small ones. The studs and track are cheap and visible; the screws, bushings, sealant and insulation are cheap and decisive.

## Studs and the meaning of gauge

A steel stud is described by its width, its gauge and its shape. Widths in Canadian practice run from about 63 millimetres for a shallow partition to 92 millimetres and beyond for a wall that must carry insulation, services or a heavier acoustic build-up. Gauge describes the sheet thickness: a lower gauge number is thicker steel, and a single step in gauge changes the stiffness of the wall noticeably.

The member shape matters as much as the metal. A standard C-stud has a web, two flanges and folded lips that stiffen the section. A knurled or dimpled stud grips screws better and reduces the chance of a stripped fixing. A slotted stud is designed to allow movement for deflection. Each variant exists because someone had a wall that failed without it.

Specification of nonstructural framing members follows the ASTM standard for that product [1](https://www.astm.org/standards/c645), and loadbearing steel framing is a design exercise rather than a purchase decision, with the cold-formed steel provisions of the codes and the industry's technical literature as the reference [2](https://www.steelframing.org/) [3](https://www.steel.org/).

## Track, and why depth matters

Track is the U-channel that holds the studs at floor and ceiling. Its web width matches the stud, and its function is to provide a fixing surface and to allow the stud to sit inside rather than be crushed into place.

Deflection track is a variant with a deeper leg, used where the structure above will move and the partition must not. It is the detail that stops a ceiling from pushing a wall out of plumb in a building that settles. On a simple basement partition it is usually unnecessary; in a building with long spans above it is the difference between a wall that survives and one that cracks.

Track is fixed with the appropriate concrete or steel fasteners at a spacing the assembly requires, and the fixing method matters more than the fastener count. A track fixed into a concrete floor with the wrong anchor will pull out under the first door slam.

## Screws for steel, not screws for wood

The single most common materials error in a steel partition is the wrong screw. Drywall screws for steel are fine-threaded and self-drilling: they bore their own hole, roll a thread in the thin metal and hold reliably.

Length follows the number of board layers, with longer screws for double-layer assemblies. Diameter and head style stay consistent, because the head has to dimple the paper without tearing it and the thread has to engage a web that may be less than a millimetre thick.

Stripping is the characteristic failure. Overdrive a screw into thin steel and it spins without holding, and the fixing is gone. A depth-setting nose on the driver, or a light hand, prevents it. Where a screw has stripped, the fix is a larger screw or a new position, not more torque.

## Board selection on a steel wall

Board is specified by the same standard as any gypsum board, and the choice follows the assembly rather than the room. Regular board for a simple partition. Type X where a fire-resistance rating is required. Moisture-resistant board in bathrooms and laundry areas. Cement or glass-mat board where water is genuinely expected.

Two board decisions belong specifically to steel framing. The first is that the number of layers is part of the tested assembly when the wall is rated, so a second layer is a specification item and not an optional upgrade. The second is that board on steel can transmit sound more readily than board on a heavy wall, which is why acoustic layers, damping compounds and resilient fixings are specified together with the board rather than added later.

## Insulation as a functional material

In a steel partition, insulation is rarely there for heat. It is there for sound and for fire.

Sound absorption comes from filling the cavity with mineral wool or glass fibre, which damps the air spring between the two board faces. A partition with an empty cavity is a drum; the same partition with a filled cavity is a wall. Density and fit matter more than brand.

Fire performance comes from the assembly's listing, which may specify mineral wool in the cavity as part of the rating. Where the listing says mineral wool, glass fibre is not an equivalent substitute, and the rating is only valid for the assembly as built.

## Accessories that carry the performance

The small items decide whether the assembly performs as designed. Acoustical sealant at the perimeter closes the flanking path around the wall. Bushings or grommets in service holes stop cables chafing against steel and stop the hole becoming a leak in an acoustic or fire assembly. Resilient channel decouples board from studs where impact noise matters. Backing plates and blocking give future fixings something to hold.

Corrosion protection is an accessory too. Cut edges and field-drilled holes in galvanized steel lose their coating, and in a damp basement or a bathroom those edges are where rust starts. A touch of zinc-rich paint or an appropriate primer on a cut edge is a five-second action.

## Buying, storing and handling

Steel framing is light, which makes it easy to handle and easy to damage. Studs stored on edge bend at the lips and never straighten fully. Bundles dropped from a truck arrive with twisted members that no amount of care will plumb.

Store bundles flat and supported, keep them dry, and cut with the right tool: aviation snips for light work, a chop saw or a stud cutter for volume. Cutting with a grinder leaves a burred edge that tears gloves, cables and board, and the burr is a corrosion site as well.

## Gauges in practice, and where the choice shows

Gauge selection is where a cheap partition and a good one diverge. In practice, nonstructural partitions use members in the light gauges, and a step or two heavier is chosen where the wall will be leaned on, where board will be fixed in two layers, or where the partition runs full height in a commercial space.

The difference is felt rather than measured. A light partition flexes under a hand pressed against it and sounds hollow; a stiffer assembly feels solid and resists impact at the corners where doors and trolleys hit. In a house, the places that deserve stiffer framing are the ones that get knocked: hallway corners, the wall beside a door, and any panel that will carry a television or a shelf.

Stiffness also interacts with the finish. A flexible wall with a stiff taping job develops cracks at the joints, because the board moves and the joint does not. Where a light gauge is unavoidable, the taping detail and the finish level should suit it rather than fight it.

## Fire and sound accessories in detail

The accessories that carry fire and sound performance are specified as a set and are not interchangeable with cheaper alternatives.

For fire, the assembly's listing names the board, the fasteners, the insulation and the sealant, and the listing is what a building official accepts. Listed firestop materials exist for specific conditions: cables, pipes, ducts, and mixed penetrations. Using the wrong one, or using the right one badly, produces an assembly that no longer matches its rating.

For sound, the accessories are structural and sealing. Resilient channel decouples the board from the studs and reduces impact transmission, and it only works if it is fixed to the studs rather than screwed through to the framing. Acoustic sealant closes the perimeter and every box. Insulation damps the cavity. Each is doing a different job, and skipping one leaves the others working against a leak.

## The toolkit

Steel framing is built with a small toolkit and the right ones make the work quick. Aviation snips cut studs and track accurately. A chop saw or a dedicated stud cutter handles volume. A crimper joins studs to track without screws where the assembly permits. A screw gun with a depth-setting nose drives and stops at the right dimple.

For layout, a chalk line, a plumb bob or a laser, a square and a marker. For fixing, the anchors that suit concrete and the self-drilling screws that suit steel structure. For services, a hole saw, bushings and a supply of firestop sealant.

What the toolkit does not include is a grinder used casually, because the burr it leaves tears gloves and cables and starts corrosion. That is the one tool whose convenience costs more than it saves.

## Where the money actually goes

A steel partition is cheap in materials and the cost sits in three places: the framing gauge, the number of board layers, and the acoustic accessories.

Doubling the board on one face adds material and labour and delivers a measurable improvement in both sound and fire performance. Adding a second stud line costs more again and changes the character of the wall. Specifying heavier gauge costs comparatively little and buys stiffness that a householder feels every day.

The cheapest item on the list is the sealant, and it is the one most often omitted. A tube of acoustical sealant applied at the perimeter of a separating wall buys more performance than a step in board thickness, and no specification is improved by leaving it out.

## Waste, and buying to the wall

Steel framing generates little waste compared with lumber, because the members are straight and offcuts are usable. Board generates more, and the estimation matters.

Ordering to the room rather than to the house is the usual mistake: board for a 2.4 metre ceiling in 2.4 metre sheets reduces cutting and joins, and studs bought in the exact lengths needed remove the cut stage altogether where the supplier offers it. Offcuts of track and stud are worth keeping in a bundle, because a repair in two years will want exactly that piece.

Compound is bought by the pail and dries out once opened, so the rule is to buy for the job and to seal what remains.

## Matching materials to the room

A final materials decision is which of the variants to use where. In a dry interior partition, regular board and standard studs do everything required. In a bathroom, the board changes and the studs stay.

In a basement against a foundation, the assembly changes entirely: the studs stand off the wall, the cavity is insulated, and the vapour barrier belongs to the wall rather than the partition. In a separating wall, the accessory list grows and the board may double.

The same commodity products serve all of those cases, which is the system's strength and the reason its specification deserves more attention than its price suggests.

## References

1. ASTM International, *ASTM C645 Standard Specification for Nonstructural Steel Framing Members*.
2. Steel Framing Industry Association.
3. American Iron and Steel Institute.
4. Underwriters Laboratories of Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph is a cross-sectional view of a cold-formed steel stud, placed in the public domain via Wikimedia Commons by its photographer Rfehr613. It is a real photograph, not AI generated, and its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle2$, 8, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/CFS_stud_cross_section.jpg/1280px-CFS_stud_cross_section.jpg')
, ('ca-steel-frame-drywall-installation', 'Steel Stud Partition Installation: Layout to Painted Wall', 'A Canadian installation sequence for steel stud partitions: layout, track fixing, stud placement, openings, services, acoustic sealing, boarding with fine-thread screws, taping and painting.', $wallarticle3$# Steel Stud Partition Installation: Layout to Painted Wall

A steel stud partition goes up quickly and is unforgiving of sequence. Track that is fixed before the layout is confirmed, services that arrive after boarding, and acoustic sealing that is skipped all produce a wall that looks right and performs badly.

This article follows the work in order for a Canadian project, interior and non-loadbearing, which is where most steel framing is used residentially.

## Layout before metal

Layout is the stage that decides everything downstream. The partition line is set out from the drawings, marked on the floor and transferred to the ceiling with a plumb line or a laser, and checked against the structure above for anything the drawings did not show: a beam, a duct, a sprinkler main.

Door openings are located in the layout, because a door that lands under a beam or beside a duct is a redesign rather than a framing adjustment. Wall thickness is confirmed, since a 92 millimetre stud plus two layers of board is not the same wall as a 63 millimetre stud with one.

In a basement, the layout also has to respect the slab, the foundation wall and the mechanical equipment, and it should leave a service cavity where cables and pipes need to run. Marking the floor with a chalk line and the ceiling with a plumb mark is the whole of this stage, and getting it wrong is expensive.

## Track and studs

The floor track is fixed first, then the ceiling track, both aligned to the same line. Fixings into concrete use the anchor specified for the slab; fixings into steel structure use self-drilling screws into the flange rather than the web. Spacing follows the assembly, and every fixing is set flush so the stud sits cleanly inside the track.

Studs are cut about ten millimetres short of the floor-to-ceiling height so they can be rotated into the tracks without being forced. They are set at the specified spacing, plumbed, and fixed to the tracks with a crimp or a screw. The first and last studs in a run are set hard against the abutting construction, because those are the studs that carry the wall's edge and receive the sealant.

Openings get their own framing: jack studs beside the opening, a header above, and cripples above the header to the ceiling track. A door frame needs solid material at the hinge side and the strike side, because a hollow steel stud behind a jamb will not hold a hinge through a thousand slams.

## Services and the holes they need

Steel studs come punched with service holes, and the sequence is that services are run before the board goes on. Cables passing through steel need bushings or grommets, both to protect the cable and to close the hole. Pipes need clearance for movement and for insulation against condensation.

Every penetration in a rated or acoustically rated assembly is a defect until it is sealed. In a fire separation, the penetration must be firestopped with a listed material. In an acoustic separation, it must be sealed airtight, because sound leaks through gaps far more effectively than it passes through the assembly.

Boxes need attention too. Back-to-back electrical boxes in a party wall are the classic acoustic failure, and the fix is offsetting them, sealing them, or specifying a rated box. None of that can be done after the board is on.

## Acoustic detailing that only works before boarding

Where the wall separates a bathroom from a bedroom, or one dwelling from another, the acoustic build-up has to be built as designed. That usually means insulation filling the cavity, sealant at the perimeter, no shared boxes, and sometimes a double stud line or resilient channel to break the structural path.

The double stud detail is the one that surprises people. Two independent rows of studs, one behind each board face, with the cavity between them filled, decouples the two sides so that an impact on one face does not travel through the framing to the other. It costs about a third more in framing and delivers a step change in performance.

Perimeter sealing is the detail most often skipped. A wall that is perfect in the field and unsealed at the top plate performs like a wall with a hole in it, because that is what it has.

## Boarding

Boards are hung horizontally with tapered edges meeting, screwed with fine-threaded screws at the spacing the assembly requires. Screws are driven to dimple the paper without breaking it and without stripping in the thin steel.

Because steel does not shrink, the board can be fitted more tightly than on a wood wall: a small gap at the floor for movement is still correct, but there is no need to leave clearance for seasonal movement of the framing. Boards are staggered so that vertical joints do not line up between layers in a double-layer assembly.

Cutting around openings is done with a saw or a router after the board is fixed, which gives a cleaner line than measuring and marking. Board edges at corners get corner bead; corners in a fire-rated assembly may need a specific bead as part of the listing.

## Taping and finishing

Taping a steel partition is the same three-pass sequence as any drywall wall: bed the tape, fill the taper, feather out. The compound, the paper tape and the sanding are identical.

Two things do differ. Steel studs are straighter than lumber, so a well-framed steel wall needs less correction at the taping stage. And a steel wall can sound hollow when tapped, which leads some painters to over-apply compound in an attempt to deaden it; that is a mistake, and the fix for a resonant wall is insulation in the cavity, not more mud on the face.

Finishing level is agreed before taping begins. A Level 4 finish suits most painted walls and higher levels exist for gloss and critical lighting.

## Priming, painting and handover

Primer seals the paper and equalises suction, and two coats of the specified paint follow, cut in first and rolled while the cut edge is wet. In a basement, the paint should suit a space that may see higher humidity than the rest of the house.

The handover checks are short: walls plumb and flat under a raking light, doors closing cleanly, every penetration sealed, acoustic sealing visible at the perimeter if the wall was rated, and no stripped screws behind the finish. A steel partition that passes those checks will not surprise anybody later.

## Working around existing construction

Most steel partitions in Canadian houses are built inside an existing building rather than as part of new construction, and that changes the sequence.

The floor may be uneven, the ceiling may be a finished assembly that must not be disturbed, and the abutting walls may be out of plumb by more than the new wall can absorb. Layout therefore starts with a survey: a level line around the room, a check of the ceiling structure to find the joists or the deck, and a decision about where the new wall meets the old.

Where the substrate is uneven, packing under the track is normal, and the packing must be solid rather than a shim that will crush. Where the ceiling is a suspended grid, the partition must be fixed to the structure above the grid rather than to the grid itself, which is a detail that gets missed when a basement is finished quickly.

## Boarding sequence on a partition

Boarding a steel partition follows the same order as any wall: ceilings first where the partition meets one, then the walls, then the second layer where an assembly calls for it.

On a steel wall the sheets can be butted more closely than on wood because the framing will not shrink, and the fastening is quicker because fine-thread screws drive into steel without predrilling. The temptation is to speed up, and the failure that follows is stripping: a screw driven too hard spins in the thin metal and holds nothing.

The sequence that protects quality is to fix the perimeter first, then the field, then check every screw by eye before the taper arrives. A screw that has stripped is a two-second fix at that moment and a callback after paint.

## Coordinating with other trades

A steel partition is usually the last framing trade and the first finishing trade, so it sits at the centre of the coordination problem.

Electrical rough-in must be finished and inspected before boarding, and the boxes must be positioned to suit the finished wall thickness rather than the stud face. Plumbing in a partition needs clearance and protection from condensation. Ventilation ducts passing through a rated wall need dampers and firestopping. Every one of those trades creates a penetration, and every penetration is a seal that either happens or does not.

The practical tool is a walk-through before boarding with the trades present, marking every penetration and agreeing who seals what. It takes twenty minutes and prevents the most common defect in the finished building.

## Doors, and why they ruin good walls

A door is a moving load applied to a lightweight wall a thousand times a year, and the door reveal is where a steel partition shows its quality.

The framing needs a stud at each side of the opening and a header above, with solid material where the hinges and the strike plate land. A hollow stud cannot hold a hinge screw for long, and a door that sags after a year is usually telling you about the framing rather than the frame.

The same logic applies to heavy items. Backing for a television, a wall-hung cabinet or a grab bar belongs in the framing stage, because the alternative is a cavity anchor holding a load in thin steel and a repair that involves opening a finished wall.

## Cleanliness and the next trade

Steel framing is a clean trade, and the wall it leaves behind sets up the next trade. Metal filings from drilling and cutting should be swept before boarding, because a filing trapped against a board's back face will rust through paint in a damp room.

Board offcuts and dust belong in a bag rather than in the cavity, both because the cavity is part of the acoustic and fire assembly and because a renovator in ten years will find whatever was left there.

A final sweep and a visual check of the cavity before the last boards go on is the cheapest quality action on the job.

## Weather and the sequencing of an interior job

An interior steel partition is largely immune to weather, which is why it is the system that keeps interior trades working while an exterior wall waits. The materials do not care about rain, and the framing goes up in a cold room.

What does care is the board and the compound. Board brought into a cold space needs time to reach room temperature, and compound will not dry in a room below about ten degrees. A winter interior job therefore depends on a working heat source rather than on tarpaulins.

Ventilation matters as much as heat when compound is drying, because a sealed room holds the moisture the compound is releasing. Opening a window for an hour a day is not a concession to comfort; it is part of how the finish sets.

## References

1. ASTM International, *ASTM C645 Standard Specification for Nonstructural Steel Framing Members*.
2. Steel Framing Industry Association.
3. American Iron and Steel Institute.
4. Underwriters Laboratories of Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows metal wall studs in a double setup intended to reduce noise transmission, taken by Analogue Kid and made available under CC BY 2.5 via Wikimedia Commons. It is a real photograph, not AI generated, and it illustrates the decoupled framing this article describes. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle3$, 9, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/MetalWallStud.JPG/1280px-MetalWallStud.JPG')

, ('ca-steel-frame-drywall-quality', 'Accepting a Steel Stud Wall: Quality and Fire Integrity', 'A Canadian quality framework for steel stud partitions: plumb and flatness tolerances, stripped screws, acoustic separation details, listed fire assemblies and the firestopping of penetrations.', $wallarticle4$# Accepting a Steel Stud Wall: Quality and Fire Integrity

A steel stud partition is accepted at a handful of points, most of them before the board goes on. The visible surface tells you very little about whether the wall will stop a fire, hold a door and keep a conversation private.

## Gate one: layout and structure

The first check is that the wall is where the drawings say, that its thickness matches the assembly being built, and that the structure above and below can accept the fixings. A partition fixed into a suspended ceiling grid rather than the structure is a partition that moves.

Track alignment is checked along its full length. A floor track that wanders by ten millimetres over six metres produces a wall that is straight nowhere and plumb only in the middle, and no amount of taping corrects it.

## Gate two: stud spacing, plumb and bracing

Studs are checked for spacing, for plumb in both directions, and for secure fixing at top and bottom. The industry literature sets out the tolerances expected of cold-formed steel framing [2](https://www.steelframing.org/), and they are tighter than most people assume: a steel wall that is visibly out of plumb was never checked.

Bracing is checked too, because it is temporary and therefore forgotten. A framed wall that has been left unbraced through a week of other trades is a wall that has moved.

## Gate three: openings and backing

Every opening is checked for square, for width against the frame that will go into it, and for solid backing at hinges, strikes and any heavy fixing. A steel stud partition has no depth to spare in its studs, so backing is a deliberate installation rather than a consequence of the framing.

A door frame fixed into unsupported studs will work loose, and the repair involves opening the wall. This is the cheapest gate to pass and the most expensive to fail.

## Gate four: the acoustic assembly

Where the wall is a separating wall, the assembly is verified as built: insulation type and full fill, no back-to-back boxes, resilient channel or double studs installed as designed, and acoustic sealant at the perimeter and around every box and penetration.

Sound testing in completed buildings is possible and occasionally specified, but most residential quality control is visual and detailed. The check is simple: if you can see an unsealed gap, the wall has a leak.

## Gate five: the fire assembly

A fire-resistance rating belongs to a listed assembly, certified in Canada through a certification body [4](https://www.ul.com/canada), and the assembly is only that assembly if every component matches the listing: stud gauge and spacing, board type and number of layers, fastener type and spacing, insulation, and the treatment of penetrations.

The penetrations are where this fails in practice. A finished, painted, fire-rated wall is routinely opened up to reveal cables and conduits passing through without any firestop at all, and nobody notices until an inspection or an incident. Photographs of exactly that deficiency circulate in building-science circles because it is so common.

The quality gate therefore includes the firestopping of every penetration in a rated wall, the dampers in ducts, the smoke seals at doors, and the continuity of the assembly above a suspended ceiling. None of it is visible from the room. All of it is the rating.

## Gate six: flatness and the surface

Flatness is checked with a straightedge and with a light held along the wall. A steel wall is easier to bring flat than a wood wall because the studs arrive straight, and the remaining deviations are usually in the taping rather than the framing.

Screw heads are checked for fill and for stripping. A stripped screw behind a painted wall is a screw that is not holding, and it will announce itself as a pop or a hollow spot later. The fix at this stage is a second screw in a new position and a refilled dimple.

## Gate seven: the coat of paint

The final visible gate is the painted surface: no ridges, no flashing over joints, no missed edges, no roller marks. A defect here is cosmetic and cheap. A defect from the earlier gates is structural, acoustic or fire related and expensive, which is the whole argument for inspecting in this order.

## What belongs in the record

The record for a steel partition can be short: the assembly designation for each rated or separating wall, the board type and layer count, the firestopping product used at penetrations, photographs of the perimeter sealing and the cavity before boarding, and a flatness note.

In a multi-unit building those records are the evidence behind a fire separation or an acoustic claim, and in a house they are what a future renovator consults before drilling a hole in a rated wall. Ten photographs and one page is the whole system.

## The judgement behind the gates

Steel framing is the most consistent wall system in Canadian construction: the members are straight, the material does not move, and the assembly either matches its listing or does not. That consistency is why the gates are worth enforcing rather than assumed. A wall built from straight materials to a tested design will perform exactly as designed, which is either very good or rather worse than the room suggests.

## Tolerances worth writing down

A specification that says the work must be straight is not a specification. The useful version states a tolerance over a stated length, in both plumb and flatness, and states the viewing conditions under which it will be judged.

The industry technical literature sets out what cold-formed steel framing can reasonably achieve [2](https://www.steelframing.org/), and the finishing tolerance is a separate number applied to the board and compound. Writing both down before the work starts prevents the argument that otherwise occurs when a householder inspects with a torch and a contractor inspects with a level.

## The multi-unit context

Steel framing dominates Canadian multi-unit residential construction, and that context raises the stakes on every gate. A separating wall between suites is checked by a building official against the code and by the developer against a warranty standard, and both are looking at the same assembly from different directions.

Acoustic failures in a completed building are expensive because the remedy involves opening walls and working in occupied suites. Fire failures are worse. Which is why the inspection culture in that sector is documentary: photographs of the cavity, the sealant, the firestop and the fastener schedule, filed per suite.

A householder in a single-family house is running the same gates on a smaller scale, and the same records are worth keeping.

## Common defects and their causes

Four defects account for most of the trouble on steel partitions.

Stripped screws, caused by driving too fast into thin steel. Perimeter gaps, caused by skipping the acoustic sealant because it is fiddly. Missing firestopping at penetrations, caused by the belief that a steel wall is inherently fire resistant. And out-of-plumb framing, caused by fixing the track before the layout was confirmed.

Each has a cheap preventive action and an expensive remedy. The pattern is that the cheap action happens before the board and the remedy happens after the paint, which is the same lesson every wall system in this library teaches.

## Acceptance in a renovation

A basement or interior renovation is accepted differently from new construction. There is no independent inspector for most of it, the householder is the client and the quality controller, and the evidence is whatever was photographed.

The minimum a householder should insist on is a walkthrough before boarding, photographs of the cavity with the insulation and sealing visible, and a note of what board was used where. That is enough to answer the questions that arise in the following decade.

## Tolerances under real lighting

A wall judged under a torch at an angle will always show more than a wall judged in daylight, and both are legitimate conditions: the torch is how the finishing trade finds defects while the compound is still soft, and daylight is how the householder will see the result.

The reconciliation is that the surface is inspected with the torch during the work and accepted under the conditions the specification named. A wall that passes under a torch passes in daylight.

The same distinction applies to flatness. A three millimetre deviation reads as nothing under a matt finish and as a shadow under a gloss, so the finish level and the tolerance belong together in the specification rather than in an argument afterwards.

## The defects a householder can actually see

By the time a room is handed over, the evidence available to a householder is limited but useful: how the walls look under a light, how the doors behave, how the room sounds, and whether anything feels loose.

A door that swings shut on its own suggests the wall is out of plumb. A hollow patch that flexes under a hand suggests a stripped or missed screw. A wall that transmits conversation clearly suggests an unsealed perimeter or a shared box. A ceiling stain suggests water, which belongs to a different investigation.

Those four observations cover the majority of real failures, and each of them points to a specific gate in this article rather than to a general complaint.

## Why the fire gates carry the most weight

Of the seven gates in this article, the fire ones are the least visible and the most consequential. An acoustic failure is annoying and expensive; a fire separation that does not perform can be lethal.

The reason the risk is high is that a compromised fire assembly looks exactly like a sound one. Paint covers the board, ceiling tiles hide the void, and the penetrations are behind a wall that no one opens. The only defence is the inspection at the moment of construction and the record that it happened.

That is the argument for treating the firestopping check as a scheduled item rather than an afterthought, with a photograph at every penetration. Two minutes per penetration, once, against a failure nobody discovers in time.

## Reading a defect list honestly

Not every mark on a wall is a defect, and the discipline of acceptance is separating the two.

A faint shadow along a joint in a raking light at hand distance is normal. A ridge that can be felt with a fingertip is a finishing defect. A hollow that flexes under pressure is a fastening defect. A crack that opens more than a hairline in the first season is a movement question.

Sorting observations into those four categories before calling anybody is what turns a complaint into a work order, and it is the same sorting a contractor does when they arrive. The categories also decide who owns the remedy, which is the part that tends to matter most once the room is in use.

The final judgement on any steel partition is therefore straightforward. It is straight, it is quiet enough for its purpose, it is sealed where it matters, and it will hold what gets hung on it. Everything else is paint.

## References

1. ASTM International, *ASTM C645 Standard Specification for Nonstructural Steel Framing Members*.
2. Steel Framing Industry Association.
3. American Iron and Steel Institute.
4. Underwriters Laboratories of Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows penetrations punched and burned through a drywall assembly that was required to have a fire-resistance rating, photographed by Achim Hering and placed in the public domain via Wikimedia Commons. It is a real photograph, not AI generated, and it is the exact failure the firestopping gate exists to catch. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle4$, 9, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Drywall_firestop_problem3.jpg/1280px-Drywall_firestop_problem3.jpg')
, ('ca-steel-frame-drywall-maintenance', 'Steel Frame and Drywall Maintenance in a Canadian Home', 'A Canadian maintenance guide for steel stud and drywall interiors: rust at cut edges, condensation on cold steel, stripped screws, patching, ceiling texture repair, and keeping fire and sound separations intact.', $wallarticle5$# Steel Frame and Drywall Maintenance in a Canadian Home

A steel-framed interior asks less maintenance than a wood-framed one and responds to different problems. It will not shrink, warp or feed mould, so the seasonal cracking that plagues wood partitions is largely absent. What it does instead is rust where the galvanizing is gone, condense where the steel is cold, and lose its fire or sound performance quietly when somebody alters it.

## Rust at cut edges and field holes

Galvanized steel is protected by its coating, and any cut, drilled or abraded edge is unprotected. In a dry interior that hardly matters. In a basement, a bathroom wall or a laundry room, those edges are where corrosion begins.

The maintenance answer is mostly preventive: a cut edge that was primed at installation will not rust. Where rust is found, the response is to remove it, dry the area, treat with a zinc-rich product and deal with the moisture source, because surface rust on a stud is usually a symptom rather than the problem.

## Condensation on cold steel

An exterior steel-framed wall in a Canadian winter has a specific vulnerability. The steel conducts heat far more effectively than wood, so a stud that bridges the insulation becomes a cold surface, and warm interior air reaching it can condense. The moisture then sits against the board's back face and inside the cavity, where nobody sees it [7](https://natural-resources.canada.ca/energy-efficiency/buildings).

The design response is continuous exterior insulation and a thermal break, and the maintenance response is to keep the interior vapour and air barriers intact. A householder who notices a damp patch on an exterior steel-framed wall, or frost on the back of a removed baseboard, has found a thermal rather than a plumbing problem.

Interior partitions do not have this issue. It is a characteristic of exterior steel framing in a heating climate, and it is why the system's Canadian use concentrates indoors.

## Stripped screws and loose fixings

Fine-thread screws hold well in steel until they are overdriven, and then they hold nothing. A stripped screw leaves a fixing that may look filled and finished but carries no load.

The symptom is a hollow sound when the wall is tapped, or a board that flexes locally. The repair is to drive a new screw a short distance from the failed one, fill the dimple with a setting compound, sand and repaint. For anything heavy, an appropriate anchor into the stud or a backing plate is the answer rather than a larger screw.

## Patching board on a steel wall

Patching a hole in a steel-framed wall is the same process as anywhere else: cut back to sound board, install a backing piece or repair clip, fit a plug, tape, feather in three passes, sand, prime and repaint.

The difference is what happens behind the board. A steel partition has no stud depth to hide a cable that was pulled out of position, and the cavity is often shared with services. Before cutting, it is worth knowing what is inside the wall, which is why the construction photographs suggested in this library's quality article are worth keeping.

## Ceiling texture and its repair

Many Canadian homes have textured ceilings, and the texture is the part of the interior most likely to need attention: a water stain from a roof or an upstairs bathroom, a crack along a board joint, or the marks left by a removed fixture.

Repairing a texture means matching it, and matching means practice on a spare board. The compound is applied with a brush, roller or trowel depending on the pattern, and the trick is consistency rather than technique. Where a patch cannot be matched invisibly, the practical options are to re-texture the whole ceiling or to skim it flat, and skimming is often the better long-term answer.

A stain that has been painted over without addressing the leak will return, usually with a friend.

## Keeping the separations intact

The fire and sound performance of a steel partition is a property of the whole assembly, and renovation is where it is most often lost. A new electrical box cut into a party wall, a door added to a corridor wall, a service run through a ceiling that is part of a separation: each is a change to a rated assembly.

Firestopping is the specific requirement, and it is the detail most often skipped. Where a renovation creates a penetration in a rated wall, the penetration must be sealed with a listed material, and the same applies to any hole left by a removed cable or pipe [4](https://www.ul.com/canada).

The householder's version of this rule is simple: do not cut holes in a wall you have been told is a fire separation without a plan for sealing them.

## Sound, after the fact

Acoustic performance degrades in predictable ways: a box added back-to-back with one on the other side, a gap opened at the top plate during a renovation, insulation pulled out to make room for a pipe.

Improving sound after the fact is possible but limited. Sealing gaps and adding insulation through an access hole helps. Adding a second layer of board to one face helps more, and it is a real project rather than an afternoon's work. The honest advice is that the cheap gains come from sealing, and the expensive gains come from rebuilding.

## A short annual routine

An annual hour covers most of it. Look along the walls with a light for new cracks and screw heads, check ceilings for stains and texture damage, look at the base of exterior walls in winter for condensation or frost, test the exhaust fans with a tissue, and check that any renovated area still has its firestopping.

The list is short because the system is stable. Steel does not move with the seasons, so a steel-framed interior that changes is telling you about water, about a structural change, or about something that was altered.

## Basement specifics

A finished Canadian basement is where steel framing does most of its residential work, and it is also the most demanding environment in the house. The foundation wall is cool, the slab can transmit moisture, and the space may be closed up for months at a time.

The maintenance priorities follow from that. Keep the interior surface dry and the humidity controlled. Watch the base of exterior walls and the corners for condensation in winter. Confirm that the insulation and the vapour barrier against the foundation are intact, and that any renovation has not interrupted them. Keep furniture far enough off the wall to allow air movement.

Rust on a stud in a basement is a signal, not a cosmetic issue, and the signal is moisture. The remedy starts with finding where it comes from: a foundation leak, a downspout discharging against the wall, a bathroom without an exhaust fan, or a slab with no vapour barrier beneath it.

## What a renovation must restore

Any renovation that opens a steel partition should end with the assembly in better condition than it was found.

That means the vapour and air barrier repaired and sealed rather than taped over a gap. Insulation replaced rather than compressed back into place. Firestopping reinstated at every penetration in a rated wall. Acoustic sealant reapplied at the perimeter. Board replaced with the same type and layer count where a rated assembly is involved.

The temptation is to close the wall quickly with whatever is to hand. The cost of doing it properly is a tube of sealant and a square metre of the right board.

## Repainting a steel-framed room

Repainting is straightforward and follows the general rule for drywall: clean, fill and sand defects, spot prime the repairs, then two coats with a roller, cutting in first.

Two Canadian details are worth keeping in mind. Basement rooms benefit from a paint rated for higher humidity, and ceilings in textured finishes need a coat that does not flatten the pattern. Where a wall has stripped screws behind the paint, filling the resulting hollow before repainting is worth the twenty minutes.

## When to call a professional

Most maintenance on a steel-framed interior is within reach of a careful householder. The exceptions are the ones where the assembly's performance is at stake rather than its appearance: a fire separation that needs a new penetration, an acoustic separation that has failed, a structural change to a wall that was designed to carry load, and any moisture problem whose source cannot be identified.

The test is whether the work could reduce the wall's fire or sound performance. If it could, the work belongs to somebody who will restore it, and the record of what was there before belongs in the folder of photographs the house should already have.

## Insulation as a maintenance item

Insulation in a partition has no shelf life of its own, but it does not survive renovation well. Batts pulled out to make room for a pipe and pushed back compressed will not perform as they did, and batts removed and not replaced leave a hollow section in a wall that was built to be filled.

Where a wall's sound performance matters, the state of its insulation is worth checking during any repair that opens the cavity. Replacing a compressed batt costs less than a roll of tape and is the difference between the wall as designed and the wall as altered.

The same applies to fire-rated assemblies, where cavity insulation may be part of the listing and its absence is a defect rather than a shortcut.

## A file worth keeping

The last maintenance item is documentation. Keep the drawings, the photographs from construction, the receipts for any repair, and a note of which walls are fire separations.

That file answers the questions that matter later: where the backing is, which wall is rated, what board is behind the paint, and when the last repair happened. Houses change hands and trades change too, and the file is the only thing that carries the knowledge forward.

It is also, in a modest way, what makes a renovation safe. A renovator who knows what is inside a wall does not need to guess.

## Small repairs, done once

Most householder repairs on a painted wall fail because they are done twice. A filled hollow that was not feathered wide enough shows under paint, so the repair is sanded back and refilled, and the surface ends up dished.

The method that works is unhurried: fill slightly proud, feather beyond the repair with each pass, sand with a block under a light, prime the patch, and paint a wider area than the damage. The extra five minutes at the second stage saves the whole third attempt.

That logic applies to every item in this article. The repairs that last are the ones that treat the wall as an assembly rather than a surface.

## References

1. ASTM International, *ASTM C645 Standard Specification for Nonstructural Steel Framing Members*.
2. Steel Framing Industry Association.
3. American Iron and Steel Institute.
4. Underwriters Laboratories of Canada.
5. National Research Council Canada, *Codes Canada*.
6. National Research Council Canada, *Codes Canada publications*.
7. Natural Resources Canada, *Energy efficiency for buildings*.
8. Canada Mortgage and Housing Corporation, *Housing professionals*.
9. Government of Ontario, *Ontario Regulation 332/12*.

## Image credit

The cover photograph shows a textured drywall ceiling, taken by Loadmaster (David R. Tribble) and made available under CC BY-SA 3.0 via Wikimedia Commons. It is a real photograph, not AI generated, and the texture shown is the kind this article's repair section deals with. Its license was verified through the Wikimedia Commons API when this article was drafted.

$wallarticle5$, 8, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Drywall-4221R.jpg/1280px-Drywall-4221R.jpg')
) AS a(slug,title,excerpt,content,read_time_minutes,theme,cover_url)
JOIN public.learn_wall_finishing_topics t ON t.market_code='CA' AND t.candidate_key='system:ca-steel-frame-drywall'
JOIN public.learn_wall_finishing_article_slots slot ON slot.topic_id=t.id AND slot.market_code=t.market_code AND slot.theme_key=a.theme AND slot.language_code='en'
ON CONFLICT (slug) DO NOTHING;

UPDATE public.learn_wall_finishing_article_slots slot
SET article_id=a.id
FROM public.learn_wall_finishing_topics t, public.learn_articles a
WHERE slot.topic_id=t.id AND slot.market_code='CA' AND t.market_code='CA'
  AND t.candidate_key='system:ca-steel-frame-drywall'
  AND a.wall_topic_id=t.id AND a.wall_market_code='CA' AND a.wall_language_code='en'
  AND a.wall_article_theme=slot.theme_key AND slot.language_code='en';

COMMIT;
