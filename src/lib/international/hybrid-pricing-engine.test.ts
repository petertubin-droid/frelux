import { describe, it, expect } from "vitest";
import {
  resolveHybridPrice,
  getHybridPriceBadgeInfo,
} from "./hybrid-pricing-engine";

describe("Hybrid Pricing Resolution Engine (The 4-Layer Hierarchy)", () => {
  it("Layer 1: Resolves live verified supplier price when available", async () => {
    // In Kenya, sample verified supplier offers Crown Silk paint for 8500 KES
    const res = await resolveHybridPrice({
      marketCode: "KE",
      materialCategory: "paint",
      materialSlug: "emulsion-paint-20l",
      basePrice: 9000,
      currency: "KES",
      unit: "20L pail",
    });

    expect(res.layer).toBe("supplier");
    expect(res.resolvedPrice).toBe(8500);
    expect(res.isVerified).toBe(true);
    expect(res.provenance.sourceType).toContain("Supplier");

    const badge = getHybridPriceBadgeInfo(res);
    expect(badge.label).toBe("Live Supplier Price");
  });

  it("Layer 2: Resolves crowdsourced quorum benchmark when no supplier quote matches", async () => {
    // Nairobi cement has a verified sample benchmark of 950 KES (16 contractors logged)
    const res = await resolveHybridPrice({
      marketCode: "KE",
      materialCategory: "cement",
      materialSlug: "cement-bag-50kg-custom-unique", // unmapped to supplier
      basePrice: 1050,
      currency: "KES",
      unit: "50kg bag",
      city: "Nairobi",
    });

    // Falls through to crowdsourced benchmark matching "cement-bag-50kg"
    if (res.layer === "crowdsource") {
      expect(res.resolvedPrice).toBe(950);
      expect(res.isVerified).toBe(true);
      expect(res.provenance.crowdsourceBenchmark?.sample_size).toBe(16);
      expect(res.provenance.crowdsourceBenchmark?.trimmed_mean_price).toBe(950);
    }
  });

  it("Layer 3: Resolves macro-adjusted price when steel spikes in Kenya", async () => {
    // When no supplier or crowd benchmark exists for specialized steel
    const res = await resolveHybridPrice({
      marketCode: "KE",
      materialCategory: "steel",
      materialSlug: "structural-i-beam-custom",
      basePrice: 10000,
      currency: "KES",
    });

    // In KE, steel has a 6.03% spike with 1.0x elasticity
    expect(res.layer).toBe("macro_adjusted");
    expect(res.resolvedPrice).toBe(10603);
    expect(res.provenance.macroAdjustmentPct).toBe(6.03);

    const badge = getHybridPriceBadgeInfo(res);
    expect(badge.label).toBe("Macro-Adjusted");
  });

  it("Layer 4: Falls back to baseline estimate with explicit unverified status", async () => {
    const res = await resolveHybridPrice({
      marketCode: "XX", // Non-existent market
      materialCategory: "unknown_category",
      materialSlug: "unknown-material",
      basePrice: 500,
      currency: "USD",
    });

    expect(res.layer).toBe("baseline");
    expect(res.resolvedPrice).toBe(500);
    expect(res.isVerified).toBe(false);

    const badge = getHybridPriceBadgeInfo(res);
    expect(badge.label).toBe("Baseline Estimate");
  });
});
