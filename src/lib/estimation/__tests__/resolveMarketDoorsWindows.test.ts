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

    materialChain.eq.mockImplementation(function (this: Chain, field: unknown, value: unknown) {
      if (field === "slug") {
        const m = materials[value as string];
        this.maybeSingle.mockImplementation(async () => ({ data: m ?? null }));
      }
      return this;
    } as never);

    priceChain.eq.mockImplementation(function (this: Chain, field: unknown, value: unknown) {
      if (field === "ref_id") {
        if (value === "mat-us-flush") {
          this.maybeSingle.mockImplementation(async () => ({
            data: { price: 68.0, scan_confidence: "manual", price_source: "The Home Depot (US)" },
          }));
        } else if (value === "mat-us-frame") {
          this.maybeSingle.mockImplementation(async () => ({
            data: { price: 61.98, scan_confidence: "manual", price_source: "The Home Depot (US)" },
          }));
        }
      }
      return this;
    } as never);

    const result = await resolveMarketDoorsWindows("US");

    expect(result.overrides["door-flush"]).toBe(68.0);
    expect(result.overrides["door-frame"]).toBe(61.98);

    const flushProv = result.provenance.find((p) => p.engineKey === "door-flush");
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
});
