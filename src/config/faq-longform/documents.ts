import type { LongFormArticle } from "@/config/faq-longform";

/**
 * Long form copy for the quote check and the photo estimator.
 *
 * The two are opposite ends of the same discipline. One judges a price that
 * someone else produced, the other produces measurements for the engines to
 * price. Both refuse to invent: the quote check will not make up a market rate
 * for an item it does not hold, and the photo estimator will not decide a
 * dimension from a photograph and keep quiet about it.
 */
export const DOCUMENTS_LONGFORM: Record<string, LongFormArticle> = {
  "quote-check": {
    description:
      "A quote is a list of rates, and the contractor who produced it knows more about every line than the person reading it. That imbalance is what makes quoting feel opaque: the total is one number, the scope is prose, and the only defence is a sense of whether the price is roughly right. A market comparison replaces the sense with a band and a name for each line.\n\nThe check works line by line. Each quoted rate is compared with the price book rate for the same item, and a band of 10 percent either side of that rate counts as fair. Outside the band the line is named as over or under, with the rate difference and the money difference printed beside it. Lines whose unit does not match the reference are not compared at all, and lines with no reference price are listed as unjudged, which is the honest position when the market rate for an item is not known.",
    functions: [
      "Compares the quoted rate on each line with the price book rate for the same item in your market.",
      "Applies a fair band of 10 percent either side of the reference rate, and reports the band it used.",
      "Names lines above the band as over and lines below it as under, with both differences printed.",
      "Calculates the reference amount as quantity multiplied by the rounded reference rate, so the money gap follows the rate gap.",
      "Reports unit mismatches without a comparison, because square metres written as m2 and as sqm are different strings.",
      "Lists lines with no reference price separately, since a market rate for an unknown item cannot be produced.",
    ],
    worked:
      "Cement is held at 8,500 per bag. One quote carries 40 bags at 9,000, another carries 40 bags at 10,200. The first rate difference is 500, which is 5.88 percent of 8,500, so the line sits inside the band and is reported as fair. The second rate difference is 1,700, which is 20 percent of 8,500, so the line is named as over. The money side follows: 40 bags at 9,000 is 360,000 against a reference of 40 at 8,500, which is 340,000, a gap of 20,000. The second quote is 40 at 10,200, which is 408,000, a gap of 68,000. A third supplier quotes sharp sand per tonne while the price book holds it per cubic metre, so that line comes back as a unit mismatch with no verdict. A fourth line covers an item the price book does not hold, and it is counted as unjudged instead of passed.",
    advantages: [
      "The band is a stated number, so a verdict can be argued with instead of accepted.",
      "Rate and money differences are both printed, which separates a high rate from a large quantity.",
      "Unjudged and mismatched lines are counted apart from fair ones, so silence cannot be read as approval.",
      "The comparison runs on your market's price book, which keeps the verdict local to the prices you can actually pay.",
    ],
    limits: [
      "A fair line is a verdict on the rate alone. Specification, quantity, wastage, preliminaries, labour and terms are not judged.",
      "An out of date price book produces a confident wrong verdict, so the reference has to be maintained.",
      "Unit aliases are deliberately not guessed, which means a correctly priced line can still come back as a mismatch until the units agree.",
      "The check does not know what a fair profit is, and a quote inside the band can still be uncompetitive on scope.",
    ],
    answers: [
      "A rate is compared with the price book rate for the same item, and a band of 10 percent either side is treated as fair. Outside that band the line is named as over or under, and both the rate difference and the money difference are printed, so the size of the gap is visible and not only its existence.",
      "Because the price book holds no rate for that item. The line is reported as having no reference and counted apart from the judged lines. Inventing a market rate for an item the tool does not know would make every verdict suspect, so the honest answer is that this line needs a supplier conversation.",
      "The line is reported as a unit mismatch and no comparison is made. Units are compared as strings after trimming case and spacing, so m2 and sqm are not the same unit. Guessing aliases is how a comparison tool reports a saving that does not exist, and a refused comparison is easier to correct than a wrong verdict is to notice.",
      "Both. The rate is the figure compared against the band, because a total can hide a short quantity, and the line amount is then calculated as quantity multiplied by the rounded reference rate so the money difference sits beside the rate difference.",
      "No. The check judges the rate against the market and nothing else. The specification, the quantity measured, the wastage allowed, the preliminaries, the labour rate and the payment terms all sit outside it, and a quote can pass every line and still be a poor piece of business.",
    ],
  },
  "photo-estimator": {
    description:
      "A photograph is the fastest way to get a building into a calculator and the worst way to decide it. It carries real information, the footprint, the number of bays, the roof form, and it carries none of the information that decides a quantity: the height behind a parapet, the wall hidden by a neighbouring building, the thickness of the thing you are looking at edge on. A tool that turns a photograph straight into a price hides which of those it guessed.\n\nThis surface draws the line in a visible place. The photograph is read for building details such as overall dimensions, building type and roof type, and those readings are put in front of you beside the values the engine would otherwise assume. You confirm or correct each one, and the FRELUX engines produce the quantities and the cost from the figures in the form. The extraction is one job and the arithmetic is another, and the review step is where the two meet.",
    functions: [
      "Accepts a photograph of the building or the project and reads it for overall dimensions, building type and roof type.",
      "Shows each reading beside the engine default, so an observation is never presented as an assumption.",
      "Takes corrections on any reading before the estimate is generated.",
      "Records the corrections, which is how the extraction improves against real buildings.",
      "Runs the estimation engines on the confirmed figures and returns quantities and cost, with the engine's own stated assumptions.",
      "Saves the estimate to a project, so a later recalculation starts from the measurements instead of the photograph.",
    ],
    worked:
      "A photograph of a single storey building is read as 12.5 metres by 8.5 metres, a storey height of 3.0 metres and a gable roof. On review the owner knows the frontage was obscured and corrects the length to 13.0 metres. The engine then works from 13.0 by 8.5, a perimeter of 43 metres, and a gross wall area of 43 times 3.0, which is 129 square metres. Deduct 12 square metres of openings and 117 square metres remain. At a block face of 0.10125 square metres that is 1,156 blocks, and at a 5 percent breakage allowance it becomes 1,214. Every figure after the correction follows from the corrected dimension, and the correction is recorded against the reading that produced it, so the next photograph of a similar frontage is less likely to misread the same way.",
    advantages: [
      "Extraction and arithmetic are separate, so a poor reading is corrected in the form instead of being buried in a total.",
      "Readings and engine defaults are shown apart, which is the difference between a measurement and an assumption.",
      "Corrections are captured, so the tool improves on the buildings it actually sees.",
      "The estimate is saved with its measurements, which keeps a later recalculation tied to the same basis.",
    ],
    limits: [
      "Perspective, obstruction and the absence of a scale reference limit what any photograph can establish.",
      "A single view cannot reveal depth hidden behind a wall, and a site measurement remains the authority.",
      "The estimate inherits every assumption the engine makes about specification, wastage and market prices.",
      "The tool does not design anything, and it does not verify that the building in the photograph is the building being priced.",
    ],
    answers: [
      "It reads the details the estimate needs, which are the overall dimensions, the building type and the roof type. Each reading is put in front of you to confirm. Anything the photograph does not establish is left for you to enter, because a plausible guess presented as a reading is worse than an empty field.",
      "No. The photograph is read into the calculator form and the engines do the arithmetic from the confirmed figures. Keeping those apart is deliberate: a wrong reading can be corrected in the form and the same engine produces a different and defensible answer, which is not true of a figure an image model invented whole.",
      "It separates readings from defaults. The engine would assume certain values if nothing is entered, and the review step shows those assumptions beside the readings taken from the photograph. You correct what the photograph got wrong, and the estimate is built from the corrected set.",
      "Only as good as the photograph. Perspective, obstruction and the lack of a scale reference all limit the reading, and one view cannot show depth hidden behind a wall. The review step exists because a tape on site is the authority and a photograph is a starting point.",
      "It is sent to the estimation service so the building details can be extracted, and the estimate is built from the figures you confirmed instead of from the image. The saved project keeps the estimate and its measurements, and that is what a recalculation needs later.",
    ],
  },
};
