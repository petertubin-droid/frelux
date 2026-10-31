import { describe, expect, it } from "vitest";
import {
  computeTotals,
  editBlockedReason,
  isEditable,
  requiresResend,
  statusAfterEdit,
  totalsDrift,
} from "./totals";

describe("quote totals", () => {
  it("adds the cost lines and applies markup to the subtotal", () => {
    const totals = computeTotals({
      materials: 120_000,
      labour: 80_000,
      transport: 15_000,
      misc: 5_000,
      markupPercentage: 15,
    });
    expect(totals.subtotal).toBe(220_000);
    expect(totals.markupAmount).toBe(33_000);
    expect(totals.grandTotal).toBe(253_000);
  });

  it("treats missing or non numeric input as zero rather than guessing", () => {
    const totals = computeTotals({
      materials: Number.NaN,
      labour: 0,
      transport: 0,
      misc: 0,
      markupPercentage: Number.NaN,
    });
    expect(totals).toEqual({ subtotal: 0, markupAmount: 0, grandTotal: 0 });
  });

  it("keeps money to two decimal places", () => {
    const totals = computeTotals({
      materials: 10,
      labour: 0,
      transport: 0,
      misc: 0,
      markupPercentage: 7.5,
    });
    expect(totals.markupAmount).toBe(0.75);
    expect(totals.grandTotal).toBe(10.75);
  });

  it("allows a zero markup and a negative markup", () => {
    expect(
      computeTotals({
        materials: 100,
        labour: 0,
        transport: 0,
        misc: 0,
        markupPercentage: 0,
      }).grandTotal,
    ).toBe(100);
    expect(
      computeTotals({
        materials: 100,
        labour: 0,
        transport: 0,
        misc: 0,
        markupPercentage: -10,
      }).grandTotal,
    ).toBe(90);
  });
});

describe("editing rules", () => {
  it("locks an approved quote and leaves everything else editable", () => {
    expect(editBlockedReason("approved")).toBe("approved");
    expect(isEditable("approved")).toBe(false);
    for (const status of [
      "draft",
      "sent",
      "viewed",
      "changes_requested",
      "expired",
    ] as const) {
      expect(isEditable(status)).toBe(true);
      expect(editBlockedReason(status)).toBeNull();
    }
  });

  it("sends an edited quote back to draft once the client has seen it", () => {
    expect(statusAfterEdit("sent")).toBe("draft");
    expect(statusAfterEdit("viewed")).toBe("draft");
    expect(requiresResend("sent")).toBe(true);
    expect(requiresResend("viewed")).toBe(true);
  });

  it("leaves a draft, a requested change or a lapse alone", () => {
    expect(statusAfterEdit("draft")).toBe("draft");
    expect(statusAfterEdit("changes_requested")).toBe("changes_requested");
    expect(statusAfterEdit("expired")).toBe("expired");
    expect(requiresResend("draft")).toBe(false);
    expect(requiresResend("changes_requested")).toBe(false);
  });
});

describe("totals drift", () => {
  const base = {
    materials_cost: 100,
    labour_cost: 50,
    transport_cost: 0,
    misc_cost: 0,
    markup_percentage: 10,
  };

  it("reports zero when the stored total matches its inputs", () => {
    expect(totalsDrift({ ...base, grand_total: 165 })).toBe(0);
  });

  it("reports the difference when a stored total has drifted", () => {
    expect(totalsDrift({ ...base, grand_total: 200 })).toBe(35);
  });
});
