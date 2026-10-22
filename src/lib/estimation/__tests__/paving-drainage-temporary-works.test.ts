import { describe, expect, it } from "vitest";
import { calculatePavingTakeoff } from "../paving-standalone-engine";
import { calculateDrainageTakeoff } from "../drainage-standalone-engine";
import { calculateTemporaryWorksTakeoff } from "../temporary-works-standalone-engine";

describe("standalone external works quantity engines", () => {
  it("calculates paving quantities from explicit geometry and assumptions", () => {
    const result = calculatePavingTakeoff({
      marketCode: "GB",
      areaM2: 20,
      paverLengthMm: 200,
      paverWidthMm: 100,
      beddingDepthMm: 40,
      subbaseDepthMm: 150,
      edgeLengthM: 12,
    });
    expect(result.paversRequired).toBeGreaterThan(900);
    expect(result.beddingSandVolumeM3).toBeGreaterThan(0);
    expect(result.looseSubbaseVolumeM3).toBeGreaterThan(
      result.compactedSubbaseVolumeM3,
    );
    expect(result.edgeUnits).toBe(12);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });
  it("calculates drainage run lengths, fall, trench and bedding quantities", () => {
    const result = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [{ lengthM: 30, pipeDiameterMm: 110, fallMmPerM: 10 }],
      trenchWidthM: 0.5,
      trenchDepthM: 0.8,
    });
    expect(result.totalPipeLengthM).toBe(30);
    expect(result.pipeStockPieces).toBe(5);
    expect(result.runs[0].fallTotalMm).toBe(300);
    expect(result.excavationVolumeM3).toBe(12);
    expect(result.cautions.length).toBeGreaterThan(0);
  });
  it("calculates form-contact and scaffold grid quantities with safety caveats", () => {
    const result = calculateTemporaryWorksTakeoff({
      marketCode: "US",
      elements: [{ type: "slab", lengthM: 10, widthM: 8 }],
      scaffoldRunLengthM: 12,
      scaffoldWorkingHeightM: 6,
    });
    expect(result.formContactAreaM2).toBe(80);
    expect(result.grossFormworkSheetAreaM2).toBeGreaterThan(80);
    expect(result.scaffoldStandards).toBeGreaterThan(0);
    expect(result.safetyNotice).toContain("Quantity estimate only");
  });
});
