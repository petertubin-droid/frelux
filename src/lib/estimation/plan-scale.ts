/**
 * Drawing scale arithmetic for the plan takeoff.
 *
 * A sheet states one known dimension in whatever unit the drawing office uses
 * (metres, millimetres, feet or inches), and the visitor clicks its two ends in
 * pixels. The engine only ever stores metres, so the conversion happens here,
 * once, from the shared LENGTH_TO_M factors.
 */
import { LENGTH_TO_M, type LengthUnit } from "@/lib/convert/units";

export type CalibrationUnit = Extract<LengthUnit, "m" | "mm" | "ft" | "in">;

export const CALIBRATION_UNITS: { value: CalibrationUnit; label: string }[] = [
  { value: "m", label: "metres" },
  { value: "mm", label: "millimetres" },
  { value: "ft", label: "feet" },
  { value: "in", label: "inches" },
];

/** The known dimension in metres, or null when it cannot be a real length. */
export function calibrationMetres(
  value: string | number,
  unit: CalibrationUnit,
): number | null {
  const entered = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(entered) || entered <= 0) return null;
  const factor = LENGTH_TO_M[unit];
  const metres = entered * factor;
  return Number.isFinite(metres) && metres > 0 ? metres : null;
}

/** Pixels per metre for the page, or null when either side is unusable. */
export function pixelsPerMetre(
  pixelSpan: number,
  metres: number | null,
): number | null {
  if (!metres || !Number.isFinite(metres) || metres <= 0) return null;
  if (!Number.isFinite(pixelSpan) || pixelSpan <= 0) return null;
  return pixelSpan / metres;
}
