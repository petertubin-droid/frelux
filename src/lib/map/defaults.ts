import {
  currentMarketCode,
  defaultWeatherLocationForMarket,
  readStoredWeatherLocation,
} from "@/lib/weather-locations";

/**
 * Where a FRELUX map should open for this visitor.
 *
 * The map is worldwide, so the opening frame follows the person, not the
 * company: their saved place, then their market's reference city, and only
 * if neither is known, the whole globe. Nothing here implies a record exists
 * in that region; it is purely the starting camera.
 */
export interface MapOpening {
  lat: number;
  lon: number;
  /** Rough span to show, in degrees of longitude. */
  zoom: number;
  label?: string;
  source: "saved-place" | "market" | "world";
}

/** Neutral opening: the entire globe, tilted slightly for depth. */
export const WORLD_VIEW: MapOpening = {
  lat: 12,
  lon: 8,
  zoom: 1.55,
  source: "world",
};

const MARKET_ZOOM = 5.2;

export function defaultMapOpening(): MapOpening {
  const stored = readStoredWeatherLocation();
  if (stored) {
    return {
      lat: stored.lat,
      lon: stored.lon,
      zoom: 7.5,
      label: stored.name,
      source: "saved-place",
    };
  }

  const market = currentMarketCode();
  if (market) {
    const city = defaultWeatherLocationForMarket(market);
    if (city) {
      return {
        lat: city.lat,
        lon: city.lon,
        zoom: MARKET_ZOOM,
        label: city.name,
        source: "market",
      };
    }
  }

  return WORLD_VIEW;
}

/** True when the opening frame is the whole world rather than a region. */
export function isWorldView(opening: MapOpening): boolean {
  return opening.source === "world";
}
