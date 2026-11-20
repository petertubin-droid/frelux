// =========================================================
// Exterior finish systems: one core, two systems
//
// EIFS (Exterior Insulation and Finish System) and DEFS (Direct-Applied
// Exterior Finish System) are the same finish build-up over a different
// backing: both are fiberglass mesh embedded in a polymer-modified base coat,
// primed, and finished with a textured acrylic or silicone coat. The difference
// is what sits behind the mesh.
//
//   EIFS: rigid insulation board, adhesively and/or mechanically fixed, then
//         the reinforced base coat over the board.
//   DEFS: no foam at all. The reinforced base coat goes straight onto cement
//         board, exterior gypsum sheathing or sound masonry, with the board
//         joints taped and the board screwed off first.
//
// So this module owns the shared layer maths ONCE, and branches only on the
// backing. The EIFS branch does not re-implement anything: it calls the
// existing, tested EIFS engine and wraps its result. That keeps the two entry
// routes from drifting apart, which is the whole point of a shared core.
// =========================================================

import {
  calculateEifsWall,
  type EifsBoqItem,
  type EifsFinishTexture,
  type EifsWallInput,
  type EifsWallResult,
} from "./eifs-engine";
import { ceilU } from "./shared/purchase-rounding";

export type ExteriorFinishSystem = "EIFS" | "DEFS";

export type DefsSubstrate = "cement-board" | "exterior-gypsum" | "masonry";

export interface ExteriorFinishInput {
  systemType: ExteriorFinishSystem;
  /** Wall area with openings already deducted, in m². */
  netWallAreaM2: number;
  /** Facade perimeter at the base, for starter / weep track, in metres. */
  perimeterLinearM: number;
  /** Total perimeter of every window and door reveal, in metres. */
  openingPerimeterM: number;

  /** EIFS only: board thickness in mm (25, 40, 50, 75, 100, 120, 150, 200). */
  insulationThicknessMm?: number;
  /** EIFS only: how the board is held on. */
  attachmentMethod?: "adhesive" | "mechanical" | "hybrid";

  /** DEFS only: what the finish is applied to. Defaults to cement-board. */
  substrate?: DefsSubstrate;
  /** DEFS only: board cutting and breakage allowance. Defaults to 10%. */
  wastagePercent?: number;

  /** Finish texture, shared by both systems. */
  finishTexture?: EifsFinishTexture;
  /** Two-letter market code, used for board and bead lengths. */
  marketCode?: string;
}

/**
 * Shared layer rates, held in one place.
 *
 * These are the same numbers the EIFS engine applies, and a contract test
 * asserts that both systems produce identical mesh, base coat, primer and
 * finish quantities for the same net area, so the two routes can never drift.
 */
export const FINISH_LAYER_RATES = {
  /** Mesh is laid with a 10% overlap allowance (ETAG 004 practice). */
  meshOverlapFactor: 1.1,
  /** Standard mesh roll: 1 m x 50 m. */
  meshRollAreaM2: 50,
  /** Base coat for mesh embedment, kg per m². */
  baseCoatKgPerM2: 4.5,
  /** Base coat bag size, kg. */
  baseCoatBagKg: 25,
  /** Tinted primer, kg per m². */
  primerKgPerM2: 0.22,
  /** Primer pail size, kg. */
  primerPailKg: 20,
  /** Textured finish spread rates, kg per m². */
  finishSpreadKgPerM2: {
    fine_sand: 2.2,
    medium_swirl: 2.8,
    coarse_rough: 3.6,
    elastomeric_smooth: 2.0,
  } as Record<EifsFinishTexture, number>,
  /** Finish pail size, kg. */
  finishPailKg: 25,
} as const;

/** DEFS board and fixing rates. */
export const DEFS_RATES = {
  /** Metric board: 1200 x 2400 mm. */
  metricBoardAreaM2: 1.2 * 2.4,
  /** North American board: 4 ft x 8 ft = 32 sq ft. */
  imperialBoardAreaM2: 0.3048 * 0.3048 * 32,
  /** Screws per board: 18-22 is the published range, 20 is the midpoint. */
  screwsPerBoard: 20,
  /** Cross-check from the same sources: about 7 screws per m² of board. */
  screwsPerM2: 7,
  /** Screw box size. */
  screwsPerBox: 1000,
  /** Alkali-resistant joint tape per m² of board, for seam reinforcement. */
  jointTapeMperM2: 1.15,
  /** Joint tape roll length, m. */
  jointTapeRollM: 90,
  /** Bead and track stock lengths, m. */
  metricStockLengthM: 3.0,
  imperialStockLengthM: 10 * 0.3048,
  /** Default cutting and breakage allowance. */
  defaultWastagePct: 10,
} as const;

const IMPERIAL_MARKETS = new Set(["US", "CA"]);

export interface SharedFinishLayers {
  meshAreaM2: number;
  meshRolls: number;
  baseCoatKg: number;
  baseCoatBags: number;
  primerKg: number;
  primerPails: number;
  finishCoatKg: number;
  finishPails: number;
  spreadRateKgPerM2: number;
}

/**
 * The layer maths both systems share: mesh, base coat, primer, finish coat.
 *
 * Pure function of net area and texture, so the same inputs always produce the
 * same quantities regardless of which system is being estimated.
 */
export function sharedFinishLayers(
  netWallAreaM2: number,
  finishTexture: EifsFinishTexture = "medium_swirl",
): SharedFinishLayers {
  const area = Math.max(0, netWallAreaM2);
  const spreadRate =
    FINISH_LAYER_RATES.finishSpreadKgPerM2[finishTexture] ??
    FINISH_LAYER_RATES.finishSpreadKgPerM2.medium_swirl;

  const meshAreaM2 =
    Math.round(area * FINISH_LAYER_RATES.meshOverlapFactor * 10) / 10;
  const baseCoatKg = Math.round(area * FINISH_LAYER_RATES.baseCoatKgPerM2);
  const primerKg =
    Math.round(area * FINISH_LAYER_RATES.primerKgPerM2 * 10) / 10;
  const finishCoatKg = Math.round(area * spreadRate);

  return {
    meshAreaM2,
    meshRolls:
      meshAreaM2 > 0
        ? ceilU(meshAreaM2 / FINISH_LAYER_RATES.meshRollAreaM2)
        : 0,
    baseCoatKg,
    baseCoatBags:
      baseCoatKg > 0 ? ceilU(baseCoatKg / FINISH_LAYER_RATES.baseCoatBagKg) : 0,
    primerKg,
    primerPails:
      primerKg > 0 ? ceilU(primerKg / FINISH_LAYER_RATES.primerPailKg) : 0,
    finishCoatKg,
    finishPails:
      finishCoatKg > 0
        ? ceilU(finishCoatKg / FINISH_LAYER_RATES.finishPailKg)
        : 0,
    spreadRateKgPerM2: spreadRate,
  };
}

export interface DefsTakeoff {
  substrate: DefsSubstrate;
  boardAreaM2: number;
  boardWastagePct: number;
  /** Board area actually bought, net area plus wastage. */
  boardPurchaseAreaM2: number;
  boardsCount: number;
  /** True when the backing is masonry, so no board is bought at all. */
  boardsOmitted: boolean;
  screwsCount: number;
  screwsFromAreaRate: number;
  screwBoxes: number;
  jointTapeM: number;
  jointTapeRolls: number;
  starterTrackM: number;
  starterTrackPieces: number;
  casingBeadM: number;
  casingBeadPieces: number;
  stockLengthM: number;
}

export interface ExteriorFinishResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  system: ExteriorFinishSystem;
  geometry: {
    netWallAreaM2: number;
    perimeterLinearM: number;
    openingPerimeterM: number;
  };
  layers: SharedFinishLayers;
  defs?: DefsTakeoff;
  /** The full EIFS takeoff, present only for the EIFS system. */
  eifs?: EifsWallResult;
  boq: EifsBoqItem[];
  /** Sentences the page shows beside the result, never hidden in a tooltip. */
  disclosures: string[];
}

function stockLengthFor(marketCode: string | undefined): number {
  return IMPERIAL_MARKETS.has((marketCode ?? "").toUpperCase())
    ? DEFS_RATES.imperialStockLengthM
    : DEFS_RATES.metricStockLengthM;
}

function boardAreaFor(marketCode: string | undefined): number {
  return IMPERIAL_MARKETS.has((marketCode ?? "").toUpperCase())
    ? DEFS_RATES.imperialBoardAreaM2
    : DEFS_RATES.metricBoardAreaM2;
}

/**
 * DEFS takeoff: rigid board, its fixings and seam tape, then the shared layers.
 *
 * Masonry is the one substrate with no board: the base coat is applied straight
 * onto the prepared blockwork, so the board, screw and tape lines are omitted
 * rather than shown as zero.
 */
export function calculateDefs(
  input: ExteriorFinishInput,
): ExteriorFinishResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const disclosures: string[] = [];

  const netWallAreaM2 = Number(input.netWallAreaM2) || 0;
  const perimeterLinearM = Number(input.perimeterLinearM) || 0;
  const openingPerimeterM = Number(input.openingPerimeterM) || 0;
  const substrate: DefsSubstrate = input.substrate ?? "cement-board";
  const wastagePct = Math.min(
    25,
    Math.max(0, Number(input.wastagePercent ?? DEFS_RATES.defaultWastagePct)),
  );
  const texture: EifsFinishTexture = input.finishTexture ?? "medium_swirl";
  const stockLengthM = stockLengthFor(input.marketCode);
  const boardAreaM2 = boardAreaFor(input.marketCode);

  if (netWallAreaM2 <= 0)
    errors.push("Net wall area must be greater than zero.");
  if (perimeterLinearM <= 0)
    errors.push("Facade perimeter must be greater than zero.");

  const layers = sharedFinishLayers(netWallAreaM2, texture);

  const boardsOmitted = substrate === "masonry";
  const boardPurchaseAreaM2 =
    Math.round(netWallAreaM2 * (1 + wastagePct / 100) * 10) / 10;
  const boardsCount = boardsOmitted
    ? 0
    : boardPurchaseAreaM2 > 0
      ? ceilU(boardPurchaseAreaM2 / boardAreaM2)
      : 0;

  // Screws: the published range is 18-22 per board, or about 7 per m² of board.
  // Both are computed and the larger is bought, so a sparse layout never
  // under-orders fixings.
  const screwsPerBoard = boardsCount * DEFS_RATES.screwsPerBoard;
  const screwsFromAreaRate = Math.ceil(
    boardPurchaseAreaM2 * DEFS_RATES.screwsPerM2,
  );
  const screwsCount = boardsOmitted
    ? 0
    : Math.max(screwsPerBoard, screwsFromAreaRate);

  const jointTapeM = boardsOmitted
    ? 0
    : Math.round(boardPurchaseAreaM2 * DEFS_RATES.jointTapeMperM2 * 10) / 10;

  const starterTrackM =
    Math.round(perimeterLinearM * (1 + wastagePct / 100) * 10) / 10;
  const casingBeadM =
    Math.round(openingPerimeterM * (1 + wastagePct / 100) * 10) / 10;

  const defs: DefsTakeoff = {
    substrate,
    boardAreaM2: Math.round(boardAreaM2 * 1000) / 1000,
    boardWastagePct: wastagePct,
    boardPurchaseAreaM2,
    boardsCount,
    boardsOmitted,
    screwsCount,
    screwsFromAreaRate,
    screwBoxes:
      screwsCount > 0 ? ceilU(screwsCount / DEFS_RATES.screwsPerBox) : 0,
    jointTapeM,
    jointTapeRolls:
      jointTapeM > 0 ? ceilU(jointTapeM / DEFS_RATES.jointTapeRollM) : 0,
    starterTrackM,
    starterTrackPieces:
      starterTrackM > 0 ? ceilU(starterTrackM / stockLengthM) : 0,
    casingBeadM,
    casingBeadPieces: casingBeadM > 0 ? ceilU(casingBeadM / stockLengthM) : 0,
    stockLengthM: Math.round(stockLengthM * 1000) / 1000,
  };

  disclosures.push(
    "DEFS carries no insulation board, so it adds no continuous R-value: the wall's thermal performance is whatever the substrate and cavity already provide.",
  );
  if (boardsOmitted) {
    disclosures.push(
      "Masonry substrate: the reinforced base coat goes directly onto the prepared blockwork, so no sheathing board, board screws or joint tape are included.",
    );
  }
  if (substrate === "exterior-gypsum") {
    disclosures.push(
      "Exterior gypsum sheathing is for soffits, canopies and protected elevations. It is not a weather-exposed substrate, so confirm the exposure before using it on a facade.",
    );
  }
  disclosures.push(
    `Board counts assume ${boardAreaM2.toFixed(3)} m² sheets and ${wastagePct}% cutting and breakage allowance.`,
  );

  const boq: EifsBoqItem[] = [];

  if (!boardsOmitted) {
    boq.push({
      code: "DEFS-01",
      description:
        substrate === "exterior-gypsum"
          ? "Exterior gypsum sheathing board"
          : "Cement sheathing board",
      category: "envelope",
      quantity: defs.boardsCount,
      unit: "boards",
      notes: `${boardPurchaseAreaM2} m² bought at ${boardAreaM2.toFixed(3)} m² per sheet, ${wastagePct}% allowance`,
    });
    boq.push({
      code: "DEFS-02",
      description: "Corrosion-resistant board screws",
      category: "attachment",
      quantity: defs.screwsCount,
      unit: "pcs",
      notes: `${DEFS_RATES.screwsPerBoard} per board and at least ${DEFS_RATES.screwsPerM2} per m²; ${defs.screwBoxes} box(es) of ${DEFS_RATES.screwsPerBox}`,
    });
    boq.push({
      code: "DEFS-03",
      description: "Alkali-resistant joint tape",
      category: "reinforcing",
      quantity: defs.jointTapeM,
      unit: "m",
      notes: `${DEFS_RATES.jointTapeMperM2} m per m² of board to reinforce seams before the full-field mesh`,
    });
  }

  boq.push({
    code: "DEFS-04",
    description: "Weep screed track",
    category: "accessories",
    quantity: defs.starterTrackPieces,
    unit: "pcs",
    notes: `${defs.starterTrackM} m in ${defs.stockLengthM} m lengths`,
  });
  boq.push({
    code: "DEFS-05",
    description: "Casing bead to openings",
    category: "accessories",
    quantity: defs.casingBeadPieces,
    unit: "pcs",
    notes: `${defs.casingBeadM} m around ${openingPerimeterM} m of reveal`,
  });
  boq.push({
    code: "DEFS-06",
    description: "Alkali-resistant fiberglass mesh",
    category: "reinforcing",
    quantity: layers.meshAreaM2,
    unit: "m²",
    notes: `${FINISH_LAYER_RATES.meshOverlapFactor * 100 - 100}% overlap; ${layers.meshRolls} roll(s) of ${FINISH_LAYER_RATES.meshRollAreaM2} m²`,
  });
  boq.push({
    code: "DEFS-07",
    description: "Polymer-modified base coat",
    category: "reinforcing",
    quantity: layers.baseCoatKg,
    unit: "kg",
    notes: `${FINISH_LAYER_RATES.baseCoatKgPerM2} kg/m²; ${layers.baseCoatBags} bag(s) of ${FINISH_LAYER_RATES.baseCoatBagKg} kg`,
  });
  boq.push({
    code: "DEFS-08",
    description: "Tinted acrylic primer",
    category: "finish",
    quantity: layers.primerKg,
    unit: "kg",
    notes: `${FINISH_LAYER_RATES.primerKgPerM2} kg/m²; ${layers.primerPails} pail(s) of ${FINISH_LAYER_RATES.primerPailKg} kg`,
  });
  boq.push({
    code: "DEFS-09",
    description: "Textured acrylic finish coat",
    category: "finish",
    quantity: layers.finishCoatKg,
    unit: "kg",
    notes: `${layers.spreadRateKgPerM2} kg/m² for ${texture}; ${layers.finishPails} pail(s) of ${FINISH_LAYER_RATES.finishPailKg} kg`,
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    system: "DEFS",
    geometry: {
      netWallAreaM2: Math.round(netWallAreaM2 * 1000) / 1000,
      perimeterLinearM: Math.round(perimeterLinearM * 1000) / 1000,
      openingPerimeterM: Math.round(openingPerimeterM * 1000) / 1000,
    },
    layers,
    defs,
    boq,
    disclosures,
  };
}

/** Wrap an existing EIFS takeoff in the shared result shape. */
export function fromEifsResult(result: EifsWallResult): ExteriorFinishResult {
  return {
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    system: "EIFS",
    geometry: {
      netWallAreaM2: result.geometry.netFacadeAreaM2,
      perimeterLinearM: 0,
      openingPerimeterM: result.geometry.openingsPerimeterM,
    },
    layers: {
      meshAreaM2: result.reinforcing.standardMeshAreaM2,
      meshRolls: result.reinforcing.standardMeshRolls50M2,
      baseCoatKg: result.reinforcing.baseCoatKg,
      baseCoatBags: result.reinforcing.baseCoatBags25Kg,
      primerKg: result.finish.primerKg,
      primerPails: result.finish.primerPails20Kg,
      finishCoatKg: result.finish.finishCoatKg,
      finishPails: result.finish.finishPails25Kg,
      spreadRateKgPerM2: result.finish.spreadRateKgPerM2,
    },
    eifs: result,
    boq: result.boq,
    disclosures: [
      "EIFS adds continuous insulation: the R-value below is for the insulation layer plus air films, not the whole wall.",
    ],
  };
}

/**
 * The single entry point both routes call.
 *
 * EIFS delegates to the existing engine with the full wall input it needs
 * (length, height, substrate, openings); DEFS uses the area contract above.
 * One dispatcher, two systems, no duplicated layer maths.
 */
export function calculateExteriorFinish(
  request:
    | { systemType: "EIFS"; eifsInput: EifsWallInput }
    | { systemType: "DEFS"; input: ExteriorFinishInput },
): ExteriorFinishResult {
  if (request.systemType === "EIFS") {
    return fromEifsResult(calculateEifsWall(request.eifsInput));
  }
  return calculateDefs({ ...request.input, systemType: "DEFS" });
}

/**
 * Convert the EIFS page's wall inputs into the area contract, so the mode
 * toggle can hand the same wall to either system without re-entering anything.
 */
export function exteriorInputFromEifs(
  input: EifsWallInput,
  options: {
    substrate?: DefsSubstrate;
    wastagePercent?: number;
    finishTexture?: EifsFinishTexture;
  } = {},
): ExteriorFinishInput {
  const length = Number(input.wallLengthM) || 0;
  const height = Number(input.wallHeightM) || 0;
  const openings = input.openings ?? [];
  const openingsArea = openings.reduce(
    (sum, opening) =>
      sum + opening.widthM * opening.heightM * (opening.count || 1),
    0,
  );
  const openingsPerimeter = openings.reduce(
    (sum, opening) =>
      sum + 2 * (opening.widthM + opening.heightM) * (opening.count || 1),
    0,
  );
  return {
    systemType: "DEFS",
    netWallAreaM2: Math.max(0, length * height - openingsArea),
    perimeterLinearM: length,
    openingPerimeterM: openingsPerimeter,
    substrate: options.substrate ?? "cement-board",
    wastagePercent: options.wastagePercent,
    finishTexture: options.finishTexture ?? input.finishTexture,
    marketCode: input.marketCode,
  };
}
