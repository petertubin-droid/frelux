import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock supabase-lazy with a configurable chainable client ──
vi.mock("@/lib/supabase-lazy", () => {
  const state = {
    data: null as unknown,
    error: null as unknown,
    fnError: null as unknown,
  };
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(() =>
      Promise.resolve({ data: state.data, error: state.error }),
    ),
    update: vi.fn(() => chain),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: state.data, error: state.error }).then(resolve),
  };
  const mockFrom = vi.fn(() => chain);
  const invoke = vi.fn(() =>
    state.fnError
      ? Promise.reject(state.fnError)
      : Promise.resolve({ data: state.data, error: state.error }),
  );
  return {
    getSupabase: vi.fn(() =>
      Promise.resolve({ from: mockFrom, functions: { invoke } }),
    ),
    isSupabaseConfigured: true,
    getFunctionErrorMessage: vi.fn(
      async () => "Edge function error (mocked)",
    ),
    _state: state,
    _mockFrom: mockFrom,
    _invoke: invoke,
  };
});

// ── Mock paystack config check ──
vi.mock("@/lib/paystack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/paystack")>();
  return { ...actual, isPaystackConfigured: vi.fn(() => true) };
});

import {
  formatNaira,
  getTokenPurchaseConfig,
  initializeTokenPurchase,
  verifyTokenPurchase,
  adminGetTokenPurchaseConfig,
  adminUpdateTokenPurchaseConfig,
} from "@/lib/token-purchase";
import * as supabaseLazy from "@/lib/supabase-lazy";

// The module is mocked above; reach into the mock's exported internals.
// Cast through unknown because the real module doesn't export these.
const { _state, _invoke } = supabaseLazy as unknown as {
  _state: {
    data: unknown;
    error: unknown;
    fnError: unknown;
  };
  _invoke: ReturnType<typeof vi.fn>;
};

const sampleConfig = {
  id: 1,
  token_amount: 50,
  price_kobo: 150000,
  is_enabled: true,
  updated_at: "2026-09-05T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  _state.data = null;
  _state.error = null;
  _state.fnError = null;
});

describe("formatNaira", () => {
  it("formats kobo as Naira", () => {
    expect(formatNaira(150000)).toBe("₦1,500");
    expect(formatNaira(200)).toBe("₦2");
  });
});

describe("getTokenPurchaseConfig", () => {
  it("returns the config when present", async () => {
    _state.data = sampleConfig;
    const cfg = await getTokenPurchaseConfig();
    expect(cfg).toEqual(sampleConfig);
  });

  it("returns null on error", async () => {
    _state.error = new Error("db down");
    expect(await getTokenPurchaseConfig()).toBeNull();
  });

  it("returns null when no row exists", async () => {
    _state.data = null;
    expect(await getTokenPurchaseConfig()).toBeNull();
  });
});

describe("initializeTokenPurchase", () => {
  it("returns the Paystack authorization URL on success", async () => {
    _state.data = {
      data: {
        authorization_url: "https://checkout.paystack.com/abc123",
        reference: "FRELUX_TOKENS_x1_123",
      },
    };
    const result = await initializeTokenPurchase("user@example.com", "user-1");
    expect(result.success).toBe(true);
    expect(result.authorizationUrl).toBe(
      "https://checkout.paystack.com/abc123",
    );
    expect(_invoke).toHaveBeenCalledWith("paystack-checkout", {
      body: {
        purpose: "token_purchase",
        email: "user@example.com",
        user_id: "user-1",
      },
    });
  });

  it("fails with an error when the edge function errors", async () => {
    _state.error = new Error("FunctionsHttpError");
    const result = await initializeTokenPurchase("user@example.com", "user-1");
    expect(result.success).toBe(false);
    expect(result.code).toBe("EDGE_ERROR");
  });

  it("fails when the response has no authorization_url", async () => {
    _state.data = { error: "Token purchases are not available" };
    const result = await initializeTokenPurchase("user@example.com", "user-1");
    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_RESPONSE");
  });

  it("fails gracefully on network error", async () => {
    _state.fnError = new Error("network down");
    const result = await initializeTokenPurchase("user@example.com", "user-1");
    expect(result.success).toBe(false);
    expect(result.code).toBe("NETWORK_ERROR");
  });
});

describe("verifyTokenPurchase", () => {
  it("verifies a successful token purchase", async () => {
    _state.data = {
      status: true,
      message: "50 tokens added to your balance",
      data: {
        purpose: "token_purchase",
        tokens_credited: 50,
        already_credited: false,
      },
    };
    const result = await verifyTokenPurchase("FRELUX_TOKENS_x1_123");
    expect(result.verified).toBe(true);
    expect(result.tokens).toBe(50);
    expect(result.alreadyCredited).toBe(false);
  });

  it("reports already-credited purchases without error", async () => {
    _state.data = {
      status: true,
      message: "Tokens were already credited for this payment",
      data: {
        purpose: "token_purchase",
        tokens_credited: 50,
        already_credited: true,
      },
    };
    const result = await verifyTokenPurchase("FRELUX_TOKENS_x1_123");
    expect(result.verified).toBe(true);
    expect(result.alreadyCredited).toBe(true);
  });

  it("is not verified for non-token transactions", async () => {
    _state.data = {
      status: true,
      data: { purpose: "subscription", plan: "pro" },
    };
    const result = await verifyTokenPurchase("FRELUX_pro_monthly_1");
    expect(result.verified).toBe(false);
  });

  it("handles a failed verification", async () => {
    _state.data = { status: false, message: "Payment abandoned" };
    const result = await verifyTokenPurchase("bad-ref");
    expect(result.verified).toBe(false);
    expect(result.error).toContain("abandoned");
  });
});

describe("admin token purchase config", () => {
  it("adminGetTokenPurchaseConfig returns the config", async () => {
    _state.data = sampleConfig;
    expect(await adminGetTokenPurchaseConfig()).toEqual(sampleConfig);
  });

  it("adminUpdateTokenPurchaseConfig returns true when the update succeeds", async () => {
    _state.error = null;
    const ok = await adminUpdateTokenPurchaseConfig({
      token_amount: 100,
      price_kobo: 250000,
    });
    expect(ok).toBe(true);
  });

  it("adminUpdateTokenPurchaseConfig returns false on error", async () => {
    _state.error = new Error("rls denied");
    const ok = await adminUpdateTokenPurchaseConfig({ token_amount: 10 });
    expect(ok).toBe(false);
  });
});
