/**
 * Insulated Concrete Form (ICF) Engineering & Material Takeoff Engine
 *
 * Deterministic quantity estimation and structural takeoff for permanent
 * EPS/Neopor Insulated Concrete Form wall assemblies.
 *
 * Covers the complete physical construction workflow:
 *  1. Form Unit Geometry (Straight, 90° Corners, 45° Splays, T-Wall Intersections)
 *  2. Concrete Core Pumping & Mix Design (100mm, 150mm, 200mm, 250mm, 300mm cores)
 *  3. Steel Reinforcement Schedule (Starter Dowels, Vertical & Horizontal Grids, Lintel Headers)
 *  4. Alignment & Turnbuckle Bracing System + Scaffolding Catwalks
 *  5. Rough Openings & Bucking (Treated Lumber / Vinyl V-Bucks + Foam Sealant)
 *  6. Building Envelope Scorecard (Continuous R-Value, Metric U-Value, STC Acoustic, Fire Rating)
 *  7. Below-Grade Waterproofing & Drainage (Basement Peel-and-Stick + Dimple Board)
 *  8. Direct Fastening Substrate (Coarse-Thread Drywall Screws into Polypropylene Webs)
 *  9. Labor Stacking, Bracing & Pumping Installation Man-Hours
 *
 * Regulatory & Code Alignment:
 *  - North America: IRC Section R608 / R404.1.2, IBC Ch. 19/26, ACI 318/332, NBC Part 9, ASTM E2634
 *  - Europe & UK: Eurocode 2 (EN 1992-1-1), EOTA/ETAG 009, BBA certifications, UK Part L/B
 *  - Australia & NZ: AS 3600:2018, AS 2870, NCC Termite Protection (AS 3660)
 *  - Middle East & Africa: SANS 10400 / Agrément SA, SASO / Estidama Energy Standards
 */

import { ceilU } from "./shared/purchase-rounding";
import { resolveCementBag } from "@/config/cement-bag";
import { getStructuralJurisdictionScope } from "@/lib/engineering/structural-jurisdiction-scope";

export type IcfCoreThicknessMm = 100 | 150 | 200 | 250 | 300;
export type IcfFoamType = "standard_eps" | "graphite_neopor";
export type IcfRebarSize =
  "10M" | "12M" | "16M" | "20M" | "no4" | "no5" | "no6";
export type IcfVerticalSpacingMm = 400 | 600;
export type IcfHorizontalCourses = "every_course" | "every_second_course";
export type IcfConcreteMixGrade = "C20_25" | "C25_30" | "C30_37";

/**
 * Form geometry family. It decides how much of the cavity is concrete, which is
 * the single largest difference between one ICF product and another:
 *  - flat: a straight cavity wall, the common European and Middle East product.
 *  - waffle: a grid of concrete columns and beams with a large void, common in
 *    North American residential work (Logix type forms).
 *  - screen: a lighter grid with still larger voids.
 * The fill factor is an assumption you can see and change, because the volume
 * per form published by the manufacturer you are buying governs the order.
 */
export type IcfFormSystem = "flat" | "waffle" | "screen";

/** Interior lining. Fire resistance belongs to the assembly, not the core. */
export type IcfInteriorLining =
  "none" | "gypsum_12_5" | "gypsum_15_9_type_x" | "double_gypsum_12_5";

export interface IcfOpening {
  id: string;
  label: string;
  widthM: number;
  heightM: number;
  count: number;
}

export interface IcfWallInput {
  /** Centerline wall perimeter length in meters. */
  wallLengthM: number;
  /** Wall height in meters. */
  wallHeightM: number;
  /** Concrete core cavity thickness in mm (100, 150, 200, 250, 300). */
  coreThicknessMm: IcfCoreThicknessMm;
  /** Foam panel composition: standard EPS (white) or graphite Neopor (grey). */
  foamType?: IcfFoamType;
  /** Window and door openings subtracted from gross area. */
  openings?: IcfOpening[];
  /** Count of 90-degree corner units per course (default 4 for rectangular). */
  corners90Count?: number;
  /** Count of 45-degree splay/bay corners per course. */
  corners45Count?: number;
  /** Count of T-wall tee intersections with internal demising walls per course. */
  tWallsCount?: number;
  /** Vertical rebar bar specification. */
  verticalRebarSize?: IcfRebarSize;
  /** Center-to-center spacing of vertical bars in mm (400 or 600). */
  verticalRebarSpacingMm?: IcfVerticalSpacingMm;
  /** Horizontal rebar frequency: every course (400mm) or every second course (800mm). */
  horizontalRebarCourses?: IcfHorizontalCourses;
  /** Footing starter dowel embedment + lap projection length in meters (default 0.75m). */
  dowelLengthM?: number;
  /** Ready-mix concrete grade. */
  concreteGrade?: IcfConcreteMixGrade;
  /** Cutting and placement waste percentage (typical 3% - 5%). */
  wasteFactorPercent?: number;
  /** Whether the wall is a below-grade earth-retaining basement wall. */
  isBasement?: boolean;
  /** 2-letter ISO market code for cement package mass and local standards. */
  marketCode?: string;
  /** Number of installers on the site crew (default 4). */
  laborCrewSize?: number;
  /** Form family, which sets the concrete fill factor of the cavity. */
  formSystem?: IcfFormSystem;
  /** Foam panel thickness on each face in mm (default 64mm / 2.5"). */
  foamThicknessPerSideMm?: number;
  /** Interior lining, which is what gives an ICF wall its fire resistance. */
  interiorLining?: IcfInteriorLining;
  /** Vertical bars at each web line: one centred bar, or one near each face. */
  verticalBarsPerWeb?: 1 | 2;
  /** Horizontal bars per course: one, or one near each face. */
  horizontalBarsPerCourse?: 1 | 2;
  /** Concrete over-order allowance for pump prime and line loss (default 5%). */
  concreteWastePercent?: number;
}

export interface IcfBoqItem {
  code: string;
  description: string;
  category:
    | "formwork"
    | "concrete"
    | "reinforcement"
    | "bracing"
    | "openings"
    | "envelope"
    | "labor";
  quantity: number;
  unit: string;
  notes?: string;
}

export interface IcfWallResult {
  ok: boolean;
  errors: string[];
  warnings: string[];

  geometry: {
    grossAreaM2: number;
    openingsAreaM2: number;
    netWallAreaM2: number;
    wallHeightCourses: number;
    effectivePerimeterM: number;
    /** Concrete lifts the wall height needs at the maximum pour rate. */
    pourLifts: number;
  };

  blocks: {
    straightBlocksCount: number;
    corner90BlocksCount: number;
    corner45BlocksCount: number;
    tWallBlocksCount: number;
    totalBlocksCount: number;
    nominalBlockAreaM2: number;
    cuttingWasteAllowanceM2: number;
  };

  concrete: {
    coreThicknessMm: number;
    formSystem: IcfFormSystem;
    /** Share of the cavity that is concrete for the form family entered. */
    fillFactor: number;
    netVolumeM3: number;
    pumpPrimeLossM3: number;
    totalVolumeM3: number;
    readyMixTrucks6M3: number;
    readyMixTrucks8M3: number;
    siteMixCementBags: number;
    siteMixSandTonnes: number;
    siteMixGraniteTonnes: number;
    siteMixWaterLitres: number;
    maxPourLiftRateMPerHour: number;
    recommendedSlumpMm: string;
    aggregateSizeMaxMm: number;
    mixDesign: {
      grade: IcfConcreteMixGrade;
      cementKgPerM3: number;
      waterCementRatio: number;
      waterLitresPerM3: number;
      sandKgPerM3: number;
      aggregateKgPerM3: number;
      note: string;
    };
  };

  reinforcement: {
    verticalBarsCount: number;
    verticalTotalLengthM: number;
    verticalTotalWeightKg: number;
    horizontalCoursesCount: number;
    horizontalTotalLengthM: number;
    horizontalTotalWeightKg: number;
    dowelsCount: number;
    dowelsTotalLengthM: number;
    dowelsTotalWeightKg: number;
    lintelsTensileLengthM: number;
    lintelsStirrupsCount: number;
    lintelsSteelWeightKg: number;
    /** Bars added each side of every opening, per ACI 318 wall opening rules. */
    openingTrimBarsCount: number;
    openingTrimWeightKg: number;
    totalSteelWeightKg: number;
    totalSteelWeightTonnes: number;
    tieWireRolls: number;
  };

  bracing: {
    turnbuckleAlignmentJacks: number;
    catwalkScaffoldBrackets: number;
    concreteAnchorBolts: number;
    recommendedJackSpacingM: number;
  };

  openings: {
    totalOpeningsCount: number;
    totalBuckPerimeterM: number;
    polyurethaneFoamCans: number;
  };

  envelope: {
    foamType: IcfFoamType;
    foamThicknessMm: number;
    continuousRValueImperial: number;
    metricRsiValue: number;
    thermalTransmittanceUValue: number;
    /** What the R-value is made of, so the figure can be checked. */
    rValueBasis: string;
    acousticStcRating: number;
    acousticBasis: string;
    fireResistanceHours: number;
    fireBasis: string;
    interiorLining: IcfInteriorLining;
    thermalBarrierRequirement: string;
  };

  fasteners: {
    drywallScrewsCount: number;
    claddingFastenersCount: number;
  };

  waterproofing?: {
    peelAndStickMembraneM2: number;
    dimpleDrainageBoardM2: number;
    terminationBarM: number;
  };

  labor: {
    stackingManHours: number;
    rebarBuckingManHours: number;
    bracingManHours: number;
    pourConsolidationManHours: number;
    totalManHours: number;
    estimatedCrewDays: number;
    traditionalBlockworkManHoursComparison: number;
    laborSavingsPercentage: number;
  };

  boq: IcfBoqItem[];

  codeCitations: Array<{
    jurisdiction: string;
    code: string;
    clause: string;
    summary: string;
  }>;
}

/** Standard ICF block nominal face dimensions (1200mm x 400mm / 48" x 16"). */
export const ICF_BLOCK_FACE_LENGTH_M = 1.2;
export const ICF_BLOCK_FACE_HEIGHT_M = 0.4;
export const ICF_BLOCK_FACE_AREA_M2 =
  ICF_BLOCK_FACE_LENGTH_M * ICF_BLOCK_FACE_HEIGHT_M; // 0.48 m²

/** Rebar mass per meter for standard bar sizes. */
export const REBAR_MASS_KG_PER_M: Record<IcfRebarSize, number> = {
  "10M": 0.785, // 11.3mm nominal
  "12M": 0.888, // 12mm nominal
  "16M": 1.578, // 16mm nominal
  "20M": 2.466, // 20mm nominal
  no4: 0.994, // US #4 (1/2")
  no5: 1.552, // US #5 (5/8")
  no6: 2.235, // US #6 (3/4")
};

/**
 * Share of the cavity that ends up as concrete, by form family.
 *
 * A flat wall fills its cavity and loses a little to the tie webs. A waffle
 * grid leaves most of the cavity as void, and a screen grid leaves more. These
 * are typical published proportions for the three families; the volume per
 * form printed by the manufacturer you are buying overrides them, which is why
 * the figure is reported rather than buried.
 */
export const ICF_FILL_FACTORS: Record<IcfFormSystem, number> = {
  flat: 0.985,
  waffle: 0.6,
  screen: 0.45,
};

/** Foam resistance per inch of thickness, at 24 °C mean temperature. */
export const ICF_FOAM_R_PER_INCH: Record<IcfFoamType, number> = {
  standard_eps: 3.85,
  graphite_neopor: 4.4,
};

/** Concrete mix proportions per cubic metre, by grade. */
export const ICF_MIX_DESIGN: Record<
  IcfConcreteMixGrade,
  {
    cementKgPerM3: number;
    waterCementRatio: number;
    sandKgPerM3: number;
    aggregateKgPerM3: number;
  }
> = {
  C20_25: {
    cementKgPerM3: 320,
    waterCementRatio: 0.6,
    sandKgPerM3: 820,
    aggregateKgPerM3: 1140,
  },
  C25_30: {
    cementKgPerM3: 350,
    waterCementRatio: 0.52,
    sandKgPerM3: 790,
    aggregateKgPerM3: 1150,
  },
  C30_37: {
    cementKgPerM3: 400,
    waterCementRatio: 0.45,
    sandKgPerM3: 760,
    aggregateKgPerM3: 1160,
  },
};

/**
 * Minimum published fire resistance for an ICF wall, by interior lining.
 *
 * These are the floor values published for tested ICF assemblies under
 * ASTM E119 / CAN/ULC S101 / EN 1365, not a prediction for the wall in front of
 * you. A rating is a property of the tested assembly, so the listing for the
 * product you buy governs.
 */
export const ICF_FIRE_HOURS_BY_LINING: Record<IcfInteriorLining, number> = {
  none: 0,
  gypsum_12_5: 2,
  gypsum_15_9_type_x: 3,
  double_gypsum_12_5: 4,
};

/**
 * Calculate complete, code-backed ICF wall quantities.
 */
export function calculateIcfWall(input: IcfWallInput): IcfWallResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const wallLengthM = Number(input.wallLengthM) || 0;
  const wallHeightM = Number(input.wallHeightM) || 0;
  const coreThicknessMm = input.coreThicknessMm || 150;
  const foamType: IcfFoamType =
    input.foamType === "graphite_neopor" ? "graphite_neopor" : "standard_eps";
  const openings = input.openings || [];
  const corners90 = Math.max(0, input.corners90Count ?? 4);
  const corners45 = Math.max(0, input.corners45Count ?? 0);
  const tWalls = Math.max(0, input.tWallsCount ?? 0);
  const verticalRebarSize: IcfRebarSize = input.verticalRebarSize || "12M";
  const verticalSpacingMm: IcfVerticalSpacingMm =
    input.verticalRebarSpacingMm || 400;
  const horizontalCourses: IcfHorizontalCourses =
    input.horizontalRebarCourses || "every_course";
  const dowelLengthM = Math.max(0.4, Number(input.dowelLengthM) || 0.75);
  const wastePct = Math.max(
    0,
    Math.min(25, Number(input.wasteFactorPercent) || 4),
  );
  const isBasement = Boolean(input.isBasement);
  const marketCode = (input.marketCode || "US").toUpperCase();
  const crewSize = Math.max(1, Number(input.laborCrewSize) || 4);
  const formSystem: IcfFormSystem =
    input.formSystem === "waffle" || input.formSystem === "screen"
      ? input.formSystem
      : "flat";
  const foamThicknessMm = Math.max(
    25,
    Math.min(150, Number(input.foamThicknessPerSideMm) || 64),
  );
  const interiorLining: IcfInteriorLining =
    input.interiorLining === "none" ||
    input.interiorLining === "gypsum_15_9_type_x" ||
    input.interiorLining === "double_gypsum_12_5"
      ? input.interiorLining
      : "gypsum_12_5";
  const verticalBarsPerWeb: 1 | 2 =
    input.verticalBarsPerWeb === 2 ||
    (input.verticalBarsPerWeb === undefined && coreThicknessMm >= 200)
      ? 2
      : 1;
  const horizontalBarsPerCourse: 1 | 2 =
    input.horizontalBarsPerCourse === 2 ? 2 : 1;
  const concreteWastePct = Math.max(
    0,
    Math.min(
      25,
      input.concreteWastePercent === undefined ||
        input.concreteWastePercent === null
        ? 5
        : Number(input.concreteWastePercent) || 0,
    ),
  );

  if (wallLengthM <= 0) errors.push("Wall length must be greater than zero.");
  if (wallHeightM <= 0) errors.push("Wall height must be greater than zero.");

  // 1. Geometry
  const grossAreaM2 = wallLengthM * wallHeightM;
  let openingsAreaM2 = 0;
  let totalOpeningsCount = 0;
  let totalBuckPerimeterM = 0;
  let lintelsTensileLengthM = 0;
  let lintelsStirrupsCount = 0;

  for (const op of openings) {
    const w = Math.max(0, Number(op.widthM) || 0);
    const h = Math.max(0, Number(op.heightM) || 0);
    const count = Math.max(1, Math.floor(Number(op.count) || 1));
    const area = w * h * count;
    openingsAreaM2 += area;
    totalOpeningsCount += count;
    totalBuckPerimeterM += 2 * (w + h) * count;

    // Lintels over spans >= 0.8m require reinforced header cages
    if (w >= 0.8) {
      // 2 top + 2 bottom bars spanning width + 0.6m bearing (0.3m on each side)
      const barSpan = (w + 0.6) * 4 * count;
      lintelsTensileLengthM += barSpan;
      // Shear stirrups at 150mm centers
      const stirrupsPerOpening = Math.ceil(w / 0.15) + 1;
      lintelsStirrupsCount += stirrupsPerOpening * count;
    }
  }

  if (openingsAreaM2 >= grossAreaM2 && grossAreaM2 > 0) {
    errors.push(
      "Total window and door openings area cannot exceed or equal gross wall area.",
    );
  }

  const netWallAreaM2 = Math.max(0, grossAreaM2 - openingsAreaM2);
  const wallHeightCourses = Math.ceil(wallHeightM / ICF_BLOCK_FACE_HEIGHT_M);
  // Manufacturers place concrete in lifts of about 1.2 m (4 ft) at 3 to 4 ft/hr.
  const POUR_LIFT_M = 1.2;
  const pourLifts = Math.max(1, Math.ceil(wallHeightM / POUR_LIFT_M));
  if (wallHeightM > 4.5) {
    warnings.push(
      `A ${wallHeightM.toFixed(1)} m wall cannot be poured in one pass. It needs ${pourLifts} lifts of about ${POUR_LIFT_M} m, with the bracing and the block stacking checked at each lift.`,
    );
  }
  if (interiorLining === "none") {
    warnings.push(
      "No interior lining entered. Foam on the inside of a habitable room needs a thermal barrier, and the wall has no published fire resistance without a tested lining.",
    );
  }
  if (isBasement) {
    warnings.push(
      "EPS below grade is a termite and moisture pathway. Confirm the local termite management requirement (for example AS 3660.1, IRC R404.1.7 or SANS 10400-D) before backfill.",
    );
  }

  // 2. Block units takeoff
  const nominalBlockAreaM2 = ICF_BLOCK_FACE_AREA_M2;
  const cuttingWasteFactor = 1 + wastePct / 100;
  const grossBlocksRequired = ceilU(
    (netWallAreaM2 / nominalBlockAreaM2) * cuttingWasteFactor,
  );

  const corner90BlocksCount = corners90 * wallHeightCourses;
  const corner45BlocksCount = corners45 * wallHeightCourses;
  const tWallBlocksCount = tWalls * wallHeightCourses;
  const specializedBlocksTotal =
    corner90BlocksCount + corner45BlocksCount + tWallBlocksCount;

  // Straight blocks take up the remaining net wall face area
  const straightBlocksCount = Math.max(
    0,
    grossBlocksRequired - specializedBlocksTotal,
  );
  const totalBlocksCount = straightBlocksCount + specializedBlocksTotal;
  const cuttingWasteAllowanceM2 = Number(
    (totalBlocksCount * nominalBlockAreaM2 - netWallAreaM2).toFixed(2),
  );

  // 3. Concrete core volume & pumping
  // The cavity is not all concrete: the tie webs cross it, and a waffle or
  // screen form leaves most of it as void. The fill factor for the form family
  // is applied to the net wall area, then the pump allowance is added on top,
  // because prime and line loss are a purchasing margin, not part of the wall.
  const coreThicknessM = coreThicknessMm / 1000;
  const fillFactor = ICF_FILL_FACTORS[formSystem];
  const netConcreteVolumeM3 = netWallAreaM2 * coreThicknessM * fillFactor;
  const pumpPrimeLossM3 = Number(
    (netConcreteVolumeM3 * (concreteWastePct / 100)).toFixed(2),
  );
  const totalVolumeM3 = Number(
    (netConcreteVolumeM3 + pumpPrimeLossM3).toFixed(2),
  );

  const readyMixTrucks6M3 = ceilU(totalVolumeM3 / 6);
  const readyMixTrucks8M3 = ceilU(totalVolumeM3 / 8);

  // Site-mix equivalent from the mix design for the grade entered.
  const grade: IcfConcreteMixGrade = input.concreteGrade || "C25_30";
  const mix = ICF_MIX_DESIGN[grade];
  const waterLitresPerM3 = Math.round(mix.cementKgPerM3 * mix.waterCementRatio);
  const bagResolution = resolveCementBag(marketCode);
  const bagWeightKg = bagResolution.bagKg;
  const totalCementKg = totalVolumeM3 * mix.cementKgPerM3;
  const siteMixCementBags = ceilU(totalCementKg / bagWeightKg);
  const siteMixSandTonnes = Number(
    ((totalVolumeM3 * mix.sandKgPerM3) / 1000).toFixed(2),
  );
  const siteMixGraniteTonnes = Number(
    ((totalVolumeM3 * mix.aggregateKgPerM3) / 1000).toFixed(2),
  );
  const siteMixWaterLitres = ceilU(totalVolumeM3 * waterLitresPerM3);
  if (!bagResolution.isMarketSpecific) {
    warnings.push(
      `No cement package mass is recorded for market ${marketCode}, so the site-mix bag count assumes a ${bagWeightKg} kg bag. Enter your local bag size to correct it.`,
    );
  }

  // 4. Steel reinforcement schedule
  const rebarMassPerM = REBAR_MASS_KG_PER_M[verticalRebarSize] || 0.888;
  const stirrupMassPerM = REBAR_MASS_KG_PER_M["10M"] || 0.785;

  // Web lines around the wall. A vertical bar sits at each web line, and a
  // designer will often place two, one near each face, which is what the
  // bars-per-web choice records.
  const verticalSpacingM = verticalSpacingMm / 1000;
  const webLines = Math.ceil(wallLengthM / verticalSpacingM);
  const barsAtWebs =
    webLines * verticalBarsPerWeb + corners90 * 2 * verticalBarsPerWeb;

  // Footing starter dowels: one for every vertical bar, lapped into the wall.
  const dowelsCount = barsAtWebs;
  const dowelsTotalLengthM = Number((dowelsCount * dowelLengthM).toFixed(1));
  const dowelsTotalWeightKg = Number(
    (dowelsTotalLengthM * rebarMassPerM).toFixed(1),
  );

  // Vertical bars: full wall height plus a lap into the top bond beam.
  const verticalBarsCount = barsAtWebs;
  const verticalTotalLengthM = Number(
    (verticalBarsCount * (wallHeightM + 0.3)).toFixed(1),
  );
  const verticalTotalWeightKg = Number(
    (verticalTotalLengthM * rebarMassPerM).toFixed(1),
  );

  // Horizontal bars: one or two in each course, lapped 15% for 6 m stock runs.
  const horizontalCoursesCount =
    horizontalCourses === "every_course"
      ? wallHeightCourses
      : Math.ceil(wallHeightCourses / 2);
  const horizontalTotalLengthM = Number(
    (
      horizontalCoursesCount *
      wallLengthM *
      horizontalBarsPerCourse *
      1.15
    ).toFixed(1),
  );
  const horizontalTotalWeightKg = Number(
    (horizontalTotalLengthM * rebarMassPerM).toFixed(1),
  );

  // Lintel cages over openings: 2 top and 2 bottom bars, plus stirrups sized to
  // the core rather than a fixed perimeter.
  const stirrupPerimeterM = 2 * (coreThicknessM + 0.15) + 0.2;
  const stirrupsLengthM = lintelsStirrupsCount * stirrupPerimeterM;
  const lintelsSteelWeightKg = Number(
    (
      lintelsTensileLengthM * rebarMassPerM +
      stirrupsLengthM * stirrupMassPerM
    ).toFixed(1),
  );

  // ACI 318 requires at least two bars each side of a wall opening, running
  // past the opening to develop into the wall above and below it.
  let openingTrimBarsCount = 0;
  let openingTrimLengthM = 0;
  for (const op of openings) {
    const h = Math.max(0, Number(op.heightM) || 0);
    const count = Math.max(1, Math.floor(Number(op.count) || 1));
    const barsPerSide = 2;
    openingTrimBarsCount += barsPerSide * 2 * count;
    openingTrimLengthM += barsPerSide * 2 * count * (h + 0.6);
  }
  const openingTrimWeightKg = Number(
    (openingTrimLengthM * rebarMassPerM).toFixed(1),
  );

  const totalSteelWeightKg = Number(
    (
      dowelsTotalWeightKg +
      verticalTotalWeightKg +
      horizontalTotalWeightKg +
      lintelsSteelWeightKg +
      openingTrimWeightKg
    ).toFixed(1),
  );
  const totalSteelWeightTonnes = Number((totalSteelWeightKg / 1000).toFixed(3));
  // 1 roll of 16-gauge tie wire per 250 kg of rebar
  const tieWireRolls = ceilU(totalSteelWeightKg / 250);

  // 5. Bracing & Alignment System
  // Alignment bracing at 1.8 m centres (manufacturers publish 4 to 6 ft, 7 ft
  // maximum), plus a brace set back about 700 mm from each corner so the
  // strongback clears the corner block.
  const BRACE_SPACING_M = 1.8;
  const turnbuckleAlignmentJacks =
    ceilU(wallLengthM / BRACE_SPACING_M) + corners90 * 2 + corners45;
  const catwalkScaffoldBrackets = turnbuckleAlignmentJacks;
  // 2 anchor screws into footing/slab per turnbuckle jack foot plate
  const concreteAnchorBolts = turnbuckleAlignmentJacks * 2;

  // 6. Openings & Bucking
  // 1 can of low-expansion polyurethane foam per 7 meters of buck perimeter
  const polyurethaneFoamCans = ceilU(totalBuckPerimeterM / 7);

  // 7. Envelope Scorecard
  // The wall is a stack of resistances: foam on each face, the concrete core,
  // the interior lining and the exterior finish. It is calculated from the
  // thicknesses entered so a different foam thickness gives a different answer,
  // instead of a figure fixed in the source.
  const R_PER_INCH_TO_RSI = 0.1761;
  const foamRsi =
    2 *
    (foamThicknessMm / 25.4) *
    ICF_FOAM_R_PER_INCH[foamType] *
    R_PER_INCH_TO_RSI;
  const concreteRsi = coreThicknessM / 1.4; // λ ≈ 1.4 W/(m·K) for normal-weight concrete
  const liningRsi =
    interiorLining === "none"
      ? 0
      : interiorLining === "gypsum_12_5"
        ? 0.08
        : interiorLining === "gypsum_15_9_type_x"
          ? 0.1
          : 0.16;
  const exteriorFinishRsi = 0.03;
  const totalRsi = foamRsi + concreteRsi + liningRsi + exteriorFinishRsi;
  const metricRsiValue = Number(totalRsi.toFixed(2));
  const continuousRValueImperial = Number(
    (totalRsi / R_PER_INCH_TO_RSI).toFixed(1),
  );
  const thermalTransmittanceUValue = Number((1 / totalRsi).toFixed(3));
  const rValueBasis =
    `${foamThicknessMm} mm ${foamType === "graphite_neopor" ? "graphite EPS" : "EPS"} each face at ` +
    `${ICF_FOAM_R_PER_INCH[foamType]} R per inch, plus the ${coreThicknessMm} mm concrete core, ` +
    `the interior lining and an exterior finish. A tested assembly value from the product listing supersedes it.`;

  // Sound: the mass of the core and the lining do the work. Published ICF
  // assemblies land in a band, so the figure is reported as indicative.
  const acousticStcRating =
    coreThicknessMm <= 100
      ? 48
      : coreThicknessMm <= 150
        ? 50
        : coreThicknessMm <= 200
          ? 53
          : 55;
  const acousticBasis =
    "Indicative Sound Transmission Class for an ICF wall of this core with a lined interior. The tested assembly for the product you buy governs.";

  // Fire: the lining is what buys the hours, so it is the input that decides.
  const fireResistanceHours = ICF_FIRE_HOURS_BY_LINING[interiorLining];
  const fireBasis =
    interiorLining === "none"
      ? "No lining entered, so no published fire resistance is claimed. Untreated foam needs a thermal barrier on the interior of a habitable space."
      : `Minimum published fire resistance for ICF assemblies with this lining under ASTM E119 / CAN/ULC S101 / EN 1365. The tested listing for the product you buy governs.`;

  // 8. Direct Fasteners
  // Embedded plastic webs are spaced at 150mm - 200mm centers.
  // Coarse-thread drywall screws: approx 12 screws per square meter for drywall installation
  const drywallScrewsCount = ceilU(netWallAreaM2 * 12);
  const claddingFastenersCount = ceilU(netWallAreaM2 * 10);

  // 9. Below-grade Waterproofing (Basement option)
  let waterproofing: IcfWallResult["waterproofing"];
  if (isBasement) {
    waterproofing = {
      peelAndStickMembraneM2: Number((netWallAreaM2 * 1.1).toFixed(1)),
      dimpleDrainageBoardM2: Number((netWallAreaM2 * 1.08).toFixed(1)),
      terminationBarM: Number((wallLengthM * 1.05).toFixed(1)),
    };
  }

  // 10. Labor & Man-Hours
  // Experienced ICF installation rates:
  // - Stacking forms & interlocking: 0.35 man-hrs / m²
  // - Rebar insertion, tying & buck placement: 0.20 man-hrs / m²
  // - Bracing setup, plumbing & alignment: 0.10 man-hrs / m²
  // - Pouring, pencil vibration consolidation & screeding: 0.15 man-hrs / m²
  const stackingManHours = Number((netWallAreaM2 * 0.35).toFixed(1));
  const rebarBuckingManHours = Number((netWallAreaM2 * 0.2).toFixed(1));
  const bracingManHours = Number((netWallAreaM2 * 0.1).toFixed(1));
  const pourConsolidationManHours = Number((netWallAreaM2 * 0.15).toFixed(1));
  const totalManHours = Number(
    (
      stackingManHours +
      rebarBuckingManHours +
      bracingManHours +
      pourConsolidationManHours
    ).toFixed(1),
  );
  const estimatedCrewDays = Number((totalManHours / (crewSize * 8)).toFixed(1));

  // Comparison: Traditional CMU/blockwork (laying blocks, mortar, lintels, plaster, and separate insulation) ~1.4 man-hrs/m²
  const traditionalBlockworkManHoursComparison = Number(
    (netWallAreaM2 * 1.4).toFixed(1),
  );
  const laborSavingsPercentage =
    traditionalBlockworkManHoursComparison > 0
      ? Math.round(
          ((traditionalBlockworkManHoursComparison - totalManHours) /
            traditionalBlockworkManHoursComparison) *
            100,
        )
      : 45;

  // 11. Bill of Quantities (BOQ)
  const boq: IcfBoqItem[] = [
    {
      code: "ICF-BLK-STR",
      description: `Straight ICF form blocks (${coreThicknessMm}mm concrete core, 1200mm x 400mm)`,
      category: "formwork",
      quantity: straightBlocksCount,
      unit: "units",
      notes: `${nominalBlockAreaM2} m² face area per block`,
    },
    {
      code: "ICF-BLK-CNR90",
      description: `90° Corner ICF form blocks (${coreThicknessMm}mm core, interlocking left/right pairs)`,
      category: "formwork",
      quantity: corner90BlocksCount,
      unit: "units",
      notes: `${corners90} corners x ${wallHeightCourses} courses`,
    },
  ];

  if (corner45BlocksCount > 0) {
    boq.push({
      code: "ICF-BLK-CNR45",
      description: `45° Splay corner ICF form blocks (${coreThicknessMm}mm core)`,
      category: "formwork",
      quantity: corner45BlocksCount,
      unit: "units",
      notes: `${corners45} splay corners x ${wallHeightCourses} courses`,
    });
  }

  if (tWallBlocksCount > 0) {
    boq.push({
      code: "ICF-BLK-TWALL",
      description: `T-Wall intersection ICF blocks (${coreThicknessMm}mm core)`,
      category: "formwork",
      quantity: tWallBlocksCount,
      unit: "units",
      notes: `${tWalls} T-junctions x ${wallHeightCourses} courses`,
    });
  }

  boq.push(
    {
      code: "CONC-ICF-PUMP",
      description: `Ready-mix concrete (${grade}, 10mm pea-gravel mix, 140 to 180mm slump)`,
      category: "concrete",
      quantity: totalVolumeM3,
      unit: "m³",
      notes: `Net core ${Number(netConcreteVolumeM3.toFixed(2))} m³ at a ${(fillFactor * 100).toFixed(0)}% ${formSystem} fill factor, plus ${pumpPrimeLossM3} m³ pump prime and line loss`,
    },
    {
      code: "STL-REBAR-DOWEL",
      description: `Footing starter dowels (${verticalRebarSize} rebar, ${dowelLengthM}m length)`,
      category: "reinforcement",
      quantity: dowelsCount,
      unit: "bars",
      notes: `${dowelsTotalLengthM}m total (${dowelsTotalWeightKg} kg)`,
    },
    {
      code: "STL-REBAR-VERT",
      description: `Vertical rebar grid (${verticalRebarSize} rebar at ${verticalSpacingMm}mm centers)`,
      category: "reinforcement",
      quantity: verticalBarsCount,
      unit: "bars",
      notes: `${verticalTotalLengthM}m total (${verticalTotalWeightKg} kg)`,
    },
    {
      code: "STL-REBAR-HORIZ",
      description: `Horizontal rebar courses (${verticalRebarSize} rebar, ${horizontalCourses === "every_course" ? "400mm" : "800mm"} spacing)`,
      category: "reinforcement",
      quantity: horizontalCoursesCount,
      unit: "courses",
      notes: `${horizontalTotalLengthM}m total (${horizontalTotalWeightKg} kg)`,
    },
  );

  if (lintelsTensileLengthM > 0) {
    boq.push({
      code: "STL-REBAR-LINTEL",
      description: `Reinforced lintel header steel cages & stirrups over door/window spans`,
      category: "reinforcement",
      quantity: ceilU(lintelsTensileLengthM),
      unit: "m",
      notes: `${lintelsStirrupsCount} shear stirrups included (${lintelsSteelWeightKg} kg)`,
    });
  }

  boq.push(
    {
      code: "BRC-JACK-TURN",
      description:
        "Turnbuckle wall alignment jacks & vertical strongbacks (rental or purchase)",
      category: "bracing",
      quantity: turnbuckleAlignmentJacks,
      unit: "sets",
      notes: `Placed at ${BRACE_SPACING_M} m centres plus a pair at each corner, set back about 700 mm`,
    },
    {
      code: "BRC-SCAF-BRKT",
      description: "Catwalk scaffolding walkboard brackets",
      category: "bracing",
      quantity: catwalkScaffoldBrackets,
      unit: "brackets",
      notes: "Integrated with turnbuckle jacks for safe pour access",
    },
  );

  if (totalBuckPerimeterM > 0) {
    boq.push(
      {
        code: "OPN-BUCK-LIN",
        description: `Treated timber or vinyl rough opening bucking (${coreThicknessMm}mm core width)`,
        category: "openings",
        quantity: ceilU(totalBuckPerimeterM * 1.1),
        unit: "m",
        notes: `Covers ${totalOpeningsCount} door and window rough openings`,
      },
      {
        code: "OPN-FOAM-SEAL",
        description: "Low-expansion polyurethane gun foam sealant cans",
        category: "openings",
        quantity: polyurethaneFoamCans,
        unit: "cans",
        notes: "Airtight seal around buck-to-foam perimeter",
      },
    );
  }

  if (waterproofing) {
    boq.push(
      {
        code: "WTR-MEMBRANE-ICF",
        description:
          "Self-adhered elastomeric peel-and-stick waterproofing membrane for below-grade ICF",
        category: "envelope",
        quantity: waterproofing.peelAndStickMembraneM2,
        unit: "m²",
        notes: "Directly adhered to exterior EPS foam face",
      },
      {
        code: "WTR-DIMPLE-DRAIN",
        description: "High-density polyethylene (HDPE) dimple drainage board",
        category: "envelope",
        quantity: waterproofing.dimpleDrainageBoardM2,
        unit: "m²",
        notes:
          "Protects membrane from backfill puncture and relieves hydrostatic pressure",
      },
    );
  }

  boq.push(
    {
      code: "FST-DRYWALL-SCREW",
      description:
        'Coarse-thread bugle-head drywall screws (1-5/8" / 41mm for web fastening)',
      category: "envelope",
      quantity: drywallScrewsCount,
      unit: "screws",
      notes:
        "Anchored into embedded plastic fastening ties at 150mm/200mm centers",
    },
    {
      code: "LBR-ICF-INSTALL",
      description:
        "Total ICF assembly labor (stacking, rebar, bucking, bracing, pour & vibrate)",
      category: "labor",
      quantity: totalManHours,
      unit: "man-hours",
      notes: `Approx ${estimatedCrewDays} working days for a crew of ${crewSize} installers`,
    },
  );

  // 12. Code Citations
  // The market decides which framework leads. The rest stay visible as the
  // reference set, because a designer working across markets needs to see them.
  const jurisdiction = getStructuralJurisdictionScope(marketCode);
  const leadingFrame: Record<string, { code: string; clause: string }> = {
    US: {
      code: "IRC R608 / IBC Ch. 19 & 26, ACI 318-19, ACI 560.2R",
      clause:
        "Prescriptive ICF walls, minimum reinforcement and the thermal barrier over interior foam.",
    },
    CA: {
      code: "NBC Part 9 (9.20) / CSA A23.3, CAN/ULC-S717.1",
      clause:
        "ICF unit standard, basement lateral soil design and moisture protection.",
    },
    GB: {
      code: "Eurocode 2 (EN 1992-1-1), EAD/ETAG 009, BBA certificates",
      clause:
        "Concrete core design, CE/UKCA marking of the ICF kit and Part L energy compliance.",
    },
    AU: {
      code: "AS 3600:2018, AS 2870, AS 3660.1",
      clause:
        "Concrete walls, residential slabs and footings, and termite management around foam.",
    },
    NZ: {
      code: "NZS 3101, NZS 3604, NZS 3602",
      clause:
        "Concrete design and the timber and moisture provisions around an ICF envelope.",
    },
    ZA: {
      code: "SANS 10400 (Parts B, C, D, K), SANS 10100",
      clause:
        "Structural design, moisture and termite provisions for foam at ground level.",
    },
    IN: {
      code: "IS 456:2000, IS 13920, NBC India Part 6",
      clause:
        "Plain and reinforced concrete, ductile detailing and structural use provisions.",
    },
    NG: {
      code: "BS 8110 / Eurocode 2 practice, NIS building code",
      clause:
        "Reinforced concrete wall design as adopted locally, plus state planning requirements.",
    },
    AE: {
      code: "Dubai Building Code / Abu Dhabi International Building Code, BS EN 1992",
      clause:
        "Concrete design and envelope energy requirements for the emirate.",
    },
    SA: {
      code: "Saudi Building Code SBC 304 / SBC 601",
      clause: "Concrete structures and energy conservation provisions.",
    },
    BR: {
      code: "ABNT NBR 6118, NBR 15220",
      clause: "Concrete design and the thermal performance of the envelope.",
    },
    JP: {
      code: "AIJ standards, Building Standard Law",
      clause: "Reinforced concrete design and fire prevention provisions.",
    },
  };
  const frame = leadingFrame[marketCode];
  const codeCitations = [
    ...(frame
      ? [
          {
            jurisdiction: jurisdiction?.country || marketCode,
            code: frame.code,
            clause: frame.clause,
            summary: `The framework that leads for the market you selected (${marketCode}). Local editions, amendments and municipal requirements are confirmed by a licensed engineer in that market.`,
          },
        ]
      : [
          {
            jurisdiction: jurisdiction?.country || marketCode,
            code: jurisdiction?.framework || "Local building regulations",
            clause: jurisdiction?.sourceLabel || "National building authority",
            summary: `No ICF-specific framework is recorded for ${marketCode}, so the page states the local framework and leaves the edition to be confirmed locally.`,
          },
        ]),
    {
      jurisdiction: "United States / International",
      code: "ACI 560.2R-16, IRC R608, ACI 318-19",
      clause:
        "Guide to ICF walls, prescriptive reinforcement and the 15-minute thermal barrier",
      summary:
        "Covers flat ICF wall construction, the bracing needed during the pour, minimum reinforcement and the thermal barrier over interior foam.",
    },
    {
      jurisdiction: "Canada",
      code: "NBC 2020 Part 9, CAN/ULC-S717.1, CSA A23.3",
      clause: "Sections 9.15 and 9.20, ICF unit standard, concrete design",
      summary:
        "Governs ICF unit performance, basement lateral soil pressure and moisture protection.",
    },
    {
      jurisdiction: "United Kingdom and Europe",
      code: "Eurocode 2 (EN 1992-1-1), EAD/ETAG 009, EN 1365",
      clause: "Concrete design, ICF kits, fire resistance of loadbearing walls",
      summary:
        "Design of the concrete core, CE/UKCA marking of the form kit, and the fire test that a rated assembly is listed against.",
    },
    {
      jurisdiction: "Australia and New Zealand",
      code: "AS 3600:2018, AS 2870, AS 3660.1",
      clause: "Section 11 concrete walls, footings, termite management",
      summary:
        "Minimum core for loadbearing walls, cover, and the physical or chemical termite barrier that foam at ground level requires.",
    },
    {
      jurisdiction: "Fire and acoustics (all markets)",
      code: "ASTM E119 / UL 263, CAN/ULC S101, EN 1365, ASTM E90 / ISO 10140",
      clause: "Tested assembly ratings",
      summary:
        "A fire resistance rating or a sound rating belongs to a tested assembly. The lining entered decides the hours, and the listing for the product you buy decides whether the assembly is rated at all.",
    },
  ];

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    geometry: {
      grossAreaM2: Number(grossAreaM2.toFixed(2)),
      openingsAreaM2: Number(openingsAreaM2.toFixed(2)),
      netWallAreaM2: Number(netWallAreaM2.toFixed(2)),
      wallHeightCourses,
      effectivePerimeterM: wallLengthM,
      pourLifts,
    },
    blocks: {
      straightBlocksCount,
      corner90BlocksCount,
      corner45BlocksCount,
      tWallBlocksCount,
      totalBlocksCount,
      nominalBlockAreaM2,
      cuttingWasteAllowanceM2,
    },
    concrete: {
      coreThicknessMm,
      formSystem,
      fillFactor,
      netVolumeM3: Number(netConcreteVolumeM3.toFixed(2)),
      pumpPrimeLossM3,
      totalVolumeM3,
      readyMixTrucks6M3,
      readyMixTrucks8M3,
      siteMixCementBags,
      siteMixSandTonnes,
      siteMixGraniteTonnes,
      siteMixWaterLitres,
      maxPourLiftRateMPerHour: 1.2, // max 1.2 m/hr (4 ft/hr) to avoid blowout
      recommendedSlumpMm: "140 - 180 mm (high-flow pea gravel mix)",
      aggregateSizeMaxMm: 10, // 3/8" pea gravel
      mixDesign: {
        grade,
        cementKgPerM3: mix.cementKgPerM3,
        waterCementRatio: mix.waterCementRatio,
        waterLitresPerM3,
        sandKgPerM3: mix.sandKgPerM3,
        aggregateKgPerM3: mix.aggregateKgPerM3,
        note: "Typical proportions for the grade entered, not a laboratory mix design. The ready-mix supplier's mix design governs the order.",
      },
    },
    reinforcement: {
      verticalBarsCount,
      verticalTotalLengthM,
      verticalTotalWeightKg,
      horizontalCoursesCount,
      horizontalTotalLengthM,
      horizontalTotalWeightKg,
      dowelsCount,
      dowelsTotalLengthM,
      dowelsTotalWeightKg,
      lintelsTensileLengthM,
      lintelsStirrupsCount,
      lintelsSteelWeightKg,
      openingTrimBarsCount,
      openingTrimWeightKg,
      totalSteelWeightKg,
      totalSteelWeightTonnes,
      tieWireRolls,
    },
    bracing: {
      turnbuckleAlignmentJacks,
      catwalkScaffoldBrackets,
      concreteAnchorBolts,
      recommendedJackSpacingM: BRACE_SPACING_M,
    },
    openings: {
      totalOpeningsCount,
      totalBuckPerimeterM: Number(totalBuckPerimeterM.toFixed(1)),
      polyurethaneFoamCans,
    },
    envelope: {
      foamType,
      foamThicknessMm,
      continuousRValueImperial,
      metricRsiValue,
      thermalTransmittanceUValue,
      rValueBasis,
      acousticStcRating,
      acousticBasis,
      fireResistanceHours,
      fireBasis,
      interiorLining,
      thermalBarrierRequirement:
        "A 15-minute thermal barrier (typically 12.5 mm gypsum board) is required over foam on the interior of a habitable space. The lining entered above is what the fire figure is based on.",
    },
    fasteners: {
      drywallScrewsCount,
      claddingFastenersCount,
    },
    waterproofing,
    labor: {
      stackingManHours,
      rebarBuckingManHours,
      bracingManHours,
      pourConsolidationManHours,
      totalManHours,
      estimatedCrewDays,
      traditionalBlockworkManHoursComparison,
      laborSavingsPercentage,
    },
    boq,
    codeCitations,
  };
}
