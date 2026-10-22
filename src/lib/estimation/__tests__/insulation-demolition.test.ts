import { describe, expect, it } from "vitest";
import { calculateInsulationTakeoff } from "../insulation-standalone-engine";
import { calculateDemolitionTakeoff } from "../demolition-standalone-engine";

describe("insulation and demolition quantity engines", () => {
  it("calculates insulation material volume and manufacturer-pack count", () => {
    const r = calculateInsulationTakeoff({
      marketCode: "AU",
      areaM2: 50,
      thicknessMm: 90,
      layers: 2,
      packCoverageM2: 5,
    });
    expect(r.grossAreaM2).toBe(52.5);
    expect(r.installedVolumeM3).toBe(9.45);
    expect(r.packsRequired).toBe(21);
    expect(r.notice).toContain("does not calculate U-values");
  });
  it("calculates loose debris and optional skip loads from explicit factors", () => {
    const r = calculateDemolitionTakeoff({
      marketCode: "GB",
      items: [{ type: "wall", lengthM: 5, widthM: 2, thicknessM: 0.2 }],
      bulkingFactor: 1.5,
      skipCapacityM3: 6,
      loadingEfficiency: 1,
    });
    expect(r.inPlaceVolumeM3).toBe(2);
    expect(r.looseDebrisVolumeM3).toBe(3);
    expect(r.estimatedSkipLoads).toBe(1);
    expect(r.safetyNotice).toContain("hazardous-material surveys");
  });
});
