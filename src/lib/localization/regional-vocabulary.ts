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
