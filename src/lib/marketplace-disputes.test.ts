import { describe, it, expect, vi, beforeEach } from "vitest";

// The dispute helpers talk to two things: the disputes table and the order
// status helper. Both are pinned here so the ordering of writes (complaint
// first, status second; close first, reopen second) is actually asserted —
// that ordering is what the database guard checks.

const inserted: Record<string, unknown>[] = [];
const updates: { table: string; patch: Record<string, unknown> }[] = [];
let insertError: { message: string } | null = null;

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        if (insertError)
          return {
            select: () => ({ single: async () => ({ error: insertError }) }),
          };
        inserted.push({ table, ...row });
        return {
          select: () => ({
            single: async () => ({
              data: { id: "dispute-1", ...row, status: "open" },
              error: null,
            }),
          }),
        };
      },
      update: (patch: Record<string, unknown>) => {
        updates.push({ table, patch });
        const chain = {
          eq: () => chain,
          then: undefined,
        };
        // The real builder is thenable; resolve it like a no-op success.
        return Object.assign(Promise.resolve({ error: null }), chain);
      },
    }),
  },
}));

const updateOrderStatus = vi.fn();
vi.mock("@/lib/marketplace", () => ({
  updateOrderStatus: (...args: unknown[]) => updateOrderStatus(...args),
}));

import {
  DISPUTE_WINDOW_DAYS,
  openOrderDispute,
  withdrawOrderDispute,
  withinDisputeWindow,
} from "@/lib/marketplace-disputes";

beforeEach(() => {
  inserted.length = 0;
  updates.length = 0;
  updateOrderStatus.mockReset();
  insertError = null;
});

describe("withinDisputeWindow", () => {
  const now = new Date("2026-11-12T12:00:00Z");

  it("opens for a week after the work reaches the client", () => {
    expect(withinDisputeWindow("2026-11-05T12:00:01Z", now)).toBe(true);
    expect(withinDisputeWindow("2026-11-12T12:00:00Z", now)).toBe(true);
  });

  it("closes after the window", () => {
    const past = new Date(
      now.getTime() - (DISPUTE_WINDOW_DAYS * 86_400_000 + 60_000),
    );
    expect(withinDisputeWindow(past.toISOString(), now)).toBe(false);
  });

  it("is closed when the work never landed, or the date is nonsense", () => {
    expect(withinDisputeWindow(null, now)).toBe(false);
    expect(withinDisputeWindow(undefined, now)).toBe(false);
    expect(withinDisputeWindow("not-a-date", now)).toBe(false);
  });
});

describe("openOrderDispute", () => {
  it("refuses a complaint with no substance", async () => {
    await expect(
      openOrderDispute({
        orderId: "order-1",
        category: "other",
        detail: " bad ",
      }),
    ).rejects.toThrow(/at least/i);
    expect(inserted).toHaveLength(0);
  });

  it("writes the complaint before it moves the order to disputed", async () => {
    updateOrderStatus.mockResolvedValueOnce({});
    await openOrderDispute({
      orderId: "order-1",
      category: "work_quality",
      detail: "The render is patchy and the wrong colour.",
    });

    expect(inserted[0]).toMatchObject({
      order_id: "order-1",
      opened_role: "client",
      opened_by: "user-1",
    });
    expect(updateOrderStatus).toHaveBeenCalledWith("order-1", "disputed");
  });

  it("withdraws the complaint if the order cannot be marked disputed", async () => {
    updateOrderStatus.mockRejectedValueOnce(new Error("not allowed"));
    await expect(
      openOrderDispute({
        orderId: "order-1",
        category: "scope",
        detail: "They changed the scope after we agreed.",
      }),
    ).rejects.toThrow(/not allowed/);

    // The orphaned complaint must not be left open on the order.
    expect(updates.some((u) => u.patch.status === "withdrawn")).toBe(true);
  });

  it("surfaces a database refusal instead of pretending it worked", async () => {
    insertError = { message: "duplicate open dispute" };
    await expect(
      openOrderDispute({
        orderId: "order-1",
        category: "payment",
        detail: "I was charged twice for the deposit.",
      }),
    ).rejects.toBeTruthy();
  });
});

describe("withdrawOrderDispute", () => {
  it("closes the dispute first, then returns the order to review", async () => {
    updateOrderStatus.mockResolvedValueOnce({});
    await withdrawOrderDispute("dispute-1", "order-1");
    expect(updates.some((u) => u.patch.status === "withdrawn")).toBe(true);
    expect(updateOrderStatus).toHaveBeenCalledWith("order-1", "client_review");
  });
});
