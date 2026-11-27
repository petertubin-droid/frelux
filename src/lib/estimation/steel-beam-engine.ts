/**
 * Structural Steel Section Weight & Cost Engine
 *
 * Steel is bought by mass, so a span becomes money only after it becomes
 * kilograms. Each profile carries a published nominal mass per metre; multiply
 * by the length, divide by 1000, and price the tonnes at the rate the buyer
 * enters from their merchant.
 *
 * No price is supplied for steel: merchants quote per tonne and those rates move
 * weekly and by region, so the buyer enters theirs and the result labels it as
 * their figure, not a market rate.
 *
 * Guardrail: an open span past 8 m without columns is a deflection question, not
 * a shopping question, and the result says so before anyone orders.
 */

import {
  TAX_NOT_DETERMINED,
  emptyResult,
  money,
  unpricedWarnings,
  type SpecialtyLine,
  type SpecialtyPriceMap,
  type SpecialtyResult,
  type SpecialtyStep,
} from "./specialty";

export interface SteelProfile {
  key: string;
  label: string;
  /** Published nominal mass, kilograms per metre */
  kg_per_m: number;
  note: string;
}

export const STEEL_PROFILES: SteelProfile[] = [
  // Euronorm IPE series, nominal mass as published. There is no IPE 150: the
  // series steps 140 -> 160, and the old entry offered a section no merchant
  // stocks and a mass (14 kg/m) that matches no published size.
  { key: "ipe_100", label: "IPE 100", kg_per_m: 8.1, note: "light lintels and trimmer beams" },
  { key: "ipe_120", label: "IPE 120", kg_per_m: 10.4, note: "short domestic spans" },
  { key: "ipe_140", label: "IPE 140", kg_per_m: 12.9, note: "light roof support and short lintels" },
  { key: "ipe_160", label: "IPE 160", kg_per_m: 15.8, note: "roof purlins and small openings" },
  { key: "ipe_180", label: "IPE 180", kg_per_m: 18.8, note: "domestic floor spans" },
  { key: "ipe_200", label: "IPE 200", kg_per_m: 22.4, note: "floor slab spans and medium openings" },
  { key: "ipe_220", label: "IPE 220", kg_per_m: 26.2, note: "longer domestic floor spans" },
  { key: "ipe_240", label: "IPE 240", kg_per_m: 30.7, note: "loaded floor spans and mezzanines" },
  { key: "ipe_270", label: "IPE 270", kg_per_m: 36.1, note: "girders carrying secondary beams" },
  { key: "ipe_300", label: "IPE 300", kg_per_m: 42.2, note: "heavy floor and roof girders" },
  // Universal beams, nominal mass as published (the third figure in the name).
  { key: "ub_203_133_25", label: "Universal beam 203 × 133 × 25", kg_per_m: 25.1, note: "domestic floor beams" },
  { key: "ub_203_133_30", label: "Universal beam 203 × 133 × 30", kg_per_m: 30, note: "warehouse frames and mezzanine girders" },
  { key: "ub_203_133_37", label: "Universal beam 203 × 133 × 37", kg_per_m: 37, note: "heavier floor beams at the same depth" },
  { key: "ub_254_146_31", label: "Universal beam 254 × 146 × 31", kg_per_m: 31.1, note: "longer floor spans" },
  { key: "ub_254_146_37", label: "Universal beam 254 × 146 × 37", kg_per_m: 37, note: "loaded floor spans" },
  { key: "ub_254_146_43", label: "Universal beam 254 × 146 × 43", kg_per_m: 43, note: "heavy floor spans" },
  { key: "ub_305_165_40", label: "Universal beam 305 × 165 × 40", kg_per_m: 40.3, note: "long span floor beams" },
  { key: "ub_305_165_46", label: "Universal beam 305 × 165 × 46", kg_per_m: 46.1, note: "long span girders" },
  { key: "ub_305_165_54", label: "Universal beam 305 × 165 × 54", kg_per_m: 54, note: "heavy long span girders" },
  // North American AISC W-Shapes (ASTM A6 wide-flange beams; nominal kg/m converted from lb/ft).
  { key: "w8_10", label: "AISC W8 × 10", kg_per_m: 14.9, note: "light floor and roof trimmer beams" },
  { key: "w8_15", label: "AISC W8 × 15", kg_per_m: 22.3, note: "residential floor girder" },
  { key: "w8_24", label: "AISC W8 × 24", kg_per_m: 35.7, note: "loaded residential floor beam" },
  { key: "w10_15", label: "AISC W10 × 15", kg_per_m: 22.3, note: "light commercial floor beam" },
  { key: "w10_22", label: "AISC W10 × 22", kg_per_m: 32.7, note: "standard commercial floor beam" },
  { key: "w10_30", label: "AISC W10 × 30", kg_per_m: 44.6, note: "heavy commercial floor girder" },
  { key: "w12_16", label: "AISC W12 × 16", kg_per_m: 23.8, note: "long span light roof girder" },
  { key: "w12_26", label: "AISC W12 × 26", kg_per_m: 38.7, note: "standard commercial girder" },
  { key: "w14_22", label: "AISC W14 × 22", kg_per_m: 32.7, note: "deep commercial girder" },
  { key: "w14_30", label: "AISC W14 × 30", kg_per_m: 44.6, note: "heavy long-span girder" },
  // European Euronorm Wide-Flange Beams (HEA / HEB series per EN 10025 / EN 10034).
  { key: "he_100_a", label: "HEA 100", kg_per_m: 16.7, note: "light broad-flange floor beam" },
  { key: "he_120_a", label: "HEA 120", kg_per_m: 19.9, note: "domestic floor beam" },
  { key: "he_140_a", label: "HEA 140", kg_per_m: 24.7, note: "medium floor slab beam" },
  { key: "he_160_a", label: "HEA 160", kg_per_m: 30.4, note: "medium opening girder" },
  { key: "he_100_b", label: "HEB 100", kg_per_m: 20.4, note: "standard column and heavy beam" },
  { key: "he_120_b", label: "HEB 120", kg_per_m: 26.7, note: "heavy floor beam" },
  { key: "he_140_b", label: "HEB 140", kg_per_m: 33.7, note: "loaded floor beam" },
  { key: "he_160_b", label: "HEB 160", kg_per_m: 42.6, note: "heavy girder and column" },
];

export const STEEL_PROFILE_BY_KEY: Record<string, SteelProfile> =
  Object.fromEntries(STEEL_PROFILES.map((p) => [p.key, p]));

/** Saved starting points, offered as selects rather than assumed defaults. */
export const STEEL_USE_PRESETS: {
  key: string;
  label: string;
  profile: string;
}[] = [
  { key: "light_roof", label: "Light roof support", profile: "ipe_160" },
  { key: "floor_slab", label: "Heavy floor slab span", profile: "ipe_200" },
  {
    key: "mezzanine",
    label: "Warehouse mezzanine frame",
    profile: "ub_203_133_30",
  },
  {
    key: "us_residential_girder",
    label: "US Residential Floor Girder (W8×15)",
    profile: "w8_15",
  },
  {
    key: "us_commercial_beam",
    label: "US Commercial Floor Beam (W10×22)",
    profile: "w10_22",
  },
  {
    key: "eu_broad_flange",
    label: "European Wide-Flange (HEA 140)",
    profile: "he_140_a",
  },
];

export const OPEN_SPAN_LIMIT_M = 8;

export interface SteelBeamInput {
  profile: string;
  span_m: number;
  span_ft?: number | null;
  beam_count: number;
  /** Buyer's own rate, local currency per tonne; null = not provided */
  price_per_tonne: number | null;
  columns_included: boolean;
}

/**
 * A beam is cut longer than the clear span: each end sits on a bearing, 150 mm
 * being the usual minimum. The old mass used the clear span alone, so a beam
 * ordered from it came up short on site and understated the tonnage.
 */
export const BEARING_ALLOWANCE_M = 0.3;

export function steelMassKg(input: SteelBeamInput): number | null {
  const profile = STEEL_PROFILE_BY_KEY[input.profile];
  if (!profile) return null;
  const span =
    Number.isFinite(input.span_m) && input.span_m > 0
      ? input.span_m
      : Number.isFinite(input.span_ft) && (input.span_ft as number) > 0
        ? (input.span_ft as number) * 0.3048
        : 0;
  if (span <= 0) return null;
  const cutLength = span + BEARING_ALLOWANCE_M;
  return money(cutLength * input.beam_count * profile.kg_per_m);
}

export function calculateSteelBeam(
  input: SteelBeamInput,
  prices: SpecialtyPriceMap,
): SpecialtyResult {
  const errors: string[] = [];
  const profile = STEEL_PROFILE_BY_KEY[input.profile];
  if (!profile)
    errors.push(
      "Choose a steel profile: each one carries a different mass per metre.",
    );
  const spanM =
    Number.isFinite(input.span_m) && input.span_m > 0
      ? input.span_m
      : Number.isFinite(input.span_ft) && (input.span_ft as number) > 0
        ? (input.span_ft as number) * 0.3048
        : Number(input.span_m);

  if (!Number.isFinite(spanM) || spanM <= 0) {
    errors.push("Span length must be greater than zero (metres or feet).");
  }
  if (!Number.isInteger(input.beam_count) || input.beam_count < 1) {
    errors.push("Number of beams must be a whole number, one or more.");
  }
  if (
    input.price_per_tonne !== null &&
    (!Number.isFinite(input.price_per_tonne) || input.price_per_tonne < 0)
  ) {
    errors.push(
      "Enter a steel rate per tonne as zero or more, or leave it empty to price later.",
    );
  }
  if (errors.length > 0 || !profile) return emptyResult(errors);

  const cutLengthM = spanM + BEARING_ALLOWANCE_M;
  const mass = steelMassKg({ ...input, span_m: spanM }) ?? 0;
  const tonnes = Math.round((mass / 1000) * 10000) / 10000;
  const massLbs = Math.round(mass * 2.2046226 * 10) / 10;
  const usTons = Math.round((massLbs / 2000) * 10000) / 10000;
  const rate =
    input.price_per_tonne ?? prices["steel-section-per-tonne"] ?? null;

  const steps: SpecialtyStep[] = [
    {
      label: "Mass per beam",
      detail: `${spanM.toFixed(2)} m span (${(spanM / 0.3048).toFixed(1)} ft) + ${BEARING_ALLOWANCE_M} m bearing allowance = ${money(cutLengthM)} m cut (${(cutLengthM / 0.3048).toFixed(1)} ft), × ${profile.kg_per_m} kg/m (${(profile.kg_per_m * 0.671969).toFixed(1)} lb/ft, ${profile.label}) = ${money(cutLengthM * profile.kg_per_m)} kg (${(money(cutLengthM * profile.kg_per_m) * 2.2046226).toFixed(1)} lbs)`,
    },
    {
      label: "Total mass",
      detail: `${money(cutLengthM)} m cut × ${input.beam_count} beam(s) × ${profile.kg_per_m} kg/m = ${mass} kg (${massLbs} lbs / ${tonnes} metric tonnes / ${usTons} US short tons)`,
    },
    {
      label: "Rate used",
      detail:
        rate === null
          ? "no rate entered: enter the rate your steel merchant quotes per tonne"
          : `${rate} per tonne, supplied by you`,
    },
  ];

  const lines: SpecialtyLine[] = [
    {
      key: "steel_section",
      label: `Structural steel ${profile.label}`,
      material_slug: "steel-section-per-tonne",
      quantity: tonnes,
      quantity_source: "rule_derived",
      unit: "tonnes",
      detail: `${input.beam_count} × ${money(cutLengthM)} m cut (${spanM.toFixed(2)} m span) at ${profile.kg_per_m} kg/m = ${mass} kg (${massLbs} lbs)`,
      unit_price: rate,
      line_total: rate === null ? null : money(tonnes * rate),
    },
  ];

  const priced_subtotal = rate === null ? 0 : money(tonnes * rate);
  const missing = rate === null ? ["Structural steel"] : [];

  const warnings: string[] = [
    ...unpricedWarnings(missing),
    ...(rate === null
      ? [
          "No steel rate was entered. The mass above is what you are buying: enter the rate your steel merchant quotes per tonne to cost it.",
        ]
      : []),
    `Steel is priced by mass: ${mass} kg (${massLbs} lbs / ${tonnes} metric tonnes / ${usTons} US short tons) of steel is what you are buying, and merchant weighbridge tickets are the check on delivery.`,
  ];
  if (input.span_m > OPEN_SPAN_LIMIT_M && !input.columns_included) {
    warnings.push(
      `Warning: open structural steel spans over ${OPEN_SPAN_LIMIT_M} m require a verified structural engineer's deflection check before fabrication.`,
    );
  }
  if (input.span_m > OPEN_SPAN_LIMIT_M) {
    warnings.push(
      "Long spans also need connections designed: base plates, cleats and bolts are not part of this mass figure.",
    );
  }
  warnings.push(
    "Fabrication, welding, protective coating, transport and erection are not included in a per tonne material rate.",
  );

  return {
    ok: true,
    errors: [],
    warnings,
    steps,
    lines,
    priced_subtotal,
    material_subtotal: rate === null ? null : priced_subtotal,
    labour_total: 0,
    grand_total: rate === null ? null : priced_subtotal,
    incomplete: rate === null,
    missing,
    tax_status: TAX_NOT_DETERMINED,
  };
}
