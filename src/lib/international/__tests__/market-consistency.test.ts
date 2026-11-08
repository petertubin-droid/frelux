/**
 * The consistency report has to be right about what is missing, because the
 * whole point is to catch a market quietly wearing another market's data.
 */
import { describe, expect, it } from "vitest";
import {
  consistencyMarketCodes,
  consistencySummary,
  marketConsistencyRows,
} from "@/lib/international/market-consistency";

describe("market consistency report", () => {
  it("reports the six audited markets as complete", () => {
    const rows = marketConsistencyRows(["NG", "GB", "US", "CA", "AU", "AE"]);
    for (const row of rows) expect(row.gaps).toEqual([]);
    expect(consistencySummary(rows)).toEqual({
      total: 6,
      complete: 6,
      withGaps: 0,
      fallbacks: 0,
    });
  });

  it("names the market a substituted unit came from", () => {
    const [row] = marketConsistencyRows(["JP"]);
    expect(row.masonrySubstitutedFrom).toBe("NG");
    expect(row.gaps.join(" ")).toMatch(/falls back to NG/);
    expect(row.gaps.join(" ")).toMatch(/No timber section table/);
  });

  it("flags every missing piece for an unregistered market", () => {
    const [row] = marketConsistencyRows(["ZZ"]);
    expect(row.hasElectricalProfile).toBe(false);
    expect(row.hasPlumbingProfile).toBe(false);
    expect(row.bagIsDefault).toBe(true);
    expect(row.timberSection).toBeNull();
    expect(row.gaps.length).toBeGreaterThanOrEqual(5);
  });

  it("covers every registered market exactly once", () => {
    const codes = consistencyMarketCodes();
    expect(codes.length).toBeGreaterThan(20);
    expect(new Set(codes).size).toBe(codes.length);
    expect(consistencyMarketCodes()).toEqual([...codes].sort());
  });

  it("keeps the audited markets free of fallbacks across the whole registry", () => {
    const rows = marketConsistencyRows(["NG", "GB", "US", "CA", "AU", "AE"]);
    const used = rows.map((r) => r.masonryUnit);
    expect(used).toEqual([
      "9 inch block",
      "Standard facing brick",
      "8 inch CMU block",
      "8 inch CMU block",
      "190 mm hollow block",
      "200 mm hollow block",
    ]);
  });
});
