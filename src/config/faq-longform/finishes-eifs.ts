import type { LongFormArticle } from "@/config/faq-longform";

/**
 * Exterior insulation and finish systems, the drained and back-ventilated kind.
 *
 * The article answers what the page counts: the boards, the adhesive and the
 * washers that hold them, the mesh that carries the impact load, the base coat
 * and the finish that weather, and the flashings and sealant that decide
 * whether the whole assembly drains. It states the drainage requirement once,
 * because that is the part of an EIFS wall a price per square metre hides.
 */
export const FINISHES_EIFS_LONGFORM: Record<string, LongFormArticle> = {
  "eifs-wall-estimator": {
    description: `An exterior insulation and finish system is a thin coat of polymer-modified mortar over a board of insulation, fixed to the structure, with a textured finish on the outside. The wall you see is four millimetres of material. The wall that performs is the whole stack: the water-resistive barrier on the sheathing, the cavity that lets incidental water drain, the board, the mesh that turns a brittle coat into a reinforced skin, and the flashings that take the water out at the base.

That is why a square metre rate is not enough to price one. A board is a product, the adhesive is a product, the washers are counted, the mesh is counted twice at every overlap, the base coat is measured by weight and the finish by pail. The page turns the facade you describe into those products, one line at a time, so the schedule can be ordered and the budget checked against the same measurements.

Nothing in the takeoff depends on where the building is. Thicknesses and areas are entered in the units you work in, the assembly is described the way the manufacturer's literature describes it, and the price of every line is left to your market's own price book instead of a rate borrowed from another country.`,
    functions: [
      "Measures the facade from the entered dimensions, deducts every opening, and keeps the head, jamb and sill reveals as separate linear items because they are meshed and finished separately.",
      "Counts insulation boards from the board size you choose, adds the cutting waste, and reports the area and the piece count, not a single figure.",
      "Counts the adhesive by coverage and the mechanical washers by the density the system requires, so the fixing schedule matches the board schedule.",
      "Measures the reinforcing mesh over the field area and adds the diagonal patches at every opening corner, where the base coat cracks if it is left unreinforced.",
      "Measures the base coat by weight and the finish coat by pail from the coverage printed on the product, and states the coverage it used.",
      "Lists the starter track, the corner beads, the backer rod and the sealant as their own lines, because a facade that leaks usually leaks at those joints.",
    ],
    worked: `Take a two storey house with two hundred square metres of facade and fifteen per cent of it in windows and doors. The net face is a hundred and seventy square metres. Twenty five millimetre boards at six hundred by twelve hundred millimetres cover zero point seven two square metres each, so the field needs two hundred and thirty six boards, and five per cent cutting waste takes it to two hundred and forty eight. Every board is also a fixing: at the density the system asks for, that is a washer count in the high hundreds, and the adhesive is measured over the same area.

The mesh is the line people under-order. It covers the field at a hundred millimetre overlaps, and then every opening needs four diagonal patches, so twenty four corners at two openings each add ninety six patches that appear nowhere in the facade area. The base coat follows the mesh, not the wall, so its weight is set by the same area plus the patches.

At the base, the starter track runs the full perimeter and the sealant runs at every joint and penetration. Those two lines are small in money and decisive in performance, which is why they are counted and not merely allowed for.`,
    advantages: [
      "Every product line traces to a measurement and a stated coverage, so a supplier's quote can be compared with the takeoff line by line.",
      "Openings are deducted from the field but kept as linear items, which is how they are actually meshed, flashed and sealed.",
      "The impact mesh is counted where it is required, at ground level and around openings, instead of being averaged across the facade.",
      "Board waste and mesh overlaps are visible figures, not a hidden percentage, so a tight budget can see what it is trading away.",
      "Prices come from the market you select, so the same takeoff works in any country without converting one currency into another.",
    ],
    limits: [
      "It does not design the system. The board thickness, the fixing pattern and the drainage detail must come from the manufacturer's current literature and the code that governs the building.",
      "It cannot verify the substrate, the sheathing, the structural adequacy of the fixings or the fire performance of the assembly. Those are tested assembly properties, not arithmetic.",
      "It assumes a drained and back-ventilated assembly. A barrier system without a drainage cavity is a different product with different details, and the takeoff would not describe it.",
      "It does not price anything. A line with no rate in your market's price book stays unpriced and says so; it does not borrow a rate from elsewhere.",
      "It does not include scaffolding, access, sealant movement joints designed by others, or the labour rate, all of which belong in the estimate around this schedule.",
    ],
    answers: [
      "It converts facade dimensions and openings into a material schedule for the whole assembly: the fluid-applied water-resistive barrier, the continuous insulation boards in the type you choose, the adhesive and the mechanical washers, the standard and high-impact reinforcing mesh, the base coat mortar, the textured finish, the starter track with its weep screed, the corner beads, the backer rod and the sealant. Each line is a product with a coverage, not a percentage of the wall area, so the schedule can be ordered directly.",
      "A drained system separates the outer skin from the water-resistive barrier with a cavity. Water that gets behind the finish, through a crack or a failed joint, runs down that cavity and leaves at the base through the weep screed instead of sitting against the sheathing. The model codes require EIFS over wood and light gauge steel framing to drain, and ASTM E2273 is the test that measures how much water the assembly actually releases. The page assumes that assembly, which is why the starter track and the flashings are counted lines.",
      "Continuous insulation sits outside the structure, so it covers the studs as well as the bays between them and removes the thermal bridge that a stud represents. The takeoff reports the continuous R-value of the board you selected, from the conductivity of that material at that thickness, and the U-factor of the whole assembly in metric units. Both are indicative figures for the assembly described, not a certified rating, and they change with the board type, not with the wall it is fixed to.",
      "Ground level walls, entrances and any surface a vehicle or a trolley can reach take blunt impact that standard mesh does not resist. A heavy duty mesh, embedded in the base coat up to about two metres above grade, spreads that load over a wider area. The takeoff counts that zone separately from the field, so the high-impact mesh and the standard mesh are ordered as two products, not one average.",
      "Stress concentrates at the corners of a rectangular opening, and a thin base coat cracks along the diagonal if nothing carries it. A diagonal strip set at forty five degrees across each corner, embedded in the base coat and overlapped onto the field mesh, interrupts that crack before it starts. Every opening contributes four of them, so a facade with twenty four openings needs ninety six patches, and the takeoff counts them instead of assuming the field mesh covers it.",
    ],
  },
};
