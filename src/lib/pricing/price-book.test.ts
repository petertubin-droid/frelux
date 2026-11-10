import { describe, expect, it } from "vitest";
import {
  applyPriceBook,
  makePriceBookEntry,
  parseStoredPriceBook,
  removePriceBookEntry,
  resolvePriceBook,
  serializePriceBook,
  upsertPriceBookEntry,
  EMPTY_PRICE_BOOK,
  type PriceBookEntry,
} from "./price-book";

const now = new Date("2026-11-10T05:00:00.000Z");

function entry(over: Partial<PriceBookEntry> = {}): PriceBookEntry {
  return {
    slug: "fascia-per-meter",
    rate: 4200,
    currency: "NGN",
    updatedAt: now.toISOString(),
    ...over,
  };
}

describe("one price book entry", () => {
  it("keeps the currency the rate was quoted in and rounds to the kobo", () => {
    const made = makePriceBookEntry(
      { slug: " fascia-per-meter ", rate: "4200.456", currency: "ngn" },
      now,
    );
    expect("entry" in made).toBe(true);
    if (!("entry" in made)) return;
    expect(made.entry.slug).toBe("fascia-per-meter");
    expect(made.entry.currency).toBe("NGN");
    expect(made.entry.rate).toBe(4200.46);
    expect(made.entry.updatedAt).toBe(now.toISOString());
  });

  it("accepts a zero rate, because a free issue is a real rate", () => {
    const made = makePriceBookEntry({ slug: "gutter-per-meter", rate: 0, currency: "NGN" }, now);
    expect("entry" in made && made.entry.rate).toBe(0);
  });

  it("refuses a negative rate, a blank rate and a missing currency", () => {
    expect(makePriceBookEntry({ slug: "x", rate: -1, currency: "NGN" }, now)).toEqual({
      reason: "A rate cannot be negative.",
    });
    expect(makePriceBookEntry({ slug: "x", rate: "", currency: "NGN" }, now)).toEqual({
      reason: "Enter the rate as a number.",
    });
    const noCurrency = makePriceBookEntry({ slug: "x", rate: 5, currency: " " }, now);
    expect("reason" in noCurrency).toBe(true);
    const noSlug = makePriceBookEntry({ slug: "  ", rate: 5, currency: "NGN" }, now);
    expect("reason" in noSlug).toBe(true);
  });

  it("refuses a rate without a currency rather than assuming one", () => {
    const made = makePriceBookEntry({ slug: "x", rate: 5, currency: "NAIRA" }, now);
    expect("reason" in made).toBe(true);
  });
});

describe("the stored book survives what storage throws at it", () => {
  it("reads a round trip back unchanged", () => {
    const book = upsertPriceBookEntry(EMPTY_PRICE_BOOK, entry());
    expect(parseStoredPriceBook(serializePriceBook(book))).toEqual(book);
  });

  it("treats broken JSON and a wrong shape as an empty book", () => {
    expect(parseStoredPriceBook("{oops")).toEqual(EMPTY_PRICE_BOOK);
    expect(parseStoredPriceBook('{"version":1,"entries":{}}')).toEqual(EMPTY_PRICE_BOOK);
    expect(parseStoredPriceBook(null)).toEqual(EMPTY_PRICE_BOOK);
  });

  it("drops only the bad rows, keeping a negative rate out of the book", () => {
    const stored = JSON.stringify({
      version: 1,
      entries: [
        entry(),
        { slug: "bad-rate", rate: -4, currency: "NGN", updatedAt: now.toISOString() },
        { slug: "no-currency", rate: 10, updatedAt: now.toISOString() },
        { slug: "not-a-number", rate: "cheap", currency: "NGN", updatedAt: now.toISOString() },
        { slug: "", rate: 10, currency: "NGN", updatedAt: now.toISOString() },
      ],
    });
    const book = parseStoredPriceBook(stored);
    expect(book.entries).toHaveLength(1);
    expect(book.entries[0].slug).toBe("fascia-per-meter");
  });

  it("keeps the later of two rows for the same slug, not the last in the array", () => {
    const older = entry({ rate: 4000, updatedAt: "2026-11-01T00:00:00.000Z" });
    const newer = entry({ rate: 4500, updatedAt: "2026-11-09T00:00:00.000Z" });
    const book = parseStoredPriceBook(
      JSON.stringify({ version: 1, entries: [newer, older] }),
    );
    expect(book.entries).toHaveLength(1);
    expect(book.entries[0].rate).toBe(4500);
  });
});

describe("resolving the book in a calculator", () => {
  it("uses only rates quoted in the calculator's currency and names the rest", () => {
    let book = upsertPriceBookEntry(EMPTY_PRICE_BOOK, entry());
    book = upsertPriceBookEntry(book, entry({ slug: "gutter-per-meter", rate: 9.5, currency: "GBP" }));

    const ngn = resolvePriceBook(book, "NGN");
    expect(ngn.rates).toEqual({ "fascia-per-meter": 4200 });
    expect(ngn.skipped).toEqual([
      { slug: "gutter-per-meter", currency: "GBP", rate: 9.5 },
    ]);

    const gbp = resolvePriceBook(book, "gbp");
    expect(gbp.rates).toEqual({ "gutter-per-meter": 9.5 });
    expect(gbp.skipped.map((s) => s.slug)).toEqual(["fascia-per-meter"]);
  });

  it("does not convert a naira rate into another currency's number", () => {
    const book = upsertPriceBookEntry(EMPTY_PRICE_BOOK, entry());
    const usd = resolvePriceBook(book, "USD");
    expect(usd.rates).toEqual({});
    expect(usd.skipped).toHaveLength(1);
  });

  it("lays the book over the market prices and leaves the rest alone", () => {
    const market = { "fascia-per-meter": 3800, "gutter-per-meter": null };
    const merged = applyPriceBook(market, resolvePriceBook(
      upsertPriceBookEntry(EMPTY_PRICE_BOOK, entry()),
      "NGN",
    ).rates);
    expect(merged["fascia-per-meter"]).toBe(4200);
    expect(merged["gutter-per-meter"]).toBeNull();
    // The market map handed in is not mutated.
    expect(market["fascia-per-meter"]).toBe(3800);
  });

  it("removes one slug without disturbing the others", () => {
    let book = upsertPriceBookEntry(EMPTY_PRICE_BOOK, entry());
    book = upsertPriceBookEntry(book, entry({ slug: "downpipe-per-piece", rate: 5200 }));
    const trimmed = removePriceBookEntry(book, "fascia-per-meter");
    expect(trimmed.entries.map((e) => e.slug)).toEqual(["downpipe-per-piece"]);
  });

  it("replaces a slug rather than keeping two rates for it", () => {
    let book = upsertPriceBookEntry(EMPTY_PRICE_BOOK, entry({ rate: 4000 }));
    book = upsertPriceBookEntry(book, entry({ rate: 4300 }));
    expect(book.entries).toHaveLength(1);
    expect(book.entries[0].rate).toBe(4300);
  });
});
