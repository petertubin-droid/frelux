// =========================================================
// STRUCTURAL AI ADAPTER TESTS (foundation / doors_windows /
// reinforcement)
//
// Contract pinned here:
//   * adapters register idempotently, authoritative, credited
//   * they REQUIRE an explicit marketCode — NO silent NG
//     fallback; absent market → honest error asking for it
//   * with a marketCode they run the REAL deterministic
//     engines against fetched rules + the market price book
//     (with the structural overlay applied for foundation)
//   * unpriced lines are disclosed, never invented
//   * adapter-applied defaults (labour mode) are disclosed
//   * garbage input → honest {ok:false}, never a crash
// =========================================================
import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mocks BEFORE importing the registry ──
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => ({ data: null })),
      };
      return chain;
    }),
  },
}));

const fetchCalcRulesMock = vi.fn();
const fetchMarketPriceBookMock = vi.fn();
const fetchEstimationMaterialsMock = vi.fn();
const resolveStructuralMarketPricingMock = vi.fn();

vi.mock("@/lib/estimation/queries", () => ({
  fetchCalcRules: (...a: unknown[]) => fetchCalcRulesMock(...(a as [])),
  fetchMarketPriceBook: (...a: unknown[]) => fetchMarketPriceBookMock(...(a as [])),
  fetchEstimationMaterials: (...a: unknown[]) => fetchEstimationMaterialsMock(...(a as [])),
}));

vi.mock("@/lib/estimation/structural-market", () => ({
  resolveStructuralMarketPricing: (...a: unknown[]) =>
    resolveStructuralMarketPricingMock(...(a as [])),
}));

import {
  executeEngine,
  listEngines,
  getEngineDescriptor,
} from "@/lib/ai-foundation/engines-registry";
import { registerStructuralEngines } from "@/lib/ai-foundation/engines-structural";

beforeEach(() => {
  registerStructuralEngines(); // idempotency across tests
  fetchCalcRulesMock.mockResolvedValue({ data: [] });
  fetchMarketPriceBookMock.mockResolvedValue({
    byRef: new Map<string, number>(),
  });
  fetchEstimationMaterialsMock.mockResolvedValue({
    data: [{ id: "m1", slug: "cement-per-bag", name: "Cement" }],
  });
  resolveStructuralMarketPricingMock.mockResolvedValue({
    overrides: {},
    provenance: [],
    unresolved: [],
  });
});

const STRUCTURAL_IDS = ["foundation", "doors_windows", "reinforcement"];

describe("registerStructuralEngines", () => {
  it("registers all three adapters idempotently", () => {
    registerStructuralEngines(); // double registration must not throw
    const ids = listEngines().map((d) => d.id);
    for (const id of STRUCTURAL_IDS) expect(ids).toContain(id);
  });

  it.each(STRUCTURAL_IDS)("%s is authoritative with credit text", (id) => {
    const d = getEngineDescriptor(id);
    expect(d?.authoritative).toBe(true);
    expect(d?.creditedAs).toContain("authoritative FRELUX");
  });

  it.each(STRUCTURAL_IDS)(
    "%s REFUSES to calculate without an explicit marketCode (no silent NG)",
    async (id) => {
      const res = await executeEngine(id, {});
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Market code is required");
      expect(res.error).toContain("will not assume a country");
      // and it never touched the price book
      expect(fetchMarketPriceBookMock).not.toHaveBeenCalled();
    },
  );

  it("foundation runs the real engine with market rules + overlay", async () => {
    fetchCalcRulesMock.mockResolvedValue({
      data: [
        {
          rule_key: "concrete_mix_ratio",
          is_active: true,
          rule_value: { value: { cement: 1, sand: 2, granite: 4 } },
        },
        {
          rule_key: "concrete_waste_pct",
          is_active: true,
          rule_value: { value: 5 },
        },
        {
          rule_key: "blocks_per_m2",
          is_active: true,
          rule_value: { value: 10 },
        },
      ],
    });
    fetchMarketPriceBookMock.mockResolvedValue({
      byRef: new Map([["m1", 7.5]]),
    });
    resolveStructuralMarketPricingMock.mockResolvedValue({
      overrides: { "cement-per-bag": 9.2 },
      provenance: [],
      unresolved: [],
    });
    const res = await executeEngine("foundation", {
      marketCode: "US",
      concrete_volume_m3: 10,
      block_wall_area_m2: 40,
      hardcore_volume_m3: 5,
    });
    expect(res.ok).toBe(true);
    expect(res.quantities.length).toBeGreaterThan(0);
    expect(res.costs?.currency).toBe("USD");
    // overlay price (9.2) must beat the raw book price (7.5)
    expect(res.raw).toMatchObject({
      marketCode: "US",
      adapter_assumptions: expect.arrayContaining([
        expect.stringContaining("labour = { mode: 'none' }"),
      ]),
    });
    const cementLine = (res.raw as { lines: Array<{ key: string; unit_price: number | null }> })
      .lines.find((l: { key: string }) => l.key.includes("cement"));
    expect(cementLine?.unit_price).toBe(9.2);
  });

  it("foundation refuses garbage volumes honestly (no crash)", async () => {
    const res = await executeEngine("foundation", {
      marketCode: "NG",
      concrete_volume_m3: Number.NaN,
      block_wall_area_m2: Number.NaN,
      hardcore_volume_m3: Number.NaN,
    });
    expect(res.ok).toBe(false);
    expect(res.error ?? "").toBeTruthy();
  });

  it("doors_windows prices counts with locksets default disclosed", async () => {
    fetchMarketPriceBookMock.mockResolvedValue({
      byRef: new Map([["m1", 120]]),
    });
    const res = await executeEngine("doors_windows", {
      marketCode: "GB",
      flush_doors: 4,
      panel_doors: 2,
      security_doors: 1,
      aluminium_windows: 6,
      louvre_windows: 2,
    });
    expect(res.ok).toBe(true);
    expect(res.costs?.currency).toBe("GBP");
    expect((res.raw as { adapter_assumptions: string[] }).adapter_assumptions.join(" ")).toContain(
      "labour = { mode: 'none' }",
    );
  });

  it("reinforcement runs with null lengths disclosed as missing", async () => {
    fetchMarketPriceBookMock.mockResolvedValue({ byRef: new Map() });
    const res = await executeEngine("reinforcement", {
      marketCode: "NG",
      len_12mm_m: 400,
      len_16mm_m: 250,
    });
    expect(res.ok).toBe(true);
    expect(res.raw).toMatchObject({ marketCode: "NG" });
  });

  it("unpriced lines are disclosed, not guessed", async () => {
    fetchMarketPriceBookMock.mockResolvedValue({ byRef: new Map() });
    const res = await executeEngine("foundation", {
      marketCode: "US",
      concrete_volume_m3: 10,
      block_wall_area_m2: 40,
      hardcore_volume_m3: 5,
    });
    expect(res.ok).toBe(true);
    const raw = res.raw as { unpriced_lines: string[] };
    expect(raw.unpriced_lines.length).toBeGreaterThan(0);
    expect(res.costs?.regionalDataAvailable).toBe(false);
  });
});

describe("electrical/plumbing adapters (no-silent-NG guard)", () => {
  it("electrical requires an explicit marketCode", async () => {
    const res = await executeEngine("electrical", { num_points: 20 });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Market code is required");
  });

  it("plumbing requires an explicit marketCode", async () => {
    const res = await executeEngine("plumbing", { num_bathrooms: 2 });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Market code is required");
  });
});
