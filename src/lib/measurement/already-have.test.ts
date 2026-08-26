import { describe, it, expect } from "vitest";
import {
  QUANTITY_TYPE_LABELS,
  createQuantityBreakdown,
  createAlreadyHaveInventory,
  setAlreadyHave,
  getAlreadyHaveQuantity,
  removeAlreadyHave,
  getAlreadyHaveEntries,
  inventoryToMap,
  quantityBreakdownToText,
  type QuantityType,
} from "./already-have";

describe("measurement/already-have", () => {
  it("QUANTITY_TYPE_LABELS has all types", () => {
    expect(QUANTITY_TYPE_LABELS.exact).toBeTruthy();
    expect(QUANTITY_TYPE_LABELS.purchase).toBeTruthy();
    expect(QUANTITY_TYPE_LABELS.already_have).toBeTruthy();
    expect(QUANTITY_TYPE_LABELS.buy).toBeTruthy();
  });

  it("createQuantityBreakdown calculates all levels", () => {
    const bd = createQuantityBreakdown(10, 10, 3, "buckets");
    expect(bd.exactQuantity).toBe(10);
    expect(bd.wastePercent).toBe(10);
    expect(bd.quantityWithWaste).toBe(11);
    expect(bd.purchaseQuantity).toBe(11);
    expect(bd.alreadyHaveQuantity).toBe(3);
    expect(bd.buyQuantity).toBe(8);
    expect(bd.hasEnough).toBe(false);
    expect(bd.quantityUnit).toBe("buckets");
  });

  it("createQuantityBreakdown handles enough stock", () => {
    const bd = createQuantityBreakdown(5, 10, 10, "bags");
    expect(bd.purchaseQuantity).toBe(6); // 5 * 1.1 = 5.5 → ceil 6
    expect(bd.hasEnough).toBe(true);
    expect(bd.buyQuantity).toBe(0);
  });

  it("createQuantityBreakdown handles zero waste", () => {
    const bd = createQuantityBreakdown(10, 0, 0, "units");
    expect(bd.quantityWithWaste).toBe(10);
    expect(bd.purchaseQuantity).toBe(10);
  });

  it("createQuantityBreakdown calculates surplus", () => {
    const bd = createQuantityBreakdown(5, 0, 10, "units");
    expect(bd.surplus).toBe(5);
  });

  it("createAlreadyHaveInventory returns empty", () => {
    const inv = createAlreadyHaveInventory();
    expect(inv.entries.size).toBe(0);
  });

  it("setAlreadyHave adds entry", () => {
    const inv = createAlreadyHaveInventory();
    const updated = setAlreadyHave(inv, "m1", "Cement", 5, "bags");
    expect(updated.entries.size).toBe(1);
    expect(inv.entries.size).toBe(0); // immutable
  });

  it("setAlreadyHave updates existing entry", () => {
    const inv = createAlreadyHaveInventory();
    let updated = setAlreadyHave(inv, "m1", "Cement", 5, "bags");
    updated = setAlreadyHave(updated, "m1", "Cement", 10, "bags");
    expect(updated.entries.get("m1")?.quantity).toBe(10);
  });

  it("getAlreadyHaveQuantity returns 0 for missing material", () => {
    const inv = createAlreadyHaveInventory();
    expect(getAlreadyHaveQuantity(inv, "nonexistent")).toBe(0);
  });

  it("getAlreadyHaveQuantity returns stored quantity", () => {
    const inv = setAlreadyHave(
      createAlreadyHaveInventory(),
      "m1",
      "Cement",
      5,
      "bags",
    );
    expect(getAlreadyHaveQuantity(inv, "m1")).toBe(5);
  });

  it("removeAlreadyHave removes entry", () => {
    let inv = setAlreadyHave(
      createAlreadyHaveInventory(),
      "m1",
      "Cement",
      5,
      "bags",
    );
    inv = removeAlreadyHave(inv, "m1");
    expect(inv.entries.size).toBe(0);
  });

  it("getAlreadyHaveEntries returns array", () => {
    let inv = setAlreadyHave(createAlreadyHaveInventory(), "m1", "A", 1, "u");
    inv = setAlreadyHave(inv, "m2", "B", 2, "u");
    const entries = getAlreadyHaveEntries(inv);
    expect(entries.length).toBe(2);
  });

  it("inventoryToMap converts to Map", () => {
    let inv = setAlreadyHave(createAlreadyHaveInventory(), "m1", "A", 5, "u");
    const map = inventoryToMap(inv);
    expect(map.get("m1")).toBe(5);
  });

  it("quantityBreakdownToText generates readable output", () => {
    const bd = createQuantityBreakdown(10, 10, 3, "buckets");
    const text = quantityBreakdownToText(bd);
    expect(text).toContain("QUANTITY BREAKDOWN");
    expect(text).toContain("Exact");
    expect(text).toContain("Purchase");
    expect(text).toContain("Already have");
    expect(text).toContain("Buy");
  });

  it('quantityBreakdownToText shows "enough" when hasEnough', () => {
    const bd = createQuantityBreakdown(5, 10, 10, "bags");
    const text = quantityBreakdownToText(bd);
    expect(text).toContain("enough");
  });
});
