import { describe, it, expect } from "vitest";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import { PRICING_PLANS } from "@/lib/pricing-plans";
import {
  displayedPrice,
  formatLocalPrice,
  marketCurrencyCode,
  pickLocalPrice,
  type LocalPriceRow,
} from "@/lib/subscription-pricing";

const premium = PRICING_PLANS.find((p) => p.id === "premium")!;
const pro = PRICING_PLANS.find((p) => p.id === "pro")!;

const rows: LocalPriceRow[] = [
  {
    market_code: "NG",
    plan: "premium",
    billing_cycle: "monthly",
    currency: "NGN",
    price_minor: 1550000,
  },
  {
    market_code: "NG",
    plan: "premium",
    billing_cycle: "yearly",
    currency: "NGN",
    price_minor: 15500000,
  },
  {
    market_code: "GB",
    plan: "premium",
    billing_cycle: "monthly",
    currency: "GBP",
    price_minor: 800,
  },
  {
    market_code: "JP",
    plan: "premium",
    billing_cycle: "monthly",
    currency: "JPY",
    price_minor: 1500,
  },
];

describe("subscription pricing per market", () => {
  it("knows a currency for every one of the 32 markets", () => {
    expect(BUILTIN_MARKET_PROFILES).toHaveLength(32);
    for (const profile of BUILTIN_MARKET_PROFILES) {
      expect(marketCurrencyCode(profile.country_code)).toBe(
        profile.currency_code,
      );
    }
  });

  it("defaults unknown or missing markets to USD", () => {
    expect(marketCurrencyCode("ZZ")).toBe("USD");
    expect(marketCurrencyCode(null)).toBe("USD");
  });

  it("shows the market price with the dollar anchor", () => {
    const shown = displayedPrice(premium, "monthly", "NG", rows);
    expect(shown.currency).toBe("NGN");
    expect(shown.isUsd).toBe(false);
    expect(shown.amountMinor).toBe(1550000);
    expect(shown.formatted).toContain("15,500");
    expect(shown.usdFormatted).toBe("$9.99");
  });

  it("picks the cycle the visitor selected", () => {
    const monthly = displayedPrice(premium, "monthly", "NG", rows);
    const yearly = displayedPrice(premium, "yearly", "NG", rows);
    expect(monthly.amountMinor).toBe(1550000);
    expect(yearly.amountMinor).toBe(15500000);
  });

  it("formats zero-decimal currencies without decimals", () => {
    const yen = displayedPrice(premium, "monthly", "JP", rows);
    expect(yen.formatted).not.toContain(".");
    expect(formatLocalPrice(1500, "JPY")).toBe("¥1,500");
    expect(formatLocalPrice(760000, "XOF")).not.toContain(".");
  });

  it("falls back to the dollar price when a market has no row", () => {
    const shown = displayedPrice(premium, "monthly", "BR", rows);
    expect(shown.isUsd).toBe(true);
    expect(shown.formatted).toBe("$9.99");
  });

  it("never mixes a plan's price with another market or cycle", () => {
    expect(pickLocalPrice(rows, "NG", "premium", "monthly")?.currency).toBe(
      "NGN",
    );
    expect(pickLocalPrice(rows, "NG", "pro", "monthly")).toBeNull();
    expect(pickLocalPrice(rows, "DE", "premium", "monthly")).toBeNull();
  });

  it("keeps Free at zero in every market", () => {
    const free = PRICING_PLANS.find((p) => p.id === "free")!;
    const shown = displayedPrice(free, "monthly", "NG", rows);
    expect(shown.formatted).toBe("$0");
    expect(shown.amountMinor).toBe(0);
  });

  it("shows the American plan in dollars for the US market", () => {
    const shown = displayedPrice(pro, "monthly", "US", rows);
    expect(shown.isUsd).toBe(true);
    expect(shown.formatted).toBe("$4.99");
  });
});
