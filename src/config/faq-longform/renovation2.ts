/**
 * Long copy for the remaining five renovation articles.
 *
 * Ceilings, repaint, power, water and waste. Each one carries the arithmetic
 * that is easy to skip and the decisions the tool deliberately leaves to a
 * person: board type, coat count, circuit design, drainage falls, licensed
 * disposal.
 */

import type { LongFormArticle } from "@/config/faq-longform";

export const RENOVATION2_LONGFORM: Record<string, LongFormArticle> = {
  "renovation-ceilings": {
    description:
      "Ceiling work is measured as plan area, because that is what gets boarded, jointed and painted. It is not a percentage of the wall, and it is not the wall area at all. In a small room the ceiling is often larger than people expect and in a long corridor it is smaller, which is exactly why it is measured instead of estimated.\n\nThis tool reports the ceiling area for each room from the room's own dimensions, names the two decisions that change the price instead of the quantity, and counts old ceiling removal as its own strip out line when you tick it.",
    functions: [
      "Reports ceiling area per room from length times width, with no deduction for light fittings.",
      "Raises the moisture resistant board question in bathrooms, wet rooms and kitchens.",
      "Names fire rated ceilings where downlights or access hatches are being added.",
      "Counts old ceiling removal as strip out, with its own arisings volume.",
    ],
    advantages: [
      "Boarding and painting are measured on the same area, so the two trades agree before either quotes.",
      "Wet rooms are flagged instead of treated as ordinary rooms.",
      "Removal is a separate measured line with its own debris.",
    ],
    limits: [
      "Dropped ceiling voids, bulkheads, coffers and cove details are not measured.",
      "Access hatch positions and sizes are a design decision.",
      "Lighting layout, emergency lighting and fire rating certification are not provided.",
    ],
    worked:
      "A lounge of five by four metres has a ceiling of 20 square metres, the same as its floor, and a corridor of four metres by 1.2 has 4.8. In a flat with a total floor area of 55 square metres the ceilings add up to roughly the same 55 square metres, but only if every room is being done. A refurbishment that repaints walls throughout and only replaces two ceilings has a ceiling area of perhaps 13 square metres, and pricing ceilings as a percentage of wall area would miss that entirely. The tool reports each room's ceiling separately so the two ceilings can be priced and the rest left alone. Boarding then follows the sheet, not the area: a standard sheet covers 2.88 square metres, so 20 square metres needs eight sheets with waste, and the joints are set out to land on the joists, which is why a ceiling area alone does not tell you how many screws or how much joint tape the job will take. Jointing compound and tape are counted against those joints instead of the area, so the sheet layout is part of the order and not a detail for the fixer to sort out.",
    answers: [
      "It is the room's plan area, length times width, with no deduction for light fittings or for the space above a unit. Ceiling work is measured flat because that is how it is boarded, taped and painted, and the area does not change when the ceiling is dropped. The tool reports the area per room and a total, so a boarding order and a paint quantity are built on the same measurement.",
      "A moisture resistant board, and in some cases a cement based board. Standard plasterboard softens and sags in a wet environment, and the failure usually appears at a joint above a shower. The tool asks for the ceiling type and reports the area; the board choice changes the price and the specification, not the quantity, which is why it is your decision and not a silent default.",
      "It gives you the opportunity, and it is the cheapest moment to take it. Dropped ceilings hide cables, pipes and ductwork, but they also lose headroom and they need access hatches at valves, junctions and controls. The tool will measure the ceiling area; it will not design the void, and a service running through a void still needs support, access and, in the case of drainage, a fall.",
      "A hole in a fire rated ceiling weakens it unless the fitting is rated for that ceiling and installed the way the rating requires. That is a specification question, not a quantity question. The tool names the fire rating as a decision to resolve before the lighting layout is fixed, because discovering it after the holes are cut means replacing the ceiling or accepting a non compliant detail.",
      "When you tick strip out for that room, and it is measured as its own line with its own arisings. Old lath and plaster ceilings are heavy, messy and slow to remove, and some older boards and textured coatings contain asbestos. That is why a survey warning appears for buildings from before 2000, and why removal is not folded into the price of a new ceiling.",
    ],
  },

  "renovation-repaint": {
    description:
      "The same wall drinks different amounts of paint depending on what is on it. Fresh plaster absorbs and needs a sealing mist coat. A previously painted wall that is sound and sealed needs less on the first coat. Textured finishes, bare render and repaired patches all take more. One coverage figure applied to every surface is the reason paint quantities are so often wrong in both directions.\n\nThis tool applies a surface factor to each measured surface, reports walls and ceilings separately because access differs, and names filling and sanding as making good instead of folding them into the paint line.",
    functions: [
      "Computes paint litres from the measured area, the stated coats and a factor for the surface condition.",
      "Keeps walls and ceilings separate, since a ceiling is worked overhead and its area is often larger than expected.",
      "Warns when a coat count looks implausible for the work described instead of silently using it.",
      "Names filling, sanding and stain blocking as making good, which is separate measured work.",
    ],
    advantages: [
      "New plaster and a sealed repaint are not priced as the same surface.",
      "The direction of the saving is stated in plain words, so a quote can be explained to a client.",
      "Ceilings are measured on their own area instead of as a percentage of the walls.",
    ],
    limits: [
      "Strong colour changes and stain blocking may need additional coats that are not described here.",
      "Preparation quality is assumed to be adequate once making good is priced.",
      "Spray, brush or roller application is a labour choice, not a quantity.",
    ],
    worked:
      "A room with 33 square metres of wall and a ceiling of 11.5 square metres is painted in two coats. On fresh plaster the surface factor reflects the absorption, so the first coat consumes more than a sealed wall would, and the tool reports the litres that follow. On a sound sealed repaint the same area needs less, which is why a repaint quote can be lower than a new plaster quote for the same room without anyone being cheated. Repainting the ceiling adds its own figure, because a ceiling is measured on its own area and worked in a slower position. The litres themselves come from area times coats times the surface factor, so a changed coat count from two to three is a visible step in the estimate instead of a small round up. Primer and undercoat are separate products with their own coverages, and a stain blocking coat over a water mark is preparation, not paint.",
    answers: [
      "Because absorption and texture change how much paint the wall takes. Fresh plaster is porous and pulls the first coat in, which is why a sealing mist coat is used before the finish coats. A previously painted wall that is sound and sealed absorbs much less, so the same area needs fewer litres. Textured finishes, bare render and repaired patches take more again. The tool applies a factor per surface and states which surface it applied, so the difference between two quotes for the same room becomes explainable.",
      "Two is normal over a prepared surface, three over a strong colour change or a heavily repaired wall. You state the coats and the tool multiplies by them. It also warns when a coat count looks implausible for the work described, because a single coat over a colour change is a specification that will fail, and a number that quiet in an estimate becomes an argument on site.",
      "They are preparation, and preparation follows from strip out and making good, which are their own measured lines. Painting over filler dust or a glossy patch fails, so the sanding and the spot priming belong to the making good work instead of to the paint volume. The tool measures paint and names the gap; if filling and sanding need pricing, they should be measured as work, not assumed inside a rate.",
      "They are measured separately because they are different surfaces with different access. A ceiling is worked overhead, which is slower and harder on the body, and in a small room the ceiling area is often close to the floor area instead of a fraction of the wall. Reporting them separately lets a decorator price the two positions honestly instead of blending them into one rate.",
      "They are linear and unit work, not wall area. The tool reports the skirting run it measured and the door count for each room, so trim, frames and door faces can be priced against a length and a number. Pricing them as a percentage of the wall is guesswork that hides the difference between a room with one door and a hall with six.",
    ],
  },

  "renovation-electrical-points": {
    description:
      "Electrical cost follows points, cable routes and certification, in that order. A room does not consume a fixed amount of electrical work; it consumes the sockets, switches and lights that were designed into it, plus the cable that reaches them and the testing that proves the result.\n\nThis tool counts points per room and is explicit about the boundary. Circuit design, cable sizing, protective devices and earthing belong to a competent electrician working to the wiring regulations of the country, and they are certified instead of estimated.",
    functions: [
      "Counts sockets, switches, lights and data outlets as separate points for each room.",
      "Separates first fix, which is boxes and cable before the walls close, from second fix, which is fittings after decoration.",
      "Names chase patching as unmeasured instead of absorbing it into a point price.",
      "States that testing and certification are required but not priced.",
    ],
    advantages: [
      "Point counts are visible, so a quote can be checked against the plan and against the room.",
      "The sequence between first and second fix is clear before work starts, which protects the programme.",
      "No cable quantity is invented from a room size, because a cable length produced from a floor plan would be a price with no measurement behind it, and the first thing an electrician would do is disagree with it.",
    ],
    limits: [
      "Circuit design, protective device ratings and earthing are not provided, which is why the tool stops at a point count and leaves the design to the person who will certify it.",
      "Cable routes and chase lengths need site measurement.",
      "Inspection, testing and certification are the electrician's responsibility.",
    ],
    worked:
      "A two bedroom flat is rewired during refurbishment. The lounge takes six sockets, a switch and two lighting points, each bedroom takes four sockets, a switch and a light, the kitchen takes eight sockets for appliances plus a switch and two lights, and the bathroom takes a light and a shaver point. Counting them room by room gives a point count you can read back to the client, and the count drives the boxes, the cable and the labour. What it does not do is decide the circuits, and the tool says so instead of producing a cable length that would be fiction. The same restraint applies to containment, trunking and back boxes, which are counted with the points instead of derived from them. Two further matters sit outside the count: cables grouped together carry less current than the same cable in free air, and circuits serving a bathroom or an outdoor position need additional protection. Both change the specification instead of the quantity, and both are the electrician's call.",
    answers: [
      "As points, one by one, per room. A socket, a switch, a light and a data outlet are each a point with its own box, its own cable and its own termination. Counting points is honest and it is checkable against a plan. Counting rooms as a lump hides the difference between a bedroom with two sockets and a kitchen with eight, which is most of the labour on a rewire.",
      "No. It measures the points you ask for, and that is where it stops. Cable sizing, circuit arrangement, protective device ratings, earthing and the earthing system itself are design decisions that belong to a competent electrician working to the wiring regulations in force where the building is. Those decisions are also certified, and a certification is not something an estimate can produce from a room dimension.",
      "Both are needed and they happen at different times. First fix is chasing, boxes, cable and containment, done before the walls are closed and before the plaster and paint. Second fix is the fittings, done after decoration. The tool measures from the point count and the stage you are working at, and the split matters because doing second fix work early means taking it off again to decorate.",
      "Chasing into plaster or block produces dust, debris and a channel that has to be filled and made good before plaster and paint. The tool names chase patching as unmeasured instead of burying it in the point price, because the length of chase depends on the route and the route depends on the building. Naming it lets it be priced deliberately, and it is a line a cheap electrical quote always leaves out.",
      "It is named as a requirement, not priced. A completion certificate with test results is part of the job, and it is the electrician's responsibility. Nothing in a material estimate substitutes for it, and a refurbishment that closes up walls without a test on the wiring is a liability that surfaces at the next inspection or at the next sale.",
    ],
  },

  "renovation-plumbing-points": {
    description:
      "A plumbing point is a fitting that needs a water supply or a waste connection, and the cost of moving one is mostly in the waste. A basin, a WC, a bath, a shower, a sink and a machine point each need their own supply, their own waste and their own isolation, so each is counted separately.\n\nThis tool counts points per room and states the parts it will not measure: pipe runs, drainage falls, waterproofing areas and pressure testing. Those depend on where the stack is in your building, which is a site measurement and not a room dimension.",
    functions: [
      "Counts basins, WCs, baths, showers, sinks and machine points separately for each room.",
      "Flags wet areas where a waterproofing layer is required but not measured.",
      "Names pipe runs, falls and pressure testing as separate requirements.",
      "Reports the point count so labour can be discussed against a real figure instead of a room count.",
    ],
    advantages: [
      "Moving a point is visibly different from replacing a fitting, because the waste moves with it.",
      "Tanking is named at the stage where it is cheap, instead of after a leak.",
      "No pipe length is invented from a floor plan.",
    ],
    limits: [
      "Drainage design, stack positions and falls are not calculated.",
      "Pressure testing and commissioning are requirements, not quantities.",
      "Hot water system sizing and storage are outside this tool.",
    ],
    worked:
      "A bathroom refit keeps the basin, WC and bath where they are and replaces the fittings, so the point count stays at three and the work is second fix. Move the basin to the opposite wall and the supply and the waste both change: the waste now needs a fall over a longer run, which may mean lifting the floor or dropping the ceiling below. The tool reports the same three points either way, which is exactly why it flags the run and the fall as unmeasured instead of letting a point count imply that a move and a swap cost the same. In both cases the fitting count is identical, which is exactly why the run has to be named separately for the difference to be visible. Supply pipes can often share a chase with electrical work but never a conduit, and that separation is a regulation matter instead of a quantity one, which is why the estimate counts points and leaves the routing to the person who will be testing it.",
    answers: [
      "A fitting that needs a water supply or a waste connection. A basin, a WC, a bath, a shower, a sink, a washing machine point and an outside tap all count, and each is counted separately because each has its own supply, its own waste and its own isolation. Counting them this way makes a bathroom refit comparable between quotes, because the point count can be read against the drawing.",
      "It counts points and states that runs are not measured. A waste run needs a fall, and a fall needs a length, and the length depends on where the stack sits in your building. That is a site measurement and often a structural one, since a new run may need a floor lifted or a ceiling dropped. The tool flags it instead of guessing a pipe length from a room size, because a guessed length is a made up price.",
      "Because moving a point moves the supply, the waste and often the falls. A refit keeps the positions and changes the fittings, so the work is mainly second fix. A move turns a fitting job into a drainage job, and drainage is where the cost, the risk and the making good sit. The tool separates the two by measuring points and flagging runs, so the difference is visible before the quote is agreed instead of during the work.",
      "They are flagged in wet areas, not measured, because the area depends on the shower type, the tray, the floor build up and the wall finishes. Tanking is cheap when it is done during strip out and expensive when it is done after a leak, which is why it is named at the point in the sequence where it belongs. The tool does not add a token allowance, because a token allowance is the line that gets cut.",
      "It is named as a requirement. A renovated system needs to be proved before it is closed up, and the proof is a test with a recorded result. That is not a quantity the tool can derive from room sizes, and it is not optional work that can be dropped from a quote to make the number look better. The same applies to commissioning any new boiler, cylinder or pump.",
    ],
  },

  "renovation-waste": {
    description:
      "Waste is the line most often missing from a refurbishment quote and most often paid for at the end, usually in a hurry and at a worse rate. The reason is that waste is measured in volume while the work that produces it is measured in area.\n\nThis tool converts what you strip into a loose volume, applies bulking because stripped material takes more space than it did in place, and turns the result into container loads at the size you enter. Hazardous material is named instead of counted in.",
    functions: [
      "Applies a thickness per removed finish to produce an arisings volume.",
      "Applies a bulking factor before any container is counted.",
      "Reports container loads at the size you state, or volume only when you state none.",
      "Names asbestos containing material, lead painted items, aerosols, solvents and sealants as hazardous.",
    ],
    advantages: [
      "The container count is derived from the work, not from a habit or a guess.",
      "Hazardous waste is separated so it can be quoted by someone licensed to handle it.",
      "Segregation and recycling can be planned against a real volume before the job starts.",
    ],
    limits: [
      "Disposal charges, permits and landfill taxes are yours to enter against a real quote.",
      "Licensed carrier requirements vary by country and are not listed here.",
      "Reuse and recycling rates are a site plan, not a tool output.",
    ],
    worked:
      "A kitchen refurbishment strips 20 square metres of wall tiles and 12 square metres of floor tiles laid on a mortar bed. The wall tiles are thin, so their volume is modest, but the floor bed at 25 millimetres over 12 square metres is a third of a cubic metre of mortar on its own. Add the old units, the worktop and the packaging that arrives with the new kitchen, and the loose volume passes a small container. That is the arithmetic a one skip plan gets wrong, and it is why the tool reports volume and loads separately: the volume is a fact about the job, the container is a purchasing decision about your market. Segregating the metal and the clean timber before the container is filled can turn two loads into one, and the saving is measurable against the volume the tool reported. Weight limits bite as well: broken screed and rubble are heavy, and a container can reach its weight limit while looking half empty, which is a charge the estimate should not hide.",
    answers: [
      "As a loose volume derived from the finishes you remove, with a bulking factor applied because stripped material occupies more space than it did in place. Tiles, screed, plaster and timber each produce a different volume for the same surface area, because each has a different thickness. The volumes are summed and reported, and only then converted to containers, so the count follows the work instead of an assumption about how big a refurbishment skip usually is.",
      "Because a container is priced by the space the material takes, not the space it occupied in the wall. Loose rubble, plaster and tile sit with air between the pieces, so the volume grows by a factor that depends on the material and how finely it was broken. Ignoring bulking is how a container that looked generous is full by lunchtime, and how a second container is ordered at short notice and at a worse rate than the first.",
      "Asbestos containing material, lead painted items, aerosols, solvents, some sealants and anything contaminated with oil or fuel. Those need separate handling and, in most countries, a licensed carrier and documented disposal. The tool names them so they are not counted into a general container, because a carrier who finds them in a mixed load can refuse the load or charge to sort it, and both outcomes cost more than handling it properly from the start.",
      "It reports volume and container loads. Disposal charges, permits, weight limits and landfill taxes differ by council, by country and by the class of waste, and they change. Inventing a figure would make the estimate look complete and be wrong. Enter the real charge from a real quote and the total becomes meaningful, in the currency and the market you are actually working in.",
      "Sometimes. Segregating timber, metal and rubble allows some of it to be recycled or sold, and on a large job crushing rubble on site can cut the number of loads. Clean plasterboard and clean timber are easier to divert than a mixed container. That is a site plan decision, and the tool leaves the volume and the container count visible so the saving from a better plan can actually be measured instead of asserted.",
    ],
  },
};
