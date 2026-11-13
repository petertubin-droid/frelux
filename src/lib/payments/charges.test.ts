import { describe, it, expect } from "vitest";
import {
  CURRENCY_RULES,
  CHARGEABLE_CURRENCIES,
  isChargeableCurrency,
} from "./charges";
import {
  CURRENCY_REGISTRY,
  CHARGEABLE_CURRENCIES as SERVER_CHARGEABLE,
  isChargeableCurrency as serverChargeable,
  currencyExponent as serverExponent,
} from "../../../supabase/functions/_shared/currency-registry";
import { displayedPrice } from "@/lib/subscription-pricing";
import type { PricingPlan } from "@/lib/pricing-plans";

// ---------------------------------------------------------
// One currency policy, two sides
//
// The site used to quote a local price from `subscription_local_prices`
// while checkout charged the dollar amount whenever the rail did not
// list the currency - rupees on the page, dollars on the card. These
// tests hold the browser and the edge functions to the same registry
// and prove the display falls back when a currency cannot be charged.
// ---------------------------------------------------------

const plan = {
  id: "pro",
  monthlyPrice: 4.99,
  yearlyPrice: 49.99,
} as PricingPlan;

function localRow(market: string, currency: string, priceMinor: number) {
  return {
    market_code: market,
    plan: "pro",
    billing_cycle: "monthly" as const,
    currency,
    price_minor: priceMinor,
  };
}

describe("currency policy parity", () => {
  it("lists the same chargeable currencies in the browser and the server", () => {
    expect([...CHARGEABLE_CURRENCIES].sort()).toEqual(
      [...SERVER_CHARGEABLE].sort(),
    );
  });

  it("uses the same minor-unit exponent on both sides", () => {
    for (const code of Object.keys(CURRENCY_REGISTRY)) {
      expect(CURRENCY_RULES[code]?.exponent).toBe(serverExponent(code));
      expect(isChargeableCurrency(code)).toBe(serverChargeable(code));
    }
  });

  it("keeps zero-decimal currencies at exponent 0", () => {
    for (const code of ["JPY", "KRW", "XOF", "RWF", "UGX"]) {
      expect(CURRENCY_RULES[code]?.exponent).toBe(0);
    }
  });

  it("refuses to quote currencies no rail can collect", () => {
    for (const code of ["CHF", "DKK", "NOK", "PKR", "THB"]) {
      expect(isChargeableCurrency(code)).toBe(false);
    }
  });
});

describe("displayedPrice never quotes what checkout cannot charge", () => {
  it("shows the local price when its currency is chargeable", () => {
    const shown = displayedPrice(plan, "monthly", "IN", [
      localRow("IN", "INR", 41500),
    ]);
    expect(shown.currency).toBe("INR");
    expect(shown.amountMinor).toBe(41500);
    expect(shown.isUsd).toBe(false);
  });

  it("falls back to the dollar price when the rail cannot collect it", () => {
    for (const [market, currency] of [
      ["DK", "DKK"],
      ["CH", "CHF"],
      ["NO", "NOK"],
      ["TH", "THB"],
    ] as const) {
      const shown = displayedPrice(plan, "monthly", market, [
        localRow(market, currency, 3900),
      ]);
      expect(shown.currency).toBe("USD");
      expect(shown.amountMinor).toBe(499);
      expect(shown.isUsd).toBe(true);
    }
  });

  it("still shows the dollar price when no local row exists", () => {
    const shown = displayedPrice(plan, "monthly", "AT", []);
    expect(shown.currency).toBe("USD");
    expect(shown.amountMinor).toBe(499);
  });
});
