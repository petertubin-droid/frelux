import type { LongFormArticle } from "@/config/faq-longform";

/**
 * Long form copy for the plan elevation page.
 *
 * The registry requires this before the page can read its questions from
 * src/config/tool-faqs.ts, and the copy has to describe what the engine prints
 * rather than what an elevation tool is generally expected to do. Nothing here
 * claims a design check, a plan reading or a code determination, because the
 * page says the same in its own notice.
 */
export const PLAN_ELEVATION_LONGFORM: Record<string, LongFormArticle> = {
  "mathematical-plan-elevation": {
    description: `An elevation is a set of consequences. Enter a length, a width, a storey height and a roof pitch, and the height of the ridge, the length of a rafter, the area of roof covering, the width of a strip footing and the number of blocks all follow from those four numbers by arithmetic that can be written out line by line.

The page is built to show that arithmetic rather than to hide it. Every level of the building is a numbered block on screen: foundation, ground slab, walls, ring beam and roof. Inside each block the entered figure and the result sit beside the step that connects them, so a reader who disagrees with a number can find the line where the disagreement starts.

Reading the drawing is a separate, narrow step. Upload a plan and the reader lifts only the sizes the sheet actually states, each with a confidence figure; you tick what you accept, and the rejected values never reach the calculation. Anything the sheet leaves out is listed as missing so you can type it. The arithmetic itself never consults the model, which is what keeps the output repeatable: the same confirmed numbers produce the same quantities on any device, in any session.`,
    functions: [
      "Derives footing width from an assumed line load and the bearing value you select, then compares the resulting contact pressure with that value.",
      "Calculates excavation, blinding, footing and slab volumes from the plan dimensions and the thicknesses the page states.",
      "Measures wall area from the perimeter and storey height, then deducts the door and window openings you list, side by side.",
      "Calculates ring beam concrete and main reinforcement from the beam length, its section and the bar arrangement shown.",
      "Calculates ridge rise, rafter length and true roof area from the span and the pitch, in both gable and hip form.",
      "Converts every dimension and quantity to feet, square feet, cubic feet and pounds on request, while the arithmetic stays in SI.",
      "Exports the schedule as CSV and the summary as text that carries the assumptions and any screening flag it raised.",
    ],
    worked:
      "Take a twelve metre by nine metre bungalow at three metres floor to floor, with a fifteen degree gable roof and a two hundred and twenty five millimetre wall. The roof span is the shorter plan dimension, nine metres, so the ridge rises by four and a half metres times the tangent of fifteen degrees, about one and a fifth metres, and the rafter on each slope runs about four and two thirds metres. The plan area is a hundred and eight square metres, so the true roof area is that divided by the cosine of the pitch, about a hundred and twelve. Walls run the perimeter, forty two metres, against three metres of height, minus the openings entered. The footing width comes from the cumulative line load divided by the bearing value, lifted by fifteen percent for self weight, and the page prints the contact pressure that results. Switch the display to feet and the footprint reads thirty nine point four by twenty nine point five, the ridge reads about four feet, and the roof area reads about twelve hundred and five square feet, from the same calculation.",
    advantages: [
      "The quantity schedule and the arithmetic that produced it appear together, so a figure can be checked rather than trusted.",
      "The footprint, roof geometry and wall takeoff come from one set of dimensions, which stops the roof and the walls disagreeing.",
      "Openings are deducted by wall side, so the same window is not lost from one elevation and double counted in another.",
      "Feet and metres are a display choice, not a second calculation, so switching units cannot change a quantity.",
      "The export includes the assumption boundary and the screening flags, so a schedule sent to a colleague is not a bare list of numbers.",
    ],
    limits: [
      "It reads only the dimensions an uploaded plan states, and only after you confirm them; it never scales a drawing or infers a dimension the sheet leaves out.",
      "It does not design foundations, size reinforcement for a load case, or check masonry capacity.",
      "It does not determine code compliance, and its bearing and wind values are planning assumptions you supply or select.",
      "It does not price anything by itself: the unit rates are the ones you type, and no supplier price is fetched.",
      "It does not replace a site investigation, a geotechnical report or a licensed engineer's review.",
    ],
    answers: [
      `It turns typed dimensions into geometry and quantities. Footing width follows from an assumed line load and the bearing value you select, and the page compares the resulting contact pressure with that value. Excavation, blinding, footing and slab volumes follow from the plan dimensions and the stated thicknesses. Wall area is the perimeter times the storey height, less the openings you list by wall side. The ring beam comes from its length and section, the roof rise and true area from the span and the pitch, and the programme from the phases the engine carries. Each figure is printed beside the arithmetic that produced it, so nothing arrives without a line a reader can check.`,
      `It can, once you sign in. The reader lifts the sizes the sheet states, such as overall length and width, storeys, wall thickness and roof pitch, each with a confidence figure, and nothing enters the calculation until you tick it. Values the sheet omits are reported as missing so you can supply them. The engine then works from those confirmed numbers alone, so the same inputs still produce the same quantities on any device and in any session, with no model between your confirmed dimensions and the result.`,
      `Yes. The toggle changes what the length fields show and accept, so a footprint can be typed in feet, and it converts area, volume and reinforcement into square feet, cubic feet and pounds in the schedule cards, the summary and the CSV export. Bearing pressure, basic wind speed and line load stay in SI in both modes, because those are engineering inputs quoted in SI by the standards the page names, and a converted figure would look more precise than the screening assumption it actually is. The schematic drawing itself stays in metres, and a caption under it says so rather than leaving the reader to notice.`,
      `The line load is accumulated from roof, walls, ring beam, slab edge and a reduced live load, then divided by the bearing value you enter. The result is lifted by fifteen percent to carry the footing's own weight. The adopted width is the larger of that figure and three times the wall thickness, which keeps a narrow wall from producing a footing too thin to build. The page then divides the load by the adopted width and prints the contact pressure against your bearing value, with a badge that says whether the result sits within the assumption or exceeds it. Exceeding it is a prompt to look closer, not a failure.`,
      `The export writes one row per scheduled item with its level, unit, quantity and any rate you typed, and adds a totals row when rates exist, naming how many items were costed so a partial pricing is not mistaken for a complete one. Quantities follow the unit system on screen, so the file matches what you read. The copy button produces a text summary listing each level, the totals, the programme, the assumption boundary and any screening flag that was raised. That text is meant to survive being pasted into an email, so it says plainly that it is not a design check.`,
      `No. The wind figure uses the velocity pressure form from ASCE 7-22, but the coefficients illustrate a single height and a chosen exposure, and the bearing value is yours to select from a table of typical soils. Both are screening values: they show whether the geometry deserves a closer look, and they give a quantity schedule a stated basis. Foundation design, uplift connection design, masonry stability and code compliance all need information this page never asks for, including a site investigation and a licensed engineer. Treat a green result as arithmetic agreeing with itself, not as a building approved.`,
    ],
  },
};
