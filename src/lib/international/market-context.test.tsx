import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("market-context", () => {
  it("module exports international keys and defaults", async () => {
    const mod = await import("@/lib/international/market-context");
    expect(mod.DEFAULT_MARKET_CODE).toBe("NG");
    expect(mod.MARKET_STORAGE_KEY).toBe("frelux_market");
    expect(mod.LENGTH_UNIT_STORAGE_KEY).toBe("frelux_length_unit");
    expect(mod.AREA_UNIT_STORAGE_KEY).toBe("frelux_area_unit");
    expect(mod.BUILTIN_MARKET_PROFILES.length).toBeGreaterThan(5);

    const usProfile = mod.BUILTIN_MARKET_PROFILES.find((p) => p.country_code === "US");
    expect(usProfile).toBeDefined();
    expect(usProfile?.currency_code).toBe("USD");
    expect(usProfile?.default_measurement_system).toBe("imperial");
    expect(usProfile?.default_length_unit).toBe("feet");
    expect(usProfile?.default_area_unit).toBe("sqft");

    const gbProfile = mod.BUILTIN_MARKET_PROFILES.find((p) => p.country_code === "GB");
    expect(gbProfile).toBeDefined();
    expect(gbProfile?.currency_code).toBe("GBP");
  });
});
