import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSelect = vi.fn();
const mockEq1 = vi.fn();
const mockEq2 = vi.fn();
const mockEq3 = vi.fn();
const mockIs = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

import {
  fetchMaterialRules,
  resolveMaterialRule,
  getCachedMaterialRule,
  resolveAllRules,
  preloadMaterialRules,
  clearMaterialRuleCache,
} from "./material-rules";
import type { MarketMaterialRule } from "@/types/international";

describe("material-rules", () => {
  beforeEach(() => {
    clearMaterialRuleCache();
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ eq: mockEq1 });
    mockEq1.mockReturnValue({ eq: mockEq2 });
    mockEq2.mockReturnValue({ eq: mockEq3 });
    mockEq3.mockReturnValue({ is: mockIs });
  });

  it("fetchMaterialRules fetches active rules from supabase and caches them", async () => {
    const mockRule: Partial<MarketMaterialRule> = {
      rule_key: "coverage_per_litre",
      rule_value: 10 as unknown as Record<string, unknown>,
    };
    mockIs.mockResolvedValueOnce({ data: [mockRule], error: null });

    const rules1 = await fetchMaterialRules("NG", "painting");
    expect(rules1.size).toBe(1);
    expect(rules1.get("coverage_per_litre")).toEqual(mockRule);

    // Call second time should hit cache
    const rules2 = await fetchMaterialRules("NG", "painting");
    expect(rules2).toBe(rules1);
    expect(mockIs).toHaveBeenCalledTimes(1);
  });

  it("fetchMaterialRules returns empty map on error or null data", async () => {
    mockIs.mockResolvedValueOnce({ data: null, error: { message: "err" } });
    const rules = await fetchMaterialRules("US", "tile");
    expect(rules.size).toBe(0);
  });

  it("resolveMaterialRule fetches and returns rule_value or null if missing", async () => {
    const mockRule: Partial<MarketMaterialRule> = {
      rule_key: "waste_factor",
      rule_value: 1.1 as unknown as Record<string, unknown>,
    };
    mockIs.mockResolvedValueOnce({ data: [mockRule], error: null });

    const value = await resolveMaterialRule<number>(
      "KE",
      "tile",
      "waste_factor",
    );
    expect(value).toBe(1.1);

    const missing = await resolveMaterialRule<number>(
      "KE",
      "tile",
      "unknown_rule",
    );
    expect(missing).toBeNull();
  });

  it("getCachedMaterialRule returns cached value or null", async () => {
    // Uncached initially
    expect(getCachedMaterialRule("KE", "tile", "waste_factor")).toBeNull();

    // Cache it via fetchMaterialRules
    const mockRule: Partial<MarketMaterialRule> = {
      rule_key: "waste_factor",
      rule_value: 1.1 as unknown as Record<string, unknown>,
    };
    mockIs.mockResolvedValueOnce({ data: [mockRule], error: null });
    await fetchMaterialRules("KE", "tile");

    expect(getCachedMaterialRule("KE", "tile", "waste_factor")).toBe(1.1);
    expect(getCachedMaterialRule("KE", "tile", "nonexistent")).toBeNull();
  });

  it("resolveAllRules returns object mapping rule_key to rule_value", async () => {
    const mockRules: Partial<MarketMaterialRule>[] = [
      {
        rule_key: "coverage",
        rule_value: 12 as unknown as Record<string, unknown>,
      },
      {
        rule_key: "layers",
        rule_value: 2 as unknown as Record<string, unknown>,
      },
    ];
    mockIs.mockResolvedValueOnce({ data: mockRules, error: null });

    const all = await resolveAllRules("NG", "screeding");
    expect(all).toEqual({
      coverage: 12,
      layers: 2,
    });
  });

  it("preloadMaterialRules fetches rules for standard calculators", async () => {
    mockIs.mockResolvedValue({ data: [], error: null });
    await preloadMaterialRules("KE");
    // 6 calculators preloaded
    expect(mockIs).toHaveBeenCalledTimes(6);
  });

  it("clearMaterialRuleCache clears cached rules", async () => {
    mockIs.mockResolvedValue({ data: [], error: null });
    await fetchMaterialRules("NG", "painting");
    expect(mockIs).toHaveBeenCalledTimes(1);

    clearMaterialRuleCache();
    await fetchMaterialRules("NG", "painting");
    expect(mockIs).toHaveBeenCalledTimes(2);
  });
});
