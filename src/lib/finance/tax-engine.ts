/**
 * Jurisdictional tax calculation engine for construction estimates and BOQs.
 *
 * Important: this engine contains NO hardcoded tax rates.
 * Tax rates must be loaded from sourced, dated records that have passed
 * local reviewer approval. If the exact market/jurisdiction/tax code has
 * no current, approved rate, calculation returns an explicit unavailable
 * result and never guesses.
 */

import { roundMoney as roundFromMoneyModule } from "@/lib/money/round";

export type TaxCategory =
  | "vat"
  | "gst"
  | "sales_tax"
  | "withholding_tax"
  | "construction_services_tax"
  | "other";

export type TaxSourceType =
  | "government_gazette"
  | "tax_authority"
  | "official_legislation"
  | "qualified_local_reviewer";

export interface VerifiedTaxRate {
  id: string;
  marketCode: string;
  jurisdictionCode?: string | null;
  taxCode: string;
  taxName: string;
  category: TaxCategory;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  sourceType: TaxSourceType;
  sourceUrl: string;
  reviewerId: string;
  reviewedAt: string;
  approved: boolean;
  appliesTo?: string[];
  exemptionCodes?: string[];
}

export interface TaxLineInput {
  id: string;
  description: string;
  netAmount: number;
  taxCategory: TaxCategory;
  jurisdictionCode?: string | null;
  isTaxExempt?: boolean;
  exemptionCode?: string | null;
}

export interface TaxCalculationResult {
  status: "calculated" | "unavailable";
  lineResults: Array<{
    lineId: string;
    netAmount: number;
    taxAmount: number | null;
    grossAmount: number | null;
    taxRateId: string | null;
    taxCode: string | null;
    reason?: string;
  }>;
  totals: {
    net: number;
    tax: number | null;
    gross: number | null;
  };
  provenance: Array<{
    rateId: string;
    taxCode: string;
    marketCode: string;
    jurisdictionCode: string | null;
    rate: number;
    effectiveFrom: string;
    effectiveTo: string | null;
    sourceUrl: string;
    reviewedAt: string;
    reviewerId: string;
  }>;
  warnings: string[];
}

/** One cent rule for the whole product (src/lib/money/round.ts). */
const roundMoney = roundFromMoneyModule;

/**
 * The calendar date of a timestamp, or null when it cannot be read.
 *
 * Dates were compared as strings, so a rate recorded as an ISO timestamp
 * ("2026-01-05T00:00:00Z") sorted after the same calendar day ("2026-01-05") and
 * a rate effective that day was treated as not yet in force. An unreadable date
 * used to throw from toISOString and take the whole calculation with it.
 */
function dateOnly(isoDate: string): string | null {
  if (!isoDate) return null;
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

function isActiveOn(rate: VerifiedTaxRate, date: string): boolean {
  const effectiveDate = dateOnly(date);
  if (!effectiveDate) return false;
  const from = dateOnly(rate.effectiveFrom);
  const to = rate.effectiveTo ? dateOnly(rate.effectiveTo) : null;
  if (!from) return false;
  if (rate.effectiveTo && !to) return false;
  return from <= effectiveDate && (!to || to >= effectiveDate);
}

function findRate(
  rates: VerifiedTaxRate[],
  input: TaxLineInput,
  marketCode: string,
  date: string,
): VerifiedTaxRate | undefined {
  const market = marketCode.trim().toUpperCase();
  const jurisdiction = input.jurisdictionCode?.trim().toUpperCase() ?? null;
  const matching = rates.filter((rate) => {
    if (!rate.approved || rate.marketCode.trim().toUpperCase() !== market) {
      return false;
    }
    if (rate.category !== input.taxCategory || !isActiveOn(rate, date)) {
      return false;
    }
    const rateJurisdiction =
      rate.jurisdictionCode?.trim().toUpperCase() ?? null;
    if (rateJurisdiction !== jurisdiction) {
      return false;
    }
    if (rate.appliesTo?.length && !rate.appliesTo.includes(input.description)) {
      return false;
    }
    return true;
  });
  return matching.length === 1 ? matching[0] : undefined;
}

/**
 * Applies reviewer-approved rates to BOQ line items for a selected market,
 * exact jurisdiction, and valuation date. No match or ambiguous match means
 * tax is unavailable; the engine never silently treats it as zero.
 */
export function calculateJurisdictionalTax(params: {
  marketCode: string;
  jurisdictionCode?: string | null;
  valuationDate: string;
  lines: TaxLineInput[];
  rates: VerifiedTaxRate[];
}): TaxCalculationResult {
  const market = params.marketCode.trim().toUpperCase();
  const jurisdiction = params.jurisdictionCode?.trim().toUpperCase() ?? null;
  const lines = params.lines;
  if (!dateOnly(params.valuationDate)) {
    return {
      status: "unavailable",
      lineResults: [],
      totals: { net: roundMoney(0), tax: null, gross: null },
      provenance: [],
      warnings: [
        `The valuation date "${params.valuationDate}" cannot be read, so no rate can be shown to be in force.`,
      ],
    };
  }
  const warnings: string[] = [];
  const provenance: TaxCalculationResult["provenance"] = [];
  const lineResults: TaxCalculationResult["lineResults"] = [];
  let netTotal = 0;
  let taxTotal = 0;
  let unavailable = false;

  for (const line of lines) {
    // Validation comes first. The old order rounded the amount into the total
    // before checking it, so a NaN line made the net total NaN and a negative
    // line quietly reduced it, in a result that already declared itself
    // unavailable.
    if (!Number.isFinite(line.netAmount) || line.netAmount < 0) {
      unavailable = true;
      warnings.push(
        `Invalid net amount for line ${line.id}; the line is left out of the totals.`,
      );
      lineResults.push({
        lineId: line.id,
        netAmount: line.netAmount,
        taxAmount: null,
        grossAmount: null,
        taxRateId: null,
        taxCode: null,
        reason: "Invalid net amount.",
      });
      continue;
    }
    const netAmount = roundMoney(line.netAmount);
    netTotal += netAmount;

    const inputJurisdiction =
      line.jurisdictionCode?.trim().toUpperCase() ?? null;
    if (inputJurisdiction !== jurisdiction) {
      unavailable = true;
      warnings.push(
        `Line ${line.id} jurisdiction does not match the BOQ jurisdiction.`,
      );
      lineResults.push({
        lineId: line.id,
        netAmount,
        taxAmount: null,
        grossAmount: null,
        taxRateId: null,
        taxCode: null,
        reason: "Jurisdiction mismatch.",
      });
      continue;
    }

    if (line.isTaxExempt) {
      if (!line.exemptionCode?.trim()) {
        unavailable = true;
        warnings.push(
          `Line ${line.id} is marked exempt without a recorded exemption basis.`,
        );
        lineResults.push({
          lineId: line.id,
          netAmount,
          taxAmount: null,
          grossAmount: null,
          taxRateId: null,
          taxCode: null,
          reason: "Missing exemption basis.",
        });
      } else {
        lineResults.push({
          lineId: line.id,
          netAmount,
          taxAmount: 0,
          grossAmount: netAmount,
          taxRateId: null,
          taxCode: line.exemptionCode,
          reason:
            "Tax exemption recorded; validate eligibility with local tax adviser.",
        });
      }
      continue;
    }

    const rate = findRate(params.rates, line, market, params.valuationDate);
    if (!rate || rate.rate < 0 || rate.rate > 1) {
      unavailable = true;
      warnings.push(
        `No unique, current, approved tax rate for ${market}/${jurisdiction ?? "national"}/${line.taxCategory}.`,
      );
      lineResults.push({
        lineId: line.id,
        netAmount,
        taxAmount: null,
        grossAmount: null,
        taxRateId: null,
        taxCode: null,
        reason: "Tax rate is missing, ambiguous, or not reviewer-approved.",
      });
      continue;
    }

    const taxAmount = roundMoney(netAmount * rate.rate);
    taxTotal += taxAmount;
    lineResults.push({
      lineId: line.id,
      netAmount,
      taxAmount,
      grossAmount: roundMoney(netAmount + taxAmount),
      taxRateId: rate.id,
      taxCode: rate.taxCode,
    });
    if (!provenance.some((entry) => entry.rateId === rate.id)) provenance.push({
      rateId: rate.id,
      taxCode: rate.taxCode,
      marketCode: rate.marketCode,
      jurisdictionCode: rate.jurisdictionCode ?? null,
      rate: rate.rate,
      effectiveFrom: rate.effectiveFrom,
      effectiveTo: rate.effectiveTo ?? null,
      sourceUrl: rate.sourceUrl,
      reviewedAt: rate.reviewedAt,
      reviewerId: rate.reviewerId,
    });
  }

  const net = roundMoney(netTotal);
  if (unavailable) {
    return {
      status: "unavailable",
      lineResults,
      totals: { net, tax: null, gross: null },
      provenance,
      warnings: Array.from(new Set(warnings)),
    };
  }

  const tax = roundMoney(taxTotal);
  return {
    status: "calculated",
    lineResults,
    totals: { net, tax, gross: roundMoney(net + tax) },
    provenance,
    warnings,
  };
}
