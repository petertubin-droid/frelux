import { describe, expect, it } from "vitest";
import { calculateIncrete, type IncreteInput } from "./increte-engine";
import { INCRETE_MARKETS } from "./increte-market-config";
import { validateResearchFinding } from "./increte-research-agent";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";

const base: IncreteInput = {
  marketCode: "US", length: 10, width: 5, areaUnit: "m2",
  thickness: 100, thicknessUnit: "mm", labourRatePerM2: 20,
  currencyCode: "USD",
  products: [{
    id: "test", name: "User supplied overlay", system: "decorative-overlay",
    coverageM2PerPackage: 10, packageSize: 1, packageUnit: "kit", coats: 2,
    wastePercent: 10, unitPrice: 25, priceOrigin: "user_supplied",
    specOrigin: "user_supplied",
  }],
};

describe("Increte deterministic estimator", () => {
  it("calculates area, thickness volume, coverage coats, waste and whole packages", () => {
    const result = calculateIncrete(base);
    expect(result.areaM2).toBe(50);
    expect(result.concreteVolumeM3).toBe(5);
    expect(result.lines[0].quantity).toBeCloseTo(110, 10);
    expect(result.lines[0].packages).toBe(11);
    expect(result.lines[0].total).toBe(275);
    expect(result.grandTotal).toBe(1275);
  });

  it("converts square feet to m² without inventing localized data", () => {
    const result = calculateIncrete({ ...base, areaUnit: "ft2", length: 10, width: 10, products: [] });
    expect(result.areaM2).toBeCloseTo(9.290304, 6);
    expect(result.materialTotal).toBeNull();
    expect(result.warnings.some((w) => w.includes("Add a product"))).toBe(true);
  });

  it("does not calculate with missing coverage or unsupported source data", () => {
    const result = calculateIncrete({ ...base, products: [{ ...base.products[0], coverageM2PerPackage: null }] });
    expect(result.lines[0].packages).toBeNull();
    expect(result.grandTotal).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("does not treat unapproved researched figures as production specifications", () => {
    const result = calculateIncrete({ ...base, products: [{
      ...base.products[0], specOrigin: "verified_source", priceOrigin: "verified_source",
      sourceUrl: "https://example.test/datasheet", approved: false,
    }] });
    expect(result.lines[0].quantity).toBeNull();
    expect(result.lines[0].total).toBeNull();
  });

  it("keeps exact 32-market list and marks all market product data unverified", () => {
    expect(INCRETE_MARKETS.map((m) => m.code)).toEqual(ALL_MARKET_CODES);
    expect(INCRETE_MARKETS).toHaveLength(32);
    expect(INCRETE_MARKETS.every((m) => m.verifiedProductCount === 0)).toBe(true);
  });

  it("rejects findings without sources and approval for unverified evidence", () => {
    const issues = validateResearchFinding({
      id: "1", marketCode: "US", product: "Product", observation: "Coverage noted",
      technicalEvidence: "Coverage: 1 m²/package", sourceUrl: "http://unsafe.test",
      observedAt: new Date().toISOString(), verification: "unverified", approvedForActiveRules: true,
    });
    expect(issues.some((issue) => issue.includes("HTTPS"))).toBe(true);
    expect(issues.some((issue) => issue.includes("Only verified"))).toBe(true);
  });
});
