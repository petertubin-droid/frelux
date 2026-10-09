import { describe, expect, it } from "vitest";
import {
  formatByCode,
  formatWithSymbol,
  getCurrencySymbol,
} from "@/lib/international/currency-format";
import { formatCurrency as formatCurrencyPricing } from "@/lib/estimation/pricing";

/**
 * DUP-08 regression protection: the shared currency-format API must
 * reproduce the behaviour of the formatter copies it replaced.
 */

describe("formatByCode (code-resolved, auto-spaced symbols)", () => {
  it("resolves symbols from verified metadata", () => {
    expect(formatByCode(1234.5, "NGN", { decimals: "auto" })).toBe("₦1,234.5");
    expect(formatByCode(1234.5, "USD", { decimals: 2 })).toBe("$1,234.50");
    expect(formatByCode(1234.5, "EUR", { decimals: 2 })).toBe("€1,234.50");
    expect(formatByCode(1234.5, "GBP", { decimals: 2 })).toBe("£1,234.50");
  });

  it("uses real symbols for currencies the legacy maps did not know", () => {
    // Legacy pricing.ts fell back to the raw code ("GHS 1,234.5"); the
    // verified metadata now resolves the real symbol. Intentional,
    // documented improvement.
    expect(formatByCode(1234.5, "GHS", { decimals: 2 })).toBe("GH₵ 1,234.50");
  });

  it("supports 0, 2, auto, and native decimal modes", () => {
    expect(formatByCode(1234.567, "NGN", { decimals: 0 })).toBe("₦1,235");
    expect(formatByCode(1234.567, "NGN", { decimals: 2 })).toBe("₦1,234.57");
    expect(formatByCode(1234.5, "NGN", { decimals: "auto" })).toBe("₦1,234.5");
    expect(formatByCode(1234, "NGN", { decimals: "auto" })).toBe("₦1,234");
    // Zero-decimal currencies via verified minor-unit metadata
    expect(formatByCode(1234.56, "JPY", { decimals: "native" })).toBe("¥1,235");
    expect(formatByCode(1234.56, "KRW", { decimals: "native" })).toBe("₩1,235");
    expect(formatByCode(1234.56, "USD", { decimals: "native" })).toBe(
      "$1,234.56",
    );
  });

  it("falls back to the raw code for unknown currencies, never a guess", () => {
    expect(formatByCode(1234, "XYZ", { decimals: 0 })).toBe("XYZ 1,234");
    expect(formatByCode(1234, "", { decimals: 0 })).toBe("₦1,234");
  });

  it("treats invalid input as zero instead of rendering NaN", () => {
    expect(formatByCode(NaN, "NGN")).toBe("₦0");
    expect(formatByCode(NaN, "USD")).toBe("$0");
  });

  it("handles large amounts, zero, and negatives", () => {
    expect(formatByCode(123456789.12, "NGN", { decimals: "auto" })).toBe(
      "₦123,456,789.12",
    );
    expect(formatByCode(0, "NGN", { decimals: 2 })).toBe("₦0.00");
    // Sign placement documented: symbol-first, matching the legacy
    // pricing.ts behaviour this replaced.
    expect(formatByCode(-100, "NGN")).toBe("₦-100");
  });
});

describe("formatWithSymbol (caller-supplied symbol, tight join)", () => {
  it("joins symbols without a space, preserving market-page style", () => {
    expect(formatWithSymbol(1234.5, "₦")).toBe("₦1,235");
    expect(formatWithSymbol(1234.5, "GH₵")).toBe("GH₵1,235");
    expect(formatWithSymbol(1234.5, "$")).toBe("$1,235");
  });

  it("defaults to naira with a zero symbol fallback", () => {
    expect(formatWithSymbol(1234.5)).toBe("₦1,235");
    expect(formatWithSymbol(1234.5, "")).toBe("₦1,235");
  });

  it("supports decimal modes and treats invalid input as zero", () => {
    expect(formatWithSymbol(1234.567, "₦", { decimals: 2 })).toBe("₦1,234.57");
    expect(formatWithSymbol(NaN, "₦")).toBe("₦0");
  });
});

describe("legacy equivalence (behaviour intentionally preserved)", () => {
  const fixtures: Array<[number, string]> = [
    [1234.5, "NGN"],
    [1234.567, "USD"],
    [0, "EUR"],
    [999999.999, "GBP"],
    [-45.67, "NGN"],
    [NaN, "USD"],
    [10.005, "XYZ"],
  ];

  it("matches the previous pricing.ts formula for every fixture", () => {
    for (const [amount, code] of fixtures) {
      // Inline copy of the exact pre-consolidation pricing.ts body:
      const safeAmount = isNaN(amount) ? 0 : amount;
      const symbolMap: Record<string, string> = {
        NGN: "₦",
        USD: "$",
        EUR: "€",
        GBP: "£",
      };
      const upperCurrency = (code || "NGN").toUpperCase();
      const symbol = symbolMap[upperCurrency] || code;
      const formatted = safeAmount.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      const legacy =
        symbol === "₦" || symbol.length === 1
          ? `${symbol}${formatted}`
          : `${symbol} ${formatted}`;
      expect(formatCurrencyPricing(amount, code)).toBe(legacy);
    }
  });

  it("documents the single intentional divergence: GHS now resolves its real symbol", () => {
    // Legacy pricing.ts rendered unknown codes as the raw code ("GHS 10");
    // the shared API resolves the verified metadata symbol. All currencies
    // that were known to the legacy map remain exactly equivalent (above).
    expect(formatCurrencyPricing(10, "GHS")).toBe("GH₵ 10");
  });

  it("matches the previous utils.ts static branch for every fixture", () => {
    for (const [value, symbol] of [
      [1234.5, "₦"],
      [0, "$"],
      [NaN, "₦"],
      [-45.99, "GH₵"],
    ] as Array<[number, string]>) {
      const legacy = `${symbol}${(isNaN(value) ? 0 : value).toLocaleString(
        "en-US",
        { minimumFractionDigits: 0, maximumFractionDigits: 0 },
      )}`;
      expect(formatWithSymbol(value, symbol)).toBe(legacy);
    }
  });
});

describe("getCurrencySymbol", () => {
  it("resolves known codes and nulls unknown ones", () => {
    expect(getCurrencySymbol("NGN")).toBe("₦");
    expect(getCurrencySymbol("usd")).toBe("$");
    expect(getCurrencySymbol("XYZ")).toBeNull();
  });
});
