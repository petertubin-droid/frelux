// Verification that the flooring consumables are sized on the laid area.
//
// The covering is bought for the floor plus a cutting allowance (10 per cent by
// default), because offcuts cannot be laid. Underlay is cut and lapped over
// those same pieces and adhesive bonds them, so both have to be sized on the
// same area. Sized on the net floor they fell short: a 100 m2 floor at 10 per
// cent waste needs 110 m2 of underlay and 110 m2 of adhesive cover, which at a
// 15 m2 roll and a 5 m2 bag is 8 rolls and 22 bags, not 7 and 20.

import { describe, expect, it } from "vitest";
import {
  DEFAULT_FLOORING_RULES,
  calculateFlooring,
  type FlooringRules,
} from "@/lib/estimation/flooring-engine";

const rules: FlooringRules = {
  ...DEFAULT_FLOORING_RULES,
  adhesive_coverage_m2_per_bag: 5,
  underlay_roll_coverage_m2: 15,
};

const run = (areaM2: number, wastePct: number) =>
  calculateFlooring(
    {
      flooring_type: "laminate",
      floor_area_m2: areaM2,
      skirting_run_m: null,
      include_underlay: true,
      include_adhesive: true,
      labour: { mode: "none" },
    },
    { ...rules, floor_waste_pct: wastePct },
    {},
  );

const qty = (result: ReturnType<typeof run>, key: string) =>
  result.lines.find((line) => line.key === key)?.quantity ?? null;

describe("flooring consumables follow the laid area", () => {
  it("sizes underlay and adhesive on the area with cutting waste", () => {
    const result = run(100, 10);
    expect(result.ok).toBe(true);
    // 110 m2 ÷ 15 m2/roll = 7.33, so 8 rolls; 110 ÷ 5 = 22 bags.
    expect(qty(result, "underlay")).toBe(8);
    expect(qty(result, "adhesive")).toBe(22);
  });

  it("would have been a roll and two bags short on the net area", () => {
    // The figures before the fix: 100 ÷ 15 = 6.67 → 7, and 100 ÷ 5 = 20.
    expect(Math.ceil(100 / 15)).toBe(7);
    expect(Math.ceil(100 / 5)).toBe(20);
  });

  it("prints the waste it used in the working", () => {
    const result = run(100, 10);
    const step = result.steps.find((s) => s.label === "Underlay rolls");
    expect(step?.detail).toContain("110");
    expect(step?.detail).toContain("10%");
    const line = result.lines.find((l) => l.key === "underlay");
    expect(line?.detail).toContain("110");
  });

  it("leaves zero waste as the same number", () => {
    const result = run(100, 0);
    expect(qty(result, "underlay")).toBe(7);
    expect(qty(result, "adhesive")).toBe(20);
  });
});
