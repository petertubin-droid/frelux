import { describe, it, expect } from "vitest";
import {
  calculateWaterTowerStaging,
  TANK_SIZE_PRESETS,
} from "../water-tower-staging-engine";

describe("Water Tower Staging Estimator Engine", () => {
  it("calculates dead load and design load correctly for 1,000L steel tower", () => {
    const res = calculateWaterTowerStaging({
      tankVolumeLiters: 1000,
      towerHeightMeters: 3,
      constructionMaterial: "steel",
    });

    expect(res.waterWeightKg).toBe(1000);
    expect(res.emptyTankWeightKg).toBe(150);
    expect(res.deadLoadTotalKg).toBe(1150);
    expect(res.lateralSafetyFactor).toBe(1.3);
    // (1150 * 1.3 * 9.81) / 1000 = 14.67 kN
    expect(res.designLoadKn).toBe(14.67);
    expect(res.structuralBOM.structuralHBeamsMeters).toBe(12); // 4 * 3m
    expect(res.structuralBOM.angleIronBracingMeters).toBeGreaterThan(0);
    expect(res.structuralBOM.timberPlatform2x6Pieces).toBe(12);
  });

  it("calculates concrete columns, rebar and mix ratios for 5,000L tank at 6m", () => {
    const res = calculateWaterTowerStaging({
      tankVolumeLiters: 5000,
      towerHeightMeters: 6,
      constructionMaterial: "concrete",
    });

    expect(res.deadLoadTotalKg).toBe(5150);
    expect(res.designLoadKn).toBe(65.68);
    expect(res.structuralBOM.concreteVolumeM3).toBe(1.27);
    expect(res.structuralBOM.cementBags50kg).toBe(9);
    expect(res.structuralBOM.sandCubicMeters).toBe(0.56);
    expect(res.structuralBOM.gravelCubicMeters).toBe(1.12);
    expect(res.structuralBOM.verticalRebarY16Lengths).toBe(8);
    expect(res.structuralBOM.stirrupsRebarY8Lengths).toBe(11);
  });

  it("validates input constraints", () => {
    expect(() =>
      calculateWaterTowerStaging({
        tankVolumeLiters: -500,
        towerHeightMeters: 3,
        constructionMaterial: "steel",
      })
    ).toThrow(RangeError);

    expect(() =>
      calculateWaterTowerStaging({
        tankVolumeLiters: 2000,
        towerHeightMeters: 0,
        constructionMaterial: "concrete",
      })
    ).toThrow(RangeError);
  });

  it("exports standard presets", () => {
    expect(TANK_SIZE_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(TANK_SIZE_PRESETS[0].value).toBe(1000);
  });
});
