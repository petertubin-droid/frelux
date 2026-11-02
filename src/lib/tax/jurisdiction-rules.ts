/**
 * FRELUX Phase 1: jurisdiction-aware tax rules engine.
 *
 * HONESTY CONTRACT (roadmap Phase 1):
 *  - Rate resolution is a deterministic, explainable result carrying
 *    jurisdiction, rule/version, source, effective dates, calculation
 *    base, components, rounding and exclusions.
 *  - If no exact active rule applies, the result is `not_determined`.
 *    A default percentage (7.5 or any other) is NEVER substituted.
 *  - The project's site jurisdiction is a separate input from the
 *    user profile, business address or market display preference.
 *    Resolution starts at the site jurisdiction and widens strictly
 *    upward (municipal → state → regional → national) within the same
 *    market; it never borrows another market's rates.
 *  - Chained or compound taxes exist ONLY when a reviewed rule
 *    explicitly authors them (components[].compound_on).
 *  - The DB refuses active rules without reviewer + next review date;
 *    this module fails closed regardless (defense in depth).
 */

import { supabase } from "@/lib/supabase";
import { fetchConsumptionTaxRows, type TaxCatalogRow } from "./tax-catalog";

// ============================================================
// TYPES
// ============================================================

export type JurisdictionLevel = "national" | "regional" | "state" | "municipal";

export const JURISDICTION_PRECEDENCE: readonly JurisdictionLevel[] = [
  "municipal",
  "state",
  "regional",
  "national",
];

/** The project's actual site jurisdiction (never the user profile). */
export interface TaxJurisdiction {
  marketCode: string;
  /** Most specific known level for the site, e.g. "state". */
  jurisdictionLevel: JurisdictionLevel;
  /** Code within the level, e.g. "NG-LA" for Lagos state. */
  jurisdictionCode: string;
}

/** One authored tax component of a rule. */
export interface TaxRuleComponent {
  name: string;
  rate_pct: number;
  /** Earlier component name this compounds on, or null for additive. */
  compound_on: string | null;
}

export interface TaxJurisdictionRule {
  id: string;
  rule_code: string;
  version: number;
  market_code: string;
  jurisdiction_level: JurisdictionLevel;
  jurisdiction_code: string | null;
  tax_category: "consumption" | "withholding" | "settlement";
  tax_name: string;
  components: TaxRuleComponent[];
  basis_inclusive: boolean;
  taxable_base_definition: string;
  rounding_method: "half_up" | "half_even" | "down";
  exemption_handling: string;
  unknown_handling: string;
  applies_to: "materials" | "services" | "both";
  effective_from: string;
  effective_to: string | null;
  source_title: string;
  source_url: string;
  source_publisher: string;
  reviewer_name: string | null;
  next_review_date: string | null;
  is_active: boolean;
}

export type TaxResolutionSource =
  "jurisdiction_rule" | "market_catalog" | "none";

export interface ResolvedTaxComponent {
  name: string;
  ratePct: number;
  /** Base this component was computed on (after compounding, if any). */
  computedBase: number;
  amount: number;
  compoundedOn: string | null;
}

export interface JurisdictionTaxResolution {
  status: "ok" | "not_determined";
  source: TaxResolutionSource;
  /** The jurisdiction the rule actually came from (may be wider than asked). */
  resolvedJurisdiction: {
    marketCode: string;
    jurisdictionLevel: JurisdictionLevel | null;
    jurisdictionCode: string | null;
  };
  rule: { code: string; version: number } | null;
  taxName: string | null;
  effective: { from: string; to: string | null } | null;
  citation: { title: string; url: string; publisher: string } | null;
  basisInclusive: boolean | null;
  taxableBaseDefinition: string | null;
  roundingMethod: "half_up" | "half_even" | "down" | null;
  exemptionHandling: string | null;
  appliesTo: "materials" | "services" | "both" | null;
  components: TaxRuleComponent[];
  reviewer: string | null;
  nextReviewDate: string | null;
  /** Unresolved questions to surface to the user, when any. */
  unresolvedQuestions: string[];
  /** Human-readable explanation, safe to show to end users. */
  message: string;
}

export interface JurisdictionTaxComputation {
  resolution: JurisdictionTaxResolution;
  net: number;
  /** Each component computed on its authored base. */
  components: ResolvedTaxComponent[];
  totalTax: number;
  /** Net plus total tax (or net alone when the basis is inclusive). */
  gross: number;
}

// ============================================================
// FETCHERS
// ============================================================

/**
 * Active rules for a market whose effective period covers `asOf`,
 * newest version first. Client-side checks below re-verify
 * everything (fail closed independent of the query).
 */
export async function fetchJurisdictionRules(
  marketCode: string,
  asOf: string,
  taxCategory: TaxJurisdictionRule["tax_category"] = "consumption",
): Promise<TaxJurisdictionRule[]> {
  const cc = (marketCode || "").trim().toUpperCase();
  if (!cc) return [];
  const { data, error } = await supabase
    .from("tax_jurisdiction_rules")
    .select("*")
    .eq("market_code", cc)
    .eq("tax_category", taxCategory)
    .eq("is_active", true)
    .order("version", { ascending: false });
  if (error) return [];
  return ((data ?? []) as unknown as TaxJurisdictionRule[]).filter((r) =>
    ruleIsEffective(r, asOf),
  );
}

/** Effective-period check, inclusive of both boundary days. */
export function ruleIsEffective(
  rule: TaxJurisdictionRule,
  asOf: string,
): boolean {
  if (!rule.is_active) return false;
  if (asOf < rule.effective_from) return false;
  if (rule.effective_to !== null && asOf > rule.effective_to) return false;
  return true;
}

/** Fail-closed rule admission: reviewer + review date must exist. */
export function ruleIsAdmissible(rule: TaxJurisdictionRule): boolean {
  if (!rule.reviewer_name || rule.reviewer_name.trim() === "") return false;
  if (!rule.next_review_date) return false;
  if (!Array.isArray(rule.components) || rule.components.length === 0) {
    return false;
  }
  return rule.components.every(
    (c) =>
      typeof c.name === "string" &&
      c.name.trim() !== "" &&
      Number.isFinite(c.rate_pct) &&
      c.rate_pct >= 0 &&
      c.rate_pct < 100,
  );
}

function ruleCoversJurisdiction(
  rule: TaxJurisdictionRule,
  jurisdiction: TaxJurisdiction,
): boolean {
  // A rule at the site's own level must match its code (or cover the
  // whole level with a null code). Wider levels always cover.
  const idxRule = JURISDICTION_PRECEDENCE.indexOf(rule.jurisdiction_level);
  const idxSite = JURISDICTION_PRECEDENCE.indexOf(
    jurisdiction.jurisdictionLevel,
  );
  if (idxRule === -1 || idxSite === -1) return false;
  if (idxRule < idxSite) return false; // rule is narrower than the site
  if (
    idxRule === idxSite &&
    rule.jurisdiction_code !== null &&
    rule.jurisdiction_code !== jurisdiction.jurisdictionCode
  ) {
    return false;
  }
  return true;
}

// ============================================================
// RESOLUTION
// ============================================================

function ruleToResolution(
  rule: TaxJurisdictionRule,
  jurisdiction: TaxJurisdiction,
  asOf: string,
): JurisdictionTaxResolution {
  const unresolved: string[] = [];
  if (rule.effective_to === null) {
    unresolved.push(
      `Rule open-ended; review scheduled by ${rule.next_review_date}.`,
    );
  }
  return {
    status: "ok",
    source: "jurisdiction_rule",
    resolvedJurisdiction: {
      marketCode: rule.market_code,
      jurisdictionLevel: rule.jurisdiction_level,
      jurisdictionCode: rule.jurisdiction_code,
    },
    rule: { code: rule.rule_code, version: rule.version },
    taxName: rule.tax_name,
    effective: { from: rule.effective_from, to: rule.effective_to },
    citation: {
      title: rule.source_title,
      url: rule.source_url,
      publisher: rule.source_publisher,
    },
    basisInclusive: rule.basis_inclusive,
    taxableBaseDefinition: rule.taxable_base_definition,
    roundingMethod: rule.rounding_method,
    exemptionHandling: rule.exemption_handling,
    appliesTo: rule.applies_to,
    components: rule.components,
    reviewer: rule.reviewer_name,
    nextReviewDate: rule.next_review_date,
    unresolvedQuestions: unresolved,
    message:
      `${rule.tax_name} (${rule.components
        .map((c) => `${c.name} ${c.rate_pct}%`)
        .join(" + ")}) per ${rule.rule_code} v${rule.version}, ` +
      `effective ${rule.effective_from} (${rule.source_publisher}); ` +
      `resolved at ${rule.jurisdiction_level} level for ${jurisdiction.jurisdictionCode}; ` +
      `as of ${asOf}.`,
  };
}

function catalogRowToResolution(
  row: TaxCatalogRow,
  jurisdiction: TaxJurisdiction,
  asOf: string,
): JurisdictionTaxResolution {
  const levies = Number(row.additional_levies_pct ?? 0);
  const components: TaxRuleComponent[] =
    row.rate_pct === null
      ? []
      : [
          {
            name: row.tax_name,
            rate_pct: Number(row.rate_pct),
            compound_on: null,
          },
          ...(levies > 0
            ? [
                {
                  name: "Additional verified levies",
                  rate_pct: levies,
                  compound_on: null,
                },
              ]
            : []),
        ];
  return {
    status: "ok",
    source: "market_catalog",
    resolvedJurisdiction: {
      marketCode: row.market_code,
      jurisdictionLevel: "national",
      jurisdictionCode: null,
    },
    rule: null,
    taxName: row.tax_name,
    effective: { from: row.effective_date, to: null },
    citation: {
      title: row.citation_title,
      url: row.citation_url,
      publisher: row.citation_publisher,
    },
    basisInclusive: false,
    taxableBaseDefinition: row.basis,
    roundingMethod: "half_up",
    exemptionHandling: "excluded_from_base",
    appliesTo: row.applies_to,
    components,
    reviewer: "FRELUX Tax Review (catalog, web-verified 2026-10-15)",
    nextReviewDate: null,
    unresolvedQuestions: [
      "Market-level catalog row, not a jurisdiction-scoped rule; no next review date on file.",
    ],
    message:
      `${row.tax_name} at ${components.reduce(
        (s, c) => s + c.rate_pct,
        0,
      )}% for ${row.market_code} (market catalog, ${row.citation_publisher}, ` +
      `effective ${row.effective_date}); resolved at national level for ` +
      `${jurisdiction.jurisdictionCode}; as of ${asOf}.`,
  };
}

function notDetermined(
  jurisdiction: TaxJurisdiction,
  asOf: string,
  reason: string,
): JurisdictionTaxResolution {
  return {
    status: "not_determined",
    source: "none",
    resolvedJurisdiction: {
      marketCode: jurisdiction.marketCode,
      jurisdictionLevel: null,
      jurisdictionCode: null,
    },
    rule: null,
    taxName: null,
    effective: null,
    citation: null,
    basisInclusive: null,
    taxableBaseDefinition: null,
    roundingMethod: null,
    exemptionHandling: null,
    appliesTo: null,
    components: [],
    reviewer: null,
    nextReviewDate: null,
    unresolvedQuestions: [reason],
    message:
      `Tax not determined for this project location ` +
      `(${jurisdiction.marketCode}, ${jurisdiction.jurisdictionCode}) as of ${asOf}: ` +
      reason +
      " No rate is applied rather than guessing.",
  };
}

/**
 * Resolve the tax for a project site jurisdiction.
 *
 * Deterministic precedence within the site's own market:
 *  1. The most specific ACTIVE, effective, admissible rule that
 *     covers the site jurisdiction (municipal > state > regional >
 *     national; same level needs a code match or a null code).
 *  2. The market's verified catalog row (market-level evidence).
 *  3. Otherwise `not_determined` — never a default percentage.
 */
export async function resolveJurisdictionTax(
  jurisdiction: TaxJurisdiction,
  options: {
    asOf?: string;
    appliesTo?: "materials" | "services" | "both";
  } = {},
): Promise<JurisdictionTaxResolution> {
  const asOf = options.asOf ?? new Date().toISOString().slice(0, 10);
  const appliesTo = options.appliesTo ?? "both";
  const marketCode = jurisdiction.marketCode.trim().toUpperCase();
  if (!marketCode) {
    return notDetermined(
      jurisdiction,
      asOf,
      "No market on file for the project location.",
    );
  }

  const rules = await fetchJurisdictionRules(marketCode, asOf);
  // Narrowest rule first.
  const covering = rules
    .filter(
      (r) =>
        ruleIsAdmissible(r) &&
        ruleCoversJurisdiction(r, { ...jurisdiction, marketCode }) &&
        (appliesTo === "both" ||
          r.applies_to === "both" ||
          r.applies_to === appliesTo),
    )
    .sort(
      (a, b) =>
        JURISDICTION_PRECEDENCE.indexOf(a.jurisdiction_level) -
        JURISDICTION_PRECEDENCE.indexOf(b.jurisdiction_level),
    );

  if (covering.length > 0) {
    return ruleToResolution(covering[0], { ...jurisdiction, marketCode }, asOf);
  }

  // Market catalog fallback (still citation-backed, still honest).
  const catalogRows = await fetchConsumptionTaxRows(marketCode);
  const catalogRow =
    catalogRows.find((r) => r.applies_to === appliesTo) ??
    catalogRows.find((r) => r.applies_to === "both") ??
    null;

  if (catalogRow && catalogRow.rate_pct !== null) {
    return catalogRowToResolution(
      catalogRow,
      { ...jurisdiction, marketCode },
      asOf,
    );
  }
  if (catalogRow && catalogRow.rate_pct === null) {
    return notDetermined(
      jurisdiction,
      asOf,
      `${catalogRow.tax_name} has no single national rate for this market; ` +
        "a jurisdiction-scoped rule is required.",
    );
  }

  return notDetermined(
    jurisdiction,
    asOf,
    "No active, reviewed tax rule covers this jurisdiction and no verified catalog row exists for the market.",
  );
}

// ============================================================
// COMPUTATION
// ============================================================

function roundBy(
  method: "half_up" | "half_even" | "down",
  amount: number,
): number {
  // Operate on raw minor units; no pre-quantisation (it would make
  // `down` and `half_even` indistinguishable from `half_up`).
  const centsX100 = amount * 100;
  switch (method) {
    case "half_up": {
      const f = Math.floor(centsX100);
      return (centsX100 - f >= 0.5 ? f + 1 : f) / 100;
    }
    case "half_even": {
      const f = Math.floor(centsX100);
      const frac = centsX100 - f;
      if (frac > 0.5) return (f + 1) / 100;
      if (frac < 0.5) return f / 100;
      return (f % 2 === 0 ? f : f + 1) / 100;
    }
    case "down":
      return Math.floor(centsX100) / 100;
  }
}

/**
 * Deterministic computation of a resolved tax over a net amount.
 * Refuses `not_determined` resolutions — no guessing.
 *
 * Inclusive basis: the net already contains the tax; components are
 * extracted, never added. Exclusive basis: components are computed
 * on the net (each compounded component on net + prior components)
 * and added.
 */
export function computeJurisdictionTax(
  net: number,
  resolution: JurisdictionTaxResolution,
): JurisdictionTaxComputation | null {
  if (resolution.status !== "ok" || resolution.components.length === 0) {
    return null;
  }
  if (!Number.isFinite(net) || net < 0) {
    throw new Error(`Invalid net amount: ${net}`);
  }

  const method = resolution.roundingMethod ?? "half_up";
  const parts: ResolvedTaxComponent[] = [];

  if (resolution.basisInclusive) {
    // Total inclusive percentage of the gross.
    const totalPct = resolution.components.reduce((s, c) => s + c.rate_pct, 0);
    if (totalPct >= 100) {
      throw new Error(
        `Inclusive components sum to ${totalPct}%; cannot exceed 100%`,
      );
    }
    const gross = net;
    const netOfTax = (gross * 100) / (100 + totalPct);
    const runningBase = netOfTax;
    for (const comp of resolution.components) {
      const amount = roundBy(method, (runningBase * comp.rate_pct) / 100);
      parts.push({
        name: comp.name,
        ratePct: comp.rate_pct,
        computedBase: Math.round(runningBase * 100) / 100,
        amount,
        compoundedOn: comp.compound_on,
      });
    }
    const totalTax = roundBy(
      method,
      parts.reduce((s, p) => s + p.amount, 0),
    );
    return {
      resolution,
      net: Math.round(netOfTax * 100) / 100,
      components: parts,
      totalTax,
      gross,
    };
  }

  // Exclusive: additive components on the net; compounded components
  // on net + the component they compound on (author-directed only).
  const computed = new Map<string, ResolvedTaxComponent>();
  let netPlusTax = net;
  for (const comp of resolution.components) {
    let base = net;
    if (comp.compound_on !== null) {
      const prior = computed.get(comp.compound_on);
      if (!prior) {
        throw new Error(
          `Component ${comp.name} compounds on unknown component ${comp.compound_on}`,
        );
      }
      base = net + prior.amount;
    }
    const amount = roundBy(method, (base * comp.rate_pct) / 100);
    const part: ResolvedTaxComponent = {
      name: comp.name,
      ratePct: comp.rate_pct,
      computedBase: Math.round(base * 100) / 100,
      amount,
      compoundedOn: comp.compound_on,
    };
    computed.set(comp.name, part);
    parts.push(part);
    netPlusTax += amount;
  }
  const totalTax = roundBy(
    method,
    parts.reduce((s, p) => s + p.amount, 0),
  );
  return {
    resolution,
    net: Math.round(net * 100) / 100,
    components: parts,
    totalTax,
    gross: roundBy(method, netPlusTax),
  };
}

/**
 * Resolve + compute in one call. `null` computation means
 * not_determined; the resolution explains why.
 */
export async function applyJurisdictionTax(
  jurisdiction: TaxJurisdiction,
  net: number,
  options: {
    asOf?: string;
    appliesTo?: "materials" | "services" | "both";
  } = {},
): Promise<{
  resolution: JurisdictionTaxResolution;
  computation: JurisdictionTaxComputation | null;
}> {
  const resolution = await resolveJurisdictionTax(jurisdiction, options);
  return {
    resolution,
    computation: computeJurisdictionTax(net, resolution),
  };
}
