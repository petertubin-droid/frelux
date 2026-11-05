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
}

const METRES_PER_FOOT = 0.3048;

export function toMetres(value: number, unit: LengthUnit): number {
  return unit === "ft" ? value * METRES_PER_FOOT : value;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

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
  };
}
