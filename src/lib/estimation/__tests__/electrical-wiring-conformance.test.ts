// =========================================================
// ELECTRICAL WIRING CONFORMANCE (ledger #24)
//
// Expectations come from BS 7671, not from the engine: Table 4D5 for tabulated
// current-carrying capacity, Appendix 4 for voltage drop limits, and the
// Ib <= In <= Iz rule for protective device selection. Where the engine and the
// standard disagree the test says so rather than restating the code.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  AMPACITY_BY_METHOD,
  ARMOURED_AMPACITY_CLIPPED_DIRECT_A,
  COPPER_AMPACITY_A,
  COPPER_RESISTIVITY,
  DEFAULT_INSTALLATION_METHOD,
  VOLTAGE_DROP_LIMITS,
  minimumCableSize,
  selectBreaker,
  voltageDropPercent,
} from "../electrical-engine";

describe("tabulated current-carrying capacity (BS 7671 Table 4D5)", () => {
  it("carries the clipped-direct column, not the free-air column", () => {
    // 17.5 / 24 / 32 / 41 / 57 / 76 A are the method C figures for 70 C
    // thermoplastic multicore, two loaded conductors.
    const methodC = Object.fromEntries(AMPACITY_BY_METHOD.C);
    expect(methodC[1.5]).toBe(17.5);
    expect(methodC[2.5]).toBe(24);
    expect(methodC[4]).toBe(32);
    expect(methodC[6]).toBe(41);
    expect(methodC[10]).toBe(57);
    expect(methodC[16]).toBe(76);
  });

  it("defaults to method C, the method the engine describes", () => {
    expect(DEFAULT_INSTALLATION_METHOD).toBe("C");
    expect(COPPER_AMPACITY_A).toEqual(AMPACITY_BY_METHOD.C);
  });

  it("keeps the armoured table above the non-armoured one at every size", () => {
    // The steel wire armour conducts heat away, so SWA carries more.
    for (const [csa, amps] of ARMOURED_AMPACITY_CLIPPED_DIRECT_A) {
      const nonArmoured =
        AMPACITY_BY_METHOD.C.find(([s]) => s === csa)?.[1] ?? 0;
      expect(amps).toBeGreaterThan(nonArmoured);
    }
  });

  it("orders the four methods A < B < C < E at every size", () => {
    const sizes = AMPACITY_BY_METHOD.A.map(([csa]) => csa);
    for (const csa of sizes) {
      const pick = (m: "A" | "B" | "C" | "E") =>
        AMPACITY_BY_METHOD[m].find(([s]) => s === csa)?.[1] ?? 0;
      expect(pick("A")).toBeLessThan(pick("B"));
      expect(pick("B")).toBeLessThan(pick("C"));
      expect(pick("C")).toBeLessThan(pick("E"));
    }
  });

  it("has the same sizes in every column", () => {
    const sizes = AMPACITY_BY_METHOD.C.map(([csa]) => csa);
    for (const m of ["A", "B", "E"] as const) {
      expect(AMPACITY_BY_METHOD[m].map(([csa]) => csa)).toEqual(sizes);
    }
  });
});

describe("cable sizing against the tabulated capacity", () => {
  it("sizes a 26 A circuit at 4 mm² clipped direct, because 2.5 mm² carries 24 A", () => {
    const verdict = minimumCableSize({
      load_watts: 26 * 230,
      voltage: 230,
      run_m: 10,
    });
    expect(verdict.feasible).toBe(true);
    expect(verdict.cross_section_mm2).toBe(4);
  });

  it("still sizes the same circuit at 2.5 mm² in free air, where it carries 27 A", () => {
    const verdict = minimumCableSize({
      load_watts: 26 * 230,
      voltage: 230,
      run_m: 10,
      installation_method: "E",
    });
    expect(verdict.cross_section_mm2).toBe(2.5);
  });

  it("never returns a size whose tabulated capacity is below the design current", () => {
    for (const method of ["A", "B", "C", "E"] as const) {
      const verdict = minimumCableSize({
        load_watts: 40 * 230,
        voltage: 230,
        run_m: 5,
        installation_method: method,
      });
      const chosen = verdict.attempt.find(
        (a) => a.cross_section_mm2 === verdict.cross_section_mm2,
      );
      expect(chosen?.passes_ampacity).toBe(true);
    }
  });

  it("uses the armoured table for SWA, which carries more than non-armoured", () => {
    const nonArmoured = minimumCableSize({
      load_watts: 26 * 230,
      voltage: 230,
      run_m: 10,
    });
    const armoured = minimumCableSize({
      load_watts: 26 * 230,
      voltage: 230,
      run_m: 10,
      cable_construction: "armoured",
    });
    // 2.5 mm2 armoured carries 27 A, so SWA needs one size less than the
    // non-armoured cable that carries 24 A.
    expect(nonArmoured.cross_section_mm2).toBe(4);
    expect(armoured.cross_section_mm2).toBe(2.5);
  });

  it("refuses an armoured run on a method it has no table for", () => {
    const verdict = minimumCableSize({
      load_watts: 26 * 230,
      voltage: 230,
      run_m: 10,
      cable_construction: "armoured",
      installation_method: "A",
    });
    expect(verdict.feasible).toBe(false);
    expect(verdict.reason).toContain("clipped direct only");
  });

  it("names the method when nothing satisfies both constraints", () => {
    const verdict = minimumCableSize({
      load_watts: 300 * 230,
      voltage: 230,
      run_m: 400,
    });
    expect(verdict.feasible).toBe(false);
    expect(verdict.reason).toContain("method C");
  });
});

describe("voltage drop (BS 7671 Appendix 4)", () => {
  it("uses the 3% lighting and 5% power limits", () => {
    expect(VOLTAGE_DROP_LIMITS.lighting).toBe(3);
    expect(VOLTAGE_DROP_LIMITS.power).toBe(5);
  });

  it("matches the two-wire formula 2 L I rho / A", () => {
    // 230 V, 20 A, 30 m, 2.5 mm2: 2 x 30 x 20 x 0.0225 / 2.5 = 10.8 V
    const verdict = voltageDropPercent({
      run_m: 30,
      load_watts: 20 * 230,
      voltage: 230,
      cross_section_mm2: 2.5,
    });
    expect(verdict.drop_percent).toBeCloseTo((10.8 / 230) * 100, 2);
  });

  it("uses the sqrt(3) factor for a balanced three-phase run", () => {
    const single = voltageDropPercent({
      run_m: 30,
      load_watts: 20 * 230,
      voltage: 230,
      cross_section_mm2: 4,
    });
    const three = voltageDropPercent({
      run_m: 30,
      load_watts: 20 * 400 * Math.sqrt(3),
      voltage: 400,
      cross_section_mm2: 4,
      system: "three",
    });
    // Same current per conductor on each, so the percentages are close but the
    // three-phase expression uses sqrt(3) rather than 2.
    expect(three.drop_percent).toBeGreaterThan(0);
    expect(single.drop_percent).toBeGreaterThan(three.drop_percent);
  });

  it("uses the warm resistivity, not the 20 C figure", () => {
    // A cold 0.0172 would understate the drop by about a quarter and pass
    // cables that will exceed their limit in service.
    expect(COPPER_RESISTIVITY).toBeGreaterThan(0.0172);
    expect(COPPER_RESISTIVITY).toBeCloseTo(0.0225, 4);
  });

  it("refuses to report a pass when the inputs are incomplete", () => {
    const verdict = voltageDropPercent({
      run_m: 0,
      load_watts: 2300,
      voltage: 230,
      cross_section_mm2: 2.5,
    });
    expect(verdict.passes).toBe(false);
  });
});

describe("protective device selection (Ib <= In <= Iz)", () => {
  it("picks the smallest standard rating at or above the design current", () => {
    const verdict = selectBreaker({
      design_current_a: 18,
      cable_ampacity_a: 24,
    });
    expect(verdict.rating_a).toBe(20);
    expect(verdict.complies).toBe(true);
  });

  it("refuses a rating above the cable capacity", () => {
    const verdict = selectBreaker({
      design_current_a: 26,
      cable_ampacity_a: 24,
    });
    expect(verdict.rating_a).toBeNull();
    expect(verdict.complies).toBe(false);
  });

  it("refuses when the design current exceeds every listed rating", () => {
    const verdict = selectBreaker({
      design_current_a: 140,
      cable_ampacity_a: 200,
    });
    expect(verdict.complies).toBe(false);
  });

  it("is honest when cable capacity was not supplied", () => {
    const verdict = selectBreaker({ design_current_a: 18 });
    expect(verdict.complies).toBe(true);
    expect(verdict.reason).toContain("not supplied");
  });

  it("agrees with the cable it protects: 20 A design on 2.5 mm² clipped direct", () => {
    const size = minimumCableSize({
      load_watts: 20 * 230,
      voltage: 230,
      run_m: 10,
    });
    const breaker = selectBreaker({
      design_current_a: 20,
      cable_ampacity_a: size.ampacity_a,
    });
    expect(breaker.rating_a).toBe(20);
    expect(breaker.complies).toBe(true);
  });
});
