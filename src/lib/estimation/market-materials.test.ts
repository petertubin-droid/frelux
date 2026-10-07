import { describe, it, expect, vi, beforeEach } from "vitest";

function createChainable() {
  const chain: Record<string, unknown> = {
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    ),
  };
  const proxy = new Proxy(chain, {
    get(target: Record<string, unknown>, prop: string) {
      if (prop in target) return target[prop];
      if (prop === "then") return target.then;
      target[prop] = vi.fn().mockReturnValue(proxy);
      return target[prop];
    },
  });
  return proxy;
}

const maybeSingle = vi.fn();
const fromMock = vi.fn().mockReturnValue(createChainable());

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
  isSupabaseConfigured: true,
}));

const { MATERIAL_ROLES, resolveMaterialPriceByRole, fetchInheritanceChain } =
  await import("@/lib/estimation/market-materials");

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.mockReturnValue(createChainable());
});

describe("estimation/market-materials", () => {
  it("MATERIAL_ROLES covers the engine roles both markets map", () => {
    expect(MATERIAL_ROLES).toContain("bonding-agent");
    expect(MATERIAL_ROLES).toContain("mold-treatment");
    expect(MATERIAL_ROLES).toContain("interior-paint");
    expect(MATERIAL_ROLES).toContain("primer");
  });

  it("returns null when the market has no mapping: never guesses", async () => {
    const proxy = createChainable();
    proxy.maybeSingle = maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    fromMock.mockReturnValue(proxy);
    const resolved = await resolveMaterialPriceByRole("caulk", "NG");
    expect(resolved).toBeNull();
  });

  it("follows the inherits_from chain from a market to its parent", async () => {
    // market_profiles: US inherits NG, NG inherits nothing
    const marketProxy = createChainable();
    let profileCalls = 0;
    marketProxy.maybeSingle = vi.fn(() => {
      profileCalls += 1;
      // call 1/3 query US -> inherits NG; calls 2/4 query NG -> inherits nothing
      return {
        data:
          profileCalls % 2 === 1
            ? { inherits_from: "NG" }
            : { inherits_from: null },
        error: null,
      };
    });
    // roles: first query (candidate US) has no mapping, second (NG) does
    const rolesProxy = createChainable();
    rolesProxy.maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          material_slug: "water-seal",
          role: "waterproofer",
          market: "NG",
          display_name: "Water Seal",
          unit_label: "unit",
          notes: null,
        },
        error: null,
      });
    const materialProxy = createChainable();
    materialProxy.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "m1",
        slug: "water-seal",
        name: "Water Seal",
        is_active: true,
      },
      error: null,
    });
    const priceProxy = createChainable();
    priceProxy.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "p1",
        price: 1500,
        currency: "NGN",
        market: "NG",
        price_type: "material",
        ref_id: "m1",
        is_active: true,
      },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "market_profiles") return marketProxy;
      if (table === "market_material_roles") return rolesProxy;
      if (table === "estimation_materials") return materialProxy;
      return priceProxy;
    });
    const chain = await fetchInheritanceChain("US");
    expect(chain).toEqual(["US", "NG"]);
    const resolved = await resolveMaterialPriceByRole("waterproofer", "US");
    expect(resolved).not.toBeNull();
    expect(resolved?.resolved_market).toBe("NG");
    expect(resolved?.price.price).toBe(1500);
  });
});
