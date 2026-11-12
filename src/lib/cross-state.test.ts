import { describe, it, expect } from "vitest";
import {
  approvalForOrder,
  travelState,
  travelLabel,
  type TravelApproval,
} from "./cross-state";

const order = {
  id: "o1",
  status: "in_progress",
  client_id: "client-1",
  job_state: "Lagos",
  job_city: "Ikeja",
};

const approval = (over: Partial<TravelApproval> = {}): TravelApproval => ({
  id: "a1",
  seller_user_id: "pro-user-1",
  buyer_user_id: "client-1",
  job_state: "Lagos",
  approved_at: "2026-11-12T08:00:00Z",
  expires_at: "2026-11-26T08:00:00Z",
  note: null,
  ...over,
});

describe("cross state travel approvals", () => {
  it("matches an approval to the professional, client and state", () => {
    expect(approvalForOrder(order, "pro-user-1", [approval()])?.id).toBe("a1");
  });

  it("ignores an approval for a different state", () => {
    expect(
      approvalForOrder(order, "pro-user-1", [approval({ job_state: "Kano" })]),
    ).toBeNull();
  });

  it("ignores an approval meant for another client", () => {
    expect(
      approvalForOrder(order, "pro-user-1", [
        approval({ buyer_user_id: "someone-else" }),
      ]),
    ).toBeNull();
  });

  it("treats a client-wide approval as covering this order", () => {
    expect(
      approvalForOrder(order, "pro-user-1", [approval({ buyer_user_id: null })])
        ?.id,
    ).toBe("a1");
  });

  it("uses the newest approval when several exist", () => {
    const older = approval({ id: "old", approved_at: "2026-10-01T08:00:00Z" });
    const newer = approval({ id: "new", approved_at: "2026-11-11T08:00:00Z" });
    expect(
      approvalForOrder(order, "pro-user-1", [older, newer, older])?.id,
    ).toBe("new");
  });

  it("reads an expired approval as not covering the job", () => {
    const state = travelState(approval({ expires_at: "2026-11-01T08:00:00Z" }));
    expect(state).toBe("expired");
    expect(travelLabel(state)).toContain("Expired");
  });

  it("never reports an order without a professional as approved", () => {
    expect(approvalForOrder(order, null, [approval()])).toBeNull();
    expect(travelState(null)).toBe("missing");
  });

  it("treats an approval with no expiry as standing", () => {
    expect(travelState(approval({ expires_at: null }))).toBe("approved");
  });
});
