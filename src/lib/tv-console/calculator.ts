import type { TvConsoleTemplate } from "./templates";

export interface ConsoleDimensions {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  panelThicknessMm: number;
  shelfCount: number;
  dividerCount: number;
  includeBackPanel: boolean;
  doorCount: number;
  doorClearanceMm: number;
  sheetWidthMm: number;
  sheetLengthMm: number;
  wastePercent: number;
  sheetPrice: number | null;
}

export interface ConsolePanelLine {
  part: string;
  count: number;
  widthMm: number;
  heightMm: number;
  areaM2: number;
}

export interface ConsoleEstimate {
  carcassAreaM2: number;
  grossAreaWithUserWasteM2: number;
  theoreticalSheetAreaM2: number;
  theoreticalSheetCount: number;
  materialCost: number | null;
  currency: string;
  panelSchedule: ConsolePanelLine[];
  limitations: string[];
}

const MAX_DIMENSION_MM = 10_000;

/**
 * Deterministic rectangular-panel takeoff for a simple cabinet carcass.
 * Areas sum the actual modeled rectangular parts, rather than applying one
 * aggregate multiplier to the cabinet envelope. Stock-sheet count remains an
 * area lower-bound; no cut nesting, kerf, grain, joinery or offcuts are modeled.
 */
export function calculateConsoleEstimate(
  d: ConsoleDimensions,
  currency = "",
): ConsoleEstimate {
  const dimensions = [
    d.widthMm,
    d.heightMm,
    d.depthMm,
    d.panelThicknessMm,
    d.sheetWidthMm,
    d.sheetLengthMm,
  ];
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0 || value > MAX_DIMENSION_MM)) {
    throw new Error(`Enter positive dimensions no larger than ${MAX_DIMENSION_MM} mm.`);
  }
  for (const [label, count] of [
    ["Shelf count", d.shelfCount],
    ["Divider count", d.dividerCount],
    ["Door count", d.doorCount],
  ] as const) {
    if (!Number.isInteger(count) || count < 0 || count > 30) {
      throw new Error(`${label} must be a whole number from 0 to 30.`);
    }
  }
  if (!Number.isFinite(d.doorClearanceMm) || d.doorClearanceMm < 0 || d.doorClearanceMm > 100) {
    throw new Error("Door clearance must be between 0 and 100 mm.");
  }
  if (!Number.isFinite(d.wastePercent) || d.wastePercent < 0 || d.wastePercent > 100) {
    throw new Error("Workshop allowance must be between 0% and 100%.");
  }
  if (d.sheetPrice !== null && (!Number.isFinite(d.sheetPrice) || d.sheetPrice < 0)) {
    throw new Error("Sheet price must be blank or a non-negative number.");
  }

  const { widthMm: w, heightMm: h, depthMm: depth, panelThicknessMm: t } = d;
  const innerWidth = w - 2 * t;
  const innerHeight = h - 2 * t;
  if (innerWidth <= 0 || innerHeight <= 0) {
    throw new Error("Cabinet width and height must each exceed two panel thicknesses.");
  }
  if (d.shelfCount * t >= innerHeight) {
    throw new Error("Shelf thickness leaves no positive vertical cabinet openings.");
  }
  if (d.dividerCount * t >= innerWidth) {
    throw new Error("Divider thickness exceeds the usable cabinet width.");
  }
  if (d.doorCount > 0 && (w - (d.doorCount + 1) * d.doorClearanceMm <= 0 || h - 2 * d.doorClearanceMm <= 0)) {
    throw new Error("Door clearances leave no positive door dimensions.");
  }

  const panelSchedule: ConsolePanelLine[] = [];
  const add = (part: string, count: number, width: number, height: number) => {
    if (count === 0) return;
    if (width <= 0 || height <= 0) throw new Error(`${part} dimensions must be positive.`);
    panelSchedule.push({ part, count, widthMm: width, heightMm: height, areaM2: count * width * height / 1_000_000 });
  };

  add("Side panels", 2, h, depth);
  add("Top and bottom panels", 2, innerWidth, depth);
  add("Internal shelves", d.shelfCount, innerWidth, depth);
  add("Vertical dividers", d.dividerCount, innerHeight, depth);
  if (d.includeBackPanel) add("Back panel", 1, w, h);
  if (d.doorCount > 0) {
    const doorWidth = (w - (d.doorCount + 1) * d.doorClearanceMm) / d.doorCount;
    const doorHeight = h - 2 * d.doorClearanceMm;
    add("Overlay doors", d.doorCount, doorWidth, doorHeight);
  }

  const carcassAreaM2 = panelSchedule.reduce((total, line) => total + line.areaM2, 0);
  const grossAreaWithUserWasteM2 = carcassAreaM2 * (1 + d.wastePercent / 100);
  const theoreticalSheetAreaM2 = d.sheetWidthMm * d.sheetLengthMm / 1_000_000;
  const theoreticalSheetCount = carcassAreaM2 === 0
    ? 0
    : Math.ceil(grossAreaWithUserWasteM2 / theoreticalSheetAreaM2);
  const materialCost = d.sheetPrice === null ? null : theoreticalSheetCount * d.sheetPrice;
  const normalizedCurrency = currency.trim().toUpperCase();
  if (normalizedCurrency && !/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw new Error("Currency must be a three-letter code, for example USD or NGN.");
  }

  return {
    carcassAreaM2,
    grossAreaWithUserWasteM2,
    theoreticalSheetAreaM2,
    theoreticalSheetCount,
    materialCost,
    currency: normalizedCurrency,
    panelSchedule,
    limitations: [
      "Assembly model: side panels span full cabinet height; top and bottom fit between sides; shelves and vertical dividers fit inside the carcass; the back covers the full outside rear face. Equal overlay doors have the entered perimeter and inter-door gaps.",
      "Area-based sheet count is a lower bound, not a cut-optimized order quantity. It ignores sheet nesting, saw kerf, grain direction, defects and unusable offcuts.",
      "Assumes all listed panels use the same sheet material, thickness, size and price. Separate back/door materials, edge banding, hardware, drawer boxes, supports, finishes, joinery and installation are excluded.",
      "Confirm the final drawings, load support, wall/floor fixings and workshop cutting plan with a qualified cabinetmaker or engineer before construction.",
    ],
  };
}

export function dimensionsFromTemplate(template: TvConsoleTemplate): ConsoleDimensions {
  return {
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    depthMm: template.depthMm,
    panelThicknessMm: 18,
    shelfCount: 2,
    dividerCount: 0,
    includeBackPanel: true,
    doorCount: 0,
    doorClearanceMm: 2,
    sheetWidthMm: 1220,
    sheetLengthMm: 2440,
    wastePercent: 0,
    sheetPrice: null,
  };
}
