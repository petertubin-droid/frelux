/**
 * The words a market uses for the same calculation.
 *
 * The maths in this platform is universal: wall area divided by block face
 * area is the block count in Enugu, Manchester and Austin alike. What changes
 * is vocabulary. A Nigerian site says the wall is five coaches high and buys
 * sand by the trip; a British site says eleven courses and buys bulk bags; a
 * Texan framer works in courses of CMU and orders concrete by the cubic yard.
 *
 * This module is the only place those labels are decided, so a calculator asks
 * for a height and a sand purchase in the reader's own idiom instead of
 * translating them one page at a time.
 */

import { cementBagKg, masonryUnitsForMarket } from "@/config/masonry-units";

export type UnitSystem = "metric" | "imperial";

export interface RegionalVocabulary {
  code: string;
  marketName: string;
  unitSystem: UnitSystem;
  /** How the height input is labelled. */
  heightLabel: string;
  /** Hint under the height input, in the local measure. */
  heightHint: string;
  /** What one row of the local unit is called. */
  coachWord: string;
  coachWordPlural: string;
  /** What one masonry unit is called. */
  unitWord: string;
  unitWordPlural: string;
  /** How sand arrives on this market. */
  sandPurchaseLabel: string;
  /** Prefix for a cement quantity line, e.g. "50 kg bags". */
  cementBagLabel: string;
  /** What a building site is called. */
  siteWord: string;
  /** Whether the market sells sand by the tipper load. */
  sandByTrip: boolean;
}

const VOCABULARY: Record<string, RegionalVocabulary> = {
  NG: {
    code: "NG",
    marketName: "Nigeria",
    unitSystem: "metric",
    heightLabel: "Coaches high",
    heightHint:
      "One coach is one row of blocks laid flat, about 235 mm including its bed joint.",
    coachWord: "coach",
    coachWordPlural: "coaches",
    unitWord: "block",
    unitWordPlural: "blocks",
    sandPurchaseLabel: "Trips of sharp sand",
    cementBagLabel: "50 kg bags of cement",
    siteWord: "plot",
    sandByTrip: true,
  },
  GH: {
    code: "GH",
    marketName: "Ghana",
    unitSystem: "metric",
    heightLabel: "Courses high",
    heightHint: "One course is one row of blocks including its bed joint.",
    coachWord: "course",
    coachWordPlural: "courses",
    unitWord: "block",
    unitWordPlural: "blocks",
    sandPurchaseLabel: "Trips of sharp sand",
    cementBagLabel: "50 kg bags of cement",
    siteWord: "plot",
    sandByTrip: true,
  },
  UK: {
    code: "UK",
    marketName: "United Kingdom",
    unitSystem: "metric",
    heightLabel: "Courses high",
    heightHint:
      "One course is one row of bricks including its bed joint, 75 mm for standard facing brick.",
    coachWord: "course",
    coachWordPlural: "courses",
    unitWord: "brick",
    unitWordPlural: "bricks",
    sandPurchaseLabel: "Bulk bags of sharp sand",
    cementBagLabel: "25 kg bags of cement",
    siteWord: "site",
    sandByTrip: false,
  },
  US: {
    code: "US",
    marketName: "United States",
    unitSystem: "imperial",
    heightLabel: "Courses high",
    heightHint:
      "One course is one row of CMU including its mortar joint, about 8 inches.",
    coachWord: "course",
    coachWordPlural: "courses",
    unitWord: "CMU block",
    unitWordPlural: "CMU blocks",
    sandPurchaseLabel: "Cubic yards of sand",
    cementBagLabel: "94 lb bags of cement",
    siteWord: "lot",
    sandByTrip: false,
  },
  IN: {
    code: "IN",
    marketName: "India",
    unitSystem: "metric",
    heightLabel: "Courses high",
    heightHint: "One course is one row of bricks including its mortar joint.",
    coachWord: "course",
    coachWordPlural: "courses",
    unitWord: "brick",
    unitWordPlural: "bricks",
    sandPurchaseLabel: "Brass of sand",
    cementBagLabel: "50 kg bags of cement",
    siteWord: "plot",
    sandByTrip: false,
  },
};

const FALLBACK: RegionalVocabulary = {
  code: "GLOBAL",
  marketName: "International",
  unitSystem: "metric",
  heightLabel: "Courses high",
  heightHint: "One course is one row of the local unit including its joint.",
  coachWord: "course",
  coachWordPlural: "courses",
  unitWord: "block",
  unitWordPlural: "blocks",
  sandPurchaseLabel: "Cubic metres of sand",
  cementBagLabel: "Bags of cement",
  siteWord: "site",
  sandByTrip: false,
};

export function regionalVocabulary(
  market: string | null | undefined,
): RegionalVocabulary {
  const code = (market ?? "").toUpperCase();
  return VOCABULARY[code] ?? FALLBACK;
}

/** Markets this vocabulary layer covers with real local wording. */
export function vocabularyMarkets(): RegionalVocabulary[] {
  return Object.values(VOCABULARY);
}

const FEET_PER_METRE = 3.280839895;

/** A height in the reader's own measure, with the metric figure kept alongside. */
export function formatHeight(heightM: number, market: string): string {
  if (!Number.isFinite(heightM) || heightM <= 0) return "0";
  const vocab = regionalVocabulary(market);
  if (vocab.unitSystem === "imperial") {
    const feet = heightM * FEET_PER_METRE;
    return `${feet.toFixed(2)} ft (${heightM.toFixed(2)} m)`;
  }
  return `${heightM.toFixed(2)} m`;
}

/** The cement bag description for a quantity line. */
export function cementBagDescription(market: string): string {
  const kg = cementBagKg(market);
  return `${kg} kg bags of cement`;
}

/** The masonry units on offer in this market, for the block selector. */
export function localMasonryUnits(market: string) {
  return masonryUnitsForMarket(market);
}

export interface SlabVocabulary {
  /** What the ground slab is called in this market. */
  title: string;
  /** The compacted fill under the slab. */
  fillWord: string;
  /** The membrane under the slab. */
  membraneWord: string;
  /** The coarse aggregate in the concrete. */
  aggregateWord: string;
}

/**
 * The German floor is a Nigerian term. The same build up is a ground bearing
 * slab with a MOT Type 1 sub base in the UK and a slab on grade in the US, so
 * the calculator names its layers the way the reader's trade names them.
 */
export function slabVocabulary(
  market: string | null | undefined,
): SlabVocabulary {
  switch ((market ?? "").toUpperCase()) {
    case "NG":
    case "GH":
      return {
        title: "German floor",
        fillWord: "Hardcore (laterite or gravel)",
        membraneWord: "Damp proof membrane (nylon)",
        aggregateWord: "Granite",
      };
    case "UK":
      return {
        title: "Ground bearing slab",
        fillWord: "Sub base (MOT Type 1)",
        membraneWord: "Damp proof membrane (1200 gauge)",
        aggregateWord: "Ballast",
      };
    case "US":
      return {
        title: "Slab on grade",
        fillWord: "Compacted base course",
        membraneWord: "Vapour barrier (6 mil)",
        aggregateWord: "Crushed stone",
      };
    default:
      return {
        title: "Ground floor slab",
        fillWord: "Compacted fill",
        membraneWord: "Damp proof membrane",
        aggregateWord: "Coarse aggregate",
      };
  }
}

/**
 * Market wording for the elevated tank and its support.
 *
 * Terminology only. Nothing here prices a tank or a stand, because the stand is
 * sized by the structural engine and the tank is rounded to a sold capacity.
 */
export interface TankVocabulary {
  /** What the trade calls the elevated support in this market. */
  stand: string;
  /** What the tank itself is called. */
  tank: string;
  /** Capacity unit shown next to the stored volume. */
  capacityUnit: "litres" | "gallons";
}

export function tankVocabulary(market: string): TankVocabulary {
  switch (market.toUpperCase()) {
    case "NG":
      return {
        stand: "4-legged iron tank stand",
        tank: "GeePee tank",
        capacityUnit: "litres",
      };
    case "US":
      return {
        stand: "4-legged steel tank stand",
        tank: "overhead storage tank",
        capacityUnit: "gallons",
      };
    case "GB":
      return {
        stand: "galvanised steel tank stand",
        tank: "cold water tank",
        capacityUnit: "litres",
      };
    case "AU":
      return {
        stand: "steel tank stand",
        tank: "rainwater tank",
        capacityUnit: "litres",
      };
    case "KE":
      return {
        stand: "steel tank stand",
        tank: "overhead tank",
        capacityUnit: "litres",
      };
    default:
      return {
        stand: "elevated tank stand",
        tank: "overhead storage tank",
        capacityUnit: "litres",
      };
  }
}
