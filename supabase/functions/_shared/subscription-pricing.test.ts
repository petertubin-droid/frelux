import { describe, it, expect } from "vitest";
import {
  FLUTTERWAVE_CURRENCIES,
  PAYSTACK_CURRENCIES,
  resolveMarketCharge,
  resolveSubscriptionPrice,
  toMajorUnits,
  usdCentsToNairaKobo,
  validateQuotedCharge,
  validateSubscriptionCharge,
  type SubscriptionPlanPriceRow,
} from "../_shared/subscription-pricing.ts";

// ── USD pricing and per-market charges (2026-10-29) ────────────────────
describe("USD pricing with per-market settlement", () => {
  const rows: SubscriptionPlanPriceRow[] = [
    {
      plan: "premium",
      billing_cycle: "monthly",
      currency: "USD",
      price_minor: 999,
      active: true,
    },
    {
      plan: "premium",
      billing_cycle: "monthly",
      currency: "NGN",
      price_kobo: 1550000,
      active: true,
    },
    {
      plan: "premium",
      billing_cycle: "monthly",
      currency: "GBP",
      price_minor: 800,
      active: true,
    },
  ];

  it("resolves the dollar price as canonical", () => {
    expect(resolveSubscriptionPrice(rows, "premium", "monthly")).toEqual({
      priceMinor: 999,
      currency: "USD",
    });
  });

  it("never lets a naira row answer a dollar question", () => {
    const ngnOnly: SubscriptionPlanPriceRow[] = [
      {
        plan: "premium",
        billing_cycle: "monthly",
        currency: "NGN",
        price_kobo: 1550000,
        active: true,
      },
    ];
    expect(
      resolveSubscriptionPrice(ngnOnly, "premium", "monthly", "USD"),
    ).toBeNull();
    expect(
      resolveSubscriptionPrice(ngnOnly, "premium", "monthly", "NGN")
        ?.priceMinor,
    ).toBe(1550000);
  });

  it("rejects a charge that does not equal the price exactly", () => {
    const ok = validateSubscriptionCharge({
      rows,
      plan: "premium",
      billingCycle: "monthly",
      currency: "USD",
      chargedMinor: 999,
    });
    expect(ok.ok).toBe(true);
    const cheap = validateSubscriptionCharge({
      rows,
      plan: "premium",
      billingCycle: "monthly",
      currency: "USD",
      chargedMinor: 100,
    });
    expect(cheap).toEqual({ ok: false, reason: "AMOUNT_MISMATCH" });
  });

  it("charges the market currency only when the gateway settles it", () => {
    const local = { currency: "GBP", price_minor: 800 };
    expect(
      resolveMarketCharge({
        localPrice: local,
        usdPriceMinor: 999,
        supported: FLUTTERWAVE_CURRENCIES,
      }),
    ).toEqual({ currency: "GBP", priceMinor: 800 });
    expect(
      resolveMarketCharge({
        localPrice: local,
        usdPriceMinor: 999,
        supported: PAYSTACK_CURRENCIES,
      }),
    ).toEqual({ currency: "USD", priceMinor: 999 });
  });

  it("converts a dollar price to naira kobo at a quoted rate", () => {
    expect(usdCentsToNairaKobo(999, 1550)).toBe(1548450);
    expect(usdCentsToNairaKobo(999, 0)).toBeNull();
    expect(usdCentsToNairaKobo(999, 1_000_000)).toBeNull();
  });

  it("converts minor units to the major units a gateway expects", () => {
    expect(toMajorUnits(999, "USD")).toBe(9.99);
    expect(toMajorUnits(1550000, "NGN")).toBe(15500);
    expect(toMajorUnits(1500, "JPY")).toBe(1500);
  });

  it("validates a naira charge against the recorded quote", () => {
    const quote = {
      reference: "FRELUX_SUB_premium_x_1",
      plan: "premium",
      billing_cycle: "monthly",
      base_currency: "USD",
      base_minor: 999,
      charge_currency: "NGN",
      charge_minor: 1548450,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    expect(
      validateQuotedCharge(quote, {
        plan: "premium",
        billingCycle: "monthly",
        chargedMinor: 1548450,
        chargedCurrency: "NGN",
      }).ok,
    ).toBe(true);
    expect(
      validateQuotedCharge(quote, {
        plan: "premium",
        billingCycle: "monthly",
        chargedMinor: 1548450,
        chargedCurrency: "USD",
      }),
    ).toEqual({ ok: false, reason: "CURRENCY_MISMATCH" });
    expect(
      validateQuotedCharge(quote, {
        plan: "premium",
        billingCycle: "monthly",
        chargedMinor: 1548450,
        chargedCurrency: "NGN",
        now: Date.now() + 3_600_000,
      }),
    ).toEqual({ ok: false, reason: "QUOTE_EXPIRED" });
  });

  it("refuses activation with no quote and no matching price", () => {
    expect(
      validateQuotedCharge(null, {
        plan: "premium",
        billingCycle: "monthly",
        chargedMinor: 999,
        chargedCurrency: "USD",
      }),
    ).toEqual({ ok: false, reason: "QUOTE_MISSING" });
  });
});
