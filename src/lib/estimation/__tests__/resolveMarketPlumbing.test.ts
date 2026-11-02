/**
 * resolveMarketPlumbing: fitting-family coverage test.
 *
 * The resolver must resolve BOTH pipe keys (per-metre) and fitting keys
 * (per-piece) from the market book, and report anything missing as
 * unresolved — never silently fall back to NG.
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

import { resolveMarketPlumbing } from "../structural-market";

describe("resolveMarketPlumbing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    materialChain.maybeSingle.mockImplementation(async () => ({ data: null }));
    priceChain.maybeSingle.mockImplementation(async () => ({ data: null }));
    priceChain.order.mockImplementation(() => priceChain);
    priceChain.limit.mockImplementation(() => priceChain);
  });

  it("queries both pipe AND fitting slug families for a non-NG market", async () => {
    await resolveMarketPlumbing("US");

    const queriedSlugs = materialChain.eq.mock.calls
      .filter((c) => (c as unknown[])[0] === "slug")
      .map((c) => (c as unknown[])[1]);
    expect(queriedSlugs).toEqual(
      expect.arrayContaining([
        "us-pipe-cold",
        "us-pipe-hot",
        "us-pipe-waste",
        "us-pipe-drainage",
        "us-elbow",
        "us-tee",
        "us-reducer",
        "us-union",
        "us-valve",
      ]),
    );
  });

  it("resolves a fitting price with per-piece wording and reports the rest unresolved", async () => {
    // first material lookup resolves; only the price for elbow resolves
    const materials: Record<string, { id: string; name: string }> = {
      "us-elbow": { id: "mat-elbow", name: "Lead-free brass crimp elbow, 1/2 in PEX (US)" },
    };
    // eq is a builder: only the slug/ref_id call decides the row; later
    // eq calls (is_active, market...) must not clobber the stub.
    materialChain.eq.mockImplementation(function (this: Chain, field: unknown, value: unknown) {
      if (field === "slug") {
        const m = materials[value as string];
        this.maybeSingle.mockImplementation(async () => ({ data: m ?? null }));
      }
      return this;
    } as never);
    priceChain.eq.mockImplementation(function (this: Chain, field: unknown, value: unknown) {
      if (field === "ref_id" && value === "mat-elbow") {
        this.maybeSingle.mockImplementation(async () => ({
          data: { price: 0.85, scan_confidence: "manual" },
        }));
      }
      return this;
    } as never);

    const result = await resolveMarketPlumbing("US");

    expect(result.overrides["plumb-elbow"]).toBe(0.85);
    const elbowProv = result.provenance.find((p) => p.engineKey === "plumb-elbow");
    expect(elbowProv?.explanation).toContain("Per-piece");
    expect(elbowProv?.explanation).toContain("verified supplier listing");
    // everything without book rows stays unresolved (disclosed, no NG fallback)
    expect(result.unresolved).toEqual(
      expect.arrayContaining(["plumb-tee", "plumb-reducer", "plumb-union", "plumb-valve"]),
    );
    expect(result.unresolved).not.toContain("plumb-elbow");
  });

  it("returns empty resolution for NG (NG prices come from the default flow)", async () => {
    const result = await resolveMarketPlumbing("NG");
    expect(result.overrides).toEqual({});
    expect(result.provenance).toEqual([]);
    expect(result.unresolved).toEqual([]);
    expect(materialChain.eq).not.toHaveBeenCalled();
  });
});
