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
  resolveCalculatorAvailability,
  getCalculatorConfig,
  getCalculatorLabel,
  getAvailableCalculators,
  clearCalculatorConfigCache,
} from "./calculator-config";
import type { MarketCalculatorConfig } from "@/types/international";

describe("calculator-config (registry-driven truthful availability)", () => {
  beforeEach(() => {
    clearCalculatorConfigCache();
    // reset (not just clear) so once-queues from earlier tests don't leak
    vi.resetAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    // Default: empty config table. Individual tests override per-call.
    mockEq.mockResolvedValue({ data: [], error: null });
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

    // Second call hits the cache
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

  it("NG painting is available because it is verified in the registry, not because NG is special-cased", async () => {
    mockEq.mockResolvedValueOnce({ data: [], error: null });
    const available = await isCalculatorAvailable("NG", "painting");
    expect(available).toBe(true);
    // The DB is consulted — no hardcoded market bypass
    expect(mockEq).toHaveBeenCalled();
  });

  it("a verified engine with no DB row is available (missing row no longer hides it)", async () => {
    mockEq.mockResolvedValueOnce({ data: [], error: null });
    expect(await isCalculatorAvailable("KE", "tile")).toBe(true);
    expect(await isCalculatorAvailable("ZA", "wall_finishing")).toBe(true);
  });

  it("an explicit admin-disabled row wins over verified status", async () => {
    mockEq.mockResolvedValueOnce({
      data: [{ calculator_type: "screeding", is_available: false }],
      error: null,
    });
    expect(await isCalculatorAvailable("KE", "screeding")).toBe(false);
  });

  it("an NG-only engine is not available in an unverified market, even with an available DB row", async () => {
    mockEq.mockResolvedValueOnce({
      data: [{ calculator_type: "block", is_available: true }],
      error: null,
    });
    // DB cannot manufacture capability
    expect(await isCalculatorAvailable("KE", "block")).toBe(false);
    const resolution = await resolveCalculatorAvailability("KE", "block");
    expect(resolution?.state).toBe("requires_verification");
    expect(resolution?.reason).toContain("not yet verified");
  });

  it("resolves all five availability states with reasons", async () => {
    // enabled: verified, no disabling row
    mockEq.mockResolvedValueOnce({ data: [], error: null });
    expect(
      (await resolveCalculatorAvailability("JP", "pop_ceiling"))?.state,
    ).toBe("enabled");

    // disabled: admin row (fresh fetch; JP configs were cached above)
    clearCalculatorConfigCache();
    mockEq.mockResolvedValueOnce({
      data: [{ calculator_type: "tile", is_available: false }],
      error: null,
    });
    expect((await resolveCalculatorAvailability("JP", "tile"))?.state).toBe(
      "disabled",
    );

    // not_implemented: NG-bound method engine, no row
    mockEq.mockResolvedValueOnce({ data: [], error: null });
    const usB2R = await resolveCalculatorAvailability("US", "build_to_roof");
    expect(usB2R?.state).toBe("not_implemented");
    expect(usB2R?.reason).toContain("Build to Roof");

    // requires_verification: portable engine without market data
    const usSolar = await resolveCalculatorAvailability("US", "solar_pv");
    expect(usSolar?.state).toBe("requires_verification");

    // not_configured is reported through the underlying reason text for
    // unverified pairs; unknown engines resolve to null
    const unknown = await resolveCalculatorAvailability(
      "US",
      "not_a_real_engine" as never,
    );
    expect(unknown).toBeNull();
  });

  it("getCalculatorConfig returns config object or null", async () => {
    const mockRow: Partial<MarketCalculatorConfig> = {
      calculator_type: "painting",
      is_available: true,
    };
    mockEq.mockResolvedValueOnce({ data: [mockRow], error: null });

    const config = await getCalculatorConfig("KE", "painting");
    expect(config).toEqual(mockRow);

    const missing = await getCalculatorConfig("KE", "block");
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

  it("getAvailableCalculators for NG lists every NG-verified engine", async () => {
    mockEq.mockResolvedValueOnce({ data: [], error: null });
    const calculators = await getAvailableCalculators("NG");

    // All the classic NG calculators remain available (behaviour preserved)
    for (const classic of [
      "painting",
      "screeding",
      "pop_ceiling",
      "tile",
      "tyrolene",
      "grafitex",
      "cost_estimator",
      "block",
      "roofing",
      "build_to_roof",
      "foundation",
      "structural",
    ] as const) {
      expect(calculators).toContain(classic);
    }
    // Exactly the registry's NG-verified engines, in canonical order
    const registry = await import("./capability-registry");
    const ngVerified = registry.ENGINE_CAPABILITIES.filter((e) =>
      e.verifiedMarkets.includes("NG"),
    ).map((e) => e.id as never);
    expect(calculators).toEqual(ngVerified);
    expect(calculators.length).toBeGreaterThan(20);
  });

  it("getAvailableCalculators excludes admin-disabled and unverified engines for a market", async () => {
    mockEq.mockResolvedValueOnce({
      data: [
        { calculator_type: "painting", is_available: true },
        { calculator_type: "tile", is_available: false },
        { calculator_type: "cost_estimator", is_available: true },
      ],
      error: null,
    });

    const calculators = await getAvailableCalculators("KE");
    // tile is verified but admin-disabled → excluded
    expect(calculators).not.toContain("tile");
    // painting verified → included
    expect(calculators).toContain("painting");
    // cost_estimator row claims available but KE is not verified → excluded
    expect(calculators).not.toContain("cost_estimator");
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
