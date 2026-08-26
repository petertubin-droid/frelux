import { describe, it, expect } from "vitest";
import { calculateRoofAreaPipeline } from "./area-pipeline";

describe("roof/area-pipeline", () => {
  it("calculates flat roof with no cutouts", () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: "flat",
      cutouts: [],
      wastePercent: 10,
    });
    expect(result.planAreaM2).toBe(100);
    expect(result.slopedSurfaceAreaM2).toBe(100);
    expect(result.netAreaM2).toBe(100);
    expect(result.orderAreaM2).toBeCloseTo(110);
    expect(result.pitchApplied).toBe(false);
  });

  it("calculates sloped roof with pitch", () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: 30,
      roofType: "gable",
      cutouts: [],
      wastePercent: 0,
    });
    expect(result.pitchApplied).toBe(true);
    expect(result.slopedSurfaceAreaM2).toBeGreaterThan(100);
    expect(result.orderAreaM2).toBeCloseTo(result.slopedSurfaceAreaM2);
  });

  it("subtracts cutouts from net area", () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: "flat",
      cutouts: [
        { id: "c1", name: "Skylight", areaM2: 5, type: "skylight" },
        { id: "c2", name: "Courtyard", areaM2: 10, type: "courtyard" },
      ],
      wastePercent: 0,
    });
    expect(result.cutoutAreaM2).toBe(15);
    expect(result.netAreaM2).toBe(85);
  });

  it("applies waste percentage to order quantity", () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 200,
      pitchDegrees: null,
      roofType: "flat",
      cutouts: [],
      wastePercent: 15,
    });
    expect(result.orderAreaM2).toBeCloseTo(230);
  });

  it("handles negative plan area as 0", () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: -50,
      pitchDegrees: null,
      roofType: "flat",
      cutouts: [],
      wastePercent: 0,
    });
    expect(result.planAreaM2).toBe(0);
  });

  it("does not apply pitch for flat roof even if pitch given", () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: 45,
      roofType: "flat",
      cutouts: [],
      wastePercent: 0,
    });
    expect(result.pitchApplied).toBe(false);
    expect(result.slopedSurfaceAreaM2).toBe(100);
  });

  it("does not apply pitch when pitchDegrees is 0", () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: 0,
      roofType: "gable",
      cutouts: [],
      wastePercent: 0,
    });
    expect(result.pitchApplied).toBe(false);
  });

  it("generates explanation strings for each step", () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: 30,
      roofType: "gable",
      cutouts: [{ id: "c1", name: "Sky", areaM2: 5, type: "skylight" }],
      wastePercent: 10,
    });
    expect(result.explanation.planArea).toContain("100.00 m²");
    expect(result.explanation.pitch).toContain("30.0");
    expect(result.explanation.cutouts).toContain("Sky");
    expect(result.explanation.net).toContain("m²");
    expect(result.explanation.waste).toContain("10.0%");
    expect(result.explanation.order).toContain("m²");
  });

  it("explanation notes missing pitch for non-flat roof", () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: "gable",
      cutouts: [],
      wastePercent: 0,
    });
    expect(result.explanation.pitch).toContain("NOT PROVIDED");
  });
});
