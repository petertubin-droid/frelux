/**
 * Electrical Conduit & Wiring Loop Engine
 *
 * Empirical material takeoff, not circuit design. It answers the question an
 * electrician actually asks in the market: how many conduit lengths, how many
 * 100 m coils of 1.5 mm and 2.5 mm cable, how many boxes, switches and sockets.
 *
 * The multipliers are printed planning allowances per point. They are not
 * measured cable routes, and the result says so: circuit sizing, breaker
 * ratings, earthing and volt drop are engineering work this tool does not do.
 */

import {
  TAX_NOT_DETERMINED,
  ceilQty,
  emptyResult,
  money,
  priceLines,
  ruleNumber,
  unpricedWarnings,
  type CalcRuleLike,
  type SpecialtyLine,
  type SpecialtyPriceMap,
  type SpecialtyResult,
  type SpecialtyStep,
} from "./specialty";

export interface ConduitWiringRules {
  conduit_per_m2: number;
  conduit_length_m: number;
  lighting_cable_per_point_m: number;
  socket_cable_per_point_m: number;
  junction_per_point: number;
}

export const DEFAULT_CONDUIT_WIRING_RULES: ConduitWiringRules = {
  conduit_per_m2: 1.8,
  conduit_length_m: 2.9,
  lighting_cable_per_point_m: 12,
  socket_cable_per_point_m: 18,
  junction_per_point: 1.15,
};

export function parseConduitWiringRules(
  rows: CalcRuleLike[],
): ConduitWiringRules {
  return {
    conduit_per_m2:
      ruleNumber(rows, "conduit_per_m2") ??
      DEFAULT_CONDUIT_WIRING_RULES.conduit_per_m2,
    conduit_length_m:
      ruleNumber(rows, "conduit_length_m") ??
      DEFAULT_CONDUIT_WIRING_RULES.conduit_length_m,
    lighting_cable_per_point_m:
      ruleNumber(rows, "lighting_cable_per_point_m") ??
      DEFAULT_CONDUIT_WIRING_RULES.lighting_cable_per_point_m,
    socket_cable_per_point_m:
      ruleNumber(rows, "socket_cable_per_point_m") ??
      DEFAULT_CONDUIT_WIRING_RULES.socket_cable_per_point_m,
    junction_per_point:
      ruleNumber(rows, "junction_per_point") ??
      DEFAULT_CONDUIT_WIRING_RULES.junction_per_point,
  };
}

export interface ConduitWiringInput {
  floor_area_m2: number;
  lighting_points: number;
  socket_points: number;
}

export function calculateConduitWiring(
  input: ConduitWiringInput,
  rules: ConduitWiringRules,
  prices: SpecialtyPriceMap,
): SpecialtyResult {
  const errors: string[] = [];
  if (!Number.isFinite(input.floor_area_m2) || input.floor_area_m2 <= 0) {
    errors.push("Floor area must be greater than zero (m²).");
  }
  if (!Number.isInteger(input.lighting_points) || input.lighting_points < 0) {
    errors.push("Lighting points must be a whole number, zero or more.");
  }
  if (!Number.isInteger(input.socket_points) || input.socket_points < 0) {
    errors.push(
      "Socket and outlet points must be a whole number, zero or more.",
    );
  }
  // A rule row can carry 0 or a negative number. conduit_length_m is a
  // divisor, so an unconfigured value used to produce Infinity lengths that
  // then reached the priced lines. Refuse instead of emitting a number.
  if (!(Number.isFinite(rules.conduit_length_m) && rules.conduit_length_m > 0)) {
    errors.push(
      "Conduit piece length (conduit_length_m) must be greater than zero: check the calculation rule.",
    );
  }
  if (!(Number.isFinite(rules.conduit_per_m2) && rules.conduit_per_m2 > 0)) {
    errors.push(
      "Conduit allowance per m² (conduit_per_m2) must be greater than zero: check the calculation rule.",
    );
  }
  // The cable allowances are multiplied by the points, so a NaN or a negative
  // one produced a NaN coil count (ceilQty of NaN is NaN) that `complete` still
  // read as priced. Both must be readable and non-negative.
  for (const [label, value] of [
    ["Lighting cable per point", rules.lighting_cable_per_point_m],
    ["Socket cable per point", rules.socket_cable_per_point_m],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      errors.push(
        `${label} must be a number, zero or more: check the calculation rules.`,
      );
    }
  }
  // Junction boxes are multiplied by the points too, and the same rule rows can
  // carry a negative. A negative allowance priced a credit against the works.
  if (
    !Number.isFinite(rules.junction_per_point) ||
    rules.junction_per_point < 0
  ) {
    errors.push(
      "Junction boxes per point must be a number, zero or more: check the calculation rules.",
    );
  }
  if (errors.length > 0) return emptyResult(errors);

  const conduitRun = money(input.floor_area_m2 * rules.conduit_per_m2);
  const conduitLengths = ceilQty(conduitRun / rules.conduit_length_m);
  const lightingCable = money(
    input.lighting_points * rules.lighting_cable_per_point_m,
  );
  const socketCable = money(
    input.socket_points * rules.socket_cable_per_point_m,
  );
  const lightingCoils = ceilQty(lightingCable / 100);
  const socketCoils = ceilQty(socketCable / 100);
  const totalPoints = input.lighting_points + input.socket_points;
  const junctionBoxes = ceilQty(totalPoints * rules.junction_per_point);

  const steps: SpecialtyStep[] = [
    {
      label: "Conduit run",
      detail: `${input.floor_area_m2} m² × ${rules.conduit_per_m2} allowance = ${conduitRun} m of conduit`,
    },
    {
      label: "Conduit lengths",
      detail: `${conduitRun} m ÷ ${rules.conduit_length_m} m per length, rounded up = ${conduitLengths}`,
    },
    {
      label: "Lighting cable",
      detail: `${input.lighting_points} points × ${rules.lighting_cable_per_point_m} m = ${lightingCable} m, bought as ${lightingCoils} × 100 m coil(s)`,
    },
    {
      label: "Socket cable",
      detail: `${input.socket_points} points × ${rules.socket_cable_per_point_m} m = ${socketCable} m, bought as ${socketCoils} × 100 m coil(s)`,
    },
    {
      label: "Junction boxes",
      detail: `${totalPoints} points × ${rules.junction_per_point} = ${junctionBoxes} boxes`,
    },
  ];

  const lines: SpecialtyLine[] = [
    {
      key: "conduit",
      label: `PVC conduit (${rules.conduit_length_m} m lengths)`,
      material_slug: "elec-conduit",
      quantity: conduitLengths,
      quantity_source: "rule_derived",
      unit: "lengths",
      detail: `${conduitRun} m of run at ${rules.conduit_per_m2} m per m² of floor`,
      unit_price: null,
      line_total: null,
    },
    {
      key: "lighting_cable",
      label: "1.5 mm lighting cable",
      material_slug: "elec-cable-lighting",
      quantity: lightingCoils,
      quantity_source: "rule_derived",
      unit: "100 m coils",
      detail: `${lightingCable} m required for ${input.lighting_points} lighting points`,
      unit_price: null,
      line_total: null,
    },
    {
      key: "socket_cable",
      label: "2.5 mm socket cable",
      material_slug: "elec-cable-socket",
      quantity: socketCoils,
      quantity_source: "rule_derived",
      unit: "100 m coils",
      detail: `${socketCable} m required for ${input.socket_points} socket points`,
      unit_price: null,
      line_total: null,
    },
    {
      key: "junction_boxes",
      label: "Junction and adaptor boxes",
      material_slug: "elec-junction-box",
      quantity: junctionBoxes,
      quantity_source: "rule_derived",
      unit: "pieces",
      detail: `${totalPoints} points × ${rules.junction_per_point} allowance`,
      unit_price: null,
      line_total: null,
    },
    {
      key: "switch_plates",
      label: "Switch plates",
      material_slug: "elec-switch-plate",
      quantity: input.lighting_points,
      quantity_source: "user_provided",
      unit: "pieces",
      detail: "one per lighting point you entered",
      unit_price: null,
      line_total: null,
    },
    {
      key: "socket_outlets",
      label: "Socket outlets",
      material_slug: "elec-socket-outlet",
      quantity: input.socket_points,
      quantity_source: "user_provided",
      unit: "pieces",
      detail: "one per socket point you entered",
      unit_price: null,
      line_total: null,
    },
  ];

  const priced = priceLines(lines, prices);

  const warnings: string[] = [...unpricedWarnings(priced.missing)];
  if (totalPoints === 0) {
    warnings.push(
      "No points were entered, so only conduit is sized. Add lighting and socket counts for a full wiring list.",
    );
  }
  warnings.push(
    "Cable lengths are planning allowances per point, not measured routes: ceiling height, wall thickness and switch drops change them.",
  );
  warnings.push(
    "This is a material takeoff only. Circuit sizing, breaker ratings, earthing and volt drop are the electrician's design, and a licensed electrician should sign off the installation.",
  );

  return {
    ok: true,
    errors: [],
    warnings,
    steps,
    lines: priced.lines,
    priced_subtotal: priced.priced_subtotal,
    material_subtotal: priced.material_subtotal,
    labour_total: 0,
    grand_total: priced.material_subtotal,
    incomplete: priced.material_subtotal === null,
    missing: priced.missing,
    tax_status: TAX_NOT_DETERMINED,
  };
}

export interface CableSpec {
  count: number;
  outerDiameterMm: number;
  label?: string;
}

export type ConduitFillStandard = "NEC" | "BS_7671";

export interface ConduitFillOptions {
  /**
   * Standards basis:
   * - "NEC": NFPA 70 Chapter 9 Table 1 (53% for 1, 31% for 2, 40% for 3+ conductors).
   * - "BS_7671": IET Wiring Regulations / On-Site Guide (40% conduit space factor, 45% for trunking).
   * Defaults to "NEC".
   */
  standard?: ConduitFillStandard;
  /** When standard is BS_7671, set true to evaluate trunking (45% cap) instead of conduit (40% cap) */
  isTrunking?: boolean;
}

export interface ConduitFillResult {
  conduitInnerDiameterMm: number;
  totalConduitAreaMm2: number;
  totalCableAreaMm2: number;
  fillPercentage: number;
  maxAllowedFillPercentage: number;
  cableCount: number;
  passesCode: boolean;
  codeStandard: string;
  warning?: string;
}

/**
 * Verifies electrical conduit wire fill capacity against NEC Chapter 9 Table 1 or BS 7671.
 */
export function verifyConduitFill(
  conduitInnerDiameterMm: number,
  cables: CableSpec[],
  options?: ConduitFillOptions,
): ConduitFillResult | null {
  if (
    !Number.isFinite(conduitInnerDiameterMm) ||
    conduitInnerDiameterMm <= 0 ||
    !Array.isArray(cables) ||
    cables.length === 0
  ) {
    return null;
  }

  const conduitArea = (Math.PI * conduitInnerDiameterMm ** 2) / 4;
  let totalCableArea = 0;
  let totalCableCount = 0;

  for (const c of cables) {
    if (
      !c ||
      !Number.isFinite(c.count) ||
      c.count <= 0 ||
      !Number.isFinite(c.outerDiameterMm) ||
      c.outerDiameterMm <= 0
    ) {
      continue;
    }
    const singleCableArea = (Math.PI * c.outerDiameterMm ** 2) / 4;
    totalCableArea += c.count * singleCableArea;
    totalCableCount += c.count;
  }

  if (totalCableCount === 0) return null;

  const fillPercentage = (totalCableArea / conduitArea) * 100;
  const standard = options?.standard ?? "NEC";

  let maxAllowed = 40;
  let codeStandard = "NEC Chapter 9 Table 1";

  if (standard === "BS_7671") {
    maxAllowed = options?.isTrunking ? 45 : 40;
    codeStandard = options?.isTrunking
      ? "BS 7671 / IET On-Site Guide (Trunking 45%)"
      : "BS 7671 / IET On-Site Guide (Conduit 40%)";
  } else {
    // NEC Chapter 9 Table 1
    codeStandard = "NEC Chapter 9 Table 1";
    if (totalCableCount === 1) {
      maxAllowed = 53;
    } else if (totalCableCount === 2) {
      maxAllowed = 31;
    } else {
      maxAllowed = 40;
    }
  }

  const passes = fillPercentage <= maxAllowed;
  const warning = !passes
    ? `Conduit fill is ${fillPercentage.toFixed(1)}%, exceeding code maximum ${maxAllowed}% (${totalCableCount} conductors per ${codeStandard}). Upsize conduit to avoid overheating and wire damage during pulling.`
    : undefined;

  return {
    conduitInnerDiameterMm,
    totalConduitAreaMm2: Number(conduitArea.toFixed(1)),
    totalCableAreaMm2: Number(totalCableArea.toFixed(1)),
    fillPercentage: Number(fillPercentage.toFixed(1)),
    maxAllowedFillPercentage: maxAllowed,
    cableCount: totalCableCount,
    passesCode: passes,
    codeStandard,
    warning,
  };
}
