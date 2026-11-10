/**
 * The staging under an overhead tank, designed rather than described.
 *
 * A tank on a stand is the hardest working piece of a water system: it carries
 * five tonnes of water six metres in the air, on piers somebody built without a
 * drawing. This engine sizes the whole assembly from first principles: the tank
 * shell itself, the ring beam it sits on, the piers or columns, the footings,
 * and the wind that tries to tip the lot over.
 *
 * Loads are water at a kilogram a litre, a tank tare, the stand's own weight,
 * the platform, and a stated allowance. Everything is then checked: bearing on
 * the ground it stands on, stress in the masonry, slenderness against the BS
 * 5628 limit, and overturning against the wind with the tank empty, which is
 * the case that actually fails on site.
 *
 * No prices, no tax and no AI. The bill of quantities it produces carries
 * quantities only, so rates come from the price book and never from here.
 */

import {
  MASONRY_UNITS,
  MORTAR_JOINT_M,
  CEMENT_DENSITY_KG_M3,
  cementBagKg,
  resolveCementBag,
  courseHeightM,
  type MasonryUnitKey,
} from "@/config/masonry-units";
import type { BOQItem } from "./borehole-water-system-engine";

export type StandStructure = "blockwork" | "reinforced_concrete" | "steel";
export type TankShellMaterial = "polyethylene" | "steel";

/** Water is 1 kg per litre at the temperatures a domestic tank sits in. */
export const WATER_KG_PER_LITRE = 1;

/** Shell, lid and fittings: 15 kg per 1000 L plastic, 30 kg per 1000 L steel. */
export const TANK_TARE_KG_PER_LITRE = {
  polyethylene: 0.015,
  steel: 0.03,
} as const;

export const BLOCKWORK_DENSITY_KG_M3 = 1800;
export const RENDER_DENSITY_KG_M3 = 2000;
export const CONCRETE_DENSITY_KG_M3 = 2500;
export const STEEL_DENSITY_KG_M3 = 7850;

/** Allowance on the tank load for the platform, plumbing and fittings. */
export const PLATFORM_ALLOWANCE = 0.1;

/** Assumed allowable bearing when no soil test figure is supplied. */
export const DEFAULT_SOIL_BEARING_KPA = 100;

/**
 * Presumed bearing values, after the BS 8004 table a foundation designer
 * starts from. These are presumptions, not tests: they hold for a competent
 * stratum at founding level, and they are labelled as such wherever they are
 * used.
 */
export type SoilType =
  | "rock"
  | "dense_gravel"
  | "sandy_gravel"
  | "dense_sand"
  | "medium_sand"
  | "stiff_clay"
  | "firm_clay"
  | "soft_clay"
  | "made_ground";

export const SOIL_PRESUMPTIONS: {
  id: SoilType;
  label: string;
  bearingKpa: number;
}[] = [
  { id: "rock", label: "Sound rock", bearingKpa: 600 },
  { id: "dense_gravel", label: "Dense gravel", bearingKpa: 400 },
  { id: "sandy_gravel", label: "Sandy gravel", bearingKpa: 300 },
  { id: "dense_sand", label: "Dense sand", bearingKpa: 200 },
  { id: "medium_sand", label: "Medium dense sand", bearingKpa: 150 },
  { id: "stiff_clay", label: "Stiff clay", bearingKpa: 150 },
  { id: "firm_clay", label: "Firm clay", bearingKpa: 100 },
  { id: "soft_clay", label: "Soft clay or silt", bearingKpa: 50 },
  { id: "made_ground", label: "Made ground or fill", bearingKpa: 50 },
];

/**
 * Basic wind speeds by market, m/s, rounded from the national values a local
 * engineer would use. Overridden by whatever the site figure is where one
 * exists.
 */
export const MARKET_WIND_SPEEDS: Record<string, number> = {
  NG: 30,
  GH: 28,
  KE: 24,
  TZ: 24,
  ZA: 28,
  EG: 30,
  AE: 32,
  IN: 39,
  GB: 24,
  IE: 26,
  CA: 30,
  US: 45,
  AU: 35,
  BR: 30,
};

export function marketWindSpeedMs(market: string): number {
  return MARKET_WIND_SPEEDS[market.toUpperCase()] ?? DEFAULT_WIND_SPEED_MS;
}

/**
 * BS 5628-1 limits the slenderness ratio of an unreinforced masonry member,
 * effective height over effective thickness, to 27.
 */
export const CODE_MAX_SLENDERNESS = 27;

/**
 * A tank pier is freestanding: nothing braces it at the top except the ring
 * beam, so it is held to half the code limit in practice. Past this, brace the
 * piers or pour columns.
 */
export const MAX_PIER_SLENDERNESS = 12;

/** Allowable compressive stress in hollow blockwork in 1:4 mortar, N/mm². */
export const ALLOWABLE_PIER_STRESS_MPA = 1.5;

/** Basic wind speed, m/s, used when the user has no local figure. */
export const DEFAULT_WIND_SPEED_MS = 30;

/** Wind pressure per BS EN 1991-1-4: q = 0.5 x air density x v². */
export function windPressurePa(windSpeedMs: number): number {
  return 0.613 * windSpeedMs * windSpeedMs;
}

/** Steel leg sections by axial load, angle sizes a fabricator stocks. */
export const STEEL_LEG_SECTIONS = [
  { section: "50 x 50 x 5 equal angle", massKgPerM: 3.77, maxLegLoadKn: 8 },
  { section: "65 x 65 x 6 equal angle", massKgPerM: 5.77, maxLegLoadKn: 14 },
  { section: "75 x 75 x 8 equal angle", massKgPerM: 8.73, maxLegLoadKn: 22 },
  { section: "90 x 90 x 8 equal angle", massKgPerM: 10.6, maxLegLoadKn: 30 },
  { section: "100 x 100 x 10 equal angle", massKgPerM: 14.9, maxLegLoadKn: 45 },
  { section: "120 x 120 x 12 equal angle", massKgPerM: 21.7, maxLegLoadKn: 65 },
] as const;

/** Reinforcement unit masses, kg per metre. */
const BAR_KG_PER_M = { Y8: 0.395, Y12: 0.888, Y16: 1.579 } as const;

export interface TankStandInput {
  market: string;
  /** Market code, where it differs from the market key used for pricing. */
  marketCode?: string;
  /** Storage tank capacity in litres. */
  capacityLitres: number;
  /** Height from ground to the underside of the platform, metres. */
  standHeightM: number;
  structure?: StandStructure;
  tankMaterial?: TankShellMaterial;
  /** Block used for a blockwork stand. */
  unitKey?: MasonryUnitKey;
  legs?: number;
  soilBearingKpa?: number;
  soilBearingTested?: boolean;
  /** Ground type, used for a presumed bearing value when no test figure is given. */
  soilType?: SoilType;
  /** Basic wind speed for the site, m/s. */
  windSpeedMs?: number;
  unitSystem?: "metric" | "imperial";
}

export interface StandCheck {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface StandBoqLine {
  item: string;
  specification: string;
  quantity: number;
  unit: string;
  notes: string;
}

export interface TankStandResult {
  structure: StandStructure;
  capacityLitres: number;
  standHeightM: number;
  legs: number;
  tank: {
    material: TankShellMaterial;
    diameterM: number;
    heightM: number;
    tareKg: number;
    litreCapacity: number;
    usGal: number;
    ukGal: number;
  };
  loads: {
    waterKg: number;
    tankTareKg: number;
    standSelfWeightKg: number;
    platformKg: number;
    platformAllowanceKg: number;
    totalKg: number;
    totalKn: number;
    perLegKg: number;
    perLegKn: number;
    emptyStandKg: number;
  };
  platform: {
    planWidthM: number;
    ringBeamWidthM: number;
    ringBeamDepthM: number;
    ringBeamConcreteM3: number;
    ringBeamRebarKg: number;
    ringBeamFormworkM2: number;
    deckSlabM3: number;
    deckMeshKg: number;
    steelGrillageKg: number;
  };
  blockwork: {
    unitLabel: string;
    pierWidthM: number;
    pierThicknessM: number;
    courseHeightM: number;
    courses: number;
    blocksPerLeg: number;
    blocksTotal: number;
    bedJointM3PerCourse: number;
    mortarWetM3: number;
    mortarDryM3: number;
    cementM3: number;
    sandM3: number;
    cementBags: number;
    bagKg: number;
    renderAreaM2: number;
    renderCementBags: number;
    renderSandM3: number;
    pierStressMpa: number;
  } | null;
  concrete: {
    padSideM: number;
    padDepthM: number;
    padVolumeM3: number;
    footingConcreteM3: number;
    reinforcementKg: number;
    blindingM3: number;
    padLoadKn: number;
    columnDimensionM: number;
    columnConcreteM3: number;
    columnRebarKg: number;
    columnFormworkM2: number;
  } | null;
  steel: {
    legSection: string;
    sectionMassKgPerM: number;
    legs: number;
    legLengthM: number;
    bracingLengthM: number;
    bracingBayM: number;
    steelMassKg: number;
    bearingPlateCount: number;
    anchorBoltCount: number;
    beyondSectionTable: boolean;
  } | null;
  bearing: {
    soilBearingKpa: number;
    soilBearingTested: boolean;
    appliedPressureKpa: number;
    utilisationPercent: number;
  };
  stability: {
    windSpeedMs: number;
    windPressurePa: number;
    tankWindForceKn: number;
    standWindForceKn: number;
    overturningMomentKnm: number;
    resistingMomentKnm: number;
    factorOfSafety: number;
    requiredFactorOfSafety: number;
    emptyStandKg: number;
  };
  checks: StandCheck[];
  assumptions: string[];
  /** Quantities only, ready to merge into the borehole bill of quantities. */
  boq: StandBoqLine[];
}

export interface TankStandOutcome {
  result: TankStandResult | null;
  errors: string[];
}

/** Pad side length, rounded up to the next 50 mm as a builder would order it. */
function roundPad(side: number): number {
  return Math.ceil(side / 0.05) * 0.05;
}

/** A cylindrical tank, treated as equal in height and diameter as most are sold. */
export function tankDimensions(capacityLitres: number) {
  const volumeM3 = Math.max(capacityLitres, 0) / 1000;
  const diameterM = Math.cbrt((4 * volumeM3) / Math.PI);
  return { diameterM, heightM: diameterM, volumeM3 };
}

export function calculateTankStand(input: TankStandInput): TankStandOutcome {
  const errors: string[] = [];
  const capacity = Number(input.capacityLitres);
  const height = Number(input.standHeightM);

  if (!Number.isFinite(capacity) || capacity <= 0) {
    errors.push("Enter the tank capacity in litres.");
  }
  if (!Number.isFinite(height) || height <= 0) {
    errors.push("Enter the stand height in metres.");
  }

  const structure: StandStructure = input.structure ?? "blockwork";
  const legs = Math.max(1, Math.round(input.legs ?? 4));
  if (structure === "blockwork" && legs < 3) {
    errors.push("A blockwork stand needs at least three piers for stability.");
  }
  if (legs % 2 !== 0 && structure !== "blockwork") {
    errors.push(
      "Use an even number of legs so the platform loads stay symmetrical.",
    );
  }
  if (errors.length > 0) return { result: null, errors };

  const unit = MASONRY_UNITS[input.unitKey ?? "ng-block-9"];
  const tankMat: TankShellMaterial = input.tankMaterial ?? "polyethylene";
  const soil = SOIL_PRESUMPTIONS.find((item) => item.id === input.soilType);
  const bearingKpa =
    input.soilBearingKpa && input.soilBearingKpa > 0
      ? input.soilBearingKpa
      : (soil?.bearingKpa ?? DEFAULT_SOIL_BEARING_KPA);
  const bearingTested = input.soilBearingTested === true;
  const windSpeed =
    input.windSpeedMs && input.windSpeedMs > 0
      ? input.windSpeedMs
      : marketWindSpeedMs(input.marketCode ?? input.market);

  // ── Tank shell ──────────────────────────────────────────────────────────
  const dims = tankDimensions(capacity);
  const tareKg = capacity * TANK_TARE_KG_PER_LITRE[tankMat];
  const planWidth = Math.max(roundPad(dims.diameterM + 0.3), 0.9);

  // ── Platform: ring beam plus deck ───────────────────────────────────────
  const beamWidth = Math.min(unit.thicknessM, 0.25);
  const beamDepth = 0.25;
  const ringPerimeter = 4 * planWidth;
  const isSteel = structure === "steel";

  // A steel stand carries the tank on a channel grillage, so it gets no
  // concrete ring beam and no deck slab.
  const ringBeamConcreteM3 = isSteel
    ? 0
    : ringPerimeter * beamWidth * beamDepth;
  const beamMainKg = isSteel ? 0 : ringPerimeter * 4 * BAR_KG_PER_M.Y12 * 1.1; // 4-Y12 with laps
  const linkCount = isSteel ? 0 : Math.ceil(ringPerimeter / 0.2);
  const linkLengthM = 2 * (beamWidth + beamDepth) - 0.2 + 0.15;
  const beamLinkKg = linkCount * linkLengthM * BAR_KG_PER_M.Y8;
  const ringBeamRebarKg = Math.ceil(beamMainKg + beamLinkKg);
  const ringBeamFormworkM2 = isSteel
    ? 0
    : Number((ringPerimeter * 2 * beamDepth).toFixed(2));

  const deckThicknessM = 0.1;
  const deckSlabM3 = isSteel
    ? 0
    : Number((planWidth * planWidth * deckThicknessM).toFixed(3));
  const deckMeshKg = isSteel ? 0 : Math.ceil(planWidth * planWidth * 2.22); // A142 mesh
  const steelGrillageKg = isSteel ? Math.ceil(6 * planWidth * 10.6) : 0;

  const platformConcreteM3 = ringBeamConcreteM3 + deckSlabM3;
  const platformKg =
    platformConcreteM3 * CONCRETE_DENSITY_KG_M3 +
    ringBeamRebarKg +
    deckMeshKg +
    steelGrillageKg;

  // ── Stand structure ─────────────────────────────────────────────────────
  const courseHeight = courseHeightM(unit);
  const courses = Math.ceil(height / courseHeight);
  const actualHeightM = Number((courses * courseHeight).toFixed(2));

  const pierWidthM = structure === "blockwork" ? unit.lengthM : 0.225;
  const pierThicknessM = structure === "blockwork" ? unit.thicknessM : 0.225;
  const pierAreaM2 = pierWidthM * pierThicknessM;

  let standSelfWeightKg = 0;
  let blockwork: TankStandResult["blockwork"] = null;
  let steel: TankStandResult["steel"] = null;

  if (structure === "blockwork") {
    // One block per course per pier: a 450 x 225 pier is a block turned on end.
    const blocksPerLeg = courses;
    const blocksTotal = blocksPerLeg * legs;
    const bedJointM3PerCourse = unit.lengthM * unit.thicknessM * MORTAR_JOINT_M;
    const mortarWetM3 = bedJointM3PerCourse * courses * legs * 1.1; // joint and wastage
    const mortarDryM3 = mortarWetM3 * 1.33;
    const cementM3 = mortarDryM3 / 5; // 1:4 mortar
    const sandM3 = (mortarDryM3 * 4) / 5;
    const bagKg = cementBagKg(input.market);
    const cementBags = Math.ceil(cementM3 / (bagKg / CEMENT_DENSITY_KG_M3));

    // Rendered both faces and ends, or the blockwork weathers and the tank
    // platform loses its bond.
    const renderPerimeterM = 2 * (unit.lengthM + unit.thicknessM);
    const renderAreaM2 = Number(
      (renderPerimeterM * actualHeightM * legs).toFixed(2),
    );
    const renderDryM3 = renderAreaM2 * 0.012 * 1.33;
    const renderCementBags = Math.ceil(
      renderDryM3 / 5 / (bagKg / CEMENT_DENSITY_KG_M3),
    );
    const renderSandM3 = Number(((renderDryM3 * 4) / 5).toFixed(3));

    const pierVolumeM3 = pierAreaM2 * actualHeightM * legs;
    const blockworkMassKg = pierVolumeM3 * 0.6 * BLOCKWORK_DENSITY_KG_M3;
    const renderMassKg = renderAreaM2 * 0.012 * RENDER_DENSITY_KG_M3;
    standSelfWeightKg = blockworkMassKg + renderMassKg;

    blockwork = {
      unitLabel: unit.label,
      pierWidthM,
      pierThicknessM,
      courseHeightM: Number(courseHeight.toFixed(3)),
      courses,
      blocksPerLeg,
      blocksTotal,
      bedJointM3PerCourse: Number(bedJointM3PerCourse.toFixed(4)),
      mortarWetM3: Number(mortarWetM3.toFixed(3)),
      mortarDryM3: Number(mortarDryM3.toFixed(3)),
      cementM3: Number(cementM3.toFixed(3)),
      sandM3: Number(sandM3.toFixed(3)),
      cementBags,
      bagKg,
      renderAreaM2,
      renderCementBags,
      renderSandM3,
      pierStressMpa: 0,
    };
  } else if (structure === "reinforced_concrete") {
    const columnAreaM2 = 0.225 * 0.225;
    const columnConcreteM3 = columnAreaM2 * actualHeightM * legs;
    const mainBars = 4;
    const columnsMainKg =
      legs * actualHeightM * mainBars * BAR_KG_PER_M.Y16 * 1.1;
    const linkCountPerColumn = Math.ceil(actualHeightM / 0.2);
    const linkLength = 4 * (0.225 - 0.05) + 0.1;
    const columnsLinksKg =
      legs * linkCountPerColumn * linkLength * BAR_KG_PER_M.Y8;
    standSelfWeightKg =
      columnConcreteM3 * CONCRETE_DENSITY_KG_M3 +
      columnsMainKg +
      columnsLinksKg;
  } else {
    const trialLoadPerLegKn =
      ((capacity * WATER_KG_PER_LITRE + tareKg) *
        (1 + PLATFORM_ALLOWANCE) *
        9.80665) /
      1000 /
      legs;
    const chosen =
      STEEL_LEG_SECTIONS.find((s) => s.maxLegLoadKn >= trialLoadPerLegKn) ??
      STEEL_LEG_SECTIONS[STEEL_LEG_SECTIONS.length - 1];
    const beyondSectionTable =
      trialLoadPerLegKn >
      STEEL_LEG_SECTIONS[STEEL_LEG_SECTIONS.length - 1].maxLegLoadKn;

    const bracesPerFace = Math.max(1, Math.ceil(actualHeightM / 2));
    const bracingBayM = Number((actualHeightM / bracesPerFace).toFixed(2));
    const braceLengthEachM = Math.sqrt(2) * bracingBayM;
    const bracingLengthM = bracesPerFace * 4 * braceLengthEachM;
    const steelMassKg =
      legs * actualHeightM * chosen.massKgPerM +
      bracingLengthM * chosen.massKgPerM;
    standSelfWeightKg = steelMassKg;

    steel = {
      legSection: chosen.section,
      sectionMassKgPerM: chosen.massKgPerM,
      legs,
      legLengthM: Number((legs * actualHeightM).toFixed(1)),
      bracingLengthM: Number(bracingLengthM.toFixed(1)),
      bracingBayM,
      steelMassKg: Math.ceil(steelMassKg),
      bearingPlateCount: legs,
      anchorBoltCount: legs * 4,
      beyondSectionTable,
    };
  }

  const waterKg = capacity * WATER_KG_PER_LITRE;
  const platformAllowanceKg = (waterKg + tareKg) * PLATFORM_ALLOWANCE;
  const totalKg =
    waterKg + tareKg + standSelfWeightKg + platformKg + platformAllowanceKg;
  const totalKn = (totalKg * 9.80665) / 1000;
  const perLegKg = totalKg / legs;
  const perLegKn = totalKn / legs;

  // ── Footings, sized with their own weight carried ───────────────────────
  const padDepthM = 0.225;
  let padSideM = 0.6;
  let padLoadKn = perLegKn;
  for (let pass = 0; pass < 4; pass += 1) {
    padLoadKn =
      perLegKn +
      (padSideM * padSideM * padDepthM * CONCRETE_DENSITY_KG_M3 * 9.80665) /
        1000;
    padSideM = Math.max(0.6, roundPad(Math.sqrt(padLoadKn / bearingKpa)));
  }
  const padVolumeM3 = padSideM * padSideM * padDepthM;
  const footingConcreteM3 = padVolumeM3 * legs;

  const columnConcreteM3 =
    structure === "reinforced_concrete"
      ? Number((0.225 * 0.225 * actualHeightM * legs).toFixed(3))
      : 0;
  const columnMainKg =
    structure === "reinforced_concrete"
      ? legs * actualHeightM * 4 * BAR_KG_PER_M.Y16 * 1.1
      : 0;
  const columnLinkKg =
    structure === "reinforced_concrete"
      ? legs *
        Math.ceil(actualHeightM / 0.2) *
        (4 * 0.175 + 0.1) *
        BAR_KG_PER_M.Y8
      : 0;

  const concrete: TankStandResult["concrete"] = {
    padSideM,
    padDepthM,
    padVolumeM3: Number(padVolumeM3.toFixed(3)),
    footingConcreteM3: Number(footingConcreteM3.toFixed(2)),
    reinforcementKg: Math.ceil(footingConcreteM3 * 60),
    blindingM3: Number((padSideM * padSideM * 0.05 * legs).toFixed(2)),
    padLoadKn: Number(padLoadKn.toFixed(1)),
    columnDimensionM: 0.225,
    columnConcreteM3,
    columnRebarKg: Math.ceil(columnMainKg + columnLinkKg),
    columnFormworkM2: Number((legs * 4 * 0.225 * actualHeightM).toFixed(2)),
  };

  const appliedPressureKpa = Number(
    (padLoadKn / (padSideM * padSideM)).toFixed(1),
  );
  const utilisationPercent = Number(
    ((appliedPressureKpa / bearingKpa) * 100).toFixed(0),
  );

  // ── Stability against wind, empty tank: the case that actually fails ────
  const qPa = windPressurePa(windSpeed);
  const tankProjectedArea = dims.diameterM * dims.heightM;
  const tankForceKn = (qPa * tankProjectedArea * 0.8) / 1000;
  const standSolidity = structure === "steel" ? 0.3 : 1;
  const standProjectedArea =
    Math.ceil(legs / 2) * pierWidthM * actualHeightM * standSolidity;
  const standForceKn = (qPa * standProjectedArea * 1.2) / 1000;

  const overturningMomentKnm =
    tankForceKn * (actualHeightM + dims.heightM / 2) +
    standForceKn * (actualHeightM / 2);

  const emptyStandKg = standSelfWeightKg + platformKg + tareKg;
  const leverArmM = planWidth / 2 + padSideM / 2;
  const resistingMomentKnm = (emptyStandKg * 9.80665 * leverArmM) / 1000;
  const factorOfSafety = Number(
    (resistingMomentKnm / Math.max(overturningMomentKnm, 0.001)).toFixed(2),
  );

  // ── Checks ──────────────────────────────────────────────────────────────
  const checks: StandCheck[] = [];

  const slenderRatio = actualHeightM / pierThicknessM;
  checks.push({
    id: "slenderness",
    label: "Pier slenderness",
    status:
      structure !== "blockwork"
        ? "ok"
        : slenderRatio > CODE_MAX_SLENDERNESS
          ? "fail"
          : slenderRatio > MAX_PIER_SLENDERNESS
            ? "warn"
            : "ok",
    detail:
      structure !== "blockwork"
        ? "Braced steel and reinforced concrete legs are not subject to the masonry slenderness limit."
        : `Stand height is ${slenderRatio.toFixed(1)} times the ${(pierThicknessM * 1000).toFixed(0)} mm pier thickness. BS 5628 allows ${CODE_MAX_SLENDERNESS}, but a freestanding pier is held to ${MAX_PIER_SLENDERNESS} here because only the ring beam restrains it. ${
            slenderRatio <= MAX_PIER_SLENDERNESS
              ? "Within both figures."
              : slenderRatio <= CODE_MAX_SLENDERNESS
                ? "Inside the code limit but past the freestanding figure. Brace the piers back to the building or pour columns."
                : "Past the code limit for unreinforced masonry. Pour reinforced concrete columns."
          }`,
  });

  checks.push({
    id: "bearing",
    label: "Ground bearing",
    status:
      utilisationPercent > 100
        ? "fail"
        : utilisationPercent > 80
          ? "warn"
          : "ok",
    detail: `A full tank puts ${padLoadKn.toFixed(1)} kN on each ${padSideM.toFixed(2)} m pad, which is ${appliedPressureKpa} kPa against ${bearingKpa} kPa allowable. ${
      bearingTested
        ? "The allowable figure came from a soil test."
        : soil
          ? `The figure is the presumed value for ${soil.label.toLowerCase()}, not a test. Confirm it at founding level before building.`
          : "The allowable figure is an assumption. Confirm it with a soil test before building."
    }`,
  });

  if (structure === "blockwork") {
    const stress = Number(
      ((perLegKn * 1000) / (pierAreaM2 * 1_000_000)).toFixed(2),
    );
    blockwork!.pierStressMpa = stress;
    checks.push({
      id: "pier-stress",
      label: "Stress in the blockwork",
      status:
        stress > ALLOWABLE_PIER_STRESS_MPA
          ? "fail"
          : stress > ALLOWABLE_PIER_STRESS_MPA * 0.8
            ? "warn"
            : "ok",
      detail: `Each ${(pierWidthM * 1000).toFixed(0)} by ${(pierThicknessM * 1000).toFixed(0)} mm pier carries ${perLegKn.toFixed(1)} kN, which is ${stress} N/mm² against ${ALLOWABLE_PIER_STRESS_MPA} N/mm² for hollow blockwork in 1:4 mortar.`,
    });
  }

  if (structure === "steel" && steel) {
    checks.push({
      id: "leg-section",
      label: "Leg section",
      status: steel.beyondSectionTable ? "warn" : "ok",
      detail: steel.beyondSectionTable
        ? `Each leg carries ${perLegKn.toFixed(1)} kN, above the largest stocked angle in the table. Have the stand designed by an engineer.`
        : `Each leg carries ${perLegKn.toFixed(1)} kN, which ${steel.legSection} covers. Bracing at ${steel.bracingBayM} m centres keeps the leg length in check.`,
    });
  }

  const headAtTapM = actualHeightM + dims.heightM / 2;
  const pressureBar = Number((headAtTapM * 0.0980665 * 0.9).toFixed(2)); // 10 percent pipe loss
  checks.push({
    id: "gravity-head",
    label: "Gravity head at the tap",
    status: pressureBar >= 0.5 ? "ok" : pressureBar >= 0.3 ? "warn" : "fail",
    detail: `The tank outlet sits about ${headAtTapM.toFixed(1)} m above ground, which is roughly ${pressureBar} bar at a ground floor tap after a 10 percent pipe loss. Half a bar is the usual minimum for a shower or a hose; below that a booster set is the answer, not a taller stand.`,
  });

  checks.push({
    id: "overturning",
    label: "Wind overturning",
    status:
      factorOfSafety >= 1.5 ? "ok" : factorOfSafety >= 1.2 ? "warn" : "fail",
    detail: `At ${windSpeed} m/s basic wind speed, the empty stand has a factor of safety of ${factorOfSafety} against overturning, with ${overturningMomentKnm.toFixed(1)} kNm applied and ${resistingMomentKnm.toFixed(1)} kNm resisting. A factor of 1.5 is expected. ${
      factorOfSafety >= 1.5
        ? ""
        : "Widen the base, add mass low down at the pads, or reduce the stand height."
    }`,
  });

  checks.push({
    id: "platform",
    label: "Platform ring beam",
    status: "warn",
    detail: `The tank sits on a ${(beamWidth * 1000).toFixed(0)} by ${(beamDepth * 1000).toFixed(0)} mm reinforced ring beam ${planWidth.toFixed(2)} m square with a ${(deckThicknessM * 1000).toFixed(0)} mm deck, so the tank base is supported all round and not just at the piers. The beam is priced here by quantity; its reinforcement must still be detailed by an engineer.`,
  });

  if (planWidth < dims.diameterM) {
    checks.push({
      id: "tank-support",
      label: "Tank base support",
      status: "warn",
      detail: `The platform is ${planWidth.toFixed(2)} m and the tank is ${dims.diameterM.toFixed(2)} m across, so part of the base overhangs. Widen the platform to the full tank diameter.`,
    });
  }

  const assumptions = [
    `The tank is treated as a cylinder with equal height and diameter: ${dims.diameterM.toFixed(2)} m across and ${dims.heightM.toFixed(2)} m high for ${capacity.toLocaleString()} litres.`,
    `Stand height is ${height} m, built as ${courses} courses of ${unit.label.toLowerCase()} at ${(courseHeight * 1000).toFixed(0)} mm each, ${actualHeightM} m to the underside of the platform.`,
    `${legs} ${structure === "blockwork" ? "piers" : "legs"} share the load equally.`,
    `Load is water plus ${(TANK_TARE_KG_PER_LITRE[tankMat] * 1000).toFixed(0)} kg per 1000 litres of tank tare plus stand and platform self weight plus a ${(PLATFORM_ALLOWANCE * 100).toFixed(0)} percent allowance.`,
    `Pads are ${(padDepthM * 1000).toFixed(0)} mm thick, sized so the bearing pressure stays within the allowable figure including the pad's own weight, and rounded up to 50 mm.`,
    `Footing reinforcement is a plain 60 kg per cubic metre and the ring beam is 4-Y12 with Y8 links at 200 mm: enough to price, not a designed cage.`,
    structure === "blockwork"
      ? resolveCementBag(input.market).isMarketSpecific
        ? `Cement packages use the configured ${input.market.toUpperCase()} market mass of ${blockwork?.bagKg ?? cementBagKg(input.market)} kg per bag.`
        : `No cement pack size is configured for ${input.market}; the blockwork quantity uses a generic 50 kg fallback. Verify local packaging before ordering.`
      : "Cement bag packaging is not used for the selected stand structure.",
    `Wind is taken as ${windSpeed} m/s basic speed giving ${Math.round(qPa)} Pa, with the tank empty, which is the governing case for overturning.`,
    "Quantities only. Prices, tax and labour come from the price book and your own figures, never from this page.",
  ];

  // ── Bill of quantities lines, quantities only ───────────────────────────
  const boq: StandBoqLine[] = [
    {
      item: "Tank stand excavation",
      specification: `${legs} pad holes, ${padSideM.toFixed(2)} m square by ${(padDepthM + 0.05).toFixed(2)} m deep`,
      quantity: Number(
        (legs * padSideM * padSideM * (padDepthM + 0.05)).toFixed(2),
      ),
      unit: "m³",
      notes: "Trim and compact the base of each hole before blinding.",
    },
    {
      item: "Pad blinding",
      specification: "50 mm lean concrete blinding under each pad",
      quantity: concrete.blindingM3,
      unit: "m³",
      notes: "Blinding keeps the reinforcement off the soil.",
    },
    {
      item: "Pad footing concrete",
      specification: `${padSideM.toFixed(2)} m square by ${padDepthM} m deep, C20`,
      quantity: concrete.footingConcreteM3,
      unit: "m³",
      notes: "Reinforcement is a plain 60 kg per cubic metre allowance.",
    },
    {
      item: "Pad footing reinforcement",
      specification: "Y12 bottom mesh each way with 75 mm cover",
      quantity: concrete.reinforcementKg,
      unit: "kg",
      notes: "Cut and bent to the pad sizes above.",
    },
  ];

  if (!isSteel) {
    boq.push(
      {
        item: "Platform ring beam concrete",
        specification: `${(beamWidth * 1000).toFixed(0)} by ${(beamDepth * 1000).toFixed(0)} mm ring, ${planWidth.toFixed(2)} m square`,
        quantity: Number(ringBeamConcreteM3.toFixed(2)),
        unit: "m³",
        notes: "Carries the tank base all round.",
      },
      {
        item: "Platform ring beam reinforcement",
        specification: "4-Y12 main bars with Y8 links at 200 mm",
        quantity: ringBeamRebarKg,
        unit: "kg",
        notes: "Laps included.",
      },
      {
        item: "Ring beam formwork",
        specification: "Both faces, full depth",
        quantity: ringBeamFormworkM2,
        unit: "m²",
        notes: "Strike after seven days.",
      },
    );
  }

  if (structure === "blockwork" && blockwork) {
    boq.push(
      {
        item: "Tank stand piers",
        specification: `${blockwork.pierWidthM * 1000} by ${blockwork.pierThicknessM * 1000} mm, ${blockwork.courses} courses, ${legs} piers`,
        quantity: blockwork.blocksTotal,
        unit: "blocks",
        notes: `${unit.label} laid in 1:4 mortar.`,
      },
      {
        item: "Mortar cement",
        specification: "1:4 mortar for pier joints",
        quantity: blockwork.cementBags,
        unit: `bags of ${blockwork.bagKg} kg`,
        notes: "Wastage included.",
      },
      {
        item: "Mortar sand",
        specification: "Sharp sand for pier joints",
        quantity: blockwork.sandM3,
        unit: "m³",
        notes: "Order with the concrete sand where possible.",
      },
      {
        item: "Pier render",
        specification: `12 mm cement render both faces, ${blockwork.renderAreaM2} m²`,
        quantity: blockwork.renderCementBags,
        unit: `bags of ${blockwork.bagKg} kg`,
        notes: `${blockwork.renderSandM3} m³ of sand goes with this render.`,
      },
    );
  }

  if (structure === "reinforced_concrete" && concrete.columnConcreteM3 > 0) {
    boq.push(
      {
        item: "Tank stand columns",
        specification: `${concrete.columnDimensionM * 1000} mm square, ${actualHeightM} m high, ${legs} columns, C25`,
        quantity: concrete.columnConcreteM3,
        unit: "m³",
        notes: "Cast in one pour to the ring beam where possible.",
      },
      {
        item: "Column reinforcement",
        specification: "4-Y16 main bars with Y8 links at 200 mm",
        quantity: concrete.columnRebarKg,
        unit: "kg",
        notes: "Laps and links included.",
      },
      {
        item: "Column formwork",
        specification: "Four faces per column",
        quantity: concrete.columnFormworkM2,
        unit: "m²",
        notes: "Oil the shutters before each pour.",
      },
    );
  }

  if (structure === "steel" && steel) {
    boq.push(
      {
        item: "Steel stand legs and bracing",
        specification: `${legs} legs of ${steel.legSection}, bracing at ${steel.bracingBayM} m centres`,
        quantity: steel.steelMassKg,
        unit: "kg",
        notes: "Fabricated, primed and painted before erection.",
      },
      {
        item: "Base plates and anchor bolts",
        specification: `${steel.bearingPlateCount} plates with ${steel.anchorBoltCount} bolts`,
        quantity: steel.anchorBoltCount,
        unit: "bolts",
        notes: "Cast into the pads with a template.",
      },
    );
  }

  if (structure !== "steel") {
    boq.push({
      item: "Platform deck slab",
      specification: `${(deckThicknessM * 1000).toFixed(0)} mm slab with A142 mesh`,
      quantity: Number((deckSlabM3 + deckMeshKg / 1000).toFixed(2)),
      unit: "m³ and kg mesh",
      notes: "The tank base must sit flat on this, not on blocks.",
    });
  }

  // Working at height: a stand above head height needs a way up and a rail,
  // not a ladder borrowed from the site.
  if (height >= 2.5) {
    boq.push(
      {
        item: "Stand access ladder",
        specification: `Galvanised steel ladder, caged over 3 m, ${actualHeightM} m to platform`,
        quantity: Number(actualHeightM.toFixed(2)),
        unit: "m",
        notes:
          "Fixed to one pier with stand off brackets so it clears the render.",
      },
      {
        item: "Platform guard rail",
        specification: `1.1 m high rail with mid rail and toe board, ${planWidth.toFixed(2)} m square`,
        quantity: Number((4 * planWidth).toFixed(2)),
        unit: "m",
        notes: "Needed to inspect and clean the tank without a fall.",
      },
    );
  }

  return {
    errors: [],
    result: {
      structure,
      capacityLitres: capacity,
      standHeightM: actualHeightM,
      legs,
      tank: {
        material: tankMat,
        diameterM: Number(dims.diameterM.toFixed(2)),
        heightM: Number(dims.heightM.toFixed(2)),
        tareKg: Math.round(tareKg),
        litreCapacity: capacity,
        usGal: Math.round(capacity * 0.264172),
        ukGal: Math.round(capacity * 0.219969),
      },
      loads: {
        waterKg: Math.round(waterKg),
        tankTareKg: Math.round(tareKg),
        standSelfWeightKg: Math.round(standSelfWeightKg),
        platformKg: Math.round(platformKg),
        platformAllowanceKg: Math.round(platformAllowanceKg),
        totalKg: Math.round(totalKg),
        totalKn: Number(totalKn.toFixed(1)),
        perLegKg: Math.round(perLegKg),
        perLegKn: Number(perLegKn.toFixed(1)),
        emptyStandKg: Math.round(emptyStandKg),
      },
      platform: {
        planWidthM: Number(planWidth.toFixed(2)),
        ringBeamWidthM: beamWidth,
        ringBeamDepthM: beamDepth,
        ringBeamConcreteM3: Number(ringBeamConcreteM3.toFixed(2)),
        ringBeamRebarKg,
        ringBeamFormworkM2,
        deckSlabM3,
        deckMeshKg,
        steelGrillageKg,
      },
      blockwork,
      concrete,
      steel,
      bearing: {
        soilBearingKpa: bearingKpa,
        soilBearingTested: bearingTested,
        appliedPressureKpa,
        utilisationPercent,
      },
      stability: {
        windSpeedMs: windSpeed,
        windPressurePa: Math.round(qPa),
        tankWindForceKn: Number(tankForceKn.toFixed(2)),
        standWindForceKn: Number(standForceKn.toFixed(2)),
        overturningMomentKnm: Number(overturningMomentKnm.toFixed(1)),
        resistingMomentKnm: Number(resistingMomentKnm.toFixed(1)),
        factorOfSafety,
        requiredFactorOfSafety: 1.5,
        emptyStandKg: Math.round(emptyStandKg),
      },
      checks,
      assumptions,
      boq,
    },
  };
}

/** Merges the stand lines into a borehole bill of quantities. */
export function tankStandBoqItems(result: TankStandResult): BOQItem[] {
  return result.boq.map((line) => ({
    category: "Storage Tank & Tower Buffering",
    item: line.item,
    specification: line.specification,
    quantity: line.quantity,
    unit: line.unit,
    notes: line.notes,
  }));
}
