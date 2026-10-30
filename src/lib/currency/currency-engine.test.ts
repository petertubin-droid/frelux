import { describe, expect, it, vi } from "vitest";
import {
  convert,
  describeConversion,
  formatMoney,
  REFUSE_AFTER_MS,
  viewEstimate,
  type RateTable,
} from "./engine";
import {
  CURRENCY_CODES,
  currencyMeta,
  isSupportedCurrency,
  registerCurrency,
  suggestCurrency,
} from "./catalogue";
import {
  BUNDLED_RATE_SNAPSHOT,
  buildRateTable,
  createRateCache,
  MIN_REFRESH_INTERVAL_MS,
} from "./rates";

const NOW = Date.parse("2026-10-30T18:00:00Z");

const table = (over: Partial<RateTable> = {}): RateTable => ({
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
    {
      base: "USD",
      quote: "GBP",
      rate: 0.749154,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
    {
      base: "GBP",
      quote: "USD",
      rate: 1.334839,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
    {
      base: "EUR",
      quote: "USD",
      rate: 1.116153,
      provider: "open.er-api.com",
      fetchedAt: "2026-10-30T17:20:14Z",
    },
  ],
  ...over,
});

describe("currency catalogue", () => {
  it("ships the eleven requested currencies", () => {
    expect(CURRENCY_CODES).toEqual([
      "NGN",
      "USD",
      "GBP",
      "EUR",
      "CAD",
      "AUD",
      "CNY",
      "AED",
      "MXN",
      "KES",
      "ZAR",
    ]);
  });

  it("suggests the local currency and falls back to USD", () => {
    expect(suggestCurrency("NG")).toBe("NGN");
    expect(suggestCurrency("gb")).toBe("GBP");
    expect(suggestCurrency("DE")).toBe("EUR");
    expect(suggestCurrency("ZZ")).toBe("USD");
    expect(suggestCurrency(null)).toBe("USD");
  });

  it("accepts new currencies without a code change", () => {
    registerCurrency({
      code: "JPY",
      name: "Japanese Yen",
      symbol: "¥",
      decimals: 0,
      countries: ["JP"],
    });
    expect(isSupportedCurrency("jpy")).toBe(true);
    expect(currencyMeta("JPY").decimals).toBe(0);
    expect(suggestCurrency("JP")).toBe("JPY");
  });

  it("formats an unknown code instead of throwing", () => {
    expect(currencyMeta("XXX").symbol).toBe("XXX");
  });
});

describe("conversion", () => {
  it("leaves an amount in its own currency alone", () => {
    const result = convert(1500, "NGN", "NGN", table(), { now: NOW });
    expect(result.status).toBe("ok");
    expect(result.result).toBe(1500);
    expect(result.effectiveRate).toBe(1);
  });

  it("uses a recorded direct rate and reports its timestamp", () => {
    const result = convert(100, "USD", "NGN", table(), { now: NOW });
    expect(result.status).toBe("ok");
    expect(result.result).toBe(134622.3823);
    expect(result.rateTimestamp).toBe("2026-10-30T17:20:14Z");
    expect(result.source).toBe("database");
  });

  it("inverts a pair that is only recorded the other way round", () => {
    const result = convert(1346.223823, "NGN", "USD", table(), { now: NOW });
    expect(result.status).toBe("ok");
    expect(result.result).toBeCloseTo(1, 6);
    expect(result.effectiveRate).toBeCloseTo(1 / 1346.223823, 8);
  });

  it("crosses through USD only when both legs are recorded, and says so", () => {
    const result = convert(1000, "GBP", "EUR", table(), { now: NOW });
    expect(result.status).toBe("bridged");
    expect(result.via).toBe("USD");
    const expected = 1000 * 1.334839 * (1 / 1.116153);
    expect(result.result).toBeCloseTo(expected, 4);
    expect(result.message).toContain("through USD");
  });

  it("refuses a pair with no recorded rate rather than inventing one", () => {
    const result = convert(100, "KES", "MXN", table(), { now: NOW });
    expect(result.status).toBe("unavailable");
    expect(result.result).toBeNull();
    expect(result.message).toContain("No recorded rate");
  });

  it("refuses a rate older than a week, and converts it only when told to", () => {
    const old = table({
      fetchedAt: "2026-10-01T00:00:00Z",
      quotes: [
        {
          base: "USD",
          quote: "NGN",
          rate: 1346.223823,
          provider: "open.er-api.com",
          fetchedAt: "2026-10-01T00:00:00Z",
        },
      ],
    });
    const refused = convert(100, "USD", "NGN", old, { now: NOW });
    expect(refused.status).toBe("stale");
    expect(refused.result).toBeNull();
    expect(refused.ageMs).toBeGreaterThan(REFUSE_AFTER_MS);

    const allowed = convert(100, "USD", "NGN", old, {
      now: NOW,
      allowStale: true,
    });
    expect(allowed.status).toBe("ok");
    expect(allowed.result).toBe(134622.3823);
  });

  it("marks a conversion made on the bundled snapshot as a fallback", () => {
    const result = convert(100, "USD", "NGN", BUNDLED_RATE_SNAPSHOT, {
      now: NOW,
    });
    expect(result.status).toBe("fallback");
    expect(result.source).toBe("bundled");
    expect(result.result).toBe(134622.3823);
    expect(result.message).toContain("saved");
  });

  it("keeps precision on large amounts", () => {
    const result = convert(9_876_543.21, "USD", "NGN", table(), { now: NOW });
    expect(result.result).toBe(13296037758.190893);
    expect(String(result.result)).not.toContain("e+");
  });

  it("refuses a non-numeric amount", () => {
    expect(
      convert(Number.NaN, "USD", "NGN", table(), { now: NOW }).status,
    ).toBe("unavailable");
  });
});

describe("formatting", () => {
  it("groups thousands with the currency symbol", () => {
    expect(formatMoney(1234567.5, "NGN")).toBe("₦1,234,567.50");
    expect(formatMoney(1234567.5, "NGN", { withCode: true })).toBe(
      "₦1,234,567.50 NGN",
    );
  });

  it("honours a zero-decimal currency", () => {
    expect(formatMoney(158305, "JPY")).toBe("¥158,305");
  });

  it("honours comma decimals for European readers", () => {
    expect(formatMoney(1234.5, "EUR", { decimalComma: true })).toBe(
      "€1.234,50",
    );
  });

  it("describes the rate and when it was captured, without em dashes", () => {
    const text = describeConversion(
      convert(100, "USD", "NGN", table(), { now: NOW }),
    );
    expect(text).toContain("USD");
    expect(text).toContain("NGN");
    expect(text).toContain("UTC");
    expect(text).not.toContain("—");
  });
});

describe("estimates", () => {
  const estimate = {
    currency: "USD",
    total: 2500,
    lines: [
      { label: "Tiles", amount: 1000 },
      { label: "Labour", amount: 1500 },
    ],
    pricedAt: "2026-10-20T00:00:00Z",
  };

  it("converts a view without touching the original estimate", () => {
    const snapshot = JSON.parse(JSON.stringify(estimate));
    const view = viewEstimate(estimate, "NGN", table(), { now: NOW });
    expect(view.convertedTotal).toBe(3365559.5575);
    expect(view.lines[0].converted).toBe(1346223.823);
    expect(view.original.currency).toBe("USD");
    expect(estimate).toEqual(snapshot);
  });

  it("gives every view the same original, so switching currency never rewrites prices", () => {
    const naira = viewEstimate(estimate, "NGN", table(), { now: NOW });
    const pounds = viewEstimate(estimate, "GBP", table(), { now: NOW });
    expect(naira.original).toBe(estimate);
    expect(pounds.original).toBe(estimate);
    expect(naira.original.total).toBe(2500);
    expect(pounds.original.currency).toBe("USD");
  });

  it("refuses to show a converted total when the rate is too old", () => {
    const aged = table({
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
    });
    const stale = viewEstimate(estimate, "NGN", aged, { now: NOW });
    expect(stale.convertedTotal).toBeNull();
    expect(stale.lines[0].converted).toBeNull();
    expect(stale.original.total).toBe(2500);
  });
});

describe("rate cache", () => {
  it("serves a cached table inside the refresh interval", async () => {
    const loader = vi.fn().mockResolvedValue(table());
    let clock = NOW;
    const cache = createRateCache(loader, { ttlMs: 60_000, now: () => clock });
    const first = await cache.get();
    clock += 30_000;
    const second = await cache.get();
    expect(first.table).toBe(second.table);
    expect(second.fromCache).toBe(true);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("reloads after the interval and on demand", async () => {
    const loader = vi.fn().mockResolvedValue(table());
    let clock = NOW;
    const cache = createRateCache(loader, { ttlMs: 60_000, now: () => clock });
    await cache.get();
    clock += 61_000;
    await cache.get();
    await cache.get(true);
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it("keeps the last good table when the rate service fails", async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce(table())
      .mockRejectedValueOnce(new Error("network down"));
    const cache = createRateCache(loader, { ttlMs: 1 });
    await cache.get();
    const second = await cache.get(true);
    expect(second.table.source).toBe("database");
    expect(second.fromCache).toBe(true);
    expect(second.error).toBe("network down");
  });

  it("falls back to the bundled snapshot when nothing has ever loaded", async () => {
    const cache = createRateCache(() => Promise.reject(new Error("offline")), {
      ttlMs: 1,
    });
    const result = await cache.get();
    expect(result.table.source).toBe("bundled");
    expect(result.error).toBe("offline");
    expect(result.table.quotes.length).toBeGreaterThan(0);
  });

  it("treats an empty response as a failure rather than a zero-rate table", async () => {
    const cache = createRateCache(
      async () => ({ source: "database", fetchedAt: "", quotes: [] }),
      { ttlMs: 1 },
    );
    const result = await cache.get();
    expect(result.table.source).toBe("bundled");
    expect(result.error).toContain("no rates");
  });

  it("keeps refresh intervals above a floor", () => {
    const cache = createRateCache(async () => table());
    cache.setRefreshInterval(10);
    expect(cache.refreshInterval()).toBe(MIN_REFRESH_INTERVAL_MS);
  });

  it("builds a table from recorded rows, newest row winning", () => {
    const built = buildRateTable([
      {
        base_currency: "usd",
        quote_currency: "ngn",
        rate: 1000,
        provider: "a",
        fetched_at: "2026-10-01T00:00:00Z",
      },
      {
        base_currency: "USD",
        quote_currency: "NGN",
        rate: 1346.223823,
        provider: "b",
        fetched_at: "2026-10-30T17:20:14Z",
      },
      {
        base_currency: "USD",
        quote_currency: "EUR",
        rate: 0,
        provider: "c",
        fetched_at: "2026-10-30T17:20:14Z",
      },
    ]);
    expect(built.quotes).toHaveLength(1);
    expect(built.quotes[0].rate).toBe(1346.223823);
    expect(built.fetchedAt).toBe("2026-10-30T17:20:14Z");
  });
});
