/**
 * Tests for International Architecture (Feature 16)
 */

import { describe, it, expect } from "vitest";
import {
  createMarketProfileRegistry,
  registerProfile,
  getProfile,
  getActiveProfiles,
  createNigeriaProfile,
  createGhanaProfile,
  createKenyaProfile,
  createDefaultRegistry,
  getMarketWastePercent,
  getMarketPackageSize,
  getMarketCoverage,
  getMarketCurrency,
  getMarketLengthUnit,
  getMarketRuleIds,
  isMarketActive,
  marketProfileToText,
  listProfiles,
  type MarketProfile,
} from "../market-profile";

describe("Market Profile Creation", () => {
  it("creates Nigeria profile", () => {
    const profile = createNigeriaProfile();
    expect(profile.marketCode).toBe("NG");
    expect(profile.marketName).toBe("Nigeria");
    expect(profile.currency).toBe("NGN");
    expect(profile.currencySymbol).toBe("₦");
    expect(profile.unitSystem).toBe("metric");
    expect(profile.defaultLengthUnit).toBe("meters");
    expect(profile.defaultWastePercent).toBe(10);
    expect(profile.isActive).toBe(true);
  });

  it("creates Ghana profile", () => {
    const profile = createGhanaProfile();
    expect(profile.marketCode).toBe("GH");
    expect(profile.currency).toBe("GHS");
    expect(profile.currencySymbol).toBe("₵");
    expect(profile.isActive).toBe(false); // Not yet active
  });

  it("creates Kenya profile", () => {
    const profile = createKenyaProfile();
    expect(profile.marketCode).toBe("KE");
    expect(profile.currency).toBe("KES");
    expect(profile.currencySymbol).toBe("KSh");
    expect(profile.isActive).toBe(false);
  });

  it("Nigeria has package sizes", () => {
    const profile = createNigeriaProfile();
    expect(profile.defaultPackageSizes.paint).toEqual({
      size: 20,
      unit: "litres",
    });
    expect(profile.defaultPackageSizes.cement).toEqual({
      size: 50,
      unit: "kg",
    });
    expect(profile.defaultPackageSizes.tiles).toEqual({
      size: 1.44,
      unit: "m2",
    });
  });

  it("Nigeria has coverage rates", () => {
    const profile = createNigeriaProfile();
    expect(profile.defaultCoverage.paint).toBe(35);
    expect(profile.defaultCoverage.cement).toBe(5);
    expect(profile.defaultCoverage.tiles).toBe(1.44);
  });

  it("Nigeria has rule IDs", () => {
    const profile = createNigeriaProfile();
    expect(profile.ruleIds.length).toBeGreaterThan(0);
    expect(profile.ruleIds).toContain("rule-painting-interior");
  });
});

describe("Market Profile Registry", () => {
  it("creates a registry with default", () => {
    const registry = createMarketProfileRegistry("NG");
    expect(registry.defaultMarketCode).toBe("NG");
    expect(registry.profiles.size).toBe(0);
  });

  it("registers a profile", () => {
    let registry = createMarketProfileRegistry();
    registry = registerProfile(registry, createNigeriaProfile());
    expect(registry.profiles.size).toBe(1);
  });

  it("gets profile by code", () => {
    let registry = createMarketProfileRegistry();
    registry = registerProfile(registry, createNigeriaProfile());
    const profile = getProfile(registry, "NG");
    expect(profile).toBeDefined();
    expect(profile!.marketCode).toBe("NG");
  });

  it("falls back to default when profile not found", () => {
    let registry = createMarketProfileRegistry("NG");
    registry = registerProfile(registry, createNigeriaProfile());
    const profile = getProfile(registry, "XX"); // doesn't exist
    expect(profile).toBeDefined();
    expect(profile!.marketCode).toBe("NG"); // falls back
  });

  it("gets active profiles only", () => {
    const registry = createDefaultRegistry();
    const active = getActiveProfiles(registry);
    expect(active.length).toBe(1); // only Nigeria is active
    expect(active[0].marketCode).toBe("NG");
  });

  it("creates default registry with all profiles", () => {
    const registry = createDefaultRegistry();
    expect(registry.profiles.size).toBe(3); // NG, GH, KE
    expect(registry.defaultMarketCode).toBe("NG");
  });
});

describe("Market-Specific Configuration", () => {
  const registry = createDefaultRegistry();

  it("gets waste percent for market", () => {
    expect(getMarketWastePercent(registry, "NG")).toBe(10);
    expect(getMarketWastePercent(registry, "GH")).toBe(10);
  });

  it("gets package size for category", () => {
    const pkg = getMarketPackageSize(registry, "paint", "NG");
    expect(pkg).toEqual({ size: 20, unit: "litres" });
  });

  it("gets coverage rate for category", () => {
    expect(getMarketCoverage(registry, "paint", "NG")).toBe(35);
    expect(getMarketCoverage(registry, "tiles", "NG")).toBe(1.44);
  });

  it("gets currency for market", () => {
    const ngCurrency = getMarketCurrency(registry, "NG");
    expect(ngCurrency.code).toBe("NGN");
    expect(ngCurrency.symbol).toBe("₦");

    const ghCurrency = getMarketCurrency(registry, "GH");
    expect(ghCurrency.code).toBe("GHS");
    expect(ghCurrency.symbol).toBe("₵");
  });

  it("gets length unit for market", () => {
    expect(getMarketLengthUnit(registry, "NG")).toBe("meters");
  });

  it("gets rule IDs for market", () => {
    const rules = getMarketRuleIds(registry, "NG");
    expect(rules.length).toBeGreaterThan(0);
    expect(rules).toContain("rule-painting-interior");
  });

  it("checks if market is active", () => {
    expect(isMarketActive(registry, "NG")).toBe(true);
    expect(isMarketActive(registry, "GH")).toBe(false);
    expect(isMarketActive(registry, "XX")).toBe(false);
  });

  it("returns defaults for unknown market", () => {
    // Unknown market falls back to default (Nigeria)
    const pkg = getMarketPackageSize(registry, "paint", "XX");
    expect(pkg).toEqual({ size: 20, unit: "litres" }); // Nigeria defaults
  });
});

describe("Ghana vs Nigeria differences", () => {
  const registry = createDefaultRegistry();

  it("Ghana has different cement package size", () => {
    const ngCement = getMarketPackageSize(registry, "cement", "NG");
    const ghCement = getMarketPackageSize(registry, "cement", "GH");
    expect(ngCement!.size).toBe(50);
    expect(ghCement!.size).toBe(42.5); // Ghana uses 42.5kg bags
  });

  it("Ghana has different currency", () => {
    const ngCurrency = getMarketCurrency(registry, "NG");
    const ghCurrency = getMarketCurrency(registry, "GH");
    expect(ngCurrency.code).not.toBe(ghCurrency.code);
  });
});

describe("Formatting", () => {
  it("formats profile as text", () => {
    const profile = createNigeriaProfile();
    const text = marketProfileToText(profile);
    expect(text).toContain("Nigeria");
    expect(text).toContain("NGN");
    expect(text).toContain("₦");
    expect(text).toContain("metric");
  });

  it("lists all profiles", () => {
    const registry = createDefaultRegistry();
    const text = listProfiles(registry);
    expect(text).toContain("Nigeria");
    expect(text).toContain("Ghana");
    expect(text).toContain("Kenya");
    expect(text).toContain("Active");
    expect(text).toContain("Inactive");
  });
});

describe("Architecture Principles", () => {
  it("new markets are added by configuration, not code changes", () => {
    // Create a custom market profile without touching engine code
    const customProfile: MarketProfile = {
      marketCode: "ZA",
      marketName: "South Africa",
      unitSystem: "metric",
      defaultLengthUnit: "meters",
      currency: "ZAR",
      currencySymbol: "R",
      defaultWastePercent: 8,
      defaultPackageSizes: {
        paint: { size: 20, unit: "litres" },
        cement: { size: 50, unit: "kg" },
      },
      defaultCoverage: { paint: 35, cement: 5 },
      ruleIds: [],
      isActive: false,
      locale: "en-ZA",
    };

    let registry = createDefaultRegistry();
    registry = registerProfile(registry, customProfile);
    expect(registry.profiles.size).toBe(4);
    expect(getProfile(registry, "ZA")).toBeDefined();
  });

  it("calculation geometry is separate from market rules", () => {
    // The geometry module doesn't reference market profiles
    // The market profile only provides defaults (units, waste, coverage)
    // The calculation engine works with any unit system
    const ngProfile = createNigeriaProfile();
    const ghProfile = createGhanaProfile();

    // Both use metric system
    expect(ngProfile.unitSystem).toBe("metric");
    expect(ghProfile.unitSystem).toBe("metric");

    // But have different currencies and package sizes
    expect(ngProfile.currency).not.toBe(ghProfile.currency);
  });
});
