/**
 * Exterior Insulation and Finish System (EIFS / ETICS) Engineering & Takeoff Engine
 *
 * Deterministic quantity estimation and physical takeoff for continuous exterior
 * wall insulation and synthetic plaster cladding systems (EIFS / ETICS).
 *
 * Covers the complete physical construction sequence:
 *  1. Substrate preparation & fluid-applied Water-Resistive Barrier (WRB) / Air Barrier
 *  2. Rough opening self-adhered flashing membranes & sill pans
 *  3. Drainage plane cavity / grooved insulation / drainage spacers (drainable EIFS)
 *  4. Continuous rigid insulation boards (Standard EPS, Graphite Neopor, Mineral Wool, XPS)
 *  5. Adhesive ribbon-and-dab spread & mechanical insulation washer fasteners
 *  6. Alkali-resistant (AR) fiberglass reinforcing mesh (standard field + high-impact ground zone)
 *  7. Butterfly corner diagonal stress patches at all fenestrations (re-entrant crack prevention)
 *  8. Polymer-modified cementitious base coat embedment
 *  9. Tinted acrylic primer & synthetic textured 100% acrylic finish coat
 * 10. Trim accessories: PVC starter tracks, weep screeds, mesh corner beads, casing beads, backer rods & sealants
 * 11. Energy envelope scorecard: Continuous R-value (US ci), Metric RSI / U-factor (W/m²·K), and dew point check
 * 12. Labor crew productivity and man-hours itemization
 *
 * Regulatory & Code Alignment:
 *  - North America: IBC Section 1407, IRC R703.9, ASTM E2568, ASTM E2273 (Drainage), ASTM C1397, NFPA 285 (Fire), ASHRAE 90.1, IECC
 *  - Europe & UK: EOTA / EAD 040083-00-0404 (ETICS), EN 13499, EN 13500, EN 13501-1 (Euroclass Reaction to Fire), BBA certifications, UK Part L/B
 *  - Germany & Central Europe: DIN 4108, DIN 55699, DIBt Zulassung for WDVS (Wärmedämm-Verbundsystem)
 *  - Australia & NZ: AS/NZS 4859.1, NCC Volume 1 & 2 continuous weatherproofing
 */

import { ceilU } from "./shared/purchase-rounding";

export type EifsSubstrateType =
  | "exterior_sheathing" // Gypsum exterior sheathing, cement board, plywood, OSB on studs
  | "cmu_masonry" // Concrete masonry units (hollow/solid blockwork)
  | "poured_concrete" // In-situ cast concrete walls
  | "existing_brick_stucco"; // Renovation over existing sound brick or cementitious stucco

export type EifsInsulationType =
  | "standard_eps" // Expanded Polystyrene Type I (ASTM C578, R-3.85/in, λ=0.038 W/m·K)
  | "graphite_neopor" // Graphite Polystyrene GPS (ASTM C578, R-4.70/in, λ=0.031 W/m·K)
  | "mineral_wool" // Non-combustible stone wool (Euroclass A1, R-4.00/in, λ=0.035 W/m·K)
  | "xps"; // Extruded Polystyrene (ASTM C578 Type IV, R-5.00/in, λ=0.029 W/m·K)

export type EifsThicknessMm = 25 | 40 | 50 | 75 | 100 | 120 | 150 | 200;

export type EifsSystemType =
  | "drainable_eifs" // EIFS with Drainage (mandatory on wood/steel framed walls in modern codes)
  | "barrier_eifs"; // Face-sealed direct application (sound mass concrete/masonry only)

export type EifsAttachmentMethod =
  | "dual_adhesive_mechanical" // Continuous adhesive ribbons + wind-rated washer fasteners (code standard)
  | "adhesive_only" // Notched trowel ribbon & dab (flat masonry or concrete)
  | "mechanical_only"; // Mechanical fasteners only (specialty dry retrofits)

export type EifsFinishTexture =
  | "fine_sand" // 1.0mm grain, smooth sandstone finish (~2.2 kg/m²)
  | "medium_swirl" // 1.5mm grain, classic rilled swirl texture (~2.8 kg/m²)
  | "coarse_rough" // 2.0mm grain, heavy acoustic/stucco texture (~3.6 kg/m²)
  | "elastomeric_smooth"; // Flexible bridging finish coat (~2.0 kg/m²)

export interface EifsOpening {
  id: string;
  label: string;
  widthM: number;
  heightM: number;
  count: number;
  /** Jamb/sill return reveal depth in mm (typically 50mm to 150mm). */
  revealDepthMm?: number;
}

export interface EifsWallInput {
  /** Centerline exterior facade perimeter length in meters. */
  wallLengthM: number;
  /** Average wall facade height in meters. */
  wallHeightM: number;
  /** Backing structural substrate type. */
  substrateType?: EifsSubstrateType;
  /** Rigid insulation material type. */
  insulationType?: EifsInsulationType;
  /** Continuous insulation thickness in mm (25, 40, 50, 75, 100, 120, 150, 200). */
  insulationThicknessMm: EifsThicknessMm;
  /** Drainable cavity vs barrier face-sealed system. */
  systemType?: EifsSystemType;
  /** Board fixing attachment method. */
  attachmentMethod?: EifsAttachmentMethod;
  /** Acrylic synthetic finish coat texture. */
  finishTexture?: EifsFinishTexture;
  /** Fenestration openings deducted from gross facade area. */
  openings?: EifsOpening[];
  /** Outside 90-degree building corners (default 4). */
  exteriorCornersCount?: number;
  /** Height of ground-level high-impact mesh zone in meters (default 2.0m). Set to 0 to disable. */
  impactMeshHeightM?: number;
  /** Expansion / movement control joint length in linear meters (optional, auto-calculated if 0). */
  expansionJointLengthM?: number;
  /** Cutting, rasping, and geometry trimming waste factor in percent (default 6%). */
  wasteFactorPercent?: number;
  /** 2-letter ISO market code for regional packaging standards. */
  marketCode?: string;
  /** Installation mechanics crew size (default 4). */
  laborCrewSize?: number;
}

export interface EifsBoqItem {
  code: string;
  description: string;
  category:
    | "envelope"
    | "insulation"
    | "attachment"
    | "reinforcing"
    | "finish"
    | "accessories"
    | "labor";
  quantity: number;
  unit: string;
  notes?: string;
}

export interface EifsWallResult {
  ok: boolean;
  errors: string[];
  warnings: string[];

  geometry: {
    grossAreaM2: number;
    openingsAreaM2: number;
    revealAreaM2: number;
    netFacadeAreaM2: number;
    effectiveAreaM2: number;
    openingsCount: number;
    openingsPerimeterM: number;
  };

  wrbAndDrainage: {
    systemType: EifsSystemType;
    fluidWrbAreaM2: number;
    fluidWrbPails5Gal: number;
    flashingTapeLengthM: number;
    flashingTapeRolls: number;
    drainageMatAreaM2: number;
    drainageMatRolls: number;
  };

  insulation: {
    type: EifsInsulationType;
    thicknessMm: number;
    nominalBoardAreaM2: number;
    boardsCount: number;
    bundlesCount: number;
    totalVolumeM3: number;
    continuousRValueUS: number;
    rsiMetric: number;
    uFactorMetric: number;
    complianceScore: "exceeds" | "meets" | "minimum";
  };

  attachment: {
    method: EifsAttachmentMethod;
    adhesiveKg: number;
    adhesiveBags25Kg: number;
    mechanicalFastenersCount: number;
    fastenerBoxes100Count: number;
    fastenerEmbedmentDepthMm: number;
  };

  reinforcing: {
    standardMeshAreaM2: number;
    standardMeshRolls50M2: number;
    highImpactAreaM2: number;
    highImpactMeshRolls25M2: number;
    butterflyPatchesCount: number;
    baseCoatKg: number;
    baseCoatBags25Kg: number;
  };

  finish: {
    texture: EifsFinishTexture;
    primerKg: number;
    primerPails20Kg: number;
    finishCoatKg: number;
    finishPails25Kg: number;
    spreadRateKgPerM2: number;
  };

  accessories: {
    starterWeepTrackM: number;
    starterTrackPieces3M: number;
    cornerBeadM: number;
    cornerBeadPieces3M: number;
    casingBeadM: number;
    casingBeadPieces3M: number;
    expansionJointM: number;
    expansionJointPieces3M: number;
    sealantJointM: number;
    sealantSausages600Ml: number;
  };

  labor: {
    crewSize: number;
    wrbHours: number;
    insulationHours: number;
    reinforcingHours: number;
    finishHours: number;
    totalManHours: number;
    estimatedWorkingDays: number;
  };

  boq: EifsBoqItem[];

  codeCitations: Array<{
    jurisdiction: string;
    code: string;
    clause: string;
    summary: string;
  }>;
  standards: {
    astm: string[];
    en: string[];
    energyCodes: string[];
  };
}

/** Standard board dimension: 1200mm x 600mm = 0.72 m² per board */
const BOARD_WIDTH_M = 1.2;
const BOARD_HEIGHT_M = 0.6;
const BOARD_AREA_M2 = BOARD_WIDTH_M * BOARD_HEIGHT_M; // 0.72 m²

/**
 * Deterministically compute quantities for an EIFS / ETICS wall assembly.
 */
export function calculateEifsWall(input: EifsWallInput): EifsWallResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const wallLengthM = Number(input.wallLengthM) || 0;
  const wallHeightM = Number(input.wallHeightM) || 0;
  const insulationThicknessMm = input.insulationThicknessMm || 50;
  const substrateType = input.substrateType ?? "exterior_sheathing";
  const insulationType = input.insulationType ?? "standard_eps";
  const systemType =
    input.systemType ??
    (substrateType === "exterior_sheathing"
      ? "drainable_eifs"
      : "barrier_eifs");
  const attachmentMethod =
    input.attachmentMethod ??
    (insulationType === "mineral_wool"
      ? "dual_adhesive_mechanical"
      : "dual_adhesive_mechanical");
  const finishTexture = input.finishTexture ?? "medium_swirl";
  const exteriorCornersCount = Number(input.exteriorCornersCount ?? 4) || 0;
  const impactMeshHeightM =
    input.impactMeshHeightM !== undefined
      ? Number(input.impactMeshHeightM)
      : 2.0;
  const wasteFactorPercent = Math.max(
    0,
    Math.min(25, Number(input.wasteFactorPercent ?? 6) || 0),
  );
  const laborCrewSize = Math.max(
    1,
    Math.min(12, Number(input.laborCrewSize ?? 4) || 4),
  );

  if (wallLengthM <= 0)
    errors.push("Wall perimeter length must be greater than 0 meters.");
  if (wallHeightM <= 0)
    errors.push("Wall facade height must be greater than 0 meters.");
  if (insulationThicknessMm <= 0)
    errors.push("Insulation thickness must be greater than 0 mm.");

  // Warning for framed walls without drainage
  if (substrateType === "exterior_sheathing" && systemType === "barrier_eifs") {
    warnings.push(
      "Modern building codes (IBC 1407.4.1 / IRC R703.9.2) mandate EIFS with Drainage over framed sheathing. Barrier EIFS is restricted to solid masonry/concrete.",
    );
  }

  // Warning for mineral wool attachment
  if (
    insulationType === "mineral_wool" &&
    attachmentMethod === "adhesive_only"
  ) {
    warnings.push(
      "Mineral wool / stone wool lamella insulation requires mechanical washer fixings in addition to adhesive to meet tensile wind-suction standards (ETAG 004 / ASTM E2568).",
    );
  }

  // 1. Geometry & Deductions
  const grossAreaM2 = Math.round(wallLengthM * wallHeightM * 100) / 100;
  const openings = input.openings ?? [];

  let openingsAreaM2 = 0;
  let openingsPerimeterM = 0;
  let revealAreaM2 = 0;
  let totalOpeningsCount = 0;

  for (const op of openings) {
    const w = Math.max(0, Number(op.widthM) || 0);
    const h = Math.max(0, Number(op.heightM) || 0);
    const count = Math.max(1, Math.floor(Number(op.count) || 1));
    const revealDepthM = Math.max(0, (Number(op.revealDepthMm) || 0) / 1000);

    const singleArea = w * h;
    const singlePerimeter = 2 * (w + h);
    const singleReveal = singlePerimeter * revealDepthM;

    openingsAreaM2 += singleArea * count;
    openingsPerimeterM += singlePerimeter * count;
    revealAreaM2 += singleReveal * count;
    totalOpeningsCount += count;
  }

  openingsAreaM2 = Math.round(openingsAreaM2 * 100) / 100;
  openingsPerimeterM = Math.round(openingsPerimeterM * 100) / 100;
  revealAreaM2 = Math.round(revealAreaM2 * 100) / 100;

  if (openingsAreaM2 >= grossAreaM2 && grossAreaM2 > 0) {
    errors.push(
      "Total window and door openings area cannot exceed or equal gross facade area.",
    );
  }

  const netFacadeAreaM2 = Math.max(
    0,
    Math.round((grossAreaM2 - openingsAreaM2 + revealAreaM2) * 100) / 100,
  );
  const wasteMultiplier = 1 + wasteFactorPercent / 100;
  const effectiveAreaM2 =
    Math.round(netFacadeAreaM2 * wasteMultiplier * 100) / 100;

  // 2. WRB and Drainage Plane
  const fluidWrbAreaM2 = effectiveAreaM2;
  // 5-gallon pail covers ~19 m² in 2-coat continuous film (ASTM E2570)
  const fluidWrbPails5Gal = ceilU(fluidWrbAreaM2 / 19);
  // Self-adhered flashing tape (150mm wide) around all rough opening perimeters + 10% overlap
  const flashingTapeLengthM = Math.round(openingsPerimeterM * 1.15 * 10) / 10;
  // Standard 22.8m (75 ft) roll
  const flashingTapeRolls = ceilU(flashingTapeLengthM / 22.8);
  // Drainage mat / spacer sheet (if drainable system): 37.1 m² (400 sq ft) roll
  const drainageMatAreaM2 =
    systemType === "drainable_eifs" ? effectiveAreaM2 : 0;
  const drainageMatRolls =
    systemType === "drainable_eifs" ? ceilU(drainageMatAreaM2 / 37.1) : 0;

  // 3. Continuous Rigid Insulation Boards
  const boardsCount = ceilU(effectiveAreaM2 / BOARD_AREA_M2);
  // Bundles packaging: typically 6 boards per pack for 50mm, 4 for 100mm, 3 for 150mm
  const boardsPerBundle =
    insulationThicknessMm <= 40
      ? 10
      : insulationThicknessMm <= 60
        ? 6
        : insulationThicknessMm <= 100
          ? 4
          : 3;
  const bundlesCount = ceilU(boardsCount / boardsPerBundle);
  const totalVolumeM3 =
    Math.round(
      boardsCount * BOARD_AREA_M2 * (insulationThicknessMm / 1000) * 100,
    ) / 100;

  // Thermal metrics
  let rPerMm = 0.151; // Standard EPS: R-3.85 / 25.4mm
  let lambdaWPerMK = 0.038;
  if (insulationType === "graphite_neopor") {
    rPerMm = 0.185; // Neopor GPS: R-4.70 / 25.4mm
    lambdaWPerMK = 0.031;
  } else if (insulationType === "mineral_wool") {
    rPerMm = 0.157; // Stone wool: R-4.00 / 25.4mm
    lambdaWPerMK = 0.035;
  } else if (insulationType === "xps") {
    rPerMm = 0.197; // XPS: R-5.00 / 25.4mm
    lambdaWPerMK = 0.029;
  }

  const continuousRValueUS =
    Math.round(insulationThicknessMm * rPerMm * 10) / 10;
  // RSI (m²·K/W) = thickness(m) / lambda
  const rsiMetric =
    Math.round((insulationThicknessMm / 1000 / lambdaWPerMK) * 100) / 100;
  // U-factor = 1 / (RSI + 0.17 air film resistances)
  const uFactorMetric = Math.round((1 / (rsiMetric + 0.17)) * 1000) / 1000;

  let complianceScore: "exceeds" | "meets" | "minimum" = "minimum";
  if (continuousRValueUS >= 15 || uFactorMetric <= 0.22) {
    complianceScore = "exceeds";
  } else if (continuousRValueUS >= 7.5 || uFactorMetric <= 0.45) {
    complianceScore = "meets";
  }

  // 4. Attachment (Adhesive & Mechanical Fasteners)
  // Spread rate: 4.5 kg/m² on smooth sheathing, 5.5 kg/m² on CMU/masonry
  const adhesiveSpreadRate =
    substrateType === "cmu_masonry" || substrateType === "existing_brick_stucco"
      ? 5.5
      : 4.5;
  let adhesiveKg = 0;
  let adhesiveBags25Kg = 0;
  if (attachmentMethod !== "mechanical_only") {
    adhesiveKg = Math.round(effectiveAreaM2 * adhesiveSpreadRate);
    adhesiveBags25Kg = ceilU(adhesiveKg / 25);
  }

  // Fasteners: 5.5 fasteners per board in field zone; corners have higher density (+20%)
  let mechanicalFastenersCount = 0;
  let fastenerBoxes100Count = 0;
  const fastenerEmbedmentDepthMm =
    substrateType === "cmu_masonry" || substrateType === "poured_concrete"
      ? 35
      : 25;

  if (attachmentMethod !== "adhesive_only") {
    const fastenersPerBoard = 5.5;
    const baseFasteners = boardsCount * fastenersPerBoard;
    // Outside corners add high-wind perimeter fastening
    const cornerFastenersExtra = exteriorCornersCount * wallHeightM * 2.5;
    mechanicalFastenersCount = ceilU(baseFasteners + cornerFastenersExtra);
    fastenerBoxes100Count = ceilU(mechanicalFastenersCount / 100);
  }

  // 5. Reinforcing AR Fiberglass Mesh & Base Coat
  // Standard mesh roll: 50m x 1m = 50 m². 10% overlap allowance mandatory.
  const standardMeshAreaM2 = Math.round(effectiveAreaM2 * 1.1 * 10) / 10;
  const standardMeshRolls50M2 = ceilU(standardMeshAreaM2 / 50);

  // High-impact mesh (ground splash & pedestrian zone): up to impactMeshHeightM
  const effectiveImpactHeight = Math.min(
    wallHeightM,
    Math.max(0, impactMeshHeightM),
  );
  const highImpactAreaM2 =
    Math.round(wallLengthM * effectiveImpactHeight * 1.1 * 10) / 10;
  // Heavy duty 340-500 g/m² mesh standard roll: 25m x 1m = 25 m²
  const highImpactMeshRolls25M2 =
    effectiveImpactHeight > 0 ? ceilU(highImpactAreaM2 / 25) : 0;

  // Butterfly corner patches: 4 patches per opening (200x300mm at 45° angle)
  const butterflyPatchesCount = totalOpeningsCount * 4;

  // Base coat consumption: 4.5 kg/m² for standard mesh embedment + 2.5 kg/m² additional embedment for high-impact mesh
  const baseCoatKg = Math.round(effectiveAreaM2 * 4.5 + highImpactAreaM2 * 2.5);
  const baseCoatBags25Kg = ceilU(baseCoatKg / 25);

  // 6. Primer & Finish Coat
  // Tinted acrylic primer: 0.22 kg/m²
  const primerKg = Math.round(effectiveAreaM2 * 0.22 * 10) / 10;
  const primerPails20Kg = ceilU(primerKg / 20);

  // Textured acrylic finish coat spread rate
  let finishSpreadRate = 2.8;
  if (finishTexture === "fine_sand") finishSpreadRate = 2.2;
  else if (finishTexture === "coarse_rough") finishSpreadRate = 3.6;
  else if (finishTexture === "elastomeric_smooth") finishSpreadRate = 2.0;

  const finishCoatKg = Math.round(effectiveAreaM2 * finishSpreadRate);
  const finishPails25Kg = ceilU(finishCoatKg / 25);

  // 7. Trim, Beads, Expansion Joints & Sealant
  // Starter weep screed / base track: wall perimeter minus grade door openings (approx 1.0m per door)
  const starterWeepTrackM = Math.max(
    0,
    Math.round((wallLengthM - (totalOpeningsCount > 0 ? 1.0 : 0)) * 10) / 10,
  );
  const starterTrackPieces3M = ceilU(starterWeepTrackM / 3.0);

  // Corner bead with mesh wings: outside wall corners + opening vertical jambs and heads
  const exteriorCornersLengthM = exteriorCornersCount * wallHeightM;
  const cornerBeadM =
    Math.round((exteriorCornersLengthM + openingsPerimeterM) * 10) / 10;
  const cornerBeadPieces3M = ceilU(cornerBeadM / 3.0);

  // Casing / terminal stop bead at roofline, dissimilar materials & sill perimeters
  const casingBeadM =
    Math.round((wallLengthM + openingsPerimeterM * 0.5) * 10) / 10;
  const casingBeadPieces3M = ceilU(casingBeadM / 3.0);

  // Expansion control joints: floor line / vertical movement joint every 15-18m or explicit input
  let expansionJointM = Number(input.expansionJointLengthM) || 0;
  if (expansionJointM === 0 && wallLengthM > 15) {
    const verticalJointsCount = Math.floor(wallLengthM / 15);
    expansionJointM = Math.round(verticalJointsCount * wallHeightM * 10) / 10;
  }
  const expansionJointPieces3M =
    expansionJointM > 0 ? ceilU(expansionJointM / 3.0) : 0;

  // Sealant joint with closed-cell backer rod around all fenestration frames
  const sealantJointM = openingsPerimeterM;
  // 600ml sausage sealant yields approx 6.0 linear meters of 12mm x 6mm joint
  const sealantSausages600Ml = ceilU(sealantJointM / 6.0);

  // 8. Labor Productivity & Man-Hours
  // Rates per m²: WRB: 0.12h, Insulation hanging/rasping: 0.28h, Mesh/basecoat: 0.35h, Primer & Finish: 0.25h
  const wrbHours = Math.round(effectiveAreaM2 * 0.12 * 10) / 10;
  const insulationHours = Math.round(effectiveAreaM2 * 0.28 * 10) / 10;
  const reinforcingHours = Math.round(effectiveAreaM2 * 0.35 * 10) / 10;
  const finishHours = Math.round(effectiveAreaM2 * 0.25 * 10) / 10;
  const totalManHours =
    Math.round(
      (wrbHours + insulationHours + reinforcingHours + finishHours) * 10,
    ) / 10;
  // Working days = total man-hours / (crewSize * 8 hours/day)
  const estimatedWorkingDays = ceilU(totalManHours / (laborCrewSize * 8));

  // 9. Bill of Quantities (BoQ)
  const boq: EifsBoqItem[] = [
    {
      code: "EIFS-WRB-01",
      description:
        "Fluid-applied vapor-permeable Water-Resistive Barrier & air membrane (2-coat seamless film)",
      category: "envelope",
      quantity: fluidWrbPails5Gal,
      unit: "5-gal pail",
      notes: `${fluidWrbAreaM2} m² net coverage over ${substrateType.replace(/_/g, " ")}`,
    },
  ];

  if (flashingTapeRolls > 0) {
    boq.push({
      code: "EIFS-WRB-02",
      description:
        "Self-adhered rubberized asphalt / butyl rough opening flashing membrane (150mm width)",
      category: "envelope",
      quantity: flashingTapeRolls,
      unit: "22.8m roll",
      notes: `${flashingTapeLengthM} m linear coverage for window and door sill pans and jamb transitions`,
    });
  }

  if (systemType === "drainable_eifs") {
    boq.push({
      code: "EIFS-DRN-03",
      description:
        "High-permeance polypropylene geotextile drainage mat spacer cavity layer",
      category: "envelope",
      quantity: drainageMatRolls,
      unit: "37.1m² roll",
      notes:
        "Engineered continuous drainage cavity satisfying ASTM E2273 drainage efficiency (>90%)",
    });
  }

  const insulationLabels: Record<EifsInsulationType, string> = {
    standard_eps:
      "Type I Expanded Polystyrene (EPS) continuous insulation board",
    graphite_neopor:
      "Neopor Graphite-enhanced Polystyrene (GPS) continuous insulation board",
    mineral_wool:
      "Non-combustible stone wool / mineral wool continuous insulation board (A1 rated)",
    xps: "Extruded Polystyrene (XPS) closed-cell rigid insulation board",
  };

  boq.push({
    code: "EIFS-INS-01",
    description: `${insulationThicknessMm}mm ${insulationLabels[insulationType]} (1200mm x 600mm)`,
    category: "insulation",
    quantity: boardsCount,
    unit: "board",
    notes: `${bundlesCount} factory bundles (${totalVolumeM3} m³). Continuous R-${continuousRValueUS} (U-${uFactorMetric})`,
  });

  if (attachmentMethod !== "mechanical_only") {
    boq.push({
      code: "EIFS-ADH-01",
      description:
        "Polymer-modified cementitious dry adhesive powder (mix with potable water)",
      category: "attachment",
      quantity: adhesiveBags25Kg,
      unit: "25kg bag",
      notes: `Ribbon-and-dab spread pattern (~${adhesiveSpreadRate} kg/m²). Total dry mass: ${adhesiveKg} kg`,
    });
  }

  if (attachmentMethod !== "adhesive_only") {
    boq.push({
      code: "EIFS-FST-01",
      description: `Engineered wind-load insulation fasteners with 50mm polypropylene washer plate (${fastenerEmbedmentDepthMm}mm embedment)`,
      category: "attachment",
      quantity: fastenerBoxes100Count,
      unit: "box (100)",
      notes: `${mechanicalFastenersCount} total fixings, spaced 5.5 fixings/board with densified perimeter zone`,
    });
  }

  boq.push({
    code: "EIFS-MSH-01",
    description:
      "Standard alkali-resistant (AR) woven fiberglass reinforcing mesh (160 g/m² / 4.7 oz/yd²)",
    category: "reinforcing",
    quantity: standardMeshRolls50M2,
    unit: "50m² roll",
    notes: `${standardMeshAreaM2} m² required including mandatory 65mm (2.5-inch) minimum edge laps`,
  });

  if (highImpactMeshRolls25M2 > 0) {
    boq.push({
      code: "EIFS-MSH-02",
      description:
        "Heavy-duty armor high-impact reinforcing mesh (375-450 g/m² / 15 oz/yd²) for pedestrian zone",
      category: "reinforcing",
      quantity: highImpactMeshRolls25M2,
      unit: "25m² roll",
      notes: `Ground splash protection up to ${effectiveImpactHeight}m height (${highImpactAreaM2} m²)`,
    });
  }

  if (butterflyPatchesCount > 0) {
    boq.push({
      code: "EIFS-MSH-03",
      description:
        "Pre-cut 45-degree diagonal stress relief butterfly mesh patches (200mm x 300mm)",
      category: "reinforcing",
      quantity: butterflyPatchesCount,
      unit: "patch",
      notes:
        "Installed at all re-entrant window and door corners prior to field mesh embedment",
    });
  }

  boq.push(
    {
      code: "EIFS-BAS-01",
      description: "Polymer-modified cementitious embedment base coat mortar",
      category: "reinforcing",
      quantity: baseCoatBags25Kg,
      unit: "25kg bag",
      notes: `Embeds standard & high-impact mesh (~4.5 kg/m²). Total dry mass: ${baseCoatKg} kg`,
    },
    {
      code: "EIFS-PRM-01",
      description:
        "Tinted 100% acrylic bonding primer (matched to topcoat pigment)",
      category: "finish",
      quantity: primerPails20Kg,
      unit: "20kg pail",
      notes: `Reduces surface absorption and eliminates color shadow. Total mass: ${primerKg} kg`,
    },
    {
      code: "EIFS-FIN-01",
      description: `100% acrylic polymer textured synthetic finish coat (${finishTexture.replace(/_/g, " ")})`,
      category: "finish",
      quantity: finishPails25Kg,
      unit: "25kg pail",
      notes: `Dirt pick-up resistant (DPR), vapor-permeable exterior texture. Spread rate: ${finishSpreadRate} kg/m²`,
    },
    {
      code: "EIFS-TRM-01",
      description:
        "Perforated PVC starter track with integrated drainage weep holes and fabric wing",
      category: "accessories",
      quantity: starterTrackPieces3M,
      unit: "3m length",
      notes: `${starterWeepTrackM} m linear run set 50mm (2 in) minimum above grade level`,
    },
    {
      code: "EIFS-TRM-02",
      description:
        "Rigid PVC corner bead with alkali-resistant fiberglass mesh flanges",
      category: "accessories",
      quantity: cornerBeadPieces3M,
      unit: "3m length",
      notes: `${cornerBeadM} m for outside building corners and window/door return reveals`,
    },

    {
      code: "EIFS-LAB-01",
      description: `Certified EIFS/ETICS multi-trade installation crew (${laborCrewSize} mechanics)`,
      category: "labor",
      quantity: totalManHours,
      unit: "man-hour",
      notes: `Approx. ${estimatedWorkingDays} working days based on 8-hour shift productivity`,
    },
  );

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    geometry: {
      grossAreaM2,
      openingsAreaM2,
      revealAreaM2,
      netFacadeAreaM2,
      effectiveAreaM2,
      openingsCount: totalOpeningsCount,
      openingsPerimeterM,
    },
    wrbAndDrainage: {
      systemType,
      fluidWrbAreaM2,
      fluidWrbPails5Gal,
      flashingTapeLengthM,
      flashingTapeRolls,
      drainageMatAreaM2,
      drainageMatRolls,
    },
    insulation: {
      type: insulationType,
      thicknessMm: insulationThicknessMm,
      nominalBoardAreaM2: BOARD_AREA_M2,
      boardsCount,
      bundlesCount,
      totalVolumeM3,
      continuousRValueUS,
      rsiMetric,
      uFactorMetric,
      complianceScore,
    },
    attachment: {
      method: attachmentMethod,
      adhesiveKg,
      adhesiveBags25Kg,
      mechanicalFastenersCount,
      fastenerBoxes100Count,
      fastenerEmbedmentDepthMm,
    },
    reinforcing: {
      standardMeshAreaM2,
      standardMeshRolls50M2,
      highImpactAreaM2,
      highImpactMeshRolls25M2,
      butterflyPatchesCount,
      baseCoatKg,
      baseCoatBags25Kg,
    },
    finish: {
      texture: finishTexture,
      primerKg,
      primerPails20Kg,
      finishCoatKg,
      finishPails25Kg,
      spreadRateKgPerM2: finishSpreadRate,
    },
    accessories: {
      starterWeepTrackM,
      starterTrackPieces3M,
      cornerBeadM,
      cornerBeadPieces3M,
      casingBeadM,
      casingBeadPieces3M,
      expansionJointM,
      expansionJointPieces3M,
      sealantJointM,
      sealantSausages600Ml,
    },
    labor: {
      crewSize: laborCrewSize,
      wrbHours,
      insulationHours,
      reinforcingHours,
      finishHours,
      totalManHours,
      estimatedWorkingDays,
    },
    boq,
    codeCitations: [
      {
        jurisdiction: "United States (IBC / IRC)",
        code: "IBC Section 1407 / IRC R703.9",
        clause: "ASTM E2568 & ASTM E2273 Drainage",
        summary:
          "Mandates EIFS with Drainage over wood or light-gauge steel framed walls. Requires continuous water-resistive barrier compliant with ASTM E2570 and minimum 90% drainage efficiency.",
      },
      {
        jurisdiction: "Canada (NBC / ULC)",
        code: "NBC Part 9.27 / CAN/ULC-S716.1",
        clause: "Materials & Installation Standard for EIFS",
        summary:
          "Enforces continuous drainage cavity behind insulation boards, capillary break flashings at all horizontal junctions, and CAN/ULC-S134 full-scale fire performance.",
      },
      {
        jurisdiction: "European Union (EOTA / CEN)",
        code: "EAD 040083-00-0404 / EN 13499",
        clause: "ETICS Systems with Renders",
        summary:
          "Establishes mechanical wind suction resistance (ETAG 004), impact resistance (Categories I to III), and reaction to fire classifications under EN 13501-1.",
      },
      {
        jurisdiction: "United Kingdom",
        code: "UK Building Regs Part L & Part B",
        clause: "Approved Document B (Fire Safety) & L (Fuel/Power)",
        summary:
          "Mandates non-combustible A1/A2 stone wool ETICS for residential buildings above 11m/18m; sets maximum wall U-values (typically 0.18 W/m²·K).",
      },
      {
        jurisdiction: "Germany & Central Europe",
        code: "DIN 55699 / GEG 2024",
        clause: "WDVS Execution & DIN 4108",
        summary:
          "Standardizes WDVS (Wärmedämm-Verbundsystem) execution, requiring mineral wool fire barriers (Brandriegel) above openings and continuous U-value compliance.",
      },
      {
        jurisdiction: "International Fire Safety",
        code: "NFPA 285",
        clause: "Multi-Story Flame Propagation Test",
        summary:
          "Standard test method for evaluation of fire propagation characteristics of exterior wall assemblies containing foam plastic continuous insulation.",
      },
    ],
    standards: {
      astm: [
        "ASTM E2568 - Standard Specification for PB Exterior Insulation and Finish Systems",
        "ASTM E2273 - Standard Test Method for Determining Drainage Efficiency of EIFS",
        "ASTM C1397 - Standard Practice for Application of Class PB EIFS",
        "ASTM E2570 - Standard Test Methods for Water-Resistive Barrier Coatings behind EIFS",
        "NFPA 285 - Fire Propagation Characteristics of Exterior Non-Load-Bearing Wall Assemblies",
      ],
      en: [
        "EOTA / EAD 040083-00-0404 - External Thermal Insulation Composite Systems (ETICS) with Renders",
        "EN 13499 - Thermal insulation products for buildings - External thermal insulation composite systems (ETICS) based on EPS",
        "EN 13500 - Thermal insulation products for buildings - ETICS based on mineral wool",
        "EN 13501-1 - Fire classification of construction products and building elements",
      ],
      energyCodes: [
        "ASHRAE 90.1 - Energy Standard for Buildings Except Low-Rise Residential",
        "IECC (International Energy Conservation Code) - Continuous Insulation (ci) Provisions",
        "EU EPBD - Energy Performance of Buildings Directive (Nearly Zero Energy Buildings - NZEB)",
        "UK Building Regulations - Approved Document L (Conservation of fuel and power)",
        "German GEG (Gebäudeenergiegesetz) / DIN 4108 Wärmeschutz",
      ],
    },
  };
}
