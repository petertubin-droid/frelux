/**
 * FRELUX Climate-Responsive Material Advisor — shared types.
 *
 * Every value in this layer is either MEASURED (from a named data source
 * with its period) or explicitly derived with the derivation disclosed.
 * Nothing is invented: when a factor cannot be obtained it is reported
 * as missing rather than guessed.
 */

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface ClimateNormals {
  /** Annual mean air temperature at 2 m (°C). */
  tempMeanC: number;
  /** Annual mean of daily minimum temperature (°C). */
  tempMinC: number;
  /** Annual mean of daily maximum temperature (°C). */
  tempMaxC: number;
  /** Annual mean relative humidity at 2 m (%). */
  humidityPct: number;
  /** Mean daily precipitation (mm/day). */
  precipMmPerDay: number;
  /** Annual mean of the surface UV index (0–11+ scale; annual average). */
  uvIndex: number;
  /** Mean number of frost days per year. */
  frostDaysPerYear: number;
  /** Wind speed at 2 m (m/s). */
  windMs: number;
}

export interface DataSourceRef {
  name: string;
  url: string;
  /** Period / dataset vintage when the source reports it. */
  period?: string;
  fetchedAt: string;
  note?: string;
}

export interface CoastalExposure {
  /** Approximate distance to the nearest generalized coastline (km). */
  distanceKm: number;
  band: "coast_adjacent" | "coastal" | "near_coast" | "inland";
  /** Always true: the reference coastline is generalized (±25 km). */
  approximate: true;
  reference: string;
}

export type FrostRisk = "none" | "rare" | "seasonal" | "frequent";
export type SnowExposure = "not_indicated" | "possible" | "likely";
export type FloodProxy =
  "not_assessed" | "low_lying" | "moderate_elevation" | "elevated_ground";
export type CorrosionIndicative =
  "low" | "moderate" | "elevated" | "high" | "very_high";

export interface EnvironmentalFactors {
  location: GeoPoint & { label?: string };
  /** mm per year, derived: mean daily precipitation × 365. */
  annualRainfallMm: number;
  tempMeanC: number;
  tempMinC: number;
  tempMaxC: number;
  relativeHumidityPct: number;
  uvIndex: number;
  frostDaysPerYear: number;
  windMs: number;
  frostRisk: FrostRisk;
  /** Derived from normals only — snow loads must come from local code maps. */
  snowExposure: SnowExposure;
  heatStress: boolean;
  strongUv: boolean;
  highRainfall: boolean;
  highHumidity: boolean;
  coastal: CoastalExposure;
  /** Elevation-based proxy for drainage attention — NOT a flood map. */
  floodProxy: FloodProxy;
  elevationM: number | null;
  /** Indicative only — not an ISO 9223 corrosivity classification. */
  corrosionIndicative: CorrosionIndicative;
  /** Factors that could not be derived, with the reason. */
  missing: string[];
  sources: DataSourceRef[];
}

export interface EnvironmentalDataResult {
  status: "ok" | "unavailable";
  /** Present only when status === "ok". */
  factors?: EnvironmentalFactors;
  /** Human-readable reason when unavailable. */
  reason?: string;
  missing: string[];
  sources: DataSourceRef[];
}

export interface TechnicalStandard {
  /** Standard designation, e.g. "ISO 12944". */
  code: string;
  name: string;
  /** How the standard relates to this recommendation. */
  applies: string;
}

export type AdviceConfidence = "climate-matched" | "general";

export interface CategoryAdvice {
  id: string;
  category: string;
  title: string;
  summary: string;
  properties: string[];
  why: string[];
  risks: string[];
  standards: TechnicalStandard[];
  installation: string[];
  confidence: AdviceConfidence;
}

export interface AdvisorResult {
  confidence: AdviceConfidence;
  categories: CategoryAdvice[];
  /** Factors that drove the climate-matched advice. */
  drivers: string[];
  /** What could not be assessed and why. */
  missing: string[];
  sources: DataSourceRef[];
  disclosures: string[];
}
