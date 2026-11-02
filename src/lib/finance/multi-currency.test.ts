import { describe, it, expect } from "vitest";
import {
  getCurrencyDecimals,
  roundCurrencyAmount,
  computeCrossRate,
  convertProjectCurrency,
  buildProjectCurrencySummary,
} from "./multi-currency";

describe("Enterprise Multi-Currency Accounting Engine", () => {
  it("respects ISO 4217 decimal conventions", () => {
    expect(getCurrencyDecimals("USD")).toBe(2);
    expect(getCurrencyDecimals("EUR")).toBe(2);
    expect(getCurrencyDecimals("NGN")).toBe(2);
    expect(getCurrencyDecimals("JPY")).toBe(0);
    expect(getCurrencyDecimals("KRW")).toBe(0);

    expect(roundCurrencyAmount(1234.5678, "USD")).toBe(1234.57);
    expect(roundCurrencyAmount(1234.5678, "JPY")).toBe(1235);
  });

  it("computes cross rates via triangular arbitrage", () => {
    // Reference base USD: USD=1, EUR=0.92, NGN=1600, GBP=0.78
    const rates = {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.78,
      NGN: 1600.0,
    };

    // EUR to NGN = 1600 / 0.92 = 1739.1304...
    const eurToNgn = computeCrossRate("EUR", "NGN", rates, "USD");
    expect(eurToNgn).toBeCloseTo(1739.13, 1);

    // Identity rate
    expect(computeCrossRate("EUR", "EUR", rates, "USD")).toBe(1.0);

    // Missing currency returns null
    expect(computeCrossRate("EUR", "XYZ", rates, "USD")).toBeNull();
  });

  it("converts project currency with audit snapshot and risk margin", () => {
    const res = convertProjectCurrency({
      amount: 10000,
      fromCurrency: "USD",
      toCurrency: "EUR",
      rate: 0.92,
      fxRiskMarginBps: 200, // 2% FX volatility buffer
      source: "live_feed",
    });

    expect(res.fromCurrency).toBe("USD");
    expect(res.toCurrency).toBe("EUR");
    expect(res.appliedRate).toBe(0.92);
    // Adjusted rate = 0.92 * 1.02 = 0.9384
    expect(res.riskAdjustedRate).toBeCloseTo(0.9384, 4);
    expect(res.convertedAmount).toBe(9384);
    expect(res.snapshot.source).toBe("live_feed");
    expect(res.snapshot.spreadBps).toBe(200);
    expect(res.snapshot.inverseRate).toBeCloseTo(1.087, 2);
  });

  it("builds 3-layer project currency summary (base, settlement, client)", () => {
    const summary = buildProjectCurrencySummary({
      baseAmount: 100000,
      config: {
        baseCurrency: "USD",
        settlementCurrency: "NGN",
        clientQuoteCurrency: "GBP",
        fxRiskMarginBps: 150, // 1.5% buffer
      },
      referenceRates: {
        USD: 1.0,
        NGN: 1600.0,
        GBP: 0.78,
      },
      referenceBaseCode: "USD",
    });

    expect(summary.base.currency).toBe("USD");
    expect(summary.base.amount).toBe(100000);

    expect(summary.settlement.currency).toBe("NGN");
    // 100000 * 1600 * 1.015 = 162,400,000 NGN
    expect(summary.settlement.amount).toBe(162400000);

    expect(summary.clientQuote.currency).toBe("GBP");
    // 100000 * 0.78 * 1.015 = 79,170 GBP
    expect(summary.clientQuote.amount).toBe(79170);
  });
});
