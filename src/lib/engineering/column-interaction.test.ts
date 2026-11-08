import { describe, expect, it } from "vitest";
import {
  columnMomentCapacityAtAxial,
  designColumn,
} from "./structural-calculator";

/**
 * Independent verification of the column moment-axial interaction check.
 *
 * Hand calculation, 300 x 300 section, f_cu = 25, f_y = 460, 4-Y20
 * (As = 1,257 mm^2), bar centres 43 mm from the face, N = 289 kN:
 *
 *   x = 100 mm, block  a = 0.9 x 100 = 90 mm
 *   Cc   = 0.447 x 25 x 300 x 90              = 301.7 kN
 *   eps top  = 0.0035 (100 - 43)/100 = 0.00199 -> f = 380 MPa (< 400)
 *   F top    = 380 x 628.5                    = 238.8 kN (compression)
 *   eps bot  = 0.0035 (100 - 257)/100 = -0.0055 -> f = -400 MPa (clamped)
 *   F bot    = -400 x 628.5                   = -251.4 kN (tension)
 *   N = 301.7 + 238.8 - 251.4                 = 289.1 kN
 *   M about centroid, arms 105/107/107 mm:
 *     = 301.7(0.105) + 238.8(0.107) + 251.4(0.107) = 84.1 kN.m
 *
 * The engine returns 84.4 kN.m at 289 kN: a 0.4 % difference, inside the 2 %
 * tolerance used below.
 */
const SECTION = {
  b: 300,
  h: 300,
  coverToBarCentre: 43,
  fcu: 25,
  fy: 460,
  totalSteelArea: 1257,
};

describe("column moment capacity by strain compatibility", () => {
  it("reproduces the hand calculation at 289 kN", () => {
    const r = columnMomentCapacityAtAxial({ ...SECTION, axialKn: 289 });
    expect(r.momentCapacityKnm).toBeCloseTo(84.1, 0);
    expect(Math.abs(r.momentCapacityKnm - 84.1) / 84.1).toBeLessThan(0.02);
  });

  it("falls as the axial load rises past the balanced point", () => {
    const at300 = columnMomentCapacityAtAxial({ ...SECTION, axialKn: 300 });
    const at900 = columnMomentCapacityAtAxial({ ...SECTION, axialKn: 900 });
    expect(at300.momentCapacityKnm).toBeGreaterThan(at900.momentCapacityKnm);
  });

  it("gives no moment capacity beyond the squash load", () => {
    // 0.447 x 25 x 300 x 300 = 1,006 kN concrete + ~503 kN steel
    const r = columnMomentCapacityAtAxial({ ...SECTION, axialKn: 2000 });
    expect(r.momentCapacityKnm).toBe(0);
  });

  it("carries more moment with more steel", () => {
    const light = columnMomentCapacityAtAxial({
      ...SECTION,
      totalSteelArea: 804,
      axialKn: 600,
    });
    const heavy = columnMomentCapacityAtAxial({
      ...SECTION,
      totalSteelArea: 2412,
      axialKn: 600,
    });
    expect(heavy.momentCapacityKnm).toBeGreaterThan(light.momentCapacityKnm);
  });
});

describe("designColumn verdict", () => {
  it("does not pass a column whose axial check passes but moment check fails", () => {
    // 6.5 m tall, 400 kN: slender, so the additional moment dominates.
    const result = designColumn({
      axial_load: 400,
      height: 6.5,
      concrete_grade: "C25",
      steel_grade: "Fe500",
      is_rectangular: true,
      cover_mm: 25,
      unbraced_height_ratio: 1.0,
      market_code: "NG",
    });
    expect(result.axial_check_pass).toBe(true);
    expect(result.moment_check_pass).toBe(false);
    expect(result.capacity_check_pass).toBe(false);
    expect(result.design_moment_knm).toBeGreaterThan(
      result.moment_capacity_knm,
    );
    expect(result.warnings.join(" ")).toMatch(
      /carries the axial load but not the moment/i,
    );
  });

  it("passes a stocky column on both checks", () => {
    const result = designColumn({
      axial_load: 800,
      height: 3,
      concrete_grade: "C25",
      steel_grade: "Fe500",
      is_rectangular: true,
      cover_mm: 25,
      unbraced_height_ratio: 1.0,
      market_code: "NG",
    });
    expect(result.axial_check_pass).toBe(true);
    expect(result.moment_check_pass).toBe(true);
    expect(result.capacity_check_pass).toBe(true);
    expect(result.assessment).toBe("PRELIMINARY");
  });

  it("reports the exact moment it checked against, not a hidden number", () => {
    const result = designColumn({
      axial_load: 500,
      height: 2.8, // stocky, so the minimum eccentricity governs the moment
      concrete_grade: "C30",
      steel_grade: "Fe500",
      is_rectangular: true,
      cover_mm: 25,
      unbraced_height_ratio: 1.0,
      market_code: "NG",
    });
    expect(result.design_moment_knm).toBeGreaterThan(0);
    expect(result.moment_capacity_knm).toBeGreaterThan(0);
    // e_min governs a stocky column, so M_Ed = N x max(0.05h, 20 mm)
    // (BS 8110-1 Cl 3.8.2.4)
    const eMin = Math.max(
      0.05 * Math.min(result.recommended_width, result.recommended_depth),
      20,
    );
    expect(result.design_moment_knm).toBeCloseTo(
      (result.factored_load * eMin) / 1000,
      0,
    );
  });

  it("takes link spacing from the lesser dimension, not the width alone", () => {
    const result = designColumn({
      axial_load: 600,
      height: 3,
      concrete_grade: "C25",
      steel_grade: "Fe500",
      is_rectangular: true,
      cover_mm: 25,
      unbraced_height_ratio: 1.0,
      existing_width: 400,
      existing_depth: 225,
      market_code: "NG",
    });
    expect(result.link_spacing).toBeLessThanOrEqual(0.75 * 225);
    expect(result.link_spacing).toBeLessThanOrEqual(
      12 * result.recommended_bar_diameter,
    );
  });

  it("an unbraced column is checked against a longer effective length", () => {
    const base = {
      axial_load: 500,
      height: 3,
      concrete_grade: "C25" as const,
      steel_grade: "Fe500" as const,
      is_rectangular: true,
      cover_mm: 25,
      unbraced_height_ratio: 12,
      market_code: "NG",
    };
    const braced = designColumn({ ...base, effective_length_factor: 1.0 });
    const unbraced = designColumn({ ...base, effective_length_factor: 2.0 });
    // Twice the effective length, more than twice the slenderness moment:
    // M_add = N (h/2000)(l_e/h)^2.
    expect(unbraced.design_moment_knm).toBeGreaterThan(
      braced.design_moment_knm * 2,
    );
    expect(unbraced.short_or_slender).toBe("slender");
  });

  it("more cover means less moment capacity, because the arm is shorter", () => {
    const light = designColumn({
      axial_load: 800,
      height: 3,
      concrete_grade: "C25",
      steel_grade: "Fe500",
      is_rectangular: true,
      cover_mm: 25,
      unbraced_height_ratio: 10,
      market_code: "NG",
    });
    const heavy = designColumn({
      axial_load: 800,
      height: 3,
      concrete_grade: "C25",
      steel_grade: "Fe500",
      is_rectangular: true,
      cover_mm: 40,
      unbraced_height_ratio: 10,
      market_code: "NG",
    });
    expect(heavy.moment_capacity_knm).toBeLessThan(light.moment_capacity_knm);
  });
});
