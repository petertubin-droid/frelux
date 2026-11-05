/**
 * How blockwork is actually specified and bought, market by market.
 *
 * A Nigerian bricklayer does not quote a fence height in metres: he quotes it
 * in coaches, one coach being one row of blocks laid on its bed joint. A
 * Texan mason works in courses of 8 inch CMU, and a British bricklayer in
 * courses of standard facing brick. The maths underneath is the same wall area
 * divided by the face area of one unit, but the numbers only mean something to
 * the person reading them when the unit sizes come from their own market.
 *
 * Everything here is a published nominal dimension, not a guess. The mortar
 * joint is separate because it is what turns block face dimensions into a wall
 * height, and leaving it out is the classic source of a wall that comes up a
 * course short.
 */

export type MasonryUnitKey =
  "ng-block-9" | "ng-block-6" | "uk-brick" | "us-cmu" | "in-brick";

export interface MasonryUnit {
  key: MasonryUnitKey;
  market: string;
  /** What the trade calls it, e.g. "9 inch block". */
  label: string;
  /** One word for a single unit, used in quantity lines. */
  noun: string;
  /** Nominal face length in metres, along the wall. */
  lengthM: number;
  /** Nominal face height in metres, up the wall. */
  heightM: number;
  /** Wall thickness the unit produces in metres. */
  thicknessM: number;
  sourceId: string;
}

export interface MasonrySource {
  id: string;
  claim: string;
  url: string;
}

export const MASONRY_SOURCES: MasonrySource[] = [
  {
    id: "ng-block-sizes",
    claim:
      "The Nigerian sandcrete block is nominally 450 mm long and 225 mm high, sold as a 9 inch block (225 mm thick) or a 6 inch block (150 mm thick).",
    url: "https://nigerianbuildingmaterials.com/sandcrete-blocks-sizes-and-prices-in-nigeria/",
  },
  {
    id: "uk-brick-sizes",
    claim:
      "A standard UK facing brick is 215 mm long, 102.5 mm wide and 65 mm high.",
    url: "https://www.brick.org.uk/brick-bulletin/brick-development-association/standard-brick-dimensions/",
  },
  {
    id: "us-cmu-sizes",
    claim:
      "A standard US concrete masonry unit is 8 inch high, 8 inch thick and 16 inch long nominal.",
    url: "https://www.nrmca.org/wp-content/uploads/2020/04/CMU-Manual.pdf",
  },
  {
    id: "in-brick-sizes",
    claim:
      "The Indian modular clay brick is 190 mm x 90 mm x 90 mm, with the older traditional brick 230 mm x 110 mm x 70 mm.",
    url: "https://www.bis.gov.in/",
  },
  {
    id: "ng-plot-size",
    claim:
      "A standard Nigerian plot is 100 ft by 50 ft, about 465 square metres, and a half plot is half of that area.",
    url: "https://nigerianinfopedia.com.ng/land-measurements-in-nigeria/",
  },
];

/**
 * Bed and head joints. 10 mm is the specified joint in both the British and
 * the Nigerian blockwork traditions and is what makes a wall add up on site.
 */
export const MORTAR_JOINT_M = 0.01;

export const MASONRY_UNITS: Record<MasonryUnitKey, MasonryUnit> = {
  "ng-block-9": {
    key: "ng-block-9",
    market: "NG",
    label: "9 inch block",
    noun: "blocks",
    lengthM: 0.45,
    heightM: 0.225,
    thicknessM: 0.225,
    sourceId: "ng-block-sizes",
  },
  "ng-block-6": {
    key: "ng-block-6",
    market: "NG",
    label: "6 inch block",
    noun: "blocks",
    lengthM: 0.45,
    heightM: 0.225,
    thicknessM: 0.15,
    sourceId: "ng-block-sizes",
  },
  "uk-brick": {
    key: "uk-brick",
    market: "UK",
    label: "Standard facing brick",
    noun: "bricks",
    lengthM: 0.215,
    heightM: 0.065,
    thicknessM: 0.1025,
    sourceId: "uk-brick-sizes",
  },
  "us-cmu": {
    key: "us-cmu",
    market: "US",
    label: "8 inch CMU block",
    noun: "blocks",
    lengthM: 0.4064,
    heightM: 0.2032,
    thicknessM: 0.2032,
    sourceId: "us-cmu-sizes",
  },
  "in-brick": {
    key: "in-brick",
    market: "IN",
    label: "Modular clay brick",
    noun: "bricks",
    lengthM: 0.19,
    heightM: 0.09,
    thicknessM: 0.09,
    sourceId: "in-brick-sizes",
  },
};

export function masonryUnitsForMarket(market: string): MasonryUnit[] {
  const code = (market || "NG").toUpperCase();
  const units = Object.values(MASONRY_UNITS).filter((u) => u.market === code);
  return units.length > 0 ? units : [MASONRY_UNITS["ng-block-9"]];
}

/** Face area of one unit once laid, joint included. */
export function unitFaceAreaM2(unit: MasonryUnit): number {
  return (unit.lengthM + MORTAR_JOINT_M) * (unit.heightM + MORTAR_JOINT_M);
}

/**
 * Height of one course, joint included. One course is what a Nigerian site
 * calls a coach of blocks: the 225 mm face plus its 10 mm bed joint.
 */
export function courseHeightM(unit: MasonryUnit): number {
  return unit.heightM + MORTAR_JOINT_M;
}

/** Whole units needed for a wall area, before any breakage allowance. */
export function unitsForArea(areaM2: number, unit: MasonryUnit): number {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return 0;
  return Math.ceil(areaM2 / unitFaceAreaM2(unit));
}

/** Wall height in metres for a number of coaches (courses). */
export function coachesToMetres(
  coaches: number,
  unit: MasonryUnit = MASONRY_UNITS["ng-block-9"],
): number {
  if (!Number.isFinite(coaches) || coaches <= 0) return 0;
  return coaches * courseHeightM(unit);
}

/** Metres of wall expressed in whole coaches of the chosen unit. */
export function metresToCoaches(
  metres: number,
  unit: MasonryUnit = MASONRY_UNITS["ng-block-9"],
): number {
  if (!Number.isFinite(metres) || metres <= 0) return 0;
  return metres / courseHeightM(unit);
}

export type PlotPresetKey = "full-plot" | "half-plot" | "two-plots";

export interface PlotPreset {
  key: PlotPresetKey;
  label: string;
  /** Site description in the local idiom. */
  idiom: string;
  lengthM: number;
  widthM: number;
  sourceId: string;
}

const FOOT_M = 0.3048;

/** 100 ft x 50 ft, the standard Nigerian plot, and the multiples people use. */
export const PLOT_PRESETS: Record<PlotPresetKey, PlotPreset> = {
  "full-plot": {
    key: "full-plot",
    label: "Full plot",
    idiom: "100 ft by 50 ft",
    lengthM: Number((100 * FOOT_M).toFixed(4)),
    widthM: Number((50 * FOOT_M).toFixed(4)),
    sourceId: "ng-plot-size",
  },
  "half-plot": {
    key: "half-plot",
    label: "Half plot",
    idiom: "50 ft by 50 ft",
    lengthM: Number((50 * FOOT_M).toFixed(4)),
    widthM: Number((50 * FOOT_M).toFixed(4)),
    sourceId: "ng-plot-size",
  },
  "two-plots": {
    key: "two-plots",
    label: "Two plots",
    idiom: "100 ft by 100 ft",
    lengthM: Number((100 * FOOT_M).toFixed(4)),
    widthM: Number((100 * FOOT_M).toFixed(4)),
    sourceId: "ng-plot-size",
  },
};

/** Perimeter of a rectangular site in metres. */
export function perimeterM(lengthM: number, widthM: number): number {
  if (!Number.isFinite(lengthM) || !Number.isFinite(widthM)) return 0;
  if (lengthM <= 0 || widthM <= 0) return 0;
  return 2 * (lengthM + widthM);
}

/** Portland cement bag mass, because 50 kg, 25 kg and 94 lb bags all exist. */
export const CEMENT_BAG_KG: Record<string, number> = {
  NG: 50,
  GH: 50,
  KE: 50,
  ZA: 50,
  IN: 50,
  PK: 50,
  AE: 50,
  SA: 50,
  QA: 50,
  KW: 50,
  UK: 25,
  IE: 25,
  CA: 40,
  AU: 20,
  US: 42.64,
};

/** Loose bulk density of ordinary Portland cement, kg per cubic metre. */
export const CEMENT_DENSITY_KG_M3 = 1440;

export function cementBagKg(market: string): number {
  return CEMENT_BAG_KG[(market || "NG").toUpperCase()] ?? 50;
}
