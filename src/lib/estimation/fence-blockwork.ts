/**
 * Fence and perimeter blockwork, in the units a site actually uses.
 *
 * The deterministic engine behind the fence and coach block calculator. It
 * takes the three things a builder knows before he starts (the size of the
 * site, how many coaches high the wall is, and the block he is using) and
 * returns what to buy: blocks, cement, sand in cubic metres and in the trips,
 * barrows or pans the supplier and the gang will count.
 *
 * No prices, no tax and no AI live here. Quantities come from geometry only:
 * wall area is perimeter times height, blocks are wall area divided by the face
 * area of one block including its joint, and mortar is the joint volume of the
 * blocks actually laid. Anything a reader might disagree with is reported in
 * `assumptions` so the page can show it rather than bury it.
 */

import {
  MASONRY_UNITS,
  MORTAR_JOINT_M,
  PLOT_PRESETS,
  cementBagKg,
  cementBagKg as bagKgForMarket,
  coachesToMetres,
  courseHeightM,
  perimeterM,
  unitFaceAreaM2,
  type MasonryUnit,
  type MasonryUnitKey,
  type PlotPresetKey,
} from "@/config/masonry-units";
import { CEMENT_DENSITY_KG_M3 } from "@/config/masonry-units";
import {
  measureInSiteUnits,
  sandUnitOptions,
  unitsToBuy,
  type AggregateUnitOption,
} from "@/config/aggregate-units";

/** Dry mortar needs about a third more volume than the wet joint it fills. */
export const MORTAR_DRY_FACTOR = 1.33;

/** Breakage, cutting and site loss on blocks, before any negotiation. */
export const DEFAULT_BLOCK_WASTAGE = 0.05;

export interface FenceBlockworkInput {
  market: string;
  /** A standard site size, when the user picks one. */
  plotPreset?: PlotPresetKey | null;
  /** Site length in metres, used when no preset is chosen. */
  lengthM?: number;
  /** Site width in metres, used when no preset is chosen. */
  widthM?: number;
  /** Wall height in coaches, the local way of saying rows of blocks. */
  coaches: number;
  unitKey: MasonryUnitKey;
  /** Cement to sand ratio by volume of the mortar, 4 means 1:4. */
  mortarRatio?: number;
  /** Share of blocks allowed for breakage, 0.05 means 5 percent. */
  wastage?: number;
}

export interface SandInLocalUnits {
  cubicMetres: number;
  /** Trips, when this market buys sand by the tipper load. */
  trips: Array<{ label: string; count: number; cubicMetres: number }>;
  wheelbarrows: number;
  headPans: number;
  /** The market's default purchase unit, named for the quantity line. */
  defaultUnitLabel: string;
  defaultUnitCount: number;
}

export interface FenceBlockworkResult {
  market: string;
  unit: { key: MasonryUnitKey; label: string; noun: string };
  site: {
    lengthM: number;
    widthM: number;
    perimeterM: number;
    plotLabel: string | null;
  };
  wall: {
    coaches: number;
    courseHeightM: number;
    heightM: number;
    areaM2: number;
    thicknessM: number;
  };
  blocks: {
    perSquareMetre: number;
    net: number;
    breakage: number;
    total: number;
  };
  mortar: {
    ratio: number;
    wetM3: number;
    dryM3: number;
    cementM3: number;
    sandM3: number;
  };
  cement: {
    bagKg: number;
    bags: number;
  };
  sand: SandInLocalUnits;
  assumptions: string[];
}

export interface FenceBlockworkOutcome {
  result: FenceBlockworkResult | null;
  errors: string[];
}

function emptySand(): SandInLocalUnits {
  return {
    cubicMetres: 0,
    trips: [],
    wheelbarrows: 0,
    headPans: 0,
    defaultUnitLabel: "",
    defaultUnitCount: 0,
  };
}

/**
 * Sand in the units this market sells it in. Nigeria and Ghana buy the trip,
 * so every tipper size on offer is reported rather than one silent choice: the
 * count changes with the lorry the supplier sends.
 */
function sandInLocalUnits(volumeM3: number, market: string): SandInLocalUnits {
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0) return emptySand();
  const options = sandUnitOptions(market);
  const trips = options
    .filter((unit: AggregateUnitOption) => unit.key === "trip")
    .map((unit) => ({
      label: unit.label,
      count: unitsToBuy(volumeM3, unit),
      cubicMetres: unit.cubicMetres,
    }));
  const site = measureInSiteUnits(volumeM3, market);
  const preferred = options[0];
  return {
    cubicMetres: Number(volumeM3.toFixed(3)),
    trips,
    wheelbarrows: site.wheelbarrows,
    headPans: site.headPans,
    defaultUnitLabel: preferred.plural,
    defaultUnitCount: unitsToBuy(volumeM3, preferred),
  };
}

export function calculateFenceBlockwork(
  input: FenceBlockworkInput,
): FenceBlockworkOutcome {
  const errors: string[] = [];
  const unit: MasonryUnit | undefined = MASONRY_UNITS[input.unitKey];
  if (!unit) {
    return {
      result: null,
      errors: ["Choose the block or brick you are building with."],
    };
  }

  const preset = input.plotPreset ? PLOT_PRESETS[input.plotPreset] : null;
  const lengthM = preset ? preset.lengthM : Number(input.lengthM);
  const widthM = preset ? preset.widthM : Number(input.widthM);
  if (!Number.isFinite(lengthM) || lengthM <= 0) {
    errors.push(
      "Enter the length of the site in metres, or pick a standard plot.",
    );
  }
  if (!Number.isFinite(widthM) || widthM <= 0) {
    errors.push(
      "Enter the width of the site in metres, or pick a standard plot.",
    );
  }

  const coaches = Math.floor(Number(input.coaches));
  if (!Number.isFinite(coaches) || coaches <= 0) {
    errors.push("Enter how many coaches high the wall is.");
  }
  if (errors.length > 0) return { result: null, errors };

  const ratio =
    input.mortarRatio && input.mortarRatio > 0 ? input.mortarRatio : 4;
  const wastage =
    typeof input.wastage === "number" && input.wastage >= 0 && input.wastage < 1
      ? input.wastage
      : DEFAULT_BLOCK_WASTAGE;

  const perimeter = perimeterM(lengthM, widthM);
  const courseHeight = courseHeightM(unit);
  const heightM = coachesToMetres(coaches, unit);
  const areaM2 = perimeter * heightM;
  const faceArea = unitFaceAreaM2(unit);
  const perSquareMetre = 1 / faceArea;
  const net = Math.ceil(areaM2 * perSquareMetre);
  const breakage = Math.ceil(net * wastage);
  const total = net + breakage;

  // Joint volume of the blocks actually laid: the bed joint runs the length of
  // each block and the head joint runs its height, both at the wall thickness.
  const bedJointM3 =
    (unit.lengthM + MORTAR_JOINT_M) * unit.thicknessM * MORTAR_JOINT_M;
  const headJointM3 = unit.heightM * unit.thicknessM * MORTAR_JOINT_M;
  const wetM3 = net * (bedJointM3 + headJointM3);
  const dryM3 = wetM3 * MORTAR_DRY_FACTOR;
  const cementM3 = dryM3 / (1 + ratio);
  const sandM3 = (dryM3 * ratio) / (1 + ratio);

  const bagKg = cementBagKg(input.market);
  const bagM3 = bagKgForMarket(input.market) / CEMENT_DENSITY_KG_M3;
  const bags = bagM3 > 0 ? Math.ceil(cementM3 / bagM3) : 0;

  const assumptions = [
    `One coach is one course of ${unit.label.toLowerCase()}: ${(courseHeight * 1000).toFixed(0)} mm of block plus its ${(MORTAR_JOINT_M * 1000).toFixed(0)} mm bed joint.`,
    `Blocks are counted at ${perSquareMetre.toFixed(2)} per square metre of wall, joint included.`,
    `${(wastage * 100).toFixed(0)} percent is added for breakage and cutting.`,
    `Mortar is a 1:${ratio} cement to sand mix by volume, with a ${MORTAR_DRY_FACTOR} dry volume factor.`,
    `Cement is counted in ${bagKg} kg bags for this market.`,
    "Quantities only. Prices, tax and labour come from the price book and your own figures, never from this page.",
  ];

  return {
    errors: [],
    result: {
      market: (input.market || "NG").toUpperCase(),
      unit: { key: unit.key, label: unit.label, noun: unit.noun },
      site: {
        lengthM: Number(lengthM.toFixed(2)),
        widthM: Number(widthM.toFixed(2)),
        perimeterM: Number(perimeter.toFixed(2)),
        plotLabel: preset ? preset.label : null,
      },
      wall: {
        coaches,
        courseHeightM: Number(courseHeight.toFixed(3)),
        heightM: Number(heightM.toFixed(2)),
        areaM2: Number(areaM2.toFixed(2)),
        thicknessM: unit.thicknessM,
      },
      blocks: {
        perSquareMetre: Number(perSquareMetre.toFixed(2)),
        net,
        breakage,
        total,
      },
      mortar: {
        ratio,
        wetM3: Number(wetM3.toFixed(3)),
        dryM3: Number(dryM3.toFixed(3)),
        cementM3: Number(cementM3.toFixed(3)),
        sandM3: Number(sandM3.toFixed(3)),
      },
      cement: { bagKg, bags },
      sand: sandInLocalUnits(sandM3, input.market),
      assumptions,
    },
  };
}
