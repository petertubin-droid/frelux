import { describe, expect, it } from "vitest";
import { getStructuralJurisdictionScope, STRUCTURAL_JURISDICTION_SCOPE } from "./structural-jurisdiction-scope";

describe("structural jurisdiction scope disclosures", () => {
  it("has source-backed reference scope for the six requested countries", () => {
    expect(Object.keys(STRUCTURAL_JURISDICTION_SCOPE).sort()).toEqual(["AU", "CN", "GB", "IT", "NG", "US"]);
    for (const scope of Object.values(STRUCTURAL_JURISDICTION_SCOPE)) {
      expect(scope.verifiedSource).toMatch(/^https?:\/\//);
      expect(scope.framework.length).toBeGreaterThan(25);
      expect(scope.localScope.length).toBeGreaterThan(25);
      expect(scope.calculationStatus).toBe("reference_only");
    }
  });

  it("resolves codes safely and does not guess unsupported markets", () => {
    expect(getStructuralJurisdictionScope(" us ")?.code).toBe("US");
    expect(getStructuralJurisdictionScope("IN")).toBeNull();
    expect(getStructuralJurisdictionScope(undefined)).toBeNull();
  });
});
