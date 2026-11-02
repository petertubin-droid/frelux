import { describe, it, expect } from "vitest";
import { calculateRoofAreaPipeline } from "@/lib/roof/area-pipeline";
import type { RoofAreaPipelineInput } from "@/lib/roof/area-pipeline";

function makeInput(
  overrides: Partial<RoofAreaPipelineInput> = {},
): RoofAreaPipelineInput {
  return {
    planAreaM2: 100,
    pitchDegrees: 30,
    roofType: "gable" as const,
    cutouts: [],
    wastePercent: 10,
    ...overrides,
  };
}

describe("calculateRoofAreaPipeline", () => {
  it("returns all pipeline steps", () => {
    const result = calculateRoofAreaPipeline(makeInput());
    expect(result.planAreaM2).toBe(100);
    expect(result.pitchDegrees).toBe(30);
    expect(result.slopedSurfaceAreaM2).toBeCloseTo(115.47, 1);
    expect(result.cutoutAreaM2).toBe(0);
    expect(result.netAreaM2).toBeCloseTo(115.47, 1);
    expect(result.wastePercent).toBe(10);
    expect(result.orderAreaM2).toBeCloseTo(127.02, 1);
    expect(result.pitchApplied).toBe(true);
  });

  it("does not apply pitch for flat roofs", () => {
    const result = calculateRoofAreaPipeline(
      makeInput({ roofType: "flat" as const }),
    );
    expect(result.pitchApplied).toBe(false);
    expect(result.slopedSurfaceAreaM2).toBe(100);
  });

  it("does not apply pitch when pitch is null", () => {
    const result = calculateRoofAreaPipeline(makeInput({ pitchDegrees: null }));
    expect(result.pitchApplied).toBe(false);
    expect(result.slopedSurfaceAreaM2).toBe(100);
  });

  it("subtracts cutouts from net area", () => {
    const result = calculateRoofAreaPipeline(
      makeInput({
        cutouts: [
          { id: "c1", name: "Skylight", areaM2: 5, type: "skylight" },
          { id: "c2", name: "Courtyard", areaM2: 10, type: "courtyard" },
        ],
      }),
    );
    expect(result.cutoutAreaM2).toBe(15);
    expect(result.netAreaM2).toBeCloseTo(115.47 - 15, 1);
  });

  it("never returns negative net area", () => {
    const result = calculateRoofAreaPipeline(
      makeInput({
        planAreaM2: 10,
        cutouts: [{ id: "c1", name: "Huge", areaM2: 100, type: "other" }],
      }),
    );
    expect(result.netAreaM2).toBe(0);
  });

  it("applies waste percentage correctly", () => {
    const result = calculateRoofAreaPipeline(
      makeInput({ wastePercent: 20, cutouts: [] }),
    );
    // sloped ≈ 115.47, waste 20% → 115.47 * 1.2
    expect(result.orderAreaM2).toBeCloseTo(115.47 * 1.2, 1);
  });

  it("handles zero waste", () => {
    const result = calculateRoofAreaPipeline(
      makeInput({ wastePercent: 0, cutouts: [] }),
    );
    expect(result.orderAreaM2).toBeCloseTo(result.netAreaM2, 5);
  });

  it("clamps negative plan area to 0", () => {
    const result = calculateRoofAreaPipeline(makeInput({ planAreaM2: -50 }));
    expect(result.planAreaM2).toBe(0);
    expect(result.slopedSurfaceAreaM2).toBe(0);
  });

  it("includes explanation text", () => {
    const result = calculateRoofAreaPipeline(makeInput());
    expect(result.explanation.planArea).toContain("100.00");
    expect(result.explanation.pitch).toContain("30.0");
    expect(result.explanation.slopedSurface).toBeTruthy();
    expect(result.explanation.cutouts).toContain("none");
    expect(result.explanation.net).toBeTruthy();
    expect(result.explanation.waste).toContain("10.0");
    expect(result.explanation.order).toBeTruthy();
  });

  it("explanation mentions cutout names when present", () => {
    const result = calculateRoofAreaPipeline(
      makeInput({
        cutouts: [
          { id: "c1", name: "Skylight A", areaM2: 3, type: "skylight" },
        ],
      }),
    );
    expect(result.explanation.cutouts).toContain("Skylight A");
  });

  it("explanation says flat roof for flat type", () => {
    const result = calculateRoofAreaPipeline(
      makeInput({ roofType: "flat" as const }),
    );
    expect(result.explanation.pitch).toContain("flat roof");
  });

  it("explanation says NOT PROVIDED when pitch is null for non-flat", () => {
    const result = calculateRoofAreaPipeline(
      makeInput({ pitchDegrees: null, roofType: "gable" as const }),
    );
    expect(result.explanation.pitch).toContain("NOT PROVIDED");
  });
});
