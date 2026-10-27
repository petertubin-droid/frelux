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
  /**
   * The works qualify as a capital improvement (part of the realty).
   * Most states then EXEMPT the labour element even where a tier would
   * otherwise tax services: this certificate-level exemption beats the
   * tier-level appliesTo, so labour leaves every tier's base.
   */
  capitalImprovement?: boolean;
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
    const tierAppliesTo: UsSalesTaxBase = tier.appliesTo ?? "materials";
    // Capital improvement: labour is exempt at the certificate level, so
    // every tier is capped back to a materials-only base.
    const effectiveAppliesTo: UsSalesTaxBase = params.capitalImprovement
      ? "materials"
      : tierAppliesTo;
    const base =
      effectiveAppliesTo === "materials"
        ? materials
        : effectiveAppliesTo === "services"
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
      appliesTo: effectiveAppliesTo,
      base,
      amount,
    });
    if (effectiveAppliesTo !== "services") combinedMaterialsRate += tier.ratePct;
  }

  if (params.capitalImprovement) {
    notes.push(
      "Capital improvement: the labour element is exempt from sales tax on this project (certificate-level exemption), so every tier taxes materials only.",
    );
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


// ─────────────────────────────────────────────
// Canada GST / HST / PST
// ─────────────────────────────────────────────

export type CanadaProvinceCode =
  | "AB" | "BC" | "MB" | "NB" | "NL" | "NS" | "NT" | "NU"
  | "ON" | "PE" | "QC" | "SK" | "YT";

export interface CanadaProvinceTax {
  province: CanadaProvinceCode;
  provinceName: string;
  /** Single harmonised rate (materials + labour), or null when not harmonised. */
  hstPct: number | null;
  /** Federal GST when the province is not harmonised. */
  gstPct: number | null;
  /** Provincial sales tax when the province is not harmonised. */
  pstPct: number | null;
  /** Name the province calls its provincial sales tax. */
  pstName: string | null;
}

/**
 * Verified provincial rates (GST/HST/PST reference tables). HST provinces
 * charge ONE harmonised rate on the full base. Non-harmonised provinces add
 * GST (materials + labour) plus a provincial sales tax that, by default,
 * applies to MATERIALS only — construction labour is generally outside the
 * retail sales taxes of BC, Saskatchewan and Manitoba.
 */
export const CANADA_TAX_PROVINCES: Record<CanadaProvinceCode, CanadaProvinceTax> = {
  AB: { province: "AB", provinceName: "Alberta", hstPct: null, gstPct: 5, pstPct: null, pstName: null },
  BC: { province: "BC", provinceName: "British Columbia", hstPct: null, gstPct: 5, pstPct: 7, pstName: "PST" },
  MB: { province: "MB", provinceName: "Manitoba", hstPct: null, gstPct: 5, pstPct: 7, pstName: "RST" },
  NB: { province: "NB", provinceName: "New Brunswick", hstPct: 15, gstPct: null, pstPct: null, pstName: null },
  NL: { province: "NL", provinceName: "Newfoundland and Labrador", hstPct: 15, gstPct: null, pstPct: null, pstName: null },
  NS: { province: "NS", provinceName: "Nova Scotia", hstPct: 15, gstPct: null, pstPct: null, pstName: null },
  NT: { province: "NT", provinceName: "Northwest Territories", hstPct: null, gstPct: 5, pstPct: null, pstName: null },
  NU: { province: "NU", provinceName: "Nunavut", hstPct: null, gstPct: 5, pstPct: null, pstName: null },
  ON: { province: "ON", provinceName: "Ontario", hstPct: 13, gstPct: null, pstPct: null, pstName: null },
  PE: { province: "PE", provinceName: "Prince Edward Island", hstPct: 15, gstPct: null, pstPct: null, pstName: null },
  QC: { province: "QC", provinceName: "Quebec", hstPct: null, gstPct: 5, pstPct: 9.975, pstName: "QST" },
  SK: { province: "SK", provinceName: "Saskatchewan", hstPct: null, gstPct: 5, pstPct: 6, pstName: "PST" },
  YT: { province: "YT", provinceName: "Yukon", hstPct: null, gstPct: 5, pstPct: null, pstName: null },
};

export interface CanadaTaxLine {
  name: string;
  /** "hst" for the single harmonised rate, "gst"/"pst" for the split provinces. */
  kind: "hst" | "gst" | "pst";
  ratePct: number;
  base: number;
  amount: number;
}

export interface CanadaTaxResult {
  province: CanadaProvinceTax;
  lines: CanadaTaxLine[];
  /** Combined rate on the materials base (GST+PST sum, or the HST rate). */
  combinedRatePct: number;
  totalTax: number;
  notes: string[];
  errors: string[];
}

/**
 * Canadian construction sales tax. GST/HST applies to the whole base
 * (materials + labour). Provincial sales tax defaults to materials only,
 * because construction labour is generally not subject to the retail sales
 * taxes of the non-harmonised provinces; the caller can extend it to the
 * full base where the province's rules tax the service. An unknown province
 * code is refused, never guessed.
 */
export function computeCanadaSalesTax(params: {
  province: CanadaProvinceCode;
  materials: number;
  labour: number;
  /** What the provincial sales tax applies to. Default materials only. */
  pstAppliesTo?: "materials" | "both";
}): CanadaTaxResult {
  const notes: string[] = [];
  const errors: string[] = [];
  const materials = Number.isFinite(params.materials)
    ? Math.max(0, params.materials)
    : 0;
  const labour = Number.isFinite(params.labour)
    ? Math.max(0, params.labour)
    : 0;
  const fullBase = materials + labour;

  const province = CANADA_TAX_PROVINCES[params.province];
  if (!province) {
    errors.push(
      `Unknown province code "${params.province}": no Canadian tax rates are guessed for unlisted provinces.`,
    );
    return {
      province: {
        province: params.province,
        provinceName: "",
        hstPct: null,
        gstPct: null,
        pstPct: null,
        pstName: null,
      },
      lines: [],
      combinedRatePct: 0,
      totalTax: 0,
      notes,
      errors,
    };
  }

  const lines: CanadaTaxLine[] = [];
  const round = (v: number) => Math.round(v * 100) / 100;

  if (province.hstPct !== null) {
    lines.push({
      name: `HST (${province.provinceName})`,
      kind: "hst",
      ratePct: province.hstPct,
      base: fullBase,
      amount: round(fullBase * (province.hstPct / 100)),
    });
    notes.push(
      `${province.provinceName} charges a single harmonised HST of ${province.hstPct}% on the full base (materials + labour).`,
    );
  } else {
    if (province.gstPct !== null) {
      lines.push({
        name: "GST",
        kind: "gst",
        ratePct: province.gstPct,
        base: fullBase,
        amount: round(fullBase * (province.gstPct / 100)),
      });
    }
    if (province.pstPct !== null) {
      const pstBase =
        (params.pstAppliesTo ?? "materials") === "both" ? fullBase : materials;
      lines.push({
        name: `${province.pstName} (${province.provinceName})`,
        kind: "pst",
        ratePct: province.pstPct,
        base: pstBase,
        amount: round(pstBase * (province.pstPct / 100)),
      });
      notes.push(
        (params.pstAppliesTo ?? "materials") === "both"
          ? `${province.pstName} is applied to the full base on this quotation.`
          : `${province.pstName} is applied to materials only: construction labour is generally outside ${province.pstName}. Extend it with pstAppliesTo when the province taxes the service.`,
      );
    }
    notes.push("GST and the provincial tax are additive on their bases and are never compounded.");
  }

  const totalTax = round(lines.reduce((s, l) => s + l.amount, 0));
  const combinedMaterialsRate = lines.reduce(
    (s, l) => s + (l.base > 0 && l.base === fullBase ? l.ratePct : 0),
    0,
  ) || lines.reduce((s, l) => s + l.ratePct, 0);

  return {
    province,
    lines,
    combinedRatePct: Math.round(combinedMaterialsRate * 1000) / 1000,
    totalTax,
    notes,
    errors,
  };
}

// ─────────────────────────────────────────────
// India GST — HSN/SAC code matching
// ─────────────────────────────────────────────

export interface IndiaGstLineItem {
  /** HSN code for goods (e.g. 2523 cement) or SAC code for services (e.g. 995459 works contract). */
  hsnCode: string;
  /** Amount for this line (naira / base currency). */
  amount: number;
}

export interface IndiaGstLine {
  hsnCode: string;
  /** Matched rate in percent. */
  ratePct: number;
  /** GST mode for this line: intra-state (CGST + SGST) or inter-state (IGST). */
  mode: "cgst_sgst" | "igst";
  base: number;
  /** CGST amount (intra-state lines only). */
  cgst: number;
  /** SGST amount (intra-state lines only). */
  sgst: number;
  /** IGST amount (inter-state lines only). */
  igst: number;
  totalTax: number;
}

export interface IndiaGstResult {
  lines: IndiaGstLine[];
  totalTax: number;
  /** Intra-state when supplier and place-of-supply states match. */
  interState: boolean;
  notes: string[];
  warnings: string[];
}

/**
 * Canonical GST rates by HSN/SAC code. Cement 28%, iron and steel 18%, works
 * contracts 12%. Callers extend or override per contract with rateOverrides —
 * no rate is ever invented for an unmatched code.
 */
export const INDIA_GST_HSN_RATES: Record<string, number> = {
  // HSN chapter 25: cement
  "2523": 28,
  // HSN chapter 72/73: iron, steel and articles of steel
  "7208": 18,
  "7214": 18,
  "7308": 18,
  "7326": 18,
  // SAC 9954: construction services (works contracts)
  "9954": 12,
  "995459": 12,
};

/**
 * India GST for construction line items. Each item is matched against the
 * HSN/SAC rate map (longest prefix wins, exact match first); an unmatched
 * code is excluded with a warning, never guessed. Intra-state supplies split
 * the rate between CGST and SGST (half each); inter-state supplies charge
 * IGST at the full rate.
 */
export function computeIndiaGst(params: {
  items: readonly IndiaGstLineItem[];
  /** Supplier's state code (e.g. "MH"). */
  supplierState: string;
  /** Place of supply state code. */
  placeOfSupplyState: string;
  rateOverrides?: Record<string, number>;
}): IndiaGstResult {
  const notes: string[] = [];
  const warnings: string[] = [];
  const rateMap: Record<string, number> = {
    ...INDIA_GST_HSN_RATES,
    ...(params.rateOverrides ?? {}),
  };
  const supplierState = (params.supplierState || "").trim().toUpperCase();
  const placeOfSupply = (params.placeOfSupplyState || "").trim().toUpperCase();
  const interState = supplierState !== placeOfSupply;

  if (!supplierState || !placeOfSupply) {
    warnings.push(
      "Supplier and place-of-supply state codes are both required: without them the CGST/SGST versus IGST split cannot be determined.",
    );
  }
  notes.push(
    interState && supplierState && placeOfSupply
      ? "Inter-state supply: IGST is charged at the full HSN rate."
      : "Intra-state supply: the HSN rate splits into CGST and SGST (half each).",
  );

  const round = (v: number) => Math.round(v * 100) / 100;
  const matchRate = (code: string): number | null => {
    const c = code.replace(/\s+/g, "");
    if (rateMap[c] !== undefined) return rateMap[c];
    // longest configured prefix of at least 4 characters
    let best: string | null = null;
    for (const key of Object.keys(rateMap)) {
      if (key.length >= 4 && c.startsWith(key)) {
        if (!best || key.length > best.length) best = key;
      }
    }
    return best ? rateMap[best] : null;
  };

  const lines: IndiaGstLine[] = [];
  for (const item of params.items ?? []) {
    const amount = Number.isFinite(item.amount)
      ? Math.max(0, item.amount)
      : 0;
    const rate = matchRate(String(item.hsnCode ?? ""));
    if (rate === null) {
      warnings.push(
        `HSN/SAC code "${item.hsnCode}" has no GST rate configured: the line is excluded from the tax computation rather than guessed. Add it to rateOverrides.`,
      );
      continue;
    }
    const tax = round(amount * (rate / 100));
    lines.push(
      interState && supplierState && placeOfSupply
        ? {
            hsnCode: String(item.hsnCode),
            ratePct: rate,
            mode: "igst",
            base: amount,
            cgst: 0,
            sgst: 0,
            igst: tax,
            totalTax: tax,
          }
        : {
            hsnCode: String(item.hsnCode),
            ratePct: rate,
            mode: "cgst_sgst",
            base: amount,
            cgst: round(tax / 2),
            sgst: round(tax - round(tax / 2)),
            igst: 0,
            totalTax: tax,
          },
    );
  }
  notes.push(
    "Rates follow HSN/SAC code matching; a works contract (SAC 9954) is a composite supply taxed at the works-contract rate, not per-material.",
  );

  return {
    lines,
    totalTax: round(lines.reduce((s, l) => s + l.totalTax, 0)),
    interState: interState && !!supplierState && !!placeOfSupply,
    notes,
    warnings,
  };
}
