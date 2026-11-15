/**
 * Long copy for the first six renovation articles.
 *
 * The estimator page answers one figure at a time. These carry the whole job:
 * what gets measured, what the arithmetic is, where the money actually goes and
 * what the tool refuses to invent. No prices, no coverage rates, no tax rate:
 * every figure a reader needs comes from the market they select and the prices
 * they enter.
 */

import type { LongFormArticle } from "@/config/faq-longform";

export const RENOVATION_LONGFORM: Record<string, LongFormArticle> = {
  "renovation-estimator": {
    description:
      "A refurbishment is priced in the same order it is built: strip out, making good, then the finishes that hide the first two. Most estimates go wrong at the measuring stage, before a price is ever attached, because a room is turned into one round area and every trade is priced against that one number.\n\nThis tool measures room by room. Each room carries its own length, width, height and declared openings, and each trade is applied only where you ticked it. A bedroom with no plumbing produces no plumbing line, a corridor with no ceiling work produces no ceiling line, and an empty dimension is reported as missing instead of being measured as zero.",
    functions: [
      "Computes wall area net of declared openings, floor area, ceiling area and skirting run for every room from its three dimensions.",
      "Applies strip out, plaster, screed, tiling, flooring, ceilings, paint, power points and plumbing points only where the room's own scope says so.",
      "Derives arisings from the finish you declare, applies bulking, and converts the loose volume into container loads at the size you enter.",
      "Prices each line at the rate you enter and leaves tax undetermined until a market rate is loaded.",
      "Names what it cannot measure, including statutory fees, asbestos survey, pipe runs, waterproofing areas and certification.",
    ],
    advantages: [
      "Each line states the surface, the arithmetic and the unit, so a client or a bank can follow a quantity back to a tape measurement.",
      "Because a template fills the same editable rows a custom job uses, a property start is a head start and not a second calculation.",
      "Quantities and money stay separate, so the same takeoff travels between markets and currencies without being rewritten.",
    ],
    limits: [
      "The tool does not decide whether a wall is load bearing, whether a slab can take extra screed, or what a local authority will charge for approval.",
      "Site conditions, access, scaffolding, protection and programme are outside the measurement.",
      "Existing conditions are only as good as what you declare; a survey or a site visit still comes before a fixed price.",
    ],
    worked:
      "Take a two bedroom flat with a lounge of five by four metres at 2.7 high, two bedrooms of 3.6 by 3.2, a kitchen of 3 by 2.7 and a bathroom of 2.1 by 1.8. The lounge has one door and no window deduction declared, so its wall area is the perimeter of 18 metres times 2.7, about 48.6 square metres, less the door opening. The floor is 20 square metres and the ceiling the same. Tick paint on the walls and ceiling, strip out of the existing paint, and plaster where the paint came off, and those three lines follow from numbers you can check with a tape. The bathroom adds tiling to walls and floor, and because it is a wet area the tool flags waterproofing as unmeasured instead of quietly adding a figure. Nothing in the estimate had to be guessed to produce a total you can defend.",
    answers: [
      "By treating each room as its own measurement. The room's length, width and height produce the perimeter, the floor area and the ceiling area, and the openings you declare are deducted from the wall area. Every trade is then applied against those surfaces only where that room's scope says it applies, so a bedroom that is not being tiled cannot produce a tiling line. At the end the totals are sums of the room lines, not a figure computed from a separate whole house model, which is why a single wrong room does not quietly corrupt everything else.",
      "Yes, and the conversion happens once, at the boundary. A room entered in feet is converted to metres, measured there, and reported back in the unit it was entered in. Switching the unit while rooms are on screen converts the numbers already shown, so a room does not silently change size. This matters because most of the arithmetic errors in refurbishment estimates come from mixing a tape reading in one unit with a supplier price in another, and the tool refuses to hold two systems at once internally.",
      "Because a total made of guessed rates is worse than no total at all. Each line is a quantity with a unit, and until you enter a price the line is listed as unpriced instead of shown as zero. Zero reads as free, and free is how a line disappears from a quote. When every line has a price the grand total appears, and the material and labour subtotals are reported separately so you can see which part of the job is driving the number.",
      "It is returned as not determined, never as a default percentage. Tax sits between the estimate and the invoice, and it differs by country, by item and sometimes by the status of the buyer. A tool that applies one rate everywhere produces a number that looks authoritative and is wrong in most markets. Load the rate that applies to your jurisdiction, apply it to the priced subtotal, and keep the estimate honest about what it did and did not include.",
      "Statutory fees and approvals, structural design, asbestos removal, service connections, testing and certification, and any work it cannot measure from what you entered. Those appear as blockers or warnings attached to the relevant room or to the whole job, so they are visible while the estimate is being read. Naming a gap is more useful than an allowance, because the allowance is the line that gets cut and the gap is the line that gets paid for later.",
    ],
  },

  "renovation-strip-out": {
    description:
      "Strip out is the first trade on site and the first place a refurbishment estimate falls short. The reason is simple: the finished surface is not the volume removed. Tiles come off with the bed of adhesive or mortar that held them, plaster comes off with part of its backing, and screed comes off as a thickness instead of an area.\n\nThis tool measures what you remove from the finish you declare. Paint and wallpaper come off thin and leave a surface to prepare. Tiles, screed and render come off thick, add volume to the container and leave a substrate that usually needs making good before anything new goes on.",
    functions: [
      "Applies a thickness per finish so tiles, screed, plaster, render and timber each produce their own arisings volume.",
      "Applies a bulking factor to the loose material before any container is counted.",
      "Separates the removal of a partition from the making good to the floor, ceiling and adjoining surfaces it leaves behind.",
      "Raises an asbestos survey warning for buildings completed before 2000, and names the materials that trigger it.",
      "Reports the debris volume and, where you give a container size, the number of loads.",
    ],
    advantages: [
      "Container counts follow from measured volume, so the skip order matches the job instead of a habit.",
      "The difference between stripping paint and stripping tiles is visible in the quantity and the cost.",
      "Hazardous material is named early, when a survey is affordable, instead of discovered during demolition.",
    ],
    limits: [
      "Wall and floor build ups are assumptions unless you state them; a hollow sounding floor can be a screed or a timber deck.",
      "Whether a wall is load bearing is a structural question and is flagged, not decided.",
      "Disposal charges, permits and landfill taxes come from the local supplier and are entered by you.",
    ],
    worked:
      "A bathroom of 2.1 by 1.8 metres is stripped back to the structure. The wall tiling is about 14 square metres once the door and window are deducted, and it comes off with an adhesive bed of a few millimetres, so the arisings are the tile thickness plus that bed. The floor tiles come off a mortar bed that can be 25 millimetres thick, and over 3.8 square metres that is roughly a tenth of a cubic metre of mortar on its own before any tile. Loose, with bulking applied, the bathroom produces a small container load instead of a couple of bags, which is exactly the figure people underestimate when they plan a one room refurbishment and then find the skip full after the first day.",
    answers: [
      "From the finish, the area and a thickness. The tool measures the surface you are stripping, applies a thickness for that particular finish, and converts the result to a volume. Tiles carry their bedding, screed carries its full depth, plaster carries its coat, and timber carries its section. The volumes are then summed and bulked. That is why two rooms with the same floor area can produce very different arisings, and why the finish you declare is the most important input on the line.",
      "Because a container is priced by the space the material takes up, not by the space it occupied in the wall. Loose rubble, plaster and tile sit with air between them, so the volume grows by a factor that depends on the material and how it was broken up. Ignoring bulking is how a skip that looked generous is full by lunchtime and a second one is ordered at short notice, usually at a worse rate than the first.",
      "Asbestos containing materials were used in floor tiles, ceiling tiles, pipe lagging, cement sheet, textured coatings and gaskets, and they were still being installed into the 1980s and in some places later. They are only identified by survey and laboratory testing, and disturbing them is a health risk and a legal matter in most countries. The tool raises the survey as a warning for older buildings because pricing removal without a survey would be inventing both the quantity and the method.",
      "Only when you state it. Removing a wall is not one line: there is the debris, the making good to the floor and ceiling where it met, the adjoining surfaces that were finished up to it, and usually a structural question about what is carrying the load above. The tool measures the debris and the making good it can see from your inputs, and it flags the structural question instead of deciding that the wall is safe to remove.",
      "You state the container size, because sizes differ by market and by supplier, and a guessed size would produce a confident wrong count. The loose volume is divided by that size and rounded up, since a partly full container is still a container. If you leave the size empty the tool reports the volume only, which is the honest answer when the local skip is measured in cubic yards, in cubic metres, or by weight instead of volume.",
    ],
  },

  "renovation-plastering": {
    description:
      "Plaster is ordered by area and by thickness, and both are easy to overstate. Wall area is a perimeter calculation, not a guess from the floor plan, and openings are a real deduction instead of a rounding error. On a small job the difference between net and gross wall area is a bag of cement and a delivery.\n\nThis tool measures the wall, deducts the openings you declare, and reports the run lengths that trim, beads and reveals are priced against. It also states the drying implication of new plaster, because painting a wall that is still wet is a failure that shows up months later.",
    functions: [
      "Computes wall area from the room perimeter and height, less the declared openings.",
      "Expands the stated thickness into cement and sand using the same site ratios the other FRELUX engines use, so two tools cannot disagree.",
      "Reports the skirting run and the opening perimeters as linear work for trim and beads.",
      "Warns when a paint line sits directly on new plaster, where a sealing coat is needed first.",
    ],
    advantages: [
      "Openings are deducted, which on a single room is a visible saving.",
      "Trim and beads are priced against measured lengths instead of a percentage.",
      "The consequence of a thicker coat shows up in the material order immediately.",
    ],
    limits: [
      "Patches and remedial work are measured as area, not as difficulty or access.",
      "Substrate condition and preparation come from the strip out lines you tick.",
      "Scaffolding, access and protection are separate items.",
    ],
    worked:
      "A bedroom of 3.6 by 3.2 metres at 2.7 high has a perimeter of 13.6 metres, so about 36.7 square metres of wall. A door of 0.9 by 2.1 and a window of 1.5 by 1.2 remove roughly 1.9 and 1.8 square metres, leaving about 33 square metres net. At a backing coat plus finish of around 12 millimetres and a one to four mix, that area needs something over a third of a cubic metre of mortar, which is several bags of cement and a delivery of sand instead of a couple of bags from a shop. Deducting the openings and measuring the perimeter is what turns that into a figure you can order, and the tool reports the skirting run of 13.6 metres less the door so the trim is priced on the same measurement.",
    answers: [
      "Internal plaster is usually a backing coat and a thin finish coat, around twelve to fifteen millimetres in total, and render on an external wall is often thicker. The thickness sets the mortar volume, which sets the cement and sand order, and it also changes the finished level of the wall against adjoining surfaces. That last part matters in a refurbishment: a patch that is noticeably proud of the surrounding wall is a making good problem that costs more to fix than the plaster did.",
      "They are deducted from the wall area, and the tool reports the opening perimeters separately because openings also create trim work. A room with a wide window and a full height door loses several square metres of plaster, which on a small job is a real bag of cement. The deduction uses the openings you declare, so a survey that measures the actual reveals gives a better answer than a guess from a photograph.",
      "Not without preparation. Glossy paint needs a key or a bonding agent, distemper and some older coatings need removal, and tiles normally come off before plaster goes on. This is why the strip out lines exist as their own measured work instead of being assumed free inside the plaster line. A plasterer who arrives at a wall that has not been prepared will either refuse the job or charge for the preparation at a worse rate than a planned strip out would have cost.",
      "Roughly a day per millimetre of thickness for the moisture to leave, and longer in cool, humid weather without ventilation. Dehumidifiers help on a refurbishment but they cost to run and they need the building to be closed. Painting too early traps that moisture and produces blistering, patchy sheen and, in the worst cases, a finish that peels. The tool reports the plaster quantity and warns when a paint line follows new plaster, so the programme decision is made with the drying time in view.",
      "They are linear work, not area. The tool reports the skirting run for each room and the perimeters of the openings it deducted, which is the figure trim, corner beads, stop beads and reveals are priced against. Pricing them as a percentage of the wall area is guesswork that hides the difference between a room with two doors and a run of plain wall, and the difference is what a tradesman actually charges for.",
    ],
  },

  "renovation-screed": {
    description:
      "A screed is a volume, not an area. It is also the trade most likely to be priced on habit, with a thickness assumed instead of measured, and the most common cause of a floor finish failing in its first year when it is laid too early.\n\nThis tool multiplies the measured floor area by the thickness you specify, states both figures, and reports the cement and sand that volume needs. Wet rooms are flagged as needing a laid to fall detail, because averaging a fall into a flat slab is how water ends up against a wall.",
    functions: [
      "Measures floor area per room and multiplies it by the stated screed thickness.",
      "Reports cement and sand from the volume at the site ratio in use, so the order matches the mix.",
      "Warns when a flooring line follows a new screed, where drying time governs the programme.",
      "Flags wet areas as needing falls to a drain instead of a level surface.",
    ],
    advantages: [
      "Thickness is an input, so a deeper screed shows its material cost immediately.",
      "Wet room falls are named instead of averaged away into the slab.",
      "Both area and volume are reported, which is the figure a supplier asks for when ordering.",
    ],
    limits: [
      "The screed type, bonded, unbonded or floating, is a site decision and is not chosen for you.",
      "Added dead load on an upper floor still needs a structural view.",
      "Drying time is given as an order of magnitude, not as a programme.",
    ],
    worked:
      "A ground floor of 60 square metres is to be re screeded at 50 millimetres to bring it level with the adjoining rooms. Fifty millimetres is 0.05 metres, so the volume is three cubic metres of screed, before any allowance for the edges and the levels. At a one to four mix that is a substantial cement order and a sand delivery, not a few bags from the market. If the builder decides on 75 millimetres instead, the volume rises by half and the drying time moves with it. That is why the thickness is an input on the estimate and not a number fixed inside it. The drying clock starts when the screed is laid, not when it looks hard, and a floor walked over too early is a floor that is being repaired later. Three cubic metres of screed is also three cubic metres to barrow, level and finish, which is why the trade is priced by volume and access instead of by the hour.",
    answers: [
      "Floor area times the thickness you state, with the cement and sand expanded from that volume at the ratio in use. The tool shows the area it measured and the thickness it applied, so the volume can be checked by hand. Because screed is bought as sand and cement instead of as a ready product in most of the markets FRELUX serves, the mix ratio matters as much as the volume, and both are stated instead of assumed.",
      "Bonded screed is thin and bonded to a prepared slab, unbonded sits on a separation layer and is thicker, and a floating screed sits over insulation and is thicker again. The tool measures the volume you ask for and states the thickness it used. It does not choose the type, because that depends on the substrate, the build up, the insulation and whether there is underfloor heating, and those are decisions for whoever is building the floor.",
      "Traditional sand and cement screed dries slowly, on the order of a millimetre a day, and a 50 millimetre screed is therefore weeks instead of days, longer in a cool building without ventilation. Laying a floor finish over damp screed traps moisture under an impermeable layer and produces lifting, swelling and adhesive failure. The tool warns when a flooring line follows a new screed so the programme can be planned around drying instead of discovering it after the floor is laid.",
      "Yes, and a level screed is the wrong answer in a shower or wet room. Falls to a drain are a designed gradient, and the thickness varies across the floor as a result, which is a different calculation from a flat slab with an average depth. The tool flags wet areas as needing a laid to fall detail instead of pretending to measure one, because the fall depends on the drain position and the shower type.",
      "Only within limits. Screed is heavy, and on an upper floor that weight has to be carried by the slab and the structure below. The tool reports volume and thickness so the load is visible to whoever is checking the structure, and it flags the structural question. It does not decide whether a floor can take an extra 50 millimetres, and neither should an estimate.",
    ],
  },

  "renovation-tiling": {
    description:
      "Tiling estimates fail on two things: waste and adhesive. The area a tiler covers is not the area you buy, because cuts, edges and pattern all consume tile, and the adhesive is bought by the bag against the area you actually purchase.\n\nThis tool keeps the net measured area and the buy area separate. It states the layout waste it applied, prices the buy area so the order matches the invoice, and computes grout from the tile size, joint width and tile thickness instead of a rule of thumb.",
    functions: [
      "Reports net tiled area and buy area after layout waste, per room and per surface.",
      "Computes adhesive from the buy area and the coverage for the notch size in use.",
      "Computes grout from tile size, joint width and tile thickness.",
      "Flags wet areas where a waterproofing layer is required but not measured.",
      "Keeps wall tiling and floor tiling as separate measurements because they are different jobs.",
    ],
    advantages: [
      "Waste is stated once and separately, so it cannot be applied twice by a pricing layer.",
      "Adhesive and grout appear as their own lines, exactly as they appear on a supplier invoice.",
      "Wet rooms are named, not silently covered by a token allowance.",
    ],
    limits: [
      "Substrate flatness and any levelling compound are separate measured work.",
      "Patterns are allowed for as a percentage, not laid out tile by tile.",
      "Movement joints, trims and thresholds are linear items you price from the lengths shown.",
    ],
    worked:
      "A bathroom with 14 square metres of wall tiling and 3.8 square metres of floor is tiled in a straight lay. The tool reports the net areas and applies a layout waste to give a buy area that covers the cuts at the window reveal and the corners. The adhesive is computed on that buy area at the coverage for the notch in use, so a deeper notch for a large format tile visibly increases the bag count. Grout follows from the tile size, the joint and the thickness. The waterproofing under the shower is flagged as unmeasured, because its area depends on the tray and the wall build up, and that is the line a cheap tiling quote always leaves out. Grout looks like a small item until the joints are counted: a 600 by 300 tile with a three millimetre joint has far less joint per square metre than a 100 millimetre mosaic, and the bag count follows the joints instead of the floor.",
    answers: [
      "It depends on the pattern and the shape of the room, not on habit. A straight lay in a simple room wastes least, a diagonal or herringbone lay wastes more, and a small room with many cuts wastes more than a large open floor. The tool states the layout waste it applied and reports the net area beside the buy area, so you can see the difference and price the tile on the quantity you will actually pay for instead of the area you measured.",
      "Adhesive against the bought tile area, using a coverage for the notch size in use, and grout against the joint width, tile size and thickness. They are separate lines because they are bought separately and they run out at different times. A deep notch for a large format tile uses noticeably more adhesive than a shallow one for a mosaic, and that difference is invisible if adhesive is priced as a percentage of the tile cost.",
      "Because tile and adhesive tolerances are tight. Standards for wall and floor tiling allow only a few millimetres of deviation under a two metre straightedge, and a wavy substrate cannot be tiled within that tolerance by using more adhesive. It needs levelling compound or preparation first, which is measured work. The tool names levelling as a separate item because folding it into the tiling rate makes the tiling look expensive and the levelling look free, which is the wrong way round.",
      "Yes. Shower and wet room floors need a waterproofing layer under the tile, and the wall junctions and upstands need detailing instead of a bead of sealant. The tool flags unmeasured waterproofing in wet areas instead of including a token allowance, because tanking area depends on the shower type, the tray and the wall build up, and a guess here produces either a leak or a wasted roll of membrane.",
      "Enter the price per square metre or per box against the tile line, and apply it to the bought area the tool reports so the order matches what you pay for. Pricing the net area leaves you short of the waste you still have to buy, and it is the single most common reason a tiling order arrives one box light. The same logic applies to adhesive and grout: price them from their own lines, which were computed from the bought area.",
    ],
  },

  "renovation-flooring": {
    description:
      "Floors are bought by area and laid by room, and the difference is where flooring estimates go wrong. A house measured as one rectangle loses the doorways, the thresholds and the offcuts that separate rooms create.\n\nThis tool measures each room on its own, applies a layout waste so the buy area covers cuts and edges, and reports the skirting run so trim can be priced from a length. Rooms entered in feet are converted once and reported back in the unit they were measured in, because a floor check is a tape measurement, not a conversion exercise.",
    functions: [
      "Reports floor area per room and in total, in the unit each room was entered in.",
      "Applies a layout waste to the finish so the buy quantity covers cuts, edges and doorways.",
      "Reports skirting run per room for trim and beading.",
      "Warns when a new finish follows a new screed, where drying governs the programme.",
    ],
    advantages: [
      "Rooms stay separate, so thresholds and offcuts are visible before the order is placed.",
      "Imperial rooms are measured in metres internally and reported back in feet.",
      "Underlay, adhesive and thresholds are left to you instead of being invented as percentages.",
    ],
    limits: [
      "Subfloor moisture and flatness are checks you carry out, not figures derived here.",
      "Acclimatisation time for timber is a programme decision, not a quantity.",
      "Furniture lifting, protection and access are separate site costs.",
    ],
    worked:
      "A flat with a lounge of 20 square metres, two bedrooms of about 11.5 each, a kitchen of 8.1 and a bathroom of 3.8 has around 55 square metres of floor. Measured as four separate rooms with a layout waste, the buy area covers the cuts at each doorway and the run across each room. Measured as one 55 square metre rectangle, the order arrives short, and the shortfall is discovered at the last room, when a second order cannot match the first batch. That is the arithmetic reason the tool keeps rooms apart, and it is why the skirting run is reported separately instead of as a percentage of the floor. Thresholds and door bars are counted per doorway, not per square metre, and a flat with six internal doors has six of them whether the floors are large or small. Underlay follows the same buy area as the floor at its own coverage, and skirting is ordered by the run the tool reports, less the door openings where a threshold takes over. None of that is folded into the floor rate, because trim and underlay are bought from different suppliers on different days.",
    answers: [
      "Yes, room by room, and it does not merge them into one area. Separate rooms mean separate cuts, separate thresholds and separate offcuts, which is why a house measured as one big rectangle comes up short on the order. The tool reports each room's area and a total, so a supplier order can be checked against the rooms you measured and a shortfall can be traced to the room that caused it.",
      "It applies a layout waste to the floor finish so the buy quantity covers cuts and edges, and it reports the skirting run so the trim can be priced from a length. Underlay, gripper, adhesive, beading and thresholds are separate decisions and are not invented, because their quantities depend on the product you choose and the way it is fixed, not on the area alone.",
      "For most finishes, yes, and this is the failure that shows up first. Timber expands with moisture, vinyl adhesive releases, and laminate joints swell. The tool warns when a new floor finish sits over a new screed, because that sequence is the commonest cause of a floor failing in its first year, and it is the warning that saves the most money on a refurbishment programme.",
      "Rooms entered in feet are converted to metres once, measured there, and reported back in the unit you used. The area you see is the area you measured, so a room of twelve by ten feet does not silently become a metric figure you cannot check with a tape. This matters more than it sounds, because a flooring order is placed from the numbers on the screen, and a mismatch between what was measured and what was ordered is a costly argument.",
      "Only if you tick strip out for that room and state what is there. Taking up carpet is not the same job as taking up tiles on a mortar bed, and the tool measures arisings from the finish you declare instead of from an average. That distinction also decides the container count, because a tile bed produces several times the volume of a carpet and underlay.",
    ],
  },
};
