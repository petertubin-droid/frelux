/**
 * Timber sections as sold, not as named.
 *
 * A member sized on its nominal section claims capacity the timber does not
 * have: an American 2x4 is 38 x 89 mm, a British 4x2 is 47 x 100 mm. These
 * tests pin the table, the alias handling, and the honest capacity ratio.
 */
import { describe, expect, it } from "vitest";
import {
  TIMBER_SECTIONS,
  TIMBER_SOURCES,
  dressedCapacityRatio,
  sectionModulusMm3,
  timberSection,
  timberSectionByNominal,
  timberSectionsForMarket,
} from "@/config/timber-sections";

const MARKETS = ["NG", "GB", "US", "CA", "AU", "AE"];

describe("timber section registry", () => {
  it("covers every market the roadmap names", () => {
    for (const market of MARKETS) {
      expect(timberSectionsForMarket(market).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("returns sections deepest first", () => {
    const depths = timberSectionsForMarket("US").map((s) => s.depthMm);
    expect([...depths].sort((a, b) => b - a)).toEqual(depths);
  });

  it("cites a source for every section", () => {
    const ids = new Set(TIMBER_SOURCES.map((s) => s.id));
    for (const rows of Object.values(TIMBER_SECTIONS)) {
      for (const row of rows) expect(ids.has(row.sourceId)).toBe(true);
    }
  });

  it("keeps every key unique within a market", () => {
    for (const rows of Object.values(TIMBER_SECTIONS)) {
      expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
    }
  });
});

describe("dressed sections", () => {
  it("gives the American 2x4 its planed dimensions", () => {
    const section = timberSection("US", "us-2x4");
    expect(section).toMatchObject({
      widthMm: 38,
      depthMm: 89,
      sawnFull: false,
    });
    expect(sectionModulusMm3(section!)).toBeCloseTo(50166.33, 1);
  });

  it("resolves a ticket name to the stocked section", () => {
    expect(timberSectionByNominal("US", "2x4")?.key).toBe("us-2x4");
    expect(timberSectionByNominal("GB", "4x2")?.key).toBe("gb-47x100");
    expect(timberSectionByNominal("AU", "140x45")?.key).toBe("au-140x45");
  });

  it("accepts GB and UK as the same market", () => {
    expect(timberSectionsForMarket("UK")).toEqual(
      timberSectionsForMarket("GB"),
    );
  });

  it("never invents a section for an unknown name", () => {
    expect(timberSectionByNominal("US", "2x14")).toBeUndefined();
    expect(timberSectionByNominal("", "2x4")).toBeUndefined();
    expect(timberSection("JP", "us-2x4")).toBeUndefined();
  });
});

describe("the capacity a nominal name claims", () => {
  it("shows a US 2x4 keeps about 0.57 of its nominal section modulus", () => {
    const section = timberSection("US", "us-2x4")!;
    const ratio = dressedCapacityRatio(2, 4, section);
    expect(ratio).toBeGreaterThan(0.55);
    expect(ratio).toBeLessThan(0.6);
  });

  it("shows a GB 4x2 keeps about 0.9, because 47x100 is nearly full", () => {
    // A 4x2 is the 100 mm face on edge: 2 in wide, 4 in deep.
    const section = timberSection("GB", "gb-47x100")!;
    const ratio = dressedCapacityRatio(2, 4, section);
    expect(ratio).toBeGreaterThan(0.88);
    expect(ratio).toBeLessThan(0.91);
  });

  it("gives sawn-full markets essentially their nominal section", () => {
    // NG sells a 2x4 as 50 x 100 mm, so the loss is metric rounding only.
    const section = timberSection("NG", "ng-50x100")!;
    expect(section.sawnFull).toBe(true);
    expect(dressedCapacityRatio(2, 4, section)).toBeGreaterThan(0.95);
    expect(dressedCapacityRatio(2, 4, section)).toBeLessThan(1);
  });
});
