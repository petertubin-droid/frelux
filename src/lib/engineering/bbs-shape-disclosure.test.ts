import { describe, expect, it } from "vitest";

import { bsShapeLength } from "./bbs-schedule";

/**
 * Audit 2026-11-08 (S33/S67): the two shapes I could not verify against BS 8666
 * from inside the repo now say what they assume, so a detailer reading the
 * schedule is not left to infer it. These tests pin the arithmetic and the
 * disclosure together.
 */
describe("BBS shape disclosure", () => {
  it("shape 33 keeps its published 1.7B coefficient and says B is not a chord", () => {
    const r = bsShapeLength("33", { A: 1000, B: 400, C: 1000, d: 16 });
    expect(r.L).toBeCloseTo(2 * 1000 + 1.7 * 400 + 2 * 1000 - 4 * 16, 6);
    expect(r.formula).toContain("1.414B");
    expect(r.formula).toContain("published coefficient");
  });

  it("shape 67 states that no bend allowance is deducted", () => {
    const r = bsShapeLength("67", { A: 2400, d: 12 });
    expect(r.L).toBe(2400);
    expect(r.formula).toContain("No bend allowance is deducted");
  });
});
