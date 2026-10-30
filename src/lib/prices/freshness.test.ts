import { describe, expect, it } from "vitest";
import {
  FRESH_DAYS,
  RECENT_DAYS,
  formatStampDate,
  freshnessMessage,
  needsVerification,
  priceBookMessage,
  summariseFreshness,
  summarisePriceBook,
} from "./freshness";

const now = new Date("2026-10-30T12:00:00Z");
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 86_400_000).toISOString();

describe("summariseFreshness", () => {
  it("reports the oldest row, since that limits trust in the total", () => {
    const summary = summariseFreshness(
      [{ updated_at: daysAgo(2) }, { updated_at: daysAgo(21) }],
      now,
    );
    expect(summary.daysOld).toBe(21);
    expect(summary.level).toBe("fresh");
    expect(formatStampDate(summary.latest!)).toBe("28 October 2026");
  });

  it("marks prices inside the working month as fresh", () => {
    expect(
      summariseFreshness([{ updated_at: daysAgo(FRESH_DAYS) }], now).level,
    ).toBe("fresh");
  });

  it("marks prices past the month as recent and past the quarter as stale", () => {
    expect(
      summariseFreshness([{ updated_at: daysAgo(FRESH_DAYS + 1) }], now).level,
    ).toBe("recent");
    expect(
      summariseFreshness([{ updated_at: daysAgo(RECENT_DAYS + 1) }], now).level,
    ).toBe("stale");
  });

  it("counts rows with no date without inventing one", () => {
    const summary = summariseFreshness(
      [{ updated_at: null }, { updated_at: "not a date" }],
      now,
    );
    expect(summary.level).toBe("unknown");
    expect(summary.daysOld).toBeNull();
    expect(summary.rowCount).toBe(2);
  });

  it("falls back to created_at when updated_at is absent", () => {
    const summary = summariseFreshness([{ created_at: daysAgo(10) }], now);
    expect(summary.daysOld).toBe(10);
  });

  it("never reports a negative age for a future timestamp", () => {
    const summary = summariseFreshness([{ updated_at: daysAgo(-5) }], now);
    expect(summary.daysOld).toBe(0);
    expect(summary.level).toBe("fresh");
  });

  it("orders sources by how many rows each supplied", () => {
    const summary = summariseFreshness(
      [
        { updated_at: daysAgo(3), last_updated_via: "crowdsourced" },
        { updated_at: daysAgo(4), last_updated_via: "crowdsourced" },
        { updated_at: daysAgo(5), last_updated_via: "manual" },
      ],
      now,
    );
    expect(summary.sources).toEqual(["community reports", "team entry"]);
  });

  it("handles an empty table", () => {
    const summary = summariseFreshness([], now);
    expect(summary.level).toBe("unknown");
    expect(summary.rowCount).toBe(0);
    expect(summary.sources).toEqual([]);
  });
});

describe("freshnessMessage", () => {
  it("reads naturally for today, yesterday and longer gaps", () => {
    expect(
      freshnessMessage(summariseFreshness([{ updated_at: daysAgo(0) }], now)),
    ).toBe("Prices were last updated today (30 October 2026).");
    expect(
      freshnessMessage(summariseFreshness([{ updated_at: daysAgo(1) }], now)),
    ).toBe("Prices were last updated yesterday (29 October 2026).");
    expect(
      freshnessMessage(summariseFreshness([{ updated_at: daysAgo(45) }], now)),
    ).toBe("Prices were last updated 45 days ago (15 September 2026).");
  });

  it("names the source when the rows record one", () => {
    const summary = summariseFreshness(
      [{ updated_at: daysAgo(8), last_updated_via: "crowdsourced" }],
      now,
    );
    expect(freshnessMessage(summary)).toBe(
      "Prices from community reports were last updated 8 days ago (22 October 2026).",
    );
  });

  it("says plainly when there is no date to stand on", () => {
    expect(freshnessMessage(summariseFreshness([], now))).toMatch(
      /guide only/i,
    );
  });

  it("uses no em dashes", () => {
    [
      summariseFreshness([], now),
      summariseFreshness([{ updated_at: daysAgo(0) }], now),
      summariseFreshness([{ updated_at: daysAgo(200) }], now),
    ].forEach((summary) =>
      expect(freshnessMessage(summary)).not.toContain("—"),
    );
  });
});

describe("needsVerification", () => {
  it("asks for verification only when a price is old or undated", () => {
    expect(
      needsVerification(summariseFreshness([{ updated_at: daysAgo(5) }], now)),
    ).toBe(false);
    expect(
      needsVerification(
        summariseFreshness([{ updated_at: daysAgo(120) }], now),
      ),
    ).toBe(true);
    expect(needsVerification(summariseFreshness([], now))).toBe(true);
  });
});

describe("summarisePriceBook", () => {
  const book = (
    overrides: Partial<{
      byRef: Map<string, number>;
      asOf: Map<string, string>;
      stale: Set<string>;
      verified: Set<string>;
    }> = {},
  ) => ({
    byRef: new Map([
      ["a", 1000],
      ["b", 2000],
    ]),
    asOf: new Map([["a", daysAgo(5)]]),
    stale: new Set<string>(),
    verified: new Set(["a"]),
    ...overrides,
  });

  it("dates a book from its verification stamps", () => {
    const summary = summarisePriceBook(book(), now);
    expect(summary.pricedCount).toBe(2);
    expect(summary.daysOld).toBe(5);
    expect(summary.level).toBe("fresh");
  });

  it("reports a priced book with no stamps as unknown, not fresh", () => {
    const summary = summarisePriceBook(book({ asOf: new Map() }), now);
    expect(summary.level).toBe("unknown");
    expect(priceBookMessage(summary)).toMatch(
      /none of them carrying a verification date/i,
    );
  });

  it("names the worn lines instead of hiding them behind an average", () => {
    const summary = summarisePriceBook(
      book({ asOf: new Map([["a", daysAgo(6)]]), stale: new Set(["b"]) }),
      now,
    );
    expect(summary.staleCount).toBe(1);
    const message = priceBookMessage(summary);
    expect(message).toContain("1 of 2");
    expect(message).toContain("last known prices");
  });

  it("says so when a market has no priced materials at all", () => {
    const summary = summarisePriceBook(book({ byRef: new Map() }), now);
    expect(summary.pricedCount).toBe(0);
    expect(priceBookMessage(summary)).toMatch(/cannot be trusted/i);
  });

  it("uses no em dashes", () => {
    const summaries = [
      summarisePriceBook(book(), now),
      summarisePriceBook(book({ asOf: new Map() }), now),
      summarisePriceBook(book({ byRef: new Map() }), now),
    ];
    summaries.forEach((summary) =>
      expect(priceBookMessage(summary)).not.toContain("—"),
    );
  });
});
