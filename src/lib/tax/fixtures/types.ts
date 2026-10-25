// =========================================================
// FRELUX PER-JURISDICTION TAX FIXTURES (Phase 1, 2026-10-24)
//
// One fixture per market with authoritative tax data on file.
// A fixture snapshots the market's seeded rule/catalog rows, a
// canonical quote scenario, and the deterministic outputs the
// engine must produce. Tests re-run the engine against the
// snapshot every suite run, so any drift in rules, resolution
// or computation breaks the build.
//
// LOCAL VALIDATION (roadmap Phase 1): each fixture exists to
// be handed to an accountable local reviewer for the market.
// The reviewer checks the rate, taxable base, exemptions,
// rounding, citation and effective dates against local
// knowledge and records a verdict in tax_rule_validations.
// Until a verdict exists the market's validation state is
// PENDING — fixtures never claim local validation themselves.
// =========================================================

import type { TaxJurisdictionRule } from "@/lib/tax/jurisdiction-rules";
import type { TaxCatalogRow } from "@/lib/tax/tax-catalog";

/** Authoritative rows exactly as seeded in production. */
export interface MarketTaxFixtureRows {
  /** Active tax_jurisdiction_rules rows for the market. */
  rules: TaxJurisdictionRule[];
  /** Active tax_catalog consumption rows for the market. */
  catalog: TaxCatalogRow[];
}

/** One canonical quote scenario with the outputs the engine
 *  must produce from the fixture rows. */
export interface MarketTaxScenario {
  name: string;
  /** What the rule must apply to on this scenario. */
  appliesTo: "materials" | "services" | "both";
  /** Quote net (pre-tax) amount in the market currency. */
  preTax: number;
  expected: MarketTaxScenarioExpectation;
}

export interface MarketTaxScenarioExpectation {
  /** verified_rule | not_determined. */
  kind: "verified_rule" | "not_determined";
  /** jurisdiction_rule | market_catalog | null. */
  source: "jurisdiction_rule" | "market_catalog" | null;
  /** Flattened percentage when determinate, else null. */
  taxPercent: number | null;
  /** Total tax the engine computes (0 when not determined). */
  taxAmount: number;
  /** Net + tax (exclusive basis; inclusive keeps net). */
  grandTotal: number;
  /** Component lines when verified, else empty. */
  components: Array<{
    name: string;
    ratePct: number;
    base: number;
    amount: number;
    compoundedOn: string | null;
  }>;
  citationPublisher: string | null;
  effectiveFrom: string | null;
}

export interface MarketTaxFixture {
  /** ISO 3166-1 alpha-2 market code. */
  market: string;
  /** Market currency (display context for scenarios). */
  currency: string;
  /** Authoritative rows as seeded. */
  rows: MarketTaxFixtureRows;
  scenarios: MarketTaxScenario[];
}
