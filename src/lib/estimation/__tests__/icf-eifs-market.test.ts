/**
 * ICF/EIFS market price resolution.
 *
 * Pins the rule that matters: a market's own book wins, an inherited
 * parent may satisfy it, and nothing is ever borrowed from the NG
 * reference for a market that names no ancestor.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

type Chain = Record<string, unknown> & { then?: unknown };

const makeChain = (result: unknown): Chain => {
  const chain: Chain = {};
  for (const m of ["select", "eq", "order", "limit"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
};

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";
const supabaseMock = supabase as unknown as { from: ReturnType<typeof vi.fn> };

import { resolveIcfPrices } from "../icf-eifs-market";

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe("resolveIcfPrices", () => {
  it("resolves the market's own book and marks verified prices", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "estimation_materials") {
        return makeChain({
          data: { id: "m1", name: "US ICF block" },
          error: null,
        });
      }
      if (table === "estimation_prices") {
        return makeChain({
          data: {
            price: 58.49,
            scan_confidence: "manual",
            price_source: "BuildBlock listing",
          },
          error: null,
        });
      }
      return makeChain({ data: null, error: null });
    });

    const res = await resolveIcfPrices("US");
    expect(res.prices["ICF-BLK-STR"]).toBe(58.49);
    expect(res.prices["ICF-BLK-CNR90"]).toBe(58.49);
    const prov = res.provenance.find((p) => p.key === "icf-form-block");
    expect(prov?.evidence).toBe("verified");
    expect(prov?.bookMarket).toBe("US");
  });

  it("labels indicative rows as indicative, never as verified", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "estimation_materials") {
        return makeChain({ data: { id: "m1", name: "Concrete" }, error: null });
      }
      if (table === "estimation_prices") {
        return makeChain({
          data: {
            price: 210,
            scan_confidence: "low",
            price_source: "Published band",
          },
          error: null,
        });
      }
      return makeChain({ data: null, error: null });
    });

    const res = await resolveIcfPrices("US");
    const prov = res.provenance.find((p) => p.key === "icf-concrete");
    expect(prov?.evidence).toBe("indicative");
  });

  it("reports unresolved codes when the market has no row", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "market_profiles") {
        return makeChain({ data: { inherits_from: null }, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const res = await resolveIcfPrices("DE");
    expect(Object.keys(res.prices)).toHaveLength(0);
    expect(res.unresolved).toContain("ICF-BLK-STR");
  });

  it("never resolves a market with no book and no ancestor", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "market_profiles") {
        return makeChain({ data: null, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const res = await resolveIcfPrices("NG");
    expect(res.provenance).toHaveLength(0);
    expect(res.unresolved.length).toBeGreaterThan(0);
  });
});
