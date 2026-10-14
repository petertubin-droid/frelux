/**
 * resolveMarketDoorsWindows: doors & windows market resolution test.
 *
 * The resolver must resolve doors, frames, hinges, locksets, and windows
 * from the market book, and report anything missing as unresolved —
 * never silently fall back to NG reference prices.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

type Chain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

const makeChain = (): Chain => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: null }));
  return chain as unknown as Chain;
};

const materialChain = makeChain();
const priceChain = makeChain();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) =>
      table === "estimation_materials" ? materialChain : priceChain,
    ),
  },
}));

import {
  resolveMarketDoorsWindows,
  DOORS_WINDOWS_ENGINE_KEYS,
} from "../structural-market";

describe("resolveMarketDoorsWindows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    materialChain.maybeSingle.mockImplementation(async () => ({ data: null }));
    priceChain.maybeSingle.mockImplementation(async () => ({ data: null }));
    priceChain.order.mockImplementation(() => priceChain);
    priceChain.limit.mockImplementation(() => priceChain);
  });

  it("returns empty resolution for NG (NG prices come from default price book flow)", async () => {
    const result = await resolveMarketDoorsWindows("NG");
    expect(result.overrides).toEqual({});
    expect(result.provenance).toEqual([]);
    expect(result.unresolved).toEqual([]);
    expect(materialChain.eq).not.toHaveBeenCalled();
  });

  it("queries all 8 doors & windows engine keys for a non-NG market", async () => {
    await resolveMarketDoorsWindows("US");

    const queriedSlugs = materialChain.eq.mock.calls
      .filter((c) => (c as unknown[])[0] === "slug")
      .map((c) => (c as unknown[])[1]);

    for (const key of DOORS_WINDOWS_ENGINE_KEYS) {
      expect(queriedSlugs).toContain(`us-${key}`);
    }
  });

  it("resolves market-specific price overrides and marks unpriced keys as unresolved", async () => {
    const materials: Record<string, { id: string; name: string }> = {
      "us-door-flush": {
        id: "mat-us-flush",
        name: "Hollow Core Flush Interior Door Slab, 32x80 in (US)",
      },
      "us-door-frame": {
        id: "mat-us-frame",
        name: "Split Jamb Interior Door Frame Kit (US)",
      },
    };

    materialChain.eq.mockImplementation(function (
      this: Chain,
      field: unknown,
      value: unknown,
    ) {
      if (field === "slug") {
        const m = materials[value as string];
        this.maybeSingle.mockImplementation(async () => ({ data: m ?? null }));
      }
      return this;
    } as never);

    priceChain.eq.mockImplementation(function (
      this: Chain,
      field: unknown,
      value: unknown,
    ) {
      if (field === "ref_id") {
        if (value === "mat-us-flush") {
          this.maybeSingle.mockImplementation(async () => ({
            data: {
              price: 68.0,
              scan_confidence: "manual",
              price_source: "The Home Depot (US)",
            },
          }));
        } else if (value === "mat-us-frame") {
          this.maybeSingle.mockImplementation(async () => ({
            data: {
              price: 61.98,
              scan_confidence: "manual",
              price_source: "The Home Depot (US)",
            },
          }));
        }
      }
      return this;
    } as never);

    const result = await resolveMarketDoorsWindows("US");

    expect(result.overrides["door-flush"]).toBe(68.0);
    expect(result.overrides["door-frame"]).toBe(61.98);

    const flushProv = result.provenance.find(
      (p) => p.engineKey === "door-flush",
    );
    expect(flushProv?.resolved).toBe(true);
    expect(flushProv?.bookMarket).toBe("US");
    expect(flushProv?.price).toBe(68.0);
    expect(flushProv?.explanation).toContain("The Home Depot (US)");

    expect(result.unresolved).toEqual(
      expect.arrayContaining([
        "door-panel",
        "door-security",
        "door-hinge",
        "door-lockset",
        "window-aluminium",
        "window-louver",
      ]),
    );
    expect(result.unresolved).not.toContain("door-flush");
    expect(result.unresolved).not.toContain("door-frame");
  });

  it("resolves South Africa (ZA) doors & windows price book with 7 overrides and marks window-louver unresolved", async () => {
    const zaMaterials: Record<string, { id: string; name: string }> = {
      "door-flush": {
        id: "mat-za-flush",
        name: "Hardboard Wood Door 813x2032mm",
      },
      "door-panel": {
        id: "mat-za-panel",
        name: "Tudor Moulded 6 Panel Door 813x2032mm",
      },
      "door-frame": { id: "mat-za-frame", name: "Hardwood Door Frame 58x40mm" },
      "door-hinge": {
        id: "mat-za-hinge",
        name: "Galvanised Steel Butt Hinge 100mm",
      },
      "door-lockset": {
        id: "mat-za-lockset",
        name: "2-Lever Lockset with Handles",
      },
      "window-aluminium": {
        id: "mat-za-window",
        name: "Aluminium Top Hung Window 900x1200mm",
      },
      "door-security": {
        id: "mat-za-security",
        name: "Aluminium Sliding Door 1790x2090mm",
      },
      "window-louver": { id: "mat-za-louver", name: "Window Louver Frame" },
    };

    const zaPrices: Record<string, number> = {
      "mat-za-flush": 302.95,
      "mat-za-panel": 439.95,
      "mat-za-frame": 363.0,
      "mat-za-hinge": 23.0,
      "mat-za-lockset": 250.0,
      "mat-za-window": 1434.0,
      "mat-za-security": 3709.0,
    };

    materialChain.eq.mockImplementation(function (
      this: Chain,
      field: unknown,
      value: unknown,
    ) {
      if (field === "slug") {
        const m = zaMaterials[value as string];
        this.maybeSingle.mockImplementation(async () => ({ data: m ?? null }));
      }
      return this;
    } as never);

    priceChain.eq.mockImplementation(function (
      this: Chain,
      field: unknown,
      value: unknown,
    ) {
      if (field === "ref_id") {
        const price = zaPrices[value as string];
        this.maybeSingle.mockImplementation(async () => ({
          data:
            price !== undefined
              ? {
                  price,
                  scan_confidence: "manual",
                  price_source: "Cashbuild / Doors Direct (ZA)",
                }
              : null,
        }));
      }
      return this;
    } as never);

    const result = await resolveMarketDoorsWindows("ZA");

    expect(result.overrides["door-flush"]).toBe(302.95);
    expect(result.overrides["door-panel"]).toBe(439.95);
    expect(result.overrides["door-frame"]).toBe(363.0);
    expect(result.overrides["door-hinge"]).toBe(23.0);
    expect(result.overrides["door-lockset"]).toBe(250.0);
    expect(result.overrides["window-aluminium"]).toBe(1434.0);
    expect(result.overrides["door-security"]).toBe(3709.0);

    expect(result.unresolved).toContain("window-louver");
    expect(result.unresolved).not.toContain("door-flush");
  });

  it("resolves France (FR) doors & windows price book leaving non-equivalent items unresolved", async () => {
    const frMaterials: Record<string, { id: string; name: string }> = {
      "door-flush": {
        id: "mat-fr-flush",
        name: "Bloc-porte isoplane prépeint 204x73cm",
      },
      "door-panel": {
        id: "mat-fr-panel",
        name: "Bloc-porte isoplane prépeint décor 204x83cm",
      },
      "door-hinge": {
        id: "mat-fr-hinge",
        name: "Paumelle de bâtiment 110x55mm",
      },
      "door-lockset": {
        id: "mat-fr-lockset",
        name: "Ensemble de poignées de porte Cyriac",
      },
      "door-frame": { id: "mat-fr-frame", name: "Huisserie de porte" },
      "door-security": { id: "mat-fr-security", name: "Porte blindée A2P" },
      "window-aluminium": {
        id: "mat-fr-window",
        name: "Fenêtre aluminium coulissante",
      },
      "window-louver": { id: "mat-fr-louver", name: "Jalousie persienne" },
    };

    const frPrices: Record<string, number> = {
      "mat-fr-flush": 39.9,
      "mat-fr-panel": 69.9,
      "mat-fr-hinge": 1.99,
      "mat-fr-lockset": 9.9,
    };

    materialChain.eq.mockImplementation(function (
      this: Chain,
      field: unknown,
      value: unknown,
    ) {
      if (field === "slug") {
        const m = frMaterials[value as string];
        this.maybeSingle.mockImplementation(async () => ({ data: m ?? null }));
      }
      return this;
    } as never);

    priceChain.eq.mockImplementation(function (
      this: Chain,
      field: unknown,
      value: unknown,
    ) {
      if (field === "ref_id") {
        const price = frPrices[value as string];
        this.maybeSingle.mockImplementation(async () => ({
          data:
            price !== undefined
              ? {
                  price,
                  scan_confidence: "manual",
                  price_source: "Brico Dépôt (FR)",
                }
              : null,
        }));
      }
      return this;
    } as never);

    const result = await resolveMarketDoorsWindows("FR");

    expect(result.overrides["door-flush"]).toBe(39.9);
    expect(result.overrides["door-panel"]).toBe(69.9);
    expect(result.overrides["door-hinge"]).toBe(1.99);
    expect(result.overrides["door-lockset"]).toBe(9.9);

    expect(result.unresolved).toEqual(
      expect.arrayContaining([
        "door-frame",
        "door-security",
        "window-aluminium",
        "window-louver",
      ]),
    );
  });
});
