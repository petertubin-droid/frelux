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
  {
    key: "ipe_150",
    label: "IPE 150",
    kg_per_m: 14,
    note: "light roof support and short lintels",
  },
  {
    key: "ipe_200",
    label: "IPE 200",
    kg_per_m: 22.4,
    note: "floor slab spans and medium openings",
  },
  {
    key: "ub_203_133_30",
    label: "Universal beam 203 × 133 × 30",
    kg_per_m: 30,
    note: "warehouse frames and mezzanine girders",
  },
];

export const STEEL_PROFILE_BY_KEY: Record<string, SteelProfile> =
  Object.fromEntries(STEEL_PROFILES.map((p) => [p.key, p]));

/** Saved starting points, offered as selects rather than assumed defaults. */
export const STEEL_USE_PRESETS: {
  key: string;
  label: string;
  profile: string;
}[] = [
  { key: "light_roof", label: "Light roof support", profile: "ipe_150" },
  { key: "floor_slab", label: "Heavy floor slab span", profile: "ipe_200" },
  {
    key: "mezzanine",
    label: "Warehouse mezzanine frame",
    profile: "ub_203_133_30",
  },
];

export const OPEN_SPAN_LIMIT_M = 8;

export interface SteelBeamInput {
  profile: string;
  span_m: number;
  beam_count: number;
  /** Buyer's own rate, local currency per tonne; null = not provided */
  price_per_tonne: number | null;
  columns_included: boolean;
}

export function steelMassKg(input: SteelBeamInput): number | null {
  const profile = STEEL_PROFILE_BY_KEY[input.profile];
  if (!profile) return null;
  return money(input.span_m * input.beam_count * profile.kg_per_m);
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
  if (!Number.isFinite(input.span_m) || input.span_m <= 0) {
    errors.push("Span length must be greater than zero (metres).");
  }
  if (!Number.isInteger(input.beam_count) || input.beam_count < 1) {
    errors.push("Number of beams must be a whole number, one or more.");
  }
  if (errors.length > 0 || !profile) return emptyResult(errors);

  const mass = steelMassKg(input) ?? 0;
  // Tonnes keep four decimals: a per tonne rate multiplies straight into the
  // total, so rounding the quantity to two places would move real money.
  const tonnes = Math.round((mass / 1000) * 10000) / 10000;
  const rate =
    input.price_per_tonne ?? prices["steel-section-per-tonne"] ?? null;

  const steps: SpecialtyStep[] = [
    {
      label: "Mass per beam",
      detail: `${input.span_m} m × ${profile.kg_per_m} kg/m (${profile.label}) = ${money(input.span_m * profile.kg_per_m)} kg`,
    },
    {
      label: "Total mass",
      detail: `${input.span_m} m × ${input.beam_count} beam(s) × ${profile.kg_per_m} kg/m = ${mass} kg (${tonnes} tonnes)`,
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
      detail: `${input.beam_count} × ${input.span_m} m at ${profile.kg_per_m} kg/m = ${mass} kg`,
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
    `Steel is priced by mass: ${mass} kg of steel is what you are buying, and merchant weighbridge tickets are the check on delivery.`,
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
