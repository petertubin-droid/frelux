import { describe, expect, it } from "vitest";
import {
  assessCertificationReadiness,
  evaluateCmekCoverage,
  validateTenancyBoundaries,
  type CertificationControlRecord,
  type TenancyPolicyRecord,
} from "./compliance-readiness";

describe("evaluateCmekCoverage", () => {
  it("confirms full coverage when every scope has an active key", () => {
    const r = evaluateCmekCoverage(
      ["tenant:ng-default", "pii:users", "estimates:all"],
      [
        { scope: "tenant:ng-default", provider: "aws-kms", keyAlias: "alias/ng-default", state: "active" },
        { scope: "pii:users", provider: "aws-kms", keyAlias: "alias/pii", state: "active" },
        { scope: "estimates:all", provider: "gcp-kms", keyAlias: "alias/estimates", state: "active" },
      ],
    );
    expect(r.ok).toBe(true);
    expect(r.coveragePct).toBe(100);
    expect(r.violations).toHaveLength(0);
  });

  it("reports unregistered, retired and compromised scopes as violations", () => {
    const r = evaluateCmekCoverage(
      ["a", "b", "c", "d"],
      [
        { scope: "b", provider: "aws-kms", keyAlias: "alias/b", state: "retired" },
        { scope: "c", provider: "aws-kms", keyAlias: "alias/c", state: "compromised" },
        { scope: "d", provider: "aws-kms", keyAlias: "alias/d", state: "rotating" },
      ],
    );
    expect(r.ok).toBe(false);
    expect(r.coveragePct).toBe(0);
    expect(r.violations).toHaveLength(4);
    expect(r.violations.find((v) => v.scope === "a")!.reason).toContain("No key registered");
    expect(r.violations.find((v) => v.scope === "b")!.reason).toContain("retired");
    expect(r.violations.find((v) => v.scope === "c")!.reason).toContain("compromised");
    expect(r.violations.find((v) => v.scope === "d")!.reason).toContain("rotation in progress");
  });

  it("refuses to assess an empty scope list", () => {
    const r = evaluateCmekCoverage([], []);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("cannot be assessed against nothing");
  });
});

describe("validateTenancyBoundaries", () => {
  const policies: TenancyPolicyRecord[] = [
    { tenantId: "t-ng", tenantName: "NG Contractor", dataResidency: "NG", storageScope: "supabase:freluxtools:ng", isolationModel: "strict_isolation" },
    { tenantId: "t-eu", tenantName: "EU Contractor", dataResidency: "EU", storageScope: "supabase:freluxtools:eu-central", isolationModel: "shared_infrastructure" },
  ];

  it("confirms boundaries for tenants with complete residency policies", () => {
    const r = validateTenancyBoundaries([{ tenantId: "t-ng" }, { tenantId: "t-eu" }], policies);
    expect(r.ok).toBe(true);
    expect(r.violations).toHaveLength(0);
    expect(r.boundedTenants).toEqual(["t-ng", "t-eu"]);
  });

  it("violates tenants without any residency policy", () => {
    const r = validateTenancyBoundaries([{ tenantId: "t-unknown" }], policies);
    expect(r.ok).toBe(false);
    expect(r.violations[0].reason).toContain("No residency policy");
  });

  it("surfaces shared-infrastructure tenants as boundary exceptions, not violations", () => {
    const r = validateTenancyBoundaries([{ tenantId: "t-eu" }], policies);
    expect(r.ok).toBe(true);
    expect(r.boundaryExceptions).toHaveLength(1);
    expect(r.boundaryExceptions[0].reason).toContain("strict-isolation enterprise default is waived");
  });

  it("violates a policy with an empty residency region or storage scope", () => {
    const bad: TenancyPolicyRecord[] = [
      { tenantId: "t-bad", tenantName: null, dataResidency: "", storageScope: "supabase:x", isolationModel: "strict_isolation" },
    ];
    const r = validateTenancyBoundaries([{ tenantId: "t-bad" }], bad);
    expect(r.ok).toBe(false);
    expect(r.violations[0].reason).toContain("no data residency region");
  });
});

describe("assessCertificationReadiness", () => {
  const control = (over: Partial<CertificationControlRecord>): CertificationControlRecord => ({
    controlId: "X-1",
    framework: "SOC2",
    domain: "d",
    description: "d",
    status: "implemented",
    implementationRef: "ref",
    ...over,
  });

  it("scores each framework by implemented controls", () => {
    const r = assessCertificationReadiness([
      control({ controlId: "SOC2-CC6.1" }),
      control({ controlId: "SOC2-CC7.2" }),
      control({ controlId: "SOC2-CC8.1", status: "in_progress" }),
      control({ controlId: "ISO27001-A.8.15", framework: "ISO27001" }),
      control({ controlId: "ISO27001-A.8.24", framework: "ISO27001" }),
    ]);
    expect(r.ok).toBe(false); // SOC2 has one in_progress
    expect(r.frameworks).toHaveLength(2);
    const soc2 = r.frameworks.find((f) => f.framework === "SOC2")!;
    expect(soc2.totalControls).toBe(3);
    expect(soc2.implemented).toBe(2);
    expect(soc2.readinessPct).toBeCloseTo(66.7, 1);
    const iso = r.frameworks.find((f) => f.framework === "ISO27001")!;
    expect(iso.readinessPct).toBe(100);
    expect(r.overallReadinessPct).toBe(80);
  });

  it("is ok only when every framework is fully implemented", () => {
    const r = assessCertificationReadiness([
      control({ controlId: "SOC2-CC6.1" }),
      control({ controlId: "ISO27001-A.8.15", framework: "ISO27001" }),
    ]);
    expect(r.ok).toBe(true);
    expect(r.overallReadinessPct).toBe(100);
  });

  it("deduplicates control ids instead of double-counting", () => {
    const r = assessCertificationReadiness([
      control({ controlId: "SOC2-CC6.1" }),
      control({ controlId: "SOC2-CC6.1" }),
    ]);
    expect(r.frameworks[0].totalControls).toBe(1);
  });

  it("carries the honest Type II operating-period caveat", () => {
    const r = assessCertificationReadiness([control({ controlId: "SOC2-CC6.1" })]);
    expect(r.type2Caveat).toContain("observation period");
    expect(r.type2Caveat).toContain("cannot be fabricated");
  });

  it("refuses an empty control map", () => {
    expect(assessCertificationReadiness([]).errors.join(" ")).toContain(
      "cannot be assessed against nothing",
    );
  });
});
