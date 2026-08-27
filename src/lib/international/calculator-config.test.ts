import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

import {
  fetchCalculatorConfigs,
  isCalculatorAvailable,
  getCalculatorConfig,
  getCalculatorLabel,
  getAvailableCalculators,
  clearCalculatorConfigCache,
} from "./calculator-config";
import type { MarketCalculatorConfig } from "@/types/international";

describe("calculator-config", () => {
  beforeEach(() => {
    clearCalculatorConfigCache();
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
  });

  it("fetchCalculatorConfigs fetches from supabase and caches results", async () => {
    const mockRow: MarketCalculatorConfig = {
      id: "1",
      market_code: "KE",
      calculator_type: "painting",
      is_available: true,
      labels: { title: "Paint Calc KE" },
      created_at: "",
      updated_at: "",
    } as unknown as never;

    mockEq.mockResolvedValueOnce({ data: [mockRow], error: null });

    const configs1 = await fetchCalculatorConfigs("KE");
    expect(configs1.size).toBe(1);
    expect(configs1.get("painting")).toEqual(mockRow);

    // Call second time should hit cache and not call supabase again
    const configs2 = await fetchCalculatorConfigs("KE");
    expect(configs2).toBe(configs1);
    expect(mockEq).toHaveBeenCalledTimes(1);
  });

  it("fetchCalculatorConfigs returns empty map on error or null data", async () => {
    mockEq.mockResolvedValueOnce({
      data: null,
      error: { message: "DB error" },
    });
    const configs = await fetchCalculatorConfigs("US");
    expect(configs.size).toBe(0);
  });

  it("isCalculatorAvailable returns true for NG regardless of DB", async () => {
    const available = await isCalculatorAvailable("NG", "painting");
    expect(available).toBe(true);
    expect(mockEq).not.toHaveBeenCalled();
  });

  it("isCalculatorAvailable returns true/false based on market config", async () => {
    const mockRows: Partial<MarketCalculatorConfig>[] = [
      { calculator_type: "painting", is_available: true },
      { calculator_type: "screeding", is_available: false },
    ];
    mockEq.mockResolvedValueOnce({ data: mockRows, error: null });

    expect(await isCalculatorAvailable("KE", "painting")).toBe(true);
    expect(await isCalculatorAvailable("KE", "screeding")).toBe(false);
    expect(await isCalculatorAvailable("KE", "tile")).toBe(false);
  });

  it("getCalculatorConfig returns config object or null", async () => {
    const mockRow: Partial<MarketCalculatorConfig> = {
      calculator_type: "painting",
      is_available: true,
    };
    mockEq.mockResolvedValueOnce({ data: [mockRow], error: null });

    const config = await getCalculatorConfig("KE", "painting");
    expect(config).toEqual(mockRow);

    const missing = await getCalculatorConfig("KE", "tile");
    expect(missing).toBeNull();
  });

  it("getCalculatorLabel returns label override or default", async () => {
    const mockRow: Partial<MarketCalculatorConfig> = {
      calculator_type: "painting",
      labels: { title: "Custom Paint Title" },
    };
    mockEq.mockResolvedValueOnce({ data: [mockRow], error: null });

    const customLabel = await getCalculatorLabel(
      "KE",
      "painting",
      "title",
      "Default Title",
    );
    expect(customLabel).toBe("Custom Paint Title");

    const fallbackLabel = await getCalculatorLabel(
      "KE",
      "painting",
      "subtitle",
      "Default Sub",
    );
    expect(fallbackLabel).toBe("Default Sub");
  });

  it("getAvailableCalculators returns default list for NG", async () => {
    const calculators = await getAvailableCalculators("NG");
    expect(calculators).toEqual([
      "painting",
      "screeding",
      "pop_ceiling",
      "tile",
      "tyrolene",
      "grafitex",
      "cost_estimator",
    ]);
  });

  it("getAvailableCalculators returns available calculator types for market", async () => {
    const mockRows: Partial<MarketCalculatorConfig>[] = [
      { calculator_type: "painting", is_available: true },
      { calculator_type: "tile", is_available: false },
      { calculator_type: "cost_estimator", is_available: true },
    ];
    mockEq.mockResolvedValueOnce({ data: mockRows, error: null });

    const calculators = await getAvailableCalculators("KE");
    expect(calculators).toEqual(["painting", "cost_estimator"]);
  });

  it("clearCalculatorConfigCache clears the cache", async () => {
    mockEq.mockResolvedValue({ data: [], error: null });

    await fetchCalculatorConfigs("KE");
    expect(mockEq).toHaveBeenCalledTimes(1);

    clearCalculatorConfigCache();

    await fetchCalculatorConfigs("KE");
    expect(mockEq).toHaveBeenCalledTimes(2);
  });
});
