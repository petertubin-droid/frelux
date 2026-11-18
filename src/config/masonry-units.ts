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

import { marketCodeVariants } from "@/lib/international/market-codes";

export type MasonryUnitKey =
  | "ng-block-9"
  | "ng-block-6"
  | "uk-brick"
  | "us-cmu"
  | "ca-cmu"
  | "au-block-190"
  | "ae-block-200"
  | "in-brick"
  // 2026-11-18 globalization audit: native profiles for the markets that
  // previously fell through to the Nigerian 9 inch sandcrete block.
  | "gh-sandcrete"
  | "ke-sandcrete"
  | "et-hcb"
  | "eg-block-200"
  | "ci-parpaing"
  | "za-maxi-brick"
  | "de-nf-brick"
  | "fr-bloc-20"
  | "it-blocco-25"
  | "es-bloque-40"
  | "nl-betonblok"
  | "ch-backstein"
  | "se-lattbetong"
  | "tr-bims"
  | "sa-block-200"
  | "cn-brick"
  | "jp-cb"
  | "kr-block-190"
  | "sg-block-190"
  | "id-batako"
  | "mx-tabique"
  | "br-bloco"
  | "nz-block-190"
  | "tz-sandcrete"
  | "pl-brick";

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
  /**
   * Set when this market has no table of its own and the Nigerian default was
   * substituted. A caller showing quantities can say so instead of implying a
   * Canadian wall is built of 9 inch sandcrete blocks.
   */
  substitutedFromMarket?: string;
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
    id: "ca-cmu-sizes",
    claim:
      "The Canadian concrete masonry unit is the North American 8x8x16 nominal block: 400 mm long, 200 mm high, 200 mm thick.",
    url: "https://www.csa.ca/",
  },
  {
    id: "au-block-sizes",
    claim:
      "The Australian standard hollow concrete block is 390 mm long, 190 mm high and 190 mm thick.",
    url: "https://www.thinkbrick.com.au/",
  },
  {
    id: "ae-block-sizes",
    claim:
      "The Gulf hollow concrete block is commonly 400 mm long, 200 mm high and 200 mm thick.",
    url: "https://www.municipality.gov.ae/",
  },
  {
    id: "gh-block-sizes",
    claim:
      "The Ghanaian sandcrete block is nominally 450 mm long and 225 mm high, sold as a 9 inch (225 mm) or 6 inch (150 mm) block, the same nominal family as Nigeria's.",
    url: "https://www.gsa.gov.gh/",
  },
  {
    id: "ke-block-sizes",
    claim:
      "The Kenyan sandcrete block is nominally 450 mm long and 225 mm high, sold as a 9 inch (225 mm) block, with 400 x 200 x 200 mm blocks also common.",
    url: "https://www.kebs.org/",
  },
  {
    id: "et-block-sizes",
    claim:
      "The Ethiopian hollow concrete block (HCB) is nominally 400 mm long, 200 mm high and 200 mm thick.",
    url: "https://www.ethiostandards.org/",
  },
  {
    id: "eg-block-sizes",
    claim:
      "The Egyptian concrete masonry block is nominally 400 mm long, 200 mm high and 200 mm thick.",
    url: "https://www.eos.org.eg/",
  },
  {
    id: "ci-block-sizes",
    claim:
      "The Ivorian parpaing (concrete block) is nominally 400 mm long, 200 mm high and 200 mm thick.",
    url: "https://www.codinorm.ci/",
  },
  {
    id: "za-brick-sizes",
    claim:
      "The South African maxi brick is nominally 290 mm long, 90 mm high and 140 mm wide; 390 mm concrete blocks are the other common wall unit.",
    url: "https://www.sabs.co.za/",
  },
  {
    id: "de-brick-sizes",
    claim:
      "The German NF brick format is nominally 240 mm long, 115 mm wide and 71 mm high.",
    url: "https://www.din.de/",
  },
  {
    id: "fr-block-sizes",
    claim:
      "The French concrete masonry block is nominally 500 mm long, 200 mm high and 200 mm thick (bloc beton creux 20).",
    url: "https://www.afnor.org/",
  },
  {
    id: "it-block-sizes",
    claim:
      "The Italian concrete masonry block is nominally 500 mm long, 250 mm high and 250 mm thick (blocco 25 x 25 x 50 cm).",
    url: "https://www.uni.com/",
  },
  {
    id: "es-block-sizes",
    claim:
      "The Spanish concrete block is nominally 400 mm long, 200 mm high and 200 mm thick (bloque de hormigon 40 x 20 x 20 cm).",
    url: "https://www.une.org/",
  },
  {
    id: "nl-block-sizes",
    claim:
      "The Dutch concrete block is nominally 500 mm long, 200 mm high and 200 mm thick (betonblok 500 x 200 x 200 mm).",
    url: "https://www.nen.nl/",
  },
  {
    id: "ch-brick-sizes",
    claim:
      "The Swiss backing brick is nominally 250 mm long, 120 mm wide and 65 mm high.",
    url: "https://www.snv.ch/",
  },
  {
    id: "se-block-sizes",
    claim:
      "The Swedish lightweight concrete block is nominally 590 mm long, 200 mm high and 200 mm thick.",
    url: "https://www.sis.se/",
  },
  {
    id: "tr-block-sizes",
    claim:
      "The Turkish pumice (bims) block is nominally 400 mm long, 200 mm high and 200 mm thick.",
    url: "https://www.tse.org.tr/",
  },
  {
    id: "sa-block-sizes",
    claim:
      "The Saudi concrete masonry block is nominally 400 mm long, 200 mm high and 200 mm thick.",
    url: "https://www.saso.gov.sa/",
  },
  {
    id: "cn-brick-sizes",
    claim:
      "The standard Chinese clay brick is nominally 240 mm long, 115 mm wide and 53 mm high.",
    url: "https://www.sac.gov.cn/",
  },
  {
    id: "jp-block-sizes",
    claim:
      "The Japanese concrete block (CB) is nominally 390 mm long, 190 mm high and 120 mm thick.",
    url: "https://www.jisc.go.jp/",
  },
  {
    id: "kr-block-sizes",
    claim:
      "The Korean concrete block is nominally 390 mm long, 190 mm high and 100 mm thick.",
    url: "https://www.kssn.net/",
  },
  {
    id: "sg-block-sizes",
    claim:
      "The Singapore concrete block is nominally 390 mm long, 190 mm high and 190 mm thick.",
    url: "https://www.enterprisesg.gov.sg/",
  },
  {
    id: "id-block-sizes",
    claim:
      "The Indonesian batako block is nominally 400 mm long, 200 mm high and 100 mm thick.",
    url: "https://www.bsn.go.id/",
  },
  {
    id: "mx-block-sizes",
    claim:
      "The Mexican tabique concrete block is nominally 400 mm long, 200 mm high and 120 mm thick.",
    url: "https://www.dof.gob.mx/",
  },
  {
    id: "br-block-sizes",
    claim:
      "The Brazilian concrete block is nominally 390 mm long, 190 mm high and 140 mm thick.",
    url: "https://www.abnt.org.br/",
  },
  {
    id: "nz-block-sizes",
    claim:
      "The New Zealand concrete masonry block is nominally 390 mm long, 190 mm high and 190 mm thick.",
    url: "https://www.standards.govt.nz/",
  },
  {
    id: "tz-block-sizes",
    claim:
      "The Tanzanian sandcrete block is nominally 450 mm long and 225 mm high, sold as a 9 inch (225 mm) block, matching East African practice.",
    url: "https://www.tbs.go.tz/",
  },
  {
    id: "pl-brick-sizes",
    claim:
      "The Polish solid brick (cegla pelna) is nominally 250 mm long, 120 mm wide and 65 mm high.",
    url: "https://www.pkn.pl/",
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
  "ca-cmu": {
    key: "ca-cmu",
    market: "CA",
    label: "8 inch CMU block",
    noun: "blocks",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.2,
    sourceId: "ca-cmu-sizes",
  },
  "au-block-190": {
    key: "au-block-190",
    market: "AU",
    label: "190 mm hollow block",
    noun: "blocks",
    lengthM: 0.39,
    heightM: 0.19,
    thicknessM: 0.19,
    sourceId: "au-block-sizes",
  },
  "ae-block-200": {
    key: "ae-block-200",
    market: "AE",
    label: "200 mm hollow block",
    noun: "blocks",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.2,
    sourceId: "ae-block-sizes",
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
  "gh-sandcrete": {
    key: "gh-sandcrete",
    market: "GH",
    label: "9 inch sandcrete block",
    noun: "blocks",
    lengthM: 0.45,
    heightM: 0.225,
    thicknessM: 0.225,
    sourceId: "gh-block-sizes",
  },
  "ke-sandcrete": {
    key: "ke-sandcrete",
    market: "KE",
    label: "9 inch sandcrete block",
    noun: "blocks",
    lengthM: 0.45,
    heightM: 0.225,
    thicknessM: 0.225,
    sourceId: "ke-block-sizes",
  },
  "et-hcb": {
    key: "et-hcb",
    market: "ET",
    label: "HCB 200 mm block",
    noun: "blocks",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.2,
    sourceId: "et-block-sizes",
  },
  "eg-block-200": {
    key: "eg-block-200",
    market: "EG",
    label: "200 mm concrete block",
    noun: "blocks",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.2,
    sourceId: "eg-block-sizes",
  },
  "ci-parpaing": {
    key: "ci-parpaing",
    market: "CI",
    label: "Parpaing 200 mm block",
    noun: "blocks",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.2,
    sourceId: "ci-block-sizes",
  },
  "za-maxi-brick": {
    key: "za-maxi-brick",
    market: "ZA",
    label: "Maxi brick",
    noun: "bricks",
    lengthM: 0.29,
    heightM: 0.09,
    thicknessM: 0.14,
    sourceId: "za-brick-sizes",
  },
  "de-nf-brick": {
    key: "de-nf-brick",
    market: "DE",
    label: "NF brick",
    noun: "bricks",
    lengthM: 0.24,
    heightM: 0.071,
    thicknessM: 0.115,
    sourceId: "de-brick-sizes",
  },
  "fr-bloc-20": {
    key: "fr-bloc-20",
    market: "FR",
    label: "Bloc beton creux 20",
    noun: "blocks",
    lengthM: 0.5,
    heightM: 0.2,
    thicknessM: 0.2,
    sourceId: "fr-block-sizes",
  },
  "it-blocco-25": {
    key: "it-blocco-25",
    market: "IT",
    label: "Blocco 25 x 25 x 50",
    noun: "blocks",
    lengthM: 0.5,
    heightM: 0.25,
    thicknessM: 0.25,
    sourceId: "it-block-sizes",
  },
  "es-bloque-40": {
    key: "es-bloque-40",
    market: "ES",
    label: "Bloque 40 x 20 x 20",
    noun: "blocks",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.2,
    sourceId: "es-block-sizes",
  },
  "nl-betonblok": {
    key: "nl-betonblok",
    market: "NL",
    label: "Betonblok 500 x 200",
    noun: "blocks",
    lengthM: 0.5,
    heightM: 0.2,
    thicknessM: 0.2,
    sourceId: "nl-block-sizes",
  },
  "ch-backstein": {
    key: "ch-backstein",
    market: "CH",
    label: "Backstein 250 x 120",
    noun: "bricks",
    lengthM: 0.25,
    heightM: 0.065,
    thicknessM: 0.12,
    sourceId: "ch-brick-sizes",
  },
  "se-lattbetong": {
    key: "se-lattbetong",
    market: "SE",
    label: "Lattbetongblock 590 x 200",
    noun: "blocks",
    lengthM: 0.59,
    heightM: 0.2,
    thicknessM: 0.2,
    sourceId: "se-block-sizes",
  },
  "tr-bims": {
    key: "tr-bims",
    market: "TR",
    label: "Bims block 200 mm",
    noun: "blocks",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.2,
    sourceId: "tr-block-sizes",
  },
  "sa-block-200": {
    key: "sa-block-200",
    market: "SA",
    label: "200 mm concrete block",
    noun: "blocks",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.2,
    sourceId: "sa-block-sizes",
  },
  "cn-brick": {
    key: "cn-brick",
    market: "CN",
    label: "Standard clay brick",
    noun: "bricks",
    lengthM: 0.24,
    heightM: 0.053,
    thicknessM: 0.115,
    sourceId: "cn-brick-sizes",
  },
  "jp-cb": {
    key: "jp-cb",
    market: "JP",
    label: "Concrete block (CB) 120",
    noun: "blocks",
    lengthM: 0.39,
    heightM: 0.19,
    thicknessM: 0.12,
    sourceId: "jp-block-sizes",
  },
  "kr-block-190": {
    key: "kr-block-190",
    market: "KR",
    label: "Concrete block 190 x 100",
    noun: "blocks",
    lengthM: 0.39,
    heightM: 0.19,
    thicknessM: 0.1,
    sourceId: "kr-block-sizes",
  },
  "sg-block-190": {
    key: "sg-block-190",
    market: "SG",
    label: "190 mm concrete block",
    noun: "blocks",
    lengthM: 0.39,
    heightM: 0.19,
    thicknessM: 0.19,
    sourceId: "sg-block-sizes",
  },
  "id-batako": {
    key: "id-batako",
    market: "ID",
    label: "Batako 100 mm block",
    noun: "blocks",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.1,
    sourceId: "id-block-sizes",
  },
  "mx-tabique": {
    key: "mx-tabique",
    market: "MX",
    label: "Tabique 120 mm block",
    noun: "blocks",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.12,
    sourceId: "mx-block-sizes",
  },
  "br-bloco": {
    key: "br-bloco",
    market: "BR",
    label: "Bloco de concreto 140",
    noun: "blocks",
    lengthM: 0.39,
    heightM: 0.19,
    thicknessM: 0.14,
    sourceId: "br-block-sizes",
  },
  "nz-block-190": {
    key: "nz-block-190",
    market: "NZ",
    label: "190 mm concrete block",
    noun: "blocks",
    lengthM: 0.39,
    heightM: 0.19,
    thicknessM: 0.19,
    sourceId: "nz-block-sizes",
  },
  "tz-sandcrete": {
    key: "tz-sandcrete",
    market: "TZ",
    label: "9 inch sandcrete block",
    noun: "blocks",
    lengthM: 0.45,
    heightM: 0.225,
    thicknessM: 0.225,
    sourceId: "tz-block-sizes",
  },
  "pl-brick": {
    key: "pl-brick",
    market: "PL",
    label: "Cegla pelna brick",
    noun: "bricks",
    lengthM: 0.25,
    heightM: 0.065,
    thicknessM: 0.12,
    sourceId: "pl-brick-sizes",
  },
};

export function masonryUnitsForMarket(market: string): MasonryUnit[] {
  // "UK" and "GB" are the same market: these tables are keyed by the older
  // spelling, while the canonical market list emits GB.
  const codes = new Set(marketCodeVariants(market || "NG"));
  const units = Object.values(MASONRY_UNITS).filter((u) => codes.has(u.market));
  if (units.length > 0) return units;
  // No table for this market. Returning nothing would empty the calculator, so
  // the Nigerian default stands in, marked as a substitution rather than
  // passing itself off as local practice.
  return [
    { ...MASONRY_UNITS["ng-block-9"], substitutedFromMarket: "NG" as const },
  ];
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

/**
 * Plot presets are Nigerian land-surveying units (a plot is 100 ft by 50 ft).
 * They mean nothing in Texas, Bavaria or Queensland, so the calculator only
 * offers them for Nigeria; every other market gets the plain length and width
 * inputs instead of a preset that would quietly mis-size the site.
 */
export function plotPresetsForMarket(market: string): PlotPreset[] {
  const codes = new Set(marketCodeVariants(market || "NG"));
  if (!codes.has("NG")) return [];
  return Object.values(PLOT_PRESETS);
}

/** True when the market has local land presets to offer. */
export function hasPlotPresets(market: string): boolean {
  return plotPresetsForMarket(market).length > 0;
}

/** Perimeter of a rectangular site in metres. */
export function perimeterM(lengthM: number, widthM: number): number {
  if (!Number.isFinite(lengthM) || !Number.isFinite(widthM)) return 0;
  if (lengthM <= 0 || widthM <= 0) return 0;
  return 2 * (lengthM + widthM);
}

// Cement bag mass lives in its own module (a quantity engine needs the bag,
// not the whole masonry catalogue); re-exported so existing imports of
// resolveCementBag / cementBagKg keep working.
export {
  CEMENT_BAG_KG,
  CEMENT_DENSITY_KG_M3,
  cementBagVolumeM3,
  resolveCementBag,
  cementBagKg,
} from "./cement-bag";
export type { CementBagResolution } from "./cement-bag";

/** Market names for the market pickers, so every calculator offers the same list. */
export const MARKET_NAMES: Record<string, string> = {
  NG: "Nigeria",
  GH: "Ghana",
  KE: "Kenya",
  TZ: "Tanzania",
  ET: "Ethiopia",
  CI: "Cote d'Ivoire",
  EG: "Egypt",
  ZA: "South Africa",
  IN: "India",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  CN: "China",
  BR: "Brazil",
  MX: "Mexico",
  TR: "Turkey",
  SG: "Singapore",
  UK: "United Kingdom",
  IE: "Ireland",
  DE: "Germany",
  AT: "Austria",
  CH: "Switzerland",
  NL: "Netherlands",
  BE: "Belgium",
  PL: "Poland",
  SE: "Sweden",
  DK: "Denmark",
  IT: "Italy",
  ES: "Spain",
  PT: "Portugal",
  JP: "Japan",
  FR: "France",
  KR: "South Korea",
  ID: "Indonesia",
  CA: "Canada",
  AU: "Australia",
  US: "United States",
  GB: "United Kingdom",
};

/** The cement bag markets, in the order a market picker should show them. */
export const CEMENT_MARKETS = [
  "NG",
  "GH",
  "KE",
  "TZ",
  "ET",
  "CI",
  "EG",
  "ZA",
  "UK",
  "IE",
  "FR",
  "DE",
  "AT",
  "CH",
  "NL",
  "BE",
  "PL",
  "SE",
  "DK",
  "IT",
  "ES",
  "PT",
  "US",
  "CA",
  "BR",
  "MX",
  "TR",
  "SA",
  "AE",
  "IN",
  "PK",
  "CN",
  "JP",
  "KR",
  "SG",
  "MY",
  "TH",
  "VN",
  "PH",
  "ID",
  "AU",
  "NZ",
] as const;
