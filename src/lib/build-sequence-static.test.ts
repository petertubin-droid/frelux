import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The diagrams are React SVG, so the method only reaches a crawler that does not
 * run JavaScript through the generated static copy. These assertions keep that
 * copy honest: every diagram page must carry an ordered list of the same steps.
 */
const generated = readFileSync(
  join(process.cwd(), "scripts/build-sequence-content.generated.mjs"),
  "utf-8",
);

const DIAGRAM_ROUTES = [
  "/concrete-takeoff-calculator",
  "/roof-framing-calculator",
  "/masonry-calculator",
  "/paving-calculator",
  "/reinforcement",
];

describe("static build sequence copy", () => {
  it("covers every page that shows a diagram", () => {
    for (const route of DIAGRAM_ROUTES) {
      expect(generated, `${route} missing from generated copy`).toContain(
        `"${route}"`,
      );
    }
  });

  it("lists the steps as an ordered list, not a single sentence", () => {
    for (const route of DIAGRAM_ROUTES) {
      const line = generated
        .split("\n")
        .find((l) => l.trimStart().startsWith(`"${route}":`));
      expect(line, route).toBeTruthy();
      const steps = (line!.match(/<li>/g) ?? []).length;
      expect(
        steps,
        `${route} lists only ${steps} steps`,
      ).toBeGreaterThanOrEqual(5);
      expect(line).toContain("Check first:");
    }
  });

  it("states that the page has an animated sequence", () => {
    expect(generated).toContain("step by step animated build sequence");
  });
});
