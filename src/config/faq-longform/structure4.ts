import type { LongFormArticle } from "@/config/faq-longform";

/**
 * Tall building screening.
 *
 * The answers expand what the page actually does: system selection by height,
 * the ASCE 7 velocity pressure form for wind, a drift check, raft and pile
 * sizing from the demand the geometry produces, and the boundary that keeps the
 * output a screening check.
 */
export const STRUCTURE4_LONGFORM: Record<string, LongFormArticle> = {
  "tall-building-structure": {
    description: `A tall building has two structural problems that a low rise does not: its own weight compounds with every floor, and the wind it catches grows with height while the overturning moment grows faster. The first decision is therefore not a member size but a framing system, because a frame that suits twelve storeys cannot hold seventy.

This page takes the geometry, the concrete strength, the soil and the mapped spectral accelerations, selects the lateral system the height calls for, and reports the wind and seismic shear, the drift, and the raft and pile arrangement that carries the result. Every step prints the terms it used so the arithmetic can be followed, and the page states that this is a screening check for a structural conversation, not a design.`,
    functions: [
      "Selects the lateral system from the entered height, and flags a height outside the range of the system it would otherwise choose.",
      "Calculates wind base shear and roof drift from the velocity pressure form, printing the exposure and topographic factors it applied.",
      "Calculates seismic base shear from the SDS and SD1 values entered and the occupancy category, and reports the period used.",
      "Sizes a raft thickness and a pile group for the combined gravity, wind and seismic demand on the soil entered.",
      "Aggregates the geometry into concrete and reinforcement quantities.",
      "Produces a floor by floor build programme from the floor count and the pour sequence.",
    ],
    worked:
      "A forty storey tower at three point six metres a floor is a hundred and forty four metres tall, and the page puts that in the core and outrigger band it uses between roughly thirty five and seventy storeys, so it selects outriggers instead of a bare core. At that height the wind term is the driver: the velocity pressure rises with the square of the wind speed and the exposure factor rises with height, and the overturning moment is the base shear acting at a lever arm of roughly two thirds of the height. The drift the page reports is the top deflection that shear produces, checked against the limit it states rather than against a limit assumed for every building. The same geometry at twenty storeys would fall back to a shear core, show materially lower base shear, and change the foundation question from a pile group back toward a raft. That comparison, made on one page, is what the tool is for.",
    advantages: [
      "The framing system, the governing load and the foundation type arrive together, before an engineer is booked.",
      "Each figure shows the term it came from, so a reviewer can follow the arithmetic without the source document.",
      "Screening several heights shows where the lateral system begins to drive the cost instead of the floor area.",
      "Quantities and a programme come from the same geometry, so the early budget and the early schedule agree.",
    ],
    limits: [
      "Member design, reinforcement detailing, connection design and a site investigation are outside the page, and a licensed structural engineer must sign off the building.",
      "The wind and seismic coefficients illustrate the form of the calculation for the site class and occupancy entered; they are not a site specific hazard study.",
      "Soil bearing and pile capacity are values you enter, and the page does not derive them from a borehole log.",
      "The system ranges describe where practice puts each framing type, and they are not code limits.",
    ],
    answers: [
      "The page is built for towers between about eight and a hundred and forty storeys, and it names the band it is working in: a rigid frame below fifteen storeys, a shear core to about thirty five, core and outriggers to seventy, tube in tube to ninety, and a mega frame above that. Those bands describe where practice puts each system and they are not code limits, so the page also says when the height you entered sits outside the range of the system it selected, which is the case where a real engineer is needed early.",
      "Wind base shear is the velocity pressure at the reference height multiplied by the gust effect, the pressure coefficient and the area the wind acts on. The velocity pressure itself carries the exposure and topographic factors and the height term, so the same building on an open site and in a city block does not take the same shear. The page prints the factors it applied, which means the figure can be recalculated by hand instead of being taken on trust, and it reports roof drift from that shear so the deflection, not just the force, is visible.",
      "The page applies the drift limit it states for the lateral system it selected and reports the top deflection against it. Drift, not stress, frequently governs the lateral system of a tall building, because a frame can carry the shear and still move too far for the cladding, the lifts and the occupants. Where the reported drift exceeds the limit, the honest reading is that the framing system is too flexible for the height, which is information for the engineer rather than a number to adjust.",
      "The choice follows the demand the geometry produces and the soil you enter. A raft spreads the load over a wide area and suits a soil with usable bearing capacity; a pile group carries the load down to a stratum that can take it, and becomes the answer when the bearing near the surface cannot. The page sizes the raft thickness and the pile arrangement for the combined gravity, wind and seismic demand, and prints the bearing and capacity values it used, so the assumption behind the choice is visible.",
      "Pile capacity is worked from the soil values you enter, not derived from a borehole log the page has never seen. The load carried is the combined gravity, wind and seismic demand, including the overturning component the base shear produces, divided across the group. Because both the demand and the capacity are printed, a change in the assumed capacity shows immediately in the number of piles, which is the figure that moves the foundation cost.",
      "The output is a screening check and the page says so. It is enough to choose a framing direction, compare two heights, and brief a structural engineer with the numbers already in view. It is not enough to cast concrete: member design, reinforcement detailing, connection design, a site investigation and a permit submission all need a licensed engineer, and no part of this page replaces that signature.",
    ],
  },
};
