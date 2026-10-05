import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * fetchActivePriceForMarket: the current market's own price first, then
 * the market_profiles.inherits_from chain (US -> NG). A price found in
 * an ancestor market must be returned (with resolved_market), and a
 * price missing everywhere must resolve to null — never a guess.
 */

type Row = Record<string, unknown>;

function makePricesTable(rows: Row[]) {
  const state = { filters: {} as Record<string, unknown> };
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((col: string, val: unknown) => {
      state.filters[col] = val;
      return builder;
    }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(async () => {
      const match = rows.find(
        (r) =>
          Object.entries(state.filters).every(([c, v]) => r[c] === v) &&
          r.is_active === true,
      );
      return { data: match ? { ...match } : null, error: null };
    }),
  };
  return builder;
}

function makeProfilesTable(inherits: Record<string, string>) {
  const state = { filters: {} as Record<string, unknown> };
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((col: string, val: unknown) => {
      state.filters[col] = val;
      return builder;
    }),
    maybeSingle: vi.fn().mockImplementation(async () => {
      const code = state.filters.country_code as string | undefined;
      return {
        data:
          code !== undefined && code in inherits
            ? { inherits_from: inherits[code] }
            : null,
        error: null,
      };
    }),
  };
  return builder;
}

const priceTables: {
  prices: ReturnType<typeof makePricesTable>;
  profiles: ReturnType<typeof makeProfilesTable>;
} = { prices: null as never, profiles: null as never };

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) =>
      table === "estimation_prices" ? priceTables.prices : priceTables.profiles,
    ),
  },
  isSupabaseConfigured: true,
}));

import { fetchActivePriceForMarket } from "./queries";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchActivePriceForMarket", () => {
  it("returns the market's own price when one exists", async () => {
    priceTables.prices = makePricesTable([
      {
        price_type: "material",
        ref_id: "mat_1",
        market: "US",
        is_active: true,
        price: 39.96,
        currency: "USD",
      },
    ]);
    priceTables.profiles = makeProfilesTable({ US: "NG" });

    const { data, error, resolved_market } = await fetchActivePriceForMarket(
      "material",
      "mat_1",
      "US",
    );
    expect(error).toBeNull();
    expect(resolved_market).toBe("US");
    expect(data?.price).toBe(39.96);
  });

  it("falls back along the inheritance chain (US -> NG)", async () => {
    priceTables.prices = makePricesTable([
      {
        price_type: "material",
        ref_id: "mat_1",
        market: "NG",
        is_active: true,
        price: 8500,
        currency: "NGN",
      },
    ]);
    priceTables.profiles = makeProfilesTable({ US: "NG" });

    const { data, resolved_market } = await fetchActivePriceForMarket(
      "material",
      "mat_1",
      "US",
    );
    expect(resolved_market).toBe("NG");
    expect(data?.price).toBe(8500);
  });

  it("resolves to null when no price exists anywhere in the chain", async () => {
    priceTables.prices = makePricesTable([]);
    priceTables.profiles = makeProfilesTable({ US: "NG" });

    const { data, error, resolved_market } = await fetchActivePriceForMarket(
      "material",
      "mat_1",
      "US",
    );
    expect(data).toBeNull();
    expect(error).toBeNull();
    expect(resolved_market).toBe("NG");
  });
});
