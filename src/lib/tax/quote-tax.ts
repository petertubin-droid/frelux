/**
 * FRELUX Phase 1: the single tax resolution object every quote
 * surface consumes (roadmap: "all quote surfaces use the same
 * resolved tax object and preserve manual assumptions distinctly").
 *
 * HONESTY CONTRACT:
 *  - Precedence is fixed and deterministic: an explicit per-call
 *    percentage (manual assumption) > a verified jurisdiction rule
 *    for the project site > the contractor's quotation-settings
 *    default (also a manual assumption, never presented as tax due)
 *    > not_determined.
 *  - Manual assumptions are labeled as such, with an author and a
 *    resolution timestamp, and are never presented as verified tax.
 *  - Verified rules carry the rule code/version, citation and
 *    effective date from tax_jurisdiction_rules (or the market
 *    catalog), never an invented number.
 *  - A rule whose components compound cannot be flattened into one
 *    percentage honestly; such quotes stay not_determined with the
 *    reason surfaced.
 *  - The site jurisdiction comes from the project's canonical
 *    location record, NOT the user profile or market preference.
 */

import {
  resolveJurisdictionTax,
  type JurisdictionTaxResolution,
  type TaxJurisdiction,
} from "./jurisdiction-rules";

export type QuoteTaxKind =
  "manual_assumption" | "verified_rule" | "not_determined";

export interface QuoteTaxComponentLine {
  name: string;
  ratePct: number;
}

export interface QuoteTaxResolution {
  kind: QuoteTaxKind;
  /** Effective single percentage when determinate; null otherwise. */
  pct: number | null;
  /** Where the pct came from: caller_override | quotation_settings | jurisdiction_rule | market_catalog. */
  source:
    | "caller_override"
    | "quotation_settings"
    | "jurisdiction_rule"
    | "market_catalog"
    | null;
  jurisdiction: {
    marketCode: string;
    jurisdictionLevel: string | null;
    jurisdictionCode: string | null;
  } | null;
  rule: { code: string; version: number } | null;
  citation: { title: string; url: string; publisher: string } | null;
  effectiveFrom: string | null;
  /** Per-component lines for verified rules. */
  components: QuoteTaxComponentLine[];
  /** Author label for manual assumptions. */
  assumptionAuthor: string | null;
  /** ISO timestamp of resolution. */
  resolvedAt: string;
  /** True when a verified compound rule exists but cannot flatten. */
  compoundUnsupported: boolean;
  /** User-safe explanation, including unresolved questions. */
  message: string;
}

/**
 * A site jurisdiction derived from a canonical location record
 * (`Record<string, unknown>` from the DB, validated at runtime).
 */
export function siteJurisdictionFromLocation(
  location: unknown,
): TaxJurisdiction | null {
  if (!location || typeof location !== "object") return null;
  const rec = location as Record<string, unknown>;
  const raw = rec.country_code;
  const cc = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  // Only the country granularity is trusted today; region strings are
  // not jurisdiction codes. State/municipal rules will need reviewed
  // code mappings before we can key them honestly.
  return {
    marketCode: cc,
    jurisdictionLevel: "national",
    jurisdictionCode: cc,
  };
}

function validPct(pct: unknown): pct is number {
  return (
    typeof pct === "number" && Number.isFinite(pct) && pct >= 0 && pct < 100
  );
}

function manualResolution(
  pct: number,
  source: "caller_override" | "quotation_settings",
  author: string,
): QuoteTaxResolution {
  return {
    kind: "manual_assumption",
    pct,
    source,
    jurisdiction: null,
    rule: null,
    citation: null,
    effectiveFrom: null,
    components: [{ name: "Manually entered tax", ratePct: pct }],
    assumptionAuthor: author,
    resolvedAt: new Date().toISOString(),
    compoundUnsupported: false,
    message:
      `Tax at ${pct}% is a manually entered assumption (${author}). ` +
      "It is not a verified rate for this project location and must not " +
      "be presented as tax due.",
  };
}

function notDetermined(reason: string): QuoteTaxResolution {
  return {
    kind: "not_determined",
    pct: null,
    source: null,
    jurisdiction: null,
    rule: null,
    citation: null,
    effectiveFrom: null,
    components: [],
    assumptionAuthor: null,
    resolvedAt: new Date().toISOString(),
    compoundUnsupported: false,
    message: `Tax not determined for this project location. ${reason}`,
  };
}

function verifiedFromJurisdiction(
  resolution: JurisdictionTaxResolution,
): QuoteTaxResolution {
  const components = resolution.components.map((c) => ({
    name: c.name,
    ratePct: c.rate_pct,
  }));
  const compound = resolution.components.some((c) => c.compound_on !== null);
  if (compound) {
    return {
      kind: "not_determined",
      pct: null,
      source: resolution.source,
      jurisdiction: resolution.resolvedJurisdiction,
      rule: resolution.rule,
      citation: resolution.citation,
      effectiveFrom: resolution.effective?.from ?? null,
      components,
      assumptionAuthor: null,
      resolvedAt: new Date().toISOString(),
      compoundUnsupported: true,
      message:
        `A verified tax rule exists (${resolution.rule?.code}) but its ` +
        "components compound, so no single percentage can be shown honestly. " +
        "Component-level quote display is required before this rule can " +
        "be applied to a quote.",
    };
  }
  const pct = components.reduce((s, c) => s + c.ratePct, 0);
  return {
    kind: "verified_rule",
    pct,
    source: resolution.source,
    jurisdiction: resolution.resolvedJurisdiction,
    rule: resolution.rule,
    citation: resolution.citation,
    effectiveFrom: resolution.effective?.from ?? null,
    components,
    assumptionAuthor: null,
    resolvedAt: new Date().toISOString(),
    compoundUnsupported: false,
    message: resolution.message,
  };
}

export interface ResolveQuoteTaxInput {
  /** Explicit per-call percentage: always a manual assumption. */
  explicitTaxPct?: number | null;
  /** Contractor-configured quotation-settings default (manual). */
  settingsTaxPct?: number | null;
  /** The project's canonical location record (site jurisdiction). */
  siteLocation?: unknown;
  asOf?: string;
}

/**
 * The one resolution path for all quote surfaces.
 */
export async function resolveQuoteTax(
  input: ResolveQuoteTaxInput = {},
): Promise<QuoteTaxResolution> {
  const { explicitTaxPct, settingsTaxPct, siteLocation, asOf } = input;

  // 1. Explicit per-call percentage: a labeled manual assumption.
  if (validPct(explicitTaxPct)) {
    return manualResolution(
      explicitTaxPct,
      "caller_override",
      "entered on this quotation",
    );
  }

  // 2. Verified jurisdiction rule for the project site.
  const jurisdiction = siteJurisdictionFromLocation(siteLocation);
  if (jurisdiction) {
    const resolution = await resolveJurisdictionTax(jurisdiction, {
      ...(asOf ? { asOf } : {}),
    });
    if (resolution.status === "ok") {
      return verifiedFromJurisdiction(resolution);
    }
    // No verified rule: fall through, never substitute.
  }

  // 3. Contractor-configured default: a manual assumption, labeled.
  if (validPct(settingsTaxPct)) {
    return manualResolution(
      settingsTaxPct,
      "quotation_settings",
      "contractor's quotation settings default",
    );
  }

  // 4. Not determined.
  return notDetermined(
    "No verified tax rule covers the project location and no manual rate was provided.",
  );
}
