/**
 * FRELUX SOC 2 / ISO 27001 Certification Readiness + CMEK + Tenancy
 * (Pillar 7)
 *
 * Three honest readiness gates for multinational deployment:
 *
 * 1. Customer-managed encryption keys (CMEK): every declared data
 *    scope must have an ACTIVE key in the registry. A scope without
 *    an active key is a violation — processing against it is
 *    refused, never waved through.
 * 2. Strict data tenancy boundaries: every tenant must have a
 *    residency policy declaring where its data lives; isolation is
 *    strict by default, and a shared-infrastructure declaration is
 *    reported as a boundary exception.
 * 3. Control readiness for SOC 2 Type II / ISO 27001: the control
 *    map is scored by implemented status. The report is honest
 *    about the difference between an implemented control and a Type
 *    II attestation: an operating-period evidence trail only exists
 *    once controls run over time, and no code can conjure it.
 */

// ─────────────────────────────────────────────
// CMEK
// ─────────────────────────────────────────────

export interface EncryptionKeyRecord {
  scope: string;
  provider: string;
  keyAlias: string;
  state: "active" | "rotating" | "retired" | "compromised";
}

export interface CmekEvaluation {
  ok: boolean;
  scopes: string[];
  protectedScopes: string[];
  violations: Array<{ scope: string; reason: string }>;
  coveragePct: number;
  errors: string[];
}

/**
 * Evaluate CMEK coverage: every declared scope needs exactly one
 * ACTIVE key. Compromised keys are violations; rotating keys are
 * violations while rotation is in progress (no gap is tolerated).
 */
export function evaluateCmekCoverage(
  scopes: string[],
  registry: EncryptionKeyRecord[],
): CmekEvaluation {
  const violations: CmekEvaluation["violations"] = [];
  const errors: string[] = [];
  if (!Array.isArray(scopes) || scopes.length === 0) {
    errors.push("No data scopes declared: CMEK coverage cannot be assessed against nothing.");
    return { ok: false, scopes: [], protectedScopes: [], violations: [], coveragePct: 0, errors };
  }
  const unique = Array.from(new Set(scopes.map((s) => s?.trim()).filter(Boolean) as string[]));

  for (const scope of unique) {
    const key = registry.find((k) => k.scope === scope);
    if (!key) {
      violations.push({ scope, reason: "No key registered for this scope." });
      continue;
    }
    if (key.state === "active") continue;
    if (key.state === "rotating") {
      violations.push({ scope, reason: "Key rotation in progress: the scope has no settled active key." });
    } else if (key.state === "retired") {
      violations.push({ scope, reason: "Registered key is retired: the scope is unprotected." });
    } else {
      violations.push({ scope, reason: "Registered key is compromised: quarantine the scope and rotate immediately." });
    }
  }

  const protectedScopes = unique.filter((s) => !violations.some((v) => v.scope === s));
  const coveragePct = Math.round((protectedScopes.length / unique.length) * 1000) / 10;
  return {
    ok: violations.length === 0,
    scopes: unique,
    protectedScopes,
    violations,
    coveragePct,
    errors,
  };
}

// ─────────────────────────────────────────────
// Tenancy boundaries
// ─────────────────────────────────────────────

export interface TenancyPolicyRecord {
  tenantId: string;
  tenantName: string | null;
  dataResidency: string;
  storageScope: string;
  isolationModel: "strict_isolation" | "shared_infrastructure";
}

export interface TenancyEvaluation {
  ok: boolean;
  tenants: string[];
  boundedTenants: string[];
  violations: Array<{ tenantId: string; reason: string }>;
  /** Shared-infrastructure tenants are not violations, but are reported. */
  boundaryExceptions: Array<{ tenantId: string; reason: string }>;
  errors: string[];
}

/**
 * Validate tenancy boundaries: every known tenant needs a residency
 * policy; shared-infrastructure declarations are surfaced as
 * boundary exceptions because strict isolation is the enterprise
 * default.
 */
export function validateTenancyBoundaries(
  tenants: Array<{ tenantId: string }>,
  policies: TenancyPolicyRecord[],
): TenancyEvaluation {
  const violations: TenancyEvaluation["violations"] = [];
  const boundaryExceptions: TenancyEvaluation["boundaryExceptions"] = [];
  const errors: string[] = [];
  if (!Array.isArray(tenants) || tenants.length === 0) {
    errors.push("No tenants declared: tenancy boundaries cannot be assessed against nothing.");
    return { ok: false, tenants: [], boundedTenants: [], violations, boundaryExceptions, errors };
  }
  const unique = Array.from(new Set(tenants.map((t) => t.tenantId?.trim()).filter(Boolean) as string[]));

  for (const tenantId of unique) {
    const p = policies.find((x) => x.tenantId === tenantId);
    if (!p) {
      violations.push({
        tenantId,
        reason: "No residency policy: data location and isolation are undeclared for this tenant.",
      });
      continue;
    }
    if (!p.dataResidency?.trim()) {
      violations.push({ tenantId, reason: "Residency policy has no data residency region." });
      continue;
    }
    if (!p.storageScope?.trim()) {
      violations.push({ tenantId, reason: "Residency policy has no storage scope declaration." });
      continue;
    }
    if (p.isolationModel === "shared_infrastructure") {
      boundaryExceptions.push({
        tenantId,
        reason: `Tenant runs on shared infrastructure (${p.storageScope}): the strict-isolation enterprise default is waived and this is reported to the customer.`,
      });
    }
  }

  const bounded = unique.filter((t) => !violations.some((v) => v.tenantId === t));
  return {
    ok: violations.length === 0,
    tenants: unique,
    boundedTenants: bounded,
    violations,
    boundaryExceptions,
    errors,
  };
}

// ─────────────────────────────────────────────
// SOC 2 / ISO 27001 readiness
// ─────────────────────────────────────────────

export interface CertificationControlRecord {
  controlId: string;
  framework: "SOC2" | "ISO27001";
  domain: string;
  description: string;
  status: "implemented" | "in_progress" | "planned";
  implementationRef: string | null;
}

export interface FrameworkReadiness {
  framework: "SOC2" | "ISO27001";
  totalControls: number;
  implemented: number;
  inProgress: number;
  planned: number;
  readinessPct: number;
  missing: Array<{ controlId: string; status: string }>;
}

export interface CertificationReadinessReport {
  ok: boolean;
  frameworks: FrameworkReadiness[];
  overallReadinessPct: number;
  /**
   * Honest note: implementing controls is code-achievable; a SOC 2
   * Type II report additionally requires evidence that controls
   * OPERATED over an observation period. That evidence accrues with
   * time and is not fabricated here.
   */
  type2Caveat: string;
  errors: string[];
}

export function assessCertificationReadiness(
  controls: CertificationControlRecord[],
): CertificationReadinessReport {
  const errors: string[] = [];
  if (!Array.isArray(controls) || controls.length === 0) {
    errors.push("No certification controls mapped: readiness cannot be assessed against nothing.");
    return {
      ok: false,
      frameworks: [],
      overallReadinessPct: 0,
      type2Caveat: "",
      errors,
    };
  }

  const seen = new Set<string>();
  const deduped: CertificationControlRecord[] = [];
  for (const c of controls) {
    if (seen.has(c.controlId)) continue;
    seen.add(c.controlId);
    deduped.push(c);
  }

  const frameworks: FrameworkReadiness[] = (["SOC2", "ISO27001"] as const).map((fw) => {
    const inScope = deduped.filter((c) => c.framework === fw);
    const implemented = inScope.filter((c) => c.status === "implemented");
    const inProgress = inScope.filter((c) => c.status === "in_progress");
    const planned = inScope.filter((c) => c.status === "planned");
    return {
      framework: fw,
      totalControls: inScope.length,
      implemented: implemented.length,
      inProgress: inProgress.length,
      planned: planned.length,
      readinessPct:
        inScope.length > 0
          ? Math.round((implemented.length / inScope.length) * 1000) / 10
          : 0,
      missing: inScope
        .filter((c) => c.status !== "implemented")
        .map((c) => ({ controlId: c.controlId, status: c.status })),
    };
  });

  const implementedTotal = deduped.filter((c) => c.status === "implemented").length;
  const overall = Math.round((implementedTotal / deduped.length) * 1000) / 10;

  return {
    ok: frameworks.every((f) => f.totalControls > 0 && f.readinessPct === 100),
    frameworks,
    overallReadinessPct: overall,
    type2Caveat:
      "Implemented controls satisfy design readiness. A SOC 2 Type II report additionally attests that the controls operated effectively over an observation period (typically 3-12 months); that operating evidence accrues as the audit trail and approval workflows run in production, and cannot be fabricated by code.",
    errors,
  };
}
