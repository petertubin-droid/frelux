/**
 * Window blind estimator,
 *
 * Blinds are sold two ways in the same shop: a rate per square metre, and a
 * minimum charge per window that overrides it on small openings. Both are real,
 * so the engine applies the rate and then lifts the result to the minimum when
 * the window is small. That single rule is why a 4 by 4 window quoted at 7,500
 * per metre still costs 14,700.
 *
 * Fabric is cut with a waste allowance because the drop has to clear the
 * hardware and the pattern has to line up. Rigid slats waste less, which is why
 * the allowance comes from the type rather than a single global number.
 *
 * No AI and no tax live here. Prices come from the market book, quantities come
 * from geometry, and anything arguable is returned in `assumptions`. A market or
 * type without a verified band returns manual_price_required instead of a
 * number, so the page can ask rather than invent.
 */

import {
  BLIND_TYPE_BY_KEY,
  blindBookFor,
  type BlindTypeKey,
} from "@/config/window-blinds";

export type LengthUnit = "m" | "ft";

export interface BlindsInput {
  market: string;
  unit: LengthUnit;
  typeKey: BlindTypeKey;
  /** Opening width, in `unit`. */
  width: number;
  /** Opening height, in `unit`. */
  height: number;
  /** How many identical openings. */
  quantity: number;
  /** Include fitting. */
  install?: boolean;
  /** Override the type's waste allowance. */
  wastage?: number;
  /** Rate the user typed in, when the market has no verified band. */
  manualPerM2?: number;
  /** Minimum per window the user was quoted, when the market has none. */
  manualMinimumPerWindow?: number;
}

export type BlindsStatus = "priced" | "manual_price_required";

export interface BlindsLine {
  label: string;
  detail: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  amount: number | null;
  priced: boolean;
}

export interface BlindHardwareMetrics {
  bracketCount: number;
  slatOrVaneCount: number | null;
  recommendedTubeDiameterMm: number | null;
  tubeDeflectionRisk: "safe" | "advisory" | "deflection_risk";
  mountingNote: string;
}

export interface BlindsResult {
  status: BlindsStatus;
  market: string;
  currency: string | null;
  currencySymbol: string | null;
  /** What the page should ask for when status is manual_price_required. */
  missing: string[];
  geometry: {
    unit: LengthUnit;
    widthM: number;
    heightM: number;
    areaM2: number;
    chargeableAreaM2: number;
    wastage: number;
    quantity: number;
    totalAreaM2: number;
  };
  perWindow: number | null;
  minimumApplied: boolean;
  lines: BlindsLine[];
  totals: {
    blinds: number | null;
    installation: number | null;
    total: number | null;
  };
  taxStatus: "tax_not_determined";
  assumptions: string[];
  provenance: {
    ratePerM2: number | null;
    minimumPerWindow: number | null;
    source: string;
  };
  hardwareMetrics?: BlindHardwareMetrics;
}

const METRES_PER_FOOT = 0.3048;

export function toMetres(value: number, unit: LengthUnit): number {
  return unit === "ft" ? value * METRES_PER_FOOT : value;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Shops measure to the nearest centimetre and always round UP before pricing,
 * because the fabric is cut to the measured opening. Pricing 1.234 m at 1.234
 * understates the cut, so the width and drop are lifted to the next centimetre
 * here and the assumption is stated.
 */
export function roundUpToCentimetre(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value * 100) / 100;
}

/** How many panels a width is fabricated in, at the type's maximum width. */
export function panelsForWidth(widthM: number, maxPanelWidthM: number): number {
  if (!Number.isFinite(widthM) || widthM <= 0) return 1;
  if (!Number.isFinite(maxPanelWidthM) || maxPanelWidthM <= 0) return 1;
  return Math.max(1, Math.ceil(round2(widthM / maxPanelWidthM)));
}

export function computeBlindHardwareMetrics(
  typeKey: BlindTypeKey,
  widthM: number,
  heightM: number,
): BlindHardwareMetrics {
  // Mounting brackets: 2 brackets min; >1.2m -> 3 brackets; >2.0m -> 4 brackets (spaced <=800mm)
  let bracketCount = 2;
  if (widthM > 2.0) bracketCount = 4;
  else if (widthM > 1.2) bracketCount = 3;

  let slatOrVaneCount: number | null = null;
  let recommendedTubeDiameterMm: number | null = null;
  let tubeDeflectionRisk: "safe" | "advisory" | "deflection_risk" = "safe";
  let mountingNote = "Standard top/face brackets";

  if (typeKey === "venetian-25") {
    slatOrVaneCount = Math.ceil((heightM * 1000) / 20);
    mountingNote = "Box bracket end-caps; center intermediate support required above 1.2 m span";
  } else if (
    typeKey === "venetian-50" ||
    typeKey === "wooden" ||
    typeKey === "faux-wood" ||
    typeKey === "bamboo"
  ) {
    slatOrVaneCount = Math.ceil((heightM * 1000) / 44);
    mountingNote = "Heavy duty box brackets; ensure solid anchor into lintel or header";
  } else if (typeKey === "vertical") {
    slatOrVaneCount = Math.ceil((widthM * 1000) / 79);
    mountingNote = "Track top-fix/face-fix spring clips at 600-800 mm centers";
  } else if (typeKey === "roller" || typeKey === "day-night" || typeKey === "zebra") {
    if (widthM > 2.2) {
      recommendedTubeDiameterMm = 45;
      tubeDeflectionRisk = "deflection_risk";
      mountingNote = "Wide opening (>2.2 m): 45 mm or 50 mm heavy-duty barrel required to prevent fabric smile/sagging";
    } else if (widthM > 1.5) {
      recommendedTubeDiameterMm = 38;
      tubeDeflectionRisk = "advisory";
      mountingNote = "Mid-width span (1.5-2.2 m): 38 mm aluminum barrel recommended";
    } else {
      recommendedTubeDiameterMm = 28;
      tubeDeflectionRisk = "safe";
      mountingNote = "Standard 28 mm aluminum roller barrel";
    }
  }

  return {
    bracketCount,
    slatOrVaneCount,
    recommendedTubeDiameterMm,
    tubeDeflectionRisk,
    mountingNote,
  };
}

export function calculateWindowBlinds(input: BlindsInput): BlindsResult {
  const type = BLIND_TYPE_BY_KEY[input.typeKey];
  const book = blindBookFor(input.market);
  const wastage = input.wastage ?? type?.wastage ?? 0.1;

  const widthM = toMetres(Math.max(0, input.width), input.unit);
  const heightM = toMetres(Math.max(0, input.height), input.unit);
  const quantity = Math.max(1, Math.round(input.quantity || 1));
  const areaM2 = widthM * heightM;
  const chargeableAreaM2 = areaM2 * (1 + wastage);

  const missing: string[] = [];
  const band = book?.types?.[input.typeKey];
  let ratePerM2: number | null = band?.perM2 ?? null;
  let minimumPerWindow: number | null = band?.minimumPerWindow ?? null;

  if (
    ratePerM2 === null &&
    typeof input.manualPerM2 === "number" &&
    input.manualPerM2 > 0
  ) {
    ratePerM2 = input.manualPerM2;
  }
  if (
    minimumPerWindow === null &&
    typeof input.manualMinimumPerWindow === "number" &&
    input.manualMinimumPerWindow > 0
  ) {
    minimumPerWindow = input.manualMinimumPerWindow;
  }
  if (ratePerM2 === null) missing.push("ratePerM2");

  const assumptions: string[] = [];
  if (!book) {
    assumptions.push(
      `No verified blind price book for ${input.market}. Enter the rate you were quoted and the estimator will do the arithmetic.`,
    );
  } else if (!band) {
    assumptions.push(
      `${type?.label ?? input.typeKey} has no verified ${input.market} rate yet. Enter a rate to price it.`,
    );
  }

  const priced = missing.length === 0;
  const areaCost = priced ? chargeableAreaM2 * (ratePerM2 as number) : null;
  const minimumApplied =
    priced && minimumPerWindow !== null && areaCost !== null
      ? areaCost < minimumPerWindow
      : false;
  const perWindow = priced
    ? round2(Math.max(areaCost as number, minimumPerWindow ?? 0))
    : null;

  const blindsTotal =
    priced && perWindow !== null ? round2(perWindow * quantity) : null;
  const installPerWindow = book?.installPerWindow ?? null;
  const wantsInstall = input.install !== false;
  const installationTotal =
    wantsInstall && installPerWindow !== null
      ? round2(installPerWindow * quantity)
      : wantsInstall
        ? null
        : 0;
  const total =
    blindsTotal !== null && installationTotal !== null
      ? round2(blindsTotal + installationTotal)
      : null;

  assumptions.push(
    `${Math.round(wastage * 100)} percent is added to the measured area for cutting and pattern lining (${type?.label ?? "type"} allowance).`,
  );
  if (minimumApplied) {
    assumptions.push(
      `The ${book?.currencySymbol ?? ""}${minimumPerWindow?.toLocaleString()} minimum per window applied because the measured area priced below it.`,
    );
  }
  if (minimumPerWindow === null && priced) {
    assumptions.push(
      "No minimum charge was supplied, so the rate is the whole price.",
    );
  }
  if (quantity > 1) {
    assumptions.push(
      `All ${quantity} openings are assumed to be the same size.`,
    );
  }
  if (wantsInstall && installPerWindow === null) {
    assumptions.push(
      "Fitting is not priced for this market, so it is excluded from the total.",
    );
  }
  assumptions.push(
    "Tax is not determined for blinds. Quote the total before tax.",
  );

  const lines: BlindsLine[] = [
    {
      label: `${type?.label ?? input.typeKey} blind`,
      detail: `${round2(widthM)} m wide by ${round2(heightM)} m drop, ${Math.round(wastage * 100)} percent waste`,
      quantity: round2(chargeableAreaM2),
      unit: "m2",
      unitPrice: ratePerM2,
      amount: priced ? round2(perWindow as number) : null,
      priced,
    },
  ];
  if (wantsInstall) {
    lines.push({
      label: "Fitting",
      detail: "Brackets, alignment and final adjustment",
      quantity,
      unit: "window",
      unitPrice: installPerWindow,
      amount: installationTotal,
      priced: installationTotal !== null,
    });
  }

  return {
    status: priced ? "priced" : "manual_price_required",
    market: (input.market ?? "").toUpperCase(),
    currency: book?.currency ?? null,
    currencySymbol: book?.currencySymbol ?? null,
    missing,
    geometry: {
      unit: input.unit,
      widthM: round2(widthM),
      heightM: round2(heightM),
      areaM2: round2(areaM2),
      chargeableAreaM2: round2(chargeableAreaM2),
      wastage,
      quantity,
      totalAreaM2: round2(areaM2 * quantity),
    },
    perWindow,
    minimumApplied,
    lines,
    totals: {
      blinds: blindsTotal,
      installation: installationTotal,
      total,
    },
    taxStatus: "tax_not_determined",
    assumptions,
    provenance: {
      ratePerM2,
      minimumPerWindow,
      source: book?.source ?? "No verified source for this market",
    },
    hardwareMetrics: computeBlindHardwareMetrics(input.typeKey, widthM, heightM),
  };
}

// =========================================================
// Multi opening schedule
//
// A real job is fifteen windows of four sizes, not one window. The schedule
// prices each opening with the same rule as the single window (rate, then the
// market minimum, then the waste allowance), totals the job, and reports a
// blended rate so the installer can see whether the job is worth taking.
//
// Grade multiplies the rate, never the minimum, because a shop that charges a
// minimum does not raise it for better fabric by a fixed percentage.
// =========================================================

import {
  BLIND_GRADE_BY_KEY,
  type BlindExtraKey,
  type BlindGradeKey,
} from "@/config/window-blinds";

export interface BlindOpening {
  /** Stable id for the row, so the page can edit and remove it. */
  id: string;
  label: string;
  typeKey: BlindTypeKey;
  width: number;
  height: number;
  quantity: number;
  motorised?: boolean;
  /** Enclosed top box on this opening. */
  cassette?: boolean;
  /** Take down and dispose of existing blinds on this opening. */
  removeOld?: boolean;
}

export type BlindExtras = Partial<Record<BlindExtraKey, number>>;

export interface BlindProjectInput {
  market: string;
  unit: LengthUnit;
  grade: BlindGradeKey;
  openings: BlindOpening[];
  install?: boolean;
  wastage?: number;
  extras?: BlindExtras;
  manualPerM2?: number;
  manualMinimumPerWindow?: number;
  /**
   * VAT or sales tax percent to add. Never assumed: the shop decides whether
   * blinds are taxed at that rate in that market.
   */
  taxRatePct?: number;
}

export interface BlindProjectRow {
  id: string;
  label: string;
  typeKey: BlindTypeKey;
  typeLabel: string;
  widthM: number;
  heightM: number;
  areaM2: number;
  chargeableAreaM2: number;
  quantity: number;
  ratePerM2: number | null;
  minimumPerWindow: number | null;
  minimumApplied: boolean;
  perWindow: number | null;
  blindsTotal: number | null;
  extrasPerWindow: number | null;
  extrasTotal: number | null;
  motorised: boolean;
  cassette: boolean;
  removeOld: boolean;
  /** Panels the opening is fabricated in, at the type's maximum width. */
  panels: number;
  /** Width of each panel, in metres. */
  panelWidthM: number;
  priced: boolean;
}

export interface BlindProjectResult {
  status: BlindsStatus;
  market: string;
  currency: string | null;
  currencySymbol: string | null;
  grade: BlindGradeKey;
  gradeLabel: string;
  gradeMultiplier: number;
  missing: string[];
  rows: BlindProjectRow[];
  totals: {
    blinds: number | null;
    extras: number | null;
    installation: number | null;
    /** Total before tax. */
    total: number | null;
    tax: number | null;
    totalInclTax: number | null;
  };
  taxRatePct: number | null;
  geometry: {
    unit: LengthUnit;
    windowCount: number;
    totalAreaM2: number;
    totalChargeableAreaM2: number;
    blendedRatePerM2: number | null;
  };
  taxStatus: "tax_applied" | "tax_not_determined";
  assumptions: string[];
  provenance: { gradeNote: string; source: string };
}

export function calculateBlindProject(
  input: BlindProjectInput,
): BlindProjectResult {
  const book = blindBookFor(input.market);
  const grade = BLIND_GRADE_BY_KEY[input.grade] ?? BLIND_GRADE_BY_KEY.standard;
  const missing = new Set<string>();
  const assumptions: string[] = [];
  const extrasIn = input.extras ?? {};

  const rows: BlindProjectRow[] = input.openings.map((opening) => {
    const type = BLIND_TYPE_BY_KEY[opening.typeKey];
    const wastage = input.wastage ?? type?.wastage ?? 0.1;
    const widthM = roundUpToCentimetre(
      toMetres(Math.max(0, opening.width), input.unit),
    );
    const heightM = roundUpToCentimetre(
      toMetres(Math.max(0, opening.height), input.unit),
    );
    const quantity = Math.max(1, Math.round(opening.quantity || 1));
    const areaM2 = widthM * heightM;
    const chargeableAreaM2 = areaM2 * (1 + wastage);
    const panels = panelsForWidth(widthM, type?.maxPanelWidthM ?? 0);
    const panelWidthM = panels > 0 ? round2(widthM / panels) : widthM;

    const band = book?.types?.[opening.typeKey];
    let rate: number | null = band?.perM2 ?? null;
    let minimum: number | null = band?.minimumPerWindow ?? null;
    if (
      rate === null &&
      typeof input.manualPerM2 === "number" &&
      input.manualPerM2 > 0
    ) {
      rate = input.manualPerM2;
    }
    if (
      minimum === null &&
      typeof input.manualMinimumPerWindow === "number" &&
      input.manualMinimumPerWindow > 0
    ) {
      minimum = input.manualMinimumPerWindow;
    }
    if (rate === null) {
      missing.add(band ? "ratePerM2" : "priceBook");
    }

    const gradedRate = rate === null ? null : round2(rate * grade.multiplier);
    const areaCost = gradedRate === null ? null : chargeableAreaM2 * gradedRate;
    const minimumApplied =
      areaCost !== null && minimum !== null ? areaCost < minimum : false;
    const perWindow =
      areaCost === null ? null : round2(Math.max(areaCost, minimum ?? 0));
    const blindsTotal =
      perWindow === null ? null : round2(perWindow * quantity);

    // Extras belong to the opening that asks for them. Charging a cassette or
    // a removal to every row because the job priced one was overcharging the
    // windows that did not need it.
    const wantsMotor = Boolean(opening.motorised);
    const wantsCassette = Boolean(opening.cassette);
    const wantsRemoval = Boolean(opening.removeOld);

    let extrasPerWindow: number | null = 0;
    const addExtra = (key: BlindExtraKey, needed: boolean) => {
      if (!needed || extrasPerWindow === null) return;
      const value = extrasIn[key];
      if (typeof value === "number" && value > 0) extrasPerWindow += value;
      else {
        missing.add(key);
        extrasPerWindow = null;
      }
    };
    addExtra("motorPerWindow", wantsMotor);
    addExtra("cassettePerWindow", wantsCassette);
    addExtra("removeOldPerWindow", wantsRemoval);
    const extrasTotal =
      extrasPerWindow === null ? null : round2(extrasPerWindow * quantity);

    return {
      id: opening.id,
      label: opening.label || type?.label || opening.typeKey,
      typeKey: opening.typeKey,
      typeLabel: type?.label ?? opening.typeKey,
      widthM: round2(widthM),
      heightM: round2(heightM),
      areaM2: round2(areaM2),
      chargeableAreaM2: round2(chargeableAreaM2),
      quantity,
      ratePerM2: gradedRate,
      minimumPerWindow: minimum,
      minimumApplied,
      perWindow,
      blindsTotal,
      extrasPerWindow:
        extrasPerWindow === null ? null : round2(extrasPerWindow),
      extrasTotal,
      motorised: wantsMotor,
      cassette: wantsCassette,
      removeOld: wantsRemoval,
      panels,
      panelWidthM,
      priced: perWindow !== null && extrasTotal !== null,
    };
  });

  const sumOrNull = (values: (number | null)[]): number | null =>
    values.some((v) => v === null)
      ? null
      : round2(values.reduce<number>((a, v) => a + (v as number), 0));

  const blinds = sumOrNull(rows.map((r) => r.blindsTotal));
  const extras = sumOrNull(rows.map((r) => r.extrasTotal));
  const windowCount = rows.reduce((a, r) => a + r.quantity, 0);
  const installPerWindow = book?.installPerWindow ?? null;
  const wantsInstall = input.install !== false;
  const installation = !wantsInstall
    ? 0
    : installPerWindow === null
      ? null
      : round2(installPerWindow * windowCount);

  if (!wantsInstall) assumptions.push("Fitting is excluded from the total.");
  else if (installPerWindow === null)
    assumptions.push(
      "Fitting is not priced for this market, so it is excluded.",
    );
  else
    assumptions.push(
      `Fitting at ${book?.currencySymbol ?? ""}${installPerWindow.toLocaleString()} per window, ${windowCount} ${windowCount === 1 ? "window" : "windows"}.`,
    );

  const beforeTax =
    blinds !== null && extras !== null && installation !== null
      ? round2(blinds + extras + installation)
      : null;

  // Tax is only computed when the shop supplies a rate. Nothing is inferred
  // from the market, because whether blinds carry VAT at that rate is the
  // seller's fact, not the estimator's.
  const taxRatePct =
    typeof input.taxRatePct === "number" &&
    Number.isFinite(input.taxRatePct) &&
    input.taxRatePct > 0
      ? round2(input.taxRatePct)
      : null;
  // No rate means the tax is unknown, not zero, so the row stays null and the
  // interface says "not determined" rather than implying nothing is due.
  const tax =
    beforeTax !== null && taxRatePct !== null
      ? round2((beforeTax * taxRatePct) / 100)
      : null;
  const totalInclTax =
    beforeTax === null
      ? null
      : tax === null
        ? beforeTax
        : round2(beforeTax + tax);

  const totalChargeableAreaM2 = round2(
    rows.reduce((a, r) => a + r.chargeableAreaM2 * r.quantity, 0),
  );
  const blendedRatePerM2 =
    blinds !== null && totalChargeableAreaM2 > 0
      ? round2(blinds / totalChargeableAreaM2)
      : null;

  if (grade.key !== "standard") {
    assumptions.push(`${grade.label} grade: ${grade.note}`);
  }
  const minimums = rows.filter((r) => r.minimumApplied);
  if (minimums.length) {
    assumptions.push(
      `The minimum per window applied on ${minimums.length} of ${rows.length} rows, which is why the per metre rate alone understates the job.`,
    );
  }
  if (!book) {
    assumptions.push(
      `No verified blind price book for ${input.market}. Enter the rate you were quoted.`,
    );
  }
  if (input.unit === "ft") {
    assumptions.push(
      "Feet are converted to metres before pricing, so a 4 by 4 opening prices as 1.49 m2.",
    );
  }
  for (const row of rows.filter((r) => r.panels > 1)) {
    const maxWidth = BLIND_TYPE_BY_KEY[row.typeKey]?.maxPanelWidthM;
    const countWord =
      ["one", "two", "three", "four", "five", "six"][row.panels - 1] ??
      String(row.panels);
    assumptions.push(
      `${row.label || row.typeLabel} is wider than one piece, so it is fabricated as ${countWord} panels of about ${row.panelWidthM} m each${maxWidth ? ` (${row.typeLabel} tops out at ${maxWidth} m)` : ""}. The price is unchanged because shops charge by area, but the fabricator has to make the join.`,
    );
  }
  assumptions.push(
    "Measured width and drop are rounded up to the next centimetre before pricing, the way a shop cuts fabric to the opening.",
  );
  assumptions.push(
    taxRatePct === null
      ? "Tax is not applied: no rate was entered. Add your local VAT or sales tax rate to see the total a customer pays."
      : `Tax at ${taxRatePct} percent is added on top of ${book?.currencySymbol ?? ""}${beforeTax?.toLocaleString() ?? "the total"}. Confirm the rate before sending the quote.`,
  );

  return {
    status:
      missing.size === 0 && beforeTax !== null
        ? "priced"
        : "manual_price_required",
    market: (input.market ?? "").toUpperCase(),
    currency: book?.currency ?? null,
    currencySymbol: book?.currencySymbol ?? null,
    grade: grade.key,
    gradeLabel: grade.label,
    gradeMultiplier: grade.multiplier,
    missing: [...missing],
    rows,
    totals: {
      blinds,
      extras,
      installation,
      total: beforeTax,
      tax,
      totalInclTax,
    },
    taxRatePct,
    geometry: {
      unit: input.unit,
      windowCount,
      totalAreaM2: round2(rows.reduce((a, r) => a + r.areaM2 * r.quantity, 0)),
      totalChargeableAreaM2,
      blendedRatePerM2,
    },
    taxStatus: taxRatePct === null ? "tax_not_determined" : "tax_applied",
    assumptions,
    provenance: {
      gradeNote: grade.note,
      source: book?.source ?? "No verified source for this market",
    },
  };
}

/**
 * Quantities only, in the shape the BOQ and dispatch surfaces merge. Prices stay
 * out of the BOQ here, exactly as the tank stand does, because a blind schedule
 * and a priced quote are two different documents and mixing them hides which
 * number came from where.
 */
export interface BlindBoqItem {
  category: "Window Treatments";
  item: string;
  specification: string;
  quantity: number;
  unit: string;
  notes: string;
}

export function blindsBoqItems(
  result: Pick<BlindProjectResult, "rows"> & { gradeLabel?: string },
): BlindBoqItem[] {
  const grade = result.gradeLabel
    ? `${result.gradeLabel} grade`
    : "standard grade";
  return result.rows.map((row) => ({
    category: "Window Treatments",
    item: `${row.typeLabel} blind`,
    specification: `${row.widthM} x ${row.heightM} m, ${grade}${row.motorised ? ", motorised" : ""}`,
    quantity: row.quantity,
    unit: "no",
    notes: `${row.chargeableAreaM2} m2 charged per window with waste`,
  }));
}
