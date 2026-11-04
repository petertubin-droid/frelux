import { describe, it, expect } from "vitest";
import {
  calculateWaterTowerStaging,
  TANK_SIZE_PRESETS,
} from "../water-tower-staging-engine";

describe("Water Tower Staging Estimator Engine", () => {
  it("counts water, shell and deck for a 1,000L steel tower", () => {
    const res = calculateWaterTowerStaging({
      tankVolumeLiters: 1000,
      towerHeightMeters: 3,
      constructionMaterial: "steel",
    });

    expect(res.waterWeightKg).toBe(1000);
    // Commercial PE tank: about 32 kg per 1,000 L of capacity.
    expect(res.emptyTankWeightKg).toBe(35);
    expect(res.deckWeightKg).toBeGreaterThan(0);
    expect(res.deadLoadTotalKg).toBe(1000 + 35 + res.deckWeightKg);
    // 1.4 dead-load factor on the service weight.
    expect(res.designLoadKn).toBeCloseTo(
      (res.deadLoadTotalKg * 1.4 * 9.81) / 1000,
      0,
    );
    expect(res.structuralBOM.structuralHBeamsMeters).toBeCloseTo(12, 1); // 4 x 3 m
    expect(res.structuralBOM.angleIronBracingMeters).toBeGreaterThan(0);
    expect(res.structuralBOM.timberPlatform2x6Pieces).toBeGreaterThan(0);
  });

  it("checks wind overturning and quotes the factor", () => {
    const res = calculateWaterTowerStaging({
      tankVolumeLiters: 5000,
      towerHeightMeters: 6,
      constructionMaterial: "concrete",
    });

    expect(res.windPressurePa).toBeCloseTo(0.613 * 30 * 30, 0);
    expect(res.windForceKn).toBeGreaterThan(0);
    expect(res.overturningSafetyFactor).toBeCloseTo(
      res.resistingMomentKnm / res.overturningMomentKnm,
      1,
    );
    expect(res.lateralSafetyFactor).toBe(res.overturningSafetyFactor);
  });

  it("prices the pads, columns and mix for a 5,000L tank at 6 m", () => {
    const res = calculateWaterTowerStaging({
      tankVolumeLiters: 5000,
      towerHeightMeters: 6,
      constructionMaterial: "concrete",
    });

    // Water plus shell plus deck: more than the old water-plus-tank figure
    // because the platform is part of the load path.
    expect(res.deadLoadTotalKg).toBeGreaterThan(5000);
    // Pads are now part of the concrete bill.
    const pads =
      4 * res.footing.padSizeMeters ** 2 * (res.footing.padThicknessMm / 1000);
    expect(res.footing.concreteVolumeM3).toBeCloseTo(pads, 1);
    expect(res.structuralBOM.concreteVolumeM3).toBeGreaterThan(
      res.footing.concreteVolumeM3,
    );
    expect(res.structuralBOM.cementBags50kg).toBeGreaterThan(9);
    expect(res.structuralBOM.sandCubicMeters).toBeGreaterThan(0.5);
    expect(res.structuralBOM.gravelCubicMeters).toBeGreaterThan(1);
    expect(res.structuralBOM.verticalRebarY16Lengths).toBeGreaterThan(0);
    expect(res.structuralBOM.stirrupsRebarY8Lengths).toBeGreaterThan(0);
  });

  it("sizes a real steel section and reports its utilisation", () => {
    const res = calculateWaterTowerStaging({
      tankVolumeLiters: 5000,
      towerHeightMeters: 6,
      constructionMaterial: "steel",
    });
    expect(res.legDesign.sectionLabel).toMatch(/SHS|UC/);
    expect(res.legDesign.utilisation).toBeGreaterThan(0);
    expect(res.structuralBOM.basePlates).toBe(4);
    expect(res.structuralBOM.anchorBolts).toBe(16);
  });

  it("gives an eight step installation sequence ending in a fill test", () => {
    const res = calculateWaterTowerStaging({
      tankVolumeLiters: 2000,
      towerHeightMeters: 4,
      constructionMaterial: "concrete",
    });
    expect(res.installationSteps).toHaveLength(8);
    expect(res.installationSteps[0].id).toBe("set-out");
    expect(res.installationSteps[7].id).toBe("plumbing");
  });

  it("validates input constraints", () => {
    expect(() =>
      calculateWaterTowerStaging({
        tankVolumeLiters: -500,
        towerHeightMeters: 3,
        constructionMaterial: "steel",
      }),
    ).toThrow(RangeError);

    expect(() =>
      calculateWaterTowerStaging({
        tankVolumeLiters: 2000,
        towerHeightMeters: 0,
        constructionMaterial: "concrete",
      }),
    ).toThrow(RangeError);
  });

  it("exports standard presets", () => {
    expect(TANK_SIZE_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(TANK_SIZE_PRESETS[0].value).toBe(1000);
  });
});
