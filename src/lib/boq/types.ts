/**
 * FRELUX Bill of Quantities Studio: document contract.
 *
 * One document is what a user edits and saves. It is deliberately plain data so
 * it can live in `boq_quotes.boq_document`, be snapshotted into the existing
 * revision table, and be rebuilt into an export without side effects.
 *
 * Money is never stored pre-multiplied: quantities and unit rates are the
 * source of truth, and totals are produced only by the compiler.
 */

import type { BoqStandard } from "@/lib/finance/boq-standard";

export type MeasurementSystem = "metric" | "imperial";

export interface BoqParty {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  registration?: string;
}

export interface BoqSourceRef {
  /** Which calculator produced the quantity, e.g. "foundation". */
  calculator: string;
  /** Row reference in the source table, so any line can be traced back. */
  ref: string;
  label?: string;
  imported_at: string;
}

export interface BoqStudioItem {
  id: string;
  /** Blank means the compiler assigns the next number in the section. */
  item_number: string;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  material_rate: number;
  labour_rate: number;
  /** Plant/equipment rate. Shown only when the template enables it. */
  plant_rate: number;
  notes: string;
  /** True when the rates already carry the material wastage allowance. */
  rates_include_waste: boolean;
  source?: BoqSourceRef | null;
}

export interface BoqStudioSection {
  id: string;
  code: string;
  title: string;
  notes: string;
  items: BoqStudioItem[];
}

export interface BoqCommercials {
  preliminaries_pct: number;
  overhead_profit_pct: number;
  contingency_pct: number;
  retention_pct: number;
  /**
   * Waste allowance applied to measured works as its own line. Kept separate
   * from item rates so it can never be counted twice silently.
   */
  waste_allowance_pct: number;
  /** Tax added on top of the build-up. Null = no tax line, never assumed. */
  tax_pct: number | null;
}

export interface BoqReview {
  status: "unreviewed" | "reviewed" | "rejected";
  reviewer_name?: string;
  reviewer_qualification?: string;
  reviewed_at?: string;
  note?: string;
}

export interface BoqStudioDocument {
  schema: 1;
  reference: string;
  title: string;
  description: string;
  market_code: string;
  currency: string;
  measurement_system: MeasurementSystem;
  standard: BoqStandard;
  template_slug: string;
  client: BoqParty;
  contractor: BoqParty;
  prepared_by: string;
  prepared_date: string;
  revision: number;
  /**
   * Automatically generated documents stay preliminary until a qualified
   * professional reviews them. The label is derived from review.status, never
   * from the user's preference, so a document cannot present itself as
   * approved without a named reviewer.
   */
  review: BoqReview;
  assumptions: string[];
  exclusions: string[];
  commercials: BoqCommercials;
  sections: BoqStudioSection[];
  updated_at: string;
}

export interface BoqTemplateRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  standard: string;
  market_code: string | null;
  currency: string | null;
  measurement_system: MeasurementSystem;
  rounding_decimals: number;
  show_material_rate: boolean;
  show_labour_rate: boolean;
  show_plant_rate: boolean;
  page_size: string;
  footer_note: string | null;
  default_preliminaries_pct: number;
  default_overhead_profit_pct: number;
  default_contingency_pct: number;
  default_retention_pct: number;
  default_tax_pct: number | null;
  is_active: boolean;
}

export interface BoqSectionLibraryRow {
  id: string;
  standard: string;
  code: string;
  title: string;
  sort_order: number;
  is_active: boolean;
}

export const MEASUREMENT_UNITS: Record<MeasurementSystem, string[]> = {
  metric: [
    "m",
    "m²",
    "m³",
    "kg",
    "tonne",
    "nr",
    "item",
    "sum",
    "bags",
    "trips",
    "litres",
    "rolls",
    "pcs",
  ],
  imperial: [
    "ft",
    "ft²",
    "ft³",
    "lb",
    "ton",
    "nr",
    "item",
    "sum",
    "bags",
    "trips",
    "gal",
    "rolls",
    "pcs",
  ],
};

/** A blank document that already carries the defaults a user expects. */
export function createEmptyDocument(input: {
  currency: string;
  marketCode: string;
  standard: BoqStandard;
  templateSlug: string;
  preparedBy?: string;
  reference?: string;
}): BoqStudioDocument {
  const today = new Date().toISOString();
  return {
    schema: 1,
    reference: input.reference ?? "",
    title: "",
    description: "",
    market_code: input.marketCode,
    currency: input.currency,
    measurement_system: "metric",
    standard: input.standard,
    template_slug: input.templateSlug,
    client: { name: "" },
    contractor: { name: "" },
    prepared_by: input.preparedBy ?? "",
    prepared_date: today.slice(0, 10),
    revision: 0,
    review: { status: "unreviewed" },
    assumptions: [],
    exclusions: [],
    commercials: {
      preliminaries_pct: 0,
      overhead_profit_pct: 0,
      contingency_pct: 0,
      retention_pct: 0,
      waste_allowance_pct: 0,
      tax_pct: null,
    },
    sections: [],
    updated_at: today,
  };
}
