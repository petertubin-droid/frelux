import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CONSTRUCTION_TOOLS } from "@/config/construction-tools";

/**
 * The AI group promises a model. These five reach one, each traced through its
 * page into the edge function it invokes:
 *
 *   photo-estimator   pages/ImageEstimator.tsx -> ai-building-estimation
 *   smart-calculator  components/rewarded/AdvancedCalculator.tsx -> ai-studio
 *   count-vision      lib/estimation/queries.ts countPhoto -> count-vision
 *   color-assistant   lib/ai.ts requestColorConsultation -> ai-color-consult
 *   color-preview     lib/ai-project.ts aiColorPreview -> ai-color-preview
 */
const MODEL_BACKED = [
  "photo-estimator",
  "smart-calculator",
  "count-vision",
  "color-assistant",
  "color-preview",
];

/**
 * These parse text or read a rule table locally. Filing them under AI
 * Assistants told a visitor a model was involved when none ran, so they sit
 * with the work they do.
 */
const LOCAL_ONLY: Record<string, string> = {
  conversational: "project",
  "surface-assessment": "finishes",
  "estimate-refresh": "project",
};

describe("AI tool category", () => {
  it("holds exactly the surfaces that call a model", () => {
    const catalogued = CONSTRUCTION_TOOLS.filter(
      (tool) => tool.category === "ai",
    )
      .map((tool) => tool.slug)
      .sort();
    expect(catalogued).toEqual([...MODEL_BACKED].sort());
  });

  it("keeps the local-only surfaces out of it", () => {
    for (const [slug, category] of Object.entries(LOCAL_ONLY)) {
      const tool = CONSTRUCTION_TOOLS.find((entry) => entry.slug === slug);
      expect(tool, slug).toBeDefined();
      expect(tool?.category, slug).toBe(category);
    }
  });

  it("does not let a local-only page start calling a model unnoticed", () => {
    // If one of these pages gains an edge call the categorisation above is
    // stale, and this fails rather than the group quietly misdescribing them.
    const paths = [
      "src/pages/ConversationalEstimator.tsx",
      "src/pages/SurfaceAssessment.tsx",
      "src/pages/EstimateRefresh.tsx",
    ];
    const offenders = paths.filter((path) => {
      const source = readFileSync(resolve(process.cwd(), path), "utf8");
      return /functions\.invoke|supabase\.functions/.test(source);
    });
    expect(offenders).toEqual([]);
  });

  it("recognises an edge call when one is present", () => {
    // Control: the detector above must be able to see a call, or it would pass
    // on any file. The photo estimator reaches ai-building-estimation.
    const source = readFileSync(
      resolve(process.cwd(), "src/pages/ImageEstimator.tsx"),
      "utf8",
    );
    expect(/functions\.invoke|supabase\.functions/.test(source)).toBe(true);
  });
});
