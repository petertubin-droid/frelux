import { describe, expect, it } from "vitest";
import { BAR_MASS_KG_M, BS8666_TABLE2 } from "./bbs-schedule";

/**
 * BS 8666:2020 Table 2 is not arbitrary: the minimum mandrel diameter is 4d up
 * to and including 16 mm and 7d from 20 mm, the scheduling radius is half of it,
 * and the bar mass of a round bar follows 0.006165 d squared. Those three
 * relationships let the transcribed table be checked entry by entry instead of
 * being taken on trust, so a typo in one cell cannot pass unnoticed.
 */
const SIZES = [6, 8, 10, 12, 16, 20, 25, 32, 40, 50];

describe("BS 8666:2020 Table 2 transcription", () => {
  it("covers the ten scheduled bar sizes and nothing else", () => {
    expect(
      Object.keys(BS8666_TABLE2)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(SIZES);
    expect(
      Object.keys(BAR_MASS_KG_M)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(SIZES);
  });

  it("uses a 4d mandrel to 16 mm and a 7d mandrel from 20 mm", () => {
    for (const d of SIZES) {
      const expected = d <= 16 ? 4 * d : 7 * d;
      expect(BS8666_TABLE2[d].M, `${d} mm mandrel`).toBe(expected);
    }
  });

  it("puts the scheduling radius at half the mandrel", () => {
    for (const d of SIZES) {
      const { r, M } = BS8666_TABLE2[d];
      // The 25 mm radius is published as 87 against a nominal 87.5.
      expect(Math.abs(r - M / 2), `${d} mm radius`).toBeLessThanOrEqual(0.5);
    }
  });

  it("records the nominal mass of a round bar", () => {
    for (const d of SIZES) {
      const nominal = 0.006165 * d * d;
      const error = Math.abs(BAR_MASS_KG_M[d] - nominal) / nominal;
      expect(
        error,
        `${d} mm: ${BAR_MASS_KG_M[d]} kg/m against ${nominal.toFixed(4)}`,
      ).toBeLessThan(0.002);
    }
    // Spot figures a fabricator would recognise.
    expect(BAR_MASS_KG_M[12]).toBeCloseTo(0.888, 3);
    expect(BAR_MASS_KG_M[25]).toBeCloseTo(3.854, 3);
    expect(BAR_MASS_KG_M[50]).toBeCloseTo(15.413, 3);
  });

  it("keeps end projections and hook diameters rising with bar size", () => {
    for (let i = 1; i < SIZES.length; i += 1) {
      const prev = BS8666_TABLE2[SIZES[i - 1]];
      const cur = BS8666_TABLE2[SIZES[i]];
      // 6 mm and 8 mm share the same 110 mm projection, so non-decreasing.
      expect(
        cur.pGeneral,
        `${SIZES[i]} mm general projection`,
      ).toBeGreaterThanOrEqual(prev.pGeneral);
      if (Number.isFinite(cur.q)) {
        expect(cur.q, `${SIZES[i]} mm hook`).toBeGreaterThanOrEqual(prev.q);
      }
    }
    // A 50 mm bar has no tabulated end projection for a link bend or hook.
    expect(BS8666_TABLE2[50].pLink).toBeNaN();
    expect(BS8666_TABLE2[50].q).toBeNaN();
  });
});
