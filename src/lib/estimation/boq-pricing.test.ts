import { describe, expect, it } from "vitest";
import { priceBoq } from "./boq-pricing";

const boq = [
  { code: "A", description: "Blocks", quantity: 10, unit: "m2" },
  { code: "B", description: "Concrete", quantity: 2, unit: "m3" },
  { code: "C", description: "Bracing", quantity: 4, unit: "units" },
];

describe("priceBoq", () => {
  it("prices lines from the map and totals only priced lines", () => {
    const r = priceBoq(boq, { A: 5, B: 100 });
    expect(r.lines[0].line_total).toBe(50);
    expect(r.lines[1].line_total).toBe(200);
    expect(r.priced_subtotal).toBe(250);
    expect(r.complete).toBe(false);
  });

  it("lists unpriced codes instead of inventing a price", () => {
    const r = priceBoq(boq, { A: 5 });
    expect(r.unpriced).toEqual(["B", "C"]);
    expect(r.lines[1].unit_price).toBeNull();
    expect(r.lines[1].line_total).toBeNull();
    expect(r.unpriced_lines_count).toBe(2);
  });

  it("treats null, negative and non-finite prices as unpriced", () => {
    const r = priceBoq(boq, { A: null, B: -3, C: Number.NaN });
    expect(r.unpriced).toEqual(["A", "B", "C"]);
    expect(r.priced_subtotal).toBe(0);
  });

  it("is complete only when every line carries a price", () => {
    const r = priceBoq(boq, { A: 1, B: 1, C: 1 });
    expect(r.complete).toBe(true);
    expect(r.unpriced).toEqual([]);
  });

  it("never prices anything without a map", () => {
    const r = priceBoq(boq, null);
    expect(r.priced_subtotal).toBe(0);
    expect(r.unpriced).toHaveLength(3);
  });

  it("rounds money to 2 dp", () => {
    const r = priceBoq(
      [{ code: "A", description: "x", quantity: 3, unit: "m2" }],
      { A: 0.335 },
    );
    expect(r.lines[0].line_total).toBe(1.01);
  });
});
