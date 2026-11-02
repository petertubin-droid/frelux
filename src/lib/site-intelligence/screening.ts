/**
 * Site screening: what can be said about a location without a site visit.
 *
 * Everything produced here is SCREENING. It reuses the modules FRELUX already
 * runs for the material advisor (elevation model, baked coastline) and adds a
 * regional profile only when an administrator has entered one with a source.
 * Nothing in this file can produce a bearing capacity, and no value here is
 * ever presented as a finding.
 */
import { fetchElevationM } from "@/lib/climate/environmental-data";
import { nearestCoastKm } from "@/lib/climate/coastal-exposure";
import type { ScreeningValue, SiteScreening } from "./types";
import { supabase } from "@/lib/supabase";

const ELEVATION_SOURCE = "Elevation model (Open-Meteo)";
const COASTLINE_SOURCE = "Coastline reference (Natural Earth, 1:50m)";
const SLOPE_LIMITATION =
  "Slope is derived by sampling a terrain model over roughly 500 m. It is not a survey and can miss local cut and fill.";
const ELEVATION_LIMITATION =
  "Model elevation is typically accurate to a few metres and is not a level survey.";
const COAST_LIMITATION =
  "Straight-line distance to the nearest coastline; it says nothing about drainage, tide or flood defences.";

function unknown<T>(limitation: string): ScreeningValue<T> {
  return { value: null, confidence: "unknown", source: null, limitation };
}

/**
 * Sample elevation on four sides of the point to estimate gradient.
 * Deliberately coarse: this answers "is this obviously steep?", nothing more.
 */
export async function estimateSlopeDegrees(
  lat: number,
  lon: number,
  sampleMetres = 250,
): Promise<number | null> {
  const dLat = sampleMetres / 111_320;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  if (Math.abs(cosLat) < 1e-6) return null;
  const dLon = sampleMetres / (111_320 * Math.abs(cosLat));

  const [centre, north, south, east, west] = await Promise.all([
    fetchElevationM({ lat, lon }),
    fetchElevationM({ lat: lat + dLat, lon }),
    fetchElevationM({ lat: lat - dLat, lon }),
    fetchElevationM({ lat, lon: lon + dLon }),
    fetchElevationM({ lat, lon: lon - dLon }),
  ]);

  const readings = [centre, north, south, east, west].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (readings.length < 3) return null;

  const dNorthSouth = Math.abs((north ?? centre ?? 0) - (south ?? centre ?? 0));
  const dEastWest = Math.abs((east ?? centre ?? 0) - (west ?? centre ?? 0));
  const run = sampleMetres * 2;
  const rise = Math.max(dNorthSouth, dEastWest);
  const degrees = (Math.atan2(rise, run) * 180) / Math.PI;
  return Math.round(degrees * 10) / 10;
}

export function slopeBand(degrees: number | null): string | null {
  if (degrees == null) return null;
  if (degrees < 2) return "Level to gently sloping";
  if (degrees < 5) return "Gently sloping";
  if (degrees < 10) return "Sloping";
  if (degrees < 20) return "Steep";
  return "Very steep";
}

/** Published regional profile for a city, if an administrator entered one. */
export async function fetchRegionalProfile(
  countryCode: string,
  citySlug: string | null,
): Promise<SiteScreening["regional_profile"]> {
  if (!citySlug) return null;
  const { data } = await supabase
    .from("regional_site_profiles")
    .select(
      "id,country_code,region_slug,region_name,city_slug,groundwater_note,flood_exposure,drainage_note,terrain_note,erosion_note,source_reference,source_url,source_year,verification_status",
    )
    .eq("country_code", countryCode)
    .eq("city_slug", citySlug)
    .in("verification_status", ["sourced", "verified"])
    .maybeSingle();
  return (data as SiteScreening["regional_profile"]) ?? null;
}

export async function buildScreening(params: {
  lat: number;
  lon: number;
  countryCode?: string | null;
  citySlug?: string | null;
}): Promise<SiteScreening> {
  const { lat, lon, countryCode, citySlug } = params;

  const [elevation, slope, regional] = await Promise.all([
    fetchElevationM({ lat, lon }).catch(() => null),
    estimateSlopeDegrees(lat, lon).catch(() => null),
    countryCode
      ? fetchRegionalProfile(countryCode, citySlug ?? null).catch(() => null)
      : Promise.resolve(null),
  ]);

  const coastKm = nearestCoastKm(lat, lon);

  const elevationValue: ScreeningValue<number> =
    typeof elevation === "number"
      ? {
          value: Math.round(elevation * 10) / 10,
          confidence: "screening",
          source: ELEVATION_SOURCE,
          limitation: ELEVATION_LIMITATION,
        }
      : unknown<number>(ELEVATION_LIMITATION);

  const slopeValue: ScreeningValue<number> =
    slope == null
      ? unknown<number>(SLOPE_LIMITATION)
      : {
          value: slope,
          confidence: "screening",
          source: ELEVATION_SOURCE,
          limitation: SLOPE_LIMITATION,
        };

  const coastValue: ScreeningValue<number> =
    typeof coastKm === "number" && Number.isFinite(coastKm)
      ? {
          value: Math.round(coastKm * 10) / 10,
          confidence: "screening",
          source: COASTLINE_SOURCE,
          limitation: COAST_LIMITATION,
        }
      : unknown<number>(COAST_LIMITATION);

  const flood: ScreeningValue<"low" | "moderate" | "high" | "unknown"> = regional
    ? {
        value: regional.flood_exposure ?? "unknown",
        confidence: "sourced",
        source: regional.source_reference,
        limitation:
          regional.verification_status === "verified"
            ? "Regional statement, not a site flood risk assessment."
            : "Regional statement awaiting verification.",
      }
    : unknown<"low" | "moderate" | "high" | "unknown">(
        "No sourced regional flood record for this location yet.",
      );

  const asSourced = (
    value: string | null,
    field: string,
  ): ScreeningValue<string> =>
    regional && value
      ? {
          value,
          confidence: "sourced",
          source: regional.source_reference,
          limitation: `Regional ${field} statement, not a site investigation.`,
        }
      : unknown<string>(`No sourced regional ${field} record for this location yet.`);

  return {
    latitude: lat,
    longitude: lon,
    elevation_m: elevationValue,
    slope_degrees: slopeValue,
    coastal_distance_km: coastValue,
    flood_exposure: flood,
    drainage_note: asSourced(regional?.drainage_note ?? null, "drainage"),
    groundwater_note: asSourced(regional?.groundwater_note ?? null, "groundwater"),
    erosion_note: asSourced(regional?.erosion_note ?? null, "erosion"),
    regional_profile: regional,
    generated_at: new Date().toISOString(),
  };
}
