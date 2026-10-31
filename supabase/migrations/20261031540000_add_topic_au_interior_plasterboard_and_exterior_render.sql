-- AU batch 3: interior plasterboard to paint, and exterior render to paint.
BEGIN;

WITH t AS (SELECT id, candidate_key FROM public.learn_wall_finishing_topics WHERE candidate_key IN ('assembly:au-interior-plasterboard-paint','assembly:au-exterior-render-paint'))
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope)
SELECT t.id, s.title, s.publisher, s.url, s.claim_scope
FROM t CROSS JOIN (VALUES
  ('Plasterboard installation and finishing guidance','Gyprock (CSR)','https://www.gyprock.com.au/','Australian plasterboard fixing, jointing and level of finish'),
  ('National Construction Code','Australian Building Codes Board','https://www.abcb.gov.au/','Australian compliance requirements for wall linings and finishes'),
  ('Painting specification and coating selection','Dulux Australia','https://www.dulux.com.au/','Australian coating systems, preparation and recoat intervals'),
  ('Trade standards for painting and decorating','Master Painters Australia','https://www.masterpainters.com.au/','Australian trade practice for interior and exterior painting'),
  ('Render and masonry coating guidance','Think Brick Australia','https://www.thinkbrick.com.au/','Australian masonry, render and external coating practice')
) AS s(title,publisher,url,claim_scope)
WHERE NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources x WHERE x.topic_id=t.id AND x.url=s.url);

INSERT INTO public.learn_articles(slug,title,excerpt,category_slug,status,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,cover_image_url,read_time_minutes,meta_title,meta_description,content)
SELECT a.slug,a.title,a.excerpt,'surface-preparation','draft',a.market,t.id,a.theme,'en',a.cover_url,a.mins,a.meta_title,a.meta_description,a.content
FROM (VALUES
('au-interior-plasterboard-paint-overview','Plasterboard to Paint in Australia: How the Finish Is Built','The full Australian sequence from fixed plasterboard to a painted wall: jointing levels, sealer and the two-coat system, and why the stopping decides what the paint looks like.','AU', $wallarticle1$# Plasterboard to Paint in Australia: How the Finish Is Built

An Australian plasterboard wall reaches a painted finish through a sequence that nobody sees once it is done: sheets fixed to frames, joints taped and stopped, screw heads filled, the whole surface sanded, a sealer applied, and then two coats of paint. The plasterboard to paint sequence is the most repeated wall process in Australian residential building, and the part that decides the outcome is the stopping, not the paint.

This article sets out how that sequence works, what each stage is for, and where it goes wrong. The three companion articles cover the materials, the installation sequence and the inspection that follows.

## What does "plasterboard to paint" actually involve?

It is a three-stage process: mechanical fixing, joint treatment, and coating.

Mechanical fixing means the sheets are screwed to the studs at set centres with the joints arranged on framing. Joint treatment means those joints, plus the screw heads and the internal corners, are taped and filled with compounds in stages and then sanded. Coating means a sealer followed by two finish coats.

Each stage has its own tolerance. The frame has one, the lining has one, the stopping has one, and the paint has none worth arguing about, because paint shows everything the earlier stages left behind.

## Why does the joint treatment decide the result?

Because a taped joint is a shallow depression that has to be filled in a way that does not show under raking light.

The tape bridges the gap; the compounds feather the fill out over 200 to 300 millimetres each side so the transition disappears. Get the feathering wrong and the wall reads as a series of ridges under a window light, no matter how good the paint is.

Painters call this telegraphing. It is one of the few defects that cannot be fixed with paint, which is why a sensible builder inspects the stopping before the sealer goes on.

## What level of finish should an Australian home have?

Level 4 is the normal domestic standard, and it is what a client is usually buying when nothing is specified.

Level 4 means all joints and corners are taped and coated with three passes of compound, screw heads are spotted, and the finish is suitable for flat paint under ordinary lighting. Level 5 adds a skim coat over the whole surface and is specified where raking light, gloss paint or critical lighting will fall across the wall.

The levels are defined in AS/NZS 2589, the gypsum lining standard. Asking for level 5 without changing the lighting is a common way to pay for something nobody will see.

## Where does the moisture go?

Into the frame cavity, if the wall is detailed properly, and into the lining if it is not.

Plasterboard is dimensionally stable until it is wet, and then it swells, sags and stains. Australian practice puts a vapour-permeable sarking or building wrap outside the frame in brick veneer construction, so bulk water drains and vapour escapes.

Inside the house, the wet areas are the risk: kitchens, bathrooms and laundries. The lining in those rooms is usually moisture-resistant board, and the paint is a washable low-sheen rather than a flat finish.

## How long does the sequence take?

For a typical house, jointing and sanding runs three to four working days after the sheets are fixed, then the painter takes two to three days including drying.

Drying dominates. Compound needs to dry between passes, and paint needs its recoat window. A crew that rushes the compound passes traps moisture and gets shrinkage cracks along the joints a month later.

In humid weather the drying time roughly doubles unless the building is closed and ventilated mechanically.

## What does it cost?

As a rough Australian guide, stopping and finishing a plasterboard wall runs about 12 to 22 dollars per square metre of wall area, depending on level of finish and ceiling height.

Painting a prepared interior wall runs about 8 to 15 dollars per square metre for two coats over a sealer, with the lower end for large uncluttered areas and the higher end for rooms with lots of cutting in.

Both figures exclude the plasterboard supply and fixing, which sits in a separate trade price.

## Who does the work?

Two trades, and the handover between them is where disputes begin.

The plasterer fixes and stops the lining. The painter prepares and coats it. In between, the painter is entitled to a surface free of ridges, dust and unbranded screw heads proud of the board.

Contracts that name the finish level and put the stopping inspection before the sealer remove most of that argument before it starts.

## What goes wrong first?

Shrinkage cracks along joints, screw pops, and visible ridges under raking light.

All three come from the same root: too much compound in one pass, or a pass applied before the previous one had dried. They appear within weeks to months, usually after the client has moved in, which is the worst possible time to be repairing them.

The remedy is patient application, and the inspection that catches the impatient version before the paint goes on.

## Can a painted wall be upgraded later?

Yes, but at a cost that argues for getting it right the first time.

Upgrading from a flat to a skimmed surface means re-coating the joints and skimming, which is dusty work in an occupied house, then repainting the whole wall because a patch will not match.

Repainting alone does not improve the level of finish. It reproduces whatever the substrate is doing, more expensively.

## How does the finish behave in an Australian climate?

The interior lining is protected from weather, so the main variables are humidity and sun.

In the north, humidity slows compound drying and pushes a builder towards moisture-resistant board and better ventilation during construction. In the south, the risk is heating and cooling cycles that move timber frames and work the joints.

Neither changes the sequence. Both change the drying allowances a realistic programme needs.

## What should a client ask for in writing?

Four things: the level of finish, the paint system and sheen level, the drying allowance in the programme, and who inspects the stopping before sealing.

Specifying "level 4, low sheen acrylic, three coats including sealer, stopping inspection signed off before sealer" is a paragraph that prevents most of the disputes this article describes.

It also gives the painter something to price against, which usually lowers the price rather than raising it.

## What the other articles cover

Materials covers sheets, compounds, tapes, cornice, sealers and paints. Installation covers the fixing, jointing and coating sequence in order. Quality covers the inspection that decides whether the wall is acceptable before it is painted.

Read together, they describe the whole path from a bare frame to a painted room.

## How does this compare with other Australian wall systems?

Against brick veneer, the difference is the lining: the bricks are the weather skin and the plasterboard is the internal finish, with the cavity and sarkage in between.

Against double brick, this system carries the frame and the insulation, where masonry carries both. Against light steel frame, the sequence is identical and only the frame material changes.

That is the useful thing about the sequence: it survives the change of system around it.\n\n## How does the finish compare with a plaster skim?

A skimmed plaster finish is harder, denser and colder under the hand, and it takes paint in a different way.

Plasterboard with compound is faster to install, cheaper per square metre, and repairable by patching. A skim coat over plasterboard borrows some of the hardness of plaster at a fraction of the cost of solid plastering.

In Australian housing the skim is a premium upgrade rather than a default, and its value is mostly in how the wall reads under light.\n\n\n## What about sound and fire performance?

Both are properties of the whole wall, not the paint or the stopping alone.

Acoustic performance comes from mass, insulation in the cavity and the way the sheets are fixed. Fire performance comes from the board type, the number of layers and the joint treatment at the perimeter.

A wall that achieves a rating on the drawing achieves it only if the lining trade builds the assembly as specified. The coating is irrelevant to both, which is why fire and acoustic defects are never paint defects.\n\n\n## How does the wall handle a heavy fixing?

Ordinary plasterboard holds pictures, mirrors and light shelving on a hollow-wall anchor. Anything heavier needs the frame.

A wall-mounted television on a bracket fixed into plasterboard alone will eventually pull out, taking a patch of board with it. Fixing into studs, or into a plywood pattress installed before lining, is the answer.

Pattresses are the cheapest form of future-proofing available and are almost always omitted because nobody thinks about them at the right moment.\n\n\n## Does the paint colour affect the finish quality?

It affects how the surface reads, which is close to the same thing for an owner.

Light colours in a low sheen hide minor variation in the board and the stopping. Dark colours in the same sheen show every ridge, every grain of dust and every lap mark.

A dark wall therefore demands a higher level of finish than a light one in the same room, and specifying dark paint over level 4 work is a decision that will be discovered under a lamp.\n\n\n## What is the role of ventilation after handover?

Fresh compound and fresh paint both release moisture and volatile compounds for weeks after the work is finished.

Ventilating the rooms during that period prevents condensation forming on cool surfaces, which is how a newly painted wall picks up a bloom or a mould patch in its first month. It also speeds the cure of the compound.

A house closed up with the heating on in winter, immediately after painting, is the classic way to produce a bloom on every ceiling.\n\n\n## How does this sequence work in a renovation?

Faster in principle, slower in practice, because the existing surfaces decide everything.

Overlaying new board on a sound old ceiling is common and quick. Removing old lining exposes framing that may need work, services that need moving, and insulation that was never installed.

The sequence is unchanged, but the inspection before lining is longer, and the allowance in the programme should reflect it.\n\n\n## Who signs off the wall?

The builder or supervisor, against the level of finish in the contract, before the painter seals.

On larger jobs a clerk of works or a client representative may also inspect. Whoever it is, the sign-off should be recorded, because the next trade inherits the surface and the argument.

A signature at that point is not bureaucracy. It is the only moment when both trades agree on what the substrate is, and it takes ten minutes.\n$wallarticle1$, 10, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/2021_Torpedo_Factory_Art_Center_interior_1.jpg/1280px-2021_Torpedo_Factory_Art_Center_interior_1.jpg', 'Plasterboard to Paint: Australian Wall Finish Sequence', 'Plasterboard to paint in Australia: jointing levels, sealer, two coats and the drying allowances, plus why the stopping decides the finish. Step by step.'),
('au-interior-plasterboard-paint-materials','Plasterboard, Compound and Paint: What an Australian Wall Is Made Of','The materials behind an Australian painted wall: sheet types and thicknesses, joint compounds, tape, cornice, sealer and the low sheen acrylic that finishes it.','AU', $wallarticle2$# Plasterboard, Compound and Paint: What an Australian Wall Is Made Of

An Australian painted wall is a stack of materials chosen in a particular order, and each one constrains the next. The plasterboard decides what compound will bond to it, the compound decides what sanding grit works, and the sanding decides whether the sealer can seal. Choosing the plasterboard, compound and paint as a system rather than three separate purchases is what separates a durable finish from a warranty visit.

## What plasterboard thickness should be used?

Ten millimetres on ceilings and walls in ordinary residential work, thirteen millimetres where the wall is fire-rated, impact-loaded or required to hold a higher acoustic rating.

Thicker board is stiffer, which reduces deflection between studs and gives a flatter wall, but it costs more and weighs more. Australian suppliers stock 1200, 1350 and 1500 millimetre widths and lengths up to six metres, so sheet choice is usually driven by the height of the wall and how few joints the crew wants to stop.

Fewer joints means less stopping, and less stopping means a flatter wall. That is the first place a careful specifier saves labour.

## What is the difference between the board types?

Standard board for dry areas, moisture-resistant board for bathrooms, laundries and kitchens, fire-rated board for walls on a fire-separation line, and acoustic board where a sound rating is specified.

Moisture-resistant board has a water-repellent additive in the core and a green or blue face paper. It is not waterproof, and it still needs a tiled or painted surface to keep water out.

Fire-rated board is denser and usually thicker, and its rating depends on the whole assembly, not the board alone. Upgrading the board without the matching frame and joint treatment does not deliver the rating.

## Which compounds are used in Australia?

Three functional types: a base or bedding compound for embedding tape, a topping compound for the final feather, and a all-purpose compound that does both.

Base compounds are stronger and shrink less; toppings sand more easily. Using topping compound to bed the tape is a common shortcut that produces a weaker joint, and using base compound as the final coat makes sanding slow and dusty.

Premixed compounds dominate domestic work; setting compounds are used where the programme cannot wait for drying.

## What tape goes into the joint?

Paper tape is the default in Australian residential work, bedded in compound and covered while wet.

Paper tape is strong in tension and resists cracking along the joint better than mesh. Mesh tape is faster and more forgiving for a novice, and is often used on repairs, but it relies entirely on the compound for strength.

Whichever is used, the tape must be fully embedded. A tape with air behind it shows as a blister within weeks.

## What about cornice and trims?

Cornice covers the junction of wall and ceiling and hides the movement that occurs there. It is fixed with adhesive and screws, or with a cornice cement where the profile allows.

Corner beads protect external corners and give a straight arris. They are fixed before the first jointing pass so the compound can blend into them.

Movement joints, where specified, are a different product again and belong to the frame design rather than the lining trade.

## Which sealer and paint suit a new lining?

A penetrating or alkali-resistant sealer on the new board, then two coats of low sheen acrylic for most domestic rooms.

Sealer does two jobs: it equalises absorption so the topcoat does not dry patchy, and it binds the surface dust that sanding leaves behind. Skipping it and applying the topcoat directly is the single most common cause of a patchy first coat.

Low sheen is the sensible default because it is washable and hides minor surface variation better than gloss while showing less dirt than flat.

## Do ceilings need a different paint?

Usually a flat or low sheen ceiling white, applied with a longer nap roller to cover the texture of the board and the stopping.

Ceilings are seen at a raking angle from below, which is unforgiving of ridges. A flat finish hides them better than a sheen, which is why ceiling white is often flat even when the walls are low sheen.

Ceiling paint also needs to be spatter-resistant, because a roller on a ceiling throws droplets across the room.

## What quantities should be planned?

Compound usage runs about one kilogram per square metre of board for a level 4 finish, split across the passes. Tape runs about three metres per square metre of joint length.

Paint coverage for a sealed plasterboard wall is around ten to twelve square metres per litre for the sealer and similar for the topcoat on a smooth surface, less on a textured one.

Ordering to those rates leaves little waste, and the leftover compound is worth keeping sealed because it stores for months.

## How are materials stored on site?

Plasterboard flat and dry, off the floor, and never leaning against a wall for long.

Boards stored on edge bow, and a bowed board cannot be fixed flat. Boards stored on damp concrete wick moisture and stain. Compound freezes and becomes unusable, so it needs a dry store in winter.

Paint stored below five degrees or above thirty-five separates and should not be used on a finish coat.

## What is the cheapest place to save money?

On the specification of the visible finish, not on the substrate.

Moving from level 5 to level 4, or from gloss to low sheen, saves real money without affecting durability. Moving from paper tape to mesh, or from sealer to a watered-down topcoat, saves a fraction of that and costs far more later.

The reasoning is simple: the cheap choices on the substrate are the ones that reappear as defects.

## What should not be substituted?

The sealer, the tape, and the fire-rated assembly. Those three are where substitution has consequences beyond appearance.

Everything else can be argued on price without much risk. Those three cannot, because each one is carrying a performance requirement rather than a cosmetic one.

## How do these materials interact with the frame?

Timber frames move with moisture; steel frames do not. The lining is fixed to one or the other, and the compound has to accommodate that.

In timber-frame housing the joints are the movement accommodation, which is why the tape and the compound matter more there than on a steel frame. In steel frame work the joint is more likely to crack from thermal movement at a penetration than from the frame itself.

## What does the material cost add up to?

For a typical room of forty square metres of wall and ceiling, board and fixing consumables land in the low hundreds of dollars, compounds and tape in the low tens, and paint in the low hundreds.

The trade labour is several times the material cost, which is the argument for not economising on the materials that the labour is applied to.\n\n## How much board does a room need?

Work from the developed area of walls and ceiling, then add 10 to 15 per cent for cutting and breakage.

A room measuring four by five metres with a 2.4 metre ceiling has roughly 43 square metres of wall and 20 of ceiling. At 10 to 15 per cent waste that is about 72 square metres of board, which is a little over 24 standard sheets.

Ordering by sheet count rather than area is how crews end up short on the last wall and making a trip to the supplier.\n\n\n## What does a level 4 finish use in consumables?

Roughly a kilogram of compound per square metre of board, plus tape at about three metres per square metre of joint.

Add a box of screws per 30 square metres, a roll of paper tape per 60 to 80 square metres of joint, and a tube of sealant per room for the perimeter junctions. Corner beads are counted per external corner.

Those rates are what a supplier will use to quote a job, and they are close enough for a homeowner buying for one room.\n\n\n## Which products are worth paying more for?

Paper tape, a proper base compound and a genuine sealer. Everything else can be bought on price.

The premium on those three is small in absolute terms and large in consequence. Tape that fails takes the joint with it, base compound that shrinks cracks, and a skipped sealer patches the first coat.

Paint is the other place where quality shows, but the difference between mid-range and premium acrylic is smaller than the difference between applying two coats and applying one.\n\n\n## How do materials behave in a cold store?

Compound stiffens and can freeze; paint separates and cannot be reconstituted reliably.

Australian sites rarely freeze, but a garage in a cold climate or an unheated new build in winter can drop low enough to affect water-based products. The fix is to store materials inside and to bring them to room temperature before use.

Applying cold compound makes it drag and dry unevenly, which is a workmanship problem caused by a storage decision.\n\n\n## What is the difference between interior and exterior products?

Exterior products carry UV stabilisers and mildew resistance that interior products do not, and interior products carry washability that exterior ones do not.

Using exterior paint inside is wasteful rather than harmful; using interior paint outside is a failure within a season. The distinction matters most on a wall that is half inside and half outside, such as a covered verandah.

Those junctions are worth specifying explicitly, because they are where the wrong tin gets opened.\n\n\n## How are materials ordered for a whole house?

Per room, then totalled, with the ceiling and wall colours treated as separate line items.

A house with three colours across walls and two ceilings needs each product in a quantity that covers its rooms plus touch-up. Ordering all colours in one delivery risks a batch difference between rooms, which is visible at a doorway.

Buying a spare litre of each wall colour at the same time is the cheapest insurance against a future patch.\n\n\n## Can a homeowner buy these materials directly?

Yes, and the quantities are small enough that a single room is a straightforward purchase.

Suppliers sell board, compound, tape, beads and paint to the public, and the advice at the trade counter is usually sound. What a homeowner cannot easily buy is the patience, because the compounds need to dry and the temptation is to keep going.

Buying the compound in setting and topping grades, rather than one all-purpose tub, is the single purchase that most improves a first attempt.\n$wallarticle2$, 9, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/2021_Torpedo_Factory_Art_Center_interior%2C_staircase.jpg/1280px-2021_Torpedo_Factory_Art_Center_interior%2C_staircase.jpg', 'Plasterboard, Compound and Paint: Australian Materials', 'Plasterboard, compound, tape, cornice, sealer and low sheen acrylic: what an Australian painted wall is made of and how each choice constrains the next.')
) AS a(slug,title,excerpt,market,content,mins,theme,cover_url,meta_title,meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='assembly:au-interior-plasterboard-paint'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.learn_articles(slug,title,excerpt,category_slug,status,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,cover_image_url,read_time_minutes,meta_title,meta_description,content)
SELECT a.slug,a.title,a.excerpt,'surface-preparation','draft',a.market,t.id,a.theme,'en',a.cover_url,a.mins,a.meta_title,a.meta_description,a.content
FROM (VALUES
('au-interior-plasterboard-paint-installation','Fixing, Stopping and Painting Plasterboard: The Australian Sequence','Step by step through an Australian plasterboard wall: sheet layout and fixing, three-pass jointing, sanding, sealing and the two finish coats, with drying allowances.','AU', $wallarticle3$# Fixing, Stopping and Painting Plasterboard: The Australian Sequence

The sequence from bare frame to painted wall is fixed, and every competent Australian crew follows the same order: fix the sheets, tape and stop the joints in passes, sand, seal, then two coats. What varies is the patience between the passes, and that is what separates a wall that looks flat for twenty years from one that cracks within a season. This is the order, with the drying allowances that the other trades need to respect.

## How are the sheets laid out before fixing?

Start from the ceiling and work down, and arrange the joints on the framing rather than wherever a sheet happens to end.

Sheets are laid horizontally on walls where height allows, so the long joint runs around the room at a comfortable height. Vertical butt joints should land on a stud, never in the field between studs, because an unsupported butt joint cracks.

Where a wall is taller than the sheet, the offcut from the top course can start the next, provided the joint still lands on framing. Planning the layout takes fifteen minutes and saves a day of stopping.

## How are sheets fixed to a timber frame?

Screws at 200 to 300 millimetre centres on studs, and 200 millimetres around the perimeter, with the screw heads set just below the paper without breaking it.

A screw driven too deep tears the paper and destroys the holding power; a screw left proud will show through the finished surface. The correct depth leaves a shallow dimple that the compound fills.

Adhesive is often used in combination with screws on ceilings and on walls where the frame is straight, which stiffens the assembly and reduces the number of fasteners.

## How does a steel frame change the fixing?

Self-drilling screws replace the timber screws and the centres stay similar, but the screw must not spin in the thin steel.

Over-driving is the common failure, and it is easy to do because the steel gives no resistance once the thread has cut through. A clutch-controlled driver set light enough to stop at the surface is the practical control.

Steel frames also transmit impact noise differently, which is why acoustic insulation and resilient mounts appear more often in steel frame units.

## How is the first jointing pass done?

Embed the tape in a bedding compound across every joint and internal corner, and spot every screw head in the same operation.

The tape is pressed into wet compound, then a thin layer is drawn over it. This pass is about adhesion, not build, and it should be thin enough that the tape pattern is still visible when it dries.

Butt joints, where two square edges meet, need wider bedding than tapered joints because there is no recess to fill.

## Why are three passes needed?

Because each pass adds width, not thickness, and the joint has to fade out over 200 to 300 millimetres to disappear.

The second pass covers the tape with a wider band. The third feathers the edges to nothing. Trying to do it in two passes means each one is too thick, and thick compound shrinks and cracks.

Between passes the compound must be dry to the touch and pale in colour. A darker patch is still wet, and covering it traps the moisture that later blisters the paint.

## How is sanding done without wrecking the wall?

With a pole sander and 120 to 150 grit, working along the joint rather than across it, under a light held at a low angle.

Raking light shows the ridges that a frontal light hides. The object is to flatten the feather, not to remove the compound, and sanding through to the paper leaves a scuffed surface that the sealer will not hide.

Dust control matters as much as the finish: a sealed room and a vacuum sander keep the dust out of the rest of the building.

## What preparation does the painter do?

Dust removal, spot priming of any repaired areas, and a check of the surface with a hand light before the sealer goes on.

Dust is the enemy of adhesion. A wall that looks clean after sanding usually is not, and the first coat lifts in patches wherever dust remained.

Any ridge found at this stage is cheaper to fix than after the sealer, because the compound still bonds to bare board.

## How is the sealer applied?

One coat, sprayed or rolled, at the coverage the manufacturer states, with edges cut in first.

Sealer on new plasterboard is usually alkali-resistant and fast drying, and it changes the surface from chalky to slightly sheened. Uneven absorption shows as a mottled first coat and is not a defect at that stage provided the sealer was applied evenly.

The sealer should not be thinned to save material. Its job is to bind and equalise, and both need film thickness.

## How are the finish coats applied?

Two coats of low sheen acrylic at the stated coverage, with the second applied after the first has dried but within the recoat window.

Cutting in at ceilings, corners and trim comes first, then rolling in a W pattern to spread the paint before laying off in one direction. Rolling in one direction gives a more even finish than working randomly.

The recoat window matters. Apply too early and the first coat lifts; wait too long and the surface hardens past the point where the second coat keys.

## What about cornice and cornice lines?

Cornice is fixed after the walls are stopped but before final sanding, so the shadow line can be adjusted and any compound squeeze-out removed while soft.

The line where cornice meets wall is a straight line across the whole room, which is why it is checked with a string rather than by eye. A wavy cornice line is visible from every corner of the room.

Painting the cornice and ceiling before the walls is the usual order, because it lets the wall coat cut a clean line at the cornice.

## How do the trades sequence around each other?

Electrical and plumbing rough-in before lining, switch and outlet cut-outs after fixing, then stopping, then painting, then fittings.

Cut-outs made after the sheets are fixed must be measured from the frame, not guessed. A box cut 20 millimetres off centre cannot be corrected by the stopping, and it will be visible forever.

Anything that penetrates the lining after the paint goes on needs a patch and a repaint of that wall, so the sequence rewards getting the services right the first time.

## What drying allowances belong in the programme?

Twenty-four hours between jointing passes in good conditions, double that in humid weather, and the paint recoat time as stated on the can.

A three-bedroom house typically needs three to four days of stopping and sanding, then two to three days of painting, assuming the building is closed and ventilated. Compressing that into two days is the most common cause of joint cracking.

The programme should carry the allowance as a line item, because it is the first thing removed when a build runs late.

## What does the sequence cost in labour?

Stopping and sanding is roughly a third of the total wall cost, and painting roughly a quarter.

The labour is dominated by the finishing, not the fixing. That is why a crew that fixes quickly and stops slowly delivers a better wall than the reverse, and why the sequence is worth protecting in the programme.

## What is the most common sequencing error?

Painting over compound that is still damp inside, usually because a deadline forced the passes closer together than the material allows.

The failure appears as a blister or a crack along the joint, weeks later, after the room is occupied. It is one of the few defects in this trade that is honestly caused by the programme rather than the workmanship, and it is still charged to the trade.\n\n## How are ceilings fixed differently from walls?

Ceilings need more support because gravity is pulling against the fixings rather than across them.

Screws at 200 millimetres on ceilings, with adhesive on the joists, is standard practice. Boards run across the joists rather than along them, and joints are staggered so four corners never meet at one point.

A ceiling fixed like a wall sags between joists and shows the pattern under paint, which is a defect no amount of stopping removes.\n\n\n## How are window reveals and door jambs sheeted?

With a measured return, cut square, and fixed so the reveal is consistent in width along the opening.

Reveals are where lining work looks either precise or improvised. A reveal that varies 3 millimetres along a door reads as a mistake to anyone who looks, and it cannot be corrected by trimming the architrave.

Setting out the reveals before fixing the wall sheets is what makes them consistent.\n\n\n## How are services penetrations sealed?

With an approved sealant or a proprietary collar, and with the fire rating of the wall considered where the wall has one.

A hole for a cable is small, but it breaks the fire separation and the acoustic seal. In a fire-rated wall the penetration needs a tested detail, not a bead of gap filler.

The lining trade usually owns this detail, which is why it appears in the fire inspection rather than the paint inspection.\n\n\n## How are the joints at different substrates handled?

With a movement joint, not a taped joint, wherever the lining meets concrete, masonry or a different framing material.

Taping across a material change guarantees a crack, because the two sides move differently. The correct detail is a back-to-back bead with sealant, and it looks deliberate when it is done properly.

This is one of the few places where a visible line in the finished wall is the mark of correct work.\n\n\n## How is a raked or raking ceiling handled?

By stopping the joint between wall and ceiling as a shadow line or with a bead, rather than trying to tape a changing angle.

The junction moves, and a taped joint at an angle cracks within a season. Builders in Australian housing use a cornice or a shadow-line bead precisely because both accommodate that movement.

The sequence is the same; only the junction detail changes.\n\n\n## What does the painter need at handover of the stopped wall?

A dust-free surface, a wall free of ridges, and confirmation that the stopping has been inspected.

That last item is the one that gets skipped. A painter who arrives to find a wall covered in visible ridges has two choices: stop and report, or paint it and carry the blame.

The trade conversation is much shorter when the inspection has already happened and been recorded.\n$wallarticle3$, 10, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/2021_Torpedo_Factory_Art_Center_interior_2.jpg/1280px-2021_Torpedo_Factory_Art_Center_interior_2.jpg', 'Fixing, Stopping and Painting Plasterboard: AU Sequence', 'Fixing, stopping and painting plasterboard in Australia: sheet layout, three-pass jointing, sanding, sealer, two coats and the drying allowances to programme.'),
('au-interior-plasterboard-paint-quality','Inspecting a Painted Australian Wall Before and After Paint','What to check on a plasterboard wall in Australia, and when: joint ridges under raking light, screw depth, cornice lines, coverage and the defects that justify rejecting a finish.','AU', $wallarticle4$# Inspecting a Painted Australian Wall Before and After Paint

Most of what decides whether an Australian painted wall is acceptable is visible before the paint goes on. The inspection that matters happens twice: once on the stopped surface under raking light, and once on the finished coat under the lighting the room will actually have. Skipping the first inspection moves every defect into the second, where it can only be argued about rather than fixed.

## When should the stopping be inspected?

After sanding and before the sealer, with the room lit by a work light held close to the wall at a low angle.

That combination shows every ridge, dimple and proud screw head. The same wall under a central ceiling light looks perfect, which is why inspections done in daylight from the doorway pass walls that fail the moment a lamp is placed against them.

The inspection should be recorded, with photographs, because the argument later is about what was agreed.

## What counts as a ridge?

A visible change in plane at a joint, detectable by eye under raking light, and by hand as a step rather than a wave.

A wave is normal in a level 4 finish. A step is not: it means the joint was built too thick or feathered too abruptly, and it will show under the finish coat.

Tolerances in this trade are visual rather than dimensional, which is why the inspection needs the right light rather than a straightedge alone.

## How are screw heads judged?

Every head should be a shallow dimple filled flush, with the paper intact around it.

A head set too deep has broken the paper and lost holding power; it will pop. A head left proud shows as a bump. Both are visible in raking light and both are cheap to fix before sealing.

On a wall with hundreds of screws, a 5 per cent failure rate is visible as a pattern, which is why spotting every head in the first jointing pass matters.

## What about cornice lines and corners?

The cornice line should be straight along the whole wall, and external corners should be sharp without being fragile.

Checked with a string line at the cornice and by eye along the arris. A deviation of a few millimetres across a three-metre wall is visible because the eye reads the line, not the measurement.

Corner beads that were cut short or fixed askew produce a wobble that cannot be corrected once painted.

## How is paint coverage checked?

By counting coats and inspecting for thin areas at edges, corners and behind fittings, not by looking at the wall from the middle of the room.

Thin coats show as a slight difference in sheen, especially on a low sheen finish, and are most common where a roller ran dry near a cut-in line. A light held across the wall reveals them.

Coverage is a film thickness question as much as an appearance one, and manufacturers state a spreading rate for a reason.

## What defects justify rejecting a wall?

Ridges under raking light, visible screw pops, cracked joints, paint thin enough to show the substrate, drips and sags in the finish, and a wavy cornice line.

A level 4 finish tolerates a slight wave and does not tolerate a step. A level 5 finish tolerates neither, which is why the level must be named in the contract before the inspection begins.

Cosmetic variation in sheen along a wall is usually a technique issue and repairable by recoating that wall.

## What defects are normal and not worth rejecting?

Faint shrinkage lines along joints that appear in the first heating season, minor dust nibs, and slight colour variation between rooms painted on different days.

Shrinkage lines are worth monitoring rather than rejecting: if they widen, the joint was under-filled; if they stay hairline, they are cosmetic.

Judging them requires knowing what the finish level was, which is the argument for specifying it.

## How should a defect be recorded?

Photograph, describe, locate, and note the lighting conditions under which it is visible.

The last item is the one that resolves most disputes. A ridge that is invisible in daylight and obvious under a 45 degree lamp is still a ridge, but the conversation needs both facts.

Recording the standard being applied, level 4 or level 5, alongside the photograph completes the record.

## What is a reasonable defect rate?

In practice, a well-stopped wall shows occasional hairline shrinkage at joints and no visible ridges or pops.

A wall with a ridge every second joint was not built in three passes, and a wall with popping screws was fixed too deep. Neither is a tolerance question; both are workmanship.

A whole house with no hairline movement at all in the first year is luck as much as skill in a timber frame.

## How is the finished wall inspected?

From every corner, with the room's own lighting on, and with a lamp held at a low angle against each wall in turn.

The first pass finds what a resident will see; the second finds what the trade would. Both are legitimate, and both should happen before handover rather than after occupation.

Ceilings deserve the same treatment from below, where raking light is unavoidable.

## What should a client do about a disputed finish?

Compare the surface to the specified level, in the specified lighting, with the photographs from the stopping inspection.

That comparison usually resolves it without an argument, because the stopping inspection records what the painter was given. Without that record, the argument becomes about the stopping and the painting at once, which is unresolvable.

## Does the paint hide small defects?

It hides colour variation and minor dust, and it exaggerates every change of plane.

Paint is a thin, semi-gloss film over a surface that is being lit at an angle. That combination turns a 0.5 millimetre step into a visible line, which is the whole reason the stopping inspection exists.

Anyone who promises that paint will cover a rough wall has not looked at one under a lamp.

## What is the single most useful check?

The raking light inspection of the stopped surface, recorded in photographs, before the sealer.

Everything else in this article follows from it. It costs twenty minutes, it happens exactly once per wall, and it moves every later conversation onto facts.

## What does remediation cost?

Repairing ridges or pops before painting is compound and labour, tens of dollars per wall. After painting it is repair plus a recoat of the whole wall, hundreds.

That ratio, roughly ten to one, is why the inspection sits before the sealer in every competent programme. The trade knows this, and the client usually learns it too late.\n\n## How is dust judged?

By wiping a hand across the surface at mid-height and looking at the palm.

Dust that comes off on a hand after sanding is dust that the sealer will lift and trap. The wall should be vacuumed and then wiped before the sealer, not merely swept.

Dust is also the most common cause of a finish that feels rough to the touch, which owners describe as a bad paint job.\n\n\n## How are patches judged?

By their edges rather than their centre: a patch is visible where it meets the original surface.

A patch that has been feathered and sanded is invisible; one that has been filled and painted shows a ring. Under raking light the ring is obvious, which is why repairs are inspected with the same lamp as the stopping.

Patching is also the only place where a mismatch of texture shows, because the patch has a different tooth from the aged surface.\n\n\n## How are acoustic and fire walls inspected?

Against the specified assembly: board type, layer count, screw spacing at the perimeter, and the sealing of every penetration.

Those criteria are measurable, unlike most of this trade. A fire wall either has the specified layers and the sealed penetrations or it does not, and the inspection should be documented against the drawing rather than by eye.

Failure here is not cosmetic, which is why it belongs in a separate inspection from the paint finish.\n\n\n## What does a reasonable inspection report contain?

The wall location, the standard applied, each defect with a photograph, the lighting conditions, and a recommendation of repair or accept.

Reports that list defects without a standard become arguments about taste. Reports that name the standard convert the conversation into a technical one that can be settled.

Two pages per house is typical, and it takes less time than the argument it prevents.\n\n\n## How are ceilings inspected from below?

Standing at the far wall, with a lamp held low, looking across the ceiling rather than up at it.

Raking light across a ceiling is unavoidable from most positions in a room, so defects invisible from a ladder in the middle show from the doorway. Inspection should mimic how the room is used.

Ceiling paint in a flat finish helps, which is why ceiling white is rarely a sheen product.\n\n\n## What about walls behind fittings?

Inspect them before the kitchen, wardrobe or vanity goes in, because nobody will see them again for years.

Those walls are the ones that get rushed at the end of a job, and they are also the ones where a leak or a fix failure will be discovered last. A photograph before the fitting goes on is worth more than an inspection after.

The same logic applies to walls behind tiles, which are inspected once and then sealed over.\n\n\n## What about the corners nobody inspects?

Wardrobes, behind fridges and the wall above a door are where the rushed work lives.

Those surfaces are still part of the contract, and they are the ones a future owner sees when the room is emptied. An inspection that walks into every corner, lamp in hand, finds a different wall from one that stands in the middle of the room.

The corners are also where a painter runs out of care at the end of a wall, which is why the cut-in line at a door head often tells you more than the middle of the wall.\n\n\n## Does a defect get worse if it is left?

A ridge does not, a live crack does, and a screw pop usually does.

A ridge is a surface shape and it stays exactly as built. A crack at a joint widens with each heating and cooling cycle once it has started. A popped screw works loose under vibration until the board around it crumbles.

That difference decides urgency: cosmetic defects can wait for a repaint, and the structural ones cannot.\n$wallarticle4$, 9, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/2021_Torpedo_Factory_Art_Center_interior_3.jpg/1280px-2021_Torpedo_Factory_Art_Center_interior_3.jpg', 'Inspecting a Painted Australian Wall: What to Check', 'Inspecting an Australian painted plasterboard wall: joint ridges under raking light, screw depth, cornice lines, coverage and what justifies rejection.'),
('au-interior-plasterboard-paint-maintenance','Repairing and Repainting a Plasterboard Wall in Australia','How Australian plasterboard walls are patched, re-stopped and repainted over their life: hole repair, screw pops, joint cracks, sheen matching and recoat intervals.','AU', $wallarticle5$# Repairing and Repainting a Plasterboard Wall in Australia

An Australian plasterboard wall is a repairable surface, and the repairs that matter are few: a hole from a door handle, a screw pop, a shrinkage crack along a joint, and a room that needs repainting because the sheen has gone flat with washing. Each has a method, and each gets harder if the repair is done with the wrong compound or painted without matching the sheen.

## How is a small hole repaired?

Clean the edges, bridge the hole with a patch or with tape, fill in two passes, sand, seal and repaint that wall.

Holes under about fifty millimetres can be filled directly if the paper around them is intact. Larger holes need a backing: a piece of board screwed to a batten inside the cavity, or a self-adhesive mesh patch for a hole up to about 100 millimetres.

The critical step is that the patch must not sit proud. A patch that stands 1 millimetre above the wall is visible forever.

## How is a hole too big for a patch repaired?

By cutting a square of board to fit and screwing it to added timber backing inside the cavity.

The cut-out is squared with a knife, the backing timber is fixed through the surrounding board, and the new piece is screwed in flush. The joint is then taped and stopped like any other, which is why this repair blends invisibly when it is done properly.

Chasing the edges thin is what finishes the job. A square patch with a hard edge always shows.

## How are screw pops repaired?

Drive a new screw 50 millimetres away from the popped one, set it correctly, then remove or recess the old screw and fill the dimple.

Simply filling over a pop fails, because the cause is a screw that has lost its grip. The new fastener carries the load and the old one is neutralised.

If pops appear in a line along a stud, the frame is moving and the repair should be monitored before the whole wall is re-stopped.

## How are joint cracks treated?

Open the crack slightly, fill with a setting compound, embed tape if the crack is more than a hairline, then feather and sand.

Filling a crack without tape is a cosmetic repair that reopens. Taping it treats the cause, which is movement between two sheets.

Hairline shrinkage at a joint that appears in the first heating season is often left alone, because it stops moving once the frame has settled.

## How is the repair blended into the existing paint?

By repainting to a natural break, such as a corner or the whole wall, rather than spotting in the middle.

Touch-up paint never matches after a few months, because the wall has aged and the paint in the tin has not. A patch on a low sheen wall shows as a change of sheen even when the colour is right.

Repainting the whole wall is usually the honest answer, and it is what a professional painter will quote.

## How often should an interior be repainted?

Every seven to ten years in a well-ventilated home, and more often in kitchens, bathrooms and hallways.

The signal is not the calendar but the surface: a wall that no longer wipes clean, or that shows a chalky film when rubbed, has lost its film and needs recoating.

Washable low sheen holds up longer than flat, which is why flat finishes belong on ceilings rather than on walls that get touched.

## What preparation does a repaint need?

Washing, deglossing where the old coat is glossy, filling any defects, and spot sealing repairs.

Modern acrylic will not adhere to a greasy or dusty surface, and kitchens are the usual failure. A sugar-soap wash and a rinse is the standard preparation, followed by a light sand on gloss.

Skipping the degloss step is why repaints peel in sheets along the walls that were wiped most often.

## How are moisture problems handled?

By fixing the source before the lining, and by using moisture-resistant board in wet areas at the repair stage.

A blister or a stain that returns after repainting is water, not paint. Staining around a ceiling edge points to a roof or flashing defect; staining at the base of a wall points to rising damp or a leak.

Repainting over either is a temporary fix that costs the same labour as the real repair.

## What about mould in humid climates?

Remove it with a proprietary treatment, correct the ventilation, then recoat with a mould-resistant paint on the affected wall.

Mould returns wherever the moisture remains, so the treatment order matters. A wall cleaned and repainted without ventilation changes will grow it back within a season.

In the northern states this is routine maintenance rather than a defect, and it belongs in a maintenance schedule.

## How are walls prepared before hanging anything heavy?

By locating the studs with a detector and fixing into the frame, or using a hollow-wall anchor rated for the load.

A plasterboard wall carries pictures without difficulty; a television or a shelf of books needs the frame. A failure pulls a patch of board off the wall and turns a ten-minute job into a lining repair.

The stud positions should be recorded when the wall is built, which is the cheapest maintenance measure available.

## What records help over the life of the wall?

Paint colour and sheen, the product and the batch, the date, and the stud positions.

Colour matching is the most common reason a repair looks wrong, and a record of the original product removes the guesswork. Batches matter because the same colour from a different batch can differ slightly.

Photographs of the wall before lining, showing framing and services, are worth more than any of it when someone drills in the wrong place.

## Can a wall be upgraded at repaint time?

Yes, and it is the cheapest moment to do it: skimming the wall to a level 5 finish during a repaint costs the skim plus one extra coat.

That is far less than upgrading a painted wall in isolation, because the room is already emptied and the painter is already on site.

It is also the only sensible time to add acoustic insulation, which requires opening the wall and is a different project.

## What does repair and repaint cost?

A single hole repair with a wall repaint runs in the low hundreds of dollars. A room repaint with preparation runs a few hundred more, depending on size and condition.

Full-house repainting is the largest item, and it is where the seven to ten year interval pays for itself against piecemeal patch repairs that never match.\n\n## How is a damaged corner repaired?

With a corner bead or a setting compound built up over the arris, then sanded back to a straight edge.

Corners take the most impact in a house, usually from furniture and doors. A metal or plastic bead pressed into wet compound restores the line; filler alone rounds it off and the corner never looks right again.

Repairing a corner is one of the few wall jobs where a straightedge is genuinely needed, because the eye reads the arris from several metres away.\n\n\n## How are textured finishes repaired?

By matching the texture, which is usually the hardest part of any repair.

A sprayed or rolled texture has a pattern that cannot be reproduced with a filling knife. The practical approach is to texture a patch of board separately and press it into the repair while wet, or to accept a slightly different texture and hide it with position.

Walls with a heavy texture age better under repair than smooth walls, because variation is expected.\n\n\n## How is a wall repainted around furniture?

In stages, wall by wall, with the room's contents moved to the middle and covered.

Cutting in around furniture is slower than an empty room and produces worse lines. Where a room cannot be emptied, painting one wall at a time and letting it dry before moving on gives a better result than working around objects.

The paint and the room both benefit from doing it in a warmer, drier week.\n\n\n## How is the colour matched after a repair?

By taking a sample of the actual paint, or the original tin, to the supplier rather than relying on a name.

Colour names are marketing; the tint formula is the specification. A supplier can match a dried sample, and a batch number on an old tin is the fastest route to an exact match.

Where neither exists, repainting the wall is cheaper than discovering the mismatch after it dries.\n\n\n## What tools does a household need for wall repairs?

A filling knife, a sanding block, a fine filler, a small roller and a brush, plus the paint.

A tube of lightweight filler and a sanding sponge handles most domestic damage without mixing anything. A setting compound is better for anything deeper than a few millimetres, because lightweight filler shrinks in a deep hole.

A cutting-in brush is worth buying separately; a good edge line matters more than most owners expect.\n\n\n## How does a wall repair affect a rental bond?

Repairs done to a reasonable standard are usually accepted, and unrepaired damage is usually charged.

Repainting a whole wall to fix a small hole is more than most tenancies require, but a visible patch ring is the kind of thing that gets noticed at inspection. Photographing the repair is the sensible precaution.

The line between fair wear and damage is the one worth discussing at the start of a tenancy rather than at the end.\n\n\n## What is the most common repair mistake?

Using a filler that shrinks and painting over it before it has dried.

A deep hole filled in one pass will sink as it dries, leaving a shallow crater that a coat of paint turns into a visible ring. Two thin passes, dried between, avoid it.

The second most common is touching up with paint from a tin that has been open for years. It never matches, and it turns a small repair into a whole-wall repaint.\n\n\n## When is a wall beyond repair?

When the board itself has crumbled, softened or delaminated over an area larger than a patch.

Sagging under a leak, a soft crumbly texture after long-term damp, or paper that lifts in sheets means the board has failed rather than been damaged. Patching that area is a temporary measure.

Replacing the section, and finding the water that caused it, is the repair that lasts.\n\n\n## Is repainting always better than repairing?

No. A wall with a hole in it needs the hole fixed before any paint is considered.

Repainting over damage simply paints the damage, and the next inspection finds a painted hole. The order is always repair, prepare, then paint the whole wall.

The exception is a wall being repainted within a planned cycle anyway, where the repair is folded into the preparation rather than quoted separately.\n$wallarticle5$, 9, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Lobby%2C_Rookery_Building%2C_LaSalle_Street_and_Adams_Street%2C_Chicago%2C_IL_-_52901198951.jpg/1280px-Lobby%2C_Rookery_Building%2C_LaSalle_Street_and_Adams_Street%2C_Chicago%2C_IL_-_52901198951.jpg', 'Repairing and Repainting Plasterboard Walls: Australia', 'Repairing and repainting Australian plasterboard walls: hole patches, screw pops, joint cracks, sheen matching, preparation and repaint intervals.')
) AS a(slug,title,excerpt,market,content,mins,theme,cover_url,meta_title,meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='assembly:au-interior-plasterboard-paint'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.learn_articles(slug,title,excerpt,category_slug,status,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,cover_image_url,read_time_minutes,meta_title,meta_description,content)
SELECT a.slug,a.title,a.excerpt,'surface-preparation','draft',a.market,t.id,a.theme,'en',a.cover_url,a.mins,a.meta_title,a.meta_description,a.content
FROM (VALUES
('au-exterior-render-paint-overview','Render and Paint on Australian Masonry: How the Exterior Finish Works','How Australian masonry walls are rendered and painted: coat build-up, curing, movement joints and the acrylic system that protects the render for a decade.','AU', $wallarticle6$# Render and Paint on Australian Masonry: How the Exterior Finish Works

An Australian rendered and painted facade is a two-part system: a cementitious render that levels and protects the masonry, and an acrylic coating that keeps water out of the render and the render out of the weather. The render and paint system on Australian masonry is specified as a whole because each layer depends on the one beneath it, and most failures at year five trace back to a decision made before the render was mixed.

## What is render for?

Levelling the wall, protecting the masonry, and providing a uniform surface for the coating.

On brick veneer, the render covers the brick and the mortar joints, which are the paths water takes into the wall. On blockwork it does the same, and on insulated systems the render is the weather skin over a softer substrate.

None of those jobs is cosmetic, although appearance is what most owners notice.

## What are the coats?

A base coat keyed for adhesion, and a finish coat at the texture and colour required.

On strong masonry the base coat can be a single coat; on absorbent or uneven backgrounds, a spatter or dubbing-out coat comes first to bring the wall to a consistent plane. The finish coat follows while the base is still green enough to bond.

Total thickness is typically 12 to 20 millimetres depending on the background, and thickness matters because thin render cracks and thick render slumps.

## Why does curing matter more than mixing?

Because cement needs water to gain strength, and render dries too fast in Australian sun.

Curing means keeping the surface damp for several days after application. Uncovered render on a north-facing wall can lose its water within hours, which leaves a weak, dusty, friable surface that will not hold paint.

The practical controls are hessian, plastic sheeting, misting, and working the elevation at a time of day when it will not bake.

## What causes cracking?

Movement, either of the substrate or within the render, and shrinkage as the cement cures.

Render cracks at stress concentrations: corners of openings, junctions between materials, long unbroken panels, and where a wall changes direction. The design answer is mesh at the corners and movement joints at set intervals.

Shrinkage cracking is a mixing and curing problem, and it shows as a fine map pattern rather than a single line.

## What are movement joints?

Deliberate discontinuities that let the render move without cracking, sealed with an elastic joint sealant.

They belong at intervals along long walls, at changes of substrate, and at the junctions between a rendered wall and a different material. Omitting them because they interrupt the finish is a decision that produces a crack in a random place instead.

The sealant in a movement joint is a maintenance item, and it is the first thing to check when a facade starts leaking.

## How is the render finished?

By the surface treatment chosen: sponge, float, scraped, or a texture coating applied over the render.

A sponge finish closes the surface and gives a fine even tooth. A float finish leaves a slightly coarser texture. A scraped finish exposes aggregate. Acrylic texture coatings are a separate product applied over the render to give colour and texture in one step.

The finish determines how the coating performs, because a closed sponged surface holds paint better than a coarse one.

## What coating goes over render?

An alkali-resistant sealer followed by two coats of exterior acrylic, usually low sheen.

Render is alkaline when new, and a sealer designed for masonry neutralises the surface and equalises absorption. Exterior acrylic is vapour-permeable, which matters because render needs to dry outwards.

Elastomeric coatings are used where crack bridging is wanted, and they cost more per litre for a film that moves rather than resists.

## Does render need to breathe?

Yes. Render releases moisture outwards, and a coating that traps it causes blistering and eventually spalling.

That is the argument against cement paint and heavy films on a wall that was damp when it was coated. Vapour-permeable acrylic lets the wall dry while keeping bulk water out.

Where a wall is persistently damp, the source is the repair, not the coating.

## How long does the finish last?

Render itself lasts decades; the coating on it needs renewal every seven to twelve years.

The interval depends on orientation, salt exposure and colour. A dark wall in full sun reaches the end of its film sooner than a light wall in shade, because thermal movement and UV both work harder.

Coastal exposure shortens it further, and salt spray is the reason coastal repaint intervals are quoted separately.

## What does it cost?

Rendering a wall runs roughly 40 to 70 dollars per square metre including materials, depending on access and finish.

Painting a rendered wall runs roughly 12 to 20 dollars per square metre for preparation, sealer and two coats, with scaffolding charged separately for two-storey work.

Repairing cracked render before repainting adds to both, which is why the render's condition should be assessed before a paint quote is accepted.

## Who does the work?

A renderer for the render, a painter for the coating, and a scaffolder for anything above single storey.

The handover point is the render's cure. Painting too early traps moisture and lifts the film; painting too late leaves a surface that needs washing and sometimes a bonding primer.

A written cure period, usually seven days minimum, belongs in the programme.

## What goes wrong first?

Hairline cracking at openings, a chalky surface where the render was not cured, and paint peeling in sheets where the render stayed damp.

All three are visible at year three to five and all three are cheaper to fix at that point than after the render spalls.

The coastal version is salt-driven: the coating chalks faster and the render behind it softens where water sits.

## What should be specified in writing?

The render mix and thickness, the curing method and duration, the coating system and sheen, the colour, and the maintenance interval.

That specification is the difference between two quotes that look identical and produce different walls in five years. It also gives the next owner of the building something to maintain against.\n\n## What about weepholes and cavities in a rendered wall?

They must stay open and clear of render, mortar and paint.

A cavity wall drains through the weepholes at its base, and rendering over them is one of the most common ways a facade starts holding water. The render should stop at the weephole line, and the coating should stop above it.

Where a weephole has been bridged, clearing it is a repair, not a maintenance preference.\n\n\n## How is render applied to brick veneer specifically?

Over the brick face, with the mortar joints raked or keyed so the render has something to grip.

A flush mortar joint gives a smooth surface that render adheres to only by suction, which is why the joints are often raked before rendering. On very smooth or dense bricks a bonding coat is added.

The veneer still needs its cavity, ties and weepholes. Render is a finish over the wall, not a substitute for the drainage behind it.\n\n\n## What is the difference between render and solid plaster?

Solid plaster is a traditional lime and sand finish, applied in thin coats and polished; render is a cementitious coat applied thicker over a masonry background.

In Australian practice the terms overlap, and what matters is the binder and the thickness rather than the name. A cement render on brick is a different material from a lime plaster on a heritage wall, and they are repaired differently.

Matching the original material matters on older buildings more than the finish looks.\n\n\n## Does rendering improve thermal performance?

Marginally, mostly by reducing air movement through the wall rather than by insulating it.

A coat of render closes the mortar joints and reduces draughts through a porous wall. The insulation value of 15 millimetres of render is small compared with any insulation product.

Where thermal performance matters, the render is part of a system with insulation behind it, not a substitute for it.\n\n\n## How does a rendered wall handle driving rain?

By shedding most of it and absorbing a little, provided the coating and the details are intact.

The render takes the impact and the coating slows absorption. Water that gets behind the render through a failed joint or a cracked sill detail has nowhere to go unless weepholes are clear.

That is why the maintenance items in this system are all about keeping water out at the edges rather than in the middle of the wall.\n\n\n## What should be photographed at handover?

Each elevation square-on, each opening and its sill detail, every movement joint, and the base of the wall with weepholes visible.

Those five sets cover nearly every future dispute: cracking at openings, water at sills, failed joints and blocked drainage. A photograph taken at handover answers the question that would otherwise be argued from memory.

Store them with the coating specification and the render mix.\n\n\n## How does render perform over foam and panel systems?

As a thin, mesh-reinforced coat over a soft substrate, carrying the weather rather than the load.

Those systems use a base coat with mesh embedded, then a texture or a coating. The render is 3 to 6 millimetres rather than 15, so impact resistance is lower and the coating carries more of the weatherproofing.

Damage repairs differently too: a panel system patch needs the same mesh and base coat, not a cement render patch.\n\n\n## What is the correct order for render and roof flashings?

Flashings first, render second, sealant last.

Render should never be run under a flashing that will be installed later, because the flashing will not sit correctly and water will track behind it. The render stops at the flashing line and the joint is sealed.

Retrofitting a flashing into a rendered wall is expensive, which is why the order is worth protecting on site.\n\n\n## How is a rendered wall insulated after the fact?

Rarely, because the render must come off or the insulation must go on the inside.

External insulated systems replace the render with a thinner reinforced coat over board. Internal insulation loses room space and moves the dew point into the wall, which is why it needs a vapour control layer.

Neither is a maintenance decision. Both belong to a retrofit assessment.\n

## What happens when render and coating are specified separately?

The renderer chooses a mix that floats well and the painter chooses a coating that sprays well, and neither has tested them together.

Most facade failures at year three are a compatibility problem between two individually reasonable choices. A single specification naming both, with a cure period and a sealer, is the fix.

It costs a paragraph at design stage and saves the cost of an elevation later.
$wallarticle6$, 10, 'overview', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Bay_window_in_rendered_house_wall_at_Broadstairs_Kent_England.jpg/1280px-Bay_window_in_rendered_house_wall_at_Broadstairs_Kent_England.jpg', 'Render and Paint on Australian Masonry: The System', 'Render and paint on Australian masonry: coat build-up, curing, movement joints and the acrylic system that protects a rendered facade for a decade.'),
('au-exterior-render-paint-materials','Render Mixes, Mesh and Exterior Coatings: What to Specify','Australian render materials: sand and cement ratios, lime and acrylic modifiers, mesh and beads, movement sealants, and the exterior coating system over them.','AU', $wallarticle7$# Render Mixes, Mesh and Exterior Coatings: What to Specify

The materials in an Australian render and paint system are ordinary: sand, cement, lime, water, a little polymer, some mesh and beads, and a coating. What separates a durable facade from a maintenance problem is the ratio, the additives and the compatibility between the render surface and the coating applied to it.

## What is the standard render mix?

Four parts sand to one part cement by volume, with lime or a polymer added for workability and adhesion.

Sharp, well-graded sand matters more than most owners realise. A sand with too much clay makes a weak render that dusts; a sand that is too coarse makes it harsh and hard to float. Builders sand is not the same as rendering sand, and substituting one for the other is a common cause of a poor finish.

Lime adds flexibility and water retention. Polymer adds adhesion and reduces the need for curing water, which is why modified mixes dominate on hot elevations.

## Does adding more cement make it stronger?

No, it makes it more brittle. A rich mix shrinks harder and cracks sooner.

The instinct to add cement for durability is the most common mixing error in rendered work. The strength that matters is tensile and adhesive, and both come from the sand grading, the water retention and the curing, not from extra cement.

Old render that has survived fifty years is usually a lean mix, well cured.

## What is mesh for?

Reinforcing the render at stress concentrations, not reinforcing the wall.

Mesh is laid in the base coat at the corners of openings, at junctions between different substrates, and across the full surface where the background is weak or where the render is thin. It does nothing useful in the middle of a large panel unless the whole panel is meshed.

Alkali-resistant mesh is the only kind suitable, because ordinary fibreglass is attacked by cement.

## What about beads and trims?

Beads give a straight arris at openings and a stop where the render ends; trims form movement joints and drip details.

They are fixed before the base coat and bedded in it, so the render holds them rather than the other way round. A bead fixed with adhesive only will lift when the render shrinks.

Stainless or plastic beads in coastal work; galvanised is adequate inland but its life is shorter than the render's.

## Which sealant goes into movement joints?

A low-modulus, exterior-grade polyurethane or hybrid sealant with a backing rod to set the depth.

The joint must be able to move plus or minus 25 per cent without the sealant tearing or the render edges spalling. Painting over the sealant is usually a mistake, because the paint cracks at the first movement.

Sealant is a maintenance item with a service life of roughly ten years, and it should be on a schedule.

## What is the difference between render and texture coating?

Texture coating is a coloured acrylic applied over the render in one or more coats, giving colour and texture together.

Rendered and painted walls use two systems: cement render plus paint, or render plus a texture coating that acts as both finish and colour. Texture coatings crack-bridge better and need repainting less often, at a higher material cost.

A wall can also be rendered and finished with a coloured render that is left uncoated, which works but requires a water-repellent treatment.

## What preparation does the coating need?

Washing, removing chalk and efflorescence, repairing cracks and hollow render, then a sealer matched to the render's alkalinity.

New render needs to be at least four weeks old and neutralised by weathering or by an alkali-resisting primer. Old render needs the chalk removed, because paint adheres to the render, not to the chalk.

Hollow-sounding render must be cut out and patched, otherwise the new coating holds a detached section in place until it falls.

## What coating should go on a coastal wall?

An exterior acrylic with good salt resistance and a light colour, applied over an alkali-resistant sealer.

Dark colours on coastal walls suffer more: they absorb heat, move more, and chalk faster under UV and salt. A light colour is a materials decision with a maintenance consequence.

Elastomeric coatings help where the render is already cracked, provided the cracks are stable rather than live.

## How much material is needed?

Render covers roughly one square metre per 20 kilograms at 12 millimetres; mesh runs at about 1.1 square metres per square metre of wall.

Exterior acrylic covers eight to twelve square metres per litre on a rendered surface, less on a coarse texture. Sealer covers more, because it is thinner.

Ordering to those rates leaves a sensible margin without stockpiling material that will not keep.

## What should never be substituted?

The mesh, the sealant and the sealer. Those three carry the performance of the system.

Sand can be sourced locally and cement is cement, but an alkali-resistant mesh replaced with ordinary scrim, or a movement sealant replaced with an acrylic gap filler, converts a designed detail into a failure waiting for the first hot week.

## How do materials interact with the coat beneath?

Each layer must be compatible with what it sits on: render on a prepared substrate, coating on cured render, sealant on clean joint faces.

Incompatibility shows up as delamination between layers rather than as a failure within one. When a coating peels, the question is what it bonded to, not what it was made of.

Material data sheets exist precisely to answer that question, and they are rarely read.

## What does the material cost look like?

For a hundred square metres of wall, render materials run a few hundred dollars, mesh and beads a hundred or so, and the coating system several hundred more.

Labour is three to five times the material cost. That ratio is the argument for buying the specified materials and paying for the time to apply them properly.\n\n## How are colours matched across an extension?

By recording the original system rather than by eye, or by accepting that the whole elevation gets recoated.

Render colour and coating colour both shift with age, so a new panel beside a ten-year-old wall will read differently even with the same product. Matching the elevation is the professional answer.

Where the budget will not stretch, matching at a corner or a downpipe is the least visible compromise.\n\n\n## What sand should a render mix use?

A washed, well-graded sharp sand with a balanced spread of particle sizes and minimal clay or silt.

Clay makes a mix that is workable and weak, and it dusts at the surface once dry. Silt reduces adhesion. A simple field test is to squeeze a damp handful: it should hold together without smearing like mud.

Brickies sand is often too fine and too clayey for render, which is why renderers specify their own.\n\n\n## How much lime belongs in the mix?

Roughly one part lime to one part cement, giving a mix of about four sand to one cement to one lime.

Lime improves workability, water retention and flexibility, and it reduces the tendency to crack. Too much lime weakens the render and makes it porous; none at all makes it harsh and brittle.

On heritage work the ratio is reversed, with lime dominant and cement limited or absent, and the repair must follow the original.\n\n\n## What does a polymer additive do?

It improves adhesion to difficult backgrounds and holds water in the mix while it cures.

Water retention matters most in hot, windy conditions where a plain mix loses its water before the cement hydrates. The polymer keeps it available, which is why modified mixes dominate on exposed elevations.

It does not remove the need to cure. It buys tolerance, not immunity.\n\n\n## Are proprietary render systems worth it?

Where they come with a tested coating system and a warranty, yes; where they are cement in a bag with a brand on it, no.

The value is in the system: base coat, mesh, finish and coating designed together, with a documented build-up. That documentation is what a warranty is enforced against.

A bagged proprietary render applied with a different coating is a bag of sand and cement with a logo.\n\n\n## How much mesh does a wall need?

Full-surface mesh on weak or mixed backgrounds and around every opening; strips of 300 millimetres at internal corners and junctions elsewhere.

Full meshing adds cost and is not needed on sound brick. Omitting corner reinforcement is where most cracking starts, because that is where stress concentrates.

Specifying the mesh layout on a drawing removes the ambiguity that leads to it being left out.\n\n\n## What does a movement joint look like when finished?

A straight, uniform line, typically 10 to 15 millimetres wide, with a recessed sealant bead sitting just below the render surface.

It should read as a deliberate detail rather than a crack. Done well it is barely visible from a distance; done badly it is a dark wavy line that draws the eye.

The sealant should not be painted, and the joint should be checked at every maintenance visit.\n\n\n## How is a colour chosen for a rendered wall?

By sample panel in the actual light, not by a colour chart indoors.

Render and coating both read lighter and warmer in full sun than on a card, and a colour judged in a showroom will look different on a north elevation. A one-metre sample panel coated and left for a week is the only reliable test.

Light colours also perform better thermally on the wall, which is a materials argument for a decision usually made on taste.\n\n\n## What does the coating specification need to state?

Product, sheen, number of coats, spreading rate and recoat interval, plus the sealer.

A specification that says "two coats of exterior paint" allows a thin coat of the cheapest product. One that names the system and the spreading rate allows the film to be measured against the litres used.

That level of detail also makes the next repaint straightforward, because the system is documented.\n

## Does the render mix affect how much paint is needed?

Yes. A coarse floated finish absorbs more coating and needs more litres than a closed sponged one.

The difference can be 20 to 30 per cent on the first coat. That is a quote difference that looks like a pricing discrepancy and is actually a surface difference.

The specification should state the finish as well as the mix, because the two together determine the coating quantity.
$wallarticle7$, 9, 'materials', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Easton_Lodge_Gardens_walled_garden_Rendered_north-west_wall_01.jpg/1280px-Easton_Lodge_Gardens_walled_garden_Rendered_north-west_wall_01.jpg', 'Render Mixes, Mesh and Coatings: Australian Materials', 'Render mixes, alkali-resistant mesh, beads, movement sealants and the exterior coating system that keeps an Australian masonry wall watertight.')
) AS a(slug,title,excerpt,market,content,mins,theme,cover_url,meta_title,meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='assembly:au-exterior-render-paint'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.learn_articles(slug,title,excerpt,category_slug,status,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,cover_image_url,read_time_minutes,meta_title,meta_description,content)
SELECT a.slug,a.title,a.excerpt,'surface-preparation','draft',a.market,t.id,a.theme,'en',a.cover_url,a.mins,a.meta_title,a.meta_description,a.content
FROM (VALUES
('au-exterior-render-paint-installation','Rendering and Painting an Australian Wall: The Working Sequence','The render and paint sequence on an Australian wall: preparation and keys, base and finish coats, curing, then washing, sealing and two exterior coats.','AU', $wallarticle8$# Rendering and Painting an Australian Wall: The Working Sequence

Rendering and painting an Australian masonry wall is two trades working to one clock. The renderer controls the surface and its cure; the painter controls the film and its adhesion. Get the sequence right and the facade lasts a decade between coats. Compress it and the paint fails inside two years, usually in a way that looks like a paint fault and is not.

## What preparation comes before the first coat?

The wall cleaned, the surface keyed, and any absorbent or uneven background dealt with.

Dust and loose mortar must come off, because render adheres to a clean substrate only. Highly absorbent blockwork needs a pre-wet or a bonding coat so it does not pull the water out of the mix before the cement has set.

Where the background is very uneven, a spatter coat goes on first to build a plane, and it must be cured and keyed before the base coat.

## How is the base coat applied?

Trowelled on and then scratched or keyed while green, to give the finish coat something to grip.

Thickness is set by the beads and the plane of the wall, typically 8 to 12 millimetres. The surface is floated to close it, then scratched with a comb or a stiff brush before it sets.

A base coat that is trowelled smooth and left polished will not hold the second coat, and the failure appears as delamination in sheets.

## When does the finish coat go on?

While the base coat is still green, typically the same day or the next, depending on weather.

That window is the whole reason renderers work in pairs and in sequence along an elevation. Once the base has cured hard, the bond is mechanical rather than chemical, and the finish coat needs a bonding agent.

In hot weather the window shortens. A crew that starts an elevation too late in the day loses it.

## How is the surface finished?

Sponged, floated, or left with a texture applied over it, depending on the specified look.

Sponging closes the surface and gives an even tooth for paint. Floating leaves a slightly coarser plane that shows texture under raking sun. A scraped or aggregate finish exposes stone and needs a different coating strategy.

The finish has to be consistent across the elevation, which is why it is done continuously rather than in patches.

## How is the render cured?

Damp for three to seven days, protected from sun and wind, without being flooded.

Hessian kept wet, plastic sheeting on a shaded elevation, or a curing membrane are the practical options. The test of adequate curing is a surface that does not dust when rubbed with a dry hand.

Curing is the single most skipped step in rendered work, and it is the reason a render that looked fine at handover is chalky at year three.

## When can paint go on?

After the render has cured and dried, usually a minimum of seven days, and ideally four weeks for a full carbonate set.

The painter's test is moisture, not the calendar: a moisture meter reading, or a plastic sheet taped over the wall for a day, tells whether the wall is still giving off water. Painting a damp wall traps the moisture under the film.

Where a programme is tight, a breathable sealer and an early-moisture-tolerant coating can buy a few days, but not a week.

## How is the wall prepared for coating?

Washed, allowed to dry, any efflorescence brushed off, cracks cut and filled, hollow render removed, and movement joints checked.

Efflorescence is salt pushed to the surface by water. Brushing it off without finding the water source means it comes back. Cracks need to be assessed as either static or live before they are filled.

The sealant in movement joints should be inspected at the same time, because a failed joint lets water behind the render.

## How is the coating applied?

An alkali-resistant sealer, then two coats of exterior acrylic, with edges cut in and the wall worked in sections.

Spray and back-roll is the standard method on large elevations: spray to lay the material down, then roll to work it into the surface and even the film. Brushing alone on a textured wall leaves a film that is too thin in the hollows.

Two coats means two coats, and the second goes on within the recoat window rather than days later.

## How is weather handled during the work?

By not coating in direct sun, in high wind, or when rain is due within the drying time.

Exterior acrylic skins over in sun and stays soft underneath, which produces a film that never fully cures. Wind causes the same problem by drying the edge of a wet coat faster than the middle.

The window is usually early morning and late afternoon. A crew that ignores it produces a wall with lap marks that no second coat hides.

## How are openings and junctions detailed?

Sealant, not render or paint, at every junction between the render and a different material, and at every movement joint.

Window and door frames move; render does not. The junction is sealed with a low-modulus sealant over a backing rod, and the coating stops short of the sealant line rather than bridging it.

Junctions that were painted over will crack, and water will follow the crack into the wall.

## What are the inspection points during the work?

After the base coat, after curing, after crack repair, and after the sealer.

Each is a chance to catch something before it is buried under the next layer. The base coat inspection looks for hollow areas and thickness; the post-cure inspection looks for dusting and shrinkage cracking; the pre-sealer inspection looks for moisture and cleanliness.

Recording each one with photographs is what makes the handover argument-free.

## What does the sequence cost in labour?

Rendering is labour-intensive: roughly 0.6 to 0.9 hours per square metre for a two-coat work on a straightforward elevation.

Painting is faster, around 0.15 to 0.25 hours per square metre per coat including cutting in, and access is a large share of the cost on two-storey work.

The curing and moisture waits are the part of the programme that cannot be compressed by adding people.

## What is the most common error?

Coating before the render has dried, usually because the paint trade was booked before the render was finished.

The failure appears as blistering or as a film that peels in sheets with the render's skin attached. It is diagnosed as a paint fault, quoted as a render fault, and caused by the programme.

The fix is a moisture test and a written cure period, which costs a day and prevents a repaint.\n\n## How are two-storey elevations handled?

In lifts, with the scaffold or the boom set so each lift can be completed and closed out before the next begins.

Working a full elevation in one continuous operation is what avoids a dry line where a coat stopped for lunch. Lifts that are too large cannot be kept wet, and lifts that are too small multiply the joints between sections.

The access method is therefore a technical decision, not just a logistics one.\n\n\n## How is the base coat checked before the finish coat?

By taping for hollows, checking thickness at the beads, and looking across the wall for belly.

This is the last moment at which a defect can be corrected cheaply. Once the finish coat is on, hollows are hidden and thickness cannot be measured without cutting in.

The check takes minutes per elevation and is the renderer's own quality control rather than the client's.\n\n\n## How is the finish coat kept consistent between days?

By finishing an elevation in one operation, or by stopping at a deliberate junction such as a corner or a downpipe.

A day joint in the middle of a wall is visible forever, because the two days will differ slightly in texture and colour. Planning the work so joints fall at natural breaks is a supervisory decision made before the scaffold goes up.

Where a break is unavoidable, a movement joint is the honest way to make it.\n\n\n## What happens if rain arrives during curing?

Fresh render can be damaged by direct rain, which washes the surface and leaves a pitted finish.

Sheeting and programme are the controls. A shower an hour after application is worse than steady rain a day later, because the surface is still green.

If damage occurs, the affected area is cut back and redone rather than patched, because a patch in green render will not match.\n\n\n## How are the junctions to a roof or a parapet detailed?

With a flashing and a sealant, and with the render stopping short of the flashing line.

The junction between a rendered wall and a roof is where most water enters a building. Render should never be relied on as the weatherproofing at a roof line; the flashing does that job.

A visible gap with a sealant bead is the correct detail, even though it looks less tidy than render run up to the roof.\n\n\n## How is a rendered wall handed over?

With the render cured, the coating complete, the movement joints sealed, the weepholes clear, and the maintenance schedule in writing.

That last item is the one most often missing. A facade with a documented system and an inspection date is easier to maintain and easier to sell.

Handover is also the moment to record photographs from fixed positions, which make every future inspection comparable.\n\n\n## What does a failed render look like at year ten?

Hollow patches, chalky dust on the hand, hairline cracking at openings and paint that has lost its sheen unevenly.

None of those is a catastrophe; together they are the signal that the maintenance cycle has been deferred. The repair at that point is still a wash, a patch and a recoat.

At year twenty without maintenance the same wall needs render replacement on the worst elevation, which is the cost the cycle exists to avoid.\n\n\n## How is the wall protected between render and paint?

With sheeting or with a temporary coating if the gap is long.

Fresh render left exposed for months collects dirt and airborne salt, which then has to be washed off before coating. On an exposed site the surface can also chalk.

Where the gap is weeks rather than days, a temporary water repellent protects the render and is designed to be coated over.\n\n\n## Does render need a primer before the coating?

On new render an alkali-resisting sealer; on old, chalky render a binding primer after washing.

The sealer is doing chemistry as well as preparation, neutralising alkalinity and equalising suction. Skipping it on new render is the usual cause of a patchy first coat.

A binding primer on old render is what stops the chalk lifting into the new film.\n$wallarticle8$, 10, 'installation', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Easton_Lodge_Gardens_walled_garden_Rendered_north-west_wall_02.jpg/1280px-Easton_Lodge_Gardens_walled_garden_Rendered_north-west_wall_02.jpg', 'Rendering and Painting an Australian Wall: Sequence', 'Rendering and painting an Australian masonry wall: preparation, base and finish coats, curing, washing, sealing and two exterior acrylic coats.'),
('au-exterior-render-paint-quality','Judging a Rendered and Painted Facade: What to Check','How to inspect Australian render and paint work: hollow spots, crack type, moisture before coating, film thickness, lap marks and movement joint condition.','AU', $wallarticle9$# Judging a Rendered and Painted Facade: What to Check

A rendered and painted facade is judged in two states: bare render, where the plane, the cure and the cracks are visible, and coated, where the film and its adhesion take over. The useful inspections happen at both, and the second cannot repair what the first should have caught.

## How is render checked for hollowness?

By tapping with a hammer handle or a light tapping tool across the elevation, at close intervals, listening for a change in sound.

A hollow note means the render has separated from the substrate. Small hollows at the edges of openings are common and often harmless; a hollow patch in the middle of a wall is a defect that will spall.

Mapping the hollows with chalk before any coating goes on turns a vague worry into a repair list.

## What crack types matter?

Live cracks that move, shrinkage cracks that do not, and structural cracks that indicate a problem behind the render.

Shrinkage map-cracking is fine and cosmetic. A single crack running from the corner of an opening, or along a floor line, is live movement and needs a movement joint or a repaired detail. A stepped crack in the masonry behind is not a render problem at all.

The renderer's assessment should say which type each crack is, not just that it was filled.

## How is the plane checked?

With a straightedge and a low-angle light along the wall, in both directions.

Render should be flat to within a few millimetres over a metre and consistent across the elevation. Belly and hollow read as a wave when light rakes across the wall, most obviously on a smooth sponged finish.

The plane matters for paint because a coating film is uniform only on a uniform surface.

## How is cure verified before coating?

By rubbing the surface with a dry hand for dusting, and by a moisture reading or a plastic sheet test for residual water.

A dusty surface means the cement never hydrated properly; the coating will bond to the dust rather than the render. A high moisture reading means the wall is still drying internally.

Both tests take minutes and both should be recorded before the sealer is applied.

## How is film thickness judged?

By coverage arithmetic against material used, and by visual inspection for thin areas at edges and in texture hollows.

Manufacturers state a spreading rate. Dividing the area by the litres used gives an average film, and a figure well below the stated rate means the coats are thin somewhere even if they look even.

Thin films at cut-in lines and in the recesses of a textured finish are the common failure points.

## What do lap marks indicate?

That a coat was applied in sun or wind, or that a wet edge was lost between sections.

Lap marks are visible as bands of slightly different sheen, and they are permanent once the film has cured. They are a technique and weather-window defect, not a material defect, and repainting the elevation is the only remedy.

Judging them requires daylight, not a torch, because the difference is in sheen rather than colour.

## How are movement joints inspected?

For sealant adhesion to both faces, for correct depth over a backing rod, and for any crack in the render at the joint edges.

A sealant that has pulled away from one face has failed regardless of how it looks in the middle. Sealant painted over is a defect in itself, because the paint will crack at the first movement.

Joint condition is also the best early indicator of water getting behind the render.

## What indicates water behind the render?

Efflorescence, dark patches that persist after rain has dried, blistering paint, and hollow render below a joint.

Salt staining under a window sill or a parapet usually means a detail above is letting water in. A wall that is dark in the same place after every rain is telling you where the water is going.

Coating over it hides the evidence and keeps the water.

## What about colour and texture consistency?

Compare panels in daylight, from the same angle, on the same elevation, and check the transition at corners.

Slight variation between elevations is normal because light falls differently. Variation within one elevation, at a corner or a day joint, is a defect that will be visible for the life of the coating.

Texture consistency is judged the same way, by raking light across the transition.

## What is a reasonable defect list at handover?

Hollow patches in mid-wall, live cracking, uncured or dusty render, sealant failures, thin films at edges, lap marks, and hollow render under joints.

Cosmetic map-cracking, slight plane variation within tolerance, and minor colour variation between elevations are not defects, provided the specification did not promise otherwise.

A written specification makes that distinction possible, which is the point of writing one.

## How should the inspection be recorded?

Elevation by elevation, with photographs taken square to the wall and with the light raking, and a note of the weather at the time.

The record is what allows a defect to be discussed at year two without re-litigating year one. It also documents the coating system and colour, which the next repaint needs.

## What does remediation cost at each stage?

Repairing hollow render before coating is a few tens of dollars per square metre. After coating, the same repair includes removing and replacing the film over that area and blending it, which rarely blends.

That ratio is why the render inspection is worth an hour of a supervisor's time, and why it belongs before the sealer rather than after the handover.\n\n## How is consistency between elevations judged?

By comparing them at the same time of day, because orientation changes the way a film reads.

A north elevation and a south elevation of the same wall will never look identical, and expecting them to is a misunderstanding of light rather than a defect. What should match is the texture and the film thickness.

Photographs taken from the same positions at handover give the next inspection a baseline that no verbal description can.\n\n\n## How is a patch of new render judged?

By its edges and its plane, in daylight, with the surrounding render as the reference.

A patch that is flush and matched in texture disappears under the coating. One that is proud, or smoother than its surroundings, shows as a rectangle for the life of the coating.

Patches are also the easiest place to see whether the original render had a sponged or floated finish, because the difference is obvious at the boundary.\n\n\n## What does a moisture reading tell you?

Whether the render still holds enough water to trap under a coating.

Readings are comparative rather than absolute: the wall should be close to the reading of a known dry reference on the same building. A reading that stays high after a week of dry weather means the wall is being fed water from somewhere.

That is a detail problem, and coating it will not fix it.\n\n\n## How are sills and copings checked?

For fall, for a drip detail, and for a sealant joint that has stayed adhered.

A sill that falls the wrong way pushes water into the wall instead of off it, and the render below it stains first. A missing drip encourages water to track back under the sill.

These are small details with disproportionate consequences, which is why they belong on the inspection list.\n\n\n## What about the base of the wall?

It should be clear of soil, paving and mulch, with weepholes visible and open.

Render that runs into a garden bed wicks water continuously, and the base of the wall is where rising damp and salt damage appear first. A 150 millimetre clearance and a free-draining surface is the standard.

Landscaping done after handover is where that clearance usually disappears.\n\n\n## How do you judge a coating that is only a year old?

For adhesion, for film thickness at edges, and for lap marks or misses on the shaded elevations.

At one year a sound coating has no peeling, no chalking beyond a faint film, and no visible bands. Problems that appear in the first year are application or moisture issues rather than wear.

Recording them in year one is what protects the owner when the same issue reappears at year five.\n\n\n## What is the role of the painter at the render inspection?

The painter should be present, because the surface being handed over is the surface they must coat.

A painter who inspects and accepts the render cannot later attribute a failure to it. A painter who is not invited to inspect will attribute every failure to it.

That single site meeting removes most of the disputes that follow a failed facade coating.\n\n\n## How are texture and colour judged together?

On the same panel, in the same light, because a texture change reads as a colour change.

A smoother patch reflects light differently from a coarser one, so a repair that matched the colour can still look like a different shade. That is why texture matching matters as much as tint matching.

Inspecting from three distances, close, three metres and across the street, catches all three scales of the problem.\n\n\n## What if the render is acceptable but the coating is not?

The coating is recoated and the render is left alone, which is the cheap outcome.

A failed coating over sound render is a preparation or application issue, and the repair is washing, sealing and recoating that elevation. The render does not need to be removed to fix a paint failure.

Separating the two judgements is what prevents an unnecessary render replacement being sold on the back of a paint defect.\n\n\n## What is the endpoint of the inspection?

A written list of defects, each with a location, a photograph and a decision of repair or accept.

That document is what makes a handover a technical event rather than a negotiation. It also gives the next inspection something to compare against.

Without it, the same defects are rediscovered at year one and argued over as if they were new.\n

## How is a repaired area checked once coated?

By looking along the wall in daylight for a change of plane or sheen rather than for a colour difference.

A repair that matched colour but not texture reads as a patch. One that matched both disappears. That is why the inspection happens with a lamp held at the same angle used for the original render inspection.

If a patch is visible, the honest remedy is recoating the elevation, not another patch on the patch.
$wallarticle9$, 9, 'quality', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Easton_Lodge_Gardens_walled_garden_Rendered_north-west_wall_03.jpg/1280px-Easton_Lodge_Gardens_walled_garden_Rendered_north-west_wall_03.jpg', 'Judging a Rendered and Painted Facade: What to Check', 'Judging Australian render and paint: hollow spots, crack types, cure and moisture tests, film thickness, lap marks and movement joint condition.'),
('au-exterior-render-paint-maintenance','Maintaining a Rendered Facade in Australia: The Cycle','What an Australian rendered and painted facade needs over time: washing, sealant renewal, crack repair, recoating intervals and the coastal additions.','AU', $wallarticle10$# Maintaining a Rendered Facade in Australia: The Cycle

A rendered and painted facade in Australia is maintained on a cycle rather than repaired at failure. The cycle is simple: wash annually, check the sealant yearly, repair cracks when they are small, and recoat before the film fails. Owners who follow it get thirty years from a render; owners who react get spalling at year fifteen and a bill that includes scaffolding.

## What does annual maintenance involve?

A wash down, a walk-around inspection at eye level and above openings, and a check of every sealant joint.

Washing removes the chalk, salt and pollution film that keeps a coating from performing. A soft brush and a mild detergent is enough; a high-pressure lance held close will drive water into cracks and damage the film.

The walk-around is where small things get caught: a hairline crack at a window corner, sealant lifting at a joint, a patch of efflorescence under a sill.

## How often should the facade be recoated?

Every seven to twelve years, and sooner on coastal or dark-coloured walls.

The signal is the film, not the calendar: chalk that comes off on a hand, colour that has faded unevenly, or a surface that holds dirt after washing. A coating that has reached that point no longer protects the render beneath it.

Recoating before failure is cheaper than repairing render, by a factor of several.

## How are cracks repaired?

Hairline shrinkage cracks are filled with a flexible filler and left; live cracks are converted into movement joints with sealant.

The distinction matters because filling a live crack with rigid material guarantees it reopens. A crack that runs from the corner of an opening is a movement crack; a random map pattern is shrinkage.

Where a crack is wider than a couple of millimetres, the render either side should be tapped to check for hollowness before filling.

## How is sealant maintained?

Inspected annually, cut out and replaced every eight to twelve years, and always replaced where it has lost adhesion.

Sealant is the weakest material in the system and the most important for water control. It fails by losing adhesion at one face, which is invisible from a distance and obvious when you press it.

Replacing sealant is a low-cost job that prevents the high-cost ones: spalling render, damp interior walls and rotten framing.

## What is different on the coast?

Salt accelerates everything: chalk formation, colour fade, metal corrosion at beads and fixings, and sealant degradation.

Washing becomes twice-yearly in exposed positions, recoating moves to the shorter end of the interval, and stainless fixings and beads are specified at the start rather than discovered as rust streaks later.

A coastal facade is maintained on the same cycle, run faster.

## How is efflorescence treated?

Brush it off dry, find the water source, and only then consider a water repellent.

Efflorescence is salt carried to the surface by water evaporating from the wall. Treating the symptom with a sealer traps the salt and pushes the damage inwards.

The water source is usually a failed sealant joint, a blocked weep hole, a cracked sill detail or a leaking roof above.

## How are mould and algae handled?

Washed with a proprietary treatment, then coated with a mould-resistant exterior paint on the affected elevation.

In humid parts of Australia, north-facing shaded walls grow algae within a few years regardless of coating quality. The treatment kills it; the coating slows its return; ventilation and sunlight do the rest.

Cleaning without treating leaves the spores to regrow under the new coat.

## How is a patch blended into an old facade?

By recoating the whole elevation, or by breaking the patch at a corner or a downpipe where light changes anyway.

A patch on a weathered facade never matches, because the surrounding film has chalked and shifted colour. The professional answer is the elevation, and quoting anything else is a promise that cannot be kept.

Where a single patch must be done, a slightly different sheen is less visible than a slightly different colour.

## What records should be kept?

The coating system, colour and batch, the date of each coat, the sealant type, and photographs at each maintenance visit.

A facade with a maintenance record is worth more at sale and cheaper to maintain, because the next coat can be specified without guesswork and defects can be traced to their cause.

Photographs taken from the same positions each year show change that memory does not.

## When does render need replacing rather than repairing?

When hollowness covers a significant area of an elevation, when the render has drummy patches that extend after repair, or when water has been getting behind it for years.

At that point patching becomes a series of failed patches, and removal and rerendering with correct detailing is the cheaper route over ten years.

That judgement should come from someone who has tapped the whole elevation, not from a photograph.

## What does the cycle cost over twenty years?

Washing annually and recoating twice, plus one sealant replacement, typically totals a fraction of a single render replacement.

The numbers vary with access, height and exposure, but the shape is the same everywhere: the maintenance cycle costs a few per cent of the building's value and the neglect cycle costs several.\n\n## What is the cheapest maintenance decision?

Washing the facade once a year, on a schedule, before anything looks wrong.

A wash removes the chalk and salt that degrade a coating from the outside, and it takes a few hours with a soft brush and a hose. The same facade left for five years needs a full recoat sooner and often a render repair as well.

Of every item in this article, the annual wash has the highest return and the lowest cost.\n\n\n## How is a facade cleaned without damaging it?

Low pressure, mild detergent, a soft brush, and a rinse from the top down.

High-pressure water driven into cracks and joints does more damage than the dirt it removes, and it can lift a sound coating at its edges. A domestic hose and a brush is sufficient for most residential facades.

Where mould or algae is present, a proprietary treatment applied and rinsed is better than increasing the pressure.\n\n\n## How often are movement joints resealed?

Every eight to twelve years, and immediately wherever adhesion has failed.

The interval depends on exposure: a joint in full sun on a north elevation hardens faster than one in shade. The test is physical, by pressing the sealant and looking at the bond line at both faces.

Resealing is a fraction of the cost of the render repair that a failed joint causes.\n\n\n## What happens if a facade is never repainted?

The coating chalks away, the render behind it absorbs water, and the wall starts to spall at its weakest points.

Spalling is the point at which the repair stops being painting and becomes rendering. That transition usually happens between year twelve and year twenty on an unmaintained wall.

Once it starts, patching follows patching, because the wall is now absorbing water faster than it can dry.\n\n\n## How is salt damage recognised?

By white bloom on the surface, by crumbling mortar or render, and by a dark damp patch that never dries.

Salt pushes material apart from inside as crystals form. On coastal walls it is normal to some degree and managed by coating and washing, not cured by them.

Where salt damage is deep, the affected render must be removed back to sound material before recoating.\n\n\n## What should a body corporate schedule contain?

An annual wash and inspection, a sealant check, a five-year crack review, and a recoat at the interval the system states.

Written into a sinking fund forecast, those four items turn a large unpredictable bill into a series of small planned ones. Facades fail predictably when nobody is looking at them and unpredictably when they are.

The schedule should name the coating system and colour, so the next vendor cannot substitute.\n\n\n## What does a well-maintained facade look like at twenty years?

Even colour, closed joints, no hollow patches, and render that still rings solid when tapped.

That is achievable on an ordinary Australian wall with ordinary maintenance. It is also the state that makes a building sale straightforward, because a facade inspection finds nothing to negotiate over.

The difference between that wall and the spalled one next door is almost never the original work; it is the washing and the sealant.\n\n\n## Should render be waterproofed?

With a vapour-permeable water repellent, not with a film-forming sealer.

Repellents keep bulk water out while letting the wall dry inwards and outwards. Film-forming sealers trap moisture and are the cause of many spalling failures on older walls.

The distinction is on the tin: look for breathability, not for a waterproof claim.\n\n\n## When should a specialist be called?

When hollowness covers a large area, when water is entering the building, or when the wall is a heritage construction of uncertain material.

Those three situations need an assessment rather than a maintenance visit. Heritage render in particular is often lime-based and is destroyed by cement repairs.

A specialist inspection costs a fraction of the repair it prevents, and it produces a written scope that contractors can price against.\n\n\n## What is the one item no maintenance cycle can skip?

Clearing the weepholes.

Everything else is about keeping water off the wall; the weepholes are what lets it out if it gets in. A cleared weephole is a drain, and a blocked one makes the cavity a bath.

It takes minutes with a piece of wire once a year, and it is the cheapest item in this entire article.\n

## What does deferred maintenance actually cost?

Roughly the cost of the missed items multiplied several times, plus scaffolding twice.

A facade that skips two recoat cycles usually needs render repair on its most exposed elevation, and the access cost is paid again on top. The maintenance cycle is designed so that access is paid once per decade instead of once per problem.

That arithmetic, not the paint, is the argument for the schedule.

## What should a maintenance budget assume?

Assume an annual wash and inspection, a sealant replacement inside the first decade, and two recoats over twenty years.

Those three items, financed sensibly, are a small annual figure rather than a large occasional one. A building that budgets them stops making decisions under pressure after a storm, which is when the expensive versions get bought.

The budget line also creates the annual visit, and the annual visit is what finds the weepholes and the sealant before they matter.
$wallarticle10$, 10, 'maintenance', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Easton_Lodge_Gardens_walled_garden_rendered_north-west_wall_and_foxglove_01.jpg/1280px-Easton_Lodge_Gardens_walled_garden_rendered_north-west_wall_and_foxglove_01.jpg', 'Maintaining a Rendered Facade in Australia: The Cycle', 'Maintaining an Australian rendered facade: annual washing, sealant renewal, crack repair, recoat intervals and the extra work coastal exposure demands.')
) AS a(slug,title,excerpt,market,content,mins,theme,cover_url,meta_title,meta_description)
JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='assembly:au-exterior-render-paint'
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
SET review_status = 'accepted', reviewed_by = coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), reviewed_at = now()
FROM public.learn_wall_finishing_topics t
WHERE s.topic_id = t.id
  AND t.candidate_key IN ('assembly:au-interior-plasterboard-paint','assembly:au-exterior-render-paint')
  AND s.review_status = 'pending';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;

ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics t
SET verification_status = 'verified', verified_by = coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), verified_at = now()
WHERE t.candidate_key IN ('assembly:au-interior-plasterboard-paint','assembly:au-exterior-render-paint')
  AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id = t.id AND s.review_status = 'accepted');
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;

SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles
SET status = 'published',
    editorial_review_status = 'approved',
    editorial_reviewed_by = coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid),
    editorial_reviewed_at = now(),
    published_at = COALESCE(published_at, now())
WHERE wall_topic_id IS NOT NULL
  AND status <> 'published';
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;

COMMIT;
