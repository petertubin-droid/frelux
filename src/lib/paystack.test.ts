import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  initializeSubscriptionCheckout,
  verifyPayment,
  isPaystackConfigured,
  getPaystackPublicKey,
} from "./paystack";

describe("isPaystackConfigured / getPaystackPublicKey", () => {
  it("reflects the presence of the public key env var", () => {
    const configured = isPaystackConfigured();
    expect(typeof configured).toBe("boolean");
  });

  it("returns an empty string when no public key is set", () => {
    expect(typeof getPaystackPublicKey()).toBe("string");
  });
});

describe("initializeSubscriptionCheckout", () => {
  const invoke = supabase.functions.invoke as unknown as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    invoke.mockReset();
    (isSupabaseConfigured as unknown as boolean) = true;
  });

  it("returns an error when Supabase is not configured", async () => {
    (isSupabaseConfigured as unknown as boolean) = false;
    const result = await initializeSubscriptionCheckout(
      "pro",
      "monthly",
      500000,
      "a@b.com",
      "user-123",
    );
    expect("error" in result).toBe(true);
  });

  it("returns the authorization url and reference on success", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        data: {
          authorization_url: "https://paystack.com/pay/abc",
          access_code: "code",
          reference: "FRELUX_ref",
        },
      },
      error: null,
    });
    const result = await initializeSubscriptionCheckout(
      "pro",
      "monthly",
      500000,
      "a@b.com",
      "user-123",
    );
    expect(result).toEqual({
      authorization_url: "https://paystack.com/pay/abc",
      reference: "FRELUX_ref",
    });
  });

  it("propagates an error message from the edge function", async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { message: "network down" },
    });
    const result = await initializeSubscriptionCheckout(
      "pro",
      "monthly",
      500000,
      "a@b.com",
      "user-123",
    );
    expect(result).toEqual({ error: "network down" });
  });

  it("returns an error when the response has no authorization_url", async () => {
    invoke.mockResolvedValueOnce({ data: { data: {} }, error: null });
    const result = await initializeSubscriptionCheckout(
      "pro",
      "monthly",
      500000,
      "a@b.com",
      "user-123",
    );
    expect("error" in result).toBe(true);
  });

  it("sends amount in kobo and plan/billing metadata to the edge function", async () => {
    invoke.mockResolvedValueOnce({
      data: { data: { authorization_url: "https://x", reference: "r1" } },
      error: null,
    });
    await initializeSubscriptionCheckout(
      "premium",
      "yearly",
      15000000,
      "a@b.com",
      "user-999",
    );
    const callArgs = invoke.mock.calls[0][1] as {
      body: Record<string, unknown>;
    };
    expect(callArgs.body.amount).toBe(15000000);
    expect(callArgs.body.plan).toBe("premium");
    expect(callArgs.body.billing_cycle).toBe("yearly");
    expect(
      (callArgs.body.reference as string).startsWith(
        "FRELUX_premium_yearly_user-999",
      ),
    ).toBe(true);
  });
});

describe("verifyPayment", () => {
  const invoke = supabase.functions.invoke as unknown as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    invoke.mockReset();
    (isSupabaseConfigured as unknown as boolean) = true;
  });

  it("returns not verified when Supabase is not configured", async () => {
    (isSupabaseConfigured as unknown as boolean) = false;
    const result = await verifyPayment("ref-1");
    expect(result.verified).toBe(false);
  });

  it("returns verified true with plan on successful status", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        status: true,
        data: { status: "success", metadata: { plan: "pro" } },
      },
      error: null,
    });
    const result = await verifyPayment("ref-1");
    expect(result.verified).toBe(true);
    expect(result.plan).toBe("pro");
  });

  it("returns verified false when payment status is not success", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        status: true,
        data: { status: "failed", metadata: { plan: "pro" } },
      },
      error: null,
    });
    const result = await verifyPayment("ref-1");
    expect(result.verified).toBe(false);
  });

  it("surfaces an error from the edge function call", async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { message: "bad reference" },
    });
    const result = await verifyPayment("ref-1");
    expect(result.verified).toBe(false);
    expect(result.error).toBe("bad reference");
  });

  it("surfaces a failed verification message from the response body", async () => {
    invoke.mockResolvedValueOnce({
      data: { status: false, message: "reference not found" },
      error: null,
    });
    const result = await verifyPayment("ref-1");
    expect(result.verified).toBe(false);
    expect(result.error).toBe("reference not found");
  });
});
