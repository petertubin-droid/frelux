/**
 * Borehole & Overhead Water Tank Staging Estimator Engine
 *
 * Load path, sizing and bill of materials for elevated water storage towers.
 *
 * The whole calculation runs in this order, and every number in the result can
 * be traced back to one of these steps:
 *
 *  1. Dead load        water (1 L = 1 kg) + tank shell + platform deck
 *  2. Design load      1.4 x dead (dead-only ultimate case)
 *  3. Wind             0.613 v^2 dynamic pressure on the tank and frame
 *  4. Overturning      wind moment vs weight x base/2, factor >= 1.5
 *  5. Footings         N per leg from vertical + wind, pad area = N / bearing
 *  6. Legs             concrete: BS 8110 short column check
 *                      steel: axial + bending utilisation on a chosen SHS
 *  7. Bill of materials, including the items the old BOM left out
 *     (pad footings, base plates, anchor bolts, platform joists, fixings)
 *
 * No price is produced here. Quantities only.
 */

export interface TowerSpecs {
  tankVolumeLiters: number;
  towerHeightMeters: number;
  constructionMaterial: "steel" | "concrete";
  baseSizeMeters?: number; // default derived from tank volume
  /** Allowable soil bearing capacity, kPa. Default 150 (firm laterite). */
  soilBearingKpa?: number;
  /** Basic wind speed, m/s. Default 30 (most of Nigeria). */
  windSpeedMs?: number;
  /** Tank diameter, m. Default derived from volume as a squat cylinder. */
  tankDiameterMeters?: number;
}

export interface TowerInstallationStep {
  id: string;
  title: string;
  detail: string;
  /** What must be true before this step can start. */
  check: string;
}

export interface WaterTowerStagingResult {
  specs: TowerSpecs;
  waterWeightKg: number;
  emptyTankWeightKg: number;
  deckWeightKg: number;
  deadLoadTotalKg: number;
  designLoadKn: number;
  lateralSafetyFactor: number;
  windPressurePa: number;
  windForceKn: number;
  overturningMomentKnm: number;
  resistingMomentKnm: number;
  overturningSafetyFactor: number;
  baseSizeMeters: number;
  tankDiameterMeters: number;
  material: "steel" | "concrete";
  /** Per-leg service load and the pad it needs. */
  footing: {
    legs: number;
    serviceLoadPerLegKn: number;
    padSizeMeters: number;
    padThicknessMm: number;
    concreteVolumeM3: number;
    meshKg: number;
  };
  /** Leg design summary: the governing check and how hard it works. */
  legDesign: {
    sectionLabel: string;
    axialKnPerLeg: number;
    utilisation: number;
    governingCheck: string;
    pass: boolean;
  };
  structuralBOM: {
    structuralHBeamsMeters?: number;
    angleIronBracingMeters?: number;
    timberPlatform2x6Pieces?: number;
    basePlates?: number;
    anchorBolts?: number;
    steelKg?: number;
    concreteVolumeM3?: number;
    cementBags50kg?: number;
    sandCubicMeters?: number;
    gravelCubicMeters?: number;
    verticalRebarY16Lengths?: number;
    stirrupsRebarY8Lengths?: number;
    timberPlatform2x6PiecesConcrete?: number;
    timberJoistsMeters?: number;
    deckFixings?: number;
  };
  installationSteps: TowerInstallationStep[];
  warnings: string[];
  summaryDescription: string;
}

export const TANK_SIZE_PRESETS = [
  { label: "1,000 Liters (1 Ton)", value: 1000 },
  { label: "2,000 Liters (2 Tons)", value: 2000 },
  { label: "3,000 Liters (3 Tons)", value: 3000 },
  { label: "5,000 Liters (5 Tons)", value: 5000 },
  { label: "10,000 Liters (10 Tons)", value: 10000 },
];

const GRAVITY = 9.81;
const DEAD_LOAD_FACTOR = 1.4;
const WIND_PRESSURE_COEFFICIENT = 0.613; // q = 0.613 v^2, N/m^2
const MIN_OVERTURNING_FOS = 1.5;
const DEFAULT_BEARING_KPA = 150;
const DEFAULT_WIND_MS = 30;
const PAD_CONCRETE_GRADE_MPA = 25; // 1:2:4
const COLUMN_FCU_MPA = 25;
const STEEL_FY_MPA = 275; // S275 SHS

const round = (n: number, dp = 2) =>
  Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp);
const roundUp = (n: number, step: number) => Math.ceil(n / step) * step;

/** Squat cylindrical PE tank: diameter grows with volume, height ~ 1.15 x diameter. */
function tankGeometry(litres: number, given?: number) {
  const diameter =
    given && given > 0
      ? given
      : Math.cbrt((4 * (litres / 1000)) / (Math.PI * 1.15));
  const height = (4 * (litres / 1000)) / (Math.PI * diameter * diameter);
  return { diameter: round(diameter), height: round(height) };
}

/** Dry shell mass of a polyethylene tank, kg. */
function emptyTankMass(litres: number) {
  // Commercial PE tanks weigh roughly 30-40 kg per 1000 L of capacity,
  // 1000 L ~ 35 kg, 5000 L ~ 165 kg, 10000 L ~ 300 kg.
  return round(Math.max(35, litres * 0.032), 0);
}

/** Smallest SHS that carries the axial load with a bending allowance. */
function sizeSteelLeg(
  axialKn: number,
  momentKnm: number,
  bucklingLengthM: number,
) {
  const sections = [
    { label: "SHS 75x75x4", a: 1096, i: 1.06e6, z: 28.3e3 },
    { label: "SHS 100x100x5", a: 1836, i: 2.68e6, z: 53.6e3 },
    { label: "SHS 120x120x6", a: 2640, i: 5.72e6, z: 95.3e3 },
    { label: "SHS 150x150x6", a: 3360, i: 1.16e7, z: 155e3 },
    { label: "SHS 150x150x8", a: 4380, i: 1.46e7, z: 195e3 },
    { label: "SHS 200x200x8", a: 5980, i: 3.56e7, z: 356e3 },
    { label: "UC 152x152x23", a: 2920, i: 1.25e7, z: 164e3 },
    { label: "UC 203x203x46", a: 5880, i: 4.57e7, z: 450e3 },
  ];
  const fy = STEEL_FY_MPA;
  const E = 210000;
  for (const s of sections) {
    // Perry-Robertson style reduction via slenderness, conservative for SHS.
    const r = Math.sqrt(s.i / s.a);
    const lambda = (bucklingLengthM * 1000) / r;
    const lambda0 = Math.min(
      1,
      Math.sqrt(
        (s.a * fy) / ((Math.PI * Math.PI * E * s.a) / (lambda * lambda)),
      ),
    );
    const chi =
      lambda0 >= 1 ? 0.85 : Math.max(0.2, 1 / (1 + Math.pow(lambda / 90, 2)));
    const nAxial = (chi * s.a * fy) / 1000; // kN
    const nBend = (s.z * fy) / 1e6; // kNm
    const utilisation = axialKn / nAxial + momentKnm / nBend;
    if (utilisation <= 1) {
      return {
        sectionLabel: s.label,
        utilisation: round(utilisation, 2),
        governingCheck:
          axialKn / nAxial > momentKnm / nBend
            ? `Axial buckling over ${round(bucklingLengthM, 2)} m`
            : "Bending from wind",
        pass: true,
      };
    }
  }
  const last = sections[sections.length - 1];
  const r = Math.sqrt(last.i / last.a);
  const lambda = (bucklingLengthM * 1000) / r;
  const chi = Math.max(0.2, 1 / (1 + Math.pow(lambda / 90, 2)));
  const nAxial = (chi * last.a * fy) / 1000;
  const nBend = (last.z * fy) / 1e6;
  return {
    sectionLabel: last.label,
    utilisation: round(axialKn / nAxial + momentKnm / nBend, 2),
    governingCheck: "Beyond the standard section range",
    pass: axialKn / nAxial + momentKnm / nBend <= 1,
  };
}

export function calculateWaterTowerStaging(
  specs: TowerSpecs,
): WaterTowerStagingResult {
  const { tankVolumeLiters, towerHeightMeters, constructionMaterial } = specs;

  if (!Number.isFinite(tankVolumeLiters) || tankVolumeLiters <= 0) {
    throw new RangeError(
      `Tank volume must be a positive number (received ${tankVolumeLiters}).`,
    );
  }
  if (!Number.isFinite(towerHeightMeters) || towerHeightMeters <= 0) {
    throw new RangeError(
      `Tower height must be a positive number (received ${towerHeightMeters}).`,
    );
  }

  const warnings: string[] = [];
  const bearingKpa =
    specs.soilBearingKpa && specs.soilBearingKpa > 0
      ? specs.soilBearingKpa
      : DEFAULT_BEARING_KPA;
  const windMs =
    specs.windSpeedMs && specs.windSpeedMs > 0
      ? specs.windSpeedMs
      : DEFAULT_WIND_MS;
  const { diameter: tankDiameter, height: tankHeight } = tankGeometry(
    tankVolumeLiters,
    specs.tankDiameterMeters,
  );

  // ── 1. Loads ──
  const waterWeightKg = tankVolumeLiters; // 1 L of water = 1 kg
  const emptyTankWeightKg = emptyTankMass(tankVolumeLiters);

  // Platform footprint: tank diameter plus 150 mm working margin each side,
  // never smaller than 1.5 m so the deck can be built and stood on.
  const baseSizeMeters = round(
    specs.baseSizeMeters && specs.baseSizeMeters > 0
      ? specs.baseSizeMeters
      : Math.max(1.5, tankDiameter + 0.3),
    2,
  );

  // Deck: 50 x 150 mm joists at 400 mm centres plus 25 mm boards.
  const joistCount = Math.ceil(baseSizeMeters / 0.4) + 1;
  const timberJoistsMeters = round(joistCount * baseSizeMeters, 1);
  const plankCount = Math.ceil(baseSizeMeters / 0.15); // 150 mm boards laid tight
  const plankMeters = round(plankCount * baseSizeMeters, 1);
  // Softwood 50 x 150 at ~7.5 kg/m and 25 mm board at ~14 kg/m²
  const deckWeightKg = round(
    timberJoistsMeters * 7.5 + plankMeters * 0.15 * 0.025 * 600,
    0,
  );

  const deadLoadTotalKg = waterWeightKg + emptyTankWeightKg + deckWeightKg;
  const designLoadKn = round(
    (deadLoadTotalKg * DEAD_LOAD_FACTOR * GRAVITY) / 1000,
  );

  // ── 2. Wind (the lateral check the old model only gestured at) ──
  // Tank is a cylinder: projected area = D x H. Frame is open, so taken at
  // 20 % solidity of the face it presents.
  const windPressurePa = round(WIND_PRESSURE_COEFFICIENT * windMs * windMs, 0);
  const dragTank = 0.8; // cylinder
  const dragFrame = 2.0; // open lattice, 20 % solidity -> ~2.0 on solid area
  const tankAreaM2 = tankDiameter * tankHeight;
  const frameAreaM2 = baseSizeMeters * towerHeightMeters * 0.2;
  const windForceN =
    windPressurePa * (dragTank * tankAreaM2 + dragFrame * frameAreaM2);
  const windForceKn = round(windForceN / 1000, 2);

  // Lever arms measured from the base: tank centroid at the top of the tower,
  // frame pressure at mid height.
  const tankCentroidM = towerHeightMeters + tankHeight / 2;
  const momentTank =
    (windPressurePa * dragTank * tankAreaM2 * tankCentroidM) / 1000;
  const momentFrame =
    (windPressurePa * dragFrame * frameAreaM2 * (towerHeightMeters / 2)) / 1000;
  const overturningMomentKnm = round(momentTank + momentFrame, 2);

  const serviceWeightKn = round((deadLoadTotalKg * GRAVITY) / 1000, 2);
  const resistingMomentKnm = round(serviceWeightKn * (baseSizeMeters / 2), 2);
  const overturningSafetyFactor = round(
    resistingMomentKnm / Math.max(0.01, overturningMomentKnm),
    2,
  );

  if (overturningSafetyFactor < MIN_OVERTURNING_FOS) {
    warnings.push(
      `Wind overturning factor is ${overturningSafetyFactor} against the required ${MIN_OVERTURNING_FOS}. Widen the base to at least ${round(((MIN_OVERTURNING_FOS * overturningMomentKnm) / serviceWeightKn) * 2, 2)} m, or reduce the tower height.`,
    );
  }
  if (windMs > 35) {
    warnings.push(
      `Basic wind speed ${windMs} m/s is above the 30 m/s design default. Wind effects are significant at this exposure.`,
    );
  }

  // ── 3. Footings ──
  // Worst leg takes vertical share plus the wind couple across the base.
  const legs = 4;
  const verticalPerLeg = serviceWeightKn / legs;
  const windPerLeg = overturningMomentKnm / (baseSizeMeters * Math.SQRT2);
  const serviceLoadPerLegKn = round(verticalPerLeg + windPerLeg, 2);
  const padAreaM2 = serviceLoadPerLegKn / bearingKpa;
  // A pad smaller than 600 mm cannot be built or fixed down in practice, so the
  // bearing requirement is a floor, not the only rule.
  const MIN_PAD_METERS = 0.6;
  const padSizeMeters = Math.max(
    MIN_PAD_METERS,
    roundUp(Math.sqrt(padAreaM2), 0.05),
  );
  const padThicknessMm = padSizeMeters <= 0.6 ? 200 : 250;
  const padsConcrete =
    legs * padSizeMeters * padSizeMeters * (padThicknessMm / 1000);
  // A142 mesh (2.2 kg/m²) with laps and chairs allowance, one layer.
  const meshKg = round(legs * padSizeMeters * padSizeMeters * 2.6, 1);

  if (padSizeMeters === MIN_PAD_METERS) {
    warnings.push(
      `Pads are at the 600 mm minimum for constructability. The ${serviceLoadPerLegKn} kN per leg needs ${round(padAreaM2, 2)} m² on ${bearingKpa} kPa soil, so the pad is governed by buildability, not bearing.`,
    );
  }
  if (bearingKpa === DEFAULT_BEARING_KPA) {
    warnings.push(
      "Soil bearing taken as 150 kPa (firm laterite). On filled or soft ground, get a bearing test or use a raft.",
    );
  }

  // ── 4. Legs ──
  const axialPerLegKn = round(designLoadKn / legs, 2);
  let legDesign: WaterTowerStagingResult["legDesign"];
  let concreteVolumeM3 = 0;
  let cementBags50kg = 0;
  let sandCubicMeters = 0;
  let gravelCubicMeters = 0;
  let verticalRebarY16Lengths = 0;
  let stirrupsRebarY8Lengths = 0;
  let structuralHBeamsMeters = 0;
  let angleIronBracingMeters = 0;
  let basePlates = 0;
  let anchorBolts = 0;
  let steelKg = 0;

  const tiers = Math.max(1, Math.round(towerHeightMeters / 3));
  const tierHeight = towerHeightMeters / tiers;
  const diagonalBayLength = Math.sqrt(
    tierHeight * tierHeight + baseSizeMeters * baseSizeMeters,
  );
  const totalDiagonalLength = diagonalBayLength * 2 * 4 * tiers; // X-brace, 4 faces
  const horizontalTiesLength = baseSizeMeters * 4 * (tiers + 1);

  if (constructionMaterial === "concrete") {
    // 230 x 230 columns, 4 Y16, Y8 links at 200 mm (BS 8110 3.12.7)
    const section = 0.23 * 0.23;
    const columnVolume = section * towerHeightMeters * legs;
    concreteVolumeM3 = round(columnVolume + padsConcrete, 2);

    // 1:2:4: dry factor 1.54, 1 part cement, 2 sand, 4 granite
    const dryVol = concreteVolumeM3 * 1.54;
    const cementKg = (dryVol / 7) * 1440;
    cementBags50kg = Math.ceil(cementKg / 50);
    sandCubicMeters = round((dryVol * 2) / 7);
    gravelCubicMeters = round((dryVol * 4) / 7);

    // Column bars: 4 per column, lapped 40d at the pad and the top. Laps are
    // added as 0.6 m per bar rather than ignored.
    const barLengthM = (towerHeightMeters + 0.6 + 0.35) * 4 * legs; // +lap +starter
    verticalRebarY16Lengths = Math.ceil(barLengthM / 12);

    // Links: 0.92 m perimeter + 2 x 100 mm hooks = 1.12 m each, at 200 mm
    const linkCount = Math.ceil(towerHeightMeters / 0.2) + 1;
    stirrupsRebarY8Lengths = Math.ceil((linkCount * legs * 1.12) / 12);

    // Axial capacity, BS 8110 3.8.3 short column:
    // N = 0.4 fcu Ac + 0.75 fy Asc
    const ac = section * 1e6 - (4 * (Math.PI * 16 * 16)) / 4; // mm² net
    const asc = (4 * (Math.PI * 16 * 16)) / 4;
    const shortColumnCapacityKn =
      (0.4 * COLUMN_FCU_MPA * ac + 0.75 * 460 * asc) / 1000;
    // BS 8110 3.8.1: the braced slenderness limit is 15 on ley/b. Past that the
    // column carries additional moments, so the short-column capacity is not
    // valid and is discounted as an indicative floor.
    const slenderness = (towerHeightMeters * 1000) / 230;
    const capacityKn =
      slenderness <= 15
        ? shortColumnCapacityKn
        : shortColumnCapacityKn * Math.max(0.5, 15 / slenderness);
    legDesign = {
      sectionLabel: "230 x 230 mm, 4-Y16, Y8 links at 200 mm",
      axialKnPerLeg: axialPerLegKn,
      utilisation: round(axialPerLegKn / capacityKn, 2),
      governingCheck:
        slenderness <= 15
          ? `BS 8110 short column axial (${Math.round(capacityKn)} kN capacity)`
          : `Slender column, indicative capacity ${Math.round(capacityKn)} kN after the 15/b reduction`,
      pass: axialPerLegKn <= capacityKn,
    };
    if (axialPerLegKn > capacityKn) {
      warnings.push(
        `Columns are overstressed: ${axialPerLegKn} kN per column against ${Math.round(capacityKn)} kN capacity. Increase to 300 x 300 with 4-Y20 or use steel.`,
      );
    }
    if (slenderness > 15) {
      warnings.push(
        `Column slenderness is ${round(slenderness, 1)} against the braced limit of 15. The capacity shown is discounted for it, but a column this slender needs an engineer to check the magnified moments. Shorten the lift height or thicken the columns.`,
      );
    }
  } else {
    structuralHBeamsMeters = round(towerHeightMeters * legs, 1);
    angleIronBracingMeters = Math.ceil(
      totalDiagonalLength + horizontalTiesLength,
    );
    // Wind moment is shared between the legs on the windward/leeward faces.
    const momentPerLeg = round(overturningMomentKnm / 2 / legs, 2);
    legDesign = {
      ...sizeSteelLeg(axialPerLegKn, momentPerLeg, tierHeight),
      axialKnPerLeg: axialPerLegKn,
    };
    basePlates = legs;
    anchorBolts = legs * 4;
    // SHS mass ~ weight from area: kg/m = A(mm²) x 7.85 / 1000
    const areaFromLabel = /(\d+)x\d+x(\d+)/.exec(legDesign.sectionLabel);
    const t = areaFromLabel ? Number(areaFromLabel[2]) : 6;
    const side = areaFromLabel ? Number(areaFromLabel[1]) : 150;
    const areaMm2 = 4 * t * (side - t);
    steelKg = round(
      ((areaMm2 * 7.85) / 1000) * structuralHBeamsMeters +
        angleIronBracingMeters * 3.4 +
        basePlates * 12,
      0,
    );
    concreteVolumeM3 = round(padsConcrete, 2);
    const dryVol = concreteVolumeM3 * 1.54;
    cementBags50kg = Math.ceil(((dryVol / 7) * 1440) / 50);
    sandCubicMeters = round((dryVol * 2) / 7);
    gravelCubicMeters = round((dryVol * 4) / 7);
    if (!legDesign.pass) {
      warnings.push(
        `No standard section in the range carries ${axialPerLegKn} kN over a ${round(tierHeight, 2)} m tier with the wind moment. Reduce the tier height, widen the base or get an engineer to design the frame.`,
      );
    }
  }

  const footing = {
    legs,
    serviceLoadPerLegKn,
    padSizeMeters,
    padThicknessMm,
    concreteVolumeM3: round(padsConcrete, 2),
    meshKg,
  };

  const installationSteps: TowerInstallationStep[] = [
    {
      id: "set-out",
      title: "Set out and excavate the pads",
      detail: `Mark the four leg positions on a ${baseSizeMeters} m square, checking diagonals for square. Excavate a ${padSizeMeters} x ${padSizeMeters} m pad ${padThicknessMm + 100} mm deep at each leg, plus 100 mm for blinding.`,
      check: "Diagonals equal, all four pads level at the same depth.",
    },
    {
      id: "blinding",
      title: "Blind and place the pad steel",
      detail:
        "Pour 50 mm of 1:3:6 blinding, let it set, then place the mesh with 50 mm cover on spacers.",
      check: "Blinding firm, mesh clear of the ground all round.",
    },
    {
      id: "pad-pour",
      title: "Pour the pad footings",
      detail: `Pour ${padSizeMeters} x ${padSizeMeters} x ${padThicknessMm} mm pads in 1:2:4, and set the starter bars or holding-down bolts in position while the concrete is wet.`,
      check:
        "Starters plumb, at the correct spacing, thread or bolt thread protected.",
    },
    {
      id: "legs",
      title: "Build the legs",
      detail:
        constructionMaterial === "concrete"
          ? `Cast 230 x 230 mm columns to ${towerHeightMeters} m in lifted stages, each with 4-Y16 bars lapped 40 diameters and Y8 links at 200 mm.`
          : `Stand the ${legDesign.sectionLabel} legs on the base plates, plumb, and grout under the plates once the anchor bolts are tight.`,
      check:
        "Legs plumb within 1:200, plates fully bedded, no voids under the base.",
    },
    {
      id: "bracing",
      title: "Brace the frame",
      detail: `Fit ${tiers} tier of X-bracing and horizontal ties on all four faces. Bracing goes in before any load is added: it is what resists the wind.`,
      check: "Every face braced, bolts tightened, no missing tier.",
    },
    {
      id: "deck",
      title: "Build the platform deck",
      detail: `Fix ${plankCount} x 2x6 boards across ${joistCount} joists at 400 mm centres, with the tank's full base bearing on the deck, not on four point contacts.`,
      check: "Deck level, sealed or drained, tank footprint fully supported.",
    },
    {
      id: "tank",
      title: "Land the tank",
      detail: `Lift the empty ${tankVolumeLiters.toLocaleString()} L tank (about ${emptyTankWeightKg} kg dry) onto the deck, centred over the legs, and tie it down.`,
      check: "Tank centred, outlet facing the riser, tied down before filling.",
    },
    {
      id: "plumbing",
      title: "Plumb, fill and test",
      detail:
        "Connect the riser and overflow, then fill in stages, checking the deck, bracing and pads for movement at each fill.",
      check: "No leaks, no deflection or bolt movement after 24 hours full.",
    },
  ];

  const materialPhrase =
    constructionMaterial === "concrete"
      ? `4 x 230 x 230 mm columns with 4-Y16 and Y8 links, on ${padSizeMeters} m square pads`
      : `4 x ${legDesign.sectionLabel} legs with angle iron X-bracing, on ${padSizeMeters} m square pads`;

  return {
    specs,
    waterWeightKg,
    emptyTankWeightKg,
    deckWeightKg,
    deadLoadTotalKg,
    designLoadKn,
    lateralSafetyFactor: overturningSafetyFactor,
    windPressurePa,
    windForceKn,
    overturningMomentKnm,
    resistingMomentKnm,
    overturningSafetyFactor,
    baseSizeMeters,
    tankDiameterMeters: tankDiameter,
    material: constructionMaterial,
    footing,
    legDesign,
    structuralBOM: {
      structuralHBeamsMeters:
        constructionMaterial === "steel" ? structuralHBeamsMeters : undefined,
      angleIronBracingMeters:
        constructionMaterial === "steel" ? angleIronBracingMeters : undefined,
      basePlates: constructionMaterial === "steel" ? basePlates : undefined,
      anchorBolts: constructionMaterial === "steel" ? anchorBolts : undefined,
      steelKg: constructionMaterial === "steel" ? steelKg : undefined,
      timberPlatform2x6Pieces:
        constructionMaterial === "steel" ? plankCount : undefined,
      timberPlatform2x6PiecesConcrete:
        constructionMaterial === "concrete" ? plankCount : undefined,
      timberJoistsMeters,
      deckFixings: plankCount * 4,
      concreteVolumeM3,
      cementBags50kg,
      sandCubicMeters,
      gravelCubicMeters,
      verticalRebarY16Lengths:
        constructionMaterial === "concrete"
          ? verticalRebarY16Lengths
          : undefined,
      stirrupsRebarY8Lengths:
        constructionMaterial === "concrete"
          ? stirrupsRebarY8Lengths
          : undefined,
    },
    installationSteps,
    warnings,
    summaryDescription: `Elevated staging ${towerHeightMeters} m high carrying a ${tankVolumeLiters.toLocaleString()} L tank: ${round(deadLoadTotalKg / 1000, 1)} t dead load, ${designLoadKn} kN design load, ${windForceKn} kN wind force with an overturning factor of ${overturningSafetyFactor}. ${materialPhrase}.`,
  };
}
