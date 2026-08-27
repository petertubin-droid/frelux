import { describe, it, expect } from "vitest";
import {
  aggregateTilingResults,
  bridgePainting,
  bridgeGrafitex,
} from "./bridges";

describe("measurement/bridges", () => {
  it("aggregateTilingResults sums across results", () => {
    const results = [
      {
        surfaceAreaM2: 10,
        tilesRequired: 100,
        cartonsRequired: 5,
      } as unknown as never,
      {
        surfaceAreaM2: 20,
        tilesRequired: 200,
        cartonsRequired: 10,
      } as unknown as never,
    ];
    const agg = aggregateTilingResults(results);
    expect(agg.totalAreaM2).toBe(30);
    expect(agg.totalTiles).toBe(300);
    expect(agg.totalCartons).toBe(15);
    expect(agg.perSurface.length).toBe(2);
  });

  it("aggregateTilingResults handles empty array", () => {
    const agg = aggregateTilingResults([]);
    expect(agg.totalAreaM2).toBe(0);
    expect(agg.totalTiles).toBe(0);
    expect(agg.totalCartons).toBe(0);
  });

  it("bridgePainting maps entry results to areas", () => {
    const projectResult = {
      entryResults: [
        {
          entryId: "e1",
          normalizedLengthM: 5,
          normalizedWidthM: 3,
          normalizedHeightM: 2.5,
          totalAreaM2: 15,
        },
        {
          entryId: "e2",
          normalizedLengthM: 4,
          normalizedWidthM: 3,
          normalizedHeightM: 2.5,
          totalAreaM2: 12,
        },
      ],
    } as unknown as never;
    const painted = bridgePainting(projectResult);
    expect(painted.length).toBe(2);
    expect(painted[0].entryId).toBe("e1");
    expect(painted[0].areaM2).toBe(15);
    expect(painted[0].lengthM).toBe(5);
  });

  it("bridgeGrafitex returns total area and null material", () => {
    const projectResult = {
      totalAreaM2: 250,
      steps: [],
    } as unknown as never;
    const result = bridgeGrafitex(projectResult);
    expect(result.totalAreaM2).toBe(250);
    expect(result.materialQuantity).toBeNull();
    expect(result.materialRuleStatus).toBe("NOT_CONFIGURED");
  });
});
