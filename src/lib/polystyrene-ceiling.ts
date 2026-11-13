// Polystyrene (PS / EPS foam board) ceiling take-off.
//
// This is the second ceiling system the POP calculator offers. The plaster
// system is priced from database material rows; polystyrene cannot be, because
// one board's coverage changes with the size the site actually stocks, so the
// quantity of every dependent item (seams, tape, adhesive, fixings) changes
// with it. The arithmetic therefore lives here, in one place, and the page only
// supplies the choices and the unit prices.
//
// Two rules run through it:
//   - quantities come from measurement and board geometry, never from a rate
//     of thumb typed into a table;
//   - prices are the visitor's. The take-off is exact, the money is local, and
//     the two are kept apart so a price change can never alter a quantity.

export type PsBoardSize = "1200x2400" | "1200x3000";
export type PsThickness = 20 | 25 | 30;
export type PsInstallation = "bonded" | "timber" | "metal" | "wire";
export type PsDesign = "flat" | "stepped" | "coffered" | "curved";

export interface PsBoardSpec {
  /** Board length in millimetres, as stocked. */
  lengthMm: number;
  /** Board width in millimetres, as stocked. */
  widthMm: number;
  /** Area of one board in square metres. */
  areaM2: number;
  label: string;
}

/**
 * The two sizes Nigerian and most export suppliers stock. 1.2 x 2.4 m is the
 * retail default (4 ft x 8 ft); 1.2 x 3.0 m is the larger commercial sheet.
 */
export const PS_BOARDS: Record<PsBoardSize, PsBoardSpec> = {
  "1200x2400": {
    lengthMm: 2400,
    widthMm: 1200,
    areaM2: 2.88,
    label: "1.2 m x 2.4 m (4 ft x 8 ft)",
  },
  "1200x3000": {
    lengthMm: 3000,
    widthMm: 1200,
    areaM2: 3.6,
    label: "1.2 m x 3.0 m",
  },
};

export const PS_THICKNESS_LABELS: Record<PsThickness, string> = {
  20: "20 mm - flat ceilings bonded to a sound slab",
  25: "25 mm - standard residential, bonded or suspended",
  30: "30 mm - stepped and coffered designs, best insulation",
};

export const PS_INSTALLATION_LABELS: Record<PsInstallation, string> = {
  bonded: "Direct bonding to concrete slab",
  timber: "Timber noggin under roof trusses",
  metal: "Metal channel grid",
  wire: "Wire-suspended drop",
};

/**
 * Wastage by design, from the cutting each design actually produces. A flat
 * room loses offcuts at the perimeter; a tray or cove design loses the drop
 * strips as well; curved work loses the most because a curve cannot follow a
 * straight board edge.
 */
export const PS_WASTE_BY_DESIGN: Record<PsDesign, number> = {
  flat: 10,
  stepped: 15,
  coffered: 20,
  curved: 25,
};

export const PS_DESIGN_LABELS: Record<PsDesign, string> = {
  flat: "Flat ceiling",
  stepped: "Tray / stepped design",
  coffered: "Coffered or panelled",
  curved: "Curved or circular",
};

/** Battens, channels and noggins run at 600 mm centres, the standard. */
const FRAME_CENTRES_M = 0.6;
/**
 * Linear metres of framing per square metre at 600 mm centres, both directions:
 * one run per 0.6 m of width, in each of two directions.
 */
const FRAME_LM_PER_M2 = 2 / FRAME_CENTRES_M;

/** A 750 ml polyurethane foam can bonds about 10 m2 at bead spacing. */
const ADHESIVE_M2_PER_CAN = 10;
/** On a framed ceiling the board is spotted to the frame, not fully bonded. */
const ADHESIVE_M2_PER_CAN_FRAMED = 25;

/** Screws at 200 mm along every frame run. */
const SCREWS_PER_M2 = FRAME_LM_PER_M2 / 0.2;
/** Concrete nails at 600 mm along every batten run. */
const NAILS_PER_M2 = FRAME_LM_PER_M2 * (1 / FRAME_CENTRES_M);
/** One wire hanger per 1.2 m x 1.2 m of suspended area. */
const HANGERS_PER_M2 = 1 / (1.2 * 1.2);
/** Galvanised binding wire per hanger, kg. */
const WIRE_KG_PER_HANGER = 0.03;

/** Mesh tape or soaked fibre along every seam, with 10% lap. */
const TAPE_LAP = 1.1;
const TAPE_ROLL_M = 45;
/** Joint filler: skim every seam and screw head, two passes. */
const PUTTY_KG_PER_M2 = 0.5;
const PUTTY_BAG_KG = 25;
/** Abrasive between coats; one sheet per 8 m2. */
const SANDPAPER_M2_PER_SHEET = 8;
/** Two coats of water-based emulsion at 10 m2 per litre per coat. */
const PAINT_L_PER_M2 = 0.2;
const PAINT_CAN_L = 20;

/** A 3.6 m batten or channel is the length timber yards and suppliers sell. */
const FRAME_STOCK_M = 3.6;

export interface PsCalcInput {
  /** Room length in metres. */
  lengthM: number;
  /** Room width in metres. */
  widthM: number;
  /** Perimeter in metres. Left at 0, a rectangle perimeter is used. */
  perimeterM?: number;
  /** Include the vertical face of tray steps and drops. */
  includeDrops: boolean;
  /** Height of the step, metres. */
  dropHeightM: number;
  /** Running length of the step, metres. */
  dropPerimeterM: number;
  boardSize: PsBoardSize;
  thickness: PsThickness;
  installation: PsInstallation;
  design: PsDesign;
  includeCornice: boolean;
  includePaint: boolean;
  /** Overrides the design wastage when greater than or equal to zero. */
  wastePctOverride?: number;
  /** Labour rate per square metre of finished surface. */
  labourRatePerM2?: number;
}

/** Unit prices the visitor supplies, keyed by line. Zero means not priced yet. */
export type PsPrices = Partial<Record<PsLineKey, number>>;

export type PsLineKey =
  | "boards"
  | "adhesive"
  | "tape"
  | "putty"
  | "sandpaper"
  | "paint"
  | "cornice"
  | "frame"
  | "screws"
  | "nails"
  | "hangers"
  | "wire";

export interface PsLine {
  key: PsLineKey;
  label: string;
  /** Quantity in the line's own unit, already rounded up to whole packs. */
  quantity: number;
  unit: string;
  /** Purchase packs, where the item is bought in packs. */
  packs: number;
  packLabel: string;
  unitPrice: number;
  cost: number;
  /** Which installation this line belongs to, for grouping in the UI. */
  group: "boards" | "jointing" | "framing" | "finishing";
  note?: string;
}

export interface PsResult {
  flatAreaM2: number;
  dropAreaM2: number;
  surfaceM2: number;
  wastePct: number;
  wasteAreaM2: number;
  boardAreaM2: number;
  boardsRequired: number;
  /** Internal board-to-board seams, metres. */
  seamLengthM: number;
  /** Wall edge line that also needs reinforcing, metres. */
  edgeSeamM: number;
  /** Internal seams plus the edge line: the length that gets tape or filas. */
  reinforcedSeamM: number;
  perimeterM: number;
  lines: PsLine[];
  materialCost: number;
  labourCost: number;
  grandTotal: number;
  /** Lines with no price, so the UI can say what is still to be priced. */
  unpricedLines: PsLineKey[];
  warnings: string[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** Whole packs, tolerant of binary floating point (see pop-tile-calc). */
const CEIL_EPSILON = 1e-9;
function ceilPacks(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value - CEIL_EPSILON);
}

/**
 * Joint length per square metre for a board of the given size.
 *
 * Laid in a regular pattern, there is one joint run per board width in one
 * direction and one per board length in the other, so the density is
 * 1/width + 1/length per m2. For a 1.2 x 2.4 m board that is 1.25 m of seam per
 * square metre, which is why a 20 m2 room needs about 25 m of tape and not the
 * 70 m a guess would order.
 */
export function seamLengthPerM2(spec: PsBoardSpec): number {
  return 1 / (spec.widthMm / 1000) + 1 / (spec.lengthMm / 1000);
}

export function rectanglePerimeter(lengthM: number, widthM: number): number {
  if (lengthM <= 0 || widthM <= 0) return 0;
  return 2 * (lengthM + widthM);
}

export function calculatePolystyreneCeiling(
  input: PsCalcInput,
  prices: PsPrices = {},
): PsResult {
  const warnings: string[] = [];
  const lengthM = Number.isFinite(input.lengthM)
    ? Math.max(0, input.lengthM)
    : 0;
  const widthM = Number.isFinite(input.widthM) ? Math.max(0, input.widthM) : 0;

  const flatAreaM2 = round3(lengthM * widthM);
  const perimeterM = round3(
    input.perimeterM && input.perimeterM > 0
      ? input.perimeterM
      : rectanglePerimeter(lengthM, widthM),
  );

  const dropHeightM = input.includeDrops
    ? Math.max(0, input.dropHeightM || 0)
    : 0;
  const dropRunM = input.includeDrops
    ? Math.max(0, input.dropPerimeterM || 0) || perimeterM
    : 0;
  const dropAreaM2 = round3(dropHeightM * dropRunM);

  const surfaceM2 = round3(flatAreaM2 + dropAreaM2);

  const designWaste =
    PS_WASTE_BY_DESIGN[input.design] ?? PS_WASTE_BY_DESIGN.flat;
  const wastePct =
    typeof input.wastePctOverride === "number" && input.wastePctOverride >= 0
      ? input.wastePctOverride
      : designWaste;

  const spec = PS_BOARDS[input.boardSize] ?? PS_BOARDS["1200x2400"];
  const wasteAreaM2 = round3((surfaceM2 * wastePct) / 100);
  const boardsRequired = ceilPacks((surfaceM2 + wasteAreaM2) / spec.areaM2);

  const seamLengthM = round3(surfaceM2 * seamLengthPerM2(spec));
  // The board meets the wall all round, and that edge line is reinforced the
  // same way: a seam that is never taped is where the first crack opens.
  const edgeSeamM = surfaceM2 > 0 ? perimeterM : 0;
  const reinforcedSeamM = round3(seamLengthM + edgeSeamM);

  const framed =
    input.installation === "timber" ||
    input.installation === "metal" ||
    input.installation === "wire";

  const adhesiveCans = ceilPacks(
    surfaceM2 / (framed ? ADHESIVE_M2_PER_CAN_FRAMED : ADHESIVE_M2_PER_CAN),
  );
  const tapeRolls = ceilPacks((reinforcedSeamM * TAPE_LAP) / TAPE_ROLL_M);
  const puttyKg = surfaceM2 * PUTTY_KG_PER_M2;
  const puttyBags = ceilPacks(puttyKg / PUTTY_BAG_KG);
  const sandpaperSheets = ceilPacks(surfaceM2 / SANDPAPER_M2_PER_SHEET);
  const paintLitres = surfaceM2 * PAINT_L_PER_M2;
  const paintCans = ceilPacks(paintLitres / PAINT_CAN_L);
  const corniceM = input.includeCornice ? perimeterM : 0;
  const frameLm = framed ? surfaceM2 * FRAME_LM_PER_M2 : 0;
  const frameLengths = ceilPacks(frameLm / FRAME_STOCK_M);
  const screws = framed ? ceilPacks(surfaceM2 * SCREWS_PER_M2) : 0;
  const nails = framed ? ceilPacks(surfaceM2 * NAILS_PER_M2) : 0;
  const hangers =
    input.installation === "wire" ? ceilPacks(surfaceM2 * HANGERS_PER_M2) : 0;
  const wireKg = round2(hangers * WIRE_KG_PER_HANGER);

  const line = (
    key: PsLineKey,
    label: string,
    quantity: number,
    unit: string,
    packs: number,
    packLabel: string,
    group: PsLine["group"],
    note?: string,
  ): PsLine => {
    const unitPrice = Number(prices[key] ?? 0);
    const priced = Number.isFinite(unitPrice) && unitPrice > 0;
    return {
      key,
      label,
      quantity: round2(quantity),
      unit,
      packs,
      packLabel,
      unitPrice: priced ? unitPrice : 0,
      cost: priced ? round2(packs * unitPrice) : 0,
      group,
      note,
    };
  };

  const lines: PsLine[] = [
    line(
      "boards",
      `${input.thickness} mm polystyrene ceiling boards, ${spec.label}`,
      boardsRequired * spec.areaM2,
      "m²",
      boardsRequired,
      `${boardsRequired} board${boardsRequired === 1 ? "" : "s"} of ${spec.areaM2} m²`,
      "boards",
      `Measured ${round2(surfaceM2)} m² plus ${wastePct}% wastage`,
    ),
    line(
      "adhesive",
      "Polyurethane foam adhesive or Top Bond",
      adhesiveCans,
      "can",
      adhesiveCans,
      "750 ml cans",
      "jointing",
      framed ? "Spot-bonded to the frame" : "Beaded to the slab",
    ),
    line(
      "tape",
      "Fibre mesh tape or soaked filas",
      round2(reinforcedSeamM),
      "m",
      tapeRolls,
      "45 m rolls",
      "jointing",
      `${round2(seamLengthM)} m of board seam at ${round2(seamLengthPerM2(spec))} m/m² plus ${round2(edgeSeamM)} m of wall edge`,
    ),
    line(
      "putty",
      "POP screeding putty",
      round2(puttyKg),
      "kg",
      puttyBags,
      "25 kg bags",
      "jointing",
    ),
  ];

  if (framed) {
    lines.push(
      line(
        "frame",
        input.installation === "metal"
          ? "Galvanised metal channels"
          : "Treated timber battens and noggins",
        round2(frameLm),
        "m",
        frameLengths,
        "3.6 m lengths",
        "framing",
        "600 mm centres, both directions",
      ),
      line(
        "screws",
        "Drywall screws",
        screws,
        "pcs",
        screws,
        "pieces",
        "framing",
        "200 mm along every run",
      ),
      line(
        "nails",
        "Concrete nails",
        nails,
        "pcs",
        nails,
        "pieces",
        "framing",
        "Fixing the frame to the slab",
      ),
    );
  }

  if (input.installation === "wire") {
    lines.push(
      line(
        "hangers",
        "Galvanised wire hangers",
        hangers,
        "pcs",
        hangers,
        "pieces",
        "framing",
        "1.2 m grid",
      ),
      line(
        "wire",
        "Galvanised binding wire",
        wireKg,
        "kg",
        1,
        "by weight",
        "framing",
      ),
    );
  }

  if (input.includeCornice) {
    lines.push(
      line(
        "cornice",
        "Polystyrene cornice / coving",
        round2(corniceM),
        "m",
        ceilPacks(corniceM / 2.4),
        "2.4 m lengths",
        "finishing",
        "Room perimeter",
      ),
    );
  }

  lines.push(
    line(
      "sandpaper",
      "Fine abrasive, 120-180 grit",
      sandpaperSheets,
      "sheet",
      sandpaperSheets,
      "sheets",
      "finishing",
    ),
  );

  if (input.includePaint) {
    lines.push(
      line(
        "paint",
        "Water-based emulsion or satin paint",
        round2(paintLitres),
        "L",
        paintCans,
        "20 L cans",
        "finishing",
        "Two coats. Never use solvent or oil-based paint on polystyrene",
      ),
    );
  }

  const materialCost = round2(lines.reduce((sum, l) => sum + l.cost, 0));
  const labourRate = Number(input.labourRatePerM2 ?? 0);
  const designLabourFactor =
    input.design === "flat"
      ? 1
      : input.design === "stepped"
        ? 1.15
        : input.design === "coffered"
          ? 1.3
          : 1.4;
  const labourCost =
    Number.isFinite(labourRate) && labourRate > 0
      ? round2(surfaceM2 * labourRate * designLabourFactor)
      : 0;

  const unpricedLines = lines
    .filter((l) => l.unitPrice === 0)
    .map((l) => l.key);

  if (surfaceM2 <= 0)
    warnings.push("Enter the room dimensions to take off materials.");
  if (input.includeDrops && dropHeightM <= 0) {
    warnings.push(
      "A tray or drop was selected, but no drop height was entered, so no vertical area was added.",
    );
  }
  if (
    input.thickness === 20 &&
    (input.design === "coffered" || input.design === "stepped")
  ) {
    warnings.push(
      "20 mm board is thin for a stepped or coffered design; 25 mm or 30 mm holds the step edge better.",
    );
  }
  if (unpricedLines.length > 0) {
    warnings.push(
      "Some lines have no unit price yet, so they are shown at zero until you enter your supplier's figure.",
    );
  }
  if (input.installation === "bonded" && input.thickness === 30) {
    warnings.push(
      "Direct bonding a 30 mm board to a slab leaves little room for adhesive squeeze-out; check the adhesive manufacturer's bed thickness.",
    );
  }

  return {
    flatAreaM2,
    dropAreaM2,
    surfaceM2,
    wastePct,
    wasteAreaM2,
    boardAreaM2: spec.areaM2,
    boardsRequired,
    seamLengthM,
    edgeSeamM,
    reinforcedSeamM,
    perimeterM,
    lines,
    materialCost,
    labourCost,
    grandTotal: round2(materialCost + labourCost),
    unpricedLines,
    warnings,
  };
}
