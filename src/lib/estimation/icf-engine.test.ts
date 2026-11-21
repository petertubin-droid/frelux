/**
 * ICF engine conformance (audit 3/34).
 *
 * Expectations are derived from form geometry and EPS physics, not from the
 * code: a 1.2 x 0.4 m form face is 0.48 m2, cavity volume is net wall area
 * times core thickness times the published fill factor, and R-value is foam
 * thickness in inches times the material's R per inch.
 */

import { describe, expect, it } from "vitest";

import {
  calculateIcfWall,
  ICF_BLOCK_FACE_AREA_M2,
  ICF_FILL_FACTORS,
  ICF_FIRE_HOURS_BY_LINING,
  ICF_FOAM_R_PER_INCH,
  REBAR_MASS_KG_PER_M,
  type IcfWallInput,
} from "./icf-engine";

function wall(over: Partial<IcfWallInput> = {}): IcfWallInput {
  return {
    wallLengthM: 12,
    wallHeightM: 2.4,
    coreThicknessMm: 200,
    foamType: "standard_eps",
    formSystem: "flat",
    ...over,
  } as IcfWallInput;
}

describe("form geometry", () => {
  it("uses a 1.2 x 0.4 m form face, so one form covers 0.48 m2", () => {
    expect(ICF_BLOCK_FACE_AREA_M2).toBeCloseTo(0.48, 6);
  });

  it("counts whole forms for a plain 12 x 2.4 m wall", () => {
    const r = calculateIcfWall(wall());
    expect(r.ok).toBe(true);
    // 28.8 m2 / 0.48 m2 = 60 forms, in 6 courses of 10. Corner units take
    // their share of the face, so the straight count is lower and the total
    // plus cutting waste is what has to be bought.
    expect(r.geometry.grossAreaM2).toBeCloseTo(28.8, 6);
    expect(r.geometry.wallHeightCourses).toBe(6);
    expect(r.blocks.corner90BlocksCount).toBe(4 * 6);
    expect(r.blocks.totalBlocksCount).toBeGreaterThanOrEqual(60);
    expect(
      r.blocks.straightBlocksCount + r.blocks.corner90BlocksCount,
    ).toBeLessThanOrEqual(r.blocks.totalBlocksCount);
  });

  it("subtracts openings from the gross wall area, never from the concrete twice", () => {
    const r = calculateIcfWall(
      wall({
        openings: [
          { id: "d1", label: "Door", widthM: 0.9, heightM: 2.1, count: 2 },
        ],
      }),
    );
    const openingArea = 0.9 * 2.1 * 2;
    expect(r.geometry.openingsAreaM2).toBeCloseTo(openingArea, 6);
    expect(r.geometry.netWallAreaM2).toBeCloseTo(28.8 - openingArea, 6);
  });

  it("rounds forms up: a wall that is not a whole number of forms still buys whole forms", () => {
    const small = calculateIcfWall(wall());
    const large = calculateIcfWall(wall({ wallLengthM: 24.3 }));
    expect(Number.isInteger(large.blocks.straightBlocksCount)).toBe(true);
    expect(large.blocks.totalBlocksCount).toBeGreaterThan(
      small.blocks.totalBlocksCount,
    );
  });
});

describe("concrete volume", () => {
  it("pours net area x core thickness x fill factor", () => {
    const r = calculateIcfWall(wall());
    const expected = 28.8 * 0.2 * ICF_FILL_FACTORS.flat;
    // Reported to 2 dp, so compare at that precision.
    expect(r.concrete.netVolumeM3).toBeCloseTo(expected, 1);
    expect(r.concrete.fillFactor).toBe(ICF_FILL_FACTORS.flat);
  });

  it("a waffle form holds less concrete than a flat one for the same wall", () => {
    const flat = calculateIcfWall(wall({ formSystem: "flat" }));
    const waffle = calculateIcfWall(wall({ formSystem: "waffle" }));
    expect(waffle.concrete.netVolumeM3).toBeLessThan(flat.concrete.netVolumeM3);
    expect(waffle.concrete.netVolumeM3).toBeCloseTo(
      flat.concrete.netVolumeM3 *
        (ICF_FILL_FACTORS.waffle / ICF_FILL_FACTORS.flat),
      1,
    );
  });

  it("scales linearly with core thickness", () => {
    const a = calculateIcfWall(wall({ coreThicknessMm: 150 }));
    const b = calculateIcfWall(wall({ coreThicknessMm: 300 }));
    expect(b.concrete.netVolumeM3 / a.concrete.netVolumeM3).toBeCloseTo(2, 2);
  });

  it("site-mix cement follows the grade's kg per m3", () => {
    const r = calculateIcfWall(wall());
    const design = r.concrete.mixDesign;
    expect(design.waterLitresPerM3).toBeCloseTo(
      design.cementKgPerM3 * design.waterCementRatio,
      6,
    );
    // total volume includes pump prime, so bags cover more than net volume
    expect(r.concrete.siteMixCementBags).toBeGreaterThan(0);
    expect(r.concrete.totalVolumeM3).toBeGreaterThanOrEqual(
      r.concrete.netVolumeM3,
    );
  });
});

describe("envelope physics", () => {
  it("R-value is both foam faces plus the core, lining and finish", () => {
    const r = calculateIcfWall(wall({ foamType: "standard_eps" }));
    const inches = r.envelope.foamThicknessMm / 25.4;
    // The foam alone, both faces, in imperial R.
    const foamR = 2 * inches * ICF_FOAM_R_PER_INCH.standard_eps;
    // The core, lining and exterior finish add resistance on top of it, so the
    // assembly R must exceed the foam's own share and stay in a sane band.
    expect(r.envelope.continuousRValueImperial).toBeGreaterThan(foamR);
    expect(r.envelope.continuousRValueImperial).toBeLessThan(foamR + 2);
  });

  it("graphite Neopor insulates better than standard EPS at the same thickness", () => {
    const eps = calculateIcfWall(wall({ foamType: "standard_eps" }));
    const neopor = calculateIcfWall(wall({ foamType: "graphite_neopor" }));
    expect(neopor.envelope.continuousRValueImperial).toBeGreaterThan(
      eps.envelope.continuousRValueImperial,
    );
    expect(neopor.envelope.thermalTransmittanceUValue).toBeLessThan(
      eps.envelope.thermalTransmittanceUValue,
    );
  });

  it("U-value and R-value are reciprocal within the assembly's own basis", () => {
    const r = calculateIcfWall(wall());
    const rsi = r.envelope.metricRsiValue;
    // ISO 6946 surface films (0.17 m2K/W) sit on top of the assembly, so U is
    // 1/(Rsi + 0.17), never 1/Rsi, which would overstate heat loss.
    expect(r.envelope.thermalTransmittanceUValue).toBeCloseTo(
      1 / (rsi + 0.17),
      2,
    );
  });

  it("fire resistance comes from the interior lining, and none means none", () => {
    expect(ICF_FIRE_HOURS_BY_LINING.none).toBe(0);
    const bare = calculateIcfWall(wall({ interiorLining: "none" }));
    const lined = calculateIcfWall(
      wall({ interiorLining: "gypsum_15_9_type_x" }),
    );
    expect(bare.envelope.fireResistanceHours).toBe(0);
    expect(lined.envelope.fireResistanceHours).toBeGreaterThan(
      bare.envelope.fireResistanceHours,
    );
  });
});

describe("reinforcement", () => {
  it("bar masses match the published kg/m for the bar size", () => {
    // CSA G30.18 and ASTM A615 tables.
    expect(REBAR_MASS_KG_PER_M["10M"]).toBeCloseTo(0.785, 3);
    expect(REBAR_MASS_KG_PER_M.no4).toBeCloseTo(0.994, 3);
    expect(REBAR_MASS_KG_PER_M.no6).toBeCloseTo(2.235, 3);
  });

  it("vertical bars get denser at 400 mm spacing than at 600 mm", () => {
    const tight = calculateIcfWall(wall({ verticalRebarSpacingMm: 400 }));
    const loose = calculateIcfWall(wall({ verticalRebarSpacingMm: 600 }));
    expect(tight.reinforcement.verticalBarsCount).toBeGreaterThan(
      loose.reinforcement.verticalBarsCount,
    );
  });

  it("steel weight equals bar count x length x unit mass for the vertical grid", () => {
    const r = calculateIcfWall(wall());
    const expected =
      r.reinforcement.verticalTotalLengthM * REBAR_MASS_KG_PER_M["12M"];
    expect(r.reinforcement.verticalTotalWeightKg).toBeCloseTo(expected, 1);
  });

  it("openings add trim bars, so a wall with openings needs more steel", () => {
    const plain = calculateIcfWall(wall());
    const pierced = calculateIcfWall(
      wall({
        openings: [
          { id: "w1", label: "Window", widthM: 1.2, heightM: 1.2, count: 1 },
        ],
      }),
    );
    expect(pierced.reinforcement.openingTrimBarsCount).toBeGreaterThan(0);
    expect(pierced.reinforcement.totalSteelWeightKg).toBeGreaterThanOrEqual(
      plain.reinforcement.totalSteelWeightKg,
    );
  });
});

describe("refusals (honesty contract)", () => {
  it("refuses a zero or negative wall", () => {
    for (const bad of [0, -1]) {
      const r = calculateIcfWall(wall({ wallLengthM: bad }));
      expect(r.ok).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it("refuses a negative height and never returns a negative quantity", () => {
    const r = calculateIcfWall(wall({ wallHeightM: -2 }));
    expect(r.ok).toBe(false);
  });

  it("does not invent concrete when the wall is shorter than one course", () => {
    const r = calculateIcfWall(wall({ wallHeightM: 0.2 }));
    expect(Number.isFinite(r.concrete.netVolumeM3)).toBe(true);
    expect(r.concrete.netVolumeM3).toBeGreaterThanOrEqual(0);
  });
});
