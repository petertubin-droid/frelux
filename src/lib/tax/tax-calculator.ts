/**
 * FRELUX Engine #4, M2: Deterministic tax calculator.
 *
 * HONESTY CONTRACT (mirrors the i18n mandate — no invented claims):
 *  - The only source of a tax rate is the live tax_catalog (each row
 *    web-verified with citation) or an explicit admin-configured rule.
 *  - Unknown market  -> status "unknown"   (never another market's rate)
 *  - Varies-by-jurisdiction (US, BR) -> status "varies" with the verified
 *    structure; the calculator NEVER substitutes a national number.
 *  - No silent fallbacks to Nigerian logic — NG is just another market row.
 */

import type { TaxCatalogRow } from "./tax-catalog";
import { fetchConsumptionTaxRows } from "./tax-catalog";

export type TaxResolutionStatus =
  | "ok" // verified rate available
  | "varies" // verified structure exists but no single rate (US, BR)
  | "unknown"; // no verified row for this market/scope

export interface TaxResolution {
  status: TaxResolutionStatus;
  /** Resolved tax display name, when known. */
  taxName?: string;
  /** Rate percentage excluding additional levies, when known. */
  ratePct?: number;
  /** Additional verified levies (e.g. GH NHIL+GETFund 5). */
  additionalLeviesPct?: number;
  /** ratePct + additionalLeviesPct, the effective percentage. */
  effectivePct?: number;
  /** What the rate applies to (from the catalog row). */
  basis?: string;
  /** Official citation, safe to show. */
  citation?: { title: string; url: string; publisher: string };
  effectiveDate?: string;
  notes?: string;
  /** Human-readable reason for a varies/unknown outcome. */
  message: string;
  /** The catalog row backing this resolution, when one exists. */
  row?: TaxCatalogRow;
}

export type AppliesTo = "materials" | "services" | "both";

/** Pick the best catalog row for a scope, deterministically. */
export function pickCatalogRow(
  rows: TaxCatalogRow[],
  appliesTo: AppliesTo = "both",
): TaxCatalogRow | null {
  if (rows.length === 0) return null;
  const exact = rows.find((r) => r.applies_to === appliesTo);
  const both = rows.find((r) => r.applies_to === "both");
  // Exact scope match wins; otherwise a "both" row applies.
  return exact ?? both ?? rows[0] ?? null;
}

/**
 * Resolve the consumption tax (VAT/GST/sales tax/ISS) for a market.
 * Deterministic: same catalog rows in, same resolution out. No rate is
 * ever invented, defaulted, or borrowed from another market.
 */
export async function resolveConsumptionTax(
  marketCode: string,
  appliesTo: AppliesTo = "both",
): Promise<TaxResolution> {
  const rows = await fetchConsumptionTaxRows(marketCode);
  const row = pickCatalogRow(rows, appliesTo);
  if (!row) {
    return {
      status: "unknown",
      message:
        `No verified tax rate is on file for ${marketCode.toUpperCase()}. ` +
        "No rate is applied rather than guessing; an admin can add a verified catalog entry.",
    };
  }
  if (row.rate_pct === null || row.rate_pct === undefined) {
    return {
      status: "varies",
      taxName: row.tax_name,
      basis: row.basis,
      citation: {
        title: row.citation_title,
        url: row.citation_url,
        publisher: row.citation_publisher,
      },
      effectiveDate: row.effective_date,
      notes: row.notes ?? undefined,
      message:
        `${row.tax_name} for ${marketCode.toUpperCase()} has no single ` +
        `national rate. ${row.basis} The amount is left untaxed rather ` +
        "than estimated with an invented number.",
      row,
    };
  }
  const rate = Number(row.rate_pct);
  const levies = Number(row.additional_levies_pct ?? 0);
  return {
    status: "ok",
    taxName: row.tax_name,
    ratePct: rate,
    additionalLeviesPct: levies,
    effectivePct: rate + levies,
    basis: row.basis,
    citation: {
      title: row.citation_title,
      url: row.citation_url,
      publisher: row.citation_publisher,
    },
    effectiveDate: row.effective_date,
    notes: row.notes ?? undefined,
    message:
      `${row.tax_name} at ${rate + levies}% for ${marketCode.toUpperCase()} ` +
      `(${row.citation_publisher}, effective ${row.effective_date}).`,
    row,
  };
}

/**
 * Deterministic tax computation. Only computes when given an explicit
 * resolution or rate — the caller decides which rate to trust (catalog
 * resolution, admin rule, or user input); this function never chooses.
 */
export interface TaxAmount {
  net: number;
  taxPct: number;
  taxAmount: number;
  gross: number;
}

export function computeTaxAmount(net: number, taxPct: number): TaxAmount {
  if (!Number.isFinite(net) || !Number.isFinite(taxPct)) {
    throw new Error("computeTaxAmount requires finite net and rate");
  }
  if (net < 0 || taxPct < 0 || taxPct >= 100) {
    throw new Error(`Invalid tax inputs: net ${net}, rate ${taxPct}`);
  }
  const taxAmount = (net * taxPct) / 100;
  return {
    net,
    taxPct,
    taxAmount: Math.round(taxAmount * 100) / 100,
    gross: Math.round((net + taxAmount) * 100) / 100,
  };
}

/**
 * Apply a resolved catalog tax to a net amount. Refuses (returns null)
 * for varies/unknown resolutions — no guessing.
 */
export async function applyCatalogTax(
  marketCode: string,
  net: number,
  appliesTo: AppliesTo = "both",
): Promise<{ resolution: TaxResolution; amount: TaxAmount | null }> {
  const resolution = await resolveConsumptionTax(marketCode, appliesTo);
  if (resolution.status !== "ok" || resolution.effectivePct === undefined) {
    return { resolution, amount: null };
  }
  return {
    resolution,
    amount: computeTaxAmount(net, resolution.effectivePct),
  };
}
