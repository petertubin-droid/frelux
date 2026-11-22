import { describe, expect, it } from "vitest";
import {
  ARMOURED_AMPACITY_CLIPPED_DIRECT_A,
  COPPER_AMPACITY_A,
  COPPER_RESISTIVITY,
} from "./electrical-engine";

/**
 * The electrical engine carries two published sets of figures: the
 * current-carrying capacities and the conductor resistivity behind the voltage
 * drop check. Neither was pinned against the standard they come from, so a
 * table edited by hand could have drifted without a test objecting. These check
 * the tables against BS 7671:2018 Appendix 4 as read, size by size.
 */
describe("electrical engine against BS 7671:2018 Appendix 4", () => {
  it("matches Table 4D2A for 70 C thermoplastic multicore clipped direct", () => {
    // Table 4D2A, column 2: two loaded conductors, ARMOURED multicore, clipped
    // direct, 70 C thermoplastic. Amperes, un-derated. The comment previously
    // said non-armoured while carrying these armoured figures, which is the
    // defect services audit 6 fixed.
    const published: Array<[number, number]> = [
      [1.5, 19.5],
      [2.5, 27],
      [4, 36],
      [6, 46],
      [10, 63],
      [16, 85],
      [25, 112],
      [35, 138],
      [50, 168],
      [70, 213],
      [95, 258],
    ];
    const table = ARMOURED_AMPACITY_CLIPPED_DIRECT_A;
    expect(table.map(([csa]) => csa)).toEqual(published.map(([csa]) => csa));
    for (const [csa, amps] of published) {
      const row = table.find(([c]) => c === csa);
      expect(row?.[1], `${csa} mm2`).toBe(amps);
    }
  });

  it("carries the non-armoured Table 4D5 figures for clipped direct", () => {
    // Two loaded conductors, non-armoured multicore, clipped direct.
    const published: Array<[number, number]> = [
      [1.5, 17.5],
      [2.5, 24],
      [4, 32],
      [6, 41],
      [10, 57],
      [16, 76],
      [25, 101],
      [35, 125],
      [50, 151],
      [70, 192],
      [95, 232],
    ];
    expect(COPPER_AMPACITY_A).toEqual(published);
  });

  it("derives voltage drop coefficients close to the tabulated mV/A/m", () => {
    // A two-wire circuit drops 2 L I rho / A, so the coefficient in mV/A/m is
    // 2 rho / A x 1000. Table 4D2A's own mV/A/m column includes conductor
    // reactance, which a resistance-only check omits, so the two agree to a few
    // per cent rather than exactly: that is also why this check is advisory.
    const tabulated: Array<[number, number]> = [
      [1.5, 29],
      [2.5, 18],
      [4, 11],
      [6, 7.3],
      [10, 4.4],
      [16, 2.8],
      [25, 1.75],
      [35, 1.25],
      [50, 0.94],
      [70, 0.65],
      [95, 0.47],
    ];
    for (const [csa, mvPerAm] of tabulated) {
      const derived = (2 * COPPER_RESISTIVITY * 1000) / csa;
      const error = Math.abs(derived - mvPerAm) / mvPerAm;
      expect(
        error,
        `${csa} mm2: ${derived.toFixed(3)} vs ${mvPerAm}`,
      ).toBeLessThan(0.06);
    }
  });

  it("uses the 70 C design resistivity, not the 20 C book value", () => {
    // Copper at 20 C is 0.0172 ohm.mm2/m. Sizing on it understates the drop by
    // about 24 per cent: 0.0172 / 0.0225 = 0.764.
    expect(COPPER_RESISTIVITY).toBeCloseTo(0.0225, 4);
    expect(0.0172 / COPPER_RESISTIVITY).toBeCloseTo(0.764, 2);
  });
});
