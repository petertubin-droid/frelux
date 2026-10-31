import { describe, expect, it } from "vitest";
import {
  orderStatusLabel,
  quoteTotals,
  requestStatusLabel,
  validateQuoteDraft,
} from "@/lib/suppliers/procurement";

describe("procurement arithmetic and wording", () => {
  it("adds line amounts and rounds money to the cent", () => {
    expect(
      quoteTotals({
        lines: [
          { quantity: 100, unit_rate: 9500.333 },
          { quantity: 3, unit_rate: 1200 },
        ],
        deliveryFee: 25000,
      }),
    ).toEqual({ subtotal: 953633.3, total: 978633.3 });
  });

  it("never produces a negative delivery total", () => {
    expect(
      quoteTotals({
        lines: [{ quantity: 2, unit_rate: 500 }],
        deliveryFee: -400,
      }),
    ).toEqual({
      subtotal: 1000,
      total: 1000,
    });
  });

  it("ignores a malformed rate instead of guessing", () => {
    expect(
      quoteTotals({
        lines: [{ quantity: 2, unit_rate: Number.NaN }],
        deliveryFee: 0,
      }),
    ).toEqual({
      subtotal: 0,
      total: 0,
    });
  });

  it("reads statuses as actions a person understands", () => {
    expect(orderStatusLabel("placed")).toBe("Placed");
    expect(orderStatusLabel("dispatched")).toBe("Dispatched");
    expect(orderStatusLabel("delivered")).toMatch(/delivered/i);
    expect(requestStatusLabel("awarded")).toMatch(/awarded/i);
  });

  it("refuses a quotation with no priceable line", () => {
    const problems = validateQuoteDraft({
      requestId: "req-1",
      supplierId: "sup-1",
      supplierUserId: "user-1",
      currency: "NGN",
      lines: [
        {
          request_item_id: "item-1",
          description: "Cement",
          unit: "bag",
          quantity: 10,
          unit_rate: 0,
        },
      ],
      deliveryFee: 0,
      leadTimeDays: null,
      validUntil: null,
      notes: null,
    });
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join(" ")).toMatch(/rate|price/i);
  });
});
