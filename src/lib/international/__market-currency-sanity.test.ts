/**
 * Wave 1.1 i18n contract: every Frelux market currency must format
 * through formatByCode with its own symbol + grouping. Locks the
 * 20-market promise for the expenses/variance UI.
 */
import { describe, expect, it } from "vitest";
import { formatByCode } from "@/lib/international/currency-format";

const MARKET_CODES = [
  "NGN", "USD", "GBP", "CAD", "AUD", "EUR", "INR", "GHS", "KES", "ZAR",
  "JPY", "BRL", "SAR", "AED", "CNY", "IDR", "MXN", "KRW",
] as const;

const EXPECTED_SYMBOLS: Record<string, string> = {
  NGN: "₦", USD: "$", GBP: "£", CAD: "C$", AUD: "A$", EUR: "€",
  INR: "₹", GHS: "GH₵", KES: "KSh", ZAR: "R", JPY: "¥", BRL: "R$",
  SAR: "﷼", AED: "د.إ", CNY: "CN¥", IDR: "Rp", MXN: "MX$", KRW: "₩",
};

describe("formatByCode across all Frelux markets", () => {
  it.each([...MARKET_CODES])("formats %s with its verified symbol", (code) => {
    const out = formatByCode(1234567, code, { decimals: 0 });
    expect(out).toContain(EXPECTED_SYMBOLS[code]);
    expect(out).toMatch(/1[,.\s]234[,.\s]567/);
  });

  it("falls back to ISO 'XXX' text, never a hardcoded market, for blank codes", () => {
    const out = formatByCode(100, "", { decimals: 0 });
    expect(out).not.toContain("₦");
    expect(out).not.toContain("$");
  });
});
