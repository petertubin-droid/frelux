/**
 * Quotation PDF for the painting cost estimator.
 *
 * This used to build an HTML document and open the browser print dialog, which
 * meant the file a visitor kept came from their own browser: editable, and
 * indistinguishable from a quotation FRELUX issued. It now renders a real PDF
 * through the shared estimate renderer and seals it with
 * `@/lib/pdf-seal`, so the downloaded quotation cannot be altered.
 *
 * All figures come from `CostEstimateResult`, the engine's own output. Nothing
 * is recalculated here; the rows mirror what the page already shows.
 */

import { formatCurrency, formatNumber } from "@/lib/utils";
import type { CostEstimateResult, CostEstimateInput } from "@/types";
import type { ResolvedBranding } from "@/lib/brand-studio";
import {
  normalizeDocumentBrandName,
  SAFE_FALLBACK_BRANDING,
} from "@/lib/brand-studio";
import { saveSealedPdf } from "@/lib/pdf-seal";
import {
  shareableFromQuote,
  type QuotePayloadLike,
  type QuoteTotalsLike,
} from "@/lib/estimate-share-adapter";
import { buildEstimatePdfDoc } from "@/lib/estimate-sharing";
import { SITE_URL } from "./seo";

export interface QuoteExportData {
  result: CostEstimateResult;
  input: CostEstimateInput;
  paintTypeName: string;
  company?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    logoUrl?: string | null;
  };
  terms?: string | null;
  /** Resolved branding from Brand Studio, overrides company fields */
  branding?: ResolvedBranding;
}

/** Distinct from the estimate reference so the two documents never collide. */
export function quoteReference(now: Date = new Date()): string {
  return `FRELUX-${now.getTime().toString().slice(-8)}`;
}

/**
 * The itemised amounts the estimator produced, in display strings. Each entry
 * is skipped unless the engine charged for it, exactly as before.
 */
export function buildQuoteRows(
  result: CostEstimateResult,
  input: CostEstimateInput,
  paintTypeName: string,
): Array<{ label: string; quantity: string; amount: string }> {
  const money = (value: number) => formatCurrency(value, result.currencySymbol);
  const rows: Array<{ label: string; quantity: string; amount: string }> = [];

  if (result.paintCost > 0) {
    rows.push({
      label: `Paint (${paintTypeName})`,
      quantity:
        result.paintContainerCount > 0
          ? `${result.paintContainerCount} container(s)`
          : `${formatNumber(input.paintLiters, 1)} L`,
      amount: money(result.paintCost),
    });
  }
  if (result.primerCost > 0) {
    rows.push({
      label: "Primer",
      quantity: "1 unit",
      amount: money(result.primerCost),
    });
  }
  if (result.fillerCost > 0) {
    rows.push({
      label: "Filler",
      quantity: "1 unit",
      amount: money(result.fillerCost),
    });
  }
  if (result.puttyCost > 0) {
    rows.push({
      label: "Putty",
      quantity: "1 unit",
      amount: money(result.puttyCost),
    });
  }
  if (result.sandpaperCost > 0) {
    rows.push({
      label: "Sandpaper",
      quantity: "1 unit",
      amount: money(result.sandpaperCost),
    });
  }
  if (result.brushesCost > 0) {
    rows.push({
      label: "Brushes",
      quantity: "1 set",
      amount: money(result.brushesCost),
    });
  }
  if (result.rollersCost > 0) {
    rows.push({
      label: "Rollers",
      quantity: "1 set",
      amount: money(result.rollersCost),
    });
  }
  if (result.otherMaterialsCost > 0) {
    rows.push({
      label: "Other materials",
      quantity: "1 unit",
      amount: money(result.otherMaterialsCost),
    });
  }
  if (result.laborCost > 0) {
    rows.push({
      label: "Labour",
      quantity: `${formatNumber(input.paintableArea)} m²`,
      amount: money(result.laborCost),
    });
  }
  return rows;
}

/** The quotation as the shared estimate format, ready for the PDF renderer. */
export function buildQuotePayload(
  data: QuoteExportData,
  reference: string,
): QuotePayloadLike {
  const { result, input, paintTypeName, terms } = data;
  const money = (value: number) => formatCurrency(value, result.currencySymbol);
  const rows = buildQuoteRows(result, input, paintTypeName);

  const totals: QuoteTotalsLike[] = [
    { label: "Materials", value: money(result.total - result.laborCost) },
  ];
  if (result.laborCost > 0) {
    totals.push({ label: "Labour", value: money(result.laborCost) });
  }
  totals.push({
    label: "Grand Total",
    value: money(result.total),
    strong: true,
  });

  return {
    title: `Quotation ${reference}`,
    metaRows: [
      ["Project type", input.projectType],
      ["Paint type", paintTypeName],
      ["Paintable area", `${formatNumber(input.paintableArea)} m²`],
      ["Paint required", `${formatNumber(input.paintLiters, 1)} L`],
    ],
    lines: rows.map((row) => ({
      label: row.label,
      quantity: row.quantity,
      line_total: row.amount,
    })),
    totals,
    warnings: terms ? [`Terms and conditions: ${terms}`] : [],
  };
}

function resolveBranding(data: QuoteExportData): ResolvedBranding {
  if (data.branding) return data.branding;
  const company = data.company;
  if (!company) return SAFE_FALLBACK_BRANDING;
  const brandName =
    normalizeDocumentBrandName(company.name) ??
    SAFE_FALLBACK_BRANDING.brandName;
  return {
    ...SAFE_FALLBACK_BRANDING,
    source: "frelux_default",
    brandName,
    email: company.email ?? SAFE_FALLBACK_BRANDING.email,
    phone: company.phone ?? SAFE_FALLBACK_BRANDING.phone,
    address: company.address ?? SAFE_FALLBACK_BRANDING.address,
    logoUrl: company.logoUrl ?? SAFE_FALLBACK_BRANDING.logoUrl,
  };
}

/**
 * Render the quotation. Exported so a caller can preview instead of saving.
 * The reference must be supplied so the printed document and the seal always
 * carry the same number.
 */
export async function buildQuotePdfDoc(
  data: QuoteExportData,
  reference: string = quoteReference(),
) {
  const payload = buildQuotePayload(data, reference);
  if (!payload.lines?.length) {
    throw new Error("There is nothing to put on this quotation yet.");
  }
  const estimate = shareableFromQuote(payload, {
    kind: "Quotation",
    link: `${SITE_URL}/cost-estimator`,
  });
  if (!estimate) {
    throw new Error("There is nothing to put on this quotation yet.");
  }
  estimate.reference = reference;
  estimate.generatedAt = new Date().toISOString();
  return buildEstimatePdfDoc(estimate, {
    branding: resolveBranding(data),
    fileName: `frelux-quotation-${reference.toLowerCase()}`,
  });
}

/**
 * Download the sealed quotation. Throws (and saves nothing) when the seal
 * fails, so an editable file never reaches the user.
 */
export async function exportPdfQuote(data: QuoteExportData): Promise<void> {
  const reference = quoteReference();
  const doc = await buildQuotePdfDoc(data, reference);
  await saveSealedPdf(doc, `frelux-quotation-${reference.toLowerCase()}.pdf`, {
    title: `Quotation ${reference}`,
    subject: "FRELUX painting cost quotation",
    author: resolveBranding(data).brandName,
    reference,
  });
}
