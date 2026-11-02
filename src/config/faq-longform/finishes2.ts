import type { LongFormArticle } from "@/config/faq-longform";

export const FINISHES2_LONGFORM: Record<string, LongFormArticle> = {
  "drywall-calculator": {
    description: `A drywall takeoff is a wall measured twice: once as a face area for board, once as a length for framing. The two numbers look similar and behave nothing alike. Board follows the area less the openings; studs, track and noggings follow the length and the spacing, which is why a wall with a wide doorway loses board and keeps nearly all its framing.

The takeoff returns boards, studs, track, screws, jointing compound and tape, each on its own line and each from its own rule. It does not design the partition: fire rating, acoustic performance, deflection and head details are specification decisions, and they change the board and the studs without changing the arithmetic this tool performs.`,
    functions: [
      "Calculates board from the face area on each side of the partition, at the sheet size you specify and rounded to whole sheets.",
      "Deducts openings you list, by width and height, from the board area on the faces they interrupt.",
      "Counts studs from the wall length at the spacing you set, plus the track in top and bottom runs and the noggings for the rows you specify.",
      "Calculates screws from the board count and the fixing pattern, and jointing compound and tape from the joints the sheet size creates.",
      "Separates single layer from double layer, since the board, screws and compound all double while the studs stay.",
      "Reports a partition entered without a height as incomplete.",
    ],
    worked:
      "A partition of nine metres by two point seven, single layer each side, at sheets of one point two by two point four, gives forty eight point six square metres of board across both faces, less a doorway of two square metres on each face, so forty four point six. At two point eight eight square metres per sheet that is sixteen sheets with waste. Studs at six hundred centres over nine metres give sixteen, plus top and bottom track in eighteen metres, plus noggings for the rows specified. The doorway removed four square metres of board and no framing at all, which is the distinction the takeoff exists to keep.",
    advantages: [
      "Board and framing are calculated from different measurements, so an opening is treated correctly.",
      "Sheet size drives both the board count and the jointing, which keeps the two consistent.",
      "Track and noggings are counted, not assumed to come with the studs.",
      "Single and double layer are handled without a second estimate.",
      "The tool measures and does not design, which keeps the specification with you.",
    ],
    limits: [
      "It does not design the partition, its fire rating or its acoustic performance.",
      "It does not assess the structure the partition fixes to.",
      "It does not include insulation, sealant, deflection heads or movement joints.",
      "It does not include taping labour, finishing levels or decoration.",
      "It does not include openings in the framing beyond the board deduction.",
    ],
    answers: [
      `Board on every face, framing by length, and the sundries that follow from both. It measures the partition, deducts the openings, converts the area into sheets at the size you buy, and separately counts studs at your spacing, track in top and bottom runs and the noggings for the rows you specify. Screws, jointing compound and tape then follow from the sheet size, because a smaller sheet means more joints and more compound.`,
      `Yes, on the faces they interrupt. A doorway removes board from both sides of a single partition, and the takeoff deducts it from each face rather than from the total once. Window and door heights matter as well as widths, because a deduction is an area. What an opening does not remove is framing: the studs either side of it, the head and the sill detail stay, which is why the board figure falls and the stud count barely moves.`,
      `By length, at the spacing you set. Studs are counted along the wall, plus one at each end, plus the studs either side of every opening, which the takeoff adds rather than leaving to site. Track is counted in top and bottom runs at the wall length, and noggings follow the rows you specify. Spacing is your input because it follows from the board thickness, the height and the performance required, and it changes the stud count directly.`,
      `Both are included. Screws follow the board count and the fixing pattern, and jointing compound and tape follow the joints that the sheet size creates, so a partition with many joints gets the compound it needs. What is not included is the labour to tape and finish, and the finishing level itself, which is a specification decision about how flat the wall has to be for the decoration going on it.`,
      `No. It measures materials for a partition whose specification has already been decided. Fire resistance, acoustic separation, height and deflection all change the board type, the layer count and the stud section, and those are design decisions with a code behind them. The takeoff converts the decided design into boards, studs and sundries, and it will not choose a stud for a three metre partition that needs a deflection head.`,
    ],
  },
  flooring: {
    description: `Flooring is the one finish bought in packs with a published coverage, which makes the arithmetic simple and the ordering easy to get wrong. Packs cover a stated area, cuts waste part of it, and the room's perimeter decides the skirting and the edge trims, which have nothing to do with the floor area at all.

The estimator keeps the two apart. Area decides packs, perimeter decides skirting and trim, and the waste percentage sits between them as a visible line you control, since a straight lay in a square room and a herringbone in a hallway with six doorways do not lose the same proportion of a pack.`,
    functions: [
      "Calculates floor area from the room dimensions and converts it into packs at the coverage each pack states.",
      "Applies the waste percentage you set, before rounding to whole packs.",
      "Calculates skirting and edge trim from the perimeter, less the doorways you list.",
      "Separates the covering, the underlay and the fixings, since each has its own coverage rate.",
      "Reports a room entered without dimensions as incomplete rather than defaulting a size.",
      "Handles more than one room, so a whole floor is one pack count rather than a per room order.",
    ],
    worked:
      "A room four point two by three point six is fifteen point one square metres. At two point two square metres per pack that is seven packs before waste, and eight with a ten percent allowance, which leaves a spare board and a half for the doorway and a future repair. The perimeter is fifteen point six metres, less one point eight for the doorways, so thirteen point eight metres of skirting. Underlay at fifteen square metres per roll means two rolls. The skirting did not change when the covering changed, which is the point of measuring the perimeter.",
    advantages: [
      "Packs follow the published coverage rather than an assumed area.",
      "Waste is a stated percentage, so a difficult layout can carry the allowance it needs.",
      "Skirting follows the perimeter, so a change of covering does not disturb it.",
      "Underlay and fixings have their own coverage, so none of them is estimated from the floor area by habit.",
      "Multiple rooms produce one order, which is how flooring is bought.",
    ],
    limits: [
      "It does not assess the subfloor, its flatness or its moisture.",
      "It does not include levelling compound or preparation beyond what you add.",
      "It does not include adhesives for glue down products unless you price them.",
      "It does not include door undercuts, thresholds or stair work.",
      "It does not design the expansion gaps or the layout.",
    ],
    answers: [
      `Timber and laminate in packs, tile and stone by area and box, vinyl in sheet or tile, and carpet by the square metre with its underlay. Each is bought differently, so the estimator applies the coverage the product states rather than a single rate. Where a product is priced per square metre you get an area, and where it comes in packs you get whole packs, because a part pack is not something a merchant will sell you.`,
      `Area divided by the coverage the pack states, then rounded up, with your waste percentage applied before the rounding. A pack that covers two point two square metres will not tile a four point two by three point six room into a whole number, so the seventh pack becomes eight with the allowance. Because the rounding happens once across all the rooms, a whole floor is cheaper in packs than the same rooms ordered separately.`,
      `Because skirting is a length, not an area. A square room and a long narrow room can share a floor area and differ by several metres of skirting, and the skirting is bought by the length. Doorways interrupt the run, so they are deducted, and the same perimeter gives you the edge trim and the scotia where the covering meets a wall it does not run under.`,
      `No, it is yours to set. A straight lay in a square room loses around five percent, a diagonal or herringbone in a hallway with several doorways loses fifteen or more, and a plank layout running through several rooms loses more again because the offcut at one end rarely fits the next. The percentage appears as its own line so a client can see what was allowed and why.`,
      `Levelling and preparation are outside the estimate. A subfloor that is out of flat needs a compound, which is a separate product with its own coverage, and one that is damp needs a membrane before anything is laid on it. Both are assessed on site rather than from dimensions, so the estimator asks instead of assuming, and a floor laid on a bad subfloor fails whether or not the pack count was right.`,
    ],
  },
  "masonry-calculator": {
    description: `Masonry is where construction estimating starts, and it is still the discipline most often done by rule of thumb. A wall has a length, a height and a thickness, and from those three numbers come the units, the mortar and the cement, with no need for a rate per square metre that hides which block it assumed.

The calculator asks for the wall type because the unit differs: a block wall, a brick wall and a thin joint system have different unit sizes, different joint thicknesses and different mortar volumes. Openings are deducted by dimension, and the mortar follows the joint rather than the wall area, which is why a change of block size moves the cement as well as the count.`,
    functions: [
      "Calculates unit count from the wall area and the unit size you select, at the joint thickness specified.",
      "Deducts openings by width, height and quantity, so doors, windows and vents come out of the count.",
      "Calculates mortar volume from the joint thickness, the unit size and the wall area the units fill.",
      "Converts mortar into cement and sand from the mix you choose, with cement in the bag size sold in your market.",
      "Handles block, brick and thin joint walls, with the unit and joint inputs following the type.",
      "Reports a wall entered without a height as incomplete rather than assuming a course count.",
    ],
    worked:
      "A wall of twenty four metres at two point seven, in four hundred and fifty by two hundred and twenty five millimetre blocks at a ten millimetre joint, gives sixty four point eight square metres. A door and two windows account for five point four square metres, leaving fifty nine point four, which at a block covering just over a tenth of a square metre is about five hundred and eighty blocks before waste. Mortar at ten millimetres over that area is a little over half a cubic metre, which in a one to five mix is about a hundred kilogrammes of cement and the sand that goes with it.",
    advantages: [
      "The unit and joint are inputs, so a change of block size changes both the count and the mortar.",
      "Openings are deducted by dimension, which is where a hand count runs long.",
      "Cement is expressed in the bag size sold in your market.",
      "Wall types are distinguished rather than treated as one material.",
      "A wall without a height is reported instead of guessed at a course count.",
    ],
    limits: [
      "It does not check the wall structurally: slenderness, lateral support and reinforcement are an engineer's work.",
      "It does not include lintels, damp proof courses or wall ties unless you price them separately.",
      "It does not include scaffolding, labour or mortar mixing plant.",
      "It does not assess the foundation or the substrate the wall sits on.",
      "It does not include plaster or render, which are measured by the finish tools.",
    ],
    answers: [
      `Block walls, brick walls and thin joint systems, with the unit size and joint thickness following the type you select. Each has its own coverage per unit and its own mortar volume, so the tool does not blend them. Where a wall uses more than one type, measure each as its own wall and add the results, which keeps the block count and the brick count separate for ordering.`,
      `Deducted by width and height with their quantity, so doors, windows and vents come out of the unit count rather than being added as an afterthought. An opening is an area, not a count, so a wide low window and a narrow tall one are handled by their dimensions. What is not deducted is the extra cutting and the lintel above, which are separate items you price on their own.`,
      `Yes. Cement packaging and mortar specifications come from the market you select, so a fifty kilogramme bag and a twenty five kilogramme bag are both handled, and the engine never falls back to one country's packaging when a market is set. Where the market's specification differs on joint thickness or mix, that is an input you can enter, so the same wall can be priced to a local practice without changing the tool.`,
      `Both are included, and they follow the wall rather than being added per square metre. Mortar volume follows the wall type and the joint thickness, so a thin joint system uses a fraction of the mortar a ten millimetre joint does, and the cement follows the mix you specify. Cement is expressed in the bag size sold in your market, so the order is a number of bags rather than a weight to convert at the counter.`,
      `No. It measures materials. Slenderness, lateral support, movement joints and reinforcement for a wall that is retaining or carrying load belong to an engineer, and a quantity tool that offered an opinion on them would be answering a question it cannot see the inputs for. Use the count to order blocks and the engineer's design to decide how the wall is built.`,
    ],
  },
  "paving-calculator": {
    description: `Paving is a surface over a structure, and both are bought by different measures. The pavers follow the area and the pattern, the bedding and subbase follow the area and the depth, and the edge restraint follows the perimeter, which is why a paving estimate that starts and ends with a paver count is only half a takeoff.

The calculator keeps the three apart and lets you set each depth, because those depths are specification decisions rather than defaults. A driveway and a garden path do not share a subbase, and a change from one to the other changes the granular volume by more than it changes the paver count. Where a depth is left blank, the page asks rather than choosing.`,
    functions: [
      "Calculates paver count from the area and the paver size you specify, at the joint width and pattern you select.",
      "Applies the pattern's cutting allowance, since a herringbone loses more to cuts than a stack bond.",
      "Calculates bedding sand from the area and the bed depth you set.",
      "Calculates subbase from the area and the depth you set, in tonnes or cubic metres.",
      "Calculates edge restraint from the perimeter, less the openings you list.",
      "Reports a missing depth as an input rather than substituting a typical value.",
    ],
    worked:
      "A driveway of forty eight square metres in two hundred by one hundred millimetre pavers, at a ten millimetre joint, comes to about two thousand two hundred pavers before cutting, and a herringbone pattern adds close to ten percent for the cuts at the edges. Bedding sand at thirty millimetres is one point four cubic metres. Subbase at a hundred and fifty millimetres is seven point two cubic metres, which is around fourteen tonnes once compacted density is applied. Edge restraint runs the perimeter, eighteen metres for an eight by six rectangle, less the driveway opening. The pavers changed by nothing when the subbase depth changed, which is why the two are separate lines.",
    advantages: [
      "Pavers, bedding and subbase are calculated from their own rules rather than one blended rate.",
      "The pattern changes the cutting allowance, which is where hand counts fall short.",
      "Depths are inputs, so a driveway and a path are priced differently.",
      "Edge restraint follows the perimeter, which a paver count cannot produce.",
      "A missing depth is reported rather than assumed.",
    ],
    limits: [
      "It does not design the pavement, its subbase depth or its drainage.",
      "It does not assess the ground or its bearing capacity.",
      "It does not include kerbs, channels, gully connections or drainage falls.",
      "It does not include labour, compaction plant or excavation disposal.",
      "It does not include sealants or jointing sand beyond the quantity you specify.",
    ],
    answers: [
      `Area divided by the area of one paver including its joint, then rounded up, with a cutting allowance for the pattern. A two hundred by one hundred paver at a ten millimetre joint covers about two hundred and thirty one square centimetres of finished surface, so forty eight square metres needs roughly two thousand two hundred. The count comes back in whole pavers, and the pattern adds to it, because herringbone cuts differently from a stack bond.`,
      `Yes, through the cutting allowance. A stack bond in a rectangular area loses very little to cuts, a running bond loses more at the edges, and a herringbone or basket weave loses more again because the offcuts rarely fit anywhere. The calculator applies the allowance for the pattern you select, so the same area in two patterns produces two different paver counts, which matches what a paver layer would order.`,
      `Both are calculated from the area and the depths you enter, not assumed. Bedding sand is a thickness over the whole area, and subbase is a greater thickness that is compacted to a finished level, so it is ordered as a loose volume or a tonnage. Because the depths are yours, a garden path at a hundred millimetres of subbase and a driveway at two hundred are priced as the different jobs they are.`,
      `No, they are inputs. Subbase and bedding depths follow from the traffic, the ground and the drainage, and they are the difference between a pavement that lasts and one that ruts in the first wet season. The calculator asks for the depths your specification calls for and shows the volumes they imply, so you can see the material cost of a specification change before you commit to it.`,
      `Edge restraint is calculated from the perimeter, less the openings you enter, and it is included as a line because it is bought by the metre and often forgotten. A pavement that is not restrained at its edges spreads, whatever the subbase. The perimeter also gives you the length of any channel or kerb you are adding, which is why the takeoff asks for the plan rather than only the area.`,
    ],
  },
  "plastering-calculator": {
    description: `Plastering is a thickness business wearing an area costume. The area decides how much trowel work there is, and the thickness decides how much sand and cement arrives on site, which is why two walls of the same size with different specifications are different orders.

The specific difference is that plaster and render are not one material. A gypsum plaster on a wall inside and a cement render on a wall outside have different mixes, different thicknesses and different preparation, and the calculator keeps them apart so a wall is not priced at the other's rate. Beads, scrim and bonding agents are counted separately where the specification calls for them.`,
    functions: [
      "Calculates plaster or render volume from the area and the thickness you enter.",
      "Splits the volume into sand and cement, or into bags of a bagged product, according to what you select.",
      "Counts beads from the corners, reveals and stops you enter, by length.",
      "Counts scrim and tape from the joints and changes of material you list.",
      "Separates internal plaster from external render, since the mixes and thicknesses differ.",
      "Reports a missing thickness as an input rather than applying a typical coat.",
    ],
    worked:
      "A wall of thirty square metres in a fifteen millimetre cement render is zero point four five cubic metres of mortar, which in a one to four mix is about a tenth of a cubic metre of cement, roughly a hundred and forty kilogrammes, or three bags, and a third of a cubic metre of sand. The same wall in a three millimetre gypsum skim is four and a half square metres of a bagged product at a small coverage per bag, which is a very different order. Beads at the door reveals and the external corners come off the lengths you enter, not off the area.",
    advantages: [
      "Thickness is an input, so a two coat specification shows its material cost.",
      "Internal plaster and external render are kept apart, with their own mixes.",
      "Beads and scrim are counted from the details rather than a rate per square metre.",
      "Cement is expressed in the bag size sold where you are working.",
      "A missing thickness is reported instead of assuming a coat.",
    ],
    limits: [
      "It does not assess the substrate, which decides whether a bonding agent or a key is needed.",
      "It does not design the mix or specify admixtures or fibres.",
      "It does not include floating, dubbing out or patch repairs to the wall.",
      "It does not include scaffolding or access equipment.",
      "It does not include decoration over the finish.",
    ],
    answers: [
      `Internal plaster and external render, and within those the difference between a gypsum finish and a cement based one. They differ in mix, thickness and preparation, so the calculator asks which you are applying before it calculates anything. Where a wall takes a render base coat and a plaster skim, measure the two as their own surfaces, because the products and the thicknesses are not interchangeable.`,
      `From the area and the thickness, which gives a volume, then from the mix you specify. A one to four mix splits that volume into one part cement and four of sand, and the cement is then converted to the bag size sold in your market. A bagged product instead asks for its coverage, because a manufactured plaster states how many square metres a bag will cover at a stated thickness, which is a more direct route than a mix.`,
      `Yes, and more than most people expect, because material follows volume. Doubling the thickness doubles the sand and cement on the same wall, and a two coat render at eighteen millimetres total uses well over twice the material of a single ten millimetre coat. That is why the thickness is an input and why the page shows the volume: a specification change that looks like a detail on a drawing is a lorry load of sand.`,
      `Beads, scrim and bonding agents are counted where the specification calls for them. Beads follow the corners, reveals and stops you enter, measured as lengths, since a stop bead at a ceiling line is a metre of bead rather than an area. Scrim follows the joints and the changes of material. Bonding agent follows the area you treat, at its stated coverage, and it is the item most often left out of a plaster estimate.`,
      `Only where you enter it. Surface preparation is a site judgement: a dusty wall needs a bonding agent, a smooth concrete wall needs a key, and a painted wall may need more than either. The calculator asks for the area you are treating and adds the product at its coverage, so the preparation is priced as its own line rather than folded into a trowel rate that assumes a perfect substrate.`,
    ],
  },
};
