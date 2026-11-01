import { describe, expect, it } from "vitest";
import { calculateDrywallTakeoff } from "@/lib/estimation/drywall-standalone-engine";
import { calculateDrainageTakeoff } from "@/lib/estimation/drainage-standalone-engine";
import { calculateTemporaryWorksTakeoff } from "@/lib/estimation/temporary-works-standalone-engine";
import { calculateDemolitionTakeoff } from "@/lib/estimation/demolition-standalone-engine";
import { calculateMasonryTakeoff } from "@/lib/estimation/masonry-standalone-engine";
import { calculateSepticSizing } from "@/lib/estimation/septic-sizing-engine";
import { calculateIncrete } from "@/lib/estimation/increte-engine";

describe("engine audit edge cases", () => {
  it("handles omitted drywall dimensions as zero", () => {
    const result = calculateDrywallTakeoff({ marketCode: "US" } as never);
    expect(result.grossWallAreaM2).toBe(0);
    expect(result.boardSheets).toBe(0);
  });

  it("calculates drywall quantities from directly supplied wall area", () => {
    const result = calculateDrywallTakeoff({ marketCode: "US", wallAreaM2: 20 } as never);
    expect(result.grossWallAreaM2).toBe(20);
    expect(result.netWallAreaM2).toBe(20);
    expect(result.boardSheets).toBeGreaterThan(0);
  });

  it("guards invalid and omitted drywall openings", () => {
    const result = calculateDrywallTakeoff({
      marketCode: "US", wallLengthM: 4, wallHeightM: 3,
      openings: [{ id: "bad", widthM: Number.NaN, heightM: 2, quantity: Number.NaN }],
    });
    expect(Number.isFinite(result.openingsAreaM2)).toBe(true);
  });

  it("returns an empty drainage takeoff when runs are omitted", () => {
    const result = calculateDrainageTakeoff({ marketCode: "US" } as never);
    expect(result.totalPipeLengthM).toBe(0);
    expect(result.runs).toEqual([]);
    expect(Number.isFinite(result.beddingVolumeM3)).toBe(true);
  });

  it("calculates drainage excavation from shortcut trench dimensions", () => {
    const result = calculateDrainageTakeoff({
      marketCode: "US", trenchLengthM: 12, trenchWidthM: 0.5, trenchDepthM: 0.8,
    });
    expect(result.totalPipeLengthM).toBe(0);
    expect(result.excavationVolumeM3).toBe(4.8);
  });

  it("guards invalid drainage diameter and run dimensions", () => {
    const result = calculateDrainageTakeoff({
      marketCode: "US", runs: [{ lengthM: Number.NaN, pipeDiameterMm: Number.NaN, fallMmPerM: Number.NaN }],
    });
    expect(result.totalPipeLengthM).toBe(0);
    expect(result.runs[0].diameterMm).toBe(0);
    expect(result.runs[0].fallTotalMm).toBe(0);
  });

  it("returns safe temporary-works totals when elements are omitted", () => {
    const result = calculateTemporaryWorksTakeoff({ marketCode: "US" } as never);
    expect(result.formContactAreaM2).toBe(0);
    expect(Number.isFinite(result.grossFormworkSheetAreaM2)).toBe(true);
  });

  it("coerces invalid temporary-works dimensions to zero", () => {
    const result = calculateTemporaryWorksTakeoff({
      marketCode: "US", elements: [{ type: "slab", lengthM: Number.NaN, widthM: 3, depthOrHeightM: 0 }],
    });
    expect(result.formContactAreaM2).toBe(0);
  });

  it("returns zero demolition volume when items are omitted", () => {
    const result = calculateDemolitionTakeoff({ marketCode: "US" } as never);
    expect(result.inPlaceVolumeM3).toBe(0);
    expect(result.looseDebrisVolumeM3).toBe(0);
  });

  it("coerces invalid demolition dimensions without NaN", () => {
    const result = calculateDemolitionTakeoff({
      marketCode: "US", items: [{ type: "wall", lengthM: Number.NaN, widthM: 2, thicknessM: 0.2 }],
    });
    expect(result.inPlaceVolumeM3).toBe(0);
  });

  it("coerces invalid masonry dimensions and opening widths", () => {
    const result = calculateMasonryTakeoff({
      marketCode: "US", wallLengthM: Number.NaN, wallHeightM: 3,
      openings: [{ id: "o", description: "opening", widthM: Number.NaN, heightM: 2, quantity: 1 }],
    });
    expect(result.grossWallAreaM2).toBe(0);
    expect(result.openingsAreaM2).toBe(0);
  });

  it("handles empty septic numeric inputs without NaN", () => {
    const result = calculateSepticSizing({
      marketCode: "US", occupants: Number.NaN, designFlowLitresPerPersonPerDay: Number.NaN,
      retentionDays: Number.NaN, acceptedSoilLoadingRateLitresPerM2PerDay: Number.NaN,
    });
    expect(result.dailyDesignFlowLitres).toBe(0);
    expect(result.tankTotalVolumeM3).toBe(0);
    expect(result.soakawayRequiredAbsorptionAreaM2).toBeNull();
  });

  it("keeps invalid soil loading rates from creating invalid soakaway output", () => {
    const result = calculateSepticSizing({
      marketCode: "US", occupants: 4, designFlowLitresPerPersonPerDay: 100,
      retentionDays: 1, acceptedSoilLoadingRateLitresPerM2PerDay: 0,
    });
    expect(result.soakawayRequiredAbsorptionAreaM2).toBeNull();
    expect(result.indicativeSoakawayDiameterM).toBeNull();
  });

  it("handles omitted Increte products safely", () => {
    const result = calculateIncrete({
      marketCode: "US", length: 10, width: 10, areaUnit: "m2", thickness: null,
      thicknessUnit: "mm", labourRatePerM2: null, currencyCode: "USD",
    } as never);
    expect(result.areaM2).toBe(100);
    expect(result.lines).toEqual([]);
    expect(result.materialTotal).toBeNull();
  });

  it("marks invalid Increte area input as incomplete", () => {
    const result = calculateIncrete({
      marketCode: "US", length: Number.NaN, width: 10, areaUnit: "m2", thickness: null,
      thicknessUnit: "mm", labourRatePerM2: null, products: [], currencyCode: "USD",
    });
    expect(result.areaM2).toBe(0);
    expect(result.complete).toBe(false);
  });
});
