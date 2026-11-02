import { describe, expect, it } from "vitest";
import {
  getStructuralJurisdictionScope,
  STRUCTURAL_JURISDICTION_SCOPE,
} from "./structural-jurisdiction-scope";

describe("structural jurisdiction scope disclosures", () => {
  it("covers all 32 built-in FRELUX markets with verified sources and guidelines", () => {
    const keys = Object.keys(STRUCTURAL_JURISDICTION_SCOPE);
    expect(keys.length).toBe(32);

    // Verify key markets
    expect(keys).toContain("NG");
    expect(keys).toContain("US");
    expect(keys).toContain("GB");
    expect(keys).toContain("CA");
    expect(keys).toContain("AU");
    expect(keys).toContain("IN");
    expect(keys).toContain("DE");
    expect(keys).toContain("ZA");
    expect(keys).toContain("GH");
    expect(keys).toContain("KE");
    expect(keys).toContain("AE");
    expect(keys).toContain("SA");
    expect(keys).toContain("JP");
    expect(keys).toContain("FR");
    expect(keys).toContain("BR");
    expect(keys).toContain("CN");
    expect(keys).toContain("IT");
    expect(keys).toContain("NZ");

    for (const scope of Object.values(STRUCTURAL_JURISDICTION_SCOPE)) {
      expect(scope.verifiedSource).toMatch(/^https?:\/\//);
      expect(scope.framework.length).toBeGreaterThan(20);
      expect(scope.localScope.length).toBeGreaterThan(20);
      expect(scope.sourceLabel.length).toBeGreaterThan(5);
      expect(scope.calculationStatus).toBe("reference_only");
    }
  });

  it("resolves built-in codes case-insensitively with trimming", () => {
    expect(getStructuralJurisdictionScope(" us ")?.code).toBe("US");
    expect(getStructuralJurisdictionScope("ng")?.code).toBe("NG");
    expect(getStructuralJurisdictionScope("IN")?.country).toBe("India");
    expect(getStructuralJurisdictionScope("ca")?.framework).toContain(
      "National Building Code of Canada",
    );
    expect(getStructuralJurisdictionScope("DE")?.framework).toContain(
      "Eurocode 2",
    );
  });

  it("dynamically generates structured regulatory guidance for future markets", () => {
    const futureMarket = getStructuralJurisdictionScope("UG", "Uganda");
    expect(futureMarket).not.toBeNull();
    expect(futureMarket?.code).toBe("UG");
    expect(futureMarket?.country).toBe("Uganda");
    expect(futureMarket?.framework).toContain("Uganda");
    expect(futureMarket?.localScope).toContain(
      "Independent review and sign-off by a locally registered professional engineer is mandatory",
    );
    expect(futureMarket?.calculationStatus).toBe("reference_only");
    expect(futureMarket?.isDynamicFallback).toBe(true);

    const unnamedFuture = getStructuralJurisdictionScope("RW");
    expect(unnamedFuture?.code).toBe("RW");
    expect(unnamedFuture?.country).toBe("Market (RW)");
  });

  it("returns null safely when neither code nor country is provided", () => {
    expect(getStructuralJurisdictionScope(undefined, undefined)).toBeNull();
    expect(getStructuralJurisdictionScope(null, null)).toBeNull();
    expect(getStructuralJurisdictionScope("   ", "")).toBeNull();
  });
});
