import { describe, expect, it } from "vitest";
import { LEG_SECTIONS } from "./water-tower-staging-engine";

/**
 * Every leg section is a candidate the engine may select on load, and its
 * capacity follows directly from the area, second moment and modulus recorded
 * here. These check each row against the geometry it claims rather than against
 * a remembered table: a square hollow's second moment cannot exceed the sharp
 * cornered square-tube value, its area cannot exceed the plain ring difference,
 * and its modulus is its second moment over half the depth.
 */
describe("water tower leg sections", () => {
  const square = LEG_SECTIONS.filter((s) => s.t !== undefined);

  it("records no second moment above the sharp cornered bound", () => {
    for (const s of square) {
      const t = s.t as number;
      const bound = (s.b ** 4 - (s.b - 2 * t) ** 4) / 12;
      expect(
        s.i,
        `${s.label} I ${s.i} vs bound ${bound.toFixed(0)}`,
      ).toBeLessThanOrEqual(bound);
    }
  });

  it("records no area above the plain ring difference", () => {
    for (const s of square) {
      const t = s.t as number;
      const bound = 4 * t * (s.b - t);
      expect(s.a, `${s.label}`).toBeLessThanOrEqual(bound);
      // Within a tenth of that bound: corner radii take only a small bite.
      expect(s.a).toBeGreaterThan(bound * 0.95);
    }
  });

  it("keeps the modulus consistent with its second moment", () => {
    for (const s of LEG_SECTIONS) {
      const derived = s.i / (s.b / 2);
      expect(
        Math.abs(derived - s.z) / s.z,
        `${s.label}: ${(derived / 1e3).toFixed(2)}e3 vs ${(s.z / 1e3).toFixed(2)}e3`,
      ).toBeLessThan(0.12);
    }
  });

  it("carries the corrected 75 x 75 x 4 row", () => {
    const row = LEG_SECTIONS.find((s) => s.label === "SHS 75x75x4");
    // Sharp cornered bound: (75^4 - 67^4)/12 = 0.957e6 mm4, so Z <= 25.5e3.
    expect(row?.i).toBeCloseTo(0.902e6, -3);
    expect(row?.z).toBeCloseTo(24.05e3, -1);
    expect(row?.a).toBeCloseTo(1095, 0);
  });
});
