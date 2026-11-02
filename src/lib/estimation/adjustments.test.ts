import { describe, it, expect } from "vitest";
import {
  createAdjustmentRecord,
  hasAdjustments,
  getAdjustedItems,
} from "./adjustments";

describe("estimation/adjustments", () => {
  it("createAdjustmentRecord builds correct object", () => {
    const rec = createAdjustmentRecord(
      "est-1",
      "item-1",
      "price",
      100,
      150,
      "Price correction",
    );
    expect(rec.estimate_id).toBe("est-1");
    expect(rec.item_id).toBe("item-1");
    expect(rec.field_name).toBe("price");
    expect(rec.original_value).toBe(100);
    expect(rec.adjusted_value).toBe(150);
    expect(rec.reason).toBe("Price correction");
  });

  it("createAdjustmentRecord handles null item_id", () => {
    const rec = createAdjustmentRecord(
      "est-1",
      null,
      "total",
      50,
      75,
      "Manual override",
    );
    expect(rec.item_id).toBeNull();
  });

  it("hasAdjustments returns false for empty array", () => {
    expect(hasAdjustments([])).toBe(false);
  });

  it("hasAdjustments returns false when all are none", () => {
    expect(
      hasAdjustments([
        { adjustment_status: "none" },
        { adjustment_status: "none" },
      ]),
    ).toBe(false);
  });

  it("hasAdjustments returns true when any non-none status", () => {
    expect(
      hasAdjustments([
        { adjustment_status: "none" },
        { adjustment_status: "manual" },
      ]),
    ).toBe(true);
  });

  it("hasAdjustments ignores empty string status", () => {
    expect(hasAdjustments([{ adjustment_status: "  " }])).toBe(false);
  });

  it("getAdjustedItems filters to only adjusted items", () => {
    const items = [
      { id: 1, adjustment_status: "none" },
      { id: 2, adjustment_status: "manual" },
      { id: 3, adjustment_status: "none" },
      { id: 4, adjustment_status: "override" },
    ];
    const adjusted = getAdjustedItems(items);
    expect(adjusted.length).toBe(2);
    expect(adjusted[0].id).toBe(2);
    expect(adjusted[1].id).toBe(4);
  });

  it("getAdjustedItems returns empty for empty input", () => {
    expect(getAdjustedItems([])).toEqual([]);
  });
});
