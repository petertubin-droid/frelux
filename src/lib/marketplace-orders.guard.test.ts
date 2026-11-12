import { describe, it, expect, vi } from "vitest";

/**
 * What the order helpers are willing to send.
 *
 * The database trigger is the real authority on who may move an order where; these
 * assertions cover the client half, which must not offer a status the marketplace
 * has no meaning for, nor smuggle extra columns into a status update.
 */

const calls: { method: string; args: unknown[] }[] = [];

function chainable(): Record<string, unknown> {
  const proxy: Record<string, unknown> = {};
  for (const method of ["select", "eq", "update", "insert", "order", "range"]) {
    proxy[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return proxy;
    };
  }
  proxy.single = async () => ({
    data: { id: "order-1", status: "in_progress" },
    error: null,
  });
  proxy.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
  return proxy;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => chainable()),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
  isSupabaseConfigured: true,
}));

const { updateOrderStatus, submitOrderReview, ORDER_STATUSES } = await import(
  "./marketplace"
);

describe("order status updates", () => {
  it("refuses a status the marketplace does not have", async () => {
    calls.length = 0;
    await expect(
      updateOrderStatus("order-1", "paid" as never),
    ).rejects.toThrow(/Unknown order status/);
    expect(calls.some((c) => c.method === "update")).toBe(false);
  });

  it("refuses to smuggle other columns into a status change", async () => {
    calls.length = 0;
    await expect(
      updateOrderStatus("order-1", "completed", {
        agreed_price: 1,
      }),
    ).rejects.toThrow(/agreed_price/);
    // The attempt must not reach the database at all.
    expect(calls.some((c) => c.method === "update")).toBe(false);
  });

  it("sends a permitted status with a permitted extra field", async () => {
    calls.length = 0;
    await updateOrderStatus("order-1", "cancelled", {
      cancel_reason: "Client changed the scope",
    });
    const update = calls.find((c) => c.method === "update");
    expect(update?.args[0]).toMatchObject({
      status: "cancelled",
      cancel_reason: "Client changed the scope",
    });
  });

  it("knows every status the order table allows", () => {
    expect([...ORDER_STATUSES]).toEqual([
      "pending_start",
      "in_progress",
      "client_review",
      "completed",
      "disputed",
      "cancelled",
    ]);
  });
});

describe("order reviews", () => {
  it("refuses a rating outside 1 to 5", async () => {
    await expect(
      submitOrderReview("order-1", "client", 0, "fine"),
    ).rejects.toThrow(/1 to 5/);
    await expect(
      submitOrderReview("order-1", "client", 4.5, "fine"),
    ).rejects.toThrow(/1 to 5/);
  });

  it("writes only the side the caller is on", async () => {
    calls.length = 0;
    await submitOrderReview("order-1", "client", 5, "  Good work  ");
    const update = calls.find((c) => c.method === "update");
    const payload = update?.args[0] as Record<string, unknown>;
    expect(payload.client_rating).toBe(5);
    expect(payload.client_review).toBe("Good work");
    // The pro's review of the client is not the client's to write.
    expect(payload.pro_rating).toBeUndefined();
    expect(payload.pro_review).toBeUndefined();
  });
});
