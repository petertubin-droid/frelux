import { describe, expect, it } from "vitest";
import {
  checkQuote,
  type QuoteLineInput,
  type QuoteReference,
} from "@/lib/estimation/quote-check-engine";

const reference = (
  rate: number,
  unit = "bag",
  evidence = "supplier_verified",
): QuoteReference => ({
  rate,
  unit,
  market: "NG",
  name: "Cement 50kg",
  evidence,
});

const line = (over: Partial<QuoteLineInput> = {}): QuoteLineInput => ({
  key: "l1",
  description: "Cement",
  quantity: 10,
  unit: "bag",
  quotedRate: 9000,
  reference: reference(8500),
  ...over,
});

describe("quote check engine", () => {
  it("marks a quote inside the fair band as fair", () => {
    const result = checkQuote([line({ quotedRate: 9000 })]);
    expect(result.lines[0].status).toBe("fair");
    expect(result.lines[0].rateDelta).toBe(500);
    expect(result.counts.fair).toBe(1);
  });

  it("marks a rate above the band as over and prices the exposure", () => {
    const result = checkQuote([line({ quantity: 20, quotedRate: 11000 })]);
    expect(result.lines[0].status).toBe("over");
    expect(result.lines[0].quotedAmount).toBe(220000);
    expect(result.lines[0].referenceAmount).toBe(170000);
    expect(result.overpricedAmount).toBe(50000);
    expect(result.verdict).toContain("above the fair band");
  });

  it("marks a rate below the band as under without calling it a saving", () => {
    const result = checkQuote([line({ quotedRate: 6000 })]);
    expect(result.lines[0].status).toBe("under");
    expect(result.overpricedAmount).toBe(0);
    expect(result.verdict).toContain("below the band");
  });

  it("refuses a verdict when the price book has no rate", () => {
    const result = checkQuote([line({ reference: null })]);
    expect(result.lines[0].status).toBe("no_reference");
    expect(result.lines[0].rateDelta).toBeNull();
    expect(result.overpricedAmount).toBe(0);
    expect(result.quotedTotal).toBe(90000);
    expect(result.counts.noReference).toBe(1);
    expect(result.verdict).toContain("no verdict");
  });

  it("refuses to compare across units", () => {
    const result = checkQuote([line({ unit: "tonne" })]);
    expect(result.lines[0].status).toBe("unit_mismatch");
    expect(result.lines[0].amountDelta).toBeNull();
    expect(result.comparableQuotedTotal).toBe(0);
  });

  it("ignores a zero or negative reference rate instead of dividing by it", () => {
    const result = checkQuote([line({ reference: reference(0) })]);
    expect(result.lines[0].status).toBe("no_reference");
    expect(result.lines[0].rateDeltaFraction).toBeNull();
  });

  it("treats an incomplete line as invalid and keeps it out of the totals", () => {
    const result = checkQuote([
      line({ key: "a", quantity: 0 }),
      line({ key: "b", quotedRate: Number.NaN }),
    ]);
    expect(result.counts.invalid).toBe(2);
    expect(result.quotedTotal).toBe(0);
    expect(result.verdict).toContain("incomplete");
  });

  it("totals only the lines it could compare", () => {
    const result = checkQuote([
      line({ key: "a", quantity: 10, quotedRate: 9000 }),
      line({ key: "b", quantity: 5, quotedRate: 2000, reference: null }),
    ]);
    expect(result.quotedTotal).toBe(100000);
    expect(result.comparableQuotedTotal).toBe(90000);
    expect(result.comparableReferenceTotal).toBe(85000);
    expect(result.comparableDelta).toBe(5000);
  });

  it("honours a wider fair band", () => {
    const result = checkQuote([line({ quotedRate: 9500 })], {
      fairBandFraction: 0.15,
    });
    expect(result.lines[0].status).toBe("fair");
    expect(result.verdict).toContain("15%");
  });

  it("counts every line exactly once", () => {
    const result = checkQuote([
      line({ key: "a" }),
      line({ key: "b", quotedRate: 20000 }),
      line({ key: "c" }),
      line({ key: "d", reference: null }),
      line({ key: "e", unit: "m3" }),
      line({ key: "f", quantity: -1 }),
    ]);
    const counts = result.counts;
    expect(
      counts.total -
        (counts.fair +
          counts.over +
          counts.under +
          counts.noReference +
          counts.unitMismatch +
          counts.invalid),
    ).toBe(0);
  });

  it("returns an empty verdict prompt with no lines", () => {
    const result = checkQuote([]);
    expect(result.verdict).toContain("Add the lines");
    expect(result.quotedTotal).toBe(0);
  });
});
