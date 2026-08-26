import { describe, it, expect, beforeEach } from "vitest";
import {
  registerProviderAdapter,
  getProviderAdapter,
  getAllAdapters,
  selectProvider,
  getFallbackProviders,
  checkAllProviderHealth,
} from "./provider-registry";
import type {
  PriceProviderAdapter,
  MiProvider,
  MiProviderUsage,
} from "@/types/market-intelligence";

function makeMockAdapter(
  name: string,
  configured = true,
  hasQuota = true,
): PriceProviderAdapter {
  return {
    name,
    isConfigured: () => configured,
    hasQuota: (_usage: MiProviderUsage | null) => hasQuota,
    getHealthStatus: () => ({
      healthy: true,
      latencyMs: 100,
      lastChecked: new Date().toISOString(),
    }),
    fetchPrices: async () => [],
  } as unknown as PriceProviderAdapter;
}

describe("market-intelligence/provider-registry", () => {
  it("registerProviderAdapter stores adapter", () => {
    const adapter = makeMockAdapter("test_provider_1");
    registerProviderAdapter(adapter);
    expect(getProviderAdapter("test_provider_1")).toBe(adapter);
  });

  it("getProviderAdapter returns undefined for unregistered", () => {
    expect(getProviderAdapter("nonexistent")).toBeUndefined();
  });

  it("getAllAdapters returns all registered adapters", () => {
    registerProviderAdapter(makeMockAdapter("test_provider_2"));
    registerProviderAdapter(makeMockAdapter("test_provider_3"));
    const all = getAllAdapters();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some((a) => a.name === "test_provider_2")).toBe(true);
    expect(all.some((a) => a.name === "test_provider_3")).toBe(true);
  });

  it("selectProvider returns null for empty list", () => {
    expect(selectProvider([], new Map())).toBeNull();
  });

  it("selectProvider returns null when no enabled providers", () => {
    const providers: MiProvider[] = [
      {
        id: "p1",
        provider_name: "test_provider_1",
        is_enabled: false,
        priority: 1,
        is_fallback: false,
      } as MiProvider,
    ];
    expect(selectProvider(providers, new Map())).toBeNull();
  });

  it("selectProvider returns provider when enabled and configured", () => {
    registerProviderAdapter(makeMockAdapter("test_sel_1"));
    const providers: MiProvider[] = [
      {
        id: "p1",
        provider_name: "test_sel_1",
        is_enabled: true,
        priority: 1,
        is_fallback: false,
      } as MiProvider,
    ];
    const result = selectProvider(providers, new Map());
    expect(result).toBeTruthy();
    expect(result!.provider.id).toBe("p1");
  });

  it("selectProvider respects priority ordering", () => {
    registerProviderAdapter(makeMockAdapter("test_sel_low"));
    registerProviderAdapter(makeMockAdapter("test_sel_high"));
    const providers: MiProvider[] = [
      {
        id: "p2",
        provider_name: "test_sel_low",
        is_enabled: true,
        priority: 10,
        is_fallback: false,
      } as MiProvider,
      {
        id: "p1",
        provider_name: "test_sel_high",
        is_enabled: true,
        priority: 1,
        is_fallback: false,
      } as MiProvider,
    ];
    const result = selectProvider(providers, new Map());
    expect(result!.provider.id).toBe("p1"); // lower priority number = higher priority
  });

  it("selectProvider skips unconfigured adapters", () => {
    registerProviderAdapter(makeMockAdapter("test_sel_uncfg", false));
    const providers: MiProvider[] = [
      {
        id: "p1",
        provider_name: "test_sel_uncfg",
        is_enabled: true,
        priority: 1,
        is_fallback: false,
      } as MiProvider,
    ];
    expect(selectProvider(providers, new Map())).toBeNull();
  });

  it("getFallbackProviders returns only fallback providers", () => {
    registerProviderAdapter(makeMockAdapter("test_fb_1"));
    registerProviderAdapter(makeMockAdapter("test_fb_2"));
    const providers: MiProvider[] = [
      {
        id: "p1",
        provider_name: "test_fb_1",
        is_enabled: true,
        priority: 1,
        is_fallback: true,
      } as MiProvider,
      {
        id: "p2",
        provider_name: "test_fb_2",
        is_enabled: true,
        priority: 2,
        is_fallback: false,
      } as MiProvider,
    ];
    const result = getFallbackProviders(providers, new Map());
    expect(result.length).toBe(1);
    expect(result[0].provider.id).toBe("p1");
  });

  it("checkAllProviderHealth returns status for all adapters", () => {
    registerProviderAdapter(makeMockAdapter("test_health_1"));
    const health = checkAllProviderHealth();
    expect(health.length).toBeGreaterThanOrEqual(1);
    expect(health[0].name).toBeTruthy();
    expect(health[0].status).toBeTruthy();
  });
});
