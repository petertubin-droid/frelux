-- Polystyrene ceiling article set: eleven long-form guides on what the boards
-- are, how they are sized, measured, bonded, framed, suspended, cut, jointed,
-- painted, rated for fire, and priced. Each guide links to the POP calculator
-- at /pop-ceiling-calculator, where polystyrene is the second ceiling system.
-- Upserted by slug, so re-running is safe.

insert into learn_categories (slug, name, description, icon, is_active, sort_order)
values ('ceiling-guides', 'Ceiling Guides', 'Measuring, installing and costing plaster of Paris and polystyrene ceilings.', 'Layers', true, 60)
on conflict (slug) do nothing;

INSERT INTO learn_articles (
  slug, title, excerpt, content, category_slug,
  author, read_time_minutes, status, is_featured,
  meta_title, meta_description, meta_keywords,
  published_at, sort_order, cover_image_url, market
) VALUES
(
  'what-is-a-polystyrene-ceiling', 'What a Polystyrene Ceiling Is, and Where It Belongs', 'A polystyrene ceiling is a ceiling built from high-density foam boards rather than plaster. This guide explains what the boards are, how they differ from POP, where they win, and where they should not be used.', $PS$## The short answer

A polystyrene ceiling is a ceiling finished with boards of expanded polystyrene foam, usually between 20 mm and 30 mm thick, fixed to the underside of a concrete slab or hung from a timber or metal frame. It is not a plaster. Nothing is mixed, nothing is floated on with a trowel, and nothing needs three days to dry. The board arrives flat and white, the joiner cuts it, glues or screws it, fills the joints, and the ceiling is there.

That single difference changes almost everything else about the job: the speed, the weight on the structure, the sequence of trades, the number of people needed, and the way the finished surface behaves over the next ten years.

## What the board actually is

Expanded polystyrene starts as beads of polystyrene resin containing a blowing agent. Steam expands those beads to roughly forty times their original volume, they are fused in a mould into a block, and the block is cut into sheets. The result is about ninety-eight percent air by volume, which is why a full sheet of ceiling board can be carried on one shoulder by one person, and why the material insulates so well for its thickness.

Ceiling board is made in a higher density than packaging foam, because a ceiling has to hold a straight edge over a span, take paint without dimpling, and survive being handled on site. Density is quoted in kilograms per cubic metre, and that number, more than thickness, tells you whether a board will behave. A light, crumbly board that dents under a thumb is the wrong product for a ceiling, whatever its thickness says.

Fire performance is a separate question from density and is covered in its own guide in this set, but one line matters here: if a board is sold as fire retardant, the claim should appear as a classification on a datasheet, not as a word on a wrapper.

## How it differs from a POP ceiling

A POP ceiling, in the West African and South Asian sense, is a gypsum plaster skim over a concrete soffit, reinforced with fibre and mesh, built out with screeding and moulded into cornices, roses and trays. It gives a seamless surface with no visible joints, takes any profile a mould can make, and can be repaired and re-skimmed.

A polystyrene ceiling is a boarded surface. Its joints remain joints, even when taped and filled, and a change of level is made with a cut board rather than a built-up plaster step. It is faster, lighter, cleaner and warmer, and it is less forgiving of poor workmanship at the joints, because a badly filled seam shows under glancing light forever.

Neither is better in the abstract. They suit different buildings, budgets and expectations.

### Where polystyrene wins

- **Speed.** A two-person team boards a normal room in a day. The same room in plaster is a multi-day sequence of screeding, drying and finishing.
- **Weight.** A boarded ceiling adds a fraction of the load of a wet plaster ceiling, which matters on lightweight roofs and older structures.
- **No water.** Nothing on site needs water, which removes the drying time, the staining risk to walls and the humidity spike that plaster work brings into a finished house.
- **Insulation.** The foam is a thermal break under the slab. A top-floor room with 25 mm board under a hot roof deck is measurably cooler than the same room with a plaster skim.
- **Access.** Boards come down in one piece if a pipe above needs attention, and go back without a plaster repair.

### Where POP wins

- **A seamless finish.** If the design intent is a perfectly flat plane with no visible joint lines, plaster delivers it and board does not.
- **Curves and deep mouldings.** A plasterer can run any profile. A board can be cut to a curve only up to a point, and the tighter the radius, the more wastage and the worse the result.
- **Repairability.** A cracked plaster ceiling is patched invisibly. A damaged board is replaced, and the replacement is visible until the whole ceiling is repainted.

## The installation methods, in one paragraph each

**Direct bonding to a concrete slab.** The board is glued to a clean, dry soffit with polyurethane foam adhesive, a bonding agent such as Top Bond, or a slurry of POP cement and soaked fibre. This is the standard for ground and middle floors, where there is a flat concrete slab overhead and no reason to lose ceiling height. It is the cheapest and the fastest of the three.

**Timber or metal framing under roof trusses.** Treated battens or galvanised channels are fixed beneath the trusses at 600 mm centres in both directions, and the boards are bonded and screwed to that frame. This is the detail for bungalows and top floors, where there is no slab to glue to, only a roof structure. The frame costs money and time but it also creates a service void.

**Wire-suspended drop.** Galvanised binding wire hangers are anchored into a high slab and the boards hang below it, which allows concealed pipes, wiring and a lower finished level. It is the method for multi-level designs, for rooms with a very high slab, and for hiding services that were never planned into the structure.

## What it costs, in structure rather than in figures

Prices move by state and by season, so a figure printed here would be wrong within months. What does not move is the structure of the cost, and it has four parts.

1. **Board.** Priced per sheet, by size and thickness. A 1.2 m by 2.4 m sheet covers 2.88 m²; a 1.2 m by 3.0 m sheet covers 3.60 m². Thicker and denser costs more.
2. **Bonding and jointing.** Adhesive, mesh tape or soaked fibre, and filling compound. These scale with the ceiling area and the length of seam, not with the number of rooms.
3. **Framing and fixings.** Battens or channels, screws, nails, hangers and wire. These appear only on the framed and suspended methods.
4. **Labour.** Quoted either per square metre or as a turnkey material-and-labour package. Stepped and coffered designs carry a higher rate because every step is cut twice.

The FRELUX POP calculator takes all four and keeps them separate, which is the only way to compare two suppliers' quotes honestly.

## Where a polystyrene ceiling should not be used

- **Where a ceiling is part of a fire-resisting element** unless the specified board carries the required classification and the assembly has been assessed as a whole.
- **In a wet, permanently humid space** where the board is directly exposed to water. The material does not rot, but the joints and the paint do, and mould grows on the paint film.
- **Directly over a heat source** such as a cooker or a flue without a properly specified non-combustible surround.
- **Where the design calls for a seamless sculpted finish.** That is a plaster job, and pretending otherwise wastes everyone's time.

## The measurement, in one line

Flat area is length times width. Vertical drop faces are added on top. Cornice is measured by the running metre around the perimeter. Wastage is ten percent for a plain flat room and fifteen to twenty-five percent for stepped, coffered or curved work. Then, and only then, board count is worked out from the size of board the supplier actually stocks.

That is the whole of the arithmetic, and the calculator does it in the order above so nothing is added twice and nothing is missed.

## Choosing between the two systems

Ask three questions. Is the ceiling flat or sculpted? Is there a slab to glue to? What is the timeline? A flat ceiling, a slab, and a fast handover points at board. A sculpted design points at plaster. A roof structure with no slab points at a framed board ceiling or a suspended plaster one, and the deciding factor becomes how much service space the room needs above the finished line.

The FRELUX POP calculator lets you price the same room both ways and compare the two take-offs side by side. Start with the dimensions, choose the system, and read the bill of materials before you call a supplier.
## What the board does over the years

A polystyrene ceiling changes very little after it is installed, and that is both its strength and its weakness. The foam does not rot, it does not absorb water from the air in any meaningful quantity, it does not support mould on its own surface, and it does not shrink away from a fixing. A twelve-year-old board ceiling that was installed properly looks like a two-year-old one, apart from the paint.

What does age is everything around the board. The adhesive line behind it can fail if the slab was dusty when the board went up, and the board then sounds hollow and sits slightly proud. The filled joints can hairline crack if the tape was omitted, because the joint filler alone has no tensile strength. The paint film yellows, chalks, or peels if a solvent paint was used or if the ceiling was painted over a dusty surface.

None of that is a fault in the material. It is a fault in the sequence, and the sequence is short enough that it should be got right every time: clean the soffit, prime if the adhesive maker asks for it, bed the board with continuous contact, tape every seam including the wall edge, fill in two passes, sand, then dust off before painting.

## Heat, sound and the room below

Under a hot roof, 25 mm of polystyrene board is a real thermal break. It reduces the radiant heat coming through the slab into the room, which is why top-floor rooms in board-ceilinged houses feel different from identical rooms with a plaster skim. The effect is not insulation in the roof-space sense; it is a surface barrier, and it works best when the roof space above is also ventilated.

Sound is more nuanced. A board ceiling reduces the hollow echo of a bare room, but it is not an acoustic ceiling. It does not absorb mid and low frequencies the way a mineral fibre tile does, and it does not stop impact noise from the floor above. Where a room needs genuine sound absorption, the specification is a different product, and no amount of joint filler will change that.

## The perimeter detail

Every board ceiling has a line where the board meets the wall, and that line is where most of the visible quality lives. It can be a simple filled joint, a shadow gap, a polystyrene cornice or a plaster cornice. Whatever is chosen, the board must be cut tight and straight, with a gap no wider than a couple of millimetres, because a wide ragged gap shows through even a generous cornice.

The edge line also needs reinforcing, for the same reason the board-to-board seams do. A seam that is never taped is where the first crack opens, and the wall edge is the longest seam in the room.

## Maintenance, honestly

Board ceilings are easy to keep. Dust settles, it is cleaned with a dry or barely damp mop, and the paint is refreshed every several years. Water damage from a roof leak shows as a stain on the paint, not as a collapsed panel, and the board itself usually survives if it is dried out and the leak is fixed.

The one repair that is awkward is a damaged board in the middle of a ceiling. It is cut out, a new piece is fitted, taped, filled and painted, and the repair reads as a rectangle until the whole ceiling is recoated. In a plaster ceiling the same damage is patched with filler and disappears. That difference matters in a rental or a finished home, and it is worth saying out loud before the choice is made.

## Faults that recur on site

- **Boards bonded to a dusty slab.** The adhesive sticks to the dust, not the concrete, and a year later the ceiling sounds hollow. Always brush and, where the adhesive maker specifies it, prime.
- **No tape at the seams.** The joint filler shrinks, a hairline appears, and it reappears after every repaint.
- **Twenty millimetre board on a step.** The exposed edge crumbles and never holds a line.
- **Battens at eight hundred millimetres.** The board sags between them under its own weight over a wide span, and the sag shows under a window's reflected light.
- **Solvent paint.** The foam dissolves, the surface crazes, and the ceiling has to be replaced.

Each of those is a specification error, not a material failure, and each is cheaper to prevent than to correct.
$PS$,
  'ceiling-guides', 'FRELUX Editorial', 9, 'published', true,
  'What Is a Polystyrene Ceiling? Boards, Methods and Limits',
  'A polystyrene ceiling is built from high-density foam boards rather than plaster. What the boards are, how they differ from POP, where they win and where they should not be used.',
  'polystyrene ceiling, polystyrene ceiling boards, EPS ceiling, POP vs polystyrene, foam board ceiling, ceiling materials',
  '2026-11-13 09:00:00+00', 10, 'https://media.base44.com/images/public/6a872e1df3b5e9fc45fc13fb/1c092b45d_generated_image.png', 'global'
),
(
  'polystyrene-ceiling-board-sizes-and-thickness', 'Polystyrene Ceiling Board Sizes and Thickness: Choosing the Right Sheet', 'Board size and thickness decide the board count, the seam length, the fixing pattern and the finished rigidity of a polystyrene ceiling. This guide works through each option and the trade-offs between them.', $PS$## Why the sheet size matters more than people think

A polystyrene ceiling is bought in sheets. The sheet size therefore sets three things at once: how many sheets the room needs, how much seam has to be taped, and how much of the last sheet is thrown away. Choosing 1.2 m by 2.4 m instead of 1.2 m by 3.0 m is not a small variation. On a twenty square metre ceiling it changes the board count, the joint density, and the offcut pattern.

That is why the FRELUX calculator asks for the stocked size before it asks for anything else. It is not a detail to be filled in later; it is an input to the arithmetic.

## The two sizes that cover almost every market

### 1.2 m by 2.4 m, the retail default

This is four feet by eight feet in the older units, and it is the sheet most suppliers hold in stock, most yards cut from, and most buyers recognise. One sheet covers 2.88 m².

Its advantage is availability. Whatever the town, someone has this size on the rack. Its disadvantage is joint density: laid in a regular pattern, a 1.2 m by 2.4 m sheet produces one joint run per 1.2 m in one direction and one per 2.4 m in the other, which comes to 1.25 m of seam for every square metre of ceiling. A twenty square metre room carries about twenty-five metres of board-to-board seam, before the wall edge is counted.

### 1.2 m by 3.0 m, the larger sheet

One sheet covers 3.60 m². It is sold for larger residential and commercial work, where the extra half metre reduces both the number of boards and the number of joints. Its joint density is lower: one run per 1.2 m plus one per 3.0 m gives about 1.17 m of seam per square metre.

Its disadvantage is handling. A 3.6 m² sheet of 30 mm board is awkward on a ladder in a small room, and a long sheet wastes more when the room dimension is short. In a 3 m wide bedroom, a 1.2 m by 3.0 m sheet laid across the room fits the width and leaves clean offcuts; laid along it, half of every sheet is scrap.

### The rule that decides it

Match the long edge of the sheet to the longer room dimension where the pattern allows, and prefer the smaller sheet in small or irregular rooms, where big-sheet savings disappear into offcuts. On a large, regular, rectangular ceiling, the larger sheet wins on both board count and joint count.

## Thickness: what each one is for

### 20 mm

The budget option and the flat-ceiling option. It is light, it bonds down easily, and it is the cheapest per sheet. It is also the least rigid at an exposed edge, which is why it belongs on a flat ceiling that meets a wall, not on a tray where the board edge is visible from below.

### 25 mm

The residential standard. It holds a straight edge better than 20 mm, it takes a screw without crushing, and it insulates noticeably better under a hot roof. If there is no strong reason to go either way, this is the board.

### 30 mm and above

Specified for stepped and coffered designs where the cut edge forms part of the design, for suspended grids where the board spans between supports, and where the insulation value matters most. It costs more per sheet and weighs more, so it needs more adhesive or closer fixings.

A practical warning that the calculator repeats in its results: 20 mm board on a stepped or coffered design is a false economy. The step edge is thin, it chips, and it will not hold a crisp line no matter how carefully it is filled.

## Density, which is not the same as thickness

Two boards of identical thickness can behave completely differently. Density, quoted in kilograms per cubic metre, decides how the board takes a fixing, how it resists a knock, and how flat it stays across a span.

A ceiling board should be dense enough that a thumb pressed into the face leaves no permanent mark and a screw tightened by hand does not pull through. If a supplier cannot state a density, that is information in itself.

European boards are made and tested to EN 13163, which sets dimensional tolerances and declared properties including thermal resistance. A board that meets it will have a declared class and a datasheet. That is a far better basis for a specification than the word "high density" on a price list.

## How size and thickness change the take-off

Take a 5 m by 4 m room, which is 20 m², flat, with 10% wastage allowed.

- At 1.2 m by 2.4 m, 2.88 m² per board: 22 m² of board over 2.88 is 7.64, so eight boards.
- At 1.2 m by 3.0 m, 3.60 m² per board: 22 m² over 3.60 is 6.11, so seven boards.

One board fewer, and about two metres less seam. On a small office of 3 m by 3 m, the same comparison gives four boards either way, so the larger sheet buys nothing but harder handling.

Thickness does not change the board count at all. It changes the price per board, the adhesive quantity if the board is heavier, and the specification advice. That distinction is exactly the kind of thing a quote blurred into a single square metre rate hides.

## Fitting the pattern to the room

Boards are laid in a grid, and the grid should be set out from the centre of the room so that the two edge boards are equal. An unequal edge strip looks wrong, wastes board, and is harder to fix because a narrow strip has nothing to key into.

For a room 5.2 m long with 2.4 m sheets, three full sheets cover 7.2 m in one direction and two cover 4.8 m in the other, so the pattern has to be trimmed on both axes. That trimming is where the wastage allowance is spent, and it is why a 10% allowance is right for a flat room and wrong for a stepped one.

## What to write on the order

- Board size, stated in millimetres and in the old feet and inches.
- Thickness in millimetres.
- Density or the standard it is made to.
- Fire classification, if the ceiling needs one.
- Quantity in boards, not in square metres, because that is what will be delivered.
- The installation method, because a supplier who knows the boards are being screwed to a frame may recommend a different grade.

Then put the same numbers into the calculator and confirm the board count matches what you are about to order.

## Getting the sheet count right the first time

Running short is worse than running over. A second delivery of a single board rarely matches the first batch exactly, and a shade or density difference across a ceiling is visible. Order the calculated count, keep one spare board, and store it flat and dry, because a board that has bowed in storage will not lie flat on a ceiling.

The FRELUX POP calculator keeps the quantity tied to the measurement and the sheet size you select, and leaves the price to you, so a change in supplier rates never quietly changes how much board you need.
## Four worked take-offs

The arithmetic is easier to trust when it is shown on real rooms. In every case the design is flat, the wastage is ten percent, and the wall edge is counted as seam in addition to the board-to-board joints.

**A 3 m by 3 m bedroom, 9 m².** At 2.88 m² per board the measured area plus ten percent is 9.9 m², which is 3.44 boards, so four boards. At 3.60 m² per board it is 2.75, so three boards. The seam is 9 m² times 1.25, about 11 m, plus a 12 m perimeter, so roughly 23 m of tape, which is one roll.

**A 4 m by 4 m bedroom, 16 m².** With 10% wastage, 17.6 m², which is 6.11 boards of 2.88 m², so seven. At 3.60 m² it is 4.89, so five. The seam is 20 m plus a 16 m edge, so 36 m, one roll.

**A 5 m by 4 m living room, 20 m².** 22 m², 7.64 boards, eight boards of 2.88 m², or 6.11 and seven of 3.60 m². Seam is 25 m plus 18 m, so 43 m, and with a ten percent lap that is two rolls.

**An 8 m by 10 m hall, 80 m².** 88 m², 30.6 boards, so 31 of 2.88 m², or 24.4 and 25 of 3.60 m². Seam is 100 m plus a 36 m edge, so 136 m, four rolls.

The pattern is worth noticing. The larger sheet always saves boards, and the saving is proportional to the area, but the tape saves very little because the wall edge does not change with sheet size. That is why a supplier's "one roll is enough for any room" claim is wrong on a hall and roughly right in a bedroom.

## Buying in the units the market quotes

Some markets sell board by the sheet and some quote a square metre rate and cut to order. Both are fine, but you cannot compare them until the sheet count is converted. A square metre rate multiplied by the measured area will under-order, because it ignores wastage entirely; the same rate multiplied by the area including wastage gives the right quantity, and then the sheet count is that quantity divided by sheet area and rounded up.

Where board is sold by the square foot, a 2.88 m² sheet is 31.0 ft² and a 3.60 m² sheet is 38.8 ft². It is worth writing both on the order, because a supplier working in feet and a buyer working in metres will otherwise disagree by three percent before anyone has cut a board.

## Storage and handling

Board is light but fragile at the edges. Store it flat, on a dry surface, out of the sun, and never on edge leaning against a wall for more than a day, because a board left leaning bows and will not lie flat on a ceiling. On site, stack it in the room it will be used in, on the floor, with nothing heavy on top, and bring it up to the ceiling only as it is needed.

Two people handle a 1.2 m by 3.0 m sheet comfortably. One person can handle a 1.2 m by 2.4 m sheet on a head, but not through a doorway with a return, which is exactly the doorway every bedroom has.

## Mixing sheet sizes on one ceiling

Mixing sizes is allowed and sometimes smart: 3.0 m sheets down the long axis of a long living room, 2.4 m sheets in the adjacent bedrooms, so offcuts are consumed where they fit instead of being thrown away. What must not happen is mixing thicknesses across a visible plane, because the step at the change is visible under glancing light, and mixing densities, because the two behave differently when a fixing is tightened.

## What thickness does to the fixing pattern

A 30 mm board takes a screw better than a 20 mm board: there is more material for the thread to hold, so screws can sit further apart and the frame can be lighter. A 20 mm board screwed to battens at 600 mm centres needs the screws at 200 mm to stop the board cupping between them, and a 20 mm board bonded to a slab needs a continuous adhesive bed rather than spots, because a thin board telegraphs every gap behind it.

These are the reasons thickness is an input to the take-off and not a note on the order. Change the thickness and the fixing quantities, the adhesive method and the labour rate all change with it.
$PS$,
  'ceiling-guides', 'FRELUX Editorial', 10, 'published', false,
  'Polystyrene Ceiling Board Sizes and Thickness Guide',
  '1.2 m by 2.4 m or 1.2 m by 3.0 m, 20 mm to 30 mm: how sheet size and thickness change board count, seam length, fixings and finish on a polystyrene ceiling.',
  'polystyrene ceiling board sizes, 1.2m x 2.4m ceiling board, 25mm polystyrene ceiling, board thickness, EPS sheet size, ceiling board density',
  '2026-11-13 09:05:00+00', 20, 'https://media.base44.com/images/public/6a872e1df3b5e9fc45fc13fb/96f6cd94d_generated_image.png', 'global'
,
(
  'how-to-measure-a-ceiling-for-polystyrene-boards', 'How to Measure a Ceiling for Polystyrene Boards', 'Every board, roll of tape and bag of filler comes from the measurement. This guide sets out the method for flat areas, drops, tray steps, perimeters and irregular rooms, with the mistakes that cause a shortage on the last day.', $PS$## The measurement is the estimate

Nothing else on a board ceiling is negotiable. The board count is arithmetic from the measured area, the tape is arithmetic from the joint density, and the adhesive is arithmetic from the bonded area. Get the measurement wrong by four percent and you buy a board you do not need, or worse, you run out with one row left to fix and the supplier has a different batch.

So the measurement is not a preliminary. It is the estimate. Everything the calculator returns is downstream of two numbers and a perimeter.

## What to take to site

A steel tape of at least five metres, because cloth tapes stretch and a two percent stretch on a ten metre room is two hundred millimetres. A pencil and something to write on that will not blow away. A step ladder that reaches the ceiling comfortably. A torch for dark corners and for looking into the space above a suspended ceiling. A laser measure if the room is large or the ceiling is high, but only if it has been checked against a tape on one known dimension. A camera, because a photo of each corner with the tape visible settles every later argument.

Measure in metres and millimetres, and write the millimetres. Do not round a 4,180 mm wall to 4.2 m in your head and then write 4.2; write 4.18. The rounding is where errors accumulate, and the calculator will accept the exact figure.

## Flat area, room by room

For a simple rectangular room, measure the length and the width at the ceiling line, not at the floor, multiply them, and that is the flat area. Measure at the ceiling because walls deviate: a wall that is plastered out by fifteen millimetres at the top is not visible at the floor but it changes the ceiling dimension.

Take two measurements of each dimension, one at each end, and use the smaller. A room that measures 4.18 m one end and 4.22 m the other is not rectangular, and the boards have to fit the tight dimension with the difference absorbed at the edge.

For irregular rooms, split the plan into rectangles. An L-shaped room is two rectangles; a room with a bay is a rectangle plus a trapezium, and a trapezium's area is the average of its parallel sides times the distance between them. A circular or elliptical feature is handled with the standard area formulas, and if the shape is too irregular to decompose confidently, lay a grid of one metre squares on the floor plan and count them, which is accurate to within a few percent and always errs on the side of ordering a spare board.

Worked example: a living room 5.4 m by 4.2 m with an alcove 1.2 m by 0.9 m. The main area is 22.68 m² and the alcove is 1.08 m², so the flat area is 23.76 m². That is the number that goes into the calculator, not 22.68 and not 24.

## Vertical faces, which are the ones people forget

A tray ceiling, a stepped design or a cove creates vertical surfaces, and those surfaces are cut from board. They are measured separately and added.

For each step, measure the height of the drop, usually between 100 mm and 300 mm, and the running length of the step. The running length is the perimeter of the inner edge of the step, not the room perimeter, unless the step follows the walls. For a rectangular tray inset 600 mm from every wall in a 5.4 m by 4.2 m room, the step line is 4.2 m by 3.0 m, so its running length is 14.4 m. At a 200 mm drop that is 2.88 m² of vertical face, a tenth of the room's flat area, and enough to need a second board if it is ignored.

For a double tray, the same calculation is done twice, once for each step line, and the two are added. For a design with open ends, where a drop returns to the wall rather than closing on itself, measure each straight run and add them.

Curved steps are measured with a string laid along the line and then against the tape, or with a cheap map measurer. Do not estimate a curve from its chord: a semicircle of radius 1.5 m has a perimeter of 4.71 m, and the chord across it is only 3 m, a third less.

## The perimeter, which drives cornice and edge seam

Walk the room and measure every wall at the ceiling line, then add the lengths. This is the perimeter. It is used twice: once for cornice, which is bought by the running metre, and once for the edge seam that has to be taped, which is the reason a small room needs almost as much tape per square metre as a large one.

Do not take the perimeter from the floor plan unless the walls are truly vertical. A room with a splayed window reveal or a chimney breast has a longer ceiling perimeter than floor perimeter.

## Rooms that are not one shape at one level

Many real rooms have a bulkhead, a beam, or a change of ceiling height. Treat each plane separately: measure the low area, the high area, and the vertical face between them, then add all three. A beam that projects 300 mm and runs 4 m across a room adds 1.2 m² of vertical face and 1.2 m² of the underside of the beam if it is boarded rather than boxed.

The same discipline applies under a staircase, where the ceiling slopes. Measure the slope length and the width, multiply for the area, and add the triangular portion separately.

## High ceilings, awkward access and safe practice

A ceiling at 3.5 m or more needs a proper platform, not a ladder leaned against a wall. Boarding is a two-handed job and the second hand is the one holding the board. Measure from a platform, mark the dimensions on the wall, and photograph them before the platform is moved.

For very high or cathedral ceilings, the simplest reliable method is to measure the floor and the wall heights and check one diagonal against the tape. If the diagonal matches, the plan is rectangular and the floor area equals the ceiling area. If it does not, measure the ceiling itself.

## Recording the schedule

Write each room on its own line with six numbers: length, width, flat area, drop height, drop running length, perimeter. Then the design, the board size, and the thickness. That line is what the calculator needs and what a supplier needs, and it is also the record that settles a dispute about who ordered what.

For a whole house, sum the areas and the perimeters, but keep the room lines. Ordering by the summed area is fine for board, and wrong for cornice and for the labour estimate, because the labour rate depends on how many rooms and how many edges, not only on the total area.

## The errors that cost a board

- **Measuring at the floor.** Walls lean; the ceiling is the dimension that matters.
- **Forgetting the drop faces.** Usually one to three boards on a stepped design.
- **Using the room perimeter for the step.** Overstates the drop area on an inset tray, sometimes by half.
- **Rounding every dimension up.** On a house this compounds into a whole extra board per room.
- **Not measuring the second dimension twice.** A trapezoid room has no single width.
- **Measuring to the skirting or the cornice instead of the wall face.**

## Putting it into the calculator

Enter the length and the width in the unit you measured in, choose the board size your supplier stocks, choose the thickness, then say whether this is a flat design or a stepped, coffered or curved one. If there are drops, switch them on and enter the height and the running length. The calculator will add the vertical faces, apply the wastage for the design, and return the board count, the seam length, the tape, the adhesive and the fixings.

If the perimeter you measured differs from the rectangle the calculator assumes, the difference is small enough to ignore for board, and important enough to check for cornice. Measure the cornice from the room, not from the calculator.

Everything downstream, including the price the supplier will quote, depends on this half hour with a tape. It is the cheapest part of the job and the only part that cannot be corrected later.
## Measuring for a suspended ceiling, where the finished level is not the slab

When boards hang on a frame or on wires, the ceiling plane is lower than the slab and the measured area is the same, but three extra dimensions matter. The depth from slab to finished face, because a deep void needs longer hangers and more wire; the height of any bulkhead formed by the drop, which is a vertical face; and the position of anything that must be reached from below, such as a valve or a junction box, because that becomes an access panel and an opening in the board.

Measure the depth at four points, not one. Slabs are rarely parallel to a level ceiling, and the difference between the highest and lowest void is what the hanger adjustment has to absorb.

## Converting between metres and feet without losing a board

Where the market quotes in feet, convert once, at the end, and write both figures. A foot is 0.3048 m, so a 12 ft room is 3.658 m, not 3.6 and not 3.7. An imperial tape read to the nearest eighth is accurate to about three millimetres, which is fine; the error that hurts is converting a rounded foot figure twice.

A sheet of 1.2 m by 2.4 m is 3.94 ft by 7.87 ft, or 31.0 ft². A sheet of 1.2 m by 3.0 m is 3.94 ft by 9.84 ft, or 38.8 ft². If a supplier's price is per square foot, multiply by 31.0 or 38.8 to get a price per sheet, then compare that to the sheet price. Suppliers mix the two conventions constantly, and the difference is a few percent either way.

## A whole-house schedule, worked

Take a three bedroom bungalow. Bedroom one is 4.0 m by 3.6 m, giving 14.4 m². Bedroom two is 3.6 m by 3.0 m, giving 10.8 m². Bedroom three is 3.0 m by 3.0 m, giving 9.0 m². The living room is 5.4 m by 4.2 m, giving 22.68 m². The kitchen is 3.0 m by 2.4 m, giving 7.2 m². The passage is 1.2 m by 6.0 m, giving 7.2 m². The bathrooms are 2.4 m by 1.8 m each, giving 4.32 m² each, so 8.64 m² together.

The total flat area is 79.92 m². At ten percent wastage that is 87.9 m² of board, which is 30.5 sheets of 2.88 m², so 31 sheets. The perimeters add to 15.2, 13.2, 12.0, 19.2, 10.8, 14.4 and 8.4 twice, giving 101.6 m of edge, which is the cornice length and also the extra seam that gets taped.

Order 31 sheets and 102 m of cornice, keep one sheet spare, and the house is covered. Order by area alone and somebody will come back from the merchant on day three.

## A checklist before the order goes out

- Every room measured at the ceiling line, twice per dimension.
- Irregular shapes split into rectangles and added, not guessed.
- Every step, drop and bulkhead measured for height and running length.
- Perimeter measured room by room, not taken from a plan.
- Board size confirmed against what the supplier actually holds.
- Thickness chosen against the design, with 20 mm not used on a visible step.
- Wastage matched to the design: 10, 15, 20 or 25 percent.
- Board count rounded up to whole sheets, plus one spare.
- Tape and adhesive quantities kept separate from the board quantity, because they scale differently.
- Photographs of each room with the tape in shot, filed with the schedule.

## Why this matters more on board than on plaster

Plaster is mixed on site, so a small measurement error is absorbed by mixing a little more. Board is cut and delivered, so a small error becomes a short delivery and a second trip. The measurement is the entire buffer, and it is the only part of the job that costs nothing but time.
$PS$,
  'ceiling-guides', 'FRELUX Editorial', 10, 'published', false,
  'How to Measure a Ceiling for Polystyrene Boards',
  'Measure flat area, tray drops, step risers, perimeters and irregular rooms correctly, with the errors that leave a polystyrene ceiling one board short.',
  'how to measure ceiling for polystyrene boards, ceiling drop measurement, tray ceiling measurement, ceiling area calculator, step riser area',
  '2026-11-13 09:10:00+00', 30, 'https://media.base44.com/images/public/6a872e1df3b5e9fc45fc13fb/1c092b45d_generated_image.png', 'global'
),
(
  'bonding-polystyrene-boards-to-a-concrete-slab', 'Bonding Polystyrene Ceiling Boards Directly to a Concrete Slab', 'Direct bonding is the fastest and cheapest way to hang a board ceiling, and the least forgiving of a dirty slab. This guide covers surface preparation, adhesive choice and coverage, placing the boards, and the failures to avoid.', $PS$## Why bonding is the default where there is a slab

If there is a concrete soffit overhead, flat and sound, there is no reason to build a frame under it. Glue the board to the concrete, fill the joints, paint, and the ceiling exists. No battens, no hangers, no lost height, no drilling into a slab that may contain a post-tensioned tendon, and a materials list that fits in one hand.

It is the standard method for ground floors and intermediate floors of storey buildings, and it is also the method that fails most often, because it depends entirely on what happened in the ten minutes before the board went up.

## The slab is the whole specification

Three things decide whether a bond will hold: cleanliness, dryness, and flatness. None of them can be fixed once the board is on.

**Cleanliness.** Concrete soffits carry release agent from the formwork, dust from chasing and plastering, and sometimes a coat of paint. A polyurethane adhesive will stick to that layer, not to the concrete, and the bond will fail as a film. Brush the whole soffit with a stiff broom, then vacuum, then check with a hand: if a palm wiped across it comes away grey, it is not ready.

**Dryness.** A new slab holds construction water for weeks. Foam adhesive will bond to a damp surface but the bond weakens, and a slab that is still drying will also stain the finished ceiling. A simple test is to tape a square of clear plastic to the soffit for a day; condensation under it means the slab is still giving up water.

**Flatness.** Board is flat, and it will not bend to a wavy slab. A soffit that undulates by more than about five millimetres over a two metre straightedge will telegraph through 20 mm board as a visible ripple under glancing light. The cure is a thin bonding coat or a levelling skim before boarding, done a day earlier, not more adhesive.

## The three adhesives, and what each is for

**Polyurethane foam adhesive.** Applied as beads from a gun, it expands slightly, fills small irregularities and grabs within minutes. It is the fastest method and the easiest to control, and its weakness is that a bead pattern with insufficient coverage leaves voids that sound hollow. A 750 ml can covers roughly ten square metres at bead spacing, which is the figure the calculator uses.

**A bonding agent such as Top Bond.** A thicker, trowelled or combed adhesive that gives a more continuous bed than foam. Slower, dearer per square metre, and much more tolerant of a slightly uneven slab.

**A slurry of POP cement and soaked fibre.** The traditional method where gypsum is cheap: fibre is soaked, mixed into a POP slurry, and applied in dabs or a combed bed. It works, it is cheap, and it is unforgiving of a dry board or a dry slab, both of which pull the water out of the mix before it can set.

Whichever is used, read what the manufacturer says about the substrate and the bed. A solvent-based construction adhesive is not a substitute: the solvent attacks the foam.

## Setting out before a single board goes up

Find the centre lines of the room and strike them on the soffit with a chalk line. Lay the first board against the centre line, not in a corner, so the cut boards at the two opposite edges end up equal. An unequal edge strip is the most common visible defect on a domestic board ceiling.

Mark the position of anything above the slab that must be found again: downlights, smoke detectors, extract grilles, the cable drops for wall lights, and any pipe that will need access. Photograph the bare soffit with those marks visible. It takes two minutes and saves an hour later.

## Applying the adhesive

With foam, run beads at 300 to 400 mm centres across the board, plus a continuous bead around the perimeter of the board, and keep the bead clear of the edge by 30 mm so it does not squeeze out into the joint. Press the board into place within the open time the can states, usually a couple of minutes, and hold it while the foam grabs.

With a combed adhesive, spread the bed with a notched trowel and press the board with a slight sliding motion to collapse the notches and spread the adhesive into continuous contact. That sliding motion is what turns a set of ridges into a bed, and skipping it is the difference between a solid ceiling and a hollow one.

With a slurry, butter the back of the board in dabs at the same spacing, press, and prop the board if the mix is wet enough to slump. Props stay until the following day.

## Joints, while the board is being placed

Boards should meet tightly, with no gap wider than a millimetre or two. A wide joint takes more filler, shrinks, and cracks. Stagger the joints between rows where the pattern allows, because a continuous cross-joint running the full width of a room is the first line to open.

Do not force a board into place with a hammer. A board that has to be forced is a board that is the wrong size, and the force crushes the edge that later has to take filler.

## Working around services

Cut openings before the board goes up, using the markings from the setting-out, and cut them slightly under size so the fitting covers the edge. A downlight hole cut after the board is bonded is easy; a hole cut in the wrong place is a scrap board in the middle of the ceiling.

Keep adhesive away from the edges of any opening within 100 mm, so the fitting's own clamp has clean board to grip.

## Curing, loading and the next trade

Foam adhesive grabs in minutes and reaches working strength within a few hours. A combed adhesive wants a day. A slurry wants a day and prefers two. Nothing should be hung from the ceiling, and no heavy fitting should be screwed into it, until the adhesive has had its cure time, because the board is bonded but the bond is not yet carrying a point load.

The finishing trades can follow immediately with joint filling, but the room should be dry. Painting a freshly bonded ceiling in a damp room traps moisture and produces a bloom on the paint film.

## The four failures, and how each begins

**Hollow patches.** Insufficient adhesive coverage, usually because the beads were spaced too widely or the trowel was not collapsed. Found by tapping; cured only by taking the board down.

**Boards dropping at one corner.** Adhesive applied to a dusty patch, or a board placed after the open time had passed. The corner was never bonded.

**Visible ripple.** A slab that was not flat, or 20 mm board used on an undulating soffit. The board follows the concrete.

**Staining and blooming.** A slab still drying, boarded too early.

Every one of them is preventable at the setting-out stage, which is why the ten minutes before the first board are worth more than the two hours after it.

## Labour and sequence

A two-person team bonds and joints a normal domestic room in a day, and a large living room in a day and a half. The sequence is: clean, mark, set out centre lines, bond boards working outwards from the centre line, cut and fit edges, tape and fill, sand, then paint. Scaffolding or a platform goes up once, at the start, and comes down at the end.

## What the take-off needs to know

Bonded work uses adhesive, tape, filler, abrasive and paint. It does not use battens, channels, screws, nails, hangers or wire, and the calculator drops those lines the moment the method is set to direct bonding. If a quote for a bonded ceiling includes timber battens, one of you is pricing a different job.

Enter the dimensions, choose the board size and thickness, set the method to direct bonding, and the bill of materials follows. Then enter what your supplier charges for the adhesive and the board, and the ceiling has a price that reflects the method it is actually built by.
## The adhesive arithmetic, worked

The calculator assumes one 750 ml polyurethane can per ten square metres of bonded board, and one can per twenty-five square metres where the board is spotted to a frame. Those are working figures at typical bead spacing, and they are worth checking against the arithmetic rather than trusting as a constant.

A bead at 400 mm centres across a 1.2 m by 2.4 m board, plus a perimeter bead, runs to roughly twelve metres of bead per board of 2.88 m², which is about 4.2 m of bead per square metre. A 750 ml can delivering a 10 mm bead yields around 30 m of run once expansion and wastage are allowed, so a can covers seven square metres of board at that spacing, not ten. Widen the spacing to 500 mm and the coverage rises; thicken the bead and it falls.

The practical conclusion is to order by the can, not by the square metre, and to keep one can spare on a room of twenty square metres or more. Running out of adhesive with four boards left is the most annoying possible way to lose an afternoon.

## Bonding over a soffit that has been coated before

An existing painted soffit is a different substrate. If the paint is sound, matt and firmly adhered, a foam adhesive will usually hold to it, provided it is degreased and abraded. If the paint is gloss, flaking, distempered or a lime wash, it must come off, because the adhesive will hold the paint to the concrete and the paint will let go of the concrete a year later with the ceiling attached to it.

The test is simple and worth doing on every refurbishment: press a strip of tape firmly onto the painted soffit and pull it off. If paint comes away on the tape, the coating is not sound enough to bond to.

## Hot, humid and coastal sites

Foam adhesive cures with moisture, which is helpful in a humid climate and a problem if the can has been stored badly. A can that has been in a hot vehicle for a week may have lost propellant or begun to cure in the nozzle, and the bead will be thin and short. Store cans in the shade, use them within the shelf life on the base, and discard a can that spits.

On a coastal site, the risk is not the foam but the fixings. Where a frame is used, specify galvanised or stainless, not bright steel, and expect the board face itself to need a good paint film because salt air attacks the filler and the paint long before it touches the foam.

## Acceptance checks before the finishing trade starts

- Tap every board with a knuckle or a broom handle. A dull, solid sound is a bonded board; a hollow rattle is a void.
- Check every joint with a straightedge. A joint that is proud or hollow will show after filling.
- Check the perimeter line with a level and the eye. A wavy edge is a cutting error, not a filling error.
- Confirm every opening is where the drawing says, and that fittings cover their cuts.
- Photograph the ceiling before filling, so the board layout is recorded.

Any hollow board found at this stage is a ten minute fix. The same board found after painting is a day.

## When not to bond at all

Do not bond where the slab is wet, where the soffit is carrying friable coatings that cannot be removed, where the ceiling must be level but the slab is not, where the void has to carry services, or where the building code requires a cavity for fire or acoustic performance. In each of those cases the answer is a frame, and a frame is a different take-off with different quantities.

That is why the calculator asks for the installation method before it returns anything. A bill of materials is only correct for the method it was built for.
$PS$,
  'ceiling-guides', 'FRELUX Editorial', 10, 'published', false,
  'Bonding Polystyrene Ceiling Boards to a Concrete Slab',
  'Direct bonding a polystyrene ceiling: slab preparation, foam, bonding agent and POP slurry, adhesive coverage, setting out, and the four failures to avoid.',
  'bond polystyrene ceiling boards, direct bonding ceiling, polyurethane foam adhesive ceiling, top bond ceiling, slab preparation, ceiling adhesive coverage',
  '2026-11-13 09:15:00+00', 40, 'https://media.base44.com/images/public/6a872e1df3b5e9fc45fc13fb/96f6cd94d_generated_image.png', 'global'
)
,
(
  'timber-noggin-polystyrene-ceiling-under-trusses', 'Timber Noggin Ceilings Under Roof Trusses: The Bungalow Detail', 'Where there is a roof truss overhead and no concrete slab, the ceiling hangs on a timber frame. This guide covers batten sizing, the 600 mm grid, fixing without damaging the truss, ventilation, and the failures that show up two years later.', $PS$## The detail, and why it exists

A bungalow has a roof, not a slab. The boards have to hang from something, and that something is a frame fixed beneath the bottom chords of the roof trusses. Treated timber battens run in one direction, noggins or crossing battens run in the other, and the boards are bonded and screwed to that grid. It is the standard construction on single storey buildings, on top floors under a pitched roof, and on any building where the ceiling plane has to sit below a structure that is not flat.

It is also the detail where cheap shortcuts are most visible, because a timber frame that is under sized, under fixed or over spaced telegraphs through a boarded ceiling within a season.

## Sizing the battens

A ceiling batten carries the board and its own weight over a span between trusses, typically 600 mm to 1200 mm. For that span, a 50 mm by 50 mm treated batten is comfortable and a 38 mm by 38 mm batten is adequate if the spacing is tight and the board is 20 mm or 25 mm. Anything thinner than 38 mm will bow between supports and take the board with it.

The battens must be treated. A roof space is a humid space, and untreated timber in a humid space warps, splits and grows mould on the face the board is bonded to. In a coastal or high-rainfall market, the specification should be a preserved timber with a stated treatment class, not "hardwood" from a stack at the roadside.

## The grid, and why 600 mm

At 600 mm centres in both directions, the board spans 600 mm between supports, which is comfortable for a 20 mm board and easy for 25 mm or 30 mm. Widen the grid to 800 mm and a 20 mm board sags visibly across the span, especially under a warm roof, and the sag reads as a wave in the ceiling under a window's light.

The grid runs in two directions for a reason. Battens alone, spanning one way, leave the board unsupported on the long edges, and a board joint that falls between two battens has nothing to fix to. Noggins at the same 600 mm spacing give every board edge a fixing line, which is what allows the screws to hold the joint tight. The calculator's frame quantity is therefore three and a third linear metres per square metre, not one and two thirds.

## Setting out and fixing to the truss

Set a datum line around the walls at the finished ceiling level, using a laser or a water level, and mark it. The battens hang below the truss bottom chords, so the depth from the chord to the datum is the packer depth, and it should be consistent across the room. Packers are cut from plywood or a plastic shim, not from folded cardboard.

Fix each batten to the underside of the bottom chord with two nails or screws per crossing, not one. A single fixing lets the batten rotate. Never notch, drill or cut a truss chord to make a batten sit; a truss is an engineered member and a notch in a tension chord is a structural change. If the chord is not where the batten needs to be, pack it out.

Where a batten runs parallel to the trusses and cannot be fixed to them, it is fixed to the noggins, which are themselves fixed to the trusses. That is why noggins are structural in this detail and not just spacers.

## Ventilation above the ceiling

A boarded ceiling under a roof is an air barrier, and it can trap moisture rising from the rooms below. The roof space above it must be ventilated at the eaves, and any extract fan must discharge outside the roof space, not into it. Otherwise the moisture condenses on the underside of the roofing felt or the metal sheet, drips onto the back of the boards, and shows as a stain on the finished ceiling that no amount of repainting fixes.

Leave the void between board and roof covering open and vented. Do not fill it with insulation against the board unless the insulation is designed for that position and the roof build-up is designed for it.

## Services in the void

The frame creates a shallow service void, and every cable, pipe and duct that runs in it must be considered before the boards go up. Cables must be kept clear of insulation and fixed to the battens, not left lying on the back of the board. Extract ducting must be insulated if it passes through a cold void. Water pipes in a roof void need lagging in any climate that freezes, and support at intervals in any climate at all.

Photograph the void with the services in place and the battens labelled. It is the only record anyone will have when a downlight needs to be added in three years.

## Fixing the boards to the frame

Boards are spot bonded to the battens with foam adhesive and screwed at 200 mm centres along every batten they cross. The adhesive takes the rattle out of the assembly and stops the board cupping between screws; the screws carry the board and hold the joints tight. Screws should be long enough to enter the batten by 20 mm and no longer, because a screw that passes through the truss chord is a defect.

Stagger the board joints between rows where the pattern allows, and make sure every joint lands on a batten or a noggin. A joint that lands in mid span will crack, guaranteed, because the two boards can move independently.

## Insulation above, and what it does to the ceiling

In a hot climate, the insulation belongs in the roof, above the ceiling and below the roof covering, with a vented space above the insulation. In a cold climate, the insulation goes directly above the boarded ceiling and must be continuous, because a gap in it shows as a cold stripe and a condensation line on the ceiling below.

Either way, the board ceiling is the finish and the air barrier, and the insulation is a separate layer. Confusing the two produces a ceiling that is warm to touch and damp behind.

## The failures that appear in year two

**Sagging between battens.** The grid was too wide, or the battens were undersized for the span.

**Cracks along a joint line.** The joint fell between battens, or the boards were butted with no fixing either side.

**A wavy perimeter.** The datum was set from the floor, which was not level, so the whole grid follows the floor.

**Mould on the board face.** The roof space is not ventilated and moisture is condensing.

**Battens pulling away.** One fixing per crossing, or fixings into a knot or a split.

**A creaking, popping ceiling as it warms.** The boards were fitted tight to the walls with no allowance for movement, so the whole plane expands against the perimeter.

Every one of those is a detail error, and every one is cheaper to prevent than to repair.

## Sequence and labour

A two-person team sets out and fixes the frame for a normal bedroom in half a day, and boards it in another half. A three bedroom bungalow is a frame week and a boarding week for two people. The order is: datum, battens, noggins, services, photograph, boards from the centre out, joints taped, filled, sanded, painted.

## What the take-off includes

Framed ceilings carry battens, screws, nails and adhesive in addition to the board, tape and filler. The calculator switches those lines on the moment the method is set to timber, and quantities the frame at 600 mm centres in both directions with screws at 200 mm along every run. Change the method to direct bonding and the timber lines disappear, because a bonded ceiling has no frame and any quote that includes one is pricing something else.
## Which timber, and how it is treated

The frame is not a finish item, so it tends to be bought cheaply, and that is where the trouble starts. A batten has to hold a screw, stay straight across a 600 mm span between trusses, and resist moisture in a roof void that swings between humid and dry. That means a softwood of at least 38 mm in both directions, straight-grained, free of loose knots on the face that will take the screws, and preserved.

Preservative treatment is specified by class in most timber codes, and the class reflects how wet the timber will get in service. A ceiling batten under a well-ventilated roof needs a modest class; a batten in a coastal roof or one that will be close to a bathroom extract needs more. Ask the merchant for the treatment class in writing, because "treated" on a price list can mean almost anything.

Species matters less than straightness. A dense hardwood that has been milled wet will twist as it dries, and a twisted batten pulls the board with it. Kiln-dried softwood that has been stored flat and dry is a better ceiling batten than an expensive hardwood that was stacked on edge in the rain.

## Where the grid meets a gable, a hip or a change of roof

At a gable end, the battens run into a wall plate and stop. The last run is set so the board edge lands on it, which usually means a batten closer than 600 mm to the wall. Cutting the grid at exactly 600 mm and then finding the wall 380 mm beyond the last batten is the mistake that leaves a perimeter board fixed to nothing.

At a hip or a valley, the truss bottom chords shorten progressively, so the battens cross fewer chords as they approach the corner, and the last two or three may need a noggin to the nearest chord rather than a direct fixing. These short runs are where a frame feels loose, and where a board corner lifts a year later.

Where the roof changes pitch or a flat roof abuts a pitched one, the ceiling plane usually steps, and the step needs its own batten line and its own vertical face. Measure that vertical face for board, the same as any other drop.

## Hatches, access and the water tank

Many roof spaces are entered through a ceiling hatch, and the hatch frame is part of the ceiling. Set the frame before the grid is closed, fix its trim to the battens, and make sure the grid does not cross the opening. A hatch cut after boarding always looks cut after boarding, because it is.

Where a cold water tank or a solar controller sits in the roof space, a service platform is worth specifying at the same time, so nobody later walks on the back of the ceiling to reach it. Boards will not carry a person's weight between battens, and a foot through a finished ceiling is the most expensive kind of access.

## The frame arithmetic, worked

Take the 5 m by 4 m room again, 20 m². At 600 mm centres in both directions there are about 3.33 linear metres of frame per square metre, so 66.7 linear metres. Battens are sold in 3.6 m lengths, so 18.5 lengths, which is 19 lengths. Screws at 200 mm along every run come to about 334, nails at 600 mm to about 112, and adhesive to one can per 25 m², so one can.

That is a small, precise list, and it is the list that turns a "we need some timber" conversation into a purchase order. It also shows why the frame is not free: 19 lengths of treated batten is a real cost against 8 sheets of board, and a quote that omits it is not comparing like with like.

## What the frame buys you

It buys a ceiling where there is no slab. It buys a service void, ventilation, and the ability to level a wavy structure. It also buys a maintenance liability, because timber in a roof space needs the roof to stay watertight and the void to stay ventilated.

Where a slab exists and is flat, direct bonding avoids all of that. Where a slab exists but is uneven, a frame is often cheaper than levelling the slab. The choice is not about preference. It is about what is overhead.
$PS$,
  'ceiling-guides', 'FRELUX Editorial', 11, 'published', false,
  'Timber Noggin Polystyrene Ceiling Under Roof Trusses',
  'Timber noggin ceiling detail for bungalows: batten sizing, the 600 mm grid, fixing without notching trusses, ventilation, services and the failures that appear later.',
  'timber noggin ceiling, ceiling battens 600mm, polystyrene ceiling under trusses, bungalow ceiling detail, ceiling frame, roof void ventilation',
  '2026-11-13 09:20:00+00', 50, 'https://media.base44.com/images/public/6a872e1df3b5e9fc45fc13fb/96f6cd94d_generated_image.png', 'global'
),
(
  'metal-channel-and-wire-suspended-polystyrene-ceilings', 'Metal Channel and Wire-Suspended Polystyrene Ceilings', 'When the slab is high, the services are heavy, or the design has more than one level, boards hang on wires and channels. This guide covers the components, the levelling, the tolerances and the coordination that makes it work.', $PS$## When suspension is the only right answer

Direct bonding puts the board on the slab. A timber frame sits just below the trusses. Neither can give a ceiling that is a metre below a slab, and neither can carry a void deep enough for ducting, drainage or a run of conduit. That is the job of a suspended ceiling: boards on a metal grid or on wires, at a level chosen by the designer rather than dictated by the structure.

It is also the detail used for multi-level and coffered designs on a high slab, for commercial spaces where services must remain accessible, and for any refurbishment where the existing soffit is too uneven or too fragile to bond to.

## The components, and what each does

**Anchors.** Eye bolts, drop-in anchors or proprietary hangers fixed into the slab. These carry the whole ceiling, so they are the part that must never be improvised. In a post-tensioned slab they must avoid the tendons, and in any slab a cover meter or a scan is worth the cost on a large area.

**Hanger wire.** Galvanised binding wire, or purpose-made hanger rod, running from the anchor to the channel. Wire is cheap, adjustable and strong in tension, and it must be galvanised because the void it lives in is not dry.

**Primary channels.** The main carriers, running one way at 1200 mm centres, hung on the wires.

**Secondary channels or furring.** The cross members at 400 mm to 600 mm centres, clipped to the primary channels, and it is these that the boards are screwed to.

**Perimeter trim.** An angle or a channel fixed to the wall at the finished level, which gives the edge a line to sit on and a shadow gap if the design wants one.

## Setting the level, before anything is hung

The finished ceiling level is set with a laser or a water level, marked on every wall, and checked for square by measuring the diagonals of the room. A ceiling that is level but out of square produces a visible taper at one edge, and no amount of filling hides it.

Tolerance is the other thing to agree before work starts. A suspended ceiling in a domestic room should be level within about three millimetres across the room, and a commercial specification may demand five millimetres over five metres. Whatever the number, it goes into the job sheet, because it decides how much adjustment the hangers get.

## Hanger layout and load

Wires at 1200 mm by 1200 mm carry a board ceiling easily. Closer spacing is needed where the ceiling carries light fittings, where the void holds services supported from the grid, or where the design has a heavy cove. The calculator's hanger quantity uses the 1.2 m grid, which is the domestic standard.

Every anchor is drilled to the manufacturer's depth, cleaned out, and set with the correct setting tool. An anchor that spins in the hole is a hole in the wrong place, not an anchor. On a large area, pull test one anchor per twenty and record the result.

## Tying, tensioning and levelling

Wires are tied to the primary channel with a locking tie, not a single twist, and tensioned so the channel hangs at the datum without a bow. Work across the room in one direction, levelling each primary channel to the marked line, then clip the secondary channels and level across those. A string line pulled across the room at the datum catches the channel that sits high or low far faster than an eye.

Levelling is done before the boards go up and checked again after, because the weight of the boards will find any tie that was not locked.

## Boarding a metal grid

Boards are screwed to the secondary channels at 200 mm centres, with foam adhesive spots on the channels to stop rattle. Board joints must land on a channel, and a joint that runs parallel to the channels in mid span will crack. Where boards are 30 mm, screws can be at 250 mm; where they are 20 mm, keep to 200 mm and do not overtighten, because a 20 mm board crushes under a driver set too hard.

Around the perimeter, the board sits on the trim with a 3 mm to 5 mm gap, and the gap is filled or covered by a cornice or a shadow gap detail. Board pushed tight to a wall on all four sides has nowhere to move and will buckle in a warm room.

## Services coordination, which decides the void depth

The void depth is not chosen for looks. It is the sum of the deepest service, its insulation, its fall and its clearance. A drainage pipe running at a 1 in 80 fall across a four metre room drops 50 mm over its length, so the void at the shallow end is 50 mm deeper than the pipe diameter alone suggests. Ducting needs its insulation plus a hand's clearance. Cables need to be clear of insulation and supported.

Anything that will need maintenance gets an access panel, set in the grid before boarding, with its frame fixed to the channels. A valve with no access panel is a ceiling that will be cut open.

## Fire and acoustics in a cavity

A cavity changes the performance of a ceiling. It can improve acoustic separation, and it can also become a route for fire and smoke. Where a ceiling is part of a fire-resisting element, the assembly, including the grid, the anchors, the board and any penetration, is what has been tested, not the board alone. A suspended ceiling that is not the tested assembly provides no protection, whatever the board datasheet says.

Acoustic performance also depends on the cavity, the board mass and any absorbent layer above. Polystyrene board is light and it is not an acoustic absorber; where sound absorption is the requirement, the specification is a different ceiling type and the calculator will not make it into one.

## The failures that come from suspension

**A sagging grid.** Wires too far apart, or wires that were tied but not locked.

**A ceiling that is level in one direction only.** Secondary channels clipped without being levelled to the primaries.

**Rust at the hangers.** Bright wire used instead of galvanised, in a void that is damp.

**Cracks in a line along the room.** Board joints falling between channels.

**A void too shallow for the services that arrived later.** Depth chosen from the drawing before the services were finalised.

**Anchors pulling out.** Drilled too shallow, not cleaned, or set in a slab that was not sound.

## Sequence and labour

A two-person team sets out and hangs the grid for a normal room in a day, and boards it in half a day. A large space is a grid week and a boarding week. The order is: datum, perimeter trim, anchors, wires, primaries, level, secondaries, level again, services, inspection, boards, joints, filling, paint.

## What the take-off needs

Suspended work carries channels, hangers, wire, screws and adhesive, and the calculator adds those lines when the method is set to wire. It also keeps the board and the jointing quantities tied to the measured surface and the board size, so a change of grid spacing changes the frame but never the board count. Enter the room, choose the board and the thickness, choose the method, and the quantities follow the detail you are actually building.
## Anchoring into different slabs, which is where it goes wrong

A suspended ceiling hangs from its anchors, so the slab type decides the anchor. In a normal reinforced concrete slab, a drop-in anchor or an eye bolt set to the manufacturer's depth is reliable provided the hole is drilled the right diameter, cleaned of dust and set with the correct tool.

In a post-tensioned slab, tendons run through the concrete in curves, and drilling into one is a structural incident, not a fixing problem. A cover meter or a ground penetrating radar scan over the anchor positions costs a fraction of a tendon repair, and on any post-tensioned building it should be a line in the method statement.

In a hollow pot or ribbed slab, the soffit is not solid everywhere, and anchors must land on the ribs. In a timber-joisted floor, the anchors are screws into the joists, found with a detector or from the floor above, and a wire fixed into the boarding between joists will pull out.

In every case, pull test a sample and record the result. It is the only evidence that the ceiling will stay where it was designed to stay.

## Perimeter details, shadow gaps and cornices

The perimeter is where a suspended ceiling either looks designed or looks improvised. Three details cover most work.

**A plain angle trim.** The board sits on the angle and the joint is filled. Cheap, quick, and it shows every millimetre of inaccuracy in the wall.

**A shadow gap.** The board stops short of the wall and a metal or plastered reveal forms a recessed line. It hides wall deviation and gives a clean modern edge, and it costs more because the gap has to be formed and finished.

**A cornice or cove.** A polystyrene or plaster cornice covers the junction. It is the traditional answer and the most forgiving, provided the board edge is straight enough for the cornice to sit against.

Whichever is chosen, the board edge must be cut straight and supported. A perimeter board that is only fixed on three sides will curl.

## Access panels and coordination

Every valve, damper, junction box and isolator above the ceiling needs a way to be reached. Locate them on a drawing before boarding, agree positions with the other trades, and set framed panels into the grid. A panel set in the grid looks intentional; a hole cut with a pad saw at the end of the job does not.

Coordinate the sequence too: electrical first fix, then ducting, then the grid, then the boards, then the second fix. Boards installed before the services are complete are boards that come down again.

## Commissioning checks before handover

- Level checked against the datum at four points and across the diagonals.
- Every wire tied and locked, none loose or twisted once.
- Every board joint on a channel, none in mid span.
- Every screw set, none proud and none through the board.
- Access panels opening freely with their frames fixed.
- Perimeter gap filled or covered, with no visible waviness.
- Photographs of the void with services labelled, handed to the client.

## What suspension costs, structurally

A suspended ceiling carries the board, tape and filler like any other, plus channels, wire, hangers, anchors and perimeter trim, plus the labour of setting out and levelling a grid. On a large, high space that is the only way to build it, and on a small room with a flat slab it is money spent for nothing.

The honest comparison is between the three methods on the same room, and the calculator makes that comparison possible in a couple of minutes: same dimensions, same board, three methods, three bills of materials.

## What goes on the drawing

A suspended ceiling that is specified in one line on a drawing is a ceiling that will be built to whatever the installer decides. The drawing needs the finished level relative to a floor datum, the anchor type and spacing, the primary and secondary channel centres, the board type, thickness and size, the perimeter detail, the position of every access panel, and the fire or acoustic performance the assembly must achieve. With those seven items, three contractors will price the same ceiling. Without them, three contractors will price three different ceilings and the cheapest will win for the wrong reason.

A last point on anchors: specify the type, not just the spacing. A drawing that says "suitable anchors at 1200 mm centres" leaves the choice to whoever is on the ladder, and the cheapest box on the van is not always the right one for the slab.
$PS$,
  'ceiling-guides', 'FRELUX Editorial', 11, 'published', false,
  'Metal Channel and Wire-Suspended Polystyrene Ceilings',
  'Suspended polystyrene ceilings on wire hangers and metal channels: components, levelling tolerances, hanger layout, boarding a grid, services coordination and failures.',
  'suspended ceiling polystyrene, metal channel ceiling, wire hanger ceiling, drop ceiling grid, ceiling void depth, suspended ceiling tolerance',
  '2026-11-13 09:25:00+00', 60, 'https://media.base44.com/images/public/6a872e1df3b5e9fc45fc13fb/1c092b45d_generated_image.png', 'global'
)
,
(
  'polystyrene-ceiling-wastage-and-cutting', 'Wastage and Cutting on a Polystyrene Ceiling', 'Board is bought whole sheet by whole sheet, so wastage is a design decision and not a rounding. This guide explains the four wastage rates, how to set out a grid that wastes less, and how to cut and nest offcuts properly.', $PS$## Wastage is geometry, not caution

Every board is cut from a rectangle. The pieces you keep are the pieces the room needs. The difference between the sheet area you bought and the area you used is wastage, and its size is decided by the shape of the room, the layout of the grid, the design of the ceiling and the size of the sheet. It is not a number to pick out of the air to feel safe.

That distinction matters because wastage on a flat ceiling and wastage on a curved one are not the same risk. A flat room wastes a perimeter strip and a few cut pieces, and ten percent is generous. A curved feature cannot be cut from a straight board edge at all beyond a point, and twenty-five percent is not pessimistic.

## The four rates, and where each comes from

**Ten percent, flat ceiling.** The grid is set out from the centre so the two edge strips are equal. The waste is those strips plus the offcut of the last board in each row. On a regular room this is close to the theoretical minimum.

**Fifteen percent, tray or stepped design.** Each step adds a vertical face, cut as a strip 100 mm to 300 mm wide. Strips waste the rest of the board they come from, and a design with several steps produces several sets of strips that rarely nest together.

**Twenty percent, coffered or panelled.** A panelled ceiling has borders, bands and recesses, and each one changes direction. The number of small pieces rises sharply and each small piece comes out of a full board.

**Twenty-five percent, curved or circular.** A circle of 1.2 m radius has a circumference of 7.5 m, and to cut that curve you remove the board outside it. Where two curves meet, or where a curve meets a straight edge, the offcuts are largely unusable.

## The same room, four designs, four board counts

Take a 5 m by 4 m room, 20 m², with 1.2 m by 2.4 m board at 2.88 m².

- Flat: 22 m² of board, 7.64 sheets, so eight sheets.
- Stepped with a 200 mm drop on a 14.4 m step line: the drop adds 2.88 m², giving 22.88 m² measured, 26.31 m² with fifteen percent, which is 9.14 sheets, so ten.
- Coffered: 20 m² measured, 24 m² with twenty percent, 8.33 sheets, so nine, and in practice ten because the panel layout rarely divides neatly.
- Curved with a circular feature: 20 m², 25 m² with twenty-five percent, 8.68 sheets, so nine, and often ten once the curve template is cut.

The spread between eight and ten sheets on an identical room is the whole argument for choosing the design before ordering the board rather than the other way round.

## Setting out to waste less

The grid is set from the centre line of the room, so that the two edge strips are equal. Equal strips look right and they are more likely to nest out of one board than two odd strips at opposite walls.

Match the long edge of the sheet to the longer room dimension where the design allows. A 1.2 m by 3.0 m sheet in a 3.0 m wide room fits that width exactly, so one direction produces no waste at all and the whole allowance is spent on the other axis.

Avoid an edge strip narrower than about 150 mm. A narrow strip is hard to fix, hard to fill, and almost always wasted, because it comes out of a board that cannot be used for anything else.

Where a room has a regular structural grid, such as beams or a coffered slab, set the board grid to the structure rather than to the walls. The eye reads the alignment to the beams, not to the walls, and a ceiling that aligns to the structure looks designed.

## Cutting the board

The cut in polystyrene is a clean, square, dustless cut when it is done with a sharp blade against a straightedge. Score deeply on the face, then break and cut the back, the way plasterboard is cut but with less force. A fine-toothed saw works but produces a shower of foam beads that static carries everywhere.

A hot wire cutter gives a sealed edge and a very clean line, and it is the tool for curves and for repeated identical pieces. It produces fumes, so it is used ventilated, and it is slow on thick board.

Whatever the tool, mark the board with a pencil and cut to the mark on the face the eye will see. A cut that wanders by two millimetres is a joint that needs filling, and enough of those turn a tidy ceiling into a patchwork.

Cut on a sacrificial surface, on a low bench or two trestles, never on the floor of the finished room. Foam dust sticks to paint and to wet plaster, and it does not vacuum out of a textured wall.

## Nesting, and what offcuts are worth keeping

Keep offcuts longer than about 400 mm and wider than 150 mm. They cover drop strips, bulkhead faces, small infill panels and the last edge board. Keep them flat, stacked, in the room they belong to.

Throw away anything that has been painted, soiled with adhesive, or broken at the edge. A painted offcut cannot be bonded, and a broken edge cannot take filler.

The single most useful habit is to cut the pieces for the drops first, from the boards that have already been cut for the perimeter, because a drop strip is a long narrow piece and the perimeter offcut is the right shape to give it.

## Curves, templates and honest limits

Cut a curve against a template made from hardboard or thin ply, sized from the design radius. There is a practical limit to how tight a radius a board will follow without cracking: gentle sweeps are straightforward, tight circles need the board cut into segments and the segments filled, and very tight features are better formed in plaster or in a moulded polystyrene feature glued onto a flat ceiling.

Say so before the job starts. A design that assumes a smooth 300 mm radius cut from a 25 mm board will end in a plaster repair.

## Openings, fittings and reinforcement

Downlights, detectors, grilles and access panels are cut before or during boarding, using the setting-out marks. Cut slightly under size so the fitting's trim covers the edge. Never cut an opening within 50 mm of a board joint, and never leave a hole with less than 100 mm of board on one side of it.

Where an opening sits in a wide field of board, add a small timber or channel brace across the back before fixing, so the fitting has something to clamp to that is not unsupported foam.

## Ordering, spares and batch

Order the calculated count plus one spare board. Keep the spare flat, dry and out of sunlight, because a second delivery rarely matches the first batch for shade, density or thickness, and a patch repair from a different batch is visible across a room.

Write the batch or lot number on the back of a retained offcut. If a repair is needed in five years, the number is the only way to ask for a match.

## What the calculator does with all of this

The calculator applies the wastage rate that belongs to the design you select, shows you the measured area and the area the wastage added, and then converts the total to whole sheets of the board size you chose. It never adds wastage twice, and it never rounds the area up to a tidy number before dividing, which is where hand estimates usually gain a sheet.

Enter your dimensions, choose the design, choose the sheet, and the board count that comes back is the count to order.
## Wastage across a house, not a room

Room by room, wastage looks like a small allowance. Across a house it becomes a real quantity. A three bedroom bungalow of about 80 m² of ceiling, boarded flat at ten percent, buys 88 m² of board. If the design changes to a stepped tray in the living room and coffered panels in the hall, the same house buys closer to 96 m², which is three extra sheets. Ordering 88 and discovering the design change on site is a second trip and a batch mismatch.

The lesson is to fix the design before the order, not after. A design decision made with a pencil costs nothing. The same decision made with a delivered pallet costs a sheet per room.

## Buying short is false economy

The temptation is always to buy for the measured area and trust the offcuts. On a plain rectangular room with a regular grid, that sometimes works. On a room with an alcove, a bulkhead or a diagonal, it never does, because the offcut that would have filled the last strip was cut and thrown away two hours earlier.

Board is cheap relative to labour and to a second delivery. The calculator rounds up to whole sheets for exactly this reason: a fraction of a sheet is not purchasable, and the fraction that is left over is the spare that covers the mistake nobody planned for.

## Reclaimed board, and when not to use it

Salvaged board is common on refurbishment, and it is usable if three conditions hold: it is dry, it is flat, and the face that will be seen is undamaged. Board that has been soaked and dried unevenly has lost its flatness permanently, and no adhesive will pull it straight.

Reclaimed board also brings a fire question. A board whose marking has been lost cannot be shown to meet any classification, so it does not belong in a ceiling that needs one, however sound it looks.

## Cut quality and the tolerance that matters

A joint needs two straight edges within about a millimetre to fill invisibly. That is a tighter tolerance than most site cutting achieves with a utility knife and a folded straightedge, and it is the reason a cutting bench, a long straightedge and a sharp blade matter more than speed.

Cut every board to the same reference. Mark from the same end of the room each time, so a systematic error shows up as a wide joint at one wall rather than a random scatter of tight and loose joints across the ceiling. One visible line is easy to correct; a field of them is a re-board.

## The habit that saves the most board

Lay the grid out on paper before cutting anything. Two minutes with a pencil shows where the edge strips fall, which board yields the drop strips, and whether the design can be turned ninety degrees to use the offcuts better. Board shortages on site trace back to skipping this.

## What a shortage actually costs

A short delivery of board stops the job. The boards that are fixed are fixed, the remaining area is measured again, and the extra sheets come from a different batch with a slightly different shade and a slightly different thickness. Under a painted ceiling in daylight nobody notices; under raking light at a window, the change of batch is visible across the room.

Add to that the second delivery charge, the half day lost, and the artisan paid to wait. On a small room the second delivery can cost more than the spare board would have.

## Wastage and the labour that follows it

Every extra piece that has to be cut to fit an awkward edge is time as well as board. A ceiling laid out on a regular grid with equal edge strips is quicker to board because the cuts repeat: the same strip width at the same position in every row. A ceiling where every row needs a different infill is slower, needs more care at every joint, and produces joints at angles that have to be taped and feathered by hand.

That is why a five minute setting-out exercise has a labour value as well as a material value, and why the fastest boarders on any site are the ones who spend the longest before the first cut.
$PS$,
  'ceiling-guides', 'FRELUX Editorial', 10, 'published', false,
  'Polystyrene Ceiling Wastage and Cutting Guide',
  'Why wastage on a polystyrene ceiling is 10, 15, 20 or 25 percent, how to set out a grid that wastes less, and how to cut, nest and store board offcuts.',
  'polystyrene ceiling wastage, ceiling board cutting, ceiling offcuts, board wastage allowance, curve cutting foam board, ceiling board layout',
  '2026-11-13 09:30:00+00', 70, 'https://media.base44.com/images/public/6a872e1df3b5e9fc45fc13fb/96f6cd94d_generated_image.png', 'global'
),
(
  'jointing-polystyrene-ceiling-boards', 'Jointing Polystyrene Ceiling Boards: Tape, Filas and Filler', 'Every seam is a place a crack can start. This guide covers seam length, mesh tape against soaked fibre, two-pass filling, screw heads, sanding and the lighting check that finds what the eye misses.', $PS$## A ceiling is judged at its joints

A board ceiling has no other feature to look at. The face is flat and white, and the eye goes to the lines where boards meet. If those lines are tight, filled and flat, the ceiling reads as professional. If they undulate, shine, or show a hairline, no amount of good boarding rescues it.

So jointing is not the tidy-up at the end. It is the part of the job the client will inspect, and it is where the cheapest mistake (skipping tape) causes the most expensive complaint (a crack that returns after every repaint).

## How much seam there is, exactly

Seam length is not a guess either. A board laid in a regular grid produces one joint run per board width in one direction and one per board length in the other, so the density is one divided by the width plus one divided by the length, per square metre.

For a 1.2 m by 2.4 m board that is 0.833 plus 0.417, which is 1.25 m of seam per square metre. For a 1.2 m by 3.0 m board it is 0.833 plus 0.333, which is 1.17 m. A 20 m² room therefore carries about 25 m of board-to-board seam.

Then add the wall edge, which is the room perimeter: 18 m in a 5 m by 4 m room. That edge is a seam like any other and it is the longest continuous one in the room, so it is taped for the same reason. Total reinforced length in that room: 43 m, which with a ten percent lap is two 45 m rolls of tape rather than the single roll most people assume.

## Mesh tape, soaked fibre, and what each is for

**Fibre mesh tape** is a self-adhesive glass or polymer mesh, usually 50 mm wide, applied over a bed of filler or directly to the board. It carries tensile stress across the joint while the filler cures and after. It is fast, consistent and clean.

**Soaked sisal or jute fibre, filas**, is the traditional reinforcement: fibre soaked until soft, wrung out, laid into a bed of POP or joint compound, and covered. It is cheap, it is what most artisans in West Africa were trained on, and it works well when it is soaked properly. Dry fibre pulls moisture out of the filler and debonds, which is the failure mode to watch.

**Paper tape** is not the right choice on foam. It needs a harder bed than a foam board gives and it lifts at the edges.

Whichever is used, the rule is the same: the tape or fibre must be embedded in the first pass of filler, not stuck on top of a dry joint.

## Two passes, and why one is never enough

**First pass.** Fill the joint and bed the tape into it while the filler is still wet, using a 100 mm knife. Press the tape flat, squeeze out the excess, and leave it just covered. The tape must not be visible as a mesh pattern, and it must not have air under it.

**Second pass.** Once the first pass has set, apply a wider coat, 150 mm to 200 mm, feathered at both edges, over the taped joint and over every screw head. This is the pass that makes the joint disappear, because it spreads the transition from board to joint over a width the eye cannot resolve.

A third, very thin pass is sometimes needed over a joint that sits in a raking light, but it should be a skim, not a build.

## Screw heads and fixings

Every screw head is filled in the same two passes. A screw set below the surface leaves a dimple, which fills easily; a screw set proud will show as a bump and must be driven deeper, carefully, without breaking the board face.

Where a screw has broken the paper face or crushed the foam, cut out the loose material, fill it, and put a new screw 25 mm away. Filling over a crushed crater is a repair that fails in a season.

## Mixing and working the filler

Joint compound is mixed to a consistency that holds a ridge on the knife and does not slump. Too wet and it shrinks and cracks; too stiff and it drags and leaves a ridge.

Work in small batches. A batch that has been standing for half an hour has begun to set and will not feather. Keep the knife clean and wipe it on the edge of the tray, not on the wall.

## Sanding and the lighting check

Sand the second pass with 120 grit, then finish with 150 or 180 grit. Sand along the joint, not across it, with a block rather than a bare hand, so the surface stays flat rather than following the joint's crown.

Then do the lighting check: hold a torch or a work light flat against the ceiling and look along the surface. Raking light shows every ridge, hollow and proud screw that a diffused light hides completely. It is the difference between a ceiling that looks finished and one that only looks finished in daylight.

Dust off before painting. Filler dust under a paint film gives a surface that feels rough and shows a haze, and no amount of a second coat removes it.

## Cornice joints, a separate discipline

Cornice is jointed at internal and external corners and at straight lengths. Internal corners are mitred or coped; external corners are mitred and often reinforced. A cornice joint that opens is usually a joint made with the wrong adhesive, or made on a board edge that was not straight enough to receive it.

Fill cornice joints with the same compound, sand lightly, and paint with the ceiling so the two read as one surface.

## Movement, and why the perimeter matters

Boards move with temperature and humidity. The frame moves. The structure above moves. The joint system has to accommodate a small amount of that movement without cracking, which is why reinforcement is continuous across every seam and why the perimeter edge is not forced tight into the wall.

Leave a small gap at the wall, tape and fill the edge line, and let the finish cover the junction. Boards butted hard to four walls have nowhere to go and will buckle in the first hot week.

## The quantities, per square metre

For a flat ceiling, roughly 1.25 m of seam per square metre for a 1.2 m by 2.4 m board, plus the perimeter. Reinforcement at that length plus a ten percent lap. Joint compound at about half a kilogram per square metre across two passes and the screw heads. Abrasive at one sheet per eight square metres. Those are the numbers the calculator uses, and they are the numbers a supplier will recognise.

## Productivity, honestly

Two people, one boarding and one jointing behind, will joint and fill a normal room in a day and sand it the next morning. A whole house is a week of jointing for one skilled hand, and a large hall is a fortnight of it. It is the slowest part of a board ceiling and the part most often rushed, because it is invisible until it is painted.

Give it the time and the ceiling lasts. Rush it and the cracks arrive on schedule, a season later, exactly along the lines that were skipped.
## Inside corners, which are not the same as a flat seam

An inside corner is where the ceiling meets a wall, or where two planes of a stepped design meet. Two boards arrive there from different directions, and the corner takes movement from both. It is taped like a seam, with the tape folded into the corner and bedded on both faces, and it is filled in two passes exactly as a flat joint is.

The common error is to fill an inside corner without tape, on the grounds that it is hidden. It is not hidden. It is the first place a hairline appears, because it is the longest continuous joint in the room and it has the least support behind it.

## Filling where board meets plaster

Where a boarded ceiling meets a plastered wall or a plastered bulkhead, the joint is between two materials that move differently and absorb water differently. Tape across the junction, bed it in a filler that suits both, and keep the first pass tight. Where the junction is large or the two surfaces are at different levels, a cornice or a shadow gap detail is a better answer than a filled joint, because it accommodates the difference instead of fighting it.

## Filler by climate and by substrate

A ready-mixed compound is convenient in a temperate workshop and risky in a hot climate where an open tub skins in an hour. A powder compound mixed on site lets the hand control the consistency and the batch size, which is why it dominates in West Africa and South Asia.

Whatever is used, it must be compatible with the board. A compound designed for gypsum board works on polystyrene because it bonds to the taped seam rather than to the foam itself, which is the reason the tape is not optional.

## Repairing a cracked joint properly

A crack that has opened along a seam is a tape failure, not a filler failure. Painting over it brings it back within a season.

The repair is to rake out the loose material along the crack, re-bed a strip of tape over the seam while the filler is wet, feather it wide, sand and repaint. Doing it once properly costs an hour. Doing it with filler only costs ten minutes and repeats every year.

## The lighting check, again

Every jointing job ends with a torch held flat against the ceiling, looking along the surface at a shallow angle. It is uncomfortable, it takes twenty minutes on a large ceiling, and it is the only reliable way to find the ridges that will be obvious to the client under a window in the morning.

Fix what the light finds before the paint goes on. After the paint, every fix is a repaint of the whole plane.

## Sequence with the painter

Jointing and painting should be continuous. A ceiling jointed, sanded, dusted and painted in one visit has fewer failures than one jointed in week one and painted in week six, when the site has filled it with dust again. If the gap is unavoidable, cover the ceiling and dust it again before the first coat.

## Screws, dimples and the two-minute habit

Every screw head is filled, and every screw head is checked before filling. A screw that was driven too deep has crushed the foam and left a crater that filler will sit in but never disguise; a screw left proud will read as a bump under paint. Going over the ceiling with a driver before jointing, setting every head just below the face, takes minutes and removes a whole class of defect.

## Filling right up to the cornice

Where a cornice is being fitted, the joint between the boards is filled first and the cornice is fitted afterwards, over a sound surface. Filling a joint that will be hidden behind a cornice is wasted work, but filling the area where the cornice's adhesive will land is not: adhesive bonds to filler badly and to bare board well, so keep the adhesive line clear and fill only the seam.

On a ceiling without a cornice, the wall junction is taped and filled like a seam, then cut in with paint. That edge is the longest continuous joint in the room and the one that shows first if it was rushed.

Nothing about that changes with the size of the room; only the number of screws does.

The habit that keeps a ceiling sound is therefore simple and boring: tape every seam, tape the wall edge, and refuse to let anyone paint until the light has been checked.
$PS$,
  'ceiling-guides', 'FRELUX Editorial', 10, 'published', false,
  'Jointing Polystyrene Ceiling Boards: Tape, Filas and Filler',
  'Seam length, mesh tape against soaked filas, two-pass filling, screw heads, sanding and the raking-light check that finds what daylight hides.',
  'polystyrene ceiling joints, ceiling mesh tape, filas ceiling, joint compound ceiling, ceiling crack repair, taping ceiling boards',
  '2026-11-13 09:35:00+00', 80, 'https://media.base44.com/images/public/6a872e1df3b5e9fc45fc13fb/1c092b45d_generated_image.png', 'global'
)
,
(
  'painting-a-polystyrene-ceiling', 'Painting a Polystyrene Ceiling Without Melting It', 'Polystyrene takes paint well, but only water-based paint. This guide covers why solvent and gloss destroy the foam, how to prepare and prime, coat coverage, spray against roller, and the failures that show up months later.', $PS$## The one rule that is not negotiable

Water-based paint only. Emulsion, matt, silk, satin, acrylic. Never gloss, never an oil-based undercoat, never a solvent-borne sealer, never cellulose or a lacquer, and never a paint whose tin lists a solvent as the carrier.

The reason is chemistry, not caution. Polystyrene is soluble in the aromatic and aliphatic solvents used in oil paints and lacquers. The solvent attacks the cell walls at the surface, the foam softens and collapses, and the film crazes as it dries over a shrunken substrate. A ceiling painted with gloss does not fail subtly: it wrinkles, it pits, and in patches it eats inwards.

A water-based film sits on the surface, dries by evaporation of water, and never touches the polymer. That is the whole of the rule.

## Preparing the surface

Paint adheres to dust, and dust is what a newly jointed ceiling is made of. Sand the filled joints, then dust the whole ceiling with a soft brush and a vacuum with a brush attachment, working from the far corner towards the door, and pay particular attention to the joint lines where filler dust sits in the feather.

Any proud filler is sanded flat, any hollow filled again and sanded, and any screw dimple that was missed gets filled. Paint does not fill defects; it reveals them, because a thin glossy film shows every ridge.

Where the ceiling is newly bonded, confirm the adhesive is cured and the room is dry. Painting over a damp ceiling traps moisture and produces a bloom on the film.

## Primer, and whether it is needed

Bare board takes emulsion without a primer, provided the surface is clean and dust free. Two coats of good quality emulsion will cover.

A primer earns its place in three cases: where the board face is shiny or dusty and the paint will not key, where a strong or dark colour is going over white board and the first coat would show unevenly, and where the room is steamy and a mould-resistant primer is specified. If a primer is used it must be water-based; a solvent primer defeats the entire exercise.

## Coverage, and the arithmetic

A good emulsion covers about ten square metres per litre per coat on a sealed, flat surface. Two coats therefore want 0.2 litres per square metre, which is fifty square metres per ten litre tub per coat, or twenty-five square metres for two coats.

A twenty square metre ceiling needs four litres for two coats, so a ten litre tub does two and a half such rooms, and a twenty litre drum covers a bungalow's ceilings with a little to spare. New board drinks more on the first coat than previously painted board; allow ten percent extra on bare foam.

## Spray, roller or brush

A spray gives the most even film and covers a large open ceiling fastest, and it needs masking, ventilation and a fine tip. In a small room, masking takes longer than rolling.

A roller with a medium pile sleeve is the default. Work in strips about a metre wide, keep a wet edge, and lay off in one direction at the end of each strip so the stipple is even. Two thin coats beat one thick coat, which sags and shows lap marks.

A brush is for cutting in at the cornice, the wall junction and around fittings. Cutting in neatly takes longer than the field and is the difference between a sharp line and a wavy one.

## Drying, recoating and the second day

Water-based paint on a non-absorbent board dries from the surface and can feel touch dry within an hour in a hot room while staying soft underneath. Recoat too early and the second coat drags the first. Follow the tin, add time in a humid or cool room, and ventilate.

Ventilation matters for the people in the room as much as for the paint. A ceiling is painted overhead, and a painter works under a fresh film all day.

## Yellowing and redecoration

A matt emulsion on a ceiling looks fresh for three to five years in a lived-in room, and much less in a kitchen because of cooking vapour. Yellowing is a property of the binder and the environment, not of the board.

Recoating is straightforward: dust, spot-prime any stained area with a water-based stain block, then two coats. There is no need to sand back to the board and no risk in overcoating a sound water-based film. Do not bury a solvent-based gloss that someone else applied: that film is already compromised at the interface, and the right repair is removal.

## Three substrates at every joint

Foam, mesh tape and filler meet at every seam. Emulsion keys to all three, but the filler is more absorbent than the board and dries to a different sheen unless the first coat is even and the second is worked across the joint rather than along it. This is what causes the flashing that shows as a dull stripe over every seam under a window.

The cure is a mist coat: emulsion thinned as the tin allows, applied evenly across the whole plane, then two full coats.

## Cornice, roses and moulded features

Polystyrene cornice and ceiling roses take the same water-based paint as the board. Paint them with a small roller or a brush, and cut in at the wall with a steady hand or against a straightedge for the first few metres.

Where a cornice has fine detail, a brush beats a roller, because a roller bridges the profile and fills the shadow line that makes the moulding read.

## The failures, and what caused each

**Wrinkled, pitted surface.** Solvent paint. The board is destroyed at the surface and must be replaced.

**Flaking in sheets.** Paint over dust, or paint over a damp ceiling.

**Dull stripes over every joint.** Uneven absorption, no mist coat, second coat worked along the joint.

**Visible roller marks.** A dry edge, a thin coat, or too short a pile.

**Stains returning through the film.** A water stain painted over without a stain block; the salts migrate back.

**A ceiling that glitters in raking light.** Filler ridges that were never sanded and never checked with a torch.

## The specification in one paragraph

On bare board: dust, mist coat, two coats of water-based emulsion at about 0.2 litres per square metre in total, applied by roller with the edges cut in by brush and every joint crossed rather than followed. No solvent product at any stage, no gloss, no oil-based undercoat. In a kitchen or bathroom, a water-based mould-resistant finish and mechanical extract. That paragraph is the whole paint specification, and it is what the calculator prices.
## Two coats, one plane, in the right light

Paint a full plane in one session wherever possible. A ceiling finished in two sessions, hours apart, will show a lap where the two films meet, because the drying line is a change in film thickness that no amount of care erases. Start at the far wall, work back towards the door, and keep the wet edge moving.

Then look at the finished plane from the doorway with the room light off and daylight coming in. That is the view the client will have every morning, and it is the harshest test the paint will ever face.

## Painting after a repair, and matching an old ceiling

A repaired area is never the same colour as the rest of the ceiling, because the repair has a different porosity, a different film thickness and sometimes a different batch of paint. The only reliable approach is to repaint the whole plane from wall to wall, cutting in at the cornice and the wall line.

Where a whole ceiling is being refreshed because one room has been repaired, and the other ceilings in the house were painted at the same time, expect a visible difference between rooms. That is normal and it fades; it is worth saying so before the work rather than after.

## How much paint a ceiling really takes

Measured on real jobs, a twenty square metre ceiling takes a little under four litres for two coats on bare board, more on the first coat than the second, and a full twenty litre drum covers about five such rooms. A painter allowing one litre per five square metres per coat is allowing the right quantity for a sealed surface and slightly too little for raw foam, which is why the first coat on a new ceiling always runs short if the estimate was made from the tin's best-case figure.

Buy the drum, not the tub, when more than two rooms are being done. It is cheaper per litre, it removes the risk of a colour and batch mismatch between rooms, and the leftover is the pot for the repair in three years.

## What a good paint job looks like two years later

Two years after handover, a ceiling painted as described here is still white, still flat, and its seams are still invisible. A ceiling painted with one coat, no mist coat and a dusty surface has dull stripes over every joint, a chalky feel under a hand, and one or two hairline cracks at the wall edge.

The difference between those two outcomes is not the paint. It is the half day spent on preparation and the second coat that was not skipped.

## Painted ceilings and the rest of the room

Ceiling paint spatters. Cover the floor, cover anything within a metre of the walls, and mask the tops of door frames. A water-based spatter on a polished floor is easy to remove while wet and difficult once dry; on a textured wall it stays.

Roll from the far corner towards the door so the last strip is the one you walk out over, and take the masking off while the paint is still soft rather than the next morning, when it has bonded to the tape edge.

## Painting in a occupied house

When a ceiling is repainted in a lived-in house, everything below it has to move or be covered. Furniture is shifted to the centre and sheeted, pictures come down, curtains come down or are bagged, and the floor is covered wall to wall. That protection is part of the job and part of the price.

Ventilate while working and keep children and pets out of the room until the film is dry. A water-based paint is far safer than a solvent one, and it is still not something to breathe all afternoon in a closed room. Two coats with a full day between them means the room is out of use for two days, which is worth agreeing before the work starts rather than discovering on the morning of the second coat.

## The tools that make the difference

A roller frame that holds its sleeve, a sleeve that does not shed, a bucket with a grid, a 100 mm and a 150 mm filling knife, a sanding block with a handle, and a good torch. None of it is expensive, and each item removes a class of defect: a shedding sleeve leaves fibres in the film, a worn knife leaves a crowned joint, a bare hand behind abrasive leaves a hollow, and a weak torch misses the ridge that the client will see.

A final note on the mist coat: it is not a full coat and should not be judged as one. Its job is to seal the surface and even out absorption so the two coats that follow sit on a uniform base. A mist coat that looks patchy is working correctly, and it should be left to dry before anyone judges the ceiling.

Keep a small quantity of the paint used, labelled with the room and the date, and sealed. It is the only reliable way to touch in a scuff from furniture a year later without repainting the plane, and it costs nothing to keep.
$PS$,
  'ceiling-guides', 'FRELUX Editorial', 10, 'published', false,
  'Painting a Polystyrene Ceiling Without Melting It',
  'Polystyrene takes paint well but only water-based paint: why solvent and gloss destroy the foam, preparation, priming, coverage and the failures that appear later.',
  'painting polystyrene ceiling, water based paint polystyrene, paint foam ceiling, ceiling paint coverage, solvent free ceiling paint',
  '2026-11-13 09:40:00+00', 90, 'https://media.base44.com/images/public/6a872e1df3b5e9fc45fc13fb/96f6cd94d_generated_image.png', 'global'
),
(
  'fire-performance-of-polystyrene-ceilings', 'Fire Performance and Standards for Polystyrene Ceilings', 'Fire is where a board ceiling has to be specified rather than chosen. This guide explains what a fire-retardant grade actually claims, which standard applies where, and what a tested assembly means.', $PS$## Why fire decides the specification

Every other property of a ceiling board is a preference. Fire performance is a requirement, and it is set by a building code that does not care what the supplier's brochure says. A ceiling that is part of a fire-resisting floor, a protected escape route or a compartment boundary is a tested assembly, and the board in it is one component of that assembly.

Expanded polystyrene is an organic foam. It burns, it melts, it shrinks away from a flame, and it produces dense smoke. That is not a reason to ban it. It is a reason to specify it correctly, in the places where its behaviour is acceptable, and to use something else where it is not.

## What "fire retardant" really means

A fire-retardant grade contains an additive that changes how the polymer behaves when heated: it promotes charring, it reduces dripping, and it can delay ignition. It does not make the board non-combustible, and it does not make a ceiling fire resisting.

The word on a wrapper is marketing. The claim that matters is a classification from a test, quoted with the standard it was tested to, on a datasheet with a batch number. If a supplier cannot produce that, the board has no demonstrated fire performance at all, however the label reads.

## The two product standards, and the separate fire standard

It is easy to confuse the product standard with the fire classification, and they answer different questions.

**EN 13163** is the European product standard for factory-made expanded polystyrene. It sets what is declared: dimensional tolerances, density, thermal resistance, compressive behaviour, dimensional stability, water absorption. A board to EN 13163 has a declared performance and, in Europe, a CE marking. It says nothing about how the board behaves in a fire.

**ASTM C578** is the corresponding North American specification for rigid cellular polystyrene. It classifies by type and sets physical properties in the same way. Again, not a fire classification.

**Fire classification is separate.** In Europe, EN 13501-1 classifies reaction to fire from A1, non-combustible, through to F. Most ceiling foam boards sit somewhere in the D to E range, and a retardant grade may achieve a better class with a specific thickness and substrate. The older German DIN 4102 labels, B1, B2 and B3, are still quoted in many markets and still appear on datasheets; B1 is roughly comparable to a middle Euroclass, not to non-combustible. In the United States, ASTM E84 gives a flame spread index and a smoke developed index, and products are grouped into Class A, B or C on those numbers.

The practical point: a datasheet should state the standard, the class, the thickness tested, and the substrate. Anything less is a claim, not a classification.

## How the material behaves in a fire

Polystyrene melts before it burns in a sustained way. In a developing fire it shrinks, pulls away from fixings and can fall as burning droplets, which is why it is a poor choice anywhere its underside is exposed in a room people escape from.

Smoke is the bigger issue in a real building. Polystyrene produces dense, dark smoke with a high optical density, and smoke is what makes escape difficult and what kills. A ceiling that adds heavy smoke loading to an escape route makes the route unusable sooner, whatever its flame spread figure.

Both of those behaviours are why the material belongs behind a protective layer in any location where the ceiling forms part of the fire strategy, and why a bare board ceiling is a domestic finish rather than a protected construction.

## Where a ceiling is part of the fire strategy

- **Between dwellings.** A floor and its ceiling form a compartment boundary, and the assembly, including the ceiling, is fire resisting.
- **Escape routes.** Corridors, stairs and lobbies in flats and commercial buildings are protected, and the ceiling lining in them is controlled.
- **Plant and service rooms.** Ceilings below a boiler room or a kitchen with commercial cooking equipment carry a rating.
- **Buildings above a certain height or occupancy.** The code sets where a rated ceiling is required, and the height threshold varies by country.

In a single family house with a normal domestic layout, a board ceiling in a bedroom is not a compartment element. In a block of flats, the same ceiling over a living room that separates two dwellings is. The construction looks identical and the requirement is completely different, which is exactly why the location has to be checked before the board is chosen.

## What a tested assembly means

A fire test is performed on a complete build-up: the structural element, the cavity, the frame, the board, the fixings, the joints, and any insulation. The result belongs to that build-up.

That has three consequences. A board that achieved a class in one assembly does not confer that performance in another. A ceiling assembled with fewer or different fixings than the tested one is not the tested one. And a penetration, a downlight or an unfilled gap can defeat the rating of an otherwise correct assembly.

Where a rating is required, the specification should name a tested system from a manufacturer's assessed detail, and the installer should build that detail, not an interpretation of it.

## Penetrations, gaps and the details that leak fire

Every opening in a rated ceiling is a breach unless it is protected. A downlight that is not rated for the ceiling's fire performance, a plastic grille, an unfilled service gap at the perimeter, or a recessed fitting that has lost its intumescent cover, each one turns a rated ceiling into an unrated one.

The details that matter in practice are: fire-rated downlight covers, intumescent seals at access panels, protected service voids, and continuity of the ceiling over the whole compartment, including through cupboards and behind bulkheads where nobody looks.

## Smoke, toxicity and escape time

Fire engineering treats escape as a time budget: the time available before conditions become untenable, against the time needed to get out. A lining that produces heavy smoke reduces the first number sharply, particularly in a corridor where smoke accumulates at ceiling level, exactly where people are breathing.

This is why some codes control not only flame spread but also smoke production and, in some cases, the combustibility of ceiling linings in escape routes. A material can pass a flame spread test and still be restricted by a smoke requirement.

## How the codes differ, and what to do about it

Nigeria's national building code, the UK's Approved Document B, the European national applications of EN 13501-1, and the International Building Code in the United States all treat ceilings differently in detail, and all of them control lining materials in protected areas in some way. None of them can be summarised in a paragraph that is safe to apply in every country.

The workable rule for a project is: identify whether the ceiling is a lining only or part of a fire-resisting element, find the code requirement for that location, and then choose a tested system that meets it. Where the answer is unclear, the specification should default to a non-combustible or a rated board rather than to foam.

## What to ask a supplier, in order

1. Which product standard does the board meet, and can I have the datasheet?
2. What is the reaction to fire classification, to which standard, at which thickness?
3. What smoke classification accompanies it?
4. Has the board been tested as part of a ceiling assembly, and is that assessed detail available?
5. What is the density, and is it consistent across batches?
6. What is the batch or lot number on the delivery?

A supplier who answers all six is selling a product. A supplier who answers none is selling foam.

## When the board is the wrong material

Where the ceiling must be non-combustible, where it forms a compartment boundary and no tested foam system exists for it, or where the room is an escape route in a building above the code threshold, the answer is a different ceiling: gypsum board, mineral fibre tiles, calcium silicate, or plaster on a non-combustible backing.

A polystyrene ceiling is still an excellent ceiling in the places where it is allowed. The skill is knowing which places those are, and saying so before the pallet arrives.

## The practical checklist

- Location classified before material chosen.
- Product standard and datasheet obtained.
- Reaction to fire class in writing, with thickness.
- Assembly named if a rating is required.
- Fixings and frame to the assessed detail, not to habit.
- Every penetration protected with a rated component.
- Access panels sealed and rated as the ceiling.
- Perimeter gaps closed with the specified detail.
- Installation photographed for the handover file.
- Owner given the datasheet and the classification, retained with the building documents.

That list takes an hour on a small project and prevents the one failure that cannot be repaired after handover.
## Retention, records and the handover file

Keep the datasheet, the classification report, the delivery note with the batch number, and photographs of the assembly before it was closed up. On a rated ceiling those are the evidence that the building was built as designed, and on an unrated one they are the record that answers a question in ten years' time about what is above the paint.

A ceiling is a small part of a building and a large part of how a room feels. It deserves a file.

## Insulation, condensation and the fire question together

A board ceiling is often paired with insulation above it, and the fire performance of the pair is not the fire performance of the board. Some insulations are combustible and some are not, the cavity between them changes how a fire spreads, and the assembly may have been assessed as a whole or not at all. Where a rating is required, the insulation and the ceiling are specified together from one assessed detail.

Condensation is the other half of that conversation. An insulated, boarded ceiling is a vapour barrier on the warm side of the structure, and if the roof space above is not ventilated the moisture has nowhere to go. A ceiling that is damp behind the board will show a stain on the face within a season, and the stain is a ventilation problem wearing a ceiling's clothes.

That file is also what a purchaser asks for when a building changes hands, and having it is the difference between answering a question in five minutes and commissioning a survey.

## The sentence that decides a specification

If a specification can say one thing clearly, it should say this: the ceiling is a lining, or the ceiling is part of a fire-resisting element, and here is the evidence for whichever it is. Everything else follows from that sentence. A board that is perfectly acceptable as a lining in a bedroom may be prohibited in a corridor above a certain height, and no amount of product literature changes the code that applies to the corridor.

## How fire requirements reach a small project

Most small projects never see a fire engineer, and the requirement arrives instead through a building control officer, an insurer, or a lender's survey. That makes it easy to assume there is no requirement at all.

The safe approach on any building with more than one dwelling, any commercial kitchen, any plant room, and any escape corridor, is to ask the question explicitly before the ceiling is specified: is this ceiling a lining or part of a resisting element? If nobody can answer, treat it as a resisting element until someone can, because the cost of a rated board is small and the cost of rebuilding a ceiling after a refusal is not.

The paperwork is not bureaucracy for its own sake. It is the record that the specification was met, and on a ceiling nobody can inspect after handover, the record is the only evidence there is.
$PS$,
  'ceiling-guides', 'FRELUX Editorial', 12, 'published', false,
  'Fire Performance and Standards for Polystyrene Ceilings',
  'What a fire-retardant polystyrene board actually claims, EN 13163 and ASTM C578 against Euroclass and E84, tested assemblies, penetrations and code checks.',
  'polystyrene ceiling fire rating, EN 13163, ASTM C578, Euroclass ceiling, fire retardant ceiling board, ceiling fire assembly',
  '2026-11-13 09:45:00+00', 100, 'https://media.base44.com/images/public/6a872e1df3b5e9fc45fc13fb/1c092b45d_generated_image.png', 'global'
,
(
  'costing-a-polystyrene-ceiling-and-comparing-quotes', 'Costing a Polystyrene Ceiling and Comparing Quotes', 'Two quotes for the same board ceiling can differ by half and both be honest. This guide sets out the cost structure, how per square metre rates hide quantities, and how to compare a board ceiling with a plaster one on equal terms.', $PS$## Why the same room gets three different prices

Three contractors price the same 20 m² bedroom ceiling at three different numbers, and none of them is lying. One is pricing 20 mm board bonded to the slab. One is pricing 25 mm board on a timber frame. One has allowed for a tray, a cornice and two coats of paint that were never mentioned in the brief. The scope is different, so the price is different, and a single square metre rate cannot tell you which one you are looking at.

That is the central problem in ceiling pricing, and it is a communication problem before it is a money problem. The only way to compare is to make the scope identical: same method, same board, same thickness, same design, same inclusions. Then the price difference is a real difference in rate, in productivity, or in margin.

## The four parts of every ceiling cost

1. **Board.** Bought in whole sheets, priced by size and thickness. It is the most visible cost and usually not the largest.
2. **Bonding and jointing.** Adhesive, tape or filas, filler, abrasive, and the paint if it is included. This scales with area and seam, and it is where cheap quotes quietly cut corners.
3. **Framing and fixings, if the method needs them.** Battens or channels, screws, nails, hangers, wire, perimeter trim. On a bonded ceiling this line is zero.
4. **Labour.** Setting out, boarding, jointing, sanding, painting, and the access equipment. Quoted per square metre or as a day rate, and it is usually more than half the total.

A quote that states only a square metre figure has collapsed four different things into one number, and it is the frame and the jointing that get lost in the collapse.

## Per square metre rates, and what they hide

A rate per square metre is convenient and it is only meaningful with four qualifiers: the method, the board size and thickness, what is included, and whether the design is flat.

Two contractors quoting the same rate for the same room can be pricing very different jobs. The one who is bonding 20 mm board to a slab has almost no fixing cost and finishes in a day. The one who is framing at 600 mm centres, boarding 30 mm, taping, filling, sanding and painting has three times the material lines and twice the labour. If their rates match, one of them has made a mistake.

The useful discipline is to ask for the rate plus a bill of materials with quantities, and then check the quantities against your own take-off. If the board quantity in the quote is 4.5 sheets for a 20 m² room, the quote is not for the ceiling you measured.

## Labour: day rate against square metre

Skilled board work runs at roughly 15 to 25 m² per person per day for boarding and jointing on a straightforward flat ceiling, less on a stepped or coffered design, and considerably less on curved work. Painting is another five to eight square metres per hour for two coats with the edges cut in.

From those figures, a per square metre labour rate can be checked against a day rate. Take the area, divide by the daily output, multiply by the day rate for the team, and see whether the quoted labour line is plausible. If the quoted labour is half the arithmetic, the difference will appear as a later variation, a thinner second coat, or an untaped seam.

## Turnkey against labour only

A turnkey package means the contractor buys the board, the adhesive, the tape, the filler, the paint and the access equipment, and delivers a finished ceiling. A labour-only price means you buy everything.

Turnkey is easier to manage and usually carries a margin on materials, typically ten to twenty percent, which is fair for the risk and the logistics. Labour-only can be cheaper if you already have trade accounts, and it puts the waste and the second delivery on you.

Either can work. What does not work is a hybrid that nobody wrote down, where the contractor assumes the client is supplying the adhesive and the client assumes the opposite, discovered on the morning the boards are going up.

## Board ceiling against plaster ceiling, on the same room

Take the 20 m² bedroom again.

**Polystyrene, bonded, 25 mm.** Eight boards of 1.2 m by 2.4 m, two cans of foam adhesive, two rolls of tape, a bag of filler, three sheets of abrasive, four litres of paint, and one to two days of a two-person team. No frame, no wet trades, no drying.

**Plaster POP over the same slab.** Cement, fibre, mesh, screeding compound, cornice, and a sequence that includes a wet stage and a drying stage, with the room out of use for longer and the finishing done over several visits.

On a flat ceiling with a slab above it, the board ceiling is usually cheaper in total and always faster. On a sculpted ceiling, the plaster ceiling is the only one that can be built, and the comparison does not arise. Between those two cases is a band where the answer depends on the design and the labour market, which is why comparing the two take-offs before choosing is worth the ten minutes.

## What moves the number

- **Thickness.** 30 mm costs more per sheet than 20 mm, and the price rises faster than the thickness.
- **Board size.** The larger sheet reduces board count and joint count, and it costs more per sheet; on a small room it can cost more in offcuts.
- **Design.** A stepped design adds drop area, more offcuts, more seam, and a higher labour rate.
- **Access.** A ceiling at 3.5 m needs a platform, and a platform costs money and time.
- **Location.** Transport to a site outside the supplier's delivery zone is a real line, often five to ten percent.
- **Season.** Board prices move with resin and freight, and quotes should state how long they hold.
- **Paint.** Two coats over a full plane is not a small item on a large ceiling.

A quote that does not break these out cannot be checked, and a quote that cannot be checked cannot be compared.

## Reading a quote that looks too cheap

The usual ways a board ceiling quote is made cheaper without saying so: 20 mm board where 25 mm was specified, battens at 800 mm instead of 600, one fixing per crossing, tape omitted at the seams, one coat of paint instead of two, no allowance for drops, and cornice excluded and priced later as a variation.

None of these is visible in a square metre rate. All of them are visible in a bill of materials with quantities, which is why the bill of materials is the document to ask for.

## Payment, retention and the finish

Ceiling work is short and it is easy to pay in full on the day the boards go up, which is the day before the jointing is finished. A sensible structure holds a portion until the ceiling is sanded, painted and inspected under raking light, because that is the stage where defects appear.

Where a contractor is working across a whole house, monthly valuations against measured progress are normal, with five to ten percent retention until practical completion.

## Escalation and validity

Board is a commodity and its price moves. A quote should state a validity period, usually fourteen to thirty days, and whether it is fixed or subject to a materials escalation. A quote with no validity and no escalation clause is not actually a price; it is an opinion with a letterhead.

## What the calculator is for in all of this

It is not a negotiating tool and it is not a substitute for a quote. It is a way to know, before anyone quotes, what the ceiling is made of and how much of each item it needs. With that list you can read a quote in two minutes, spot the missing tape, notice that the board count implies a different sheet size, and ask a question that gets a straight answer.

Enter the room, choose the system, choose the method and the board, read the quantities, then enter the unit prices you were actually given. The result is your own paper against theirs, on the same scope, and that is the only fair comparison there is.
## A worked comparison, on one scope

Take that 20 m² bedroom, bonded, 25 mm board, flat, with cornice and two coats of paint, and put the same scope into two quotes that arrive at different totals.

Quote A is a turnkey price with no breakdown. Quote B is a bill of materials: eight boards, two cans of adhesive, two rolls of tape, one bag of filler, three abrasive sheets, four litres of paint, 18 m of cornice, plus two days of a two-person team.

Quote B can be checked line by line against your own take-off, and any line that is missing is a question. Quote A can only be accepted or rejected. That asymmetry is why the bill of materials is worth insisting on even when it feels like a lot of paperwork for one small room, and why the contractor who provides one is usually the one who has done the job before.

## The three questions that end most arguments

1. What board, at what thickness, on what method?
2. What is included in the price, item by item?
3. How long is the price valid, and what happens if board moves?

Ask those three before the contract, in writing, and the ceiling that gets built is the ceiling that was priced. Skip them and the difference is discovered on site, when the boards are already cut.

## Contingency, and how much of it is honest

Every ceiling quote carries some contingency, whether it is written down or hidden in the rate. A reasonable figure on a domestic room is five percent for the unexpected: a slab that needed cleaning twice, a batch of board that arrived bowed, a step that turned out to be deeper than the drawing suggested.

A quote with fifteen percent contingency on a straightforward flat ceiling is not contingency. It is margin wearing a different hat, and it should be asked about rather than accepted quietly.

## Signing off the work

The final inspection is done with the ceiling finished, lit, and viewed from the doorway in daylight, with a torch held flat against the surface to find ridges. Walk the perimeter, check the cornice line, open an access panel if there is one, and look at every joint at a shallow angle.

When it passes, pay the balance and keep the datasheet, the board batch and the photographs. Then the ceiling is done, the file is complete, and the room is ready for everything that happens under it for the next twenty years.

A signed, itemised quote and a photographed finish are the two documents that make a ceiling dispute almost impossible, and both of them take less time than one argument does.

Write the agreed scope into the quote before signing it, even if it is three lines. A ceiling that was priced verbally and argued about afterwards has cost more than the paperwork would have, and more than the time it takes to write three clear lines before the first board goes up.
$PS$,
  'ceiling-guides', 'FRELUX Editorial', 12, 'published', false,
  'Costing a Polystyrene Ceiling and Comparing Quotes',
  'Cost structure of a polystyrene ceiling, what a per square metre rate hides, labour outputs, turnkey against labour only, and how to compare quotes on one scope.',
  'polystyrene ceiling cost, ceiling price per square metre, ceiling quote comparison, ceiling labour rate, POP vs polystyrene cost, ceiling bill of materials',
  '2026-11-13 09:50:00+00', 110, 'https://media.base44.com/images/public/6a872e1df3b5e9fc45fc13fb/1c092b45d_generated_image.png', 'global'
);
);
