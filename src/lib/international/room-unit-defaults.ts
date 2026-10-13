/**
 * FRELUX INTERNATIONAL ARCHITECTURE, Market-aware room unit defaults
 *
 * P1.6 of the 20-market mandate: the classic calculator pages
 * hardcoded their initial measurement unit ("feet" on the paint pages,
 * "meters" on the tile/POP pages) regardless of the visitor's market.
 * This module derives the sensible default from the resolved market
 * context — additive only; the unit selector on each page still wins,
 * and the user's manual choice is never overridden (pages only apply
 * this at initialization and when the market itself changes).
 */

import type { ResolvedMarketContext } from "@/types/international";

export type RoomUnit = "feet" | "meters";

/**
 * Resolve the room-dimension unit a market's visitors expect by default.
 * Imperial markets (and Nigeria's mixed system, where feet-based room
 * dims are the established practice on this platform) get feet;
 * metric markets get meters. "inches" as a preferred length unit maps
 * to feet for the room selector (no page offers inches for rooms).
 */
export function resolveMarketRoomUnit(
  market: Partial<
    Pick<
      ResolvedMarketContext,
      "marketCode" | "measurementSystem" | "defaultLengthUnit"
    >
  >,
  /** The page's pre-internationalization default — preserved for NG. */
  legacyDefault: RoomUnit,
): RoomUnit {
  // Defensive: a partially mocked or unresolved market context falls
  // back to the page's legacy default (no behaviour change).
  if (!market) return legacyDefault;
  // Nigeria keeps each page's existing behaviour untouched (the paint
  // pages have always opened in feet, the tile/POP pages in meters).
  if (market.marketCode === "NG") return legacyDefault;
  if (market.measurementSystem === "imperial") return "feet";
  if (
    market.defaultLengthUnit === "feet" ||
    market.defaultLengthUnit === "inches"
  )
    return "feet";
  return "meters";
}

/**
 * Per-unit default room dimensions. Scale-matched: never show a metric
 * market feet-scale defaults or vice versa.
 */
export const ROOM_DIM_DEFAULTS: Record<
  RoomUnit,
  { length: number; breadth: number; height: number }
> = {
  feet: { length: 10, breadth: 12, height: 8 },
  meters: { length: 3, breadth: 3.6, height: 2.7 },
};

/** Per-unit default single-door dimensions (width × height). */
export const DOOR_DIM_DEFAULTS: Record<
  RoomUnit,
  { width: number; height: number }
> = {
  feet: { width: 3, height: 7 },
  meters: { width: 0.9, height: 2.1 },
};

/** Per-unit default single-window dimensions (width × height). */
export const WINDOW_DIM_DEFAULTS: Record<
  RoomUnit,
  { width: number; height: number }
> = {
  feet: { width: 4, height: 4 },
  meters: { width: 1.2, height: 1.2 },
};
