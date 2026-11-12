import { describe, it, expect, vi } from "vitest";
import {
  availableGateways,
  currencyForMarket,
  gatewayForCurrency,
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
  isFlutterwaveConfigured,
  PAYMENT_GATEWAYS,
  type GatewayRuntimeConfig,
} from "./gateway";

const EMPTY: GatewayRuntimeConfig = {};
const FULL: GatewayRuntimeConfig = { flutterwavePublicKey: "FLWPUBK_test_x" };

describe("parseGateway", () => {
  it("accepts exactly the two gateways that can settle a charge", () => {
    expect(PAYMENT_GATEWAYS).toEqual(["paystack", "flutterwave"]);
    expect(parseGateway("paystack")).toBe("paystack");
    expect(parseGateway("flutterwave")).toBe("flutterwave");
  });

  it("no longer recognises stripe", () => {
    expect(parseGateway("stripe")).toBe("paystack");
  });

  it("falls back to paystack for unknown, null or undefined settings", () => {
    expect(parseGateway("paypal")).toBe("paystack");
    expect(parseGateway(null)).toBe("paystack");
    expect(parseGateway(undefined)).toBe("paystack");
    expect(parseGateway("")).toBe("paystack");
  });
});

describe("configuration checks", () => {
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
    expect(resolveCheckoutGateway("flutterwave", FULL)).toEqual({
      gateway: "flutterwave",
    });
    expect(resolveCheckoutGateway("flutterwave", EMPTY)).toEqual({
      gateway: "flutterwave",
    });
  });

  it("a removed gateway in stored settings degrades to paystack, never to itself", () => {
    // Old rows may still say 'stripe'. They must not reach a checkout.
    const legacy = resolveCheckoutGateway("stripe", FULL);
    expect(legacy.gateway).toBe("paystack");
    expect(legacy.fallbackFrom).toBeUndefined();
  });

  it("never falls back to an unavailable gateway itself", () => {
    // Invalid settings degrade to paystack, never to a half-configured gateway
    expect(resolveCheckoutGateway("adyen", FULL).gateway).toBe("paystack");
  });
});

describe("availableGateways", () => {
  it("offers both hosted gateways regardless of browser keys", () => {
    expect(availableGateways(FULL)).toEqual(["paystack", "flutterwave"]);
    expect(availableGateways(EMPTY)).toEqual(["paystack", "flutterwave"]);
  });

  it("never advertises a gateway that has no checkout path", () => {
    expect(availableGateways(FULL)).not.toContain("stripe");
  });
});

describe("gatewaysForMarket", () => {
  it("routes Nigeria to paystack first", () => {
    for (const code of ["NG", "ng"]) {
      expect(gatewayForMarket(code)).toBe("paystack");
      expect(gatewaysForMarket(code, EMPTY)[0]).toBe("paystack");
    }
  });

  it("matches the server: only a currency paystack settles locally goes to paystack", () => {
    // providerForCurrency in the edge functions keeps NGN on Paystack and sends
    // GHS, ZAR, KES and everything else to Flutterwave. The client must agree,
    // or a buyer is shown a rail the server would not have used.
    expect(gatewayForCurrency("NGN")).toBe("paystack");
    for (const currency of ["GHS", "ZAR", "KES", "USD", "GBP", "EUR", "EGP"]) {
      expect(gatewayForCurrency(currency)).toBe("flutterwave");
    }
    for (const code of ["GH", "ZA", "KE"]) {
      expect(gatewayForMarket(code)).toBe("flutterwave");
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

  it("knows the settlement currency it routed on", () => {
    expect(currencyForMarket("NG")).toBe("NGN");
    expect(currencyForMarket("us")).toBe("USD");
    expect(currencyForMarket("ZZ")).toBeUndefined();
  });

  it("defaults to flutterwave when the market is unknown", () => {
    expect(gatewayForMarket(null)).toBe("flutterwave");
    expect(gatewayForMarket(undefined)).toBe("flutterwave");
  });
});
