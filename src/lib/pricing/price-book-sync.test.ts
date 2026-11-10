import { describe, expect, it } from "vitest";
import { EMPTY_PRICE_BOOK, mergePriceBooks, type PriceBook, type PriceBookEntry } from "./price-book";

const entry = (over: Partial<PriceBookEntry> = {}): PriceBookEntry => ({
  slug: "fascia-per-meter",
  rate: 4200,
  currency: "NGN",
  updatedAt: "2026-11-10T05:00:00.000Z",
  ...over,
});

const book = (...entries: PriceBookEntry[]): PriceBook => ({ version: 1, entries });

describe("merging the browser book with the account book", () => {
  it("keeps an account rate the browser has never seen", () => {
    const merged = mergePriceBooks(EMPTY_PRICE_BOOK, book(entry()));
    expect(merged.book.entries).toEqual([entry()]);
    expect(merged.toPush).toHaveLength(0);
    expect(merged.pulled).toBe(1);
  });

  it("pushes a browser rate the account does not have", () => {
    const merged = mergePriceBooks(book(entry()), EMPTY_PRICE_BOOK);
    expect(merged.book.entries).toEqual([entry()]);
    expect(merged.toPush).toEqual([entry()]);
    expect(merged.pulled).toBe(0);
  });

  it("takes the later edit and leaves the older one alone", () => {
    const older = entry({ rate: 4000, updatedAt: "2026-11-09T10:00:00.000Z" });
    const newer = entry({ rate: 4500, updatedAt: "2026-11-10T09:00:00.000Z" });

    const localWins = mergePriceBooks(book(newer), book(older));
    expect(localWins.book.entries[0].rate).toBe(4500);
    expect(localWins.toPush.map((e) => e.rate)).toEqual([4500]);

    const remoteWins = mergePriceBooks(book(older), book(newer));
    expect(remoteWins.book.entries[0].rate).toBe(4500);
    expect(remoteWins.toPush).toHaveLength(0);
  });

  it("breaks an equal-instant disagreement towards the account, and says so", () => {
    const local = entry({ rate: 4000 });
    const remote = entry({ rate: 4100 });
    const merged = mergePriceBooks(book(local), book(remote));

    expect(merged.book.entries[0].rate).toBe(4100);
    expect(merged.ties).toEqual(["fascia-per-meter"]);
    // The same merge run twice must land on the same answer, not oscillate.
    const again = mergePriceBooks(merged.book, book(remote));
    expect(again.book.entries[0].rate).toBe(4100);
    expect(again.ties).toEqual([]);
  });

  it("never deletes a slug that only one side holds", () => {
    const merged = mergePriceBooks(
      book(entry({ slug: "gutter-per-meter" })),
      book(entry()),
    );
    expect(merged.book.entries.map((e) => e.slug)).toEqual([
      "fascia-per-meter",
      "gutter-per-meter",
    ]);
  });

  it("sorts the converged book so two devices list it the same way", () => {
    const merged = mergePriceBooks(
      book(entry({ slug: "soffit-panel-per-m2" }), entry({ slug: "fascia-per-meter" })),
      EMPTY_PRICE_BOOK,
    );
    expect(merged.book.entries.map((e) => e.slug)).toEqual([
      "fascia-per-meter",
      "soffit-panel-per-m2",
    ]);
  });
});
