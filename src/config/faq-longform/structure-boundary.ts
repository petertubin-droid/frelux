import type { LongFormArticle } from "@/config/faq-longform";

/**
 * Long form copy for the boundary wall and ground floor takeoffs.
 *
 * Both entries stay with the geometry the engines actually work in: the wall
 * run derived from the plot, the coaches entered by the builder, the block
 * selected, and the layer thicknesses that decide the ground floor. No rate,
 * coverage or mix is written here as a fixed number, because a reader in
 * Lagos and a reader in Houston must both get an answer that is true in their
 * own market.
 */
export const STRUCTURE_BOUNDARY_LONGFORM: Record<string, LongFormArticle> = {
  "fence-block-calculator": {
    description:
      "A boundary wall looks like one of the simplest jobs on a site, and it is usually where the first material order goes wrong. The reason is geometry. The materials are bought in three different currencies of measurement: blocks by the piece, mortar by the bag of cement and the cubic metre of sand, and the wall itself by its run and its height. A takeoff that starts from a per metre rule of thumb hides which of those three is driving the order, so when the wall turns out taller than the rule assumed, the blocks and the cement fail together.\n\nThis calculator works the other way round. It takes the plot the wall encloses, derives the run from the perimeter, and multiplies that run by the height in coaches you set. The wall area is then divided by the face area of the block you select, so the count follows the block that will actually be delivered. Mortar, rendering and the concrete in filled cores are worked from the same geometry, and the sand is reported in the units it is carried in on site, which is what makes the figure usable by the person ordering rather than only by the person reading the quote.",
    functions: [
      "Derives the wall run from the plot or site dimensions you enter, so the perimeter is measured once instead of being estimated twice.",
      "Multiplies the run by the number of coaches you set, at the nominal face height of the block, to give the gross wall area.",
      "Divides the gross area by the face area of the selected block to give the blocks needed before breakage.",
      "Applies the breakage allowance to the block count and prints the allowance as its own figure.",
      "Sizes mortar for the joints and the rendering you choose from the mix and the bag weight for your market.",
      "Reports sand in cubic metres and in the tipper trips, barrows and head pans the site actually uses.",
    ],
    worked:
      "A plot measuring 50 metres by 100 metres is enclosed on all four sides, so the run is twice 50 plus twice 100, which is 300 metres. The wall is set at nine coaches and the block has a nominal face of 450 millimetres long and 225 millimetres high, so nine coaches are two and a quarter tenths of a metre, that is 2.025 metres. The gross wall area is therefore 300 metres multiplied by 2.025 metres, or 607.5 square metres. One block presents a face of 0.45 multiplied by 0.225, which is 0.10125 square metres, so the wall needs 607.5 divided by 0.10125 blocks, or 6,000 blocks. At a breakage allowance of 5 percent the order becomes 6,000 plus 300, so 6,300 blocks. Change the block to a longer unit and the face area rises, the count falls, and the mortar for the same joints barely moves, which is exactly the trade a builder needs to see before choosing.",
    advantages: [
      "The block count follows the wall that is going to be built, so a change of height or block size does not send the estimate back to a notepad.",
      "Breakage is printed separately, which means the allowance can be argued about on its own instead of hiding inside the total.",
      "Sand and cement arrive in the units materials are delivered and carried in, so the figure can go straight to a supplier.",
      "Gate openings and the foundation course are handled as their own measurements, so a wall with a wide entrance is not priced as if it were solid.",
    ],
    limits: [
      "The tool sizes materials. It does not design the wall, and pier spacing, foundation width, reinforcement and resistance to wind load are engineering decisions that depend on the site.",
      "Soil conditions and ground levels are not assessed, although both decide what the foundation has to be.",
      "Block strength class and mortar grade are taken as you enter them, and the tool does not check either against the exposure the wall will face.",
      "Where a local authority requires a designed wall, the material quantities here are an input to that design and not a substitute for it.",
    ],
    answers: [
      "The count comes from area. The calculator derives the run from your plot dimensions, multiplies by the coaches you set to get the gross wall area, divides by the face area of the block you selected, then adds the breakage allowance. Nothing in that chain is a per metre rule, so a taller wall or a different block changes the answer in the direction it should.",
      "Blocks are counted by face area, so height enters the multiplication twice: once through the wall area, and again through the number of courses that have to be laid along the whole run. A wall one coach taller needs more blocks across its entire length, more mortar for the extra course, and more cement and sand for the rendering that follows.",
      "The cement and sand figures come from the mortar for the joints and from the rendering you select, converted at the bag weight used in your market. The mix ratio and the allowance are printed with the totals, so the figure can be checked against the specification you are pricing instead of being taken on trust.",
      "A thicker block presents the same face to the wall, so the face area is unchanged and the block count stays close to the same figure. What rises is the mortar in a wider joint and the concrete if the cores are filled. Selecting the block you will buy keeps both the count and the mortar from being priced on the wrong unit.",
      "No. The engine converts your measurements into blocks, mortar, sand and cement. Pier spacing, foundation width, reinforcement and wind resistance are structural work, and a boundary wall on soft ground or in an exposed position should be designed before it is priced.",
    ],
  },
  "german-floor-calculator": {
    description:
      "A ground floor in this construction is built in layers, and each layer is bought in a different unit. Hardcore arrives by the trip, blinding sand by the cubic metre, the damp proof membrane by the roll, and the slab by cement bags, sand and granite. A single lump figure for the floor hides which layer is driving the cost, so a builder cannot tell whether the money is going into the fill, the concrete or the membrane.\n\nThis calculator keeps the layers apart. You enter the floor area, the thickness of each layer and the mix for the slab, and the engine reports the hardcore volume, the blinding, the membrane area with its laps, and the slab concrete converted into bags, sand and granite. Because the layers are independent, deepening the fill adds fill and laterite but leaves the slab concrete where it was, which is the distinction that stops a site from over ordering concrete because it moved some soil.",
    functions: [
      "Converts the floor area and the fill depth into a hardcore volume, with the depth you enter rather than a default.",
      "Sizes the blinding layer from its own thickness and reports the sand it consumes.",
      "Reports the damp proof membrane as an area ordered over the floor for the laps between rolls, and states the lap allowance.",
      "Converts the slab volume at the thickness you set into cement, sand and granite at the mix you choose.",
      "Applies the dry factor the calculator prints, so wet slab volume is not ordered as dry material.",
      "States the bag weight for the market you selected, because a 50 kilogram bag and a 94 pound bag hold different volumes.",
    ],
    worked:
      "A floor of 10 metres by 12 metres is 120 square metres. Hardcore at 0.15 metres is 18 cubic metres. Blinding at 0.05 metres is 6 cubic metres. The slab at 0.10 metres is 12 cubic metres of wet concrete. The dry factor of 1.54 turns that into 18.48 cubic metres of dry material, and a 1:2:4 mix divides it into seven parts: one part cement at 2.64 cubic metres, two parts sand at 5.28 cubic metres and four parts granite at 10.56 cubic metres. A 50 kilogram bag of cement occupies about 0.0347 cubic metres at the density the calculator uses, so 2.64 divided by 0.0347 gives 76.03 bags, which is ordered as 77. The membrane covers 120 square metres and is ordered at 10 percent over for the laps, so 132 square metres. Every step in that chain is printed beside the total.",
    advantages: [
      "Layers stay separate, so a deeper fill does not quietly inflate the slab concrete or the cement order.",
      "The dry factor and the mix ratio are visible, which is where a hand estimate usually undercounts cement.",
      "Bag weight follows the market you selected, so a 94 pound bag is not treated as a 50 kilogram one.",
      "The membrane is ordered with its laps stated, because a floor covered to the net area is a floor that runs short at the joints.",
    ],
    limits: [
      "Compaction in layers, the suitability of the fill and the finished level are site decisions the calculator does not make.",
      "The structural thickness of the slab, and any reinforcement in it, come from the engineer for that ground condition.",
      "Raising a site above flood level is a drainage and levels problem that a material takeoff cannot answer.",
      "The tool does not price labour, plant or the disposal of spoil, and it does not verify the fill that will be delivered.",
    ],
    answers: [
      "It is a layered ground floor: hardcore or laterite fill, a blinding layer, a damp proof membrane and the concrete slab. Each layer has its own thickness and its own purchase unit, so the calculator reports four sets of quantities that add up to one floor rather than one blended figure.",
      "The slab volume is the floor area multiplied by the thickness you enter. That wet volume is converted with the dry factor, divided by the mix ratio, and turned into cement bags at the bag weight for your market, with sand and granite in cubic metres. The factor and the ratio are printed with the quantities so the conversion can be checked.",
      "No, the layers are independent. A deeper fill adds laterite, blinding and membrane area, and leaves the slab concrete unchanged. What the fill has to deliver is a level, compacted surface, because a slab spans the ground and does not bridge a soft spot.",
      "Because the membrane keeps ground moisture out of the slab, and it is bought by area rather than by volume. It covers the floor plus the laps between rolls, which is why it is measured separately from the layers above and below and ordered at a stated percentage over the net area.",
      "You can price the hardcore, blinding, membrane and slab for the area and thicknesses you enter. Fill placed to raise a site, the number of compaction layers, and the structural thickness of the slab itself are engineering decisions, and the tool states that rather than deciding them for you.",
    ],
  },
};
