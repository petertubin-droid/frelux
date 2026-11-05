/**
 * Long copy for the window blind article.
 *
 * The page answers one window at a time. This carries the job: why a rate per
 * square metre and a minimum per window live in the same shop, what the waste
 * allowance is for, which measurement the order depends on, and what the
 * calculator deliberately refuses to guess.
 *
 * No prices, no rates and no tax appear in this prose. Every figure a reader
 * needs comes from the market they select, which keeps the article true in
 * Lagos, Nairobi, Manchester and Houston.
 */

import type { LongFormArticle } from "@/config/faq-longform";

export const BLINDS_LONGFORM: Record<string, LongFormArticle> = {
  "window-blinds": {
    description:
      "A blind looks like a single purchase and behaves like four at once: fabric, hardware, fitting and the minimum charge that shops add to small openings. Most quotes fold those into one figure per window, which is why two suppliers can quote the same room and differ by half.\n\nThe calculator separates them. You measure the opening, choose the type and grade, and it returns the price per window, the price for the schedule and the blended rate per square metre, with each step and each assumption printed beside the number.\n\nThe opening is the only thing you have to get right. Everything after it is arithmetic.",
    functions: [
      "Converts the measured width and drop from feet or metres into square metres, because a rate per metre means nothing until the opening is a decimal figure.",
      "Adds the waste allowance for that type: a folded roman blind is cut with more spare than a rigid venetian slat, and the difference is a property of the type, not a guess.",
      "Prices the window at the market rate, then lifts it to the minimum charge per window when the opening is small enough that the rate alone would undercut the shop.",
      "Multiplies by the count on each row, adds the chosen grade, and adds motors, cassette headrails or removal only when you have supplied those figures.",
      "Totals the schedule, adds fitting per window, and reports a blended rate so you can see what the job averages across mixed sizes.",
    ],
    worked:
      "Take a four by four foot opening in a day and night blind. Four feet is 1.22 metres, so the measured area is 1.49 square metres. Ten percent is added for the drop and the pattern, which charges 1.64 square metres. At the standard rate the fabric comes to a figure the market sets, and because that figure lands below the minimum charge that shops apply to a window this size, the minimum takes over and becomes the price per window. The same opening in a rigid venetian slat carries a smaller waste allowance, so less area is charged, but it reaches its own minimum sooner. Scale the count to six identical windows and the fitting line grows with it, while the minimum per window stays where it was. That is the whole shape of a blind quote: rate, waste, minimum, count, fitting.",
    advantages: [
      "The window is priced the way the customer approves it, and the metre rate is reported alongside it, so the shop's own arithmetic can be checked instead of argued about.",
      "The minimum charge is shown as a decision, not hidden inside a total, so a small window that costs nearly as much as a large one is explained before the client asks.",
      "Grade is a multiplier on the rate and never on the minimum, which matches how suppliers actually quote better fabric.",
      "A mixed schedule reports one blended rate, which is the number that decides whether the job is worth taking.",
    ],
    limits: [
      "The markets with a verified band are named. Anywhere else the calculator asks for the rate you were quoted instead of converting another country's prices.",
      "Motors, cassette headrails and taking down old blinds vary too much by supplier to carry a figure here, so they are added only when you type the amount.",
      "Sizes are the finished opening. A recess fitting, a bay or a sloping head needs a site measurement, which no calculator can replace.",
      "Tax is not determined. The total is stated before tax so you can apply the rate that belongs to your jurisdiction.",
    ],
    answers: [
      "Because shops quote both, and the calculator applies both. The rate per square metre is the headline figure on the wall. The minimum charge per window is what stops a small opening being sold below cost, so it overrides the rate whenever the measured area prices lower. Fabric is then cut with an allowance, because the drop has to clear the hardware and a pattern has to line up. A four by four opening therefore rarely costs what four by four multiplied by the metre rate suggests. The page shows the rate, the charged area, the minimum and whether it applied, so the difference between the two numbers is visible, not mysterious.",
      "Only the minimum charge explains most of it. A quarter of the fabric still needs the same headrail, the same brackets, the same cutting, the same van, the same fitter and the same return visit, and those costs do not shrink with the window. Once the minimum takes over, two windows of different sizes can cost the same. That is also why a whole house priced per window looks cheaper than the same house priced per square metre: the minimum is doing the work on every small opening. The calculator keeps the minimum separate from the rate for exactly that reason, so you can see where a supplier is charging for material and where they are charging for the visit.",
      "The finished opening, not the glass. Measure the width across the reveal and the drop from the head to the sill or the floor, in the same unit for both, and measure more than one window if they look alike, because they rarely are. Blinds need a small clearance inside a reveal, and an outside fit adds to both dimensions, so decide which you are doing before you measure. Then decide the control side, because a chain on the wrong side is a return visit. The calculator takes width, drop, count and type per opening and does the rest, and it converts feet to metres before pricing, so a four by four is 1.49 square metres whichever unit you typed.",
      "The type first, then the grade. A rigid slat, a folded fabric and a woven natural blind are different products with different waste allowances and different minimums, so the type moves the price further than a few centimetres of window. Grade is the second lever: premium prints and heavier fabric sell at a large multiple of standard stock, and the calculator applies that as a multiplier on the rate. Motorisation is the third, and it is not a percentage, which is why the calculator asks for the motor figure instead of inventing one. Fitting is the fourth and the most predictable, because it is charged per window and does not care what the fabric cost.",
      "Yes, and the rules do not change. The measurement, the waste allowance, the minimum charge and the fitting are universal; what changes is the rate, so the calculator opens in any market and asks for the local rate where it has no verified band, then prices the schedule with the same arithmetic. What it leaves out is a site survey, a colour and fabric decision, a motor figure, and tax. It also leaves out the awkward openings: a bay, a sloping head, a door with a handle to clear. Those need a person with a tape and a sample book, and the calculator is honest about stopping where measurement stops.",
    ],
  },
};
