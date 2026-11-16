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
import { roundMoney } from "@/lib/money/round";
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

/**
 * Pricing state of the document.
 *
 * In a market survey the measured quantities are the deliverable and the price
 * layer is supplied later, in the market. The compiler therefore applies no
 * commercial additions at all: no preliminaries, overhead, contingency,
 * retention or tax. The market total is simply the sum of whatever rates have
 * been captured so far, and it is zero until the first rate is entered.
 */
export interface BoqSurveyState {
  is_survey: boolean;
  lines: number;
  priced_lines: number;
  unpriced_lines: number;
  priced_pct: number;
  market_total: number;
  complete: boolean;
}

export interface CompiledBoq {
  document: BoqStudioDocument;
  standard: StandardBoqDocument;
  warnings: BoqCompileWarnings;
  is_preliminary: boolean;
  survey: BoqSurveyState;
}

/** One cent rule for the whole product (src/lib/money/round.ts). */
const round2 = roundMoney;

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

const asText = (value: unknown, fallback = ""): string =>
  value === null || value === undefined
    ? fallback
    : typeof value === "string"
      ? value
      : String(value);

/**
 * Numbers keep their sign. A negative quantity or rate is a sign error in a
 * bill, and normalising it away here would hide it, so the compiler blocks the
 * export and names the item. A value that is not a number at all has nothing to
 * show and becomes zero.
 */
const asNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Section code lookups tolerate "03", "Class F" or custom codes. A generated
 * number must not collide with one already typed in the same section: the old
 * generator counted items from one, so a blank number after "03.01" became
 * "03.02" whether or not that number was already in use.
 */
function nextItemNumber(
  prefix: string,
  index: number,
  taken: Set<string>,
): string {
  let position = index + 1;
  let candidate = `${prefix}.${String(position).padStart(2, "0")}`;
  while (taken.has(candidate)) {
    position += 1;
    candidate = `${prefix}.${String(position).padStart(2, "0")}`;
  }
  taken.add(candidate);
  return candidate;
}

/**
 * Date the manual tax position belongs to.
 *
 * A document prepared in March and re-exported in December must not claim its
 * tax rate took effect in December: the provenance dates describe the document,
 * so the preparation date is used when it is a readable date, and today only
 * when the document has none.
 */
function documentTaxDate(preparedDate: string): string {
  const candidate = (preparedDate || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) &&
    !Number.isNaN(Date.parse(candidate))
    ? candidate
    : new Date().toISOString().slice(0, 10);
}

function taxResultFor(
  rate: number | null,
  net: number,
  marketCode: string,
  taxCode: string,
  effectiveDate: string,
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
        // The tax engine records provenance rates as fractions (0.075), and the
        // projection panel multiplies them by 100 to print a percentage. A
        // manual BOQ rate is entered as a percentage, so it is converted here
        // rather than stored in a different unit under the same field name.
        rate: rate / 100,
        effectiveFrom: effectiveDate,
        effectiveTo: null,
        sourceUrl: "manual-entry",
        reviewedAt: effectiveDate,
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

export interface NormalisedBoqDocument {
  document: BoqStudioDocument;
  /** Item values that would price a credit or cannot be read as a number. */
  invalid_items: string[];
  /** Item numbers used more than once in the document. */
  duplicate_numbers: string[];
}

/**
 * A stored document is data, not a trusted object: after a bad import or an
 * older schema, any field can be missing or mistyped. Every field the compiler
 * reads is defaulted here, so a malformed document is reported rather than
 * throwing while the studio draws its own totals.
 */
function normaliseDocument(doc: BoqStudioDocument): NormalisedBoqDocument {
  const invalid: string[] = [];
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  const party = (value: unknown): BoqStudioDocument["client"] => {
    const raw = (value ?? {}) as Record<string, unknown>;
    return {
      ...raw,
      name: asText(raw.name),
      address: asText(raw.address),
    } as BoqStudioDocument["client"];
  };

  const reviewRaw = (doc.review ?? {}) as unknown as Record<string, unknown>;
  const reviewStatus =
    reviewRaw.status === "reviewed" || reviewRaw.status === "rejected"
      ? reviewRaw.status
      : "unreviewed";

  const sections = (Array.isArray(doc.sections) ? doc.sections : []).map(
    (section, sIdx) => {
      const code =
        asText(section?.code).trim() || String(sIdx + 1).padStart(2, "0");
      const items = Array.isArray(section?.items) ? section.items : [];
      const taken = new Set(
        items.map((item) => asText(item?.item_number).trim()).filter(Boolean),
      );
      const normalisedItems = items.map((item, iIdx) => {
        const itemNumber =
          asText(item?.item_number).trim() || nextItemNumber(code, iIdx, taken);
        if (seen.has(itemNumber)) duplicates.add(itemNumber);
        seen.add(itemNumber);

        const readings: Array<[string, unknown, number]> = [
          ["quantity", item?.quantity, asNumber(item?.quantity)],
          ["material rate", item?.material_rate, asNumber(item?.material_rate)],
          ["labour rate", item?.labour_rate, asNumber(item?.labour_rate)],
          ["plant rate", item?.plant_rate, asNumber(item?.plant_rate)],
        ];
        for (const [name, raw, value] of readings) {
          if (value < 0) invalid.push(`${itemNumber} negative ${name}`);
          const readable =
            raw === null ||
            raw === undefined ||
            raw === "" ||
            Number.isFinite(Number(raw));
          if (!readable) invalid.push(`${itemNumber} unreadable ${name}`);
        }

        return {
          ...item,
          item_number: itemNumber,
          quantity: readings[0][2],
          material_rate: readings[1][2],
          labour_rate: readings[2][2],
          plant_rate: readings[3][2],
        };
      });
      return { ...section, code, items: normalisedItems };
    },
  );

  const document: BoqStudioDocument = {
    ...doc,
    title: asText(doc.title),
    reference: asText(doc.reference),
    description: asText(doc.description),
    market_code: asText(doc.market_code),
    currency: asText(doc.currency),
    prepared_by: asText(doc.prepared_by),
    prepared_date: asText(doc.prepared_date),
    template_slug: asText(doc.template_slug),
    updated_at: asText(doc.updated_at),
    revision: Number.isFinite(Number(doc.revision)) ? Number(doc.revision) : 1,
    mode: doc.mode === "market_survey" ? "market_survey" : "priced",
    client: party(doc.client),
    contractor: party(doc.contractor),
    survey: {
      market_city: asText(doc.survey?.market_city),
      survey_date: asText(doc.survey?.survey_date),
      surveyed_by: asText(doc.survey?.surveyed_by),
      notes: asText(doc.survey?.notes),
    },
    review: {
      ...reviewRaw,
      status: reviewStatus,
      reviewer_name: asText(reviewRaw.reviewer_name) || undefined,
      reviewer_qualification:
        asText(reviewRaw.reviewer_qualification) || undefined,
    },
    sections,
  };

  return {
    document,
    invalid_items: invalid,
    duplicate_numbers: [...duplicates],
  };
}

export function compileBoq(doc: BoqStudioDocument): CompiledBoq {
  const { document, invalid_items, duplicate_numbers } = normaliseDocument(doc);
  const isSurvey = document.mode === "market_survey";
  const blocking: string[] = [];
  const advisory: string[] = [];

  const items = document.sections.flatMap((s) => s.items);
  if (items.length === 0)
    blocking.push("Add at least one measured item before exporting.");
  if (!document.title.trim()) blocking.push("A project title is required.");
  if (invalid_items.length > 0) {
    const shown = invalid_items.slice(0, 5).join("; ");
    const rest =
      invalid_items.length > 5 ? ` and ${invalid_items.length - 5} more` : "";
    blocking.push(
      `${invalid_items.length} item value${invalid_items.length === 1 ? "" : "s"} cannot be priced (${shown}${rest}). ` +
        "A bill cannot carry a negative or unreadable quantity or rate: correct the sign or the value before exporting.",
    );
  }
  if (duplicate_numbers.length > 0) {
    blocking.push(
      `Item number${duplicate_numbers.length === 1 ? "" : "s"} ${duplicate_numbers.join(", ")} appear more than once. ` +
        "Each item needs its own number or a client cannot certify a payment against it.",
    );
  }
  if (!document.reference.trim())
    advisory.push("No BOQ reference set; exports will show a blank reference.");

  const unpriced = items.filter((i) => itemUnitRate(i) === 0);
  if (unpriced.length > 0 && !isSurvey) {
    advisory.push(
      `${unpriced.length} item${unpriced.length === 1 ? " has" : "s have"} no rate yet and will count as zero. ` +
        `Add rates, or state the omission in the exclusions so the client is not misled.`,
    );
  }
  if (unpriced.length > 0 && isSurvey) {
    advisory.push(
      `${unpriced.length} of ${items.length} line${items.length === 1 ? "" : "s"} carry no rate yet. That is expected for a market survey: the schedule goes out with the rate columns blank.`,
    );
  }

  // A market survey never applies a commercial mark-up. Quantity is the
  // deliverable; the price comes back from the market as a plain sum.
  const commercials = isSurvey
    ? {
        preliminaries_pct: 0,
        overhead_profit_pct: 0,
        contingency_pct: 0,
        retention_pct: 0,
        waste_allowance_pct: 0,
        tax_pct: null as number | null,
      }
    : document.commercials;

  const waste = commercials.waste_allowance_pct || 0;
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
    preliminariesPercent: commercials.preliminaries_pct || 0,
    overheadProfitPercent: commercials.overhead_profit_pct || 0,
    contingencyPercent: commercials.contingency_pct || 0,
    retentionPercent: commercials.retention_pct || 0,
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

  const taxPct = commercials.tax_pct;
  const taxResult = taxResultFor(
    taxPct,
    preTax.summary.subtotalBeforeTax,
    document.market_code,
    taxLabelFor(document.market_code),
    documentTaxDate(document.prepared_date),
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

  const pricedLines = items.filter((i) => itemUnitRate(i) > 0).length;
  const survey: BoqSurveyState = {
    is_survey: isSurvey,
    lines: items.length,
    priced_lines: pricedLines,
    unpriced_lines: items.length - pricedLines,
    priced_pct:
      items.length === 0 ? 0 : round2((pricedLines / items.length) * 100),
    market_total: round2(standard.summary.measuredWorksTotal),
    complete: items.length > 0 && pricedLines === items.length,
  };

  if (isSurvey && survey.complete) {
    advisory.push(
      `All ${survey.lines} lines carry market rates, giving a market total of ${formatMoney(survey.market_total, document.currency)}. ` +
        "No preliminaries, overhead, contingency, retention or tax are applied in survey mode. Convert it to a priced quote when the collected rates should become the offer.",
    );
  }

  return {
    document,
    standard,
    warnings: { blocking, advisory },
    is_preliminary: document.review.status !== "reviewed",
    survey,
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
