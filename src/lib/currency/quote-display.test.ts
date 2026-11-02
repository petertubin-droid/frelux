import { describe, expect, it } from "vitest";
import {
  buildQuoteDisplay,
  parseMoneyText,
  type QuotedTotal,
} from "./quote-display";
import type { RateTable } from "./engine";
import { buildQuoteHtml } from "@/lib/estimation/quote-export";

const NOW = Date.parse("2026-10-30T18:00:00Z");

const table: RateTable = {
  source: "database",
  fetchedAt: "2026-10-30T17:20:14Z",
  quotes: [
    {
      base: "USD",
      quote: "NGN",
      rate: 1346.223823,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
  ],
};

const totals: QuotedTotal[] = [
  { label: "Materials", amount: 1000 },
  { label: "Labour", amount: 1500 },
  { label: "Grand total", amount: 2500, strong: true },
];

describe("quote display block", () => {
  it("reads every total in the chosen currency", () => {
    const display = buildQuoteDisplay({
      totals,
      fromCurrency: "USD",
      toCurrency: "NGN",
      table,
      now: NOW,
    });
    expect(display).not.toBeNull();
    expect(display!.currency).toBe("NGN");
    expect(display!.totals.map((t) => t.value)).toEqual([
      "₦1,346,223.82",
      "₦2,019,335.73",
      "₦3,365,559.56",
    ]);
    expect(display!.totals[2].strong).toBe(true);
  });

  it("carries the rate and its timestamp", () => {
    const display = buildQuoteDisplay({
      totals,
      fromCurrency: "USD",
      toCurrency: "NGN",
      table,
      now: NOW,
    })!;
    expect(display.rateLine).toContain("1 USD = 1,346.22 NGN");
    expect(display.rateLine).toContain("30 Oct 2026 17:20 UTC");
    expect(display.fromSnapshot).toBe(false);
  });

  it("says the figures are not local material prices", () => {
    const display = buildQuoteDisplay({
      totals,
      fromCurrency: "USD",
      toCurrency: "NGN",
      table,
      now: NOW,
    })!;
    expect(display.note).toContain("priced in USD");
    expect(display.note).toContain("not a local material price in NGN");
  });

  it("offers nothing when the quote is already in that currency", () => {
    expect(
      buildQuoteDisplay({
        totals,
        fromCurrency: "USD",
        toCurrency: "usd",
        table,
        now: NOW,
      }),
    ).toBeNull();
  });

  it("withholds the whole block when a rate cannot be trusted", () => {
    const old: RateTable = {
      source: "database",
      fetchedAt: "2026-09-01T00:00:00Z",
      quotes: [
        {
          base: "USD",
          quote: "NGN",
          rate: 1346.223823,
          provider: "open.er-api.com",
          fetchedAt: "2026-09-01T00:00:00Z",
        },
      ],
    };
    expect(
      buildQuoteDisplay({
        totals,
        fromCurrency: "USD",
        toCurrency: "NGN",
        table: old,
        now: NOW,
      }),
    ).toBeNull();
    expect(
      buildQuoteDisplay({
        totals,
        fromCurrency: "USD",
        toCurrency: "NGN",
        table: old,
        now: NOW,
        allowStale: true,
      }),
    ).not.toBeNull();
  });

  it("withholds the block for a pair with no recorded rate", () => {
    expect(
      buildQuoteDisplay({
        totals,
        fromCurrency: "KES",
        toCurrency: "MXN",
        table,
        now: NOW,
      }),
    ).toBeNull();
  });

  it("marks a block built on the saved snapshot", () => {
    const display = buildQuoteDisplay({
      totals,
      fromCurrency: "USD",
      toCurrency: "NGN",
      table: { ...table, source: "bundled" },
      now: NOW,
    })!;
    expect(display.fromSnapshot).toBe(true);
  });

  it("reads amounts out of formatted money strings", () => {
    expect(parseMoneyText("₦3,365,559.56")).toBe(3365559.56);
    expect(parseMoneyText("€1.234,50")).toBe(1234.5);
    expect(parseMoneyText("no total")).toBeNull();
  });
});

describe("quote document", () => {
  const base = {
    title: "Tiling estimate",
    subtitle: "Generated 30 Oct 2026",
    metaRows: [["Market", "United States"]] as Array<[string, string]>,
    lines: [
      {
        label: "Tile adhesive",
        quantity: "10",
        unit: "bag",
        unit_price: "12.00",
      },
    ],
    totals: [
      { label: "Materials", value: "$1,000" },
      { label: "Grand total", value: "$2,500", strong: true },
    ],
  };

  it("prints the converted section when one is supplied", () => {
    const display = buildQuoteDisplay({
      totals,
      fromCurrency: "USD",
      toCurrency: "NGN",
      table,
      now: NOW,
    })!;
    const html = buildQuoteHtml({ ...base, display });
    expect(html).toContain("Also shown in NGN");
    expect(html).toContain("₦3,365,559.56");
    expect(html).toContain("not a local material price in NGN");
  });

  it("leaves the original totals untouched", () => {
    const display = buildQuoteDisplay({
      totals,
      fromCurrency: "USD",
      toCurrency: "NGN",
      table,
      now: NOW,
    })!;
    const html = buildQuoteHtml({ ...base, display });
    expect(html).toContain("$1,000");
    expect(html).toContain("$2,500");
  });

  it("omits the section rather than printing a guess", () => {
    const html = buildQuoteHtml(base);
    expect(html).not.toContain("Also shown in");
  });

  it("uses no em dashes in the section copy", () => {
    const display = buildQuoteDisplay({
      totals,
      fromCurrency: "USD",
      toCurrency: "NGN",
      table,
      now: NOW,
    })!;
    const html = buildQuoteHtml({ ...base, display });
    expect(html).not.toContain("—");
  });
});
