import { describe, it, expect } from "vitest";
import { methodologyText, type MethodologyKey } from "./calculatorMethodology";

const KEYS: MethodologyKey[] = [
  "blueprint-takeoff",
  "standalone-takeoff",
  "ai-photo-estimate",
  "borehole",
  "build-to-roof",
  "configurable-finish",
  "doors-windows",
  "electrical",
  "fence-block",
  "flooring",
  "foundation",
  "foundation-estimator",
  "generator",
  "site-safety",
  "labour",
  "painting",
  "plumbing",
  "pop-ceiling",
  "reinforcement",
  "roof-framing",
  "screeding",
  "solar-pv",
  "structural",
  "tall-building",
  "tile-cost",
  "wall-finish",
  "water-tower",
  "waterproofing",
  "window-blinds",
];

describe("calculator methodology notes", () => {
  it("gives every calculator a real explanation", () => {
    for (const key of KEYS) {
      const text = methodologyText(key);
      expect(text.length, key).toBeGreaterThan(160);
      // House style: no em or en dashes anywhere in visitor copy.
      expect(text, key).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it("explains the order the engine works in, not just the inputs", () => {
    expect(methodologyText("painting")).toMatch(/2 coats|two coats/i);
    expect(methodologyText("foundation")).toMatch(/bearing pressure/i);
    expect(methodologyText("build-to-roof")).toMatch(/mix ratios/i);
  });

  it("returns nothing for an unknown key instead of an empty panel", () => {
    expect(methodologyText("not-a-calculator" as MethodologyKey)).toBe("");
  });
});
