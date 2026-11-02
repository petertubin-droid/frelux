import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke, checkout } = vi.hoisted(() => ({
  invoke: vi.fn(),
  checkout: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({ select: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { payment_gateway: "paystack" }, error: null }) }) }) }),
    functions: { invoke },
  },
  getFunctionErrorMessage: async (error: unknown) =>
    error instanceof Error ? error.message : "Function error",
}));
vi.mock("@/lib/paystack", () => ({
  isPaystackConfigured: () => true,
  initializeSubscriptionCheckout: checkout,
}));

import { startSubscriptionCheckout } from "./gateway";

beforeEach(() => {
  invoke.mockReset();
  checkout.mockReset();
});

describe("hosted subscription checkout", () => {
  it("falls back to Flutterwave after Paystack rejects its key", async () => {
    checkout.mockResolvedValueOnce({ error: "Invalid key" });
    invoke.mockResolvedValueOnce({
      data: { authorization_url: "https://checkout.flutterwave.com/session" },
      error: null,
    });

    await expect(
      startSubscriptionCheckout("pro", "monthly", 500000, "user@example.com", "user-1"),
    ).resolves.toEqual({
      authorization_url: "https://checkout.flutterwave.com/session",
    });
    expect(invoke).toHaveBeenCalledWith("flutterwave-checkout", expect.objectContaining({
      body: expect.objectContaining({ plan_id: "pro", billing_cycle: "monthly", user_id: "user-1" }),
    }));
  });

  it("does not retry unrelated Paystack errors through another provider", async () => {
    checkout.mockResolvedValueOnce({ error: "Plan is not available" });
    await expect(
      startSubscriptionCheckout("pro", "monthly", 500000, "user@example.com", "user-1"),
    ).resolves.toEqual({ error: "Plan is not available" });
    expect(invoke).not.toHaveBeenCalled();
  });
});
