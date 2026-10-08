import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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
    getFunctionErrorMessage: vi.fn(async () => "Edge function error (mocked)"),
    _state: state,
    _mockFrom: mockFrom,
    _invoke: invoke,
  };
});

// ── Mock gateway config so Flutterwave availability is controllable ──
const { flwReady } = vi.hoisted(() => ({ flwReady: vi.fn(() => false) }));
vi.mock("@/lib/payments/gateway", () => ({
  isFlutterwaveConfigured: flwReady,
  currentGatewayRuntimeConfig: vi.fn(() => ({})),
}));

// ── Mock paystack config check ──
vi.mock("@/lib/paystack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/paystack")>();
  return { ...actual, isPaystackConfigured: vi.fn(() => true) };
});

import {
  formatNaira,
  formatTokenPriceForDisplay,
  tokenPriceDisclosure,
  getTokenPurchaseConfig,
  getTokenPurchasePrices,
  resolveTokenCharge,
  formatMinor,
  type TokenCharge,
  initializeTokenPurchase,
  verifyTokenPurchase,
  adminGetTokenPurchaseConfig,
  adminUpdateTokenPurchaseConfig,
} from "@/lib/token-purchase";
import * as supabaseLazy from "@/lib/supabase-lazy";
import { setDisplayCurrencyState } from "@/lib/international/fx-display";

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

describe("worldwide token price display", () => {
  afterEach(() => {
    setDisplayCurrencyState("NGN", { enabled: false, rates: {} });
  });

  it("shows naira unchanged with no disclosure when not converting", () => {
    setDisplayCurrencyState("NGN", { enabled: false, rates: {} });
    expect(formatTokenPriceForDisplay(150000)).toBe("₦1,500");
    expect(tokenPriceDisclosure(150000)).toBeNull();
  });

  it("converts to the visitor's currency and discloses the naira charge", () => {
    setDisplayCurrencyState("USD", { enabled: true, rates: { USD: 0.001 } });
    expect(formatTokenPriceForDisplay(150000)).toBe("$1.5");
    const note = tokenPriceDisclosure(150000);
    expect(note).toMatch(/charged as ₦1,500/i);
    expect(note).toMatch(/approximate/i);
  });

  it("falls back to naira when the chosen currency has no rate", () => {
    setDisplayCurrencyState("USD", { enabled: true, rates: {} });
    expect(formatTokenPriceForDisplay(150000)).toBe("₦1,500");
    expect(tokenPriceDisclosure(150000)).toBeNull();
  });
});

describe("resolveTokenCharge", () => {
  const prices = [
    { currency_code: "USD", price_minor: 99, is_active: true, updated_at: "" },
    { currency_code: "GBP", price_minor: 79, is_active: false, updated_at: "" },
  ];

  it("uses the configured native price for a matching currency", () => {
    const charge = resolveTokenCharge(150000, "usd", prices);
    expect(charge).toEqual({
      mode: "native",
      currency: "USD",
      priceMinor: 99,
    });
  });

  it("ignores inactive or missing rows: falls back to the naira pack", () => {
    expect(resolveTokenCharge(150000, "GBP", prices)).toEqual({
      mode: "naira",
      currency: "NGN",
      priceMinor: 150000,
    });
    expect(resolveTokenCharge(150000, "EUR", prices)).toEqual({
      mode: "naira",
      currency: "NGN",
      priceMinor: 150000,
    });
  });

  it("naira display stays naira even with prices loaded", () => {
    expect(resolveTokenCharge(150000, "NGN", prices)).toEqual({
      mode: "naira",
      currency: "NGN",
      priceMinor: 150000,
    });
  });

  it("never invents a native price from FX", () => {
    setDisplayCurrencyState("USD", { enabled: true, rates: { USD: 0.001 } });
    const c = resolveTokenCharge(150000, "USD", []);
    expect(c.mode).toBe("naira");
  });
});

describe("formatMinor", () => {
  it("formats minor units in the currency's own symbol", () => {
    expect(formatMinor(99, "USD")).toBe("$0.99");
    expect(formatMinor(79, "GBP")).toBe("£0.79");
  });

  it("handles zero-decimal currencies without decimals", () => {
    expect(formatMinor(150, "JPY")).toBe("¥150");
  });
});

describe("native price display", () => {
  afterEach(() => {
    setDisplayCurrencyState("NGN", { enabled: false, rates: {} });
  });

  it("shows the exact native price with no approx disclosure", () => {
    const charge: TokenCharge = {
      mode: "native",
      currency: "USD",
      priceMinor: 99,
    };
    expect(formatTokenPriceForDisplay(150000, charge)).toBe("$0.99");
    expect(tokenPriceDisclosure(150000, charge)).toBeNull();
  });
});

describe("getTokenPurchasePrices", () => {
  it("returns price rows when present", async () => {
    _state.data = [
      {
        currency_code: "USD",
        price_minor: 99,
        is_active: true,
        updated_at: "",
      },
    ];
    const rows = await getTokenPurchasePrices();
    expect(rows).toHaveLength(1);
    expect(rows[0].currency_code).toBe("USD");
  });

  it("returns [] on error", async () => {
    _state.error = new Error("db down");
    expect(await getTokenPurchasePrices()).toEqual([]);
  });
});

describe("initializeTokenPurchase (international dispatch)", () => {
  it("routes a native currency to flutterwave-checkout when configured", async () => {
    flwReady.mockReturnValueOnce(true);
    _state.data = {
      authorization_url: "https://checkout.flutterwave.com/xyz",
      reference: "FRELUX_TOKENS_FLW_u1_123",
      currency: "USD",
    };
    const result = await initializeTokenPurchase("user@example.com", "user-1", {
      mode: "native",
      currency: "USD",
      priceMinor: 99,
    });
    expect(result.success).toBe(true);
    expect(result.gateway).toBe("flutterwave");
    expect(result.authorizationUrl).toBe(
      "https://checkout.flutterwave.com/xyz",
    );
    expect(_invoke).toHaveBeenCalledWith("flutterwave-checkout", {
      body: {
        purpose: "token_purchase",
        email: "user@example.com",
        user_id: "user-1",
        currency: "USD",
      },
    });
  });

  it("refuses a native charge when Flutterwave is not configured", async () => {
    const result = await initializeTokenPurchase("user@example.com", "user-1", {
      mode: "native",
      currency: "USD",
      priceMinor: 99,
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe("FLUTTERWAVE_NOT_CONFIGURED");
    expect(_invoke).not.toHaveBeenCalled();
  });

  it("keeps naira (and fallback) charges on Paystack", async () => {
    _state.data = {
      data: {
        authorization_url: "https://checkout.paystack.com/abc123",
        reference: "FRELUX_TOKENS_x1_123",
      },
    };
    const result = await initializeTokenPurchase("user@example.com", "user-1", {
      mode: "naira",
      currency: "NGN",
      priceMinor: 150000,
    });
    expect(result.success).toBe(true);
    expect(_invoke).toHaveBeenCalledWith(
      "paystack-checkout",
      expect.objectContaining({
        body: expect.objectContaining({ purpose: "token_purchase" }),
      }),
    );
  });
});

describe("verifyTokenPurchase (gateway routing)", () => {
  it("verifies via flutterwave-verify when gw=flutterwave", async () => {
    _state.data = {
      verified: true,
      purpose: "token_purchase",
      tokens_credited: 50,
      already_credited: false,
    };
    const result = await verifyTokenPurchase(
      "FRELUX_TOKENS_FLW_u1_123",
      "flutterwave",
    );
    expect(result.verified).toBe(true);
    expect(result.tokens).toBe(50);
    expect(_invoke).toHaveBeenCalledWith("flutterwave-verify", {
      body: { tx_ref: "FRELUX_TOKENS_FLW_u1_123" },
    });
  });

  it("treats a flutterwave verification of another purpose as unverified", async () => {
    _state.data = { verified: true, purpose: "subscription" };
    const result = await verifyTokenPurchase("ref", "flutterwave");
    expect(result.verified).toBe(false);
  });

  it("keeps the default on Paystack", async () => {
    _state.data = {
      status: true,
      data: { purpose: "token_purchase", tokens_credited: 50 },
    };
    const result = await verifyTokenPurchase("FRELUX_TOKENS_x1_123");
    expect(result.verified).toBe(true);
    expect(_invoke).toHaveBeenCalledWith("paystack-verify", {
      body: { reference: "FRELUX_TOKENS_x1_123" },
    });
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
