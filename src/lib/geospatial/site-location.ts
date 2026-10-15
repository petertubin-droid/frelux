/**
 * Project site location capture — FRELUX engine-1A "Geospatial /
 * GIS" milestone 2 (2026-10-15).
 *
 * Captures a project's site pin (and optional boundary polygon)
 * with EXPLICIT coordinate-system metadata. Everything is
 * normalized to WGS-84 (EPSG:4326) before persistence; if the
 * caller supplies Web Mercator (EPSG:3857) metres they are
 * converted with the audited crs.ts transforms. Unsupported CRS
 * codes, out-of-bounds coordinates and degenerate polygons are
 * refused with honest errors — nothing is guessed, and area is
 * never invented without a boundary.
 */

import { supabase } from "@/lib/supabase";
import {
  validateCoordinate,
  webMercatorToWgs84,
  getCrs,
} from "./crs";
import { sphericalPolygonAreaMeters, type LatLon } from "./geodesy";

export const AREA_ACCURACY_NOTE =
  "Site area computed with the spherical formula (mean Earth radius): typically within 0.5% of the WGS-84 ellipsoid. Suitable for site context and planning, NOT for cadastral or legal boundaries.";

export interface SiteLocationInput {
  project_id: string;
  /** CRS the coordinates were captured in: EPSG:4326 or EPSG:3857. */
  crs_code?: string;
  /** First coordinate in the given CRS (lat for 4326, x for 3857). */
  a: number;
  /** Second coordinate (lon for 4326, y for 3857). */
  b: number;
  /** Optional boundary in the SAME CRS as a/b. */
  polygon?: { a: number; b: number }[];
  notes?: string;
}

export interface PreparedSiteLocation {
  lat: number;
  lon: number;
  source_crs: string;
  polygon: LatLon[] | null;
  site_area_m2: number | null;
  accuracy_note: string;
}

/** Pure validation + normalization; no I/O. Refusals throw. */
export function prepareSiteLocation(input: SiteLocationInput): PreparedSiteLocation {
  const crsCode = input.crs_code ?? "EPSG:4326";
  const crs = getCrs(crsCode);
  if (!crs) {
    throw new RangeError(
      `Unsupported coordinate system "${crsCode}". Supported: EPSG:4326, EPSG:3857. Refusing rather than guessing a transformation.`,
    );
  }

  const pin = validateCoordinate(crsCode, input.a, input.b);
  if (!pin.ok) {
    throw new RangeError(pin.errors.join(" "));
  }

  let lat: number;
  let lon: number;
  if (crsCode === "EPSG:3857") {
    const wgs = webMercatorToWgs84(input.a, input.b);
    lat = wgs.lat;
    lon = wgs.lon;
  } else {
    lat = input.a;
    lon = input.b;
  }

  let polygon: LatLon[] | null = null;
  let area: number | null = null;
  if (input.polygon !== undefined) {
    if (input.polygon.length < 3) {
      throw new RangeError(
        `A site boundary needs at least 3 vertices; received ${input.polygon.length}. Area is never invented.`,
      );
    }
    polygon = input.polygon.map((v) => {
      const check = validateCoordinate(crsCode, v.a, v.b);
      if (!check.ok) {
        throw new RangeError(`Boundary vertex invalid: ${check.errors.join(" ")}`);
      }
      if (crsCode === "EPSG:3857") {
        const wgs = webMercatorToWgs84(v.a, v.b);
        return { lat: wgs.lat, lon: wgs.lon };
      }
      return { lat: v.a, lon: v.b };
    });
    area = sphericalPolygonAreaMeters(polygon);
  }

  return {
    lat,
    lon,
    source_crs: crsCode,
    polygon,
    site_area_m2: area,
    accuracy_note: AREA_ACCURACY_NOTE,
  };
}

/** Persists (upserts) the prepared site location for the project. */
export async function saveSiteLocation(
  input: SiteLocationInput,
): Promise<{ ok: boolean; error?: string }> {
  const prepared = prepareSiteLocation(input);
  const row = {
    project_id: input.project_id,
    lat: prepared.lat,
    lon: prepared.lon,
    source_crs: prepared.source_crs,
    polygon: prepared.polygon,
    site_area_m2: prepared.site_area_m2,
    accuracy_note: prepared.accuracy_note,
  };
  const { error } = await supabase
    .from("project_site_locations")
    .upsert(row, { onConflict: "project_id" });
  if (error) {
    return { ok: false, error: `Site location could not be saved: ${error.message}` };
  }
  return { ok: true };
}

/** Reads the site location row for a project (null when absent). */
export async function getSiteLocation(
  projectId: string,
): Promise<PreparedSiteLocation & { project_id: string } | null> {
  const { data, error } = await supabase
    .from("project_site_locations")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error || !data) {
    return null;
  }
  return {
    project_id: data.project_id,
    lat: data.lat,
    lon: data.lon,
    source_crs: data.source_crs,
    polygon: (data.polygon as LatLon[] | null) ?? null,
    site_area_m2: data.site_area_m2 ?? null,
    accuracy_note: data.accuracy_note ?? AREA_ACCURACY_NOTE,
  };
}
