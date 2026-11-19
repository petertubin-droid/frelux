import { describe, expect, it } from "vitest";
import {
  defaultTimberSection,
  studWallTakeoff,
  timberScheduleForMarket,
  timberSystemForMarket,
} from "@/lib/materials/timber-sections";

describe("timber schedule by market", () => {
  it("sells timber by the foot in North America", () => {
    const us = timberScheduleForMarket("US");
    expect(us.system).toBe("imperial");
    expect(us.stockLengthsM).toEqual([2.4384, 3.048, 3.6576, 4.8768]);
    expect(us.sections.map((s) => s.label)).toContain("2x4 (38 x 89 mm)");
    expect(us.note).toBeUndefined();
  });

  it("uses metric stock in metric markets", () => {
    for (const market of ["NG", "GB", "DE", "FR", "AU", "IN", "JP", "BR"]) {
      expect(timberSystemForMarket(market)).toBe("metric");
      expect(timberScheduleForMarket(market).stockLengthsM[0]).toBe(2.4);
    }
  });

  it("states the milled size behind a nominal imperial name", () => {
    const section = defaultTimberSection("US");
    // A 2x4 is 38 x 89 mm milled, not 50 x 100.
    expect(section.widthMm).toBe(38);
    expect(section.depthMm).toBe(89);
    expect(section.label).toContain("2x4");
  });

  it("gives a market with no schedule the metric one, and says so", () => {
    const zz = timberScheduleForMarket("ZZ");
    expect(zz.system).toBe("metric");
    expect(zz.note).toMatch(/No timber schedule is configured for ZZ/);

    const blank = timberScheduleForMarket("");
    expect(blank.system).toBe("metric");
    expect(blank.note).toMatch(/No market was supplied/);
  });

  it("matches market codes case-insensitively", () => {
    expect(timberSystemForMarket("us")).toBe("imperial");
  });
});

describe("stud wall takeoff", () => {
  it("counts studs at centres plus both plates", () => {
    const result = studWallTakeoff(
      { lengthM: 6, heightM: 2.7, spacingM: 0.6 },
      "NG",
    );
    // 6 / 0.6 = 10 bays, so 11 studs; two plates.
    expect(result.studs).toBe(11);
    expect(result.plates).toBe(2);
    expect(result.stockLengthM).toBe(2.4);
  });

  it("adds trimmer studs at openings and keeps the run length", () => {
    const result = studWallTakeoff(
      { lengthM: 6, heightM: 2.7, spacingM: 0.6, openingsWidthM: 0.9 },
      "GB",
    );
    // Solid run 5.1 m -> 9 bays -> 10 field studs, plus 4 trimmers.
    expect(result.studs).toBe(14);
    expect(result.assumptions.join(" ")).toMatch(/1 opening\(s\)/);
  });

  it("buys stock pieces from total length with waste", () => {
    const result = studWallTakeoff(
      { lengthM: 4, heightM: 2.4, spacingM: 0.406, wastagePercent: 10 },
      "US",
    );
    const raw = result.studs * 2.4 + result.plates * 4 + result.noggins * 0.406;
    expect(result.totalLengthM).toBeCloseTo(
      Math.round(raw * 1.1 * 1000) / 1000,
      3,
    );
    expect(result.piecesAtStockLength).toBe(
      Math.ceil(result.totalLengthM / 2.4384),
    );
  });

  it("returns nothing for a zero-length wall instead of a phantom order", () => {
    const result = studWallTakeoff({ lengthM: 0, heightM: 2.4, spacingM: 0.6 });
    expect(result.studs).toBe(0);
    expect(result.plates).toBe(0);
    expect(result.totalLengthM).toBe(0);
    expect(result.piecesAtStockLength).toBe(0);
  });

  it("falls back to 0.6 m centres when spacing is missing", () => {
    const result = studWallTakeoff({ lengthM: 6, heightM: 2.4, spacingM: 0 });
    expect(result.assumptions[0]).toContain("0.6 m centres");
  });

  it("is deterministic for identical inputs", () => {
    const input = { lengthM: 7.3, heightM: 2.55, spacingM: 0.406 };
    expect(studWallTakeoff(input, "US")).toEqual(studWallTakeoff(input, "US"));
  });
});
