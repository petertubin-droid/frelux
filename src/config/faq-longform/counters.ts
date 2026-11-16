import type { LongFormArticle } from "@/config/faq-longform";

/**
 * Long form copy for the material counter, the surface assessment and the
 * estimate refresh.
 *
 * All three are judgement surfaces instead of arithmetic engines, so the copy
 * spends its words on what each one refuses to do. The counter declines to
 * answer below its confidence floor, the assessment declares that it reads no
 * photograph, and the refresh keeps a missing price at its snapshot value
 * instead of filling the gap with an extrapolation.
 */
export const COUNTERS_LONGFORM: Record<string, LongFormArticle> = {
  "count-vision": {
    description:
      "The count of a stack decides an order, and the count is usually made by eye at the end of a working day. A miscount of ten percent on a block order is a course of wall that stops early, and the person who finds out is the bricklayer, not the person who counted. A photograph is a better evidence base than an eyeball, provided the answer that comes back is honest about how sure it is.\n\nCounter-Vision reads a photograph of stacked material and returns three things: a count, a verdict and a confidence, with a reason attached. The verdict is counted, unclear, or nothing to count. A count below the confidence floor, a count above the reliable range, or an answer in a shape the page cannot read all come back as unclear, and the reason is kept so the decision to retake the photograph or count by hand is an informed one.",
    functions: [
      "Reads a photograph of stacked material and returns a count with a confidence and a reason.",
      "Assigns one of three verdicts: counted, unclear, or nothing to count.",
      "Applies the configured confidence floor, which defaults to 0.6, and refuses anything below it.",
      "Holds an 8 megabyte image ceiling and a count ceiling of 5,000 units, and asks for a smaller section when the stack exceeds the range.",
      "Re-validates the returned answer on the page, refusing unreadable shapes, non-integer counts, zero, negatives and out of range values.",
      "Keeps the answer and its diagnostics with the result, so the count can be traced back to the photograph.",
    ],
    worked:
      "A store holds three stacks of blocks and the order has to be placed before the next delivery. The first photograph returns 1,200 blocks at a confidence of 0.82, so it is reported as counted. The second returns 850 at 0.64, which is above the 0.6 floor and also reported as counted, giving 2,050 between them. The third stack is photographed against the light and the service returns 0.44 confidence with a count of 410. That number is discarded: the verdict is unclear, the confidence is shown, and the reason is kept, because an undercount of a partly shadowed stack presented as an answer is worse than no answer. The site counts that stack by hand and the order goes out at 2,050 plus the physical count, not at 2,460 of which 410 was a guess.",
    advantages: [
      "The verdict separates a count from a guess, which is the distinction that matters at the point of ordering.",
      "The confidence floor is a configured rule, so the standard can be raised for expensive material without changing the page.",
      "The reason is preserved on every failure, so the choice between retaking a photograph and counting by hand is informed.",
      "The page checks the answer again on its own side, which keeps a malformed response from being displayed as a quantity.",
    ],
    limits: [
      "It counts what is visible. A partly obscured stack or material of mixed size undercounts, and the verdict may still read counted.",
      "It does not identify the material, grade it or price it. The count is an input to a takeoff, not a quote.",
      "A photograph of a store is not a measurement of what has been delivered or used, and a physical count remains the authority.",
      "The confidence is a statement by the counting service, not a statistical interval around a known truth.",
    ],
    answers: [
      "A count, a verdict, a confidence and a reason. The verdict is counted, unclear or nothing to count. A count that cannot be supported comes back as unclear with the reason preserved, so a failed count is never rounded up into an order.",
      "Because a number below the floor is not evidence of anything. The floor is a configured rule and the default is 0.6. An undercount reported as an answer is how a site buys short and discovers it on the last course of the wall, which is precisely the outcome the floor exists to prevent.",
      "An 8 megabyte image ceiling, a count ceiling of 5,000 units and the confidence floor. A report above the count ceiling is treated as unreliable instead of accepted, and the advice is to photograph a smaller section, since a stack too large to resolve in one frame cannot be counted from it.",
      "Yes, twice. The count is validated where it is produced, and the page runs an independent check on the answer, refusing any shape it cannot read, any count that is not a positive whole number inside the range, and any confidence below the floor. A page that trusts a response blindly has no answer, only a number.",
      "No. It counts what is in the photograph and states how sure it is of that count. Pricing belongs to the calculators that hold rates for the market, and carrying the count into a priced takeoff is a step you take deliberately. A count on its own is a quantity, and a quantity becomes a cost only when it meets a rate.",
    ],
  },
  "surface-assessment": {
    description:
      "The most common reason a new coat of paint fails is the surface it went onto, and the surface is usually assessed by whoever is holding the brush. That assessment is informal, unrecorded and different on every job. Making the preparation explicit starts with naming the condition in a way that returns the same answer twice.\n\nThis page does exactly that, and no more. You select one of six conditions (new wall, previously painted, rough, dirty, damp or cracked), optionally name the room and add notes, and the page returns the preparation steps that condition requires, each with a priority of high, medium or low. The list is stored with the assessment and the project, so the person pricing the preparation and the person checking it are working from the same document. Nothing about the wall is measured, read from a photograph, or judged by a model on this page.",
    functions: [
      "Returns preparation steps for the selected surface condition from a fixed rule table.",
      "Marks each step with a priority of high, medium or low, so the order of work is visible.",
      "Records the condition, the room name and any notes with the project.",
      "Stores the preparation list with the assessment, so a painter or screeder can price from it.",
      "States on the page that the guidance is not a diagnosis of the wall.",
    ],
    worked:
      "A living room wall is to be repainted and the owner selects previously painted, naming the room and noting two patches of flaking. The list that comes back carries the steps that condition needs, each with its priority. The high priority items are the ones that decide whether the new coat holds: the flaking areas have to be taken back to sound material, the edges feathered, and the surface cleaned of the grease that paint will not adhere to. The medium and low items are the ones that improve the finish, such as filling and sanding to a flat surface. The assessment is saved with the project, so when the painter prices the job the preparation is a line instead of an assumption, and when the owner inspects it the same list is the standard. If the wall turns out to be damp instead of merely flaking, the honest move is a new assessment for damp, which returns a different list and a different priority order.",
    advantages: [
      "The same condition always returns the same list, which turns preparation into a specification instead of an opinion.",
      "Priorities separate the steps that decide whether the finish holds from the ones that only improve the look.",
      "Saving the assessment with a project keeps the preparation tied to the surface it was written for.",
      "The page says what it is not, which keeps a rule table from being read as a surveyor's report.",
    ],
    limits: [
      "It reads no photograph and runs no model. The condition is the one selected and the list comes from a rule table.",
      "It is not a diagnosis. Damp needs a source investigation and a moisture reading, and structural cracks need an engineer.",
      "The list covers preparation only. Products, coverage and cost come from the calculators that hold your rates.",
      "The stored assessment reflects the condition chosen at the time, and a later change of condition needs a new one.",
    ],
    answers: [
      "A preparation list for the condition you select. You pick one of six conditions, optionally name the room and add notes, and the page returns the steps that condition needs, each with a priority of high, medium or low. The list is saved with the assessment, so the person pricing the preparation and the person inspecting the finish work from the same document.",
      "No. The assessment is chosen from a fixed set of conditions and the steps come from a rule table keyed by that choice, so the same condition always returns the same list. There is no image analysis and no model, and reading the output as a machine judgement of your wall would be a mistake.",
      "Because preparation decides whether the coating stays. Damp or cracked masonry needs work that new plaster does not, and a finish applied over the wrong condition fails on the surface it was bought to protect. Naming the condition honestly is the entire input to the tool.",
      "Yes, with the condition, the room and any notes, and the preparation list is stored with it. That record is what a painter or a screeder prices from, and later it is the evidence of what the surface was like before the finish went on.",
      "No. It is guidance for a condition you identified. Damp needs its source found and its moisture measured, and a crack that is more than surface deep needs a structural opinion, and neither is established by selecting a condition on a page. Treat the list as the work to price and the condition as something you still have to confirm with your own eyes.",
    ],
  },
  "estimate-refresh": {
    description:
      "An estimate is a true statement about a particular day, and it becomes a claim about the present without anyone touching it. Material prices move, the price book moves with them, and the saved estimate stays exactly where it was. The gap between the two is the thing a refresh exists to show.\n\nThe refresh reprices each line of a saved snapshot at the price that is active today, through the reference the line already carries. It reports the snapshot price, the current price, the money difference and the percentage for every line, and it prints the effective date of each price it used. Where no price is active today, the line keeps its snapshot price and is counted as missing, because filling that gap with an extrapolation would put a number into the total that nobody supplied.",
    functions: [
      "Reprices each snapshot line at the currently active price for its reference.",
      "Reports snapshot price, current price, money difference and percentage for every line, and the same delta in total.",
      "Keeps the snapshot price and counts the line as missing where no price is active today.",
      "Reports lines carrying no price reference as impossible to refresh, with the reason stated.",
      "Flags a currency mismatch between a line and the price it was matched to.",
      "Prints the effective date of each price used, so an unexpectedly old price is visible.",
    ],
    worked:
      "A saved estimate carries 120 bags of cement at 8,200 and 20 cubic metres of sand at 12,000, so the snapshot total is 1,224,000. Today cement is active at 8,850, which reprices the cement line at 1,062,000, a rise of 78,000. Sand has no active price today, so that line stays at 240,000 and is counted as missing with a warning naming the item and the price that was kept. The refreshed total is 1,302,000, a delta of 78,000, and because the earlier total is greater than zero the percentage is 6.37. The cement line alone reads 7.93 percent, which shows the rise is concentrated in one material and not spread across the estimate. Had the earlier total been zero, the money delta would still be reported and the percentage would be null, since a percentage of nothing is not a rise.",
    advantages: [
      "Missing prices are named instead of extrapolated, so the total never gains a number nobody supplied.",
      "The line by line movement shows whether a rise is concentrated in one material or spread across the estimate.",
      "Currency and effective date checks catch the two ways a current price can still be the wrong price.",
      "The delta is reported in money and in percentage, which answers both how much and how far.",
    ],
    limits: [
      "It reprices quantities it already holds. A changed scope needs the calculator that produced the estimate.",
      "A line with no price reference cannot be refreshed and has to be repriced by hand or rebuilt.",
      "The refresh is only as current as the price book behind it, and an unmaintained book refreshes to the wrong number with confidence.",
      "A missing price keeps the old figure, so a total including missing lines is a floor and not a forecast.",
    ],
    answers: [
      "It reprices each line of the saved snapshot at the price active today, using the reference the line already carries. Every line is reported with its snapshot price, its current price, the money difference and the percentage, and the totals carry the same delta so the size of the movement is visible.",
      "It keeps its snapshot price and is counted as missing. The tool never extrapolates a missing price, and the warning names the item, the reference and the price that was kept, so a stale line is visible instead of being smoothed into the total.",
      "It cannot be refreshed. The line stays at its stored price and is reported with the reason, which is a statement about the snapshot instead of about the market. The line has to be repriced by hand or rebuilt from the calculator that produced it.",
      "Because there is nothing to take a percentage of. Where the earlier line total is zero, the money difference is still reported and the percentage is null, since dividing by zero would invent a rise that did not happen. The money figure is the one to read in that case, and the blank percentage is a statement rather than a gap.",
      "It flags a currency mismatch between a line and the price it was matched to, and it prints the effective date of every price it used. A price that is current but in the wrong currency, or one whose effective date is unexpectedly old, is not a refresh you can rely on.",
    ],
  },
};
