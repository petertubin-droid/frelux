/**
 * Diaspora tracker: role matrix and budget arithmetic.
 *
 * These are the rules that decide who may approve money and who may confirm a
 * milestone. They are tested here because a wrong answer in this file is a
 * financial control failure, not a cosmetic bug.
 */
import { describe, expect, it } from "vitest";
import {
  can,
  deliveryDiscrepancy,
  DENIAL_REASONS,
  summariseBudget,
  type ExpenseRecord,
} from "./permissions";

const expense = (over: Partial<ExpenseRecord> = {}): ExpenseRecord => ({
  id: Math.random().toString(36).slice(2),
  category: "Materials",
  name: "Cement",
  amount: 100000,
  currency: "NGN",
  spent_at: "2026-10-01",
  status: "submitted",
  receipt_path: null,
  recipient: "Supplier",
  decision_note: null,
  ...over,
});

describe("role matrix", () => {
  it("lets only the owner approve expenditure", () => {
    expect(can("owner", "approve_expense")).toBe(true);
    for (const role of ["site_manager", "contractor", "inspector"] as const) {
      expect(can(role, "approve_expense")).toBe(false);
    }
  });

  it("lets the owner and an inspector decide a milestone, not the contractor", () => {
    expect(can("owner", "decide_milestone")).toBe(true);
    expect(can("inspector", "decide_milestone")).toBe(true);
    expect(can("site_manager", "decide_milestone")).toBe(false);
    expect(can("contractor", "decide_milestone")).toBe(false);
  });

  it("lets a contractor raise an expense but not invite anyone", () => {
    expect(can("contractor", "submit_expense")).toBe(true);
    expect(can("contractor", "upload_invoice")).toBe(true);
    expect(can("contractor", "invite_participants")).toBe(false);
    expect(can("contractor", "manage_permissions")).toBe(false);
  });

  it("lets the site manager report and record materials but not approve", () => {
    expect(can("site_manager", "submit_daily_report")).toBe(true);
    expect(can("site_manager", "record_materials")).toBe(true);
    expect(can("contractor", "submit_daily_report")).toBe(false);
    expect(can("site_manager", "approve_expense")).toBe(false);
  });

  it("denies everything to somebody with no role on the project", () => {
    expect(can(null, "view_project")).toBe(false);
    expect(can(undefined, "submit_expense")).toBe(false);
  });

  it("explains the important denials rather than failing silently", () => {
    expect(DENIAL_REASONS.approve_expense).toMatch(/owner/i);
    expect(DENIAL_REASONS.decide_milestone).toMatch(/inspector/i);
  });
});

describe("budget summary", () => {
  it("never counts a pending expense as spent", () => {
    const summary = summariseBudget(1000000, [
      expense({ amount: 200000, status: "approved" }),
      expense({ amount: 300000, status: "submitted" }),
    ]);
    expect(summary.approved).toBe(200000);
    expect(summary.pending).toBe(300000);
    expect(summary.remaining).toBe(800000);
    // Variance nets the pending commitment, so an owner sees the exposure.
    expect(summary.variance).toBe(500000);
  });

  it("ignores rejected expenses entirely", () => {
    const summary = summariseBudget(500000, [
      expense({ amount: 100000, status: "approved" }),
      expense({ amount: 900000, status: "rejected" }),
    ]);
    expect(summary.approved).toBe(100000);
    expect(summary.pending).toBe(0);
    expect(summary.remaining).toBe(400000);
  });

  it("reports an overrun as a negative variance rather than hiding it", () => {
    const summary = summariseBudget(100000, [
      expense({ amount: 150000, status: "approved" }),
    ]);
    expect(summary.variance).toBe(-50000);
    expect(summary.committed_percent).toBe(100);
  });

  it("refuses to add a second currency into the total", () => {
    const summary = summariseBudget(1000000, [
      expense({ amount: 100000, status: "approved", currency: "NGN" }),
      expense({ amount: 5000, status: "approved", currency: "GBP" }),
    ]);
    expect(summary.approved).toBe(100000);
    expect(summary.excluded_currencies).toEqual(["GBP"]);
  });

  it("reports an unset budget as not set instead of zero", () => {
    const summary = summariseBudget(null, [expense({ status: "approved" })]);
    expect(summary.budget).toBeNull();
    expect(summary.remaining).toBeNull();
    expect(summary.approved).toBe(100000);
  });

  it("breaks cost down by category", () => {
    const summary = summariseBudget(1000000, [
      expense({ amount: 50000, status: "approved", category: "Labour" }),
      expense({ amount: 20000, status: "submitted", category: "Labour" }),
      expense({ amount: 30000, status: "approved", category: "Materials" }),
    ]);
    expect(summary.by_stage[0]).toEqual({ category: "Labour", approved: 50000, pending: 20000 });
  });
});

describe("delivery discrepancy", () => {
  it("flags a shortfall", () => {
    const check = deliveryDiscrepancy({
      quantity_ordered: 500,
      quantity_delivered: 450,
      quantity_accepted: 450,
    });
    expect(check.shortfall).toBe(50);
    expect(check.has_issue).toBe(true);
  });

  it("flags rejected material separately from a shortfall", () => {
    const check = deliveryDiscrepancy({
      quantity_ordered: 500,
      quantity_delivered: 500,
      quantity_accepted: 480,
    });
    expect(check.shortfall).toBe(0);
    expect(check.rejected).toBe(20);
    expect(check.has_issue).toBe(true);
  });

  it("reports no issue when the full order is accepted", () => {
    const check = deliveryDiscrepancy({
      quantity_ordered: 500,
      quantity_delivered: 500,
      quantity_accepted: 500,
    });
    expect(check.has_issue).toBe(false);
  });
});
