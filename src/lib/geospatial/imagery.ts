/**
 * Licensed imagery connectors + license tracking — FRELUX
 * engine-1A "Geospatial / GIS" milestone 4 (2026-10-15).
 *
 * Satellite basemap connectors come from a fixed, honest provider
 * registry: every provider carries its license name, license URL,
 * required attribution and a source/coverage disclosure. Drone
 * imagery is never pretended to be streamed: the contractor
 * REGISTERS their licensed imagery record (license, capture
 * date, coverage, optionally their own hosted XYZ tile URL) and
 * the record is license-tracked per project.
 *
 * Honesty rules (mirroring the M1-M3 refusals):
 *  - Unknown provider ids are refused, never mapped to OSM.
 *  - A custom/drone tile source without a registered license
 *    record is refused.
 *  - An expired license (license_expires_on in the past) is
 *    refused with the expiry date in the error.
 *  - Attribution and disclosure are produced from the provider
 *    record — never invented per-request.
 */

import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────
// Provider registry
// ─────────────────────────────────────────────────────────

export type ImageryProviderType =
  | "basemap"
  | "satellite"
  | "custom";

export interface ImageryProvider {
  id: string;
  type: ImageryProviderType;
  name: string;
  /** XYZ tile URL template with {z}/{x}/{y}. */
  tileUrlTemplate: string;
  maxZoom: number;
  /** License the imagery is used under. */
  licenseName: string;
  licenseUrl: string;
  /** Attribution REQUIRED by the license — rendered on every map. */
  attribution: string;
  /** Honest source/freshness disclosure rendered with the map. */
  disclosure: string;
  /** True when a per-project license record must exist to use it. */
  requiresLicenseRecord: boolean;
}

export const IMAGERY_PROVIDERS: readonly ImageryProvider[] = [
  {
    id: "osm-standard",
    type: "basemap",
    name: "OpenStreetMap standard",
    tileUrlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    licenseName: "Open Database License (ODbL)",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/summary/",
    attribution: "© OpenStreetMap contributors",
    disclosure:
      "Map tiles fetched live from tile.openstreetmap.org in your browser; coverage and freshness vary by region. FRELUX stores no imagery and claims none as its own.",
    requiresLicenseRecord: false,
  },
  {
    id: "esri-world-imagery",
    type: "satellite",
    name: "Esri World Imagery (satellite)",
    tileUrlTemplate:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 19,
    licenseName: "Esri World Imagery usage terms",
    licenseUrl: "https://www.esri.com/en-us/legal/terms/full-master-agreement",
    attribution:
      "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    disclosure:
      "Satellite basemap tiles fetched live from Esri's World Imagery service under its applicable terms. Imagery date and resolution vary by location; FRELUX stores no imagery and claims none as its own.",
    requiresLicenseRecord: true,
  },
] as const;

/** Reserved id for user-registered drone/hosted imagery (not a registry basemap). */
export const CUSTOM_PROVIDER_ID = "custom";

/** Resolve a provider by id. Unknown ids are REFUSED. */
export function resolveImageryProvider(id: string): ImageryProvider {
  const p = IMAGERY_PROVIDERS.find((x) => x.id === id);
  if (!p) {
    throw new RangeError(
      `Unknown imagery provider "${id}". Registered providers: ${IMAGERY_PROVIDERS.map((x) => x.id).join(", ")}. Refusing rather than falling back.`,
    );
  }
  return p;
}

/**
 * Build a provider view from a registered custom (drone/hosted)
 * imagery record. The record IS the license source; this never
 * invents metadata — every field comes from the record.
 */
export function resolveCustomImageryProvider(
  record: ImageryRecord,
): ImageryProvider {
  return {
    id: CUSTOM_PROVIDER_ID,
    type: "custom",
    name: record.name,
    tileUrlTemplate: record.tile_url_template ?? "",
    maxZoom: 22,
    licenseName: record.license_name,
    licenseUrl: record.license_url ?? "",
    attribution: record.attribution ?? "",
    disclosure: imageryRecordDisclosure(record),
    requiresLicenseRecord: true,
  };
}

/**
 * Tile URL for a provider at integer tile coordinates. Validates
 * the tile grid at the given zoom exactly like tiles.ts.
 */
export function imageryTileUrl(
  providerId: string,
  zoom: number,
  x: number,
  y: number,
): string {
  const provider = resolveImageryProvider(providerId);
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > provider.maxZoom) {
    throw new RangeError(
      `Zoom must be an integer in [0, ${provider.maxZoom}] for ${providerId} (received ${zoom}).`,
    );
  }
  const n = Math.pow(2, zoom);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= n || y < 0 || y >= n) {
    throw new RangeError(
      `Tile ${zoom}/${x}/${y} is outside the tile grid (0..${n - 1}) for ${providerId}.`,
    );
  }
  return provider.tileUrlTemplate
    .replace("{z}", String(zoom))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

// ─────────────────────────────────────────────────────────
// License records (per project)
// ─────────────────────────────────────────────────────────

export interface ImageryRecordInput {
  project_id: string;
  /** Registry provider id, or "custom" for drone/user-hosted XYZ. */
  provider_id: string;
  /** Display name for the imagery set (required for drone). */
  name: string;
  /** License the imagery is used under (required for satellite/custom). */
  license_name: string;
  license_url?: string | null;
  attribution?: string | null;
  /** Date the imagery was captured (required for drone). */
  captured_on?: string | null;
  /** Free-text coverage description. */
  coverage_note?: string | null;
  /** User-hosted XYZ tile URL template ({z}/{x}/{y}); custom only. */
  tile_url_template?: string | null;
  /** License expiry; expired licenses are refused at render time. */
  license_expires_on?: string | null;
  notes?: string | null;
}

export interface ImageryRecord {
  id: string;
  project_id: string;
  user_id: string | null;
  provider_id: string;
  name: string;
  license_name: string;
  license_url: string | null;
  attribution: string | null;
  captured_on: string | null;
  coverage_note: string | null;
  tile_url_template: string | null;
  license_expires_on: string | null;
  notes: string | null;
  created_at: string;
}

export interface LicenseCheckResult {
  usable: boolean;
  reason?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Pure license validation. Refusals are honest and specific:
 *  - satellite providers must have a registered license record
 *  - drone/custom records require name, license and capture date
 *  - custom tile sources require a valid {z}/{x}/{y} template
 *  - expired licenses are refused with their expiry date
 */
export function checkImageryLicense(
  providerId: string,
  record: Pick<
    ImageryRecord,
    | "name"
    | "license_name"
    | "captured_on"
    | "tile_url_template"
    | "license_expires_on"
  > | null,
  now: Date = new Date(),
): LicenseCheckResult {
  if (providerId !== CUSTOM_PROVIDER_ID) {
    const provider = resolveImageryProvider(providerId);
    if (provider.requiresLicenseRecord && !record) {
      return {
        usable: false,
        reason: `${provider.name} is licensed imagery: this project has no registered imagery/license record for it. Register the imagery record (license, capture date, coverage) to enable it.`,
      };
    }
  }
  if (providerId === "custom") {
    const r = record;
    if (!r || !r.name?.trim()) {
      return {
        usable: false,
        reason:
          "Custom imagery requires a record with the imagery set's name.",
      };
    }
    if (!r.license_name?.trim()) {
      return {
        usable: false,
        reason:
          "Custom imagery requires the license it is used under (FRELUX never renders unlicensed imagery).",
      };
    }
    if (!r.captured_on || !ISO_DATE.test(r.captured_on)) {
      return {
        usable: false,
        reason:
          "Custom imagery requires its capture date (YYYY-MM-DD) for source/date disclosure.",
      };
    }
    if (!r.tile_url_template?.includes("{z}")) {
      return {
        usable: false,
        reason:
          'Custom imagery requires an XYZ tile URL template containing "{z}", "{x}" and "{y}".',
      };
    }
  }
  if (record?.license_expires_on) {
    if (!ISO_DATE.test(record.license_expires_on)) {
      return {
        usable: false,
        reason: `License expiry "${record.license_expires_on}" is not a valid date (YYYY-MM-DD).`,
      };
    }
    const expiry = new Date(`${record.license_expires_on}T23:59:59Z`);
    if (expiry.getTime() < now.getTime()) {
      return {
        usable: false,
        reason: `The imagery license for "${record.name}" expired on ${record.license_expires_on}. Renew the license record to render this imagery.`,
      };
    }
  }
  return { usable: true };
}

/** Disclosure rendered with every project imagery record. */
export function imageryRecordDisclosure(record: ImageryRecord): string {
  const parts: string[] = [];
  if (record.captured_on) parts.push(`Captured ${record.captured_on}`);
  if (record.coverage_note) parts.push(`Coverage: ${record.coverage_note}`);
  parts.push(`License: ${record.license_name}`);
  if (record.license_url) parts.push(record.license_url);
  return parts.join(" · ");
}

// ─────────────────────────────────────────────────────────
// Persistence (Supabase, owner-scoped by RLS)
// ─────────────────────────────────────────────────────────

export async function saveImageryRecord(input: ImageryRecordInput) {
  const provider =
    input.provider_id === CUSTOM_PROVIDER_ID
      ? null
      : resolveImageryProvider(input.provider_id);
  const check = checkImageryLicense(
    input.provider_id,
    {
      name: input.name,
      license_name: input.license_name,
      captured_on: input.captured_on ?? null,
      tile_url_template: input.tile_url_template ?? null,
      license_expires_on: input.license_expires_on ?? null,
    },
  );
  if (!check.usable) return { ok: false as const, error: check.reason! };

  const { data, error } = await supabase
    .from("project_imagery")
    .insert({
      project_id: input.project_id,
      provider_id: input.provider_id,
      name: input.name,
      license_name: input.license_name,
      license_url: input.license_url ?? null,
      attribution: input.attribution ?? provider?.attribution ?? null,
      captured_on: input.captured_on ?? null,
      coverage_note: input.coverage_note ?? null,
      tile_url_template: input.tile_url_template ?? null,
      license_expires_on: input.license_expires_on ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, record: data as ImageryRecord };
}

export async function fetchImageryRecords(projectId: string) {
  const { data, error } = await supabase
    .from("project_imagery")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, records: (data ?? []) as ImageryRecord[] };
}

export async function deleteImageryRecord(id: string) {
  const { error } = await supabase.from("project_imagery").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
