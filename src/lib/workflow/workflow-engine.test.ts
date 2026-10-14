import { describe, it, expect } from "vitest";
import {
  canTransition,
  nextStatuses,
  transitionError,
  referenceCode,
  isOverdue,
  changeOrderImpact,
  summarize,
  type WorkflowStatus,
} from "./workflow-engine";

describe("workflow-engine state machine", () => {
  it("routes an RFI draft → open → answered → closed", () => {
    expect(canTransition("rfi", "draft", "open")).toBe(true);
    expect(canTransition("rfi", "open", "answered")).toBe(true);
    expect(canTransition("rfi", "answered", "closed")).toBe(true);
  });

  it("refuses illegal RFI jumps with an actionable error", () => {
    expect(canTransition("rfi", "draft", "closed")).toBe(false);
    expect(transitionError("rfi", "draft", "closed")).toMatch(/Allowed: open/);
    // same-state transition is refused, not a no-op
    expect(canTransition("rfi", "open", "open")).toBe(false);
    expect(transitionError("rfi", "open", "open")).toMatch(/already/);
  });

  it("keeps terminal states terminal", () => {
    expect(nextStatuses("rfi", "closed")).toEqual([]);
    expect(nextStatuses("change_order", "closed")).toEqual([]);
    expect(transitionError("rfi", "closed", "open")).toMatch(/terminal/i);
  });

  it("supports the submittal revise-and-resubmit cycle", () => {
    expect(canTransition("submittal", "in_review", "rejected")).toBe(true);
    expect(canTransition("submittal", "rejected", "in_review")).toBe(true);
    expect(canTransition("submittal", "rejected", "approved")).toBe(false);
  });

  it("gives change orders an approval path but no shortcut", () => {
    expect(canTransition("change_order", "open", "in_review")).toBe(true);
    expect(canTransition("change_order", "in_review", "approved")).toBe(true);
    // no skipping review
    expect(canTransition("change_order", "open", "approved")).toBe(false);
  });

  it("lists only valid next statuses for UI buttons", () => {
    expect(nextStatuses("change_order", "in_review")).toEqual([
      "approved",
      "rejected",
    ]);
    expect(nextStatuses("rfi", "open")).toEqual(["answered", "closed"]);
  });
});

describe("workflow-engine reference codes", () => {
  it("formats deterministic per-type prefixes", () => {
    expect(referenceCode("rfi", 1)).toBe("RFI-0001");
    expect(referenceCode("submittal", 27)).toBe("SUB-0027");
    expect(referenceCode("change_order", 412)).toBe("CO-0412");
  });
});

describe("workflow-engine overdue math", () => {
  const now = "2026-10-14T10:00:00Z";
  it("marks past-due active items overdue", () => {
    expect(isOverdue("2026-10-10", "open", now)).toBe(true);
    expect(isOverdue("2026-10-14", "open", now)).toBe(false); // due today
    expect(isOverdue("2026-10-20", "open", now)).toBe(false);
    expect(isOverdue(null, "open", now)).toBe(false);
  });
  it("never flags closed/approved/rejected items", () => {
    for (const s of ["closed", "approved", "rejected"] as WorkflowStatus[]) {
      expect(isOverdue("2020-01-01", s, now)).toBe(false);
    }
  });
});

describe("workflow-engine change-order impact", () => {
  const co = (status: WorkflowStatus, amount: number) => ({
    doc_type: "change_order" as const,
    status,
    amount,
  });
  it("separates approved from in-flight totals, currency-agnostic", () => {
    const impact = changeOrderImpact([
      co("approved", 1000),
      co("in_review", 250),
      co("open", 75),
      { doc_type: "change_order", status: "draft", amount: 500 },
      { doc_type: "rfi", status: "open", amount: 999 },
    ]);
    expect(impact).toEqual({
      approvedTotal: 1000,
      pendingTotal: 325,
      count: 4, // draft counts as a CO row, but not in either total
    });
  });
});

describe("workflow-engine summary", () => {
  const now = "2026-10-14T10:00:00Z";
  it("counts active items by type and overdue", () => {
    const s = summarize(
      [
        { doc_type: "rfi", status: "open", due_date: "2026-10-10" },
        { doc_type: "rfi", status: "answered", due_date: null },
        { doc_type: "submittal", status: "approved", due_date: "2020-01-01" },
        {
          doc_type: "change_order",
          status: "in_review",
          due_date: "2026-11-01",
        },
        { doc_type: "change_order", status: "closed", due_date: null },
      ],
      now,
    );
    expect(s.rfiOpen).toBe(2);
    expect(s.submittalOpen).toBe(0);
    expect(s.changeOrderOpen).toBe(1);
    expect(s.overdue).toBe(1);
    expect(s.needsAction).toBe(3);
  });
});
