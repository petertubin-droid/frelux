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

export { SLAB_BUILD_SEQUENCE as SLAB_HOW_TO_STEPS } from "@/lib/estimation/build-sequence";
