import { describe, it, expect } from "vitest";
import {
  resolveHybridPrice,
  getHybridPriceBadgeInfo,
} from "./hybrid-pricing-engine";

describe("Hybrid Pricing Resolution Engine (The 4-Layer Hierarchy)", () => {
  it("does not present demo supplier inventory as a live quote", async () => {
    const res = await resolveHybridPrice({ marketCode: "KE", materialCategory: "paint", materialSlug: "emulsion-paint-20l", basePrice: 9000, currency: "KES", unit: "20L pail" });
    expect(res.layer).toBe("baseline");
    expect(res.isVerified).toBe(false);
    expect(res.resolvedPrice).toBe(9000);
  });

  it("does not resolve demo crowd benchmarks as live market prices", async () => {
    const res = await resolveHybridPrice({
      marketCode: "KE",
      materialCategory: "cement",
      materialSlug: "cement-bag-50kg-custom-unique",
      basePrice: 1050,
      currency: "KES",
      unit: "50kg bag",
      city: "Nairobi",
    });
    expect(res.layer).toBe("baseline");
    expect(res.resolvedPrice).toBe(1050);
    expect(res.isVerified).toBe(false);
  });

  it("does not apply seeded macro values when no live indicator is connected", async () => {
    const res = await resolveHybridPrice({ marketCode: "KE", materialCategory: "steel", materialSlug: "structural-i-beam-custom", basePrice: 10000, currency: "KES" });
    expect(res.layer).toBe("baseline");
    expect(res.resolvedPrice).toBe(10000);
    expect(res.isVerified).toBe(false);
  });

  it("returns no price rather than inventing a baseline when none is provided", async () => {
    const res = await resolveHybridPrice({ marketCode: "XX", materialCategory: "unknown_category", materialSlug: "unknown-material" });
    expect(res.layer).toBe("baseline");
    expect(res.resolvedPrice).toBeUndefined();
    expect(res.provenance.sourceType).toBe("Unavailable");
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
