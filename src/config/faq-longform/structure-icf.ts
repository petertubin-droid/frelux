import type { LongFormArticle } from "@/config/faq-longform";

/**
 * Insulated concrete form walls.
 *
 * The answers expand what the page actually counts: form blocks by type, the
 * net concrete core after the tie webs are deducted, the reinforcement by
 * position, the alignment bracing the pour depends on, and the envelope
 * properties a reader is usually asking about when they choose ICF at all.
 */
export const STRUCTURE_ICF_LONGFORM: Record<string, LongFormArticle> = {
  "icf-wall-estimator": {
    description: `An insulated concrete form wall is a block wall that becomes its own formwork. The blocks are hollow, the reinforcement goes in the cavity, the concrete fills it, and the insulation that held the pour stays in place as the wall's thermal envelope. That single idea changes what a takeoff has to count: not masonry units and mortar, but form blocks in several shapes, a concrete volume that is not the volume of the wall, steel in four different positions, and the temporary bracing that keeps the wall plumb while the concrete is still liquid.

This page takes the perimeter, the wall height, the core thickness and the openings, and returns the physical materials the wall consumes. Every line prints the term it came from, so the block count, the pump order and the bar schedule can be checked by hand. Prices come from the market you select, so the same page works in Lagos, Nairobi, Manchester or Houston without converting one country's rate into another's currency.`,
    functions: [
      "Counts straight form blocks from the wall area and the block face area, then adds the corner pairs and the forty five degree splays the geometry needs as their own products.",
      "Calculates the concrete core volume from the wall area and the core thickness, then deducts the internal tie webs and the openings, so the pump order is the volume that actually fills the cores.",
      "Builds the reinforcement schedule by position: starter dowels into the footing, the vertical grid at the spacing you enter, the horizontal courses at each lift, and a lintel cage over every opening.",
      "Lists the turnbuckle bracing, the strongbacks and the rough bucking as separate lines, because they are hired or cut on site and not bought with the blocks.",
      "Reports the envelope properties of the assembly you specified, labelled as indicative for the core thickness entered.",
      "Converts the same takeoff into a rate build up once a block, concrete and steel rate is known for the market, so the material list and the budget come from one set of measurements.",
    ],
    worked:
      "Take a rectangular building forty metres around and three metres high, with a hundred and fifty millimetre core and four openings of two square metres each. The gross wall face is a hundred and twenty square metres, and the openings take eight of that, so the forms have to cover a hundred and twelve. At a block face of roughly one and a third square metres, that is eighty four straight blocks before waste, plus the four corner pairs the four corners require. The concrete is not a hundred and twelve square metres times the wall height: it is the core area, which is the wall area multiplied by the core thickness and then reduced by the tie webs that cross it, so the pump figure lands a few percent under the naive volume, and the openings are removed again because nothing is poured into a window. The vertical grid follows the spacing entered on both faces, the horizontal courses follow the lifts, and the dowels follow the vertical bars they lap onto. Ordering on the corrected volume is the difference between a pour that fills the wall in one pass and a pour that stops short at the last lift.",
    advantages: [
      "Every block, cubic metre and bar traces back to a measurement on the drawing, so a reviewer can follow the arithmetic line by line.",
      "Corner and splay pieces are counted as their own products, which is how they are bought, instead of being priced as cut straights.",
      "Concrete is ordered on the net core volume, which is the figure a ready mix supplier will invoice against.",
      "The bracing and the bucking appear in the list, so the temporary works are not discovered the week of the pour.",
      "The reinforcement schedule arrives in the positions a bar bender will actually fix, which makes the list usable at the steel yard.",
    ],
    limits: [
      "It does not design the wall. The reinforcement is scheduled to the arrangement you specify, not engineered for your loads, your storey heights or your lateral demand.",
      "The thermal, acoustic and fire values describe the assembly you entered and are indicative. A rated assembly is a tested one, and the listing for the product you buy governs.",
      "Block, concrete and steel rates come from your market price book or the rate you type in. The page never converts another market's figure into your currency.",
      "Openings are deducted where you declare them, and embedments, service penetrations and site access are outside the takeoff. A quantity you leave out is reported as missing, not guessed.",
      "It stops at the wall. Footings, slabs, roof structure and the connection of the wall to them are separate takeoffs.",
    ],
    answers: [
      "It counts the materials the wall consumes, in the units they are sold in: straight form blocks, ninety degree corner pairs, forty five degree splays, the ready mix concrete that fills the cores, the reinforcement in each position, and the temporary bracing the pour needs. It does not price the wall on its own. Once a block rate, a concrete rate and a steel rate exist for the market you select, the same quantities feed a rate build up, which is what keeps the material list and the budget describing the same wall.",
      "The core volume is the wall face area multiplied by the core thickness, with two deductions. The tie webs cross the cavity and are not concrete, so they come out of the gross core, and the openings come out again because no concrete is placed there. The result is the volume a pump or a truck delivers, and it is why an ICF wall of a given face area takes less concrete than the same thickness of solid wall. The page prints the gross volume, the web deduction and the net volume so the difference is visible instead of being buried in a single figure.",
      "Four positions matter. Starter dowels come out of the footing and lap onto the vertical bars, so their count follows the vertical spacing and their length follows the lap. The vertical grid runs on both faces at the spacing you enter, and it is continuous through the storey. The horizontal courses follow the lifts, and they tie the vertical bars together at the spacing the wall needs. A lintel cage sits over every opening and runs past each side. The page schedules those positions separately because that is how steel is cut, labelled and fixed, and because a single lump of tonnage tells a site nothing about what to bend.",
      "The forms are the formwork. Wet concrete exerts a lateral pressure that grows with the pour rate and the temperature of the mix, and nothing but the blocks, the webs and the bracing resists it. Turnbuckles and strongbacks hold the wall plumb and straight while that pressure acts, and they are removed once the concrete has taken its set. A wall poured without them can bow or bulge before it hardens, and the correction afterwards costs more than the hire did. The page lists the bracing as a line item so it is priced with the wall, not treated as site sundries.",
      "ICF assemblies are chosen for all three, and all three are properties of a tested assembly, not of the concrete alone. The mass of the core carries airborne sound, the insulation on both faces lifts the thermal resistance of the wall well above an uninsulated concrete wall of the same thickness, and the gypsum or render lining on the inside is what usually gives the assembly its fire resistance. The page reports indicative values for the core thickness you entered so you can compare options early, and it says plainly that a rating quoted for a tender has to come from the tested listing of the product you are buying.",
    ],
  },
};
