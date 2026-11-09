/**
 * TV console and media unit takeoff.
 *
 * The schedule models the carcass as rectangular panels with a stated assembly
 * order, then does two things the area-only version could not:
 *
 *   1. It packs the panels into stock sheets the way a workshop actually cuts
 *      them (strips along the board length), so the sheet count reflects the
 *      waste a real cutting list produces, and it reports parts that are longer
 *      than a stock sheet instead of quietly inventing a number.
 *   2. It prices the whole unit, not just board: edge banding, hardware,
 *      workshop time, finishing, installation, transport and tax, each optional
 *      and each shown as a line so a missing rate is visible rather than zero.
 *
 * Nothing here is a cut list, a joinery design or a structural check.
 */

import type { TvConsoleTemplate } from "./templates";

export type ConsoleMaterial = "carcass" | "back";

export interface ConsoleDimensions {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  panelThicknessMm: number;
  /** 0 means no back panel. A 3 to 6 mm back is normal practice. */
  backPanelThicknessMm?: number;
  shelfCount: number;
  dividerCount: number;
  drawerCount?: number;
  drawerFrontHeightMm?: number;
  doorCount: number;
  doorRevealMm: number;
  sheetWidthMm: number;
  sheetLengthMm: number;
  wastePercent: number;

  /**
   * Panelled wall quoted with the unit: height above the console, and optional
   * width when the panelling runs wider than the unit. Omitted or 0 means the
   * design has no panelling and no line is raised.
   */
  wallPanelHeightMm?: number;
  wallPanelWidthMm?: number;
  /** LED profile length in metres, when the design specifies one. */
  ledProfileMetres?: number;

  // Optional rates. A blank rate means "not priced here", never zero.
  sheetPrice?: number | null;
  backSheetPrice?: number | null;
  edgeBandingPricePerMetre?: number | null;
  hingePriceEach?: number | null;
  shelfSupportPriceEach?: number | null;
  handlePriceEach?: number | null;
  drawerSlidePairPrice?: number | null;
  workshopRatePerM2?: number | null;
  finishingRatePerM2?: number | null;
  installationPrice?: number | null;
  transportPrice?: number | null;
  taxPercent?: number | null;
  wallPanelRatePerM2?: number | null;
  ledProfileRatePerMetre?: number | null;
}

export interface ConsolePanelLine {
  part: string;
  material: ConsoleMaterial;
  count: number;
  widthMm: number;
  heightMm: number;
  areaM2: number;
  /** Banded edge length per unit, in millimetres. */
  bandedEdgeMm: number;
}

export interface ConsoleCostLine {
  key: string;
  label: string;
  quantity: number;
  unit: string;
  rate: number | null;
  amount: number | null;
}

export interface ConsoleSheetPlan {
  physicalSheets: number;
  sheetsWithAllowance: number;
  areaOnlySheets: number;
  usedAreaM2: number;
  sheetAreaM2: number;
  oversizedParts: Array<{ part: string; lengthMm: number }>;
}

export interface ConsoleHardware {
  hinges: number;
  shelfSupports: number;
  handles: number;
  drawerSlidePairs: number;
}

export interface ConsoleTotals {
  /** Sum of the lines that have a rate. Null when nothing at all was priced. */
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  /** Lines that carry a quantity but no rate: the total excludes them. */
  unpricedLines: string[];
}

export interface ConsoleEstimate {
  finishedDepthMm: number;
  carcassDepthMm: number;
  clearOpeningHeightMm: number;
  carcassAreaM2: number;
  frontAreaM2: number;
  grossAreaWithUserWasteM2: number;
  theoreticalSheetAreaM2: number;
  /** Area floor, kept for transparency. Not what you order. */
  theoreticalSheetCount: number;
  carcassSheets: ConsoleSheetPlan;
  backSheets: ConsoleSheetPlan;
  edgeBandingMetres: number;
  hardware: ConsoleHardware;
  materialCost: number | null;
  currency: string;
  panelSchedule: ConsolePanelLine[];
  costLines: ConsoleCostLine[];
  totals: ConsoleTotals;
  limitations: string[];
}

const MAX_DIMENSION_MM = 10_000;
const MAX_COUNT = 30;
/** Side clearance per side for a standard 12.5 to 13 mm ball-bearing slide. */
const DRAWER_SLIDE_CLEARANCE_MM = 13;
/** Rear clearance between drawer box and carcass back. */
const DRAWER_REAR_CLEARANCE_MM = 15;
/** Extra banding for trimming, joints and cutting error. */
const BANDING_ALLOWANCE = 1.1;

const round = (value: number, places = 3) => Number(value.toFixed(places));

interface PartInstance {
  part: string;
  material: ConsoleMaterial;
  widthMm: number;
  lengthMm: number;
}

/**
 * Strip packing, the way boards are cut: lanes are ripped from the sheet width
 * at the depth of the part, and parts are then run end to end along the sheet
 * length. Deterministic: parts are sorted by lane width, then length.
 */
function packSheets(
  instances: PartInstance[],
  sheetWidthMm: number,
  sheetLengthMm: number,
  sheetAreaM2: number,
): ConsoleSheetPlan {
  const oversized: Array<{ part: string; lengthMm: number }> = [];
  const cuttable: PartInstance[] = [];

  for (const instance of instances) {
    const lane = Math.min(instance.widthMm, instance.lengthMm);
    const run = Math.max(instance.widthMm, instance.lengthMm);
    if (run > sheetLengthMm || lane > sheetWidthMm) {
      oversized.push({ part: instance.part, lengthMm: run });
      continue;
    }
    cuttable.push({ ...instance, widthMm: lane, lengthMm: run });
  }

  cuttable.sort(
    (a, b) =>
      b.widthMm - a.widthMm ||
      b.lengthMm - a.lengthMm ||
      a.part.localeCompare(b.part),
  );

  const sheets: Array<{
    lanes: Array<{ widthMm: number; usedMm: number }>;
    usedWidthMm: number;
  }> = [];
  let usedAreaM2 = 0;

  for (const part of cuttable) {
    let placed = false;

    for (const sheet of sheets) {
      for (const lane of sheet.lanes) {
        if (
          lane.widthMm >= part.widthMm &&
          lane.usedMm + part.lengthMm <= sheetLengthMm
        ) {
          lane.usedMm += part.lengthMm;
          placed = true;
          break;
        }
      }
      if (placed) break;
      if (sheet.usedWidthMm + part.widthMm <= sheetWidthMm) {
        sheet.lanes.push({ widthMm: part.widthMm, usedMm: part.lengthMm });
        sheet.usedWidthMm += part.widthMm;
        placed = true;
        break;
      }
    }

    if (!placed) {
      sheets.push({
        lanes: [{ widthMm: part.widthMm, usedMm: part.lengthMm }],
        usedWidthMm: part.widthMm,
      });
    }
    usedAreaM2 += (part.widthMm * part.lengthMm) / 1_000_000;
  }

  const physicalSheets = sheets.length;
  const areaOnlySheets =
    usedAreaM2 === 0 ? 0 : Math.ceil(usedAreaM2 / sheetAreaM2);

  return {
    physicalSheets,
    sheetsWithAllowance: physicalSheets,
    areaOnlySheets,
    usedAreaM2: round(usedAreaM2, 6),
    sheetAreaM2: round(sheetAreaM2, 4),
    oversizedParts: oversized,
  };
}

/**
 * The allowance buys spares against cutting error and defects. It is applied to
 * the packed board count and rounded up, which is how a workshop orders: two
 * boards plus ten percent means a third board, not a fractional one.
 */
function withWaste(
  plan: ConsoleSheetPlan,
  wastePercent: number,
): ConsoleSheetPlan {
  const spare = Math.ceil(plan.physicalSheets * (1 + wastePercent / 100));
  return {
    ...plan,
    sheetsWithAllowance: Math.max(plan.physicalSheets, spare),
  };
}

/** Hinges per door follow door height, as cabinet hardware schedules do. */
export function hingesPerDoor(doorHeightMm: number): number {
  if (doorHeightMm <= 900) return 2;
  if (doorHeightMm <= 1600) return 3;
  if (doorHeightMm <= 2100) return 4;
  return 5;
}

function positive(
  value: number | undefined,
  label: string,
  max = MAX_DIMENSION_MM,
) {
  if (value === undefined) return 0;
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new Error(`${label} must be between 0 and ${max}.`);
  }
  return value;
}

function rate(value: number | null | undefined, label: string): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be blank or a non-negative number.`);
  }
  return value;
}

export function calculateConsoleEstimate(
  d: ConsoleDimensions,
  currency = "",
): ConsoleEstimate {
  const backThickness = d.backPanelThicknessMm ?? 0;
  const drawerCount = d.drawerCount ?? 0;
  const drawerFrontHeight = d.drawerFrontHeightMm ?? 200;

  for (const [label, value] of [
    ["Width", d.widthMm],
    ["Height", d.heightMm],
    ["Depth", d.depthMm],
    ["Panel thickness", d.panelThicknessMm],
    ["Board width", d.sheetWidthMm],
    ["Board length", d.sheetLengthMm],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0 || value > MAX_DIMENSION_MM) {
      throw new Error(
        `${label} must be a positive dimension up to ${MAX_DIMENSION_MM} mm.`,
      );
    }
  }
  for (const [label, count] of [
    ["Shelf count", d.shelfCount],
    ["Divider count", d.dividerCount],
    ["Drawer count", drawerCount],
    ["Door count", d.doorCount],
  ] as const) {
    if (!Number.isInteger(count) || count < 0 || count > MAX_COUNT) {
      throw new Error(
        `${label} must be a whole number from 0 to ${MAX_COUNT}.`,
      );
    }
  }
  positive(backThickness, "Back panel thickness", 100);
  positive(d.doorRevealMm, "Door reveal", 20);
  if (
    !Number.isFinite(d.wastePercent) ||
    d.wastePercent < 0 ||
    d.wastePercent > 100
  ) {
    throw new Error("Workshop allowance must be between 0% and 100%.");
  }

  const sheetPrice = rate(d.sheetPrice, "Sheet price");
  const backSheetPrice = rate(d.backSheetPrice, "Back sheet price");
  const bandingPrice = rate(d.edgeBandingPricePerMetre, "Edge banding price");
  const hingePrice = rate(d.hingePriceEach, "Hinge price");
  const supportPrice = rate(d.shelfSupportPriceEach, "Shelf support price");
  const handlePrice = rate(d.handlePriceEach, "Handle price");
  const slidePrice = rate(d.drawerSlidePairPrice, "Drawer slide price");
  const workshopRate = rate(d.workshopRatePerM2, "Workshop rate");
  const finishingRate = rate(d.finishingRatePerM2, "Finishing rate");
  const installPrice = rate(d.installationPrice, "Installation price");
  const transportPrice = rate(d.transportPrice, "Transport price");
  const taxPercent = rate(d.taxPercent, "Tax rate");
  const wallPanelRate = rate(d.wallPanelRatePerM2, "Wall panelling rate");
  const ledRate = rate(d.ledProfileRatePerMetre, "LED profile rate");

  // Panelling is measured as the face actually clad, in square metres.
  const wallPanelHeightMm = Math.max(Number(d.wallPanelHeightMm) || 0, 0);
  const wallPanelWidthMm = Math.max(
    Number(d.wallPanelWidthMm) || Number(d.widthMm) || 0,
    0,
  );
  const wallPanelAreaM2 =
    wallPanelHeightMm > 0 && wallPanelWidthMm > 0
      ? round((wallPanelWidthMm / 1000) * (wallPanelHeightMm / 1000), 3)
      : 0;
  const ledMetres = Math.max(Number(d.ledProfileMetres) || 0, 0);

  const {
    widthMm: w,
    heightMm: h,
    depthMm: finishedDepth,
    panelThicknessMm: t,
  } = d;

  // The back is applied to the rear face, so the carcass depth is the finished
  // depth less the back thickness. Without this deduction the unit is built
  // deeper than the entered depth by exactly the back thickness.
  const carcassDepth = finishedDepth - backThickness;
  if (carcassDepth < 100) {
    throw new Error("Depth must exceed the back thickness by at least 100 mm.");
  }

  const innerWidth = w - 2 * t;
  const innerHeight = h - 2 * t;
  if (innerWidth <= 0 || innerHeight <= 0) {
    throw new Error(
      "Cabinet width and height must each exceed two panel thicknesses.",
    );
  }
  if (d.shelfCount * t >= innerHeight) {
    throw new Error(
      "Shelf thickness leaves no positive vertical cabinet openings.",
    );
  }
  if (d.dividerCount * t >= innerWidth) {
    throw new Error("Divider thickness exceeds the usable cabinet width.");
  }
  if (drawerCount > 0) {
    if (drawerFrontHeight < 50 || drawerFrontHeight > 1_000) {
      throw new Error("Drawer front height must be between 50 and 1,000 mm.");
    }
    if (drawerCount * drawerFrontHeight > h) {
      throw new Error("The drawer fronts are taller than the cabinet height.");
    }
    if (innerWidth - 2 * DRAWER_SLIDE_CLEARANCE_MM <= 0) {
      throw new Error("The cabinet is too narrow for drawer slides.");
    }
    if (carcassDepth - t - DRAWER_REAR_CLEARANCE_MM <= 0) {
      throw new Error(
        "The cabinet is too shallow for a drawer box behind the front.",
      );
    }
  }

  // Openings are shared by shelves. Dividers swallow width, so shelves lost to
  // a divider are deducted here; otherwise the same board is counted twice.
  const bayWidth = innerWidth - d.dividerCount * t;
  const shelfWidth = bayWidth;
  const dividerHeight = innerHeight - d.shelfCount * t;

  const panelSchedule: ConsolePanelLine[] = [];
  const add = (
    part: string,
    material: ConsoleMaterial,
    count: number,
    width: number,
    height: number,
    bandedEdgeMm: number,
  ) => {
    if (count === 0) return;
    if (width <= 0 || height <= 0)
      throw new Error(`${part} dimensions must be positive.`);
    panelSchedule.push({
      part,
      material,
      count,
      widthMm: width,
      heightMm: height,
      areaM2: (count * width * height) / 1_000_000,
      bandedEdgeMm,
    });
  };

  add("Side panels", "carcass", 2, h, carcassDepth, 2 * (h + carcassDepth));
  add(
    "Top and bottom panels",
    "carcass",
    2,
    innerWidth,
    carcassDepth,
    innerWidth,
  );
  add(
    "Internal shelves",
    "carcass",
    d.shelfCount,
    shelfWidth,
    carcassDepth,
    shelfWidth,
  );
  add(
    "Vertical dividers",
    "carcass",
    d.dividerCount,
    dividerHeight,
    carcassDepth,
    dividerHeight,
  );

  // Drawer box: two sides, a front and a back, and a bottom from back material.
  const boxWidth = innerWidth - 2 * DRAWER_SLIDE_CLEARANCE_MM;
  const boxDepth = carcassDepth - t - DRAWER_REAR_CLEARANCE_MM;
  const boxHeight = Math.max(drawerFrontHeight - 20, 80);
  if (drawerCount > 0) {
    add("Drawer box sides", "carcass", drawerCount * 2, boxDepth, boxHeight, 0);
    add(
      "Drawer box fronts and backs",
      "carcass",
      drawerCount * 2,
      boxWidth,
      boxHeight,
      0,
    );
    add("Drawer bottoms", "back", drawerCount, boxWidth, boxDepth, 0);
  }

  let doorWidth = 0;
  if (d.doorCount > 0) {
    // Full overlay doors cover the carcass front from end to end; the reveal is
    // the gap between adjacent doors only, not a gap at each end.
    const totalReveal = (d.doorCount - 1) * d.doorRevealMm;
    doorWidth = (w - totalReveal) / d.doorCount;
    if (doorWidth <= 0) {
      throw new Error("Door reveals leave no positive door width.");
    }
    add(
      "Overlay doors",
      "carcass",
      d.doorCount,
      doorWidth,
      h,
      2 * (doorWidth + h),
    );
  }

  if (drawerCount > 0) {
    add(
      "Drawer fronts",
      "carcass",
      drawerCount,
      innerWidth,
      drawerFrontHeight,
      2 * (innerWidth + drawerFrontHeight),
    );
  }

  if (backThickness > 0) {
    add("Back panel", "back", 1, w, h, 0);
  }

  const carcassAreaM2 = panelSchedule
    .filter((line) => line.material === "carcass")
    .reduce((total, line) => total + line.areaM2, 0);
  const backAreaM2 = panelSchedule
    .filter((line) => line.material === "back")
    .reduce((total, line) => total + line.areaM2, 0);
  const bulkAreaM2 = carcassAreaM2 + backAreaM2;
  const grossAreaWithUserWasteM2 = bulkAreaM2 * (1 + d.wastePercent / 100);

  const sheetAreaM2 = (d.sheetWidthMm * d.sheetLengthMm) / 1_000_000;

  const instancesFor = (material: ConsoleMaterial): PartInstance[] =>
    panelSchedule
      .filter((line) => line.material === material)
      .flatMap((line) =>
        Array.from({ length: line.count }, () => ({
          part: line.part,
          material,
          widthMm: line.widthMm,
          heightMm: line.heightMm,
        })).map((entry) => ({
          part: entry.part,
          material,
          widthMm: entry.widthMm,
          lengthMm: entry.heightMm,
        })),
      );

  const carcassSheets = withWaste(
    packSheets(
      instancesFor("carcass"),
      d.sheetWidthMm,
      d.sheetLengthMm,
      sheetAreaM2,
    ),
    d.wastePercent,
  );
  const backSheets = withWaste(
    packSheets(
      instancesFor("back"),
      d.sheetWidthMm,
      d.sheetLengthMm,
      sheetAreaM2,
    ),
    d.wastePercent,
  );

  const theoreticalSheetCount =
    bulkAreaM2 === 0 ? 0 : Math.ceil(grossAreaWithUserWasteM2 / sheetAreaM2);

  const bandedMm = panelSchedule.reduce(
    (total, line) => total + line.bandedEdgeMm * line.count,
    0,
  );
  const edgeBandingMetres = round((bandedMm / 1_000) * BANDING_ALLOWANCE, 2);

  const hardware: ConsoleHardware = {
    hinges: d.doorCount * hingesPerDoor(h),
    shelfSupports: d.shelfCount * 4,
    handles: d.doorCount + drawerCount,
    drawerSlidePairs: drawerCount,
  };

  const clearOpeningHeightMm =
    d.shelfCount === 0
      ? round(innerHeight, 1)
      : round((innerHeight - d.shelfCount * t) / (d.shelfCount + 1), 1);

  const frontAreaM2 = panelSchedule
    .filter(
      (line) => line.part === "Overlay doors" || line.part === "Drawer fronts",
    )
    .reduce((total, line) => total + line.areaM2, 0);

  const workAreaM2 = round(carcassAreaM2, 2);
  const finishAreaM2 = round(carcassAreaM2 + frontAreaM2, 2);

  const costLines: ConsoleCostLine[] = [
    {
      key: "carcass_sheets",
      label: "Carcass board",
      quantity: carcassSheets.sheetsWithAllowance,
      unit: "sheet",
      rate: sheetPrice,
      amount:
        sheetPrice === null
          ? null
          : round(carcassSheets.sheetsWithAllowance * sheetPrice, 2),
    },
    {
      key: "back_sheets",
      label: "Back board",
      quantity: backSheets.sheetsWithAllowance,
      unit: "sheet",
      rate: backSheetPrice,
      amount:
        backSheetPrice === null
          ? null
          : round(backSheets.sheetsWithAllowance * backSheetPrice, 2),
    },
    {
      key: "edge_banding",
      label: "Edge banding",
      quantity: edgeBandingMetres,
      unit: "m",
      rate: bandingPrice,
      amount:
        bandingPrice === null
          ? null
          : round(edgeBandingMetres * bandingPrice, 2),
    },
    {
      key: "hinges",
      label: "Hinges",
      quantity: hardware.hinges,
      unit: "each",
      rate: hingePrice,
      amount:
        hingePrice === null ? null : round(hardware.hinges * hingePrice, 2),
    },
    {
      key: "shelf_supports",
      label: "Shelf supports",
      quantity: hardware.shelfSupports,
      unit: "each",
      rate: supportPrice,
      amount:
        supportPrice === null
          ? null
          : round(hardware.shelfSupports * supportPrice, 2),
    },
    {
      key: "handles",
      label: "Handles",
      quantity: hardware.handles,
      unit: "each",
      rate: handlePrice,
      amount:
        handlePrice === null ? null : round(hardware.handles * handlePrice, 2),
    },
    {
      key: "slides",
      label: "Drawer slides",
      quantity: hardware.drawerSlidePairs,
      unit: "pair",
      rate: slidePrice,
      amount:
        slidePrice === null
          ? null
          : round(hardware.drawerSlidePairs * slidePrice, 2),
    },
    {
      key: "workshop",
      label: "Workshop time (cutting, banding, assembly)",
      quantity: workAreaM2,
      unit: "m2",
      rate: workshopRate,
      amount:
        workshopRate === null ? null : round(workAreaM2 * workshopRate, 2),
    },
    {
      key: "finishing",
      label: "Finishing",
      quantity: finishAreaM2,
      unit: "m2",
      rate: finishingRate,
      amount:
        finishingRate === null ? null : round(finishAreaM2 * finishingRate, 2),
    },
    {
      key: "installation",
      label: "Installation and wall fixing",
      quantity: 1,
      unit: "job",
      rate: installPrice,
      amount: installPrice === null ? null : round(installPrice, 2),
    },
    {
      key: "transport",
      label: "Transport and delivery",
      quantity: 1,
      unit: "job",
      rate: transportPrice,
      amount: transportPrice === null ? null : round(transportPrice, 2),
    },
    // Panelling and LED are part of an exclusive media wall, so they are quoted
    // with it rather than described in prose. A blank rate leaves them listed
    // as unpriced, which is the same contract as every other line here.
    {
      key: "wall-panelling",
      label: "Wall panelling (fluted, slatted or stone face)",
      quantity: wallPanelAreaM2,
      unit: "m2",
      rate: wallPanelRate,
      amount:
        wallPanelRate === null || wallPanelAreaM2 <= 0
          ? null
          : round(wallPanelAreaM2 * wallPanelRate, 2),
    },
    {
      key: "led-profile",
      label: "LED profile and driver",
      quantity: ledMetres,
      unit: "m",
      rate: ledRate,
      amount:
        ledRate === null || ledMetres <= 0
          ? null
          : round(ledMetres * ledRate, 2),
    },
  ];

  const priced = costLines.filter(
    (line) => line.amount !== null && line.quantity > 0,
  );
  const subtotal =
    priced.length === 0
      ? null
      : round(
          priced.reduce((total, line) => total + (line.amount ?? 0), 0),
          2,
        );
  const tax =
    subtotal === null || taxPercent === null || taxPercent === 0
      ? null
      : round((subtotal * taxPercent) / 100, 2);
  const total = subtotal === null ? null : round(subtotal + (tax ?? 0), 2);
  const unpricedLines = costLines
    .filter((line) => line.quantity > 0 && line.rate === null)
    .map((line) => line.label);

  const materialCost =
    sheetPrice === null && backSheetPrice === null
      ? null
      : round(
          (sheetPrice === null
            ? 0
            : carcassSheets.sheetsWithAllowance * sheetPrice) +
            (backSheetPrice === null
              ? 0
              : backSheets.sheetsWithAllowance * backSheetPrice),
          2,
        );

  const normalizedCurrency = currency.trim().toUpperCase();
  if (normalizedCurrency && !/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw new Error(
      "Currency must be a three-letter code, for example USD or NGN.",
    );
  }

  const oversized = [
    ...carcassSheets.oversizedParts,
    ...backSheets.oversizedParts,
  ];

  return {
    finishedDepthMm: finishedDepth,
    carcassDepthMm: round(carcassDepth, 1),
    clearOpeningHeightMm,
    carcassAreaM2,
    frontAreaM2,
    grossAreaWithUserWasteM2,
    theoreticalSheetAreaM2: sheetAreaM2,
    theoreticalSheetCount,
    carcassSheets,
    backSheets,
    edgeBandingMetres,
    hardware,
    materialCost,
    currency: normalizedCurrency,
    panelSchedule,
    costLines,
    totals: { subtotal, tax, total, unpricedLines },
    limitations: [
      "Assembly: side panels span the full height; top, bottom and shelves fit between the sides; dividers fit between top and bottom. Full overlay doors cover the front from end to end with the entered reveal only between adjacent doors. The back is applied to the rear face, so the carcass is cut shallower than the finished depth by the back thickness.",
      "Sheet counts come from a strip packing of the listed parts, then the workshop allowance is added. This is a planning tool, not a nested cutting list: grain direction, book-matching, saw kerf and offcut reuse inside a lane are not simulated.",
      "Parts longer than the board length are listed separately. A console wider than one board must be jointed or cut from a longer board; the sheet count excludes those parts.",
      "Drawer boxes assume a 13 mm slide clearance per side and 15 mm to the rear, with box sides 20 mm shallower than the front. Confirm the chosen slide system.",
      "Rates are yours. FRELUX does not assert local prices, availability, material strength, fixing capacity or code compliance.",
    ],
  };
}

export function dimensionsFromTemplate(
  template: TvConsoleTemplate,
): ConsoleDimensions {
  return {
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    depthMm: template.depthMm,
    // The preset's own carcass and layout, not a fixed 18 mm two shelf default:
    // a preset that describes a drawer bank or four doors must price it.
    panelThicknessMm: template.layout.thicknessMm,
    backPanelThicknessMm: template.layout.backThicknessMm,
    shelfCount: template.layout.shelves,
    dividerCount: template.layout.dividers,
    drawerCount: template.layout.drawers,
    drawerFrontHeightMm: template.layout.drawerFrontHeightMm,
    doorCount: template.layout.doors,
    doorRevealMm: template.layout.revealMm,
    sheetWidthMm: 1220,
    sheetLengthMm: 2440,
    wastePercent: 10,
    // The panelling and LED a preset specifies are quoted with it; rates stay
    // null so they surface as unpriced lines until the user enters a rate.
    wallPanelHeightMm: template.wallPanelHeightMm,
    wallPanelWidthMm: template.widthMm,
    ledProfileMetres: template.ledProfileMetres,
    sheetPrice: null,
    backSheetPrice: null,
    edgeBandingPricePerMetre: null,
    hingePriceEach: null,
    shelfSupportPriceEach: null,
    handlePriceEach: null,
    drawerSlidePairPrice: null,
    workshopRatePerM2: null,
    finishingRatePerM2: null,
    installationPrice: null,
    transportPrice: null,
    taxPercent: null,
  };
}
