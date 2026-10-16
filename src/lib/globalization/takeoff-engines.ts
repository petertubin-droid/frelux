import type { AuditableCalculationResult } from "./calculation-contract";
import { DEFAULT_CALCULATION_VERSION } from "./calculation-contract";
import type { ConfigurationValueStatus } from "./market-configuration";
export interface ConcreteVolumeInput { lengthMm: number; widthMm: number; depthMm: number; wastagePercent?: number; configurationVersion?: string }
export interface ConcreteVolumeOutput { baseVolumeM3: number; requiredVolumeM3: number; requiredVolumeYd3: number; normalizedDimensionsMm: { length: number; width: number; depth: number } }
const yd3PerM3 = 1.30795062;
const error = (field: string, message: string) => ({ code: "invalid_input", field, message });
export function calculateConcreteVolume(input: ConcreteVolumeInput): AuditableCalculationResult<ConcreteVolumeOutput> {
 const errors = [
  ...(!Number.isFinite(input.lengthMm) || input.lengthMm <= 0 ? [error("lengthMm", "Length must be finite and greater than zero.")] : []),
  ...(!Number.isFinite(input.widthMm) || input.widthMm <= 0 ? [error("widthMm", "Width must be finite and greater than zero.")] : []),
  ...(!Number.isFinite(input.depthMm) || input.depthMm <= 0 ? [error("depthMm", "Depth must be finite and greater than zero.")] : []),
  ...(input.wastagePercent !== undefined && (!Number.isFinite(input.wastagePercent) || input.wastagePercent < 0 || input.wastagePercent > 100) ? [error("wastagePercent", "Wastage must be 0–100 percent.")] : []),
 ];
 const waste = input.wastagePercent ?? 5;
 const base = errors.length ? 0 : input.lengthMm / 1000 * (input.widthMm / 1000) * (input.depthMm / 1000);
 const required = base * (1 + waste / 100);
 if (!errors.length && (!Number.isFinite(base) || !Number.isFinite(required))) errors.push(error("dimensions", "Dimensions are too large to calculate safely."));
 const ok = !errors.length;
 return {
  engine: "concrete-volume-takeoff", engineVersion: DEFAULT_CALCULATION_VERSION, status: ok ? "valid" : "invalid",
  outputs: ok ? { baseVolumeM3: base, requiredVolumeM3: required, requiredVolumeYd3: required * yd3PerM3, normalizedDimensionsMm: { length: input.lengthMm, width: input.widthMm, depth: input.depthMm } } : null,
  units: { baseVolume: "m³", requiredVolume: "m³", requiredVolumeYards: "yd³", dimensions: "mm" },
  methodology: "Rectangular volume = length × width × depth after normalization from millimetres to metres.",
  assumptions: ["Rectangular geometry only; openings and irregular geometry are not included.", "Estimate only, not a guaranteed delivery quantity."],
  wastage: { percent: waste, applied: true, method: "required volume = base volume × (1 + wastage percentage / 100)" },
  rounding: { internal: "IEEE-754 double precision", purchase: "No supplier increment rounding.", display: "Round only in the presentation layer." },
  configurationVersion: input.configurationVersion ?? null, material: null, errors,
  warnings: ["Ordering quantity may depend on supplier increments, transport, site conditions, and project specifications."],
 };
}
export interface MasonryTakeoffInput {
 wallLengthMm: number; wallHeightMm: number;
 unit: { name: string; lengthMm: number; widthMm: number; heightMm: number; status: ConfigurationValueStatus; source: string | null; explicitlySelectedGeneric?: boolean };
 verticalJointMm?: number; horizontalJointMm?: number; wastagePercent?: number;
 openings?: readonly { widthMm: number; heightMm: number; count?: number }[]; configurationVersion?: string;
}
export interface MasonryTakeoffOutput {
 grossWallAreaM2: number; openingDeductionM2: number; netWallAreaM2: number; unitDimensionsMm: { length: number; width: number; height: number };
 jointsMm: { vertical: number; horizontal: number }; modularUnitAreaM2: number; grossUnitQuantity: number; netUnitQuantity: number; requiredWholeUnits: number; wastagePercent: number;
}
export function calculateMasonryTakeoff(input: MasonryTakeoffInput): AuditableCalculationResult<MasonryTakeoffOutput> {
 const errors = [
  ...(!Number.isFinite(input.wallLengthMm) || input.wallLengthMm <= 0 ? [error("wallLengthMm", "Wall length must be greater than zero.")] : []),
  ...(!Number.isFinite(input.wallHeightMm) || input.wallHeightMm <= 0 ? [error("wallHeightMm", "Wall height must be greater than zero.")] : []),
  ...(!input.unit || ![input.unit.lengthMm, input.unit.widthMm, input.unit.heightMm].every((n) => Number.isFinite(n) && n > 0) ? [error("unit", "Select a specification with positive dimensions.")] : []),
  ...(input.unit && input.unit.status !== "verified" && !input.unit.explicitlySelectedGeneric ? [error("unit", "Unverified regional material is not a standard; explicitly identify a generic product or use a verified specification.")] : []),
  ...([input.verticalJointMm ?? 10, input.horizontalJointMm ?? 10].some((n) => !Number.isFinite(n) || n < 0) ? [error("joint", "Joint thickness must be finite and non-negative.")] : []),
  ...(!Number.isFinite(input.wastagePercent ?? 10) || (input.wastagePercent ?? 10) < 0 || (input.wastagePercent ?? 10) > 100 ? [error("wastagePercent", "Wastage must be 0–100 percent.")] : []),
 ];
 const gross = input.wallLengthMm * input.wallHeightMm / 1_000_000;
 let deduction = 0;
 for (const opening of input.openings ?? []) { const count = opening.count ?? 1; if (![opening.widthMm, opening.heightMm, count].every(Number.isFinite) || opening.widthMm <= 0 || opening.heightMm <= 0 || !Number.isInteger(count) || count <= 0) errors.push(error("openings", "Openings need positive dimensions and a positive whole-number count.")); else deduction += opening.widthMm * opening.heightMm * count / 1_000_000; }
 if (deduction > gross) errors.push(error("openings", "Opening deductions exceed gross wall area."));
 const v = input.verticalJointMm ?? 10, h = input.horizontalJointMm ?? 10;
 const module = ((input.unit?.lengthMm ?? 0) + v) * ((input.unit?.heightMm ?? 0) + h) / 1_000_000;
 if (!Number.isFinite(module) || module <= 0) errors.push(error("unit", "Modular face area must be positive."));
 const net = Math.max(0, gross - deduction), grossQty = gross / module, netQty = net / module, waste = input.wastagePercent ?? 10;
 if (![gross, deduction, net, grossQty, netQty].every(Number.isFinite)) errors.push(error("dimensions", "Dimensions are too large to calculate safely."));
 const ok = !errors.length;
 return {
  engine: "masonry-modular-area-takeoff", engineVersion: DEFAULT_CALCULATION_VERSION, status: ok ? "valid" : "invalid",
  outputs: ok ? { grossWallAreaM2: gross, openingDeductionM2: deduction, netWallAreaM2: net, unitDimensionsMm: { length: input.unit.lengthMm, width: input.unit.widthMm, height: input.unit.heightMm }, jointsMm: { vertical: v, horizontal: h }, modularUnitAreaM2: module, grossUnitQuantity: grossQty, netUnitQuantity: netQty, requiredWholeUnits: Math.ceil(netQty * (1 + waste / 100)), wastagePercent: waste } : null,
  units: { area: "m²", unitQuantity: "units", dimensions: "mm" },
  methodology: "Preliminary running-bond modular face area = (unit length + vertical joint) × (unit height + horizontal joint); net wall area divided by module area, then wastage and ceiling to whole units.",
  assumptions: ["Only explicitly supplied openings are deducted.", "Does not model bond layout, corners, piers, returns, cutting, or structural design.", "Unit width is retained as metadata; quantity uses unit face length and height."],
  wastage: { percent: waste, applied: true, method: "ceil(net quantity × (1 + wastage percentage / 100))" },
  rounding: { internal: "IEEE-754 double precision", purchase: "Ceil to whole units after wastage.", display: "Round only in the presentation layer." },
  configurationVersion: input.configurationVersion ?? null, material: input.unit ? { name: input.unit.name, status: input.unit.status, source: input.unit.source } : null,
  errors, warnings: ["Complex layouts require a detailed validated layout method."],
 };
}
