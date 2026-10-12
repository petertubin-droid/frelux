import { describe, expect, it, vi } from "vitest";

/**
 * FRELUX INTERNATIONAL ARCHITECTURE, market price book accuracy.
 *
 * The estimator pages must never mix currencies: a US visitor's map
 * may only carry US rows, plus a disclosed NG fallback for refs the
 * US book does not price. The old pattern (fetchAllPrices() with no
 * market filter) let whichever row was newest win for EVERY market.
 */

interface PricedRow {
  ref_id: string;
  price: number;
  price_type: string;
  market: string;
  is_active: boolean;
  effective_date: string;
}

function rows(...rs: Partial<PricedRow>[]): PricedRow[] {
  return rs.map((r) => ({
    ref_id: r.ref_id ?? "ref-1",
    price: r.price ?? 1,
    price_type: r.price_type ?? "material",
    market: r.market ?? "NG",
    is_active: r.is_active ?? true,
    effective_date: r.effective_date ?? "2026-01-01",
  }));
}

const US_ROWS = rows(
  // ref-1 has BOTH books: the US row must win for the US visitor.
  { ref_id: "ref-1", price: 12, market: "US" },
  // ref-2 is US-only: present, no fallback needed.
  { ref_id: "ref-2", price: 4, market: "US" },
  // a stale US row for ref-3 loses to the newer US row.
  { ref_id: "ref-3", price: 99, market: "US", effective_date: "2025-01-01" },
  { ref_id: "ref-3", price: 7, market: "US", effective_date: "2026-06-01" },
  // labour rows are not material prices - excluded entirely.
  { ref_id: "ref-1", price: 55, price_type: "labour", market: "US" },
);

const NG_ROWS = rows(
  { ref_id: "ref-1", price: 9000, market: "NG" },
  { ref_id: "ref-3", price: 5000, market: "NG" },
  // ref-4 is NG-only: becomes a DISCLOSED fallback for the US visitor.
  { ref_id: "ref-4", price: 2500, market: "NG" },
);

vi.mock("@/lib/supabase", () => {
  const chain: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    then: (resolve: (v: unknown) => void) => void;
    __rows: PricedRow[] | null;
  } = {
    select: vi.fn(() => chain),
    eq: vi.fn((col: string, val: unknown) => {
      // fetchAllPrices(activeOnly, market?) issues two eq calls:
      // is_active then market. Track the market to return its rows.
      if (col === "market") {
        chain.__rows = val === "US" ? US_ROWS : NG_ROWS;
      }
      return chain;
    }),
    order: vi.fn(() => chain),
    // mirror the real query's ordering: newest effective_date first,
    // so "first row wins" matches production semantics
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve({
        data: [...(chain.__rows ?? NG_ROWS)].sort(
          (a, b) => (a.effective_date < b.effective_date ? 1 : -1),
        ),
        error: null,
      }).then(resolve),
    __rows: null as PricedRow[] | null,
  };
  return {
    supabase: { from: vi.fn().mockReturnValue(chain) },
    isSupabaseConfigured: true,
  };
});

const { fetchMarketPriceBook } = await import("./queries");

describe("fetchMarketPriceBook", () => {
  it("US visitor: US rows win, NG-only refs fall back WITH disclosure", async () => {
    const book = await fetchMarketPriceBook("US");
    expect(book.byRef.get("ref-1")).toBe(12); // US USD row, not NG naira
    expect(book.byRef.get("ref-2")).toBe(4); // US-only
    expect(book.byRef.get("ref-3")).toBe(7); // newest US row
    expect(book.byRef.get("ref-4")).toBe(2500); // NG fallback price
    // and the fallback is disclosed, not silent:
    expect(book.fromReference.has("ref-4")).toBe(true);
    expect(book.fromReference.has("ref-1")).toBe(false);
    expect(book.fromReference.has("ref-2")).toBe(false);
  });

  it("Nigeria visitor: the NG reference book only, nothing flagged", async () => {
    const book = await fetchMarketPriceBook("NG");
    expect(book.byRef.get("ref-1")).toBe(9000);
    expect(book.byRef.get("ref-4")).toBe(2500);
    expect(book.fromReference.size).toBe(0);
  });

  it("labour rows never enter the material book", async () => {
    const book = await fetchMarketPriceBook("US");
    expect(book.byRef.get("ref-1")).not.toBe(55);
  });
});
