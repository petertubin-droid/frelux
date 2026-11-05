/**
 * The stand under an overhead tank.
 *
 * The borehole engine sizes the tank and tells you it should sit 6 m up. What
 * it never did was tell you what that 6 m of staging is made of: how many
 * blocks, how much cement and sand, what the footings have to be, and whether
 * the ground under them can carry a full tank. That is the gap this closes.
 *
 * Loads are first principles: a litre of water is a kilogram, the tank has a
 * tare, and the stand carries its own weight. Everything is then checked
 * against the ground it stands on and against the slenderness limit for an
 * unreinforced masonry pier, so a stand that will not work is reported rather
 * than quietly priced. No prices and no AI: quantities and checks only.
 */

import {
  MASONRY_UNITS,
  MORTAR_JOINT_M,
  cementBagKg,
  courseHeightM,
  type MasonryUnitKey,
} from "@/config/masonry-units";
import { CEMENT_DENSITY_KG_M3 } from "@/config/masonry-units";

export type StandStructure = "blockwork" | "reinforced_concrete" | "steel";

/** Water is 1 kg per litre at the temperatures a tank sits in. */
export const WATER_KG_PER_LITRE = 1;

/** Tank shell, lid and fittings, taken as 15 kg per 1000 litres of capacity. */
export const TANK_TARE_KG_PER_LITRE = 0.015;

/** Hollow blockwork pier, including mortar: 1800 kg/m³. */
export const BLOCKWORK_DENSITY_KG_M3 = 1800;

/** Reinforced concrete: 2500 kg/m³. */
export const CONCRETE_DENSITY_KG_M3 = 2500;

/** Structural steel sections: 7850 kg/m³. */
export const STEEL_DENSITY_KG_M3 = 7850;

/** Site allowance on the dead load for platform, plumbing and fittings. */
export const PLATFORM_ALLOWANCE = 0.1;

/** Assumed allowable bearing unless the user supplies a soil test figure. */
export const DEFAULT_SOIL_BEARING_KPA = 100;

/** BS 5628 style limit: an unreinforced pier wants height under 12 times its thickness. */
export const MAX_PIER_SLENDERNESS = 12;

export interface TankStandInput {
  market: string;
  /** Storage tank capacity in litres, normally the figure the borehole engine picked. */
  capacityLitres: number;
  /** Height from ground to the underside of the tank platform, metres. */
  standHeightM: number;
  structure?: StandStructure;
  /** Block used for a blockwork stand. */
  unitKey?: MasonryUnitKey;
  /** Number of supporting legs or piers. */
  legs?: number;
  /** Allowable soil bearing pressure in kPa, from a test where one exists. */
  soilBearingKpa?: number;
  /** True only when soilBearingKpa came from a real test. */
  soilBearingTested?: boolean;
}

export interface StandCheck {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface TankStandResult {
  structure: StandStructure;
  capacityLitres: number;
  standHeightM: number;
  legs: number;
  loads: {
    waterKg: number;
    tankTareKg: number;
    standSelfWeightKg: number;
    platformAllowanceKg: number;
    totalKg: number;
    totalKn: number;
    perLegKg: number;
    perLegKn: number;
  };
  blockwork: {
    unitLabel: string;
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
  } | null;
  concrete: {
    /** Footing pad side length in metres. */
    padSideM: number;
    padDepthM: number;
    padVolumeM3: number;
    footingConcreteM3: number;
    /** Reinforcement per pad, kg, at a nominal 60 kg/m³. */
    reinforcementKg: number;
    blindingM3: number;
  } | null;
  steel: {
    legSection: string;
    legLengthM: number;
    bracingLengthM: number;
    bearingPlateCount: number;
    anchorBoltCount: number;
  } | null;
  bearing: {
    soilBearingKpa: number;
    soilBearingTested: boolean;
    appliedPressureKpa: number;
    utilisationPercent: number;
  };
  checks: StandCheck[];
  assumptions: string[];
}

export interface TankStandOutcome {
  result: TankStandResult | null;
  errors: string[];
}

/** Pad side length, rounded up to the next 50 mm as a builder would order it. */
function padSide(loadKn: number, bearingKpa: number, pads: number): number {
  if (bearingKpa <= 0 || pads <= 0) return 0;
  const areaPerPad = loadKn / bearingKpa / pads;
  const side = Math.sqrt(areaPerPad);
  return Math.ceil(side / 0.05) * 0.05;
}

/**
 * Reinforcement for a pad footing, at a plain 60 kg per cubic metre. Enough to
 * state a quantity for the steel fixer, not to design the mesh.
 */
function padReinforcement(padVolumeM3: number): number {
  return Math.ceil(padVolumeM3 * 60);
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
  if (errors.length > 0) return { result: null, errors };

  const unit = MASONRY_UNITS[input.unitKey ?? "ng-block-9"];
  const bearingKpa =
    input.soilBearingKpa && input.soilBearingKpa > 0
      ? input.soilBearingKpa
      : DEFAULT_SOIL_BEARING_KPA;
  const bearingTested = input.soilBearingTested === true;

  // ── Loads ───────────────────────────────────────────────────────────────
  const waterKg = capacity * WATER_KG_PER_LITRE;
  const tankTareKg = capacity * TANK_TARE_KG_PER_LITRE;

  const courseHeight = courseHeightM(unit);
  const courses = Math.ceil(height / courseHeight);
  const actualHeightM = courses * courseHeight;

  let standSelfWeightKg = 0;
  let blockwork: TankStandResult["blockwork"] = null;
  let steel: TankStandResult["steel"] = null;

  const pierAreaM2 = unit.lengthM * unit.thicknessM;

  if (structure === "blockwork") {
    // One unit per course per pier: a 225 mm pier is a single block turned on
    // end, and the joint volume is the mortar that actually goes into it.
    const blocksPerLeg = courses;
    const blocksTotal = blocksPerLeg * legs;
    const bedJointM3PerCourse =
      pierAreaM2 * MORTAR_JOINT_M +
      unit.heightM * unit.thicknessM * MORTAR_JOINT_M;
    const mortarWetM3 = bedJointM3PerCourse * courses * legs;
    const mortarDryM3 = mortarWetM3 * 1.33;
    const cementM3 = mortarDryM3 / 5;
    const sandM3 = (mortarDryM3 * 4) / 5;
    const bagKg = cementBagKg(input.market);
    const cementBags = Math.ceil(cementM3 / (bagKg / CEMENT_DENSITY_KG_M3));

    // Self weight of the hollow piers, at 60 percent of the solid volume.
    standSelfWeightKg =
      legs * pierAreaM2 * actualHeightM * 0.6 * BLOCKWORK_DENSITY_KG_M3;

    blockwork = {
      unitLabel: unit.label,
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
    };
  } else if (structure === "reinforced_concrete") {
    // 225 mm square columns, the size a builder would shutter anyway.
    standSelfWeightKg =
      legs * 0.225 * 0.225 * actualHeightM * CONCRETE_DENSITY_KG_M3;
  } else {
    // Four 50 x 50 x 5 equal angle legs, plus one diagonal brace per bay.
    const legMassKgPerM = 3.77;
    const bracesPerFace = Math.max(1, Math.ceil(actualHeightM / 2 - 0.5));
    const steelMassKg =
      legs * actualHeightM * legMassKgPerM +
      bracesPerFace * 4 * 1.4 * legMassKgPerM;
    standSelfWeightKg = steelMassKg;
    steel = {
      legSection: "50 x 50 x 5 equal angle",
      legLengthM: Number((legs * actualHeightM).toFixed(1)),
      bracingLengthM: Number((bracesPerFace * 4 * 1.4).toFixed(1)),
      bearingPlateCount: legs,
      anchorBoltCount: legs * 4,
    };
  }

  const platformAllowanceKg = (waterKg + tankTareKg) * PLATFORM_ALLOWANCE;
  const totalKg =
    waterKg + tankTareKg + standSelfWeightKg + platformAllowanceKg;
  const totalKn = (totalKg * 9.80665) / 1000;
  const perLegKg = totalKg / legs;
  const perLegKn = totalKn / legs;

  // ── Footings ────────────────────────────────────────────────────────────
  const padDepthM = 0.225;
  const sideM = padSide(totalKn, bearingKpa, legs);
  const padVolumeM3 = sideM * sideM * padDepthM;
  const footingConcreteM3 = padVolumeM3 * legs;
  const concrete = {
    padSideM: sideM,
    padDepthM,
    padVolumeM3: Number(padVolumeM3.toFixed(3)),
    footingConcreteM3: Number(footingConcreteM3.toFixed(2)),
    reinforcementKg: padReinforcement(footingConcreteM3) * legs,
    blindingM3: Number((sideM * sideM * 0.05 * legs).toFixed(2)),
  };

  const appliedPressureKpa = Number(
    (totalKn / (sideM * sideM * legs)).toFixed(1),
  );
  const utilisationPercent = Number(
    ((appliedPressureKpa / bearingKpa) * 100).toFixed(0),
  );

  // ── Checks ──────────────────────────────────────────────────────────────
  const checks: StandCheck[] = [];

  const slenderRatio = actualHeightM / unit.thicknessM;
  checks.push({
    id: "slenderness",
    label: "Pier slenderness",
    status:
      structure !== "blockwork"
        ? "ok"
        : slenderRatio <= MAX_PIER_SLENDERNESS
          ? "ok"
          : "warn",
    detail:
      structure !== "blockwork"
        ? "Steel and reinforced concrete legs are braced, so the masonry slenderness limit does not apply."
        : `Stand height is ${slenderRatio.toFixed(1)} times the ${(unit.thicknessM * 1000).toFixed(0)} mm pier thickness against a limit of ${MAX_PIER_SLENDERNESS}. ${
            slenderRatio <= MAX_PIER_SLENDERNESS
              ? "Within the limit for an unreinforced pier."
              : "Brace the piers to the building or upgrade to reinforced concrete columns."
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
    detail: `Full tank puts ${totalKn.toFixed(1)} kN on ${legs} pads of ${sideM.toFixed(2)} m, which is ${appliedPressureKpa} kPa against ${bearingKpa} kPa allowable. ${
      bearingTested
        ? "The allowable figure came from a soil test."
        : "The allowable figure is an assumption. Confirm it with a soil test or widen the pads before building."
    }`,
  });

  const waterDepthEquivalent = (
    waterKg /
    1000 /
    Math.max(1, capacity / 1000)
  ).toFixed(2);
  checks.push({
    id: "loading",
    label: "Loading basis",
    status: "ok",
    detail: `Water is counted at 1 kg per litre (${waterDepthEquivalent} tonnes for this tank), the tank tare at ${(TANK_TARE_KG_PER_LITRE * 1000).toFixed(0)} kg per 1000 litres, and a ${(PLATFORM_ALLOWANCE * 100).toFixed(0)} percent allowance for the platform and fittings.`,
  });

  if (structure === "blockwork") {
    checks.push({
      id: "pier-ring-beam",
      label: "Platform ring beam",
      status: "warn",
      detail:
        "Piers carry the tank through a reinforced concrete ring beam, not straight onto blockwork. The beam is priced as part of the platform, and its reinforcement is not in the blockwork quantities above.",
    });
  }

  const assumptions = [
    `Stand height is ${height} m, built as ${courses} courses of ${unit.label.toLowerCase()} at ${(courseHeight * 1000).toFixed(0)} mm each (${actualHeightM.toFixed(2)} m to the underside of the platform).`,
    `${legs} supporting ${structure === "blockwork" ? "piers" : "legs"} are assumed, sharing the load equally.`,
    `Total load is water plus tank tare plus stand self weight plus a ${(PLATFORM_ALLOWANCE * 100).toFixed(0)} percent platform allowance.`,
    `Footing pads are ${padDepthM * 1000} mm thick, sized so the bearing pressure stays within the allowable figure, and rounded up to 50 mm.`,
    `Footing reinforcement is a plain 60 kg per cubic metre, enough to state a quantity, not a designed cage.`,
    "Quantities only. Prices, tax and labour come from the price book and your own figures, never from this page.",
  ];

  return {
    errors: [],
    result: {
      structure,
      capacityLitres: capacity,
      standHeightM: Number(actualHeightM.toFixed(2)),
      legs,
      loads: {
        waterKg: Math.round(waterKg),
        tankTareKg: Math.round(tankTareKg),
        standSelfWeightKg: Math.round(standSelfWeightKg),
        platformAllowanceKg: Math.round(platformAllowanceKg),
        totalKg: Math.round(totalKg),
        totalKn: Number(totalKn.toFixed(1)),
        perLegKg: Math.round(perLegKg),
        perLegKn: Number(perLegKn.toFixed(1)),
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
      checks,
      assumptions,
    },
  };
}
