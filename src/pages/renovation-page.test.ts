/**
 * Guards for the renovation calculator page.
 *
 * These read the page source rather than render it, because the promises being
 * checked are about how inputs are wired, not about markup: a dimension field
 * must never show a zero the visitor did not type, and no figure may bypass the
 * engine.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src", "pages");
const page = readFileSync(join(root, "RenovationEstimator.tsx"), "utf8");

describe("renovation page", () => {
  it("asks the engine to measure rather than calculating anything itself", () => {
    expect(page).toContain("calculateRenovation(");
    // No arithmetic of its own: no surface formula, no litres, no bags.
    expect(page).not.toMatch(/lengthM\s*\*\s*widthM/);
    expect(page).not.toMatch(/coverageM2PerLitre|litres\s*=/i);
  });

  it("takes prices from the buyer, never from a default rate", () => {
    expect(page).toContain("priceLines(");
    expect(page).toContain("TAX_NOT_DETERMINED");
    expect(page).not.toMatch(/unit_price:\s*[1-9]/);
  });

  it("starts every dimension field empty in a custom room", () => {
    const blank = page.slice(
      page.indexOf("function blankRow"),
      page.indexOf("function countOf"),
    );
    for (const field of ["length", "width", "height", "doors", "sockets"]) {
      expect(blank).toMatch(new RegExp(`${field}: ""`));
      expect(blank).not.toMatch(new RegExp(`${field}: 0`));
    }
  });

  it("fills a template from real sizes in the unit on screen", () => {
    expect(page).toContain("toDisplay(preset.lengthM, unit)");
    expect(page).not.toMatch(/lengthM:\s*0\b/);
  });

  it("keeps the custom room list as a first class path", () => {
    expect(page).toMatch(/"custom"/);
    expect(page).toContain("Custom");
    expect(page).toContain("addRoom");
  });
});

describe("no page renders a zero it was not given", () => {
  it("finds no input forced to zero with ?? 0 or || 0", () => {
    const files = [
      "TileCalculator.tsx",
      "TileCostEstimator.tsx",
      "StructuralCalculator.tsx",
      "RenovationEstimator.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8");
      expect(source).not.toMatch(/value=\{[^}]*(\?\?|\|\|)\s*0\}/);
    }
  });
});
