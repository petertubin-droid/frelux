/**
 * FRELUX LOCATION INTELLIGENCE — Persistence
 *
 * Attaches / loads the canonical location record on existing FRELUX
 * entities. Storage shape is identical everywhere: the `location`
 * JSONB column holding the sanitized canonical record.
 *
 * - contractor_projects  (Construction Intelligence projects)
 * - user_projects        (calculator-estimator projects)
 * - properties rows      (Property Intelligence — the table keeps its
 *   own structured lat/lng/country columns; helpers convert both ways
 *   rather than duplicating data)
 *
 * RLS: all tables are user-scoped already — a user's location is never
 * exposed to another user. The `location` column inherits those policies.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  FreluxLocation,
  sanitizeLocationRecord,
  validateFreluxLocation,
} from "./model";
import type { RegionalDataSourceRow } from "./regional";

export interface LocationSaveResult {
  ok: boolean;
  error: string | null;
}

/** Persist helper — writes the sanitized record or null (clears). */
async function writeProjectLocation(
  table: "contractor_projects" | "user_projects",
  projectId: string,
  location: FreluxLocation | null,
): Promise<LocationSaveResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "Location cannot be saved while offline." };
  }
  if (location) {
    const { valid, issues } = validateFreluxLocation(location);
    if (!valid) {
      return {
        ok: false,
        error: `Cannot save an invalid location (${issues.join(", ")}).`,
      };
    }
  }
  try {
    const { error } = await supabase
      .from(table)
      .update({ location: location ? sanitizeLocationRecord(location as unknown as Record<string, unknown>) : null })
      .eq("id", projectId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Save the canonical location on a Construction Intelligence project. */
export async function saveContractorProjectLocation(
  projectId: string,
  location: FreluxLocation | null,
): Promise<LocationSaveResult> {
  return writeProjectLocation("contractor_projects", projectId, location);
}

/** Save the canonical location on a calculator/estimator project. */
export async function saveUserProjectLocation(
  projectId: string,
  location: FreluxLocation | null,
): Promise<LocationSaveResult> {
  return writeProjectLocation("user_projects", projectId, location);
}

/** Read the canonical location off a project row of either kind. */
export function locationFromProjectRow(
  row: { location?: unknown } | null | undefined,
): FreluxLocation | null {
  if (!row || !row.location || typeof row.location !== "object") return null;
  const loc = sanitizeLocationRecord(row.location as Record<string, unknown>);
  const { valid } = validateFreluxLocation(loc);
  return valid ? loc : null;
}

// ============================================================
// Regional currency sync (Construction Intelligence projects)
// ============================================================

export interface CurrencySyncResult {
  ok: boolean;
  /** The synced currency fields, when ok. */
  currency: { code: string; symbol: string } | null;
  error: string | null;
}

/**
 * Sync a contractor project's `currency` / `currency_symbol` columns from
 * its location's ACTIVE regional market profile (the existing
 * regional-profile system). Called after a location save so that every
 * Construction Intelligence surface — stat cards, shopping totals,
 * estimates — follows the project's true regional currency.
 *
 * Honest behavior: when the region has NO active profile, nothing is
 * changed (no substitution of another region's currency).
 */
export async function syncProjectCurrencyFromRegional(
  projectId: string,
  regional: { status: string; currency_code?: string; currency_symbol?: string },
): Promise<CurrencySyncResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, currency: null, error: "Offline — currency not synced." };
  }
  if (regional.status !== "available" || !regional.currency_code) {
    return { ok: true, currency: null, error: null }; // nothing to sync — honest no-op
  }
  try {
    const { error } = await supabase
      .from("contractor_projects")
      .update({
        currency: regional.currency_code,
        currency_symbol: regional.currency_symbol ?? regional.currency_code,
      })
      .eq("id", projectId);
    if (error) return { ok: false, currency: null, error: error.message };
    return {
      ok: true,
      currency: {
        code: regional.currency_code,
        symbol: regional.currency_symbol ?? regional.currency_code,
      },
      error: null,
    };
  } catch (e) {
    return { ok: false, currency: null, error: (e as Error).message };
  }
}

// ============================================================
// Property Intelligence bridge
// ============================================================

export interface PropertyLocationFields {
  address?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/**
 * Canonical location view of an existing `properties` row (Phase 43).
 * Pure conversion — no data is invented; NULL stays NULL.
 */
export function locationFromPropertyRow(
  row: PropertyLocationFields | null | undefined,
): FreluxLocation {
  return {
    latitude: row?.lat ?? null,
    longitude: row?.lng ?? null,
    accuracy_m: null,
    formatted_address: row?.address ?? null,
    country: row?.country ?? null,
    country_code: row?.country ?? null,
    region: row?.region ?? null,
    city: row?.city ?? row?.district ?? null,
    postcode: null,
    place_id: null,
    source: "manual",
    captured_at: new Date().toISOString(),
    verification: "user_confirmed",
  };
}

/** Flatten a canonical location into the `properties` column shape. */
export function propertyFieldsFromLocation(
  loc: FreluxLocation | null,
): PropertyLocationFields {
  if (!loc) return {};
  return {
    address: loc.formatted_address,
    country: loc.country_code ?? loc.country,
    region: loc.region,
    city: loc.city,
    district: null,
    lat: loc.latitude,
    lng: loc.longitude,
  };
}

/** Regional profile row reuse for property intelligence consumers. */
export type { RegionalDataSourceRow };
