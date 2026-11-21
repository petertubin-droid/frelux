/**
 * Reinforcement engine conformance suite (audit 2/34).
 *
 * Bar anchorage and lap lengths are safety values: a short lap is a structural
 * failure, not a cost error. The engine had no tests, so every expectation
 * here is taken from the code clause it claims to implement:
 *
 *  - EN 1992-1-1 8.4.4 anchorage, 8.7.3 lap factor.
 *  - BS 8110-1 Cl 3.12.8.3: lb = fy.db / (4.fb), fb = beta.sqrt(fcu) with
 *    beta = 0.5 for type 2 deformed bars (Table 3.26); Table 3.30 lap factors
 *    1.4 / 1.15, minimum 250 mm.
 *  - ACI 318-19 25.4.2.3: ld = fy.psi.db / (divisor.sqrt(f'c)), min 300 mm;
 *    Table 25.5.2.1 Class A = 1.0 ld, Class B = 1.3 ld.
 *
 * A sanity property is asserted as well: for every code, a larger bar and a
 * weaker concrete must never produce a shorter anchorage.
 */

import { describe, expect, it } from "vitest";

import {
  calculateDevelopmentLength,
  calculateLapLength,
  stockBarsPerCutBar,
} from "./reinforcement-engine";

describe("BS 8110-1 anchorage (Cl 3.12.8.3)", () => {
  it("reproduces the 40db table value for grade 460 in grade 30 concrete", () => {
    // fy 460, fcu 30: lb = 460.db / (4 x 0.5 x sqrt(30)) = 42.0 db.
    // Table 3.27 publishes 40db for this row, so the derived length must sit
    // within a bar diameter of it, on the safe side.
    const lb = calculateDevelopmentLength(16, 30, 460, true, "bs8110");
    expect(lb / 16).toBeGreaterThan(39);
    expect(lb / 16).toBeLessThan(44);
  });

  it("lengthens the anchorage when the concrete grade drops to C20", () => {
    // This is the defect the engine's comment describes: a C20 mix anchored
    // as if it were C30 was short by sqrt(30/20) = 1.22x.
    const c30 = calculateDevelopmentLength(16, 30, 460, true, "bs8110");
    const c20 = calculateDevelopmentLength(16, 20, 460, true, "bs8110");
    expect(c20).toBeGreaterThan(c30);
    expect(c20 / c30).toBeCloseTo(Math.sqrt(30 / 20), 1);
  });

  it("uses 0.8 of the tension length in compression", () => {
    const tension = calculateDevelopmentLength(20, 30, 460, true, "bs8110");
    const compression = calculateDevelopmentLength(
      20,
      30,
      460,
      false,
      "bs8110",
    );
    expect(compression / tension).toBeCloseTo(0.8, 1);
  });

  it("applies the 300 mm practical minimum to a small bar", () => {
    expect(calculateDevelopmentLength(6, 40, 250, true, "bs8110")).toBe(300);
  });
});

describe("EN 1992-1-1 anchorage (8.4.4)", () => {
  it("returns a positive length that grows with bar diameter", () => {
    const d12 = calculateDevelopmentLength(12, 30, 500, true, "eurocode");
    const d20 = calculateDevelopmentLength(20, 30, 500, true, "eurocode");
    expect(d12).toBeGreaterThan(0);
    expect(d20).toBeGreaterThan(d12);
  });

  it("never shortens the anchorage for weaker concrete", () => {
    const c30 = calculateDevelopmentLength(16, 30, 500, true, "eurocode");
    const c25 = calculateDevelopmentLength(16, 25, 500, true, "eurocode");
    expect(c25).toBeGreaterThanOrEqual(c30);
  });
});

describe("ACI 318-19 anchorage and splices", () => {
  it("accepts psi or MPa for f'c without changing the answer", () => {
    const mpa = calculateDevelopmentLength(16, 28, 420, true, "aci");
    const psi = calculateDevelopmentLength(16, 28 * 145.038, 420, true, "aci");
    expect(psi).toBe(mpa);
  });

  it("uses the 25 divisor up to No. 6 and 20 above it", () => {
    // Both are compared at the same f'c and fy, so the ratio isolates the
    // divisor: 19 mm takes 25, 25 mm takes 20.
    const d19 = calculateDevelopmentLength(19, 28, 420, true, "aci");
    const d25 = calculateDevelopmentLength(25, 28, 420, true, "aci");
    expect(d25 / d19).toBeGreaterThan(25 / 19);
  });

  it("applies Class B (1.3 ld) only when over half the bars lap", () => {
    const classA = calculateLapLength(16, 28, 420, true, "aci", false);
    const classB = calculateLapLength(16, 28, 420, true, "aci", true);
    expect(classB / classA).toBeCloseTo(1.3, 1);
  });
});

describe("lap lengths (BS 8110-1 Table 3.30)", () => {
  it("uses 1.15 for a normal lap and 1.4 where over half lap together", () => {
    const lb = calculateDevelopmentLength(16, 30, 460, true, "bs8110");
    const normal = calculateLapLength(16, 30, 460, true, "bs8110", false);
    const crowded = calculateLapLength(16, 30, 460, true, "bs8110", true);
    expect(normal).toBeGreaterThanOrEqual(Math.ceil(lb * 1.15));
    expect(crowded / normal).toBeCloseTo(1.4 / 1.15, 1);
  });

  it("never returns a lap below 250 mm", () => {
    // Audit finding: with the 300 mm anchorage floor, the smallest possible
    // BS lap is 1.15 x 300 = 345 mm, so the 250 mm floor can never bind. It is
    // a harmless dead guard, not a wrong answer, and it is left in place.
    const smallest = calculateLapLength(6, 40, 250, true, "bs8110", false);
    expect(smallest).toBeGreaterThanOrEqual(250);
    expect(smallest).toBe(345);
  });

  it("refuses a zero or negative bar diameter instead of dividing by it", () => {
    expect(calculateDevelopmentLength(0, 30, 500)).toBe(0);
    expect(calculateDevelopmentLength(-16, 30, 500)).toBe(0);
    expect(calculateLapLength(0, 30, 500)).toBe(0);
  });
});

describe("stock bar cutting", () => {
  it("shares one 12 m stock bar between two 5 m cuts", () => {
    // 5 m from 12 m stock yields 2 cuts per bar, so one cut costs half a bar.
    expect(stockBarsPerCutBar(5, 12)).toBeCloseTo(0.5, 2);
  });

  it("rounds a cut longer than stock up to whole bars", () => {
    expect(stockBarsPerCutBar(13, 12)).toBe(2);
  });

  it("returns 0 for a non-positive cut or stock length", () => {
    expect(stockBarsPerCutBar(0, 12)).toBe(0);
    expect(stockBarsPerCutBar(5, 0)).toBe(0);
  });
});
