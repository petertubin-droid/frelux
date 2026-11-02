import type { LongFormArticle } from "@/config/faq-longform";

export const SAFETY_LONGFORM: Record<string, LongFormArticle> = {
  "global-site-safety-estimator": {
    description: `Safety quantities on a construction site are usually bought against habit: a box of gloves for the gang, signs along the hoarding, an extinguisher by the gate. This estimator turns that habit into a schedule that states its own assumptions, so the crew size, perimeter length and site conditions you enter produce quantities that can be checked line by line before anything is ordered.

Two things that are often muddled are kept apart here. A framework reference such as OSHA construction, UK HSE/CDM or ISO 7010 describes the shape of a duty. The quantity on the page is a planning figure made from your inputs. Keeping those separate means a printed list never reads as a certificate, and a number that came from a spacing assumption you chose is never mistaken for a statutory minimum.`,
    functions: [
      "Counts perimeter safety signs from the boundary length and the sign spacing you enter.",
      "Plans basic PPE quantities from the active crew and the reserve allocation you select.",
      "Adds fall-control equipment only where work at height is marked on the job, using the worker count you enter.",
      "Adds excavation barriers and warning signs where excavation is selected, from the length you enter.",
      "Adds hot-work extinguisher quantities where a hot-work task is selected.",
      "Names the framework reference beside each line so the specification can be checked.",
      "Exports the schedule to CSV for the procurement file or the site safety folder.",
    ],
    worked:
      "A refurbishment of a small retail unit has a hoarding of one hundred and twenty metres, a crew of nine, one area of work at height and one hot-work task. At a sign spacing of ten metres the perimeter count is twelve signs; at fifteen metres it falls to eight. PPE for nine people with a reserve of one fifth gives eleven sets of gloves, eleven hard hats and eleven vests. Four workers marked as needing fall protection add four harnesses and four lanyards. One hot-work task adds one extinguisher. Change the crew to fourteen and the PPE rises to seventeen sets. Nothing in that arithmetic moves when the jurisdiction reference changes, because the reference changes the note beside the line, not the multiplication.",
    advantages: [
      "Every figure traces back to an input that is visible on the page.",
      "Framework references stay apart from quantities, so a planning list cannot be read as certification.",
      "Optional hazards appear only when you select them, which keeps the schedule to the work you actually have.",
      "The export goes straight into a procurement file without retyping.",
      "Assumptions such as sign spacing and reserve allocation are printed with the result.",
    ],
    limits: [
      "It does not assess hazards or decide which controls a task requires.",
      "It does not design fall arrest, scaffold, edge protection or excavation support.",
      "It does not verify training, competence, first-aid cover or emergency arrangements.",
      "It does not interpret local legislation, state-plan rules or CDM duties for a project.",
      "It does not replace a competent safety professional's review before procurement.",
    ],
    answers: [
      `No. The page multiplies your inputs by ratios you can see and prints the framework references that describe the relevant duty. A risk assessment, a method statement, a training record and an emergency plan are separate documents produced by people who know the site, and none of them can be generated from a perimeter length. Treat the export as a procurement schedule that starts a conversation with your safety adviser.`,
      `Because the trigger height depends on jurisdiction, task and exposure, and treating one figure as universal produces confident nonsense. The estimator asks you to mark where work at height happens and how many workers need protection, then counts equipment for that number. Where local rules set a threshold, your safety professional applies it when deciding how many workers to enter. The tool stays out of that judgement on purpose.`,
      `Boundary length divided by your spacing assumption, rounded up. A one hundred and twenty metre boundary at ten metre spacing gives twelve signs, and at fifteen metres it gives eight. The count is a purchasing figure. Sight lines, gates, corners, pedestrian routes and local sign rules decide where those signs actually stand, and a competent person should walk the boundary before any are fixed.`,
      `No universal ratio is claimed, and none is invented. You enter the planning allowance you work to and the quantity follows. First-aid cover depends on workforce size, shift patterns, distance from medical care, the hazards present and the training of nominated responders, all of which sit outside anything a calculator can see. The line exists so the item is not forgotten when the order is placed.`,
      `It defines the registered symbols used on safety signs, which helps you specify the right family of sign for each message. Adoption and enforcement come from local law and client requirements, not from the standard by itself. The estimator names the framework beside the sign line so the specification can be checked, and it does not reproduce or approve artwork, since sign graphics have to match the edition of the standard in force where the site sits.`,
    ],
  },
};
