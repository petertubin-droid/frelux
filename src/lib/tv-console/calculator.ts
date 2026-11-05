import type { TvConsoleTemplate } from "./templates";

export interface ConsoleDimensions {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  shelfCount: number;
  sheetWidthMm: number;
  sheetLengthMm: number;
  wastePercent: number;
  sheetPrice: number;
}

export interface ConsoleEstimate {
  carcassAreaM2: number;
  grossAreaWithUserWasteM2: number;
  theoreticalSheetAreaM2: number;
  theoreticalSheetCount: number;
  materialCost: number | null;
  currency: string;
  limitations: string[];
}

export function calculateConsoleEstimate(
  d: ConsoleDimensions,
  currency = "",
): ConsoleEstimate {
  const positive = [d.widthMm, d.heightMm, d.depthMm, d.sheetWidthMm, d.sheetLengthMm];
  if (positive.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("Enter positive dimensions and sheet sizes.");
  }
  if (!Number.isInteger(d.shelfCount) || d.shelfCount < 0 || d.shelfCount > 30) {
    throw new Error("Shelf count must be a whole number from 0 to 30.");
  }
  if (!Number.isFinite(d.wastePercent) || d.wastePercent < 0 || d.wastePercent > 100) {
    throw new Error("Workshop allowance must be between 0% and 100%.");
  }
  const w = d.widthMm / 1000;
  const h = d.heightMm / 1000;
  const depth = d.depthMm / 1000;
  // Simplified 2-side + top/bottom + flat shelves model. It intentionally
  // excludes backs, partitions, doors, drawers, grain direction and cut nesting.
  const carcassAreaM2 = 2 * w * depth + 2 * h * depth + d.shelfCount * w * depth;
  const grossAreaWithUserWasteM2 = carcassAreaM2 * (1 + d.wastePercent / 100);
  const theoreticalSheetAreaM2 = (d.sheetWidthMm / 1000) * (d.sheetLengthMm / 1000);
  const theoreticalSheetCount = Math.ceil(grossAreaWithUserWasteM2 / theoreticalSheetAreaM2);
  const materialCost = Number.isFinite(d.sheetPrice) && d.sheetPrice >= 0
    ? theoreticalSheetCount * d.sheetPrice
    : null;
  return {
    carcassAreaM2,
    grossAreaWithUserWasteM2,
    theoreticalSheetAreaM2,
    theoreticalSheetCount,
    materialCost,
    currency,
    limitations: [
      "Area-only theoretical sheet count, not a cut-optimized purchasing list.",
      "Excludes back panels, dividers, doors, drawer boxes, hardware, finishes, supports, lighting and installation.",
      "Confirm sheet dimensions, thickness, joinery, load support and workshop cutting plan before ordering or building.",
    ],
  };
}

export function dimensionsFromTemplate(template: TvConsoleTemplate): ConsoleDimensions {
  return {
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    depthMm: template.depthMm,
    shelfCount: 2,
    sheetWidthMm: 1220,
    sheetLengthMm: 2440,
    wastePercent: 0,
    sheetPrice: 0,
  };
}
