import { describe, expect, it } from "vitest";
import {
  coverageSentence,
  groupReasons,
  summariseCoverage,
  type CoverageRow,
} from "./catalogue-coverage";

const row = (over: Partial<CoverageRow> = {}): CoverageRow => ({
  market: "GB",
  staged: 153,
  mapped: 1,
  awaiting_review: 2,
  no_counterpart: 115,
  bulk_listing: 35,
  supplier_no_price: 0,
  supplies_prices: true,
  last_seen: "2026-10-30T18:20:00Z",
  ...over,
});

describe("catalogue coverage", () => {
  it("counts a staged row as coverage only when it is tied to a material", () => {
    const totals = summariseCoverage([
      row(),
      row({
        market: "AU",
        staged: 80,
        mapped: 0,
        awaiting_review: 0,
        no_counterpart: 0,
        bulk_listing: 0,
        supplier_no_price: 80,
        supplies_prices: false,
      }),
    ]);
    expect(totals.staged).toBe(233);
    expect(totals.mapped).toBe(1);
    expect(totals.decided).toBe(230);
    expect(totals.suppliesAny).toBe(true);
    expect(totals.markets[0].market).toBe("GB");
  });

  it("reports a market whose rows were all set aside as not supplying", () => {
    const totals = summariseCoverage([
      row({
        market: "AU",
        mapped: 0,
        awaiting_review: 0,
        no_counterpart: 0,
        bulk_listing: 0,
        supplier_no_price: 80,
        supplies_prices: false,
      }),
    ]);
    expect(totals.suppliesAny).toBe(false);
    expect(totals.decided).toBe(80);
  });

  it("says plainly when nothing is tied to a material", () => {
    expect(
      coverageSentence(row({ mapped: 0, supplies_prices: false })),
    ).toContain("none tied to a material");
    expect(coverageSentence(row())).toContain("1 tied to a material");
  });

  it("groups set-aside rows by reason, largest first", () => {
    const groups = groupReasons([
      {
        match_status: "no_counterpart",
        rejection_reason: "the GB catalogue prices no cement",
      },
      {
        match_status: "no_counterpart",
        rejection_reason: "the GB catalogue prices no cement",
      },
      {
        match_status: "bulk_listing",
        rejection_reason:
          "multi-buy or bulk pack, so a per-unit price would have to be invented",
      },
      { match_status: "no_counterpart", rejection_reason: null },
    ]);
    expect(groups[0].count).toBe(2);
    expect(groups).toHaveLength(2);
  });

  it("uses no em dashes in what it prints", () => {
    [row(), row({ mapped: 0, supplies_prices: false })].forEach((r) =>
      expect(coverageSentence(r)).not.toContain("—"),
    );
  });
});
