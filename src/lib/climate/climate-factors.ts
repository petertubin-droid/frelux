/**
 * Derivation of the environmental factor set from measured normals.
 *
 * Every boolean/band below is DERIVED from a measured value; the
 * derivation is disclosed in the returned `missing` list and in the
 * advisor's disclosures. Thresholds are planning proxies, not code
 * requirements:
 *
 *  - strongUv      annual mean UV index ≥ 1.0 (annual average; midday
 *                  peak is far higher — we do not pretend it is peak UV)
 *  - highRainfall  ≥ 1,200 mm/year
 *  - highHumidity  ≥ 75% annual mean RH
 *  - heatStress    annual mean daily maximum ≥ 33 °C
 *  - frostRisk     from the measured annual frost-day count
 *  - snowExposure  derived from frost days + mean daily minimum; snow
 *                  LOADS always come from local code maps, never here
 *  - floodProxy    elevation bands only (NOT a flood map)
 *  - corrosion     indicative band from humidity + coastal proximity +
 *                  warmth; explicitly not an ISO 9223 classification
 */

import { coastalExposureFor } from "./coastal-exposure";
import type {
  ClimateNormals,
  CorrosionIndicative,
  DataSourceRef,
  EnvironmentalFactors,
  FloodProxy,
  FrostRisk,
  GeoPoint,
  SnowExposure,
} from "./types";

export function deriveFrostRisk(frostDaysPerYear: number): FrostRisk {
  if (frostDaysPerYear <= 0.5) return "none";
  if (frostDaysPerYear < 10) return "rare";
  if (frostDaysPerYear <= 60) return "seasonal";
  return "frequent";
}

export function deriveSnowExposure(
  frostDaysPerYear: number,
  tempMinC: number,
): SnowExposure {
  if (frostDaysPerYear <= 0.5) return "not_indicated";
  if (tempMinC <= -2) return "likely";
  if (tempMinC < 1) return "possible";
  return "not_indicated";
}

export function deriveFloodProxy(elevationM: number | null): FloodProxy {
  if (elevationM === null) return "not_assessed";
  if (elevationM <= 10) return "low_lying";
  if (elevationM <= 40) return "moderate_elevation";
  return "elevated_ground";
}

/** Indicative corrosivity band. Climate proxies only — never a classification. */
export function deriveCorrosionIndicative(
  humidityPct: number,
  coastalBand: ReturnType<typeof coastalExposureFor>["band"],
  tempMeanC: number,
): CorrosionIndicative {
  let score = 0;
  if (humidityPct >= 85) score += 2;
  else if (humidityPct >= 75) score += 1;

  if (coastalBand === "coast_adjacent") score += 3;
  else if (coastalBand === "coastal") score += 2;
  else if (coastalBand === "near_coast") score += 1;

  if (tempMeanC >= 25) score += 1;

  if (score >= 6) return "very_high";
  if (score === 5) return "high";
  if (score >= 3) return "elevated";
  if (score >= 1) return "moderate";
  return "low";
}

export interface DeriveFactorsInput {
  point: GeoPoint;
  label?: string;
  normals: ClimateNormals;
  elevationM: number | null;
  missing?: string[];
  sources?: DataSourceRef[];
}

export function deriveEnvironmentalFactors(
  input: DeriveFactorsInput,
): EnvironmentalFactors {
  const { point, label, normals, elevationM } = input;
  const coastal = coastalExposureFor(point.lat, point.lon);
  const missing = [...(input.missing ?? [])];

  const floodProxy = deriveFloodProxy(elevationM);
  if (floodProxy === "not_assessed" && !missing.includes("elevation")) {
    missing.push("elevation");
  }
  // Flood exposure is never derived automatically — stated, not hidden.
  if (!missing.includes("flood_map")) missing.push("flood_map");

  return {
    location: { ...point, label },
    annualRainfallMm: Math.round(normals.precipMmPerDay * 365),
    tempMeanC: normals.tempMeanC,
    tempMinC: normals.tempMinC,
    tempMaxC: normals.tempMaxC,
    relativeHumidityPct: normals.humidityPct,
    uvIndex: normals.uvIndex,
    frostDaysPerYear: normals.frostDaysPerYear,
    windMs: normals.windMs,
    frostRisk: deriveFrostRisk(normals.frostDaysPerYear),
    snowExposure: deriveSnowExposure(
      normals.frostDaysPerYear,
      normals.tempMinC,
    ),
    heatStress: normals.tempMaxC >= 33,
    strongUv: normals.uvIndex >= 1.0,
    highRainfall: normals.precipMmPerDay * 365 >= 1200,
    highHumidity: normals.humidityPct >= 75,
    coastal,
    floodProxy,
    elevationM,
    corrosionIndicative: deriveCorrosionIndicative(
      normals.humidityPct,
      coastal.band,
      normals.tempMeanC,
    ),
    missing,
    sources: input.sources ?? [],
  };
}
