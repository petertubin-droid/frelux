/**
 * Environmental data retrieval for the Climate-Responsive Material Advisor.
 *
 * Sources (both keyless, HTTPS, CORS-enabled — verified 2026-10-30):
 *  - NASA POWER climatology (MERRA-2 based climate normals):
 *    temperature, humidity, precipitation, UV, frost days, wind.
 *  - Open-Meteo elevation API: ground elevation for the drainage proxy.
 *
 * Rules:
 *  - No key, no secret, nothing leaves the device except the coordinates.
 *  - A failed or incomplete fetch NEVER produces guessed values. Missing
 *    parameters are reported in `missing` and the advisor degrades to
 *    general guidance with an explicit notice.
 *  - Results are cached per ~1 km grid cell for the session and for 7
 *    days in sessionStorage (climate normals change very slowly).
 */

import type {
  ClimateNormals,
  DataSourceRef,
  EnvironmentalDataResult,
  GeoPoint,
} from "./types";
import { deriveEnvironmentalFactors } from "./climate-factors";

const POWER_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point";
const POWER_SOURCE_URL = "https://power.larc.nasa.gov/";
const ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const ELEVATION_SOURCE_URL = "https://open-meteo.com/en/docs/elevation-api";

const POWER_PARAMS = [
  "T2M",
  "T2M_MIN",
  "T2M_MAX",
  "RH2M",
  "PRECTOTCORR",
  "ALLSKY_SFC_UV_INDEX",
  "FROST_DAYS",
  "WS2M",
] as const;

/** POWER's fill value for unavailable cells. */
const POWER_FILL = -999;

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_KEY = "frelux_climate_normals_v1";
const DEFAULT_TIMEOUT_MS = 14_000;

export interface FetchEnvOptions {
  /** Coordinate label (city/address) for display only. */
  label?: string;
  /** Injected for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
}

interface CachedEnvelope {
  fetchedAt: number;
  normals: ClimateNormals | null;
  elevationM: number | null;
  period?: string;
  missing: string[];
}

type CacheMap = Map<string, CachedEnvelope>;

const memoryCache: CacheMap = new Map();

export function clearEnvironmentalCache(): void {
  memoryCache.clear();
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // storage unavailable — memory cache is enough
  }
}

function cellKey(point: GeoPoint): string {
  // ~1 km grid: avoids refetching for tiny coordinate jitter.
  return `${point.lat.toFixed(2)},${point.lon.toFixed(2)}`;
}

function readSessionCache(): Record<string, CachedEnvelope> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CachedEnvelope>;
  } catch {
    return {};
  }
}

function writeSessionCache(key: string, value: CachedEnvelope): void {
  try {
    const all = readSessionCache();
    all[key] = value;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {
    // storage full or unavailable — memory cache covers the session
  }
}

function isValidPoint(point: GeoPoint): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lon) <= 180
  );
}

function num(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value === POWER_FILL) return null;
  return value;
}

/**
 * Fetch and validate NASA POWER annual climate normals.
 * Returns null when any REQUIRED parameter is unavailable — we do not
 * run the rules on partial data silently.
 */
export async function fetchClimateNormals(
  point: GeoPoint,
  options: FetchEnvOptions = {},
): Promise<{
  normals: ClimateNormals | null;
  missing: string[];
  period?: string;
}> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const params = new URLSearchParams({
    parameters: POWER_PARAMS.join(","),
    community: "AG",
    latitude: String(point.lat),
    longitude: String(point.lon),
    format: "JSON",
  });

  let payload: unknown;
  try {
    const response = await fetchImpl(`${POWER_URL}?${params.toString()}`, {
      signal: options.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return {
        normals: null,
        missing: POWER_PARAMS.map((p) => `power:${p}`),
      };
    }
    payload = await response.json();
  } catch {
    return { normals: null, missing: POWER_PARAMS.map((p) => `power:${p}`) };
  }

  const root = payload as {
    properties?: { parameter?: Record<string, { ANN?: unknown }> };
    header?: { start?: string; end?: string };
    parameters?: Record<string, unknown>;
  };
  const parameter = root?.properties?.parameter ?? {};

  const read = (key: string): number | null => num(parameter[key]?.ANN);

  const values: Record<string, number | null> = {
    tempMeanC: read("T2M"),
    tempMinC: read("T2M_MIN"),
    tempMaxC: read("T2M_MAX"),
    humidityPct: read("RH2M"),
    precipMmPerDay: read("PRECTOTCORR"),
    uvIndex: read("ALLSKY_SFC_UV_INDEX"),
    frostDaysPerYear: read("FROST_DAYS"),
    windMs: read("WS2M"),
  };

  const missing = Object.entries(values)
    .filter(([, v]) => v === null)
    .map(([k]) => `power:${k}`);

  if (missing.length > 0) return { normals: null, missing };

  return {
    normals: values as unknown as ClimateNormals,
    missing: [],
    period:
      root?.header?.start && root?.header?.end
        ? `${root.header.start}–${root.header.end}`
        : undefined,
  };
}

/** Ground elevation (m). Returns null when unavailable. */
export async function fetchElevationM(
  point: GeoPoint,
  options: FetchEnvOptions = {},
): Promise<number | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const params = new URLSearchParams({
      latitude: String(point.lat),
      longitude: String(point.lon),
    });
    const response = await fetchImpl(`${ELEVATION_URL}?${params.toString()}`, {
      signal: options.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { elevation?: unknown[] };
    const first = body?.elevation?.[0];
    return typeof first === "number" && Number.isFinite(first) ? first : null;
  } catch {
    return null;
  }
}

/**
 * Full environmental retrieval for a coordinate. Never throws: any
 * failure is reported as an unavailable result with a reason.
 */
export async function fetchEnvironmentalData(
  point: GeoPoint,
  options: FetchEnvOptions = {},
): Promise<EnvironmentalDataResult> {
  if (!isValidPoint(point)) {
    return {
      status: "unavailable",
      reason:
        "The selected coordinates are not valid. Pick a location on the map or search for an address.",
      missing: ["location"],
      sources: [],
    };
  }

  const key = cellKey(point);
  const cached =
    memoryCache.get(key) ??
    (() => {
      const all = readSessionCache();
      const hit = all[key];
      if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit;
      return undefined;
    })();

  let normals: ClimateNormals | null;
  let elevationM: number | null;
  let period: string | undefined;
  let missing: string[];
  let fetchedAt: string;

  if (cached) {
    normals = cached.normals;
    elevationM = cached.elevationM;
    period = cached.period;
    missing = cached.missing;
    fetchedAt = new Date(cached.fetchedAt).toISOString();
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    const signal = options.signal ?? controller.signal;

    try {
      const [power, elevation] = await Promise.all([
        fetchClimateNormals(point, { ...options, signal }),
        fetchElevationM(point, { ...options, signal }),
      ]);
      normals = power.normals;
      period = power.period;
      elevationM = elevation;
      missing = power.missing.filter((m) => m.startsWith("power:"));
      if (elevationM === null) missing.push("elevation");
      fetchedAt = new Date().toISOString();
    } finally {
      clearTimeout(timeout);
    }

    const envelope: CachedEnvelope = {
      fetchedAt: Date.now(),
      normals,
      elevationM,
      period,
      missing,
    };
    memoryCache.set(key, envelope);
    writeSessionCache(key, envelope);
  }

  const sources: DataSourceRef[] = [];

  if (normals) {
    sources.push({
      name: "NASA POWER climate normals (MERRA-2)",
      url: POWER_SOURCE_URL,
      period,
      fetchedAt,
      note: "Annual averages for this coordinate, computed by NASA from long-term reanalysis data.",
    });
  }
  if (elevationM !== null) {
    sources.push({
      name: "Open-Meteo elevation",
      url: ELEVATION_SOURCE_URL,
      fetchedAt,
      note: "Ground elevation used only as a drainage-attention proxy, not a flood assessment.",
    });
  }

  if (!normals) {
    return {
      status: "unavailable",
      reason:
        "Climate normals could not be retrieved for this location right now. Recommendations are shown as general guidance only.",
      missing: missing.length ? missing : ["climate_normals"],
      sources,
    };
  }

  return {
    status: "ok",
    factors: deriveEnvironmentalFactors({
      point,
      label: options.label,
      normals,
      elevationM,
      missing,
      sources,
    }),
    missing,
    sources,
  };
}
