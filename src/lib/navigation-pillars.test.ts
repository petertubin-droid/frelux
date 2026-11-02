import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("5 Core Navigation Pillars (Section 1.B.1 / 2.D.2)", () => {
  const root = process.cwd();
  const appSrc = readFileSync(join(root, "src/App.tsx"), "utf8");

  const requiredRoutes = [
    // Pillar 1: Tools & Estimators (/tools/)
    "/tools",
    "/tools/:category",
    "/tools/finishes/paint",
    "/tools/finishes/tiles",
    "/tools/finishes/screeding",
    "/tools/finishes/pop",
    "/tools/finishes/flooring",
    "/tools/finishes/waterproofing",
    "/tools/structure/build-to-roof",
    "/tools/structure/concrete",
    "/tools/structure/foundation",
    "/tools/structure/rebar",
    "/tools/services/electrical",
    "/tools/services/plumbing",
    "/tools/services/solar",
    "/tools/services/comfort",
    "/tools/components/doors-windows",
    "/tools/project/boq",
    "/tools/project/labour",
    "/tools/project/margin",
    "/tools/project/timeline",
    "/tools/project/cash-flow",
    "/tools/ai/photo-estimator",
    "/tools/ai/color-assistant",
    "/tools/ai/defects",

    // Pillar 2: Prices & Market Intelligence (/prices/)
    "/prices",
    "/prices/trends",
    "/prices/regional-indices",

    // Pillar 3: Project Workspace (/projects/)
    "/projects",
    "/projects/templates",
    "/projects/:id",

    // Pillar 4: Network & Commerce (/network/)
    "/network",
    "/network/pros",
    "/network/marketplace",

    // Pillar 5: Knowledge & Enterprise (/learn/)
    "/learn",
    "/learn/glossary",
    "/learn/library",
    "/learn/category/:categorySlug",
    "/learn/:articleSlug",
  ];

  for (const route of requiredRoutes) {
    it(`declares route ${route}`, () => {
      const pattern = new RegExp(`path=["']${route.replace(/:[a-zA-Z]+/g, ":[a-zA-Z]+")}["']`);
      expect(pattern.test(appSrc)).toBe(true);
    });
  }

  it("retains backwards-compatible /calculators redirect", () => {
    expect(appSrc).toContain('path="/calculators"');
  });
});
