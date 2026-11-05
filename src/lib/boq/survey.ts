/**
 * Market survey: the price layer of a quote, handled separately from the
 * measured quantities.
 *
 * The same document produces both quote types. A priced quote carries rates from
 * the start. A market survey issues the identical quantities with the rate
 * columns blank, so the schedule can go to a market, a supplier or a quantity
 * surveyor for pricing, and the returned rates total on their own.
 *
 * Everything here is a pure transform on the document. Nothing writes to the
 * database and nothing invents a rate: a survey that has not been priced reports
 * zero, never an assumption.
 */

import { itemAmount, itemUnitRate } from "./compile";
import type { BoqCommercials, BoqStudioDocument, BoqStudioItem } from "./types";

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface SurveyScheduleLine {
  item_id: string;
  item_number: string;
  section_code: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  priced: boolean;
}

export interface SurveyProgress {
  lines: number;
  priced: number;
  missing: number;
  priced_pct: number;
  total: number;
  complete: boolean;
}

/** Flattened schedule: one row per measured item, in document order. */
export function surveySchedule(doc: BoqStudioDocument): SurveyScheduleLine[] {
  return doc.sections.flatMap((section) =>
    section.items.map((item) => {
      const rate = itemUnitRate(item);
      return {
        item_id: item.id,
        item_number: item.item_number,
        section_code: section.code,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity) || 0,
        rate,
        amount: itemAmount(item),
        priced: rate > 0,
      };
    }),
  );
}

export function surveyProgress(doc: BoqStudioDocument): SurveyProgress {
  const lines = surveySchedule(doc);
  const priced = lines.filter((line) => line.priced).length;
  const total = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  return {
    lines: lines.length,
    priced,
    missing: lines.length - priced,
    priced_pct: lines.length === 0 ? 0 : round2((priced / lines.length) * 100),
    total,
    complete: lines.length > 0 && priced === lines.length,
  };
}

/**
 * Applies rates collected in the market. Unknown item ids are ignored, so a
 * partially completed price sheet is safe to apply.
 */
export function applyMarketRates(
  doc: BoqStudioDocument,
  rates: Record<string, number>,
): BoqStudioDocument {
  return {
    ...doc,
    sections: doc.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        const entered = rates[item.id];
        if (entered === undefined || entered === null) return item;
        const value = Number(entered);
        if (!Number.isFinite(value) || value < 0) return item;
        return { ...item, material_rate: round2(value) };
      }),
    })),
  };
}

/** Switches a document to a market survey without touching its quantities. */
export function markAsSurvey(doc: BoqStudioDocument): BoqStudioDocument {
  return { ...doc, mode: "market_survey" };
}

/** Switches a document back to a priced quote, keeping every rate on the lines. */
export function markAsPriced(doc: BoqStudioDocument): BoqStudioDocument {
  return { ...doc, mode: "priced" };
}

/**
 * Clears the price layer so a fresh schedule can be issued. Quantities, units,
 * descriptions and specifications are untouched.
 */
export function blankSurveyRates(doc: BoqStudioDocument): BoqStudioDocument {
  const clear = (item: BoqStudioItem): BoqStudioItem => ({
    ...item,
    material_rate: 0,
    labour_rate: 0,
    plant_rate: 0,
  });
  return {
    ...doc,
    sections: doc.sections.map((section) => ({
      ...section,
      items: section.items.map(clear),
    })),
  };
}

/**
 * Turns a completed survey into a priced quote.
 *
 * The captured market rates become the line rates, and the commercial layer is
 * reintroduced from the document (or from the rates supplied here). The survey
 * block is kept as the audit trail of where those rates came from.
 */
export function convertSurveyToPriced(
  doc: BoqStudioDocument,
  commercials?: Partial<BoqCommercials>,
): BoqStudioDocument {
  return {
    ...doc,
    mode: "priced",
    commercials: { ...doc.commercials, ...(commercials ?? {}) },
    survey: {
      ...doc.survey,
      notes:
        doc.survey.notes ||
        "Rates in this quote were collected by market survey.",
    },
  };
}

/**
 * The commercial percentages that must not apply to a survey, exposed so the
 * interface can hide them rather than silently ignore a stored value.
 */
export const SURVEY_SUPPRESSED_COMMERCIALS = [
  "preliminaries_pct",
  "overhead_profit_pct",
  "contingency_pct",
  "retention_pct",
  "waste_allowance_pct",
  "tax_pct",
] as const;
