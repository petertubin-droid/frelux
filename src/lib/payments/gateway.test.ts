import { describe, it, expect } from "vitest";
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

  it("flutterwave is configured only with a public key", () => {
    expect(isFlutterwaveConfigured(FULL)).toBe(true);
    expect(isFlutterwaveConfigured(EMPTY)).toBe(false);
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

  it("falls back to paystack when the selected gateway is not configured", () => {
    const stripeFallback = resolveCheckoutGateway("stripe", EMPTY);
    expect(stripeFallback.gateway).toBe("paystack");
    expect(stripeFallback.fallbackFrom).toBe("stripe");
    expect(stripeFallback.reason).toContain("stripe");

    const fwFallback = resolveCheckoutGateway("flutterwave", EMPTY);
    expect(fwFallback.gateway).toBe("paystack");
    expect(fwFallback.fallbackFrom).toBe("flutterwave");
    expect(fwFallback.reason).toContain("flutterwave");
  });

  it("never falls back to an unavailable gateway itself", () => {
    // Invalid settings degrade to paystack, never to a half-configured gateway
    expect(resolveCheckoutGateway("adyen", FULL).gateway).toBe("paystack");
  });
});
