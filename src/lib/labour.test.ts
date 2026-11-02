import { describe, it, expect, vi } from "vitest";
import {
  calculateLabourCost,
  createInitialLabourConfig,
  serializeLabourConfig,
  deserializeLabourConfig,
  DEFAULT_LABOUR_CONFIG,
  PRICING_METHOD_LABELS,
  PRICING_METHOD_DESCRIPTIONS,
  fetchLabourSettings,
  fetchAllLabourSettings,
  fetchLabourCategories,
} from "./labour";
import type { LabourConfig } from "./labour";
import type { DbLabourSettings } from "@/types/database";

interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  __maybeSingle: ReturnType<typeof vi.fn>;
  __order: ReturnType<typeof vi.fn>;
}

vi.mock("@/lib/supabase", () => {
  const maybeSingle = vi.fn();
  const order = vi.fn();
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: (...args: unknown[]) => order(...args),
    maybeSingle: (...args: unknown[]) => maybeSingle(...args),
  };
  return {
    supabase: {
      from: vi.fn(() => chain),
      __maybeSingle: maybeSingle,
      __order: order,
    },
  };
});

function baseConfig(overrides: Partial<LabourConfig> = {}): LabourConfig {
  return { ...DEFAULT_LABOUR_CONFIG, includeLabour: true, ...overrides };
}

describe("calculateLabourCost", () => {
  it("returns 0 when labour is not included", () => {
    expect(
      calculateLabourCost(
        baseConfig({ includeLabour: false, fixedAmount: 500 }),
        10,
      ),
    ).toBe(0);
  });

  it("uses the fixed amount for the fixed method", () => {
    const cfg = baseConfig({ pricingMethod: "fixed", fixedAmount: 25000 });
    expect(calculateLabourCost(cfg, 100)).toBe(25000);
  });

  it("clamps negative fixed amounts to 0", () => {
    const cfg = baseConfig({ pricingMethod: "fixed", fixedAmount: -100 });
    expect(calculateLabourCost(cfg, 100)).toBe(0);
  });

  it("multiplies area by per-sqm rate", () => {
    const cfg = baseConfig({ pricingMethod: "per_sqm", perSqmRate: 300 });
    expect(calculateLabourCost(cfg, 50)).toBe(15000);
  });

  it("treats negative area as 0 for per-sqm method", () => {
    const cfg = baseConfig({ pricingMethod: "per_sqm", perSqmRate: 300 });
    expect(calculateLabourCost(cfg, -20)).toBe(0);
  });

  it("multiplies room count by per-room rate", () => {
    const cfg = baseConfig({
      pricingMethod: "per_room",
      perRoomRate: 4000,
      roomCount: 3,
    });
    expect(calculateLabourCost(cfg, 0)).toBe(12000);
  });

  it("multiplies day count by daily rate", () => {
    const cfg = baseConfig({
      pricingMethod: "daily",
      dailyRate: 8000,
      dayCount: 5,
    });
    expect(calculateLabourCost(cfg, 0)).toBe(40000);
  });

  it("uses custom amount for the custom method", () => {
    const cfg = baseConfig({ pricingMethod: "custom", customAmount: 12345 });
    expect(calculateLabourCost(cfg, 0)).toBe(12345);
  });

  it("returns 0 for an unrecognized method", () => {
    const cfg = baseConfig({
      pricingMethod: "bogus" as LabourConfig["pricingMethod"],
    });
    expect(calculateLabourCost(cfg, 100)).toBe(0);
  });
});

describe("createInitialLabourConfig", () => {
  it("falls back to defaults when settings are null", () => {
    expect(createInitialLabourConfig(null)).toEqual(DEFAULT_LABOUR_CONFIG);
  });

  it("applies suggested rates and default pricing method from settings", () => {
    const settings = {
      default_pricing_method: "per_sqm",
      suggested_rates: {
        per_sqm: 250,
        per_room: 3000,
        daily: 7000,
        fixed: 10000,
      },
    } as unknown as DbLabourSettings;

    const cfg = createInitialLabourConfig(settings);
    expect(cfg.pricingMethod).toBe("per_sqm");
    expect(cfg.perSqmRate).toBe(250);
    expect(cfg.perRoomRate).toBe(3000);
    expect(cfg.dailyRate).toBe(7000);
    expect(cfg.fixedAmount).toBe(10000);
  });

  it("defaults missing suggested rates to 0", () => {
    const settings = {
      default_pricing_method: "fixed",
      suggested_rates: {},
    } as unknown as DbLabourSettings;
    const cfg = createInitialLabourConfig(settings);
    expect(cfg.perSqmRate).toBe(0);
    expect(cfg.perRoomRate).toBe(0);
    expect(cfg.dailyRate).toBe(0);
    expect(cfg.fixedAmount).toBe(0);
  });
});

describe("serializeLabourConfig / deserializeLabourConfig", () => {
  it("round-trips a config through serialize + deserialize", () => {
    const cfg = baseConfig({
      pricingMethod: "per_room",
      roomCount: 4,
      perRoomRate: 5000,
      categoryId: "cat-1",
    });
    const serialized = serializeLabourConfig(cfg);
    const restored = deserializeLabourConfig(serialized);
    expect(restored).toEqual(cfg);
  });

  it("falls back to defaults for null/undefined data", () => {
    expect(deserializeLabourConfig(null)).toEqual(DEFAULT_LABOUR_CONFIG);
    expect(deserializeLabourConfig(undefined)).toEqual(DEFAULT_LABOUR_CONFIG);
  });

  it("coerces missing fields to safe defaults", () => {
    const restored = deserializeLabourConfig({ includeLabour: true });
    expect(restored.pricingMethod).toBe(DEFAULT_LABOUR_CONFIG.pricingMethod);
    expect(restored.fixedAmount).toBe(0);
    expect(restored.roomCount).toBe(1);
    expect(restored.dayCount).toBe(1);
    expect(restored.categoryId).toBeNull();
  });
});

describe("labels and descriptions", () => {
  it("has a label and description for every pricing method", () => {
    const methods: (keyof typeof PRICING_METHOD_LABELS)[] = [
      "fixed",
      "per_sqm",
      "per_room",
      "daily",
      "custom",
    ];
    for (const m of methods) {
      expect(PRICING_METHOD_LABELS[m]).toBeTruthy();
      expect(PRICING_METHOD_DESCRIPTIONS[m]).toBeTruthy();
    }
  });
});

describe("fetchLabourSettings / fetchAllLabourSettings / fetchLabourCategories", () => {
  it("returns estimator-specific settings when found", async () => {
    const { supabase } = await import("@/lib/supabase");
    (
      supabase as unknown as MockSupabaseClient
    ).__maybeSingle.mockResolvedValueOnce({
      data: { estimator_key: "paint" },
    });
    const result = await fetchLabourSettings("paint" as never);
    expect(result).toEqual({ estimator_key: "paint" });
  });

  it("falls back to global settings when estimator-specific settings are missing", async () => {
    const { supabase } = await import("@/lib/supabase");
    (supabase as unknown as MockSupabaseClient).__maybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { estimator_key: "global" } });
    const result = await fetchLabourSettings("paint" as never);
    expect(result).toEqual({ estimator_key: "global" });
  });

  it("returns null when neither specific nor global settings exist", async () => {
    const { supabase } = await import("@/lib/supabase");
    (supabase as unknown as MockSupabaseClient).__maybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null });
    const result = await fetchLabourSettings("paint" as never);
    expect(result).toBeNull();
  });

  it("returns an empty array when no labour settings exist", async () => {
    const { supabase } = await import("@/lib/supabase");
    (supabase as unknown as MockSupabaseClient).__order.mockResolvedValueOnce({
      data: null,
    });
    const result = await fetchAllLabourSettings();
    expect(result).toEqual([]);
  });

  it("returns categories when present", async () => {
    const { supabase } = await import("@/lib/supabase");
    (supabase as unknown as MockSupabaseClient).__order.mockResolvedValueOnce({
      data: [{ id: "1" }],
    });
    const result = await fetchLabourCategories("paint" as never);
    expect(result).toEqual([{ id: "1" }]);
  });
});
