import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildIlikeOrFilter } from "./search-term";

/**
 * The queries these functions build, not just that they return something.
 *
 * Both marketplace searches interpolate a user's search term into a PostgREST
 * `.or()` expression, which is query language rather than a value, so the term has
 * to be sanitised before it is composed. These tests watch what actually reaches
 * the client, and cover the two other filters that were quietly wrong.
 */

const calls: { method: string; args: unknown[] }[] = [];

function chainable(): Record<string, unknown> {
  const proxy: Record<string, unknown> = {};
  const methods = [
    "select",
    "eq",
    "in",
    "or",
    "ilike",
    "gte",
    "lte",
    "neq",
    "order",
    "range",
    "limit",
  ];
  for (const method of methods) {
    proxy[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return proxy;
    };
  }
  proxy.single = async () => ({ data: null, error: null });
  proxy.maybeSingle = async () => ({ data: null, error: null });
  proxy.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
  return proxy;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => {
      calls.length = 0;
      return chainable();
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
  isSupabaseConfigured: true,
}));

const { searchProducts } = await import("./marketplace-products");
const { fetchListings } = await import("./marketplace");

function orArgument(): string {
  const call = calls.filter((c) => c.method === "or").pop();
  return (call?.args[0] as string) ?? "";
}

function lastOrderField(): unknown {
  const call = calls.filter((c) => c.method === "order").pop();
  return call?.args[0];
}

beforeEach(() => {
  calls.length = 0;
});

describe("the search filter builder", () => {
  it("produces plain ilike clauses", () => {
    expect(buildIlikeOrFilter(["title", "brand"], "cement 50kg")).toBe(
      "title.ilike.%cement 50kg%,brand.ilike.%cement 50kg%",
    );
  });

  it("cannot produce filter syntax from the term", () => {
    const filter = buildIlikeOrFilter(["title"], "a),status.eq.draft");
    expect(filter).not.toContain(")");
    expect(filter).not.toContain("status.eq.draft");
    expect(filter).toBe("title.ilike.%a status eq draft%");
  });

  it("declines to search when nothing usable survives", () => {
    expect(buildIlikeOrFilter(["title"], "%%%")).toBeNull();
    expect(buildIlikeOrFilter([], "tiles")).toBeNull();
  });
});

describe("product search queries", () => {
  it("sanitises the term before it reaches the API", async () => {
    await searchProducts({ search: "cheap,used),status.eq.draft" });
    const or = orArgument();
    // The clauses themselves are comma-joined; what must not survive is a comma
    // inside the search term, which would spawn a clause the caller never wrote.
    expect(or).not.toContain("cheap,used");
    expect(or).toBe(
      "title.ilike.%cheap used status eq draft%,description.ilike.%cheap used status eq draft%,brand.ilike.%cheap used status eq draft%",
    );
  });

  it("sends no text filter at all when the term is unusable", async () => {
    await searchProducts({ search: "%%%" });
    expect(calls.some((c) => c.method === "or")).toBe(false);
  });

  it("upper-cases the country so a lower-case code matches", async () => {
    await searchProducts({ location_country: "ng" });
    const country = calls.find(
      (c) => c.method === "eq" && c.args[0] === "location_country",
    );
    expect(country?.args[1]).toBe("NG");
  });

  it("orders by id last so paging cannot repeat or skip a row", async () => {
    await searchProducts({ sort: "price_low" });
    expect(lastOrderField()).toBe("id");
  });
});

describe("listing search queries", () => {
  it("sanitises the term the same way", async () => {
    await fetchListings({ search: "tiles,tiling)" });
    expect(orArgument()).toBe(
      "title.ilike.%tiles tiling%,description.ilike.%tiles tiling%",
    );
  });

  it("orders by id last for stable paging", async () => {
    await fetchListings({});
    expect(lastOrderField()).toBe("id");
  });
});
