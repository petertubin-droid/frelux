/**
 * Search-facing description of the animated build diagrams.
 *
 * The diagrams are React SVG, so the text a crawler can read has to exist
 * independently of the drawing. These helpers give a page a HowTo schema that
 * lists exactly the steps the diagram animates, which is also what a rich
 * result can show: an ordered method, not a bare calculator.
 */
import type { BuildStep } from "@/components/tools/AnimatedBuildSequence";

export interface BuildSequenceHowToInput {
  name: string;
  description: string;
  steps: BuildStep[];
  /** Root-relative page path, used to anchor each step. */
  path: string;
  totalTime?: string;
  supply?: string[];
  tool?: string[];
}

export function buildSequenceHowTo({
  name,
  description,
  steps,
  path,
  totalTime,
  supply,
  tool,
}: BuildSequenceHowToInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    ...(totalTime ? { totalTime } : {}),
    ...(supply?.length
      ? { supply: supply.map((s) => ({ "@type": "HowToSupply", name: s })) }
      : {}),
    ...(tool?.length
      ? { tool: tool.map((t) => ({ "@type": "HowToTool", name: t })) }
      : {}),
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: [
        step.detail,
        step.check ? `Check before moving on: ${step.check}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      url: `${path}#build-step-${index + 1}`,
    })),
  };
}

/** Sentence pages carry in their own copy when they show a diagram. */
export const DIAGRAM_COPY =
  "Includes a step by step animated build sequence showing the order the work happens on site.";

/** Slab build-up, used for the concrete takeoff's HowTo schema. */
export const SLAB_HOW_TO_STEPS: BuildStep[] = [
  {
    id: "set-out",
    title: "Set out and level the area",
    detail:
      "Mark the slab outline and transfer the finished floor level from a single datum before any excavation starts.",
    check: "Diagonals equal and the level taken from one datum.",
  },
  {
    id: "subgrade",
    title: "Excavate and compact the subgrade",
    detail:
      "Strip topsoil, cut to formation level, then compact in layers until the surface is firm and uniform.",
    check: "No soft spots and no ponding after rain.",
  },
  {
    id: "blinding",
    title: "Blind the surface",
    detail:
      "Lay and compact a thin blinding layer so the slab sits on a clean, level bed and any membrane is not punctured.",
    check: "Level within 10 mm and free of loose stones.",
  },
  {
    id: "rebar",
    title: "Place the mesh or bars",
    detail:
      "Set the reinforcement on chairs so it finishes inside the slab, with laps tied and cover maintained.",
    check: "Cover maintained and chairs not walked out of place.",
  },
  {
    id: "concrete",
    title: "Place and finish the concrete",
    detail:
      "Place the mixed concrete in one continuous run, screed to level, then trowel the finish the floor needs.",
    check: "No cold joints and curing started before it dries.",
  },
  {
    id: "cure",
    title: "Cure before loading",
    detail:
      "Keep the slab damp or covered for at least seven days and keep site traffic off until it has taken load.",
    check: "No cracking at re-entrant corners or over service trenches.",
  },
];
