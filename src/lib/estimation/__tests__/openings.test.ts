// =========================================================
// SHARED OPENINGS MODEL
//
// The point of these tests is that one door deducts the same area in every
// calculator, and that a schedule with a small toilet window and a large living
// room window is representable without inventing a category.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  defaultOpeningGroups,
  netAreaAfterOpenings,
  normaliseOpenings,
  openingConventionForMarket,
  openingDefaultsForMarket,
  openingTotals,
  tradeDeduction,
  type OpeningGroup,
} from "../openings";

describe("normaliseOpenings", () => {
  it("keeps several size groups in one category", () => {
    const { groups } = normaliseOpenings([
      {
        category: "window",
        label: "Living room",
        widthMm: 1800,
        heightMm: 1500,
        count: 4,
      },
      {
        category: "window",
        label: "Toilet",
        widthMm: 600,
        heightMm: 600,
        count: 18 - 4,
      },
    ]);
    expect(groups).toHaveLength(2);
    expect(openingTotals(groups).byCategory.window.count).toBe(18);
  });

  it("reads the legacy metre-based build-to-roof shape when told it is metres", () => {
    const { groups } = normaliseOpenings(
      [
        { type: "door", width: 0.9, height: 2.1, count: 4 },
        { type: "window", width: 1.2, height: 1.2, count: 6 },
      ],
      { metres: true },
    );
    expect(groups[0]).toMatchObject({
      category: "internal_door",
      widthMm: 900,
      heightMm: 2100,
      count: 4,
    });
    expect(groups[1]).toMatchObject({
      category: "window",
      widthMm: 1200,
      heightMm: 1200,
      count: 6,
    });
  });

  it("treats a bare door as internal and a security door as entrance", () => {
    const { groups } = normaliseOpenings([
      { type: "door", widthMm: 800, heightMm: 2000, count: 3 },
      { type: "security_door", widthMm: 1000, heightMm: 2100, count: 1 },
    ]);
    expect(groups.map((g) => g.category)).toEqual([
      "internal_door",
      "entrance_door",
    ]);
  });

  it("clamps impossible sizes and says so", () => {
    const { groups, warnings } = normaliseOpenings([
      { category: "window", widthMm: 9000, heightMm: 50, count: 900 },
    ]);
    expect(groups[0].widthMm).toBe(6000);
    expect(groups[0].heightMm).toBe(200);
    expect(groups[0].count).toBe(500);
    expect(warnings.length).toBeGreaterThanOrEqual(3);
  });

  it("drops entries with no usable dimensions rather than counting them as zero", () => {
    const { groups } = normaliseOpenings([
      { category: "window", widthMm: 0, heightMm: 1200, count: 2 },
      { category: "window", widthMm: 1200, heightMm: 1200, count: 0 },
    ]);
    expect(groups).toHaveLength(0);
  });

  it("survives a non-array input", () => {
    expect(normaliseOpenings(undefined).groups).toEqual([]);
    expect(normaliseOpenings({ width: 1 } as never).groups).toEqual([]);
  });
});

describe("openingTotals", () => {
  it("totals area and count per category and overall", () => {
    const groups: OpeningGroup[] = [
      { category: "window", widthMm: 1800, heightMm: 1500, count: 4 },
      { category: "window", widthMm: 600, heightMm: 600, count: 14 },
      { category: "internal_door", widthMm: 750, heightMm: 2100, count: 4 },
      { category: "entrance_door", widthMm: 900, heightMm: 2100, count: 1 },
    ];
    const t = openingTotals(groups);
    expect(t.byCategory.window.count).toBe(18);
    expect(t.byCategory.window.areaM2).toBeCloseTo(4 * 2.7 + 14 * 0.36, 3);
    expect(t.byCategory.internal_door.count).toBe(4);
    expect(t.byCategory.entrance_door.count).toBe(1);
    expect(t.totalCount).toBe(23);
    expect(t.totalAreaM2).toBeCloseTo(10.8 + 5.04 + 6.3 + 1.89, 3);
  });

  it("reports reveal perimeter for trims and returns", () => {
    const t = openingTotals([
      { category: "window", widthMm: 1200, heightMm: 1200, count: 2 },
    ]);
    expect(t.revealPerimeterM).toBeCloseTo(2 * (2 * 1.2 + 1.2), 3);
  });
});

describe("tradeDeduction", () => {
  it("does not deduct an opening of 0.5 m2 or less", () => {
    const d = tradeDeduction([
      { category: "window", widthMm: 600, heightMm: 600, count: 3 },
    ]);
    expect(d.small).toBe(3);
    expect(d.deductionM2).toBe(0);
  });

  it("deducts 85% between 0.5 and 3 m2", () => {
    const d = tradeDeduction([
      { category: "window", widthMm: 1200, heightMm: 1200, count: 1 },
    ]);
    expect(d.partial).toBe(1);
    expect(d.deductionM2).toBeCloseTo(0.85 * 1.44, 3);
  });

  it("deducts in full above 3 m2 and adds the reveal back", () => {
    const d = tradeDeduction(
      [{ category: "window", widthMm: 2400, heightMm: 1500, count: 1 }],
      100,
    );
    expect(d.full).toBe(1);
    expect(d.deductionM2).toBeCloseTo(3.6, 3);
    expect(d.revealAdditionM2).toBeCloseTo((2 * 1.5 + 2.4) * 0.1, 3);
  });

  it("applies the same policy to doors as to windows", () => {
    const door = tradeDeduction([
      { category: "internal_door", widthMm: 900, heightMm: 2100, count: 1 },
    ]);
    const windowSameSize = tradeDeduction([
      { category: "window", widthMm: 900, heightMm: 2100, count: 1 },
    ]);
    expect(door.deductionM2).toBe(windowSameSize.deductionM2);
  });

  it("never returns a negative net area", () => {
    const { netAreaM2 } = netAreaAfterOpenings(5, [
      { category: "entrance_door", widthMm: 5000, heightMm: 3000, count: 4 },
    ]);
    expect(netAreaM2).toBe(0);
  });

  it("deducts in full under the structural policy, including small openings", () => {
    const groups = [
      { category: "window" as const, widthMm: 600, heightMm: 600, count: 2 },
      { category: "window" as const, widthMm: 1200, heightMm: 1200, count: 1 },
    ];
    const structural = netAreaAfterOpenings(20, groups, {
      policy: "structural",
    });
    const trade = netAreaAfterOpenings(20, groups, { policy: "trade" });
    // 2 x 0.36 + 1.44 = 2.16 m2 deducted in full structurally.
    expect(structural.deduction.deductionM2).toBeCloseTo(2.16, 3);
    expect(structural.netAreaM2).toBeCloseTo(17.84, 3);
    // The trade policy waives the small ones and takes 85% of the large one.
    expect(trade.deduction.deductionM2).toBeCloseTo(0.85 * 1.44, 3);
    expect(trade.netAreaM2).toBeGreaterThan(structural.netAreaM2);
  });
});

describe("regional defaults", () => {
  it("uses the market's own convention", () => {
    expect(openingConventionForMarket("US")).toBe("imperial_na");
    expect(openingConventionForMarket("GB")).toBe("metric_uk");
    expect(openingConventionForMarket("NG")).toBe("metric_ng");
    expect(openingConventionForMarket("AU")).toBe("metric_au");
    expect(openingConventionForMarket("IN")).toBe("metric_in");
    expect(openingConventionForMarket("DE")).toBe("metric_eu");
  });

  it("falls back rather than inventing a country", () => {
    expect(openingConventionForMarket(undefined)).toBe("metric_eu");
    expect(openingConventionForMarket("ZZ")).toBe("metric_eu");
  });

  it("gives a US entrance door 36 in and a UK internal door 2 ft 6 in", () => {
    expect(openingDefaultsForMarket("US").entrance_door.widthMm).toBe(914);
    expect(openingDefaultsForMarket("GB").internal_door.widthMm).toBe(762);
    expect(openingDefaultsForMarket("NG").internal_door.widthMm).toBe(750);
  });

  it("builds a starting schedule per market", () => {
    const groups = defaultOpeningGroups("US", {
      window: 18,
      internal_door: 4,
      entrance_door: 1,
    });
    expect(groups).toHaveLength(3);
    expect(openingTotals(groups).totalCount).toBe(23);
    expect(groups[2].widthMm).toBe(914);
  });

  it("omits a category with no count", () => {
    const groups = defaultOpeningGroups("GB", { window: 2, entrance_door: 1 });
    expect(groups.map((g) => g.category)).toEqual(["window", "entrance_door"]);
  });
});
