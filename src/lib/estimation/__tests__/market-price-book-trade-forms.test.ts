import { beforeEach, describe, expect, it, vi } from "vitest";

// The book is assembled from three Supabase reads. Each test states the rows
// those reads return, so the assertion is about the guard rather than the data.
const priceRows: Array<Record<string, unknown>> = [];
const materialRows: Array<Record<string, unknown>> = [];

vi.mock("@/lib/supabase", () => {
  const makeBuilder = (name: string) => {
    const filters: Record<string, unknown> = {};
    const builder: Record<string, unknown> = {};
    // Only comparison methods filter. order/limit/select take options, not
    // predicates, and must never be read as a where clause.
    for (const method of ["eq", "is", "gte", "lte"]) {
      builder[method] = (key?: string, value?: unknown) => {
        if (typeof key === "string" && value !== undefined)
          filters[key] = value;
        return builder;
      };
    }
    for (const method of ["select", "order", "limit"]) {
      builder[method] = () => builder;
    }
    builder.then = (resolve: (value: unknown) => unknown) => {
      const source =
        name === "estimation_prices"
          ? priceRows
          : name === "estimation_materials"
            ? materialRows
            : [];
      const rows = source.filter((row) =>
        Object.entries(filters).every(([key, value]) => row[key] === value),
      );
      return Promise.resolve(resolve({ data: rows, error: null }));
    };
    return builder;
  };
  return { supabase: { from: (name: string) => makeBuilder(name) } };
});

const CEMENT = "11111111-1111-1111-1111-111111111111";
const SAND_M3 = "22222222-2222-2222-2222-222222222222";
const SAND_TRIP = "33333333-3333-3333-3333-333333333333";

const price = (ref_id: string, value: number, market: string) => ({
  id: `p-${ref_id}-${market}`,
  price_type: "material",
  ref_id,
  price: value,
  currency: market === "NG" ? "NGN" : "USD",
  market,
  effective_date: new Date().toISOString().slice(0, 10),
  notes: "fixture",
  is_active: true,
});

describe("market price book trade forms", () => {
  beforeEach(() => {
    priceRows.length = 0;
    materialRows.length = 0;
    materialRows.push(
      { id: CEMENT, slug: "cement-per-bag", name: "Cement (50 kg bag)" },
      { id: SAND_M3, slug: "sand-per-m3", name: "Sharp Sand" },
      {
        id: SAND_TRIP,
        slug: "sand-per-trip",
        name: "Sharp Sand (5-tonne tipper)",
      },
    );
  });

  it("keeps the tipper out of a US book", async () => {
    priceRows.push(price(SAND_TRIP, 42.25, "US"), price(SAND_M3, 13.65, "US"));
    const { fetchMarketPriceBook } = await import("@/lib/estimation/queries");
    const book = await fetchMarketPriceBook("US");
    expect(book.byRef.has(SAND_M3)).toBe(true);
    expect(book.byRef.has(SAND_TRIP)).toBe(false);
  });

  it("refuses a tipper that only exists as the Nigerian fallback", async () => {
    // No US row at all for the tipper: the NG reference book would supply it.
    priceRows.push(price(SAND_M3, 13.65, "US"), price(SAND_TRIP, 65000, "NG"));
    const { fetchMarketPriceBook } = await import("@/lib/estimation/queries");
    const book = await fetchMarketPriceBook("GB");
    expect(book.byRef.has(SAND_TRIP)).toBe(false);
    expect(book.fromReference.has(SAND_TRIP)).toBe(false);
  });

  it("still serves the Nigerian book to Nigeria", async () => {
    priceRows.push(price(SAND_TRIP, 65000, "NG"), price(SAND_M3, 21000, "NG"));
    const { fetchMarketPriceBook } = await import("@/lib/estimation/queries");
    const book = await fetchMarketPriceBook("NG");
    expect(book.byRef.get(SAND_TRIP)).toBe(65000);
  });

  it("filters the raw price fetch for a foreign market only", async () => {
    priceRows.push(price(SAND_TRIP, 42.25, "US"), price(CEMENT, 8.13, "US"));
    const { fetchAllPrices } = await import("@/lib/estimation/queries");
    const us = await fetchAllPrices(true, "US");
    expect(us.data.map((row) => row.ref_id)).toEqual([CEMENT]);
    const all = await fetchAllPrices(true);
    expect(all.data).toHaveLength(2);
  });
});
