import { describe, expect, it } from "vitest";
import {
  calculateWaterTowerStaging,
  type TowerSpecs,
} from "../water-tower-staging-engine";

/**
 * Conformance suite for the overhead water tank staging engine.
 *
 * Expectations are the published physics and code rules, worked here by hand,
 * not read back from the engine:
 *
 * - 1 litre of water is 1 kg, so a 1,000 L tank is a tonne of water.
 * - Wind dynamic pressure is q = 0.613 v^2 N/m2 (rho = 1.225 kg/m3, v in m/s).
 * - The dead-only ultimate case is 1.4 x dead load (ASCE 7 load combination).
 * - Overturning resistance is weight x base/2, and a tower needs a factor of at
 *   least 1.5 against overturning and sliding.
 * - Wind acting on the diagonal of a four-leg square base puts the extreme legs
 *   at b/sqrt(2) from the centre, so the couple adds M/(b*sqrt(2)) per leg.
 * - Pad area is the leg load over the allowable bearing pressure.
 *
 * The point that matters most for safety: a tower is stabilised by its stored
 * water, so the empty case is the one that can overturn.
 */
const specs: TowerSpecs = {
  tankVolumeLiters: 1000,
  towerHeightMeters: 6,
  constructionMaterial: "steel",
  baseSizeMeters: 2,
  soilBearingKpa: 150,
  windSpeedMs: 30,
  tankDiameterMeters: 1.2,
  marketCode: "NG",
};

const GRAVITY = 9.81;

describe("water tower: loads", () => {
  it("treats a litre of water as a kilogram", () => {
    const r = calculateWaterTowerStaging(specs);
    expect(r.waterWeightKg).toBe(1000);
  });

  it("scales the water with the tank, not with the tower", () => {
    const small = calculateWaterTowerStaging({ ...specs, tankVolumeLiters: 1000 });
    const big = calculateWaterTowerStaging({ ...specs, tankVolumeLiters: 5000 });
    expect(big.waterWeightKg).toBe(5000);
    expect(big.deadLoadTotalKg).toBeGreaterThan(small.deadLoadTotalKg);
  });

  it("totals dead load as water plus tank plus deck", () => {
    const r = calculateWaterTowerStaging(specs);
    expect(r.deadLoadTotalKg).toBeCloseTo(
      r.waterWeightKg + r.emptyTankWeightKg + r.deckWeightKg,
      0,
    );
  });

  it("takes the design load as 1.4 times dead", () => {
    const r = calculateWaterTowerStaging(specs);
    const expected = (r.deadLoadTotalKg * 1.4 * GRAVITY) / 1000;
    expect(r.designLoadKn).toBeCloseTo(expected, 1);
  });
});

describe("water tower: wind", () => {
  it("uses q = 0.613 v squared", () => {
    const r = calculateWaterTowerStaging(specs);
    // 0.613 x 900 = 551.7 Pa
    expect(r.windPressurePa).toBeCloseTo(0.613 * 30 * 30, 0);
    expect(r.windPressurePa).toBe(552);
  });

  it("quadruples the pressure when the wind speed doubles", () => {
    const slow = calculateWaterTowerStaging({ ...specs, windSpeedMs: 20 });
    const fast = calculateWaterTowerStaging({ ...specs, windSpeedMs: 40 });
    expect(fast.windPressurePa / slow.windPressurePa).toBeCloseTo(4, 1);
  });

  it("produces a lateral force and a moment about the base", () => {
    const r = calculateWaterTowerStaging(specs);
    expect(r.windForceKn).toBeGreaterThan(0);
    expect(r.overturningMomentKnm).toBeGreaterThan(0);
    // The moment must exceed force x tower height / 2, because the tank sits
    // above the top of the frame and adds lever arm of its own.
    expect(r.overturningMomentKnm).toBeGreaterThan(
      r.windForceKn * (specs.towerHeightMeters / 2),
    );
  });
});

describe("water tower: stability per load case", () => {
  it("evaluates the empty case as well as the full one", () => {
    const r = calculateWaterTowerStaging(specs);
    const ids = r.loadCases.map((c) => c.id).sort();
    expect(ids).toEqual(["empty", "full"]);
  });

  it("the empty case is lighter than the full case by the water", () => {
    const r = calculateWaterTowerStaging(specs);
    const empty = r.loadCases.find((c) => c.id === "empty")!;
    const full = r.loadCases.find((c) => c.id === "full")!;
    expect(full.weightKn - empty.weightKn).toBeCloseTo(
      (1000 * GRAVITY) / 1000,
      1,
    );
  });

  it("the empty case overturns before the full case, for the same wind", () => {
    const r = calculateWaterTowerStaging(specs);
    const empty = r.loadCases.find((c) => c.id === "empty")!;
    const full = r.loadCases.find((c) => c.id === "full")!;
    expect(empty.overturningSafetyFactor).toBeLessThan(
      full.overturningSafetyFactor,
    );
    // Stored water is stabilising weight, so it must not be what carries the
    // reported factor of safety.
    expect(r.governingCaseId).toBe("empty");
  });

  it("resisting moment is the case weight times half the base", () => {
    const r = calculateWaterTowerStaging(specs);
    for (const loadCase of r.loadCases) {
      expect(loadCase.resistingMomentKnm).toBeCloseTo(
        loadCase.weightKn * (r.baseSizeMeters / 2),
        1,
      );
    }
  });

  it("the factor of safety is resisting over overturning", () => {
    const r = calculateWaterTowerStaging(specs);
    for (const loadCase of r.loadCases) {
      expect(loadCase.overturningSafetyFactor).toBeCloseTo(
        loadCase.resistingMomentKnm / r.overturningMomentKnm,
        1,
      );
    }
  });

  it("holds a factor of at least 1.5 when it reports a pass", () => {
    const r = calculateWaterTowerStaging(specs);
    const governing = r.loadCases.find((c) => c.id === r.governingCaseId)!;
    if (governing.pass) {
      expect(governing.overturningSafetyFactor).toBeGreaterThanOrEqual(1.5);
      expect(governing.slidingSafetyFactor).toBeGreaterThanOrEqual(1.5);
    }
  });

  it("fails a slender tower in high wind rather than passing it quietly", () => {
    const r = calculateWaterTowerStaging({
      ...specs,
      towerHeightMeters: 12,
      windSpeedMs: 55,
      baseSizeMeters: 1.2,
    });
    const governing = r.loadCases.find((c) => c.id === r.governingCaseId)!;
    expect(governing.pass).toBe(false);
    expect(governing.failures.length).toBeGreaterThan(0);
    expect(r.warnings.join(" ").length).toBeGreaterThan(0);
  });
});

describe("water tower: leg loads and footings", () => {
  it("shares the vertical load over four legs", () => {
    const r = calculateWaterTowerStaging(specs);
    for (const loadCase of r.loadCases) {
      // max + min leg = half the total, because the couple cancels.
      expect(loadCase.maxLegLoadKn + loadCase.minLegLoadKn).toBeCloseTo(
        loadCase.weightKn / 2,
        1,
      );
    }
  });

  it("adds the wind couple at b x sqrt(2)", () => {
    const r = calculateWaterTowerStaging(specs);
    const couple = r.overturningMomentKnm / (r.baseSizeMeters * Math.SQRT2);
    for (const loadCase of r.loadCases) {
      expect(loadCase.maxLegLoadKn - loadCase.minLegLoadKn).toBeCloseTo(
        2 * couple,
        1,
      );
    }
  });

  it("sizes the pad from the worst leg and the allowable bearing", () => {
    const r = calculateWaterTowerStaging(specs);
    const padArea = r.footing.padSizeMeters * r.footing.padSizeMeters;
    const worstLeg = Math.max(
      ...r.loadCases.map((c) => c.maxLegLoadKn),
    );
    expect(padArea).toBeGreaterThanOrEqual(worstLeg / specs.soilBearingKpa! - 0.05);
    expect(r.footing.legs).toBe(4);
  });

  it("sizes the pad so the worst leg stays within the allowable bearing", () => {
    // The pad is solved from the bearing pressure, so over-pressure is
    // impossible by construction. Lock that across a range of soils.
    for (const kpa of [400, 200, 150, 100, 50]) {
      const r = calculateWaterTowerStaging({ ...specs, soilBearingKpa: kpa });
      for (const loadCase of r.loadCases) {
        expect(
          loadCase.bearingPressureKpa,
          `bearing at ${kpa} kPa allowable`,
        ).toBeLessThanOrEqual(kpa + 0.1);
      }
    }
  });

  it("buys a bigger pad and more concrete on weaker ground", () => {
    // A 1,000 L tower sits on the 0.6 m minimum pad whatever the soil, so the
    // comparison needs a tower heavy enough for the bearing to govern.
    const heavy = { ...specs, tankVolumeLiters: 10000, towerHeightMeters: 8 };
    const firm = calculateWaterTowerStaging({ ...heavy, soilBearingKpa: 300 });
    const soft = calculateWaterTowerStaging({ ...heavy, soilBearingKpa: 50 });
    expect(soft.footing.padSizeMeters).toBeGreaterThan(
      firm.footing.padSizeMeters,
    );
    expect(soft.footing.concreteVolumeM3).toBeGreaterThan(
      firm.footing.concreteVolumeM3,
    );
    // 50 kPa of ground is poor enough that the failure list should say so if
    // the pad has to grow past what the frame can sensibly carry.
    expect(soft.footing.padSizeMeters).toBeGreaterThanOrEqual(0.6);
  });
});

describe("water tower: wind method disclosure", () => {
  it("states that the pressure is basic and the speed must include exposure", () => {
    const r = calculateWaterTowerStaging(specs);
    const text = r.warnings.join(" ");
    expect(text).toMatch(/basic velocity pressure/i);
    expect(text).toMatch(/Exposure, height, gust and directionality/i);
    expect(text).toMatch(/c_e\(z\)|K_z/);
  });
});

describe("water tower: required inputs", () => {
  it("refuses to guess the soil bearing capacity", () => {
    expect(() =>
      calculateWaterTowerStaging({ ...specs, soilBearingKpa: undefined }),
    ).toThrow(/bearing/i);
  });

  it("refuses to guess the wind speed", () => {
    expect(() =>
      calculateWaterTowerStaging({ ...specs, windSpeedMs: undefined }),
    ).toThrow(/wind/i);
  });

  it("refuses to guess the cement bag without a market", () => {
    expect(() =>
      calculateWaterTowerStaging({ ...specs, marketCode: undefined }),
    ).toThrow(/cement bag/i);
  });
});
