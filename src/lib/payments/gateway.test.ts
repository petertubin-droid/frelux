import { describe, it, expect, vi } from "vitest";
import {
  availableGateways,
  gatewayForMarket,
  gatewaysForMarket,
} from "./gateway";

// availableGateways consults the Paystack env check; pin it so the
// test is deterministic regardless of the test-runner env.
vi.mock("@/lib/paystack", () => ({
  initializeSubscriptionCheckout: vi.fn(),
  isPaystackConfigured: () => true,
}));
import {
  parseGateway,
  resolveCheckoutGateway,
  isStripeConfigured,
  isFlutterwaveConfigured,
  type GatewayRuntimeConfig,
} from "./gateway";

const EMPTY: GatewayRuntimeConfig = {};
const FULL: GatewayRuntimeConfig = {
  stripePublishableKey: "pk_test_x",
  flutterwavePublicKey: "FLWPUBK_test_x",
};

describe("parseGateway", () => {
  it("accepts the three supported gateways", () => {
    expect(parseGateway("paystack")).toBe("paystack");
    expect(parseGateway("stripe")).toBe("stripe");
    expect(parseGateway("flutterwave")).toBe("flutterwave");
  });

  it("falls back to paystack for unknown, null or undefined settings", () => {
    expect(parseGateway("paypal")).toBe("paystack");
    expect(parseGateway(null)).toBe("paystack");
    expect(parseGateway(undefined)).toBe("paystack");
    expect(parseGateway("")).toBe("paystack");
  });
});

describe("configuration checks", () => {
  it("stripe is configured only with a publishable key", () => {
    expect(isStripeConfigured(FULL)).toBe(true);
    expect(isStripeConfigured(EMPTY)).toBe(false);
  });

  it("Flutterwave hosted checkout does not require an unused browser key", () => {
    expect(isFlutterwaveConfigured(FULL)).toBe(true);
    expect(isFlutterwaveConfigured(EMPTY)).toBe(true);
  });
});

describe("resolveCheckoutGateway", () => {
  it("paystack setting always resolves to paystack", () => {
    expect(resolveCheckoutGateway("paystack", EMPTY)).toEqual({
      gateway: "paystack",
    });
    expect(resolveCheckoutGateway("paystack", FULL)).toEqual({
      gateway: "paystack",
    });
  });

  it("uses the selected gateway when it is configured", () => {
    expect(resolveCheckoutGateway("stripe", FULL)).toEqual({
      gateway: "stripe",
    });
    expect(resolveCheckoutGateway("flutterwave", FULL)).toEqual({
      gateway: "flutterwave",
    });
  });

  it("falls back to paystack only when the selected browser gateway is unavailable", () => {
    const stripeFallback = resolveCheckoutGateway("stripe", EMPTY);
    expect(stripeFallback.gateway).toBe("paystack");
    expect(stripeFallback.fallbackFrom).toBe("stripe");
    expect(stripeFallback.reason).toContain("stripe");

    expect(resolveCheckoutGateway("flutterwave", EMPTY)).toEqual({
      gateway: "flutterwave",
    });
  });

  it("never falls back to an unavailable gateway itself", () => {
    // Invalid settings degrade to paystack, never to a half-configured gateway
    expect(resolveCheckoutGateway("adyen", FULL).gateway).toBe("paystack");
  });
});

describe("availableGateways", () => {
  it("lists every configured gateway, paystack included when its key is set", () => {
    expect(availableGateways(FULL)).toEqual([
      "paystack",
      "flutterwave",
      "stripe",
    ]);
  });

  it("keeps hosted gateways available without browser keys", () => {
    expect(availableGateways(EMPTY)).toEqual(["paystack", "flutterwave"]);
  });
});

describe("gatewaysForMarket", () => {
  it("routes African settlement markets to paystack first", () => {
    for (const code of ["NG", "GH", "ZA", "KE", "ng"]) {
      expect(gatewayForMarket(code)).toBe("paystack");
      expect(gatewaysForMarket(code, EMPTY)[0]).toBe("paystack");
    }
  });

  it("routes every other market to flutterwave, because paystack cannot settle there", () => {
    for (const code of ["US", "GB", "DE", "FR", "BR", "JP", "IN", "AE", "AU"]) {
      expect(gatewayForMarket(code)).toBe("flutterwave");
      const gateways = gatewaysForMarket(code, FULL);
      expect(gateways[0]).toBe("flutterwave");
      expect(gateways).not.toContain("paystack");
    }
  });

  it("keeps flutterwave reachable for African buyers paying by international card", () => {
    expect(gatewaysForMarket("NG", EMPTY)).toContain("flutterwave");
  });

  it("defaults to flutterwave when the market is unknown", () => {
    expect(gatewayForMarket(null)).toBe("flutterwave");
    expect(gatewayForMarket(undefined)).toBe("flutterwave");
  });
});
