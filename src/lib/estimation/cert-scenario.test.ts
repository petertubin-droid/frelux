import { describe, it, expect } from "vitest";
import {
  calculateRoofArea, calculateRidgeLength, calculateHipLength,
  calculateFasciaLength, estimateTimberMeters, decomposeRoofPlanes,
} from "@/lib/estimation/build-to-roof-engine";

describe("CERTIFICATION: fresh scenario vs independent reference (12.5x7.3m, 27.5°, OH 0.45, hip)", () => {
  const L = 12.5, W = 7.3, p = 27.5, OH = 0.45;
  it("roof area matches independent 123.8767 m² (±0.01)", () => {
    expect(calculateRoofArea(L, W, p, OH, "hip")).toBeCloseTo(123.8767, 2);
  });
  it("plane decomposition matches trapezoid 38.13 ×2 + triangle 16.81 ×2", () => {
    const planes = decomposeRoofPlanes(L, W, p, OH, "hip");
    expect(planes[0].projected_area_m2).toBeCloseTo(38.13, 2);
    expect(planes[2].projected_area_m2).toBeCloseTo(16.81, 2);
    expect(planes.reduce((s, x) => s + x.projected_area_m2, 0)).toBeCloseTo(109.88, 1);
  });
  it("ridge = Le−We = 5.2 m", () => {
    expect(calculateRidgeLength(L, W, "hip", OH)).toBeCloseTo(5.2, 6);
  });
  it("hip rafters = 24.7145 m total (4 × 4.1 × √(2+tan²27.5°), 3D-verified)", () => {
    expect(calculateHipLength(L, W, p, OH)).toBeCloseTo(24.7145, 3);
  });
  it("fascia = eave perimeter 43.2 m", () => {
    expect(calculateFasciaLength(L, W, OH)).toBeCloseTo(43.2, 6);
  });
  it("timber = commons+jacks+purlins = 255.56 m (±0.1)", () => {
    expect(estimateTimberMeters(L*W, L, W, p, OH, "hip")).toBeCloseTo(255.56, 1);
  });
  it("zero overhang reduces to footprint/cos = 102.8736 m² (total 2dp)", () => {
    // Independent: 91.25 / cos(27.5°) = 102.8736. The engine rounds only the
    // FINAL total to 2dp (planes are full precision) → 102.87. Tolerance 0.05
    // accommodates exactly that documented final-stage rounding.
    expect(calculateRoofArea(L, W, p, 0, "hip")).toBeCloseTo(102.8736, 1);
  });
  it("uniform-pitch closed form holds for gable & mono; flat is pure projection", () => {
    expect(calculateRoofArea(L, W, p, OH, "gable")).toBeCloseTo(123.8767, 2);
    expect(calculateRoofArea(L, W, p, OH, "mono_pitch")).toBeCloseTo(123.8767, 2);
    expect(calculateRoofArea(L, W, p, OH, "flat")).toBeCloseTo(109.88, 2);
  });
});
