/**
 * Construction-specific tax mechanics that a single "VAT %" cannot express:
 *
 *  - UK CIS deductions (HMRC): a deduction from the LABOUR element of the
 *    invoice only. Materials and VAT are never part of the CIS base. The rate
 *    depends on the subcontractor's HMRC status: 20% registered, 30%
 *    unverified, 0% gross-payment status.
 *  - UK domestic reverse charge (VAT Notice 735): for construction services
 *    between VAT-registered businesses the supplier charges no VAT; the
 *    customer accounts for it. The invoice must say so.
 *  - US sales tax: state, county, city and special-district rates ADD on the
 *    same base (they do not compound), and each tier may treat labour
 *    differently — most states tax materials only, a minority tax services.
 *
 * Everything here is deterministic and states its assumptions in `notes`; no
 * rate is invented when the caller has not supplied one.
 */

// ─────────────────────────────────────────────
// UK CIS
// ─────────────────────────────────────────────

export type CisScheme = "gross" | "net" | "unverified";

export const CIS_RATES: Record<CisScheme, number> = {
  /** Gross payment status: no deduction. */
  gross: 0,
  /** Registered subcontractor: 20%. */
  net: 20,
  /** Not verified with HMRC: 30%. */
  unverified: 30,
};

export const CIS_SCHEME_LABELS: Record<CisScheme, string> = {
  gross: "Gross payment status (0%)",
  net: "Registered subcontractor (20%)",
  unverified: "Unverified subcontractor (30%)",
};

export interface CisDeduction {
  scheme: CisScheme;
  ratePct: number;
  /** The labour amount the deduction was taken from (never materials, never VAT). */
  basis: number;
  /** Amount HMRC deducts, rounded to 2 dp. */
  deduction: number;
  notes: string[];
}

/**
 * CIS deduction for an invoice. The base is labour only; materials and VAT are
 * excluded by rule, so the caller passes them separately and they are never
 * used here.
 */
export function computeCisDeduction(params: {
  labourAmount: number;
  scheme: CisScheme;
  /** Optional supplier label for the note, e.g. the subcontractor name. */
  subcontractor?: string;
}): CisDeduction {
  const notes: string[] = [];
  const labour = Number.isFinite(params.labourAmount)
    ? Math.max(0, params.labourAmount)
    : 0;
  const ratePct = CIS_RATES[params.scheme] ?? CIS_RATES.unverified;

  if (!(params.scheme in CIS_RATES)) {
    notes.push(
      "CIS status was not recognised, so the 30% unverified rate was applied. Confirm the subcontractor's HMRC status.",
    );
  }
  if (labour === 0) {
    notes.push(
      "No labour element on this invoice, so no CIS deduction applies.",
    );
  }
  notes.push(
    "CIS deduction is taken from the labour element only; materials and VAT are excluded from the CIS base.",
  );
  if (ratePct === 0) {
    notes.push(
      "Gross payment status: the contractor deducts nothing, but still reports the payment to HMRC.",
    );
  }
  if (params.subcontractor) {
    notes.push(`Subcontractor: ${params.subcontractor}.`);
  }

  const deduction = Math.round(labour * (ratePct / 100) * 100) / 100;
  return { scheme: params.scheme, ratePct, basis: labour, deduction, notes };
}

// ─────────────────────────────────────────────
// UK domestic reverse charge
// ─────────────────────────────────────────────

export interface ReverseChargeVat {
  applies: boolean;
  ratePct: number;
  /** VAT the supplier does NOT collect. */
  amountPayable: number;
  /** VAT the customer must account for on their return. */
  amountAccountedByCustomer: number;
  notes: string[];
}

/**
 * Domestic reverse charge for construction services. Applies only when both
 * parties are VAT-registered and the supply is a specified construction
 * service; otherwise the caller gets a normal-VAT result with the reason.
 */
export function computeReverseChargeVat(params: {
  taxableBase: number;
  supplierVatRegistered: boolean;
  customerVatRegistered: boolean;
  isConstructionService?: boolean;
  ratePct?: number;
}): ReverseChargeVat {
  const ratePct = params.ratePct ?? 20;
  const base = Number.isFinite(params.taxableBase)
    ? Math.max(0, params.taxableBase)
    : 0;
  const isConstruction = params.isConstructionService ?? true;
  const notes: string[] = [];
  const amount = Math.round(base * (ratePct / 100) * 100) / 100;

  const applies =
    params.supplierVatRegistered &&
    params.customerVatRegistered &&
    isConstruction;
  if (!applies) {
    const reason = !isConstruction
      ? "the supply is not a specified construction service"
      : !params.customerVatRegistered
        ? "the customer is not VAT-registered"
        : "the supplier is not VAT-registered";
    notes.push(
      `Domestic reverse charge does not apply because ${reason}; charge VAT normally.`,
    );
    return {
      applies: false,
      ratePct,
      amountPayable: 0,
      amountAccountedByCustomer: 0,
      notes,
    };
  }

  notes.push(
    `Domestic reverse charge applies at ${ratePct}%: the supplier charges no VAT and the customer accounts for ${amount.toFixed(2)} on their VAT return.`,
  );
  notes.push(
    "The invoice must state that VAT is subject to the domestic reverse charge.",
  );
  return {
    applies: true,
    ratePct,
    amountPayable: 0,
    amountAccountedByCustomer: amount,
    notes,
  };
}

// ─────────────────────────────────────────────
// US multi-tier sales tax
// ─────────────────────────────────────────────

export type UsSalesTaxTierKind =
  "state" | "county" | "city" | "special_district";

export type UsSalesTaxBase = "materials" | "services" | "both";

export interface UsSalesTaxTier {
  /** Display name, e.g. "Los Angeles County". */
  name?: string;
  kind: UsSalesTaxTierKind;
  /** Tier rate in percent, e.g. 6.25 for the California state rate. */
  ratePct: number;
  /** What this tier taxes. Defaults to materials only. */
  appliesTo?: UsSalesTaxBase;
}

export interface UsSalesTaxLine {
  name: string;
  kind: UsSalesTaxTierKind;
  ratePct: number;
  appliesTo: UsSalesTaxBase;
  base: number;
  amount: number;
}

export interface UsSalesTaxResult {
  lines: UsSalesTaxLine[];
  /** Sum of the tier rates on the materials base (the headline combined rate). */
  combinedRatePct: number;
  totalTax: number;
  notes: string[];
  errors: string[];
}

const TIER_LABELS: Record<UsSalesTaxTierKind, string> = {
  state: "State",
  county: "County",
  city: "City",
  special_district: "Special district",
};

/**
 * Multi-tier US sales tax. Tiers are additive on the same base — county and
 * city rates do not compound on state tax. Labour is taxable only where a tier
 * says so, because most states exempt construction labour while taxing
 * materials.
 */
export function computeUsSalesTax(params: {
  tiers: readonly UsSalesTaxTier[];
  materials: number;
  labour: number;
}): UsSalesTaxResult {
  const notes: string[] = [];
  const errors: string[] = [];
  const materials = Number.isFinite(params.materials)
    ? Math.max(0, params.materials)
    : 0;
  const labour = Number.isFinite(params.labour)
    ? Math.max(0, params.labour)
    : 0;
  const lines: UsSalesTaxLine[] = [];

  if (!params.tiers || params.tiers.length === 0) {
    errors.push(
      "No sales-tax tiers were supplied, so no sales tax can be computed.",
    );
    return { lines, combinedRatePct: 0, totalTax: 0, notes, errors };
  }

  let combinedMaterialsRate = 0;
  for (const tier of params.tiers) {
    const label = tier.name?.trim() || TIER_LABELS[tier.kind] || "Tax";
    if (!Number.isFinite(tier.ratePct) || tier.ratePct < 0) {
      errors.push(`${label} rate must be a non-negative percentage.`);
      continue;
    }
    const appliesTo: UsSalesTaxBase = tier.appliesTo ?? "materials";
    const base =
      appliesTo === "materials"
        ? materials
        : appliesTo === "services"
          ? labour
          : materials + labour;
    const amount = Math.round(base * (tier.ratePct / 100) * 100) / 100;
    if (base === 0) {
      notes.push(
        `${label} (${tier.ratePct}%) has no taxable base on this quotation.`,
      );
    }
    lines.push({
      name: label,
      kind: tier.kind,
      ratePct: tier.ratePct,
      appliesTo,
      base,
      amount,
    });
    if (appliesTo !== "services") combinedMaterialsRate += tier.ratePct;
  }

  if (lines.some((l) => l.appliesTo === "services")) {
    notes.push(
      "Services/labour are taxable in this jurisdiction; the tiers that apply to services are shown separately.",
    );
  } else {
    notes.push(
      "Sales tax is applied to materials only: construction labour is not taxable in this jurisdiction.",
    );
  }
  notes.push(
    "Tier rates are additive on the same base and are never compounded.",
  );

  const totalTax =
    Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  return {
    lines,
    combinedRatePct: Math.round(combinedMaterialsRate * 1000) / 1000,
    totalTax,
    notes,
    errors,
  };
}
