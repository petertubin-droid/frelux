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

export type IcfCoreThicknessMm = 100 | 150 | 200 | 250 | 300;
export type IcfFoamType = "standard_eps" | "graphite_neopor";
export type IcfRebarSize = "10M" | "12M" | "16M" | "20M" | "no4" | "no5" | "no6";
export type IcfVerticalSpacingMm = 400 | 600;
export type IcfHorizontalCourses = "every_course" | "every_second_course";
export type IcfConcreteMixGrade = "C20_25" | "C25_30" | "C30_37";

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
}

export interface IcfBoqItem {
  code: string;
  description: string;
  category: "formwork" | "concrete" | "reinforcement" | "bracing" | "openings" | "envelope" | "labor";
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
    acousticStcRating: number;
    fireResistanceHours: number;
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
export const ICF_BLOCK_FACE_AREA_M2 = ICF_BLOCK_FACE_LENGTH_M * ICF_BLOCK_FACE_HEIGHT_M; // 0.48 m²

/** Rebar mass per meter for standard bar sizes. */
export const REBAR_MASS_KG_PER_M: Record<IcfRebarSize, number> = {
  "10M": 0.785, // 11.3mm nominal
  "12M": 0.888, // 12mm nominal
  "16M": 1.578, // 16mm nominal
  "20M": 2.466, // 20mm nominal
  "no4": 0.994, // US #4 (1/2")
  "no5": 1.552, // US #5 (5/8")
  "no6": 2.235, // US #6 (3/4")
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
  const foamType: IcfFoamType = input.foamType === "graphite_neopor" ? "graphite_neopor" : "standard_eps";
  const openings = input.openings || [];
  const corners90 = Math.max(0, input.corners90Count ?? 4);
  const corners45 = Math.max(0, input.corners45Count ?? 0);
  const tWalls = Math.max(0, input.tWallsCount ?? 0);
  const verticalRebarSize: IcfRebarSize = input.verticalRebarSize || "12M";
  const verticalSpacingMm: IcfVerticalSpacingMm = input.verticalRebarSpacingMm || 400;
  const horizontalCourses: IcfHorizontalCourses = input.horizontalRebarCourses || "every_course";
  const dowelLengthM = Math.max(0.4, Number(input.dowelLengthM) || 0.75);
  const wastePct = Math.max(0, Math.min(25, Number(input.wasteFactorPercent) || 4));
  const isBasement = Boolean(input.isBasement);
  const marketCode = (input.marketCode || "US").toUpperCase();
  const crewSize = Math.max(1, Number(input.laborCrewSize) || 4);

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
    errors.push("Total window and door openings area cannot exceed or equal gross wall area.");
  }

  const netWallAreaM2 = Math.max(0, grossAreaM2 - openingsAreaM2);
  const wallHeightCourses = Math.ceil(wallHeightM / ICF_BLOCK_FACE_HEIGHT_M);

  // 2. Block units takeoff
  const nominalBlockAreaM2 = ICF_BLOCK_FACE_AREA_M2;
  const cuttingWasteFactor = 1 + wastePct / 100;
  const grossBlocksRequired = ceilU((netWallAreaM2 / nominalBlockAreaM2) * cuttingWasteFactor);

  const corner90BlocksCount = corners90 * wallHeightCourses;
  const corner45BlocksCount = corners45 * wallHeightCourses;
  const tWallBlocksCount = tWalls * wallHeightCourses;
  const specializedBlocksTotal = corner90BlocksCount + corner45BlocksCount + tWallBlocksCount;

  // Straight blocks take up the remaining net wall face area
  const straightBlocksCount = Math.max(0, grossBlocksRequired - specializedBlocksTotal);
  const totalBlocksCount = straightBlocksCount + specializedBlocksTotal;
  const cuttingWasteAllowanceM2 = Number(((totalBlocksCount * nominalBlockAreaM2) - netWallAreaM2).toFixed(2));

  // 3. Concrete core volume & pumping
  // Internal polypropylene webs displace approximately 1.5% of the core cavity volume.
  const coreThicknessM = coreThicknessMm / 1000;
  const webDisplacementFactor = 0.985;
  const netConcreteVolumeM3 = netWallAreaM2 * coreThicknessM * webDisplacementFactor;
  // Extra allowance for pump hopper prime, line loss, and over-pour
  const pumpPrimeLossM3 = Number((netConcreteVolumeM3 * (wastePct / 100)).toFixed(2));
  const totalVolumeM3 = Number((netConcreteVolumeM3 + pumpPrimeLossM3).toFixed(2));

  const readyMixTrucks6M3 = ceilU(totalVolumeM3 / 6);
  const readyMixTrucks8M3 = ceilU(totalVolumeM3 / 8);

  // Site-mix equivalent breakdown: 25MPa pea-gravel mix (approx 350 kg cement/m³, 800 kg sand/m³, 1150 kg aggregate/m³)
  const bagResolution = resolveCementBag(marketCode);
  const bagWeightKg = bagResolution.bagKg;
  const totalCementKg = totalVolumeM3 * 350;
  const siteMixCementBags = ceilU(totalCementKg / bagWeightKg);
  const siteMixSandTonnes = Number(((totalVolumeM3 * 800) / 1000).toFixed(2));
  const siteMixGraniteTonnes = Number(((totalVolumeM3 * 1150) / 1000).toFixed(2));
  const siteMixWaterLitres = ceilU(totalVolumeM3 * 175);

  // 4. Steel reinforcement schedule
  const rebarMassPerM = REBAR_MASS_KG_PER_M[verticalRebarSize] || 0.888;
  const stirrupMassPerM = REBAR_MASS_KG_PER_M["10M"] || 0.785;

  // Footing starter dowels: one for every vertical bar + 2 extra at each corner
  const verticalSpacingM = verticalSpacingMm / 1000;
  const perimeterBarRuns = Math.ceil(wallLengthM / verticalSpacingM);
  const dowelsCount = perimeterBarRuns + (corners90 * 2);
  const dowelsTotalLengthM = Number((dowelsCount * dowelLengthM).toFixed(1));
  const dowelsTotalWeightKg = Number((dowelsTotalLengthM * rebarMassPerM).toFixed(1));

  // Vertical bars: span full wall height + 0.3m lap/hook into top bond beam
  const verticalBarsCount = dowelsCount;
  const verticalTotalLengthM = Number((verticalBarsCount * (wallHeightM + 0.3)).toFixed(1));
  const verticalTotalWeightKg = Number((verticalTotalLengthM * rebarMassPerM).toFixed(1));

  // Horizontal bars: placed in web saddles every course (400mm) or every second course (800mm)
  const horizontalCoursesCount = horizontalCourses === "every_course"
    ? wallHeightCourses
    : Math.ceil(wallHeightCourses / 2);
  // Lap splices: 48 bar diameters lap every 6m bar run (~15% extra length)
  const horizontalTotalLengthM = Number((horizontalCoursesCount * wallLengthM * 1.15).toFixed(1));
  const horizontalTotalWeightKg = Number((horizontalTotalLengthM * rebarMassPerM).toFixed(1));

  // Lintel tensile bars + stirrups (assuming 1.1m stirrup perimeter around core)
  const stirrupsLengthM = lintelsStirrupsCount * 1.1;
  const lintelsSteelWeightKg = Number((
    (lintelsTensileLengthM * rebarMassPerM) +
    (stirrupsLengthM * stirrupMassPerM)
  ).toFixed(1));

  const totalSteelWeightKg = Number((
    dowelsTotalWeightKg +
    verticalTotalWeightKg +
    horizontalTotalWeightKg +
    lintelsSteelWeightKg
  ).toFixed(1));
  const totalSteelWeightTonnes = Number((totalSteelWeightKg / 1000).toFixed(3));
  // 1 roll of 16-gauge tie wire per 250 kg of rebar
  const tieWireRolls = ceilU(totalSteelWeightKg / 250);

  // 5. Bracing & Alignment System
  // Strongback upright turnbuckle jacks placed every 2.0 meters along perimeter + 1 within 600mm of each corner
  const turnbuckleAlignmentJacks = ceilU(wallLengthM / 2.0) + (corners90 * 2) + corners45;
  const catwalkScaffoldBrackets = turnbuckleAlignmentJacks;
  // 2 anchor screws into footing/slab per turnbuckle jack foot plate
  const concreteAnchorBolts = turnbuckleAlignmentJacks * 2;

  // 6. Openings & Bucking
  // 1 can of low-expansion polyurethane foam per 7 meters of buck perimeter
  const polyurethaneFoamCans = ceilU(totalBuckPerimeterM / 7);

  // 7. Envelope Scorecard
  // Continuous insulation: 2x 64mm EPS = 128mm continuous foam
  const foamThicknessMm = 128;
  let continuousRValueImperial = 22.0;
  let metricRsiValue = 3.87;
  let thermalTransmittanceUValue = 0.258;

  if (foamType === "graphite_neopor") {
    continuousRValueImperial = 28.5;
    metricRsiValue = 5.02;
    thermalTransmittanceUValue = 0.199;
  }

  // Acoustic & Fire rating per core thickness
  let acousticStcRating = 51;
  let fireResistanceHours = 2.0;
  if (coreThicknessMm === 100) {
    acousticStcRating = 48;
    fireResistanceHours = 1.5;
  } else if (coreThicknessMm === 150) {
    acousticStcRating = 53;
    fireResistanceHours = 2.0;
  } else if (coreThicknessMm === 200) {
    acousticStcRating = 56;
    fireResistanceHours = 3.0;
  } else if (coreThicknessMm >= 250) {
    acousticStcRating = 58;
    fireResistanceHours = 4.0;
  }

  // 8. Direct Fasteners
  // Embedded plastic webs are spaced at 150mm - 200mm centers.
  // Coarse-thread drywall screws: approx 12 screws per square meter for drywall installation
  const drywallScrewsCount = ceilU(netWallAreaM2 * 12);
  const claddingFastenersCount = ceilU(netWallAreaM2 * 10);

  // 9. Below-grade Waterproofing (Basement option)
  let waterproofing: IcfWallResult["waterproofing"];
  if (isBasement) {
    waterproofing = {
      peelAndStickMembraneM2: Number((netWallAreaM2 * 1.10).toFixed(1)),
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
  const rebarBuckingManHours = Number((netWallAreaM2 * 0.20).toFixed(1));
  const bracingManHours = Number((netWallAreaM2 * 0.10).toFixed(1));
  const pourConsolidationManHours = Number((netWallAreaM2 * 0.15).toFixed(1));
  const totalManHours = Number((stackingManHours + rebarBuckingManHours + bracingManHours + pourConsolidationManHours).toFixed(1));
  const estimatedCrewDays = Number((totalManHours / (crewSize * 8)).toFixed(1));

  // Comparison: Traditional CMU/blockwork (laying blocks, mortar, lintels, plaster, and separate insulation) ~1.4 man-hrs/m²
  const traditionalBlockworkManHoursComparison = Number((netWallAreaM2 * 1.4).toFixed(1));
  const laborSavingsPercentage = traditionalBlockworkManHoursComparison > 0
    ? Math.round(((traditionalBlockworkManHoursComparison - totalManHours) / traditionalBlockworkManHoursComparison) * 100)
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
      description: `Ready-mix concrete (${input.concreteGrade || "C25_30"}, 10mm pea-gravel mix, 150mm slump)`,
      category: "concrete",
      quantity: totalVolumeM3,
      unit: "m³",
      notes: `Includes ${pumpPrimeLossM3} m³ pump hopper & prime allowance`,
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
      description: "Turnbuckle wall alignment jacks & vertical strongbacks (rental or purchase)",
      category: "bracing",
      quantity: turnbuckleAlignmentJacks,
      unit: "sets",
      notes: "Placed every 2.0m along perimeter + 1 at each corner",
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
        description: "Self-adhered elastomeric peel-and-stick waterproofing membrane for below-grade ICF",
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
        notes: "Protects membrane from backfill puncture and relieves hydrostatic pressure",
      },
    );
  }

  boq.push(
    {
      code: "FST-DRYWALL-SCREW",
      description: "Coarse-thread bugle-head drywall screws (1-5/8\" / 41mm for web fastening)",
      category: "envelope",
      quantity: drywallScrewsCount,
      unit: "screws",
      notes: "Anchored into embedded plastic fastening ties at 150mm/200mm centers",
    },
    {
      code: "LBR-ICF-INSTALL",
      description: "Total ICF assembly labor (stacking, rebar, bucking, bracing, pour & vibrate)",
      category: "labor",
      quantity: totalManHours,
      unit: "man-hours",
      notes: `Approx ${estimatedCrewDays} working days for a crew of ${crewSize} installers`,
    },
  );

  // 12. Code Citations
  const codeCitations = [
    {
      jurisdiction: "United States / International",
      code: "IRC 2024 / IBC Ch. 19 & 26",
      clause: "Section R608 (Exterior Concrete Walls) & Sec. R404.1.2",
      summary: "Prescriptive provisions for flat ICF walls, rebar lintel schedules, and mandatory 15-minute thermal barrier (1/2\" gypsum board) covering EPS foam on interior faces.",
    },
    {
      jurisdiction: "United States (Structural)",
      code: "ACI 318-19 / ACI 332",
      clause: "ACI 318 Chapter 11 (Walls) & ACI 332 (Residential Concrete)",
      summary: "Governs core shear, axial load capacity, minimum reinforcement ratios, and bar development lap lengths in cast-in-place concrete walls.",
    },
    {
      jurisdiction: "Canada",
      code: "National Building Code (NBC) 2020",
      clause: "Part 9 Sections 9.15 (Footings) & 9.20 (Insulated Concrete)",
      summary: "Standards CAN/ULC-S717.1 for flat wall ICF units, mandatory lateral soil pressure design for basements, and moisture protection.",
    },
    {
      jurisdiction: "United Kingdom & Europe",
      code: "Eurocode 2 / EOTA ETAG 009",
      clause: "EN 1992-1-1 (EC2) & ETAG 009 Non-loadbearing permanent shuttering",
      summary: "Design of concrete core for flexure and shear, CE/UKCA marking, BBA compliance, and Part L energy conservation compliance.",
    },
    {
      jurisdiction: "Australia & New Zealand",
      code: "AS 3600:2018 / AS 2870",
      clause: "Section 11 (Concrete Walls) & NCC Termite Management AS 3660",
      summary: "Minimum 150mm core for residential load-bearing walls, cover requirements, and mandatory physical or chemical termite barriers for foam penetrating ground level.",
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
      totalSteelWeightKg,
      totalSteelWeightTonnes,
      tieWireRolls,
    },
    bracing: {
      turnbuckleAlignmentJacks,
      catwalkScaffoldBrackets,
      concreteAnchorBolts,
      recommendedJackSpacingM: 2.0,
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
      acousticStcRating,
      fireResistanceHours,
      thermalBarrierRequirement: "Mandatory 12.5mm (1/2\") Type X gypsum drywall or approved 15-minute thermal barrier on all interior living spaces.",
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
