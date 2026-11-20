import type { LongFormArticle } from "@/config/faq-longform";

/**
 * Long form copy for the plaster and render systems calculator.
 *
 * The page answers one question that a flat area rate cannot: which system,
 * built from which layers, bought in which packaging. The prose therefore
 * walks the three systems in the order a contractor meets them, then carries
 * one facade through the arithmetic so the reader can see where each figure
 * comes from.
 */
export const PLASTER_LONGFORM: Record<string, LongFormArticle> = {
  "plaster-render-calculator": {
    description: `Plaster is quoted by the square metre and bought by the bag, and the gap between those two units is where most plaster estimates go wrong. A wall finished in gypsum plaster, a facade finished in a silicone render and a wall finished in Tyrolene are three different assemblies, with different primers, different thickness rules and different packaging. The calculator asks for the system first, then builds it layer by layer, and only then converts the result into the bags, pails, rolls and bead lengths the merchant sells.

The order matters because the rules are not interchangeable. Gypsum plaster is sized by thickness: a millimetre more plaster is a millimetre more material across the whole wall. An exterior topcoat is sized by aggregate grain, because the grain sets how deep the coat sits, and a 3 mm scraped finish consumes far more material than a 1.5 mm one at the same wall. Reinforcing mesh is sized by area plus the overlaps a system approval requires, and beads are sized by the corners and reveals you measure. Treating any of those as a single square metre rate produces a number that looks precise and orders the wrong quantity.

The page also carries the substrate, because absorption decides both how much primer the wall takes and whether a bonding coat is mandatory. Autoclaved aerated concrete and sandcrete block drink primer; smooth concrete and insulation boards need a bonding agent for adhesion. The result states which applies and why, so the primer line is either a requirement or an optional line the estimator can drop.`,
    functions: [
      "Sizes interior gypsum plaster from net wall area and thickness at a published manufacturer consumption rate, then converts the total into the bag weight sold in the selected market.",
      "Sizes exterior render topcoat by aggregate grain size, since grain rather than thickness sets the consumption of a scraped or rubbed finish.",
      "Counts alkali resistant fibreglass mesh at net facade area plus a stated overlap allowance, and divides by the roll area to give a roll count.",
      "Counts corner, stop and drip beads from the external corner heights and window or door reveal perimeters entered, divided into the bead length sold locally.",
      "Applies a substrate rule that raises the primer requirement and consumption on high suction and low suction backgrounds, with the reason printed beside the line.",
      "Delegates the sand and cement backing of a Tyrolene finish to the existing plastering engine, so the cement and sand arithmetic is not re-derived on a second page.",
      "Reads IfcCovering areas from an uploaded model and reports the opening count, so a gross covering area is not mistaken for a net one.",
      "Converts the net area into the market's display unit, so a United States estimate reads in square feet while a German one reads in square metres.",
    ],
    worked: `Take a single storey extension with 96 square metres of external wall after the openings are deducted, finished in a silicone render with a 2 mm grain over EPS insulation boards. The topcoat is 96 square metres at the published consumption for that grain, plus a ten per cent waste allowance, which lands near 306 kg and converts into twelve 25 kg pails in a European market or eleven 29.5 kg pails in North America. The mesh is 96 square metres times 1.10 for the 100 mm overlaps, which is 105.6 square metres, or three 50 square metre rolls. The primer is 96 square metres at the published rate with the insulation board multiplier applied, and it is marked as required because an ETICS build up does not accept a bare board.

Now finish the same wall in Tyrolene. The backing render is 15 mm at a 1:4 mix, which the plastering engine converts into cement bags and sand volume for the market selected. The textured coat is 4 mm at roughly 1 kg per square metre per millimetre, which is 384 kg before waste, or sixteen 25 kg bags. The sealer is a separate line because it is a separate purchase. The two finishes use the same wall, the same openings and the same waste allowance, and they produce completely different material lists, which is the point of asking for the system first.`,
    advantages: [
      "The estimate follows the rule that governs each layer: thickness for plaster, grain for a topcoat, area plus overlap for mesh, and measured length for beads.",
      "Pack counts arrive in the units the merchant sells, so the result can be handed to a buyer without a second conversion step.",
      "Substrate behaviour is stated rather than assumed, which keeps a bonding primer in the estimate on AAC and smooth concrete and out of it on ordinary brick.",
      "An unsuitable system is flagged instead of priced, so gypsum plaster in a wet room raises a warning the moment the zone is marked.",
      "Market naming follows local practice, so the same calculation reads as Gipsputz in Germany, veneer plaster in the United States and Tyrolene in Nigeria.",
    ],
    limits: [
      "Consumption rates are published manufacturer figures, and products differ. The result states the range for the grain selected and treats the figure as product specific rather than universal.",
      "Base coat over insulation is a system decision, so the page sizes the topcoat, mesh and primer and leaves the adhesive and base coat to the ETICS system being installed.",
      "The page does not design the render system: movement joints, weather sealing, substrate preparation, suction control and site conditions remain the applicator's responsibility.",
      "Opening areas are entered or read from the model. Reveals and window surrounds are not measured automatically.",
      "Quantities are material only. Labour, access, scaffolding and drying time are outside the calculation and belong in the programme.",
    ],
    answers: [
      "A 25 kg bag of a typical machine applied gypsum plaster covers between 2.5 and 3 square metres at 10 mm, which is roughly 8.3 to 10 kg per square metre at that thickness. The calculator uses 9.5 kg per square metre per 10 mm and scales linearly, so a 15 mm coat is one and a half times the 10 mm figure. Because the rate belongs to a product rather than to plaster in general, the bag count is the number the named product delivers.",
      "A scraped or rubbed topcoat is one application whose depth is set by the aggregate, so consumption follows grain size and not trowel thickness. Published figures for a common silicone render run near 2.5 kg per square metre at 1.5 mm grain, 2.9 at 2 mm and 3.9 at 3 mm, before waste. The calculator prices the finish at the grain selected and keeps the base coat on its own thickness rule, so the two do not borrow each other's numbers.",
      "Reinforcing mesh is laid with a mandatory overlap at every joint, and the system approvals that govern external insulation call for roughly 100 mm, which adds about ten per cent to the covered area. The calculator multiplies net facade area by 1.10 and divides by the roll area, so the roll count already includes the overlaps. Skipping the allowance is the commonest way a mesh order comes up short on the last elevation.",
      "Tyrolene is a textured cementitious finish applied over a sand cement backing render, and it is common across Nigeria and West Africa. It is priced as its own assembly: the backing is sized from a 1:4 or 1:6 mix at 12 to 18 mm through the plastering engine, and the textured coat is added at roughly 1 kg per square metre for each millimetre of thickness. The protective sealer is a third line, because it is bought separately and applied after the coat has cured.",
      "Absorption decides both the quantity of primer and whether a bonding coat is mandatory. Autoclaved aerated concrete and sandcrete block are highly absorbent and must be primed, or the plaster dries before it cures and the surface dusts. Smooth concrete gives the plaster nothing to key into, so a bonding agent or a spatterdash coat is required. Insulation boards need the system primer before the reinforcing layer. The calculator applies a stated multiplier and prints the requirement beside the line.",
      "Gypsum plaster is a dry area material, and the calculator raises a warning as soon as a wet zone is marked rather than pricing standard plaster as though it were suitable. Bathrooms, kitchens and laundries need a cement based or water resistant system, and the warning names the class to switch to. Getting this wrong is expensive to correct, because the plaster has to come off the wall before a suitable system can go on.",
    ],
  },
};
