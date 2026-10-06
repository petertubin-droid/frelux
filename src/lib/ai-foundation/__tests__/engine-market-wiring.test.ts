// =========================================================
// ENGINE MARKET WIRING TESTS
//
// The registry engines (painting_project, screeding_system,
// tyrolene_system) price through the market's verified price
// book by ROLE when the caller supplies a marketCode:
//   * local brand names surface in cost lines and quantities
//   * provenance (source, scan, market book) rides in raw
//   * without a marketCode the engines keep the manual
//     calculator contract (costs null, never invented)
//   * unpriced roles are reported, not guessed
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

const fetchScreedingSystemConfig = vi.fn();
vi.mock("@/lib/queries", () => ({
  fetchPaintTypes: vi.fn(async () => ({ data: [] })),
  fetchScreedingSystemConfig: (...args: unknown[]) =>
    fetchScreedingSystemConfig(...(args as [])),
}));

vi.mock("@/lib/estimation/queries", () => ({
  fetchCalcRule: vi.fn(async () => ({ data: null })),
}));

const resolveEnginePrice = vi.fn();
vi.mock("@/lib/ai-foundation/engine-pricing", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/ai-foundation/engine-pricing")
  >("@/lib/ai-foundation/engine-pricing");
  return {
    ...actual,
    resolveEnginePrice: (...args: unknown[]) =>
      resolveEnginePrice(...(args as [])),
  };
});

const loadTyroleneCalcConfig = vi.fn();
vi.mock("@/lib/estimation/tyrolene-config", () => ({
  loadTyroleneCalcConfig: (...args: unknown[]) =>
    loadTyroleneCalcConfig(...(args as [])),
}));

import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import { registerPhase2Engines } from "@/lib/ai-foundation/engines-phase2";

registerPhase2Engines();

const PAINT_PRICE = {
  role: "interior-paint" as const,
  materialName: "KILZ 2 All-Purpose",
  unitPrice: 42.99,
  packUnits: 3.785,
  purchaseLabel: "1 gallon",
  currency: "USD",
  resolvedMarket: "US",
  priceSource: "Home Depot scan",
  scanSource: "homedepot.com",
  priceDate: "2026-10-01",
};

const PRIMER_PRICE = {
  ...PAINT_PRICE,
  role: "primer" as const,
  materialName: "Zinsser Bullseye 1-2-3",
  unitPrice: 24.5,
  packUnits: 3.785,
  purchaseLabel: "1 gallon",
};

const JOINT_COMPOUND = {
  role: "joint-filler" as const,
  materialName: "USG Sheetrock Joint Compound",
  unitPrice: 18.75,
  packUnits: null,
  purchaseLabel: "bag",
  currency: "USD",
  resolvedMarket: "US",
  priceSource: "Home Depot scan",
  scanSource: "homedepot.com",
  priceDate: "2026-10-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  resolveEnginePrice.mockReset();
});

describe("tyrolene_system registration", () => {
  it("registers the full tyrolene engine alongside the area engine", () => {
    const ids = listEngines().map((d) => d.id);
    expect(ids).toContain("tyrolene_system");
    expect(ids).toContain("tyrolene_partition_area");
  });
});

describe("painting_project market wiring", () => {
  const baseInput = {
    length: 5,
    width: 4,
    wallHeight: 3,
    doors: 2,
    windows: 2,
    coats: 2,
    projectType: "room" as const,
  };

  it("stays unpriced without a marketCode (manual-calculator contract)", async () => {
    const res = await executeEngine("painting_project", { ...baseInput });
    expect(res.ok).toBe(true);
    expect(res.costs).toBeNull();
  });

  it("prices by role with the local brand name when a marketCode is given", async () => {
    resolveEnginePrice.mockImplementation(async (role: string) =>
      role === "primer" ? PRIMER_PRICE : PAINT_PRICE,
    );
    const res = await executeEngine("painting_project", {
      ...baseInput,
      marketCode: "US",
    });
    expect(res.ok).toBe(true);
    expect(res.costs).not.toBeNull();
    expect(res.costs!.currency).toBe("USD");
    expect(res.costs!.regionalDataAvailable).toBe(true);
    const labels = res.costs!.lines!.map((l) => l.label);
    expect(labels.some((l) => l.includes("KILZ 2 All-Purpose"))).toBe(true);
    // Total is the sum of the priced lines — nothing invented beyond them.
    const sum = res.costs!.lines!.reduce((s, l) => s + l.amount, 0);
    expect(res.costs!.total).toBeCloseTo(sum, 2);
    const raw = res.raw as {
      pricing: { lines: Array<{ provenance: string }> };
    };
    expect(raw.pricing.lines[0].provenance).toContain("US market book");
  });

  it("reports unpriced roles instead of guessing", async () => {
    resolveEnginePrice.mockResolvedValue(null);
    const res = await executeEngine("painting_project", {
      ...baseInput,
      marketCode: "IN",
    });
    expect(res.ok).toBe(true);
    expect(res.costs).toBeNull();
    const raw = res.raw as { pricing: { unpriced: string[] } };
    expect(raw.pricing.unpriced).toContain("interior-paint");
  });

  it("uses the exterior paint role for exterior projects", async () => {
    resolveEnginePrice.mockResolvedValue(PAINT_PRICE);
    await executeEngine("painting_project", {
      ...baseInput,
      projectType: "exterior",
      marketCode: "US",
    });
    expect(resolveEnginePrice).toHaveBeenCalledWith(
      "exterior-paint",
      "US",
      "NGN",
    );
  });
});

describe("screeding_system market wiring", () => {
  const dbConfig = (prices: {
    putty?: number | null;
    paint?: number | null;
    cement?: number | null;
  }) => ({
    system_type: "white_cement_paint",
    display_name: "White Cement + Screeding Paint",
    description: null,
    coverage_area_m2: 60,
    coverage_unit: "m²",
    default_coats: 2,
    waste_percentage: 10,
    currency: "USD",
    currency_symbol: "$",
    putty_name: null,
    putty_quantity: null,
    putty_unit: null,
    putty_price_per_unit: prices.putty ?? null,
    paint_name: null,
    paint_quantity: 0.4,
    paint_unit: "bags",
    paint_price_per_unit: prices.paint ?? null,
    cement_name: null,
    cement_quantity: 0.5,
    cement_unit: "bags",
    cement_price_per_unit: prices.cement ?? null,
    rounding_rule: "ceil" as const,
  });

  it("resolves missing config prices by role with local brand names", async () => {
    fetchScreedingSystemConfig.mockResolvedValue({
      data: dbConfig({}),
      error: null,
    });
    resolveEnginePrice.mockResolvedValue(JOINT_COMPOUND);
    const res = await executeEngine("screeding_system", {
      areaM2: 120,
      marketCode: "US",
    });
    expect(res.ok).toBe(true);
    expect(res.costs).not.toBeNull();
    expect(res.costs!.regionalDataAvailable).toBe(true);
    const names = res.costs!.lines!.map((l) => l.label);
    expect(names.some((l) => l.includes("USG Sheetrock Joint Compound"))).toBe(
      true,
    );
    const raw = res.raw as {
      pricing: { lines: Array<{ provenance: string }>; market: string };
    };
    expect(raw.pricing.market).toBe("US");
    expect(raw.pricing.lines.length).toBeGreaterThan(0);
  });

  it("keeps admin config prices authoritative when they exist", async () => {
    fetchScreedingSystemConfig.mockResolvedValue({
      data: dbConfig({ paint: 12, cement: 8 }),
      error: null,
    });
    const res = await executeEngine("screeding_system", {
      areaM2: 120,
      marketCode: "NG",
    });
    expect(res.ok).toBe(true);
    expect(res.costs).not.toBeNull();
    // Config prices set → no role lookups needed for those materials.
    const labels = res.costs!.lines!.map((l) => l.label);
    expect(labels.some((l) => /screeding paint/i.test(l))).toBe(true);
    const raw = res.raw as { pricing: { lines: unknown[] } };
    expect(raw.pricing.lines).toHaveLength(0);
  });

  it("stays unpriced without a marketCode and no config prices", async () => {
    fetchScreedingSystemConfig.mockResolvedValue({
      data: dbConfig({}),
      error: null,
    });
    const res = await executeEngine("screeding_system", { areaM2: 120 });
    expect(res.ok).toBe(true);
    expect(res.costs).toBeNull();
  });
});

describe("tyrolene_system engine", () => {
  const materials = [
    "cement",
    "sand",
    "acrylic-bond",
    "water-seal",
    "anti-fungal",
  ].map((slug, i) => ({
    id: `m-${slug}`,
    slug,
    name: `Tyrolene ${slug}`,
    category: "tyrolene-material",
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    description: null,
    unit: "bags",
    sort_order: i,
  }));

  const bundle = {
    config: {
      product: {
        id: "prod-tyrolene",
        name: "Tyrolene",
        category: "tyrolene",
        description: null,
        unit: "m2",
        is_active: true,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      materials,
      prices: new Map(
        materials.map((m) => [
          m.slug,
          {
            id: `p-${m.slug}`,
            price_type: "material",
            ref_id: m.id,
            price: 10,
            currency: "USD",
            pack_size_id: null,
            effective_date: "2026-10-01",
            notes: null,
            is_active: true,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
          },
        ]),
      ),
      packSizes: new Map(),
      calcRules: new Map(),
      productionRules: [],
      calcVersionId: null,
    },
    warnings: [],
    roleResolutions: new Map([
      [
        "cement",
        {
          role: "concrete-mix",
          resolved_market: "US",
          material: { id: "us-cement", name: "Quikrete Portland Cement" },
          price: {
            price: 14.5,
            currency: "USD",
            price_source: "Home Depot scan",
            scan_source: "homedepot.com",
            effective_date: "2026-10-01",
          },
        },
      ],
    ]),
    unpricedSlugs: ["anti-fungal"],
  };

  it("runs the authoritative estimate and surfaces local brand names", async () => {
    loadTyroleneCalcConfig.mockResolvedValue(bundle);
    const res = await executeEngine("tyrolene_system", {
      standardPartitionCount: 4,
      marketCode: "US",
    });
    expect(res.ok).toBe(true);
    expect(res.costs).not.toBeNull();
    expect(res.costs!.regionalDataAvailable).toBe(true);
    const labels = res.costs!.lines!.map((l) => l.label);
    // Market-resolved cement replaces the NG name in the cost lines.
    expect(labels).toContain("Quikrete Portland Cement");
    const names = res.quantities.map((q) => q.label);
    expect(names).toContain("Quikrete Portland Cement");
    const raw = res.raw as {
      pricing: { market: string; unpriced: string[] };
    };
    expect(raw.pricing.market).toBe("US");
    expect(raw.pricing.unpriced).toContain("anti-fungal");
  });

  it("reports unpriced materials instead of pricing them", async () => {
    const emptyBundle = {
      ...bundle,
      config: { ...bundle.config, prices: new Map() },
      roleResolutions: new Map(),
      unpricedSlugs: ["cement", "sand"],
    };
    loadTyroleneCalcConfig.mockResolvedValue(emptyBundle);
    const res = await executeEngine("tyrolene_system", {
      standardPartitionCount: 4,
      marketCode: "GB",
    });
    expect(res.ok).toBe(true);
    // No prices at all → no invented costs.
    expect(res.costs).toBeNull();
  });

  it("refuses to calculate without partition input", async () => {
    const res = await executeEngine("tyrolene_system", {
      marketCode: "US",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("fails honestly when the config cannot be loaded", async () => {
    loadTyroleneCalcConfig.mockRejectedValue(new Error("db down"));
    const res = await executeEngine("tyrolene_system", {
      standardPartitionCount: 4,
      marketCode: "US",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Tyrolene configuration is unavailable");
  });
});
