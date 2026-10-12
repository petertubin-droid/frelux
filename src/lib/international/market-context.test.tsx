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

    const usProfile = mod.BUILTIN_MARKET_PROFILES.find(
      (p) => p.country_code === "US",
    );
    expect(usProfile).toBeDefined();
    expect(usProfile?.currency_code).toBe("USD");
    expect(usProfile?.default_measurement_system).toBe("imperial");
    expect(usProfile?.default_length_unit).toBe("feet");
    expect(usProfile?.default_area_unit).toBe("sqft");

    const gbProfile = mod.BUILTIN_MARKET_PROFILES.find(
      (p) => p.country_code === "GB",
    );
    expect(gbProfile).toBeDefined();
    expect(gbProfile?.currency_code).toBe("GBP");
  });

  it("registers all fifteen markets with correct currencies", async () => {
    const mod = await import("@/lib/international/market-context");
    expect(mod.BUILTIN_MARKET_PROFILES.length).toBe(20);

    const expected: Record<string, { currency: string; name: string }> = {
      NG: { currency: "NGN", name: "Nigeria" },
      US: { currency: "USD", name: "United States" },
      GB: { currency: "GBP", name: "United Kingdom" },
      CA: { currency: "CAD", name: "Canada" },
      AU: { currency: "AUD", name: "Australia" },
      DE: { currency: "EUR", name: "Germany" },
      IN: { currency: "INR", name: "India" },
      GH: { currency: "GHS", name: "Ghana" },
      KE: { currency: "KES", name: "Kenya" },
      ZA: { currency: "ZAR", name: "South Africa" },
      JP: { currency: "JPY", name: "Japan" },
      FR: { currency: "EUR", name: "France" },
      BR: { currency: "BRL", name: "Brazil" },
      SA: { currency: "SAR", name: "Saudi Arabia" },
      AE: { currency: "AED", name: "United Arab Emirates" },
      CN: { currency: "CNY", name: "China" },
      ID: { currency: "IDR", name: "Indonesia" },
      MX: { currency: "MXN", name: "Mexico" },
      KR: { currency: "KRW", name: "South Korea" },
      IT: { currency: "EUR", name: "Italy" },
    };
    for (const [code, exp] of Object.entries(expected)) {
      const profile = mod.BUILTIN_MARKET_PROFILES.find(
        (p) => p.country_code === code,
      );
      expect(profile, `missing profile for ${code}`).toBeDefined();
      expect(profile?.currency_code).toBe(exp.currency);
      expect(profile?.country_name).toBe(exp.name);
      expect(profile?.status).toBe("active");
    }

    // sort_order is unique and NG stays first (default market).
    const orders = mod.BUILTIN_MARKET_PROFILES.map((p) => p.sort_order);
    expect(new Set(orders).size).toBe(20);
    expect(mod.BUILTIN_MARKET_PROFILES[0]?.country_code).toBe("NG");
  });

  it("new markets keep metric defaults and honest inherits_from links", async () => {
    const mod = await import("@/lib/international/market-context");
    const fr = mod.BUILTIN_MARKET_PROFILES.find((p) => p.country_code === "FR");
    expect(fr?.default_measurement_system).toBe("metric");
    expect(fr?.default_length_unit).toBe("meters");
    expect(fr?.inherits_from).toBe("DE");

    const ae = mod.BUILTIN_MARKET_PROFILES.find((p) => p.country_code === "AE");
    expect(ae?.inherits_from).toBe("SA");

    const jp = mod.BUILTIN_MARKET_PROFILES.find((p) => p.country_code === "JP");
    // Japan is metric — tatami is a display note, not a fixed area unit.
    expect(jp?.default_area_unit).toBe("sqm");
    expect(jp?.supported_area_units).not.toContain("tsubo");
  });
});
