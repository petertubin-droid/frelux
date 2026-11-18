import { describe, expect, it } from "vitest";
import { buildQuoteHtml } from "../quote-export";
import {
  cleanTransportAmount,
  grandTotalLabel,
  totalWithTransportation,
  transportationRow,
  NO_TRANSPORTATION,
} from "../transportation";

const fmt = (n: number) => `₦${n.toLocaleString("en-US")}`;

const baseQuote = {
  title: "FRELUX Painting Cost Estimate",
  subtitle: "Generated 2026-11-18",
  metaRows: [["Rooms", "2"] as [string, string]],
  lines: [
    {
      label: "Emulsion 20L",
      quantity: "2",
      unit: "L",
      unit_price: "₦20,000",
      line_total: "₦40,000",
    },
  ],
  totals: [
    { label: "Material cost", value: "₦40,000" },
    { label: "Labour", value: "₦45,000" },
    { label: "Grand total", value: "₦85,000", strong: true },
  ],
  grandTotal: 85000,
  currencySymbol: "₦",
};

describe("transportation rules", () => {
  it("is off by default and adds nothing", () => {
    expect(NO_TRANSPORTATION).toEqual({ enabled: false, amount: 0 });
    expect(totalWithTransportation(1000, NO_TRANSPORTATION)).toBe(1000);
    expect(transportationRow(NO_TRANSPORTATION, fmt)).toBeNull();
  });

  it("refuses junk and negative amounts instead of inventing a figure", () => {
    expect(cleanTransportAmount(-50)).toBe(0);
    expect(cleanTransportAmount(Number.NaN)).toBe(0);
    expect(cleanTransportAmount("abc")).toBe(0);
    expect(cleanTransportAmount("1500.456")).toBe(1500.46);
  });

  it("adds a real amount to the total", () => {
    const choice = { enabled: true, amount: 15000 };
    expect(totalWithTransportation(85000, choice)).toBe(100000);
  });

  it("shows an enabled line with no amount as to be agreed, not zero", () => {
    const row = transportationRow({ enabled: true, amount: 0 }, fmt);
    expect(row).toEqual({ label: "Transportation", value: "(to be agreed)" });
    expect(totalWithTransportation(85000, { enabled: true, amount: 0 })).toBe(
      85000,
    );
  });

  it("labels the total honestly when the base or amount is missing", () => {
    expect(grandTotalLabel(NO_TRANSPORTATION, true)).toBe("Grand total");
    expect(grandTotalLabel({ enabled: true, amount: 5000 }, true)).toBe(
      "Grand total (incl. transportation)",
    );
    expect(grandTotalLabel({ enabled: true, amount: 5000 }, false)).toBe(
      "Grand total (excl. transportation)",
    );
  });
});

describe("quotation document", () => {
  it("leaves the document unchanged while transportation is off", () => {
    const html = buildQuoteHtml(baseQuote);
    expect(html).not.toContain("Transportation");
    expect(html).toContain("₦85,000");
  });

  it("shows the transportation line and a total that includes it", () => {
    const html = buildQuoteHtml({
      ...baseQuote,
      transportation: { enabled: true, amount: 15000 },
    });
    expect(html).toContain("Transportation");
    expect(html).toContain("₦15,000");
    expect(html).toContain("Grand total (incl. transportation)");
    expect(html).toContain("₦100,000");
  });

  it("never inflates the total when the amount is still blank", () => {
    const html = buildQuoteHtml({
      ...baseQuote,
      transportation: { enabled: true, amount: 0 },
    });
    expect(html).toContain("(to be agreed)");
    expect(html).toContain("Grand total (excl. transportation)");
    expect(html).toContain("₦85,000");
    expect(html).not.toContain("₦100,000");
  });

  it("says excl. transportation when the caller gave no numeric total", () => {
    const { grandTotal: _omit, ...noNumeric } = baseQuote;
    const html = buildQuoteHtml({
      ...noNumeric,
      transportation: { enabled: true, amount: 15000 },
    });
    expect(html).toContain("Grand total (excl. transportation)");
    expect(html).toContain("₦85,000");
  });

  it("places the transportation row before the closing total", () => {
    const html = buildQuoteHtml({
      ...baseQuote,
      transportation: { enabled: true, amount: 15000 },
    });
    expect(html.indexOf("Transportation")).toBeLessThan(
      html.indexOf("Grand total (incl. transportation)"),
    );
  });
});
