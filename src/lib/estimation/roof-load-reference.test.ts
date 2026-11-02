import { describe, expect, it } from "vitest";
import { lookupNigeriaRoofLiveLoad } from "./roof-load-reference";

describe("Nigeria roof live-load reference, Table 8.10", () => {
  it.each([
    [0, 100, 2],
    [99.99, 1001, 1.5],
    [100, 3000, 1.3],
    [299.99, 3001, 1.2],
    [300, 100, 1.2],
  ])("looks up rise %s mm/m, area %s m²", (rise, area, expected) => {
    expect(lookupNigeriaRoofLiveLoad(rise, area).data?.loadKNM2).toBe(expected);
  });

  it("returns provenance and excludes total-load/design claims", () => {
    const result = lookupNigeriaRoofLiveLoad(100, 500).data;
    expect(result?.sourceTable).toContain("Table 8.10");
    expect(result?.sourceUrl).toBe(
      "https://bend.fmhud.gov.ng/upload/download/25080529456.pdf",
    );
    expect(result?.scopeNote).toContain("not the total design load");
  });

  it("refuses to guess how Table 8.10 classifies fractional boundary gaps", () => {
    expect(lookupNigeriaRoofLiveLoad(100, 1000.5).data).toBeNull();
    expect(lookupNigeriaRoofLiveLoad(100, 1000.5).errors[0]).toContain("does not specify");
    expect(lookupNigeriaRoofLiveLoad(100, 3000.5).data).toBeNull();
  });

  it("rejects invalid slope or tributary area", () => {
    expect(lookupNigeriaRoofLiveLoad(-1, 10).errors).toEqual([
      "Roof rise must be zero or greater.",
    ]);
    expect(lookupNigeriaRoofLiveLoad(100, 0).errors).toEqual([
      "Tributary loaded area must be greater than zero.",
    ]);
  });
});
