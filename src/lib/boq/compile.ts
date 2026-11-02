/**
 * BOQ studio compiler.
 *
 * The single place where a stored document becomes money. It does not invent
 * arithmetic: measured works, preliminaries, overhead and profit, contingency,
 * tax and retention are assembled by the existing standard BOQ engine
 * (assembleStandardBoq), so a studio document and a quote agree by construction.
 *
 * Guard rails this module exists for:
 *  - a waste allowance is a visible line, and is refused when item rates
 *    already carry wastage, so nothing is counted twice;
 *  - item numbers are generated deterministically from section order;
 *  - empty rate lines are surfaced rather than priced at zero silently;
 *  - review state, not user preference, decides the "preliminary" label.
 */

import {
  assembleStandardBoq,
  type StandardBoqDocument,
  type BoqCommercials as StandardCommercials,
} from "@/lib/finance/boq-standard";
import type { TaxCalculationResult } from "@/lib/finance/tax-engine";
import { formatByCode } from "@/lib/international/currency-format";
import type {
  BoqStudioDocument,
  BoqStudioItem,
  BoqStudioSection,
} from "./types";

export interface BoqCompileWarnings {
  /** Blocks an export: the document would misstate what it contains. */
  blocking: string[];
  /** Worth telling the user, does not block. */
  advisory: string[];
}

export interface CompiledBoq {
  document: BoqStudioDocument;
  standard: StandardBoqDocument;
  warnings: BoqCompileWarnings;
  is_preliminary: boolean;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function itemUnitRate(item: BoqStudioItem): number {
  return round2(
    (Number(item.material_rate) || 0) +
      (Number(item.labour_rate) || 0) +
      (Number(item.plant_rate) || 0),
  );
}

export function itemAmount(item: BoqStudioItem): number {
  return round2((Number(item.quantity) || 0) * itemUnitRate(item));
}

/** Section code lookups tolerate "03", "Class F" or custom codes. */
function nextItemNumber(section: BoqStudioSection, index: number): string {
  const prefix = section.code.trim() || String(index + 1).padStart(2, "0");
  return `${prefix}.${String(index + 1).padStart(2, "0")}`;
}

function taxResultFor(
  rate: number | null,
  net: number,
  marketCode: string,
  taxCode: string,
): TaxCalculationResult | null {
  if (rate === null || !Number.isFinite(rate)) return null;
  const tax = round2((net * rate) / 100);
  const result: TaxCalculationResult = {
    status: "calculated",
    lineResults: [],
    warnings: [],
    totals: { net: round2(net), tax, gross: round2(net + tax) },
    provenance: [
      {
        rateId: "boq-manual",
        taxCode,
        marketCode,
        jurisdictionCode: null,
        rate,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        effectiveTo: null,
        sourceUrl: "manual-entry",
        reviewedAt: new Date().toISOString().slice(0, 10),
        reviewerId: "manual-entry",
      },
    ],
  };
  return result;
}

/** Tax naming follows the market rather than assuming one country's tax. */
export function taxLabelFor(marketCode: string): string {
  const codes: Record<string, string> = {
    NG: "VAT",
    GB: "VAT",
    IE: "VAT",
    AE: "VAT",
    SA: "VAT",
    ZA: "VAT",
    KE: "VAT",
    GH: "VAT",
    DE: "MwSt",
    FR: "TVA",
    ES: "IVA",
    IT: "IVA",
    NL: "BTW",
    PL: "VAT",
    SE: "Moms",
    CH: "MWST",
    TR: "KDV",
    AU: "GST",
    NZ: "GST",
    CA: "GST",
    SG: "GST",
    MY: "SST",
    IN: "GST",
    US: "Sales Tax",
    JP: "消費税",
    KR: "부가세",
    CN: "增值税",
    MX: "IVA",
    BR: "ICMS",
    ID: "PPN",
    PH: "VAT",
    EG: "VAT",
    TZ: "VAT",
    CI: "TVA",
    ET: "VAT",
  };
  return codes[(marketCode || "").toUpperCase()] ?? "VAT";
}

function normaliseDocument(doc: BoqStudioDocument): BoqStudioDocument {
  return {
    ...doc,
    sections: doc.sections.map((section, sIdx) => ({
      ...section,
      code: section.code?.trim() || String(sIdx + 1).padStart(2, "0"),
      items: section.items.map((item, iIdx) => ({
        ...item,
        item_number: item.item_number?.trim() || nextItemNumber(section, iIdx),
        quantity: Number(item.quantity) || 0,
        material_rate: Number(item.material_rate) || 0,
        labour_rate: Number(item.labour_rate) || 0,
        plant_rate: Number(item.plant_rate) || 0,
      })),
    })),
  };
}

export function compileBoq(doc: BoqStudioDocument): CompiledBoq {
  const document = normaliseDocument(doc);
  const blocking: string[] = [];
  const advisory: string[] = [];

  const items = document.sections.flatMap((s) => s.items);
  if (items.length === 0)
    blocking.push("Add at least one measured item before exporting.");
  if (!document.title.trim()) blocking.push("A project title is required.");
  if (!document.reference.trim())
    advisory.push("No BOQ reference set; exports will show a blank reference.");

  const unpriced = items.filter((i) => itemUnitRate(i) === 0);
  if (unpriced.length > 0) {
    advisory.push(
      `${unpriced.length} item${unpriced.length === 1 ? " has" : "s have"} no rate yet and will count as zero. ` +
        `Add rates, or state the omission in the exclusions so the client is not misled.`,
    );
  }

  const waste = document.commercials.waste_allowance_pct || 0;
  const ratesCarryWaste = items.some((i) => i.rates_include_waste);
  if (waste > 0 && ratesCarryWaste) {
    blocking.push(
      "Waste would be counted twice: some item rates already include wastage while a waste allowance percentage is also set. " +
        "Clear one of them.",
    );
  }

  const zeroQty = items.filter((i) => (Number(i.quantity) || 0) === 0);
  if (zeroQty.length > 0)
    advisory.push(`${zeroQty.length} item(s) have zero quantity.`);

  const sectionInput = () =>
    document.sections.map((section) => ({
      code: section.code,
      title: section.title,
      subSections: [
        {
          code: section.code,
          title: section.title,
          items: section.items.map((item) => ({
            itemNumber: item.item_number,
            description: item.description,
            specificationRef: item.specification || undefined,
            quantity: item.quantity,
            unit: item.unit,
            materialRate: item.material_rate,
            laborRate: item.labour_rate,
            plantRate: item.plant_rate,
          })),
        },
      ],
    }));

  const metadata = {
    title: document.title || "Untitled BOQ",
    projectRef: document.reference,
    clientName: document.client.name,
    contractorName: document.contractor.name,
    location: document.client.address || "",
    marketCode: document.market_code,
    currency: document.currency,
    preparedBy: document.prepared_by,
    date: document.prepared_date,
    revision: `R${document.revision}`,
    standard: document.standard,
  };

  const baseCommercials: Omit<StandardCommercials, "taxResult"> = {
    preliminariesPercent: document.commercials.preliminaries_pct || 0,
    overheadProfitPercent: document.commercials.overhead_profit_pct || 0,
    contingencyPercent: document.commercials.contingency_pct || 0,
    retentionPercent: document.commercials.retention_pct || 0,
  };

  // Pass 1: measured works, so a waste allowance can be valued against it.
  const base = assembleStandardBoq({
    metadata,
    commercials: { ...baseCommercials, taxResult: null },
    sections: sectionInput(),
  });

  let standard = base;
  if (waste > 0 && !ratesCarryWaste) {
    const measured = base.summary.measuredWorksTotal;
    const wasteAmount = round2((measured * waste) / 100);
    if (wasteAmount > 0) {
      standard = assembleStandardBoq({
        metadata,
        commercials: { ...baseCommercials, taxResult: null },
        sections: [
          ...sectionInput(),
          {
            code: "WA",
            title: `Waste allowance (${waste}% of measured works)`,
            subSections: [
              {
                code: "WA",
                title: "Allowance for material wastage",
                items: [
                  {
                    itemNumber: "WA.01",
                    description: `Waste allowance at ${waste}% of measured works`,
                    quantity: 1,
                    unit: "sum",
                    materialRate: wasteAmount,
                    laborRate: 0,
                    plantRate: 0,
                  },
                ],
              },
            ],
          },
        ],
      });
    }
  }

  // Pass 2: commercial additions, then tax from the user's configured rate.
  const preTax = assembleStandardBoq({
    metadata,
    commercials: { ...baseCommercials, taxResult: null },
    sections: standard.sections.map((s) => ({
      code: s.code,
      title: s.title,
      subSections: s.subSections.map((sub) => ({
        code: sub.code,
        title: sub.title,
        items: sub.items.map((i) => ({
          itemNumber: i.itemNumber,
          description: i.description,
          specificationRef: i.specificationRef,
          quantity: i.quantity,
          unit: i.unit,
          materialRate: i.materialRate,
          laborRate: i.laborRate,
          plantRate: i.plantRate,
        })),
      })),
    })),
  });

  const taxPct = document.commercials.tax_pct;
  const taxResult = taxResultFor(
    taxPct,
    preTax.summary.subtotalBeforeTax,
    document.market_code,
    taxLabelFor(document.market_code),
  );
  if (taxPct !== null && taxResult) {
    standard = assembleStandardBoq({
      metadata,
      commercials: { ...baseCommercials, taxResult },
      sections: preTax.sections.map((s) => ({
        code: s.code,
        title: s.title,
        subSections: s.subSections.map((sub) => ({
          code: sub.code,
          title: sub.title,
          items: sub.items.map((i) => ({
            itemNumber: i.itemNumber,
            description: i.description,
            specificationRef: i.specificationRef,
            quantity: i.quantity,
            unit: i.unit,
            materialRate: i.materialRate,
            laborRate: i.laborRate,
            plantRate: i.plantRate,
          })),
        })),
      })),
    });
  } else {
    standard = preTax;
  }

  if (document.review.status !== "reviewed") {
    advisory.push(
      "Automatically generated BOQ. It carries a Preliminary label until a qualified professional is named as reviewer.",
    );
  }

  return {
    document,
    standard,
    warnings: { blocking, advisory },
    is_preliminary: document.review.status !== "reviewed",
  };
}

export function formatMoney(
  amount: number,
  currency: string,
  decimals: 0 | 2 = 2,
): string {
  return formatByCode(amount, currency || "XXX", { decimals });
}

/** The label stamped on every exported page. Never claims approval without a reviewer. */
export function documentStatusLabel(doc: BoqStudioDocument): string {
  if (doc.review.status === "reviewed" && doc.review.reviewer_name) {
    const qual = doc.review.reviewer_qualification
      ? `, ${doc.review.reviewer_qualification}`
      : "";
    return `Reviewed by ${doc.review.reviewer_name}${qual}`;
  }
  if (doc.review.status === "rejected")
    return "Preliminary: returned for revision";
  return "Preliminary: not professionally reviewed";
}
