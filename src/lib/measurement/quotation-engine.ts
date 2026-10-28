/**
 * FRELUX QUOTATION & EXPORT ENGINE
 *
 * Feature 22: Quotation Generation & Export
 *
 * Transforms a CostEstimate + LabourCostResult into a structured
 * quotation document ready for PDF, HTML, WhatsApp, or email.
 *
 * The engine generates STRUCTURED DATA, the UI renders it.
 * No PDF formatting is hardcoded in the engine.
 *
 * Architecture:
 *   COST ESTIMATE (materials)
 *     + LABOUR COST (trades)
 *     + QUOTATION SETTINGS (branding, terms, validity)
 *     ↓
 *   QUOTATION DOCUMENT (structured data)
 *     ↓
 *   RENDER (PDF / HTML / WhatsApp / Email)
 *
 * Additive, does not replace existing quotation functions in contractor.ts.
 */

import type { CostEstimate } from "./cost-integration";
import type { LabourCostResult } from "./labour-engine";

// =========================================================
// QUOTATION SETTINGS
// =========================================================

export interface QuotationSettings {
  /** Company/contractor name */
  companyName: string;
  /** Company tagline (optional) */
  tagline?: string;
  /** Company logo URL (optional) */
  logoUrl?: string;
  /** Company address */
  address?: string;
  /** Company phone */
  phone?: string;
  /** Company email */
  email?: string;
  /** Default currency */
  currency: string;
  /** Quotation validity in days */
  validityDays: number;
  /** Payment terms */
  paymentTerms?: string;
  /** Terms and conditions */
  termsAndConditions?: string[];
  /** UK CIS Subcontractor Deduction rate % (e.g. 20, 30, or 0) */
  cisRatePercent?: number;
  /** UK Domestic Reverse Charge VAT flag */
  isDomesticReverseCharge?: boolean;
  /** US Sales Tax: Materials taxable, Labor tax-exempt */
  taxExemptLabor?: boolean;
  /** Retainage withholding rate % (e.g. 5% or 10%) */
  retainagePercent?: number;
  /** Tax rate percentage (optional) */
  taxPercent?: number;
  /** Contingency percentage */
  contingencyPercent?: number;
  /** Default labour cost (if not from engine) */
  defaultLabourCost?: number;
}

export const DEFAULT_QUOTATION_SETTINGS: QuotationSettings = {
  companyName: "FRELUX Estimate",
  currency: "NGN",
  validityDays: 30,
  paymentTerms: "50% upfront, 50% on completion",
  termsAndConditions: [
    "This quotation is valid for 30 days from the date of issue.",
    "Prices are based on current market rates and may vary.",
    "Material quantities are estimates and may vary based on site conditions.",
    "Any additional work will be quoted separately.",
  ],
};

// =========================================================
// QUOTATION SECTION
// =========================================================

export type QuotationSectionType =
  | "header"
  | "client_info"
  | "project_info"
  | "materials_breakdown"
  | "labour_breakdown"
  | "cost_summary"
  | "terms"
  | "footer";

export interface QuotationSection {
  type: QuotationSectionType;
  title: string;
  fields: { label: string; value: string }[];
  table?: {
    headers: string[];
    rows: string[][];
    footers?: string[][];
  };
  text?: string[];
}

// =========================================================
// QUOTATION DOCUMENT
// =========================================================

import type {
  QuoteTaxComputation,
  QuoteTaxResolution,
} from "@/lib/tax/quote-tax";
import { computeQuoteTax } from "@/lib/tax/quote-tax";

export interface QuotationDocument {
  quotationNumber: string;
  dateIssued: string;
  validUntil: string;
  settings: QuotationSettings;
  sections: QuotationSection[];
  /** Client information */
  clientName: string;
  clientAddress?: string;
  clientPhone?: string;
  /** Project information */
  projectName: string;
  projectDescription?: string;
  projectLocation?: string;
  /** Cost data */
  materialsTotal: number;
  labourTotal: number;
  contingencyPercent: number;
  contingencyAmount: number;
  /** null when not determined (pre-tax estimate) */
  taxPercent: number | null;
  taxAmount: number;
  /** Shared Phase 1 resolution provenance, when the caller resolved one. */
  taxResolution?: QuoteTaxResolution;
  /** Component-level computation for verified rules, when resolvable. */
  taxComputation?: QuoteTaxComputation;
  grandTotal: number;
  /** UK CIS Subcontractor deduction amount (deducted from labour total) */
  cisDeductionAmount?: number;
  /** UK Domestic Reverse Charge flag */
  isDomesticReverseCharge?: boolean;
  /** Retainage amount withheld */
  retainageAmount?: number;
  /** Net amount payable to contractor */
  netPayableToContractor: number;
  currency: string;
  /** Confidence */
  confidence: string;
  /** Summary text for WhatsApp / email sharing */
  shareText: string;
  /** Explanation */
  explanation: string[];
}

// =========================================================
// QUOTATION NUMBER GENERATOR
// =========================================================

let quotationCounter = 0;

export function generateQuotationNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  quotationCounter++;
  return `FRELUX-${dateStr}-${random}-${quotationCounter}`;
}

// =========================================================
// QUOTATION BUILDER
// =========================================================

export function buildQuotation(params: {
  costEstimate: CostEstimate;
  labourCost?: LabourCostResult;
  settings?: Partial<QuotationSettings>;
  clientName?: string;
  clientAddress?: string;
  clientPhone?: string;
  projectName: string;
  projectDescription?: string;
  projectLocation?: string;
  dateIssued?: string;
  quotationNumber?: string;
  /** Resolved by the caller via resolveQuoteTax (all quote surfaces
   *  consume the same resolution object). */
  taxResolution?: QuoteTaxResolution;
}): QuotationDocument {
  const settings: QuotationSettings = {
    ...DEFAULT_QUOTATION_SETTINGS,
    ...params.settings,
  };

  const quotationNumber = params.quotationNumber ?? generateQuotationNumber();
  const dateIssued =
    params.dateIssued ?? new Date().toISOString().split("T")[0];

  // Calculate valid until date
  const issued = new Date(dateIssued);
  const validUntilDate = new Date(issued);
  validUntilDate.setDate(validUntilDate.getDate() + settings.validityDays);
  const validUntil = validUntilDate.toISOString().split("T")[0];

  // Cost data
  const materialsTotal = params.costEstimate.materialsTotal;
  const labourTotal =
    params.labourCost?.totalLabourCost ??
    settings.defaultLabourCost ??
    params.costEstimate.labourTotal;
  const contingencyPercent = params.costEstimate.contingencyPercent;
  const contingencyAmount = params.costEstimate.contingencyAmount;
  // Phase 1: when the caller passed the shared resolution object it
  // wins; a settings taxPercent remains a manual assumption and is
  // labeled as such. Null = not determined: never assume a rate.
  let taxPercent: number | null = settings.taxPercent ?? null;
  const taxResolution: QuoteTaxResolution | undefined = params.taxResolution;
  if (taxResolution) {
    taxPercent = taxResolution.pct;
  }
  const taxableBase = materialsTotal + labourTotal + contingencyAmount;
  let taxAmount = taxPercent === null ? 0 : taxableBase * (taxPercent / 100);
  let grandTotal = taxableBase + taxAmount;
  // Verified rules are computed by the deterministic jurisdiction
  // engine: authored bases, compounding and rounding, component by
  // component. Inclusive-basis rules leave the total unchanged (tax
  // is already inside the quoted prices).
  const taxComputation: QuoteTaxComputation | null = taxResolution
    ? computeQuoteTax(taxResolution, taxableBase)
    : null;
  if (taxComputation) {
    taxAmount = taxComputation.totalTax;
    grandTotal = taxComputation.basisInclusive
      ? taxableBase
      : taxComputation.gross;
  }
  const currency = settings.currency;

  // Build sections
  const sections: QuotationSection[] = [];

  // Header
  sections.push({
    type: "header",
    title: "QUOTATION",
    fields: [
      { label: "Quotation No.", value: quotationNumber },
      { label: "Date", value: dateIssued },
      { label: "Valid Until", value: validUntil },
    ],
  });

  // Client info
  sections.push({
    type: "client_info",
    title: "Client",
    fields: [
      { label: "Name", value: params.clientName ?? "" },
      { label: "Address", value: params.clientAddress ?? "" },
      { label: "Phone", value: params.clientPhone ?? "" },
    ],
  });

  // Project info
  sections.push({
    type: "project_info",
    title: "Project",
    fields: [
      { label: "Project", value: params.projectName },
      { label: "Description", value: params.projectDescription ?? "" },
      { label: "Location", value: params.projectLocation ?? "" },
    ],
  });

  // Materials breakdown
  const matHeaders = [
    "Material",
    "Category",
    "Qty",
    "Unit",
    "Unit Price",
    "Line Total",
  ];
  const matRows = params.costEstimate.lineItems.map((item) => [
    item.materialName,
    item.category,
    item.quantity.toString(),
    item.quantityUnit,
    item.hasPrice ? `${item.unitPrice.toLocaleString()} ${currency}` : "",
    item.hasPrice ? `${item.lineTotal.toLocaleString()} ${currency}` : "",
  ]);
  const matFooters = [
    [
      "",
      "",
      "",
      "",
      "Materials Total",
      `${materialsTotal.toLocaleString()} ${currency}`,
    ],
  ];

  sections.push({
    type: "materials_breakdown",
    title: "Materials Breakdown",
    fields: [],
    table: { headers: matHeaders, rows: matRows, footers: matFooters },
  });

  // Labour breakdown (if available)
  if (params.labourCost && params.labourCost.lineItems.length > 0) {
    const labHeaders = [
      "Activity",
      "Trade",
      "Qty",
      "Unit",
      "Rate",
      "Line Total",
    ];
    const labRows = params.labourCost.lineItems.map((item) => [
      item.activity,
      item.tradeLabel,
      item.quantity.toString(),
      item.unit,
      item.hasRate ? `${item.ratePerUnit.toLocaleString()} ${currency}` : "",
      item.hasRate ? `${item.lineTotal.toLocaleString()} ${currency}` : "",
    ]);
    const labFooters = [
      [
        "",
        "",
        "",
        "",
        "Labour Total",
        `${labourTotal.toLocaleString()} ${currency}`,
      ],
    ];

    sections.push({
      type: "labour_breakdown",
      title: "Labour Breakdown",
      fields: [],
      table: { headers: labHeaders, rows: labRows, footers: labFooters },
    });
  }

  // Cost summary
  const summaryFields: { label: string; value: string }[] = [
    {
      label: "Materials",
      value: `${materialsTotal.toLocaleString()} ${currency}`,
    },
    { label: "Labour", value: `${labourTotal.toLocaleString()} ${currency}` },
  ];
  if (contingencyPercent > 0) {
    summaryFields.push({
      label: `Contingency (${contingencyPercent}%)`,
      value: `${contingencyAmount.toLocaleString()} ${currency}`,
    });
  }
  const hasComputedComponents = taxComputation !== null && taxAmount > 0;
  if (hasComputedComponents) {
    // Verified rule (flat percentage or compound component-level).
    const basisLabel =
      taxComputation!.basisInclusive === true ? " included in prices" : "";
    summaryFields.push({
      label:
        taxPercent === null
          ? `Tax (component-level, verified: ${taxResolution?.rule?.code ?? "rule"}${basisLabel})`
          : `Tax (${taxPercent}%, verified: ${taxResolution?.rule?.code ?? taxResolution?.source}${basisLabel})`,
      value: `${taxAmount.toLocaleString()} ${currency}`,
    });
    for (const line of taxComputation!.lines) {
      summaryFields.push({
        label: `  ${line.name} (${line.ratePct}%${line.compoundedOn ? ` on ${line.base.toLocaleString()} ${currency}` : ""})`,
        value: `${line.amount.toLocaleString()} ${currency}`,
      });
    }
    if (taxResolution?.citation) {
      summaryFields.push({
        label: `  Source: ${taxResolution.citation.publisher}`,
        value: `Effective ${taxResolution.effectiveFrom ?? "n/a"}`,
      });
    }
  } else if (taxPercent !== null && taxPercent > 0) {
    const manualLabel =
      taxResolution?.kind === "manual_assumption"
        ? ", manual assumption, not tax due"
        : "";
    summaryFields.push({
      label: `Tax (${taxPercent}%${manualLabel})`,
      value: `${taxAmount.toLocaleString()} ${currency}`,
    });
  } else {
    summaryFields.push({
      label: "Tax",
      value: "Not determined for this project location (pre-tax estimate)",
    });
  }
  summaryFields.push({
    label: "GRAND TOTAL",
    value: `${grandTotal.toLocaleString()} ${currency}`,
  });
  summaryFields.push({
    label: "Confidence",
    value: (params.costEstimate.confidence ?? "high").toUpperCase(),
  });

  sections.push({
    type: "cost_summary",
    title: "Cost Summary",
    fields: summaryFields,
  });

  // Terms
  sections.push({
    type: "terms",
    title: "Terms & Conditions",
    fields: [],
    text: settings.termsAndConditions ?? [],
  });

  // Footer
  sections.push({
    type: "footer",
    title: "",
    fields: [
      { label: "Company", value: settings.companyName },
      { label: "Phone", value: settings.phone ?? "" },
      { label: "Email", value: settings.email ?? "" },
      { label: "Payment Terms", value: settings.paymentTerms ?? "" },
    ],
  });

  // Share text (for WhatsApp / email)
  const shareText = buildShareText({
    quotationNumber,
    dateIssued,
    validUntil,
    clientName: params.clientName,
    projectName: params.projectName,
    materialsTotal,
    labourTotal,
    contingencyAmount,
    taxAmount,
    grandTotal,
    currency,
    companyName: settings.companyName,
  });

  // Explanation
  const explanation: string[] = [];
  explanation.push(`Quotation ${quotationNumber} generated on ${dateIssued}`);
  explanation.push(`Materials: ${materialsTotal.toLocaleString()} ${currency}`);
  explanation.push(`Labour: ${labourTotal.toLocaleString()} ${currency}`);
  if (contingencyAmount > 0) {
    explanation.push(
      `Contingency: ${contingencyAmount.toLocaleString()} ${currency}`,
    );
  }
  if (taxAmount > 0) {
    const label =
      taxResolution?.kind === "manual_assumption"
        ? "Tax (manual assumption, not tax due)"
        : taxResolution?.kind === "verified_rule"
          ? `Tax (${taxResolution.rule?.code ?? "verified rule"})`
          : "Tax";
    explanation.push(`${label}: ${taxAmount.toLocaleString()} ${currency}`);
    if (taxComputation?.basisInclusive) {
      explanation.push(
        "Tax is included in the quoted prices (inclusive basis).",
      );
    }
    for (const line of taxComputation?.lines ?? []) {
      explanation.push(
        `${line.name}: ${line.amount.toLocaleString()} ${currency} on ${line.base.toLocaleString()} ${currency} (${line.ratePct}%)`,
      );
    }
    if (taxResolution?.kind === "verified_rule" && taxResolution.citation) {
      explanation.push(
        `Tax source: ${taxResolution.citation.publisher}, effective ${taxResolution.effectiveFrom ?? "n/a"}`,
      );
    }
  } else if (taxPercent === null) {
    explanation.push(
      "Tax: not determined for this project location (pre-tax estimate)",
    );
  }
  explanation.push(`Grand total: ${grandTotal.toLocaleString()} ${currency}`);
  explanation.push(`Valid until: ${validUntil}`);

  // Phase 1 Sourcing: CIS, Reverse Charge VAT & Retainage
  const cisRate = Math.max(0, settings.cisRatePercent ?? 0);
  const cisDeductionAmount = cisRate > 0 ? Math.round((labourTotal * cisRate) / 100 * 100) / 100 : 0;
  const retRate = Math.max(0, settings.retainagePercent ?? 0);
  const retainageAmount = retRate > 0 ? Math.round(((materialsTotal + labourTotal + contingencyAmount) * retRate) / 100 * 100) / 100 : 0;
  const netPayableToContractor = Math.round((grandTotal - cisDeductionAmount - retainageAmount) * 100) / 100;

  return {
    quotationNumber,
    dateIssued,
    validUntil,
    settings,
    sections,
    clientName: params.clientName ?? "",
    clientAddress: params.clientAddress,
    clientPhone: params.clientPhone,
    projectName: params.projectName,
    projectDescription: params.projectDescription,
    projectLocation: params.projectLocation,
    materialsTotal,
    labourTotal,
    contingencyPercent,
    contingencyAmount,
    taxPercent,
    taxAmount,
    ...(taxResolution ? { taxResolution } : {}),
    ...(taxComputation ? { taxComputation } : {}),
    grandTotal,
    cisDeductionAmount,
    isDomesticReverseCharge: settings.isDomesticReverseCharge,
    retainageAmount,
    netPayableToContractor,
    currency,
    confidence: (params.costEstimate.confidence ?? "high").toUpperCase(),
    shareText,
    explanation,
  };
}

// =========================================================
// SHARE TEXT BUILDER
// =========================================================

function buildShareText(params: {
  quotationNumber: string;
  dateIssued: string;
  validUntil: string;
  clientName?: string;
  projectName: string;
  materialsTotal: number;
  labourTotal: number;
  contingencyAmount: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
  companyName: string;
}): string {
  const lines: string[] = [];
  lines.push(`*${params.companyName}*`);
  lines.push(`Quotation: ${params.quotationNumber}`);
  lines.push(`Date: ${params.dateIssued}`);
  lines.push(`Valid until: ${params.validUntil}`);
  lines.push("");
  if (params.clientName) {
    lines.push(`Client: ${params.clientName}`);
  }
  lines.push(`Project: ${params.projectName}`);
  lines.push("");
  lines.push("--- Cost Summary ---");
  lines.push(
    `Materials: ${params.materialsTotal.toLocaleString()} ${params.currency}`,
  );
  lines.push(
    `Labour: ${params.labourTotal.toLocaleString()} ${params.currency}`,
  );
  if (params.contingencyAmount > 0) {
    lines.push(
      `Contingency: ${params.contingencyAmount.toLocaleString()} ${params.currency}`,
    );
  }
  if (params.taxAmount > 0) {
    lines.push(`Tax: ${params.taxAmount.toLocaleString()} ${params.currency}`);
  }
  lines.push(
    `*Grand Total: ${params.grandTotal.toLocaleString()} ${params.currency}*`,
  );
  lines.push("");
  lines.push("Generated by FRELUX Construction Estimator");

  return lines.join("\n");
}
